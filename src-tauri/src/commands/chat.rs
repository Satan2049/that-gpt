use tauri::State;

use crate::config::AppState;
use crate::error::AppError;
use crate::models::{
    Conversation, ConversationSummary, CreateConversationBody, PatchConversationBody,
    SendMessageBody, SendMessageResponse,
};
use crate::services::{export_conversation as render_conversation_export, ChatService, ExportFormat};

fn validate_uuid(id: &str, field: &str) -> Result<(), String> {
    uuid::Uuid::parse_str(id)
        .map(|_| ())
        .map_err(|_| format!("Invalid {field}"))
}

#[tauri::command]
pub async fn list_conversations(state: State<'_, AppState>) -> Result<Vec<ConversationSummary>, String> {
    ChatService::list_conversations(&state).await.map_err(String::from)
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
    ChatService::create_conversation(&state, body.title)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn update_conversation(
    state: State<'_, AppState>,
    id: String,
    body: PatchConversationBody,
) -> Result<Conversation, String> {
    if body.title.is_none() && body.prompt_preset_id.is_none() {
        return Err(AppError::bad_request(
            "At least one of title or promptPresetId is required",
        )
        .into());
    }

    if let Some(ref title) = body.title {
        if title.trim().is_empty() || title.len() > 200 {
            return Err(AppError::bad_request("Invalid title").into());
        }
    }

    if let Some(Some(ref preset_id)) = body.prompt_preset_id {
        validate_uuid(preset_id, "promptPresetId")?;
    }

    ChatService::update_conversation(&state, &id, body.title, body.prompt_preset_id)
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
