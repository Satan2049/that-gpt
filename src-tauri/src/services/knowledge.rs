use std::fs;
use std::path::{Path, PathBuf};

use crate::config::AppState;
use crate::error::AppError;
use crate::models::knowledge::{
    KnowledgeChunk, KnowledgeCitation, KnowledgeIndex, KnowledgeIndexResult, KnowledgeRetrieval,
};
use crate::services::embeddings::{cosine_similarity, embed_text};

const CHUNK_SIZE: usize = 800;
const CHUNK_OVERLAP: usize = 100;
const TOP_K: usize = 3;

const TEXT_EXTENSIONS: &[&str] = &["txt", "md", "markdown", "csv", "json", "html", "xml"];
const PDF_EXTENSIONS: &[&str] = &["pdf"];
const DOCX_EXTENSIONS: &[&str] = &["docx"];

pub struct KnowledgeService;

impl KnowledgeService {
    pub fn index_path(data_dir: &Path) -> PathBuf {
        data_dir.join("knowledge").join("index.json")
    }

    pub async fn index_folder(
        root: &Path,
        data_dir: &Path,
        state: &AppState,
    ) -> Result<KnowledgeIndexResult, AppError> {
        if !root.is_dir() {
            return Err(AppError::bad_request(
                "Knowledge base path must be an existing folder",
            ));
        }

        let mut chunks = Vec::new();
        let mut file_count = 0usize;
        walk_and_index(root, root, &mut chunks, &mut file_count)?;

        let config = state.snapshot_config();
        if config.knowledge_use_embeddings {
            let model = if config.knowledge_embedding_model.trim().is_empty() {
                "nomic-embed-text"
            } else {
                config.knowledge_embedding_model.trim()
            };
            for chunk in &mut chunks {
                match embed_text(state, &chunk.text, model).await {
                    Ok(vec) => chunk.embedding = Some(vec),
                    Err(err) => {
                        eprintln!("Embedding chunk {} failed: {err}", chunk.id);
                    }
                }
            }
        }

        let index = KnowledgeIndex {
            updated_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
            root_path: root.to_string_lossy().into_owned(),
            chunks,
        };

        let index_path = Self::index_path(data_dir);
        if let Some(parent) = index_path.parent() {
            fs::create_dir_all(parent).map_err(|e| AppError::Internal(e.to_string()))?;
        }
        let json = serde_json::to_string_pretty(&index)
            .map_err(|e| AppError::Internal(e.to_string()))?;
        fs::write(&index_path, json).map_err(|e| AppError::Internal(e.to_string()))?;

        Ok(KnowledgeIndexResult {
            chunk_count: index.chunks.len(),
            file_count,
            root_path: index.root_path,
            updated_at: index.updated_at,
        })
    }

    pub async fn retrieve(
        state: &AppState,
        data_dir: &Path,
        query: &str,
    ) -> Result<Option<KnowledgeRetrieval>, AppError> {
        let index_path = Self::index_path(data_dir);
        if !index_path.exists() {
            return Ok(None);
        }

        let raw = fs::read_to_string(&index_path).map_err(|e| AppError::Internal(e.to_string()))?;
        let index: KnowledgeIndex =
            serde_json::from_str(&raw).map_err(|e| AppError::Internal(e.to_string()))?;

        if index.chunks.is_empty() {
            return Ok(None);
        }

        let config = state.snapshot_config();
        let has_embeddings = index
            .chunks
            .iter()
            .any(|c| c.embedding.as_ref().is_some_and(|e| !e.is_empty()));

        let scored = if config.knowledge_use_embeddings && has_embeddings {
            semantic_scores(state, &index, query).await?
        } else {
            keyword_scores(&index, query)
        };

        if scored.is_empty() {
            return Ok(None);
        }

        build_retrieval(&index, scored)
    }

    pub async fn search_tool(
        state: &AppState,
        data_dir: &Path,
        query: &str,
        top_k: usize,
    ) -> Result<String, AppError> {
        let index_path = Self::index_path(data_dir);
        if !index_path.exists() {
            return Ok("Knowledge base is not indexed.".to_string());
        }

        let raw = fs::read_to_string(&index_path).map_err(|e| AppError::Internal(e.to_string()))?;
        let index: KnowledgeIndex =
            serde_json::from_str(&raw).map_err(|e| AppError::Internal(e.to_string()))?;

        let config = state.snapshot_config();
        let has_embeddings = index
            .chunks
            .iter()
            .any(|c| c.embedding.as_ref().is_some_and(|e| !e.is_empty()));

        let mut scored = if config.knowledge_use_embeddings && has_embeddings {
            semantic_scores(state, &index, query).await?
        } else {
            keyword_scores(&index, query)
        };
        scored.truncate(top_k.max(1).min(8));

        if scored.is_empty() {
            return Ok("No matching knowledge base excerpts found.".to_string());
        }

        let mut out = String::new();
        for (rank, (chunk_id, _)) in scored.iter().enumerate() {
            let chunk = index
                .chunks
                .iter()
                .find(|c| c.id == *chunk_id)
                .expect("chunk id in scored list");
            out.push_str(&format!(
                "[{}] {} ({}):\n{}\n\n",
                rank + 1,
                chunk.source_name,
                chunk.source_path,
                chunk.text.trim()
            ));
        }
        Ok(out.trim().to_string())
    }

    pub fn retrieve_context(data_dir: &Path, query: &str) -> Result<Option<String>, AppError> {
        let index_path = Self::index_path(data_dir);
        if !index_path.exists() {
            return Ok(None);
        }
        let raw = fs::read_to_string(&index_path).map_err(|e| AppError::Internal(e.to_string()))?;
        let index: KnowledgeIndex =
            serde_json::from_str(&raw).map_err(|e| AppError::Internal(e.to_string()))?;
        let scored = keyword_scores(&index, query);
        Ok(build_retrieval(&index, scored)?.map(|r| r.system_block))
    }
}

async fn semantic_scores(
    state: &AppState,
    index: &KnowledgeIndex,
    query: &str,
) -> Result<Vec<(usize, usize)>, AppError> {
    let config = state.snapshot_config();
    let model = if config.knowledge_embedding_model.trim().is_empty() {
        "nomic-embed-text"
    } else {
        config.knowledge_embedding_model.trim()
    };

    let query_vec = embed_text(state, query, model).await?;
    let mut scored: Vec<(usize, f32)> = index
        .chunks
        .iter()
        .filter_map(|chunk| {
            chunk
                .embedding
                .as_ref()
                .map(|emb| (chunk.id, cosine_similarity(&query_vec, emb)))
        })
        .filter(|(_, score)| *score > 0.1)
        .collect();

    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scored.truncate(TOP_K);

    Ok(scored
        .into_iter()
        .map(|(id, score)| (id, (score * 1000.0) as usize))
        .collect())
}

fn keyword_scores(index: &KnowledgeIndex, query: &str) -> Vec<(usize, usize)> {
    let query_terms = tokenize(query);
    if query_terms.is_empty() {
        return Vec::new();
    }

    let mut scored: Vec<(usize, usize)> = index
        .chunks
        .iter()
        .map(|chunk| {
            let chunk_terms = tokenize(&chunk.text);
            let score = query_terms
                .iter()
                .filter(|term| chunk_terms.iter().any(|t| t == *term))
                .count();
            (chunk.id, score)
        })
        .filter(|(_, score)| *score > 0)
        .collect();

    scored.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    scored.truncate(TOP_K);
    scored
}

fn build_retrieval(
    index: &KnowledgeIndex,
    scored: Vec<(usize, usize)>,
) -> Result<Option<KnowledgeRetrieval>, AppError> {
    if scored.is_empty() {
        return Ok(None);
    }

    let mut block = String::from(
        "Relevant excerpts from the local knowledge base (cite as [1], [2], etc. when used):\n",
    );
    let mut citations = Vec::new();

    for (rank, (chunk_id, _)) in scored.iter().enumerate() {
        let chunk = index
            .chunks
            .iter()
            .find(|c| c.id == *chunk_id)
            .expect("chunk id in scored list");
        let index_num = (rank + 1) as u32;
        block.push_str(&format!(
            "\n[{}] {}:\n{}\n",
            index_num,
            chunk.source_name,
            chunk.text.trim()
        ));
        citations.push(KnowledgeCitation {
            index: index_num,
            source_name: chunk.source_name.clone(),
            source_path: chunk.source_path.clone(),
            excerpt: chunk.text.trim().to_string(),
        });
    }

    Ok(Some(KnowledgeRetrieval {
        system_block: block,
        citations,
    }))
}

fn walk_and_index(
    root: &Path,
    current: &Path,
    chunks: &mut Vec<KnowledgeChunk>,
    file_count: &mut usize,
) -> Result<(), AppError> {
    for entry in fs::read_dir(current).map_err(|e| AppError::Internal(e.to_string()))? {
        let entry = entry.map_err(|e| AppError::Internal(e.to_string()))?;
        let path = entry.path();
        if path.is_dir() {
            walk_and_index(root, &path, chunks, file_count)?;
            continue;
        }

        let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
            continue;
        };
        let ext_lower = ext.to_lowercase();

        let text = if TEXT_EXTENSIONS.contains(&ext_lower.as_str()) {
            Some(fs::read_to_string(&path).map_err(|e| AppError::Internal(e.to_string()))?)
        } else if PDF_EXTENSIONS.contains(&ext_lower.as_str()) {
            let bytes = fs::read(&path).map_err(|e| AppError::Internal(e.to_string()))?;
            Some(crate::services::pdf_text::extract_pdf_text(&bytes)?)
        } else if DOCX_EXTENSIONS.contains(&ext_lower.as_str()) {
            let bytes = fs::read(&path).map_err(|e| AppError::Internal(e.to_string()))?;
            Some(crate::services::docx_text::extract_docx_text(&bytes)?)
        } else {
            None
        };

        let Some(text) = text else {
            continue;
        };

        let trimmed = text.trim();
        if trimmed.is_empty() {
            continue;
        }

        *file_count += 1;
        let source_name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "file".to_string());
        let source_path = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");

        for piece in chunk_text(trimmed) {
            chunks.push(KnowledgeChunk {
                id: chunks.len(),
                source_path: source_path.clone(),
                source_name: source_name.clone(),
                text: piece,
                embedding: None,
            });
        }
    }

    Ok(())
}

fn chunk_text(text: &str) -> Vec<String> {
    let chars: Vec<char> = text.chars().collect();
    if chars.len() <= CHUNK_SIZE {
        return vec![text.to_string()];
    }

    let mut out = Vec::new();
    let mut start = 0usize;
    while start < chars.len() {
        let end = (start + CHUNK_SIZE).min(chars.len());
        let chunk: String = chars[start..end].iter().collect();
        out.push(chunk);
        if end >= chars.len() {
            break;
        }
        start = end.saturating_sub(CHUNK_OVERLAP);
    }
    out
}

fn tokenize(text: &str) -> Vec<String> {
    text.to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| w.len() >= 3)
        .map(str::to_string)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chunk_text_splits_long_input() {
        let long = "word ".repeat(300);
        let chunks = chunk_text(long.trim());
        assert!(chunks.len() > 1);
    }

    #[test]
    fn tokenize_filters_short_words() {
        let terms = tokenize("Hello world testing");
        assert!(terms.contains(&"hello".to_string()));
        assert!(terms.contains(&"world".to_string()));
        assert!(terms.contains(&"testing".to_string()));
    }
}
