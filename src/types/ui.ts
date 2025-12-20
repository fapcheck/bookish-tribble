export type View = "main" | "calendar" | "stats" | "settings" | "focus" | "review" | "notes";

// Priority is now exported from lib/tauri.ts to avoid duplication
// Use: import type { Priority } from "../lib/tauri";