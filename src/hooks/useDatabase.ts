<<<<<<< HEAD
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
=======
import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Project {
  id: string;
  name: string;
  color: string;
  priority: 'low' | 'normal' | 'high';
  created_at: number;
}

export interface Task {
  id: string;
  project_id?: string | null;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'todo' | 'doing' | 'done';
  created_at: number;
  completed_at?: number;
  deadline?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  tags: string[];
}

export interface NewTask {
  id: string;
  project_id?: string | null;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'todo' | 'doing' | 'done';
  created_at: number;
  deadline?: number;
  estimated_minutes?: number;
  tags: string[];
}

export interface UserStats {
  total_tasks: number;
  completed_tasks: number;
  total_focus_time: number;
  tasks_today: number;
  tasks_week: number;
  current_streak: number;
  level: number;
  points: number;
}
>>>>>>> origin/main

export function useDatabase() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
<<<<<<< HEAD
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
=======
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      const [tasksData, projectsData, statsData] = await Promise.all([
        invoke<Task[]>('get_tasks', { limit: 1000, projectFilter: null }),
        invoke<Project[]>('get_projects'),
        invoke<UserStats>('get_stats')
      ]);
      
      setTasks(tasksData);
      setProjects(projectsData);
      setStats(statsData);
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Projects
  const addProject = async (name: string, color: string, priority: 'low' | 'normal' | 'high') => {
    try {
      const newProject = await invoke<Project>('add_project', { name, color, priority });
      setProjects(prev => {
         const list = [newProject, ...prev];
         return list.sort((a, b) => {
             const weight = { high: 3, normal: 2, low: 1 };
             return weight[b.priority] - weight[a.priority];
         });
      });
      return newProject;
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  };

  const editProject = async (id: string, name: string) => {
    try {
      await invoke('edit_project', { id, name });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    } catch (error) {
      console.error('Failed to edit project:', error);
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await invoke('delete_project', { id });
      setProjects(prev => prev.filter(p => p.id !== id));
      loadData(); 
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  };

  // Tasks
  const addTask = async (
    title: string, 
    priority: 'low' | 'normal' | 'high' = 'normal', 
    description?: string, 
>>>>>>> origin/main
    projectId?: string,
    deadline?: number,
    tags: string[] = []
  ) => {
<<<<<<< HEAD
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
=======
    try {
      const newTask: NewTask = {
        id: crypto.randomUUID(),
        project_id: projectId || null,
        title: title.trim(),
        description: description?.trim(),
        priority,
        status: 'todo',
        created_at: Date.now(),
        deadline,
        tags,
      };

      const task = await invoke<Task>('add_task', { newTask });
      setTasks(prev => [task, ...prev]);
      const newStats = await invoke<UserStats>('get_stats');
      setStats(newStats);
      return task;
    } catch (error) {
      console.error('Failed to add task:', error);
      throw error;
    }
  };

  const editTaskTitle = async (id: string, title: string) => {
    try {
      await invoke('edit_task_title', { id, title });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
    } catch (error) {
      console.error('Failed to edit task title:', error);
      throw error;
    }
  };

  const updateTaskPriority = async (id: string, priority: 'low' | 'normal' | 'high') => {
    try {
      await invoke('update_task_priority', { id, priority });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, priority } : t));
    } catch (error) {
      console.error('Failed to update task priority:', error);
      throw error;
    }
  };

  const updateTaskDeadline = async (id: string, deadline: number | null) => {
    try {
      await invoke('update_task_deadline', { id, deadline });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, deadline: deadline || undefined } : t));
    } catch (error) {
      console.error('Failed to update task deadline:', error);
      throw error;
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'todo' | 'doing' | 'done') => {
    try {
      await invoke('update_task_status', { taskId, newStatus: status });
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status, completed_at: status === 'done' ? Date.now() : undefined }
          : task
      ));
      const newStats = await invoke<UserStats>('get_stats');
      setStats(newStats);
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await invoke('delete_task', { taskId });
      setTasks(prev => prev.filter(task => task.id !== taskId));
      const newStats = await invoke<UserStats>('get_stats');
      setStats(newStats);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  const completeFocusSession = async (taskId: string, durationMinutes: number) => {
      try {
          await invoke('complete_focus_session', { sessionId: "temp", durationMinutes });
          loadData();
      } catch (e) {
          console.error(e);
      }
  }

  const toggleWindow = async () => invoke('toggle_window');
  const minimizeWindow = async () => invoke('minimize_window');
>>>>>>> origin/main

  return {
    tasks,
    projects,
    stats,
<<<<<<< HEAD
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
=======
    isLoaded,
    addProject,
    editProject,
    deleteProject,
    addTask,
    editTaskTitle,
    updateTaskPriority, // new
    updateTaskDeadline, // new
    updateTaskStatus,
    deleteTask,
    toggleWindow,
    minimizeWindow,
    refreshTasks: loadData,
    completeFocusSession
>>>>>>> origin/main
  };
}