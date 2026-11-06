import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import { EmptyState, ErrorState } from "./StateViews";
import { fetchCalendarDaysInRange } from "../api";
import { CalendarDay } from "../types";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function HolidaysTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState<CalendarDay[]>([]);

  const load = useCallback(async () => {
    try {
      const year = new Date().getFullYear();
      const rows = await fetchCalendarDaysInRange(`${year}-01-01`, `${year}-12-31`);
      setDays(rows.sort((a, b) => a.date.localeCompare(b.date)));
      setError(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setError(true));
  }, [load]);

  const groupedByMonth = useMemo(() => {
    const groups = new Map<number, CalendarDay[]>();
    days.forEach((d) => {
      const month = Number(d.date.slice(5, 7)) - 1;
      groups.set(month, [...(groups.get(month) ?? []), d]);
    });
    return groups;
  }, [days]);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={styles.spinner} />;
  }

  if (error) {
    return <ErrorState message="Could not load the calendar." onRetry={() => load().catch(() => setError(true))} />;
  }

  if (days.length === 0) {
    return <EmptyState icon="calendar-outline" message="No holidays or weekends set for this year yet." />;
  }

  return (
    <View>
      {Array.from({ length: 12 }, (_, month) => month)
        .filter((month) => groupedByMonth.has(month))
        .map((month) => (
          <View key={month} style={styles.monthSection}>
            <Text style={styles.monthHeader}>{MONTH_NAMES[month]}</Text>
            {groupedByMonth.get(month)!.map((item) => (
              <View key={item.id} style={styles.row}>
                <View>
                  <Text style={styles.date}>{item.date}</Text>
                  <Text style={styles.name}>{item.name || (item.kind === "holiday" ? "Holiday" : "Weekend")}</Text>
                </View>
                <View style={[styles.kindBadge, item.kind === "holiday" && styles.kindBadgeHoliday]}>
                  <Text style={styles.kindText}>{item.kind === "holiday" ? "Holiday" : "Weekend"}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 40 },
  monthSection: { marginBottom: 16 },
  monthHeader: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
  },
  date: { fontWeight: "700", color: colors.text },
  name: { color: colors.muted, fontSize: 13, marginTop: 2 },
  kindBadge: { backgroundColor: `${colors.muted}22`, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  kindBadgeHoliday: { backgroundColor: `${colors.primary}22` },
  kindText: { fontSize: 12, fontWeight: "700", color: colors.text },
});
