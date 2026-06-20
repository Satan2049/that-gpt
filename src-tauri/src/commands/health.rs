use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: String,
    pub service: String,
}

#[tauri::command]
pub fn health_check() -> HealthResponse {
    HealthResponse {
        status: "ok".to_string(),
        service: "thatgpt".to_string(),
    }
}

// Re-export chat/prompt commands from submodules via lib registration.
