import { View, Text, Pressable, StyleSheet } from "react-native";
import { Task, Status, dueState } from "../types/task";
import { relativeTime } from "../utils/dates";
import { colors } from "../constants/colors";

const statusLabel: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In progress",
  complete: "Complete",
};

interface TaskCardProps {
  task: Task;
  onPress: () => void;
  onSetStatus?: (status: Status) => void;
  canChangeStatus?: boolean;
  showAssignee?: boolean;
}

export default function TaskCard({
  task,
  onPress,
  onSetStatus,
  canChangeStatus = false,
  showAssignee = false,
}: TaskCardProps) {
  const overdue = dueState(task) === "overdue";
  const checklistTotal = task.checklist.length;
  const checklistDone = task.checklist.filter((c) => c.isDone).length;
  const progress = checklistTotal === 0 ? 0 : checklistDone / checklistTotal;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open task T-${task.taskNumber}, ${task.title}`}
      >
        <View style={styles.topRow}>
          <Text style={styles.taskNumber}>T-{task.taskNumber}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <Text style={[styles.time, overdue && styles.timeOverdue]}>
            {overdue ? "Overdue • " : ""}
            {relativeTime(task.createdAt)}
          </Text>
        </View>

        {showAssignee && task.assigneeName ? (
          <Text style={styles.assignee}>Assigned to {task.assigneeName}</Text>
        ) : null}

        <View style={styles.infoRow}>
          {checklistTotal > 0 ? (
            <View
              style={styles.checklistRow}
              accessibilityLabel={`${checklistDone} of ${checklistTotal} done`}
            >
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.checklistText}>
                {checklistDone}/{checklistTotal}
              </Text>
            </View>
          ) : (
            <View
              style={[styles.statusDot, { backgroundColor: colors.status[task.status] }]}
            />
          )}
          <Text style={styles.statusText}>{statusLabel[task.status]}</Text>
        </View>
      </Pressable>

      {canChangeStatus && onSetStatus ? (
        <View style={styles.actions}>
          {task.status !== "in_progress" && (
            <Pressable
              style={styles.actionBtn}
              onPress={() => onSetStatus("in_progress")}
              accessibilityRole="button"
              accessibilityLabel={`Mark T-${task.taskNumber} as in progress`}
              hitSlop={8}
            >
              <Text style={styles.actionText}>In Progress</Text>
            </Pressable>
          )}
          {task.status !== "complete" && (
            <Pressable
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => onSetStatus("complete")}
              accessibilityRole="button"
              accessibilityLabel={`Mark T-${task.taskNumber} as complete`}
              hitSlop={8}
            >
              <Text style={[styles.actionText, styles.completeText]}>Complete</Text>
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  taskNumber: { fontSize: 12, fontWeight: "700", color: colors.primary },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  time: { fontSize: 12, color: colors.muted },
  timeOverdue: { color: colors.danger, fontWeight: "700" },
  assignee: { fontSize: 12, color: colors.muted, marginTop: 4 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 70 },
  progressTrack: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: { height: 6, backgroundColor: colors.primary },
  checklistText: { fontSize: 12, color: colors.muted },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 12, color: colors.muted, flex: 1 },
  actions: { flexDirection: "row", gap: 6, marginTop: 10 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.backgroundAlt,
  },
  completeBtn: { backgroundColor: colors.status.complete },
  actionText: { fontSize: 12, fontWeight: "600", color: colors.text },
  completeText: { color: colors.white },
});
