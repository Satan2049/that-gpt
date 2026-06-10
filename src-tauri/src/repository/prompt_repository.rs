use std::path::{Path, PathBuf};

use tokio::fs;

use crate::models::PromptPreset;

pub struct PromptRepository;

impl PromptRepository {
    fn file_path(prompts_dir: &Path, id: &str) -> PathBuf {
        prompts_dir.join(format!("{id}.json"))
    }

    async fn ensure_dir(prompts_dir: &Path) -> Result<(), std::io::Error> {
        fs::create_dir_all(prompts_dir).await
    }

    pub async fn save(prompts_dir: &Path, preset: &PromptPreset) -> Result<(), std::io::Error> {
        Self::ensure_dir(prompts_dir).await?;
        let json = serde_json::to_string_pretty(preset).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
        })?;
        fs::write(Self::file_path(prompts_dir, &preset.id), json).await
    }

    pub async fn find_by_id(prompts_dir: &Path, id: &str) -> Result<Option<PromptPreset>, std::io::Error> {
        match fs::read_to_string(Self::file_path(prompts_dir, id)).await {
            Ok(raw) => {
                let preset: PromptPreset = serde_json::from_str(&raw).map_err(|e| {
                    std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
                })?;
                Ok(Some(preset))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn delete(prompts_dir: &Path, id: &str) -> Result<bool, std::io::Error> {
        match fs::remove_file(Self::file_path(prompts_dir, id)).await {
            Ok(()) => Ok(true),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(e) => Err(e),
        }
    }

    pub async fn list_ids(prompts_dir: &Path) -> Result<Vec<String>, std::io::Error> {
        Self::ensure_dir(prompts_dir).await?;
        let mut ids = Vec::new();
        let mut entries = fs::read_dir(prompts_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.ends_with(".json") {
                ids.push(name.trim_end_matches(".json").to_string());
            }
        }
        Ok(ids)
    }

    pub async fn list_all(prompts_dir: &Path) -> Result<Vec<PromptPreset>, std::io::Error> {
        let ids = Self::list_ids(prompts_dir).await?;
        let mut presets = Vec::new();
        for id in ids {
            if let Some(preset) = Self::find_by_id(prompts_dir, &id).await? {
                presets.push(preset);
            }
        }
        presets.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        Ok(presets)
    }
}
