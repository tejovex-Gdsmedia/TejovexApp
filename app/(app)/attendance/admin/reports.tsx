import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import { DAY_STATUS_LABELS, dayStatus } from "../../../../src/attendance/rules";
import {
  fetchApprovedLeaveInRange,
  fetchCalendarDaysInRange,
  fetchEmployees,
  fetchPunchesInRange,
  fetchShifts,
} from "../../../../src/attendance/api";
import { Employee } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function ReportsScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [from, setFrom] = useState(addDays(new Date(), -30));
  const [to, setTo] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchEmployees().then(setEmployees);
  }, []);

  const generateCsv = async () => {
    setGenerating(true);
    try {
      const fromStr = toDateString(from);
      const toStr = toDateString(to);

      const [punches, calendarDays, leaves, shifts] = await Promise.all([
        fetchPunchesInRange(fromStr, toStr, selectedEmployeeId ?? undefined),
        fetchCalendarDaysInRange(fromStr, toStr),
        fetchApprovedLeaveInRange(fromStr, toStr),
        fetchShifts(),
      ]);

      const employeeById = new Map(employees.map((e) => [e.id, e]));
      const shiftById = new Map(shifts.map((s) => [s.id, s]));
      const calendarByDate = new Set(calendarDays.map((c) => c.date));
      const leaveRanges = leaves;

      const isOnLeave = (userId: string, date: string) =>
        leaveRanges.some((l) => l.user_id === userId && date >= l.from_date && date <= l.to_date);

      const rows = ["Date,Employee,Status,Check In,Check Out,Worked Hours,Work Mode"];
      punches.forEach((p) => {
        const employee = employeeById.get(p.userId);
        const shift = employee?.shiftId ? shiftById.get(employee.shiftId) ?? null : null;
        const status = dayStatus({
          date: p.punchDate,
          isHoliday: calendarByDate.has(p.punchDate),
          isOnApprovedLeave: isOnLeave(p.userId, p.punchDate),
          shift,
          checkInAt: p.checkInAt,
          checkOutAt: p.checkOutAt,
        });
        const workedHours =
          p.checkInAt && p.checkOutAt
            ? ((new Date(p.checkOutAt).getTime() - new Date(p.checkInAt).getTime()) / 3_600_000).toFixed(2)
            : "";

        rows.push(
          [
            p.punchDate,
            employee?.fullName ?? p.userId,
            DAY_STATUS_LABELS[status],
            p.checkInAt ? new Date(p.checkInAt).toLocaleTimeString() : "",
            p.checkOutAt ? new Date(p.checkOutAt).toLocaleTimeString() : "",
            workedHours,
            p.workMode,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        );
      });

      const file = new File(Paths.cache, `attendance-report-${fromStr}-to-${toStr}.csv`);
      file.create({ overwrite: true });
      await file.write(rows.join("\n"));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: "text/csv", dialogTitle: "Attendance report" });
      } else {
        Alert.alert("Report ready", `Saved to ${file.uri}`);
      }
    } catch (error) {
      Alert.alert("Could not generate report", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!allowed) return null;

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Date range</Text>
        <View style={styles.rangeRow}>
          <Pressable style={[styles.dateChip, styles.half]} onPress={() => setPickerTarget("from")}>
            <Text style={styles.dateChipText}>From {toDateString(from)}</Text>
          </Pressable>
          <Pressable style={[styles.dateChip, styles.half]} onPress={() => setPickerTarget("to")}>
            <Text style={styles.dateChipText}>To {toDateString(to)}</Text>
          </Pressable>
        </View>
        {pickerTarget && (
          <DateTimePicker
            value={pickerTarget === "from" ? from : to}
            mode="date"
            onChange={(_e, selected) => {
              setPickerTarget(null);
              if (!selected) return;
              if (pickerTarget === "from") setFrom(selected);
              else setTo(selected);
            }}
          />
        )}

        <Text style={styles.label}>Employee</Text>
        <View style={styles.chipRow}>
          <Pressable
            onPress={() => setSelectedEmployeeId(null)}
            style={[styles.chip, selectedEmployeeId === null && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selectedEmployeeId === null && styles.chipTextSelected]}>All</Text>
          </Pressable>
          {employees.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => setSelectedEmployeeId(e.id)}
              style={[styles.chip, selectedEmployeeId === e.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selectedEmployeeId === e.id && styles.chipTextSelected]}>{e.fullName}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.hint}>
          Exports daily, monthly, late-coming, absenteeism, half-day, and leave data together — filter by
          employee and date range above, then export and open in any spreadsheet app.
        </Text>

        {generating ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <PremiumButton label="Export CSV" onPress={generateCsv} style={styles.exportButton} />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 16, marginBottom: 8 },
  rangeRow: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextSelected: { color: colors.white },
  hint: { color: colors.muted, fontSize: 12, marginTop: 20, lineHeight: 18 },
  exportButton: { marginTop: 20 },
});
