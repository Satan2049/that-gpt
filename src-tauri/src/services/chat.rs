use tauri::{AppHandle, Emitter};

use crate::config::AppState;
use crate::error::AppError;
use crate::models::ai::{chat_messages_to_completion_messages, tool_calls_to_records, TOOLS_SYSTEM_HINT};
use crate::models::api::{
    ChatCitationsPayload, ChatGeneratedImagePayload, ChatStreamCancelledPayload, ChatStreamChunkPayload, ChatStreamStartPayload,
    ChatUsagePayload, KnowledgeCitationPayload,
};
use crate::models::{
    ApiMessagePreview, ChatCompletionMessage, ChatMessage, Conversation, ConversationListView,
    ConversationSummary, MessageRole, PromptPreset, SendMessageResponse,
};
use crate::repository::ChatRepository;
use crate::services::attachment_validation::{attachments_to_legacy_images, validate_attachments};
use crate::services::folder::FolderService;
use crate::services::prompt::PromptService;
use crate::services::templates::TemplateService;
use crate::services::tools::{self, MAX_TOOL_ROUNDS};
use crate::services::UsageLogService;

const NEW_CHAT_TITLE: &str = "New chat";

pub struct ChatService;

impl ChatService {
    async fn load_conversation(state: &AppState, id: &str) -> Result<Conversation, AppError> {
        if let Some(conversation) = state.get_ephemeral(id) {
            return Ok(conversation);
        }

        ChatRepository::find_by_id(&state.chats_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::not_found("Conversation not found"))
    }

    async fn persist_conversation(
        state: &AppState,
        conversation: &Conversation,
    ) -> Result<(), AppError> {
        if conversation.ephemeral {
            state.store_ephemeral(conversation.clone());
            return Ok(());
        }

        ChatRepository::save(&state.chats_dir(), conversation)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    fn summary_sort_key(summary: &ConversationSummary) -> (bool, String) {
        (!summary.pinned, summary.updated_at.clone())
    }

    pub async fn list_conversations(
        state: &AppState,
        view: ConversationListView,
    ) -> Result<Vec<ConversationSummary>, AppError> {
        let mut all = ChatRepository::list_all(&state.chats_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        for ephemeral in state.list_ephemeral_summaries() {
            if !all.iter().any(|c| c.id == ephemeral.id) {
                all.push(ephemeral);
            }
        }

        let mut summaries: Vec<ConversationSummary> = all
            .into_iter()
            .filter(|c| match view {
                ConversationListView::Active => !c.archived,
                ConversationListView::Archived => c.archived,
                ConversationListView::All => true,
            })
            .map(|c| c.to_summary())
            .collect();

        summaries.sort_by(|a, b| {
            Self::summary_sort_key(a)
                .cmp(&Self::summary_sort_key(b))
                .then_with(|| b.updated_at.cmp(&a.updated_at))
        });

        Ok(summaries)
    }

    pub async fn get_conversation(state: &AppState, id: &str) -> Result<Conversation, AppError> {
        Self::load_conversation(state, id).await
    }

    pub async fn create_conversation(
        state: &AppState,
        title: Option<String>,
        ephemeral: bool,
        folder_id: Option<String>,
    ) -> Result<Conversation, AppError> {
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let mut conversation = Conversation {
            id: uuid::Uuid::new_v4().to_string(),
            title: title
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .unwrap_or_else(|| NEW_CHAT_TITLE.to_string()),
            messages: Vec::new(),
            prompt_preset_id: None,
            created_at: now.clone(),
            updated_at: now,
            pinned: false,
            archived: false,
            folder_id: None,
            tags: Vec::new(),
            ephemeral,
            last_model: None,
            temperature_override: None,
            max_tokens_override: None,
            system_prompt_override: None,
            branch_picks: std::collections::HashMap::new(),
        };

        if let Some(folder_id) = folder_id {
            Self::apply_folder_id(state, Some(Some(folder_id)), &mut conversation).await?;
        }

        Self::persist_conversation(state, &conversation).await?;

        Ok(conversation)
    }

    async fn apply_folder_id(
        state: &AppState,
        folder_id: Option<Option<String>>,
        conversation: &mut Conversation,
    ) -> Result<(), AppError> {
        if let Some(folder_id) = folder_id {
            match folder_id {
                None => conversation.folder_id = None,
                Some(id) => {
                    let folders = FolderService::list_folders(state).await?;
                    if !folders.iter().any(|f| f.id == id) {
                        return Err(AppError::bad_request("Folder not found"));
                    }
                    conversation.folder_id = Some(id);
                }
            }
        }
        Ok(())
    }

    pub async fn update_conversation(
        state: &AppState,
        id: &str,
        title: Option<String>,
        prompt_preset_id: Option<Option<String>>,
        pinned: Option<bool>,
        archived: Option<bool>,
        folder_id: Option<Option<String>>,
        tags: Option<Vec<String>>,
        last_model: Option<Option<String>>,
        temperature_override: Option<Option<f64>>,
        max_tokens_override: Option<Option<i64>>,
        system_prompt_override: Option<Option<String>>,
        branch_picks: Option<std::collections::HashMap<String, String>>,
    ) -> Result<Conversation, AppError> {
        let mut conversation = Self::load_conversation(state, id).await?;

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

        if let Some(pinned) = pinned {
            conversation.pinned = pinned;
        }

        if let Some(archived) = archived {
            conversation.archived = archived;
        }

        if let Some(tags) = tags {
            conversation.tags = tags
                .into_iter()
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .take(12)
                .collect();
        }

        if let Some(last_model) = last_model {
            conversation.last_model = last_model;
        }

        if let Some(temperature_override) = temperature_override {
            conversation.temperature_override = temperature_override;
        }

        if let Some(max_tokens_override) = max_tokens_override {
            conversation.max_tokens_override = max_tokens_override;
        }

        if let Some(system_prompt_override) = system_prompt_override {
            conversation.system_prompt_override = system_prompt_override;
        }

        if let Some(branch_picks) = branch_picks {
            conversation.branch_picks = branch_picks;
        }

        Self::apply_folder_id(state, folder_id, &mut conversation).await?;

        conversation.updated_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

        Self::persist_conversation(state, &conversation).await?;

        Ok(conversation)
    }

    pub async fn pin_conversation(
        state: &AppState,
        id: &str,
        pinned: bool,
    ) -> Result<Conversation, AppError> {
        Self::update_conversation(
            state,
            id,
            None,
            None,
            Some(pinned),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
    }

    pub async fn archive_conversation(
        state: &AppState,
        id: &str,
        archived: bool,
    ) -> Result<Conversation, AppError> {
        Self::update_conversation(
            state,
            id,
            None,
            None,
            None,
            Some(archived),
            None,
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
    }

    pub async fn move_to_folder(
        state: &AppState,
        id: &str,
        folder_id: Option<String>,
    ) -> Result<Conversation, AppError> {
        Self::update_conversation(
            state,
            id,
            None,
            None,
            None,
            None,
            Some(folder_id),
            None,
            None,
            None,
            None,
            None,
            None,
        )
        .await
    }

    pub async fn tag_conversation(
        state: &AppState,
        id: &str,
        tags: Vec<String>,
    ) -> Result<Conversation, AppError> {
        Self::update_conversation(
            state,
            id,
            None,
            None,
            None,
            None,
            None,
            Some(tags),
            None,
            None,
            None,
            None,
            None,
        )
        .await
    }

    pub async fn delete_conversation(state: &AppState, id: &str) -> Result<(), AppError> {
        if state.remove_ephemeral(id) {
            return Ok(());
        }

        let deleted = ChatRepository::delete(&state.chats_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if deleted {
            Ok(())
        } else {
            Err(AppError::not_found("Conversation not found"))
        }
    }

    pub async fn burn_ephemeral_conversation(state: &AppState, id: &str) -> Result<(), AppError> {
        if state.remove_ephemeral(id) {
            Ok(())
        } else {
            Err(AppError::not_found("Temporary chat not found"))
        }
    }

    pub async fn toggle_message_bookmark(
        state: &AppState,
        conversation_id: &str,
        message_id: &str,
        bookmarked: bool,
    ) -> Result<Conversation, AppError> {
        let mut conversation = Self::load_conversation(state, conversation_id).await?;
        let message = conversation
            .messages
            .iter_mut()
            .find(|m| m.id == message_id)
            .ok_or_else(|| AppError::not_found("Message not found"))?;
        message.bookmarked = bookmarked;
        conversation.updated_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        Self::persist_conversation(state, &conversation).await?;
        Ok(conversation)
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
        let mut conversation = Self::load_conversation(state, conversation_id).await?;

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
        let file_attachments = validate_attachments(
            attachments,
            images,
            state.snapshot_config().pdf_preview_char_limit as usize,
        )?;
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
            bookmarked: false,
            parent_id: None,
            branch_id: String::new(),
        };
        conversation.messages.push(user_message.clone());

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
            false,
        )
        .await?;

        Self::persist_conversation(state, &conversation).await?;

        Ok(SendMessageResponse {
            assistant_message: loop_result.assistant_message,
            conversation,
        })
    }

    pub async fn edit_message(
        state: &AppState,
        app: &AppHandle,
        conversation_id: &str,
        message_id: &str,
        new_content: &str,
    ) -> Result<SendMessageResponse, AppError> {
        let trimmed = new_content.trim();
        if trimmed.is_empty() {
            return Err(AppError::bad_request("Message cannot be empty"));
        }
        if trimmed.len() > 32_000 {
            return Err(AppError::bad_request("Message too long"));
        }

        let mut conversation = Self::load_conversation(state, conversation_id).await?;

        let message_idx = conversation
            .messages
            .iter()
            .position(|m| m.id == message_id)
            .ok_or_else(|| AppError::not_found("Message not found"))?;

        if conversation.messages[message_idx].role != MessageRole::User {
            return Err(AppError::bad_request("Only user messages can be edited"));
        }

        conversation.messages[message_idx].content = trimmed.to_string();
        conversation.messages.truncate(message_idx + 1);

        let preset = load_preset(state, &conversation).await?;
        let has_direct_vision = conversation.messages[message_idx].has_vision_attachments();

        let loop_result = run_completion_loop(
            state,
            app,
            conversation_id,
            &mut conversation,
            preset.as_ref(),
            has_direct_vision,
            false,
        )
        .await?;

        Self::persist_conversation(state, &conversation).await?;

        Ok(SendMessageResponse {
            assistant_message: loop_result.assistant_message,
            conversation,
        })
    }

    pub async fn retry_message(
        state: &AppState,
        app: &AppHandle,
        conversation_id: &str,
        message_id: Option<&str>,
    ) -> Result<SendMessageResponse, AppError> {
        let mut conversation = Self::load_conversation(state, conversation_id).await?;

        if let Some(mid) = message_id {
            let message_idx = conversation
                .messages
                .iter()
                .position(|m| m.id == mid)
                .ok_or_else(|| AppError::not_found("Message not found"))?;

            match conversation.messages[message_idx].role {
                MessageRole::User => conversation.messages.truncate(message_idx + 1),
                MessageRole::Assistant => conversation.messages.truncate(message_idx),
                _ => {
                    return Err(AppError::bad_request(
                        "Can only retry from a user or assistant message",
                    ));
                }
            }
        } else {
            let last_user_idx = conversation
                .messages
                .iter()
                .rposition(|m| m.role == MessageRole::User)
                .ok_or_else(|| AppError::bad_request("No user message to retry from"))?;
            conversation.messages.truncate(last_user_idx + 1);
        }

        if conversation
            .messages
            .last()
            .is_none_or(|m| m.role != MessageRole::User)
        {
            return Err(AppError::bad_request("No user message to retry from"));
        }

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
            false,
        )
        .await?;

        Self::persist_conversation(state, &conversation).await?;

        Ok(SendMessageResponse {
            assistant_message: loop_result.assistant_message,
            conversation,
        })
    }

    pub async fn regenerate_last_response(
        state: &AppState,
        app: &AppHandle,
        conversation_id: &str,
        create_branch: bool,
    ) -> Result<SendMessageResponse, AppError> {
        let mut conversation = Self::load_conversation(state, conversation_id).await?;

        let last_user_idx = conversation
            .messages
            .iter()
            .rposition(|m| m.role == MessageRole::User)
            .ok_or_else(|| AppError::bad_request("No user message to regenerate from"))?;

        if create_branch {
            let user_id = conversation.messages[last_user_idx].id.clone();
            while conversation
                .messages
                .last()
                .is_some_and(|m| matches!(m.role, MessageRole::Assistant | MessageRole::Tool))
            {
                conversation.messages.pop();
            }
            conversation.branch_picks.remove(&user_id);
        } else {
            conversation.messages.truncate(last_user_idx + 1);
        }

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
            create_branch,
        )
        .await?;

        Self::persist_conversation(state, &conversation).await?;

        Ok(SendMessageResponse {
            assistant_message: loop_result.assistant_message,
            conversation,
        })
    }

    pub async fn fork_conversation(
        state: &AppState,
        conversation_id: &str,
        message_id: &str,
    ) -> Result<Conversation, AppError> {
        let source = Self::load_conversation(state, conversation_id).await?;
        let message_idx = source
            .messages
            .iter()
            .position(|m| m.id == message_id)
            .ok_or_else(|| AppError::not_found("Message not found"))?;

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let new_id = uuid::Uuid::new_v4().to_string();
        let mut id_map = std::collections::HashMap::new();

        let messages: Vec<ChatMessage> = source.messages[..=message_idx]
            .iter()
            .map(|m| {
                let new_message_id = uuid::Uuid::new_v4().to_string();
                id_map.insert(m.id.clone(), new_message_id.clone());
                ChatMessage {
                    id: new_message_id,
                    conversation_id: new_id.clone(),
                    role: m.role,
                    content: m.content.clone(),
                    created_at: m.created_at.clone(),
                    images: m.images.clone(),
                    attachments: m.attachments.clone(),
                    tool_calls: m.tool_calls.clone(),
                    tool_call_id: m.tool_call_id.clone(),
                    tool_name: m.tool_name.clone(),
                    bookmarked: m.bookmarked,
                    parent_id: m
                        .parent_id
                        .as_ref()
                        .and_then(|pid| id_map.get(pid).cloned()),
                    branch_id: m.branch_id.clone(),
                }
            })
            .collect();

        let forked = Conversation {
            id: new_id,
            title: format!("Fork: {}", source.title),
            messages,
            prompt_preset_id: source.prompt_preset_id.clone(),
            created_at: now.clone(),
            updated_at: now,
            pinned: false,
            archived: false,
            folder_id: source.folder_id.clone(),
            tags: source.tags.clone(),
            ephemeral: false,
            last_model: source.last_model.clone(),
            temperature_override: source.temperature_override,
            max_tokens_override: source.max_tokens_override,
            system_prompt_override: source.system_prompt_override.clone(),
            branch_picks: std::collections::HashMap::new(),
        };

        Self::persist_conversation(state, &forked).await?;
        Ok(forked)
    }

    pub async fn create_from_template(
        state: &AppState,
        template_id: &str,
        title: Option<String>,
    ) -> Result<Conversation, AppError> {
        let templates = TemplateService::list(&state.data_dir)?;
        let template = templates
            .into_iter()
            .find(|t| t.id == template_id)
            .ok_or_else(|| AppError::not_found("Template not found"))?;

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let conversation_id = uuid::Uuid::new_v4().to_string();
        let conversation = Conversation {
            id: conversation_id.clone(),
            title: title
                .map(|t| t.trim().to_string())
                .filter(|t| !t.is_empty())
                .unwrap_or_else(|| template.name.clone()),
            messages: TemplateService::apply_to_conversation(&template, &conversation_id),
            prompt_preset_id: None,
            created_at: now.clone(),
            updated_at: now,
            pinned: false,
            archived: false,
            folder_id: None,
            tags: Vec::new(),
            ephemeral: false,
            last_model: template.model.clone(),
            temperature_override: None,
            max_tokens_override: None,
            system_prompt_override: template.system_prompt.clone(),
            branch_picks: std::collections::HashMap::new(),
        };

        Self::persist_conversation(state, &conversation).await?;
        Ok(conversation)
    }

    pub async fn preview_api_messages(
        state: &AppState,
        conversation_id: &str,
    ) -> Result<Vec<ApiMessagePreview>, AppError> {
        let conversation = Self::load_conversation(state, conversation_id).await?;
        let preset = load_preset(state, &conversation).await?;
        let knowledge = if state.snapshot_config().knowledge_base_enabled {
            let user_query = conversation
                .messages
                .iter()
                .rev()
                .find(|m| m.role == MessageRole::User)
                .map(|m| m.content.as_str())
                .unwrap_or("");
            super::knowledge::KnowledgeService::retrieve(state, &state.data_dir, user_query)
                .await
                .ok()
                .flatten()
        } else {
            None
        };

        let folder_context = if let Some(folder_id) = conversation.folder_id.as_deref() {
            FolderService::build_context_block(state, folder_id)
                .await
                .ok()
                .filter(|s| !s.trim().is_empty())
        } else {
            None
        };

        let api_messages = build_api_messages(
            state,
            &conversation,
            preset.as_ref(),
            knowledge.as_ref(),
            folder_context.as_deref(),
        );

        Ok(api_messages
            .into_iter()
            .map(|m| ApiMessagePreview {
                role: m.role.clone(),
                content: message_content_preview(&m),
            })
            .collect())
    }

    pub async fn search_conversations(
        state: &AppState,
        query: &str,
    ) -> Result<Vec<ConversationSummary>, AppError> {
        let q = query.trim().to_lowercase();
        let mut all = ChatRepository::list_all(&state.chats_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        for ephemeral in state.list_ephemeral_summaries() {
            if !all.iter().any(|c| c.id == ephemeral.id) {
                all.push(ephemeral);
            }
        }

        if q.is_empty() {
            return Ok(all
                .into_iter()
                .map(|c| c.to_summary())
                .collect());
        }

        Ok(all
            .into_iter()
            .filter(|c| conversation_matches_query(c, &q))
            .map(|c| c.to_summary())
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
    create_branch: bool,
) -> Result<CompletionLoopResult, AppError> {
    let assistant_id = uuid::Uuid::new_v4().to_string();
    let parent_user_id = conversation
        .messages
        .iter()
        .rev()
        .find(|m| m.role == MessageRole::User)
        .map(|m| m.id.clone());
    let _ = app.emit(
        "chat-stream-start",
        ChatStreamStartPayload {
            conversation_id: conversation_id.to_string(),
            message_id: assistant_id.clone(),
        },
    );

    let cancel = state.begin_generation(conversation_id);
    let tool_defs = tools::tool_definitions(state);
    let mut generated_images: Vec<crate::models::chat::ChatImageAttachment> = Vec::new();
    let mut final_content = String::new();
    let mut was_cancelled = false;
    let mut last_usage = None;
    let temperature = conversation
        .temperature_override
        .or_else(|| preset.map(|p| p.temperature));
    let max_tokens = conversation
        .max_tokens_override
        .map(|v| v as i64)
        .or_else(|| preset.map(|p| p.max_tokens));
    let model = resolve_model(state, conversation, preset, has_direct_vision);

    let user_query = conversation
        .messages
        .iter()
        .rev()
        .find(|m| m.role == MessageRole::User)
        .map(|m| m.content.as_str())
        .unwrap_or("");

    let knowledge = if state.snapshot_config().knowledge_base_enabled {
        super::knowledge::KnowledgeService::retrieve(state, &state.data_dir, user_query)
            .await
            .ok()
            .flatten()
    } else {
        None
    };

    if let Some(ref retrieval) = knowledge {
        if !retrieval.citations.is_empty() {
            let _ = app.emit(
                "chat-citations",
                ChatCitationsPayload {
                    conversation_id: conversation_id.to_string(),
                    message_id: assistant_id.clone(),
                    citations: retrieval
                        .citations
                        .iter()
                        .map(|c| KnowledgeCitationPayload {
                            index: c.index,
                            source_name: c.source_name.clone(),
                            source_path: c.source_path.clone(),
                            excerpt: c.excerpt.clone(),
                        })
                        .collect(),
                },
            );
        }
    }

    let folder_context = if let Some(folder_id) = conversation.folder_id.as_deref() {
        FolderService::build_context_block(state, folder_id)
            .await
            .ok()
            .filter(|s| !s.trim().is_empty())
    } else {
        None
    };

    for _round in 0..MAX_TOOL_ROUNDS {
        let api_messages = build_api_messages(
            state,
            conversation,
            preset,
            knowledge.as_ref(),
            folder_context.as_deref(),
        );

        if !conversation_may_need_tools(state, conversation) {
            let app_handle = app.clone();
            let stream_conversation_id = conversation_id.to_string();
            let stream_message_id = assistant_id.clone();
            let stream_result = super::ai::create_chat_completion_stream(
                state,
                api_messages,
                Some(model.as_str()),
                temperature,
                max_tokens,
                Some(cancel.clone()),
                move |delta| {
                    if delta.is_empty() {
                        return;
                    }
                    let _ = app_handle.emit(
                        "chat-stream-chunk",
                        ChatStreamChunkPayload {
                            conversation_id: stream_conversation_id.clone(),
                            message_id: stream_message_id.clone(),
                            delta: delta.to_string(),
                        },
                    );
                },
            )
            .await?;

            if stream_result.cancelled {
                was_cancelled = true;
            } else {
                final_content = stream_result.content;
                last_usage = stream_result.usage;
            }
            break;
        }

        let result = super::ai::create_chat_completion_non_stream(
            state,
            api_messages.clone(),
            Some(model.as_str()),
            temperature,
            max_tokens,
            Some(cancel.clone()),
            Some(tool_defs.clone()),
        )
        .await?;

        if result.cancelled {
            was_cancelled = true;
            break;
        }

        if let Some(usage) = result.usage {
            last_usage = Some(usage);
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
                bookmarked: false,
                parent_id: parent_user_id.clone(),
                branch_id: String::new(),
            });

            let outcome = tools::execute_tool_calls(
                state,
                app,
                conversation_id,
                &assistant_id,
                conversation,
                &result.tool_calls,
            )
            .await?;
            generated_images.extend(outcome.generated_images);
            conversation.messages.extend(outcome.messages);
            continue;
        }

        let app_handle = app.clone();
        let stream_conversation_id = conversation_id.to_string();
        let stream_message_id = assistant_id.clone();
        let stream_result = super::ai::create_chat_completion_stream(
            state,
            api_messages,
            Some(model.as_str()),
            temperature,
            max_tokens,
            Some(cancel.clone()),
            move |delta| {
                if delta.is_empty() {
                    return;
                }
                let _ = app_handle.emit(
                    "chat-stream-chunk",
                    ChatStreamChunkPayload {
                        conversation_id: stream_conversation_id.clone(),
                        message_id: stream_message_id.clone(),
                        delta: delta.to_string(),
                    },
                );
            },
        )
        .await?;

        if stream_result.cancelled {
            was_cancelled = true;
        } else {
            final_content = stream_result.content;
            last_usage = stream_result.usage;
        }
        break;
    }

    state.finish_generation(conversation_id);

    if let Some(usage) = last_usage.clone() {
        let _ = app.emit(
            "chat-usage",
            ChatUsagePayload {
                conversation_id: conversation_id.to_string(),
                message_id: assistant_id.clone(),
                usage: usage.clone(),
            },
        );
        let _ = UsageLogService::append(
            &state.data_dir,
            conversation_id,
            &assistant_id,
            &model,
            &usage,
        );
    }

    if was_cancelled {
        let _ = app.emit(
            "chat-stream-cancelled",
            ChatStreamCancelledPayload {
                conversation_id: conversation_id.to_string(),
                message_id: assistant_id.clone(),
            },
        );
    }

    let assistant_message = if final_content.is_empty() && generated_images.is_empty() {
        None
    } else {
        let assistant_created =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let content = if final_content.is_empty() {
            "Here is your generated image.".to_string()
        } else {
            final_content
        };
        let assistant_message = ChatMessage {
            id: assistant_id.clone(),
            conversation_id: conversation_id.to_string(),
            role: MessageRole::Assistant,
            content,
            created_at: assistant_created.clone(),
            images: if generated_images.is_empty() {
                None
            } else {
                Some(generated_images)
            },
            attachments: None,
            tool_calls: None,
            tool_call_id: None,
            tool_name: None,
            bookmarked: false,
            parent_id: parent_user_id.clone(),
            branch_id: String::new(),
        };
        if create_branch {
            if let Some(pid) = parent_user_id {
                conversation
                    .branch_picks
                    .insert(pid, assistant_message.id.clone());
            }
        }
        conversation.messages.push(assistant_message.clone());
        conversation.updated_at = assistant_created;
        conversation.last_model = Some(model.clone());
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

fn conversation_may_need_tools(state: &AppState, conversation: &Conversation) -> bool {
    let config = state.snapshot_config();
    if config.web_search_enabled
        || config.knowledge_base_enabled
        || !config.ai_image_model.trim().is_empty()
    {
        return true;
    }
    conversation.messages.iter().any(|m| {
        matches!(m.role, MessageRole::User)
            && (m.attachments.as_ref().is_some_and(|a| !a.is_empty())
                || m.images.as_ref().is_some_and(|i| !i.is_empty()))
    })
}

fn is_message_visible(conversation: &Conversation, msg: &ChatMessage) -> bool {
    if msg.role != MessageRole::Assistant {
        return true;
    }
    let Some(parent_id) = msg.parent_id.as_deref() else {
        return true;
    };
    let siblings: Vec<&ChatMessage> = conversation
        .messages
        .iter()
        .filter(|m| {
            m.role == MessageRole::Assistant && m.parent_id.as_deref() == Some(parent_id)
        })
        .collect();
    if siblings.len() <= 1 {
        return true;
    }
    if let Some(picked) = conversation.branch_picks.get(parent_id) {
        return msg.id == *picked;
    }
    siblings
        .iter()
        .max_by_key(|m| &m.created_at)
        .is_some_and(|latest| latest.id == msg.id)
}

fn message_content_preview(message: &ChatCompletionMessage) -> String {
    use crate::models::ai::ChatCompletionContent;
    match &message.content {
        Some(ChatCompletionContent::Text(text)) => text.clone(),
        Some(ChatCompletionContent::Parts(parts)) => parts
            .iter()
            .filter_map(|part| match part {
                crate::models::ai::ChatCompletionContentPart::Text { text } => Some(text.as_str()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join("\n"),
        None => String::new(),
    }
}

fn resolve_model(
    state: &AppState,
    conversation: &Conversation,
    preset: Option<&PromptPreset>,
    _has_direct_vision: bool,
) -> String {
    let config = state.snapshot_config();

    conversation
        .last_model
        .as_deref()
        .map(str::trim)
        .filter(|model| !model.is_empty())
        .map(str::to_string)
        .or_else(|| {
            preset
                .map(|p| p.model.trim())
                .filter(|model| !model.is_empty())
                .map(str::to_string)
        })
        .unwrap_or(config.ai_model)
}

fn build_api_messages(
    state: &AppState,
    conversation: &Conversation,
    preset: Option<&PromptPreset>,
    knowledge: Option<&crate::models::knowledge::KnowledgeRetrieval>,
    folder_context: Option<&str>,
) -> Vec<ChatCompletionMessage> {
    let preset_system = conversation
        .system_prompt_override
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .or_else(|| {
            preset
                .map(|p| p.system_prompt.trim())
                .filter(|s| !s.is_empty())
                .map(str::to_string)
        })
        .unwrap_or_default();
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

        if config.knowledge_base_enabled {
            if let Some(rag) = knowledge {
                if !rag.system_block.trim().is_empty() {
                    system_content.push_str("\n\n");
                    system_content.push_str(&rag.system_block);
                }
            }
        }

        if let Some(ctx) = folder_context {
            if !ctx.trim().is_empty() {
                system_content.push_str("\n\n");
                system_content.push_str(ctx);
            }
        }

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
                bookmarked: false,
                parent_id: None,
                branch_id: String::new(),
            });
        }
    }

    for m in &conversation.messages {
        if !is_message_visible(conversation, m) {
            continue;
        }
        if matches!(
            m.role,
            MessageRole::System | MessageRole::User | MessageRole::Assistant | MessageRole::Tool
        ) {
            history_messages.push(m.clone());
        }
    }

    let limit = state.snapshot_config().ai_context_message_limit;
    if limit > 0 {
        let system_msgs: Vec<ChatMessage> = history_messages
            .iter()
            .filter(|m| m.role == MessageRole::System)
            .cloned()
            .collect();
        let mut non_system: Vec<ChatMessage> = history_messages
            .into_iter()
            .filter(|m| m.role != MessageRole::System)
            .collect();
        if non_system.len() > limit as usize {
            non_system = non_system.split_off(non_system.len() - limit as usize);
        }
        let mut out = system_msgs;
        out.extend(non_system);
        return chat_messages_to_completion_messages(&out);
    }

    chat_messages_to_completion_messages(&history_messages)
}
