import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const { userId, title, body, data } = await req.json() as {
      userId: string;
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };

    if (!userId || !title || !body) {
      return new Response(JSON.stringify({ error: "userId, title, and body are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Look up the recipient's push token using the service-role key
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", userId)
      .single();

    if (error || !profile?.push_token) {
      // User has no token — not an error, just skip
      return new Response(JSON.stringify({ sent: false, reason: "no token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = {
      to: profile.push_token,
      sound: "default",
      title,
      body,
      data: data ?? {},
    };

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await expoRes.json();

    return new Response(JSON.stringify({ sent: true, result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
