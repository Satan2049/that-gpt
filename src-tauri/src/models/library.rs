use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LibraryFilter {
    All,
    Images,
    Files,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentIndexItem {
    pub id: String,
    pub conversation_id: String,
    pub conversation_title: String,
    pub message_id: String,
    pub filename: Option<String>,
    pub mime_type: String,
    pub kind: String,
    pub size_bytes: usize,
    pub modified_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentIndexResult {
    pub items: Vec<AttachmentIndexItem>,
    pub total: usize,
}
