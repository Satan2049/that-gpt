pub mod config;
pub mod commands;
pub mod error;
pub mod models;
pub mod repository;
pub mod services;

use tauri::Manager;

use crate::config::init_state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");

            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");

            let state = init_state(app_data_dir);
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health::health_check,
            commands::chat::list_conversations,
            commands::chat::get_conversation,
            commands::chat::create_conversation,
            commands::chat::update_conversation,
            commands::chat::delete_conversation,
            commands::chat::send_message,
            commands::chat::regenerate_last_response,
            commands::chat::search_conversations,
            commands::chat::cancel_generation,
            commands::chat::export_conversation,
            commands::prompt::list_prompts,
            commands::prompt::get_prompt,
            commands::prompt::create_prompt,
            commands::prompt::update_prompt,
            commands::prompt::delete_prompt,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::list_models,
            commands::settings::test_api_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
