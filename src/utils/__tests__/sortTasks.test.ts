import { sortTasks } from "../sortTasks";
import { Priority } from "../../types/task";
import { makeTask } from "../../test-utils/taskFactory";

describe("sortTasks", () => {
  it("does not mutate the input array", () => {
    const tasks = [makeTask(), makeTask()];
    const original = [...tasks];
    sortTasks(tasks, "newest");
    expect(tasks).toEqual(original);
  });

  it("sorts by priority: high before medium before low", () => {
    const low = makeTask({ priority: "low" as Priority });
    const high = makeTask({ priority: "high" as Priority });
    const medium = makeTask({ priority: "medium" as Priority });

    const sorted = sortTasks([low, high, medium], "priority");

    expect(sorted.map((t) => t.priority)).toEqual(["high", "medium", "low"]);
  });

  it("sorts by due date: earliest first, tasks without a due date last", () => {
    const noDue = makeTask({ dueDate: null });
    const later = makeTask({ dueDate: "2026-03-01T00:00:00.000Z" });
    const earlier = makeTask({ dueDate: "2026-02-01T00:00:00.000Z" });

    const sorted = sortTasks([later, noDue, earlier], "due");

    expect(sorted.map((t) => t.dueDate)).toEqual([
      "2026-02-01T00:00:00.000Z",
      "2026-03-01T00:00:00.000Z",
      null,
    ]);
  });

  it("sorts by newest: most recently created first", () => {
    const older = makeTask({ createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeTask({ createdAt: "2026-01-03T00:00:00.000Z" });
    const middle = makeTask({ createdAt: "2026-01-02T00:00:00.000Z" });

    const sorted = sortTasks([older, newer, middle], "newest");

    expect(sorted.map((t) => t.createdAt)).toEqual([
      "2026-01-03T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ]);
  });
});
