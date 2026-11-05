import { ReactNode, useEffect, useRef, useState } from "react";
import { Modal } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { fetchConsent, fetchPunchForDate, fetchTodayCalendarDay } from "./api";
import { istDate } from "./rules";
import ChangePasswordScreen from "./components/ChangePasswordScreen";
import ConsentScreen from "./components/ConsentScreen";
import CheckInPrompt from "./components/CheckInPrompt";

type Stage = "checking" | "password" | "consent" | "checkin" | "done";

/**
 * Runs once on sign-in / cold start (PRD 5.2: "runs on sign-in and cold
 * start, not on every navigation"). Tasks are always rendered underneath —
 * only the check-in reminder is skippable; forced password change and
 * one-time consent are hard gates before attendance (not task) use.
 */
export default function AttendanceGate({ children }: { children: ReactNode }) {
  const { session, profile } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const ranRef = useRef(false);

  useEffect(() => {
    if (!profile || !session || ranRef.current) return;
    ranRef.current = true;
    checkPassword();
    // ranRef makes this run only once per sign-in; checkPassword is
    // intentionally omitted so re-renders don't re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, session]);

  function checkPassword() {
    if (session?.user.user_metadata?.must_change_password) {
      setStage("password");
      return;
    }
    checkConsent();
  }

  async function checkConsent() {
    if (!profile) return;
    try {
      const hasConsent = await fetchConsent(profile.id);
      if (!hasConsent) {
        setStage("consent");
        return;
      }
      await checkTodayPunch();
    } catch {
      setStage("done");
    }
  }

  async function checkTodayPunch() {
    if (!profile) return;
    try {
      const today = istDate();
      const [calendarDay, punch] = await Promise.all([
        fetchTodayCalendarDay(today),
        fetchPunchForDate(profile.id, today),
      ]);
      if (!calendarDay && !punch?.checkInAt) {
        setStage("checkin");
        return;
      }
      setStage("done");
    } catch {
      setStage("done");
    }
  }

  return (
    <>
      {children}

      <Modal visible={stage === "password"} animationType="slide" onRequestClose={() => {}}>
        <ChangePasswordScreen onDone={checkConsent} />
      </Modal>

      <Modal visible={stage === "consent"} animationType="slide" onRequestClose={() => {}}>
        {profile ? <ConsentScreen userId={profile.id} onAccept={checkTodayPunch} /> : null}
      </Modal>

      <Modal visible={stage === "checkin"} transparent animationType="fade" onRequestClose={() => setStage("done")}>
        <CheckInPrompt
          onSkip={() => setStage("done")}
          onCheckIn={() => {
            setStage("done");
            router.push("/(app)/attendance/check-in");
          }}
        />
      </Modal>
    </>
  );
}
