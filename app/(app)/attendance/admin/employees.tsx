import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../../src/context/AuthContext";
import { supabase } from "../../../../src/lib/supabase";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import { fetchEmployees, fetchOffices, fetchShifts, updateEmployeeSettings } from "../../../../src/attendance/api";
import { Employee, Office, Shift, WorkMode } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";

export default function EmployeesScreen() {
  const allowed = useRequireAttendanceAdmin();
  const { profile } = useAuth();
  const isHr = profile?.role === "hr";
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"employee" | "manager" | "hr">("employee");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [emps, offs, shfs] = await Promise.all([fetchEmployees(), fetchOffices(), fetchShifts()]);
      setEmployees(emps);
      setOffices(offs);
      setShifts(shfs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (employeeId: string, patch: Partial<{ workMode: WorkMode; officeId: string | null; shiftId: string | null }>) => {
    setSavingId(employeeId);
    try {
      await updateEmployeeSettings(employeeId, patch);
      await load();
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const submitInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      Alert.alert("Missing information", "Enter a name and email.");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-employee", {
        body: { fullName: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole },
      });
      if (error) throw error;
      Alert.alert(
        "Employee invited",
        `Temporary password (share this now, it won't be shown again):\n\n${data?.tempPassword ?? "(not returned)"}`
      );
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInviteRole("employee");
      load();
    } catch (error) {
      Alert.alert("Could not invite", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setInviting(false);
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

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          isHr ? (
            <View style={styles.inviteSection}>
              <Pressable onPress={() => setInviteOpen((v) => !v)}>
                <Text style={styles.linkText}>{inviteOpen ? "Close" : "+ Invite employee"}</Text>
              </Pressable>
              {inviteOpen && (
                <View style={styles.inviteForm}>
                  <PremiumInput value={inviteName} onChangeText={setInviteName} placeholder="Full name" style={styles.input} />
                  <PremiumInput
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    placeholder="Email"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                  />
                  <View style={styles.chipRow}>
                    {(["employee", "manager", "hr"] as const).map((r) => (
                      <Pressable key={r} onPress={() => setInviteRole(r)} style={[styles.chip, inviteRole === r && styles.chipSelected]}>
                        <Text style={[styles.chipText, inviteRole === r && styles.chipTextSelected]}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <PremiumButton label="Send Invite" onPress={submitInvite} loading={inviting} style={styles.inviteButton} />
                </View>
              )}
            </View>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => setEditingId(editingId === item.id ? null : item.id)}>
              <Text style={styles.cardTitle}>{item.fullName}</Text>
              <Text style={styles.cardSubtitle}>
                {item.role} · {item.workMode === "wfh" ? "WFH" : item.officeName ?? "No office"} ·{" "}
                {shifts.find((s) => s.id === item.shiftId)?.name ?? "No shift"}
              </Text>
            </Pressable>

            {editingId === item.id && isHr && (
              <View style={styles.editPanel}>
                <Text style={styles.label}>Work mode</Text>
                <View style={styles.chipRow}>
                  {(["office", "wfh"] as WorkMode[]).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => saveSettings(item.id, { workMode: m })}
                      style={[styles.chip, item.workMode === m && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, item.workMode === m && styles.chipTextSelected]}>{m === "wfh" ? "WFH" : "Office"}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Office</Text>
                <View style={styles.chipRow}>
                  {offices.map((o) => (
                    <Pressable
                      key={o.id}
                      onPress={() => saveSettings(item.id, { officeId: o.id })}
                      style={[styles.chip, item.officeId === o.id && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, item.officeId === o.id && styles.chipTextSelected]}>{o.name}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Shift</Text>
                <View style={styles.chipRow}>
                  {shifts.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => saveSettings(item.id, { shiftId: s.id })}
                      style={[styles.chip, item.shiftId === s.id && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, item.shiftId === s.id && styles.chipTextSelected]}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>

                {savingId === item.id && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
              </View>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  inviteSection: { marginBottom: 16 },
  linkText: { color: colors.primary, fontWeight: "700" },
  inviteForm: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginTop: 10 },
  input: { marginBottom: 10 },
  inviteButton: { marginTop: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardTitle: { fontWeight: "700", color: colors.text },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  editPanel: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  label: { fontSize: 12, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: 8 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { backgroundColor: colors.backgroundAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600", fontSize: 12 },
  chipTextSelected: { color: colors.white },
});
