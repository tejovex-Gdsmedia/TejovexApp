import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { useTaskStore } from "../../../src/store/taskStore";
import TaskCard from "../../../src/components/TaskCard";
import { colors } from "../../../src/constants/colors";
import { computeStats, statsByAssignee } from "../../../src/utils/stats";
import Screen from "../../../src/components/layout/Screen";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const isManager = profile?.role === "manager";
  const tasks = useTaskStore((s) => s.tasks);
  const profiles = useTaskStore((s) => s.profiles);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchProfiles = useTaskStore((s) => s.fetchProfiles);
  const setStatus = useTaskStore((s) => s.setStatus);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (isManager) fetchProfiles();
  }, [fetchTasks, fetchProfiles, isManager]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    if (isManager) await fetchProfiles();
    setRefreshing(false);
  };

  const myTasks = useMemo(
    () =>
      isManager
        ? tasks
        : tasks.filter(
            (t) =>
              t.assigneeId === profile?.id || t.subscribers.some((s) => s.id === profile?.id)
          ),
    [tasks, isManager, profile?.id]
  );

  const stats = useMemo(() => computeStats(myTasks), [myTasks]);
  const employees = useMemo(() => profiles.filter((p) => p.role === "employee"), [profiles]);
  const employeeStats = useMemo(
    () => statsByAssignee(tasks, employees),
    [tasks, employees]
  );

  const urgentTasks = useMemo(() => {
    if (isManager) return [];
    return myTasks
      .filter((t) => t.status !== "complete" && t.assigneeId === profile?.id)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      })
      .slice(0, 5);
  }, [myTasks, isManager, profile?.id]);

  return (
    <Screen watermark>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
      <Text style={styles.heading}>{isManager ? "Team overview" : "My overview"}</Text>

      <View style={styles.grid}>
        <StatTile label="Total" value={stats.total} />
        <StatTile label="Overdue" value={stats.overdue} />
        <StatTile label="Due today" value={stats.dueToday} />
        <StatTile label={isManager ? "Complete this week" : "Complete"} value={stats.complete} />
        <StatTile label="Completion" value={`${stats.completionRate}%`} />
      </View>

      {isManager ? (
        <>
          <Text style={styles.sectionTitle}>Team</Text>
          {employeeStats.length === 0 ? (
            <Text style={styles.empty}>No employees yet</Text>
          ) : (
            employeeStats.map(({ profile: p, open, overdue }) => (
              <Pressable
                key={p.id}
                style={styles.employeeRow}
                onPress={() => router.push({ pathname: "/my-tasks", params: { assignee: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${p.fullName}, ${open} open tasks, ${overdue} overdue`}
              >
                <Text style={styles.employeeName}>{p.fullName}</Text>
                <Text style={styles.employeeCounts}>
                  {open} open {overdue > 0 ? `• ${overdue} overdue` : ""}
                </Text>
              </Pressable>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Most urgent</Text>
          {urgentTasks.length === 0 ? (
            <Text style={styles.empty}>Nothing urgent right now</Text>
          ) : (
            urgentTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                canChangeStatus={task.assigneeId === profile?.id}
                onPress={() => router.push(`/task/${task.id}`)}
                onSetStatus={(status) => setStatus(task.id, status)}
              />
            ))
          )}
        </>
      )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, paddingBottom: 120 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderRadius: 20,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    padding: 16,
  },
  tileValue: { fontSize: 24, fontWeight: "700", color: colors.text },
  tileLabel: { fontSize: 13, color: colors.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 10 },
  empty: { color: colors.muted, fontSize: 14 },
  employeeRow: {
    backgroundColor: colors.card,
    borderRadius: 18,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    padding: 14,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: "center",
  },
  employeeName: { fontSize: 15, fontWeight: "600", color: colors.text },
  employeeCounts: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
