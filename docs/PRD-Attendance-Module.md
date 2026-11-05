# Product Requirements Document: Attendance Module

**Product:** Tejovex Task Manager (existing app) + Attendance Module
**Platform:** Android APK (Expo SDK 58, React Native, TypeScript), backend on Supabase
**Repository:** github.com/tejovex-Gdsmedia/tejovexapp
**Status:** Draft for approval
**Date:** 5 November 2026
**Owner:** Tejovex / GDS Media

---

## Change Notes

- **2026-11-05:** Selfie removed as a verification method. Verification is
  now the phone's own fingerprint or Face Unlock only, via
  `expo-local-authentication`. No photo of any kind is captured, uploaded,
  or stored by the app. See `docs/attendance-decisions.md` for the full
  reasoning. Sections 5.1, 5.2, 6, 7, 9, 10, 11, 12, and 14 below reflect
  this; anywhere one of those sections still reads as if a photo-based
  method exists, this note overrides it.

---

## 1. Purpose

Add attendance tracking, leave management, and approvals to the existing Tejovex task management app, so that one app runs the team's daily work, its tasks, and its attendance records. Employees mark attendance with their phone. Managers and HR review attendance and approve leave.

## 2. Goals

1. Record each employee's daily check-in and check-out reliably, with identity verification.
2. Support office and work-from-home (WFH) employees under one system.
3. Give managers and HR accurate daily, monthly, and payroll-ready reports.
4. Run leave requests through a two-step approval: manager, then HR.
5. Keep all employee data private, with access limited by role.

## 3. Non-Goals (Version 1)

- WhatsApp or push alerts (planned for a later version)
- Biometric hardware devices (fingerprint machines, RFID cards)
- Payroll calculation (only the data needed for payroll is exported)
- Background location tracking
- iOS build (Android APK only in version 1)
- Public self-registration (accounts are invite-only)

## 4. Users and Roles

| Role | Who | Main permissions |
|---|---|---|
| Employee | Staff | Check in and out, see own attendance, apply for leave and regularization, use the task features |
| Manager | Team lead | Approve or reject leave and regularization as stage 1, see team attendance, use the task features |
| HR | HR department | Final approval for leave and regularization, set weekends and holidays, manage employees and settings, reports, invite employees |

Role changes are made only in the database by the system owner. Employees cannot change their own role.

## 5. Scope and Features

### 5.1 Account and Access

- **Invite-only accounts.** Public sign-up is turned off. Managers and HR add employees. The system creates the account with a temporary password, shown once to the admin, who shares it with the employee.
- **Forced password change** on first login.
- **Sign-in** with email and password (existing feature, unchanged).
- **Consent** shown once before first attendance use. Employee accepts the use of location and the phone's fingerprint or Face Unlock. No biometric data is stored.

### 5.2 Daily Attendance

- **Check-in** on the first login of the day, or from the Check-In screen.
- **Check-out** is required every working day, from a Check Out button.
- **Verification** for each punch: the phone's own Fingerprint or Face Unlock, through `expo-local-authentication`. There is no other method and nothing to choose — the screen shows one "Verify with Fingerprint / Face Unlock" action. If the phone has no biometric hardware or no fingerprint/face enrolled, the app tells the employee to set one up and contact HR if they cannot; no fallback method is offered.
- **Location rules:**
  - Office employees must be within the office radius (default 100 metres) to punch.
  - WFH employees punch from anywhere. Their location is recorded but not checked against the office.
- **Once per day.** Only one accepted check-in and one accepted check-out per employee per day. The database enforces this.
- **Login is not attendance.** Employees can open and close the app many times a day. Attendance is checked only on the first login. Task access never depends on attendance.
- **Skip.** Employees may skip the check-in. Skipping does not block tasks, and a reminder appears.
- **Failed attempts** (outside radius, verification failed, location denied, already marked) are logged with a reason for admin review.

### 5.3 Shifts and Working Days

- **Default shift:** 10:30 AM to 7:30 PM.
- **Per-employee timing:** admins can create shifts for different timings and assign each employee a shift.
- **Grace period:** 15 minutes by default, editable per shift.
- **Half-day threshold:** 4 hours worked, editable per shift.
- **Weekends and holidays** are set by admin and HR. Employees do not check in on those days, and no absence is marked.

### 5.4 Attendance Status

| Status | Rule |
|---|---|
| Present | Check-in at or before shift start plus grace period |
| Late | Check-in after shift start plus grace period |
| Half Day | Worked less than the half-day threshold |
| Absent | Working day with no check-in and no approved leave |
| On Leave | Approved leave covers the date |
| Holiday / Weekend | Date is in the calendar; no punch required |
| Missing Check-out | Check-in exists, no check-out after shift end plus grace period |

Worked hours = check-out minus check-in, when both exist.

### 5.5 Leave Management

- **Leave types:**
  - Casual Leave: 12 days per year
  - Leave Without Pay: 6 days per year
- **Application:** employee selects type, from date, to date, half day (optional), and reason.
- **Approval chain:**
  1. Employee applies. Status: Pending.
  2. Manager approves or rejects. Status: Manager Approved, or Rejected.
  3. HR gives final approval. Status: Approved, or Rejected.
- **Balance check:** HR approval is blocked if the employee has insufficient balance. Approved days are deducted from the balance.
- **Overlap check:** a new request cannot overlap a pending or approved request.
- **Half day** counts as 0.5 days.

### 5.6 Regularization (Missed Punches)

- Employee requests a correction for a missed check-in or check-out, with the date, time, and reason.
- The same two-step chain applies: manager, then HR.
- On final approval, the system records the punch with verification method "Regularized."

### 5.7 Office and Work Mode Setup

- **Offices:** name, latitude, longitude, and radius. Admin can use the current location to fill in coordinates. Multiple offices are supported.
- **Work mode** per employee: Office or WFH, set by admin.
- **Office assignment** per employee.

### 5.8 Admin and Reporting

- **Dashboard** (manager and HR): today's counts for Present, Late, Absent, On Leave, Missing Check-out, and Non-working day. Lists employees not yet checked in and blocked attempts.
- **Reports:** daily, monthly, late-coming, absenteeism, half days, overtime, and leave summary. Filter by date range and employee. Export to CSV.
- **Audit log:** every change to offices, shifts, settings, calendar, leave types, and leave decisions, with who changed it and when. Read-only.

### 5.9 Task Features (existing, unchanged)

Tasks, checklists, comments, reminders, activity log, and the Dashboard, My Tasks, Delegated, and Team screens continue exactly as now.

## 6. Business Rules Summary

1. One accepted check-in and one accepted check-out per employee per working day.
2. No punch on weekends or holidays. No absence on those days.
3. Office punches require the office radius. WFH punches skip the radius check.
4. Check-out is required. Missing check-outs are flagged.
5. Leave and regularization need manager approval, then HR approval.
6. HR approval deducts leave balance and cannot exceed it.
7. Employees see only their own attendance and leave records.
8. No biometric data (fingerprint or face) is ever stored by the app or server — the phone's OS checks it.
9. All time-based rules use Indian Standard Time (Asia/Kolkata).

## 7. Data Model (Summary)

New tables only; existing task tables are unchanged.

- `offices`, `shifts`, `attendance_settings` (one per employee)
- `calendar_days` (holidays and weekends)
- `attendance_punches`, `attendance_attempts`
- `leave_types`, `leave_balances`, `leave_requests`
- `regularization_requests`
- `consents`, `audit_logs`

Business rules are enforced in the database (functions and row-level security), not only in the app.

## 8. User Flows

**Employee daily flow**
1. Sign in. If no check-in today and it is a working day, the Check-In screen appears.
2. Choose verification, verify, and punch. Result shown.
3. Use tasks normally. Check Out before leaving. Missing check-out triggers a reminder after shift end.

**Leave flow**
1. Employee applies in the Leaves screen.
2. Manager sees it in Approvals and approves or rejects.
3. HR sees manager-approved requests and gives final approval or rejection.
4. Employee sees the final status and updated balance.

**Admin onboarding flow**
1. HR or manager adds an employee (name and email). System creates the account and shows the temporary password once.
2. Admin sets office, shift, work mode, and verification default.
3. Employee signs in, changes password, accepts consent, and starts attendance.

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Row-level security on all new tables. No biometric data stored. Service key kept only on the server. |
| Privacy | Location only at punch time (foreground). No biometric data or photo of any kind is captured or stored — verification happens entirely on the employee's phone. Consent recorded. |
| Compliance | Designed for India's Digital Personal Data Protection Act, 2023: consent, purpose, retention limit, data stored in India region. |
| Reliability | Offline punches are saved on the device and sent later. The server keeps the once-per-day rule. |
| Performance | Punch completes in under 5 seconds on a normal 4G connection. Attendance history loads for one month in under 2 seconds. |
| Usability | Mobile-first, large tap targets, works on Android 10 and newer. Follows the existing Tejovex design. |
| Maintainability | Business rules in pure TypeScript functions with unit tests. Migrations versioned in the repository. |

## 10. Assumptions (to confirm)

1. Shift "10:30 to 7:30" means 10:30 AM to 7:30 PM.
2. Grace period is 15 minutes; half-day threshold is 4 hours.
3. Leave Without Pay is capped at 6 days per year (it is not paid leave).
4. The manager-then-HR chain also applies to regularization requests.
5. Any manager can approve any employee's request (no reporting-line mapping in version 1).
6. Geofence radius default is 100 metres; office coordinates are set by admin.
7. Verification is the phone's fingerprint or Face Unlock only (2026-11-05 revision — see Change Notes above; there is no photo-based method, so there is nothing to retain).
8. Office employees must be within the radius; WFH employees are not restricted.

## 11. Open Items (Later Versions)

- WhatsApp or push alerts (missed check-in, missed check-out, leave decisions)
- Reporting-line mapping (employee to specific manager)
- Biometric devices
- Payroll export formats (Tally or other)
- Face-matching against a stored photo (version 1 uses the phone's own biometric check only)
- Mock-location detection on rooted phones
- iOS build

## 12. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| GPS spoofing on rooted phones | False office punches | Server-side radius check; biometric verification; admin review of flagged attempts; mock-location detection later |
| Poor internet at office | Punch failures | Offline queue; server enforces once-per-day |
| Employees forget check-out | Incomplete records | Reminder; Missing Check-out flag; regularization |
| No fingerprint or Face Unlock set up on the phone | Employee cannot punch | App tells the employee to set one up in phone settings; HR can approve a regularization request in the meantime |
| Employee data exposure | Legal and trust risk | Row-level security; consent; no biometric data stored |
| Changes to existing task features | Broken workflows | Strict change scope; regression test of task features |
| Lost signing key for APK | Cannot update installed app | Back up keystore securely |

## 13. Release Plan

1. **Preparation:** Create a test Supabase project. Create the attendance-module branch. Confirm open items.
2. **Build:** Database migration, invite function, employee screens, admin screens.
3. **Test:** Unit tests, database tests on the test project, and the acceptance criteria below on two Android phones (one with biometrics, one without).
4. **Pilot:** Five to ten employees for two weeks, with office and WFH users.
5. **Rollout:** All employees. Apply the migration to the live Supabase project after the pilot.

## 14. Acceptance Criteria

1. An employee who logs in several times in one day is checked only on the first login.
2. An office employee outside the radius is blocked and logged, and can still open tasks.
3. A WFH employee can punch from outside the office; the record shows work mode WFH.
4. Two check-ins on the same day create one accepted record.
5. A missing check-out appears on the admin dashboard.
6. No punch is required and no absence is marked on a weekend or holiday.
7. An employee cannot view another employee's attendance or leave records.
8. Leave flow: employee applies, manager approves, HR approves, and balance is deducted. Manager cannot give final approval.
9. HR cannot approve leave beyond the available balance.
10. Public sign-up is unavailable; only invited accounts can sign in.
11. Employees cannot open attendance admin screens or call approval functions.
12. All existing task features work as before.

## 15. Glossary

- **Check-in / Check-out:** Start and end of a working day, recorded once per day.
- **Geofence:** A circular area around the office (centre point plus radius).
- **WFH:** Work from home. Location recorded, no office radius check.
- **Regularization:** A correction request for a missed punch.
- **RLS (Row-Level Security):** Database rules that limit which rows each user can read or change.
- **Service role key:** A powerful server-side key. Never placed in the app.
- **IST:** Indian Standard Time (Asia/Kolkata).
