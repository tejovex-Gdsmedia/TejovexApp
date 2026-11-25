import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../../../src/context/AuthContext";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import PremiumButton from "../../../../src/components/ui/PremiumButton";
import PremiumInput from "../../../../src/components/ui/PremiumInput";
import {
  decideLeaveRequest,
  decideRegularizationRequest,
  fetchPendingLeaveApprovals,
  fetchPendingRegularizationApprovals,
} from "../../../../src/attendance/api";
import { LeaveRequest, RegularizationRequest } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";
import { EmptyState, ErrorState } from "../../../../src/attendance/components/StateViews";
import { RequestStatusBadge } from "../../../../src/attendance/components/StatusBadge";

type Tab = "leave" | "regularization";

export default function ApprovalsScreen() {
  const allowed = useRequireAttendanceAdmin();
  const { profile } = useAuth();
  const stage = profile?.role === "hr" ? "hr" : "manager";
  const [tab, setTab] = useState<Tab>("leave");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [regRequests, setRegRequests] = useState<RegularizationRequest[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leaves, regs] = await Promise.all([
        fetchPendingLeaveApprovals(stage),
        fetchPendingRegularizationApprovals(stage),
      ]);
      setLeaveRequests(leaves);
      setRegRequests(regs);
      setError(null);
    } catch (e) {
      const err = e as { message?: string; details?: string; code?: string } | null;
      setError(err?.message ?? err?.details ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [stage]);

  useEffect(() => {
    load();
  }, [load]);

  const approveLeave = async (id: string) => {
    const result = await decideLeaveRequest(id, stage, "approve");
    if (!result.ok) Alert.alert("Could not approve", result.message ?? "Please try again.");
    load();
  };

  const rejectLeave = async (id: string) => {
    const result = await decideLeaveRequest(id, stage, "reject", comment.trim() || undefined);
    if (!result.ok) Alert.alert("Could not reject", result.message ?? "Please try again.");
    setRejectingId(null);
    setComment("");
    load();
  };

  const approveReg = async (id: string) => {
    const result = await decideRegularizationRequest(id, stage, "approve");
    if (!result.ok) Alert.alert("Could not approve", result.message ?? "Please try again.");
    load();
  };

  const rejectReg = async (id: string) => {
    const result = await decideRegularizationRequest(id, stage, "reject", comment.trim() || undefined);
    if (!result.ok) Alert.alert("Could not reject", result.message ?? "Please try again.");
    setRejectingId(null);
    setComment("");
    load();
  };

  if (!allowed) return null;

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={`Could not load approvals.\n${error}`} onRetry={load} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === "leave" && styles.tabActive]} onPress={() => setTab("leave")}>
          <Text style={[styles.tabText, tab === "leave" && styles.tabTextActive]}>Leave ({leaveRequests.length})</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === "regularization" && styles.tabActive]} onPress={() => setTab("regularization")}>
          <Text style={[styles.tabText, tab === "regularization" && styles.tabTextActive]}>
            Regularization ({regRequests.length})
          </Text>
        </Pressable>
      </View>

      {tab === "leave" ? (
        <FlatList
          data={leaveRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{item.userName ?? "Employee"}</Text>
                <RequestStatusBadge status={item.status} />
              </View>
              <Text style={styles.cardSubtitle}>
                {item.leaveTypeName} · {item.fromDate}
                {item.fromDate !== item.toDate ? ` – ${item.toDate}` : ""}
                {item.halfDay ? " (half day)" : ""}
              </Text>
              {item.reason ? <Text style={styles.cardReason}>{item.reason}</Text> : null}

              {rejectingId === item.id ? (
                <View>
                  <PremiumInput value={comment} onChangeText={setComment} placeholder="Reason (optional)" style={styles.commentInput} />
                  <View style={styles.actionRow}>
                    <PremiumButton label="Confirm Reject" variant="danger" onPress={() => rejectLeave(item.id)} style={styles.actionButton} />
                    <PremiumButton label="Cancel" variant="outline" onPress={() => setRejectingId(null)} style={styles.actionButton} />
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <PremiumButton label="Approve" onPress={() => approveLeave(item.id)} style={styles.actionButton} />
                  <PremiumButton label="Reject" variant="outline" onPress={() => setRejectingId(item.id)} style={styles.actionButton} />
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" message="No leave requests waiting on you." />}
        />
      ) : (
        <FlatList
          data={regRequests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{item.userName ?? "Employee"}</Text>
                <RequestStatusBadge status={item.status} />
              </View>
              <Text style={styles.cardSubtitle}>
                {item.punchDate} · {item.type === "check_in" ? "Check In" : "Check Out"} at{" "}
                {new Date(item.requestedTime).toLocaleTimeString()}
              </Text>
              {item.reason ? <Text style={styles.cardReason}>{item.reason}</Text> : null}

              {rejectingId === item.id ? (
                <View>
                  <PremiumInput value={comment} onChangeText={setComment} placeholder="Reason (optional)" style={styles.commentInput} />
                  <View style={styles.actionRow}>
                    <PremiumButton label="Confirm Reject" variant="danger" onPress={() => rejectReg(item.id)} style={styles.actionButton} />
                    <PremiumButton label="Cancel" variant="outline" onPress={() => setRejectingId(null)} style={styles.actionButton} />
                  </View>
                </View>
              ) : (
                <View style={styles.actionRow}>
                  <PremiumButton label="Approve" onPress={() => approveReg(item.id)} style={styles.actionButton} />
                  <PremiumButton label="Reject" variant="outline" onPress={() => setRejectingId(item.id)} style={styles.actionButton} />
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" message="No regularization requests waiting on you." />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 8, padding: 20, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.card, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.white },
  list: { padding: 20, paddingBottom: 60 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 12 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "700", color: colors.text, fontSize: 15 },
  cardSubtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  cardReason: { color: colors.text, fontSize: 13, marginTop: 8 },
  commentInput: { marginTop: 10 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1 },
});
