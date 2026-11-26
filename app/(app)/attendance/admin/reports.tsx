import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DatePicker from "../../../../src/components/ui/DatePicker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";
import { DAY_STATUS_LABELS, DayStatus, dayStatus } from "../../../../src/attendance/rules";
import {
  fetchApprovedLeaveInRange,
  fetchCalendarDaysInRange,
  fetchEmployees,
  fetchPunchesInRange,
  fetchShifts,
} from "../../../../src/attendance/api";
import { Employee, Punch } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import AppDialog from "../../../../src/components/ui/AppDialog";

type ReportView = "daily" | "monthly";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

interface DailyRow {
  date: string;
  employeeName: string;
  status: DayStatus;
  punch: Punch;
}

export default function ReportsScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesError, setEmployeesError] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [from, setFrom] = useState(addDays(new Date(), -30));
  const [to, setTo] = useState(new Date());
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [generating, setGenerating] = useState(false);
  const [view, setView] = useState<ReportView>("daily");
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployees(await fetchEmployees());
      setEmployeesError(false);
    } finally {
      // No loading flag for this list — it's secondary to the date/view filters above.
    }
  }, []);

  useEffect(() => {
    loadEmployees().catch(() => setEmployeesError(true));
  }, [loadEmployees]);

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const loadPreview = useCallback(async () => {
    try {
      const fromStr = toDateString(from);
      const toStr = toDateString(to);

      const [punches, calendarDays, leaves, shifts] = await Promise.all([
        fetchPunchesInRange(fromStr, toStr, selectedEmployeeId ?? undefined),
        fetchCalendarDaysInRange(fromStr, toStr),
        fetchApprovedLeaveInRange(fromStr, toStr),
        fetchShifts(),
      ]);

      const shiftById = new Map(shifts.map((s) => [s.id, s]));
      const calendarByDate = new Set(calendarDays.map((c) => c.date));
      const isOnLeave = (userId: string, date: string) =>
        leaves.some((l) => l.user_id === userId && date >= l.from_date && date <= l.to_date);

      const rows: DailyRow[] = punches.map((p) => {
        const employee = employeeById.get(p.userId);
        const shift = employee?.shiftId ? shiftById.get(employee.shiftId) ?? null : null;
        return {
          date: p.punchDate,
          employeeName: employee?.fullName ?? p.userId,
          status: dayStatus({
            date: p.punchDate,
            isHoliday: calendarByDate.has(p.punchDate),
            isOnApprovedLeave: isOnLeave(p.userId, p.punchDate),
            shift,
            checkInAt: p.checkInAt,
            checkOutAt: p.checkOutAt,
          }),
          punch: p,
        };
      });

      setDailyRows(rows);
      setPreviewError(false);
    } finally {
      setLoadingPreview(false);
    }
  }, [from, to, selectedEmployeeId, employeeById]);

  useEffect(() => {
    loadPreview().catch(() => setPreviewError(true));
  }, [loadPreview]);

  const monthlyRows = useMemo(() => {
    const byEmployee = new Map<string, Record<DayStatus, number>>();
    dailyRows.forEach((row) => {
      const counts =
        byEmployee.get(row.employeeName) ??
        { present: 0, late: 0, half_day: 0, absent: 0, on_leave: 0, holiday_weekend: 0, missing_checkout: 0 };
      counts[row.status] += 1;
      byEmployee.set(row.employeeName, counts);
    });
    return Array.from(byEmployee.entries());
  }, [dailyRows]);

  const generateCsv = async () => {
    setGenerating(true);
    try {
      const fromStr = toDateString(from);
      const toStr = toDateString(to);

      const rows = ["Date,Employee,Status,Check In,Check Out,Worked Hours,Work Mode"];
      dailyRows.forEach(({ date, employeeName, status, punch }) => {
        const workedHours =
          punch.checkInAt && punch.checkOutAt
            ? ((new Date(punch.checkOutAt).getTime() - new Date(punch.checkInAt).getTime()) / 3_600_000).toFixed(2)
            : "";

        rows.push(
          [
            date,
            employeeName,
            DAY_STATUS_LABELS[status],
            punch.checkInAt ? new Date(punch.checkInAt).toLocaleTimeString() : "",
            punch.checkOutAt ? new Date(punch.checkOutAt).toLocaleTimeString() : "",
            workedHours,
            punch.workMode,
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
        setDialog({ title: "Report ready", message: `Saved to ${file.uri}` });
      }
    } catch (error) {
      setDialog({ title: "Could not generate report", message: error instanceof Error ? error.message : "Please try again." });
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
          <DatePicker
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
        {employeesError ? (
          <ErrorState message="Could not load employees." onRetry={loadEmployees} />
        ) : (
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
        )}

        <Text style={styles.label}>View</Text>
        <View style={styles.chipRow}>
          {(["daily", "monthly"] as ReportView[]).map((v) => (
            <Pressable key={v} onPress={() => setView(v)} style={[styles.chip, view === v && styles.chipSelected]}>
              <Text style={[styles.chipText, view === v && styles.chipTextSelected]}>{v === "daily" ? "Daily" : "Monthly"}</Text>
            </Pressable>
          ))}
        </View>

        {loadingPreview ? (
          <ActivityIndicator color={colors.primary} style={styles.spinner} />
        ) : previewError ? (
          <ErrorState message="Could not load the report preview." onRetry={() => loadPreview().catch(() => setPreviewError(true))} />
        ) : dailyRows.length === 0 ? (
          <EmptyState icon="bar-chart-outline" message="No punches in this range." />
        ) : view === "daily" ? (
          dailyRows.map((row, i) => (
            <View key={`${row.date}-${row.employeeName}-${i}`} style={styles.previewRow}>
              <Text style={styles.previewText}>
                {row.date} · {row.employeeName}
              </Text>
              <Text style={styles.previewStatus}>{DAY_STATUS_LABELS[row.status]}</Text>
            </View>
          ))
        ) : (
          monthlyRows.map(([employeeName, counts]) => (
            <View key={employeeName} style={styles.previewRow}>
              <Text style={styles.previewText}>{employeeName}</Text>
              <Text style={styles.previewStatus}>
                P{counts.present} L{counts.late} H{counts.half_day} A{counts.absent} OL{counts.on_leave} MC{counts.missing_checkout}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.hint}>
          Exports the daily data above (including late-coming, absenteeism, half-day, and leave status) as CSV —
          open it in any spreadsheet app for further summarizing.
        </Text>

        {generating ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <PremiumButton label="Export CSV" onPress={generateCsv} disabled={dailyRows.length === 0} style={styles.exportButton} />
        )}
      </ScrollView>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
      />
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
  spinner: { marginTop: 20 },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 12,
    marginTop: 8,
  },
  previewText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  previewStatus: { color: colors.muted, fontSize: 12 },
  hint: { color: colors.muted, fontSize: 12, marginTop: 20, lineHeight: 18 },
  exportButton: { marginTop: 20 },
});
