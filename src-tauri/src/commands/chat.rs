use tauri::State;

use crate::config::AppState;
use crate::error::AppError;
use crate::models::{
    ArchiveConversationBody, Conversation, ConversationListView, ConversationSummary,
    CreateConversationBody, EditMessageBody, ForkConversationBody, MoveToFolderBody,
    PatchConversationBody, PinConversationBody, RetryMessageBody, SendMessageBody,
    SendMessageResponse, TagConversationBody,
};
use crate::services::{export_conversation as render_conversation_export, ChatService, ExportFormat};

fn validate_uuid(id: &str, field: &str) -> Result<(), String> {
    uuid::Uuid::parse_str(id)
        .map(|_| ())
        .map_err(|_| format!("Invalid {field}"))
}

#[tauri::command]
pub async fn list_conversations(
    state: State<'_, AppState>,
    view: Option<String>,
) -> Result<Vec<ConversationSummary>, String> {
    let list_view = match view.as_deref() {
        Some("archived") => ConversationListView::Archived,
        Some("all") => ConversationListView::All,
        _ => ConversationListView::Active,
    };
    ChatService::list_conversations(&state, list_view)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn get_conversation(state: State<'_, AppState>, id: String) -> Result<Conversation, String> {
    ChatService::get_conversation(&state, &id).await.map_err(String::from)
}

#[tauri::command]
pub async fn create_conversation(
    state: State<'_, AppState>,
    body: CreateConversationBody,
) -> Result<Conversation, String> {
    if let Some(ref title) = body.title {
        if title.trim().is_empty() || title.len() > 200 {
            return Err(AppError::bad_request("Invalid title").into());
        }
    }
    if let Some(ref folder_id) = body.folder_id {
        validate_uuid(folder_id, "folderId")?;
    }
    ChatService::create_conversation(&state, body.title, body.ephemeral, body.folder_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn update_conversation(
    state: State<'_, AppState>,
    id: String,
    body: PatchConversationBody,
) -> Result<Conversation, String> {
    if body.title.is_none()
        && body.prompt_preset_id.is_none()
        && body.pinned.is_none()
        && body.archived.is_none()
        && body.folder_id.is_none()
        && body.tags.is_none()
        && body.last_model.is_none()
        && body.temperature_override.is_none()
        && body.max_tokens_override.is_none()
        && body.system_prompt_override.is_none()
        && body.branch_picks.is_none()
    {
        return Err(AppError::bad_request("At least one field is required").into());
    }

    if let Some(ref title) = body.title {
        if title.trim().is_empty() || title.len() > 200 {
            return Err(AppError::bad_request("Invalid title").into());
        }
    }

    if let Some(Some(ref preset_id)) = body.prompt_preset_id {
        validate_uuid(preset_id, "promptPresetId")?;
    }

    if let Some(Some(ref folder_id)) = body.folder_id {
        validate_uuid(folder_id, "folderId")?;
    }

    ChatService::update_conversation(
        &state,
        &id,
        body.title,
        body.prompt_preset_id,
        body.pinned,
        body.archived,
        body.folder_id,
        body.tags,
        body.last_model,
        body.temperature_override,
        body.max_tokens_override,
        body.system_prompt_override,
        body.branch_picks,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn delete_conversation(state: State<'_, AppState>, id: String) -> Result<(), String> {
    ChatService::delete_conversation(&state, &id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn pin_conversation(
    state: State<'_, AppState>,
    body: PinConversationBody,
) -> Result<Conversation, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    ChatService::pin_conversation(&state, &body.conversation_id, body.pinned)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn archive_conversation(
    state: State<'_, AppState>,
    body: ArchiveConversationBody,
) -> Result<Conversation, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    ChatService::archive_conversation(&state, &body.conversation_id, body.archived)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn move_to_folder(
    state: State<'_, AppState>,
    body: MoveToFolderBody,
) -> Result<Conversation, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    if let Some(ref folder_id) = body.folder_id {
        validate_uuid(folder_id, "folderId")?;
    }
    ChatService::move_to_folder(&state, &body.conversation_id, body.folder_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn tag_conversation(
    state: State<'_, AppState>,
    body: TagConversationBody,
) -> Result<Conversation, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    ChatService::tag_conversation(&state, &body.conversation_id, body.tags)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn burn_ephemeral_conversation(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<(), String> {
    validate_uuid(&conversation_id, "conversationId")?;
    ChatService::burn_ephemeral_conversation(&state, &conversation_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn send_message(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    body: SendMessageBody,
) -> Result<SendMessageResponse, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;

    if body.message.len() > 32_000 {
        return Err(AppError::bad_request("Message too long").into());
    }

    if let Some(Some(ref preset_id)) = body.prompt_preset_id {
        validate_uuid(preset_id, "promptPresetId")?;
    }

    if let Some(ref attachments) = body.attachments {
        if attachments.len() > 4 {
            return Err(AppError::bad_request("At most 4 attachments per message").into());
        }
    }

    if let Some(ref images) = body.images {
        if images.len() > 4 {
            return Err(AppError::bad_request("At most 4 images per message").into());
        }
    }

    ChatService::send_message(
        &state,
        &app,
        &body.conversation_id,
        &body.message,
        body.prompt_preset_id,
        body.images,
        body.attachments,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn regenerate_last_response(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    conversation_id: String,
    create_branch: Option<bool>,
) -> Result<SendMessageResponse, String> {
    validate_uuid(&conversation_id, "conversationId")?;
    ChatService::regenerate_last_response(
        &state,
        &app,
        &conversation_id,
        create_branch.unwrap_or(false),
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn fork_conversation(
    state: State<'_, AppState>,
    body: ForkConversationBody,
) -> Result<Conversation, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    validate_uuid(&body.message_id, "messageId")?;
    ChatService::fork_conversation(&state, &body.conversation_id, &body.message_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn preview_api_messages(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<Vec<crate::models::ApiMessagePreview>, String> {
    validate_uuid(&conversation_id, "conversationId")?;
    ChatService::preview_api_messages(&state, &conversation_id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn edit_message(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    body: EditMessageBody,
) -> Result<SendMessageResponse, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    validate_uuid(&body.message_id, "messageId")?;

    if body.content.len() > 32_000 {
        return Err(AppError::bad_request("Message too long").into());
    }

    ChatService::edit_message(
        &state,
        &app,
        &body.conversation_id,
        &body.message_id,
        &body.content,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn retry_message(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    body: RetryMessageBody,
) -> Result<SendMessageResponse, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    if let Some(ref message_id) = body.message_id {
        validate_uuid(message_id, "messageId")?;
    }

    ChatService::retry_message(
        &state,
        &app,
        &body.conversation_id,
        body.message_id.as_deref(),
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn search_conversations(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<ConversationSummary>, String> {
    ChatService::search_conversations(&state, &query)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn cancel_generation(
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<bool, String> {
    validate_uuid(&conversation_id, "conversationId")?;
    Ok(state.cancel_generation(&conversation_id))
}

#[tauri::command]
pub async fn toggle_message_bookmark(
    state: State<'_, AppState>,
    body: crate::models::ToggleBookmarkBody,
) -> Result<Conversation, String> {
    validate_uuid(&body.conversation_id, "conversationId")?;
    validate_uuid(&body.message_id, "messageId")?;
    ChatService::toggle_message_bookmark(
        &state,
        &body.conversation_id,
        &body.message_id,
        body.bookmarked,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn export_conversation(
    state: State<'_, AppState>,
    id: String,
    format: String,
) -> Result<String, String> {
    let export_format = ExportFormat::parse(&format).map_err(String::from)?;
    let conversation = ChatService::get_conversation(&state, &id).await.map_err(String::from)?;
    Ok(render_conversation_export(&conversation, export_format))
}
