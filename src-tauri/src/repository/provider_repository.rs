use std::path::Path;

use tokio::fs;

use crate::models::ProviderStore;

pub struct ProviderRepository;

impl ProviderRepository {
    fn file_path(data_dir: &Path) -> std::path::PathBuf {
        data_dir.join("providers.json")
    }

    pub async fn load(data_dir: &Path) -> Result<Option<ProviderStore>, std::io::Error> {
        let path = Self::file_path(data_dir);
        match fs::read_to_string(&path).await {
            Ok(raw) => {
                let store: ProviderStore = serde_json::from_str(&raw).map_err(|e| {
                    std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
                })?;
                Ok(Some(store))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn save(data_dir: &Path, store: &ProviderStore) -> Result<(), std::io::Error> {
        fs::create_dir_all(data_dir).await?;
        let json = serde_json::to_string_pretty(store).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
        })?;
        fs::write(Self::file_path(data_dir), json).await
    }
}
