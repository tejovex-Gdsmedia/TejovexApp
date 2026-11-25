import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../constants/colors";
import TejovexLogo from "../brand/TejovexLogo";
import { useNotifications } from "../../hooks/useNotifications";
import NotificationsPanel from "./NotificationsPanel";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  colors.accent,       // red
  colors.primary,      // blue
  colors.primaryDeep,  // deep blue
  "#7C3AED",           // violet
  "#059669",           // emerald
  "#D97706",           // amber
  "#DB2777",           // pink
  "#0891B2",           // cyan
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function TopBar() {
  const { profile, signOut } = useAuth();
  const { notifications, count } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);

  if (!profile) return null;

  const initials = getInitials(profile.fullName);
  const avatarColor = getAvatarColor(profile.fullName);
  const roleName =
    profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

  const handleAvatarPress = () => {
    Alert.alert(profile.fullName, roleName, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => signOut().catch(() => {}),
      },
    ]);
  };

  return (
    <>
      <View style={styles.bar}>
        <TejovexLogo variant="icon" size={36} />

        <View style={styles.actions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setNotifOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Notifications${count > 0 ? `, ${count} new` : ""}`}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.text}
            />
            {count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {count > 99 ? "99+" : String(count)}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[styles.avatar, { backgroundColor: avatarColor }]}
            onPress={handleAvatarPress}
            accessibilityRole="button"
            accessibilityLabel={`Account: ${profile.fullName}`}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>
      </View>

      <NotificationsPanel
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "700",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
