// Morning Hotel Effectiveness ingest.
// The box calls this after tools/parse-he-labor.js builds yesterday's payload.
// JWT verification stays off so the box can use HOTELHQ_LABOR_INGEST_TOKEN
// instead of a user session:
//   supabase functions deploy ingest-daily-labor --no-verify-jwt
// Set the secret in Supabase, not in git:
//   supabase secrets set HOTELHQ_LABOR_INGEST_TOKEN=...
// The service role stays in the function environment. The token is not the
// service role key. This function does not write back to Hotel Effectiveness.
//
// Post the payload:
//   HOTELHQ_LABOR_INGEST_TOKEN=... node tools/parse-he-labor.js \
//     --dir /workspace/cleans-1130 --hotel MSPWE --date 2026-11-29 --post
//
// Mark yesterday's open items overdue (also scheduled in the database):
//   curl -sS -X POST "$URL/functions/v1/ingest-daily-labor" \
//     -H "authorization: Bearer $HOTELHQ_LABOR_INGEST_TOKEN" \
//     -H "content-type: application/json" \
//     -d '{"action":"escalate"}'

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BODY = 200000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function sameToken(got: string, expect: string) {
  if (!got || !expect || got.length !== expect.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expect.charCodeAt(i);
  return diff === 0;
}

function bearer(req: Request) {
  const header = req.headers.get("authorization") || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method" });
  const token = Deno.env.get("HOTELHQ_LABOR_INGEST_TOKEN") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token || !url || !service) return json(500, { error: "config" });
  if (!sameToken(bearer(req), token)) return json(401, { error: "auth" });

  let text = "";
  try {
    text = await req.text();
  } catch (_e) {
    return json(400, { error: "body" });
  }
  if (text.length > MAX_BODY) return json(400, { error: "body" });
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch (_e) {
    return json(400, { error: "body" });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json(400, { error: "body" });

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  if (payload.action === "escalate") {
    const escalated = await db.rpc("escalate_daily_labor");
    if (escalated.error) return json(400, { error: "rejected" });
    return json(200, { ok: true, escalated: escalated.data });
  }

  const saved = await db.rpc("ingest_daily_labor", { p: payload });
  if (saved.error) {
    const message = String(saved.error.message || "");
    const safe = /not allowed|unknown hotel|hotel not enabled|work_date|property id|body|too many rows|refusing employee code or PIN|bad number/.test(message)
      ? message
      : "rejected";
    return json(400, { error: safe });
  }
  return json(200, saved.data || { ok: true });
});
