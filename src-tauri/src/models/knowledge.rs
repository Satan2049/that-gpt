use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeCitation {
    pub index: u32,
    pub source_name: String,
    pub source_path: String,
    pub excerpt: String,
}

#[derive(Debug, Clone)]
pub struct KnowledgeRetrieval {
    pub system_block: String,
    pub citations: Vec<KnowledgeCitation>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeChunk {
    pub id: usize,
    pub source_path: String,
    pub source_name: String,
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embedding: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeIndex {
    pub updated_at: String,
    pub root_path: String,
    pub chunks: Vec<KnowledgeChunk>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeIndexResult {
    pub chunk_count: usize,
    pub file_count: usize,
    pub root_path: String,
    pub updated_at: String,
}
