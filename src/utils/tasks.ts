import type { Priority } from "../types/ui";

export const PRIORITY_WEIGHT: Record<Priority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

export function sortTasksForFocus<
  T extends { priority: Priority; deadline?: number | null; created_at: number }
>(tasks: T[]) {
  return [...tasks].sort((a, b) => {
    // priority desc
    const dp = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (dp !== 0) return dp;

    // deadline asc (null/undefined last)
    const ad = a.deadline ?? Number.POSITIVE_INFINITY;
    const bd = b.deadline ?? Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;

    // created desc
    return b.created_at - a.created_at;
  });
}