import { Redirect } from "expo-router";

// Anchor route for the (auth) group so "/" resolves somewhere concrete
// while only this group is active.
export default function AuthIndex() {
  return <Redirect href="/(auth)/sign-in" />;
}
