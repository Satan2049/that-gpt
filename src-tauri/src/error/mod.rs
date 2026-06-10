use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    AiProvider(String),

    #[error("{0}")]
    Internal(String),
}

impl AppError {
    pub fn bad_request(msg: impl Into<String>) -> Self {
        Self::BadRequest(msg.into())
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    pub fn ai_provider(msg: impl Into<String>) -> Self {
        Self::AiProvider(msg.into())
    }
}

impl From<AppError> for String {
    fn from(value: AppError) -> String {
        value.to_string()
    }
}
