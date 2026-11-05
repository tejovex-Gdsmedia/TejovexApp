import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import PremiumButton from "../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../src/components/ui/PremiumInput";
import { RequestStatusBadge } from "../../../src/attendance/components/StatusBadge";
import { applyLeaveRequest, fetchLeaveTypes, fetchMyLeaveBalances, fetchMyLeaveRequests } from "../../../src/attendance/api";
import { LeaveBalance, LeaveRequest, LeaveType } from "../../../src/attendance/types";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function LeavesScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"from" | "to" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const year = new Date().getFullYear();
      const [types, bals, reqs] = await Promise.all([
        fetchLeaveTypes(),
        fetchMyLeaveBalances(profile.id, year),
        fetchMyLeaveRequests(profile.id),
      ]);
      setLeaveTypes(types);
      setBalances(bals);
      setRequests(reqs);
      if (!selectedTypeId && types.length > 0) setSelectedTypeId(types[0].id);
    } finally {
      setLoading(false);
    }
  }, [profile, selectedTypeId]);

  useEffect(() => {
    load();
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
        Alert.alert("Request submitted", "Your leave request has been sent for approval.");
        setFormOpen(false);
        setReason("");
        load();
      } else {
        Alert.alert("Could not submit", result.message ?? "Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.balancesRow}>
              {balances.map((b) => {
                const type = leaveTypes.find((t) => t.id === b.leaveTypeId);
                return (
                  <View key={b.id} style={styles.balanceCard}>
                    <Text style={styles.balanceValue}>{(b.allocated - b.used).toString()}</Text>
                    <Text style={styles.balanceLabel}>{type?.name ?? "Leave"} left</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>Requests</Text>
              <Pressable onPress={() => setFormOpen((v) => !v)}>
                <Text style={styles.linkText}>{formOpen ? "Close" : "Apply for leave"}</Text>
              </Pressable>
            </View>

            {formOpen && (
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
                  <DateTimePicker
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

                <PremiumButton label="Submit Request" onPress={submit} loading={submitting} style={styles.submitButton} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.requestRow}>
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
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No leave requests yet.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  balancesRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  balanceCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexGrow: 1, alignItems: "center" },
  balanceValue: { fontSize: 24, fontWeight: "700", color: colors.primary },
  balanceLabel: { fontSize: 12, color: colors.muted, marginTop: 4, textAlign: "center" },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
  sectionHeader: { fontSize: 17, fontWeight: "700", color: colors.text },
  linkText: { color: colors.primary, fontWeight: "600" },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12 },
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
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  requestInfo: { flex: 1, marginRight: 12 },
  requestTitle: { fontWeight: "700", color: colors.text },
  rejectionReason: { color: colors.danger, fontSize: 12, marginTop: 4 },
  emptyText: { textAlign: "center", color: colors.muted, marginTop: 20 },
});
