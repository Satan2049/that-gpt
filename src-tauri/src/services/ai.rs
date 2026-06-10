use futures_util::StreamExt;
use reqwest::Client;

use crate::config::{AppConfig, AppState};
use crate::error::AppError;
use crate::models::ai::{
    build_completion_request_body, parse_completion_content, parse_stream_data_payload,
};
use crate::models::api::{ConnectionTestResult, ModelsListResult};
use crate::models::ChatCompletionMessage;

const RETRYABLE_STATUS: [u16; 4] = [429, 502, 503, 504];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum AiErrorCode {
    InvalidKey,
    RateLimit,
    Timeout,
    Network,
    Provider,
    Unknown,
}

#[derive(Debug)]
struct AiClientError {
    message: String,
    code: AiErrorCode,
    status_code: Option<u16>,
}

impl AiClientError {
    fn new(message: impl Into<String>, code: AiErrorCode) -> Self {
        Self {
            message: message.into(),
            code,
            status_code: None,
        }
    }

    fn with_status(message: impl Into<String>, code: AiErrorCode, status: u16) -> Self {
        Self {
            message: message.into(),
            code,
            status_code: Some(status),
        }
    }
}

struct AiRuntime {
    config: AppConfig,
    http: Client,
    base_url: String,
}

impl AiRuntime {
    fn from_state(state: &AppState) -> Result<Self, AppError> {
        let config = state.snapshot_config();
        if config.ai_api_key.trim().is_empty() {
            return Err(AppError::ai_provider(user_message_for_ai_error(
                &AiClientError::new("AI_API_KEY is not configured.", AiErrorCode::InvalidKey),
            )));
        }

        Ok(Self {
            base_url: config.ai_base_url.trim_end_matches('/').to_string(),
            http: state.snapshot_http(),
            config,
        })
    }

    fn auth_header(&self) -> String {
        format!("Bearer {}", self.config.ai_api_key)
    }
}

fn user_message_for_ai_error(error: &AiClientError) -> String {
    match error.code {
        AiErrorCode::InvalidKey => {
            "Invalid API key. Open Settings and check your API key.".to_string()
        }
        AiErrorCode::RateLimit => {
            "The model provider rate-limited this request. Try again shortly.".to_string()
        }
        AiErrorCode::Timeout => {
            "The model request timed out. Try again or shorten the conversation.".to_string()
        }
        AiErrorCode::Network => {
            "Could not reach the model API. Check your network and base URL in Settings."
                .to_string()
        }
        AiErrorCode::Provider => {
            if error.message.is_empty() {
                "The model provider returned an error.".to_string()
            } else {
                error.message.clone()
            }
        }
        AiErrorCode::Unknown => {
            if error.message.is_empty() {
                "AI request failed.".to_string()
            } else {
                error.message.clone()
            }
        }
    }
}

fn classify_ai_http_error(status: u16, body_text: &str) -> AiClientError {
    let lower = body_text.to_lowercase();

    if status == 401 || status == 403 {
        return AiClientError::with_status(
            "Authentication failed with the model API.",
            AiErrorCode::InvalidKey,
            status,
        );
    }

    if status == 429 {
        return AiClientError::with_status(
            "Model API rate limit exceeded.",
            AiErrorCode::RateLimit,
            status,
        );
    }

    if status == 408 || lower.contains("timeout") {
        return AiClientError::with_status(
            "Model API request timed out.",
            AiErrorCode::Timeout,
            status,
        );
    }

    if status >= 500 {
        return AiClientError::with_status(
            if body_text.is_empty() {
                format!("Model API error ({status}).")
            } else {
                body_text.to_string()
            },
            AiErrorCode::Provider,
            status,
        );
    }

    if lower.contains("invalid api key") || lower.contains("incorrect api key") {
        return AiClientError::with_status(
            "Invalid API key for the model provider.",
            AiErrorCode::InvalidKey,
            status,
        );
    }

    AiClientError::with_status(
        if body_text.is_empty() {
            format!("Model API returned {status}.")
        } else {
            body_text.to_string()
        },
        AiErrorCode::Provider,
        status,
    )
}

fn is_retryable(error: &AiClientError) -> bool {
    matches!(
        error.code,
        AiErrorCode::RateLimit | AiErrorCode::Timeout | AiErrorCode::Network
    ) || error
        .status_code
        .is_some_and(|s| RETRYABLE_STATUS.contains(&s))
}

fn map_reqwest_error(err: reqwest::Error) -> AiClientError {
    if err.is_timeout() {
        AiClientError::new("Model API request timed out.", AiErrorCode::Timeout)
    } else if err.is_connect() {
        AiClientError::new("Could not reach the model API.", AiErrorCode::Network)
    } else {
        AiClientError::new(err.to_string(), AiErrorCode::Unknown)
    }
}

fn should_fallback_to_non_stream(error: &AiClientError) -> bool {
    matches!(error.code, AiErrorCode::Provider | AiErrorCode::Unknown)
        && error
            .status_code
            .is_some_and(|status| status == 400 || status == 404 || status == 422)
}

pub async fn list_models(state: &AppState) -> Result<ModelsListResult, AppError> {
    let runtime = AiRuntime::from_state(state)?;
    let url = format!("{}/models", runtime.base_url);

    let response = runtime
        .http
        .get(&url)
        .header("Authorization", runtime.auth_header())
        .send()
        .await
        .map_err(|err| AppError::ai_provider(user_message_for_ai_error(&map_reqwest_error(err))))?;

    let status = response.status().as_u16();
    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        let err = classify_ai_http_error(status, &text);
        return Err(AppError::ai_provider(user_message_for_ai_error(&err)));
    }

    let body: serde_json::Value = response.json().await.map_err(|e| {
        AppError::ai_provider(format!("Could not parse models response: {e}"))
    })?;

    let mut models: Vec<String> = body
        .get("data")
        .and_then(|data| data.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|item| item.get("id").and_then(|id| id.as_str()))
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default();

    if models.is_empty() {
        if let Some(array) = body.as_array() {
            models = array
                .iter()
                .filter_map(|item| item.get("id").and_then(|id| id.as_str()))
                .map(str::to_string)
                .collect();
        }
    }

    models.sort();
    models.dedup();

    if models.is_empty() {
        return Err(AppError::ai_provider(
            "No models returned. Your provider may not support /models — enter a model id manually.",
        ));
    }

    Ok(ModelsListResult {
        models,
        source: "provider".to_string(),
    })
}

pub async fn test_api_connection(state: &AppState) -> Result<ConnectionTestResult, AppError> {
    match list_models(state).await {
        Ok(result) => Ok(ConnectionTestResult {
            ok: true,
            message: "Connected successfully.".to_string(),
            model_count: Some(result.models.len()),
        }),
        Err(AppError::AiProvider(message)) => Ok(ConnectionTestResult {
            ok: false,
            message,
            model_count: None,
        }),
        Err(other) => Err(other),
    }
}

pub async fn create_chat_completion(
    state: &AppState,
    messages: Vec<ChatCompletionMessage>,
    model: Option<&str>,
    temperature: Option<f64>,
    max_tokens: Option<i64>,
) -> Result<String, AppError> {
    create_chat_completion_stream(state, messages, model, temperature, max_tokens, |_| {}).await
}

pub async fn create_chat_completion_stream<F>(
    state: &AppState,
    messages: Vec<ChatCompletionMessage>,
    model: Option<&str>,
    temperature: Option<f64>,
    max_tokens: Option<i64>,
    mut on_delta: F,
) -> Result<String, AppError>
where
    F: FnMut(&str),
{
    let runtime = AiRuntime::from_state(state)?;
    let model = model.unwrap_or(&runtime.config.ai_model);
    let temperature = temperature.unwrap_or(0.7);
    let max_tokens = max_tokens.unwrap_or(2048);
    let messages_for_fallback = messages.clone();
    let body = build_completion_request_body(model, messages, temperature, max_tokens, true);
    let max_attempts = runtime.config.ai_max_retries.max(0) + 1;
    let mut last_error: Option<AiClientError> = None;

    for attempt in 0..max_attempts {
        if attempt > 0 {
            let backoff_ms = std::cmp::min(8000, 500 * 2_u64.pow(attempt - 1));
            tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
        }

        match stream_completion(&runtime, &body, &mut on_delta).await {
            Ok(content) => return Ok(content),
            Err(err) if is_retryable(&err) && attempt < max_attempts - 1 => {
                last_error = Some(err);
                continue;
            }
            Err(err) if should_fallback_to_non_stream(&err) => {
                return create_non_stream_completion(
                    &runtime,
                    model,
                    messages_for_fallback,
                    temperature,
                    max_tokens,
                    &mut on_delta,
                )
                .await;
            }
            Err(err) => return Err(AppError::ai_provider(user_message_for_ai_error(&err))),
        }
    }

    Err(AppError::ai_provider(user_message_for_ai_error(
        &last_error.unwrap_or_else(|| {
            AiClientError::new("AI request failed.", AiErrorCode::Unknown)
        }),
    )))
}

async fn create_non_stream_completion<F>(
    runtime: &AiRuntime,
    model: &str,
    messages: Vec<ChatCompletionMessage>,
    temperature: f64,
    max_tokens: i64,
    on_delta: &mut F,
) -> Result<String, AppError>
where
    F: FnMut(&str),
{
    let body = build_completion_request_body(model, messages, temperature, max_tokens, false);
    let max_attempts = runtime.config.ai_max_retries.max(0) + 1;
    let mut last_error: Option<AiClientError> = None;

    for attempt in 0..max_attempts {
        if attempt > 0 {
            let backoff_ms = std::cmp::min(8000, 500 * 2_u64.pow(attempt - 1));
            tokio::time::sleep(std::time::Duration::from_millis(backoff_ms)).await;
        }

        let response = runtime
            .http
            .post(format!("{}/chat/completions", runtime.base_url))
            .header("Content-Type", "application/json")
            .header("Authorization", runtime.auth_header())
            .json(&body)
            .send()
            .await;

        match response {
            Ok(res) => {
                let status = res.status().as_u16();
                if !res.status().is_success() {
                    let text = res.text().await.unwrap_or_default();
                    let err = classify_ai_http_error(status, &text);
                    if is_retryable(&err) && attempt < max_attempts - 1 {
                        last_error = Some(err);
                        continue;
                    }
                    return Err(AppError::ai_provider(user_message_for_ai_error(&err)));
                }

                let text = res.text().await.map_err(|e| {
                    AppError::ai_provider(user_message_for_ai_error(&AiClientError::new(
                        e.to_string(),
                        AiErrorCode::Unknown,
                    )))
                })?;

                let content = parse_completion_content(&text)
                    .map_err(|msg| AppError::ai_provider(msg))?;
                on_delta(&content);
                return Ok(content);
            }
            Err(err) => {
                let classified = map_reqwest_error(err);
                if is_retryable(&classified) && attempt < max_attempts - 1 {
                    last_error = Some(classified);
                    continue;
                }
                return Err(AppError::ai_provider(user_message_for_ai_error(
                    &classified,
                )));
            }
        }
    }

    Err(AppError::ai_provider(user_message_for_ai_error(
        &last_error.unwrap_or_else(|| {
            AiClientError::new("AI request failed.", AiErrorCode::Unknown)
        }),
    )))
}

async fn stream_completion<F>(
    runtime: &AiRuntime,
    body: &crate::models::ai::ChatCompletionRequest,
    on_delta: &mut F,
) -> Result<String, AiClientError>
where
    F: FnMut(&str),
{
    let response = runtime
        .http
        .post(format!("{}/chat/completions", runtime.base_url))
        .header("Content-Type", "application/json")
        .header("Authorization", runtime.auth_header())
        .json(body)
        .send()
        .await
        .map_err(map_reqwest_error)?;

    let status = response.status().as_u16();
    if !response.status().is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(classify_ai_http_error(status, &text));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut content = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(map_reqwest_error)?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer.drain(..=newline_pos);

            if !line.starts_with("data:") {
                continue;
            }

            let data = line.strip_prefix("data:").unwrap_or("").trim();
            if data.is_empty() {
                continue;
            }

            match parse_stream_data_payload(data) {
                Some(None) => break,
                Some(Some(delta)) if !delta.is_empty() => {
                    content.push_str(&delta);
                    on_delta(&delta);
                }
                None => {}
                Some(Some(_)) => {}
            }
        }
    }

    if content.is_empty() {
        return Err(AiClientError::new(
            "The model returned an empty response.",
            AiErrorCode::Provider,
        ));
    }

    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_401_to_invalid_key() {
        let err = classify_ai_http_error(401, "Unauthorized");
        assert_eq!(err.code, AiErrorCode::InvalidKey);
        assert_eq!(err.status_code, Some(401));
    }

    #[test]
    fn maps_429_to_rate_limit() {
        let err = classify_ai_http_error(429, "Too Many Requests");
        assert_eq!(err.code, AiErrorCode::RateLimit);
    }

    #[test]
    fn friendly_timeout_message() {
        let err = AiClientError::new("raw", AiErrorCode::Timeout);
        assert!(user_message_for_ai_error(&err).to_lowercase().contains("timed out"));
    }

    #[test]
    fn parses_stream_delta_payload() {
        let payload = r#"{"choices":[{"delta":{"content":"Hello"}}]}"#;
        assert_eq!(
            crate::models::ai::parse_stream_data_payload(payload),
            Some(Some("Hello".to_string()))
        );
    }
}
