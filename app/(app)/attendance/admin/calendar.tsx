import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import DatePicker from "../../../../src/components/ui/DatePicker";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import { deleteCalendarDay, fetchCalendarDaysInRange, upsertCalendarDay } from "../../../../src/attendance/api";
import { CalendarDay, CalendarKind } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";
import AppDialog from "../../../../src/components/ui/AppDialog";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function CalendarAdminScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [kind, setKind] = useState<CalendarKind>("holiday");
  const [name, setName] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string; message: string;
    confirmText?: string; confirmStyle?: "default" | "destructive";
    onConfirm?: () => void;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const from = toDateString(new Date(new Date().setMonth(new Date().getMonth() - 3)));
      const to = toDateString(new Date(new Date().setMonth(new Date().getMonth() + 9)));
      const rows = await fetchCalendarDaysInRange(from, to);
      setDays(rows.sort((a, b) => a.date.localeCompare(b.date)));
      setError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await upsertCalendarDay({ date: toDateString(date), kind, name: name.trim() });
      setFormOpen(false);
      setName("");
      load();
    } catch (error) {
      setDialog({ title: "Could not save", message: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    setDialog({
      title: "Remove calendar day",
      message: "Are you sure?",
      confirmText: "Remove",
      confirmStyle: "destructive",
      onConfirm: async () => { await deleteCalendarDay(id); load(); },
    });
  };

  if (!allowed) return null;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message="Could not load the calendar." onRetry={() => load().catch(() => setError(true))} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={days}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Pressable onPress={() => setFormOpen((v) => !v)}>
              <Text style={styles.linkText}>{formOpen ? "Close" : "+ Add holiday / weekend"}</Text>
            </Pressable>
            {formOpen && (
              <View style={styles.form}>
                <Pressable style={styles.dateChip} onPress={() => setShowPicker(true)}>
                  <Text style={styles.dateChipText}>{toDateString(date)}</Text>
                </Pressable>
                {showPicker && (
                  <DatePicker
                    value={date}
                    mode="date"
                    onChange={(_e, selected) => {
                      setShowPicker(false);
                      if (selected) setDate(selected);
                    }}
                  />
                )}
                <View style={styles.chipRow}>
                  {(["holiday", "weekend"] as CalendarKind[]).map((k) => (
                    <Pressable key={k} onPress={() => setKind(k)} style={[styles.chip, kind === k && styles.chipSelected]}>
                      <Text style={[styles.chipText, kind === k && styles.chipTextSelected]}>{k === "holiday" ? "Holiday" : "Weekend"}</Text>
                    </Pressable>
                  ))}
                </View>
                <PremiumInput value={name} onChangeText={setName} placeholder="Name (e.g. Diwali)" style={styles.input} />
                <PremiumButton label="Save" onPress={save} loading={saving} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>{item.date}</Text>
              <Text style={styles.cardSubtitle}>{item.name || (item.kind === "holiday" ? "Holiday" : "Weekend")}</Text>
            </View>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={styles.deleteText}>Remove</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="calendar-outline" message="No calendar entries in range." />}
      />

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
        confirmText={dialog?.confirmText}
        confirmStyle={dialog?.confirmStyle}
        onConfirm={dialog?.onConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  headerRow: { marginBottom: 16 },
  linkText: { color: colors.primary, fontWeight: "700" },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 10 },
  input: { marginTop: 10, marginBottom: 10 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextSelected: { color: colors.white },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  deleteText: { color: colors.danger, fontWeight: "600" },
});
