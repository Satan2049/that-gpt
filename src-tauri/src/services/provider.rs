use crate::config::{AppConfig, AppState};
use crate::error::AppError;
use crate::models::provider::{ProviderKind, ProviderProfile, ProviderStore, UpsertProviderBody};
use crate::models::settings::UpdateSettingsBody;
use crate::models::{ConnectionTestResult, ModelInfo};
use crate::repository::ProviderRepository;
use crate::services::ai::test_provider_connection;
use crate::services::model_catalog::infer_one;
use crate::services::secrets::{delete_secret, get_secret, provider_key, set_secret};

pub struct ProviderService;

impl ProviderService {
    fn hydrate_provider_keys(store: &mut ProviderStore) {
        for profile in &mut store.providers {
            if let Some(key) = get_secret(&provider_key(&profile.id)) {
                profile.api_key = key;
                continue;
            }
            if !profile.api_key.is_empty() {
                let _ = set_secret(&provider_key(&profile.id), &profile.api_key);
            }
        }
    }

    fn store_for_disk(store: &ProviderStore) -> ProviderStore {
        let mut disk = store.clone();
        for profile in &mut disk.providers {
            profile.api_key = String::new();
        }
        disk
    }

    fn persist_provider_keys(store: &ProviderStore) {
        for profile in &store.providers {
            if profile.api_key.is_empty() {
                let _ = delete_secret(&provider_key(&profile.id));
            } else {
                let _ = set_secret(&provider_key(&profile.id), &profile.api_key);
            }
        }
    }

    pub async fn load_store(state: &AppState) -> Result<ProviderStore, AppError> {
        if let Some(mut store) = ProviderRepository::load(&state.data_dir)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?
        {
            Self::hydrate_provider_keys(&mut store);
            let disk = Self::store_for_disk(&store);
            if store.providers.iter().any(|p| !p.api_key.is_empty()) {
                Self::persist_provider_keys(&store);
                ProviderRepository::save(&state.data_dir, &disk)
                    .await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
            }
            return Ok(store);
        }

        let config = state.snapshot_config();
        let id = uuid::Uuid::new_v4().to_string();
        let kind = ProviderKind::from_base_url(&config.ai_base_url);
        let store = ProviderStore {
            active_id: id.clone(),
            providers: vec![ProviderProfile {
                id,
                name: if kind == ProviderKind::Ollama {
                    "Ollama (local)".to_string()
                } else {
                    "Default".to_string()
                },
                kind,
                base_url: config.ai_base_url.clone(),
                api_key: config.ai_api_key.clone(),
                default_model: config.ai_model.clone(),
                image_model: config.ai_image_model.clone(),
                audio_model: config.ai_audio_model.clone(),
            }],
        };

        Self::persist_provider_keys(&store);
        ProviderRepository::save(&state.data_dir, &Self::store_for_disk(&store))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(store)
    }

    async fn persist_store(state: &AppState, store: &ProviderStore) -> Result<(), AppError> {
        Self::persist_provider_keys(store);
        ProviderRepository::save(&state.data_dir, &Self::store_for_disk(store))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub async fn list_providers(state: &AppState) -> Result<ProviderStore, AppError> {
        Self::load_store(state).await
    }

    pub async fn upsert_provider(
        state: &AppState,
        body: UpsertProviderBody,
    ) -> Result<ProviderStore, AppError> {
        let mut store = Self::load_store(state).await?;
        let trimmed_name = body.name.trim();
        if trimmed_name.is_empty() {
            return Err(AppError::bad_request("Provider name is required"));
        }

        let profile = ProviderProfile {
            id: body
                .id
                .filter(|id| !id.is_empty())
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string()),
            name: trimmed_name.to_string(),
            kind: body.kind,
            base_url: body.base_url.trim().to_string(),
            api_key: body.api_key,
            default_model: body.default_model.trim().to_string(),
            image_model: body.image_model.unwrap_or_default(),
            audio_model: body.audio_model.unwrap_or_default(),
        };

        if let Some(idx) = store.providers.iter().position(|p| p.id == profile.id) {
            store.providers[idx] = profile;
        } else {
            store.providers.push(profile);
        }

        Self::persist_store(state, &store).await?;
        Ok(store)
    }

    pub async fn delete_provider(state: &AppState, id: &str) -> Result<ProviderStore, AppError> {
        let mut store = Self::load_store(state).await?;
        if store.providers.len() <= 1 {
            return Err(AppError::bad_request("At least one provider is required"));
        }
        let before = store.providers.len();
        store.providers.retain(|p| p.id != id);
        if store.providers.len() == before {
            return Err(AppError::not_found("Provider not found"));
        }
        let _ = delete_secret(&provider_key(id));
        if store.active_id == id {
            store.active_id = store.providers[0].id.clone();
            Self::activate_profile(state, &store.providers[0]).await?;
        }
        Self::persist_store(state, &store).await?;
        Ok(store)
    }

    pub async fn set_active_provider(state: &AppState, id: &str) -> Result<ProviderStore, AppError> {
        let mut store = Self::load_store(state).await?;
        let profile = store
            .providers
            .iter()
            .find(|p| p.id == id)
            .cloned()
            .ok_or_else(|| AppError::not_found("Provider not found"))?;
        store.active_id = id.to_string();
        Self::activate_profile(state, &profile).await?;
        Self::persist_store(state, &store).await?;
        Ok(store)
    }

    async fn activate_profile(state: &AppState, profile: &ProviderProfile) -> Result<(), AppError> {
        let current = state.snapshot_config();
        let body = UpdateSettingsBody {
            ai_api_key: profile.api_key.clone(),
            ai_base_url: profile.base_url.clone(),
            ai_model: profile.default_model.clone(),
            ai_image_model: profile.image_model.clone(),
            ai_audio_model: profile.audio_model.clone(),
            ai_default_system_prompt: current.ai_default_system_prompt,
            ai_request_timeout_ms: current.ai_request_timeout_ms,
            ai_max_retries: current.ai_max_retries,
            ai_context_message_limit: current.ai_context_message_limit,
            pdf_preview_char_limit: current.pdf_preview_char_limit,
            knowledge_base_enabled: current.knowledge_base_enabled,
            knowledge_base_path: current.knowledge_base_path,
            knowledge_use_embeddings: current.knowledge_use_embeddings,
            knowledge_embedding_model: current.knowledge_embedding_model,
            web_search_enabled: current.web_search_enabled,
            dev_mode_enabled: current.dev_mode_enabled,
        };
        state.update_settings(body)?;
        Ok(())
    }

    pub async fn test_provider(body: &UpsertProviderBody) -> Result<ConnectionTestResult, AppError> {
        test_provider_connection(
            body.kind,
            &body.base_url,
            &body.api_key,
            body.default_model.trim(),
        )
        .await
    }

    pub fn active_profile(store: &ProviderStore) -> Option<&ProviderProfile> {
        store.providers.iter().find(|p| p.id == store.active_id)
    }
}

pub fn model_info_for_id(model_id: &str) -> ModelInfo {
    infer_one(model_id)
}
