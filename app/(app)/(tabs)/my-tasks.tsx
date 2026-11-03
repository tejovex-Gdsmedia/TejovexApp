import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/context/AuthContext";
import { useTaskStore } from "../../../src/store/taskStore";
import TaskCard from "../../../src/components/TaskCard";
import StatusTabs, { TaskTabKey } from "../../../src/components/StatusTabs";
import { colors } from "../../../src/constants/colors";
import { Task, dueState } from "../../../src/types/task";
import Screen from "../../../src/components/layout/Screen";

type DateRange = "today" | "week" | "month" | "all";

const dateRangeLabel: Record<DateRange, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All",
};

function isInRange(task: Task, range: DateRange, now: Date): boolean {
  if (range === "all" || !task.dueDate) return true;
  const due = new Date(task.dueDate);

  if (range === "today") {
    return (
      due.getFullYear() === now.getFullYear() &&
      due.getMonth() === now.getMonth() &&
      due.getDate() === now.getDate()
    );
  }
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return due >= start && due < end;
  }
  // month
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
}

export default function MyTasksScreen() {
  const router = useRouter();
  const { assignee } = useLocalSearchParams<{ assignee?: string }>();
  const { profile } = useAuth();
  const isManager = profile?.role === "manager";
  const tasks = useTaskStore((s) => s.tasks);
  const profiles = useTaskStore((s) => s.profiles);
  const loading = useTaskStore((s) => s.loading);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchProfiles = useTaskStore((s) => s.fetchProfiles);
  const setStatus = useTaskStore((s) => s.setStatus);

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [assigneeOverride, setAssigneeOverride] = useState<string | null | undefined>(
    undefined
  );
  const assigneeFilter = assigneeOverride !== undefined ? assigneeOverride : assignee ?? null;
  const [activeTab, setActiveTab] = useState<TaskTabKey>("pending");

  useEffect(() => {
    fetchTasks();
    if (isManager) fetchProfiles();
  }, [fetchTasks, fetchProfiles, isManager]);

  const myTasks = useMemo(() => {
    if (isManager) return tasks;
    return tasks.filter(
      (t) =>
        t.assigneeId === profile?.id || t.subscribers.some((s) => s.id === profile?.id)
    );
  }, [tasks, isManager, profile?.id]);

  const categories = useMemo(
    () => Array.from(new Set(myTasks.map((t) => t.category).filter(Boolean))),
    [myTasks]
  );
  const employees = useMemo(() => profiles.filter((p) => p.role === "employee"), [profiles]);

  const filtered = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();

    return myTasks.filter((t) => {
      if (!isInRange(t, dateRange, now)) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (assigneeFilter && t.assigneeId !== assigneeFilter) return false;
      if (q) {
        const haystack = `${t.title} ${t.description} T-${t.taskNumber}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [myTasks, dateRange, priorityFilter, categoryFilter, assigneeFilter, search]);

  const counts = useMemo(
    () => ({
      overdue: filtered.filter((t) => dueState(t) === "overdue").length,
      pending: filtered.filter((t) => t.status === "pending").length,
      in_progress: filtered.filter((t) => t.status === "in_progress").length,
      complete: filtered.filter((t) => t.status === "complete").length,
    }),
    [filtered]
  );

  const tabbed = useMemo(() => {
    if (activeTab === "overdue") return filtered.filter((t) => dueState(t) === "overdue");
    return filtered.filter((t) => t.status === activeTab);
  }, [filtered, activeTab]);

  return (
    <Screen watermark>
      <View style={styles.container}>
      <View style={styles.topBar}>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search title, description, T-number"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Search tasks"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        {(["today", "week", "month", "all"] as DateRange[]).map((r) => (
          <Pressable
            key={r}
            style={[styles.filterChip, dateRange === r && styles.filterChipActive]}
            onPress={() => setDateRange(r)}
            accessibilityRole="button"
            accessibilityLabel={`Date range ${dateRangeLabel[r]}`}
            accessibilityState={{ selected: dateRange === r }}
          >
            <Text style={[styles.filterChipText, dateRange === r && styles.filterChipTextActive]}>
              {dateRangeLabel[r]}
            </Text>
          </Pressable>
        ))}

        {["low", "medium", "high"].map((p) => (
          <Pressable
            key={p}
            style={[styles.filterChip, priorityFilter === p && styles.filterChipActive]}
            onPress={() => setPriorityFilter(priorityFilter === p ? null : p)}
            accessibilityRole="button"
            accessibilityLabel={`Filter priority ${p}`}
            accessibilityState={{ selected: priorityFilter === p }}
          >
            <Text
              style={[styles.filterChipText, priorityFilter === p && styles.filterChipTextActive]}
            >
              {p}
            </Text>
          </Pressable>
        ))}

        {categories.map((c) => (
          <Pressable
            key={c}
            style={[styles.filterChip, categoryFilter === c && styles.filterChipActive]}
            onPress={() => setCategoryFilter(categoryFilter === c ? null : c)}
            accessibilityRole="button"
            accessibilityLabel={`Filter category ${c}`}
            accessibilityState={{ selected: categoryFilter === c }}
          >
            <Text
              style={[styles.filterChipText, categoryFilter === c && styles.filterChipTextActive]}
            >
              {c}
            </Text>
          </Pressable>
        ))}

        {isManager &&
          employees.map((e) => (
            <Pressable
              key={e.id}
              style={[styles.filterChip, assigneeFilter === e.id && styles.filterChipActive]}
              onPress={() => setAssigneeOverride(assigneeFilter === e.id ? null : e.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter assignee ${e.fullName}`}
              accessibilityState={{ selected: assigneeFilter === e.id }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  assigneeFilter === e.id && styles.filterChipTextActive,
                ]}
              >
                {e.fullName}
              </Text>
            </Pressable>
          ))}
      </ScrollView>

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
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isManager ? "No tasks yet. Tap + to create one" : "No tasks assigned to you yet"}
          </Text>
        }
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            showAssignee={isManager}
            canChangeStatus={isManager || item.assigneeId === profile?.id}
            onPress={() => router.push(`/task/${item.id}`)}
            onSetStatus={(status) => setStatus(item.id, status)}
          />
        )}
      />

      {isManager ? (
        <Pressable
          style={styles.fab}
          onPress={() => router.push("/task/new")}
          accessibilityRole="button"
          accessibilityLabel="Create a new task"
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </Pressable>
      ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  topBar: { paddingHorizontal: 16, paddingTop: 16 },
  search: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  filterBar: { flexGrow: 0, marginTop: 10 },
  filterBarContent: { gap: 8, paddingHorizontal: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.backgroundAlt,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.text, textTransform: "capitalize" },
  filterChipTextActive: { color: colors.white },
  list: { padding: 16, paddingBottom: 140 },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40, fontSize: 15 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
