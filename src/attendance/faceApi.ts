import * as FileSystem from "expo-file-system";

const BASE_URL = (process.env.EXPO_PUBLIC_FACE_SERVER_URL ?? "http://10.0.2.2:8000").replace(/\/$/, "");

export interface VerifyResult {
  matched: boolean;
  similarity: number;
  threshold: number;
}

async function postForm(path: string, fields: Record<string, string>, photoUri: string): Promise<Response> {
  // RN new architecture (0.76+) no longer accepts the {uri,name,type} hack —
  // must supply a real Blob.
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: "image/jpeg" });

  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", blob, "photo.jpg");
  return fetch(`${BASE_URL}${path}`, { method: "POST", body: form });
}

export async function enrollFace(userId: string, photoUri: string): Promise<{ enrolled: boolean }> {
  const res = await postForm("/enroll", { user_id: userId }, photoUri);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Enroll failed (${res.status})`);
  }
  return res.json();
}

export async function verifyFace(userId: string, photoUri: string): Promise<VerifyResult> {
  const res = await postForm("/verify", { user_id: userId }, photoUri);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Verify failed (${res.status})`);
  }
  return res.json();
}

export async function unenrollFace(userId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/unenroll/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Unenroll failed (${res.status})`);
}
