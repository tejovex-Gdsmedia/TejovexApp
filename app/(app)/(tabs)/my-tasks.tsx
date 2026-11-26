import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  Modal,
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
  const { assignee, status } = useLocalSearchParams<{ assignee?: string; status?: string }>();
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
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [assigneeOverride, setAssigneeOverride] = useState<string | null | undefined>(
    undefined
  );
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const assigneeFilter = assigneeOverride !== undefined ? assigneeOverride : assignee ?? null;
  const [activeTabOverride, setActiveTabOverride] = useState<TaskTabKey | undefined>(undefined);
  const activeTab = activeTabOverride ?? (status as TaskTabKey) ?? "pending";

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

        <Pressable
          style={[styles.filterChip, priorityFilter !== null && styles.filterChipActive]}
          onPress={() => setPriorityDropdownOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter by priority"
          accessibilityState={{ selected: priorityFilter !== null }}
        >
          <View style={styles.priorityChipRow}>
            <Text style={[styles.filterChipText, priorityFilter !== null && styles.filterChipTextActive]}>
              {priorityFilter ? priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) : "Priority"}
            </Text>
            <Ionicons
              name={priorityDropdownOpen ? "chevron-up" : "chevron-down"}
              size={12}
              color={priorityFilter !== null ? colors.white : colors.text}
              style={{ marginLeft: 4 }}
            />
          </View>
        </Pressable>

        <Pressable
          style={[styles.filterChip, categoryFilter !== null && styles.filterChipActive]}
          onPress={() => setCategoryDropdownOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter by department"
          accessibilityState={{ selected: categoryFilter !== null }}
        >
          <View style={styles.priorityChipRow}>
            <Text style={[styles.filterChipText, categoryFilter !== null && styles.filterChipTextActive]}>
              {categoryFilter ?? "Department"}
            </Text>
            <Ionicons
              name={categoryDropdownOpen ? "chevron-up" : "chevron-down"}
              size={12}
              color={categoryFilter !== null ? colors.white : colors.text}
              style={{ marginLeft: 4 }}
            />
          </View>
        </Pressable>

        {isManager && (
          <Pressable
            style={[styles.filterChip, assigneeFilter !== null && styles.filterChipActive]}
            onPress={() => setEmployeeDropdownOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Filter by employee"
            accessibilityState={{ selected: assigneeFilter !== null }}
          >
            <View style={styles.priorityChipRow}>
              <Text style={[styles.filterChipText, assigneeFilter !== null && styles.filterChipTextActive]}>
                {assigneeFilter !== null
                  ? (employees.find((e) => e.id === assigneeFilter)?.fullName ?? "Employee")
                  : "Employees"}
              </Text>
              <Ionicons
                name={employeeDropdownOpen ? "chevron-up" : "chevron-down"}
                size={12}
                color={assigneeFilter !== null ? colors.white : colors.text}
                style={{ marginLeft: 4 }}
              />
            </View>
          </Pressable>
        )}
      </ScrollView>

      <StatusTabs
        tabs={[
          { key: "overdue", label: "Overdue", count: counts.overdue },
          { key: "pending", label: "Pending", count: counts.pending },
          { key: "in_progress", label: "In Progress", count: counts.in_progress },
          { key: "complete", label: "Complete", count: counts.complete },
        ]}
        active={activeTab}
        onChange={setActiveTabOverride}
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

      <Modal
        visible={priorityDropdownOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPriorityDropdownOpen(false)}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setPriorityDropdownOpen(false)}>
          <View style={styles.dropdownMenu}>
            {([null, "low", "medium", "high"] as (string | null)[]).map((p) => (
              <Pressable
                key={p ?? "all"}
                style={[styles.dropdownItem, priorityFilter === p && styles.dropdownItemActive]}
                onPress={() => {
                  setPriorityFilter(p);
                  setPriorityDropdownOpen(false);
                }}
              >
                {p !== null && (
                  <View style={[styles.priorityDot, { backgroundColor: colors.priority[p as "low" | "medium" | "high"] }]} />
                )}
                <Text style={[styles.dropdownItemText, priorityFilter === p && styles.dropdownItemTextActive]}>
                  {p === null ? "All priorities" : p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
                {priorityFilter === p && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={categoryDropdownOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCategoryDropdownOpen(false)}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setCategoryDropdownOpen(false)}>
          <View style={styles.dropdownMenu}>
            {([null, ...categories] as (string | null)[]).map((c) => (
              <Pressable
                key={c ?? "all"}
                style={[styles.dropdownItem, categoryFilter === c && styles.dropdownItemActive]}
                onPress={() => {
                  setCategoryFilter(c);
                  setCategoryDropdownOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, categoryFilter === c && styles.dropdownItemTextActive]}>
                  {c === null ? "All departments" : c}
                </Text>
                {categoryFilter === c && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={employeeDropdownOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setEmployeeDropdownOpen(false)}
      >
        <Pressable style={styles.dropdownBackdrop} onPress={() => setEmployeeDropdownOpen(false)}>
          <View style={styles.dropdownMenu}>
            {([null, ...employees] as (typeof employees[number] | null)[]).map((e) => (
              <Pressable
                key={e?.id ?? "all"}
                style={[styles.dropdownItem, assigneeFilter === (e?.id ?? null) && styles.dropdownItemActive]}
                onPress={() => {
                  setAssigneeOverride(e?.id ?? null);
                  setEmployeeDropdownOpen(false);
                }}
              >
                <Text style={[styles.dropdownItemText, assigneeFilter === (e?.id ?? null) && styles.dropdownItemTextActive]}>
                  {e === null ? "All employees" : e.fullName}
                </Text>
                {assigneeFilter === (e?.id ?? null) && (
                  <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  priorityChipRow: { flexDirection: "row", alignItems: "center" },
  dropdownBackdrop: { flex: 1, justifyContent: "flex-start", paddingTop: 158, paddingHorizontal: 16 },
  dropdownMenu: {
    alignSelf: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 170,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  dropdownItemActive: { backgroundColor: colors.backgroundAlt },
  dropdownItemText: { fontSize: 14, fontWeight: "600", color: colors.text },
  dropdownItemTextActive: { color: colors.primary },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
});
