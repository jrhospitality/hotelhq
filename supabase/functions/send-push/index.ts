// Push sender. pm_assigned is the weekly room-PM batch.
// Secrets stay in the function environment. JWT verification stays off
// because the database cron calls this without a user token.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { translate } from "./translate.ts";

const PORTAL = "https://jbhakta1988.github.io/JR-staff-page/";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
type L = "en" | "es";

const STR = {
  en: { newWO: "New work order", rush: "Rush room", prio: "Priority room", priority: "Priority", ack: "Acknowledge",
        dlNew: "Daily labor", dlOver: "Daily labor overdue", dlItems: "action items", dlStill: "still open at the end of the day",
        realert: "Reminder", escalate: "Escalated - not acknowledged", room: "Room", pmOver: "PM overdue", pmAsg: "PM assigned", due: "Due", rCleaned: "Ready to inspect", rReady: "Room ready", rFailed: "Inspection failed", by: "by", gc: "Guest complaint", gcHigh: "HIGH guest complaint", gcOver: "Complaint open 24h+", pm: "Missing punch", pmStaff: "Please clock in or tell your manager", pmOut: "Please clock out or tell your manager", cm: "Cleans missing", no_clock_in: "No clock-in", no_clock_out: "No clock-out", open_punch: "Open punch over 12h", missing_meal_break: "Missing meal break", no_cleans: "No rooms marked cleaned", open_turn: "Room left in progress", bar_count_missing: "Bar closing count missing", bar_variance: "Bar variance", bar_comp_void: "Comp/void needs approval", bar_cash_over_short: "Bar cash over/short", bar_below_par: "Bar item below par", fd_no_login: "Front desk not logged in", fd_idle: "Front desk inactive in app", shift: "Shift", lastSeen: "Last seen", never: "never", clocked: "Clocked in (HE), not in app" },
  es: { newWO: "Nueva orden de trabajo", rush: "Habitación urgente", prio: "Habitación prioritaria", priority: "Prioridad", ack: "Confirmar",
        dlNew: "Labor del día", dlOver: "Labor del día atrasada", dlItems: "tareas", dlStill: "siguen abiertas al final del día",
        realert: "Recordatorio", escalate: "Escalada - sin confirmar", room: "Habitación", pmOver: "Mantenimiento preventivo vencido", pmAsg: "MP asignado", due: "Vence", rCleaned: "Lista para inspeccionar", rReady: "Habitación lista", rFailed: "Inspección no aprobada", by: "por", gc: "Queja de huésped", gcHigh: "Queja URGENTE de huésped", gcOver: "Queja abierta más de 24h", pm: "Marcación faltante", pmStaff: "Por favor marque su entrada o avise a su gerente", pmOut: "Por favor marque su salida o avise a su gerente", cm: "Limpiezas faltantes", no_clock_in: "Sin entrada", no_clock_out: "Sin salida", open_punch: "Marcación abierta más de 12h", missing_meal_break: "Falta descanso de comida", no_cleans: "Sin habitaciones marcadas limpias", open_turn: "Habitación quedó en progreso", bar_count_missing: "Falta conteo de cierre del bar", bar_variance: "Variación en el bar", bar_comp_void: "Cortesía/anulación requiere aprobación", bar_cash_over_short: "Sobrante/faltante de caja del bar", bar_below_par: "Artículo del bar bajo el nivel par", fd_no_login: "Recepción sin iniciar sesión", fd_idle: "Recepción inactiva en la app", shift: "Turno", lastSeen: "Última vez", never: "nunca", clocked: "Marcó entrada (HE), no en la app" },
};
const PRI_ES: Record<string, string> = { Low: "Baja", Medium: "Media", High: "Alta", Urgent: "Urgente" };

async function tr(row: any, field: string) {
  const orig = (row?.[field] || "") as string;
  let t = row?.i18n?.[field];
  if (!t && orig) { try { t = await translate(orig); } catch { t = null; } }
  return (l: L) => ((t?.[l] ?? orig) as string).slice(0, 80);
}

const EVENTS: Record<string, { roles: string[]; build: (id: number) => Promise<{ extra?: string[]; text: (l: L) => { title: string; body: string }; url: string }> }> = {
  "work_order.created": {
    roles: ["maintenance", "gm", "agm"],
    build: async (id) => {
      const { data: wo } = await db.from("work_orders").select("hotel_id,location,title,description,priority,i18n").eq("id", id).single();
      const d = await tr(wo, wo?.title ? "title" : "description");
      return {
        url: `${PORTAL}#workorders`,
        text: (l) => ({
          title: `${STR[l].newWO} - ${wo?.hotel_id ?? ""}`,
          body: [wo?.location, d(l), wo?.priority && `${STR[l].priority}: ${l === "es" ? (PRI_ES[wo.priority] ?? wo.priority) : wo.priority}`].filter(Boolean).join(" · "),
        }),
      };
    },
  },
  "pm_overdue": {
    roles: ["maintenance"],
    build: async (id) => {
      const { data: t } = await db.from("pm_tasks").select("hotel_id,asset,title_es,due_date").eq("id", id).single();
      return {
        url: `${PORTAL}#pms`,
        text: (l) => ({
          title: `${STR[l].pmOver} - ${t?.hotel_id ?? ""}`,
          body: [l === "es" ? (t?.title_es || t?.asset) : t?.asset, t?.due_date && `${STR[l].due}: ${t.due_date}`].filter(Boolean).join(" · "),
        }),
      };
    },
  },
  "pm_assigned": {
    roles: [],
    build: async (id) => {
      const { data: t } = await db.from("pm_tasks").select("hotel_id,asset,assigned_to,pace_week,pace_schedule_id").eq("id", id).single();
      let titleEn = "PM";
      let titleEs = "MP";
      if (t?.pace_schedule_id) {
        const { data: s } = await db.from("pm_schedules").select("title_en,title_es").eq("id", t.pace_schedule_id).maybeSingle();
        titleEn = s?.title_en || titleEn;
        titleEs = s?.title_es || titleEn;
      }
      let rooms = t?.asset ? [String(t.asset)] : [];
      if (t?.assigned_to && t?.pace_week && t?.pace_schedule_id) {
        const { data: sibs } = await db.from("pm_tasks").select("asset").eq("hotel_id", t.hotel_id).eq("assigned_to", t.assigned_to).eq("pace_week", t.pace_week).eq("pace_schedule_id", t.pace_schedule_id).eq("done", false);
        if (sibs?.length) rooms = sibs.map((row) => String(row.asset)).sort((a, b) => Number(a) - Number(b));
      }
      return {
        extra: t?.assigned_to ? [t.assigned_to] : [],
        url: `${PORTAL}#my`,
        text: (l) => ({
          title: `${STR[l].pmAsg} - ${t?.hotel_id ?? ""}`,
          body: `${l === "es" ? titleEs : titleEn}: ${rooms.join(", ")}`,
        }),
      };
    },
  },
  "complaint.created": { roles: ["gm", "agm"], build: (id) => complaintEvent(id, "gc", true) },
  "complaint.high": { roles: ["gm", "agm"], build: (id) => complaintEvent(id, "gcHigh", true) },
  "complaint_overdue": { roles: ["gm"], build: (id) => complaintEvent(id, "gcOver", false) },
  "punch_missing": { roles: ["gm", "agm"], build: (id) => laborEvent(id, "mgr") },
  "punch_missing_staff": { roles: [], build: (id) => laborEvent(id, "staff") },
  "cleans_missing": { roles: ["gm", "agm", "hk_lead"], build: (id) => laborEvent(id, "cleans") },
  "room_cleaned": { roles: ["hk_lead"], build: (id) => roomEvent(id, "rCleaned", "inspect") },
  "room_ready": { roles: ["front_desk"], build: (id) => roomEvent(id, "rReady", "fd") },
  "room_failed": { roles: [], build: (id) => roomEvent(id, "rFailed", "fail") },
  "bar_count_missing": { roles: ["gm", "agm"], build: (id) => barEvent(id) },
  "bar_variance": { roles: ["gm", "agm"], build: (id) => barEvent(id) },
  "bar_comp_void": { roles: ["gm", "agm"], build: (id) => barEvent(id) },
  "bar_cash_over_short": { roles: ["gm", "agm"], build: (id) => barEvent(id) },
  "bar_below_par": { roles: ["gm", "agm"], build: (id) => barEvent(id) },
  "fd_not_logged_in": { roles: ["gm", "agm"], build: (id) => fdEvent(id) },
  "qotd_team_summary": { roles: ["gm", "agm"], build: (id) => qotdSummaryEvent(id) },
  "labor_daily_created": { roles: ["gm", "agm"], build: (id) => laborDailyEvent(id, "created") },
  "labor_daily_overdue": { roles: ["gm", "agm"], build: (id) => laborDailyEvent(id, "overdue") },
  "hk.rush_room": {
    roles: ["hk_lead"],
    build: async (id) => {
      const { data: a } = await db.from("hk_assignments").select("hotel_id,room_number,priority,assignee,clean_type").eq("id", id).single();
      return {
        extra: a?.assignee ? [a.assignee] : [],
        url: `${PORTAL}#housekeeping`,
        text: (l) => ({
          title: `${a?.priority === "rush" ? STR[l].rush : STR[l].prio} - ${a?.hotel_id ?? ""}`,
          body: [`${STR[l].room} ${a?.room_number ?? ""}`, a?.clean_type].filter(Boolean).join(" · "),
        }),
      };
    },
  },
};

async function qotdSummaryEvent(id: number) {
  const { data: s } = await db.from("qotd_team_summaries").select("hotel_id,week,data").eq("id", id).single();
  const d: any = s?.data ?? {};
  const top = (d.questions ?? []).filter((q: any) => !q.covered_at)[0];
  const imp = (d.important_missed ?? []).filter((q: any) => !q.covered_at).length;
  return {
    url: `${PORTAL}#qotd`,
    text: (l: L) => ({
      title: l === "es" ? `Lo que tu equipo está fallando - ${s?.hotel_id ?? ""}` : `What your team is missing - ${s?.hotel_id ?? ""}`,
      body: [
        l === "es" ? `${d.answered ?? 0} respuestas · ${d.pct ?? "-"}% correctas` : `${d.answered ?? 0} answers · ${d.pct ?? "-"}% correct`,
        imp ? (l === "es" ? `${imp} importante(s) fallada(s)` : `${imp} important missed`) : "",
        top ? (l === "es" ? `Más fallada: ${top.qs}` : `Most missed: ${top.qe}`) : "",
      ].filter(Boolean).join(" · ").slice(0, 180),
    }),
  };
}

async function barEvent(id: number) {
  const { data: a } = await db.from("bar_alerts").select("hotel_id,kind,ref_date,detail").eq("id", id).single();
  const k = (a?.kind ?? "") as string;
  return {
    url: `${PORTAL}#bar`,
    text: (l: L) => ({ title: `${(STR[l] as any)[k] ?? k} - ${a?.hotel_id ?? ""}`, body: [a?.ref_date, a?.detail].filter(Boolean).join(" · ").slice(0, 160) }),
  };
}

async function fdEvent(id: number) {
  const { data: a } = await db.from("fd_login_alerts").select("hotel_id,kind,employee,shift_start,shift_end,last_seen,clocked_in").eq("id", id).single();
  const { data: p } = await db.from("profiles").select("name").eq("user_id", a?.employee).maybeSingle();
  const t = (x?: string) => x ? new Date(x).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" }) : "";
  const k = (a?.kind ?? "fd_no_login") as string;
  return {
    url: `${PORTAL}#dashboard`,
    text: (l: L) => ({ title: `${(STR[l] as any)[k]} - ${a?.hotel_id ?? ""}`,
      body: [p?.name, `${STR[l].shift} ${t(a?.shift_start)}-${t(a?.shift_end)}`, `${STR[l].lastSeen}: ${a?.last_seen ? t(a.last_seen) : STR[l].never}`,
             a?.clocked_in ? STR[l].clocked : null].filter(Boolean).join(" · ").slice(0, 160) }),
  };
}

async function roomEvent(id: number, key: "rCleaned" | "rReady" | "rFailed", kind: string) {
  const { data: t } = await db.from("room_turns").select("hotel_id,room_number,cleaned_by,fail_notes").eq("id", id).single();
  let who = "";
  if (t?.cleaned_by && kind === "inspect") {
    const { data: p } = await db.from("profiles").select("name").eq("user_id", t.cleaned_by).single();
    who = p?.name ?? "";
  }
  let notes: ((l: L) => string) | null = null;
  if (kind === "fail" && t?.fail_notes) {
    let tr: any = null; try { tr = await translate(t.fail_notes); } catch { /* no key */ }
    notes = (l) => ((tr?.[l] ?? t.fail_notes) as string).slice(0, 100);
  }
  return {
    extra: kind === "fail" && t?.cleaned_by ? [t.cleaned_by] : [],
    url: `${PORTAL}#housekeeping`,
    text: (l: L) => ({
      title: `${STR[l][key]} - ${STR[l].room} ${t?.room_number ?? ""}`,
      body: [t?.hotel_id, who && `${STR[l].by} ${who}`, notes?.(l)].filter(Boolean).join(" · "),
    }),
  };
}

const DEPT_ROLE: Record<string, string> = { housekeeping: "hk_lead", maintenance: "maintenance", breakfast: "breakfast",
  shuttle: "shuttle_driver", house_person: "house_person", front_desk: "front_desk" };
async function complaintEvent(id: number, key: "gc" | "gcHigh" | "gcOver", withDept: boolean) {
  const { data: c } = await db.from("guest_complaints").select("hotel_id,room_number,category,department,description,assigned_to,i18n").eq("id", id).single();
  const extra: string[] = c?.assigned_to ? [c.assigned_to] : [];
  const role = withDept && c?.department ? DEPT_ROLE[c.department] : undefined;
  if (role && c) {
    const { data } = await db.from("profiles").select("user_id").eq("hotel_id", c.hotel_id).eq("role", role).eq("active", true);
    for (const p of data ?? []) extra.push((p as any).user_id);
  }
  return {
    extra, url: `${PORTAL}#complaints`,
    text: (l: L) => ({
      title: `${STR[l][key]} - ${c?.hotel_id ?? ""}${c?.room_number ? ` ${STR[l].room} ${c.room_number}` : ""}`,
      body: [c?.category, ((c?.i18n?.description?.[l] ?? c?.description ?? "") as string).slice(0, 120)].filter(Boolean).join(" · "),
    }),
  };
}

async function laborEvent(id: number, mode: "mgr" | "staff" | "cleans") {
  const { data: i } = await db.from("labor_issues").select("hotel_id,department,employee,kind,work_date,detail").eq("id", id).single();
  let name = "";
  const extra: string[] = [];
  if (i?.employee) {
    const { data: p } = await db.from("profiles").select("name").eq("user_id", i.employee).single();
    name = p?.name ?? "";
    if (mode === "staff") extra.push(i.employee);
  }
  const role = mode === "mgr" && i?.department ? DEPT_ROLE[i.department] : undefined;
  if (role && i && role !== "front_desk") {
    const { data } = await db.from("profiles").select("user_id").eq("hotel_id", i.hotel_id).eq("role", role).eq("active", true);
    for (const p of data ?? []) extra.push((p as any).user_id);
  }
  const k = (i?.kind ?? "") as string;
  return {
    extra, url: `${PORTAL}#${mode === "cleans" ? "housekeeping" : "labor"}`,
    text: (l: L) => mode === "staff"
      ? { title: `${(STR[l] as any)[k] ?? STR[l].pm} - ${i?.work_date ?? ""}`, body: k === "no_clock_in" ? STR[l].pmStaff : STR[l].pmOut }
      : { title: `${mode === "cleans" ? STR[l].cm : STR[l].pm} - ${i?.hotel_id ?? ""}`,
          body: [name, (STR[l] as any)[k], i?.work_date, i?.detail].filter(Boolean).join(" · ") },
  };
}

async function laborDailyEvent(id: number, mode: "created" | "overdue") {
  const { data: day } = await db.from("labor_daily_days").select("hotel_id,work_date").eq("id", id).maybeSingle();
  const statuses = mode === "overdue" ? ["overdue"] : ["open", "overdue"];
  const { count } = await db.from("labor_daily_actions").select("id", { count: "exact", head: true })
    .eq("hotel_id", day?.hotel_id ?? "")
    .eq("work_date", day?.work_date ?? "1970-01-01")
    .in("status", statuses);
  const n = count ?? 0;
  return {
    url: `${PORTAL}#dlabor`,
    text: (l: L) => ({
      title: `${mode === "overdue" ? STR[l].dlOver : STR[l].dlNew} - ${day?.hotel_id ?? ""}`,
      body: mode === "overdue"
        ? `${n} ${STR[l].dlStill}`
        : `${n} ${STR[l].dlItems} · ${day?.work_date ?? ""}`,
    }),
  };
}

async function people(hotel: string, roles: string[], extra: string[] = []) {
  const { data } = await db.from("profiles").select("user_id,language,role").eq("hotel_id", hotel).eq("active", true);
  return (data ?? []).filter((p: any) => roles.includes(p.role) || extra.includes(p.user_id));
}

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();
    const { data: cur } = await db.from("notifications").select("*").eq("id", notification_id).single();
    if (!cur?.pending_action) return new Response(JSON.stringify({ skipped: true }));
    const { data: n } = await db.from("notifications").update({ pending_action: null })
      .eq("id", cur.id).eq("pending_action", cur.pending_action).select().single();
    if (!n) return new Response(JSON.stringify({ skipped: true }));
    const action = cur.pending_action as "initial" | "realert" | "escalate";
    const log = (o: any) => db.from("notifications").update(o).eq("id", n.id);

    const ev = EVENTS[n.event];
    if (!ev) { await log({ status: "unknown_event" }); return new Response("ok"); }
    if (n.acknowledged_at) return new Response("acked");
    const c = await ev.build(n.record_id);

    let targets: any[];
    if (action === "initial") {
      targets = await people(n.hotel_id, ev.roles, c.extra);
      await log({ recipients: targets.map((p) => p.user_id) });
    } else {
      const all = await people(n.hotel_id, ["gm", "agm"], n.recipients ?? []);
      targets = action === "escalate" ? all : all.filter((p) => (n.recipients ?? []).includes(p.user_id));
      if (action === "escalate") {
        const esc = all.filter((p) => ["gm", "agm"].includes(p.role)).map((p) => p.user_id);
        await log({ escalated_to: esc });
      }
    }
    const payload = (l: L) => {
      const t = c.text(l);
      const prefix = action === "realert" ? `${STR[l].realert}: ` : action === "escalate" ? `${STR[l].escalate}: ` : "";
      return { title: prefix + t.title, body: t.body, url: c.url, tag: `alert-${n.id}`, renotify: true, lang: l,
               alert_id: n.id, requires_ack: n.requires_ack,
               actions: n.requires_ack ? [{ action: "ack", title: STR[l].ack }] : [] };
    };
    const payloads = { en: payload("en"), es: payload("es") };
    if (!targets.length) { await log({ status: "no_recipients", payload: payloads, sent_at: new Date().toISOString() }); return new Response("ok"); }

    const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!pub || !priv) { await log({ status: "no_vapid_key", payload: payloads, sent_at: new Date().toISOString() }); return new Response("ok"); }
    webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@jrhospitality.com", pub, priv);

    const lang: Record<string, L> = Object.fromEntries(targets.map((p) => [p.user_id, p.language === "es" ? "es" : "en"]));
    const { data: subs } = await db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", targets.map((p) => p.user_id));
    let sent = 0, removed = 0, failed = 0;
    await Promise.all((subs ?? []).map(async (s: any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payloads[lang[s.user_id]]), { TTL: 3600, urgency: "high" });
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) { await db.from("push_subscriptions").delete().eq("id", s.id); removed++; }
        else failed++;
      }
    }));
    await log({ status: subs?.length ? (failed ? "partial" : "sent") : "no_subscriptions", payload: payloads,
      sent_at: new Date().toISOString(), detail: `${action}: sent=${sent} removed=${removed} failed=${failed}` });
    return new Response(JSON.stringify({ action, sent, removed, failed }));
  } catch (e) { return new Response(String(e), { status: 500 }); }
});
