use crate::config::AppState;
use crate::error::AppError;

pub async fn embed_text(state: &AppState, text: &str, model: &str) -> Result<Vec<f32>, AppError> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(AppError::bad_request("Cannot embed empty text"));
    }

    let config = state.snapshot_config();
    let model = model.trim();
    if model.is_empty() {
        return Err(AppError::bad_request("Embedding model is not configured"));
    }

    if is_ollama_base_url(&config.ai_base_url) {
        embed_ollama(state, trimmed, model).await
    } else {
        embed_openai_compatible(state, trimmed, model).await
    }
}

fn is_ollama_base_url(base_url: &str) -> bool {
    let lower = base_url.to_lowercase();
    lower.contains("11434") || lower.contains("ollama")
}

fn ollama_root(base_url: &str) -> String {
    let trimmed = base_url.trim_end_matches('/');
    if trimmed.ends_with("/v1") {
        trimmed.trim_end_matches("/v1").to_string()
    } else {
        trimmed.to_string()
    }
}

async fn embed_ollama(state: &AppState, text: &str, model: &str) -> Result<Vec<f32>, AppError> {
    let config = state.snapshot_config();
    let url = format!("{}/api/embeddings", ollama_root(&config.ai_base_url));
    let client = state.snapshot_http();
    let body = serde_json::json!({
        "model": model,
        "prompt": text,
    });

    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::ai_provider(format!("Embedding request failed: {e}")))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::ai_provider(format!(
            "Ollama embeddings failed ({status}): {body}"
        )));
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::ai_provider(format!("Invalid embedding response: {e}")))?;

    parse_embedding_array(&payload["embedding"])
}

async fn embed_openai_compatible(
    state: &AppState,
    text: &str,
    model: &str,
) -> Result<Vec<f32>, AppError> {
    let config = state.snapshot_config();
    let base = config.ai_base_url.trim_end_matches('/');
    let url = format!("{base}/embeddings");
    let client = state.snapshot_http();
    let mut request = client.post(&url).json(&serde_json::json!({
        "model": model,
        "input": text,
    }));

    if !config.ai_api_key.trim().is_empty() {
        request = request.bearer_auth(config.ai_api_key.trim());
    }

    let response = request
        .send()
        .await
        .map_err(|e| AppError::ai_provider(format!("Embedding request failed: {e}")))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::ai_provider(format!(
            "Embeddings API failed ({status}): {body}"
        )));
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::ai_provider(format!("Invalid embedding response: {e}")))?;

    parse_embedding_array(&payload["data"][0]["embedding"])
}

fn parse_embedding_array(value: &serde_json::Value) -> Result<Vec<f32>, AppError> {
    let arr = value
        .as_array()
        .ok_or_else(|| AppError::ai_provider("Embedding response missing vector".to_string()))?;
    Ok(arr.iter().filter_map(|v| v.as_f64().map(|n| n as f32)).collect())
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() || a.is_empty() {
        return 0.0;
    }
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot / (norm_a * norm_b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cosine_identical_vectors() {
        let v = vec![1.0, 2.0, 3.0];
        assert!((cosine_similarity(&v, &v) - 1.0).abs() < 1e-5);
    }
}
