import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTaskStore } from "../store/taskStore";
import { useNotificationStore } from "../store/notificationStore";

export interface NotificationItem {
  id: string;
  type: "task" | "holiday" | "leave";
  title: string;
  body: string;
  timestamp: Date;
}

export function useNotifications() {
  const { profile } = useAuth();
  const tasks = useTaskStore((s) => s.tasks);
  const [holidays, setHolidays] = useState<NotificationItem[]>([]);
  const [leaveUpdates, setLeaveUpdates] = useState<NotificationItem[]>([]);
  const { readIds, markAllRead: markReadInStore } = useNotificationStore();

  // No Date.now() in useMemo — just filter + sort + slice deterministically.
  const taskNotifications = useMemo((): NotificationItem[] => {
    if (!profile) return [];
    return tasks
      .filter((t) => t.assigneeId === profile.id)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10)
      .map((t) => ({
        id: `task-${t.id}`,
        type: "task" as const,
        title: "Task assigned to you",
        body: t.title,
        timestamp: new Date(t.createdAt),
      }));
  }, [tasks, profile]);

  useEffect(() => {
    if (!profile) return;

    // Date.now() calls are fine inside effects (not render phase).
    const fetchHolidays = async () => {
      const today = new Date(Date.now()).toISOString().split("T")[0];
      const twoWeeksLater = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const { data } = await supabase
        .from("calendar_days")
        .select("id, date, label")
        .eq("type", "holiday")
        .gte("date", today)
        .lte("date", twoWeeksLater)
        .order("date");

      if (data) {
        setHolidays(
          (
            data as { id: string; date: string; label: string | null }[]
          ).map((h) => ({
            id: `holiday-${h.id}`,
            type: "holiday" as const,
            title: "Upcoming Holiday",
            body: h.label ?? h.date,
            timestamp: new Date(h.date),
          }))
        );
      }
    };

    const fetchLeaveUpdates = async () => {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data } = await supabase
        .from("leave_requests")
        .select("id, status, from_date, created_at")
        .eq("user_id", profile.id)
        .in("status", ["approved", "rejected", "manager_approved"])
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setLeaveUpdates(
          (
            data as {
              id: string;
              status: string;
              from_date: string;
              created_at: string;
            }[]
          ).map((l) => ({
            id: `leave-${l.id}`,
            type: "leave" as const,
            title:
              l.status === "rejected"
                ? "Leave request rejected"
                : "Leave request approved",
            body: `Leave from ${l.from_date}`,
            timestamp: new Date(l.created_at),
          }))
        );
      }
    };

    fetchHolidays().catch(() => {});
    fetchLeaveUpdates().catch(() => {});
  }, [profile]);

  const allNotifications = useMemo(
    () =>
      [...taskNotifications, ...holidays, ...leaveUpdates].sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      ),
    [taskNotifications, holidays, leaveUpdates]
  );

  const markAllRead = () => {
    markReadInStore(allNotifications.map((n) => n.id));
  };

  const unreadCount = allNotifications.filter((n) => !readIds.has(n.id)).length;

  return {
    notifications: allNotifications,
    count: unreadCount,
    markAllRead,
  };
}
