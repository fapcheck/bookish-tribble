-- FocusFlow base schema
-- All *_at fields are UNIX milliseconds (ms)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority IN (0, 1, 2)),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority IN (0, 1, 2)),
  status INTEGER NOT NULL DEFAULT 0 CHECK (status IN (0, 1, 2)),
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  deadline INTEGER,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,

  -- JSON string: '["tag1","tag2"]'
  tags TEXT NOT NULL DEFAULT '[]',

  -- Reminders (ms)
  remind_at INTEGER,
  reminded_at INTEGER,

  -- Repeat rules:
  -- repeat_mode: NULL | 'daily' | 'weekdays' | 'custom'
  -- repeat_days_mask: bitmask for 'custom' mode (Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64)
  repeat_mode TEXT CHECK (repeat_mode IS NULL OR repeat_mode IN ('daily','weekdays','custom')),
  repeat_days_mask INTEGER CHECK (repeat_days_mask IS NULL OR repeat_days_mask >= 0),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pomodoro_length INTEGER NOT NULL,
  short_break_length INTEGER NOT NULL,
  long_break_length INTEGER NOT NULL,
  pomodoros_until_long_break INTEGER NOT NULL,
  sound_enabled INTEGER NOT NULL,
  auto_start_breaks INTEGER NOT NULL,
  auto_start_pomodoros INTEGER NOT NULL,
  global_shortcuts_enabled INTEGER NOT NULL,
  start_minimized INTEGER NOT NULL,
  close_to_tray INTEGER NOT NULL,

  reminder_lead_minutes INTEGER NOT NULL DEFAULT 30,

  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_remind_at ON tasks(remind_at);
CREATE INDEX IF NOT EXISTS idx_tasks_repeat_mode ON tasks(repeat_mode);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);