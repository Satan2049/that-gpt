use std::collections::HashMap;

use tauri::State;

use crate::config::AppState;
use crate::services::model_prices::{ModelPrice, ModelPriceService};

#[tauri::command]
pub fn get_model_prices(
    state: State<'_, AppState>,
) -> Result<HashMap<String, ModelPrice>, String> {
    crate::services::ModelPriceService::load(&state.data_dir).map_err(String::from)
}

#[tauri::command]
pub fn save_model_prices(
    state: State<'_, AppState>,
    prices: HashMap<String, ModelPrice>,
) -> Result<(), String> {
    ModelPriceService::save(&state.data_dir, &prices).map_err(String::from)
}

#[tauri::command]
pub async fn check_for_updates() -> Result<crate::models::api::UpdateCheckResult, String> {
    crate::services::update_check::check_latest_release()
        .await
        .map_err(String::from)
}
