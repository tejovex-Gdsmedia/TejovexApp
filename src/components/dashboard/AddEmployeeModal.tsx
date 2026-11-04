import { useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { colors } from "../../constants/colors";
import { Role } from "../../types/task";
import PremiumInput from "../ui/PremiumInput";
import PremiumButton from "../ui/PremiumButton";

// Mock-only: a real implementation would create the auth user + profile
// server-side (e.g. a Supabase Edge Function with the service-role key),
// since the client can't create another user's account while staying
// signed in as the manager. See AGENTS.md note on EAS/Edge Functions.
function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export interface NewEmployee {
  fullName: string;
  email: string;
  role: Role;
  tempPassword: string;
}

interface AddEmployeeModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (employee: NewEmployee) => void;
}

export default function AddEmployeeModal({ visible, onClose, onCreated }: AddEmployeeModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [created, setCreated] = useState<NewEmployee | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFullName("");
    setEmail("");
    setRole("employee");
    setCreated(null);
    setCopied(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim()) {
      setError("Enter a name and email.");
      return;
    }
    setError(null);

    const employee: NewEmployee = {
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      tempPassword: generateTempPassword(),
    };
    setCreated(employee);
    onCreated(employee);
  };

  const handleCopy = async () => {
    if (!created) return;
    await Clipboard.setStringAsync(`Email: ${created.email}\nPassword: ${created.tempPassword}`);
    setCopied(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{created ? "Employee added" : "Add employee"}</Text>
              <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>

            {created ? (
              <View>
                <Text style={styles.helperText}>
                  Share these credentials with {created.fullName}. They&apos;ll be asked to set a
                  new password the first time they sign in.
                </Text>

                <View style={styles.credentialsBox}>
                  <View style={styles.credentialRow}>
                    <Text style={styles.credentialLabel}>Email</Text>
                    <Text style={styles.credentialValue}>{created.email}</Text>
                  </View>
                  <View style={styles.credentialRow}>
                    <Text style={styles.credentialLabel}>Temporary password</Text>
                    <Text style={styles.credentialValue}>{created.tempPassword}</Text>
                  </View>
                </View>

                <PremiumButton
                  label={copied ? "Copied" : "Copy credentials"}
                  onPress={handleCopy}
                  variant={copied ? "outline" : "primary"}
                  accessibilityLabel="Copy credentials"
                  style={styles.spacedBtn}
                />
                <PremiumButton
                  label="Done"
                  onPress={handleClose}
                  variant="outline"
                  accessibilityLabel="Done"
                  style={styles.spacedBtn}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Full name</Text>
                <PremiumInput value={fullName} onChangeText={setFullName} placeholder="Jane Doe" />

                <Text style={styles.label}>Email</Text>
                <PremiumInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="jane@tejovex.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <Text style={styles.label}>Role</Text>
                <View style={styles.chipRow}>
                  {(["employee", "manager"] as Role[]).map((r) => {
                    const selected = role === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setRole(r)}
                        style={[styles.chip, selected && styles.chipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {r === "employee" ? "Employee" : "Manager"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <PremiumButton
                  label="Generate credentials"
                  onPress={handleSubmit}
                  accessibilityLabel="Generate credentials"
                  style={styles.spacedBtn}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: "85%",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  helperText: { fontSize: 13, color: colors.muted, marginBottom: 16, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 14, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  chipTextActive: { color: colors.white },
  error: { color: colors.danger, fontSize: 13, marginTop: 10 },
  spacedBtn: { marginTop: 16 },
  credentialsBox: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 16,
  },
  credentialRow: { marginBottom: 10 },
  credentialLabel: { fontSize: 12, color: colors.muted, marginBottom: 2 },
  credentialValue: { fontSize: 15, fontWeight: "700", color: colors.text },
});
