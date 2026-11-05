// Device-side verification helpers for a punch: foreground location and
// phone biometrics. No background location is ever requested (PRD 3, 9).

import * as Location from "expo-location";
import * as LocalAuthentication from "expo-local-authentication";

export interface LocationResult {
  ok: boolean;
  lat?: number;
  lng?: number;
  reason?: "permission_denied" | "unavailable";
}

export async function getCurrentLocation(): Promise<LocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportsFace: boolean;
  supportsFingerprint: boolean;
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
  const types = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
  return {
    hasHardware,
    isEnrolled,
    supportsFace: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
    supportsFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
  };
}

export interface BiometricResult {
  ok: boolean;
  reason?: string;
}

/** Device-only biometric check (fingerprint or Face Unlock) — the only
 *  verification method. Device passcode fallback is deliberately disabled;
 *  there is no other method to fall back to (PRD 5.2 change, 2026-11-05). */
export async function authenticateBiometric(promptMessage: string): Promise<BiometricResult> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: true,
    cancelLabel: "Cancel",
  });
  return result.success ? { ok: true } : { ok: false, reason: result.error };
}
