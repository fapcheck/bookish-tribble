#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;

use tauri::{Emitter, Manager, State, WindowEvent};

mod database;
mod models;

use chrono::Datelike;
use database::AppDatabase;
use models::{AppSettings, NewTask, Priority, Project, Status, Subtask, Task, UserStats};

struct AppState {
    db: Mutex<AppDatabase>,
}

#[derive(serde::Serialize, Clone)]
struct DataChanged {
    entity: &'static str,
    action: &'static str,
    id: Option<String>,
}

fn emit_data_changed(
    app: &tauri::AppHandle,
    entity: &'static str,
    action: &'static str,
    id: Option<String>,
) {
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
    let conn = db.get_connection();

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

// --- EXPORT BACKUP ---

#[derive(serde::Serialize, serde::Deserialize)]
struct ExportBundle {
    version: u32,
    exported_at: i64, // ms
    projects: Vec<Project>,
    tasks: Vec<Task>,
    settings: AppSettings,
}

#[tauri::command]
async fn export_data(state: State<'_, AppState>) -> Result<ExportBundle, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let projects = db.get_projects().map_err(|e| e.to_string())?;
    let tasks = db.get_tasks(None, None, None).map_err(|e| e.to_string())?;
    let settings = db.get_settings().map_err(|e| e.to_string())?;

    Ok(ExportBundle {
        version: 1,
        exported_at: chrono::Utc::now().timestamp_millis(),
        projects,
        tasks,
        settings,
    })
}

#[tauri::command]
async fn import_data(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    bundle_json: String,
) -> Result<(), String> {
    let bundle: ExportBundle =
        serde_json::from_str(&bundle_json).map_err(|e| format!("Invalid backup file: {}", e))?;

    let mut db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.import_data(bundle.projects, bundle.tasks, bundle.settings)
        .map_err(|e| e.to_string())?;

    // Refresh everything
    emit_data_changed(&app, "tasks", "refresh", None);
    emit_data_changed(&app, "projects", "refresh", None);
    emit_data_changed(&app, "settings", "refresh", None);
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- COMPLETION SERIES ---

#[derive(serde::Serialize)]
struct CompletionDay {
    day: String,
    count: i32,
}

#[tauri::command]
async fn get_completion_series(
    state: State<'_, AppState>,
    days: i32,
) -> Result<Vec<CompletionDay>, String> {
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
    db.set_task_remind_at(&id, remind_at)
        .map_err(|e| e.to_string())?;
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

#[tauri::command]
async fn get_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_projects().map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_project(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    name: String,
    color: String,
    priority: String,
    parent_id: Option<String>,
    is_folder: bool,
) -> Result<Project, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let id = uuid::Uuid::new_v4().to_string();

    let priority_enum = match priority.as_str() {
        "high" => Priority::High,
        "low" => Priority::Low,
        _ => Priority::Normal,
    };

    let project = db
        .add_project(id.clone(), name, color, priority_enum, parent_id, is_folder)
        .map_err(|e| e.to_string())?;

    emit_data_changed(&app, "projects", "add", Some(id));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(project)
}

#[tauri::command]
async fn edit_project(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    name: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_project(&id, name).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "projects", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_project_priority(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    priority: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let priority_enum = match priority.as_str() {
        "high" => Priority::High,
        "low" => Priority::Low,
        _ => Priority::Normal,
    };
    db.update_project_priority(&id, priority_enum)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "projects", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn delete_project(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_project(&id).map_err(|e| e.to_string())?;

    emit_data_changed(&app, "projects", "delete", Some(id));
    emit_data_changed(&app, "tasks", "refresh", None);
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- TASKS ---

#[tauri::command]
async fn get_tasks(
    state: State<'_, AppState>,
    limit: Option<i32>,
    status_filter: Option<i32>,
    project_filter: Option<String>,
) -> Result<Vec<Task>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let status_enum = status_filter.map(Status::from_int);
    db.get_tasks(limit, status_enum, project_filter)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_task(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    new_task: NewTask,
) -> Result<Task, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let task = db.add_task(&new_task).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "add", Some(task.id.clone()));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(task)
}

#[tauri::command]
async fn edit_task_title(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    title: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_title(&id, title)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_priority(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    priority: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let priority_enum = match priority.as_str() {
        "high" => Priority::High,
        "low" => Priority::Low,
        _ => Priority::Normal,
    };
    db.update_task_priority(&id, priority_enum)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_deadline(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    deadline: Option<i64>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_deadline(&id, deadline)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_tags(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    tags: Vec<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_tags(&id, tags).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_repeat(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
    repeat_mode: Option<String>,
    repeat_days_mask: Option<i64>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.update_task_repeat(&id, repeat_mode, repeat_days_mask)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "edit", Some(id));
    Ok(())
}

#[tauri::command]
async fn update_task_status(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    task_id: String,
    new_status: String,
) -> Result<(), String> {
    let mut db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let status_enum = match new_status.as_str() {
        "todo" => Status::Todo,
        "doing" => Status::Doing,
        "done" => Status::Done,
        _ => Status::Todo,
    };
    db.update_task_status(&task_id, status_enum)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "status", Some(task_id));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

#[tauri::command]
async fn delete_task(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    task_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_task(&task_id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "delete", Some(task_id));
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- STATS ---

#[tauri::command]
async fn get_stats(state: State<'_, AppState>) -> Result<UserStats, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_stats().map_err(|e| e.to_string())
}

// --- FOCUS ---

#[tauri::command]
async fn start_focus_session(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<String, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.start_focus_session(task_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn complete_focus_session(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    session_id: String,
    duration_minutes: i32,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.finish_focus_session(session_id, duration_minutes, true)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

#[tauri::command]
async fn cancel_focus_session(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    session_id: String,
    duration_minutes: i32,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.finish_focus_session(session_id, duration_minutes, false)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "stats", "refresh", None);
    Ok(())
}

// --- SUBTASKS ---

#[tauri::command]
async fn get_subtasks(state: State<'_, AppState>, task_id: String) -> Result<Vec<Subtask>, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.get_subtasks(&task_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn add_subtask(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    task_id: String,
    title: String,
) -> Result<Subtask, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let subtask = db
        .add_subtask(&task_id, &title)
        .map_err(|e| e.to_string())?;
    emit_data_changed(&app, "subtasks", "add", Some(task_id));
    Ok(subtask)
}

#[tauri::command]
async fn toggle_subtask(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<bool, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let completed = db.toggle_subtask(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "subtasks", "toggle", Some(id));
    Ok(completed)
}

#[tauri::command]
async fn delete_subtask(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_subtask(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "subtasks", "delete", Some(id));
    Ok(())
}

#[tauri::command]
async fn reorder_subtasks(
    state: State<'_, AppState>,
    subtask_ids: Vec<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.reorder_subtasks(&subtask_ids).map_err(|e| e.to_string())
}

// --- ARCHIVE ---

#[tauri::command]
async fn archive_task(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.archive_task(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "archive", Some(id));
    Ok(())
}

#[tauri::command]
async fn unarchive_task(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.unarchive_task(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "tasks", "unarchive", Some(id));
    Ok(())
}

// --- REORDER TASKS ---

#[tauri::command]
async fn reorder_tasks(state: State<'_, AppState>, task_ids: Vec<String>) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.reorder_tasks(&task_ids).map_err(|e| e.to_string())
}

// --- WINDOW ---

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

// --- FINANCE ---

#[derive(serde::Serialize)]
struct FinanceSummary {
    transactions: Vec<models::Transaction>,
    debts: Vec<models::Debt>,
}

#[tauri::command]
async fn get_finance_summary(state: State<'_, AppState>) -> Result<FinanceSummary, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let (transactions, debts) = db.get_finance_summary().map_err(|e| e.to_string())?;
    Ok(FinanceSummary {
        transactions,
        debts,
    })
}

#[tauri::command]
async fn add_transaction(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    amount: f64,
    category: String,
    date: i64,
    description: Option<String>,
    is_expense: bool,
) -> Result<models::Transaction, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let id = uuid::Uuid::new_v4().to_string();
    let t = models::NewTransaction {
        id: id.clone(),
        amount,
        category,
        date,
        description,
        is_expense,
    };
    let created = db.add_transaction(t).map_err(|e| e.to_string())?;

    emit_data_changed(&app, "finance", "add_transaction", Some(id));
    Ok(created)
}

#[tauri::command]
async fn delete_transaction(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_transaction(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "finance", "delete_transaction", Some(id));
    Ok(())
}

#[tauri::command]
async fn add_debt(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    person: String,
    amount: f64,
    currency: String,
    is_owed_by_me: bool,
    due_date: Option<i64>,
    start_date: Option<i64>,
    payment_day: Option<i32>,
    initial_amount: Option<f64>,
) -> Result<models::Debt, String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    let id = uuid::Uuid::new_v4().to_string();
    let d = models::NewDebt {
        id: id.clone(),
        person,
        amount,
        currency,
        is_owed_by_me,
        created_at: chrono::Utc::now().timestamp_millis(),
        due_date,
        start_date,
        payment_day,
        initial_amount,
    };
    let created = db.add_debt(d).map_err(|e| e.to_string())?;

    emit_data_changed(&app, "finance", "add_debt", Some(id));
    Ok(created)
}

#[tauri::command]
async fn pay_debt(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.pay_debt(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "finance", "pay_debt", Some(id));
    Ok(())
}

#[tauri::command]
async fn delete_debt(
    state: State<'_, AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|_| "Failed to lock db")?;
    db.delete_debt(&id).map_err(|e| e.to_string())?;
    emit_data_changed(&app, "finance", "delete_debt", Some(id));
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle();
            let app_dir = app_handle
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            let db = AppDatabase::new(app_dir).expect("failed to initialize database");
            println!("[FocusFlow] DB path: {}", db.db_path().display());

            app.manage(AppState { db: Mutex::new(db) });

            // Reminder loop (background thread)
            let app_handle2 = app.handle().clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(15));

                let now_ms = chrono::Utc::now().timestamp_millis();
                let state = app_handle2.state::<AppState>();

                let mut db_guard = match state.db.lock() {
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
                // Loan Reminders
                // ---------------------------------------------------------
                let loans = match db_guard.get_active_loans() {
                    Ok(l) => l,
                    Err(_) => Vec::new(), // ignore error
                };

                let today = chrono::Local::now().date_naive();
                let today_str = today.format("%Y-%m-%d").to_string();

                for (id, person, payment_day, last_reminded) in loans {
                    if let Some(last) = last_reminded {
                        if last == today_str {
                            continue; // Already reminded today
                        }
                    }

                    // Check if due in 1, 2, or 3 days
                    // Simple logic: Construct target date for this month
                    let target_date = match chrono::NaiveDate::from_ymd_opt(
                        today.year(),
                        today.month(),
                        payment_day as u32,
                    ) {
                        Some(d) => d,
                        None => continue, // Invalid date (e.g. Feb 30), skip for now
                    };

                    // If target is in past, maybe it's next month?
                    // E.g. Today 25th, Payment 10th. Target (ThisMonth-10) is past.
                    // We only care about UPCOMING.
                    // Cases:
                    // Payment 25. Today 22. Diff 3.
                    // Payment 2. Today 30. Diff 2 (approx).

                    let mut days_diff = (target_date - today).num_days();

                    if days_diff < 0 {
                        // Try next month
                        let next_month_date = if today.month() == 12 {
                            chrono::NaiveDate::from_ymd_opt(today.year() + 1, 1, payment_day as u32)
                        } else {
                            chrono::NaiveDate::from_ymd_opt(
                                today.year(),
                                today.month() + 1,
                                payment_day as u32,
                            )
                        };

                        if let Some(nm) = next_month_date {
                            days_diff = (nm - today).num_days();
                        }
                    }

                    if days_diff >= 1 && days_diff <= 3 {
                        // Trigger reminder
                        let _ = app_handle2.emit(
                            "reminder:due",
                            ReminderPayload {
                                task_id: id.clone(),
                                title: format!(
                                    "Платеж по кредиту: {} (через {} дн.)",
                                    person, days_diff
                                ),
                                deadline: None,
                            },
                        );
                        // Mark as reminded
                        let _ = db_guard.update_last_reminded(&id, &today_str);

                        // Also show window if not shown
                        if let Some(w) = app_handle2.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                }
                // ---------------------------------------------------------
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
            // debug
            db_health,
            // export
            export_data,
            import_data,
            // calendar series
            get_completion_series,
            // settings
            get_settings,
            save_settings,
            // reminders
            set_task_remind_at,
            snooze_task_reminder,
            // projects
            get_projects,
            add_project,
            edit_project,
            update_project_priority,
            delete_project,
            // tasks
            get_tasks,
            add_task,
            edit_task_title,
            update_task_priority,
            update_task_deadline,
            update_task_tags,
            update_task_repeat,
            update_task_status,
            delete_task,
            reorder_tasks,
            archive_task,
            unarchive_task,
            // subtasks
            get_subtasks,
            add_subtask,
            toggle_subtask,
            delete_subtask,
            reorder_subtasks,
            // stats
            get_stats,
            // focus
            start_focus_session,
            complete_focus_session,
            cancel_focus_session,
            // window
            toggle_window,
            minimize_window,
            // Finance
            get_finance_summary,
            add_transaction,
            delete_transaction,
            add_debt,
            pay_debt,
            delete_debt
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
