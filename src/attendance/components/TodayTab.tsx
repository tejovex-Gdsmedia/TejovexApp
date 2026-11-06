import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";
import { DayStatusBadge } from "./StatusBadge";
import { ErrorState } from "./StateViews";
import { TodayAttendance } from "../hooks";

export default function TodayTab({ attendance }: { attendance: TodayAttendance }) {
  const router = useRouter();

  if (attendance.loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (attendance.error) {
    return <ErrorState message={attendance.error} onRetry={() => attendance.refresh().catch(() => {})} />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Today</Text>
      <DayStatusBadge status={attendance.status} />

      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Check In</Text>
          <Text style={styles.cellValue}>
            {attendance.punch?.checkInAt ? new Date(attendance.punch.checkInAt).toLocaleTimeString() : "—"}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Check Out</Text>
          <Text style={styles.cellValue}>
            {attendance.punch?.checkOutAt ? new Date(attendance.punch.checkOutAt).toLocaleTimeString() : "—"}
          </Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Work Mode</Text>
          <Text style={styles.cellValue}>{attendance.settings?.workMode === "wfh" ? "WFH" : "Office"}</Text>
        </View>
      </View>

      {attendance.status === "missing_checkout" && (
        <Text style={styles.reminder}>You checked in but never checked out — add a Regularize request if this was missed.</Text>
      )}

      {!attendance.isWorkingDay ? (
        <Text style={styles.nonWorking}>Today is a holiday or weekend. No punch is required.</Text>
      ) : !attendance.punch?.checkInAt ? (
        <PremiumButton label="Check In" onPress={() => router.push("/(app)/attendance/check-in")} style={styles.button} />
      ) : !attendance.punch?.checkOutAt ? (
        <PremiumButton label="Check Out" onPress={() => router.push("/(app)/attendance/check-out")} style={styles.button} />
      ) : (
        <Text style={styles.nonWorking}>You&apos;re all done for today.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", marginTop: 16, gap: 12 },
  cell: { flex: 1 },
  cellLabel: { fontSize: 12, color: colors.muted },
  cellValue: { fontSize: 15, color: colors.text, fontWeight: "700", marginTop: 4 },
  reminder: { color: colors.danger, fontSize: 13, marginTop: 14, lineHeight: 18 },
  nonWorking: { color: colors.muted, fontSize: 13, marginTop: 16 },
  button: { marginTop: 18 },
});
