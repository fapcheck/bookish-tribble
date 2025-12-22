/**
 * Centralized logging utility
 * Can be disabled in production by setting LOG_ENABLED to false
 */

const LOG_ENABLED = import.meta.env.DEV;

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const formatMessage = (level: LogLevel, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

export const logger = {
    info: (message: string, data?: unknown): void => {
        if (!LOG_ENABLED) return;
        console.info(formatMessage('info', message), data ?? '');
    },

    warn: (message: string, data?: unknown): void => {
        if (!LOG_ENABLED) return;
        console.warn(formatMessage('warn', message), data ?? '');
    },

    error: (message: string, error?: unknown): void => {
        // Always log errors, even in production
        console.error(formatMessage('error', message), error ?? '');
    },

    debug: (message: string, data?: unknown): void => {
        if (!LOG_ENABLED) return;
        console.debug(formatMessage('debug', message), data ?? '');
    },
};

export default logger;
