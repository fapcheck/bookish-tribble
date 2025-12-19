-- FocusFlow base schema (safe to run on old DBs)
-- All *_at fields are UNIX milliseconds (ms)

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
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
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2)),
    status INTEGER NOT NULL CHECK (status IN (0, 1, 2)) DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    deadline INTEGER,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    tags TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
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
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);