use tauri::State;

use crate::config::AppState;
use crate::models::{
    AddFolderSourceBody, CreateFolderBody, Folder, PatchFolderBody, RemoveFolderSourceBody,
};
use crate::services::FolderService;

fn validate_uuid(id: &str, field: &str) -> Result<(), String> {
    uuid::Uuid::parse_str(id)
        .map(|_| ())
        .map_err(|_| format!("Invalid {field}"))
}

#[tauri::command]
pub async fn list_folders(state: State<'_, AppState>) -> Result<Vec<Folder>, String> {
    FolderService::list_folders(&state).await.map_err(String::from)
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    body: CreateFolderBody,
) -> Result<Folder, String> {
    FolderService::create_folder(&state, &body.name)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn update_folder(
    state: State<'_, AppState>,
    id: String,
    body: PatchFolderBody,
) -> Result<Folder, String> {
    validate_uuid(&id, "id")?;
    if body.name.is_none() && body.instructions.is_none() {
        return Err("At least one field is required".to_string());
    }
    FolderService::patch_folder(
        &state,
        &id,
        body.name.as_deref(),
        body.instructions,
    )
    .await
    .map_err(String::from)
}

#[tauri::command]
pub async fn delete_folder(state: State<'_, AppState>, id: String) -> Result<(), String> {
    validate_uuid(&id, "id")?;
    FolderService::delete_folder(&state, &id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn add_folder_source(
    state: State<'_, AppState>,
    body: AddFolderSourceBody,
) -> Result<Folder, String> {
    validate_uuid(&body.folder_id, "folderId")?;
    FolderService::add_source(&state, &body)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn remove_folder_source(
    state: State<'_, AppState>,
    body: RemoveFolderSourceBody,
) -> Result<Folder, String> {
    validate_uuid(&body.folder_id, "folderId")?;
    validate_uuid(&body.source_id, "sourceId")?;
    FolderService::remove_source(&state, &body)
        .await
        .map_err(String::from)
}
