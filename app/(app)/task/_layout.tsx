import { Stack } from "expo-router";
import { colors } from "../../../src/constants/colors";

const screenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: "700" as const },
};
const detailOptions = { title: "Task" };
const newOptions = { title: "New Task" };
const editOptions = { title: "Edit Task" };

export default function TaskStackLayout() {
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="[id]" options={detailOptions} />
      <Stack.Screen name="new" options={newOptions} />
      <Stack.Screen name="edit/[id]" options={editOptions} />
    </Stack>
  );
}
