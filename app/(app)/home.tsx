import { useCallback, useMemo, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { useTaskStore } from "../../src/store/taskStore";
import { colors } from "../../src/constants/colors";
import Screen from "../../src/components/layout/Screen";
import { useTodayAttendance } from "../../src/attendance/hooks";
import { istMinutesOfDay } from "../../src/attendance/rules";

const CARD_GAP = 12;
const SIDE_PAD = 20;
const CARD_WIDTH = (Dimensions.get("window").width - SIDE_PAD * 2 - CARD_GAP) / 2;

function greetingForNow(): string {
  const hour = Math.floor(istMinutesOfDay(new Date()) / 60);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

interface GridCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
}

function GridCard({ icon, iconBg, title, subtitle, buttonLabel, onPress }: GridCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={26} color={colors.white} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle} numberOfLines={2}>{subtitle}</Text>
      <Pressable style={styles.cardButton} onPress={onPress} accessibilityRole="button" accessibilityLabel={buttonLabel}>
        <Text style={styles.cardButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const tasks = useTaskStore((s) => s.tasks);
  const attendance = useTodayAttendance(profile?.id);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const isAttendanceAdmin = profile?.role === "manager" || profile?.role === "hr";

  useFocusEffect(
    useCallback(() => {
      attendance.refresh().catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id])
  );

  const showCheckInReminder =
    !attendance.loading && attendance.isWorkingDay && !attendance.punch?.checkInAt && !reminderDismissed;

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
    : attendance.error
      ? "Could not load"
      : !attendance.isWorkingDay
        ? "Non-working day"
        : attendance.punch?.checkOutAt
          ? `Out at ${formatTime(attendance.punch.checkOutAt)}`
          : attendance.punch?.checkInAt
            ? `In at ${formatTime(attendance.punch.checkInAt)}`
            : "Not marked today";

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await attendance.refresh().catch(() => {});
    setRefreshing(false);
  }, [attendance]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{todayLabel}</Text>
        </View>

        {/* Check-in reminder */}
        {showCheckInReminder && (
          <View style={styles.reminderBanner}>
            <Ionicons name="time-outline" size={18} color={colors.primaryDeep} />
            <Text style={styles.reminderText}>Don&apos;t forget to check in today</Text>
            <Pressable onPress={() => router.push("/(app)/attendance/check-in")} accessibilityRole="button">
              <Text style={styles.reminderAction}>Check In</Text>
            </Pressable>
            <Pressable onPress={() => setReminderDismissed(true)} style={styles.reminderDismiss} accessibilityRole="button">
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>
        )}

        {/* Grid */}
        <View style={styles.grid}>
          <GridCard
            icon="finger-print-outline"
            iconBg={colors.primary}
            title="My Attendance"
            subtitle={attendanceSubtitle}
            buttonLabel="Go To Attendance"
            onPress={() => router.push("/(app)/attendance")}
          />
          <GridCard
            icon="checkmark-done-outline"
            iconBg={colors.primaryDeep}
            title="My Tasks"
            subtitle={`${openTaskCount} open task${openTaskCount === 1 ? "" : "s"}`}
            buttonLabel="Go To Tasks"
            onPress={() => router.push("/(app)/(tabs)")}
          />
          {isAttendanceAdmin && (
            <>
              <GridCard
                icon="speedometer-outline"
                iconBg={colors.primary}
                title="Admin Dashboard"
                subtitle="Attendance overview"
                buttonLabel="Go To Dashboard"
                onPress={() => router.push("/(app)/attendance/admin")}
              />
              <GridCard
                icon="document-text-outline"
                iconBg="#6366F1"
                title="Leave Approvals"
                subtitle="Review pending requests"
                buttonLabel="Go To Approvals"
                onPress={() => router.push("/(app)/attendance/admin/approvals")}
              />
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: SIDE_PAD, paddingBottom: 48 },
  header: {
    marginTop: 8,
    marginBottom: 28,
  },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text },
  date: { fontSize: 14, color: colors.muted, marginTop: 4 },
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  reminderText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },
  reminderAction: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  reminderDismiss: { padding: 6, marginLeft: 4 },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: colors.muted, marginBottom: 14, lineHeight: 16, flex: 1 },
  cardButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: "auto",
  },
  cardButtonText: { color: colors.white, fontWeight: "700", fontSize: 12 },
});
