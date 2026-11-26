import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import AppDialog from "../../components/ui/AppDialog";
import DatePicker from "../../components/ui/DatePicker";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";
import PremiumInput from "../../components/ui/PremiumInput";
import { RequestStatusBadge } from "./StatusBadge";
import { EmptyState, ErrorState } from "./StateViews";
import { applyLeaveRequest, fetchLeaveTypes, fetchMyLeaveBalances, fetchMyLeaveRequests } from "../api";
import { LeaveBalance, LeaveRequest, LeaveType } from "../types";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function LeavesTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const [types, bals, reqs] = await Promise.all([
        fetchLeaveTypes(),
        fetchMyLeaveBalances(userId, year),
        fetchMyLeaveRequests(userId),
      ]);
      setLeaveTypes(types);
      setBalances(bals);
      setRequests(reqs);
      setSelectedTypeId((prev) => prev ?? (types.length > 0 ? types[0].id : null));
      setError(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const submit = async () => {
    if (!selectedTypeId) return;
    setSubmitting(true);
    try {
      const result = await applyLeaveRequest({
        leaveTypeId: selectedTypeId,
        from: toDateString(fromDate),
        to: toDateString(toDate),
        halfDay,
        reason: reason.trim(),
      });
      if (result.ok) {
        setDialog({ title: "Request submitted", message: "Your leave request has been sent for approval." });
        setReason("");
        load();
      } else {
        setDialog({ title: "Could not submit", message: result.message ?? "Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.spinner} />;
  }

  if (error) {
    return <ErrorState message="Could not load your leave balances." onRetry={() => load().catch(() => setError(true))} />;
  }

  return (
    <View>
      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
      />
      <View style={styles.balancesRow}>
        {balances.length === 0 ? (
          <EmptyState icon="calendar-outline" message="Your balances haven't been set up yet. Contact HR." />
        ) : (
          balances.map((b) => {
            const type = leaveTypes.find((t) => t.id === b.leaveTypeId);
            return (
              <View key={b.id} style={styles.balanceCard}>
                <Text style={styles.balanceValue}>{(b.allocated - b.used).toString()}</Text>
                <Text style={styles.balanceLabel}>{type?.name ?? "Leave"} left</Text>
                <Text style={styles.balanceSub}>
                  {b.used} used / {b.allocated} allocated
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Leave type</Text>
        <View style={styles.typeRow}>
          {leaveTypes.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setSelectedTypeId(t.id)}
              style={[styles.typeChip, selectedTypeId === t.id && styles.typeChipSelected]}
            >
              <Text style={[styles.typeChipText, selectedTypeId === t.id && styles.typeChipTextSelected]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>From</Text>
        <Pressable style={styles.dateChip} onPress={() => setPickerTarget("from")}>
          <Text style={styles.dateChipText}>{toDateString(fromDate)}</Text>
        </Pressable>

        <Text style={styles.label}>To</Text>
        <Pressable style={styles.dateChip} onPress={() => setPickerTarget("to")}>
          <Text style={styles.dateChipText}>{toDateString(toDate)}</Text>
        </Pressable>

        {pickerTarget && (
          <DatePicker
            value={pickerTarget === "from" ? fromDate : toDate}
            mode="date"
            onChange={(_e, selected) => {
              setPickerTarget(null);
              if (!selected) return;
              if (pickerTarget === "from") setFromDate(selected);
              else setToDate(selected);
            }}
          />
        )}

        <Pressable style={styles.halfDayRow} onPress={() => setHalfDay((v) => !v)}>
          <View style={[styles.checkbox, halfDay && styles.checkboxChecked]} />
          <Text style={styles.label}>Half day</Text>
        </Pressable>

        <Text style={styles.label}>Reason</Text>
        <PremiumInput value={reason} onChangeText={setReason} placeholder="Reason for leave" multiline />

        <PremiumButton label="Apply for Leave" onPress={submit} loading={submitting} disabled={!selectedTypeId} style={styles.submitButton} />
      </View>

      <Text style={styles.sectionHeader}>Your Requests</Text>
      {requests.length === 0 ? (
        <EmptyState icon="airplane-outline" message="No leave requests yet." />
      ) : (
        requests.map((item) => (
          <View key={item.id} style={styles.requestRow}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestTitle}>
                {item.leaveTypeName ?? "Leave"} · {item.fromDate}
                {item.fromDate !== item.toDate ? ` – ${item.toDate}` : ""}
              </Text>
              {item.status === "rejected" && (item.hrComment || item.managerComment) && (
                <Text style={styles.rejectionReason}>Reason: {item.hrComment ?? item.managerComment}</Text>
              )}
            </View>
            <RequestStatusBadge status={item.status} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40 },
  balancesRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  balanceCard: { backgroundColor: colors.card, borderRadius: 20, padding: 16, flexGrow: 1, alignItems: "center" },
  balanceValue: { fontSize: 24, fontWeight: "700", color: colors.primary },
  balanceLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  balanceSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 6 },
  typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  typeChipSelected: { backgroundColor: colors.primary },
  typeChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  typeChipTextSelected: { color: colors.white },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  halfDayRow: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  submitButton: { marginTop: 20 },
  sectionHeader: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 8 },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  requestInfo: { flex: 1, marginRight: 12 },
  requestTitle: { fontWeight: "700", color: colors.text },
  rejectionReason: { color: colors.danger, fontSize: 12, marginTop: 4 },
});
