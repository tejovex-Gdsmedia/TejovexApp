import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import { DAY_STATUS_LABELS, DayStatus } from "../rules";
import { RequestStatus } from "../types";

const DAY_STATUS_COLORS: Record<DayStatus, string> = {
  present: "#047857",
  late: "#B45309",
  half_day: "#B45309",
  absent: "#B91C1C",
  on_leave: "#0E7AD6",
  holiday_weekend: "#64748B",
  missing_checkout: "#B91C1C",
};

export function DayStatusBadge({ status }: { status: DayStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${DAY_STATUS_COLORS[status]}1A` }]}>
      <Text style={[styles.text, { color: DAY_STATUS_COLORS[status] }]}>{DAY_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  manager_approved: "Manager Approved",
  approved: "Approved",
  rejected: "Rejected",
};

const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "#B45309",
  manager_approved: "#0E7AD6",
  approved: "#047857",
  rejected: "#B91C1C",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${REQUEST_STATUS_COLORS[status]}1A` }]}>
      <Text style={[styles.text, { color: REQUEST_STATUS_COLORS[status] }]}>{REQUEST_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  text: { fontSize: 12, fontWeight: "700" },
});

// Re-export colors for screens that need the plain palette (e.g. dashboard tiles).
export { DAY_STATUS_COLORS, REQUEST_STATUS_COLORS, colors };
