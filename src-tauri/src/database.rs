use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use crate::models::*;

pub struct AppDatabase {
    db_path: PathBuf,
}

impl AppDatabase {
    pub fn new(app_dir: PathBuf) -> Result<Self> {
        let db_path = app_dir.join("focusflow.db");
        
        // Создаем директорию если не существует
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        
        let conn = Connection::open(&db_path)?;
        
        // Создаем таблицы
        conn.execute_batch(include_str!("../migrations/init.sql"))?;
        
        Ok(AppDatabase { db_path })
    }

    pub fn get_connection(&self) -> Result<&Connection> {
        // Для простоты возвращаем новое соединение
        // В продакшене лучше использовать пул соединений
        Ok(&Connection::open(&self.db_path)?)
    }

    // Методы для работы с задачами
    pub fn add_task(&self, task: &NewTask) -> Result<Task> {
        let conn = self.get_connection()?;
        
        let stmt = conn.prepare(
            "INSERT INTO tasks (id, title, description, priority, status, created_at, estimated_minutes, actual_minutes, tags)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             RETURNING id, title, description, priority, status, created_at, completed_at, estimated_minutes, actual_minutes, tags"
        )?;
        
        let tags_json = serde_json::to_string(&task.tags)?;
        
        let task_row = stmt.query_row(params![
            task.id,
            task.title,
            task.description,
            task.priority as i32,
            task.status as i32,
            task.created_at,
            task.estimated_minutes,
            task.actual_minutes,
            tags_json
        ], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                priority: Priority::from_int(row.get(3)?),
                status: Status::from_int(row.get(4)?),
                created_at: row.get(5)?,
                completed_at: row.get(6)?,
                estimated_minutes: row.get(7)?,
                actual_minutes: row.get(8)?,
                tags: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
            })
        })?;
        
        Ok(task_row)
    }

    pub fn get_tasks(&self, limit: Option<i32>, status_filter: Option<Status>) -> Result<Vec<Task>> {
        let conn = self.get_connection()?;
        
        let mut sql = "SELECT id, title, description, priority, status, created_at, completed_at, estimated_minutes, actual_minutes, tags FROM tasks".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(status) = status_filter {
            sql.push_str(" WHERE status = ?");
            params_vec.push(Box::new(status as i32));
        }
        
        sql.push_str(" ORDER BY created_at DESC");
        
        if let Some(limit_val) = limit {
            sql.push_str(" LIMIT ?");
            params_vec.push(Box::new(limit_val));
        }
        
        let mut stmt = conn.prepare(&sql)?;
        
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
        
        let task_iter = stmt.query_map(params_refs, |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                priority: Priority::from_int(row.get(3)?),
                status: Status::from_int(row.get(4)?),
                created_at: row.get(5)?,
                completed_at: row.get(6)?,
                estimated_minutes: row.get(7)?,
                actual_minutes: row.get(8)?,
                tags: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
            })
        })?;
        
        let mut tasks = Vec::new();
        for task_result in task_iter {
            tasks.push(task_result?);
        }
        
        Ok(tasks)
    }

    pub fn update_task_status(&self, task_id: &str, new_status: Status) -> Result<()> {
        let conn = self.get_connection()?;
        
        let completed_at = match new_status {
            Status::Done => Some(chrono::Utc::now().timestamp()),
            _ => None,
        };
        
        conn.execute(
            "UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?",
            params![new_status as i32, completed_at, task_id]
        )?;
        
        Ok(())
    }

    pub fn delete_task(&self, task_id: &str) -> Result<()> {
        let conn = self.get_connection()?;
        
        conn.execute("DELETE FROM tasks WHERE id = ?", params![task_id])?;
        
        Ok(())
    }

    // Методы для фокус-сессий
    pub fn add_focus_session(&self, session: &NewFocusSession) -> Result<FocusSession> {
        let conn = self.get_connection()?;
        
        let stmt = conn.prepare(
            "INSERT INTO focus_sessions (id, task_id, duration_minutes, completed, started_at, ended_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             RETURNING id, task_id, duration_minutes, completed, started_at, ended_at"
        )?;
        
        let session_row = stmt.query_row(params![
            session.id,
            session.task_id,
            session.duration_minutes,
            session.completed,
            session.started_at,
            session.ended_at
        ], |row| {
            Ok(FocusSession {
                id: row.get(0)?,
                task_id: row.get(1)?,
                duration_minutes: row.get(2)?,
                completed: row.get(3)?,
                started_at: row.get(4)?,
                ended_at: row.get(5)?,
            })
        })?;
        
        Ok(session_row)
    }

    pub fn update_focus_session(
        &self,
        session_id: &str,
        duration_minutes: u32,
        completed: bool,
        ended_at: i64
    ) -> Result<()> {
        let conn = self.get_connection()?;
        
        conn.execute(
            "UPDATE focus_sessions SET duration_minutes = ?, completed = ?, ended_at = ? WHERE id = ?",
            params![duration_minutes, completed, ended_at, session_id]
        )?;
        
        Ok(())
    }

    pub fn get_focus_sessions(&self, days: Option<i32>) -> Result<Vec<FocusSession>> {
        let conn = self.get_connection()?;
        
        let mut sql = "SELECT id, task_id, duration_minutes, completed, started_at, ended_at FROM focus_sessions".to_string();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
        
        if let Some(days_val) = days {
            sql.push_str(" WHERE started_at >= ?");
            params.push(Box::new(chrono::Utc::now().timestamp() - (days_val as i64 * 24 * 60 * 60)));
        }
        
        sql.push_str(" ORDER BY started_at DESC");
        
        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|b| b.as_ref()).collect();
        
        let session_iter = stmt.query_map(params_refs, |row| {
            Ok(FocusSession {
                id: row.get(0)?,
                task_id: row.get(1)?,
                duration_minutes: row.get(2)?,
                completed: row.get(3)?,
                started_at: row.get(4)?,
                ended_at: row.get(5)?,
            })
        })?;
        
        let mut sessions = Vec::new();
        for session_result in session_iter {
            sessions.push(session_result?);
        }
        
        Ok(sessions)
    }

    // Статистика
    pub fn get_stats(&self) -> Result<UserStats> {
        let conn = self.get_connection()?;
        
        // Общее количество задач
        let total_tasks: i32 = conn.query_row(
            "SELECT COUNT(*) FROM tasks", 
            [], 
            |row| row.get(0)
        )?;
        
        // Выполненные задачи
        let completed_tasks: i32 = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE status = 2", 
            [], 
            |row| row.get(0)
        )?;
        
        // Общее время в фокусе (в минутах)
        let total_focus_time: i32 = conn.query_row(
            "SELECT SUM(duration_minutes) FROM focus_sessions WHERE completed = 1", 
            [], 
            |row| row.get(0).unwrap_or(0)
        )?;
        
        // Задачи за сегодня
        let tasks_today: i32 = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE DATE(datetime(created_at, 'unixepoch')) = DATE('now')", 
            [], 
            |row| row.get(0)
        )?;
        
        // Задачи за неделю
        let tasks_week: i32 = conn.query_row(
            "SELECT COUNT(*) FROM tasks WHERE DATE(datetime(created_at, 'unixepoch')) >= DATE('now', '-7 days')", 
            [], 
            |row| row.get(0)
        )?;
        
        Ok(UserStats {
            total_tasks,
            completed_tasks,
            total_focus_time: total_focus_time as u32,
            tasks_today,
            tasks_week,
            current_streak: 0, // TODO: реализовать расчет стрика
            level: (completed_tasks / 10) as u32 + 1,
            points: completed_tasks * 20, // 20 очков за задачу
        })
    }
}