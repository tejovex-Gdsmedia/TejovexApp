import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../context/AuthContext";

/**
 * Role gate for attendance admin screens (PRD 5.8: "check profile.role on
 * screen entry and block direct navigation for employees"). The More menu
 * already hides these screens from employees, but a deep link or a typed
 * URL can still reach the route directly — this is what actually blocks it.
 * Returns true once profile is loaded and the user may stay on the screen.
 */
export function useRequireAttendanceAdmin(): boolean {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = profile?.role === "manager" || profile?.role === "hr";

  useEffect(() => {
    if (profile && !allowed) {
      router.replace("/(app)/attendance");
    }
  }, [profile, allowed, router]);

  return allowed;
}
