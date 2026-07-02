use tauri::State;

use crate::config::AppState;
use crate::models::chat::{AttachmentKind, ChatAttachment};
use crate::services::transcribe_audio;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscribeVoiceBody {
    pub base64: String,
    pub mime_type: String,
}

#[tauri::command]
pub async fn transcribe_voice(
    state: State<'_, AppState>,
    body: TranscribeVoiceBody,
) -> Result<String, String> {
    let attachment = ChatAttachment {
        kind: AttachmentKind::Audio,
        mime_type: if body.mime_type.trim().is_empty() {
            "audio/webm".to_string()
        } else {
            body.mime_type
        },
        base64: body.base64,
        filename: Some("voice-input.webm".to_string()),
        text_content: None,
    };

    transcribe_audio(&state, &attachment, "")
        .await
        .map_err(|e| e.to_string())
}
