import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";

type IconName = keyof typeof Ionicons.glyphMap;

/** A short message with an icon — never a blank screen (Part 6). */
export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={32} color={colors.muted} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
      <Text style={styles.message}>{message}</Text>
      <PremiumButton label="Retry" onPress={onRetry} variant="outline" style={styles.retryButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  message: { fontSize: 14, color: colors.muted, textAlign: "center" },
  retryButton: { marginTop: 4, minWidth: 140 },
});
