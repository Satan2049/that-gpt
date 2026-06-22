use crate::config::AppState;
use crate::error::AppError;
use crate::models::chat::{ChatImageAttachment, ImageMimeType};

pub async fn generate_image(
    state: &AppState,
    prompt: &str,
    size: Option<&str>,
) -> Result<ChatImageAttachment, AppError> {
    let trimmed = prompt.trim();
    if trimmed.is_empty() {
        return Err(AppError::bad_request("Image prompt cannot be empty"));
    }

    let config = state.snapshot_config();
    let model = config.ai_image_model.trim();
    if model.is_empty() {
        return Err(AppError::bad_request(
            "Image generation model is not configured in Settings",
        ));
    }

    if is_ollama_base_url(&config.ai_base_url) {
        generate_ollama_image(state, model, trimmed).await
    } else {
        generate_openai_compatible_image(state, model, trimmed, size).await
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

async fn generate_openai_compatible_image(
    state: &AppState,
    model: &str,
    prompt: &str,
    size: Option<&str>,
) -> Result<ChatImageAttachment, AppError> {
    let config = state.snapshot_config();
    let base = config.ai_base_url.trim_end_matches('/');
    let url = format!("{base}/images/generations");
    let image_size = size.unwrap_or("1024x1024");

    let mut body = serde_json::json!({
        "prompt": prompt,
        "n": 1,
        "size": image_size,
        "response_format": "b64_json",
    });
    if !model.is_empty() {
        body["model"] = serde_json::Value::String(model.to_string());
    }

    let client = state.snapshot_http();
    let mut request = client.post(&url).json(&body);
    if !config.ai_api_key.trim().is_empty() {
        request = request.bearer_auth(config.ai_api_key.trim());
    }

    let response = request
        .send()
        .await
        .map_err(|e| AppError::ai_provider(format!("Image generation request failed: {e}")))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::ai_provider(format!(
            "Image generation failed ({status}): {text}"
        )));
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::ai_provider(format!("Invalid image response: {e}")))?;

    let b64 = payload["data"][0]["b64_json"]
        .as_str()
        .ok_or_else(|| AppError::ai_provider("Image response missing b64_json"))?;

    Ok(ChatImageAttachment {
        mime_type: ImageMimeType::Png,
        base64: b64.to_string(),
    })
}

async fn generate_ollama_image(
    state: &AppState,
    model: &str,
    prompt: &str,
) -> Result<ChatImageAttachment, AppError> {
    let config = state.snapshot_config();
    let url = format!("{}/api/generate", ollama_root(&config.ai_base_url));
    let client = state.snapshot_http();

    let response = client
        .post(&url)
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "stream": false,
        }))
        .send()
        .await
        .map_err(|e| AppError::ai_provider(format!("Ollama image request failed: {e}")))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(AppError::ai_provider(format!(
            "Ollama image generation failed ({status}): {text}"
        )));
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::ai_provider(format!("Invalid Ollama image response: {e}")))?;

    if let Some(b64) = payload["image"].as_str() {
        return Ok(ChatImageAttachment {
            mime_type: ImageMimeType::Png,
            base64: b64.to_string(),
        });
    }

    if let Some(b64) = payload["response"].as_str() {
        if looks_like_base64(b64) {
            return Ok(ChatImageAttachment {
                mime_type: ImageMimeType::Png,
                base64: b64.to_string(),
            });
        }
    }

    Err(AppError::ai_provider(
        "Ollama did not return an image. Use an image-capable model (e.g. flux) or an OpenAI-compatible images API.",
    ))
}

fn looks_like_base64(value: &str) -> bool {
    value.len() > 128 && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=')
}
