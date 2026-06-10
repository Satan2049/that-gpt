use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::chat::{ChatImageAttachment, ChatMessage};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ChatCompletionContent {
    Text(String),
    Parts(Vec<ChatCompletionContentPart>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ChatCompletionContentPart {
    Text { text: String },
    ImageUrl { image_url: ImageUrlPart },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageUrlPart {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionMessage {
    pub role: String,
    pub content: ChatCompletionContent,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatCompletionMessage>,
    temperature: f64,
    #[serde(rename = "max_tokens")]
    max_tokens: i64,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Option<Vec<ChatCompletionChoice>>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoice {
    message: Option<ChatCompletionChoiceMessage>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoiceMessage {
    content: Option<Value>,
}

impl ChatCompletionRequest {
    pub fn new(
        model: String,
        messages: Vec<ChatCompletionMessage>,
        temperature: f64,
        max_tokens: i64,
        stream: bool,
    ) -> Self {
        Self {
            model,
            messages,
            temperature,
            max_tokens,
            stream,
        }
    }
}

pub fn user_content_for_api(
    text: &str,
    images: Option<&[ChatImageAttachment]>,
) -> ChatCompletionContent {
    let images = match images {
        Some(imgs) if !imgs.is_empty() => imgs,
        _ => return ChatCompletionContent::Text(text.to_string()),
    };

    let mut parts: Vec<ChatCompletionContentPart> = Vec::new();
    let trimmed = text.trim();
    if !trimmed.is_empty() {
        parts.push(ChatCompletionContentPart::Text {
            text: trimmed.to_string(),
        });
    }
    for img in images {
        parts.push(ChatCompletionContentPart::ImageUrl {
            image_url: ImageUrlPart {
                url: format!("data:{};base64,{}", img.mime_type.as_str(), img.base64),
            },
        });
    }
    ChatCompletionContent::Parts(parts)
}

pub fn chat_messages_to_completion_messages(
    messages: &[ChatMessage],
) -> Vec<ChatCompletionMessage> {
    let mut out = Vec::new();
    for m in messages {
        match m.role {
            super::chat::MessageRole::System => {
                out.push(ChatCompletionMessage {
                    role: "system".to_string(),
                    content: ChatCompletionContent::Text(m.content.clone()),
                });
            }
            super::chat::MessageRole::Assistant => {
                out.push(ChatCompletionMessage {
                    role: "assistant".to_string(),
                    content: ChatCompletionContent::Text(m.content.clone()),
                });
            }
            super::chat::MessageRole::User => {
                out.push(ChatCompletionMessage {
                    role: "user".to_string(),
                    content: user_content_for_api(&m.content, m.images.as_deref()),
                });
            }
        }
    }
    out
}

pub fn parse_completion_content(body: &str) -> Result<String, String> {
    let data: ChatCompletionResponse =
        serde_json::from_str(body).map_err(|_| "Invalid AI response shape.".to_string())?;
    let content = data
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.message)
        .and_then(|m| m.content);

    match content {
        Some(Value::String(s)) => Ok(s),
        _ => Err("Invalid AI response shape.".to_string()),
    }
}

pub(crate) fn build_completion_request_body(
    model: &str,
    messages: Vec<ChatCompletionMessage>,
    temperature: f64,
    max_tokens: i64,
    stream: bool,
) -> ChatCompletionRequest {
    ChatCompletionRequest::new(
        model.to_string(),
        messages,
        temperature,
        max_tokens,
        stream,
    )
}

#[derive(Debug, Deserialize)]
struct StreamChunkResponse {
    choices: Option<Vec<StreamChunkChoice>>,
}

#[derive(Debug, Deserialize)]
struct StreamChunkChoice {
    delta: Option<StreamChunkDelta>,
}

#[derive(Debug, Deserialize)]
struct StreamChunkDelta {
    content: Option<String>,
}

pub fn parse_stream_data_payload(data: &str) -> Option<Option<String>> {
    let trimmed = data.trim();
    if trimmed == "[DONE]" {
        return Some(None);
    }
    let parsed: StreamChunkResponse = serde_json::from_str(trimmed).ok()?;
    let delta = parsed
        .choices?
        .into_iter()
        .next()?
        .delta?
        .content?;
    Some(Some(delta))
}
