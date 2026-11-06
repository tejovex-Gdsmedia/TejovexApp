import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import { fetchLeaveTypes, initializeLeaveBalances, upsertLeaveType } from "../../../../src/attendance/api";
import { LeaveType } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";

export default function LeaveTypesScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [annualDays, setAnnualDays] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const load = useCallback(async () => {
    try {
      setTypes(await fetchLeaveTypes());
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
    setAnnualDays("");
    setIsPaid(true);
    setFormOpen(true);
  };

  const openEditForm = (type: LeaveType) => {
    setEditingId(type.id);
    setName(type.name);
    setAnnualDays(String(type.annualDays));
    setIsPaid(type.isPaid);
    setFormOpen(true);
  };

  const save = async () => {
    const days = parseFloat(annualDays);
    if (!name.trim() || Number.isNaN(days)) {
      Alert.alert("Missing information", "Enter a name and number of annual days.");
      return;
    }
    setSaving(true);
    try {
      await upsertLeaveType({ id: editingId ?? undefined, name: name.trim(), annualDays: days, isPaid });
      setFormOpen(false);
      load();
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initializeBalances = async () => {
    setInitializing(true);
    try {
      const year = new Date().getFullYear();
      const result = await initializeLeaveBalances(year);
      if (result.ok) {
        Alert.alert("Balances initialised", `Every employee now has a ${year} balance for each leave type.`);
      } else {
        Alert.alert("Could not initialise", result.message ?? "Please try again.");
      }
    } finally {
      setInitializing(false);
    }
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
        <ErrorState message="Could not load leave types." onRetry={() => load().catch(() => setError(true))} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={types}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.headerRow}>
            <Pressable onPress={formOpen ? () => setFormOpen(false) : openNewForm}>
              <Text style={styles.linkText}>{formOpen ? "Close" : "+ Add leave type"}</Text>
            </Pressable>
            {formOpen && (
              <View style={styles.form}>
                <PremiumInput value={name} onChangeText={setName} placeholder="Leave type name" style={styles.input} />
                <PremiumInput value={annualDays} onChangeText={setAnnualDays} placeholder="Annual days" keyboardType="numeric" style={styles.input} />
                <Pressable style={styles.paidRow} onPress={() => setIsPaid((v) => !v)}>
                  <View style={[styles.checkbox, isPaid && styles.checkboxChecked]} />
                  <Text style={styles.paidLabel}>Paid leave</Text>
                </Pressable>
                <PremiumButton label="Save" onPress={save} loading={saving} />
              </View>
            )}

            <View style={styles.initCard}>
              <Text style={styles.initTitle}>Yearly balance initialisation</Text>
              <Text style={styles.initSubtitle}>
                Gives every employee a {new Date().getFullYear()} balance for each leave type above, using its annual days.
                Safe to run more than once — existing balances are left alone.
              </Text>
              <PremiumButton label={`Initialise ${new Date().getFullYear()} balances`} variant="outline" onPress={initializeBalances} loading={initializing} />
            </View>

            <Text style={styles.sectionHeader}>Leave Types</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEditForm(item)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.annualDays} days/year · {item.isPaid ? "Paid" : "Unpaid"}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState icon="airplane-outline" message="No leave types yet." />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  headerRow: { marginBottom: 8 },
  linkText: { color: colors.primary, fontWeight: "700" },
  form: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginTop: 10 },
  input: { marginBottom: 10 },
  paidRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  paidLabel: { color: colors.text, fontWeight: "600" },
  initCard: { backgroundColor: colors.backgroundAlt, borderRadius: 20, padding: 16, marginTop: 20, marginBottom: 20 },
  initTitle: { fontWeight: "700", color: colors.text, marginBottom: 6 },
  initSubtitle: { color: colors.muted, fontSize: 12, marginBottom: 14, lineHeight: 18 },
  sectionHeader: { fontSize: 17, fontWeight: "700", color: colors.text, marginBottom: 8 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
