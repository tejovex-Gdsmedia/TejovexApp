import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal } from "react-native";
import { useAuth } from "../context/AuthContext";
import { fetchConsent } from "./api";
import ConsentScreen from "./components/ConsentScreen";

/**
 * Consent is still required once before any attendance action (PRD 5.1),
 * but — unlike the old design — it is no longer checked automatically on
 * every sign-in. It is checked here, wrapping the attendance route group
 * itself, so it only ever interrupts someone who is actually about to use
 * attendance (see docs/attendance-decisions.md).
 */
export default function AttendanceConsentGate({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [needsConsent, setNeedsConsent] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!profile || ranRef.current) return;
    ranRef.current = true;
    fetchConsent(profile.id)
      .then((hasConsent) => setNeedsConsent(!hasConsent))
      .catch(() => setNeedsConsent(false));
  }, [profile]);

  return (
    <>
      {children}

      <Modal visible={needsConsent} animationType="slide" onRequestClose={() => {}}>
        {profile ? <ConsentScreen userId={profile.id} onAccept={() => setNeedsConsent(false)} /> : null}
      </Modal>
    </>
  );
}
