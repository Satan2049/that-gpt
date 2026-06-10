use std::path::{Path, PathBuf};

use tokio::fs;

use crate::models::Conversation;

pub struct ChatRepository;

impl ChatRepository {
    fn file_path(chats_dir: &Path, id: &str) -> PathBuf {
        chats_dir.join(format!("{id}.json"))
    }

    async fn ensure_dir(chats_dir: &Path) -> Result<(), std::io::Error> {
        fs::create_dir_all(chats_dir).await
    }

    pub async fn save(chats_dir: &Path, conversation: &Conversation) -> Result<(), std::io::Error> {
        Self::ensure_dir(chats_dir).await?;
        let json = serde_json::to_string_pretty(conversation).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
        })?;
        fs::write(Self::file_path(chats_dir, &conversation.id), json).await
    }

    pub async fn find_by_id(chats_dir: &Path, id: &str) -> Result<Option<Conversation>, std::io::Error> {
        match fs::read_to_string(Self::file_path(chats_dir, id)).await {
            Ok(raw) => {
                let conversation: Conversation = serde_json::from_str(&raw).map_err(|e| {
                    std::io::Error::new(std::io::ErrorKind::InvalidData, e.to_string())
                })?;
                Ok(Some(conversation))
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub async fn delete(chats_dir: &Path, id: &str) -> Result<bool, std::io::Error> {
        match fs::remove_file(Self::file_path(chats_dir, id)).await {
            Ok(()) => Ok(true),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(e) => Err(e),
        }
    }

    pub async fn list_ids(chats_dir: &Path) -> Result<Vec<String>, std::io::Error> {
        Self::ensure_dir(chats_dir).await?;
        let mut ids = Vec::new();
        let mut entries = fs::read_dir(chats_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.ends_with(".json") {
                ids.push(name.trim_end_matches(".json").to_string());
            }
        }
        Ok(ids)
    }

    pub async fn list_all(chats_dir: &Path) -> Result<Vec<Conversation>, std::io::Error> {
        let ids = Self::list_ids(chats_dir).await?;
        let mut conversations = Vec::new();
        for id in ids {
            if let Some(conversation) = Self::find_by_id(chats_dir, &id).await? {
                conversations.push(conversation);
            }
        }
        conversations.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        Ok(conversations)
    }
}
