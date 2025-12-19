use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};

// Трейт Timelike необходим для работы методов .hour() и .minute()
use chrono::{Datelike, Duration, Local, NaiveDate, NaiveDateTime, TimeZone, Timelike, Weekday};

use crate::models::*;

pub struct AppDatabase {
    db_path: PathBuf,
    conn: Connection,
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
    if mask <= 0 {
        return None;
    }
    let mut d = from + Duration::days(1);
    for _ in 0..14 {
        let bit = weekday_to_bit(d.weekday());
        if (mask & bit) != 0 {
            return Some(d);
        }
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
    let ndt = NaiveDateTime::new(
        date,
        chrono::NaiveTime::from_hms_opt(hour, minute, 0).unwrap(),
    );
    match Local.from_local_datetime(&ndt) {
        chrono::LocalResult::Single(dt) => dt.timestamp_millis(),
        chrono::LocalResult::Ambiguous(a, _) => a.timestamp_millis(),
        chrono::LocalResult::None => Local
            .from_local_datetime(&ndt)
            .earliest()
            .unwrap()
            .timestamp_millis(),
    }
}

impl AppDatabase {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        let db_path = app_dir.join("focusflow.db");
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        Self::configure_sqlite(&conn)?;
        Self::migrate(&conn)?;

        Ok(AppDatabase { db_path, conn })
    }

    // Метод для получения пути
    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    pub fn get_connection(&self) -> &Connection {
        &self.conn
    }

    fn configure_sqlite(conn: &Connection) -> Result<(), String> {
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|e| e.to_string())?;
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| e.to_string())?;
        conn.busy_timeout(std::time::Duration::from_secs(5))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn migrate(conn: &Connection) -> Result<(), String> {
        // 1. Ensure migrations table exists
        conn.execute(
            "CREATE TABLE IF NOT EXISTS _migrations (
                version INTEGER PRIMARY KEY,
                applied_at INTEGER NOT NULL
            )",
            [],
        )
        .map_err(|e| e.to_string())?;

        // 2. Get current version
        let commit_migration = |ver: i32| -> Result<(), String> {
            let now = chrono::Utc::now().timestamp_millis();
            conn.execute(
                "INSERT INTO _migrations (version, applied_at) VALUES (?1, ?2)",
                params![ver, now],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        };

        let current_version: i32 = conn
            .query_row("SELECT MAX(version) FROM _migrations", [], |row| {
                row.get::<_, Option<i32>>(0)
            })
            .unwrap_or(None)
            .unwrap_or(0);

        // 3. Define migrations
        // Version 1: Initial Schema
        if current_version < 1 {
            // Check if legacy schema exists (projects table)
            let has_projects = conn
                .query_row(
                    "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='projects'",
                    [],
                    |row| row.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;

            if !has_projects {
                conn.execute_batch(
                    "CREATE TABLE projects (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        color TEXT NOT NULL,
                        priority INTEGER NOT NULL DEFAULT 1,
                        created_at INTEGER NOT NULL
                    );
                    CREATE TABLE tasks (
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
                    CREATE TABLE focus_sessions (
                        id TEXT PRIMARY KEY,
                        task_id TEXT NOT NULL,
                        duration_minutes INTEGER NOT NULL,
                        completed INTEGER NOT NULL DEFAULT 0,
                        started_at INTEGER NOT NULL,
                        ended_at INTEGER,
                        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
                    );
                    CREATE TABLE settings (
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
                    );",
                )
                .map_err(|e| e.to_string())?;
            }
            commit_migration(1)?;
        }

        // Version 2: Subtasks, Archive, Sort Order
        if current_version < 2 {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS subtasks (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
                ",
            )
            .map_err(|e| e.to_string())?;

            // Add columns to tasks (SQLite doesn't support IF NOT EXISTS for columns)
            let has_is_archived = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name='is_archived'",
                    [],
                    |row| row.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;

            if !has_is_archived {
                conn.execute(
                    "ALTER TABLE tasks ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0",
                    [],
                )
                .map_err(|e| e.to_string())?;
            }

            let has_sort_order = conn
                .query_row(
                    "SELECT COUNT(*) FROM pragma_table_info('tasks') WHERE name='sort_order'",
                    [],
                    |row| row.get::<_, i32>(0),
                )
                .unwrap_or(0)
                > 0;

            if !has_sort_order {
                conn.execute(
                    "ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0",
                    [],
                )
                .map_err(|e| e.to_string())?;
            }

            commit_migration(2)?;
        }

        Ok(())
    }

    // --- ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ MAIN.RS ---

    pub fn import_data(
        &mut self,
        projects: Vec<Project>,
        tasks: Vec<Task>,
        settings: AppSettings,
    ) -> Result<(), String> {
        let conn = &mut self.conn;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        // 1. Projects (Upsert)
        for p in projects {
            tx.execute(
                "INSERT INTO projects (id, name, color, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(id) DO UPDATE SET name=excluded.name, color=excluded.color, priority=excluded.priority",
                params![p.id, p.name, p.color, p.priority as i32, p.created_at]
            ).map_err(|e| e.to_string())?;
        }

        // 2. Tasks (Upsert)
        for t in tasks {
            let tags = serde_json::to_string(&t.tags).unwrap_or_else(|_| "[]".to_string());
            tx.execute(
                "INSERT INTO tasks (id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at, repeat_mode, repeat_days_mask) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
                 ON CONFLICT(id) DO UPDATE SET 
                    project_id=excluded.project_id, title=excluded.title, description=excluded.description, 
                    priority=excluded.priority, status=excluded.status, completed_at=excluded.completed_at, 
                    deadline=excluded.deadline, estimated_minutes=excluded.estimated_minutes, actual_minutes=excluded.actual_minutes, 
                    tags=excluded.tags, remind_at=excluded.remind_at, repeat_mode=excluded.repeat_mode, repeat_days_mask=excluded.repeat_days_mask",
                params![t.id, t.project_id, t.title, t.description, t.priority as i32, t.status as i32, t.created_at, t.completed_at, t.deadline, t.estimated_minutes, t.actual_minutes, tags, t.remind_at, t.reminded_at, t.repeat_mode, t.repeat_days_mask]
            ).map_err(|e| e.to_string())?;
        }

        // 3. Settings (Update)
        let now = chrono::Utc::now().timestamp_millis();
        tx.execute(
            "INSERT INTO settings (id, pomodoro_length, short_break_length, long_break_length, pomodoros_until_long_break, sound_enabled, auto_start_breaks, auto_start_pomodoros, global_shortcuts_enabled, start_minimized, close_to_tray, reminder_lead_minutes, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET 
                pomodoro_length=excluded.pomodoro_length, short_break_length=excluded.short_break_length, long_break_length=excluded.long_break_length, 
                pomodoros_until_long_break=excluded.pomodoros_until_long_break, sound_enabled=excluded.sound_enabled, 
                auto_start_breaks=excluded.auto_start_breaks, auto_start_pomodoros=excluded.auto_start_pomodoros, 
                global_shortcuts_enabled=excluded.global_shortcuts_enabled, start_minimized=excluded.start_minimized, 
                close_to_tray=excluded.close_to_tray, reminder_lead_minutes=excluded.reminder_lead_minutes, updated_at=excluded.updated_at",
            params![settings.pomodoro_length, settings.short_break_length, settings.long_break_length, settings.pomodoros_until_long_break, settings.sound_enabled, settings.auto_start_breaks, settings.auto_start_pomodoros, settings.global_shortcuts_enabled, settings.start_minimized, settings.close_to_tray, settings.reminder_lead_minutes, now]
        ).map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_settings(&self) -> Result<AppSettings, String> {
        let conn = &self.conn;
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
        res.map_err(|_| "Settings not found".to_string())
            .or_else(|_| Ok(AppSettings::default()))
    }

    pub fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        let conn = &self.conn;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO settings (id, pomodoro_length, short_break_length, long_break_length, pomodoros_until_long_break, sound_enabled, auto_start_breaks, auto_start_pomodoros, global_shortcuts_enabled, start_minimized, close_to_tray, reminder_lead_minutes, updated_at)
             VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
             ON CONFLICT(id) DO UPDATE SET 
                pomodoro_length=excluded.pomodoro_length, 
                short_break_length=excluded.short_break_length,
                long_break_length=excluded.long_break_length,
                pomodoros_until_long_break=excluded.pomodoros_until_long_break,
                sound_enabled=excluded.sound_enabled,
                auto_start_breaks=excluded.auto_start_breaks,
                auto_start_pomodoros=excluded.auto_start_pomodoros,
                global_shortcuts_enabled=excluded.global_shortcuts_enabled,
                start_minimized=excluded.start_minimized,
                close_to_tray=excluded.close_to_tray,
                reminder_lead_minutes=excluded.reminder_lead_minutes,
                updated_at=excluded.updated_at",
            params![settings.pomodoro_length, settings.short_break_length, settings.long_break_length, settings.pomodoros_until_long_break, settings.sound_enabled, settings.auto_start_breaks, settings.auto_start_pomodoros, settings.global_shortcuts_enabled, settings.start_minimized, settings.close_to_tray, settings.reminder_lead_minutes, now]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_projects(&self) -> Result<Vec<Project>, String> {
        let conn = &self.conn;
        let mut stmt = conn
            .prepare(
                "SELECT id, name, color, priority, created_at FROM projects ORDER BY priority DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    priority: Priority::from_int(row.get(3)?),
                    created_at: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        Ok(res)
    }

    pub fn add_project(
        &self,
        id: String,
        name: String,
        color: String,
        priority: Priority,
    ) -> Result<Project, String> {
        let conn = &self.conn;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute("INSERT INTO projects (id, name, color, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, color, priority as i32, now]).map_err(|e| e.to_string())?;
        Ok(Project {
            id,
            name,
            color,
            priority,
            created_at: now,
        })
    }

    pub fn update_project(&self, id: &str, name: String) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE projects SET name = ?1 WHERE id = ?2",
            params![name, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_project_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE projects SET priority = ?1 WHERE id = ?2",
            params![priority as i32, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_tasks(
        &self,
        limit: Option<i32>,
        status: Option<Status>,
        project_id: Option<String>,
    ) -> Result<Vec<Task>, String> {
        let conn = &self.conn;
        let mut query = "SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at, repeat_mode, repeat_days_mask FROM tasks WHERE 1=1".to_string();

        // Build dynamic parameters
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(s) = &status {
            query.push_str(" AND status = ?");
            params_vec.push(Box::new(*s as i32));
        }
        if let Some(pid) = &project_id {
            query.push_str(" AND project_id = ?");
            params_vec.push(Box::new(pid.clone()));
        }
        query.push_str(" ORDER BY created_at DESC");
        if let Some(l) = limit {
            query.push_str(&format!(" LIMIT {}", l));
        }

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

        // Convert params to references for rusqlite
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt
            .query_map(params_refs.as_slice(), |row| {
                let tags_raw: String = row.get(11)?;
                Ok(Task {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: Priority::from_int(row.get(4)?),
                    status: Status::from_int(row.get(5)?),
                    created_at: row.get(6)?,
                    completed_at: row.get(7)?,
                    deadline: row.get(8)?,
                    estimated_minutes: row.get::<_, Option<i64>>(9)?.map(|v| v as u32),
                    actual_minutes: row.get::<_, Option<i64>>(10)?.map(|v| v as u32),
                    tags: serde_json::from_str(&tags_raw).unwrap_or_default(),
                    remind_at: row.get(12)?,
                    reminded_at: row.get(13)?,
                    repeat_mode: row.get(14)?,
                    repeat_days_mask: row.get(15)?,
                    is_archived: false,
                    sort_order: 0,
                    subtasks: Vec::new(),
                })
            })
            .map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        Ok(res)
    }

    pub fn add_task(&self, task: &NewTask) -> Result<Task, String> {
        let conn = &self.conn;
        let tags = serde_json::to_string(&task.tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute("INSERT INTO tasks (id, project_id, title, description, priority, status, created_at, deadline, tags, repeat_mode, repeat_days_mask) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![task.id, task.project_id, task.title, task.description, task.priority as i32, 0, task.created_at, task.deadline, tags, task.repeat_mode, task.repeat_days_mask]
        ).map_err(|e| e.to_string())?;
        // Возвращаем объект (упрощено)
        Ok(Task {
            id: task.id.clone(),
            project_id: task.project_id.clone(),
            title: task.title.clone(),
            description: task.description.clone(),
            priority: task.priority,
            status: Status::Todo,
            created_at: task.created_at,
            completed_at: None,
            deadline: task.deadline,
            estimated_minutes: None,
            actual_minutes: None,
            tags: task.tags.clone(),
            remind_at: None,
            reminded_at: None,
            repeat_mode: task.repeat_mode.clone(),
            repeat_days_mask: task.repeat_days_mask,
            is_archived: false,
            sort_order: 0,
            subtasks: Vec::new(),
        })
    }

    pub fn update_task_title(&self, id: &str, title: String) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET title = ?1 WHERE id = ?2",
            params![title, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET priority = ?1 WHERE id = ?2",
            params![priority as i32, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_deadline(&self, id: &str, deadline: Option<i64>) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET deadline = ?1 WHERE id = ?2",
            params![deadline, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_tags(&self, id: &str, tags: Vec<String>) -> Result<(), String> {
        let conn = &self.conn;
        let tags_json = serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "UPDATE tasks SET tags = ?1 WHERE id = ?2",
            params![tags_json, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_repeat(
        &self,
        id: &str,
        mode: Option<String>,
        mask: Option<i64>,
    ) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET repeat_mode = ?1, repeat_days_mask = ?2 WHERE id = ?3",
            params![mode, mask, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_task(&self, id: &str) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn set_task_remind_at(&self, id: &str, remind_at: Option<i64>) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET remind_at = ?1, reminded_at = NULL WHERE id = ?2",
            params![remind_at, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn snooze_task(&self, id: &str, minutes: i64) -> Result<(), String> {
        let conn = &self.conn;
        let next = chrono::Utc::now().timestamp_millis() + (minutes * 60_000);
        conn.execute(
            "UPDATE tasks SET remind_at = ?1, reminded_at = NULL WHERE id = ?2",
            params![next, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn start_focus_session(&self, task_id: String) -> Result<String, String> {
        let conn = &self.conn;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute("INSERT INTO focus_sessions (id, task_id, duration_minutes, completed, started_at) VALUES (?1, ?2, 0, 0, ?3)",
            params![id, task_id, now]).map_err(|e| e.to_string())?;
        Ok(id)
    }

    pub fn finish_focus_session(&self, id: String, mins: i32, comp: bool) -> Result<(), String> {
        let conn = &self.conn;
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute("UPDATE focus_sessions SET duration_minutes = ?1, completed = ?2, ended_at = ?3 WHERE id = ?4",
            params![mins, comp, now, id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_due_reminders(&self, now: i64) -> Result<Vec<Task>, String> {
        let conn = &self.conn;
        let mut stmt = conn.prepare("SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at, repeat_mode, repeat_days_mask FROM tasks WHERE status != 2 AND remind_at <= ?1").map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![now], |row| {
                let tags_raw: String = row.get(11)?;
                Ok(Task {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    description: row.get(3)?,
                    priority: Priority::from_int(row.get(4)?),
                    status: Status::from_int(row.get(5)?),
                    created_at: row.get(6)?,
                    completed_at: row.get(7)?,
                    deadline: row.get(8)?,
                    estimated_minutes: row.get::<_, Option<i64>>(9)?.map(|v| v as u32),
                    actual_minutes: row.get::<_, Option<i64>>(10)?.map(|v| v as u32),
                    tags: serde_json::from_str(&tags_raw).unwrap_or_default(),
                    remind_at: row.get(12)?,
                    reminded_at: row.get(13)?,
                    repeat_mode: row.get(14)?,
                    repeat_days_mask: row.get(15)?,
                    is_archived: false,
                    sort_order: 0,
                    subtasks: Vec::new(),
                })
            })
            .map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        Ok(res)
    }

    pub fn mark_reminded(&mut self, ids: &[String], now: i64) -> Result<(), String> {
        let conn = &mut self.conn;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for id in ids {
            tx.execute(
                "UPDATE tasks SET reminded_at = ?1, remind_at = NULL WHERE id = ?2",
                params![now, id],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_completion_series(&self, days: i32) -> Result<Vec<(String, i32)>, String> {
        let conn = &self.conn;
        let mut stmt = conn.prepare("SELECT DATE(datetime(completed_at/1000, 'unixepoch', 'localtime')) as day, COUNT(*) FROM tasks WHERE status = 2 AND completed_at IS NOT NULL GROUP BY day ORDER BY day DESC LIMIT ?1").map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![days], |row| Ok((row.get(0)?, row.get(1)?)))
            .map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        Ok(res)
    }

    pub fn update_task_status(&mut self, task_id: &str, new_status: Status) -> Result<(), String> {
        let conn = &mut self.conn;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let (
            repeat_mode,
            repeat_days_mask,
            deadline,
            project_id,
            title,
            description,
            priority,
            tags,
        ) = {
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
                    row.get::<_, String>(7)?,
                ))
            })
            .map_err(|e| e.to_string())?
        };

        let now = chrono::Utc::now().timestamp_millis();
        tx.execute("UPDATE tasks SET status = ?1, completed_at = CASE WHEN ?1 = 2 THEN ?2 ELSE NULL END WHERE id = ?3",
            params![new_status as i32, now, task_id]).map_err(|e| e.to_string())?;

        // Logic for recurring tasks
        if new_status == Status::Done {
            let mut next_date: Option<NaiveDate> = None;

            // NOTE: We only care if repeat_mode is present.
            if let Some(mode) = &repeat_mode {
                let current_deadline_ms = deadline.unwrap_or(now);
                let current_date = match Local.timestamp_millis_opt(current_deadline_ms) {
                    chrono::LocalResult::Single(dt) => dt.date_naive(),
                    _ => Local::now().date_naive(),
                };

                match mode.as_str() {
                    "daily" => next_date = Some(next_date_daily(current_date)),
                    "weekdays" => next_date = Some(next_date_weekdays(current_date)),
                    "custom" => {
                        if let Some(mask) = repeat_days_mask {
                            next_date = next_date_custom(current_date, mask);
                        }
                    }
                    _ => {}
                }

                if let Some(nd) = next_date {
                    let (h, m) = pick_time_from_deadline(deadline);
                    let next_ms = local_date_time_to_ms(nd, h, m);
                    let new_id = uuid::Uuid::new_v4().to_string();

                    // Reset status to Todo (0)
                    tx.execute("INSERT INTO tasks (id, project_id, title, description, priority, status, created_at, deadline, tags, repeat_mode, repeat_days_mask) 
                        VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10)",
                        params![new_id, project_id, title, description, priority, now, next_ms, tags, repeat_mode, repeat_days_mask]
                     ).map_err(|e| e.to_string())?;

                    // Optional: Clean up repeat mode from completed task so it doesn't trigger again?
                    // Or leave it as is. Leading choice: Leave it, so history reflects it was a recurring task.
                    // But if user unchecks and re-checks, it duplicates.
                    // Better to remove repeat settings from the OLD task.
                    tx.execute("UPDATE tasks SET repeat_mode = NULL, repeat_days_mask = NULL WHERE id = ?1", params![task_id]).map_err(|e| e.to_string())?;
                }
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_stats(&self) -> Result<UserStats, String> {
        let conn = &self.conn;
        let total = conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get::<_, i32>(0))
            .unwrap_or(0);
        let done = conn
            .query_row("SELECT COUNT(*) FROM tasks WHERE status = 2", [], |row| {
                row.get::<_, i32>(0)
            })
            .unwrap_or(0);

        let now_local = Local::now();
        let start_of_day = now_local
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_local_timezone(Local)
            .unwrap()
            .timestamp_millis();

        // Start of week (Monday)
        let days_from_mon = now_local.weekday().num_days_from_monday();
        let start_of_week = (now_local - Duration::days(days_from_mon as i64))
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            .and_local_timezone(Local)
            .unwrap()
            .timestamp_millis();

        let completed_today = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE status = 2 AND completed_at >= ?1",
                params![start_of_day],
                |row| row.get::<_, i32>(0),
            )
            .unwrap_or(0);
        let completed_week = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE status = 2 AND completed_at >= ?1",
                params![start_of_week],
                |row| row.get::<_, i32>(0),
            )
            .unwrap_or(0);

        // Focus time
        let total_focus_time: u32 = conn
            .query_row(
                "SELECT COALESCE(SUM(duration_minutes), 0) FROM focus_sessions WHERE completed = 1",
                [],
                |row| row.get::<_, u32>(0),
            )
            .unwrap_or(0);

        // Upcoming/Today counts
        let tasks_today = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE status != 2 AND deadline >= ?1 AND deadline < ?2",
                params![start_of_day, start_of_day + 86400000],
                |row| row.get::<_, i32>(0),
            )
            .unwrap_or(0);

        let tasks_week = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks WHERE status != 2 AND deadline >= ?1 AND deadline < ?2",
                params![start_of_week, start_of_week + (7 * 86400000)],
                |row| row.get::<_, i32>(0),
            )
            .unwrap_or(0);

        // Streaks
        let mut stmt = conn.prepare("SELECT DISTINCT DATE(datetime(completed_at/1000, 'unixepoch', 'localtime')) FROM tasks WHERE status = 2 ORDER BY completed_at DESC").map_err(|e| e.to_string())?;
        let dates: Vec<NaiveDate> = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?
            .filter_map(|d| d.ok())
            .filter_map(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok())
            .collect();

        let mut best_streak = 0;
        let mut current_streak = 0;
        let mut temp_streak;

        // Calculate streaks (dates are DESC)
        // For current streak: Check if today or yesterday is present
        let today = now_local.date_naive();

        // Simple streak logic
        if !dates.is_empty() {
            let mut iter = dates.iter();
            let first = *iter.next().unwrap();

            // If the latest completion is today or yesterday, streak is active
            if first == today || first == today.pred_opt().unwrap() {
                current_streak = 1;
                let mut prev = first;
                for &d in iter {
                    if d == prev.pred_opt().unwrap() {
                        current_streak += 1;
                        prev = d;
                    } else {
                        break;
                    }
                }
            }

            // Best streak (re-iterate everything)
            // Need ASC or just iterate
            temp_streak = 1;
            best_streak = 1;

            for i in 1..dates.len() {
                let d = dates[i];
                let prev = dates[i - 1]; // Prev in listing (which is later in time)

                // dates are DESC: 2023-10-05, 2023-10-04
                if d == prev.pred_opt().unwrap() {
                    temp_streak += 1;
                } else {
                    temp_streak = 1;
                }
                if temp_streak > best_streak {
                    best_streak = temp_streak;
                }
            }
        }

        Ok(UserStats {
            total_tasks: total,
            completed_tasks: done,
            completed_today,
            completed_week,
            best_streak,
            current_streak,
            total_focus_time,
            tasks_today,
            tasks_week,
            level: (done / 10) as u32 + 1,
            points: done * 20,
        })
    }

    // --- SUBTASKS ---

    pub fn get_subtasks(&self, task_id: &str) -> Result<Vec<Subtask>, String> {
        let conn = &self.conn;
        let mut stmt = conn
            .prepare("SELECT id, task_id, title, completed, sort_order, created_at FROM subtasks WHERE task_id = ?1 ORDER BY sort_order ASC, created_at ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![task_id], |row| {
                Ok(Subtask {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    title: row.get(2)?,
                    completed: row.get::<_, i32>(3)? != 0,
                    sort_order: row.get(4)?,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut res = Vec::new();
        for r in rows {
            res.push(r.map_err(|e| e.to_string())?);
        }
        Ok(res)
    }

    pub fn add_subtask(&self, task_id: &str, title: &str) -> Result<Subtask, String> {
        let conn = &self.conn;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        // Get next sort_order
        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM subtasks WHERE task_id = ?1",
                params![task_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO subtasks (id, task_id, title, completed, sort_order, created_at) VALUES (?1, ?2, ?3, 0, ?4, ?5)",
            params![id, task_id, title, max_order, now],
        )
        .map_err(|e| e.to_string())?;

        Ok(Subtask {
            id,
            task_id: task_id.to_string(),
            title: title.to_string(),
            completed: false,
            sort_order: max_order,
            created_at: now,
        })
    }

    pub fn toggle_subtask(&self, id: &str) -> Result<bool, String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE subtasks SET completed = 1 - completed WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;

        // Return new state
        let completed: i32 = conn
            .query_row(
                "SELECT completed FROM subtasks WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(completed != 0)
    }

    pub fn delete_subtask(&self, id: &str) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute("DELETE FROM subtasks WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn reorder_subtasks(&self, subtask_ids: &[String]) -> Result<(), String> {
        let conn = &self.conn;
        for (i, id) in subtask_ids.iter().enumerate() {
            conn.execute(
                "UPDATE subtasks SET sort_order = ?1 WHERE id = ?2",
                params![i as i32, id],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    // --- ARCHIVE ---

    pub fn archive_task(&self, id: &str) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET is_archived = 1 WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn unarchive_task(&self, id: &str) -> Result<(), String> {
        let conn = &self.conn;
        conn.execute(
            "UPDATE tasks SET is_archived = 0 WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- REORDER TASKS ---

    pub fn reorder_tasks(&self, task_ids: &[String]) -> Result<(), String> {
        let conn = &self.conn;
        for (i, id) in task_ids.iter().enumerate() {
            conn.execute(
                "UPDATE tasks SET sort_order = ?1 WHERE id = ?2",
                params![i as i32, id],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;

    #[test]
    fn test_next_date_daily() {
        let d = NaiveDate::from_ymd_opt(2023, 10, 1).unwrap(); // Sun
        assert_eq!(
            next_date_daily(d),
            NaiveDate::from_ymd_opt(2023, 10, 2).unwrap()
        );
    }

    #[test]
    fn test_next_date_weekdays() {
        let fri = NaiveDate::from_ymd_opt(2023, 10, 6).unwrap();
        assert_eq!(
            next_date_weekdays(fri),
            NaiveDate::from_ymd_opt(2023, 10, 9).unwrap()
        ); // Mon

        let sat = NaiveDate::from_ymd_opt(2023, 10, 7).unwrap();
        assert_eq!(
            next_date_weekdays(sat),
            NaiveDate::from_ymd_opt(2023, 10, 9).unwrap()
        ); // Mon

        let mon = NaiveDate::from_ymd_opt(2023, 10, 9).unwrap();
        assert_eq!(
            next_date_weekdays(mon),
            NaiveDate::from_ymd_opt(2023, 10, 10).unwrap()
        ); // Tue
    }

    #[test]
    fn test_next_date_custom() {
        let mon = NaiveDate::from_ymd_opt(2023, 10, 9).unwrap();
        // Mask: Wed(4)
        // Mon(1), Tue(2), Wed(4)
        // next_date_custom checks d+1 (Tue/2) -> no. d+2 (Wed/4) -> yes.
        let next = next_date_custom(mon, 4);
        assert_eq!(next, Some(NaiveDate::from_ymd_opt(2023, 10, 11).unwrap()));

        // Mask: Wed(4) | Fri(16) = 20
        // From Wed -> Fri
        let wed = NaiveDate::from_ymd_opt(2023, 10, 11).unwrap();
        let next_fri = next_date_custom(wed, 20);
        assert_eq!(
            next_fri,
            Some(NaiveDate::from_ymd_opt(2023, 10, 13).unwrap())
        );
    }
}
