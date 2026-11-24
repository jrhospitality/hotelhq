// HotelHQ: answer a staff question from one how-to section.
//
// The app already picked the matching guide section. This function only
// rephrases those steps. It does not search the web and it does not see
// guest or staff records.
//
// Jay sets this Edge Function secret. Do not commit the value.
// Dashboard → Edge Functions → Secrets, or:
//   supabase secrets set HOTELHQ_ASK_API_KEY=value
//
//   HOTELHQ_ASK_API_KEY   Required for a model answer. An OpenAI-compatible
//                         API key. If it is missing, the function returns
//                         { configured: false } and the app shows the
//                         guide steps themselves.
//   HOTELHQ_ASK_API_URL   Optional. Defaults to
//                         https://api.openai.com/v1/chat/completions
//   HOTELHQ_ASK_MODEL     Optional. Defaults to gpt-4o-mini.
//
// Deploy with JWT verification left on (the platform default):
//   supabase functions deploy ask-hotelhq
//
// Demo mode never calls this function.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DEFAULT_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

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

function oneLine(value: unknown, max: number): string {
  return String(value == null ? "" : value).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const key = (Deno.env.get("HOTELHQ_ASK_API_KEY") || "").replace(/[\r\n]/g, "").trim();
  if (!key) return json({ configured: false, answer: null });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch (_e) { return json({ configured: true, answer: "UNKNOWN" }); }

  const sectionId = oneLine(body.sectionId, 40);
  const title = oneLine(body.title, 120);
  const question = oneLine(body.question, 400);
  const lang = body.lang === "es" ? "es" : "en";
  const steps = Array.isArray(body.steps) ? body.steps.map((line) => oneLine(line, 400)).filter(Boolean).slice(0, 8) : [];
  if (!sectionId || !question || !steps.length) return json({ configured: true, sectionId: sectionId, answer: "UNKNOWN" });

  const url = oneLine(Deno.env.get("HOTELHQ_ASK_API_URL") || DEFAULT_URL, 200) || DEFAULT_URL;
  const model = oneLine(Deno.env.get("HOTELHQ_ASK_MODEL") || DEFAULT_MODEL, 60) || DEFAULT_MODEL;
  const language = lang === "es" ? "Spanish" : "English";
  const system = [
    "You answer hotel staff from one how-to section.",
    "Use only the steps given to you. Do not add steps, numbers, names, or policies.",
    "If the steps do not answer the question, reply with exactly UNKNOWN.",
    "Write the answer in " + language + ".",
    "Keep it under 120 words. Put each step on its own line."
  ].join(" ");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + key },
      body: JSON.stringify({
        model: model,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: "Section: " + title + "\nSteps:\n- " + steps.join("\n- ") + "\nQuestion: " + question }
        ]
      })
    });
  } catch (_e) {
    return json({ configured: true, sectionId: sectionId, answer: null });
  }
  if (!response.ok) return json({ configured: true, sectionId: sectionId, answer: null });

  let payload: { choices?: Array<{ message?: { content?: string } }> } = {};
  try { payload = await response.json(); } catch (_e) { return json({ configured: true, sectionId: sectionId, answer: null }); }
  const raw = payload.choices && payload.choices[0] && payload.choices[0].message ? payload.choices[0].message.content : "";
  const answer = String(raw == null ? "" : raw).replace(/\r/g, "").trim().slice(0, 1200);
  if (!answer || answer.toUpperCase() === "UNKNOWN") return json({ configured: true, sectionId: sectionId, answer: "UNKNOWN" });
  return json({ configured: true, sectionId: sectionId, answer: answer });
});
