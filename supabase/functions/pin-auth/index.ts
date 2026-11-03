// HotelHQ PIN gate. The browser sends the publishable key only.
// The service role stays in this function. Demo mode never calls it.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json"
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function env(name: string) {
  return Deno.env.get(name) || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });

  const url = env("SUPABASE_URL");
  const anon = env("SUPABASE_ANON_KEY") || env("SUPABASE_PUBLISHABLE_KEY");
  const service = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json(500, { error: "config" });

  let payload: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 4000) return json(400, { error: "body" });
    payload = text ? JSON.parse(text) : {};
  } catch (_e) {
    return json(400, { error: "body" });
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const action = String(payload.action || "");

  if (action === "directory") {
    const { data, error } = await admin.rpc("staff_sign_in_directory");
    if (error) return json(500, { error: "directory" });
    return json(200, { staff: data || [] });
  }

  if (action === "sign-in") {
    const userId = String(payload.user_id || "");
    const pin = String(payload.pin || "");
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !/^\d{4,6}$/.test(pin)) {
      return json(401, { error: "pin" });
    }
    const gate = await admin.rpc("pin_gate", { p_user: userId });
    if (gate.error) return json(500, { error: "gate" });
    const gateRow = gate.data || {};
    if (gateRow.locked) return json(429, { error: "locked", until: gateRow.until || null });
    if (!gateRow.ok) return json(401, { error: "pin" });

    const emailRes = await admin.rpc("staff_auth_email", { p_user: userId });
    const email = emailRes.data;
    if (emailRes.error || !email) return json(401, { error: "pin" });

    const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await anonClient.auth.signInWithPassword({ email, password: pin });
    const session = signed.data && signed.data.session;
    // A 4 or 5 digit PIN can sign in while Auth's minimum length is still 6.
    // GoTrue returns the session and a weak-password warning. Keep the session.
    if (!session) {
      const fail = await admin.rpc("note_pin_failure", { p_user: userId });
      if (fail.data && fail.data.locked) return json(429, { error: "locked", until: fail.data.until || null });
      return json(401, { error: "pin" });
    }
    await admin.rpc("note_pin_success", { p_user: userId });
    const profile = await admin.from("profiles").select("pin_reset_required").eq("user_id", userId).maybeSingle();
    const pinReset = !profile.error && !!profile.data && profile.data.pin_reset_required === true;
    return json(200, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      pin_reset_required: pinReset
    });
  }

  if (action === "reset") {
    const header = req.headers.get("authorization") || "";
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const userId = String(payload.user_id || "");
    if (!token || !/^[0-9a-f-]{36}$/i.test(userId)) return json(401, { error: "auth" });
    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: "Bearer " + token } }
    });
    const who = await userClient.auth.getUser(token);
    if (who.error || !who.data.user) return json(401, { error: "auth" });
    const reset = await userClient.rpc("reset_staff_pin", { p_user: userId });
    if (reset.error || !reset.data) return json(403, { error: "not_allowed" });

    let emailed = false;
    const contact = await admin.rpc("staff_reset_email", { p_user: userId });
    const inbox = contact.data;
    const redirect = String(payload.redirect_to || "");
    const redirectOk = /^https:\/\/[^\s]+$/.test(redirect) && redirect.length < 300;
    if (inbox && !contact.error) {
      const recover = await fetch(url + "/auth/v1/recover", {
        method: "POST",
        headers: { apikey: anon, authorization: "Bearer " + anon, "content-type": "application/json" },
        body: JSON.stringify(redirectOk ? { email: inbox, redirect_to: redirect } : { email: inbox })
      });
      emailed = recover.ok;
    }
    return json(200, { pin: reset.data, emailed });
  }

  return json(400, { error: "action" });
});
