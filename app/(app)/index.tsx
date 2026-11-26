import { Redirect } from "expo-router";

// When the (app) group is first revealed by Stack.Protected, Expo Router
// resolves to the nearest index route. Without this file it goes deeper and
// finds (tabs)/index (task Dashboard), which flashes for one frame before
// the router.replace("/(app)/home") effect in app/_layout.tsx fires.
// Having this index here intercepts that resolution and redirects immediately,
// so the user sees nothing between the sign-in screen and home.
export default function AppIndex() {
  return <Redirect href="/(app)/home" />;
}
