import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import AppDialog from "../../components/ui/AppDialog";
import DatePicker from "../../components/ui/DatePicker";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";
import PremiumInput from "../../components/ui/PremiumInput";
import { RequestStatusBadge } from "./StatusBadge";
import { EmptyState, ErrorState } from "./StateViews";
import { applyRegularizationRequest, fetchMyRegularizationRequests } from "../api";
import { PunchType, RegularizationRequest } from "../types";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function RegularizeTab({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);

  const [date, setDate] = useState(new Date());
  const [type, setType] = useState<PunchType>("check_in");
  const [time, setTime] = useState(new Date());
  const [reason, setReason] = useState("");
  const [pickerTarget, setPickerTarget] = useState<"date" | "time" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await fetchMyRegularizationRequests(userId));
      setError(false);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      const requestedTime = new Date(date);
      requestedTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

      const result = await applyRegularizationRequest({
        punchDate: toDateString(date),
        type,
        requestedTime: requestedTime.toISOString(),
        reason: reason.trim(),
      });

      if (result.ok) {
        setDialog({ title: "Request submitted", message: "Your regularization request has been sent for approval." });
        setReason("");
        load();
      } else {
        setDialog({ title: "Could not submit", message: result.message ?? "Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
      />
      <View style={styles.form}>
        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.dateChip} onPress={() => setPickerTarget("date")}>
          <Text style={styles.dateChipText}>{toDateString(date)}</Text>
        </Pressable>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {(["check_in", "check_out"] as PunchType[]).map((t) => (
            <Pressable key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && styles.typeChipSelected]}>
              <Text style={[styles.typeChipText, type === t && styles.typeChipTextSelected]}>
                {t === "check_in" ? "Check In" : "Check Out"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Time</Text>
        <Pressable style={styles.dateChip} onPress={() => setPickerTarget("time")}>
          <Text style={styles.dateChipText}>
            {time.getHours().toString().padStart(2, "0")}:{time.getMinutes().toString().padStart(2, "0")}
          </Text>
        </Pressable>

        {pickerTarget && (
          <DatePicker
            value={pickerTarget === "date" ? date : time}
            mode={pickerTarget}
            onChange={(_e, selected) => {
              setPickerTarget(null);
              if (!selected) return;
              if (pickerTarget === "date") setDate(selected);
              else setTime(selected);
            }}
          />
        )}

        <Text style={styles.label}>Reason</Text>
        <PremiumInput value={reason} onChangeText={setReason} placeholder="Why was this missed?" multiline />

        <PremiumButton label="Submit Request" onPress={submit} loading={submitting} style={styles.submitButton} />
      </View>

      <Text style={styles.sectionHeader}>Your Requests</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
      ) : error ? (
        <ErrorState message="Could not load your requests." onRetry={() => load().catch(() => setError(true))} />
      ) : requests.length === 0 ? (
        <EmptyState icon="document-text-outline" message="No regularization requests yet." />
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.requestRow}>
            <View>
              <Text style={styles.requestText}>
                {r.punchDate} · {r.type === "check_in" ? "Check In" : "Check Out"}
              </Text>
              {r.reason ? <Text style={styles.requestReason}>{r.reason}</Text> : null}
            </View>
            <RequestStatusBadge status={r.status} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 6 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { flex: 1, backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  typeChipSelected: { backgroundColor: colors.primary },
  typeChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  typeChipTextSelected: { color: colors.white },
  submitButton: { marginTop: 18 },
  sectionHeader: { fontSize: 17, fontWeight: "700", color: colors.text, marginTop: 24, marginBottom: 8 },
  spinner: { marginTop: 16 },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  requestText: { fontWeight: "700", color: colors.text },
  requestReason: { color: colors.muted, fontSize: 12, marginTop: 4, maxWidth: 220 },
});
