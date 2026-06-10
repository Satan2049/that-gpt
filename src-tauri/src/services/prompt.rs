use crate::config::AppState;
use crate::error::AppError;
use crate::models::{CreatePresetBody, PromptPreset, UpdatePresetBody};
use crate::repository::PromptRepository;

pub struct PromptService;

impl PromptService {
    pub async fn list_presets(state: &AppState) -> Result<Vec<PromptPreset>, AppError> {
        Self::ensure_built_in_presets_if_empty(state).await?;
        PromptRepository::list_all(&state.prompts_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn get_preset_by_id(
        state: &AppState,
        id: &str,
    ) -> Result<Option<PromptPreset>, AppError> {
        Self::ensure_built_in_presets_if_empty(state).await?;
        PromptRepository::find_by_id(&state.prompts_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn create_preset(
        state: &AppState,
        input: CreatePresetBody,
    ) -> Result<PromptPreset, AppError> {
        Self::ensure_built_in_presets_if_empty(state).await?;
        let config = state.snapshot_config();
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let preset = PromptPreset {
            id: uuid::Uuid::new_v4().to_string(),
            name: input.name.trim().to_string(),
            system_prompt: input.system_prompt,
            temperature: input.temperature.unwrap_or(0.7),
            max_tokens: input.max_tokens.unwrap_or(2048),
            model: input
                .model
                .map(|m| m.trim().to_string())
                .filter(|m| !m.is_empty())
                .unwrap_or_else(|| config.ai_model.clone()),
            created_at: now.clone(),
            updated_at: now,
        };

        PromptRepository::save(&state.prompts_dir(), &preset)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(preset)
    }

    pub async fn update_preset(
        state: &AppState,
        id: &str,
        input: UpdatePresetBody,
    ) -> Result<PromptPreset, AppError> {
        let existing = PromptRepository::find_by_id(&state.prompts_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::not_found("Preset not found"))?;

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let preset = PromptPreset {
            id: existing.id,
            name: input.name.trim().to_string(),
            system_prompt: input.system_prompt,
            temperature: input.temperature,
            max_tokens: input.max_tokens,
            model: input.model.trim().to_string(),
            created_at: existing.created_at,
            updated_at: now,
        };

        PromptRepository::save(&state.prompts_dir(), &preset)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(preset)
    }

    pub async fn delete_preset(state: &AppState, id: &str) -> Result<(), AppError> {
        let deleted = PromptRepository::delete(&state.prompts_dir(), id)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if deleted {
            Ok(())
        } else {
            Err(AppError::not_found("Preset not found"))
        }
    }

    async fn ensure_built_in_presets_if_empty(state: &AppState) -> Result<(), AppError> {
        let ids = PromptRepository::list_ids(&state.prompts_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        if !ids.is_empty() {
            return Ok(());
        }

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let config = state.snapshot_config();
        let default_system = config.ai_default_system_prompt.trim();
        let default_system = if default_system.is_empty() {
            "You are a helpful assistant.".to_string()
        } else {
            default_system.to_string()
        };

        let built_ins = [
            (
                "General Assistant",
                default_system.clone(),
                0.7_f64,
                2048_i64,
            ),
            (
                "Code Reviewer",
                "You review code for correctness, security, and clarity. Be concise and actionable."
                    .to_string(),
                0.4,
                4096,
            ),
        ];

        for (name, system_prompt, temperature, max_tokens) in built_ins {
            let preset = PromptPreset {
                id: uuid::Uuid::new_v4().to_string(),
                name: name.to_string(),
                system_prompt,
                temperature,
                max_tokens,
                model: config.ai_model.clone(),
                created_at: now.clone(),
                updated_at: now.clone(),
            };
            PromptRepository::save(&state.prompts_dir(), &preset)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }

        Ok(())
    }
}
