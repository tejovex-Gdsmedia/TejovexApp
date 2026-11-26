import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import AppDialog from "../../../src/components/ui/AppDialog";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import { useAuth } from "../../../src/context/AuthContext";
import { logAttendanceAttempt, recordPunch } from "../../../src/attendance/api";
import { queuePunch } from "../../../src/attendance/offlineQueue";
import { getCurrentLocation, authenticateBiometric, getBiometricAvailability, BiometricAvailability } from "../../../src/attendance/verification";

function logError(context: string, err: unknown) {
  const e = err as { name?: string; message?: string; code?: string; stack?: string } | null | undefined;
  console.error(`[attendance:check-in:${context}]`, {
    name: e?.name,
    message: e?.message ?? String(err),
    code: e?.code,
    stack: e?.stack,
  });
}

/** Never rejects — logs and swallows, since a blocked-attempt record is
 *  best-effort and must not itself cause an uncaught rejection. */
async function logAttemptSafely(type: "check_in" | "check_out", reason: string) {
  try {
    await logAttendanceAttempt(type, reason);
  } catch (err) {
    logError("logAttendanceAttempt", err);
  }
}

export default function CheckInScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const attendance = useTodayAttendance(profile?.id);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    title: string; message: string; onOk?: () => void;
  } | null>(null);
  const dismissDialog = () => { const cb = dialog?.onOk; setDialog(null); cb?.(); };

  useEffect(() => {
    // getBiometricAvailability() never rejects (it catches internally and
    // returns {..., error} instead), so a bare call here is safe.
    getBiometricAvailability().then(setAvailability);
  }, []);

  const handleVerify = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      let location: { lat: number | null; lng: number | null } = { lat: null, lng: null };

      if (attendance.settings?.workMode === "office") {
        const loc = await getCurrentLocation();
        if (!loc.ok) {
          await logAttemptSafely("check_in", loc.reason ?? "location_unavailable");
          const message = loc.message ?? "Enable location access to check in from the office.";
          setErrorMessage(message);
          setDialog({ title: "Location needed", message });
          return;
        }
        location = { lat: loc.lat ?? null, lng: loc.lng ?? null };
      }

      const verifyResult = await authenticateBiometric("Confirm your identity to mark attendance");
      if (!verifyResult.ok) {
        await logAttemptSafely("check_in", verifyResult.reason ?? "verification_failed");
        setErrorMessage(verifyResult.message);
        setDialog({ title: "Verification failed", message: verifyResult.message });
        return;
      }

      try {
        const punchResult = await recordPunch({ type: "check_in", lat: location.lat, lng: location.lng, method: "biometric" });
        if (punchResult.ok) {
          setDialog({ title: "Checked in", message: "Your check-in has been recorded.", onOk: () => router.back() });
        } else {
          const message = punchResult.message ?? "Please try again.";
          setErrorMessage(message);
          setDialog({ title: "Check-in not accepted", message });
        }
      } catch (err) {
        logError("recordPunch", err);
        try {
          await queuePunch({ type: "check_in", lat: location.lat, lng: location.lng, method: "biometric" });
          setDialog({ title: "Saved offline", message: "We couldn't reach the server — your check-in will be sent once you're back online.", onOk: () => router.back() });
        } catch (queueErr) {
          logError("queuePunch", queueErr);
          setErrorMessage("Could not reach the server or save your check-in offline. Please try again.");
        }
      }
    } catch (err) {
      // Catches anything unexpected from the steps above (e.g. a biometric
      // or location call rejecting instead of resolving) so this handler,
      // called bare from onPress, never produces an uncaught promise
      // rejection toast.
      logError("handleVerify", err);
      const e = err as { message?: string } | null | undefined;
      setErrorMessage(e?.message || "Something went wrong. Please try again.");
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

  if (attendance.error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>{attendance.error}</Text>
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

  if (availability.error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>{availability.error}</Text>
        </View>
      </Screen>
    );
  }

  const canVerify = availability.hasHardware && availability.isEnrolled;

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

        <Pressable style={styles.verifyButton} onPress={handleVerify} disabled={submitting} accessibilityRole="button" accessibilityLabel="Verify Identity">
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.white} />
              <Text style={styles.verifyButtonLabel}>Verify Identity</Text>
              <Text style={styles.verifyButtonSub}>Use fingerprint or face unlock</Text>
            </>
          )}
        </Pressable>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={dismissDialog}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  message: { fontSize: 16, color: colors.text, textAlign: "center" },
  heading: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 12 },
  subheading: { fontSize: 14, color: colors.muted, marginTop: 6, marginBottom: 24 },
  verifyButton: {
    minHeight: 130,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  verifyButtonLabel: { color: colors.white, fontWeight: "700", fontSize: 17 },
  verifyButtonSub: { color: colors.white, fontSize: 13, opacity: 0.8 },
  errorText: { color: colors.danger, fontSize: 13, textAlign: "center", marginTop: 16, lineHeight: 18 },
});
