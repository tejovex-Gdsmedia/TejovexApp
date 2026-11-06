import { Stack } from "expo-router";
import AttendanceConsentGate from "../../../src/attendance/AttendanceConsentGate";

export default function AttendanceStackLayout() {
  return (
    <AttendanceConsentGate>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: "Attendance" }} />
        <Stack.Screen name="check-in" options={{ title: "Check In" }} />
        <Stack.Screen name="check-out" options={{ title: "Check Out" }} />
        <Stack.Screen name="admin/index" options={{ title: "Attendance Dashboard" }} />
        <Stack.Screen name="admin/approvals" options={{ title: "Approvals" }} />
        <Stack.Screen name="admin/employees" options={{ title: "Employees" }} />
        <Stack.Screen name="admin/offices" options={{ title: "Offices" }} />
        <Stack.Screen name="admin/shifts" options={{ title: "Shifts" }} />
        <Stack.Screen name="admin/calendar" options={{ title: "Calendar" }} />
        <Stack.Screen name="admin/leave-types" options={{ title: "Leave Types" }} />
        <Stack.Screen name="admin/reports" options={{ title: "Reports" }} />
        <Stack.Screen name="admin/blocked-attempts" options={{ title: "Blocked Attempts" }} />
        <Stack.Screen name="admin/audit-log" options={{ title: "Audit Log" }} />
      </Stack>
    </AttendanceConsentGate>
  );
}
