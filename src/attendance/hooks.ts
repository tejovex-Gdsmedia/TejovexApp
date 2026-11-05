import { useCallback, useEffect, useState } from "react";
import { fetchMySettings, fetchOfficeById, fetchPunchForDate, fetchShiftById, fetchTodayCalendarDay } from "./api";
import { DayStatus, dayStatus, istDate } from "./rules";
import { AttendanceSettings, CalendarDay, Office, Punch, Shift } from "./types";

export interface TodayAttendance {
  loading: boolean;
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
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
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
