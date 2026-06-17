use crate::error::AppError;

const MAX_EXTRACTED_CHARS: usize = 4000;

pub fn extract_pdf_text(buffer: &[u8]) -> Result<String, AppError> {
    let text = pdf_extract::extract_text_from_mem(buffer).map_err(|e| {
        AppError::bad_request(format!(
            "Could not extract text from PDF. The file may be scanned or encrypted. ({e})"
        ))
    })?;

    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(AppError::bad_request(
            "PDF contains no extractable text (it may be image-only).",
        ));
    }

    Ok(trimmed.to_string())
}

pub fn pdf_text_preview(full: &str) -> String {
    if full.chars().count() > MAX_EXTRACTED_CHARS {
        format!(
            "{}…",
            full.chars().take(MAX_EXTRACTED_CHARS).collect::<String>()
        )
    } else {
        full.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preview_truncates_long_text() {
        let long = "a".repeat(5000);
        let preview = pdf_text_preview(&long);
        assert!(preview.ends_with('…'));
        assert!(preview.chars().count() <= 4001);
    }
}
