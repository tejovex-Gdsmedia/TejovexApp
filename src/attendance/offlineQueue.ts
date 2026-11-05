// Offline queue for punches (PRD 9: "Offline punches are saved on the
// device and sent later. The server keeps the once-per-day rule.").
// Safe to retry blindly: record_punch() is idempotent per day — a retried
// check-in that already succeeded just comes back as "already_checked_in".

import AsyncStorage from "@react-native-async-storage/async-storage";
import { recordPunch } from "./api";
import { PunchType } from "./types";

const STORAGE_KEY = "attendance:punch-queue";

export interface QueuedPunch {
  id: string;
  type: PunchType;
  lat: number | null;
  lng: number | null;
  method: "biometric";
  queuedAt: string;
}

export async function getQueuedPunches(): Promise<QueuedPunch[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as QueuedPunch[]) : [];
}

async function saveQueue(queue: QueuedPunch[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function queuePunch(entry: Omit<QueuedPunch, "id" | "queuedAt">): Promise<void> {
  const queue = await getQueuedPunches();
  queue.push({ ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, queuedAt: new Date().toISOString() });
  await saveQueue(queue);
}

/** Attempts to send every queued punch. Entries that succeed (or are now
 *  moot, e.g. already recorded) are removed; entries that fail again stay
 *  queued for the next retry. Returns how many were cleared. */
export async function flushPunchQueue(): Promise<number> {
  const queue = await getQueuedPunches();
  if (queue.length === 0) return 0;

  const remaining: QueuedPunch[] = [];
  let cleared = 0;

  for (const entry of queue) {
    try {
      const result = await recordPunch({
        type: entry.type,
        lat: entry.lat,
        lng: entry.lng,
        method: entry.method,
      });
      // Any server response (accept or a business-rule rejection like
      // already_checked_in) means the server has decided — drop it from
      // the queue either way. Only a network/transport failure keeps it.
      if (result) {
        cleared += 1;
        continue;
      }
      remaining.push(entry);
    } catch {
      remaining.push(entry);
    }
  }

  await saveQueue(remaining);
  return cleared;
}
