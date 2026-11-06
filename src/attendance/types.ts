// Attendance Module types. Mirrors the pattern in src/types/task.ts: camelCase
// app types, snake_case Row types matching Supabase columns, and a mapping
// function between them — the only place that converts.

export type WorkMode = "office" | "wfh";
// The only verification method (PRD 5.2 change, 2026-11-05): the phone's own
// fingerprint or Face Unlock, via expo-local-authentication.
export type VerificationMethod = "biometric";
export type PunchType = "check_in" | "check_out";
export type RequestStatus = "pending" | "manager_approved" | "approved" | "rejected";
export type CalendarKind = "weekend" | "holiday";

export interface Office {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  halfDayHours: number;
}

export interface AttendanceSettings {
  userId: string;
  workMode: WorkMode;
  officeId: string | null;
  shiftId: string | null;
  verificationMethod: VerificationMethod;
  isActive: boolean;
}

export interface CalendarDay {
  id: string;
  date: string;
  kind: CalendarKind;
  name: string;
}

export interface Punch {
  id: string;
  userId: string;
  punchDate: string;
  workMode: WorkMode;
  checkInAt: string | null;
  checkInMethod: string | null;
  checkOutAt: string | null;
  checkOutMethod: string | null;
}

export interface AttendanceAttempt {
  id: string;
  userId: string;
  userName?: string;
  type: PunchType;
  reason: string;
  lat: number | null;
  lng: number | null;
  distanceMeters: number | null;
  createdAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  annualDays: number;
  isPaid: boolean;
}

export interface LeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  reason: string;
  status: RequestStatus;
  managerComment: string | null;
  hrComment: string | null;
  createdAt: string;
}

export interface RegularizationRequest {
  id: string;
  userId: string;
  userName?: string;
  punchDate: string;
  type: PunchType;
  requestedTime: string;
  reason: string;
  status: RequestStatus;
  managerComment: string | null;
  hrComment: string | null;
  createdAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  role: "manager" | "hr" | "employee";
  workMode: WorkMode;
  officeId: string | null;
  officeName: string | null;
  shiftId: string | null;
  verificationMethod: VerificationMethod;
  isActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorName?: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
}

// --- Raw Supabase row shapes (snake_case) ---

export interface OfficeRow {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface ShiftRow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  half_day_hours: number;
}

export interface AttendanceSettingsRow {
  user_id: string;
  work_mode: WorkMode;
  office_id: string | null;
  shift_id: string | null;
  verification_method: VerificationMethod;
  is_active: boolean;
}

export interface CalendarDayRow {
  id: string;
  date: string;
  kind: CalendarKind;
  name: string;
}

export interface PunchRow {
  id: string;
  user_id: string;
  punch_date: string;
  work_mode: WorkMode;
  check_in_at: string | null;
  check_in_method: string | null;
  check_out_at: string | null;
  check_out_method: string | null;
}

export interface AttendanceAttemptRow {
  id: string;
  user_id: string;
  type: PunchType;
  reason: string;
  lat: number | null;
  lng: number | null;
  distance_meters: number | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface LeaveTypeRow {
  id: string;
  name: string;
  annual_days: number;
  is_paid: boolean;
}

export interface LeaveBalanceRow {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  allocated: number;
  used: number;
}

export interface LeaveRequestRow {
  id: string;
  user_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  half_day: boolean;
  reason: string;
  status: RequestStatus;
  manager_comment: string | null;
  hr_comment: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
  leave_types?: { name: string } | null;
}

export interface RegularizationRequestRow {
  id: string;
  user_id: string;
  punch_date: string;
  type: PunchType;
  requested_time: string;
  reason: string;
  status: RequestStatus;
  manager_comment: string | null;
  hr_comment: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface EmployeeRow {
  id: string;
  full_name: string;
  role: "manager" | "hr" | "employee";
  attendance_settings?: {
    work_mode: WorkMode;
    office_id: string | null;
    shift_id: string | null;
    verification_method: VerificationMethod;
    is_active: boolean;
    offices?: { name: string } | null;
  } | null;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

// --- Mapping helpers ---

export function mapOffice(row: OfficeRow): Office {
  return { id: row.id, name: row.name, latitude: row.latitude, longitude: row.longitude, radiusMeters: row.radius_meters };
}

export function mapShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    graceMinutes: row.grace_minutes,
    halfDayHours: Number(row.half_day_hours),
  };
}

export function mapAttendanceSettings(row: AttendanceSettingsRow): AttendanceSettings {
  return {
    userId: row.user_id,
    workMode: row.work_mode,
    officeId: row.office_id,
    shiftId: row.shift_id,
    verificationMethod: row.verification_method,
    isActive: row.is_active,
  };
}

export function mapCalendarDay(row: CalendarDayRow): CalendarDay {
  return { id: row.id, date: row.date, kind: row.kind, name: row.name };
}

export function mapPunch(row: PunchRow): Punch {
  return {
    id: row.id,
    userId: row.user_id,
    punchDate: row.punch_date,
    workMode: row.work_mode,
    checkInAt: row.check_in_at,
    checkInMethod: row.check_in_method,
    checkOutAt: row.check_out_at,
    checkOutMethod: row.check_out_method,
  };
}

export function mapAttempt(row: AttendanceAttemptRow): AttendanceAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.full_name,
    type: row.type,
    reason: row.reason,
    lat: row.lat,
    lng: row.lng,
    distanceMeters: row.distance_meters,
    createdAt: row.created_at,
  };
}

export function mapLeaveType(row: LeaveTypeRow): LeaveType {
  return { id: row.id, name: row.name, annualDays: Number(row.annual_days), isPaid: row.is_paid };
}

export function mapLeaveBalance(row: LeaveBalanceRow): LeaveBalance {
  return {
    id: row.id,
    userId: row.user_id,
    leaveTypeId: row.leave_type_id,
    year: row.year,
    allocated: Number(row.allocated),
    used: Number(row.used),
  };
}

export function mapLeaveRequest(row: LeaveRequestRow): LeaveRequest {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.full_name,
    leaveTypeId: row.leave_type_id,
    leaveTypeName: row.leave_types?.name,
    fromDate: row.from_date,
    toDate: row.to_date,
    halfDay: row.half_day,
    reason: row.reason,
    status: row.status,
    managerComment: row.manager_comment,
    hrComment: row.hr_comment,
    createdAt: row.created_at,
  };
}

export function mapRegularizationRequest(row: RegularizationRequestRow): RegularizationRequest {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.profiles?.full_name,
    punchDate: row.punch_date,
    type: row.type,
    requestedTime: row.requested_time,
    reason: row.reason,
    status: row.status,
    managerComment: row.manager_comment,
    hrComment: row.hr_comment,
    createdAt: row.created_at,
  };
}

export function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    workMode: row.attendance_settings?.work_mode ?? "office",
    officeId: row.attendance_settings?.office_id ?? null,
    officeName: row.attendance_settings?.offices?.name ?? null,
    shiftId: row.attendance_settings?.shift_id ?? null,
    verificationMethod: row.attendance_settings?.verification_method ?? "biometric",
    isActive: row.attendance_settings?.is_active ?? true,
  };
}

export function mapAuditLog(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.profiles?.full_name,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    createdAt: row.created_at,
  };
}
