import { View, Text, StyleSheet } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../src/context/AuthContext";
import { useTaskStore } from "../../../../src/store/taskStore";
import TaskForm from "../../../../src/components/TaskForm";
import { colors } from "../../../../src/constants/colors";

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const updateTask = useTaskStore((s) => s.updateTask);

  if (profile && profile.role !== "manager") {
    return <Redirect href="/my-tasks" />;
  }

  if (!task) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Task not found</Text>
      </View>
    );
  }

  return (
    <TaskForm
      submitLabel="Update Task"
      initialValues={{
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        dueDate: task.dueDate,
        endDate: task.endDate,
        frequency: task.frequency,
        frequencyNote: task.frequencyNote,
        assigneeId: task.assigneeId ?? "",
        subscriberIds: task.subscribers.map((s) => s.id),
        reminders: task.reminders.map((r) => ({
          channel: r.channel,
          offsetMinutes: r.offsetMinutes,
        })),
      }}
      onSubmit={async (values) => {
        await updateTask(task.id, values);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  notFoundText: { fontSize: 16, color: colors.muted },
});
