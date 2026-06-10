use crate::error::AppError;
use crate::models::{ChatImageAttachment, ImageEntry, ImageMimeType};

const MAX_IMAGES: usize = 4;
const MAX_BYTES_PER_IMAGE: usize = 5 * 1024 * 1024;

pub fn validate_images(input: Option<Vec<ImageEntry>>) -> Result<Vec<ChatImageAttachment>, AppError> {
    let Some(input) = input else {
        return Ok(Vec::new());
    };

    if input.is_empty() {
        return Ok(Vec::new());
    }

    if input.len() > MAX_IMAGES {
        return Err(AppError::bad_request(format!(
            "At most {MAX_IMAGES} images per message"
        )));
    }

    let mut out = Vec::with_capacity(input.len());

    for entry in input {
        let mime = ImageMimeType::from_str(&entry.mime_type).ok_or_else(|| {
            AppError::bad_request(
                "Invalid image type. Allowed: image/jpeg, image/png, image/webp",
            )
        })?;

        let cleaned: String = entry.base64.chars().filter(|c| !c.is_whitespace()).collect();
        if cleaned.is_empty() {
            return Err(AppError::bad_request("Empty image payload"));
        }

        let buffer = base64::Engine::decode(
            &base64::engine::general_purpose::STANDARD,
            &cleaned,
        )
        .map_err(|_| AppError::bad_request("Invalid base64 image data"))?;

        if buffer.len() > MAX_BYTES_PER_IMAGE {
            return Err(AppError::bad_request(format!(
                "Each image must be at most {}MB",
                MAX_BYTES_PER_IMAGE / (1024 * 1024)
            )));
        }

        if buffer.is_empty() {
            return Err(AppError::bad_request("Decoded image is empty"));
        }

        out.push(ChatImageAttachment {
            mime_type: mime,
            base64: cleaned,
        });
    }

    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_valid_png() {
        let base64 = base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            b"hello",
        );
        let result = validate_images(Some(vec![ImageEntry {
            mime_type: "image/png".to_string(),
            base64: base64.clone(),
        }]))
        .unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].base64, base64);
    }

    #[test]
    fn rejects_too_many_images() {
        let entry = ImageEntry {
            mime_type: "image/png".to_string(),
            base64: base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD,
                b"x",
            ),
        };
        let images: Vec<ImageEntry> = (0..5).map(|_| entry.clone()).collect();
        assert!(validate_images(Some(images)).is_err());
    }
}
