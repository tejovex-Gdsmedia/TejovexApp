// Device-side verification helpers for a punch: foreground location and
// phone biometrics. No background location is ever requested (PRD 3, 9).
//
// Every exported function here resolves to a plain {ok, ...} result and
// never rejects — each native call is caught individually so a device-side
// failure becomes a readable reason/message instead of an uncaught promise
// rejection in the screen that calls it.

import * as Location from "expo-location";
import * as LocalAuthentication from "expo-local-authentication";

function logError(context: string, err: unknown) {
  const e = err as { name?: string; message?: string; code?: string; stack?: string } | null | undefined;
  console.error(`[attendance:${context}]`, {
    name: e?.name,
    message: e?.message ?? String(err),
    code: e?.code,
    stack: e?.stack,
  });
}

export type LocationFailureReason = "permission_denied" | "services_disabled" | "unavailable";

export interface LocationResult {
  ok: boolean;
  lat?: number;
  lng?: number;
  reason?: LocationFailureReason;
  message?: string;
}

export async function getCurrentLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return {
        ok: false,
        reason: "permission_denied",
        message: "Location permission was denied. Enable it in your phone's app settings to punch from the office.",
      };
    }
  } catch (err) {
    logError("requestForegroundPermissionsAsync", err);
    return { ok: false, reason: "unavailable", message: "Could not ask for location permission. Please try again." };
  }

  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        ok: false,
        reason: "services_disabled",
        message: "Location (GPS) is turned off on your phone. Turn it on to punch from the office.",
      };
    }
  } catch (err) {
    // If the check itself fails, fall through and let getCurrentPositionAsync
    // be the source of truth rather than blocking the punch on this alone.
    logError("hasServicesEnabledAsync", err);
  }

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, lat: position.coords.latitude, lng: position.coords.longitude };
  } catch (err) {
    logError("getCurrentPositionAsync", err);
    return {
      ok: false,
      reason: "unavailable",
      message: "Could not get your current location. Move to an open area and try again.",
    };
  }
}

export interface BiometricAvailability {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportsFace: boolean;
  supportsFingerprint: boolean;
  /** Raw result of supportedAuthenticationTypesAsync(), for on-screen debugging in __DEV__. */
  rawTypes: LocalAuthentication.AuthenticationType[];
  /** Set when a native call failed — hasHardware/isEnrolled/supportsX above
   *  are only reliable when this is null. */
  error?: string;
}

const UNKNOWN_BIOMETRIC_AVAILABILITY: BiometricAvailability = {
  hasHardware: false,
  isEnrolled: false,
  supportsFace: false,
  supportsFingerprint: false,
  rawTypes: [],
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = hasHardware ? await LocalAuthentication.isEnrolledAsync() : false;
    const rawTypes = hasHardware ? await LocalAuthentication.supportedAuthenticationTypesAsync() : [];
    return {
      hasHardware,
      isEnrolled,
      supportsFace: rawTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      supportsFingerprint: rawTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT),
      rawTypes,
    };
  } catch (err) {
    logError("getBiometricAvailability", err);
    return {
      ...UNKNOWN_BIOMETRIC_AVAILABILITY,
      error: "Could not check your phone's fingerprint/Face Unlock capability.",
    };
  }
}

export interface BiometricResult {
  ok: boolean;
  reason?: string;
  message: string;
}

// Every documented LocalAuthenticationError value (SDK 58), each with its
// own message. The five explicitly called out (user_cancel, lockout,
// not_enrolled, passcode_not_set, not_available) have the most specific
// wording; the rest still get a readable, non-generic message.
const BIOMETRIC_ERROR_MESSAGES: Record<string, string> = {
  not_enrolled: "No fingerprint or face is set up on this phone. Add one in your phone's settings, or contact HR.",
  user_cancel: "Verification was cancelled.",
  app_cancel: "Verification was cancelled by the app. Please try again.",
  not_available: "Fingerprint and Face Unlock aren't available on this phone right now.",
  lockout: "Too many failed attempts. Wait a moment and try again, or use your phone's passcode to unlock it first.",
  no_space: "Your phone is low on storage, which is blocking verification. Free up some space and try again.",
  timeout: "Verification timed out. Please try again.",
  unable_to_process: "Your phone couldn't read your fingerprint or face. Please try again.",
  unknown: "Verification failed for an unknown reason. Please try again.",
  system_cancel: "Verification was interrupted by the system. Please try again.",
  user_fallback: "Switch to your phone's passcode isn't supported here — use fingerprint or Face Unlock.",
  invalid_context: "Verification couldn't start. Please close and reopen the app, then try again.",
  passcode_not_set: "Set up a phone passcode (PIN, pattern, or password) before you can use fingerprint or Face Unlock.",
  authentication_failed: "Fingerprint or face didn't match. Please try again.",
};

function biometricMessageFor(reason: string | undefined): string {
  if (reason && BIOMETRIC_ERROR_MESSAGES[reason]) return BIOMETRIC_ERROR_MESSAGES[reason];
  return "Verification failed. Please try again.";
}

/** Device-only biometric check (fingerprint or Face Unlock) — the only
 *  verification method. Device passcode fallback is deliberately disabled;
 *  there is no other method to fall back to (PRD 5.2 change, 2026-11-05).
 *  biometricsSecurityLevel is left at its documented default ('weak'),
 *  which already accepts Android Class 2 biometrics (e.g. camera-based
 *  Face Unlock) — set explicitly here so the intent doesn't rely on a
 *  default that could change in a future SDK. */
export async function authenticateBiometric(promptMessage: string): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      disableDeviceFallback: true,
      cancelLabel: "Cancel",
      biometricsSecurityLevel: "weak",
    });
    if (result.success) {
      return { ok: true, message: "Verified." };
    }
    return { ok: false, reason: result.error, message: biometricMessageFor(result.error) };
  } catch (err) {
    logError("authenticateAsync", err);
    const e = err as { message?: string } | null | undefined;
    return { ok: false, reason: "unknown", message: e?.message || "Verification failed unexpectedly. Please try again." };
  }
}
