import { Stack } from "expo-router";
import AttendanceGate from "../../src/attendance/AttendanceGate";

// The tab bar lives in (tabs); "task" and "attendance" screens are siblings
// here so they cover the full screen (no tab bar) instead of being nested
// inside the Tabs navigator, which doesn't reliably switch to a hidden
// tab's stack. "home" is the chooser shown first after sign-in/cold start —
// Expo Router's Stack uses the first-declared screen as the initial route
// (it doesn't accept an initialRouteName prop), so declaring "home" first
// is all that's needed; no extra navigation call on the sign-in screen.
export default function AppStackLayout() {
  return (
    <AttendanceGate>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task" />
        <Stack.Screen name="attendance" />
      </Stack>
    </AttendanceGate>
  );
}
