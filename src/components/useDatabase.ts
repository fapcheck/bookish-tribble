import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'todo' | 'doing' | 'done';
  created_at: number;
  completed_at?: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  tags: string[];
}

export interface NewTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'normal' | 'high';
  status: 'todo' | 'doing' | 'done';
  created_at: number;
  estimated_minutes?: number;
  tags: string[];
}

export interface FocusSession {
  id: string;
  task_id: string;
  duration_minutes: number;
  completed: boolean;
  started_at: number;
  ended_at?: number;
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

export interface AppSettings {
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
}

export function useDatabase() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка данных
  useEffect(() => {
    loadTasks();
    loadStats();
    loadSettings();
    setIsLoaded(true);
  }, []);

  const loadTasks = async (limit?: number, statusFilter?: string) => {
    try {
      const result = await invoke<Task[]>('get_tasks', {
        limit,
        statusFilter: statusFilter as any
      });
      setTasks(result);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const loadStats = async () => {
    try {
      const result = await invoke<UserStats>('get_stats');
      setStats(result);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await invoke<AppSettings>('get_settings');
      setSettings(result);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const addTask = async (title: string, priority: 'low' | 'normal' | 'high' = 'normal', description?: string) => {
    try {
      const newTask: NewTask = {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: description?.trim(),
        priority,
        status: 'todo',
        created_at: Date.now(),
        tags: [],
      };

      const task = await invoke<Task>('add_task', { newTask });
      setTasks(prev => [task, ...prev]);
      
      // Обновляем статистику
      loadStats();
      
      return task;
    } catch (error) {
      console.error('Failed to add task:', error);
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
      
      // Обновляем статистику
      loadStats();
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await invoke('delete_task', { taskId });
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      // Обновляем статистику
      loadStats();
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  };

  const startFocusSession = async (taskId: string) => {
    try {
      const sessionId = await invoke<string>('start_focus_session', { taskId });
      return sessionId;
    } catch (error) {
      console.error('Failed to start focus session:', error);
      throw error;
    }
  };

  const completeFocusSession = async (sessionId: string, durationMinutes: number) => {
    try {
      await invoke('complete_focus_session', { sessionId, durationMinutes });
      loadStats(); // Обновляем статистику
    } catch (error) {
      console.error('Failed to complete focus session:', error);
      throw error;
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await invoke('save_settings', { settings: newSettings });
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const toggleWindow = async () => {
    try {
      await invoke('toggle_window');
    } catch (error) {
      console.error('Failed to toggle window:', error);
    }
  };

  const minimizeWindow = async () => {
    try {
      await invoke('minimize_window');
    } catch (error) {
      console.error('Failed to minimize window:', error);
    }
  };

  return {
    tasks,
    stats,
    settings,
    isLoaded,
    addTask,
    updateTaskStatus,
    deleteTask,
    startFocusSession,
    completeFocusSession,
    saveSettings,
    toggleWindow,
    minimizeWindow,
    refreshData: () => {
      loadTasks();
      loadStats();
      loadSettings();
    }
  };
}