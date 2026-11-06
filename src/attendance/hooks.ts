import { useCallback, useEffect, useState } from "react";
import { fetchMySettings, fetchOfficeById, fetchPunchForDate, fetchShiftById, fetchTodayCalendarDay } from "./api";
import { DayStatus, dayStatus, istDate } from "./rules";
import { AttendanceSettings, CalendarDay, Office, Punch, Shift } from "./types";

export interface TodayAttendance {
  loading: boolean;
  error: string | null;
  settings: AttendanceSettings | null;
  office: Office | null;
  shift: Shift | null;
  calendarDay: CalendarDay | null;
  punch: Punch | null;
  status: DayStatus;
  isWorkingDay: boolean;
  refresh: () => Promise<void>;
}

/** Everything a Check-In/Check-Out/Attendance screen needs about "today"
 *  for one employee, fetched together and refreshable as a unit. */
export function useTodayAttendance(userId: string | undefined): TodayAttendance {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [office, setOffice] = useState<Office | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [calendarDay, setCalendarDay] = useState<CalendarDay | null>(null);
  const [punch, setPunch] = useState<Punch | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const today = istDate();
      const [mySettings, todayCalendarDay, todayPunch] = await Promise.all([
        fetchMySettings(userId),
        fetchTodayCalendarDay(today),
        fetchPunchForDate(userId, today),
      ]);
      setSettings(mySettings);
      setCalendarDay(todayCalendarDay);
      setPunch(todayPunch);

      const [resolvedOffice, resolvedShift] = await Promise.all([
        mySettings.officeId ? fetchOfficeById(mySettings.officeId) : Promise.resolve(null),
        mySettings.shiftId ? fetchShiftById(mySettings.shiftId) : Promise.resolve(null),
      ]);
      setOffice(resolvedOffice);
      setShift(resolvedShift);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // refresh() has no internal catch (see docs/attendance-decisions.md on
    // the react-hooks/set-state-in-effect lint shape) — every call site,
    // including this one, must attach its own .catch() or a failed fetch
    // becomes an uncaught promise rejection ("Uncaught (in promise)").
    refresh().catch((err) => {
      console.error("useTodayAttendance refresh failed:", err?.name, err?.message, err?.code, err?.stack);
      setError(err instanceof Error ? err.message : "Could not load today's attendance.");
    });
  }, [refresh]);

  const status: DayStatus = dayStatus({
    date: istDate(),
    isHoliday: !!calendarDay,
    isOnApprovedLeave: false,
    shift,
    checkInAt: punch?.checkInAt ?? null,
    checkOutAt: punch?.checkOutAt ?? null,
  });

  return {
    loading,
    error,
    settings,
    office,
    shift,
    calendarDay,
    punch,
    status,
    isWorkingDay: !calendarDay,
    refresh,
  };
}
