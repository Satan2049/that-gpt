use crate::error::AppError;

pub async fn search_web(query: &str) -> Result<String, AppError> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err(AppError::bad_request("Search query cannot be empty"));
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let response = client
        .get("https://api.duckduckgo.com/")
        .query(&[
            ("q", trimmed),
            ("format", "json"),
            ("no_redirect", "1"),
            ("skip_disambig", "1"),
        ])
        .send()
        .await
        .map_err(|e| AppError::ai_provider(format!("Web search failed: {e}")))?;

    if !response.status().is_success() {
        return Err(AppError::ai_provider(format!(
            "Web search HTTP {}",
            response.status()
        )));
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::ai_provider(format!("Invalid search response: {e}")))?;

    let mut out = String::new();
    if let Some(abstract_text) = payload["AbstractText"].as_str() {
        if !abstract_text.is_empty() {
            out.push_str("Summary: ");
            out.push_str(abstract_text);
            out.push('\n');
            if let Some(url) = payload["AbstractURL"].as_str() {
                if !url.is_empty() {
                    out.push_str("Source: ");
                    out.push_str(url);
                    out.push('\n');
                }
            }
        }
    }

    if let Some(topics) = payload["RelatedTopics"].as_array() {
        let mut count = 0usize;
        for topic in topics {
            if count >= 5 {
                break;
            }
            if let Some(text) = topic["Text"].as_str() {
                out.push_str(&format!("- {text}\n"));
                count += 1;
            } else if let Some(nested) = topic["Topics"].as_array() {
                for item in nested {
                    if count >= 5 {
                        break;
                    }
                    if let Some(text) = item["Text"].as_str() {
                        out.push_str(&format!("- {text}\n"));
                        count += 1;
                    }
                }
            }
        }
    }

    if out.trim().is_empty() {
        out.push_str("No web results found for this query. Try rephrasing.");
    }

    Ok(out.trim().to_string())
}
