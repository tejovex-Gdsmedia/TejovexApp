import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import { useAuth } from "../../../src/context/AuthContext";
import { logAttendanceAttempt, recordPunch } from "../../../src/attendance/api";
import { queuePunch } from "../../../src/attendance/offlineQueue";
import { getCurrentLocation, authenticateBiometric, getBiometricAvailability, BiometricAvailability } from "../../../src/attendance/verification";

export default function CheckInScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const attendance = useTodayAttendance(profile?.id);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);

  useEffect(() => {
    getBiometricAvailability().then(setAvailability);
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

  if (attendance.loading || availability === null) {
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

  const canVerify = availability.hasHardware && availability.isEnrolled && (availability.supportsFace || availability.supportsFingerprint);

  if (!canVerify) {
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

        <View style={styles.buttonRow}>
          {availability.supportsFace && (
            <Pressable style={styles.verifyButton} onPress={handleVerify} disabled={submitting} accessibilityRole="button" accessibilityLabel="Face Unlock">
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={28} color={colors.white} />
                  <Text style={styles.verifyButtonLabel}>Face Unlock</Text>
                </>
              )}
            </Pressable>
          )}
          {availability.supportsFingerprint && (
            <Pressable style={styles.verifyButton} onPress={handleVerify} disabled={submitting} accessibilityRole="button" accessibilityLabel="Fingerprint">
              {submitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="finger-print-outline" size={28} color={colors.white} />
                  <Text style={styles.verifyButtonLabel}>Fingerprint</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <Text style={styles.note}>Your phone chooses the sensor that is available.</Text>
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
  buttonRow: { flexDirection: "row", gap: 14 },
  verifyButton: {
    flex: 1,
    minHeight: 110,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  verifyButtonLabel: { color: colors.white, fontWeight: "700", fontSize: 14 },
  note: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 16 },
});
