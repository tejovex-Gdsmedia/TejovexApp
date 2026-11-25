import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import { DAY_STATUS_COLORS } from "../../../../src/attendance/components/StatusBadge";
import { DAY_STATUS_LABELS, DayStatus, dayStatus, istDate } from "../../../../src/attendance/rules";
import {
  fetchApprovedLeaveUserIdsForDate,
  fetchBlockedAttempts,
  fetchEmployees,
  fetchShifts,
  fetchTodayCalendarDay,
  fetchTodayPunches,
} from "../../../../src/attendance/api";
import { AttendanceAttempt, Employee } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";

export default function AttendanceDashboardScreen() {
  const allowed = useRequireAttendanceAdmin();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statuses, setStatuses] = useState<Map<string, DayStatus>>(new Map());
  const [attempts, setAttempts] = useState<AttendanceAttempt[]>([]);

  const load = useCallback(async () => {
    try {
      const today = istDate();
      const [emps, shifts, punches, calendarDay, leaveUserIds, recentAttempts] = await Promise.all([
        fetchEmployees(),
        fetchShifts(),
        fetchTodayPunches(today),
        fetchTodayCalendarDay(today),
        fetchApprovedLeaveUserIdsForDate(today),
        fetchBlockedAttempts(50),
      ]);
      const attemptsToday = recentAttempts.filter((a) => istDate(new Date(a.createdAt)) === today);

      const shiftMap = new Map(shifts.map((s) => [s.id, s]));
      const punchByUser = new Map(punches.map((p) => [p.userId, p]));
      const statusMap = new Map<string, DayStatus>();

      emps.forEach((emp) => {
        const punch = punchByUser.get(emp.id);
        const shift = emp.shiftId ? shiftMap.get(emp.shiftId) ?? null : null;
        statusMap.set(
          emp.id,
          dayStatus({
            date: today,
            isHoliday: !!calendarDay,
            isOnApprovedLeave: leaveUserIds.has(emp.id),
            shift,
            checkInAt: punch?.checkInAt ?? null,
            checkOutAt: punch?.checkOutAt ?? null,
          })
        );
      });

      setEmployees(emps);
      setStatuses(statusMap);
      setAttempts(attemptsToday);
      setError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().catch(() => setError(true)).finally(() => setRefreshing(false));
  }, [load]);

  const counts = useMemo(() => {
    const result: Record<DayStatus, number> = {
      present: 0,
      late: 0,
      half_day: 0,
      absent: 0,
      on_leave: 0,
      holiday_weekend: 0,
      missing_checkout: 0,
    };
    statuses.forEach((status) => {
      result[status] += 1;
    });
    return result;
  }, [statuses]);

  const notCheckedIn = useMemo(
    () => employees.filter((e) => statuses.get(e.id) === "absent"),
    [employees, statuses]
  );

  if (!allowed) return null;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message="Could not load the dashboard." onRetry={() => load().catch(() => setError(true))} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.tiles}>
          {(Object.keys(counts) as DayStatus[]).map((status) => (
            <View key={status} style={styles.tile}>
              <Text style={[styles.tileValue, { color: DAY_STATUS_COLORS[status] }]}>{counts[status]}</Text>
              <Text style={styles.tileLabel}>{status === "holiday_weekend" ? "Non-working" : DAY_STATUS_LABELS[status]}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionHeader}>Not Yet Checked In ({notCheckedIn.length})</Text>
        {notCheckedIn.length === 0 ? (
          <EmptyState icon="checkmark-circle-outline" message="Everyone has checked in." />
        ) : (
          notCheckedIn.map((e) => (
            <View key={e.id} style={styles.row}>
              <Text style={styles.rowText}>{e.fullName}</Text>
            </View>
          ))
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Blocked Attempts Today</Text>
          <Pressable onPress={() => router.push("/(app)/attendance/admin/blocked-attempts")}>
            <Text style={styles.linkText}>View all</Text>
          </Pressable>
        </View>
        {attempts.length === 0 ? (
          <EmptyState icon="shield-checkmark-outline" message="No blocked attempts today." />
        ) : (
          attempts.slice(0, 5).map((a) => (
            <View key={a.id} style={styles.row}>
              <Text style={styles.rowText}>{a.userName ?? "Unknown"}</Text>
              <Text style={styles.rowSubtext}>{a.reason.replace(/_/g, " ")}</Text>
            </View>
          ))
        )}

        <View style={styles.adminLinks}>
          <AdminLink label="Approvals" onPress={() => router.push("/(app)/attendance/admin/approvals")} />
          <AdminLink label="Employees" onPress={() => router.push("/(app)/attendance/admin/employees")} />
          <AdminLink label="Offices" onPress={() => router.push("/(app)/attendance/admin/offices")} />
          <AdminLink label="Shifts" onPress={() => router.push("/(app)/attendance/admin/shifts")} />
          <AdminLink label="Calendar" onPress={() => router.push("/(app)/attendance/admin/calendar")} />
          <AdminLink label="Leave Types" onPress={() => router.push("/(app)/attendance/admin/leave-types")} />
          <AdminLink label="Reports" onPress={() => router.push("/(app)/attendance/admin/reports")} />
          <AdminLink label="Audit Log" onPress={() => router.push("/(app)/attendance/admin/audit-log")} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function AdminLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.adminLink} onPress={onPress}>
      <Text style={styles.adminLinkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { backgroundColor: colors.card, borderRadius: 20, padding: 14, minWidth: "30%", flexGrow: 1, alignItems: "center" },
  tileValue: { fontSize: 24, fontWeight: "700" },
  tileLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  sectionHeader: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
  linkText: { color: colors.primary, fontWeight: "600" },
  row: { backgroundColor: colors.card, borderRadius: 20, padding: 12, marginBottom: 8 },
  rowText: { color: colors.text, fontWeight: "600" },
  rowSubtext: { color: colors.muted, fontSize: 12, marginTop: 2 },
  emptyText: { color: colors.muted, fontSize: 13 },
  adminLinks: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 28 },
  adminLink: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  adminLinkText: { color: colors.white, fontWeight: "700" },
});
