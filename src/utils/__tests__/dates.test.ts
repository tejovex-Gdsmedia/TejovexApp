import { isOverdue, dueState } from "../../types/task";
import { makeTask } from "../../test-utils/taskFactory";

describe("isOverdue", () => {
  it("is false when there is no due date", () => {
    expect(isOverdue(makeTask({ dueDate: null }))).toBe(false);
  });

  it("is false for a complete task, even if its due date is past", () => {
    const task = makeTask({ status: "complete", dueDate: "2020-01-01T00:00:00.000Z" });
    expect(isOverdue(task)).toBe(false);
  });

  it("is true when the due date is in the past and the task is not complete", () => {
    const task = makeTask({ status: "pending", dueDate: "2020-01-01T00:00:00.000Z" });
    expect(isOverdue(task)).toBe(true);
  });

  it("is false when the due date is in the future", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const task = makeTask({ status: "pending", dueDate: future });
    expect(isOverdue(task)).toBe(false);
  });
});

describe("dueState", () => {
  it("returns 'none' when there is no due date", () => {
    expect(dueState(makeTask({ dueDate: null }))).toBe("none");
  });

  it("returns 'complete' when the task is complete, regardless of due date", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(dueState(makeTask({ status: "complete", dueDate: past }))).toBe("complete");
  });

  it("returns 'overdue' for a past due date on an open task", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(dueState(makeTask({ status: "pending", dueDate: past }))).toBe("overdue");
  });

  it("returns 'today' for a due date later today", () => {
    const laterToday = new Date();
    laterToday.setHours(23, 59, 0, 0);
    const task = makeTask({ status: "in_progress", dueDate: laterToday.toISOString() });
    expect(dueState(task)).toBe("today");
  });

  it("returns 'upcoming' for a future due date on an open task", () => {
    const future = new Date(Date.now() + 86_400_000 * 3).toISOString();
    expect(dueState(makeTask({ status: "pending", dueDate: future }))).toBe("upcoming");
  });
});
