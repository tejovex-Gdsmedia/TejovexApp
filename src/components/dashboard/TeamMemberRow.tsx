import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../constants/colors";

export type MemberStatus = "complete" | "in_progress" | "pending";

const STATUS_LABEL: Record<MemberStatus, string> = {
  complete: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
};

const STATUS_COLOR: Record<MemberStatus, string> = {
  complete: colors.status.complete,
  in_progress: colors.status.in_progress,
  pending: colors.status.pending,
};

interface TeamMemberRowProps {
  name: string;
  subtitle: string;
  status: MemberStatus;
}

export default function TeamMemberRow({ name, subtitle, status }: TeamMemberRowProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: `${STATUS_COLOR[status]}1A` }]}>
        <Text style={[styles.pillText, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: colors.primaryDeep },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: "700" },
});
