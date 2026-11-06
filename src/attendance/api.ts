// Supabase access for the Attendance Module. Thin wrappers only — business
// rules live in the database (supabase/attendance.sql) and in rules.ts, not
// here.

import { supabase } from "../lib/supabase";
import { istDate } from "./rules";
import {
  AttendanceAttemptRow,
  AttendanceSettingsRow,
  AuditLogRow,
  CalendarDayRow,
  EmployeeRow,
  LeaveBalanceRow,
  LeaveRequestRow,
  LeaveTypeRow,
  mapAttempt,
  mapAttendanceSettings,
  mapAuditLog,
  mapCalendarDay,
  mapEmployee,
  mapLeaveBalance,
  mapLeaveRequest,
  mapLeaveType,
  mapOffice,
  mapPunch,
  mapRegularizationRequest,
  mapShift,
  OfficeRow,
  PunchRow,
  PunchType,
  RegularizationRequestRow,
  ShiftRow,
  WorkMode,
} from "./types";

export interface RpcResult {
  ok: boolean;
  reason?: string;
  message?: string;
  [key: string]: unknown;
}

async function rpc(name: string, args: Record<string, unknown>): Promise<RpcResult> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    return { ok: false, reason: "error", message: error.message };
  }
  return data as RpcResult;
}

// --- My settings / today ---

export async function fetchMySettings(userId: string) {
  const { data, error } = await supabase
    .from("attendance_settings")
    .select("user_id, work_mode, office_id, shift_id, verification_method, is_active")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return mapAttendanceSettings(data as AttendanceSettingsRow);
}

export async function fetchOfficeById(officeId: string) {
  const { data, error } = await supabase.from("offices").select("id, name, latitude, longitude, radius_meters").eq("id", officeId).single();
  if (error) throw error;
  return mapOffice(data as OfficeRow);
}

export async function fetchShiftById(shiftId: string) {
  const { data, error } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time, grace_minutes, half_day_hours")
    .eq("id", shiftId)
    .single();
  if (error) throw error;
  return mapShift(data as ShiftRow);
}

export async function fetchTodayCalendarDay(date: string = istDate()) {
  const { data, error } = await supabase.from("calendar_days").select("id, date, kind, name").eq("date", date).maybeSingle();
  if (error) throw error;
  return data ? mapCalendarDay(data as CalendarDayRow) : null;
}

export async function fetchPunchForDate(userId: string, date: string) {
  const { data, error } = await supabase
    .from("attendance_punches")
    .select(
      "id, user_id, punch_date, work_mode, check_in_at, check_in_method, check_out_at, check_out_method"
    )
    .eq("user_id", userId)
    .eq("punch_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPunch(data as PunchRow) : null;
}

export async function fetchPunchHistory(userId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from("attendance_punches")
    .select(
      "id, user_id, punch_date, work_mode, check_in_at, check_in_method, check_out_at, check_out_method"
    )
    .eq("user_id", userId)
    .gte("punch_date", from)
    .lte("punch_date", to)
    .order("punch_date", { ascending: false });
  if (error) throw error;
  return (data as PunchRow[]).map(mapPunch);
}

export async function fetchPunchesInRange(from: string, to: string, userId?: string) {
  let query = supabase
    .from("attendance_punches")
    .select(
      "id, user_id, punch_date, work_mode, check_in_at, check_in_method, check_out_at, check_out_method"
    )
    .gte("punch_date", from)
    .lte("punch_date", to)
    .order("punch_date", { ascending: true });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data as PunchRow[]).map(mapPunch);
}

export async function fetchApprovedLeaveInRange(from: string, to: string) {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("user_id, from_date, to_date")
    .eq("status", "approved")
    .lte("from_date", to)
    .gte("to_date", from);
  if (error) throw error;
  return data as { user_id: string; from_date: string; to_date: string }[];
}

export async function fetchCalendarDaysInRange(from: string, to: string) {
  const { data, error } = await supabase
    .from("calendar_days")
    .select("id, date, kind, name")
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  return (data as CalendarDayRow[]).map(mapCalendarDay);
}

export async function fetchUpcomingCalendarDays(from: string, limit = 20) {
  const { data, error } = await supabase
    .from("calendar_days")
    .select("id, date, kind, name")
    .gte("date", from)
    .order("date", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as CalendarDayRow[]).map(mapCalendarDay);
}

export async function recordPunch(params: {
  type: PunchType;
  lat?: number | null;
  lng?: number | null;
  method: "biometric";
}): Promise<RpcResult> {
  return rpc("record_punch", {
    p_punch_type: params.type,
    p_lat: params.lat ?? null,
    p_lng: params.lng ?? null,
    p_method: params.method,
  });
}

export async function logAttendanceAttempt(type: PunchType, reason: string, lat?: number | null, lng?: number | null) {
  await supabase.rpc("log_attendance_attempt", { p_type: type, p_reason: reason, p_lat: lat ?? null, p_lng: lng ?? null });
}

// --- Consent ---

export async function fetchConsent(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("consents").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function submitConsent(userId: string) {
  const { error } = await supabase.from("consents").upsert({ user_id: userId, accepted_at: new Date().toISOString() });
  if (error) throw error;
}

// --- Leave ---

export async function fetchLeaveTypes() {
  const { data, error } = await supabase.from("leave_types").select("id, name, annual_days, is_paid").order("name");
  if (error) throw error;
  return (data as LeaveTypeRow[]).map(mapLeaveType);
}

export async function fetchMyLeaveBalances(userId: string, year: number) {
  const { data, error } = await supabase
    .from("leave_balances")
    .select("id, user_id, leave_type_id, year, allocated, used")
    .eq("user_id", userId)
    .eq("year", year);
  if (error) throw error;
  return (data as LeaveBalanceRow[]).map(mapLeaveBalance);
}

export async function fetchMyLeaveRequests(userId: string) {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type_id, from_date, to_date, half_day, reason, status, manager_comment, hr_comment, created_at, leave_types(name)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as LeaveRequestRow[]).map(mapLeaveRequest);
}

export async function applyLeaveRequest(params: {
  leaveTypeId: string;
  from: string;
  to: string;
  halfDay: boolean;
  reason: string;
}): Promise<RpcResult> {
  return rpc("apply_leave_request", {
    p_leave_type_id: params.leaveTypeId,
    p_from: params.from,
    p_to: params.to,
    p_half_day: params.halfDay,
    p_reason: params.reason,
  });
}

export async function decideLeaveRequest(
  requestId: string,
  stage: "manager" | "hr",
  decision: "approve" | "reject",
  comment?: string
): Promise<RpcResult> {
  return rpc("decide_leave_request", {
    p_request_id: requestId,
    p_stage: stage,
    p_decision: decision,
    p_comment: comment ?? null,
  });
}

export async function fetchPendingLeaveApprovals(stage: "manager" | "hr") {
  const status = stage === "manager" ? "pending" : "manager_approved";
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, user_id, leave_type_id, from_date, to_date, half_day, reason, status, manager_comment, hr_comment, created_at, profiles(full_name), leave_types(name)"
    )
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as LeaveRequestRow[]).map(mapLeaveRequest);
}

export async function initializeLeaveBalances(year: number): Promise<RpcResult> {
  return rpc("initialize_leave_balances", { p_year: year });
}

export async function upsertLeaveType(params: { id?: string; name: string; annualDays: number; isPaid: boolean }) {
  const { error } = await supabase.from("leave_types").upsert({
    id: params.id,
    name: params.name,
    annual_days: params.annualDays,
    is_paid: params.isPaid,
  });
  if (error) throw error;
}

// --- Regularization ---

export async function fetchMyRegularizationRequests(userId: string) {
  const { data, error } = await supabase
    .from("regularization_requests")
    .select("id, user_id, punch_date, type, requested_time, reason, status, manager_comment, hr_comment, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as RegularizationRequestRow[]).map(mapRegularizationRequest);
}

export async function applyRegularizationRequest(params: {
  punchDate: string;
  type: PunchType;
  requestedTime: string;
  reason: string;
}): Promise<RpcResult> {
  return rpc("apply_regularization_request", {
    p_punch_date: params.punchDate,
    p_type: params.type,
    p_requested_time: params.requestedTime,
    p_reason: params.reason,
  });
}

export async function decideRegularizationRequest(
  requestId: string,
  stage: "manager" | "hr",
  decision: "approve" | "reject",
  comment?: string
): Promise<RpcResult> {
  return rpc("decide_regularization_request", {
    p_request_id: requestId,
    p_stage: stage,
    p_decision: decision,
    p_comment: comment ?? null,
  });
}

export async function fetchPendingRegularizationApprovals(stage: "manager" | "hr") {
  const status = stage === "manager" ? "pending" : "manager_approved";
  const { data, error } = await supabase
    .from("regularization_requests")
    .select(
      "id, user_id, punch_date, type, requested_time, reason, status, manager_comment, hr_comment, created_at, profiles(full_name)"
    )
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as RegularizationRequestRow[]).map(mapRegularizationRequest);
}

// --- Admin: offices, shifts, calendar ---

export async function fetchOffices() {
  const { data, error } = await supabase.from("offices").select("id, name, latitude, longitude, radius_meters").order("name");
  if (error) throw error;
  return (data as OfficeRow[]).map(mapOffice);
}

export async function upsertOffice(params: { id?: string; name: string; latitude: number; longitude: number; radiusMeters: number }) {
  const { error } = await supabase.from("offices").upsert({
    id: params.id,
    name: params.name,
    latitude: params.latitude,
    longitude: params.longitude,
    radius_meters: params.radiusMeters,
  });
  if (error) throw error;
}

export async function deleteOffice(id: string) {
  const { error } = await supabase.from("offices").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchShifts() {
  const { data, error } = await supabase
    .from("shifts")
    .select("id, name, start_time, end_time, grace_minutes, half_day_hours")
    .order("name");
  if (error) throw error;
  return (data as ShiftRow[]).map(mapShift);
}

export async function upsertShift(params: {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  halfDayHours: number;
}) {
  const { error } = await supabase.from("shifts").upsert({
    id: params.id,
    name: params.name,
    start_time: params.startTime,
    end_time: params.endTime,
    grace_minutes: params.graceMinutes,
    half_day_hours: params.halfDayHours,
  });
  if (error) throw error;
}

export async function deleteShift(id: string) {
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertCalendarDay(params: { date: string; kind: "weekend" | "holiday"; name: string }) {
  const { error } = await supabase
    .from("calendar_days")
    .upsert({ date: params.date, kind: params.kind, name: params.name }, { onConflict: "date" });
  if (error) throw error;
}

export async function deleteCalendarDay(id: string) {
  const { error } = await supabase.from("calendar_days").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchApprovedLeaveUserIdsForDate(date: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("leave_requests")
    .select("user_id")
    .eq("status", "approved")
    .lte("from_date", date)
    .gte("to_date", date);
  if (error) throw error;
  return new Set((data as { user_id: string }[]).map((r) => r.user_id));
}

// --- Admin: employees ---

export async function fetchEmployees() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, attendance_settings(work_mode, office_id, shift_id, verification_method, is_active, offices(name))"
    )
    .order("full_name");
  if (error) throw error;
  return (data as unknown as EmployeeRow[]).map(mapEmployee);
}

export async function updateEmployeeSettings(
  userId: string,
  patch: Partial<{ workMode: WorkMode; officeId: string | null; shiftId: string | null; isActive: boolean }>
) {
  const payload: Record<string, unknown> = {};
  if (patch.workMode !== undefined) payload.work_mode = patch.workMode;
  if (patch.officeId !== undefined) payload.office_id = patch.officeId;
  if (patch.shiftId !== undefined) payload.shift_id = patch.shiftId;
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;
  const { error } = await supabase.from("attendance_settings").update(payload).eq("user_id", userId);
  if (error) throw error;
}

// --- Admin: dashboard ---

export async function fetchTodayPunches(date: string) {
  const { data, error } = await supabase
    .from("attendance_punches")
    .select(
      "id, user_id, punch_date, work_mode, check_in_at, check_in_method, check_out_at, check_out_method"
    )
    .eq("punch_date", date);
  if (error) throw error;
  return (data as PunchRow[]).map(mapPunch);
}

export async function fetchBlockedAttempts(limit = 50) {
  const { data, error } = await supabase
    .from("attendance_attempts")
    .select("id, user_id, type, reason, lat, lng, distance_meters, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as AttendanceAttemptRow[]).map(mapAttempt);
}

export async function fetchAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, entity_id, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as AuditLogRow[]).map(mapAuditLog);
}
