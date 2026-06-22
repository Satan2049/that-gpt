use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderKind {
    OpenAi,
    Ollama,
}

impl ProviderKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::OpenAi => "openai",
            Self::Ollama => "ollama",
        }
    }

    pub fn from_str(value: &str) -> Self {
        match value.to_lowercase().as_str() {
            "ollama" => Self::Ollama,
            _ => Self::OpenAi,
        }
    }

    pub fn from_base_url(base_url: &str) -> Self {
        let lower = base_url.to_lowercase();
        if lower.contains("11434") || lower.contains("ollama") {
            Self::Ollama
        } else {
            Self::OpenAi
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderProfile {
    pub id: String,
    pub name: String,
    pub kind: ProviderKind,
    pub base_url: String,
    pub api_key: String,
    pub default_model: String,
    #[serde(default)]
    pub image_model: String,
    #[serde(default)]
    pub audio_model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStore {
    pub active_id: String,
    pub providers: Vec<ProviderProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertProviderBody {
    pub id: Option<String>,
    pub name: String,
    pub kind: ProviderKind,
    pub base_url: String,
    pub api_key: String,
    pub default_model: String,
    pub image_model: Option<String>,
    pub audio_model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetActiveProviderBody {
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestProviderBody {
    pub kind: ProviderKind,
    pub base_url: String,
    pub api_key: String,
}
