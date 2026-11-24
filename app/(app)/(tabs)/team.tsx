import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { useTaskStore } from "../../../src/store/taskStore";
import { colors } from "../../../src/constants/colors";
import { computeStats, statsByAssignee } from "../../../src/utils/stats";
import Screen from "../../../src/components/layout/Screen";
import StatCard from "../../../src/components/dashboard/StatCard";
import WeeklyBarChart from "../../../src/components/dashboard/WeeklyBarChart";
import GaugeChart from "../../../src/components/dashboard/GaugeChart";
import TeamMemberRow, { MemberStatus } from "../../../src/components/dashboard/TeamMemberRow";
import AddEmployeeModal, { NewEmployee } from "../../../src/components/dashboard/AddEmployeeModal";
import { weeklyCompletionTrend, mockReminder } from "../../../src/data/dashboardMock";

export default function TeamScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const tasks = useTaskStore((s) => s.tasks);
  const profiles = useTaskStore((s) => s.profiles);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchProfiles = useTaskStore((s) => s.fetchProfiles);
  const [modalVisible, setModalVisible] = useState(false);
  // Mock-only: the created accounts aren't written to Supabase yet (see
  // AddEmployeeModal), so track them locally just to show they were added.
  const [pendingInvites, setPendingInvites] = useState<NewEmployee[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, [fetchTasks, fetchProfiles]);

  const employees = useMemo(() => profiles.filter((p) => p.role === "employee"), [profiles]);
  const employeeStats = useMemo(() => statsByAssignee(tasks, employees), [tasks, employees]);
  const stats = useMemo(() => computeStats(tasks), [tasks]);

  if (profile && profile.role !== "manager") {
    return <Redirect href="/" />;
  }

  const memberRows = employeeStats.map(({ profile: p, open, overdue }) => {
    const activeTask = tasks.find((t) => t.assigneeId === p.id && t.status !== "complete");
    const status: MemberStatus = overdue > 0 ? "pending" : open > 0 ? "in_progress" : "complete";
    return {
      id: p.id,
      name: p.fullName,
      subtitle: activeTask ? `Working on ${activeTask.title}` : "No active tasks",
      status,
    };
  });

  return (
    <Screen watermark>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.heading}>Team</Text>
            <Text style={styles.subheading}>Everything your team is shipping, in one calm place.</Text>
          </View>
          <Pressable
            style={styles.addBtn}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Add employee"
          >
            <Text style={styles.addBtnText}>+ Add Employee</Text>
          </Pressable>
        </View>

        <View style={styles.statGrid}>
          <StatCard
            label="Total Tasks"
            value={stats.total}
            caption="Across the team"
            highlighted
            onPress={() => router.push("/my-tasks")}
          />
          <StatCard
            label="Completed"
            value={stats.complete}
            caption="This cycle"
            onPress={() => router.push({ pathname: "/my-tasks", params: { status: "complete" } })}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            caption="Currently active"
            onPress={() => router.push({ pathname: "/my-tasks", params: { status: "in_progress" } })}
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            caption="Needs attention"
            onPress={() => router.push({ pathname: "/my-tasks", params: { status: "overdue" } })}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Analytics</Text>
          <WeeklyBarChart data={weeklyCompletionTrend} />
        </View>

        <View style={styles.row}>
          <View style={[styles.card, styles.flexCard]}>
            <Text style={styles.cardTitle}>Reminders</Text>
            <Text style={styles.reminderTitle}>{mockReminder.title}</Text>
            <Text style={styles.reminderTime}>{mockReminder.timeRange}</Text>
          </View>
          <View style={[styles.card, styles.flexCard]}>
            <Text style={styles.cardTitle}>Task Progress</Text>
            <GaugeChart percent={stats.completionRate} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team Collaboration</Text>
          {memberRows.length === 0 ? (
            <Text style={styles.empty}>No employees yet — add one to get started.</Text>
          ) : (
            memberRows.map((row) => (
              <TeamMemberRow key={row.id} name={row.name} subtitle={row.subtitle} status={row.status} />
            ))
          )}
          {pendingInvites.length > 0 ? (
            <>
              <Text style={styles.pendingLabel}>Pending invites</Text>
              {pendingInvites.map((invite) => (
                <TeamMemberRow
                  key={invite.email}
                  name={invite.fullName}
                  subtitle="Must change password on first login"
                  status="pending"
                />
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>

      <AddEmployeeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={(employee) => setPendingInvites((prev) => [...prev, employee])}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 140, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text },
  subheading: { fontSize: 13, color: colors.muted, marginTop: 4, maxWidth: 220 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 12 },
  row: { flexDirection: "row", gap: 16 },
  flexCard: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: "600", color: colors.primaryDeep },
  reminderTime: { fontSize: 12, color: colors.muted, marginTop: 4 },
  empty: { color: colors.muted, fontSize: 14 },
  pendingLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, marginTop: 12, marginBottom: 2 },
});
