use crate::error::AppError;
use crate::models::{Conversation, MessageRole};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportFormat {
    Json,
    Markdown,
    Html,
}

impl ExportFormat {
    pub fn parse(value: &str) -> Result<Self, AppError> {
        match value.trim().to_lowercase().as_str() {
            "json" => Ok(Self::Json),
            "markdown" | "md" => Ok(Self::Markdown),
            "html" => Ok(Self::Html),
            _ => Err(AppError::bad_request("format must be json, markdown, or html")),
        }
    }
}

pub fn export_conversation(conversation: &Conversation, format: ExportFormat) -> String {
    match format {
        ExportFormat::Json => serde_json::to_string_pretty(conversation).unwrap_or_default(),
        ExportFormat::Markdown => export_markdown(conversation),
        ExportFormat::Html => export_html(conversation),
    }
}

fn escape_html(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn export_html(conversation: &Conversation) -> String {
    let mut body = String::new();
    for message in &conversation.messages {
        if !matches!(
            message.role,
            MessageRole::User | MessageRole::Assistant | MessageRole::Tool
        ) {
            continue;
        }
        let role = match message.role {
            MessageRole::User => "User",
            MessageRole::Assistant => "Assistant",
            MessageRole::Tool => "Tool",
            MessageRole::System => "System",
        };
        body.push_str(&format!(
            r#"<article class="message message-{role_lower}">
  <header><strong>{role}</strong> <time>{time}</time></header>
  <div class="content"><pre>{content}</pre></div>
</article>
"#,
            role_lower = role.to_lowercase(),
            role = role,
            time = escape_html(&message.created_at),
            content = escape_html(&message.content)
        ));
    }

    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    body {{ font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }}
    .message {{ margin-bottom: 1.5rem; padding: 1rem; border-radius: 12px; border: 1px solid #ddd; }}
    .message-user {{ background: #f4f4f5; }}
    .message-assistant {{ background: #fff; }}
    .message-tool {{ background: #fafafa; font-size: 0.9rem; }}
    header {{ margin-bottom: 0.5rem; color: #666; font-size: 0.85rem; }}
    pre {{ white-space: pre-wrap; word-break: break-word; margin: 0; font: inherit; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  {body}
  <footer><p>Exported from ThatGPT</p></footer>
</body>
</html>"#,
        title = escape_html(&conversation.title),
        body = body
    )
}

fn export_markdown(conversation: &Conversation) -> String {
    let mut lines = vec![format!("# {}\n", conversation.title)];

    for message in &conversation.messages {
        if !matches!(
            message.role,
            MessageRole::User | MessageRole::Assistant | MessageRole::Tool
        ) {
            continue;
        }

        let role = match message.role {
            MessageRole::User => "User",
            MessageRole::Assistant => "Assistant",
            MessageRole::Tool => "Tool",
            MessageRole::System => "System",
        };

        lines.push(format!("## {role} — {}\n", message.created_at));

        if message.tool_name.is_some() {
            lines.push(format!(
                "*Tool: {}*\n",
                message.tool_name.as_deref().unwrap_or("unknown")
            ));
        }

        if message
            .images
            .as_ref()
            .is_some_and(|images| !images.is_empty())
            || message
                .attachments
                .as_ref()
                .is_some_and(|items| !items.is_empty())
        {
            let image_count = message.images.as_ref().map(|i| i.len()).unwrap_or(0);
            let att_count = message.attachments.as_ref().map(|i| i.len()).unwrap_or(0);
            let count = image_count + att_count;
            lines.push(format!("*({count} attachment(s) omitted from export)*\n"));
        }

        if !message.content.is_empty() {
            lines.push(message.content.clone());
            lines.push(String::new());
        }
    }

    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ChatMessage;
    use crate::models::Conversation;

    #[test]
    fn markdown_includes_title_and_roles() {
        let conversation = Conversation {
            id: "1".to_string(),
            title: "Test chat".to_string(),
            messages: vec![ChatMessage {
                id: "m1".to_string(),
                conversation_id: "1".to_string(),
                role: MessageRole::User,
                content: "Hello".to_string(),
                created_at: "2026-01-01T00:00:00.000Z".to_string(),
                images: None,
                attachments: None,
                tool_calls: None,
                tool_call_id: None,
                tool_name: None,
                bookmarked: false,
                parent_id: None,
                branch_id: String::new(),
            }],
            prompt_preset_id: None,
            created_at: "2026-01-01T00:00:00.000Z".to_string(),
            updated_at: "2026-01-01T00:00:00.000Z".to_string(),
            pinned: false,
            archived: false,
            folder_id: None,
            tags: Vec::new(),
            ephemeral: false,
            last_model: None,
            temperature_override: None,
            max_tokens_override: None,
            system_prompt_override: None,
            branch_picks: std::collections::HashMap::new(),
        };

        let md = export_conversation(&conversation, ExportFormat::Markdown);
        assert!(md.contains("# Test chat"));
        assert!(md.contains("## User"));
        assert!(md.contains("Hello"));
    }
}
