-- Таблица задач
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2)),
    status INTEGER NOT NULL CHECK (status IN (0, 1, 2)) DEFAULT 0,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    tags TEXT
);

-- Таблица фокус-сессий
CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT 0,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at);

-- Триггеры для автоматического обновления
CREATE TRIGGER IF NOT EXISTS update_task_completed_at
AFTER UPDATE OF status ON tasks
WHEN NEW.status = 2 AND OLD.status != 2
BEGIN
    UPDATE tasks SET completed_at = strftime('%s', 'now') WHERE id = NEW.id;
END;