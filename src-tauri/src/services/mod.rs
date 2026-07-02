mod ai;
mod attachment_validation;
mod chat;
mod docx_text;
mod embeddings;
mod export;
mod folder;
mod image_gen;
mod image_validation;
mod knowledge;
mod library;
mod model_catalog;
pub mod model_prices;
mod pdf_text;
mod provider;
mod prompt;
mod secrets;
mod templates;
mod tools;
pub mod update_check;
mod usage_log;
mod version_compare;
mod web_search;

pub use ai::{
    create_chat_completion, create_chat_completion_non_stream, create_chat_completion_stream,
    list_models, test_api_connection, transcribe_audio,
};
pub use chat::ChatService;
pub use export::{export_conversation, ExportFormat};
pub use folder::FolderService;
pub use knowledge::KnowledgeService;
pub use library::LibraryService;
pub use prompt::PromptService;
pub use model_prices::{ModelPrice, ModelPriceService};
pub use update_check::check_latest_release;
pub use secrets::{delete_secret, get_secret, provider_key, set_secret};
pub use provider::ProviderService;
pub use templates::{ConversationTemplate, SaveTemplateBody, TemplateService};
pub use usage_log::{UsageDaySummary, UsageLogService};
