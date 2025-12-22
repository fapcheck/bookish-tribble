/**
 * Application-wide constants to eliminate magic strings
 */

export const PRIORITIES = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
} as const;

export const STATUSES = {
    TODO: 'todo',
    DOING: 'doing',
    DONE: 'done',
} as const;

export const TASK_FILTERS = {
    ALL: 'all',
    DUE_TODAY: 'due_today',
    OVERDUE: 'overdue',
    ARCHIVED: 'archived',
} as const;

export const PROJECT_FILTERS = {
    ALL: 'all',
    INBOX: 'inbox',
} as const;

export const DEFAULT_CURRENCY = 'RUB';

export const DATA_ENTITIES = {
    TASKS: 'tasks',
    PROJECTS: 'projects',
    STATS: 'stats',
    SETTINGS: 'settings',
    FINANCE: 'finance',
    SUBTASKS: 'subtasks',
} as const;

// Type exports for use with the constants
export type Priority = typeof PRIORITIES[keyof typeof PRIORITIES];
export type Status = typeof STATUSES[keyof typeof STATUSES];
export type TaskFilter = typeof TASK_FILTERS[keyof typeof TASK_FILTERS];
