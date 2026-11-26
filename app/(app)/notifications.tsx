import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/constants/colors";
import Screen from "../../src/components/layout/Screen";
import { useNotifications, NotificationItem } from "../../src/hooks/useNotifications";

function iconForType(type: NotificationItem["type"]) {
  if (type === "task") return { name: "checkmark-circle-outline" as const, color: colors.primary };
  if (type === "holiday") return { name: "calendar-outline" as const, color: "#059669" };
  return { name: "document-text-outline" as const, color: "#7C3AED" };
}

function formatTimestamp(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function NotificationsScreen() {
  const { notifications, markAllRead } = useNotifications();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.pageHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.pageTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <Pressable onPress={markAllRead} accessibilityRole="button">
            <Text style={styles.markReadBtn}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContainer : styles.list
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.border} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          notifications.map((n) => {
            const icon = iconForType(n.type);
            return (
              <View key={n.id} style={styles.item}>
                <View style={[styles.itemIcon, { backgroundColor: `${icon.color}1A` }]}>
                  <Ionicons name={icon.name} size={22} color={icon.color} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  <Text style={styles.itemBody} numberOfLines={3}>{n.body}</Text>
                  <Text style={styles.itemTime}>{formatTimestamp(n.timestamp)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
    gap: 12,
  },
  backBtn: { padding: 4 },
  pageTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text },
  markReadBtn: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80 },
  empty: { alignItems: "center", gap: 14 },
  emptyText: { color: colors.muted, fontSize: 16 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
  itemBody: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  itemTime: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
