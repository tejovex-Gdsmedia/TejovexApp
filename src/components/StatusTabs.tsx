import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export type TaskTabKey = "overdue" | "pending" | "in_progress" | "complete";

interface StatusTabsProps {
  tabs: { key: TaskTabKey; label: string; count: number }[];
  active: TaskTabKey;
  onChange: (key: TaskTabKey) => void;
}

export default function StatusTabs({ tabs, active, onChange }: StatusTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={[styles.tab, selected && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${tab.label}, ${tab.count} tasks`}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  content: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { fontSize: 13, fontWeight: "600", color: colors.text },
  labelActive: { color: colors.white },
});
