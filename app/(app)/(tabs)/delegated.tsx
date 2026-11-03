import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { useTaskStore } from "../../../src/store/taskStore";
import TaskCard from "../../../src/components/TaskCard";
import StatusTabs, { TaskTabKey } from "../../../src/components/StatusTabs";
import { colors } from "../../../src/constants/colors";
import { dueState } from "../../../src/types/task";
import Screen from "../../../src/components/layout/Screen";

export default function DelegatedScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const setStatus = useTaskStore((s) => s.setStatus);
  const [activeTab, setActiveTab] = useState<TaskTabKey>("pending");

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const delegated = useMemo(
    () => tasks.filter((t) => t.createdBy === profile?.id),
    [tasks, profile?.id]
  );

  const counts = useMemo(
    () => ({
      overdue: delegated.filter((t) => dueState(t) === "overdue").length,
      pending: delegated.filter((t) => t.status === "pending").length,
      in_progress: delegated.filter((t) => t.status === "in_progress").length,
      complete: delegated.filter((t) => t.status === "complete").length,
    }),
    [delegated]
  );

  const tabbed = useMemo(() => {
    if (activeTab === "overdue") return delegated.filter((t) => dueState(t) === "overdue");
    return delegated.filter((t) => t.status === activeTab);
  }, [delegated, activeTab]);

  if (profile && profile.role !== "manager") {
    return <Redirect href="/my-tasks" />;
  }

  return (
    <Screen watermark>
      <View style={styles.container}>
      <StatusTabs
        tabs={[
          { key: "overdue", label: "Overdue", count: counts.overdue },
          { key: "pending", label: "Pending", count: counts.pending },
          { key: "in_progress", label: "In Progress", count: counts.in_progress },
          { key: "complete", label: "Complete", count: counts.complete },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <FlatList
        data={tabbed}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={fetchTasks}
        ListEmptyComponent={<Text style={styles.empty}>No delegated tasks yet</Text>}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            showAssignee
            canChangeStatus
            onPress={() => router.push(`/task/${item.id}`)}
            onSetStatus={(status) => setStatus(item.id, status)}
          />
        )}
      />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  list: { padding: 16, paddingBottom: 120 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 15 },
});
