import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/colors";

interface AppDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  /** If set, shows Cancel + this button. Otherwise shows a single OK button. */
  confirmText?: string;
  confirmStyle?: "default" | "destructive";
  onConfirm?: () => void;
  /** Label for the single OK button (default: "OK"). */
  okText?: string;
}

export default function AppDialog({
  visible,
  title,
  message,
  onDismiss,
  confirmText,
  confirmStyle = "default",
  onConfirm,
  okText = "OK",
}: AppDialogProps) {
  const isConfirm = Boolean(confirmText);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={isConfirm ? undefined : onDismiss}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {isConfirm ? (
            <View style={styles.row}>
              <Pressable style={[styles.btn, styles.btnCancel]} onPress={onDismiss}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  confirmStyle === "destructive" ? styles.btnDestructive : styles.btnPrimary,
                ]}
                onPress={() => { onConfirm?.(); onDismiss(); }}
              >
                <Text style={styles.btnActionText}>{confirmText}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.btn, styles.btnPrimary, styles.btnFull]} onPress={onDismiss}>
              <Text style={styles.btnActionText}>{okText}</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFull: { flex: undefined, width: "100%" },
  btnCancel: { backgroundColor: colors.backgroundAlt },
  btnPrimary: { backgroundColor: colors.primary },
  btnDestructive: { backgroundColor: colors.danger },
  btnCancelText: { fontSize: 15, fontWeight: "600", color: colors.muted },
  btnActionText: { fontSize: 15, fontWeight: "700", color: colors.white },
});
