import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Project {
  id: string;
  name: string;
  color: string;
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
  deadline?: number; // timestamp
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

export function useDatabase() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Загрузка данных
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
  const addProject = async (name: string, color: string) => {
    try {
      const newProject = await invoke<Project>('add_project', { name, color });
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (error) {
      console.error('Failed to add project:', error);
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
    projectId?: string,
    deadline?: number,
    tags: string[] = []
  ) => {
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
          // Note: In real logic, we'd start a session first. For now we just assume sync.
          loadData();
      } catch (e) {
          console.error(e);
      }
  }

  const toggleWindow = async () => invoke('toggle_window');
  const minimizeWindow = async () => invoke('minimize_window');

  return {
    tasks,
    projects,
    stats,
    isLoaded,
    addProject,
    deleteProject,
    addTask,
    updateTaskStatus,
    deleteTask,
    toggleWindow,
    minimizeWindow,
    refreshTasks: loadData,
    completeFocusSession
  };
}