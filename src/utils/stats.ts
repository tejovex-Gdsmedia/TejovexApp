import { Task, Profile, dueState } from "../types/task";

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  complete: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
  overdueTasks: Task[];
}

export function computeStats(tasks: Task[], now: Date = new Date()): TaskStats {
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const complete = tasks.filter((t) => t.status === "complete").length;

  const overdueTasks = tasks.filter((t) => dueState(t, now) === "overdue");
  const dueToday = tasks.filter((t) => dueState(t, now) === "today").length;

  const completionRate = total === 0 ? 0 : Math.round((complete / total) * 100);

  return {
    total,
    pending,
    inProgress,
    complete,
    overdue: overdueTasks.length,
    dueToday,
    completionRate,
    overdueTasks,
  };
}

export interface AssigneeStats {
  profile: Profile;
  open: number;
  overdue: number;
}

// Per-employee open/overdue counts, for the manager dashboard's team list.
export function statsByAssignee(
  tasks: Task[],
  employees: Profile[],
  now: Date = new Date()
): AssigneeStats[] {
  return employees.map((profile) => {
    const assigned = tasks.filter((t) => t.assigneeId === profile.id);
    return {
      profile,
      open: assigned.filter((t) => t.status !== "complete").length,
      overdue: assigned.filter((t) => dueState(t, now) === "overdue").length,
    };
  });
}
