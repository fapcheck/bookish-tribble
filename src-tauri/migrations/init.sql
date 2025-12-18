CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1, -- Добавили приоритет
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

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);

CREATE TRIGGER IF NOT EXISTS update_task_completed_at
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 2 AND OLD.status != 2
BEGIN
    UPDATE tasks SET completed_at = strftime('%s', 'now') WHERE id = NEW.id;
END;