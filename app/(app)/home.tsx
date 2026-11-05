import { useMemo } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { useTaskStore } from "../../src/store/taskStore";
import { colors } from "../../src/constants/colors";
import Screen from "../../src/components/layout/Screen";
import { useTodayAttendance } from "../../src/attendance/hooks";
import { istMinutesOfDay } from "../../src/attendance/rules";

function greetingForNow(): string {
  const hour = Math.floor(istMinutesOfDay(new Date()) / 60);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export default function HomeScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const attendance = useTodayAttendance(profile?.id);

  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const greeting = `${greetingForNow()}, ${firstName}`;
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    []
  );

  const openTaskCount = useMemo(() => {
    if (!profile) return 0;
    return tasks.filter(
      (t) =>
        t.status !== "complete" &&
        (t.assigneeId === profile.id || t.subscribers.some((s) => s.id === profile.id))
    ).length;
  }, [tasks, profile]);

  const attendanceSubtitle = attendance.loading
    ? "Loading..."
    : !attendance.isWorkingDay
      ? "Non-working day"
      : attendance.punch?.checkOutAt
        ? `Checked out at ${formatTime(attendance.punch.checkOutAt)}`
        : attendance.punch?.checkInAt
          ? `Checked in at ${formatTime(attendance.punch.checkInAt)}`
          : "Not marked today";

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      signOut();
      return;
    }
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>{todayLabel}</Text>
          </View>
          <Pressable
            onPress={handleSignOut}
            style={styles.signOutButton}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.muted} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/attendance")}
          style={[styles.card, { backgroundColor: colors.card }]}
          accessibilityRole="button"
          accessibilityLabel="Attendance"
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="finger-print-outline" size={28} color={colors.white} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Attendance</Text>
            <Text style={styles.cardSubtitle}>{attendanceSubtitle}</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/(tabs)")}
          style={[styles.card, { backgroundColor: colors.card }]}
          accessibilityRole="button"
          accessibilityLabel="Tasks"
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryDeep }]}>
            <Ionicons name="checkmark-done-outline" size={28} color={colors.white} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Tasks</Text>
            <Text style={styles.cardSubtitle}>
              {openTaskCount} open task{openTaskCount === 1 ? "" : "s"}
            </Text>
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 32,
  },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  date: { fontSize: 14, color: colors.muted, marginTop: 4 },
  signOutButton: { padding: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 140,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 19, fontWeight: "700", color: colors.text },
  cardSubtitle: { fontSize: 14, color: colors.muted, marginTop: 6 },
});
