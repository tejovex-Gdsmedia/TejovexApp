import { Task, Priority } from "../types/task";

export type SortKey = "newest" | "due" | "priority";

const priorityRank: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const copy = [...tasks];

  switch (key) {
    case "due":
      // Tasks with a due date come first, soonest first; tasks without one go last
      return copy.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });

    case "priority":
      // High first, then medium, then low
      return copy.sort(
        (a, b) => priorityRank[a.priority] - priorityRank[b.priority]
      );

    case "newest":
    default:
      // Most recently created first
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}