use tauri::State;

use crate::config::AppState;
use crate::error::AppError;
use crate::models::{CreatePresetBody, PromptPreset, UpdatePresetBody};
use crate::services::PromptService;

#[tauri::command]
pub async fn list_prompts(state: State<'_, AppState>) -> Result<Vec<PromptPreset>, String> {
    PromptService::list_presets(&state).await.map_err(String::from)
}

#[tauri::command]
pub async fn get_prompt(state: State<'_, AppState>, id: String) -> Result<PromptPreset, String> {
    PromptService::get_preset_by_id(&state, &id)
        .await
        .map_err(String::from)?
        .ok_or_else(|| AppError::not_found("Preset not found").into())
}

#[tauri::command]
pub async fn create_prompt(
    state: State<'_, AppState>,
    body: CreatePresetBody,
) -> Result<PromptPreset, String> {
    validate_create_body(&body)?;
    PromptService::create_preset(&state, body)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn update_prompt(
    state: State<'_, AppState>,
    id: String,
    body: UpdatePresetBody,
) -> Result<PromptPreset, String> {
    validate_update_body(&body)?;
    PromptService::update_preset(&state, &id, body)
        .await
        .map_err(String::from)
}

#[tauri::command]
pub async fn delete_prompt(state: State<'_, AppState>, id: String) -> Result<(), String> {
    PromptService::delete_preset(&state, &id)
        .await
        .map_err(String::from)
}

fn validate_create_body(body: &CreatePresetBody) -> Result<(), String> {
    if body.name.trim().is_empty() || body.name.len() > 120 {
        return Err(AppError::bad_request("Invalid name").into());
    }
    if body.system_prompt.len() > 32_000 {
        return Err(AppError::bad_request("System prompt too long").into());
    }
    if let Some(t) = body.temperature {
        if !(0.0..=2.0).contains(&t) {
            return Err(AppError::bad_request("Invalid temperature").into());
        }
    }
    if let Some(m) = body.max_tokens {
        if !(1..=128_000).contains(&m) {
            return Err(AppError::bad_request("Invalid maxTokens").into());
        }
    }
    if let Some(ref model) = body.model {
        if model.trim().is_empty() || model.len() > 200 {
            return Err(AppError::bad_request("Invalid model").into());
        }
    }
    Ok(())
}

fn validate_update_body(body: &UpdatePresetBody) -> Result<(), String> {
    if body.name.trim().is_empty() || body.name.len() > 120 {
        return Err(AppError::bad_request("Invalid name").into());
    }
    if body.system_prompt.len() > 32_000 {
        return Err(AppError::bad_request("System prompt too long").into());
    }
    if !(0.0..=2.0).contains(&body.temperature) {
        return Err(AppError::bad_request("Invalid temperature").into());
    }
    if !(1..=128_000).contains(&body.max_tokens) {
        return Err(AppError::bad_request("Invalid maxTokens").into());
    }
    if body.model.trim().is_empty() || body.model.len() > 200 {
        return Err(AppError::bad_request("Invalid model").into());
    }
    Ok(())
}
