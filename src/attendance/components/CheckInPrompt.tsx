import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";

/** The one skippable gate (PRD 5.2: "Skipping does not block tasks"). */
export default function CheckInPrompt({ onCheckIn, onSkip }: { onCheckIn: () => void; onSkip: () => void }) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>Don&apos;t forget to check in</Text>
        <Text style={styles.subtitle}>You haven&apos;t checked in today. Mark your attendance now, or skip and do it later.</Text>
        <PremiumButton label="Check In" onPress={onCheckIn} style={styles.checkInButton} />
        <Pressable onPress={onSkip} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Skip for now">
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.5)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 24 },
  title: { fontSize: 19, fontWeight: "700", color: colors.text, textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  checkInButton: { marginBottom: 4 },
  skipButton: { marginTop: 12, alignItems: "center", minHeight: 44, justifyContent: "center" },
  skipText: { color: colors.muted, fontWeight: "600" },
});
