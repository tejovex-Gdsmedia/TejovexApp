import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import PremiumButton from "../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../src/components/ui/PremiumInput";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import { DayStatusBadge, RequestStatusBadge } from "../../../src/attendance/components/StatusBadge";
import { dayStatus } from "../../../src/attendance/rules";
import {
  applyRegularizationRequest,
  fetchCalendarDaysInRange,
  fetchMyLeaveRequests,
  fetchMyRegularizationRequests,
  fetchPunchHistory,
} from "../../../src/attendance/api";
import { CalendarDay, Punch, PunchType, RegularizationRequest } from "../../../src/attendance/types";

type RangeMode = "week" | "month" | "custom";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function AttendanceScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const today = useTodayAttendance(profile?.id);

  const [rangeMode, setRangeMode] = useState<RangeMode>("week");
  const [customFrom, setCustomFrom] = useState(addDays(new Date(), -7));
  const [customTo, setCustomTo] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);

  const [loadingHistory, setLoadingHistory] = useState(true);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [approvedLeaveDates, setApprovedLeaveDates] = useState<Set<string>>(new Set());

  const [regOpen, setRegOpen] = useState(false);
  const [regRequests, setRegRequests] = useState<RegularizationRequest[]>([]);
  const [regDate, setRegDate] = useState(new Date());
  const [regType, setRegType] = useState<PunchType>("check_in");
  const [regTime, setRegTime] = useState(new Date());
  const [regReason, setRegReason] = useState("");
  const [regPickerTarget, setRegPickerTarget] = useState<"date" | "time" | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);

  const { from, to } = useMemo(() => {
    if (rangeMode === "week") return { from: toDateString(addDays(new Date(), -7)), to: toDateString(new Date()) };
    if (rangeMode === "month") return { from: toDateString(addDays(new Date(), -30)), to: toDateString(new Date()) };
    return { from: toDateString(customFrom), to: toDateString(customTo) };
  }, [rangeMode, customFrom, customTo]);

  const loadHistory = useCallback(async () => {
    if (!profile) return;
    try {
      const [punchRows, calendarRows, leaveRows] = await Promise.all([
        fetchPunchHistory(profile.id, from, to),
        fetchCalendarDaysInRange(from, to),
        fetchMyLeaveRequests(profile.id),
      ]);
      setPunches(punchRows);
      setCalendarDays(calendarRows);
      const leaveDates = new Set<string>();
      leaveRows
        .filter((r) => r.status === "approved")
        .forEach((r) => {
          let cursor = new Date(r.fromDate);
          const end = new Date(r.toDate);
          while (cursor <= end) {
            leaveDates.add(toDateString(cursor));
            cursor = addDays(cursor, 1);
          }
        });
      setApprovedLeaveDates(leaveDates);
    } finally {
      setLoadingHistory(false);
    }
  }, [profile, from, to]);

  useEffect(() => {
    loadHistory().catch(() => Alert.alert("Could not load history", "Please try again."));
  }, [loadHistory]);

  const loadRegularizations = useCallback(async () => {
    if (!profile) return;
    try {
      setRegRequests(await fetchMyRegularizationRequests(profile.id));
    } finally {
      // No loading flag to reset — this list is secondary to the main history view.
    }
  }, [profile]);

  useEffect(() => {
    // Non-critical; the form still works without the list, so failures are swallowed.
    loadRegularizations().catch(() => {});
  }, [loadRegularizations]);

  const calendarByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    calendarDays.forEach((c) => map.set(c.date, c));
    return map;
  }, [calendarDays]);

  const submitRegularization = async () => {
    setSubmittingReg(true);
    try {
      const requestedTime = new Date(regDate);
      requestedTime.setHours(regTime.getHours(), regTime.getMinutes(), 0, 0);

      const result = await applyRegularizationRequest({
        punchDate: toDateString(regDate),
        type: regType,
        requestedTime: requestedTime.toISOString(),
        reason: regReason.trim(),
      });

      if (result.ok) {
        Alert.alert("Request submitted", "Your regularization request has been sent for approval.");
        setRegOpen(false);
        setRegReason("");
        loadRegularizations();
      } else {
        Alert.alert("Could not submit", result.message ?? "Please try again.");
      }
    } finally {
      setSubmittingReg(false);
    }
  };

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={punches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.todayCard}>
              <Text style={styles.todayLabel}>Today</Text>
              {today.loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
              ) : (
                <>
                  <DayStatusBadge status={today.status} />
                  <View style={styles.todayTimes}>
                    <Text style={styles.timeText}>
                      In: {today.punch?.checkInAt ? new Date(today.punch.checkInAt).toLocaleTimeString() : "—"}
                    </Text>
                    <Text style={styles.timeText}>
                      Out: {today.punch?.checkOutAt ? new Date(today.punch.checkOutAt).toLocaleTimeString() : "—"}
                    </Text>
                  </View>
                  {today.isWorkingDay && !today.punch?.checkInAt && (
                    <PremiumButton label="Check In" onPress={() => router.push("/(app)/attendance/check-in")} style={styles.actionButton} />
                  )}
                  {today.isWorkingDay && today.punch?.checkInAt && !today.punch?.checkOutAt && (
                    <PremiumButton label="Check Out" onPress={() => router.push("/(app)/attendance/check-out")} style={styles.actionButton} />
                  )}
                </>
              )}
            </View>

            <View style={styles.rangeTabs}>
              {(["week", "month", "custom"] as RangeMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setRangeMode(mode)}
                  style={[styles.rangeTab, rangeMode === mode && styles.rangeTabActive]}
                >
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

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>History</Text>
              <Pressable onPress={() => setRegOpen((v) => !v)}>
                <Text style={styles.linkText}>{regOpen ? "Close" : "Request correction"}</Text>
              </Pressable>
            </View>

            {regOpen && (
              <View style={styles.regForm}>
                <Text style={styles.label}>Date</Text>
                <Pressable style={styles.dateChip} onPress={() => setRegPickerTarget("date")}>
                  <Text style={styles.dateChipText}>{toDateString(regDate)}</Text>
                </Pressable>

                <View style={styles.rangeTabs}>
                  {(["check_in", "check_out"] as PunchType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setRegType(t)}
                      style={[styles.rangeTab, regType === t && styles.rangeTabActive]}
                    >
                      <Text style={[styles.rangeTabText, regType === t && styles.rangeTabTextActive]}>
                        {t === "check_in" ? "Check In" : "Check Out"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Time</Text>
                <Pressable style={styles.dateChip} onPress={() => setRegPickerTarget("time")}>
                  <Text style={styles.dateChipText}>
                    {regTime.getHours().toString().padStart(2, "0")}:{regTime.getMinutes().toString().padStart(2, "0")}
                  </Text>
                </Pressable>

                {regPickerTarget && (
                  <DateTimePicker
                    value={regPickerTarget === "date" ? regDate : regTime}
                    mode={regPickerTarget}
                    onChange={(_e, selected) => {
                      setRegPickerTarget(null);
                      if (!selected) return;
                      if (regPickerTarget === "date") setRegDate(selected);
                      else setRegTime(selected);
                    }}
                  />
                )}

                <Text style={styles.label}>Reason</Text>
                <PremiumInput value={regReason} onChangeText={setRegReason} placeholder="Why was this missed?" multiline />

                <PremiumButton label="Submit Request" onPress={submitRegularization} loading={submittingReg} style={styles.actionButton} />

                {regRequests.length > 0 && (
                  <View style={styles.regList}>
                    <Text style={styles.label}>Your recent requests</Text>
                    {regRequests.slice(0, 5).map((r) => (
                      <View key={r.id} style={styles.regRow}>
                        <Text style={styles.regRowText}>
                          {r.punchDate} · {r.type === "check_in" ? "Check In" : "Check Out"}
                        </Text>
                        <RequestStatusBadge status={r.status} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {loadingHistory && <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />}
          </View>
        }
        renderItem={({ item }) => {
          const calendarDay = calendarByDate.get(item.punchDate);
          const status = dayStatus({
            date: item.punchDate,
            isHoliday: !!calendarDay,
            isOnApprovedLeave: approvedLeaveDates.has(item.punchDate),
            shift: today.shift,
            checkInAt: item.checkInAt,
            checkOutAt: item.checkOutAt,
          });

          return (
            <View style={styles.historyRow}>
              <View>
                <Text style={styles.historyDate}>{item.punchDate}</Text>
                <Text style={styles.historyTimes}>
                  {item.checkInAt ? new Date(item.checkInAt).toLocaleTimeString() : "—"} –{" "}
                  {item.checkOutAt ? new Date(item.checkOutAt).toLocaleTimeString() : "—"}
                </Text>
              </View>
              <DayStatusBadge status={status} />
            </View>
          );
        }}
        ListEmptyComponent={!loadingHistory ? <Text style={styles.emptyText}>No attendance records in this range.</Text> : undefined}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 60 },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  todayLabel: { fontSize: 13, color: colors.muted, fontWeight: "600", marginBottom: 8 },
  todayTimes: { flexDirection: "row", gap: 24, marginTop: 12 },
  timeText: { fontSize: 15, color: colors.text, fontWeight: "600" },
  actionButton: { marginTop: 16 },
  rangeTabs: { flexDirection: "row", gap: 8, marginTop: 20 },
  rangeTab: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.card, alignItems: "center" },
  rangeTabActive: { backgroundColor: colors.primary },
  rangeTabText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  rangeTabTextActive: { color: colors.white },
  customRange: { flexDirection: "row", gap: 8, marginTop: 10 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flex: 1 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
  sectionHeader: { fontSize: 17, fontWeight: "700", color: colors.text },
  linkText: { color: colors.primary, fontWeight: "600" },
  regForm: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 6 },
  regList: { marginTop: 16, gap: 8 },
  regRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  regRowText: { color: colors.text, fontSize: 13 },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  historyDate: { fontWeight: "700", color: colors.text },
  historyTimes: { color: colors.muted, fontSize: 13, marginTop: 4 },
  emptyText: { textAlign: "center", color: colors.muted, marginTop: 20 },
});
