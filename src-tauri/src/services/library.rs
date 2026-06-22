use crate::config::AppState;
use crate::error::AppError;
use crate::models::library::{AttachmentIndexItem, AttachmentIndexResult, LibraryFilter};
use crate::models::{AttachmentKind, Conversation};
use crate::repository::ChatRepository;

pub struct LibraryService;

impl LibraryService {
    pub async fn index_attachments(
        state: &AppState,
        filter: LibraryFilter,
    ) -> Result<AttachmentIndexResult, AppError> {
        let conversations = ChatRepository::list_all(&state.chats_dir())
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let mut items = Vec::new();

        for conversation in conversations {
            collect_from_conversation(&conversation, &mut items);
        }

        items.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));

        let filtered: Vec<AttachmentIndexItem> = items
            .into_iter()
            .filter(|item| matches_filter(filter, &item.kind))
            .collect();

        let total = filtered.len();
        Ok(AttachmentIndexResult {
            items: filtered,
            total,
        })
    }
}

fn matches_filter(filter: LibraryFilter, kind: &str) -> bool {
    match filter {
        LibraryFilter::All => true,
        LibraryFilter::Images => kind == "image",
        LibraryFilter::Files => kind != "image",
    }
}

fn collect_from_conversation(conversation: &Conversation, out: &mut Vec<AttachmentIndexItem>) {
    for message in &conversation.messages {
        for (idx, attachment) in message.all_attachments().into_iter().enumerate() {
            let kind = attachment_kind_label(attachment.kind);
            let size_bytes = base64_decoded_len(&attachment.base64);
            let filename = attachment.filename.clone().or_else(|| {
                if attachment.kind == AttachmentKind::Image {
                    Some(format!("image-{}.{}", idx + 1, image_ext(&attachment.mime_type)))
                } else {
                    None
                }
            });

            out.push(AttachmentIndexItem {
                id: format!("{}:{}:{idx}", conversation.id, message.id),
                conversation_id: conversation.id.clone(),
                conversation_title: conversation.title.clone(),
                message_id: message.id.clone(),
                filename,
                mime_type: attachment.mime_type.clone(),
                kind: kind.to_string(),
                size_bytes,
                modified_at: message.created_at.clone(),
            });
        }
    }
}

fn attachment_kind_label(kind: AttachmentKind) -> &'static str {
    match kind {
        AttachmentKind::Image => "image",
        AttachmentKind::Audio => "audio",
        AttachmentKind::Text => "text",
        AttachmentKind::Pdf => "pdf",
    }
}

fn image_ext(mime: &str) -> &'static str {
    match mime {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "jpg",
    }
}

fn base64_decoded_len(encoded: &str) -> usize {
    let cleaned: String = encoded.chars().filter(|c| !c.is_whitespace()).collect();
    if cleaned.is_empty() {
        return 0;
    }
    let padding = cleaned.chars().rev().take_while(|c| *c == '=').count();
    cleaned.len().saturating_mul(3) / 4 - padding
}
