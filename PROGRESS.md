# PROGRESS.md — TaskManager (Tejovex)

_Last updated: 2026-11-26_

---

## Current state
App is functional and in active development. Auth, task management, and the full attendance module (check-in/out, leaves, regularization, admin dashboards) are all working. The UI has been polished: custom dialogs everywhere, eye toggle on password fields, priority dropdown in My Tasks.

---

## Completed features

### Auth
- Sign-in / Sign-up (`app/(auth)/sign-in.tsx`, `sign-up.tsx`)
- Email confirmation flow on sign-up
- Biometric (fingerprint/Face ID) login via `expo-local-authentication`
- Post-login flash fixed: `app/(app)/index.tsx` redirects to home; loading state covers profile fetch

### Home & navigation
- Home dashboard with 2-column grid cards (`app/(app)/home.tsx`)
- TopBar with Tejovex logo, notification bell, and avatar (`src/components/layout/Screen.tsx`)
- Avatar navigates to profile screen (`app/(app)/profile.tsx`)
- Floating bottom tab bar; Home tab button navigates to home outside the tab group

### Tasks
- My Tasks with search, date-range chips, priority dropdown, category and assignee filters (`app/(app)/(tabs)/my-tasks.tsx`)
- Delegated tasks tab (manager only)
- Team view tab (manager only)
- Task detail / edit / delete (`app/(app)/task/[id].tsx`)
- Create task (manager only) — `/task/new`
- Status tabs: Overdue / Pending / In Progress / Complete
- Zustand store (`src/store/taskStore.ts`) synced with Supabase

### Attendance
- Check-in with GPS verification and biometric consent (`app/(app)/attendance/check-in.tsx`)
- Check-out (`app/(app)/attendance/check-out.tsx`)
- Offline punch queue (`src/attendance/offlineQueue.ts`)
- Employee: Leaves tab, Regularize tab, Change Password tab
- Admin: Approvals, Calendar, Employees, Offices, Shifts, Reports, Leave Types, Blocked Attempts

### UI polish
- Custom `AppDialog` replaces all native `Alert.alert` calls across the codebase
- `PremiumInput` has eye toggle for password fields
- Priority filter is a single dropdown (not 3 chips)
- `Screen` wrapper with optional watermark background

---

## In progress
- Nothing currently active

---

## Recently completed

### Push notifications (2026-11-26)
- `src/utils/notifications.ts` — added `registerPushToken()` (saves Expo Push Token to `profiles.push_token` after permission granted) and `sendPushToUser()` (calls the `send-push` Edge Function)
- `supabase/functions/send-push/index.ts` — new Edge Function that looks up a user's push token and calls Expo's push API
- `supabase/migrations/add_push_token_to_profiles.sql` — adds `push_token` column to `profiles`
- `src/context/AuthContext.tsx` — calls `setupNotifications` + `registerPushToken` after every sign-in
- `src/store/taskStore.ts` — sends push to assignee on `createTask` and `updateTask` (reassign)
- `app/(app)/attendance/admin/approvals.tsx` — sends push to employee on leave approve/reject
- **Requires preview build to test** (Expo Go on Android skips notifications by design)

---

## Planned features
- Push notifications for task assignments and leave approvals (hook exists in `src/hooks/useNotifications.ts`, backend functions in `supabase/functions/`)
- Dark mode support
- CSV export for attendance reports
- Task comments notifications

---

## Known bugs
- `app/(app)/attendance/admin/approvals.tsx` has a pre-existing `set-state-in-effect` lint error
- `src/utils/notifications.ts` has a pre-existing `AndroidImportance` import error (enum moved in SDK 58)
- Biometric login uses the phone owner's fingerprint, so any enrolled fingerprint on the device can log in as any user — no per-user biometric binding (by design; noted in `docs/attendance-decisions.md`)

---

## Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-11 | Use `AppDialog` everywhere instead of `Alert.alert` | Native grey system dialogs look inconsistent with app theme |
| 2026-11 | Priority filter as dropdown, not 3 chips | Saves horizontal space; more scalable if priorities change |
| 2026-11 | Fixed `paddingTop: 158` for priority dropdown | `measureInWindow` via `useRef<View>` is incompatible with RN 0.88.1 / React 19 |
| 2026-11 | `app/(app)/index.tsx` redirects to home | Prevents Expo Router from rendering the tab index on cold launch |
| 2026-11 | `setLoading(true)` at top of `onAuthStateChange` | Hides "unable to load profile" flash during async profile fetch |
| 2026-11 | Continuous Native Generation (no `ios/` / `android/`) | Simplifies CI; native config lives in `app.json` and config plugins |
