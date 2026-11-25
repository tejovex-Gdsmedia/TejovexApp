import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import Screen from "../../src/components/layout/Screen";

const AVATAR_COLORS = [
  colors.accent,
  colors.primary,
  colors.primaryDeep,
  "#7C3AED",
  "#059669",
  "#D97706",
  "#DB2777",
  "#0891B2",
];

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, session, signOut, updateProfile } = useAuth();

  const [phone, setPhone] = useState("");
  const [phoneReady, setPhoneReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch phone separately so a missing column doesn't break the whole screen.
  useEffect(() => {
    if (!profile) return;
    const run = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", profile.id)
          .single();
        const val = (data as { phone?: string | null } | null)?.phone ?? "";
        setPhone(val);
      } catch {
        // phone column may not exist yet — silently skip
      } finally {
        setPhoneReady(true);
      }
    };
    run();
  }, [profile?.id]);

  if (!profile) return null;

  const initials = getInitials(profile.fullName);
  const avatarColor = getAvatarColor(profile.fullName);
  const email = session?.user.email ?? "";
  const roleName =
    profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

  const handleSavePhone = async () => {
    setSaving(true);
    try {
      await updateProfile({ phone: phone.trim() || undefined });
      setEditing(false);
    } catch {
      Alert.alert("Error", "Could not save phone number. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => signOut().catch(() => {}),
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile.fullName}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{roleName}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>

          <InfoRow icon="person-outline" label="Full Name" value={profile.fullName} />

          <View style={styles.divider} />

          <InfoRow icon="shield-checkmark-outline" label="Role" value={roleName} />

          <View style={styles.divider} />

          <InfoRow icon="mail-outline" label="Email" value={email} />

          <View style={styles.divider} />

          {/* Phone — editable */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="call-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSavePhone}
                />
              ) : (
                <Text style={styles.infoValue}>
                  {phoneReady ? (phone || "Not set") : "Loading…"}
                </Text>
              )}
            </View>
            {editing ? (
              <View style={styles.phoneActions}>
                <Pressable
                  onPress={handleSavePhone}
                  disabled={saving}
                  style={[styles.phoneBtn, styles.phoneBtnSave]}
                  accessibilityRole="button"
                >
                  <Text style={styles.phoneBtnSaveText}>
                    {saving ? "Saving…" : "Save"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEditing(false);
                  }}
                  style={[styles.phoneBtn, styles.phoneBtnCancel]}
                  accessibilityRole="button"
                >
                  <Text style={styles.phoneBtnCancelText}>Cancel</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setEditing(true)}
                style={styles.editBtn}
                accessibilityRole="button"
                accessibilityLabel="Edit phone number"
              >
                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          style={styles.signOutBtn}
          onPress={handleSignOut}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 48 },
  backBtn: {
    marginTop: 8,
    marginBottom: 4,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 1,
  },
  name: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 8 },
  roleBadge: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleText: { fontSize: 13, fontWeight: "600", color: colors.primary },

  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },

  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.muted, fontWeight: "600", marginBottom: 2 },
  infoValue: { fontSize: 15, color: colors.text, fontWeight: "500" },

  phoneInput: {
    fontSize: 15,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
  },
  phoneActions: { flexDirection: "row", gap: 6 },
  phoneBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  phoneBtnSave: { backgroundColor: colors.primary },
  phoneBtnSaveText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  phoneBtnCancel: { backgroundColor: colors.backgroundAlt },
  phoneBtnCancelText: { color: colors.muted, fontSize: 12, fontWeight: "600" },

  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 14,
  },
  signOutText: { fontSize: 15, fontWeight: "700", color: colors.danger },
});
