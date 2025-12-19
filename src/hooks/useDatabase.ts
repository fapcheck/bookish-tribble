import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import * as tauri from "../lib/tauri";

export type Priority = tauri.Priority;
export type Status = tauri.Status;

export type Project = tauri.Project;
export type Task = tauri.Task;
export type NewTask = tauri.NewTask;
export type UserStats = tauri.UserStats;
export type AppSettings = tauri.AppSettings;

type DataChanged = {
  entity: "tasks" | "projects" | "stats" | "settings";
  action: "add" | "edit" | "delete" | "status" | "refresh";
  id?: string | null;
};

export function useDatabase() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadScheduledRef = useRef(false);
  const mountedRef = useRef(false);

  const loadData = useCallback(async () => {
    const [tasksData, projectsData, statsData, settingsData] = await Promise.all([
      tauri.get_tasks({ limit: 1000, statusFilter: null, projectFilter: null }),
      tauri.get_projects(),
      tauri.get_stats(),
      tauri.get_settings(),
    ]);

    setTasks(tasksData);
    setProjects(projectsData);
    setStats(statsData);
    setSettings(settingsData);
    setIsLoaded(true);
  }, []);

  const scheduleReload = useCallback(() => {
    if (reloadScheduledRef.current) return;
    reloadScheduledRef.current = true;

    setTimeout(() => {
      reloadScheduledRef.current = false;
      if (!mountedRef.current) return;
      loadData().catch((e) => console.error("Reload failed:", e));
    }, 50);
  }, [loadData]);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      try {
        const health = await tauri.db_health();
        console.log("[db_health]", health);

        await loadData();

        const unlisten = await listen<DataChanged>("data:changed", () => {
          scheduleReload();
        });

        return () => {
          unlisten();
        };
      } catch (e) {
        console.error("Startup failed:", e);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [loadData, scheduleReload]);

  const saveSettings = async (newSettings: AppSettings) => {
    await tauri.save_settings(newSettings);
    setSettings(newSettings);
  };

  const addProject = async (name: string, color: string, priority: Priority) =>
    tauri.add_project(name, color, priority);

  const editProject = async (id: string, name: string) => tauri.edit_project(id, name);

  const updateProjectPriority = async (id: string, priority: Priority) =>
    tauri.update_project_priority(id, priority);

  const deleteProject = async (id: string) => tauri.delete_project(id);

  const addTask = async (
    title: string,
    priority: Priority = "normal",
    description?: string,
    projectId?: string,
    deadline?: number,
    tags: string[] = []
  ) => {
    const newTask: NewTask = {
      id: crypto.randomUUID(),
      project_id: projectId ?? null,
      title: title.trim(),
      description: description?.trim(),
      priority,
      status: "todo",
      created_at: Date.now(),
      deadline,
      tags,
    };

    return tauri.add_task(newTask);
  };

  const editTaskTitle = async (id: string, title: string) => tauri.edit_task_title(id, title);
  const updateTaskPriority = async (id: string, priority: Priority) => tauri.update_task_priority(id, priority);
  const updateTaskDeadline = async (id: string, deadline: number | null) => tauri.update_task_deadline(id, deadline);
  const updateTaskStatus = async (id: string, status: Status) => tauri.update_task_status(id, status);
  const deleteTask = async (id: string) => tauri.delete_task(id);

  const toggleWindow = async () => tauri.toggle_window();
  const minimizeWindow = async () => tauri.minimize_window();

  return {
    tasks,
    projects,
    stats,
    settings,
    isLoaded,

    saveSettings,

    addProject,
    editProject,
    updateProjectPriority,
    deleteProject,

    addTask,
    editTaskTitle,
    updateTaskPriority,
    updateTaskDeadline,
    updateTaskStatus,
    deleteTask,

    toggleWindow,
    minimizeWindow,

    refreshTasks: loadData,
  };
}