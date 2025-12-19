import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import * as tauri from "../lib/tauri";

export type Priority = tauri.Priority;
export type Status = tauri.Status;
export type RepeatMode = tauri.RepeatMode;

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

  const mountedRef = useRef(false);
  const reloadScheduledRef = useRef(false);

  const loadData = useCallback(async () => {
    const [tasksData, projectsData, statsData, settingsData] = await Promise.all([
      tauri.get_tasks({ limit: 1000, statusFilter: null, projectFilter: null }),
      tauri.get_projects(),
      tauri.get_stats(),
      tauri.get_settings(),
    ]);

    if (!mountedRef.current) return;

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

    let unlisten: null | (() => void) = null;

    (async () => {
      try {
        await loadData();
        unlisten = await listen<DataChanged>("data:changed", () => scheduleReload());
      } catch (e) {
        console.error("Startup failed:", e);
      }
    })();

    return () => {
      mountedRef.current = false;
      if (unlisten) unlisten();
    };
  }, [loadData, scheduleReload]);

  const saveSettings = useCallback(
    async (newSettings: AppSettings) => {
      await tauri.save_settings(newSettings);
      setSettings(newSettings);
      scheduleReload();
    },
    [scheduleReload]
  );

  const addProject = useCallback(
    async (name: string, color: string, priority: Priority) => {
      const project = await tauri.add_project(name, color, priority);
      scheduleReload();
      return project;
    },
    [scheduleReload]
  );

  const editProject = useCallback(
    async (id: string, name: string) => {
      await tauri.edit_project(id, name);
      scheduleReload();
    },
    [scheduleReload]
  );

  const updateProjectPriority = useCallback(
    async (id: string, priority: Priority) => {
      await tauri.update_project_priority(id, priority);
      scheduleReload();
    },
    [scheduleReload]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await tauri.delete_project(id);
      scheduleReload();
    },
    [scheduleReload]
  );

  const addTask = useCallback(
    async (
      title: string,
      priority: Priority = "normal",
      description?: string,
      projectId?: string,
      deadline?: number,
      tags: string[] = [],
      repeatMode?: RepeatMode | null,
      repeatDaysMask?: number | null
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
        estimated_minutes: undefined,
        actual_minutes: undefined,
        tags,
        remind_at: undefined,
        repeat_mode: repeatMode ?? null,
        repeat_days_mask: repeatDaysMask ?? null,
      };

      const task = await tauri.add_task(newTask);
      scheduleReload();
      return task;
    },
    [scheduleReload]
  );

  const editTaskTitle = useCallback(
    async (id: string, title: string) => {
      await tauri.edit_task_title(id, title);
      scheduleReload();
    },
    [scheduleReload]
  );

  const updateTaskPriority = useCallback(
    async (id: string, priority: Priority) => {
      await tauri.update_task_priority(id, priority);
      scheduleReload();
    },
    [scheduleReload]
  );

  const updateTaskDeadline = useCallback(
    async (id: string, deadline: number | null) => {
      await tauri.update_task_deadline(id, deadline);
      scheduleReload();
    },
    [scheduleReload]
  );

  const updateTaskStatus = useCallback(
    async (id: string, status: Status) => {
      await tauri.update_task_status(id, status);
      scheduleReload();
    },
    [scheduleReload]
  );

  const updateTaskTags = useCallback(
    async (id: string, tags: string[]) => {
      await tauri.update_task_tags(id, tags);
      scheduleReload();
    },
    [scheduleReload]
  );

  const updateTaskRepeat = useCallback(
    async (id: string, repeatMode: RepeatMode | null, repeatDaysMask: number | null) => {
      await tauri.update_task_repeat(id, repeatMode, repeatDaysMask);
      scheduleReload();
    },
    [scheduleReload]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await tauri.delete_task(id);
      scheduleReload();
    },
    [scheduleReload]
  );

  const toggleWindow = useCallback(async () => {
    await tauri.toggle_window();
  }, []);

  const minimizeWindow = useCallback(async () => {
    await tauri.minimize_window();
  }, []);

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
    updateTaskTags,
    updateTaskRepeat,
    deleteTask,

    toggleWindow,
    minimizeWindow,

    refreshTasks: loadData,
  };
}