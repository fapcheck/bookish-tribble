#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, WindowEvent, State};
use std::sync::Mutex;
// use std::path::PathBuf;

mod database;
mod models;

use database::AppDatabase;
use models::{Task, NewTask, Project, UserStats, AppSettings, Status};

struct AppState {
    db: Mutex<AppDatabase>,
}

// --- PROJECT COMMANDS ---

#[tauri::command]
async fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_projects().map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_project(
    state: State<'_, AppState>, 
    name: String, 
    color: String
) -> Result<Project, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let id = uuid::Uuid::new_v4().to_string();
    db.add_project(id, name, color).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_project(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_project(&id).map_err(|e| e.to_string())
}

// --- TASK COMMANDS ---

#[tauri::command]
async fn get_tasks(
    state: State<'_, AppState>, 
    limit: Option<i32>, 
    status_filter: Option<i32>,
    project_filter: Option<String>
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let status_enum = status_filter.map(|s| Status::from_int(s));
    
    db.get_tasks(limit, status_enum, project_filter)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_task(state: State<'_, AppState>, new_task: NewTask) -> Result<Task, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.add_task(&new_task).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_status(
    state: State<'_, AppState>, 
    task_id: String, 
    new_status: String
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let status_enum = match new_status.as_str() {
        "todo" => Status::Todo,
        "doing" => Status::Doing,
        "done" => Status::Done,
        _ => Status::Todo,
    };
    db.update_task_status(&task_id, status_enum)
        .map_err(|e| e.to_string())
}

// Исправленная функция: было 'async fnQA_delete_task', стало правильно 'async fn delete_task'
#[tauri::command]
async fn delete_task(state: State<'_, AppState>, task_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_task(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_stats(state: State<'_, AppState>) -> Result<UserStats, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_stats().map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_settings() -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
async fn save_settings(_settings: AppSettings) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
async fn start_focus_session(task_id: String) -> Result<String, String> {
    Ok(format!("session_for_{}", task_id))
}

#[tauri::command]
async fn complete_focus_session(_session_id: String, _duration_minutes: i32) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
async fn toggle_window(window: tauri::Window) {
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
async fn minimize_window(window: tauri::Window) {
    let _ = window.minimize();
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
            let db = AppDatabase::new(app_dir).expect("failed to initialize database");
            
            app.manage(AppState {
                db: Mutex::new(db),
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_tasks,
            add_task,
            update_task_status,
            delete_task,
            get_stats,
            get_settings,
            save_settings,
            get_projects,
            add_project,
            delete_project,
            start_focus_session,
            complete_focus_session,
            toggle_window,
            minimize_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}