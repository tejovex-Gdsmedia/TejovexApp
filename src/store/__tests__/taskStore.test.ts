import { useTaskStore } from "../taskStore";

jest.mock("../../lib/supabase");

const { mockQueue, queueResult, mockGetUser } = jest.requireMock(
  "../../lib/supabase"
) as typeof import("../../lib/__mocks__/supabase");

function resetStore() {
  useTaskStore.setState({
    tasks: [],
    profiles: [],
    comments: {},
    activity: {},
    loading: false,
    error: null,
  });
}

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    task_number: 1,
    title: "Buy milk",
    description: "",
    priority: "low",
    status: "pending",
    due_date: null,
    end_date: null,
    frequency: "none",
    frequency_note: "",
    category: "",
    assignee_id: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    assignee: null,
    creator: { full_name: "Manager One" },
    task_subscribers: [],
    task_reminders: [],
    checklist_items: [],
    ...overrides,
  };
}

describe("useTaskStore", () => {
  beforeEach(() => {
    resetStore();
    mockQueue.length = 0;
    mockGetUser.mockReset();
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("fetchTasks loads and maps tasks from Supabase", async () => {
    queueResult({ data: [taskRow()], error: null });

    await useTaskStore.getState().fetchTasks();

    const { tasks } = useTaskStore.getState();
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: "task-1",
      taskNumber: 1,
      title: "Buy milk",
      status: "pending",
      assigneeId: null,
      createdBy: "user-1",
      createdByName: "Manager One",
    });
  });

  it("createTask inserts a task, its subscribers and reminders, then refetches", async () => {
    queueResult({ data: { id: "task-2" }, error: null }); // insert task
    queueResult({ error: null }); // insert subscribers
    queueResult({ error: null }); // insert reminders
    queueResult({
      data: [taskRow({ id: "task-2", title: "Buy oat milk" })],
      error: null,
    }); // fetchTasks after insert

    await useTaskStore.getState().createTask({
      title: "Buy oat milk",
      description: "",
      priority: "low",
      category: "",
      dueDate: null,
      endDate: null,
      frequency: "none",
      frequencyNote: "",
      assigneeId: "employee-1",
      subscriberIds: ["employee-2"],
      reminders: [{ channel: "mobile", offsetMinutes: 60 }],
    });

    const { tasks, error } = useTaskStore.getState();
    expect(error).toBeNull();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Buy oat milk");
  });

  it("setStatus updates optimistically and keeps the change on success", async () => {
    useTaskStore.setState({
      tasks: [
        {
          id: "task-1",
          taskNumber: 1,
          title: "Buy milk",
          description: "",
          priority: "low",
          status: "pending",
          dueDate: null,
          endDate: null,
          frequency: "none",
          frequencyNote: "",
          category: "",
          assigneeId: "user-1",
          assigneeName: null,
          createdBy: null,
          createdByName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          subscribers: [],
          reminders: [],
          checklist: [],
        },
      ],
    });

    queueResult({ error: null });

    await useTaskStore.getState().setStatus("task-1", "complete");

    expect(useTaskStore.getState().tasks[0].status).toBe("complete");
  });

  it("setStatus rolls back the optimistic update on failure", async () => {
    useTaskStore.setState({
      tasks: [
        {
          id: "task-1",
          taskNumber: 1,
          title: "Buy milk",
          description: "",
          priority: "low",
          status: "pending",
          dueDate: null,
          endDate: null,
          frequency: "none",
          frequencyNote: "",
          category: "",
          assigneeId: "user-1",
          assigneeName: null,
          createdBy: null,
          createdByName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          subscribers: [],
          reminders: [],
          checklist: [],
        },
      ],
    });

    queueResult({ error: { message: "Employees can only change the status of their tasks" } });

    await useTaskStore.getState().setStatus("task-1", "complete");

    expect(useTaskStore.getState().tasks[0].status).toBe("pending");
    expect(useTaskStore.getState().error).toBe(
      "Employees can only change the status of their tasks"
    );
  });

  it("deleteTask removes the task", async () => {
    useTaskStore.setState({
      tasks: [
        {
          id: "task-1",
          taskNumber: 1,
          title: "Buy milk",
          description: "",
          priority: "low",
          status: "pending",
          dueDate: null,
          endDate: null,
          frequency: "none",
          frequencyNote: "",
          category: "",
          assigneeId: null,
          assigneeName: null,
          createdBy: "user-1",
          createdByName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          subscribers: [],
          reminders: [],
          checklist: [],
        },
      ],
    });

    queueResult({ error: null });

    await useTaskStore.getState().deleteTask("task-1");

    expect(useTaskStore.getState().tasks).toHaveLength(0);
  });
});
