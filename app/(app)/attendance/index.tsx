import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import TodayTab from "../../../src/attendance/components/TodayTab";
import HistoryTab from "../../../src/attendance/components/HistoryTab";
import RegularizeTab from "../../../src/attendance/components/RegularizeTab";
import LeavesTab from "../../../src/attendance/components/LeavesTab";
import HolidaysTab from "../../../src/attendance/components/HolidaysTab";

type Tab = "today" | "history" | "regularize" | "leaves" | "holidays";

const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "history", label: "History" },
  { key: "regularize", label: "Regularize" },
  { key: "leaves", label: "Leaves" },
  { key: "holidays", label: "Holidays" },
];

export default function AttendanceScreen() {
  const { profile } = useAuth();
  const attendance = useTodayAttendance(profile?.id);
  const [tab, setTab] = useState<Tab>("today");

  useFocusEffect(
    useCallback(() => {
      attendance.refresh();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id])
  );

  if (!profile) return null;

  return (
    <Screen edges={["bottom"]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroll} contentContainerStyle={styles.segmentContent}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.segment, tab === t.key && styles.segmentActive]}>
            <Text style={[styles.segmentText, tab === t.key && styles.segmentTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === "today" && <TodayTab attendance={attendance} />}
        {tab === "history" && <HistoryTab userId={profile.id} shift={attendance.shift} />}
        {tab === "regularize" && <RegularizeTab userId={profile.id} />}
        {tab === "leaves" && <LeavesTab userId={profile.id} />}
        {tab === "holidays" && <HolidaysTab />}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
  segmentContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  segment: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.backgroundAlt, minHeight: 40 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: colors.white },
  body: { padding: 20, paddingBottom: 60 },
});
