pub mod config;
pub mod commands;
pub mod error;
pub mod models;
pub mod repository;
pub mod services;

use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;

use crate::config::init_state;

const LEGACY_APP_IDS: &[&str] = &["com.chatnest.desktop"];

fn dir_has_user_data(dir: &Path) -> bool {
    dir.join(".env").exists()
        || dir.join("data").join("chats").exists()
        || dir.join("data").join("prompts").exists()
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else if file_type.is_file() {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn migrate_legacy_app_data(app_data_dir: &Path) {
    if dir_has_user_data(app_data_dir) {
        return;
    }

    let Some(parent) = app_data_dir.parent() else {
        return;
    };

    for legacy_id in LEGACY_APP_IDS {
        let legacy_dir = parent.join(legacy_id);
        if !dir_has_user_data(&legacy_dir) {
            continue;
        }

        if copy_dir_all(&legacy_dir, app_data_dir).is_ok() {
            eprintln!(
                "ThatGPT: migrated data from {} to {}",
                legacy_dir.display(),
                app_data_dir.display()
            );
        }
        break;
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir: PathBuf = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data directory");

            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");
            migrate_legacy_app_data(&app_data_dir);

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
