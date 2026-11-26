import { View, Text, Pressable, StyleSheet, Platform, NativeModules } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/colors";
import { PickedFile } from "../../types/task";

interface Props {
  files: PickedFile[];
  onAdd: (files: PickedFile[]) => void;
  onRemove: (index: number) => void;
  showMic?: boolean;
}

// Synchronous native-module availability check — no import, no throw
const hasImagePicker =
  Platform.OS !== "web" && NativeModules["ExponentImagePicker"] != null;
const hasDocumentPicker =
  Platform.OS !== "web" && NativeModules["ExpoDocumentPicker"] != null;

/** Opens a hidden <input type="file"> on web */
function webFilePick(
  accept: string,
  multiple: boolean,
  onPick: (files: PickedFile[]) => void
) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;
  input.accept = accept;
  input.onchange = () => {
    const fileList = input.files;
    if (!fileList) return;
    const picked: PickedFile[] = Array.from(fileList).map((f) => ({
      uri: URL.createObjectURL(f),
      name: f.name,
      mimeType: f.type || "application/octet-stream",
      size: f.size,
    }));
    onPick(picked);
  };
  input.click();
}

export default function AttachmentPicker({
  files,
  onAdd,
  onRemove,
  showMic = false,
}: Props) {
  const pickFromGallery = async () => {
    if (Platform.OS === "web") {
      webFilePick("image/*,video/*", true, onAdd);
      return;
    }
    if (!hasImagePicker) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImagePicker = require("expo-image-picker");
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        onAdd(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.assets.map((a: any) => ({
            uri: a.uri,
            name: a.fileName ?? `image_${Date.now()}.jpg`,
            mimeType: a.mimeType ?? "image/jpeg",
            size: a.fileSize,
          }))
        );
      }
    } catch (e) {
      console.warn("Image picker unavailable:", e);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS === "web") return;
    if (!hasImagePicker) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImagePicker = require("expo-image-picker");
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!result.canceled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const a = result.assets[0] as any;
        onAdd([
          {
            uri: a.uri,
            name: a.fileName ?? `photo_${Date.now()}.jpg`,
            mimeType: a.mimeType ?? "image/jpeg",
            size: a.fileSize,
          },
        ]);
      }
    } catch (e) {
      console.warn("Camera unavailable:", e);
    }
  };

  const pickDocument = async () => {
    if (Platform.OS === "web") {
      webFilePick("*/*", true, onAdd);
      return;
    }
    if (!hasDocumentPicker) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const DocumentPicker = require("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (!result.canceled) {
        onAdd(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.assets.map((a: any) => ({
            uri: a.uri,
            name: a.name,
            mimeType: a.mimeType ?? "application/octet-stream",
            size: a.size,
          }))
        );
      }
    } catch (e) {
      console.warn("Document picker unavailable:", e);
    }
  };

  // On native Expo Go where neither picker is registered, show a note
  const showUnavailableNote =
    Platform.OS !== "web" && !hasImagePicker && !hasDocumentPicker;

  return (
    <View>
      <View style={styles.iconRow}>
        {showMic ? (
          <Pressable
            style={styles.iconBtn}
            onPress={() => {}}
            accessibilityLabel="Voice note (coming soon)"
          >
            <Ionicons name="mic-outline" size={22} color={colors.muted} />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.iconBtn, !hasImagePicker && Platform.OS !== "web" && styles.iconBtnDisabled]}
          onPress={pickFromGallery}
          accessibilityLabel="Pick image from gallery"
        >
          <Ionicons
            name="image-outline"
            size={22}
            color={!hasImagePicker && Platform.OS !== "web" ? colors.muted : colors.text}
          />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, !hasDocumentPicker && Platform.OS !== "web" && styles.iconBtnDisabled]}
          onPress={pickDocument}
          accessibilityLabel="Pick document file"
        >
          <Ionicons
            name="document-outline"
            size={22}
            color={!hasDocumentPicker && Platform.OS !== "web" ? colors.muted : colors.text}
          />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, !hasImagePicker && Platform.OS !== "web" && styles.iconBtnDisabled]}
          onPress={takePhoto}
          accessibilityLabel="Take a photo"
        >
          <Ionicons
            name="camera-outline"
            size={22}
            color={!hasImagePicker && Platform.OS !== "web" ? colors.muted : colors.text}
          />
        </Pressable>
      </View>

      {showUnavailableNote ? (
        <Text style={styles.unavailableNote}>
          Attachments require a preview build
        </Text>
      ) : null}

      {files.map((f, i) => (
        <View key={`${f.name}-${i}`} style={styles.fileRow}>
          <Ionicons
            name={
              f.mimeType.startsWith("image") || f.mimeType.startsWith("video")
                ? "image-outline"
                : "document-outline"
            }
            size={16}
            color={colors.primary}
          />
          <Text style={styles.fileName} numberOfLines={1}>
            {f.name}
          </Text>
          {f.size ? (
            <Text style={styles.fileSize}>
              {(f.size / 1024).toFixed(0)} KB
            </Text>
          ) : null}
          <Pressable
            onPress={() => onRemove(i)}
            hitSlop={8}
            accessibilityLabel={`Remove ${f.name}`}
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  iconRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDisabled: { opacity: 0.4 },
  unavailableNote: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
    fontStyle: "italic",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  fileName: { flex: 1, fontSize: 13, color: colors.text },
  fileSize: { fontSize: 11, color: colors.muted },
});
