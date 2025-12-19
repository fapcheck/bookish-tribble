use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[repr(i32)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low = 0,
    Normal = 1,
    High = 2,
}

impl Priority {
    pub fn from_int(val: i32) -> Self {
        match val {
            0 => Priority::Low,
            1 => Priority::Normal,
            2 => Priority::High,
            _ => Priority::Normal,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[repr(i32)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Todo = 0,
    Doing = 1,
    Done = 2,
}

impl Status {
    pub fn from_int(val: i32) -> Self {
        match val {
            0 => Status::Todo,
            1 => Status::Doing,
            2 => Status::Done,
            _ => Status::Todo,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub color: String,
    pub priority: Priority,
    pub created_at: i64, // UNIX ms
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: Priority,
    pub status: Status,
    pub created_at: i64,           // UNIX ms
    pub completed_at: Option<i64>, // UNIX ms
    pub deadline: Option<i64>,     // UNIX ms
    pub estimated_minutes: Option<u32>,
    pub actual_minutes: Option<u32>,
    pub tags: Vec<String>,

    pub remind_at: Option<i64>,   // UNIX ms
    pub reminded_at: Option<i64>, // UNIX ms

    // repeat
    pub repeat_mode: Option<String>,     // "daily" | "weekdays" | "custom"
    pub repeat_days_mask: Option<i64>,   // bitmask for "custom"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTask {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: Priority,
    pub status: Status,
    pub created_at: i64, // UNIX ms
    pub deadline: Option<i64>,
    pub estimated_minutes: Option<u32>,
    pub actual_minutes: Option<u32>,
    pub tags: Vec<String>,

    pub remind_at: Option<i64>,

    pub repeat_mode: Option<String>,
    pub repeat_days_mask: Option<i64>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSession {
    pub id: String,
    pub task_id: String,
    pub duration_minutes: i32,
    pub completed: bool,
    pub started_at: i64,       // UNIX ms
    pub ended_at: Option<i64>, // UNIX ms
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStats {
    pub total_tasks: i32,
    pub completed_tasks: i32,

    pub completed_today: i32,
    pub completed_week: i32,
    pub best_streak: u32,

    pub total_focus_time: u32, // minutes
    pub tasks_today: i32,
    pub tasks_week: i32,
    pub current_streak: u32,

    pub level: u32,
    pub points: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub pomodoro_length: u32,
    pub short_break_length: u32,
    pub long_break_length: u32,
    pub pomodoros_until_long_break: u32,
    pub sound_enabled: bool,
    pub auto_start_breaks: bool,
    pub auto_start_pomodoros: bool,
    pub global_shortcuts_enabled: bool,
    pub start_minimized: bool,
    pub close_to_tray: bool,

    pub reminder_lead_minutes: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            pomodoro_length: 25,
            short_break_length: 5,
            long_break_length: 15,
            pomodoros_until_long_break: 4,
            sound_enabled: true,
            auto_start_breaks: false,
            auto_start_pomodoros: false,
            global_shortcuts_enabled: true,
            start_minimized: false,
            close_to_tray: true,
            reminder_lead_minutes: 30,
        }
    }
}