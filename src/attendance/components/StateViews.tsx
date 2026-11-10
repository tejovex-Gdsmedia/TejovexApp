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

export function ErrorState({
  message,
  code,
  onRetry,
}: {
  message: string;
  /** Shown under the message when present, e.g. "Error code: SETUP_OFFICE_MISSING". */
  code?: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
      <Text style={styles.message}>{message}</Text>
      {code && <Text style={styles.code}>Error code: {code}</Text>}
      <PremiumButton label="Retry" onPress={onRetry} variant="outline" style={styles.retryButton} />
    </View>
  );
}

/** For an expected "not set up yet" state (e.g. SETUP_OFFICE_MISSING) —
 *  deliberately not red/alarming, since this isn't a failure. */
export function SetupNeededState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={32} color={colors.muted} />
      <Text style={styles.message}>{message}</Text>
      <PremiumButton label="Retry" onPress={onRetry} variant="outline" style={styles.retryButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  message: { fontSize: 14, color: colors.muted, textAlign: "center" },
  code: { fontSize: 12, color: colors.muted },
  retryButton: { marginTop: 4, minWidth: 140 },
});
