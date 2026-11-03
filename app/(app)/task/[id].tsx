import { ElementRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../src/context/AuthContext";
import { useTaskStore } from "../../../src/store/taskStore";
import { colors } from "../../../src/constants/colors";
import { formatDate, formatDateTime, relativeTime } from "../../../src/utils/dates";
import { ActivityEntry, Comment, Frequency, Priority, Status } from "../../../src/types/task";

const EMPTY_COMMENTS: Comment[] = [];
const EMPTY_ACTIVITY: ActivityEntry[] = [];
const NOT_FOUND_OPTIONS = { title: "Task" };

const priorityLabel: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High" };
const statusLabel: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In progress",
  complete: "Complete",
};
const frequencyLabel: Record<Frequency, string> = {
  none: "None",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const isManager = profile?.role === "manager";

  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id));
  const profiles = useTaskStore((s) => s.profiles);
  const comments = useTaskStore((s) => (id ? s.comments[id] ?? EMPTY_COMMENTS : EMPTY_COMMENTS));
  const activity = useTaskStore((s) => (id ? s.activity[id] ?? EMPTY_ACTIVITY : EMPTY_ACTIVITY));
  const fetchComments = useTaskStore((s) => s.fetchComments);
  const fetchActivity = useTaskStore((s) => s.fetchActivity);
  const fetchProfiles = useTaskStore((s) => s.fetchProfiles);
  const addComment = useTaskStore((s) => s.addComment);
  const deleteComment = useTaskStore((s) => s.deleteComment);
  const setStatus = useTaskStore((s) => s.setStatus);
  const toggleChecklistItem = useTaskStore((s) => s.toggleChecklistItem);
  const addChecklistItem = useTaskStore((s) => s.addChecklistItem);
  const deleteChecklistItem = useTaskStore((s) => s.deleteChecklistItem);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [commentBody, setCommentBody] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [editingSubscribers, setEditingSubscribers] = useState(false);

  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const commentsY = useRef(0);

  useEffect(() => {
    if (id) {
      fetchComments(id);
      fetchActivity(id);
    }
    if (isManager && profiles.length === 0) fetchProfiles();
  }, [id, fetchComments, fetchActivity, isManager, profiles.length, fetchProfiles]);

  const canView = !!task;
  const canChangeStatus = isManager || task?.assigneeId === profile?.id;
  const canToggleChecklist = canChangeStatus;
  const canComment =
    isManager ||
    task?.assigneeId === profile?.id ||
    task?.subscribers.some((s) => s.id === profile?.id);

  const confirmDelete = useCallback(() => {
    if (!task) return;
    Alert.alert(
      "Delete task",
      `Delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTask(task.id);
            router.back();
          },
        },
      ],
      { cancelable: true }
    );
  }, [task, deleteTask, router]);

  const goToEdit = useCallback(() => {
    if (task) router.push(`/task/edit/${task.id}`);
  }, [task, router]);

  const screenOptions = useMemo(
    () => ({
      title: task ? `T-${task.taskNumber}` : "Task",
      headerRight: isManager
        ? () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={goToEdit}
                accessibilityRole="button"
                accessibilityLabel="Edit task"
                hitSlop={8}
              >
                <Text style={styles.headerEdit}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Delete task"
                hitSlop={8}
              >
                <Text style={styles.headerDelete}>Delete</Text>
              </Pressable>
            </View>
          )
        : undefined,
    }),
    [task, isManager, goToEdit, confirmDelete]
  );

  const scrollToComments = () => {
    scrollRef.current?.scrollTo({ y: commentsY.current, animated: true });
  };

  const postComment = async () => {
    const body = commentBody.trim();
    if (!body || !id) return;
    if (body.length > 1000) {
      Alert.alert("Comment too long", "Comments are limited to 1000 characters.");
      return;
    }
    await addComment(id, body);
    setCommentBody("");
  };

  const confirmDeleteComment = (commentId: string) => {
    Alert.alert(
      "Delete comment",
      "Delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteComment(commentId, id!),
        },
      ],
      { cancelable: true }
    );
  };

  const toggleSubscriber = (userId: string) => {
    if (!task) return;
    const ids = task.subscribers.map((s) => s.id);
    const next = ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId];
    updateTask(task.id, { subscriberIds: next });
  };

  const checklistDone = useMemo(
    () => task?.checklist.filter((c) => c.isDone).length ?? 0,
    [task]
  );

  if (!canView) {
    return (
      <View style={styles.notFound}>
        <Stack.Screen options={NOT_FOUND_OPTIONS} />
        <Text style={styles.notFoundText}>You don&apos;t have access to this task</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <View style={styles.taskNumberBadge}>
            <Text style={styles.taskNumberText}>T-{task.taskNumber}</Text>
          </View>
          <Text style={styles.title}>{task.title}</Text>
        </View>

        {task.description ? <Text style={styles.description}>{task.description}</Text> : null}

        <Text style={styles.sectionLabel}>People</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Assigned To</Text>
          <Text style={styles.infoValue}>{task.assigneeName ?? "Unassigned"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Assigned By</Text>
          <Text style={styles.infoValue}>{task.createdByName ?? "Unknown"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Subscribers</Text>
          <Text style={styles.infoValue}>
            {task.subscribers.length > 0
              ? task.subscribers.map((s) => s.fullName).join(", ")
              : "None"}
          </Text>
        </View>
        {isManager ? (
          <>
            <Pressable
              onPress={() => setEditingSubscribers((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Edit subscribers"
            >
              <Text style={styles.editLink}>
                {editingSubscribers ? "Done" : "Edit subscribers"}
              </Text>
            </Pressable>
            {editingSubscribers ? (
              <View style={styles.chipRow}>
                {profiles.map((p) => {
                  const selected = task.subscribers.some((s) => s.id === p.id);
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => toggleSubscriber(p.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${selected ? "Remove" : "Add"} subscriber ${p.fullName}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {p.fullName}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Created At</Text>
          <Text style={styles.infoValue}>{formatDateTime(task.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Due Date</Text>
          <Text
            style={[
              styles.infoValue,
              task.dueDate &&
                task.status !== "complete" &&
                new Date(task.dueDate) < new Date() &&
                styles.overdueText,
            ]}
          >
            {formatDateTime(task.dueDate)}
            {task.dueDate && task.status !== "complete" && new Date(task.dueDate) < new Date()
              ? " (Overdue)"
              : ""}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>End Date</Text>
          <Text style={styles.infoValue}>{formatDate(task.endDate)}</Text>
        </View>

        <Text style={styles.sectionLabel}>Frequency</Text>
        <Text style={styles.plainValue}>
          {task.frequency === "none"
            ? "None"
            : `${frequencyLabel[task.frequency]}${task.frequencyNote ? " - " + task.frequencyNote : ""}`}
        </Text>

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: colors.status[task.status] }]} />
          <Text style={styles.plainValue}>{statusLabel[task.status]}</Text>
        </View>

        <Text style={styles.sectionLabel}>Category</Text>
        <Text style={styles.plainValue}>{task.category || "None"}</Text>

        <Text style={styles.sectionLabel}>Priority</Text>
        <Text style={styles.plainValue}>
          {"⚑"} {priorityLabel[task.priority]}
        </Text>

        <Text style={styles.sectionLabel}>Reminders</Text>
        {task.reminders.length === 0 ? (
          <Text style={styles.plainValue}>None</Text>
        ) : (
          task.reminders.map((r) => (
            <Text key={r.id} style={styles.plainValue}>
              {r.channel === "mobile" ? "Mobile App" : "WhatsApp"}{" "}
              {r.offsetMinutes >= 1440
                ? `${Math.round(r.offsetMinutes / 1440)} day(s) before`
                : r.offsetMinutes >= 60
                  ? `${Math.round(r.offsetMinutes / 60)} hour(s) before`
                  : `${r.offsetMinutes} minute(s) before`}
            </Text>
          ))
        )}

        <View style={styles.actionsRow}>
          {canChangeStatus && task.status !== "in_progress" ? (
            <Pressable
              style={styles.actionBtn}
              onPress={() => setStatus(task.id, "in_progress")}
              accessibilityRole="button"
              accessibilityLabel="Mark as in progress"
            >
              <Text style={styles.actionText}>In Progress</Text>
            </Pressable>
          ) : null}
          {canChangeStatus && task.status !== "complete" ? (
            <Pressable
              style={[styles.actionBtn, styles.completeBtn]}
              onPress={() => setStatus(task.id, "complete")}
              accessibilityRole="button"
              accessibilityLabel="Mark as complete"
            >
              <Text style={[styles.actionText, styles.completeText]}>Complete</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={styles.actionBtn}
            onPress={scrollToComments}
            accessibilityRole="button"
            accessibilityLabel="Go to comments"
          >
            <Text style={styles.actionText}>Comment</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.checklistHeader}
          onPress={() => setChecklistOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={`Checklist, ${checklistDone} of ${task.checklist.length} done, ${
            checklistOpen ? "collapse" : "expand"
          }`}
        >
          <Text style={styles.sectionLabel}>
            Checklist {checklistDone}/{task.checklist.length}
          </Text>
          <Text style={styles.chevron}>{checklistOpen ? "▲" : "▼"}</Text>
        </Pressable>

        {checklistOpen ? (
          <>
            {task.checklist.map((item) => (
              <View key={item.id} style={styles.checklistRow}>
                <Pressable
                  style={[styles.checkbox, item.isDone && styles.checkboxChecked]}
                  onPress={() =>
                    canToggleChecklist && toggleChecklistItem(item.id, !item.isDone)
                  }
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.isDone, disabled: !canToggleChecklist }}
                  accessibilityLabel={item.text}
                  importantForAccessibility={canToggleChecklist ? "yes" : "no-hide-descendants"}
                >
                  {item.isDone ? <Text style={styles.checkmark}>{"✓"}</Text> : null}
                </Pressable>
                <Text
                  style={[styles.checklistText, item.isDone && styles.checklistTextDone]}
                >
                  {item.text}
                </Text>
                {isManager ? (
                  <Pressable
                    onPress={() => deleteChecklistItem(item.id, task.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove checklist item ${item.text}`}
                    hitSlop={8}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {isManager ? (
              <View style={styles.addChecklistRow}>
                <TextInput
                  style={styles.checklistInput}
                  value={newChecklistText}
                  onChangeText={setNewChecklistText}
                  placeholder="Add a point"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel="New checklist item"
                />
                <Pressable
                  style={styles.addBtn}
                  onPress={() => {
                    const text = newChecklistText.trim();
                    if (!text) return;
                    addChecklistItem(task.id, text);
                    setNewChecklistText("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add point"
                >
                  <Text style={styles.addBtnText}>Add point</Text>
                </Pressable>
              </View>
            ) : null}
          </>
        ) : null}

        <Text style={styles.sectionLabel}>Task Updates</Text>
        {activity.length === 0 ? (
          <Text style={styles.plainValue}>No activity yet.</Text>
        ) : (
          activity.map((entry) => (
            <View key={entry.id} style={styles.activityRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{entry.actorName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.activityBody}>
                <View style={styles.activityHeaderRow}>
                  <Text style={styles.activityActor}>{entry.actorName}</Text>
                  <View style={styles.kindBadge}>
                    <Text style={styles.kindBadgeText}>{entry.kind}</Text>
                  </View>
                  <Text style={styles.activityTime}>{relativeTime(entry.createdAt)}</Text>
                </View>
                <Text style={styles.activityMessage}>{entry.message}</Text>
              </View>
            </View>
          ))
        )}

        <View
          style={styles.commentsSection}
          onLayout={(e) => {
            commentsY.current = e.nativeEvent.layout.y;
          }}
        >
          <Text style={styles.sectionLabel}>Comments</Text>

          {comments.length === 0 ? (
            <Text style={styles.plainValue}>No comments yet.</Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.authorName}</Text>
                  {comment.authorId === profile?.id || isManager ? (
                    <Pressable
                      onPress={() => confirmDeleteComment(comment.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Delete comment"
                      hitSlop={8}
                    >
                      <Text style={styles.removeText}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.commentBody}>{comment.body}</Text>
              </View>
            ))
          )}

          {canComment ? (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={commentBody}
                onChangeText={setCommentBody}
                placeholder="Add a comment..."
                placeholderTextColor={colors.muted}
                maxLength={1000}
                multiline
                accessibilityLabel="Comment"
              />
              <Pressable
                style={styles.postBtn}
                onPress={postComment}
                accessibilityRole="button"
                accessibilityLabel="Post comment"
              >
                <Text style={styles.postBtnText}>Post</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 20 },
  notFoundText: { fontSize: 16, color: colors.muted, textAlign: "center" },
  headerActions: { flexDirection: "row", gap: 16, marginRight: 4 },
  headerEdit: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  headerDelete: { color: colors.danger, fontWeight: "700", fontSize: 15 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  titleBlock: { marginBottom: 8 },
  taskNumberBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  taskNumberText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  description: { fontSize: 15, color: colors.muted, marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 20, marginBottom: 6 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  infoKey: { fontSize: 13, color: colors.muted },
  infoValue: { fontSize: 14, color: colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  overdueText: { color: colors.danger },
  editLink: { color: colors.primary, fontWeight: "600", fontSize: 13, marginTop: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  chipTextActive: { color: colors.white },
  plainValue: { fontSize: 14, color: colors.text },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 20, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completeBtn: { backgroundColor: colors.status.complete, borderColor: colors.status.complete },
  actionText: { fontSize: 14, fontWeight: "600", color: colors.text },
  completeText: { color: colors.white },
  checklistHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chevron: { color: colors.muted, fontSize: 14 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.white, fontWeight: "700", fontSize: 14 },
  checklistText: { flex: 1, fontSize: 14, color: colors.text },
  checklistTextDone: { textDecorationLine: "line-through", color: colors.muted },
  removeText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  addChecklistRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  checklistInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    fontSize: 14,
    color: colors.text,
  },
  addBtn: { paddingHorizontal: 14, justifyContent: "center", borderRadius: 10, backgroundColor: colors.primary },
  addBtnText: { color: colors.white, fontWeight: "700", fontSize: 13 },
  activityRow: { flexDirection: "row", gap: 10, paddingVertical: 8 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.white, fontWeight: "700" },
  activityBody: { flex: 1 },
  activityHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  activityActor: { fontSize: 13, fontWeight: "700", color: colors.text },
  kindBadge: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  kindBadgeText: { fontSize: 10, color: colors.muted, textTransform: "uppercase" },
  activityTime: { fontSize: 11, color: colors.muted, marginLeft: "auto" },
  activityMessage: { fontSize: 13, color: colors.text, marginTop: 2 },
  commentsSection: { marginTop: 20 },
  comment: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  commentAuthor: { fontSize: 13, fontWeight: "700", color: colors.text },
  commentBody: { fontSize: 14, color: colors.text, marginTop: 4 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 8 },
  commentInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  postBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  postBtnText: { color: colors.white, fontWeight: "700" },
});
