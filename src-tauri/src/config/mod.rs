use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, RwLock};

use reqwest::Client;

use crate::error::AppError;
use crate::models::settings::UpdateSettingsBody;

const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "gpt-4o-mini";
const DEFAULT_SYSTEM_PROMPT: &str = "You are a helpful assistant.";
const DEFAULT_TIMEOUT_MS: u64 = 60_000;
const DEFAULT_MAX_RETRIES: u32 = 2;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub ai_api_key: String,
    pub ai_base_url: String,
    pub ai_model: String,
    pub ai_image_model: String,
    pub ai_audio_model: String,
    pub ai_default_system_prompt: String,
    pub ai_request_timeout_ms: u64,
    pub ai_max_retries: u32,
}

impl AppConfig {
    pub fn load(config_dir: &Path) -> Self {
        let env_path = config_dir.join(".env");
        if env_path.exists() {
            let _ = dotenvy::from_path(&env_path);
        }

        Self {
            ai_api_key: std::env::var("AI_API_KEY").unwrap_or_default(),
            ai_base_url: std::env::var("AI_BASE_URL")
                .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string()),
            ai_model: std::env::var("AI_MODEL").unwrap_or_else(|_| DEFAULT_MODEL.to_string()),
            ai_image_model: std::env::var("AI_IMAGE_MODEL").unwrap_or_default(),
            ai_audio_model: std::env::var("AI_AUDIO_MODEL").unwrap_or_default(),
            ai_default_system_prompt: std::env::var("AI_DEFAULT_SYSTEM_PROMPT")
                .unwrap_or_else(|_| DEFAULT_SYSTEM_PROMPT.to_string()),
            ai_request_timeout_ms: std::env::var("AI_REQUEST_TIMEOUT_MS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(DEFAULT_TIMEOUT_MS),
            ai_max_retries: std::env::var("AI_MAX_RETRIES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(DEFAULT_MAX_RETRIES),
        }
    }

    pub fn from_update(body: UpdateSettingsBody) -> Result<Self, AppError> {
        let ai_base_url = body.ai_base_url.trim().to_string();
        let ai_model = body.ai_model.trim().to_string();

        if ai_base_url.is_empty() {
            return Err(AppError::bad_request("Base URL is required"));
        }
        if !ai_base_url.starts_with("http://") && !ai_base_url.starts_with("https://") {
            return Err(AppError::bad_request(
                "Base URL must start with http:// or https://",
            ));
        }
        if ai_model.is_empty() {
            return Err(AppError::bad_request("Default model is required"));
        }
        if body.ai_request_timeout_ms < 1_000 || body.ai_request_timeout_ms > 600_000 {
            return Err(AppError::bad_request(
                "Request timeout must be between 1000 and 600000 ms",
            ));
        }
        if body.ai_max_retries > 10 {
            return Err(AppError::bad_request("Max retries must be at most 10"));
        }

        Ok(Self {
            ai_api_key: body.ai_api_key.trim().to_string(),
            ai_base_url,
            ai_model,
            ai_image_model: body.ai_image_model.trim().to_string(),
            ai_audio_model: body.ai_audio_model.trim().to_string(),
            ai_default_system_prompt: body.ai_default_system_prompt,
            ai_request_timeout_ms: body.ai_request_timeout_ms,
            ai_max_retries: body.ai_max_retries,
        })
    }

    pub fn save_to_env(&self, config_dir: &Path) -> Result<(), AppError> {
        std::fs::create_dir_all(config_dir).map_err(|e| {
            AppError::Internal(format!("Failed to create config directory: {e}"))
        })?;

        let env_path = config_dir.join(".env");
        let contents = format!(
            "# ThatGPT settings — edited via the app or manually\n\
             AI_API_KEY={}\n\
             AI_BASE_URL={}\n\
             AI_MODEL={}\n\
             AI_IMAGE_MODEL={}\n\
             AI_AUDIO_MODEL={}\n\
             AI_DEFAULT_SYSTEM_PROMPT={}\n\
             AI_REQUEST_TIMEOUT_MS={}\n\
             AI_MAX_RETRIES={}\n",
            escape_env_value(&self.ai_api_key),
            escape_env_value(&self.ai_base_url),
            escape_env_value(&self.ai_model),
            escape_env_value(&self.ai_image_model),
            escape_env_value(&self.ai_audio_model),
            escape_env_value(&self.ai_default_system_prompt),
            self.ai_request_timeout_ms,
            self.ai_max_retries,
        );

        std::fs::write(&env_path, contents).map_err(|e| {
            AppError::Internal(format!("Failed to write settings file: {e}"))
        })?;

        Ok(())
    }
}

fn escape_env_value(value: &str) -> String {
    let needs_quotes = value
        .chars()
        .any(|c| c.is_whitespace() || c == '#' || c == '"' || c == '=');
    if needs_quotes {
        format!(
            "\"{}\"",
            value
                .replace('\\', "\\\\")
                .replace('"', "\\\"")
                .replace('\n', "\\n")
                .replace('\r', "\\r")
        )
    } else {
        value.to_string()
    }
}

fn build_http_client(timeout_ms: u64) -> Result<Client, AppError> {
    Client::builder()
        .timeout(std::time::Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| AppError::Internal(format!("Failed to build HTTP client: {e}")))
}

struct ActiveGeneration {
    conversation_id: String,
    cancel: Arc<AtomicBool>,
}

#[derive(Clone)]
pub struct AppState {
    pub config_dir: PathBuf,
    pub data_dir: PathBuf,
    config: std::sync::Arc<RwLock<AppConfig>>,
    http: std::sync::Arc<RwLock<Client>>,
    active_generation: Arc<Mutex<Option<ActiveGeneration>>>,
}

impl AppState {
    pub fn chats_dir(&self) -> PathBuf {
        self.data_dir.join("chats")
    }

    pub fn prompts_dir(&self) -> PathBuf {
        self.data_dir.join("prompts")
    }

    pub fn snapshot_config(&self) -> AppConfig {
        self.config
            .read()
            .expect("config lock poisoned")
            .clone()
    }

    pub fn snapshot_http(&self) -> Client {
        self.http.read().expect("http lock poisoned").clone()
    }

    pub fn begin_generation(&self, conversation_id: &str) -> Arc<AtomicBool> {
        let cancel = Arc::new(AtomicBool::new(false));
        let mut guard = self
            .active_generation
            .lock()
            .expect("active generation lock poisoned");
        *guard = Some(ActiveGeneration {
            conversation_id: conversation_id.to_string(),
            cancel: cancel.clone(),
        });
        cancel
    }

    pub fn cancel_generation(&self, conversation_id: &str) -> bool {
        let guard = self
            .active_generation
            .lock()
            .expect("active generation lock poisoned");
        if let Some(active) = guard.as_ref() {
            if active.conversation_id == conversation_id {
                active.cancel.store(true, Ordering::Relaxed);
                return true;
            }
        }
        false
    }

    pub fn finish_generation(&self, conversation_id: &str) {
        let mut guard = self
            .active_generation
            .lock()
            .expect("active generation lock poisoned");
        if guard
            .as_ref()
            .is_some_and(|active| active.conversation_id == conversation_id)
        {
            *guard = None;
        }
    }

    pub fn update_settings(&self, body: UpdateSettingsBody) -> Result<AppConfig, AppError> {
        let new_config = AppConfig::from_update(body)?;
        new_config.save_to_env(&self.config_dir)?;
        let http = build_http_client(new_config.ai_request_timeout_ms)?;

        {
            let mut config = self.config.write().expect("config lock poisoned");
            *config = new_config.clone();
        }
        {
            let mut client = self.http.write().expect("http lock poisoned");
            *client = http;
        }

        Ok(new_config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::settings::UpdateSettingsBody;

    #[test]
    fn rejects_invalid_base_url() {
        let body = UpdateSettingsBody {
            ai_api_key: "key".to_string(),
            ai_base_url: "not-a-url".to_string(),
            ai_model: "gpt-4o-mini".to_string(),
            ai_image_model: String::new(),
            ai_audio_model: String::new(),
            ai_default_system_prompt: String::new(),
            ai_request_timeout_ms: 60_000,
            ai_max_retries: 2,
        };
        assert!(AppConfig::from_update(body).is_err());
    }

    #[test]
    fn saves_and_escapes_multiline_prompt() {
        let dir = std::env::temp_dir().join(format!("chatnest-config-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();

        let config = AppConfig {
            ai_api_key: "sk-test".to_string(),
            ai_base_url: "https://api.openai.com/v1".to_string(),
            ai_model: "gpt-4o-mini".to_string(),
            ai_image_model: "gpt-4o".to_string(),
            ai_audio_model: "whisper-1".to_string(),
            ai_default_system_prompt: "Line one\nLine two".to_string(),
            ai_request_timeout_ms: 30_000,
            ai_max_retries: 1,
        };

        config.save_to_env(&dir).unwrap();
        let loaded = AppConfig::load(&dir);
        assert_eq!(loaded.ai_api_key, "sk-test");
        assert_eq!(loaded.ai_default_system_prompt, "Line one\nLine two");
        assert_eq!(loaded.ai_image_model, "gpt-4o");
        assert_eq!(loaded.ai_request_timeout_ms, 30_000);

        let _ = std::fs::remove_dir_all(dir);
    }
}

pub fn init_state(app_data_dir: PathBuf) -> AppState {
    let data_dir = app_data_dir.join("data");
    let config = AppConfig::load(&app_data_dir);
    let http = build_http_client(config.ai_request_timeout_ms)
        .expect("failed to build HTTP client");

    AppState {
        config_dir: app_data_dir,
        data_dir,
        config: std::sync::Arc::new(RwLock::new(config)),
        http: std::sync::Arc::new(RwLock::new(http)),
        active_generation: Arc::new(Mutex::new(None)),
    }
}
