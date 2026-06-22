use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamStartPayload {
    pub conversation_id: String,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamChunkPayload {
    pub conversation_id: String,
    pub message_id: String,
    pub delta: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStreamCancelledPayload {
    pub conversation_id: String,
    pub message_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatToolCallPayload {
    pub conversation_id: String,
    pub tool_call_id: String,
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatToolResultPayload {
    pub conversation_id: String,
    pub tool_call_id: String,
    pub name: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionTestResult {
    pub ok: bool,
    pub message: String,
    pub model_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub vision: bool,
    pub tools: bool,
    pub reasoning: bool,
    pub embedding: bool,
    pub audio: bool,
    pub image_gen: bool,
    pub context_window: u32,
    pub max_output_tokens: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelsListResult {
    pub models: Vec<String>,
    pub model_infos: Vec<ModelInfo>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeCitationPayload {
    pub index: u32,
    pub source_name: String,
    pub source_path: String,
    pub excerpt: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatCitationsPayload {
    pub conversation_id: String,
    pub message_id: String,
    pub citations: Vec<KnowledgeCitationPayload>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatGeneratedImagePayload {
    pub conversation_id: String,
    pub message_id: String,
    pub mime_type: String,
    pub base64: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub update_available: bool,
    pub latest_version: Option<String>,
    pub release_url: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatUsagePayload {
    pub conversation_id: String,
    pub message_id: String,
    pub usage: TokenUsage,
}
