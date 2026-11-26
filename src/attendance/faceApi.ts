const BASE_URL = (process.env.EXPO_PUBLIC_FACE_SERVER_URL ?? "http://10.0.2.2:8000").replace(/\/$/, "");

export interface VerifyResult {
  matched: boolean;
  similarity: number;
  threshold: number;
}

async function postForm(path: string, fields: Record<string, string>, photoUri: string): Promise<Response> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", { uri: photoUri, name: "photo.jpg", type: "image/jpeg" } as unknown as Blob);
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
