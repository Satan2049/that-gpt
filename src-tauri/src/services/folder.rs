use std::path::{Path, PathBuf};

use base64::Engine;

use crate::config::AppState;
use crate::error::AppError;
use crate::models::{AddFolderSourceBody, Folder, FolderSource, RemoveFolderSourceBody};
use crate::repository::{ChatRepository, FolderRepository};
use crate::services::{docx_text, pdf_text};

const MAX_SOURCES: usize = 32;
const MAX_SOURCE_BYTES: usize = 5 * 1024 * 1024;
const SOURCE_TEXT_PREVIEW: usize = 8_000;

pub struct FolderService;

impl FolderService {
    pub fn sources_dir(data_dir: &Path, folder_id: &str) -> PathBuf {
        data_dir.join("project_sources").join(folder_id)
    }

    pub async fn list_folders(state: &AppState) -> Result<Vec<Folder>, AppError> {
        FolderRepository::list_all(&state.data_dir)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    async fn save_folders(state: &AppState, folders: &[Folder]) -> Result<(), AppError> {
        FolderRepository::save_all(&state.data_dir, folders)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    fn find_folder_mut<'a>(folders: &'a mut [Folder], id: &str) -> Result<&'a mut Folder, AppError> {
        folders
            .iter_mut()
            .find(|f| f.id == id)
            .ok_or_else(|| AppError::not_found("Folder not found"))
    }

    pub async fn create_folder(state: &AppState, name: &str) -> Result<Folder, AppError> {
        let trimmed = name.trim();
        if trimmed.is_empty() || trimmed.len() > 120 {
            return Err(AppError::bad_request("Invalid folder name"));
        }

        let mut folders = Self::list_folders(state).await?;
        if folders.iter().any(|f| f.name.eq_ignore_ascii_case(trimmed)) {
            return Err(AppError::bad_request("Folder already exists"));
        }

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let folder = Folder {
            id: uuid::Uuid::new_v4().to_string(),
            name: trimmed.to_string(),
            created_at: now.clone(),
            updated_at: now,
            instructions: None,
            sources: Vec::new(),
        };
        folders.push(folder.clone());
        Self::save_folders(state, &folders).await?;
        Ok(folder)
    }

    pub async fn patch_folder(
        state: &AppState,
        id: &str,
        name: Option<&str>,
        instructions: Option<Option<String>>,
    ) -> Result<Folder, AppError> {
        let mut folders = Self::list_folders(state).await?;
        let folder = Self::find_folder_mut(&mut folders, id)?;

        if let Some(name) = name {
            let trimmed = name.trim();
            if trimmed.is_empty() || trimmed.len() > 120 {
                return Err(AppError::bad_request("Invalid folder name"));
            }
            folder.name = trimmed.to_string();
        }

        if let Some(instructions) = instructions {
            folder.instructions = instructions.map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
        }

        folder.updated_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let updated = folder.clone();
        Self::save_folders(state, &folders).await?;
        Ok(updated)
    }

    pub async fn delete_folder(state: &AppState, id: &str) -> Result<(), AppError> {
        let mut folders = Self::list_folders(state).await?;
        let before = folders.len();
        folders.retain(|f| f.id != id);
        if folders.len() == before {
            return Err(AppError::not_found("Folder not found"));
        }

        Self::save_folders(state, &folders).await?;

        let source_dir = Self::sources_dir(&state.data_dir, id);
        let _ = tokio::fs::remove_dir_all(&source_dir).await;

        let chats_dir = state.chats_dir();
        let conversations = ChatRepository::list_all(&chats_dir)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        for mut conversation in conversations {
            if conversation.folder_id.as_deref() == Some(id) {
                conversation.folder_id = None;
                conversation.updated_at =
                    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
                ChatRepository::save(&chats_dir, &conversation)
                    .await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
            }
        }

        Ok(())
    }

    pub async fn add_source(
        state: &AppState,
        body: &AddFolderSourceBody,
    ) -> Result<Folder, AppError> {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(body.data_base64.trim())
            .map_err(|_| AppError::bad_request("Invalid file data"))?;

        if bytes.is_empty() || bytes.len() > MAX_SOURCE_BYTES {
            return Err(AppError::bad_request("File too large (max 5 MB)"));
        }

        let filename = body.filename.trim();
        if filename.is_empty() || filename.len() > 200 {
            return Err(AppError::bad_request("Invalid filename"));
        }

        let mut folders = Self::list_folders(state).await?;
        let folder = Self::find_folder_mut(&mut folders, &body.folder_id)?;
        if folder.sources.len() >= MAX_SOURCES {
            return Err(AppError::bad_request("Too many project files"));
        }

        let source_id = uuid::Uuid::new_v4().to_string();
        let stored_name = format!("{source_id}_{}", sanitize_filename(filename));
        let dir = Self::sources_dir(&state.data_dir, &body.folder_id);
        tokio::fs::create_dir_all(&dir)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        tokio::fs::write(dir.join(&stored_name), &bytes)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        folder.sources.push(FolderSource {
            id: source_id,
            name: filename.to_string(),
            mime_type: body.mime_type.trim().to_string(),
            size: bytes.len() as u64,
            added_at: now.clone(),
        });
        folder.updated_at = now;
        let updated = folder.clone();
        Self::save_folders(state, &folders).await?;
        Ok(updated)
    }

    pub async fn remove_source(
        state: &AppState,
        body: &RemoveFolderSourceBody,
    ) -> Result<Folder, AppError> {
        let mut folders = Self::list_folders(state).await?;
        let folder = Self::find_folder_mut(&mut folders, &body.folder_id)?;
        let before = folder.sources.len();
        folder.sources.retain(|s| s.id != body.source_id);
        if folder.sources.len() == before {
            return Err(AppError::not_found("Source not found"));
        }

        let dir = Self::sources_dir(&state.data_dir, &body.folder_id);
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with(&format!("{}_", body.source_id)) {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }

        folder.updated_at =
            chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let updated = folder.clone();
        Self::save_folders(state, &folders).await?;
        Ok(updated)
    }

    pub async fn build_context_block(state: &AppState, folder_id: &str) -> Result<String, AppError> {
        let folders = Self::list_folders(state).await?;
        let folder = folders
            .iter()
            .find(|f| f.id == folder_id)
            .ok_or_else(|| AppError::not_found("Folder not found"))?;

        let mut parts: Vec<String> = Vec::new();

        if let Some(instructions) = folder.instructions.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            parts.push(format!("Project instructions:\n{instructions}"));
        }

        let dir = Self::sources_dir(&state.data_dir, folder_id);
        for source in &folder.sources {
            let path = dir.join(format!("{}_{}", source.id, sanitize_filename(&source.name)));
            if !path.exists() {
                continue;
            }
            if let Ok(text) = extract_source_text(&path, &source.mime_type).await {
                if !text.trim().is_empty() {
                    parts.push(format!(
                        "Project file \"{}\":\n{}",
                        source.name,
                        pdf_text::pdf_text_preview(&text, SOURCE_TEXT_PREVIEW)
                    ));
                }
            }
        }

        Ok(parts.join("\n\n"))
    }
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

async fn extract_source_text(path: &Path, mime: &str) -> Result<String, AppError> {
    let bytes = tokio::fs::read(path)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if mime == "application/pdf" {
        return pdf_text::extract_pdf_text(&bytes);
    }
    if mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" {
        return docx_text::extract_docx_text(&bytes);
    }
    if mime.starts_with("text/") || mime == "application/json" {
        return Ok(String::from_utf8_lossy(&bytes).into_owned());
    }

    Err(AppError::bad_request("Unsupported project file type"))
}
