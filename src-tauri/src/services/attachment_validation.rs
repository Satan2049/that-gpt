use base64::Engine;

use crate::error::AppError;
use crate::models::{
    AttachmentEntry, AttachmentKind, ChatAttachment, ChatImageAttachment, ImageEntry, ImageMimeType,
};

const MAX_ATTACHMENTS: usize = 4;
const MAX_BINARY_BYTES: usize = 5 * 1024 * 1024;
const MAX_TEXT_BYTES: usize = 512 * 1024;
const MAX_TEXT_INLINE_CHARS: usize = 4000;

const MAX_PDF_BYTES: usize = 5 * 1024 * 1024;

const PDF_MIMES: &[&str] = &["application/pdf"];

const DOCX_MIMES: &[&str] = &[
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const TEXT_MIMES: &[&str] = &[
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "application/json",
    "application/xml",
    "text/xml",
];

const AUDIO_MIMES: &[&str] = &[
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
];

pub fn validate_attachments(
    attachments: Option<Vec<AttachmentEntry>>,
    legacy_images: Option<Vec<ImageEntry>>,
    pdf_preview_char_limit: usize,
) -> Result<Vec<ChatAttachment>, AppError> {
    let mut entries: Vec<AttachmentEntry> = attachments.unwrap_or_default();
    if let Some(images) = legacy_images {
        for img in images {
            entries.push(AttachmentEntry {
                mime_type: img.mime_type,
                base64: img.base64,
                filename: None,
            });
        }
    }

    if entries.is_empty() {
        return Ok(Vec::new());
    }

    if entries.len() > MAX_ATTACHMENTS {
        return Err(AppError::bad_request(format!(
            "At most {MAX_ATTACHMENTS} attachments per message"
        )));
    }

    let mut out = Vec::with_capacity(entries.len());
    for entry in entries {
        out.push(validate_one(entry, pdf_preview_char_limit)?);
    }
    Ok(out)
}

fn validate_one(entry: AttachmentEntry, pdf_preview_char_limit: usize) -> Result<ChatAttachment, AppError> {
    let mime = entry.mime_type.trim().to_lowercase();
    let cleaned: String = entry
        .base64
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect();

    if cleaned.is_empty() {
        return Err(AppError::bad_request("Empty attachment payload"));
    }

    let buffer = base64::engine::general_purpose::STANDARD
        .decode(&cleaned)
        .map_err(|_| AppError::bad_request("Invalid base64 attachment data"))?;

    if buffer.is_empty() {
        return Err(AppError::bad_request("Decoded attachment is empty"));
    }

    let filename = entry
        .filename
        .map(|f| f.trim().to_string())
        .filter(|f| !f.is_empty());

    if ImageMimeType::from_str(&mime).is_some() {
        if buffer.len() > MAX_BINARY_BYTES {
            return Err(AppError::bad_request(format!(
                "Each image must be at most {}MB",
                MAX_BINARY_BYTES / (1024 * 1024)
            )));
        }
        return Ok(ChatAttachment {
            kind: AttachmentKind::Image,
            mime_type: mime,
            base64: cleaned,
            filename,
            text_content: None,
        });
    }

    if AUDIO_MIMES.contains(&mime.as_str()) {
        if buffer.len() > MAX_BINARY_BYTES {
            return Err(AppError::bad_request(format!(
                "Each audio file must be at most {}MB",
                MAX_BINARY_BYTES / (1024 * 1024)
            )));
        }
        return Ok(ChatAttachment {
            kind: AttachmentKind::Audio,
            mime_type: mime,
            base64: cleaned,
            filename,
            text_content: None,
        });
    }

    if PDF_MIMES.contains(&mime.as_str()) {
        if buffer.len() > MAX_PDF_BYTES {
            return Err(AppError::bad_request(format!(
                "Each PDF must be at most {}MB",
                MAX_PDF_BYTES / (1024 * 1024)
            )));
        }
        let full_text = super::pdf_text::extract_pdf_text(&buffer)?;
        let preview = super::pdf_text::pdf_text_preview(&full_text, pdf_preview_char_limit);
        return Ok(ChatAttachment {
            kind: AttachmentKind::Pdf,
            mime_type: mime,
            base64: cleaned,
            filename,
            text_content: Some(preview),
        });
    }

    if DOCX_MIMES.contains(&mime.as_str()) {
        if buffer.len() > MAX_PDF_BYTES {
            return Err(AppError::bad_request(format!(
                "Each DOCX must be at most {}MB",
                MAX_PDF_BYTES / (1024 * 1024)
            )));
        }
        let full_text = super::docx_text::extract_docx_text(&buffer)?;
        let preview = super::pdf_text::pdf_text_preview(&full_text, pdf_preview_char_limit);
        return Ok(ChatAttachment {
            kind: AttachmentKind::Text,
            mime_type: mime,
            base64: cleaned,
            filename,
            text_content: Some(preview),
        });
    }

    if TEXT_MIMES.contains(&mime.as_str()) || mime.starts_with("text/") {
        if buffer.len() > MAX_TEXT_BYTES {
            return Err(AppError::bad_request(
                "Text files must be at most 512KB",
            ));
        }
        let text = String::from_utf8(buffer)
            .map_err(|_| AppError::bad_request("Text file must be valid UTF-8"))?;
        let preview = if text.chars().count() > MAX_TEXT_INLINE_CHARS {
            format!(
                "{}…",
                text.chars().take(MAX_TEXT_INLINE_CHARS).collect::<String>()
            )
        } else {
            text.clone()
        };
        return Ok(ChatAttachment {
            kind: AttachmentKind::Text,
            mime_type: mime,
            base64: cleaned,
            filename,
            text_content: Some(preview),
        });
    }

    Err(AppError::bad_request(
        "Unsupported file type. Allowed: images (JPEG, PNG, WebP, GIF), audio (MP3, WAV, WebM, OGG, M4A), text (TXT, MD, CSV, JSON, HTML, XML), PDF, DOCX",
    ))
}

pub fn attachments_to_legacy_images(
    attachments: &[ChatAttachment],
) -> Option<Vec<ChatImageAttachment>> {
    let images: Vec<ChatImageAttachment> = attachments
        .iter()
        .filter_map(|a| {
            if a.kind != AttachmentKind::Image {
                return None;
            }
            let mime = ImageMimeType::from_str(&a.mime_type)?;
            Some(ChatImageAttachment {
                mime_type: mime,
                base64: a.base64.clone(),
            })
        })
        .collect();
    if images.is_empty() {
        None
    } else {
        Some(images)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_text_file() {
        let base64 = base64::engine::general_purpose::STANDARD.encode(b"hello world");
        let result = validate_attachments(
            Some(vec![AttachmentEntry {
                mime_type: "text/plain".to_string(),
                base64: base64.clone(),
                filename: Some("test.txt".to_string()),
            }]),
            None,
            4000,
        )
        .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].kind, AttachmentKind::Text);
        assert_eq!(result[0].text_content.as_deref(), Some("hello world"));
    }

    #[test]
    fn merges_legacy_images() {
        let base64 = base64::engine::general_purpose::STANDARD.encode(b"img");
        let result = validate_attachments(
            None,
            Some(vec![ImageEntry {
                mime_type: "image/png".to_string(),
                base64,
            }]),
            4000,
        )
        .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].kind, AttachmentKind::Image);
    }
}
