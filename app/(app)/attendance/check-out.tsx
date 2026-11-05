import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useAuth } from "../../../src/context/AuthContext";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import PremiumButton from "../../../src/components/ui/PremiumButton";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import { logAttendanceAttempt, recordPunch, uploadSelfie } from "../../../src/attendance/api";
import { queuePunch } from "../../../src/attendance/offlineQueue";
import { getCurrentLocation, authenticateBiometric } from "../../../src/attendance/verification";
import { VerificationMethod } from "../../../src/attendance/types";

export default function CheckOutScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const attendance = useTodayAttendance(profile?.id);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const method = attendance.settings?.verificationMethod ?? "fingerprint";

  const finishPunch = async (verificationMethod: VerificationMethod, selfiePath: string | null) => {
    let location: { lat: number | null; lng: number | null } = { lat: null, lng: null };

    if (attendance.settings?.workMode === "office") {
      const loc = await getCurrentLocation();
      if (!loc.ok) {
        await logAttendanceAttempt("check_out", loc.reason === "permission_denied" ? "location_denied" : "location_unavailable");
        Alert.alert("Location needed", "Enable location access to check out from the office.");
        return;
      }
      location = { lat: loc.lat ?? null, lng: loc.lng ?? null };
    }

    setSubmitting(true);
    try {
      const result = await recordPunch({ type: "check_out", lat: location.lat, lng: location.lng, method: verificationMethod, selfiePath });
      if (result.ok) {
        Alert.alert("Checked out", "Your check-out has been recorded.");
        router.back();
      } else {
        Alert.alert("Check-out not accepted", result.message ?? "Please try again.");
      }
    } catch {
      await queuePunch({ type: "check_out", lat: location.lat, lng: location.lng, method: verificationMethod, selfiePath });
      Alert.alert("Saved offline", "We couldn't reach the server — your check-out will be sent once you're back online.");
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometric = async () => {
    setSubmitting(true);
    const result = await authenticateBiometric(method === "face" ? "Verify with Face Unlock" : "Verify with your fingerprint");
    setSubmitting(false);
    if (!result.ok) {
      await logAttendanceAttempt("check_out", "verification_failed");
      Alert.alert("Verification failed", "Please try again.");
      return;
    }
    await finishPunch(method, null);
  };

  const handleSelfieStart = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        await logAttendanceAttempt("check_out", "verification_failed");
        Alert.alert("Camera needed", "Enable camera access to verify with a selfie.");
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || !profile) return;
    setSubmitting(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      if (!photo) throw new Error("No photo captured");

      const context = ImageManipulator.manipulate(photo.uri);
      context.resize({ width: 600 });
      const renderedImage = await context.renderAsync();
      const saved = await renderedImage.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

      const path = await uploadSelfie(profile.id, "check_out", saved.uri);
      setShowCamera(false);
      await finishPunch("selfie", path);
    } catch {
      Alert.alert("Could not take selfie", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (method === "selfie") {
      handleSelfieStart();
    } else {
      handleBiometric();
    }
  };

  if (attendance.loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!attendance.punch?.checkInAt) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>Check in before checking out.</Text>
        </View>
      </Screen>
    );
  }

  if (attendance.punch?.checkOutAt) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.message}>You already checked out today.</Text>
        </View>
      </Screen>
    );
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.cameraControls}>
          <Pressable
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Take selfie"
          >
            {submitting ? <ActivityIndicator color={colors.white} /> : <View style={styles.captureInner} />}
          </Pressable>
          <Pressable onPress={() => setShowCamera(false)} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <View style={styles.container}>
        <Text style={styles.heading}>Verify to check out</Text>
        <Text style={styles.subheading}>Using your preferred method: {method === "face" ? "Face Unlock" : method === "fingerprint" ? "Fingerprint" : "Selfie"}</Text>
        <PremiumButton label="Check Out" onPress={handleSubmit} loading={submitting} style={styles.submitButton} />
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
  submitButton: { marginTop: 32 },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraControls: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white },
  cancelButton: { marginTop: 16, padding: 10 },
  cancelText: { color: colors.white, fontWeight: "600" },
});
