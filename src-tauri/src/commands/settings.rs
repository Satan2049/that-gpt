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
pub async fn update_settings(
    state: State<'_, AppState>,
    body: UpdateSettingsBody,
) -> Result<SettingsView, String> {
    let should_index = body.knowledge_base_enabled
        && !body.knowledge_base_path.trim().is_empty();
    let index_path = body.knowledge_base_path.trim().to_string();

    let config = state.update_settings(body).map_err(String::from)?;

    if should_index {
        let _ = crate::services::KnowledgeService::index_folder(
            std::path::Path::new(&index_path),
            &state.data_dir,
            &state,
        )
        .await;
    }

    Ok(SettingsView::from_config(&state.config_dir, &config))
}

#[tauri::command]
pub fn get_usage_analytics(
    state: State<'_, AppState>,
    days: Option<u32>,
) -> Result<Vec<crate::services::UsageDaySummary>, String> {
    let days = days.unwrap_or(30).clamp(1, 365);
    crate::services::UsageLogService::summarize(&state.data_dir, days).map_err(String::from)
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
