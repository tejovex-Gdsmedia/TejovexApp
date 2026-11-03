import { Stack } from "expo-router";

// The tab bar lives in (tabs); "task" screens are siblings here so they
// cover the full screen (no tab bar) instead of being nested inside the
// Tabs navigator, which doesn't reliably switch to a hidden tab's stack.
export default function AppStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task" />
    </Stack>
  );
}
