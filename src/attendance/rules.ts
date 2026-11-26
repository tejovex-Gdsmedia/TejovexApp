// Pure business-rule functions for the Attendance Module (PRD sections 5.3,
// 5.4, 6). No I/O here — these mirror the server-side logic in
// supabase/attendance.sql (record_punch, attendance_status_for) so the app
// can classify and display attendance without round-tripping to the
// database, and so admin dashboards (DB-side) and the employee app
// (client-side) never disagree about what "Late" or "Half Day" means.
// Keep the two in sync by hand if either changes.

export type DayStatus =
  | "present"
  | "late"
  | "half_day"
  | "absent"
  | "on_leave"
  | "holiday_weekend"
  | "missing_checkout";

export type WorkMode = "office" | "wfh";

export interface ShiftConfig {
  /** "HH:mm", 24-hour. */
  startTime: string;
  /** "HH:mm", 24-hour. */
  endTime: string;
  graceMinutes: number;
  halfDayHours: number;
}

export interface OfficeLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface DayStatusInput {
  /** The calendar date being classified, "YYYY-MM-DD" (IST). */
  date: string;
  isHoliday: boolean;
  isOnApprovedLeave: boolean;
  shift: ShiftConfig | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  /** Defaults to the current instant; pass a fixed value in tests. */
  now?: Date;
}

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MS_PER_MINUTE = 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Shifts a UTC instant by the fixed IST offset (no DST in India). */
function toIstShifted(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/** The IST calendar date ("YYYY-MM-DD") for a given instant. */
export function istDate(date: Date = new Date()): string {
  const shifted = toIstShifted(date);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Minutes since midnight IST for a given instant (0–1439). */
export function istMinutesOfDay(date: Date): number {
  const shifted = toIstShifted(date);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes worked between check-in and check-out, or null if either is missing. */
export function workedMinutes(checkInAt: string | null, checkOutAt: string | null): number | null {
  if (!checkInAt || !checkOutAt) return null;
  const minutes = (new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / MS_PER_MINUTE;
  return minutes >= 0 ? minutes : null;
}

/**
 * Great-circle distance in metres (Haversine). Must stay numerically
 * identical to distance_meters() in supabase/attendance.sql — that copy is
 * the one that actually accepts or rejects a punch; this one only drives
 * the on-screen distance hint before the user taps the button.
 */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_METERS = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const cosArg =
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2) - toRad(lng1)) +
    Math.sin(toRad(lat1)) * Math.sin(toRad(lat2));
  const clamped = Math.min(1, Math.max(-1, cosArg));
  return EARTH_RADIUS_METERS * Math.acos(clamped);
}

/** WFH employees always pass; office employees must be within the office radius. */
export function isWithinOfficeRadius(
  workMode: WorkMode,
  lat: number,
  lng: number,
  office: OfficeLocation
): boolean {
  if (workMode === "wfh") return true;
  return distanceMeters(lat, lng, office.latitude, office.longitude) <= office.radiusMeters;
}

/**
 * Mirrors the method check inside record_punch() in supabase/attendance.sql
 * (PRD 5.2 change, 2026-11-05): a normal punch accepts only the phone's own
 * biometric verification. "regularized" is a valid stored value too, but it
 * is written by decide_regularization_request() on final approval, never by
 * a normal punch — so it is deliberately not "valid" from this function's
 * point of view.
 */
export function isValidPunchMethod(method: string): method is "biometric" | "face" {
  return method === "biometric" || method === "face";
}

/**
 * Classifies one employee's one day per the PRD 5.4 status table. Mirrors
 * attendance_status_for() in supabase/attendance.sql branch-for-branch.
 */
export function dayStatus(input: DayStatusInput): DayStatus {
  const { date, isHoliday, isOnApprovedLeave, shift, checkInAt, checkOutAt } = input;
  const now = input.now ?? new Date();

  if (isHoliday) return "holiday_weekend";
  if (isOnApprovedLeave) return "on_leave";
  if (!checkInAt) return "absent";
  if (!shift) return "present";

  const shiftStart = parseTimeToMinutes(shift.startTime);
  const shiftEnd = parseTimeToMinutes(shift.endTime);
  const checkInMinutes = istMinutesOfDay(new Date(checkInAt));

  if (!checkOutAt) {
    const isPastDay = date < istDate(now);
    const nowMinutes = istMinutesOfDay(now);
    const checkoutDeadline = shiftEnd + shift.graceMinutes;
    if (isPastDay || nowMinutes > checkoutDeadline) {
      return "missing_checkout";
    }
  } else {
    const worked = workedMinutes(checkInAt, checkOutAt);
    if (worked !== null && worked < shift.halfDayHours * 60) {
      return "half_day";
    }
  }

  return checkInMinutes > shiftStart + shift.graceMinutes ? "late" : "present";
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half Day",
  absent: "Absent",
  on_leave: "On Leave",
  holiday_weekend: "Holiday / Weekend",
  missing_checkout: "Missing Check-out",
};
