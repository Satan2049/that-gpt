use crate::error::AppError;
use crate::models::api::UpdateCheckResult;
use crate::services::version_compare;

const REPO: &str = "Satan2049/that-gpt";

pub async fn check_latest_release() -> Result<UpdateCheckResult, AppError> {
    let url = format!("https://api.github.com/repos/{REPO}/releases/latest");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
        .user_agent("ThatGPT-UpdateCheck")
        .build()
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Update check failed: {e}")))?;

    if !response.status().is_success() {
        return Ok(UpdateCheckResult {
            update_available: false,
            latest_version: None,
            release_url: None,
            message: "Could not reach GitHub releases.".to_string(),
        });
    }

    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let latest = payload["tag_name"]
        .as_str()
        .unwrap_or("")
        .trim_start_matches('v')
        .to_string();
    let current = env!("CARGO_PKG_VERSION");
    let update_available = !latest.is_empty() && version_compare::is_newer_version(&latest, current);
    let release_url = payload["html_url"].as_str().map(str::to_string);
    let message = if update_available {
        format!("Version {latest} is available (you have {current}).")
    } else {
        format!("You're on the latest version ({current}).")
    };

    Ok(UpdateCheckResult {
        update_available,
        latest_version: if latest.is_empty() {
            None
        } else {
            Some(latest)
        },
        release_url,
        message,
    })
}
