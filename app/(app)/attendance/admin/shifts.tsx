import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import { deleteShift, fetchShifts, upsertShift } from "../../../../src/attendance/api";
import { Shift } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";

function timeToDate(time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

export default function ShiftsScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState(timeToDate("10:30"));
  const [endTime, setEndTime] = useState(timeToDate("19:30"));
  const [grace, setGrace] = useState("15");
  const [halfDayHours, setHalfDayHours] = useState("4");
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setShifts(await fetchShifts());
      setError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const openNewForm = () => {
    setEditingId(null);
    setName("");
    setStartTime(timeToDate("10:30"));
    setEndTime(timeToDate("19:30"));
    setGrace("15");
    setHalfDayHours("4");
    setFormOpen(true);
  };

  const openEditForm = (shift: Shift) => {
    setEditingId(shift.id);
    setName(shift.name);
    setStartTime(timeToDate(shift.startTime));
    setEndTime(timeToDate(shift.endTime));
    setGrace(String(shift.graceMinutes));
    setHalfDayHours(String(shift.halfDayHours));
    setFormOpen(true);
  };

  const save = async () => {
    const graceMinutes = parseInt(grace, 10);
    const halfDay = parseFloat(halfDayHours);
    if (!name.trim() || Number.isNaN(graceMinutes) || Number.isNaN(halfDay)) {
      Alert.alert("Missing information", "Enter a name, grace period, and half-day hours.");
      return;
    }
    setSaving(true);
    try {
      await upsertShift({
        id: editingId ?? undefined,
        name: name.trim(),
        startTime: dateToTime(startTime),
        endTime: dateToTime(endTime),
        graceMinutes,
        halfDayHours: halfDay,
      });
      setFormOpen(false);
      load();
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    Alert.alert("Delete shift", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteShift(id); load(); } },
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

  if (error) {
    return (
      <Screen>
        <ErrorState message="Could not load shifts." onRetry={() => load().catch(() => setError(true))} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Pressable onPress={formOpen ? () => setFormOpen(false) : openNewForm}>
              <Text style={styles.linkText}>{formOpen ? "Close" : "+ Add shift"}</Text>
            </Pressable>
            {formOpen && (
              <View style={styles.form}>
                <PremiumInput value={name} onChangeText={setName} placeholder="Shift name" style={styles.input} />
                <View style={styles.timeRow}>
                  <Pressable style={[styles.dateChip, styles.half]} onPress={() => setPickerTarget("start")}>
                    <Text style={styles.dateChipText}>Start {dateToTime(startTime)}</Text>
                  </Pressable>
                  <Pressable style={[styles.dateChip, styles.half]} onPress={() => setPickerTarget("end")}>
                    <Text style={styles.dateChipText}>End {dateToTime(endTime)}</Text>
                  </Pressable>
                </View>
                {pickerTarget && (
                  <DateTimePicker
                    value={pickerTarget === "start" ? startTime : endTime}
                    mode="time"
                    onChange={(_e, selected) => {
                      setPickerTarget(null);
                      if (!selected) return;
                      if (pickerTarget === "start") setStartTime(selected);
                      else setEndTime(selected);
                    }}
                  />
                )}
                <PremiumInput value={grace} onChangeText={setGrace} placeholder="Grace period (minutes)" keyboardType="numeric" style={styles.input} />
                <PremiumInput value={halfDayHours} onChangeText={setHalfDayHours} placeholder="Half-day threshold (hours)" keyboardType="numeric" style={styles.input} />
                <PremiumButton label="Save Shift" onPress={save} loading={saving} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => openEditForm(item)} style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.startTime} – {item.endTime} · grace {item.graceMinutes}m · half-day {item.halfDayHours}h
              </Text>
            </Pressable>
            <Pressable onPress={() => remove(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="time-outline" message="No shifts yet." />}
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
  input: { marginBottom: 10 },
  timeRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  half: { flex: 1 },
  dateChip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateChipText: { color: colors.text, fontWeight: "600", fontSize: 13, textAlign: "center" },
  card: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  deleteText: { color: colors.danger, fontWeight: "600" },
});
