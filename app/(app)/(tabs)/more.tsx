import { View, Text, StyleSheet, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import PremiumButton from "../../../src/components/ui/PremiumButton";

export default function MoreScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const isAttendanceAdmin = profile?.role === "manager" || profile?.role === "hr";

  const confirmSignOut = () => {
    if (Platform.OS === "web") {
      // RN Web's Alert.alert ignores multi-button confirmation dialogs,
      // so there's no reliable way to confirm first on web — sign out directly.
      signOut();
      return;
    }

    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
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

        <PremiumButton
          label="Attendance"
          onPress={() => router.push("/(app)/attendance")}
          variant="outline"
          accessibilityLabel="Attendance"
          style={styles.menuBtn}
        />

        {isAttendanceAdmin && (
          <>
            <PremiumButton
              label="Attendance Admin"
              onPress={() => router.push("/(app)/attendance/admin")}
              variant="outline"
              accessibilityLabel="Attendance Admin"
              style={styles.menuBtn}
            />
            <PremiumButton
              label="Leave Approvals"
              onPress={() => router.push("/(app)/attendance/admin/approvals")}
              variant="outline"
              accessibilityLabel="Leave Approvals"
              style={styles.menuBtn}
            />
          </>
        )}

        <PremiumButton
          label="Sign out"
          onPress={confirmSignOut}
          variant="danger"
          accessibilityLabel="Sign out"
          style={styles.signOutBtn}
        />

        <Text style={styles.version}>
          Task Manager v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>
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
    padding: 24,
    alignItems: "center",
    marginTop: 20,
  },
  name: { fontSize: 20, fontWeight: "700", color: colors.text },
  roleBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  roleBadgeText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  menuBtn: { marginTop: 20 },
  signOutBtn: { marginTop: 24 },
  version: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    marginTop: "auto",
    marginBottom: 100,
  },
});
