#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

<<<<<<< HEAD
use std::sync::Mutex;
use tauri::{Emitter, Manager, State, WindowEvent};
=======
use tauri::{Manager, WindowEvent, State};
use std::sync::Mutex;
>>>>>>> origin/main

mod database;
mod models;

use database::AppDatabase;
<<<<<<< HEAD
use models::{AppSettings, NewTask, Priority, Project, Status, Task, UserStats};
=======
use models::{Task, NewTask, Project, UserStats, AppSettings, Status, Priority};
>>>>>>> origin/main

struct AppState {
    db: Mutex<AppDatabase>,
}

<<<<<<< HEAD
#[derive(serde::Serialize, Clone)]
struct DataChanged {
    entity: &'static str,
    action: &'static str,
    id: Option<String>,
}

fn emit_data_changed(app: &tauri::AppHandle, entity: &'static str, action: &'static str, id: Option<String>) {
    let _ = app.emit("data:changed", DataChanged { entity, action, id });
}

#[derive(serde::Serialize, Clone)]
struct ReminderPayload {
    task_id: String,
    title: String,
    deadline: Option<i64>,
}

// --- DB HEALTH ---

#[derive(serde::Serialize)]
struct DbHealth {
    db_path: String,
    tables: Vec<String>,
    has_tasks: bool,
    has_projects: bool,
}

#[tauri::command]
async fn db_health(state: State<'_, AppState>) -> Result<DbHealth, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let conn = db.get_connection()?;

    let mut stmt = conn
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .map_err(|e| e.to_string())?;

    let iter = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut tables: Vec<String> = Vec::new();
    for t in iter {
        tables.push(t.map_err(|e| e.to_string())?);
    }

    let has_tasks = tables.iter().any(|t| t == "tasks");
    let has_projects = tables.iter().any(|t| t == "projects");

    Ok(DbHealth {
        db_path: db.db_path().display().to_string(),
        tables,
        has_tasks,
        has_projects,
    })
}

// --- COMPLETION SERIES (calendar heatmap) ---

#[derive(serde::Serialize)]
struct CompletionDay {
    day: String,
    count: i32,
}

#[tauri::command]
async fn get_completion_series(state: State<'_, AppState>, days: i32) -> Result<Vec<CompletionDay>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let rows = db.get_completion_series(days).map_err(|e| e.to_string())?;
    Ok(rows
        .into_iter()
        .map(|(day, count)| CompletionDay { day, count })
        .collect())
}

// --- SETTINGS ---

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_settings().map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_settings(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    settings: AppSettings,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.save_settings(settings).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "settings", "edit", None);
    Ok(())
}

// --- REMINDERS ---

#[tauri::command]
async fn set_task_remind_at(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    remind_at: Option<i64>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.set_task_remind_at(&id, remind_at).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn snooze_task_reminder(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    minutes: i64,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.snooze_task(&id, minutes).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

// --- PROJECTS ---
=======
// --- PROJECT COMMANDS ---
>>>>>>> origin/main

#[tauri::command]
async fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_projects().map_err(|e| e.to_string())
}

#[tauri::command]
<<<<<<< HEAD
async fn add_project(state: State<'_, AppState>, app: tauri::AppHandle, name: String, color: String, priority: String) -> Result<Project, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let id = uuid::Uuid::new_v4().to_string();

=======
async fn add_project(
    state: State<'_, AppState>, 
    name: String, 
    color: String,
    priority: String
) -> Result<Project, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let id = uuid::Uuid::new_v4().to_string();
    
>>>>>>> origin/main
    let priority_enum = match priority.as_str() {
        "high" => Priority::High,
        "low" => Priority::Low,
        _ => Priority::Normal,
    };

<<<<<<< HEAD
    let project = db.add_project(id.clone(), name, color, priority_enum).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "projects", "add", Some(id));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(project)
}

#[tauri::command]
async fn edit_project(state: State<'_, AppState>, app: tauri::AppHandle, id: String, name: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_project(&id, name).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "projects", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_project_priority(state: State<'_, AppState>, app: tauri::AppHandle, id: String, priority: String) -> Result<(), String> {
=======
    db.add_project(id, name, color, priority_enum).map_err(|e| e.to_string())
}

#[tauri::command]
async fn edit_project(state: State<'_, AppState>, id: String, name: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_project(&id, name).map_err(|e| e.to_string())
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
async fn edit_task_title(state: State<'_, AppState>, id: String, title: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_title(&id, title).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_priority(state: State<'_, AppState>, id: String, priority: String) -> Result<(), String> {
>>>>>>> origin/main
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let priority_enum = match priority.as_str() {
        "high" => Priority::High,
        "low" => Priority::Low,
        _ => Priority::Normal,
    };
<<<<<<< HEAD
    db.update_project_priority(&id, priority_enum).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "projects", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn delete_project(state: State<'_, AppState>, app: tauri::AppHandle, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_project(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "projects", "delete", Some(id));
    emit_data_changed(&app, "tasks", "refresh", None);
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- TASKS ---

#[tauri::command]
async fn get_tasks(state: State<'_, AppState>, limit: Option<i32>, status_filter: Option<i32>, project_filter: Option<String>) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let status_enum = status_filter.map(Status::from_int);
    db.get_tasks(limit, status_enum, project_filter).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_task(state: State<'_, AppState>, app: tauri::AppHandle, new_task: NewTask) -> Result<Task, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let task = db.add_task(&new_task).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "add", Some(task.id.clone()));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(task)
}

#[tauri::command]
async fn edit_task_title(state: State<'_, AppState>, app: tauri::AppHandle, id: String, title: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_title(&id, title).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_priority(state: State<'_, AppState>, app: tauri::AppHandle, id: String, priority: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let priority_enum = match priority.as_str() {
        "high" => Priority::High,
        "low" => Priority::Low,
        _ => Priority::Normal,
    };
    db.update_task_priority(&id, priority_enum).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_deadline(state: State<'_, AppState>, app: tauri::AppHandle, id: String, deadline: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_deadline(&id, deadline).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_status(state: State<'_, AppState>, app: tauri::AppHandle, task_id: String, new_status: String) -> Result<(), String> {
=======
    db.update_task_priority(&id, priority_enum).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_deadline(state: State<'_, AppState>, id: String, deadline: Option<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_deadline(&id, deadline).map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_task_status(
    state: State<'_, AppState>, 
    task_id: String, 
    new_status: String
) -> Result<(), String> {
>>>>>>> origin/main
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let status_enum = match new_status.as_str() {
        "todo" => Status::Todo,
        "doing" => Status::Doing,
        "done" => Status::Done,
        _ => Status::Todo,
    };
<<<<<<< HEAD
    db.update_task_status(&task_id, status_enum).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "status", Some(task_id));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

#[tauri::command]
async fn delete_task(state: State<'_, AppState>, app: tauri::AppHandle, task_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_task(&task_id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "delete", Some(task_id));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- STATS ---
=======
    db.update_task_status(&task_id, status_enum)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_task(state: State<'_, AppState>, task_id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_task(&task_id).map_err(|e| e.to_string())
}

>>>>>>> origin/main
#[tauri::command]
async fn get_stats(state: State<'_, AppState>) -> Result<UserStats, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_stats().map_err(|e| e.to_string())
}

<<<<<<< HEAD
// --- FOCUS ---
#[tauri::command]
async fn start_focus_session(state: State<'_, AppState>, task_id: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.start_focus_session(task_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn complete_focus_session(state: State<'_, AppState>, app: tauri::AppHandle, session_id: String, duration_minutes: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.finish_focus_session(session_id, duration_minutes, true).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "stats", "refresh", None);
=======
#[tauri::command]
async fn get_settings() -> Result<AppSettings, String> {
    Ok(AppSettings::default())
}

#[tauri::command]
async fn save_settings(_settings: AppSettings) -> Result<(), String> {
>>>>>>> origin/main
    Ok(())
}

#[tauri::command]
<<<<<<< HEAD
async fn cancel_focus_session(state: State<'_, AppState>, app: tauri::AppHandle, session_id: String, duration_minutes: i32) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.finish_focus_session(session_id, duration_minutes, false).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- WINDOW ---
=======
async fn start_focus_session(task_id: String) -> Result<String, String> {
    Ok(format!("session_for_{}", task_id))
}

#[tauri::command]
async fn complete_focus_session(_session_id: String, _duration_minutes: i32) -> Result<(), String> {
    Ok(())
}

>>>>>>> origin/main
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
<<<<<<< HEAD
        .plugin(tauri_plugin_opener::init())
=======
>>>>>>> origin/main
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
            let db = AppDatabase::new(app_dir).expect("failed to initialize database");
<<<<<<< HEAD

            println!("[FocusFlow] DB path: {}", db.db_path().display());

            app.manage(AppState { db: Mutex::new(db) });

            // Reminder loop (thread)
            let app_handle2 = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(15));

                let now_ms = chrono::Utc::now().timestamp_millis();
                let state = app_handle2.state::<AppState>();

                let db_guard = match state.db.lock() {
                    Ok(g) => g,
                    Err(_) => continue,
                };

                let due = match db_guard.get_due_reminders(now_ms) {
                    Ok(d) => d,
                    Err(_) => continue,
                };

                if due.is_empty() {
                    continue;
                }

                let ids: Vec<String> = due.iter().map(|t| t.id.clone()).collect();
                let _ = db_guard.mark_reminded(&ids, now_ms);

                if let Some(w) = app_handle2.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }

                for t in due {
                    let _ = app_handle2.emit(
                        "reminder:due",
                        ReminderPayload {
                            task_id: t.id,
                            title: t.title,
                            deadline: t.deadline,
                        },
                    );
                }
=======
            
            app.manage(AppState {
                db: Mutex::new(db),
>>>>>>> origin/main
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
<<<<<<< HEAD
            db_health,
            get_completion_series,
            // settings
            get_settings,
            save_settings,
            // reminders
            set_task_remind_at,
            snooze_task_reminder,
            // tasks
=======
>>>>>>> origin/main
            get_tasks,
            add_task,
            update_task_status,
            delete_task,
            edit_task_title,
<<<<<<< HEAD
            update_task_priority,
            update_task_deadline,
            // stats
            get_stats,
            // projects
            get_projects,
            add_project,
            edit_project,
            update_project_priority,
            delete_project,
            // focus
            start_focus_session,
            complete_focus_session,
            cancel_focus_session,
            // window
=======
            update_task_priority, // new
            update_task_deadline, // new
            get_stats,
            get_settings,
            save_settings,
            get_projects,
            add_project,
            edit_project,
            delete_project,
            start_focus_session,
            complete_focus_session,
>>>>>>> origin/main
            toggle_window,
            minimize_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}