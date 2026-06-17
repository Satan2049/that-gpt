use serde_json::{json, Value};
use tauri::AppHandle;
use tauri::Emitter;

use crate::config::AppState;
use crate::error::AppError;
use crate::models::ai::{user_content_for_api, ChatCompletionMessage, ToolCall};
use crate::models::api::{ChatToolCallPayload, ChatToolResultPayload};
use crate::models::{AttachmentKind, ChatAttachment, ChatMessage, Conversation, MessageRole};

pub const MAX_TOOL_ROUNDS: usize = 8;

pub fn tool_definitions() -> Vec<Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "analyze_image",
                "description": "Analyze an image attachment using the vision/image model. Use for detailed visual inspection, OCR, or when the main model cannot see images.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message_id": {
                            "type": "string",
                            "description": "ID of the user message containing the image. Omit to use the latest user message."
                        },
                        "attachment_index": {
                            "type": "integer",
                            "description": "0-based index of the image among image attachments in that message"
                        },
                        "prompt": {
                            "type": "string",
                            "description": "What to analyze or questions about the image"
                        }
                    },
                    "required": ["attachment_index", "prompt"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "analyze_audio",
                "description": "Transcribe and analyze an audio attachment using the audio model.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message_id": {
                            "type": "string",
                            "description": "ID of the user message containing the audio. Omit to use the latest user message."
                        },
                        "attachment_index": {
                            "type": "integer",
                            "description": "0-based index of the audio among audio attachments in that message"
                        },
                        "prompt": {
                            "type": "string",
                            "description": "Optional focus for analysis after transcription"
                        }
                    },
                    "required": ["attachment_index"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "read_attachment",
                "description": "Read the full text content of a text or PDF file attachment.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "message_id": {
                            "type": "string",
                            "description": "ID of the user message containing the file. Omit to use the latest user message."
                        },
                        "attachment_index": {
                            "type": "integer",
                            "description": "0-based index among text/PDF attachments in that message"
                        }
                    },
                    "required": ["attachment_index"]
                }
            }
        }),
    ]
}

pub async fn execute_tool_calls(
    state: &AppState,
    app: &AppHandle,
    conversation_id: &str,
    conversation: &Conversation,
    calls: &[ToolCall],
) -> Result<Vec<ChatMessage>, AppError> {
    let mut results = Vec::new();
    let now_base = chrono::Utc::now();

    for (idx, call) in calls.iter().enumerate() {
        let _ = app.emit(
            "chat-tool-call",
            ChatToolCallPayload {
                conversation_id: conversation_id.to_string(),
                tool_call_id: call.id.clone(),
                name: call.function.name.clone(),
                arguments: call.function.arguments.clone(),
            },
        );

        let result = match call.function.name.as_str() {
            "analyze_image" => {
                execute_analyze_image(state, conversation, &call.function.arguments).await
            }
            "analyze_audio" => {
                execute_analyze_audio(state, conversation, &call.function.arguments).await
            }
            "read_attachment" => execute_read_attachment(conversation, &call.function.arguments),
            other => Err(AppError::bad_request(format!("Unknown tool: {other}"))),
        };

        let content = match result {
            Ok(text) => text,
            Err(err) => format!("Error: {err}"),
        };

        let _ = app.emit(
            "chat-tool-result",
            ChatToolResultPayload {
                conversation_id: conversation_id.to_string(),
                tool_call_id: call.id.clone(),
                name: call.function.name.clone(),
                content: content.clone(),
            },
        );

        let created_at = now_base
            .checked_add_signed(chrono::Duration::milliseconds(idx as i64))
            .unwrap_or(now_base)
            .to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

        results.push(ChatMessage {
            id: uuid::Uuid::new_v4().to_string(),
            conversation_id: conversation_id.to_string(),
            role: MessageRole::Tool,
            content,
            created_at,
            images: None,
            attachments: None,
            tool_calls: None,
            tool_call_id: Some(call.id.clone()),
            tool_name: Some(call.function.name.clone()),
        });
    }

    Ok(results)
}

fn find_readable_attachment(
    conversation: &Conversation,
    message_id: Option<&str>,
    attachment_index: usize,
) -> Result<ChatAttachment, AppError> {
    let message = if let Some(mid) = message_id {
        conversation
            .messages
            .iter()
            .find(|m| m.id == mid)
            .ok_or_else(|| AppError::bad_request("Message not found"))?
    } else {
        conversation
            .messages
            .iter()
            .rev()
            .find(|m| m.role == MessageRole::User)
            .ok_or_else(|| AppError::bad_request("No user message found"))?
    };

    let matching: Vec<ChatAttachment> = message
        .all_attachments()
        .into_iter()
        .filter(|a| a.kind == AttachmentKind::Text || a.kind == AttachmentKind::Pdf)
        .collect();

    matching
        .get(attachment_index)
        .cloned()
        .ok_or_else(|| AppError::bad_request("Attachment index out of range"))
}

fn find_attachment(
    conversation: &Conversation,
    message_id: Option<&str>,
    attachment_index: usize,
    kind: AttachmentKind,
) -> Result<ChatAttachment, AppError> {
    let message = if let Some(mid) = message_id {
        conversation
            .messages
            .iter()
            .find(|m| m.id == mid)
            .ok_or_else(|| AppError::bad_request("Message not found"))?
    } else {
        conversation
            .messages
            .iter()
            .rev()
            .find(|m| m.role == MessageRole::User)
            .ok_or_else(|| AppError::bad_request("No user message found"))?
    };

    let matching: Vec<ChatAttachment> = message
        .all_attachments()
        .into_iter()
        .filter(|a| a.kind == kind)
        .collect();

    matching
        .get(attachment_index)
        .cloned()
        .ok_or_else(|| AppError::bad_request("Attachment index out of range"))
}

async fn execute_analyze_image(
    state: &AppState,
    conversation: &Conversation,
    arguments_json: &str,
) -> Result<String, AppError> {
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|_| AppError::bad_request("Invalid analyze_image arguments"))?;

    let attachment_index = args
        .get("attachment_index")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| AppError::bad_request("attachment_index is required"))?
        as usize;
    let prompt = args
        .get("prompt")
        .and_then(|v| v.as_str())
        .unwrap_or("Describe this image in detail.");
    let message_id = args.get("message_id").and_then(|v| v.as_str());

    let attachment =
        find_attachment(conversation, message_id, attachment_index, AttachmentKind::Image)?;

    let config = state.snapshot_config();
    let model = {
        let image_model = config.ai_image_model.trim();
        if !image_model.is_empty() {
            image_model.to_string()
        } else {
            config.ai_model.clone()
        }
    };

    let user_content = user_content_for_api(prompt, None, Some(std::slice::from_ref(&attachment)));
    let messages = vec![ChatCompletionMessage {
        role: "user".to_string(),
        content: Some(user_content),
        tool_calls: None,
        tool_call_id: None,
        name: None,
    }];

    super::ai::create_chat_completion_non_stream(
        state,
        messages,
        Some(model.as_str()),
        Some(0.4),
        Some(2048),
        None,
        None,
    )
    .await
    .map(|r| r.content)
}

async fn execute_analyze_audio(
    state: &AppState,
    conversation: &Conversation,
    arguments_json: &str,
) -> Result<String, AppError> {
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|_| AppError::bad_request("Invalid analyze_audio arguments"))?;

    let attachment_index = args
        .get("attachment_index")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| AppError::bad_request("attachment_index is required"))?
        as usize;
    let prompt = args
        .get("prompt")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let message_id = args.get("message_id").and_then(|v| v.as_str());

    let attachment =
        find_attachment(conversation, message_id, attachment_index, AttachmentKind::Audio)?;

    super::ai::transcribe_audio(state, &attachment, prompt).await
}

fn execute_read_attachment(
    conversation: &Conversation,
    arguments_json: &str,
) -> Result<String, AppError> {
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|_| AppError::bad_request("Invalid read_attachment arguments"))?;

    let attachment_index = args
        .get("attachment_index")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| AppError::bad_request("attachment_index is required"))?
        as usize;
    let message_id = args.get("message_id").and_then(|v| v.as_str());

    let attachment = find_readable_attachment(
        conversation,
        message_id,
        attachment_index,
    )?;

    match attachment.kind {
        AttachmentKind::Text => {
            let buffer = base64::Engine::decode(
                &base64::engine::general_purpose::STANDARD,
                &attachment.base64,
            )
            .map_err(|_| AppError::bad_request("Could not decode attachment"))?;
            let text = String::from_utf8(buffer)
                .map_err(|_| AppError::bad_request("Attachment is not valid UTF-8 text"))?;
            let label = attachment.filename.as_deref().unwrap_or("file");
            Ok(format!("--- {label} ---\n{text}"))
        }
        AttachmentKind::Pdf => {
            let buffer = base64::Engine::decode(
                &base64::engine::general_purpose::STANDARD,
                &attachment.base64,
            )
            .map_err(|_| AppError::bad_request("Could not decode PDF"))?;
            let text = super::pdf_text::extract_pdf_text(&buffer)?;
            let label = attachment.filename.as_deref().unwrap_or("document.pdf");
            Ok(format!("--- {label} ---\n{text}"))
        }
        _ => Err(AppError::bad_request("Attachment is not readable text or PDF")),
    }
}
