import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { NotificationItem } from "../../hooks/useNotifications";

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

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

export default function NotificationsPanel({
  visible,
  onClose,
  notifications,
}: NotificationsPanelProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlayContainer}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close notifications"
            >
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyContainer : styles.list
            }
          >
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color={colors.border}
                />
                <Text style={styles.emptyText}>No notifications</Text>
              </View>
            ) : (
              notifications.map((n) => {
                const icon = iconForType(n.type);
                return (
                  <View key={n.id} style={styles.item}>
                    <View
                      style={[
                        styles.itemIcon,
                        { backgroundColor: `${icon.color}1A` },
                      ]}
                    >
                      <Ionicons name={icon.name} size={20} color={icon.color} />
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{n.title}</Text>
                      <Text style={styles.itemBody} numberOfLines={2}>
                        {n.body}
                      </Text>
                    </View>
                    <Text style={styles.itemTime}>
                      {formatTimestamp(n.timestamp)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  closeBtn: { padding: 6 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  emptyContainer: { paddingVertical: 60, alignItems: "center" },
  empty: { alignItems: "center", gap: 12 },
  emptyText: { color: colors.muted, fontSize: 15 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  itemBody: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  itemTime: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
