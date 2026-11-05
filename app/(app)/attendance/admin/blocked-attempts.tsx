import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import { fetchBlockedAttempts } from "../../../../src/attendance/api";
import { AttendanceAttempt } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";

const REASON_LABELS: Record<string, string> = {
  outside_radius: "Outside office radius",
  already_checked_in: "Already checked in",
  already_checked_out: "Already checked out",
  no_check_in: "No check-in yet",
  non_working_day: "Non-working day",
  no_settings: "Attendance not configured",
  no_office: "No office assigned",
  location_denied: "Location permission denied",
  location_unavailable: "Location unavailable",
  verification_failed: "Biometric verification failed",
  error: "Unexpected error",
};

export default function BlockedAttemptsScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AttendanceAttempt[]>([]);

  useEffect(() => {
    fetchBlockedAttempts(200)
      .then(setAttempts)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={attempts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.userName ?? "Unknown"}</Text>
            <Text style={styles.reason}>
              {item.type === "check_in" ? "Check-in" : "Check-out"} · {REASON_LABELS[item.reason] ?? item.reason}
            </Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No blocked attempts.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  row: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10 },
  name: { fontWeight: "700", color: colors.text },
  reason: { color: colors.danger, fontSize: 13, marginTop: 4 },
  time: { color: colors.muted, fontSize: 12, marginTop: 4 },
  emptyText: { textAlign: "center", color: colors.muted, marginTop: 20 },
});
