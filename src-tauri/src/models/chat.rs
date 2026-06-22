use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
    Tool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AttachmentKind {
    Image,
    Audio,
    Text,
    Pdf,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ImageMimeType {
    #[serde(rename = "image/jpeg")]
    Jpeg,
    #[serde(rename = "image/png")]
    Png,
    #[serde(rename = "image/webp")]
    Webp,
    #[serde(rename = "image/gif")]
    Gif,
}

impl ImageMimeType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Jpeg => "image/jpeg",
            Self::Png => "image/png",
            Self::Webp => "image/webp",
            Self::Gif => "image/gif",
        }
    }

    pub fn from_str(mime: &str) -> Option<Self> {
        match mime {
            "image/jpeg" => Some(Self::Jpeg),
            "image/png" => Some(Self::Png),
            "image/webp" => Some(Self::Webp),
            "image/gif" => Some(Self::Gif),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatImageAttachment {
    pub mime_type: ImageMimeType,
    pub base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatAttachment {
    pub kind: AttachmentKind,
    pub mime_type: String,
    pub base64: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallRecord {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: MessageRole,
    pub content: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<ChatImageAttachment>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<ChatAttachment>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCallRecord>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub bookmarked: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub branch_id: String,
}

impl ChatMessage {
    pub fn all_attachments(&self) -> Vec<ChatAttachment> {
        let mut out: Vec<ChatAttachment> = self.attachments.clone().unwrap_or_default();
        if let Some(images) = &self.images {
            for img in images {
                if !out.iter().any(|a| {
                    a.kind == AttachmentKind::Image && a.mime_type == img.mime_type.as_str()
                }) {
                    out.push(ChatAttachment {
                        kind: AttachmentKind::Image,
                        mime_type: img.mime_type.as_str().to_string(),
                        base64: img.base64.clone(),
                        filename: None,
                        text_content: None,
                    });
                }
            }
        }
        out
    }

    pub fn has_vision_attachments(&self) -> bool {
        self.all_attachments()
            .iter()
            .any(|a| a.kind == AttachmentKind::Image)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_preset_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub archived: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub ephemeral: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature_override: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens_override: Option<i64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub system_prompt_override: Option<String>,
    #[serde(default, skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub branch_picks: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSummary {
    pub id: String,
    pub title: String,
    pub updated_at: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub archived: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub ephemeral: bool,
}

impl Conversation {
    pub fn to_summary(&self) -> ConversationSummary {
        ConversationSummary {
            id: self.id.clone(),
            title: self.title.clone(),
            updated_at: self.updated_at.clone(),
            pinned: self.pinned,
            archived: self.archived,
            folder_id: self.folder_id.clone(),
            tags: self.tags.clone(),
            ephemeral: self.ephemeral,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConversationListView {
    Active,
    Archived,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationBody {
    pub title: Option<String>,
    #[serde(default)]
    pub ephemeral: bool,
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchConversationBody {
    pub title: Option<String>,
    pub prompt_preset_id: Option<Option<String>>,
    pub pinned: Option<bool>,
    pub archived: Option<bool>,
    pub folder_id: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub last_model: Option<Option<String>>,
    pub temperature_override: Option<Option<f64>>,
    pub max_tokens_override: Option<Option<i64>>,
    pub system_prompt_override: Option<Option<String>>,
    pub branch_picks: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PinConversationBody {
    pub conversation_id: String,
    pub pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveConversationBody {
    pub conversation_id: String,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveToFolderBody {
    pub conversation_id: String,
    pub folder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TagConversationBody {
    pub conversation_id: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleBookmarkBody {
    pub conversation_id: String,
    pub message_id: String,
    pub bookmarked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageEntry {
    pub mime_type: String,
    pub base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentEntry {
    pub mime_type: String,
    pub base64: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageBody {
    pub conversation_id: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_preset_id: Option<Option<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<ImageEntry>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachments: Option<Vec<AttachmentEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMessageResponse {
    pub assistant_message: Option<ChatMessage>,
    pub conversation: Conversation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditMessageBody {
    pub conversation_id: String,
    pub message_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ForkConversationBody {
    pub conversation_id: String,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegenerateBody {
    pub conversation_id: String,
    #[serde(default)]
    pub create_branch: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFromTemplateBody {
    pub template_id: String,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiMessagePreview {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetryMessageBody {
    pub conversation_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message_id: Option<String>,
}
