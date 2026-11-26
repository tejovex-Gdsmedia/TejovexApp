import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../../src/constants/colors";
import Screen from "../../../src/components/layout/Screen";
import AppDialog from "../../../src/components/ui/AppDialog";
import { useAuth } from "../../../src/context/AuthContext";
import { useTodayAttendance } from "../../../src/attendance/hooks";
import { logAttendanceAttempt, recordPunch } from "../../../src/attendance/api";
import { queuePunch } from "../../../src/attendance/offlineQueue";
import { getCurrentLocation } from "../../../src/attendance/verification";
import { verifyFace } from "../../../src/attendance/faceApi";

type Step = "camera" | "preview" | "verifying";

function logError(context: string, err: unknown) {
  const e = err as { name?: string; message?: string; code?: string } | null | undefined;
  console.error(`[attendance:face-verify:${context}]`, {
    name: e?.name,
    message: e?.message ?? String(err),
    code: e?.code,
  });
}

async function logAttemptSafely(type: "check_in" | "check_out", reason: string) {
  try { await logAttendanceAttempt(type, reason); } catch (err) { logError("logAttempt", err); }
}

export default function FaceVerifyScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const attendance = useTodayAttendance(profile?.id);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [step, setStep] = useState<Step>("camera");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ title: string; message: string; onOk?: () => void } | null>(null);

  const handleCapture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setStep("preview");
    }
  };

  const handleConfirm = async () => {
    if (!photoUri || !profile?.id) return;
    setStep("verifying");

    try {
      let location: { lat: number | null; lng: number | null } = { lat: null, lng: null };

      if (attendance.settings?.workMode === "office") {
        const loc = await getCurrentLocation();
        if (!loc.ok) {
          await logAttemptSafely("check_in", loc.reason ?? "location_unavailable");
          const message = loc.message ?? "Enable location access to check in from the office.";
          setDialog({ title: "Location needed", message });
          setStep("preview");
          return;
        }
        location = { lat: loc.lat ?? null, lng: loc.lng ?? null };
      }

      let verifyResult;
      try {
        verifyResult = await verifyFace(profile.id, photoUri);
      } catch (err) {
        logError("verifyFace", err);
        const e = err as { message?: string };
        setDialog({
          title: "Face not recognized",
          message: e.message ?? "Could not reach the face recognition server. Make sure the server is running and try again.",
        });
        setStep("preview");
        return;
      }

      if (!verifyResult.matched) {
        await logAttemptSafely("check_in", "face_mismatch");
        setDialog({
          title: "Face not matched",
          message: `Your face did not match. Similarity: ${(verifyResult.similarity * 100).toFixed(0)}%. Please retake the photo in good lighting.`,
        });
        setStep("preview");
        return;
      }

      try {
        const punchResult = await recordPunch({ type: "check_in", lat: location.lat, lng: location.lng, method: "face" });
        if (punchResult.ok) {
          setDialog({ title: "Checked in", message: "Your check-in has been recorded.", onOk: () => router.back() });
        } else {
          const message = punchResult.message ?? "Please try again.";
          setDialog({ title: "Check-in not accepted", message });
          setStep("preview");
        }
      } catch (err) {
        logError("recordPunch", err);
        try {
          await queuePunch({ type: "check_in", lat: location.lat, lng: location.lng, method: "face" });
          setDialog({
            title: "Saved offline",
            message: "We couldn't reach the server — your check-in will be sent once you're back online.",
            onOk: () => router.back(),
          });
        } catch (queueErr) {
          logError("queuePunch", queueErr);
          setDialog({ title: "Error", message: "Could not save your check-in offline. Please try again." });
          setStep("preview");
        }
      }
    } catch (err) {
      logError("handleConfirm", err);
      const e = err as { message?: string };
      setDialog({ title: "Error", message: e?.message || "Something went wrong. Please try again." });
      setStep("preview");
    }
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.muted} />
          <Text style={styles.permText}>Camera permission is needed to verify your face.</Text>
          <Pressable style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Allow Camera</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Face Check-In</Text>
        <View style={{ width: 40 }} />
      </View>

      {step === "camera" && (
        <>
          <Text style={styles.hint}>Look directly at the camera and take a photo.</Text>
          <CameraView ref={cameraRef} style={styles.camera} facing="front">
            <View style={styles.oval} />
          </CameraView>
          <View style={styles.captureRow}>
            <Pressable style={styles.captureBtn} onPress={handleCapture}>
              <View style={styles.captureInner} />
            </Pressable>
          </View>
        </>
      )}

      {(step === "preview" || step === "verifying") && photoUri && (
        <>
          <Text style={styles.hint}>
            {step === "verifying" ? "Verifying your face…" : "Confirm and verify to check in."}
          </Text>
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
          <View style={styles.previewActions}>
            <Pressable
              style={[styles.actionBtn, styles.retakeBtn]}
              onPress={() => { setPhotoUri(null); setStep("camera"); }}
              disabled={step === "verifying"}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.confirmBtn]}
              onPress={handleConfirm}
              disabled={step === "verifying"}
            >
              {step === "verifying" ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
                  <Text style={styles.confirmText}>Verify & Check In</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message ?? ""}
        onDismiss={() => { const cb = dialog?.onOk; setDialog(null); cb?.(); }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  hint: { fontSize: 14, color: colors.muted, textAlign: "center", marginHorizontal: 24, marginBottom: 12 },
  camera: { flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  oval: {
    width: 220, height: 290,
    borderRadius: 110,
    borderWidth: 3, borderColor: colors.primary,
    borderStyle: "dashed",
  },
  captureRow: { alignItems: "center", paddingVertical: 28 },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.white,
    borderWidth: 4, borderColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  captureInner: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary },
  preview: { flex: 1, marginHorizontal: 16, borderRadius: 24 },
  previewActions: { flexDirection: "row", gap: 12, padding: 20, paddingBottom: 32 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16 },
  retakeBtn: { backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border },
  retakeText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  confirmBtn: { backgroundColor: colors.primary },
  confirmText: { fontSize: 15, fontWeight: "700", color: colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  permText: { fontSize: 15, color: colors.text, textAlign: "center" },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  permBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
