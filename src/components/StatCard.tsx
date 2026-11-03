import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

interface Props {
  label: string;
  value: number | string;
  color?: string;
}

export default function StatCard({ label, value, color = colors.primary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    margin: 4,
  },
  value: { fontSize: 24, fontWeight: "700" },
  label: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
});