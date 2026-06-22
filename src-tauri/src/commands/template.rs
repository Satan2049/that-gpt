use tauri::State;

use crate::config::AppState;
use crate::models::chat::CreateFromTemplateBody;
use crate::services::{ChatService, ConversationTemplate, SaveTemplateBody, TemplateService};

#[tauri::command]
pub fn list_templates(state: State<'_, AppState>) -> Result<Vec<ConversationTemplate>, String> {
    TemplateService::list(&state.data_dir).map_err(String::from)
}

#[tauri::command]
pub async fn save_conversation_template(
    state: State<'_, AppState>,
    conversation_id: String,
    body: SaveTemplateBody,
) -> Result<ConversationTemplate, String> {
    let conversation = ChatService::get_conversation(&state, &conversation_id)
        .await
        .map_err(String::from)?;
    TemplateService::save_from_conversation(&state.data_dir, &conversation, &body)
        .map_err(String::from)
}

#[tauri::command]
pub fn delete_template(state: State<'_, AppState>, template_id: String) -> Result<(), String> {
    TemplateService::delete(&state.data_dir, &template_id).map_err(String::from)
}

#[tauri::command]
pub async fn create_conversation_from_template(
    state: State<'_, AppState>,
    body: CreateFromTemplateBody,
) -> Result<crate::models::Conversation, String> {
    ChatService::create_from_template(&state, &body.template_id, body.title)
        .await
        .map_err(String::from)
}
