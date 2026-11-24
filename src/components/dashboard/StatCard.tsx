import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";

interface StatCardProps {
  label: string;
  value: string | number;
  caption?: string;
  highlighted?: boolean;
  onPress?: () => void;
}

export default function StatCard({ label, value, caption, highlighted = false, onPress }: StatCardProps) {
  return (
    <View style={[styles.card, highlighted && styles.highlighted]}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, highlighted && styles.labelHighlighted]}>{label}</Text>
        <Pressable
          style={[styles.arrowBtn, highlighted && styles.arrowBtnHighlighted]}
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole="button"
          accessibilityLabel={`View ${label}`}
          hitSlop={8}
        >
          <Ionicons
            name="arrow-forward-outline"
            size={14}
            color={highlighted ? colors.white : colors.primary}
          />
        </Pressable>
      </View>
      <Text style={[styles.value, highlighted && styles.valueHighlighted]}>{value}</Text>
      {caption ? (
        <Text style={[styles.caption, highlighted && styles.captionHighlighted]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  highlighted: {
    backgroundColor: colors.primaryDeep,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  labelHighlighted: { color: colors.white, opacity: 0.85 },
  arrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowBtnHighlighted: { backgroundColor: "rgba(255,255,255,0.15)" },
  value: { fontSize: 26, fontWeight: "700", color: colors.text, marginTop: 10 },
  valueHighlighted: { color: colors.white },
  caption: { fontSize: 12, color: colors.muted, marginTop: 6 },
  captionHighlighted: { color: "rgba(255,255,255,0.75)" },
});
