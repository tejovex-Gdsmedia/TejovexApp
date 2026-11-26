import { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { PickedFile } from "../../types/task";
import AttachmentPicker from "./AttachmentPicker";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called when user taps "Update Task". Receives remark text and chosen files. */
  onSubmit: (remark: string, attachments: PickedFile[]) => Promise<void>;
}

export default function CompletionModal({ visible, onClose, onSubmit }: Props) {
  const [remark, setRemark] = useState("");
  const [attachments, setAttachments] = useState<PickedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const addFiles = (files: PickedFile[]) =>
    setAttachments((prev) => [...prev, ...files]);
  const removeFile = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSubmit(remark.trim(), attachments);
      setRemark("");
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Tasks Update</Text>
              <Text style={styles.subtitle}>
                Please add a note before marking the task as Completed
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Remarks input */}
            <TextInput
              style={styles.input}
              value={remark}
              onChangeText={setRemark}
              placeholder="Write Remarks here. (Use @ to tag team members)"
              placeholderTextColor={colors.muted}
              multiline
              accessibilityLabel="Remarks"
            />

            {/* Attachment picker */}
            <AttachmentPicker
              files={attachments}
              onAdd={addFiles}
              onRemove={removeFile}
              showMic
            />

            {/* Submit */}
            <Pressable
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Update Task"
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitText}>Update Task</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerText: { flex: 1, marginRight: 12 },
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: colors.status.complete,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
    minHeight: 48,
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
