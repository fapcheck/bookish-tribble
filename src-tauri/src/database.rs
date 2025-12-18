use rusqlite::{Connection, params};
use std::path::PathBuf;
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
        
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        
        conn.execute_batch(include_str!("../migrations/init.sql"))
            .map_err(|e| e.to_string())?;

        Ok(AppDatabase { db_path })
    }

    pub fn get_connection(&self) -> Result<Connection, String> {
        Connection::open(&self.db_path).map_err(|e| e.to_string())
    }

    // --- ПРОЕКТЫ ---

    pub fn add_project(&self, id: String, name: String, color: String) -> Result<Project, String> {
        let conn = self.get_connection()?;
        let created_at = chrono::Utc::now().timestamp();
        
        conn.execute(
            "INSERT INTO projects (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, name, color, created_at]
        ).map_err(|e| e.to_string())?;
        
        Ok(Project { id, name, color, created_at })
    }

    pub fn get_projects(&self) -> Result<Vec<Project>, String> {
        let conn = self.get_connection()?;
        let mut stmt = conn.prepare("SELECT id, name, color, created_at FROM projects ORDER BY created_at DESC").map_err(|e| e.to_string())?;
        
        let project_iter = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                created_at: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut projects = Vec::new();
        for p in project_iter {
            projects.push(p.map_err(|e| e.to_string())?);
        }
        Ok(projects)
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("DELETE FROM projects WHERE id = ?", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    // --- ЗАДАЧИ ---

    pub fn add_task(&self, task: &NewTask) -> Result<Task, String> {
        let conn = self.get_connection()?;
        let tags_json = serde_json::to_string(&task.tags).map_err(|e| e.to_string())?;
        
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
    }

    pub fn get_tasks(&self, limit: Option<i32>, status_filter: Option<Status>, project_filter: Option<String>) -> Result<Vec<Task>, String> {
        let conn = self.get_connection()?;
        let mut sql = "SELECT id, project_id, title, description, priority, status, created_at, completed_at, deadline, estimated_minutes, actual_minutes, tags FROM tasks".to_string();
        
        let mut params_values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        let mut conditions = Vec::new();

        if let Some(status) = status_filter {
            conditions.push("status = ?");
            params_values.push(Box::new(status as i32));
        }

        if let Some(proj_id) = project_filter {
            conditions.push("project_id = ?");
            params_values.push(Box::new(proj_id));
        }
        
        if !conditions.is_empty() {
            sql.push_str(" WHERE ");
            sql.push_str(&conditions.join(" AND "));
        }
        
        sql.push_str(" ORDER BY created_at DESC");
        
        if let Some(limit_val) = limit {
            sql.push_str(" LIMIT ?");
            params_values.push(Box::new(limit_val));
        }
        
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

    pub fn delete_task(&self, task_id: &str) -> Result<(), String> {
        let conn = self.get_connection()?;
        conn.execute("DELETE FROM tasks WHERE id = ?", params![task_id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

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
}