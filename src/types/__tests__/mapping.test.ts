import {
  mapTask,
  mapComment,
  mapProfile,
  mapActivityEntry,
  mapChecklistItem,
  mapReminder,
  TaskRow,
} from "../task";

describe("mapProfile", () => {
  it("converts snake_case to camelCase", () => {
    expect(mapProfile({ id: "u1", full_name: "Alice", role: "employee" })).toEqual({
      id: "u1",
      fullName: "Alice",
      role: "employee",
    });
  });
});

describe("mapChecklistItem", () => {
  it("converts snake_case to camelCase", () => {
    expect(
      mapChecklistItem({ id: "c1", task_id: "t1", text: "Do it", is_done: true, position: 2 })
    ).toEqual({ id: "c1", taskId: "t1", text: "Do it", isDone: true, position: 2 });
  });
});

describe("mapReminder", () => {
  it("converts snake_case to camelCase", () => {
    expect(mapReminder({ id: "r1", channel: "mobile", offset_minutes: 30 })).toEqual({
      id: "r1",
      channel: "mobile",
      offsetMinutes: 30,
    });
  });
});

describe("mapComment", () => {
  it("falls back to 'Unknown' when the author relation is missing", () => {
    const result = mapComment({
      id: "c1",
      task_id: "t1",
      author_id: "u1",
      body: "Hi",
      created_at: "2026-01-01T00:00:00.000Z",
      author: null,
    });
    expect(result.authorName).toBe("Unknown");
  });

  it("uses the joined author's name when present", () => {
    const result = mapComment({
      id: "c1",
      task_id: "t1",
      author_id: "u1",
      body: "Hi",
      created_at: "2026-01-01T00:00:00.000Z",
      author: { full_name: "Bob" },
    });
    expect(result.authorName).toBe("Bob");
  });
});

describe("mapActivityEntry", () => {
  it("falls back to 'Unknown' when the actor relation is missing", () => {
    const result = mapActivityEntry({
      id: "a1",
      task_id: "t1",
      kind: "status",
      message: "Status changed",
      created_at: "2026-01-01T00:00:00.000Z",
      actor: null,
    });
    expect(result.actorName).toBe("Unknown");
  });
});

describe("mapTask", () => {
  function row(overrides: Partial<TaskRow> = {}): TaskRow {
    return {
      id: "t1",
      task_number: 42,
      title: "Ship it",
      description: "",
      priority: "high",
      status: "pending",
      due_date: "2026-02-01T00:00:00.000Z",
      end_date: null,
      frequency: "none",
      frequency_note: "",
      category: "Ops",
      assignee_id: "u1",
      created_by: "u2",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      assignee: { full_name: "Alice" },
      creator: { full_name: "Manager" },
      task_subscribers: [{ profiles: { id: "u3", full_name: "Carl", role: "employee" } }],
      task_reminders: [{ id: "r1", channel: "mobile", offset_minutes: 15 }],
      checklist_items: [
        { id: "c2", task_id: "t1", text: "Second", is_done: false, position: 2 },
        { id: "c1", task_id: "t1", text: "First", is_done: true, position: 1 },
      ],
      ...overrides,
    };
  }

  it("maps a fully populated row, including nested relations", () => {
    const task = mapTask(row());

    expect(task).toMatchObject({
      id: "t1",
      taskNumber: 42,
      title: "Ship it",
      assigneeId: "u1",
      assigneeName: "Alice",
      createdByName: "Manager",
    });
    expect(task.subscribers).toEqual([{ id: "u3", fullName: "Carl", role: "employee" }]);
    expect(task.reminders).toEqual([{ id: "r1", channel: "mobile", offsetMinutes: 15 }]);
  });

  it("sorts checklist items by position", () => {
    const task = mapTask(row());
    expect(task.checklist.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("handles missing relations gracefully", () => {
    const task = mapTask(
      row({
        assignee: null,
        creator: null,
        task_subscribers: undefined,
        task_reminders: undefined,
        checklist_items: undefined,
      })
    );

    expect(task.assigneeName).toBeNull();
    expect(task.createdByName).toBeNull();
    expect(task.subscribers).toEqual([]);
    expect(task.reminders).toEqual([]);
    expect(task.checklist).toEqual([]);
  });
});
