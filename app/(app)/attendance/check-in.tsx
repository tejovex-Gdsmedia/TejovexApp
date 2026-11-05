import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import PremiumButton from "../../../src/components/ui/PremiumButton";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import { logAttendanceAttempt, recordPunch } from "../../../src/attendance/api";
import { queuePunch } from "../../../src/attendance/offlineQueue";
import { getCurrentLocation, authenticateBiometric, getBiometricAvailability } from "../../../src/attendance/verification";

export default function CheckInScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const attendance = useTodayAttendance(profile?.id);
  const [submitting, setSubmitting] = useState(false);
  const [biometricReady, setBiometricReady] = useState<boolean | null>(null);

  useEffect(() => {
    getBiometricAvailability().then((a) => setBiometricReady(a.hasHardware && a.isEnrolled));
  }, []);

  const handleVerify = async () => {
    let location: { lat: number | null; lng: number | null } = { lat: null, lng: null };

    if (attendance.settings?.workMode === "office") {
      const loc = await getCurrentLocation();
      if (!loc.ok) {
        await logAttendanceAttempt("check_in", loc.reason === "permission_denied" ? "location_denied" : "location_unavailable");
        Alert.alert("Location needed", "Enable location access to check in from the office.");
        return;
      }
      location = { lat: loc.lat ?? null, lng: loc.lng ?? null };
    }

    setSubmitting(true);
    try {
      const result = await authenticateBiometric("Confirm your identity to mark attendance");
      if (!result.ok) {
        await logAttendanceAttempt("check_in", "verification_failed");
        Alert.alert("Verification failed", "Please try again.");
        return;
      }

      try {
        const punchResult = await recordPunch({ type: "check_in", lat: location.lat, lng: location.lng, method: "biometric" });
        if (punchResult.ok) {
          Alert.alert("Checked in", "Your check-in has been recorded.");
          router.back();
        } else {
          Alert.alert("Check-in not accepted", punchResult.message ?? "Please try again.");
        }
      } catch {
        await queuePunch({ type: "check_in", lat: location.lat, lng: location.lng, method: "biometric" });
        Alert.alert("Saved offline", "We couldn't reach the server — your check-in will be sent once you're back online.");
        router.back();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (attendance.loading || biometricReady === null) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!attendance.isWorkingDay) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>Today is a holiday or weekend. No check-in is required.</Text>
        </View>
      </Screen>
    );
  }

  if (attendance.punch?.checkInAt) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>You already checked in today.</Text>
        </View>
      </Screen>
    );
  }

  if (!biometricReady) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>
            Set up fingerprint or Face Unlock in your phone settings to mark attendance. Contact HR if you cannot.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.heading}>Verify to check in</Text>
        <Text style={styles.subheading}>
          {attendance.settings?.workMode === "wfh" ? "Working from home today." : "Make sure you're at the office."}
        </Text>

        <PremiumButton
          label="Verify with Fingerprint / Face Unlock"
          onPress={handleVerify}
          loading={submitting}
          style={styles.submitButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { fontSize: 16, color: colors.text, textAlign: "center" },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 12 },
  subheading: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 24 },
  submitButton: { marginTop: 8 },
});
