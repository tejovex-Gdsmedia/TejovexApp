import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { Task } from "../types/task";

const CHANNEL_ID = "due-reminders";

// Expo Go on Android crashes when notifications are set up, so skip it there
const isExpoGoAndroid =
  Platform.OS === "android" &&
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const notificationsSupported = Platform.OS !== "web" && !isExpoGoAndroid;

// Show reminders as banners even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Ask for permission and set up the Android channel. Returns true if allowed.
export async function setupNotifications(): Promise<boolean> {
  if (!notificationsSupported) return false;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Due reminders",
        importance: AndroidImportance.DEFAULT,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    return status === "granted";
  } catch (error) {
    console.warn("Notification setup failed:", error);
    return false;
  }
}

// Get the Expo push token for this device and save it to the user's profile row.
export async function registerPushToken(): Promise<void> {
  if (!notificationsSupported) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return;

    const { data: tokenData } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData;

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;

    await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
  } catch (error) {
    console.warn("Failed to register push token:", error);
  }
}

// Debug: runs each step individually and returns a human-readable report.
export async function debugPushToken(): Promise<string> {
  const lines: string[] = [];

  lines.push(`Platform: ${Platform.OS}`);
  lines.push(`notificationsSupported: ${notificationsSupported}`);
  lines.push(`executionEnvironment: ${Constants.executionEnvironment}`);

  if (!notificationsSupported) {
    lines.push("STOP: notificationsSupported is false");
    return lines.join("\n");
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    lines.push(`Permission status: ${existingStatus}`);

    let status = existingStatus;
    if (status !== "granted") {
      const result = await Notifications.requestPermissionsAsync();
      status = result.status;
      lines.push(`After request: ${status}`);
    }

    if (status !== "granted") {
      lines.push("STOP: permission not granted");
      return lines.join("\n");
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    lines.push(`projectId: ${projectId ?? "MISSING"}`);

    if (!projectId) {
      lines.push("STOP: no projectId in Constants");
      return lines.join("\n");
    }

    let token: string;
    try {
      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      token = data;
      lines.push(`Token: ${token}`);
    } catch (e) {
      lines.push(`getExpoPushTokenAsync ERROR: ${e instanceof Error ? e.message : String(e)}`);
      return lines.join("\n");
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    lines.push(`userId: ${userId ?? "MISSING"}`);
    if (userError) lines.push(`user error: ${userError.message}`);

    if (!userId) {
      lines.push("STOP: no userId");
      return lines.join("\n");
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);

    if (updateError) {
      lines.push(`Supabase update ERROR: ${updateError.message}`);
    } else {
      lines.push("SUCCESS: token saved to Supabase");
    }
  } catch (e) {
    lines.push(`Unexpected error: ${e instanceof Error ? e.message : String(e)}`);
  }

  return lines.join("\n");
}

// Send a push notification to a user by their user id (looks up their token).
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.functions.invoke("send-push", {
      body: { userId, title, body, data },
    });
  } catch (error) {
    console.warn("Failed to send push notification:", error);
  }
}

// Replace all scheduled reminders with one per mobile reminder on an open,
// visible task. The task list is already filtered by RLS to what the
// current user can see, so nothing further to check here.
export async function syncReminders(tasks: Task[]) {
  if (!notificationsSupported) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const task of tasks) {
      if (!task.dueDate || task.status === "complete") continue;

      for (const reminder of task.reminders) {
        if (reminder.channel !== "mobile") continue;

        const fireAt = new Date(
          new Date(task.dueDate).getTime() - reminder.offsetMinutes * 60_000
        );

        // Skip reminders whose time has already passed
        if (fireAt.getTime() <= Date.now()) continue;

        await Notifications.scheduleNotificationAsync({
          identifier: `${task.id}:${reminder.id}`,
          content: {
            title: "Task reminder",
            body: task.title,
            data: { taskId: task.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: CHANNEL_ID,
          },
        });
      }
    }
  } catch (error) {
    console.warn("Failed to sync reminders:", error);
  }
}