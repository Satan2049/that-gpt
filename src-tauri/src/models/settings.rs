use serde::{Deserialize, Serialize};

use crate::config::AppConfig;

const MAX_IMAGES_PER_MESSAGE: usize = 4;
const MAX_IMAGE_BYTES: usize = 5 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsView {
    pub ai_api_key: String,
    pub ai_base_url: String,
    pub ai_model: String,
    pub ai_image_model: String,
    pub ai_audio_model: String,
    pub ai_default_system_prompt: String,
    pub ai_request_timeout_ms: u64,
    pub ai_max_retries: u32,
    pub config_dir: String,
    pub max_images_per_message: usize,
    pub max_image_bytes: usize,
}

impl SettingsView {
    pub fn from_config(config_dir: &std::path::Path, config: &AppConfig) -> Self {
        Self {
            ai_api_key: config.ai_api_key.clone(),
            ai_base_url: config.ai_base_url.clone(),
            ai_model: config.ai_model.clone(),
            ai_image_model: config.ai_image_model.clone(),
            ai_audio_model: config.ai_audio_model.clone(),
            ai_default_system_prompt: config.ai_default_system_prompt.clone(),
            ai_request_timeout_ms: config.ai_request_timeout_ms,
            ai_max_retries: config.ai_max_retries,
            config_dir: config_dir.to_string_lossy().into_owned(),
            max_images_per_message: MAX_IMAGES_PER_MESSAGE,
            max_image_bytes: MAX_IMAGE_BYTES,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsBody {
    pub ai_api_key: String,
    pub ai_base_url: String,
    pub ai_model: String,
    pub ai_image_model: String,
    pub ai_audio_model: String,
    pub ai_default_system_prompt: String,
    pub ai_request_timeout_ms: u64,
    pub ai_max_retries: u32,
}
