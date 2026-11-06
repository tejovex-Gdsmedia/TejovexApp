import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";
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
  invalid_method: "Invalid verification method",
  error: "Unexpected error",
};

export default function BlockedAttemptsScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState<AttendanceAttempt[]>([]);

  const load = useCallback(async () => {
    try {
      setAttempts(await fetchBlockedAttempts(200));
      setError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

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
        <ErrorState message="Could not load blocked attempts." onRetry={() => load().catch(() => setError(true))} />
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
              {item.distanceMeters !== null ? ` · ${Math.round(item.distanceMeters)}m away` : ""}
            </Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" message="No blocked attempts." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  row: { backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10 },
  name: { fontWeight: "700", color: colors.text },
  reason: { color: colors.danger, fontSize: 13, marginTop: 4 },
  time: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
