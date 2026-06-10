// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

use chat_nest_lib::config::init_state;

fn main() {
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
            chat_nest_lib::commands::health::health_check,
            chat_nest_lib::commands::chat::list_conversations,
            chat_nest_lib::commands::chat::get_conversation,
            chat_nest_lib::commands::chat::create_conversation,
            chat_nest_lib::commands::chat::update_conversation,
            chat_nest_lib::commands::chat::delete_conversation,
            chat_nest_lib::commands::chat::send_message,
            chat_nest_lib::commands::chat::export_conversation,
            chat_nest_lib::commands::prompt::list_prompts,
            chat_nest_lib::commands::prompt::get_prompt,
            chat_nest_lib::commands::prompt::create_prompt,
            chat_nest_lib::commands::prompt::update_prompt,
            chat_nest_lib::commands::prompt::delete_prompt,
            chat_nest_lib::commands::settings::get_settings,
            chat_nest_lib::commands::settings::update_settings,
            chat_nest_lib::commands::settings::list_models,
            chat_nest_lib::commands::settings::test_api_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
