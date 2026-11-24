// Mock data for dashboard widgets that have no backing table yet
// (weekly trend, reminders, time tracker). Everything else on the
// Team screen (stat totals, team member list) reads real data from
// the task store — see app/(app)/(tabs)/team.tsx.

export interface WeeklyBarPoint {
  label: string;
  value: number | null; // null = no data for that day (renders as striped placeholder)
}

export const weeklyCompletionTrend: WeeklyBarPoint[] = [
  { label: "S", value: null },
  { label: "M", value: 62 },
  { label: "T", value: 54 },
  { label: "W", value: 94 },
  { label: "T", value: null },
  { label: "F", value: null },
  { label: "S", value: null },
];

export interface MockReminder {
  title: string;
  timeRange: string;
}

export const mockReminder: MockReminder = {
  title: "Weekly team check-in",
  timeRange: "02:00 pm - 04:00 pm",
};
