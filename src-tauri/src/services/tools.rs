use serde_json::{json, Value};
use tauri::AppHandle;
use tauri::Emitter;

use crate::config::AppState;
use crate::error::AppError;
use crate::models::ai::{user_content_for_api, ChatCompletionMessage, ToolCall};
use crate::models::api::{ChatGeneratedImagePayload, ChatToolCallPayload, ChatToolResultPayload};
use crate::models::chat::ChatImageAttachment;
use crate::models::{AttachmentKind, ChatAttachment, ChatMessage, Conversation, MessageRole};

pub struct ToolExecutionOutcome {
    pub messages: Vec<ChatMessage>,
    pub generated_images: Vec<ChatImageAttachment>,
}

pub const MAX_TOOL_ROUNDS: usize = 8;

pub fn tool_definitions(state: &AppState) -> Vec<Value> {
    let config = state.snapshot_config();
    let mut defs = vec![
        json!({
            "type": "function",
            "function": {
                "name": "analyze_image",
                "description": "Analyze an image attachment using a vision model. Use for detailed visual inspection, OCR, or when the main model cannot see images.",
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
    ];

    if config.web_search_enabled {
        defs.push(json!({
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Search the public web for current information, news, documentation, or facts not in the conversation. Use when the user asks about recent events or external facts.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Concise web search query"
                        }
                    },
                    "required": ["query"]
                }
            }
        }));
    }

    if config.knowledge_base_enabled {
        defs.push(json!({
            "type": "function",
            "function": {
                "name": "search_knowledge_base",
                "description": "Search the user's local indexed knowledge base (project docs, PDFs, notes). Use for questions about their files or workspace content.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "What to look up in the knowledge base"
                        },
                        "top_k": {
                            "type": "integer",
                            "description": "Number of excerpts to return (1-8, default 3)"
                        }
                    },
                    "required": ["query"]
                }
            }
        }));
    }

    if !config.ai_image_model.trim().is_empty() {
        defs.push(json!({
            "type": "function",
            "function": {
                "name": "generate_image",
                "description": "Create a new image from a text description using the configured image generation model (e.g. gpt-image-1, DALL·E, Flux). Use when the user asks you to draw, design, illustrate, or generate an image.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "Detailed description of the image to generate"
                        },
                        "size": {
                            "type": "string",
                            "description": "Optional size: 1024x1024, 1792x1024, or 1024x1792",
                            "enum": ["1024x1024", "1792x1024", "1024x1792"]
                        }
                    },
                    "required": ["prompt"]
                }
            }
        }));
    }

    defs
}

pub async fn execute_tool_calls(
    state: &AppState,
    app: &AppHandle,
    conversation_id: &str,
    assistant_message_id: &str,
    conversation: &Conversation,
    calls: &[ToolCall],
) -> Result<ToolExecutionOutcome, AppError> {
    let mut results = Vec::new();
    let mut generated_images = Vec::new();
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
            "analyze_audio" => execute_analyze_audio(state, conversation, &call.function.arguments)
                .await
                .map(ToolCallOutput::Text),
            "read_attachment" => execute_read_attachment(conversation, &call.function.arguments)
                .map(ToolCallOutput::Text),
            "web_search" => execute_web_search(&call.function.arguments)
                .await
                .map(ToolCallOutput::Text),
            "search_knowledge_base" => execute_search_knowledge(state, &call.function.arguments)
                .await
                .map(ToolCallOutput::Text),
            "generate_image" => {
                execute_generate_image(state, &call.function.arguments).await
            }
            other => Err(AppError::bad_request(format!("Unknown tool: {other}"))),
        };

        let content = match &result {
            Ok(ToolCallOutput::Text(text)) => text.clone(),
            Ok(ToolCallOutput::GeneratedImage { image, summary }) => {
                generated_images.push(image.clone());
                let _ = app.emit(
                    "chat-generated-image",
                    ChatGeneratedImagePayload {
                        conversation_id: conversation_id.to_string(),
                        message_id: assistant_message_id.to_string(),
                        mime_type: image.mime_type.as_str().to_string(),
                        base64: image.base64.clone(),
                    },
                );
                summary.clone()
            }
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
            bookmarked: false,
            parent_id: None,
            branch_id: String::new(),
        });
    }

    Ok(ToolExecutionOutcome {
        messages: results,
        generated_images,
    })
}

enum ToolCallOutput {
    Text(String),
    GeneratedImage {
        image: ChatImageAttachment,
        summary: String,
    },
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
) -> Result<ToolCallOutput, AppError> {
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

    let model = resolve_vision_model(state, conversation);

    let user_content = user_content_for_api(prompt, None, Some(std::slice::from_ref(&attachment)));
    let messages = vec![ChatCompletionMessage {
        role: "user".to_string(),
        content: Some(user_content),
        tool_calls: None,
        tool_call_id: None,
        name: None,
    }];

    let content = super::ai::create_chat_completion_non_stream(
        state,
        messages,
        Some(model.as_str()),
        Some(0.4),
        Some(2048),
        None,
        None,
    )
    .await?
    .content;

    Ok(ToolCallOutput::Text(content))
}

fn resolve_vision_model(state: &AppState, conversation: &Conversation) -> String {
    let config = state.snapshot_config();
    if let Some(model) = conversation
        .last_model
        .as_deref()
        .map(str::trim)
        .filter(|m| !m.is_empty())
    {
        if super::model_catalog::model_supports_vision(model) {
            return model.to_string();
        }
    }
    if super::model_catalog::model_supports_vision(&config.ai_model) {
        return config.ai_model.clone();
    }
    config.ai_model.clone()
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

async fn execute_web_search(arguments_json: &str) -> Result<String, AppError> {
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|_| AppError::bad_request("Invalid web_search arguments"))?;
    let query = args
        .get("query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::bad_request("query is required"))?;
    super::web_search::search_web(query).await
}

async fn execute_search_knowledge(state: &AppState, arguments_json: &str) -> Result<String, AppError> {
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|_| AppError::bad_request("Invalid search_knowledge_base arguments"))?;
    let query = args
        .get("query")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::bad_request("query is required"))?;
    let top_k = args
        .get("top_k")
        .and_then(|v| v.as_u64())
        .unwrap_or(3) as usize;
    super::knowledge::KnowledgeService::search_tool(state, &state.data_dir, query, top_k).await
}

async fn execute_generate_image(
    state: &AppState,
    arguments_json: &str,
) -> Result<ToolCallOutput, AppError> {
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|_| AppError::bad_request("Invalid generate_image arguments"))?;
    let prompt = args
        .get("prompt")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::bad_request("prompt is required"))?;
    let size = args.get("size").and_then(|v| v.as_str());

    let image = super::image_gen::generate_image(state, prompt, size).await?;
    Ok(ToolCallOutput::GeneratedImage {
        image: image.clone(),
        summary: "Image generated successfully. It is attached to the assistant reply.".to_string(),
    })
}
