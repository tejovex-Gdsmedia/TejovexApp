// Verifies that a signed-in user cannot change their own role using the anon key.
// Run with: node supabase/test-role-change.js <email> <password>
//
// It reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY from the
// project's .env file (the same values the app itself uses).

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage: node supabase/test-role-change.js <email> <password>");
    process.exit(1);
  }

  const envFromFile = loadEnv(path.join(__dirname, "..", ".env"));
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || envFromFile.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    envFromFile.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (checked .env and process.env)."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log(`Signing in as ${email}...`);
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    console.error("Sign in failed:", signInError?.message ?? "no session returned");
    process.exit(1);
  }

  const userId = signInData.user.id;

  const { data: before, error: beforeError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .single();

  if (beforeError) {
    console.error("Could not read current profile:", beforeError.message);
    process.exit(1);
  }

  console.log("Current profile:", before);

  const targetRole = before.role === "manager" ? "employee" : "manager";
  console.log(`Attempting to change my own role to "${targetRole}" with the anon key...`);

  const { data: updateData, error: updateError } = await supabase
    .from("profiles")
    .update({ role: targetRole })
    .eq("id", userId)
    .select();

  if (updateError) {
    console.log("\nREJECTED (expected). Supabase returned an error:");
    console.log(" ", updateError.message);
    process.exit(0);
  }

  if (!updateData || updateData.length === 0) {
    console.log(
      "\nREJECTED (expected). No rows were updated — the column grant/RLS silently blocked it."
    );
    process.exit(0);
  }

  console.log("\nUNEXPECTED: the role change succeeded!");
  console.log("Updated row:", updateData);
  console.log(
    "\nThis means the column-level grant (revoke update ... grant update (full_name)) is not in effect. Re-check supabase/schema.sql was run against this project."
  );
  process.exit(1);
}

main();
