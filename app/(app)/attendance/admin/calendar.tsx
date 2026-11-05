import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import { deleteCalendarDay, fetchCalendarDaysInRange, upsertCalendarDay } from "../../../../src/attendance/api";
import { CalendarDay, CalendarKind } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function CalendarAdminScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(new Date());
  const [kind, setKind] = useState<CalendarKind>("holiday");
  const [name, setName] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const from = toDateString(new Date(new Date().setMonth(new Date().getMonth() - 3)));
      const to = toDateString(new Date(new Date().setMonth(new Date().getMonth() + 9)));
      const rows = await fetchCalendarDaysInRange(from, to);
      setDays(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await upsertCalendarDay({ date: toDateString(date), kind, name: name.trim() });
      setFormOpen(false);
      setName("");
      load();
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert("Remove calendar day", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => { await deleteCalendarDay(id); load(); } },
    ]);
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
                  <DateTimePicker
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
        ListEmptyComponent={<Text style={styles.emptyText}>No calendar entries in range.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  headerRow: { marginBottom: 16 },
  linkText: { color: colors.primary, fontWeight: "700" },
  form: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 10 },
  input: { marginTop: 10, marginBottom: 10 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 13 },
  chipTextSelected: { color: colors.white },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  deleteText: { color: colors.danger, fontWeight: "600" },
  emptyText: { textAlign: "center", color: colors.muted, marginTop: 20 },
});
