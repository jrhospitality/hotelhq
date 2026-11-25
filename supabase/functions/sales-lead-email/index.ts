// HotelHQ: email a saved sales lead to that hotel's sales manager.
//
// The app inserts the lead first. This function only sends mail. If sending
// fails, it marks the row failed and the screen says "Email not sent".
// The lead is never deleted here.
//
// Mail goes out through Gmail SMTP (smtp.gmail.com, port 465, TLS) with
// denomailer. Jay sets these Supabase Edge Function secrets. Do not commit
// the values. Dashboard → Edge Functions → Secrets, or:
//   supabase secrets set NAME=value
//
//   HOTELHQ_GMAIL_USER          Mailbox login. This is also the From address.
//   HOTELHQ_GMAIL_APP_PASSWORD  Google app password for that mailbox.
//                               It is not the normal mailbox password.
//
// Recipients are public.sales_lead_routes.emails for the lead's hotel.
// Do not put a real address or a password in this public repo.
//
// Supabase already provides SUPABASE_URL plus either SUPABASE_SECRET_KEYS and
// SUPABASE_PUBLISHABLE_KEYS, or the legacy SUPABASE_SERVICE_ROLE_KEY and
// SUPABASE_ANON_KEY. Jay does not paste those into the repo.
//
// Deploy with JWT verification left on (the platform default):
//   supabase functions deploy sales-lead-email
//
// Subject shape: New sales lead - <hotel code> - <contact first last>

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const HOTEL_NAME: Record<string, string> = {
  MSPWE: "MSPWE · HIE&S Golden Valley",
  MSPAM: "MSPAM · Hampton Inn & Suites MSP Airport/MOA",
  MSPMS: "MSPMS · SpringHill Suites MSP Airport/MOA"
};

const NEED_ES: Record<string, string> = {
  "Local Negotiated Rate": "Tarifa negociada local",
  "Group Block": "Bloqueo de grupo",
  "Meeting Space": "Salón de reuniones",
  Other: "Otro"
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

function namedKey(raw: string | undefined, legacy: string | undefined): string {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && parsed.default) return parsed.default;
    } catch (_e) {
      /* use the legacy variable */
    }
  }
  return legacy || "";
}

function esc(value: unknown): string {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => {
    if (c === "&") return "&amp;";
    if (c === "<") return "&lt;";
    if (c === ">") return "&gt;";
    if (c === '"') return "&quot;";
    return "&#39;";
  });
}

function oneLine(value: unknown): string {
  return String(value == null ? "" : value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function isEmail(value: string): boolean {
  return value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function subjectLine(hotel: string, contact: string): string {
  return `New sales lead - ${hotel} - ${contact}`;
}

function needLabel(need: string): string {
  const es = NEED_ES[need];
  return es ? `${need} (${es})` : need;
}

function rowsFor(lead: Record<string, unknown>): Array<[string, string]> {
  const needs = Array.isArray(lead.needs) ? lead.needs.map((n) => needLabel(String(n))) : [];
  if (lead.needs_other) needs.push(String(lead.needs_other));
  const dates = [lead.group_start, lead.group_end].filter(Boolean).join(" → ");
  const hotel = String(lead.hotel || "");
  return [
    ["Property / Propiedad", HOTEL_NAME[hotel] || hotel],
    ["Filed by / Lo anotó", String(lead.created_by_name || "")],
    ["Contact / Contacto", `${lead.contact_first || ""} ${lead.contact_last || ""}`.trim()],
    ["Phone / Teléfono", String(lead.contact_phone || "—")],
    ["Email / Correo", String(lead.contact_email || "—")],
    ["Needs / Necesita", needs.join(", ") || "—"],
    ["Group dates / Fechas del grupo", dates || "—"],
    ["Notes / Notas", String(lead.notes || "—")],
    ["Status / Estado", "New"]
  ];
}

function htmlBody(lead: Record<string, unknown>): string {
  const body = rowsFor(lead).map(([label, value]) => {
    return `<tr><th align="left" style="padding:8px 10px;border:1px solid #d5dbe3;background:#eef3fa;vertical-align:top">${esc(label)}</th><td style="padding:8px 10px;border:1px solid #d5dbe3;vertical-align:top">${esc(value)}</td></tr>`;
  }).join("");
  return `<div style="font-family:Segoe UI,Roboto,sans-serif;color:#1d2433"><p style="font-size:16px">New sales lead</p><table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px">${body}</table></div>`;
}

function textBody(lead: Record<string, unknown>): string {
  return rowsFor(lead).map(([label, value]) => `${label}: ${oneLine(value)}`).join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true }, 204);
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const secret = namedKey(Deno.env.get("SUPABASE_SECRET_KEYS"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const publishable = namedKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"), Deno.env.get("SUPABASE_ANON_KEY"));
  if (!url || !secret || !publishable) return json({ ok: true, email: "not_sent", reason: "config" });

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "sign_in" }, 401);

  let body: { id?: unknown; retry?: unknown } = {};
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "id" }, 400);
  }
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: "id" }, 400);

  const userClient = createClient(url, publishable, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: "sign_in" }, 401);

  const { data: visible, error: seeErr } = await userClient.from("sales_leads").select("id").eq("id", id).maybeSingle();
  if (seeErr || !visible) return json({ error: "not_found" }, 404);

  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const claimStates = body.retry ? ["pending", "failed", "sending"] : ["pending", "failed"];
  const { data: claimed, error: claimErr } = await admin
    .from("sales_leads")
    .update({ email_status: "sending", email_error: null })
    .eq("id", id)
    .in("email_status", claimStates)
    .select("*")
    .maybeSingle();
  if (claimErr) return json({ ok: true, email: "not_sent", reason: "config" });
  if (!claimed) {
    const { data: current } = await admin.from("sales_leads").select("email_status").eq("id", id).maybeSingle();
    if (current && current.email_status === "sent") return json({ ok: true, email: "sent" });
    return json({ ok: true, email: "not_sent", reason: "busy" });
  }

  const lead = claimed as Record<string, unknown>;
  const hotel = oneLine(lead.hotel);
  const contact = oneLine(`${lead.contact_first || ""} ${lead.contact_last || ""}`);
  const subject = subjectLine(hotel, contact);
  let reason = "";
  let sent = false;
  const from = oneLine(Deno.env.get("HOTELHQ_GMAIL_USER") || "");
  const password = (Deno.env.get("HOTELHQ_GMAIL_APP_PASSWORD") || "").replace(/[\r\n]/g, "").trim();
  const { data: route } = await admin.from("sales_lead_routes").select("emails").eq("hotel", hotel).maybeSingle();
  const to = ((route && route.emails) || []).map((item: unknown) => oneLine(item).toLowerCase()).filter(isEmail);

  try {
    if (!isEmail(from)) reason = "no_from";
    else if (!password) reason = "no_password";
    else if (!to.length) reason = "no_route";
    else {
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: from,
            password
          }
        }
      });
      try {
        await client.send({
          from,
          to,
          subject,
          content: textBody(lead),
          html: htmlBody(lead)
        });
        sent = true;
      } finally {
        try {
          await client.close();
        } catch (_close) {
          /* The send result is what gets stored. */
        }
      }
    }
  } catch (_e) {
    reason = "provider";
  }

  const { error: markErr } = await admin.from("sales_leads").update({
    email_status: sent ? "sent" : "failed",
    email_error: sent ? null : (reason || "provider"),
    emailed_at: sent ? new Date().toISOString() : null
  }).eq("id", id);
  if (markErr && sent) return json({ ok: true, email: "sent" });
  return json({ ok: true, email: sent ? "sent" : "not_sent", reason: sent ? "" : (reason || "provider") });
});
