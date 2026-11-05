import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import { fetchUpcomingCalendarDays } from "../../../src/attendance/api";
import { CalendarDay } from "../../../src/attendance/types";

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HolidaysScreen() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<CalendarDay[]>([]);

  useEffect(() => {
    fetchUpcomingCalendarDays(todayString(), 60)
      .then(setDays)
      .finally(() => setLoading(false));
  }, []);

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
        data={days}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.name}>{item.name || (item.kind === "holiday" ? "Holiday" : "Weekend")}</Text>
            </View>
            <View style={[styles.kindBadge, item.kind === "holiday" && styles.kindBadgeHoliday]}>
              <Text style={styles.kindText}>{item.kind === "holiday" ? "Holiday" : "Weekend"}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No upcoming holidays or weekends on the calendar.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  date: { fontWeight: "700", color: colors.text },
  name: { color: colors.muted, fontSize: 13, marginTop: 2 },
  kindBadge: { backgroundColor: `${colors.muted}22`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  kindBadgeHoliday: { backgroundColor: `${colors.primary}22` },
  kindText: { fontSize: 12, fontWeight: "700", color: colors.text },
  emptyText: { textAlign: "center", color: colors.muted, marginTop: 20 },
});
