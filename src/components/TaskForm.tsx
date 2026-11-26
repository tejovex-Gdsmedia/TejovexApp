import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import DatePicker from "./ui/DatePicker";
import AttachmentPicker from "./ui/AttachmentPicker";
import { Frequency, NewTask, PickedFile, Priority, ReminderChannel } from "../types/task";
import { colors } from "../constants/colors";
import { useTaskStore } from "../store/taskStore";

const priorities: Priority[] = ["low", "medium", "high"];
const frequencies: Frequency[] = ["none", "daily", "weekly", "monthly"];
const frequencyLabel: Record<Frequency, string> = {
  none: "None",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};
const reminderPresets: { label: string; minutes: number }[] = [
  { label: "15 minutes before", minutes: 15 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 1440 },
];

interface Errors {
  title?: string;
  assigneeId?: string;
  dueDate?: string;
  endDate?: string;
}

interface Props {
  initialValues?: NewTask;
  submitLabel: string;
  onSubmit: (values: NewTask) => void;
}

function formatDate(d: Date | null): string {
  if (!d) return "Select date";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(d: Date | null): string {
  if (!d) return "Select time";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function combineDateAndTime(date: Date, time: Date): Date {
  const combined = new Date(date);
  combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return combined;
}

export default function TaskForm({ initialValues, submitLabel, onSubmit }: Props) {
  const profiles = useTaskStore((s) => s.profiles);
  const tasks = useTaskStore((s) => s.tasks);
  const fetchProfiles = useTaskStore((s) => s.fetchProfiles);

  const employees = useMemo(() => profiles.filter((p) => p.role === "employee"), [profiles]);
  const categorySuggestions = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(set);
  }, [tasks]);

  useEffect(() => {
    if (profiles.length === 0) fetchProfiles();
  }, [profiles.length, fetchProfiles]);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initialValues?.priority ?? "medium");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [assigneeId, setAssigneeId] = useState(initialValues?.assigneeId ?? "");
  const [subscriberIds, setSubscriberIds] = useState<string[]>(
    initialValues?.subscriberIds ?? []
  );
  const [dueDate, setDueDate] = useState<Date | null>(
    initialValues?.dueDate ? new Date(initialValues.dueDate) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    initialValues?.endDate ? new Date(initialValues.endDate) : null
  );
  const [frequency, setFrequency] = useState<Frequency>(initialValues?.frequency ?? "none");
  const [frequencyNote, setFrequencyNote] = useState(initialValues?.frequencyNote ?? "");
  const [reminders, setReminders] = useState(initialValues?.reminders ?? []);
  const [customMinutes, setCustomMinutes] = useState("");
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<Errors>({});

  const [pickerTarget, setPickerTarget] = useState<
    "dueDate" | "dueTime" | "endDate" | null
  >(null);

  const toggleSubscriber = (id: string) => {
    setSubscriberIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const addReminder = (channel: ReminderChannel, minutes: number) => {
    if (!minutes || minutes <= 0) return;
    setReminders((prev) => [...prev, { channel, offsetMinutes: minutes }]);
  };

  const removeReminder = (index: number) => {
    setReminders((prev) => prev.filter((_, i) => i !== index));
  };

  const onPickerChange = (_event: unknown, selected?: Date) => {
    const target = pickerTarget;
    setPickerTarget(null);
    if (!selected || !target) return;

    if (target === "dueDate") {
      setDueDate((prev) => combineDateAndTime(selected, prev ?? selected));
    } else if (target === "dueTime") {
      setDueDate((prev) => combineDateAndTime(prev ?? selected, selected));
    } else if (target === "endDate") {
      setEndDate(selected);
    }
  };

  const save = () => {
    const nextErrors: Errors = {};
    if (!title.trim()) nextErrors.title = "Title is required.";
    if (!assigneeId) nextErrors.assigneeId = "Choose who this task is assigned to.";
    if (!dueDate) nextErrors.dueDate = "Due date is required.";
    if (endDate && dueDate && endDate < dueDate) {
      nextErrors.endDate = "End date can't be before the due date.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      category: category.trim(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      frequency,
      frequencyNote: frequency === "none" ? "" : frequencyNote.trim(),
      assigneeId,
      subscriberIds,
      reminders,
      attachments,
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Title"
        maxLength={200}
      />
      {errors.title ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errors.title}
        </Text>
      ) : null}

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Add details (optional)"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Description"
        multiline
      />

      <Text style={styles.label}>Assign to *</Text>
      <View style={styles.chipRow}>
        {employees.map((employee) => {
          const selected = assigneeId === employee.id;
          return (
            <Pressable
              key={employee.id}
              onPress={() => setAssigneeId(employee.id)}
              style={[styles.chip, selected && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Assign to ${employee.fullName}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {employee.fullName}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {errors.assigneeId ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errors.assigneeId}
        </Text>
      ) : null}

      <Text style={styles.label}>Subscribers</Text>
      <View style={styles.chipRow}>
        {profiles.map((profile) => {
          const selected = subscriberIds.includes(profile.id);
          return (
            <Pressable
              key={profile.id}
              onPress={() => toggleSubscriber(profile.id)}
              style={[styles.chip, selected && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${selected ? "Remove" : "Add"} subscriber ${profile.fullName}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {profile.fullName}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityRow}>
        {priorities.map((p) => {
          const selected = priority === p;
          return (
            <Pressable
              key={p}
              onPress={() => setPriority(p)}
              style={[
                styles.priorityBtn,
                { borderColor: colors.priority[p] },
                selected && { backgroundColor: colors.priority[p] },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Priority ${p}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.priorityText, selected && { color: colors.white }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Category</Text>
      <TextInput
        style={styles.input}
        value={category}
        onChangeText={setCategory}
        placeholder="e.g. Marketing"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Category"
      />
      {categorySuggestions.length > 0 ? (
        <View style={styles.chipRow}>
          {categorySuggestions.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Use category ${c}`}
            >
              <Text style={styles.chipText}>{c}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={styles.label}>Due date and time *</Text>
      {Platform.OS === "web" ? (
        <View style={styles.dateRow}>
          <DatePicker
            value={dueDate ?? new Date()}
            mode="date"
            style={styles.dateBtn as never}
            onChange={(_e, selected) => { if (selected) setDueDate(selected); }}
          />
          <DatePicker
            value={dueDate ?? new Date()}
            mode="time"
            style={styles.dateBtn as never}
            onChange={(_e, selected) => {
              if (!selected) return;
              const next = new Date(dueDate ?? new Date());
              next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              setDueDate(next);
            }}
          />
        </View>
      ) : (
        <View style={styles.dateRow}>
          <Pressable
            style={styles.dateBtn}
            onPress={() => setPickerTarget("dueDate")}
            accessibilityRole="button"
            accessibilityLabel={`Due date, ${formatDate(dueDate)}`}
          >
            <Text style={styles.dateBtnText}>{formatDate(dueDate)}</Text>
          </Pressable>
          <Pressable
            style={styles.dateBtn}
            onPress={() => setPickerTarget("dueTime")}
            accessibilityRole="button"
            accessibilityLabel={`Due time, ${formatTime(dueDate)}`}
          >
            <Text style={styles.dateBtnText}>{formatTime(dueDate)}</Text>
          </Pressable>
        </View>
      )}
      {errors.dueDate ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errors.dueDate}
        </Text>
      ) : null}

      <Text style={styles.label}>End date (optional)</Text>
      {Platform.OS === "web" ? (
        <View style={styles.dateRow}>
          <DatePicker
            value={endDate ?? new Date()}
            mode="date"
            style={styles.dateBtn as never}
            onChange={(_e, selected) => { if (selected) setEndDate(selected); }}
          />
          {endDate ? (
            <Pressable
              style={styles.clearBtn}
              onPress={() => setEndDate(null)}
              accessibilityRole="button"
              accessibilityLabel="Clear end date"
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.dateRow}>
          <Pressable
            style={styles.dateBtn}
            onPress={() => setPickerTarget("endDate")}
            accessibilityRole="button"
            accessibilityLabel={`End date, ${formatDate(endDate)}`}
          >
            <Text style={styles.dateBtnText}>{formatDate(endDate)}</Text>
          </Pressable>
          {endDate ? (
            <Pressable
              style={styles.clearBtn}
              onPress={() => setEndDate(null)}
              accessibilityRole="button"
              accessibilityLabel="Clear end date"
            >
              <Text style={styles.clearBtnText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {errors.endDate ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {errors.endDate}
        </Text>
      ) : null}

      {pickerTarget && Platform.OS !== "web" ? (
        <DatePicker
          value={
            pickerTarget === "endDate" ? endDate ?? new Date() : dueDate ?? new Date()
          }
          mode={pickerTarget === "dueTime" ? "time" : "date"}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickerChange}
        />
      ) : null}

      <Text style={styles.label}>Frequency</Text>
      <View style={styles.priorityRow}>
        {frequencies.map((f) => {
          const selected = frequency === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFrequency(f)}
              style={[styles.chip, selected && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Frequency ${frequencyLabel[f]}`}
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {frequencyLabel[f]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {frequency !== "none" ? (
        <TextInput
          style={styles.input}
          value={frequencyNote}
          onChangeText={setFrequencyNote}
          placeholder="e.g. Every Sun"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Frequency detail"
        />
      ) : null}

      <Text style={styles.label}>Reminders</Text>
      {reminders.map((r, index) => (
        <View key={`${r.channel}-${r.offsetMinutes}-${index}`} style={styles.reminderRow}>
          <Text style={styles.reminderText}>
            {r.channel === "mobile" ? "Mobile App" : "WhatsApp"} •{" "}
            {r.offsetMinutes >= 1440
              ? `${Math.round(r.offsetMinutes / 1440)} day(s) before`
              : r.offsetMinutes >= 60
                ? `${Math.round(r.offsetMinutes / 60)} hour(s) before`
                : `${r.offsetMinutes} minute(s) before`}
          </Text>
          <Pressable
            onPress={() => removeReminder(index)}
            accessibilityRole="button"
            accessibilityLabel="Remove reminder"
            hitSlop={8}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.chipRow}>
        {reminderPresets.map((preset) => (
          <Pressable
            key={preset.label}
            style={styles.chip}
            onPress={() => addReminder("mobile", preset.minutes)}
            accessibilityRole="button"
            accessibilityLabel={`Add mobile reminder ${preset.label}`}
          >
            <Text style={styles.chipText}>Mobile: {preset.label}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.chip}
          onPress={() => addReminder("whatsapp", 15)}
          accessibilityRole="button"
          accessibilityLabel="Add WhatsApp reminder 15 minutes before"
        >
          <Text style={styles.chipText}>WhatsApp: 15 minutes before</Text>
        </Pressable>
      </View>
      <View style={styles.customReminderRow}>
        <TextInput
          style={[styles.input, styles.customReminderInput]}
          value={customMinutes}
          onChangeText={setCustomMinutes}
          placeholder="Custom minutes"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          accessibilityLabel="Custom reminder minutes"
        />
        <Pressable
          style={styles.addBtn}
          onPress={() => {
            addReminder("mobile", Number(customMinutes));
            setCustomMinutes("");
          }}
          accessibilityRole="button"
          accessibilityLabel="Add custom mobile reminder"
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Attachments (optional)</Text>
      <AttachmentPicker
        files={attachments}
        onAdd={(files) => setAttachments((prev) => [...prev, ...files])}
        onRemove={(index) =>
          setAttachments((prev) => prev.filter((_, i) => i !== index))
        }
      />

      <Pressable
        style={styles.saveBtn}
        onPress={save}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
      >
        <Text style={styles.saveText}>{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  priorityRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  priorityBtn: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: colors.card,
  },
  priorityText: { fontWeight: "600", color: colors.text },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
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
  dateRow: { flexDirection: "row", gap: 8 },
  dateBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  dateBtnText: { fontSize: 15, color: colors.text },
  clearBtn: { justifyContent: "center", paddingHorizontal: 12 },
  clearBtnText: { color: colors.danger, fontWeight: "600" },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginTop: 6,
  },
  reminderText: { fontSize: 13, color: colors.text, flex: 1 },
  removeText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  customReminderRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  customReminderInput: { flex: 1 },
  addBtn: {
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  addBtnText: { color: colors.white, fontWeight: "700" },
  saveBtn: {
    marginTop: 28,
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  saveText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
