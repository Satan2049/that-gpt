use tauri::{AppHandle, Emitter};

use crate::config::AppState;
use crate::error::AppError;
use crate::models::ai::{chat_messages_to_completion_messages, tool_calls_to_records, TOOLS_SYSTEM_HINT};
use crate::models::api::{ChatStreamCancelledPayload, ChatStreamChunkPayload, ChatStreamStartPayload};
use crate::models::{
    ChatCompletionMessage, ChatMessage, Conversation, ConversationSummary, MessageRole,
    PromptPreset, SendMessageResponse,
};
use crate::repository::ChatRepository;
use crate::services::attachment_validation::{attachments_to_legacy_images, validate_attachments};
use crate::services::prompt::PromptService;
use crate::services::tools::{self, MAX_TOOL_ROUNDS};

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
        attachments: Option<Vec<crate::models::AttachmentEntry>>,
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
        let file_attachments = validate_attachments(attachments, images)?;
        let has_direct_vision = file_attachments
            .iter()
            .any(|a| a.kind == crate::models::AttachmentKind::Image);
        let has_attachments = !file_attachments.is_empty();

        if trimmed.is_empty() && !has_attachments {
            return Err(AppError::bad_request(
                "Message text or at least one attachment is required",
            ));
        }

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let user_message = ChatMessage {
            id: uuid::Uuid::new_v4().to_string(),
            conversation_id: conversation_id.to_string(),
            role: MessageRole::User,
            content: trimmed.to_string(),
            created_at: now.clone(),
            images: attachments_to_legacy_images(&file_attachments),
            attachments: if file_attachments.is_empty() {
                None
            } else {
                Some(file_attachments)
            },
            tool_calls: None,
            tool_call_id: None,
            tool_name: None,
        };
        conversation.messages.push(user_message);

        if conversation.title == NEW_CHAT_TITLE {
            if !trimmed.is_empty() {
                conversation.title = trimmed.chars().take(60).collect();
            } else if has_attachments {
                conversation.title = "Attachment message".to_string();
            }
        }

        let loop_result = run_completion_loop(
            state,
            app,
            conversation_id,
            &mut conversation,
            preset.as_ref(),
            has_direct_vision,
        )
        .await?;

        ChatRepository::save(&state.chats_dir(), &conversation)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(SendMessageResponse {
            assistant_message: loop_result.assistant_message,
            conversation,
        })
    }

    pub async fn regenerate_last_response(
        state: &AppState,
        app: &AppHandle,
        conversation_id: &str,
    ) -> Result<SendMessageResponse, AppError> {
        let mut conversation = ChatRepository::find_by_id(&state.chats_dir(), conversation_id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::not_found("Conversation not found"))?;

        let last_user_idx = conversation
            .messages
            .iter()
            .rposition(|m| m.role == MessageRole::User)
            .ok_or_else(|| AppError::bad_request("No user message to regenerate from"))?;

        conversation.messages.truncate(last_user_idx + 1);

        let preset = load_preset(state, &conversation).await?;
        let has_direct_vision = conversation
            .messages
            .last()
            .is_some_and(|m| m.has_vision_attachments());

        let loop_result = run_completion_loop(
            state,
            app,
            conversation_id,
            &mut conversation,
            preset.as_ref(),
            has_direct_vision,
        )
        .await?;

        ChatRepository::save(&state.chats_dir(), &conversation)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(SendMessageResponse {
            assistant_message: loop_result.assistant_message,
            conversation,
        })
    }

    pub async fn search_conversations(
        state: &AppState,
        query: &str,
    ) -> Result<Vec<ConversationSummary>, AppError> {
        let q = query.trim().to_lowercase();
        let all = ChatRepository::list_all(&state.chats_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if q.is_empty() {
            return Ok(all
                .into_iter()
                .map(|c| ConversationSummary {
                    id: c.id,
                    title: c.title,
                    updated_at: c.updated_at,
                })
                .collect());
        }

        Ok(all
            .into_iter()
            .filter(|c| conversation_matches_query(c, &q))
            .map(|c| ConversationSummary {
                id: c.id,
                title: c.title,
                updated_at: c.updated_at,
            })
            .collect())
    }
}

struct CompletionLoopResult {
    assistant_message: Option<ChatMessage>,
}

async fn load_preset(
    state: &AppState,
    conversation: &Conversation,
) -> Result<Option<PromptPreset>, AppError> {
    let mut preset: Option<PromptPreset> = None;
    if let Some(ref pid) = conversation.prompt_preset_id {
        if let Some(p) = PromptService::get_preset_by_id(state, pid).await? {
            preset = Some(p);
        }
    }
    Ok(preset)
}

fn conversation_matches_query(conversation: &Conversation, q: &str) -> bool {
    if conversation.title.to_lowercase().contains(q) {
        return true;
    }
    conversation.messages.iter().any(|m| {
        m.content.to_lowercase().contains(q)
            || m.tool_name
                .as_ref()
                .is_some_and(|n| n.to_lowercase().contains(q))
    })
}

async fn run_completion_loop(
    state: &AppState,
    app: &AppHandle,
    conversation_id: &str,
    conversation: &mut Conversation,
    preset: Option<&PromptPreset>,
    has_direct_vision: bool,
) -> Result<CompletionLoopResult, AppError> {
    let assistant_id = uuid::Uuid::new_v4().to_string();
    let _ = app.emit(
        "chat-stream-start",
        ChatStreamStartPayload {
            conversation_id: conversation_id.to_string(),
            message_id: assistant_id.clone(),
        },
    );

    let cancel = state.begin_generation(conversation_id);
    let tool_defs = tools::tool_definitions();
    let mut final_content = String::new();
    let mut was_cancelled = false;

    for _round in 0..MAX_TOOL_ROUNDS {
        let api_messages = build_api_messages(state, conversation, preset);
        let model = resolve_model(state, preset, has_direct_vision);

        let result = super::ai::create_chat_completion_non_stream(
            state,
            api_messages,
            Some(model.as_str()),
            preset.map(|p| p.temperature),
            preset.map(|p| p.max_tokens),
            Some(cancel.clone()),
            Some(tool_defs.clone()),
        )
        .await?;

        if result.cancelled {
            was_cancelled = true;
            break;
        }

        if !result.tool_calls.is_empty() {
            let tool_created =
                chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
            conversation.messages.push(ChatMessage {
                id: uuid::Uuid::new_v4().to_string(),
                conversation_id: conversation_id.to_string(),
                role: MessageRole::Assistant,
                content: result.content.clone(),
                created_at: tool_created.clone(),
                images: None,
                attachments: None,
                tool_calls: Some(tool_calls_to_records(&result.tool_calls)),
                tool_call_id: None,
                tool_name: None,
            });

            let tool_messages = tools::execute_tool_calls(
                state,
                app,
                conversation_id,
                conversation,
                &result.tool_calls,
            )
            .await?;
            conversation.messages.extend(tool_messages);
            continue;
        }

        final_content = result.content;
        emit_content_chunks(app, conversation_id, &assistant_id, &final_content);
        break;
    }

    state.finish_generation(conversation_id);

    if was_cancelled {
        let _ = app.emit(
            "chat-stream-cancelled",
            ChatStreamCancelledPayload {
                conversation_id: conversation_id.to_string(),
                message_id: assistant_id.clone(),
            },
        );
    }

    let assistant_message = if final_content.is_empty() {
        None
    } else {
        let assistant_created =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let assistant_message = ChatMessage {
            id: assistant_id,
            conversation_id: conversation_id.to_string(),
            role: MessageRole::Assistant,
            content: final_content,
            created_at: assistant_created.clone(),
            images: None,
            attachments: None,
            tool_calls: None,
            tool_call_id: None,
            tool_name: None,
        };
        conversation.messages.push(assistant_message.clone());
        conversation.updated_at = assistant_created;
        Some(assistant_message)
    };

    if assistant_message.is_none() {
        conversation.updated_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    }

    Ok(CompletionLoopResult {
        assistant_message,
    })
}

fn emit_content_chunks(app: &AppHandle, conversation_id: &str, message_id: &str, content: &str) {
    if content.is_empty() {
        return;
    }
    const CHUNK_CHARS: usize = 48;
    let chars: Vec<char> = content.chars().collect();
    for chunk in chars.chunks(CHUNK_CHARS) {
        let delta: String = chunk.iter().collect();
        let _ = app.emit(
            "chat-stream-chunk",
            ChatStreamChunkPayload {
                conversation_id: conversation_id.to_string(),
                message_id: message_id.to_string(),
                delta,
            },
        );
    }
}

fn resolve_model(state: &AppState, preset: Option<&PromptPreset>, has_direct_vision: bool) -> String {
    let config = state.snapshot_config();

    if has_direct_vision {
        let image_model = config.ai_image_model.trim();
        if !image_model.is_empty() {
            return image_model.to_string();
        }
    }

    preset
        .map(|p| p.model.trim())
        .filter(|model| !model.is_empty())
        .map(str::to_string)
        .unwrap_or(config.ai_model)
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
        let mut system_content = if !preset_system.is_empty() {
            preset_system
        } else {
            env_system
        };
        if !system_content.is_empty() {
            system_content.push_str("\n\n");
        }
        system_content.push_str(TOOLS_SYSTEM_HINT);

        if !system_content.trim().is_empty() {
            history_messages.push(ChatMessage {
                id: "__inline-system__".to_string(),
                conversation_id: conversation.id.clone(),
                role: MessageRole::System,
                content: system_content,
                created_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                images: None,
                attachments: None,
                tool_calls: None,
                tool_call_id: None,
                tool_name: None,
            });
        }
    }

    for m in &conversation.messages {
        if matches!(
            m.role,
            MessageRole::System | MessageRole::User | MessageRole::Assistant | MessageRole::Tool
        ) {
            history_messages.push(m.clone());
        }
    }

    chat_messages_to_completion_messages(&history_messages)
}
