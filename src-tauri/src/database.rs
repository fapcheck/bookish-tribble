<<<<<<< HEAD
use rusqlite::{params, Connection};
use std::collections::HashSet;
use std::path::PathBuf;

use chrono::{Duration, NaiveDate};

=======
use rusqlite::{Connection, params};
use std::path::PathBuf;
>>>>>>> origin/main
use crate::models::*;

pub struct AppDatabase {
    db_path: PathBuf,
}

impl AppDatabase {
    pub fn new(app_dir: PathBuf) -> Result<Self, String> {
        let db_path = app_dir.join("focusflow.db");
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
<<<<<<< HEAD

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        Self::configure_sqlite(&conn)?;
        Self::migrate(&conn)?;

        Ok(AppDatabase { db_path })
    }

    fn configure_sqlite(conn: &Connection) -> Result<(), String> {
        conn.pragma_update(None, "foreign_keys", &"ON")
            .map_err(|e| e.to_string())?;
        conn.pragma_update(None, "journal_mode", &"WAL")
            .map_err(|e| e.to_string())?;
        conn.busy_timeout(std::time::Duration::from_secs(5))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
        let mut stmt = conn
            .prepare(&format!("PRAGMA table_info({})", table))
            .map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?;

        for c in iter {
            let name = c.map_err(|e| e.to_string())?;
            if name == column {
                return Ok(true);
            }
        }
        Ok(false)
    }

    fn migrate(conn: &Connection) -> Result<(), String> {
        // Base schema only (must not reference new columns!)
        conn.execute_batch(include_str!("../migrations/init.sql"))
            .map_err(|e| e.to_string())?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
               version INTEGER PRIMARY KEY,
               applied_at INTEGER NOT NULL
             );",
        )
        .map_err(|e| e.to_string())?;

        // Add reminder columns for existing DBs
        if !Self::column_exists(conn, "tasks", "remind_at")? {
            conn.execute("ALTER TABLE tasks ADD COLUMN remind_at INTEGER", [])
                .map_err(|e| e.to_string())?;
        }
        if !Self::column_exists(conn, "tasks", "reminded_at")? {
            conn.execute("ALTER TABLE tasks ADD COLUMN reminded_at INTEGER", [])
                .map_err(|e| e.to_string())?;
        }

        // Add settings default lead time for existing DBs
        if !Self::column_exists(conn, "settings", "reminder_lead_minutes")? {
            conn.execute(
                "ALTER TABLE settings ADD COLUMN reminder_lead_minutes INTEGER NOT NULL DEFAULT 30",
                [],
            )
            .map_err(|e| e.to_string())?;
        }

        // Create reminder index after column exists
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_remind_at ON tasks(remind_at)",
            [],
        )
        .map_err(|e| e.to_string())?;

        // Record schema version 3
        let v3_exists: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version = 3",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if v3_exists == 0 {
            let now_ms = chrono::Utc::now().timestamp_millis();
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?1)",
                params![now_ms],
            )
            .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn get_connection(&self) -> Result<Connection, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| e.to_string())?;
        Self::configure_sqlite(&conn)?;
        Self::migrate(&conn)?;
        Ok(conn)
    }

    // --- SETTINGS ---

    pub fn get_settings(&self) -> Result<AppSettings, String> {
        let conn = self.get_connection()?;

        let mut stmt = conn
            .prepare(
                "SELECT
                   pomodoro_length,
                   short_break_length,
                   long_break_length,
                   pomodoros_until_long_break,
                   sound_enabled,
                   auto_start_breaks,
                   auto_start_pomodoros,
                   global_shortcuts_enabled,
                   start_minimized,
                   close_to_tray,
                   reminder_lead_minutes
                 FROM settings
                 WHERE id = 1",
            )
            .map_err(|e| e.to_string())?;

        let row = stmt.query_row([], |row| {
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

        match row {
            Ok(s) => Ok(s),
            Err(_) => Ok(AppSettings::default()),
        }
    }

    pub fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        let conn = self.get_connection()?;
        let now_ms = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO settings (
               id,
               pomodoro_length,
               short_break_length,
               long_break_length,
               pomodoros_until_long_break,
               sound_enabled,
               auto_start_breaks,
               auto_start_pomodoros,
               global_shortcuts_enabled,
               start_minimized,
               close_to_tray,
               reminder_lead_minutes,
               updated_at
             ) VALUES (
               1, ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12
             )
             ON CONFLICT(id) DO UPDATE SET
               pomodoro_length = excluded.pomodoro_length,
               short_break_length = excluded.short_break_length,
               long_break_length = excluded.long_break_length,
               pomodoros_until_long_break = excluded.pomodoros_until_long_break,
               sound_enabled = excluded.sound_enabled,
               auto_start_breaks = excluded.auto_start_breaks,
               auto_start_pomodoros = excluded.auto_start_pomodoros,
               global_shortcuts_enabled = excluded.global_shortcuts_enabled,
               start_minimized = excluded.start_minimized,
               close_to_tray = excluded.close_to_tray,
               reminder_lead_minutes = excluded.reminder_lead_minutes,
               updated_at = excluded.updated_at",
            params![
                settings.pomodoro_length as i64,
                settings.short_break_length as i64,
                settings.long_break_length as i64,
                settings.pomodoros_until_long_break as i64,
                if settings.sound_enabled { 1 } else { 0 },
                if settings.auto_start_breaks { 1 } else { 0 },
                if settings.auto_start_pomodoros { 1 } else { 0 },
                if settings.global_shortcuts_enabled { 1 } else { 0 },
                if settings.start_minimized { 1 } else { 0 },
                if settings.close_to_tray { 1 } else { 0 },
                settings.reminder_lead_minutes as i64,
                now_ms
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    // --- REMINDERS ---

    pub fn set_task_remind_at(&self, id: &str, remind_at: Option<i64>) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute(
            "UPDATE tasks SET remind_at = ?1, reminded_at = NULL WHERE id = ?2",
            params![remind_at, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn snooze_task(&self, id: &str, snooze_minutes: i64) -> Result<(), String> {
        let conn = self.get_connection()?;
        let now_ms = chrono::Utc::now().timestamp_millis();
        let snooze_ms = snooze_minutes.max(1) * 60_000;
        let next = now_ms + snooze_ms;

        conn.execute(
            "UPDATE tasks SET remind_at = ?1, reminded_at = NULL WHERE id = ?2",
            params![next, id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_due_reminders(&self, now_ms: i64) -> Result<Vec<Task>, String> {
        let conn = self.get_connection()?;

        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline,
                        estimated_minutes, actual_minutes, tags, remind_at, reminded_at
                 FROM tasks
                 WHERE status != 2
                   AND remind_at IS NOT NULL
                   AND remind_at <= ?1
                 ORDER BY remind_at ASC
                 LIMIT 20",
            )
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map(params![now_ms], |row| {
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
                    estimated_minutes: row.get(9)?,
                    actual_minutes: row.get(10)?,
                    tags: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
                    remind_at: row.get(12)?,
                    reminded_at: row.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut out = Vec::new();
        for r in iter {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    pub fn mark_reminded(&self, ids: &[String], now_ms: i64) -> Result<(), String> {
        if ids.is_empty() {
            return Ok(());
        }

        let mut conn = self.get_connection()?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        for id in ids {
            tx.execute(
                "UPDATE tasks SET reminded_at = ?1, remind_at = NULL WHERE id = ?2",
                params![now_ms, id],
            )
            .map_err(|e| e.to_string())?;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- FOCUS SESSIONS ---

    pub fn start_focus_session(&self, task_id: String) -> Result<String, String> {
        let conn = self.get_connection()?;
        let id = uuid::Uuid::new_v4().to_string();
        let started_at = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO focus_sessions (id, task_id, duration_minutes, completed, started_at, ended_at)
             VALUES (?1, ?2, 0, 0, ?3, NULL)",
            params![id, task_id, started_at],
        )
        .map_err(|e| e.to_string())?;

        Ok(id)
    }

    pub fn finish_focus_session(&self, session_id: String, duration_minutes: i32, completed: bool) -> Result<(), String> {
        let conn = self.get_connection()?;
        let ended_at = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "UPDATE focus_sessions
             SET duration_minutes = ?1, completed = ?2, ended_at = ?3
             WHERE id = ?4",
            params![duration_minutes, if completed { 1 } else { 0 }, ended_at, session_id],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    // --- PROJECTS ---

    pub fn add_project(&self, id: String, name: String, color: String, priority: Priority) -> Result<Project, String> {
        let conn = self.get_connection()?;
        let created_at = chrono::Utc::now().timestamp_millis();

        conn.execute(
            "INSERT INTO projects (id, name, color, priority, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, color, priority as i32, created_at],
        )
        .map_err(|e| e.to_string())?;

=======
        
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute_batch(include_str!("../migrations/init.sql"))
            .map_err(|e| e.to_string())?;
        Ok(AppDatabase { db_path })
    }

    pub fn get_connection(&self) -> Result<Connection, String> {
        Connection::open(&self.db_path).map_err(|e| e.to_string())
    }

    // --- ПРОЕКТЫ ---

    pub fn add_project(&self, id: String, name: String, color: String, priority: Priority) -> Result<Project, String> {
        let conn = self.get_connection()?;
        let created_at = chrono::Utc::now().timestamp();
        
        conn.execute(
            "INSERT INTO projects (id, name, color, priority, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, color, priority as i32, created_at]
        ).map_err(|e| e.to_string())?;
>>>>>>> origin/main
        Ok(Project { id, name, color, priority, created_at })
    }

    pub fn update_project(&self, id: &str, name: String) -> Result<(), String> {
        let conn = self.get_connection()?;
<<<<<<< HEAD
        conn.execute("UPDATE projects SET name = ?1 WHERE id = ?2", params![name, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_project_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE projects SET priority = ?1 WHERE id = ?2", params![priority as i32, id])
            .map_err(|e| e.to_string())?;
=======
        conn.execute(
            "UPDATE projects SET name = ?1 WHERE id = ?2",
            params![name, id]
        ).map_err(|e| e.to_string())?;
>>>>>>> origin/main
        Ok(())
    }

    pub fn get_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.get_connection()?;
<<<<<<< HEAD
        let mut stmt = conn
            .prepare(
                "SELECT id, name, color, priority, created_at
                 FROM projects
                 ORDER BY priority DESC, created_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let iter = stmt
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

        let mut projects = Vec::new();
        for p in iter {
=======
        let mut stmt = conn.prepare("SELECT id, name, color, priority, created_at FROM projects ORDER BY priority DESC, created_at DESC").map_err(|e| e.to_string())?;
        let project_iter = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                priority: Priority::from_int(row.get(3)?),
                created_at: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut projects = Vec::new();
        for p in project_iter {
>>>>>>> origin/main
            projects.push(p.map_err(|e| e.to_string())?);
        }
        Ok(projects)
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.get_connection()?;
<<<<<<< HEAD
        conn.execute("DELETE FROM projects WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- TASKS ---
=======
        conn.execute("DELETE FROM projects WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- ЗАДАЧИ ---
>>>>>>> origin/main

    pub fn add_task(&self, task: &NewTask) -> Result<Task, String> {
        let conn = self.get_connection()?;
        let tags_json = serde_json::to_string(&task.tags).map_err(|e| e.to_string())?;
<<<<<<< HEAD

        let mut stmt = conn
            .prepare(
                "INSERT INTO tasks (id, project_id, title, description, priority, status, created_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, NULL)
                 RETURNING id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at",
            )
            .map_err(|e| e.to_string())?;

        let row = stmt
            .query_row(
                params![
                    task.id,
                    task.project_id,
                    task.title,
                    task.description,
                    task.priority as i32,
                    task.status as i32,
                    task.created_at,
                    task.deadline,
                    task.estimated_minutes,
                    task.actual_minutes,
                    tags_json,
                    task.remind_at
                ],
                |row| {
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
                        estimated_minutes: row.get(9)?,
                        actual_minutes: row.get(10)?,
                        tags: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
                        remind_at: row.get(12)?,
                        reminded_at: row.get(13)?,
                    })
                },
            )
            .map_err(|e| e.to_string())?;

        Ok(row)
=======
        
        let mut stmt = conn.prepare(
            "INSERT INTO tasks (id, project_id, title, description, priority, status, created_at, deadline, estimated_minutes, actual_minutes, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             RETURNING id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags"
        ).map_err(|e| e.to_string())?;
        let task_row = stmt.query_row(params![
            task.id,
            task.project_id,
            task.title,
            task.description,
            task.priority as i32,
            task.status as i32,
            task.created_at,
            task.deadline,
            task.estimated_minutes,
            task.actual_minutes,
            tags_json
        ], |row| {
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
                estimated_minutes: row.get(9)?,
                actual_minutes: row.get(10)?,
                tags: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
            })
        }).map_err(|e| e.to_string())?;

        Ok(task_row)
>>>>>>> origin/main
    }

    pub fn update_task_title(&self, id: &str, title: String) -> Result<(), String> {
        let conn = self.get_connection()?;
<<<<<<< HEAD
        conn.execute("UPDATE tasks SET title = ?1 WHERE id = ?2", params![title, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("UPDATE tasks SET priority = ?1 WHERE id = ?2", params![priority as i32, id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_deadline(&self, id: &str, deadline: Option<i64>) -> Result<(), String> {
        let conn = self.get_connection()?;

        let settings = self.get_settings().unwrap_or_default();
        let now_ms = chrono::Utc::now().timestamp_millis();

        let remind_at: Option<i64> = deadline.map(|d| {
            let lead_ms = (settings.reminder_lead_minutes as i64) * 60_000;
            let t = d - lead_ms;
            if t < now_ms { now_ms } else { t }
        });

        conn.execute(
            "UPDATE tasks
             SET deadline = ?1,
                 remind_at = ?2,
                 reminded_at = NULL
             WHERE id = ?3",
            params![deadline, remind_at, id],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn update_task_status(&self, task_id: &str, new_status: Status) -> Result<(), String> {
        let conn = self.get_connection()?;
        let completed_at = match new_status {
            Status::Done => Some(chrono::Utc::now().timestamp_millis()),
            _ => None,
        };

        if new_status == Status::Done {
            conn.execute(
                "UPDATE tasks SET status = ?, completed_at = ?, remind_at = NULL WHERE id = ?",
                params![new_status as i32, completed_at, task_id],
            )
            .map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
                params![new_status as i32, completed_at, task_id],
            )
            .map_err(|e| e.to_string())?;
        }

=======
        conn.execute(
            "UPDATE tasks SET title = ?1 WHERE id = ?2",
            params![title, id]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Новое: обновление приоритета
    pub fn update_task_priority(&self, id: &str, priority: Priority) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute(
            "UPDATE tasks SET priority = ?1 WHERE id = ?2",
            params![priority as i32, id]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    // Новое: обновление дедлайна
    pub fn update_task_deadline(&self, id: &str, deadline: Option<i64>) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute(
            "UPDATE tasks SET deadline = ?1 WHERE id = ?2",
            params![deadline, id]
        ).map_err(|e| e.to_string())?;
>>>>>>> origin/main
        Ok(())
    }

    pub fn get_tasks(&self, limit: Option<i32>, status_filter: Option<Status>, project_filter: Option<String>) -> Result<Vec<Task>, String> {
        let conn = self.get_connection()?;
<<<<<<< HEAD

        let mut sql = "SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags, remind_at, reminded_at FROM tasks".to_string();
=======
        let mut sql = "SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags FROM tasks".to_string();
>>>>>>> origin/main
        let mut params_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut conditions = Vec::new();

        if let Some(status) = status_filter {
            conditions.push("status = ?");
            params_values.push(Box::new(status as i32));
        }
<<<<<<< HEAD
=======

>>>>>>> origin/main
        if let Some(proj_id) = project_filter {
            conditions.push("project_id = ?");
            params_values.push(Box::new(proj_id));
        }
<<<<<<< HEAD
=======
        
>>>>>>> origin/main
        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }
<<<<<<< HEAD

        sql.push_str(" ORDER BY priority DESC, deadline ASC, created_at DESC");
=======
        
        sql.push_str(" ORDER BY priority DESC, deadline ASC, created_at DESC");

>>>>>>> origin/main
        if let Some(limit_val) = limit {
            sql.push_str(" LIMIT ?");
            params_values.push(Box::new(limit_val));
        }
<<<<<<< HEAD

        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let iter = stmt
            .query_map(rusqlite::params_from_iter(params_values.iter()), |row| {
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
                    estimated_minutes: row.get(9)?,
                    actual_minutes: row.get(10)?,
                    tags: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
                    remind_at: row.get(12)?,
                    reminded_at: row.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut tasks = Vec::new();
        for t in iter {
            tasks.push(t.map_err(|e| e.to_string())?);
        }
        Ok(tasks)
    }

=======
        
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let task_iter = stmt.query_map(rusqlite::params_from_iter(params_values.iter()), |row| {
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
                estimated_minutes: row.get(9)?,
                actual_minutes: row.get(10)?,
                tags: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or_default(),
            })
        }).map_err(|e| e.to_string())?;

        let mut tasks = Vec::new();
        for task_result in task_iter {
            tasks.push(task_result.map_err(|e| e.to_string())?);
        }
        
        Ok(tasks)
    }

    pub fn update_task_status(&self, task_id: &str, new_status: Status) -> Result<(), String> {
        let conn = self.get_connection()?;
        let completed_at = match new_status {
            Status::Done => Some(chrono::Utc::now().timestamp()),
            _ => None,
        };
        conn.execute(
            "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
            params![new_status as i32, completed_at, task_id]
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

>>>>>>> origin/main
    pub fn delete_task(&self, task_id: &str) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("DELETE FROM tasks WHERE id = ?", params![task_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

<<<<<<< HEAD
    // --- COMPLETION SERIES (USED BY STATS HEATMAP) ---
    pub fn get_completion_series(&self, days: i32) -> Result<Vec<(String, i32)>, String> {
        let conn = self.get_connection()?;
        let days = if days <= 0 { 1 } else { days };
        let back = format!("-{} days", days - 1);

        let mut stmt = conn
            .prepare(
                "SELECT
                   DATE(datetime(completed_at / 1000, 'unixepoch', 'localtime')) AS day,
                   COUNT(*) AS count
                 FROM tasks
                 WHERE completed_at IS NOT NULL
                   AND day >= DATE('now', 'localtime', ?1)
                 GROUP BY day
                 ORDER BY day ASC",
            )
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map(params![back], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as i32))
            })
            .map_err(|e| e.to_string())?;

        let mut out = Vec::new();
        for r in iter {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    // --- STATS (streaks + calendar counts) ---
    pub fn get_stats(&self) -> Result<UserStats, String> {
        let conn = self.get_connection()?;

        let total_tasks: i32 = conn
            .query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0))
            .unwrap_or(0);

        let completed_tasks: i32 = conn
            .query_row("SELECT COUNT(*) FROM tasks WHERE status = 2", [], |row| row.get(0))
            .unwrap_or(0);

        let total_focus_time: i32 = conn
            .query_row(
                "SELECT COALESCE(SUM(duration_minutes), 0)
                 FROM focus_sessions
                 WHERE completed = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let tasks_today: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks
                 WHERE DATE(datetime(created_at / 1000, 'unixepoch', 'localtime')) = DATE('now', 'localtime')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let tasks_week: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks
                 WHERE DATE(datetime(created_at / 1000, 'unixepoch', 'localtime')) >= DATE('now', 'localtime', '-6 days')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let completed_today: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks
                 WHERE completed_at IS NOT NULL
                   AND DATE(datetime(completed_at / 1000, 'unixepoch', 'localtime')) = DATE('now', 'localtime')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let completed_week: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM tasks
                 WHERE completed_at IS NOT NULL
                   AND DATE(datetime(completed_at / 1000, 'unixepoch', 'localtime')) >= DATE('now', 'localtime', '-6 days')",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let mut stmt = conn
            .prepare(
                "SELECT DATE(datetime(completed_at / 1000, 'unixepoch', 'localtime')) AS day
                 FROM tasks
                 WHERE completed_at IS NOT NULL
                 GROUP BY day
                 ORDER BY day ASC",
            )
            .map_err(|e| e.to_string())?;

        let iter = stmt
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;

        let mut days: Vec<NaiveDate> = Vec::new();
        for d in iter {
            let s = d.map_err(|e| e.to_string())?;
            if let Ok(parsed) = NaiveDate::parse_from_str(&s, "%Y-%m-%d") {
                days.push(parsed);
            }
        }

        let mut best_streak: u32 = 0;
        let mut run: u32 = 0;
        let mut prev: Option<NaiveDate> = None;

        for day in &days {
            if let Some(p) = prev {
                if *day == p + Duration::days(1) {
                    run += 1;
                } else {
                    run = 1;
                }
            } else {
                run = 1;
            }
            if run > best_streak {
                best_streak = run;
            }
            prev = Some(*day);
        }

        let today_str: String = conn
            .query_row("SELECT DATE('now', 'localtime')", [], |row| row.get(0))
            .unwrap_or_else(|_| "1970-01-01".to_string());

        let today = NaiveDate::parse_from_str(&today_str, "%Y-%m-%d")
            .unwrap_or_else(|_| NaiveDate::from_ymd_opt(1970, 1, 1).unwrap());

        let set: HashSet<NaiveDate> = days.into_iter().collect();
        let mut current_streak: u32 = 0;
        let mut cursor = today;

        while set.contains(&cursor) {
            current_streak += 1;
            cursor = cursor - Duration::days(1);
        }

        Ok(UserStats {
            total_tasks,
            completed_tasks,
            completed_today,
            completed_week,
            best_streak,
            total_focus_time: total_focus_time as u32,
            tasks_today,
            tasks_week,
            current_streak,
            level: (completed_tasks / 10) as u32 + 1,
            points: completed_tasks * 20,
        })
    }

    pub fn db_path(&self) -> &PathBuf {
        &self.db_path
    }
=======
    pub fn get_stats(&self) -> Result<UserStats, String> {
        let conn = self.get_connection()?;
        let total_tasks: i32 = conn.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0)).unwrap_or(0);
        let completed_tasks: i32 = conn.query_row("SELECT COUNT(*) FROM tasks WHERE status = 2", [], |row| row.get(0)).unwrap_or(0);
        let total_focus_time: i32 = conn.query_row("SELECT COALESCE(SUM(duration_minutes), 0) FROM focus_sessions WHERE completed = 1", [], |row| row.get(0)).unwrap_or(0);
        let tasks_today: i32 = conn.query_row("SELECT COUNT(*) FROM tasks WHERE DATE(datetime(created_at, 'unixepoch')) = DATE('now')", [], |row| row.get(0)).unwrap_or(0);
        let tasks_week: i32 = conn.query_row("SELECT COUNT(*) FROM tasks WHERE DATE(datetime(created_at, 'unixepoch')) >= DATE('now', '-7 days')", [], |row| row.get(0)).unwrap_or(0);
        Ok(UserStats {
            total_tasks,
            completed_tasks,
            total_focus_time: total_focus_time as u32,
            tasks_today,
            tasks_week,
            current_streak: 0, 
            level: (completed_tasks / 10) as u32 + 1,
            points: completed_tasks * 20, 
        })
    }
>>>>>>> origin/main
}