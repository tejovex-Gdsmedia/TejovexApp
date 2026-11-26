import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { sendPushToUser } from "../utils/notifications";
import {
  ActivityEntry,
  ActivityRow,
  Comment,
  CommentRow,
  NewTask,
  Profile,
  ProfileRow,
  Status,
  Task,
  TaskRow,
  mapActivityEntry,
  mapComment,
  mapProfile,
  mapTask,
} from "../types/task";

const TASK_SELECT = `
  *,
  assignee:profiles!tasks_assignee_id_fkey(full_name),
  creator:profiles!tasks_created_by_fkey(full_name),
  task_subscribers(profiles(id, full_name, role)),
  task_reminders(id, channel, offset_minutes),
  checklist_items(id, task_id, text, is_done, position)
`;

interface TaskState {
  tasks: Task[];
  profiles: Profile[];
  comments: Record<string, Comment[]>;
  activity: Record<string, ActivityEntry[]>;
  loading: boolean;
  error: string | null;

  fetchTasks: () => Promise<void>;
  fetchProfiles: () => Promise<void>;
  createTask: (input: NewTask) => Promise<void>;
  updateTask: (id: string, changes: Partial<NewTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setStatus: (id: string, status: Status) => Promise<void>;
  toggleChecklistItem: (itemId: string, isDone: boolean) => Promise<void>;
  addChecklistItem: (taskId: string, text: string) => Promise<void>;
  deleteChecklistItem: (itemId: string, taskId: string) => Promise<void>;
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<void>;
  deleteComment: (id: string, taskId: string) => Promise<void>;
  fetchActivity: (taskId: string) => Promise<void>;
  reset: () => void;
}

function fail(set: (partial: Partial<TaskState>) => void, message: string) {
  set({ error: message });
  console.warn(message);
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: [],
  profiles: [],
  comments: {},
  activity: {},
  loading: false,
  error: null,

  fetchTasks: async () => {
    set({ loading: true, error: null });

    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ tasks: (data as unknown as TaskRow[]).map(mapTask), loading: false });
  },

  fetchProfiles: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name", { ascending: true });

    if (error) {
      fail(set, error.message);
      return;
    }

    set({ profiles: (data as ProfileRow[]).map(mapProfile) });
  },

  createTask: async (input) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      fail(set, "You must be signed in to create a task.");
      return;
    }

    const { data: inserted, error } = await supabase
      .from("tasks")
      .insert({
        title: input.title,
        description: input.description,
        priority: input.priority,
        category: input.category,
        due_date: input.dueDate,
        end_date: input.endDate,
        frequency: input.frequency,
        frequency_note: input.frequencyNote,
        assignee_id: input.assigneeId,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      fail(set, error?.message ?? "Failed to create task.");
      return;
    }

    const taskId = inserted.id as string;

    if (input.subscriberIds.length > 0) {
      const { error: subError } = await supabase
        .from("task_subscribers")
        .insert(input.subscriberIds.map((user_id) => ({ task_id: taskId, user_id })));
      if (subError) fail(set, subError.message);
    }

    if (input.reminders.length > 0) {
      const { error: remError } = await supabase.from("task_reminders").insert(
        input.reminders.map((r) => ({
          task_id: taskId,
          channel: r.channel,
          offset_minutes: r.offsetMinutes,
        }))
      );
      if (remError) fail(set, remError.message);
    }

    // Notify the assignee that a task was assigned to them
    if (input.assigneeId && input.assigneeId !== userId) {
      sendPushToUser(
        input.assigneeId,
        "New task assigned to you",
        input.title,
        { taskId }
      ).catch(() => {});
    }

    await get().fetchTasks();
  },

  updateTask: async (id, changes) => {
    const previousTasks = get().tasks;

    const payload: Record<string, unknown> = {};
    if (changes.title !== undefined) payload.title = changes.title;
    if (changes.description !== undefined) payload.description = changes.description;
    if (changes.priority !== undefined) payload.priority = changes.priority;
    if (changes.category !== undefined) payload.category = changes.category;
    if (changes.dueDate !== undefined) payload.due_date = changes.dueDate;
    if (changes.endDate !== undefined) payload.end_date = changes.endDate;
    if (changes.frequency !== undefined) payload.frequency = changes.frequency;
    if (changes.frequencyNote !== undefined) payload.frequency_note = changes.frequencyNote;
    if (changes.assigneeId !== undefined) payload.assignee_id = changes.assigneeId;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", id);
      if (error) {
        set({ tasks: previousTasks });
        fail(set, error.message);
        return;
      }
    }

    if (changes.subscriberIds !== undefined) {
      const { error: delError } = await supabase
        .from("task_subscribers")
        .delete()
        .eq("task_id", id);
      if (delError) fail(set, delError.message);

      if (changes.subscriberIds.length > 0) {
        const { error: insError } = await supabase
          .from("task_subscribers")
          .insert(changes.subscriberIds.map((user_id) => ({ task_id: id, user_id })));
        if (insError) fail(set, insError.message);
      }
    }

    // Notify new assignee if reassigned
    if (changes.assigneeId) {
      const task = get().tasks.find((t) => t.id === id);
      const title = changes.title ?? task?.title ?? "A task";
      sendPushToUser(
        changes.assigneeId,
        "Task assigned to you",
        title,
        { taskId: id }
      ).catch(() => {});
    }

    if (changes.reminders !== undefined) {
      const { error: delError } = await supabase
        .from("task_reminders")
        .delete()
        .eq("task_id", id);
      if (delError) fail(set, delError.message);

      if (changes.reminders.length > 0) {
        const { error: insError } = await supabase.from("task_reminders").insert(
          changes.reminders.map((r) => ({
            task_id: id,
            channel: r.channel,
            offset_minutes: r.offsetMinutes,
          }))
        );
        if (insError) fail(set, insError.message);
      }
    }

    await get().fetchTasks();
  },

  deleteTask: async (id) => {
    const previousTasks = get().tasks;
    set({ tasks: previousTasks.filter((t) => t.id !== id) });

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      set({ tasks: previousTasks });
      fail(set, error.message);
    }
  },

  setStatus: async (id, status) => {
    const previousTasks = get().tasks;
    set({
      tasks: previousTasks.map((t) => (t.id === id ? { ...t, status } : t)),
    });

    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);

    if (error) {
      set({ tasks: previousTasks });
      fail(set, error.message);
    }
  },

  toggleChecklistItem: async (itemId, isDone) => {
    const previousTasks = get().tasks;
    set({
      tasks: previousTasks.map((t) => ({
        ...t,
        checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, isDone } : c)),
      })),
    });

    const { error } = await supabase
      .from("checklist_items")
      .update({ is_done: isDone })
      .eq("id", itemId);

    if (error) {
      set({ tasks: previousTasks });
      fail(set, error.message);
    }
  },

  addChecklistItem: async (taskId, text) => {
    const task = get().tasks.find((t) => t.id === taskId);
    const position = task ? task.checklist.length : 0;

    const { error } = await supabase
      .from("checklist_items")
      .insert({ task_id: taskId, text, position });

    if (error) {
      fail(set, error.message);
      return;
    }

    await get().fetchTasks();
  },

  deleteChecklistItem: async (itemId, taskId) => {
    const previousTasks = get().tasks;
    set({
      tasks: previousTasks.map((t) =>
        t.id === taskId
          ? { ...t, checklist: t.checklist.filter((c) => c.id !== itemId) }
          : t
      ),
    });

    const { error } = await supabase.from("checklist_items").delete().eq("id", itemId);

    if (error) {
      set({ tasks: previousTasks });
      fail(set, error.message);
    }
  },

  fetchComments: async (taskId) => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, task_id, author_id, body, created_at, author:profiles!comments_author_id_fkey(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) {
      fail(set, error.message);
      return;
    }

    set((state) => ({
      comments: {
        ...state.comments,
        [taskId]: (data as unknown as CommentRow[]).map(mapComment),
      },
    }));
  },

  addComment: async (taskId, body) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      fail(set, "You must be signed in to comment.");
      return;
    }

    const { error } = await supabase
      .from("comments")
      .insert({ task_id: taskId, author_id: userId, body });

    if (error) {
      fail(set, error.message);
      return;
    }

    await get().fetchComments(taskId);
    await get().fetchActivity(taskId);
  },

  deleteComment: async (id, taskId) => {
    const previousComments = get().comments;
    set({
      comments: {
        ...previousComments,
        [taskId]: (previousComments[taskId] ?? []).filter((c) => c.id !== id),
      },
    });

    const { error } = await supabase.from("comments").delete().eq("id", id);

    if (error) {
      set({ comments: previousComments });
      fail(set, error.message);
    }
  },

  fetchActivity: async (taskId) => {
    const { data, error } = await supabase
      .from("task_activity")
      .select("id, task_id, kind, message, created_at, actor:profiles!task_activity_actor_id_fkey(full_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (error) {
      fail(set, error.message);
      return;
    }

    set((state) => ({
      activity: {
        ...state.activity,
        [taskId]: (data as unknown as ActivityRow[]).map(mapActivityEntry),
      },
    }));
  },

  reset: () =>
    set({ tasks: [], profiles: [], comments: {}, activity: {}, loading: false, error: null }),
}));
