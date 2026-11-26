# CLAUDE.md — TaskManager (Tejovex)

@PROGRESS.md

## What the app is
Tejovex TaskManager — an internal mobile app for a company to manage tasks and employee attendance.
- **Roles:** manager (create/delegate tasks, approve leaves) and employee (receive tasks, punch in/out)
- **Platforms:** Android (primary), iOS, Web

## Tech stack
| Package | Version |
|---|---|
| expo | ~58.0.26 |
| expo-router | ~58.0.32 |
| react-native | 0.88.1 |
| react | 19.3.0 |
| typescript | ~6.0.3 |
| @supabase/supabase-js | ^2.118.0 |
| zustand | ^5.0.16 |
| expo-local-authentication | ~58.0.3 |
| expo-location | ~58.0.22 |

## Folder structure
```
app/                   Expo Router routes (file = screen)
  (auth)/              sign-in, sign-up
  (app)/
    (tabs)/            bottom-tab screens: index, my-tasks, delegated, team, more
    home.tsx           home dashboard (grid cards)
    attendance/        check-in, check-out + admin sub-screens
    task/[id].tsx      task detail / edit
src/
  attendance/          API, components, hooks, offlineQueue, rules, types
  components/          TaskCard, TaskForm, StatCard, StatusTabs
    ui/                AppDialog, PremiumButton, PremiumInput
  constants/           colors.ts (all color tokens)
  store/               taskStore.ts (Zustand)
  lib/                 supabase.ts
supabase/              schema.sql, attendance.sql, functions/
```

## Run / build / deploy
```bash
bunx expo start              # dev server
bunx expo start --android    # on Android device/emulator
bunx expo lint               # lint
npx tsc --noEmit             # typecheck
bunx eas-cli build -p android --profile preview     # preview APK
bunx eas-cli build -p android --profile production  # release AAB
```
> Always use `bunx` (bun.lock present). Always use `npx expo install` to add packages.

## Environment variables (`.env` — no values in source)
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Supabase tables (see `supabase/schema.sql`, `supabase/attendance.sql`)
| Table | Stores |
|---|---|
| `profiles` | One row per auth user: full_name, role (manager/employee/hr) |
| `tasks` | Tasks: title, priority, status, due_date, category, assignee_id |
| `checklist_items` | Ordered checklist items belonging to a task |
| `task_subscribers` | Join table: users following a task without being assigned |
| `comments` | Text comments on tasks |
| `task_activity` | Immutable audit log written by DB triggers only |
| `offices` | Office locations with lat/lng and check-in radius |
| `shifts` | Work shifts with start/end time and grace period |
| `attendance_settings` | Per-employee config: office, shift, work_mode, biometric method |
| `attendance_punches` | One row per employee per day: check-in/out times, coords, method |
| `leave_requests` / `leave_balances` | Leave management (attendance.sql) |
| `regularization_requests` | Missed-punch correction requests (attendance.sql) |

## Manager vs employee permissions
- **UI gates** — `isManager` check in `(tabs)/_layout.tsx` hides Delegated/Team tabs; in `my-tasks.tsx` hides FAB and employee filter; in `task/[id].tsx` hides edit/delete controls; `isAttendanceAdmin` (manager or hr) gates admin attendance card on home
- **Database layer** — RLS policies in `schema.sql` block employee INSERT/DELETE on tasks; `enforce_task_update()` trigger prevents employees from changing anything except status

## Data flows
**Tasks:** `fetchTasks()` in `src/store/taskStore.ts` deep-selects tasks + assignee + subscribers + checklist from Supabase into Zustand. `setStatus()` writes directly to Supabase then re-fetches to sync local state.

**Attendance:** Check-in calls the `record_punch` Supabase RPC with GPS coords and biometric confirmation; the RPC validates against the assigned office radius and shift rules server-side. If offline, the punch is queued in `src/attendance/offlineQueue.ts` (AsyncStorage) and replayed on reconnect.

## Coding conventions
- All colors from `src/constants/colors.ts` — never hardcode hex values
- All dialogs via `AppDialog` (`src/components/ui/AppDialog.tsx`) — never `Alert.alert`
- All screens wrapped in `<Screen>` from `src/components/layout/Screen.tsx`
- Routes live in `app/` only; components, hooks, utils stay in `src/`
- `StyleSheet.create` for every style block
- No `ios/` or `android/` dirs — Continuous Native Generation via `app.json`

## Rules
1. Only open the files you actually need — don't read the whole tree.
2. Tell the user which files you plan to edit before editing them.
3. Update `PROGRESS.md` after completing any feature or fixing a notable bug.
4. Never paste long terminal output into the chat — summarise errors in one sentence.
