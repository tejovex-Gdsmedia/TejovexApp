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