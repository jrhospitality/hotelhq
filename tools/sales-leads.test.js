const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const sl = require("../sales-leads.js");

const TODAY = "2026-10-29T16:00:00.000Z";
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261031_sales_leads.sql"), "utf8");
const fn = fs.readFileSync(path.join(__dirname, "../supabase/functions/sales-lead-email/index.ts"), "utf8");

test("front desk, AGM, GM, and corporate can file; managers can update", () => {
  ["Front Desk", "front_desk", "AGM", "agm", "GM", "gm", "Above Property", "JR Corporate", "above_property"].forEach((role) => {
    assert.equal(sl.canCapture(role), true, role);
  });
  ["Sales Manager", "sales_manager", "Housekeeping", "Housekeeper", "Maintenance", ""].forEach((role) => {
    assert.equal(sl.canCapture(role), false, role);
  });
  ["GM", "AGM", "JR Corporate", "Sales Manager", "sales_manager"].forEach((role) => {
    assert.equal(sl.canManage(role), true, role);
  });
  assert.equal(sl.canManage("Front Desk"), false);
  assert.equal(sl.canConfigure("GM"), true);
  assert.equal(sl.canConfigure("JR Corporate"), true);
  assert.equal(sl.canConfigure("AGM"), false);
  assert.equal(sl.canConfigure("Sales Manager"), false);
  assert.equal(sl.canConfigure("Front Desk"), false);
});

test("a lead needs a real name plus a phone or a valid email", () => {
  const base = { hotel: "MSPWE", first: "Alex", last: "Example", phone: "", email: "", needs: ["Local Negotiated Rate"], other: "", start: "", end: "", notes: "" };
  assert.equal(sl.validateLead(base).error, "contact");
  assert.equal(sl.validateLead(Object.assign({}, base, { last: "" })).error, "name");
  assert.equal(sl.validateLead(Object.assign({}, base, { phone: "555-12" })).error, "phone");
  assert.equal(sl.validateLead(Object.assign({}, base, { email: "alex@" })).error, "email");
  assert.equal(sl.validateLead(Object.assign({}, base, { phone: "(555) 010-0142", needs: [] })).error, "needs");
  assert.equal(sl.validateLead(Object.assign({}, base, { phone: "(555) 010-0142", needs: ["Other"], other: "" })).error, "other");
  assert.equal(sl.validateLead(Object.assign({}, base, { phone: "(555) 010-0142", start: "2026-11-10", end: "2026-11-01" })).error, "dates");
  const ok = sl.validateLead(Object.assign({}, base, { email: "Alex.Example@Example.Test", needs: ["Other", "Group Block"], other: "FAKE dinner" }));
  assert.equal(ok.ok, true);
  assert.equal(ok.value.contactEmail, "alex.example@example.test");
  assert.deepEqual(ok.value.needs, ["Other", "Group Block"]);
  assert.equal(sl.cleanEmails([" Sales.Demo@Example.Test ", "", "sales.demo@example.test"]).emails.length, 1);
  assert.equal(sl.cleanEmails(["not-an-email"]).ok, false);
});

test("the subject names the hotel and the contact", () => {
  assert.equal(sl.subjectLine("MSPWE", "Alex\n", " Example "), "New sales lead - MSPWE - Alex Example");
  assert.match(fn, /New sales lead - \$\{hotel\} - \$\{contact\}/);
  assert.match(fn, /Deno\.env\.get\("HOTELHQ_GMAIL_USER"\)/);
  assert.match(fn, /Deno\.env\.get\("HOTELHQ_GMAIL_APP_PASSWORD"\)/);
  assert.match(fn, /smtp\.gmail\.com/);
  assert.match(fn, /port:\s*465/);
  assert.match(fn, /tls:\s*true/);
  assert.match(fn, /sales_lead_routes/);
  assert.match(fn, /email_status/);
  assert.match(fn, /emailed_at/);
  assert.match(fn, /email_error/);
  assert.match(fn, /&lt;/);
  assert.doesNotMatch(fn, /RESEND_API_KEY|SALES_LEAD_FROM|api\.resend\.com/);
  assert.doesNotMatch(fn, /re_[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(fn, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
});

test("demo contacts are fake and this week's new count is one per hotel", () => {
  const demo = sl.buildDemo(TODAY);
  assert.equal(sl.weekStart("2026-10-29"), "2026-10-26");
  assert.equal(sl.chicagoDate("2026-10-29T03:30:00.000Z"), "2026-10-28");
  assert.equal(sl.countNewThisWeek(demo.leads, "MSPWE", TODAY), 1);
  assert.equal(sl.countNewThisWeek(demo.leads, "MSPAM", TODAY), 1);
  assert.equal(sl.countNewThisWeek(demo.leads, "MSPMS", TODAY), 1);
  assert.deepEqual(demo.routes, { MSPWE: [], MSPAM: [], MSPMS: [] });
  demo.leads.forEach((row) => {
    assert.equal(row.example, true);
    assert.match(row.notes, /FAKE/);
    if (row.contactEmail) assert.match(row.contactEmail, /@example\.test$/);
    if (row.contactPhone) assert.match(row.contactPhone, /555/);
    assert.equal(sl.telHref("(555) 010-0142"), "tel:+15550100142");
  });
  const lost = demo.leads.filter((row) => row.status === "Lost");
  assert.equal(sl.inThisWeek(lost[0].createdAt, TODAY), false);
});

test("the form is bilingual and asks to read the email back", () => {
  ["Sales Lead", "Read it back to the guest.", "Enter a phone number or an email.", "Email not sent", "New leads this week", "Local Negotiated Rate", "Group Block", "Meeting Space", "Other"].forEach((en) => {
    assert.notEqual(sl.label(en, "es"), en);
  });
  const html = sl.formHtml(
    { first: "", last: "", phone: "", email: "", needs: ["Other"], other: "", start: "", end: "", notes: "" },
    { lang: "es", hotelLabel: "MSPWE · HIE&S Golden Valley", staffName: "Jordan Lee", error: "contact", emailWarn: true, saving: false, corporate: false }
  );
  assert.match(html, /Léelo de nuevo al huésped/);
  assert.match(html, /Escribe un teléfono o un correo/);
  assert.match(html, /id="slProperty"/);
  assert.match(html, /Jordan Lee/);
  assert.match(html, /¿Qué más necesita/);
});

test("the migration is additive, private, and has no real addresses", () => {
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function private\.sales_lead_can_capture\(\) from public, anon/);
  assert.match(sql, /revoke all on function public\.save_sales_lead\(text, text, text, text, text, text, text\[\], text, date, date, text\) from public, anon/);
  assert.match(sql, /grant execute on function public\.save_sales_lead\(text, text, text, text, text, text, text\[\], text, date, date, text\) to authenticated/);
  assert.match(sql, /status in \('New', 'Contacted', 'Won', 'Lost'\)/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /truncate/i);
  assert.doesNotMatch(sql, /[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|net|org|test|edu)/i);
  assert.doesNotMatch(sql, /gmail|yahoo|jrhospitality/i);
  const bodies = sql.split(/create or replace function/i).slice(1);
  assert.ok(bodies.length >= 8);
  bodies.forEach((body) => assert.match(body, /set search_path = ''/));
});

test("corporate rollup counts responses and keeps each cell short", () => {
  const demo = sl.buildDemo(TODAY);
  const rows = sl.rollup(demo.leads, sl.HOTELS);
  const by = Object.fromEntries(rows.map((row) => [row.hotel, row]));
  assert.equal(by.MSPWE.total, 2);
  assert.equal(by.MSPWE.responded, 1);
  assert.equal(by.MSPWE.awaiting, 1);
  assert.equal(by.MSPWE.avgHours, 26);
  assert.equal(by.MSPAM.total, 2);
  assert.equal(by.MSPAM.responded, 2);
  assert.equal(by.MSPAM.awaiting, 0);
  assert.equal(by.MSPAM.avgHours, 3.5);
  assert.equal(by.MSPMS.total, 1);
  assert.equal(by.MSPMS.responded, 0);
  assert.equal(by.MSPMS.awaiting, 1);
  assert.equal(by.MSPMS.avgHours, null);
  assert.deepEqual(sl.rollup([], ["MSPWE"]), [{ hotel: "MSPWE", total: 0, responded: 0, awaiting: 0, avgHours: null }]);
  assert.equal(sl.formatHours(26), "26");
  assert.equal(sl.formatHours(3.5), "3.5");
  assert.equal(sl.formatHours(null), "—");

  ["Sales Leads by Hotel", "Leads", "Responded", "Waiting", "Avg response hrs", "Mark responded"].forEach((en) => {
    assert.notEqual(sl.label(en, "es"), en, en);
  });

  const en = sl.rollupCardHtml(demo, { lang: "en", corporate: true });
  assert.match(en, /id="slRollup"/);
  assert.match(en, /Sales Leads by Hotel/);
  assert.match(en, /Avg response hrs/);
  assert.match(en, />26</);
  assert.match(en, />3\.5</);
  assert.match(en, />—</);
  const cells = [...en.matchAll(/<td>([^<]*)<\/td>/g)].map((match) => match[1]);
  assert.equal(cells.length, 15);
  cells.forEach((text) => {
    assert.equal(text.includes(" "), false, text);
    assert.ok(text.length > 0 && text.length <= 8, text);
  });
  assert.deepEqual(cells.filter((_, i) => i % 5 === 0), ["MSPWE", "MSPAM", "MSPMS"]);

  const es = sl.rollupCardHtml(demo, { lang: "es", corporate: true });
  assert.match(es, /Prospectos por hotel/);
  assert.match(es, /En espera/);
  assert.match(es, /Horas prom\. de respuesta/);
  assert.equal(sl.rollupCardHtml(demo, { lang: "en", corporate: false }), "");

  const gm = sl.homeCardHtml(demo, {
    hotel: "MSPWE", lang: "en", canCapture: true, canManage: true, viewRole: "GM", now: TODAY
  });
  assert.doesNotMatch(gm, /id="slRollup"/);
  const corp = sl.homeCardHtml(demo, {
    hotel: "MSPWE", lang: "es", canCapture: true, canManage: true, viewRole: "GM", now: TODAY, corporate: true
  });
  assert.match(corp, /id="slRollup"/);
  assert.match(corp, /Prospectos por hotel/);
  assert.match(corp, /id="slHome"/);

  const mapped = sl.mapLead({
    id: 4, hotel: "MSPWE", created_by_name: "Jordan Lee (EX)",
    contact_first: "Casey", contact_last: "Fictional", needs: ["Other"],
    status: "Lost", created_at: "2026-10-22T16:00:00.000Z", updated_at: "2026-10-23T18:00:00.000Z",
    responded_at: "2026-10-23T18:00:00.000Z", responded_by: "Jordan Lee (EX)"
  });
  assert.equal(mapped.respondedAt, "2026-10-23T18:00:00.000Z");
  assert.equal(mapped.respondedBy, "Jordan Lee (EX)");
  const fromView = sl.mapRollup({ hotel: "MSPAM", total_leads: "2", responded: "2", awaiting: "0", avg_hours: "3.5" });
  assert.equal(fromView.avgHours, 3.5);
});

test("a responded lead shows a Responded badge in English and Spanish", () => {
  const demo = sl.buildDemo(TODAY);
  const en = sl.listHtml(demo, { lang: "en", hotel: "MSPAM", filter: "All", canCapture: true, canManage: true, origin: "example" });
  assert.match(en, /class="sl-badge"/);
  assert.match(en, />Responded</);
  assert.doesNotMatch(en, /Mark responded/);
  const es = sl.listHtml(demo, { lang: "es", hotel: "MSPAM", filter: "All", canCapture: true, canManage: true, origin: "example" });
  assert.match(es, />Respondido</);
  const waiting = sl.listHtml(demo, { lang: "en", hotel: "MSPMS", filter: "All", canCapture: true, canManage: true, origin: "example" });
  assert.doesNotMatch(waiting, /class="sl-badge"/);
  assert.match(waiting, /Mark responded/);
  const waitingEs = sl.listHtml(demo, { lang: "es", hotel: "MSPMS", filter: "All", canCapture: true, canManage: true, origin: "example" });
  assert.match(waitingEs, /Marcar respondido/);
});

test("the response migration is additive and hotel-scoped", () => {
  const next = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261104_lead_responses.sql"), "utf8");
  assert.match(next, /add column if not exists responded_at timestamptz/);
  assert.match(next, /add column if not exists responded_by text/);
  assert.match(next, /security_invoker = true/);
  assert.match(next, /view public\.sales_lead_rollup/);
  assert.match(next, /private\.is_above\(\)/);
  assert.match(next, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(next, /private\.sales_lead_can_manage\(\)/);
  assert.match(next, /set search_path = ''/);
  assert.match(next, /revoke all on table public\.sales_lead_rollup from public, anon, authenticated/);
  assert.match(next, /grant select on table public\.sales_lead_rollup to authenticated/);
  assert.match(next, /revoke all on function public\.mark_sales_lead_responded\(bigint, text\) from public, anon/);
  assert.match(next, /grant execute on function public\.mark_sales_lead_responded\(bigint, text\) to authenticated/);
  assert.doesNotMatch(next, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(next, /drop table/i);
  assert.doesNotMatch(next, /delete from/i);
  assert.doesNotMatch(next, /truncate/i);
  assert.doesNotMatch(next, /[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|net|org|edu)/i);
  assert.doesNotMatch(next, /gmail|yahoo|jrhospitality|service_role|sb_secret/i);
  const bodies = next.split(/create or replace function/i).slice(1);
  assert.equal(bodies.length, 2);
  bodies.forEach((body) => assert.match(body, /set search_path = ''/));
});

test("GM home count only includes New leads from this week", () => {
  const demo = sl.buildDemo(TODAY);
  const html = sl.homeCardHtml(demo, {
    hotel: "MSPWE",
    lang: "en",
    canCapture: true,
    canManage: true,
    viewRole: "GM",
    now: TODAY
  });
  assert.match(html, /id="slCapture"/);
  assert.match(html, /id="slWeek"/);
  assert.match(html, /<b>1<\/b>/);
  assert.match(html, /Fake contacts only/);
  const fd = sl.homeCardHtml(demo, { hotel: "MSPWE", lang: "en", canCapture: true, canManage: false, viewRole: "Front Desk", now: TODAY });
  assert.match(fd, /id="slCapture"/);
  assert.doesNotMatch(fd, /id="slWeek"/);
  const hk = sl.homeCardHtml(demo, { hotel: "MSPWE", lang: "en", canCapture: false, canManage: false, viewRole: "Housekeeping", now: TODAY });
  assert.equal(hk, "");
});
