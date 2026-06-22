use std::path::Path;

use tokio::fs;

use crate::models::Folder;

pub struct FolderRepository;

impl FolderRepository {
    fn file_path(data_dir: &Path) -> std::path::PathBuf {
        data_dir.join("folders.json")
    }

    pub async fn list_all(data_dir: &Path) -> Result<Vec<Folder>, std::io::Error> {
        let path = Self::file_path(data_dir);
        match fs::read_to_string(&path).await {
            Ok(raw) => {
                let folders: Vec<Folder> = serde_json::from_str(&raw).map_err(|e| {
                    std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
                })?;
                Ok(folders)
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Vec::new()),
            Err(e) => Err(e),
        }
    }

    pub async fn save_all(data_dir: &Path, folders: &[Folder]) -> Result<(), std::io::Error> {
        fs::create_dir_all(data_dir).await?;
        let json = serde_json::to_string_pretty(folders).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
        })?;
        fs::write(Self::file_path(data_dir), json).await
    }
}
