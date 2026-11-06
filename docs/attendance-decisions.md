# Attendance Module — Decisions Log

Recorded while building the Attendance Module per `docs/PRD-Attendance-Module.md`,
without stopping to ask (per the build instructions). PRD section 10 assumptions
(1–8) were accepted as given and are not repeated here except where a further
decision was needed on top of them.

## Scope and routing

- Routes live in `app/` (not `src/app/`), per the build instructions overriding
  AGENTS.md's default for this project.
- **Consent** and **Change Password** are not separate routed screens. They are
  components (`src/attendance/components/ConsentScreen.tsx`,
  `ChangePasswordScreen.tsx`) rendered inside `AttendanceGate`'s modals, since
  the PRD only reaches them through the gate flow, never a menu link.
- **Leave Approvals** and **Regularization Approvals** (PRD 5.8) are one screen
  (`admin/approvals.tsx`) with a tab switch, since both are the same
  manager/HR two-step approval UI over a different request type.
- The Attendance Admin dashboard, Leave Approvals, and the other admin screens
  are hidden from the More menu for employees (PRD requirement), **and** gated
  again on screen entry via `useRequireAttendanceAdmin` (PRD 5.8's explicit
  "block direct navigation for employees"), since a hidden menu item doesn't
  stop a deep link or a typed URL.

## Business rules

- Half-day leave is a flat **0.5 days**, regardless of the request's date span.
  The PRD's "half day (optional)" field reads as a single-day toggle in the
  apply flow, not a per-day fraction across a multi-day range.
- `attendance_status_for()` in SQL and `dayStatus()` in `rules.ts`
  (`src/attendance/rules.ts`) implement the exact same branch order from PRD
  5.4. They are two implementations of one rule table, kept in sync by hand —
  there is no shared code between the database and the app for this.
- The employee's own **Attendance** history list only shows days that already
  have a punch row (it doesn't synthesize "Absent" rows for days with no
  punch). Full calendar enumeration — including absent days — is done once,
  in the **admin Reports** CSV export, where it's actually required for
  payroll-ready data; duplicating that in the personal history view wasn't
  worth the extra DB round-trips for what is a secondary view.
- Office and shift data (name, coordinates, timings) is readable by every
  signed-in user, not just admins — consistent with this app's existing
  `profiles readable ... using (true)` pattern for non-sensitive reference
  data. The office radius check itself always happens server-side inside
  `record_punch()`, regardless of what the client can see.

## Accounts and roles

- Role changes stay **database-only** (PRD 4: "Role changes are made only in
  the database by the system owner"). The Employees admin screen lets HR edit
  work mode, office, and shift, but never role. The invite flow lets HR choose
  the **initial** role for a new account only (at creation time), which is not
  the same as changing an existing user's role later.
- `must_change_password` is read straight from the Supabase Auth session's
  `user_metadata` (set by `invite-employee`) — no new database column.
  `AttendanceGate` already has the session object via `AuthContext`.

## 2026-11-05: Home chooser replaces forced attendance on sign-in

**Reason: the user chose a home screen with two options** (Attendance, Tasks)
over the PRD's original "attendance forced on first login" design.

- The PRD said attendance is forced on the first login of the day (5.2:
  "Check-in on the first login of the day"). This is changed: `app/(app)/home.tsx`
  is now always the first screen after sign-in/cold start (via
  `initialRouteName="home"` on the `(app)` Stack). Nothing about attendance is
  forced there — the Attendance card just reads "Not marked today" (or the
  real check-in/check-out time, or "Non-working day") as a plain reminder,
  same as the Tasks card reads an open-task count.
- `AttendanceGate` (wraps the whole `(app)` stack) is narrowed to only the
  forced password-change modal (PRD 5.1), which is an account-level gate, not
  an attendance one. It no longer auto-checks consent or shows a check-in
  prompt on every sign-in.
- **Consent is still shown once before any attendance action** (PRD 5.1,
  unchanged) — but it's now checked by a new, narrower
  `AttendanceConsentGate`, wrapping only `app/(app)/attendance/_layout.tsx`.
  It fires the first time someone actually enters the attendance screens,
  not on every sign-in regardless of whether they touch attendance.
- `src/attendance/components/CheckInPrompt.tsx` (the old forced reminder
  modal) is deleted — nothing renders it anymore.

## 2026-11-05: Selfie removed as a verification method

**Reason: user-requested change.** Verification is now the phone's own
fingerprint or Face Unlock only, through `expo-local-authentication`. No
photo is captured, uploaded, or stored anywhere. Adaptations made to fit the
actual schema and code (the request described a slightly different shape
than what existed):

- The request referred to a single `attendance_punches.verification_method`
  column; this schema instead has separate `check_in_method` and
  `check_out_method` text columns (one per punch side). The same constraint
  — only `'biometric'` or `'regularized'` — was added to both.
- `attendance_settings.verification_method` keeps its column and default
  (now `'biometric'`), even though a `check (verification_method in
  ('biometric'))` constraint makes it a single-value column going forward.
  Kept rather than dropped since the request specified changing the
  constraint, not removing the column.
- `record_punch()`'s first parameter is renamed `p_type` → `p_punch_type`, to
  match the parameter list given in the request exactly. Every call site
  (`src/attendance/api.ts`, `supabase/attendance_tests.sql`) was updated to
  match. `log_attendance_attempt()`'s own `p_type` parameter is unrelated and
  was left as-is.
- `record_punch()` now rejects any `p_method` other than `'biometric'` with
  `{ok:false, reason:'invalid_method'}` — never a raised exception, same
  pattern as every other rejection in that function.
- `check_in_selfie_path` / `check_out_selfie_path` columns, the `selfies`
  storage bucket and its three policies, and `list_expired_selfie_paths()`
  are all removed from `supabase/attendance.sql`. None of this ever ran
  against a real database, so there is no data migration concern.
- `updateMyVerificationMethod()` and the verification-method switch UI are
  removed outright (not just the selfie option) — with only one possible
  value, there is nothing left to choose or persist from the employee's
  side.
- **No selfie-review admin screen existed to remove.** The original build
  already noted that blocked attempts never had an associated selfie to
  show (a verification failure is caught before any photo would be
  captured), so there was nothing to delete there beyond a label string
  ("Biometric/selfie verification failed" → "Biometric verification
  failed").
- `expo-camera` and `expo-image-manipulator` are uninstalled (`npm uninstall`
  — `npx expo uninstall` isn't a valid command in this SDK/CLI). `expo-location`,
  `expo-local-authentication`, `expo-sharing`, and `expo-file-system` are kept.

## Allow-list additions

The build instructions named a short list of existing files that may be
edited. Four more ended up changed, all load-bearing rather than cosmetic.
Flagged in the build report and approved on 2026-11-05 — added here to the
allow-list, with the reason for each:

- **`app/(auth)/_layout.tsx`** — dropped the `<Stack.Screen name="sign-up" />`
  entry. Required the moment `sign-up.tsx` was deleted; an Expo Router
  `Stack.Screen` pointing at a route that no longer exists is a config error,
  not a style choice.
- **`tsconfig.json`** — added `supabase/functions` to `exclude`. The Deno edge
  function (`npm:` specifiers, `Deno.serve`) isn't part of the Expo/RN
  TypeScript project; without the exclude, `npx tsc --noEmit` fails on code
  that was never meant to run in that environment.
- **`eslint.config.js`** — added `supabase/functions/**` to `ignores`, for the
  same reason, so `npx expo lint` doesn't try to lint Deno code against RN
  rules.
- **`package-lock.json`** — the automatic lockfile side-effect of
  `npx expo install` (new native packages) and `npx expo install --fix`
  (version alignment for `expo-doctor`). Never hand-edited; regenerated by
  npm from the `package.json` changes already on the original allow-list.

Left untouched, deliberately: `src/context/AuthContext.tsx` still exports an
unused `signUp()` now that sign-up is gone. It's outside the allow-list and
the unused export doesn't break anything, so it was left rather than edited
out of scope.

## 2026-11-06: Sign-up restored to self sign-up

**Reason: the user asked for it back** — `app/(auth)/sign-up.tsx`,
`app/(auth)/sign-in.tsx`'s "Don't have an account? Sign up" link, and
`app/(auth)/_layout.tsx`'s `sign-up` screen entry are restored verbatim
from `master` (`git show master:<path>`), per instruction, with no design
changes. `src/context/AuthContext.tsx`'s `signUp()` — left unused in the
2026-11-05 entry above — is live again, unedited. New accounts still land
as `employee` via the existing `handle_new_user()` trigger in
`supabase/schema.sql`; no approval step was added. The `account_requests`
idea named in the request was never built in this codebase, so there was
nothing to remove.

## 2026-11-06: Home chooser keeps its "not forced" design; the check-in
## reminder is now an inline banner, not a modal

**Reason: the request kept "attendance is not forced" from 2026-11-05, but
asked for the PRD 5.2 check-in reminder to come back without blocking the
chooser.** Rather than reintroduce the deleted `CheckInPrompt` modal (which
visually covered the whole screen before its Skip button could be used),
`app/(app)/home.tsx` now renders the reminder as a dismissible banner
*inside* the chooser — above the two cards, never on top of them — shown
only when it's a working day and the employee hasn't checked in yet, with
a "Check In" action and a dismiss (×) that just hides it for that visit.
`AttendanceGate` is unchanged (still just the forced password-change
modal); this banner lives entirely in `home.tsx`.

## 2026-11-06: Attendance screen rebuilt as one screen with five tabs

**Reason: requested restructure ("a top segmented control: Today | History
| Regularize | Leaves | Holidays").** `app/(app)/attendance/leaves.tsx` and
`holidays.tsx` are deleted; their content, plus Today and Regularize (both
previously folded into `index.tsx`), are now five tab components under
`src/attendance/components/` (`TodayTab`, `HistoryTab`, `RegularizeTab`,
`LeavesTab`, `HolidaysTab`), switched by a segmented control in
`app/(app)/attendance/index.tsx`. `attendance/_layout.tsx` drops the
`leaves`/`holidays` `Stack.Screen` entries accordingly.

- **History now enumerates every day in range**, not just days with a
  punch row — reversing the 2026-11-05 decision to only show existing
  punches. The request explicitly asked for Absent/Holiday/Weekend rows
  to appear too, which needs the full calendar walked day-by-day
  (`enumerateDates()` in `HistoryTab.tsx`), each day classified with the
  same `dayStatus()` used everywhere else. Future dates within a selected
  range are clamped to today, so an in-progress "This Month" range never
  shows unstarted days as "Absent".
- **Holidays groups by month** for the current year (`HolidaysTab.tsx`),
  per the explicit ask; it was a flat list before.
- Both `home.tsx` and the new `attendance/index.tsx` now call
  `attendance.refresh()` on `useFocusEffect` (re-exported from
  `expo-router`), so returning from Check-In/Check-Out shows the just-
  recorded punch immediately instead of the stale pre-navigation state —
  a real gap in the previous design, fixed as part of this rebuild rather
  than filed separately.

## 2026-11-06: Verification UI shows two buttons, not one

**Reason: explicit UI spec** ("two large buttons with icons: Face Unlock
... and Fingerprint"), a reversal of the 2026-11-05 single-button design.
`check-in.tsx`/`check-out.tsx` now read
`getBiometricAvailability().supportsFace` /`.supportsFingerprint` (already
existed in `verification.ts`, unused until now) and render a button per
supported type — both call the exact same `authenticateBiometric()`, since
`expo-local-authentication` has no way to force one sensor over the other;
the screen says so under the buttons ("Your phone chooses the sensor that
is available."). The no-hardware/no-enrollment message is unchanged.

## 2026-11-06: Admin changes — active flag, attempt distance, manager calendar access

- **`attendance_settings.is_active`** (new column, default `true`) backs
  the Employees screen's "active flag" requirement. It's HR-only to
  change, added to the same trigger (`enforce_attendance_settings_update`)
  that already protected office/shift/work_mode — an employee cannot
  deactivate themselves.
- **`attendance_attempts.distance_meters`** (new column) is populated only
  for `outside_radius` rejections (the only case `record_punch()` already
  computes a distance for); `log_attendance_attempt()` gained an optional
  5th parameter to carry it through. The Attempts admin screen shows it
  as "`<n>`m away" when present.
- **Calendar is now writable by managers, not just HR** — the one setup
  table where the request explicitly said "HR and manager only"; every
  other setup table (offices, shifts, leave types) stays HR-only, matching
  the original design and the Employees/role-gating pattern elsewhere.
- None of this has run against any database — `supabase/attendance.sql`
  and `supabase/attendance_tests.sql` are updated together, with a new
  test (manager calendar write) and the existing outside-radius test now
  also asserting a distance was recorded.

## 2026-11-06: Reports screen gained an in-app Daily/Monthly preview

**Reason: Part 5 asked for "daily and monthly views," and the existing
screen only ever produced a CSV — there was no in-app view at all.** The
screen now fetches and classifies the selected range once, shows it either
as a per-day list or (toggled) aggregated per-employee status counts, and
exports exactly what's on screen. This is new functionality, not a
reskin — flagged here rather than left silently assumed.

## 2026-11-06: Visual pass — 20px cards, empty/error states, Retry

Applied PRD Part 6 as a sweep across every attendance screen reachable by
employees or admins: `src/attendance/components/StateViews.tsx` is a new
`EmptyState`/`ErrorState` pair (icon + message, and icon + message + Retry
button) used everywhere a list can legitimately be empty or a fetch can
fail — neither existed before this pass; most screens had a spinner and
nothing else. Card-style `borderRadius` values were normalized to 20px
(previously a mix of 14–24px) across the attendance and admin screens.
Not reworked: `app/(app)/(tabs)/more.tsx` and other core task-manager
screens are outside the attendance module's allow-list and were left as
they were.

**A recurring lint constraint shaped several of these functions:** this
project's `react-hooks/set-state-in-effect` rule (from `eslint-plugin-
react-hooks`'s React Compiler rules) only accepts a narrow shape for a
function called from `useEffect` — `try { await …; setX(...); } finally {
setY(...); }`, with any error handling done via `.catch()` at the
*call site*, not an internal `catch` block, and no synchronous `setState`
before the first `await`. Every `load()` in this pass follows that shape;
it's why none of them call `setLoading(true)` more than once (on first
mount only) even where re-fetching would ideally show a spinner again.

## 2026-11-06: PRD section 8 (User Flows) not updated — out of the given list

Part 7 named exactly which PRD sections to edit (3, 4, 5.1, 5.2, 6, 7, 9,
10, 11, 12, 14); section 8's "Employee daily flow" and "Admin onboarding
flow" narratives still describe the pre-2026-11-05 forced-check-in-on-
login, single-method flow and were left as-is rather than silently
touched outside that list. They're stale against the current behavior —
flagged here, and again in the build report's "not done" list, rather
than fixed without being asked.

PRD 14's criterion 10 (as given: "Employees see no tasks or attendance
until assigned") isn't fully true of this implementation either: a new
profile's `attendance_settings` row is auto-provisioned with office-mode
defaults and the seeded "General" shift the moment the account is
created (`provision_attendance_settings()` trigger), so a self-signed-up
employee can attempt to punch immediately — it just has no real office
assigned yet, so an office-mode punch would fail on distance until HR
configures one. Changing the trigger to leave new employees fully
unconfigured until HR/a manager assigns them was judged a larger behavior
change than this wording asked for, so the criterion is marked
not-fully-met rather than reworking the provisioning trigger unasked.
