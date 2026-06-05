mod commands;
mod tools;

use commands::{build_registry, AppState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            registry: build_registry(),
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_tools,
            commands::run_tool,
            commands::list_files_in_dir,
            commands::list_docx_in_dir,
            commands::path_exists,
            commands::typeset_read_text_file,
            commands::typeset_write_text_file,
            commands::format_docx_batch,
            commands::format_docx_text,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
