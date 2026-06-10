use tauri::State;

use crate::config::AppState;
use crate::models::api::{ConnectionTestResult, ModelsListResult};
use crate::models::settings::{SettingsView, UpdateSettingsBody};
use crate::services::{
    list_models as fetch_provider_models,
    test_api_connection as run_connection_test,
};

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> SettingsView {
    let config = state.snapshot_config();
    SettingsView::from_config(&state.config_dir, &config)
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    body: UpdateSettingsBody,
) -> Result<SettingsView, String> {
    let config = state.update_settings(body).map_err(String::from)?;
    Ok(SettingsView::from_config(&state.config_dir, &config))
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<ModelsListResult, String> {
    fetch_provider_models(&state).await.map_err(String::from)
}

#[tauri::command]
pub async fn test_api_connection(
    state: State<'_, AppState>,
) -> Result<ConnectionTestResult, String> {
    run_connection_test(&state).await.map_err(String::from)
}
