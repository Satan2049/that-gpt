use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::chat::{
    AttachmentKind, ChatAttachment, ChatImageAttachment, ChatMessage, MessageRole, ToolCallRecord,
};

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
    InputAudio { input_audio: InputAudioPart },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageUrlPart {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputAudioPart {
    pub data: String,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    #[serde(rename = "type")]
    pub call_type: String,
    pub function: ToolCallFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallFunction {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatCompletionMessage {
    pub role: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<ChatCompletionContent>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatCompletionMessage>,
    temperature: f64,
    #[serde(rename = "max_tokens")]
    max_tokens: i64,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    tools: Option<Vec<Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Option<Vec<ChatCompletionChoice>>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoice {
    message: Option<ChatCompletionChoiceMessage>,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionChoiceMessage {
    content: Option<Value>,
    tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone)]
pub struct ParsedCompletion {
    pub content: String,
    pub tool_calls: Vec<ToolCall>,
    pub finish_reason: Option<String>,
}

impl ChatCompletionRequest {
    pub fn new(
        model: String,
        messages: Vec<ChatCompletionMessage>,
        temperature: f64,
        max_tokens: i64,
        stream: bool,
        tools: Option<Vec<Value>>,
    ) -> Self {
        Self {
            model,
            messages,
            temperature,
            max_tokens,
            stream,
            tools: tools.clone(),
            tool_choice: if tools.is_some() {
                Some("auto".to_string())
            } else {
                None
            },
        }
    }
}

pub fn user_content_for_api(
    text: &str,
    images: Option<&[ChatImageAttachment]>,
    attachments: Option<&[ChatAttachment]>,
) -> ChatCompletionContent {
    let mut parts: Vec<ChatCompletionContentPart> = Vec::new();
    let trimmed = text.trim();

    if let Some(attachments) = attachments {
        for att in attachments {
            match att.kind {
                AttachmentKind::Image => {
                    parts.push(ChatCompletionContentPart::ImageUrl {
                        image_url: ImageUrlPart {
                            url: format!("data:{};base64,{}", att.mime_type, att.base64),
                        },
                    });
                }
                AttachmentKind::Audio => {
                    let format = audio_format_from_mime(&att.mime_type);
                    parts.push(ChatCompletionContentPart::InputAudio {
                        input_audio: InputAudioPart {
                            data: att.base64.clone(),
                            format,
                        },
                    });
                }
                AttachmentKind::Text | AttachmentKind::Pdf => {
                    let label = att
                        .filename
                        .as_deref()
                        .unwrap_or(if att.kind == AttachmentKind::Pdf {
                            "attached.pdf"
                        } else {
                            "attached file"
                        });
                    let body = att.text_content.as_deref().unwrap_or("(empty file)");
                    parts.push(ChatCompletionContentPart::Text {
                        text: format!("--- {label} ({}) ---\n{body}", att.mime_type),
                    });
                }
            }
        }
    } else if let Some(images) = images {
        for img in images {
            parts.push(ChatCompletionContentPart::ImageUrl {
                image_url: ImageUrlPart {
                    url: format!("data:{};base64,{}", img.mime_type.as_str(), img.base64),
                },
            });
        }
    }

    if !trimmed.is_empty() {
        parts.insert(
            0,
            ChatCompletionContentPart::Text {
                text: trimmed.to_string(),
            },
        );
    }

    if parts.is_empty() {
        ChatCompletionContent::Text(String::new())
    } else if parts.len() == 1 {
        match parts.remove(0) {
            ChatCompletionContentPart::Text { text } => ChatCompletionContent::Text(text),
            other => ChatCompletionContent::Parts(vec![other]),
        }
    } else {
        ChatCompletionContent::Parts(parts)
    }
}

fn audio_format_from_mime(mime: &str) -> String {
    match mime {
        "audio/mpeg" | "audio/mp3" => "mp3".to_string(),
        "audio/wav" | "audio/x-wav" => "wav".to_string(),
        "audio/webm" => "webm".to_string(),
        "audio/ogg" => "ogg".to_string(),
        "audio/mp4" | "audio/x-m4a" | "audio/m4a" => "m4a".to_string(),
        _ => "wav".to_string(),
    }
}

pub fn chat_messages_to_completion_messages(
    messages: &[ChatMessage],
) -> Vec<ChatCompletionMessage> {
    let mut out = Vec::new();
    for m in messages {
        match m.role {
            MessageRole::System => {
                out.push(ChatCompletionMessage {
                    role: "system".to_string(),
                    content: Some(ChatCompletionContent::Text(m.content.clone())),
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                });
            }
            MessageRole::Assistant => {
                let tool_calls = m.tool_calls.as_ref().map(|calls| {
                    calls
                        .iter()
                        .map(|c| ToolCall {
                            id: c.id.clone(),
                            call_type: "function".to_string(),
                            function: ToolCallFunction {
                                name: c.name.clone(),
                                arguments: c.arguments.clone(),
                            },
                        })
                        .collect()
                });
                let content = if m.content.is_empty() && tool_calls.is_some() {
                    None
                } else {
                    Some(ChatCompletionContent::Text(m.content.clone()))
                };
                out.push(ChatCompletionMessage {
                    role: "assistant".to_string(),
                    content,
                    tool_calls,
                    tool_call_id: None,
                    name: None,
                });
            }
            MessageRole::Tool => {
                out.push(ChatCompletionMessage {
                    role: "tool".to_string(),
                    content: Some(ChatCompletionContent::Text(m.content.clone())),
                    tool_calls: None,
                    tool_call_id: m.tool_call_id.clone(),
                    name: m.tool_name.clone(),
                });
            }
            MessageRole::User => {
                let attachments = m.all_attachments();
                let att_ref = if attachments.is_empty() {
                    None
                } else {
                    Some(attachments.as_slice())
                };
                out.push(ChatCompletionMessage {
                    role: "user".to_string(),
                    content: Some(user_content_for_api(
                        &m.content,
                        m.images.as_deref(),
                        att_ref,
                    )),
                    tool_calls: None,
                    tool_call_id: None,
                    name: None,
                });
            }
        }
    }
    out
}

pub fn parse_completion_response(body: &str) -> Result<ParsedCompletion, String> {
    let data: ChatCompletionResponse =
        serde_json::from_str(body).map_err(|_| "Invalid AI response shape.".to_string())?;
    let choice = data
        .choices
        .and_then(|c| c.into_iter().next())
        .ok_or_else(|| "Invalid AI response shape.".to_string())?;

    let message = choice
        .message
        .ok_or_else(|| "Invalid AI response shape.".to_string())?;

    let content = match message.content {
        Some(Value::String(s)) => s,
        Some(Value::Null) | None => String::new(),
        Some(_) => String::new(),
    };

    Ok(ParsedCompletion {
        content,
        tool_calls: message.tool_calls.unwrap_or_default(),
        finish_reason: choice.finish_reason,
    })
}

pub fn parse_completion_content(body: &str) -> Result<String, String> {
    parse_completion_response(body).map(|p| p.content)
}

pub fn tool_calls_to_records(calls: &[ToolCall]) -> Vec<ToolCallRecord> {
    calls
        .iter()
        .map(|c| ToolCallRecord {
            id: c.id.clone(),
            name: c.function.name.clone(),
            arguments: c.function.arguments.clone(),
        })
        .collect()
}

pub(crate) fn build_completion_request_body(
    model: &str,
    messages: Vec<ChatCompletionMessage>,
    temperature: f64,
    max_tokens: i64,
    stream: bool,
    tools: Option<Vec<Value>>,
) -> ChatCompletionRequest {
    ChatCompletionRequest::new(
        model.to_string(),
        messages,
        temperature,
        max_tokens,
        stream,
        tools,
    )
}

#[derive(Debug, Deserialize)]
struct StreamChunkResponse {
    choices: Option<Vec<StreamChunkChoice>>,
}

#[derive(Debug, Deserialize)]
struct StreamChunkChoice {
    delta: Option<StreamChunkDelta>,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct StreamChunkDelta {
    content: Option<String>,
    tool_calls: Option<Vec<StreamToolCallDelta>>,
}

#[derive(Debug, Deserialize)]
struct StreamToolCallDelta {
    index: Option<usize>,
    id: Option<String>,
    #[serde(rename = "type")]
    call_type: Option<String>,
    function: Option<StreamToolFunctionDelta>,
}

#[derive(Debug, Deserialize)]
struct StreamToolFunctionDelta {
    name: Option<String>,
    arguments: Option<String>,
}

pub fn parse_stream_data_payload(data: &str) -> Option<Option<String>> {
    let trimmed = data.trim();
    if trimmed == "[DONE]" {
        return Some(None);
    }
    let parsed: StreamChunkResponse = serde_json::from_str(trimmed).ok()?;
    let delta = parsed.choices?.into_iter().next()?.delta?;
    let content = delta.content?;
    Some(Some(content))
}

pub fn parse_stream_tool_deltas(data: &str) -> Vec<(usize, Option<String>, Option<String>, Option<String>)> {
    let trimmed = data.trim();
    if trimmed == "[DONE]" {
        return Vec::new();
    }
    let Ok(parsed) = serde_json::from_str::<StreamChunkResponse>(trimmed) else {
        return Vec::new();
    };
    let Some(delta) = parsed
        .choices
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.delta)
    else {
        return Vec::new();
    };
    let Some(tool_calls) = delta.tool_calls else {
        return Vec::new();
    };

    tool_calls
        .into_iter()
        .map(|tc| {
            (
                tc.index.unwrap_or(0),
                tc.id,
                tc.function.as_ref().and_then(|f| f.name.clone()),
                tc.function.as_ref().and_then(|f| f.arguments.clone()),
            )
        })
        .collect()
}

pub const TOOLS_SYSTEM_HINT: &str = "You can analyze images, audio, PDFs, and text files attached by the user. \
When you need deeper analysis of an attachment, use the available tools: \
analyze_image (vision model), analyze_audio (transcription), and read_attachment (full text/PDF content). \
For images attached to the current message you can often answer directly; use analyze_image for detailed inspection or older attachments.";
