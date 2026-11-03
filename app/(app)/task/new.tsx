import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { useTaskStore } from "../../../src/store/taskStore";
import TaskForm from "../../../src/components/TaskForm";

export default function NewTaskScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const createTask = useTaskStore((s) => s.createTask);

  // Employees can't create tasks; the backend would reject it anyway via RLS.
  if (profile && profile.role !== "manager") {
    return <Redirect href="/my-tasks" />;
  }

  return (
    <TaskForm
      submitLabel="Create Task"
      onSubmit={async (values) => {
        await createTask(values);
        router.back();
      }}
    />
  );
}
