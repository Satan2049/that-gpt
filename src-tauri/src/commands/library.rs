use tauri::State;

use crate::config::AppState;
use crate::models::knowledge::KnowledgeIndexResult;
use crate::models::library::{AttachmentIndexResult, LibraryFilter};
use crate::services::{KnowledgeService, LibraryService};

#[tauri::command]
pub async fn index_attachments(
    state: State<'_, AppState>,
    filter: Option<String>,
) -> Result<AttachmentIndexResult, String> {
    let filter = match filter.as_deref() {
        Some("images") => LibraryFilter::Images,
        Some("files") => LibraryFilter::Files,
        _ => LibraryFilter::All,
    };
    LibraryService::index_attachments(&state, filter)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn index_knowledge_base(state: State<'_, AppState>) -> Result<KnowledgeIndexResult, String> {
    let config = state.snapshot_config();
    if !config.knowledge_base_enabled {
        return Err("Knowledge base is disabled in settings".to_string());
    }
    let path = config.knowledge_base_path.trim();
    if path.is_empty() {
        return Err("Knowledge base folder path is not set".to_string());
    }
    KnowledgeService::index_folder(std::path::Path::new(path), &state.data_dir, &state)
        .await
        .map_err(String::from)
}
