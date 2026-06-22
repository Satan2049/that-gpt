use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::chat::{ChatMessage, Conversation, MessageRole};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
    pub system_prompt: Option<String>,
    pub model: Option<String>,
    pub starter_messages: Vec<TemplateMessage>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateMessage {
    pub role: MessageRole,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTemplateBody {
    pub name: String,
    pub description: Option<String>,
}

pub struct TemplateService;

impl TemplateService {
    pub fn templates_dir(data_dir: &Path) -> PathBuf {
        data_dir.join("templates")
    }

    pub fn list(data_dir: &Path) -> Result<Vec<ConversationTemplate>, AppError> {
        let dir = Self::templates_dir(data_dir);
        if !dir.exists() {
            return Ok(Vec::new());
        }

        let mut templates = Vec::new();
        for entry in fs::read_dir(&dir).map_err(|e| AppError::Internal(e.to_string()))? {
            let entry = entry.map_err(|e| AppError::Internal(e.to_string()))?;
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let raw = fs::read_to_string(&path).map_err(|e| AppError::Internal(e.to_string()))?;
            if let Ok(template) = serde_json::from_str::<ConversationTemplate>(&raw) {
                templates.push(template);
            }
        }
        templates.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        Ok(templates)
    }

    pub fn save_from_conversation(
        data_dir: &Path,
        conversation: &Conversation,
        body: &SaveTemplateBody,
    ) -> Result<ConversationTemplate, AppError> {
        let name = body.name.trim();
        if name.is_empty() || name.len() > 120 {
            return Err(AppError::bad_request("Template name must be 1–120 characters"));
        }

        let starter_messages: Vec<TemplateMessage> = conversation
            .messages
            .iter()
            .filter(|m| matches!(m.role, MessageRole::User | MessageRole::Assistant))
            .map(|m| TemplateMessage {
                role: m.role,
                content: m.content.clone(),
            })
            .collect();

        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        let template = ConversationTemplate {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.to_string(),
            description: body.description.clone().unwrap_or_default().trim().to_string(),
            created_at: now.clone(),
            updated_at: now,
            system_prompt: conversation.system_prompt_override.clone(),
            model: conversation.last_model.clone(),
            starter_messages,
        };

        let dir = Self::templates_dir(data_dir);
        fs::create_dir_all(&dir).map_err(|e| AppError::Internal(e.to_string()))?;
        let path = dir.join(format!("{}.json", template.id));
        let json = serde_json::to_string_pretty(&template)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        fs::write(&path, json).map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(template)
    }

    pub fn delete(data_dir: &Path, template_id: &str) -> Result<(), AppError> {
        let path = Self::templates_dir(data_dir).join(format!("{template_id}.json"));
        if path.exists() {
            fs::remove_file(&path).map_err(|e| AppError::Internal(e.to_string()))?;
        }
        Ok(())
    }

    pub fn apply_to_conversation(
        template: &ConversationTemplate,
        conversation_id: &str,
    ) -> Vec<ChatMessage> {
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        template
            .starter_messages
            .iter()
            .map(|msg| ChatMessage {
                id: uuid::Uuid::new_v4().to_string(),
                conversation_id: conversation_id.to_string(),
                role: msg.role,
                content: msg.content.clone(),
                created_at: now.clone(),
                images: None,
                attachments: None,
                tool_calls: None,
                tool_call_id: None,
                tool_name: None,
                bookmarked: false,
                parent_id: None,
                branch_id: String::new(),
            })
            .collect()
    }
}
