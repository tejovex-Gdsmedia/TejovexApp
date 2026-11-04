import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { useTaskStore } from "../src/store/taskStore";
import { setupNotifications, syncReminders } from "../src/utils/notifications";
import { colors } from "../src/constants/colors";

function RootLayoutNav() {
  const { session, profile, loading, signOut } = useAuth();
  // Load the icon font once, up front, so every <Ionicons> instance doesn't
  // independently retry its own download and throw its own uncaught rejection.
  const [fontsReady, fontError] = useFonts(Ionicons.font);

  // Load this user's tasks (and sync reminders) once signed in; clear on sign-out
  useEffect(() => {
    if (!session || !profile) {
      useTaskStore.getState().reset();
      return;
    }

    setupNotifications();
    useTaskStore.getState().fetchTasks();
  }, [session, profile]);

  useEffect(() => {
    syncReminders(useTaskStore.getState().tasks);
    const unsubscribe = useTaskStore.subscribe((state, prev) => {
      if (state.tasks !== prev.tasks) {
        syncReminders(state.tasks);
      }
    });
    return unsubscribe;
  }, []);

  if (loading || (!fontsReady && !fontError)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (session && !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unable to load your profile.</Text>
        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: 20,
  },
  errorText: { fontSize: 15, color: colors.muted, marginBottom: 16 },
  signOutBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  signOutText: { color: colors.white, fontWeight: "700" },
});
