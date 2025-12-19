import { invoke } from "@tauri-apps/api/core";

export type Priority = "low" | "normal" | "high";
export type Status = "todo" | "doing" | "done";

export type DbHealth = {
  db_path: string;
  tables: string[];
  has_tasks: boolean;
  has_projects: boolean;
};

export type CompletionDay = {
  day: string; // YYYY-MM-DD (localtime in backend)
  count: number;
};

export type Task = {
  id: string;
  project_id?: string | null;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  created_at: number;
  completed_at?: number;
  deadline?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  tags: string[];

  remind_at?: number;
  reminded_at?: number;
};

export type NewTask = {
  id: string;
  project_id?: string | null;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  created_at: number;
  deadline?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  tags: string[];

  remind_at?: number;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  priority: Priority;
  created_at: number;
};

export type UserStats = {
  total_tasks: number;
  completed_tasks: number;

  completed_today: number;
  completed_week: number;
  best_streak: number;

  total_focus_time: number;
  tasks_today: number;
  tasks_week: number;
  current_streak: number;

  level: number;
  points: number;
};

export type AppSettings = {
  pomodoro_length: number;
  short_break_length: number;
  long_break_length: number;
  pomodoros_until_long_break: number;
  sound_enabled: boolean;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  global_shortcuts_enabled: boolean;
  start_minimized: boolean;
  close_to_tray: boolean;

  reminder_lead_minutes: number;
};

// ---- Debug ----
export function db_health() {
  return invoke<DbHealth>("db_health");
}

// ---- Calendar series (NEW) ----
export function get_completion_series(days: number) {
  return invoke<CompletionDay[]>("get_completion_series", { days });
}

// ---- Settings ----
export function get_settings() {
  return invoke<AppSettings>("get_settings");
}

export function save_settings(settings: AppSettings) {
  return invoke<void>("save_settings", { settings });
}

// ---- Reminders ----
export function set_task_remind_at(id: string, remindAt: number | null) {
  return invoke<void>("set_task_remind_at", { id, remindAt });
}

export function snooze_task_reminder(id: string, minutes: number) {
  return invoke<void>("snooze_task_reminder", { id, minutes });
}

// ---- Tasks ----
export function get_tasks(args: {
  limit?: number | null;
  statusFilter?: number | null;
  projectFilter?: string | null;
}) {
  return invoke<Task[]>("get_tasks", {
    limit: args.limit ?? null,
    statusFilter: args.statusFilter ?? null,
    projectFilter: args.projectFilter ?? null,
  });
}

export function add_task(newTask: NewTask) {
  return invoke<Task>("add_task", { newTask });
}

export function edit_task_title(id: string, title: string) {
  return invoke<void>("edit_task_title", { id, title });
}

export function update_task_priority(id: string, priority: Priority) {
  return invoke<void>("update_task_priority", { id, priority });
}

export function update_task_deadline(id: string, deadline: number | null) {
  return invoke<void>("update_task_deadline", { id, deadline });
}

export function update_task_status(taskId: string, newStatus: Status) {
  return invoke<void>("update_task_status", { taskId, newStatus });
}

export function delete_task(taskId: string) {
  return invoke<void>("delete_task", { taskId });
}

// ---- Projects ----
export function get_projects() {
  return invoke<Project[]>("get_projects");
}

export function add_project(name: string, color: string, priority: Priority) {
  return invoke<Project>("add_project", { name, color, priority });
}

export function edit_project(id: string, name: string) {
  return invoke<void>("edit_project", { id, name });
}

export function update_project_priority(id: string, priority: Priority) {
  return invoke<void>("update_project_priority", { id, priority });
}

export function delete_project(id: string) {
  return invoke<void>("delete_project", { id });
}

// ---- Stats ----
export function get_stats() {
  return invoke<UserStats>("get_stats");
}

// ---- Focus ----
export function start_focus_session(taskId: string) {
  return invoke<string>("start_focus_session", { taskId });
}

export function complete_focus_session(sessionId: string, durationMinutes: number) {
  return invoke<void>("complete_focus_session", { sessionId, durationMinutes });
}

export function cancel_focus_session(sessionId: string, durationMinutes: number) {
  return invoke<void>("cancel_focus_session", { sessionId, durationMinutes });
}

// ---- Window ----
export function toggle_window() {
  return invoke<void>("toggle_window");
}

export function minimize_window() {
  return invoke<void>("minimize_window");
}