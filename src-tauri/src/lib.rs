//! Library entrypoint for Tauri (main desktop entrypoint is `src-tauri/src/main.rs`).
//!
//! Keep this file minimal to avoid duplicating setup/invoke wiring in two places.
//! If you later target mobile, you can move shared builder setup into a common module.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}