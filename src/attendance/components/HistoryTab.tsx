import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../../constants/colors";
import { DayStatusBadge } from "./StatusBadge";
import { EmptyState, ErrorState } from "./StateViews";
import { dayStatus, istDate } from "../rules";
import { fetchCalendarDaysInRange, fetchMyLeaveRequests, fetchPunchHistory } from "../api";
import { CalendarDay, Punch, Shift } from "../types";

type RangeMode = "week" | "month" | "custom";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function enumerateDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(toDateString(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates;
}

interface HistoryRow {
  date: string;
  punch: Punch | null;
  status: ReturnType<typeof dayStatus>;
}

export default function HistoryTab({ userId, shift }: { userId: string; shift: Shift | null }) {
  const [rangeMode, setRangeMode] = useState<RangeMode>("week");
  const [customFrom, setCustomFrom] = useState(addDays(new Date(), -7));
  const [customTo, setCustomTo] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  const { from, to } = useMemo(() => {
    if (rangeMode === "week") return { from: toDateString(addDays(new Date(), -7)), to: toDateString(new Date()) };
    if (rangeMode === "month") return { from: toDateString(addDays(new Date(), -30)), to: toDateString(new Date()) };
    return { from: toDateString(customFrom), to: toDateString(customTo) };
  }, [rangeMode, customFrom, customTo]);

  const load = useCallback(async () => {
    try {
      const todayStr = istDate();
      const effectiveTo = to > todayStr ? todayStr : to;

      const [punches, calendarDays, leaveRequests] = await Promise.all([
        fetchPunchHistory(userId, from, effectiveTo),
        fetchCalendarDaysInRange(from, effectiveTo),
        fetchMyLeaveRequests(userId),
      ]);

      const punchByDate = new Map(punches.map((p) => [p.punchDate, p]));
      const calendarDates = new Set(calendarDays.map((c: CalendarDay) => c.date));
      const approvedLeaves = leaveRequests.filter((r) => r.status === "approved");
      const isOnApprovedLeave = (date: string) => approvedLeaves.some((r) => date >= r.fromDate && date <= r.toDate);

      const built = enumerateDates(from, effectiveTo)
        .map((date): HistoryRow => {
          const punch = punchByDate.get(date) ?? null;
          return {
            date,
            punch,
            status: dayStatus({
              date,
              isHoliday: calendarDates.has(date),
              isOnApprovedLeave: isOnApprovedLeave(date),
              shift,
              checkInAt: punch?.checkInAt ?? null,
              checkOutAt: punch?.checkOutAt ?? null,
            }),
          };
        })
        .reverse();

      setRows(built);
      setError(false);
    } finally {
      setLoading(false);
    }
  }, [userId, from, to, shift]);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  return (
    <View>
      <View style={styles.rangeTabs}>
        {(["week", "month", "custom"] as RangeMode[]).map((mode) => (
          <Pressable key={mode} onPress={() => setRangeMode(mode)} style={[styles.rangeTab, rangeMode === mode && styles.rangeTabActive]}>
            <Text style={[styles.rangeTabText, rangeMode === mode && styles.rangeTabTextActive]}>
              {mode === "week" ? "This Week" : mode === "month" ? "This Month" : "Custom"}
            </Text>
          </Pressable>
        ))}
      </View>

      {rangeMode === "custom" && (
        <View style={styles.customRange}>
          <Pressable style={styles.dateChip} onPress={() => setPickerTarget("from")}>
            <Text style={styles.dateChipText}>From {toDateString(customFrom)}</Text>
          </Pressable>
          <Pressable style={styles.dateChip} onPress={() => setPickerTarget("to")}>
            <Text style={styles.dateChipText}>To {toDateString(customTo)}</Text>
          </Pressable>
        </View>
      )}

      {pickerTarget && (
        <DateTimePicker
          value={pickerTarget === "from" ? customFrom : customTo}
          mode="date"
          onChange={(_e, selected) => {
            setPickerTarget(null);
            if (!selected) return;
            if (pickerTarget === "from") setCustomFrom(selected);
            else setCustomTo(selected);
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : error ? (
        <ErrorState message="Could not load your history." onRetry={() => load().catch(() => setError(true))} />
      ) : rows.length === 0 ? (
        <EmptyState icon="calendar-outline" message="No days in this range yet." />
      ) : (
        rows.map((row) => (
          <View key={row.date} style={styles.historyRow}>
            <View>
              <Text style={styles.historyDate}>{row.date}</Text>
              <Text style={styles.historyTimes}>
                {row.punch?.checkInAt ? new Date(row.punch.checkInAt).toLocaleTimeString() : "—"} –{" "}
                {row.punch?.checkOutAt ? new Date(row.punch.checkOutAt).toLocaleTimeString() : "—"}
              </Text>
            </View>
            <DayStatusBadge status={row.status} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rangeTabs: { flexDirection: "row", gap: 8, marginTop: 4 },
  rangeTab: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.card, alignItems: "center" },
  rangeTabActive: { backgroundColor: colors.primary },
  rangeTabText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  rangeTabTextActive: { color: colors.white },
  customRange: { flexDirection: "row", gap: 8, marginTop: 10 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flex: 1 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  spinner: { marginTop: 24 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
  },
  historyDate: { fontWeight: "700", color: colors.text },
  historyTimes: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
