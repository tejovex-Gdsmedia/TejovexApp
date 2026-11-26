import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import PremiumButton from "../../../src/components/ui/PremiumButton";
import AppDialog from "../../../src/components/ui/AppDialog";

export default function MoreScreen() {
  const { profile, signOut } = useAuth();
  const [dialog, setDialog] = useState<{
    title: string; message: string;
    confirmText?: string; confirmStyle?: "default" | "destructive";
    onConfirm?: () => void;
  } | null>(null);

  const confirmSignOut = () => {
    setDialog({
      title: "Sign out",
      message: "Are you sure you want to sign out?",
      confirmText: "Sign out",
      confirmStyle: "destructive",
      onConfirm: () => signOut(),
    });
  };

  return (
    <Screen watermark>
      <View style={styles.container}>
        <View style={styles.profileCard}>
          <Text style={styles.name}>{profile?.fullName ?? "Unknown"}</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: profile?.role === "employee" ? colors.muted : colors.primary },
            ]}
          >
            <Text style={styles.roleBadgeText}>
              {profile?.role === "manager" ? "Manager" : profile?.role === "hr" ? "HR" : "Employee"}
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <PremiumButton
          label="Sign out"
          onPress={confirmSignOut}
          variant="danger"
          accessibilityLabel="Sign out"
        />

        <Text style={styles.version}>
          Task Manager v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>

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
  container: { flex: 1, padding: 20 },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 14,
  },
  roleBadgeText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  spacer: { flex: 1 },
  version: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    marginTop: 20,
    marginBottom: 100,
  },
});
