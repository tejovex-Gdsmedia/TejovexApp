import { Task } from "../types/task";

let counter = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1;
  return {
    id: `task-${counter}`,
    taskNumber: counter,
    title: `Task ${counter}`,
    description: "",
    priority: "medium",
    status: "pending",
    dueDate: null,
    endDate: null,
    frequency: "none",
    frequencyNote: "",
    category: "",
    assigneeId: null,
    assigneeName: null,
    createdBy: null,
    createdByName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    subscribers: [],
    reminders: [],
    checklist: [],
    ...overrides,
  };
}
