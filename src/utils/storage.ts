import { readAsStringAsync, EncodingType } from "expo-file-system";
import { supabase } from "../lib/supabase";
import { PickedFile } from "../types/task";

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function uploadTaskFile(
  file: PickedFile,
  taskId: string
): Promise<string | null> {
  const ext = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
  const path = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const base64 = await readAsStringAsync(file.uri, {
      encoding: EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from("task-attachments")
      .upload(path, decodeBase64(base64), {
        contentType: file.mimeType || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      console.warn("Storage upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("Upload failed:", err);
    return null;
  }
}

export interface UploadResult {
  url: string;
  file: PickedFile;
}

export async function uploadTaskFiles(
  files: PickedFile[],
  taskId: string
): Promise<UploadResult[]> {
  const results = await Promise.all(
    files.map(async (file) => {
      const url = await uploadTaskFile(file, taskId);
      return url ? { url, file } : null;
    })
  );
  return results.filter((r): r is UploadResult => r !== null);
}

export async function insertAttachmentRecords(
  uploads: UploadResult[],
  taskId: string,
  commentId: string | null,
  uploaderId: string
): Promise<void> {
  if (uploads.length === 0) return;
  const rows = uploads.map(({ url, file }) => ({
    task_id: taskId,
    comment_id: commentId,
    uploader_id: uploaderId,
    file_url: url,
    file_name: file.name,
    file_type: file.mimeType || null,
    file_size: file.size ?? null,
  }));

  const { error } = await supabase.from("task_attachments").insert(rows);
  if (error) console.warn("Failed to save attachment records:", error.message);
}
