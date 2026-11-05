import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal } from "react-native";
import { useAuth } from "../context/AuthContext";
import ChangePasswordScreen from "./components/ChangePasswordScreen";

/**
 * Account-level gate, runs once on sign-in / cold start. Forced password
 * change (PRD 5.1) is the only thing enforced here — attendance itself is
 * never forced: the home chooser is always shown first, with the
 * Attendance card reading "Not marked today" as a reminder rather than a
 * blocking prompt (see docs/attendance-decisions.md). Consent is checked
 * separately, right before the user enters the attendance flow.
 */
export default function AttendanceGate({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const [showPasswordGate, setShowPasswordGate] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!profile || !session || ranRef.current) return;
    ranRef.current = true;
    setShowPasswordGate(!!session.user.user_metadata?.must_change_password);
  }, [profile, session]);

  return (
    <>
      {children}

      <Modal visible={showPasswordGate} animationType="slide" onRequestClose={() => {}}>
        <ChangePasswordScreen onDone={() => setShowPasswordGate(false)} />
      </Modal>
    </>
  );
}
