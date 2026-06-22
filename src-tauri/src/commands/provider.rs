use tauri::State;

use crate::config::AppState;
use crate::models::provider::{ProviderStore, SetActiveProviderBody, UpsertProviderBody};
use crate::models::ConnectionTestResult;
use crate::services::ProviderService;

#[tauri::command]
pub async fn list_providers(state: State<'_, AppState>) -> Result<ProviderStore, String> {
    ProviderService::list_providers(&state)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn upsert_provider(
    state: State<'_, AppState>,
    body: UpsertProviderBody,
) -> Result<ProviderStore, String> {
    ProviderService::upsert_provider(&state, body)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn delete_provider(state: State<'_, AppState>, id: String) -> Result<ProviderStore, String> {
    ProviderService::delete_provider(&state, &id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn set_active_provider(
    state: State<'_, AppState>,
    body: SetActiveProviderBody,
) -> Result<ProviderStore, String> {
    ProviderService::set_active_provider(&state, &body.id)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn test_provider(body: UpsertProviderBody) -> Result<ConnectionTestResult, String> {
    ProviderService::test_provider(&body)
        .await
        .map_err(String::from)
}
