import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../../src/constants/colors";
import Screen from "../../../../src/components/layout/Screen";
import { fetchAuditLogs } from "../../../../src/attendance/api";
import { AuditLogEntry } from "../../../../src/attendance/types";
import { useRequireAttendanceAdmin } from "../../../../src/attendance/useRequireAttendanceAdmin";

export default function AuditLogScreen() {
  const allowed = useRequireAttendanceAdmin();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    fetchAuditLogs(200)
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.action}>
              {item.actorName ?? "System"} · {item.action} {item.entity}
            </Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No audit entries yet.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingBottom: 60 },
  row: { backgroundColor: colors.card, borderRadius: 16, padding: 14, marginBottom: 10 },
  action: { fontWeight: "700", color: colors.text, fontSize: 13 },
  time: { color: colors.muted, fontSize: 12, marginTop: 4 },
  emptyText: { textAlign: "center", color: colors.muted, marginTop: 20 },
});
