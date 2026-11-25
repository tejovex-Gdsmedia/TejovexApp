export type Role = "manager" | "hr" | "employee";
export type Status = "pending" | "in_progress" | "complete";
export type Priority = "low" | "medium" | "high";
export type Frequency = "none" | "daily" | "weekly" | "monthly";
export type ReminderChannel = "mobile" | "whatsapp";
export type DueState = "overdue" | "today" | "upcoming" | "complete" | "none";

export interface Profile {
  id: string;
  fullName: string;
  role: Role;
  phone?: string | null;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  text: string;
  isDone: boolean;
  position: number;
}

export interface Reminder {
  id: string;
  channel: ReminderChannel;
  offsetMinutes: number;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  taskId: string;
  actorName: string;
  kind: string;
  message: string;
  createdAt: string;
}

export interface Task {
  id: string;
  taskNumber: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string | null;
  endDate: string | null;
  frequency: Frequency;
  frequencyNote: string;
  category: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
  subscribers: Profile[];
  reminders: Reminder[];
  checklist: ChecklistItem[];
}

export interface NewTask {
  title: string;
  description: string;
  priority: Priority;
  category: string;
  dueDate: string | null;
  endDate: string | null;
  frequency: Frequency;
  frequencyNote: string;
  assigneeId: string;
  subscriberIds: string[];
  reminders: Pick<Reminder, "channel" | "offsetMinutes">[];
}

// --- Raw Supabase row shapes (snake_case) ---

export interface ProfileRow {
  id: string;
  full_name: string;
  role: Role;
  phone?: string | null;
}

export interface ChecklistItemRow {
  id: string;
  task_id: string;
  text: string;
  is_done: boolean;
  position: number;
}

export interface ReminderRow {
  id: string;
  channel: ReminderChannel;
  offset_minutes: number;
}

export interface CommentRow {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: { full_name: string } | null;
}

export interface ActivityRow {
  id: string;
  task_id: string;
  kind: string;
  message: string;
  created_at: string;
  actor?: { full_name: string } | null;
}

export interface TaskRow {
  id: string;
  task_number: number;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  due_date: string | null;
  end_date: string | null;
  frequency: Frequency;
  frequency_note: string;
  category: string;
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string } | null;
  creator?: { full_name: string } | null;
  task_subscribers?: { profiles: ProfileRow }[];
  task_reminders?: ReminderRow[];
  checklist_items?: ChecklistItemRow[];
}

// --- Mapping helpers (the only place that converts snake_case -> camelCase) ---

export function mapProfile(row: ProfileRow): Profile {
  return { id: row.id, fullName: row.full_name, role: row.role, phone: row.phone ?? null };
}

export function mapChecklistItem(row: ChecklistItemRow): ChecklistItem {
  return {
    id: row.id,
    taskId: row.task_id,
    text: row.text,
    isDone: row.is_done,
    position: row.position,
  };
}

export function mapReminder(row: ReminderRow): Reminder {
  return { id: row.id, channel: row.channel, offsetMinutes: row.offset_minutes };
}

export function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    taskId: row.task_id,
    authorId: row.author_id,
    authorName: row.author?.full_name ?? "Unknown",
    body: row.body,
    createdAt: row.created_at,
  };
}

export function mapActivityEntry(row: ActivityRow): ActivityEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    actorName: row.actor?.full_name ?? "Unknown",
    kind: row.kind,
    message: row.message,
    createdAt: row.created_at,
  };
}

export function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    taskNumber: row.task_number,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    endDate: row.end_date,
    frequency: row.frequency,
    frequencyNote: row.frequency_note,
    category: row.category,
    assigneeId: row.assignee_id,
    assigneeName: row.assignee?.full_name ?? null,
    createdBy: row.created_by,
    createdByName: row.creator?.full_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subscribers: (row.task_subscribers ?? []).map((s) => mapProfile(s.profiles)),
    reminders: (row.task_reminders ?? []).map(mapReminder),
    checklist: (row.checklist_items ?? [])
      .map(mapChecklistItem)
      .sort((a, b) => a.position - b.position),
  };
}

// --- Derived state helpers ---

export function isOverdue(task: Pick<Task, "dueDate" | "status">, now: Date = new Date()): boolean {
  if (!task.dueDate || task.status === "complete") return false;
  return new Date(task.dueDate) < now;
}

export function dueState(task: Pick<Task, "dueDate" | "status">, now: Date = new Date()): DueState {
  if (task.status === "complete") return "complete";
  if (!task.dueDate) return "none";

  const due = new Date(task.dueDate);
  if (due < now) return "overdue";

  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  if (sameDay) return "today";

  return "upcoming";
}
