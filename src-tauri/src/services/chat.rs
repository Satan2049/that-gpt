use tauri::{AppHandle, Emitter};

use crate::config::AppState;
use crate::error::AppError;
use crate::models::api::{ChatStreamChunkPayload, ChatStreamStartPayload};
use crate::models::{
    ChatCompletionMessage, ChatMessage, Conversation, ConversationSummary, MessageRole,
    PromptPreset, SendMessageResponse,
};
use crate::models::ai::chat_messages_to_completion_messages;
use crate::repository::ChatRepository;
use crate::services::image_validation::validate_images;
use crate::services::prompt::PromptService;
const NEW_CHAT_TITLE: &str = "New chat";

pub struct ChatService;

impl ChatService {
    pub async fn list_conversations(state: &AppState) -> Result<Vec<ConversationSummary>, AppError> {
        let all = ChatRepository::list_all(&state.chats_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(all
            .into_iter()
            .map(|c| ConversationSummary {
                id: c.id,
                title: c.title,
                updated_at: c.updated_at,
            })
            .collect())
    }

    pub async fn get_conversation(state: &AppState, id: &str) -> Result<Conversation, AppError> {
        ChatRepository::find_by_id(&state.chats_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::not_found("Conversation not found"))
    }

    pub async fn create_conversation(
        state: &AppState,
        title: Option<String>,
    ) -> Result<Conversation, AppError> {
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let conversation = Conversation {
            id: uuid::Uuid::new_v4().to_string(),
            title: title
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .unwrap_or_else(|| NEW_CHAT_TITLE.to_string()),
            messages: Vec::new(),
            prompt_preset_id: None,
            created_at: now.clone(),
            updated_at: now,
        };

        ChatRepository::save(&state.chats_dir(), &conversation)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(conversation)
    }

    pub async fn update_conversation(
        state: &AppState,
        id: &str,
        title: Option<String>,
        prompt_preset_id: Option<Option<String>>,
    ) -> Result<Conversation, AppError> {
        let mut conversation = ChatRepository::find_by_id(&state.chats_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::not_found("Conversation not found"))?;

        if let Some(t) = title {
            conversation.title = t.trim().to_string();
        }

        if let Some(preset_id) = prompt_preset_id {
            match preset_id {
                None => conversation.prompt_preset_id = None,
                Some(pid) => {
                    PromptService::get_preset_by_id(state, &pid)
                        .await?
                        .ok_or_else(|| AppError::bad_request("Preset not found"))?;
                    conversation.prompt_preset_id = Some(pid);
                }
            }
        }

        conversation.updated_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

        ChatRepository::save(&state.chats_dir(), &conversation)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(conversation)
    }

    pub async fn delete_conversation(state: &AppState, id: &str) -> Result<(), AppError> {
        let deleted = ChatRepository::delete(&state.chats_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if deleted {
            Ok(())
        } else {
            Err(AppError::not_found("Conversation not found"))
        }
    }

    pub async fn send_message(
        state: &AppState,
        app: &AppHandle,
        conversation_id: &str,
        text: &str,
        prompt_preset_id: Option<Option<String>>,
        images: Option<Vec<crate::models::ImageEntry>>,
    ) -> Result<SendMessageResponse, AppError> {
        let mut conversation = ChatRepository::find_by_id(&state.chats_dir(), conversation_id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::not_found("Conversation not found"))?;

        if let Some(preset_id) = prompt_preset_id {
            match preset_id {
                None => conversation.prompt_preset_id = None,
                Some(pid) => {
                    PromptService::get_preset_by_id(state, &pid)
                        .await?
                        .ok_or_else(|| AppError::bad_request("Preset not found"))?;
                    conversation.prompt_preset_id = Some(pid);
                }
            }
        }

        let mut preset: Option<PromptPreset> = None;
        if let Some(ref pid) = conversation.prompt_preset_id {
            if let Some(p) = PromptService::get_preset_by_id(state, pid).await? {
                preset = Some(p);
            } else {
                conversation.prompt_preset_id = None;
            }
        }

        let trimmed = text.trim();
        let image_attachments = validate_images(images)?;

        if trimmed.is_empty() && image_attachments.is_empty() {
            return Err(AppError::bad_request(
                "Message text or at least one image is required",
            ));
        }

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let user_message = ChatMessage {
            id: uuid::Uuid::new_v4().to_string(),
            conversation_id: conversation_id.to_string(),
            role: MessageRole::User,
            content: trimmed.to_string(),
            created_at: now.clone(),
            images: if image_attachments.is_empty() {
                None
            } else {
                Some(image_attachments)
            },
        };
        conversation.messages.push(user_message);

        if conversation.title == NEW_CHAT_TITLE {
            if !trimmed.is_empty() {
                conversation.title = trimmed.chars().take(60).collect();
            } else if conversation
                .messages
                .last()
                .and_then(|m| m.images.as_ref())
                .is_some_and(|imgs| !imgs.is_empty())
            {
                conversation.title = "Image message".to_string();
            }
        }

        let api_messages = build_api_messages(state, &conversation, preset.as_ref());

        let assistant_id = uuid::Uuid::new_v4().to_string();
        let _ = app.emit(
            "chat-stream-start",
            ChatStreamStartPayload {
                conversation_id: conversation_id.to_string(),
                message_id: assistant_id.clone(),
            },
        );

        let assistant_id_for_events = assistant_id.clone();
        let conversation_id_for_events = conversation_id.to_string();
        let app_for_events = app.clone();

        let assistant_content = super::ai::create_chat_completion_stream(
            state,
            api_messages,
            preset.as_ref().map(|p| p.model.as_str()),
            preset.as_ref().map(|p| p.temperature),
            preset.as_ref().map(|p| p.max_tokens),
            move |delta| {
                let _ = app_for_events.emit(
                    "chat-stream-chunk",
                    ChatStreamChunkPayload {
                        conversation_id: conversation_id_for_events.clone(),
                        message_id: assistant_id_for_events.clone(),
                        delta: delta.to_string(),
                    },
                );
            },
        )
        .await?;

        let assistant_created =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let assistant_message = ChatMessage {
            id: assistant_id,
            conversation_id: conversation_id.to_string(),
            role: MessageRole::Assistant,
            content: assistant_content,
            created_at: assistant_created.clone(),
            images: None,
        };
        conversation.messages.push(assistant_message.clone());
        conversation.updated_at = assistant_created;

        ChatRepository::save(&state.chats_dir(), &conversation)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(SendMessageResponse {
            assistant_message,
            conversation,
        })
    }
}

fn build_api_messages(
    state: &AppState,
    conversation: &Conversation,
    preset: Option<&PromptPreset>,
) -> Vec<ChatCompletionMessage> {
    let preset_system = preset
        .map(|p| p.system_prompt.trim())
        .unwrap_or("")
        .to_string();
    let config = state.snapshot_config();
    let env_system = config.ai_default_system_prompt.trim().to_string();
    let has_system = conversation
        .messages
        .iter()
        .any(|m| matches!(m.role, MessageRole::System));

    let mut history_messages: Vec<ChatMessage> = Vec::new();

    if !has_system {
        let system_content = if !preset_system.is_empty() {
            preset_system
        } else {
            env_system
        };
        if !system_content.is_empty() {
            history_messages.push(ChatMessage {
                id: "__inline-system__".to_string(),
                conversation_id: conversation.id.clone(),
                role: MessageRole::System,
                content: system_content,
                created_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                images: None,
            });
        }
    }

    for m in &conversation.messages {
        if matches!(
            m.role,
            MessageRole::System | MessageRole::User | MessageRole::Assistant
        ) {
            history_messages.push(m.clone());
        }
    }

    chat_messages_to_completion_messages(&history_messages)
}
