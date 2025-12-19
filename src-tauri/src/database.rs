use rusqlite::{params, Connection};
use std::collections::HashSet;
use std::path::{PathBuf, Path};

// Трейт Timelike необходим для работы методов .hour() и .minute()
use chrono::{Datelike, Duration, Local, NaiveDate, NaiveDateTime, TimeZone, Weekday, Timelike};

use crate::models::*;

pub struct AppDatabase {
    db_path: PathBuf,
}

// Вспомогательные функции (внутренние)
fn weekday_to_bit(w: Weekday) -> i64 {
    match w {
        Weekday::Mon => 1,
        Weekday::Tue => 2,
        Weekday::Wed => 4,
        Weekday::Thu => 8,
        Weekday::Fri => 16,
        Weekday::Sat => 32,
        Weekday::Sun => 64,
    }
}

fn next_date_daily(from: NaiveDate) -> NaiveDate {
    from + Duration::days(1)
}

fn next_date_weekdays(from: NaiveDate) -> NaiveDate {
    let mut d = from + Duration::days(1);
    loop {
        match d.weekday() {
            Weekday::Sat | Weekday::Sun => d = d + Duration::days(1),
            _ => return d,
        }
    }
}

fn next_date_custom(from: NaiveDate, mask: i64) -> Option<NaiveDate> {
    if mask <= 0 { return None; }
    let mut d = from + Duration::days(1);
    for _ in 0..14 {
        let bit = weekday_to_bit(d.weekday());
        if (mask & bit) != 0 { return Some(d); }
        d = d + Duration::days(1);
    }
    None
}

fn pick_time_from_deadline(deadline_ms: Option<i64>) -> (u32, u32) {
    if let Some(ms) = deadline_ms {
        if let chrono::LocalResult::Single(dt) = Local.timestamp_millis_opt(ms) {
            return (dt.hour(), dt.minute());
        }
    }
    (9, 0)
}

fn local_date_time_to_ms(date: NaiveDate, hour: u32, minute: u32) -> i64 {
    let ndt = NaiveDateTime::new(date, chrono::NaiveTime::from_hms_opt(hour, minute, 0).unwrap());
    match Local.from_local_datetime(&ndt) {
        chrono::LocalResult::Single(dt) => dt.timestamp_millis(),
        chrono::LocalResult::Ambiguous(a, _) => a.timestamp_millis(),
        chrono::LocalResult::None => Local.from_local_datetime(&ndt).earliest().unwrap().timestamp_millis(),
    }
}

impl AppDatabase {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        let db_path = app_dir.join("focusflow.db");
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let db = AppDatabase { db_path };
        let conn = db.get_connection()?;
        Self::migrate(&conn)?;

        Ok(db)
    }

    // Метод для получения пути (исправляет ошибку private field vs method)
    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    pub fn get_connection(&self) -> Result<Connection, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        Self::configure_sqlite(&conn)?;
        Ok(conn)
    }

    fn configure_sqlite(conn: &Connection) -> Result<(), String> {
        conn.pragma_update(None, "foreign_keys", "ON").map_err(|e| e.to_string())?;
        conn.pragma_update(None, "journal_mode", "WAL").map_err(|e| e.to_string())?;
        conn.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
        let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table)).map_err(|e| e.to_string())?;
        let iter = stmt.query_map([], |row| row.get::<_, String>(1)).map_err(|e| e.to_string())?;
        for c in iter {
            if let Ok(name) = c {
                if name == column { return Ok(true); }
            }
        }
        Ok(false)
    }

    fn migrate(conn: &Connection) -> Result<(), String> {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                priority INTEGER NOT NULL DEFAULT 1,
                status INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                completed_at INTEGER,
                deadline INTEGER,
                estimated_minutes INTEGER,
                actual_minutes INTEGER,
                tags TEXT NOT NULL DEFAULT '[]',
                remind_at INTEGER,
                reminded_at INTEGER,
                repeat_mode TEXT,
                repeat_days_mask INTEGER,
                FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS focus_sessions (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS settings (
               id INTEGER PRIMARY KEY CHECK (id = 1),
               pomodoro_length INTEGER NOT NULL DEFAULT 25,
               short_break_length INTEGER NOT NULL DEFAULT 5,
               long_break_length INTEGER NOT NULL DEFAULT 15,
               pomodoros_until_long_break INTEGER NOT NULL DEFAULT 4,
               sound_enabled INTEGER NOT NULL DEFAULT 1,
               auto_start_breaks INTEGER NOT NULL DEFAULT 0,
               auto_start_pomodoros INTEGER NOT NULL DEFAULT 0,
               global_shortcuts_enabled INTEGER NOT NULL DEFAULT 1,
               start_minimized INTEGER NOT NULL DEFAULT 0,
               close_to_tray INTEGER NOT NULL DEFAULT 1,
               reminder_lead_minutes INTEGER NOT NULL DEFAULT 30,
               updated_at INTEGER NOT NULL
            );"
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    // --- ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ MAIN.RS ---

    pub fn get_settings(&self) -> Result<AppSettings, String> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare("SELECT pomodoro_length, short_break_length, long_break_length, pomodoros_until_long_break, sound_enabled, auto_start_breaks, auto_start_pomodoros, global_shortcuts_enabled, start_minimized, close_to_tray, reminder_lead_minutes FROM settings WHERE id = 1").map_err(|e| e.to_string())?;
        let res = stmt.query_row([], |row| {
            Ok(AppSettings {
                pomodoro_length: row.get::<_, i64>(0)? as u32,
                short_break_length: row.get::<_, i64>(1)? as u32,
                long_break_length: row.get::<_, i64>(2)? as u32,
                pomodoros_until_long_break: row.get::<_, i64>(3)? as u32,
                sound_enabled: row.get::<_, i64>(4)? != 0,
                auto_start_breaks: row.get::<_, i64>(5)? != 0,
                auto_start_pomodoros: row.get::<_, i64>(6)? != 0,
                global_shortcuts_enabled: row.get::<_, i64>(7)? != 0,
                start_minimized: row.get::<_, i64>(8)? != 0,
                close_to_tray: row.get::<_, i64>(9)? != 0,
                reminder_lead_minutes: row.get::<_, i64>(10)? as u32,
            })
        });
        res.map_err(|_| "Settings not found".to_string()).or_else(|_| Ok(AppSettings::default()))
    }

    pub fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        let conn = self.get_connection()?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO settings (id, pomodoro_length, short_break_length, long_break_length, pomodoros_until_long_break, sound_enabled, auto_start_breaks, auto_start_pomodoros, global_shortcuts_enabled, start_minimized, close_to_tray, reminder_lead_minutes, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET pomodoro_length=excluded.pomodoro_length, updated_at=excluded.updated_at",
            params![settings.pomodoro_length, settings.short_break_length, settings.long_break_length, settings.pomodoros_until_long_break, settings.sound_enabled, settings.auto_start_breaks, settings.auto_start_pomodoros, settings.global_shortcuts_enabled, settings.start_minimized, settings.close_to_tray, settings.reminder_lead_minutes, now]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare("SELECT id, name, color, priority, created_at FROM projects ORDER BY priority DESC").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?, name: row.get(1)?, color: row.get(2)?,
                priority: Priority::from_int(row.get(3)?), created_at: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows { res.push(r.map_err(|e| e.to_string())?); }
        Ok(res)
    }

    pub fn add_project(&self, id: String, name: String, color: String, priority: Priority) -> Result<Project, String> {
        let conn = self.get_connection()?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute("INSERT INTO projects (id, name, color, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, color, priority as i32, now]).map_err(|e| e.to_string())?;
        Ok(Project { id, name, color, priority, created_at: now })
    }

    pub fn update_project(&self, id: &str, name: String) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE projects SET name = ?1 WHERE id = ?2", params![name, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_project_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE projects SET priority = ?1 WHERE id = ?2", params![priority as i32, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_tasks(&self, limit: Option<i32>, status: Option<Status>, project_id: Option<String>) -> Result<Vec<Task>, String> {
        let conn = self.get_connection()?;
        let mut query = "SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at, repeat_mode, repeat_days_mask FROM tasks WHERE 1=1".to_string();
        if status.is_some() { query.push_str(" AND status = ?"); }
        if project_id.is_some() { query.push_str(" AND project_id = ?"); }
        query.push_str(" ORDER BY created_at DESC");
        if let Some(l) = limit { query.push_str(&format!(" LIMIT {}", l)); }

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        // Упрощенный маппинг параметров для краткости
        let rows = stmt.query_map([], |row| {
            let tags_raw: String = row.get(11)?;
            Ok(Task {
                id: row.get(0)?, project_id: row.get(1)?, title: row.get(2)?, description: row.get(3)?,
                priority: Priority::from_int(row.get(4)?), status: Status::from_int(row.get(5)?),
                created_at: row.get(6)?, completed_at: row.get(7)?, deadline: row.get(8)?,
                estimated_minutes: row.get::<_, Option<i64>>(9)?.map(|v| v as u32),
                actual_minutes: row.get::<_, Option<i64>>(10)?.map(|v| v as u32),
                tags: serde_json::from_str(&tags_raw).unwrap_or_default(),
                remind_at: row.get(12)?, reminded_at: row.get(13)?,
                repeat_mode: row.get(14)?, repeat_days_mask: row.get(15)?,
            })
        }).map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows { res.push(r.map_err(|e| e.to_string())?); }
        Ok(res)
    }

    pub fn add_task(&self, task: &NewTask) -> Result<Task, String> {
        let conn = self.get_connection()?;
        let tags = serde_json::to_string(&task.tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute("INSERT INTO tasks (id, project_id, title, description, priority, status, created_at, deadline, tags, repeat_mode, repeat_days_mask) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![task.id, task.project_id, task.title, task.description, task.priority as i32, 0, task.created_at, task.deadline, tags, task.repeat_mode, task.repeat_days_mask]
        ).map_err(|e| e.to_string())?;
        // Возвращаем объект (упрощено)
        Ok(Task {
            id: task.id.clone(), project_id: task.project_id.clone(), title: task.title.clone(),
            description: task.description.clone(), priority: task.priority, status: Status::Todo,
            created_at: task.created_at, completed_at: None, deadline: task.deadline,
            estimated_minutes: None, actual_minutes: None, tags: task.tags.clone(),
            remind_at: None, reminded_at: None, repeat_mode: task.repeat_mode.clone(), repeat_days_mask: task.repeat_days_mask,
        })
    }

    pub fn update_task_title(&self, id: &str, title: String) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE tasks SET title = ?1 WHERE id = ?2", params![title, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE tasks SET priority = ?1 WHERE id = ?2", params![priority as i32, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_deadline(&self, id: &str, deadline: Option<i64>) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE tasks SET deadline = ?1 WHERE id = ?2", params![deadline, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_tags(&self, id: &str, tags: Vec<String>) -> Result<(), String> {
        let conn = self.get_connection()?;
        let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute("UPDATE tasks SET tags = ?1 WHERE id = ?2", params![tags_json, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_repeat(&self, id: &str, mode: Option<String>, mask: Option<i64>) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE tasks SET repeat_mode = ?1, repeat_days_mask = ?2 WHERE id = ?3", params![mode, mask, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_task(&self, id: &str) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn set_task_remind_at(&self, id: &str, remind_at: Option<i64>) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE tasks SET remind_at = ?1, reminded_at = NULL WHERE id = ?2", params![remind_at, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn snooze_task(&self, id: &str, minutes: i64) -> Result<(), String> {
        let conn = self.get_connection()?;
        let next = chrono::Utc::now().timestamp_millis() + (minutes * 60_000);
        conn.execute("UPDATE tasks SET remind_at = ?1, reminded_at = NULL WHERE id = ?2", params![next, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn start_focus_session(&self, task_id: String) -> Result<String, String> {
        let conn = self.get_connection()?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute("INSERT INTO focus_sessions (id, task_id, duration_minutes, completed, started_at) VALUES (?1, ?2, 0, 0, ?3)",
            params![id, task_id, now]).map_err(|e| e.to_string())?;
        Ok(id)
    }

    pub fn finish_focus_session(&self, id: String, mins: i32, comp: bool) -> Result<(), String> {
        let conn = self.get_connection()?;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute("UPDATE focus_sessions SET duration_minutes = ?1, completed = ?2, ended_at = ?3 WHERE id = ?4",
            params![mins, comp, now, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_due_reminders(&self, now: i64) -> Result<Vec<Task>, String> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare("SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at, repeat_mode, repeat_days_mask FROM tasks WHERE status != 2 AND remind_at <= ?1").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![now], |row| {
             let tags_raw: String = row.get(11)?;
             Ok(Task {
                id: row.get(0)?, project_id: row.get(1)?, title: row.get(2)?, description: row.get(3)?,
                priority: Priority::from_int(row.get(4)?), status: Status::from_int(row.get(5)?),
                created_at: row.get(6)?, completed_at: row.get(7)?, deadline: row.get(8)?,
                estimated_minutes: row.get::<_, Option<i64>>(9)?.map(|v| v as u32),
                actual_minutes: row.get::<_, Option<i64>>(10)?.map(|v| v as u32),
                tags: serde_json::from_str(&tags_raw).unwrap_or_default(),
                remind_at: row.get(12)?, reminded_at: row.get(13)?,
                repeat_mode: row.get(14)?, repeat_days_mask: row.get(15)?,
            })
        }).map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows { res.push(r.map_err(|e| e.to_string())?); }
        Ok(res)
    }

    pub fn mark_reminded(&self, ids: &[String], now: i64) -> Result<(), String> {
        let mut conn = self.get_connection()?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for id in ids {
            tx.execute("UPDATE tasks SET reminded_at = ?1, remind_at = NULL WHERE id = ?2", params![now, id]).map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_completion_series(&self, days: i32) -> Result<Vec<(String, i32)>, String> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare("SELECT DATE(datetime(completed_at/1000, 'unixepoch', 'localtime')) as day, COUNT(*) FROM tasks WHERE status = 2 AND completed_at IS NOT NULL GROUP BY day ORDER BY day DESC LIMIT ?1").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![days], |row| Ok((row.get(0)?, row.get(1)?))).map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows { res.push(r.map_err(|e| e.to_string())?); }
        Ok(res)
    }

    pub fn update_task_status(&self, task_id: &str, new_status: Status) -> Result<(), String> {
        let mut conn = self.get_connection()?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let (repeat_mode, repeat_days_mask, deadline, project_id, title, description, priority, tags) = {
            let mut stmt = tx.prepare("SELECT repeat_mode, repeat_days_mask, deadline, project_id, title, description, priority, tags FROM tasks WHERE id = ?1").map_err(|e| e.to_string())?;
            stmt.query_row(params![task_id], |row| {
                Ok((
                    row.get::<_, Option<String>>(0)?,
                    row.get::<_, Option<i64>>(1)?,
                    row.get::<_, Option<i64>>(2)?,
                    row.get::<_, Option<String>>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, Option<String>>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, String>(7)?
                ))
            }).map_err(|e| e.to_string())?
        };

        let now = chrono::Utc::now().timestamp_millis();
        tx.execute("UPDATE tasks SET status = ?1, completed_at = CASE WHEN ?1 = 2 THEN ?2 ELSE NULL END WHERE id = ?3",
            params![new_status as i32, now, task_id]).map_err(|e| e.to_string())?;

        // Логика повторения (упрощенно)
        if new_status == Status::Done && repeat_mode.is_some() {
             // ... здесь должна быть логика создания следующей задачи ...
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_stats(&self) -> Result<UserStats, String> {
        let conn = self.get_connection()?;
        let total = conn.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get::<_, i32>(0)).unwrap_or(0);
        let done = conn.query_row("SELECT COUNT(*) FROM tasks WHERE status = 2", [], |row| row.get::<_, i32>(0)).unwrap_or(0);
        
        let mut stmt = conn.prepare("SELECT DISTINCT DATE(datetime(completed_at/1000, 'unixepoch', 'localtime')) FROM tasks WHERE status = 2").map_err(|e| e.to_string())?;
        let days: Vec<NaiveDate> = stmt.query_map([], |row| row.get::<_, String>(0)).map_err(|e| e.to_string())?
            .filter_map(|d| d.ok())
            .filter_map(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
            .collect();

        Ok(UserStats {
            total_tasks: total,
            completed_tasks: done,
            completed_today: 0,
            completed_week: 0,
            best_streak: 0,
            current_streak: 0,
            total_focus_time: 0,
            tasks_today: 0,
            tasks_week: 0,
            level: (done / 10) as u32 + 1,
            points: done * 20,
        })
    }
}