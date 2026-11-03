import { computeStats, statsByAssignee } from "../stats";
import { makeTask } from "../../test-utils/taskFactory";
import { Profile } from "../../types/task";

describe("computeStats", () => {
  it("returns zeroed stats and completionRate 0 for an empty list", () => {
    const stats = computeStats([]);

    expect(stats).toEqual({
      total: 0,
      pending: 0,
      inProgress: 0,
      complete: 0,
      overdue: 0,
      dueToday: 0,
      completionRate: 0,
      overdueTasks: [],
    });
  });

  it("counts totals and per-status counts", () => {
    const tasks = [
      makeTask({ status: "pending" }),
      makeTask({ status: "pending" }),
      makeTask({ status: "in_progress" }),
      makeTask({ status: "complete" }),
    ];

    const stats = computeStats(tasks);

    expect(stats.total).toBe(4);
    expect(stats.pending).toBe(2);
    expect(stats.inProgress).toBe(1);
    expect(stats.complete).toBe(1);
  });

  it("counts overdue tasks and exposes them in overdueTasks", () => {
    const past = new Date(Date.now() - 86_400_000 * 2).toISOString();

    const overdueTask = makeTask({ status: "pending", dueDate: past });
    const completeTask = makeTask({ status: "complete", dueDate: past });

    const stats = computeStats([overdueTask, completeTask]);

    expect(stats.overdue).toBe(1);
    expect(stats.overdueTasks).toEqual([overdueTask]);
  });

  it("counts tasks due today", () => {
    const laterToday = new Date();
    laterToday.setHours(23, 59, 0, 0);
    const dueTodayTask = makeTask({ status: "pending", dueDate: laterToday.toISOString() });

    const stats = computeStats([dueTodayTask]);

    expect(stats.dueToday).toBe(1);
  });

  it("rounds completionRate to the nearest percent", () => {
    const tasks = [
      makeTask({ status: "complete" }),
      makeTask({ status: "pending" }),
      makeTask({ status: "pending" }),
    ];

    const stats = computeStats(tasks);

    expect(stats.completionRate).toBe(33);
  });
});

describe("statsByAssignee", () => {
  it("counts open and overdue tasks per employee", () => {
    const alice: Profile = { id: "alice", fullName: "Alice", role: "employee" };
    const bob: Profile = { id: "bob", fullName: "Bob", role: "employee" };
    const past = new Date(Date.now() - 86_400_000).toISOString();

    const tasks = [
      makeTask({ assigneeId: "alice", status: "pending", dueDate: past }),
      makeTask({ assigneeId: "alice", status: "complete", dueDate: past }),
      makeTask({ assigneeId: "bob", status: "in_progress" }),
    ];

    const result = statsByAssignee(tasks, [alice, bob]);

    expect(result).toEqual([
      { profile: alice, open: 1, overdue: 1 },
      { profile: bob, open: 1, overdue: 0 },
    ]);
  });
});
