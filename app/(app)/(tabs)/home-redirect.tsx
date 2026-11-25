import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function HomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/(app)/home");
  }, [router]);
  return null;
}
