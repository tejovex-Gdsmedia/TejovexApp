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

## Selfies

- Selfie retention after 365 days (PRD 6.8) is only half-automatable from
  SQL: `list_expired_selfie_paths()` identifies the paths, but deleting
  storage objects needs the Storage API (service role), not plain SQL. Wiring
  that to `pg_cron` or an external scheduled job is left as a manual step —
  see the deliverables list.
- **Blocked attempts never have an associated selfie to show.** A selfie
  verification failure is caught entirely on the client (camera permission,
  capture failure) before anything is uploaded, so `attendance_attempts` rows
  never reference a selfie path. The PRD's "selfie view using a signed URL"
  for blocked attempts therefore has nothing to view in this design — flagged
  under "could not fully build" in the final report.

## Files touched outside the strict allow-list, and why

The build instructions name a short list of existing files that may be
edited. Three more ended up changed, all load-bearing rather than cosmetic:

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

Left untouched, deliberately: `src/context/AuthContext.tsx` still exports an
unused `signUp()` now that sign-up is gone. It's outside the allow-list and
the unused export doesn't break anything, so it was left rather than edited
out of scope.
