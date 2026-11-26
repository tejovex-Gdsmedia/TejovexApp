import { Stack } from "expo-router";
import AttendanceGate from "../../src/attendance/AttendanceGate";

// The tab bar lives in (tabs); "task" and "attendance" screens are siblings
// here so they cover the full screen (no tab bar) instead of being nested
// inside the Tabs navigator, which doesn't reliably switch to a hidden
// tab's stack.
//
// Declaring "home" first here does NOT make it the landing screen on its
// own — Expo Router resolves a newly-visible group to its nearest nested
// index route (here, (tabs)/index, the task Dashboard) regardless of
// <Stack.Screen> order. The actual post-login landing route is the
// explicit router.replace("/(app)/home") in app/_layout.tsx, which is the
// single source of truth for where a signed-in user lands.
export default function AppStackLayout() {
  return (
    <AttendanceGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="profile" />
      </Stack>
    </AttendanceGate>
  );
}
