// Invite-only account creation (PRD 5.1). Callable only by a signed-in
// manager or HR user. Creates the auth user with a temporary password
// (returned once, never stored) and must_change_password set, then sets
// the requested role. The service role key lives only in this function's
// environment — it is never shipped to the app.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing Authorization header." }, 401);
    }

    // Verify the caller's JWT and role using the anon client bound to their token.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Invalid or expired session." }, 401);
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !callerProfile || (callerProfile.role !== "manager" && callerProfile.role !== "hr")) {
      return json({ error: "Only a manager or HR may invite employees." }, 403);
    }

    const body = await req.json().catch(() => null);
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body?.role === "manager" || body?.role === "hr" ? body.role : "employee";

    if (!fullName || !email) {
      return json({ error: "fullName and email are required." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const tempPassword = generateTempPassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, must_change_password: true },
    });

    if (createError || !created?.user) {
      return json({ error: createError?.message ?? "Could not create the user." }, 400);
    }

    // handle_new_user() already inserted a default profile; set the
    // requested name/role (role changes otherwise require direct SQL).
    const { error: updateError } = await admin
      .from("profiles")
      .update({ full_name: fullName, role })
      .eq("id", created.user.id);

    if (updateError) {
      return json({ error: updateError.message }, 500);
    }

    return json({ ok: true, userId: created.user.id, tempPassword });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
