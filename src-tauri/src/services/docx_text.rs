use std::io::Read;

use crate::error::AppError;

pub fn extract_docx_text(buffer: &[u8]) -> Result<String, AppError> {
    let cursor = std::io::Cursor::new(buffer);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| {
        AppError::bad_request(format!(
            "Could not read DOCX archive. The file may be corrupt. ({e})"
        ))
    })?;

    let mut file = archive.by_name("word/document.xml").map_err(|_| {
        AppError::bad_request("DOCX is missing word/document.xml — not a valid Word document.")
    })?;

    let mut xml = String::new();
    file.read_to_string(&mut xml).map_err(|e| {
        AppError::bad_request(format!("Could not read DOCX document body: {e}"))
    })?;

    let text = xml_to_plain_text(&xml);
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(AppError::bad_request(
            "DOCX contains no extractable text.",
        ));
    }

    Ok(trimmed.to_string())
}

fn xml_to_plain_text(xml: &str) -> String {
    let mut out = String::new();
    let mut in_tag = false;
    let mut tag_buf = String::new();

    for ch in xml.chars() {
        if ch == '<' {
            in_tag = true;
            tag_buf.clear();
            continue;
        }
        if in_tag {
            if ch == '>' {
                in_tag = false;
                let tag = tag_buf.trim().to_lowercase();
                if tag.starts_with("w:p") || tag.starts_with("/w:p") || tag == "w:br" || tag == "w:tab" {
                    if !out.ends_with('\n') && !out.is_empty() {
                        out.push('\n');
                    }
                }
            } else {
                tag_buf.push(ch);
            }
            continue;
        }
        out.push(ch);
    }

    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_xml_tags() {
        let xml = r#"<w:p><w:r><w:t>Hello</w:t></w:r><w:r><w:t> world</w:t></w:r></w:p>"#;
        assert_eq!(xml_to_plain_text(xml), "Hello world");
    }
}
