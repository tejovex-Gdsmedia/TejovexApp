import { create } from "zustand";

interface NotificationState {
  readIds: Set<string>;
  markAllRead: (ids: string[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  readIds: new Set<string>(),
  markAllRead: (ids) => set({ readIds: new Set(ids) }),
}));
