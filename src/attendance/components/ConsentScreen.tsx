import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";
import PremiumButton from "../../components/ui/PremiumButton";
import { submitConsent } from "../api";

/** Shown once, before first attendance use (PRD 5.1). */
export default function ConsentScreen({ userId, onAccept }: { userId: string; onAccept: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      await submitConsent(userId);
      onAccept();
    } catch (error) {
      Alert.alert("Could not save consent", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Before you mark attendance</Text>
        <Text style={styles.body}>
          Tejovex&apos;s attendance feature needs your permission to use a few things on your phone, only while
          you are using the app:
        </Text>

        <Text style={styles.point}>• Your location, to confirm you are punching in or out from the right
          place. Location is never tracked in the background.</Text>
        <Text style={styles.point}>• Your phone&apos;s fingerprint or Face Unlock, used to verify every
          check-in and check-out. Tejovex never stores biometric data — your phone checks it, not us.</Text>
      </ScrollView>

      <PremiumButton label="I Agree, Continue" onPress={handleAccept} loading={submitting} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24 },
  content: { paddingTop: 40, paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 16, textAlign: "center" },
  body: { fontSize: 14, color: colors.muted, marginBottom: 12, lineHeight: 20 },
  point: { fontSize: 14, color: colors.text, marginBottom: 10, lineHeight: 20 },
  button: { marginBottom: 12 },
});
