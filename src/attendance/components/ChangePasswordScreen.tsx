import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import AppDialog from "../../components/ui/AppDialog";
import { supabase } from "../../lib/supabase";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";
import PremiumInput from "../../components/ui/PremiumInput";

/** Shown by AttendanceGate when the signed-in user's account still has
 *  must_change_password set (PRD 5.1: forced change on first login). */
export default function ChangePasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{ title: string; message: string } | null>(null);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setDialog({ title: "Weak password", message: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setDialog({ title: "Passwords don't match", message: "Please re-enter matching passwords." });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { must_change_password: false },
      });
      if (error) throw error;
      onDone();
    } catch (error) {
      setDialog({ title: "Could not update password", message: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => setDialog(null)}
      />
      <Text style={styles.title}>Set a new password</Text>
      <Text style={styles.subtitle}>
        Your account was created with a temporary password. Choose a new one to continue.
      </Text>

      <Text style={styles.label}>New password</Text>
      <PremiumInput value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />

      <Text style={styles.label}>Confirm new password</Text>
      <PremiumInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />

      <PremiumButton label="Continue" onPress={handleSubmit} loading={submitting} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 24, textAlign: "center" },
  label: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 14, marginBottom: 6 },
  button: { marginTop: 24 },
});
