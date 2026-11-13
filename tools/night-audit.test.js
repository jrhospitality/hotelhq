const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const na = require("../night-audit.js");
const menus = require("../feature-menus.js");

const EARLY = "2026-11-03T15:30:00.000Z";
const DUE = "2026-11-03T16:00:00.000Z";
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261113_night_audit.sql"), "utf8");
const gm = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPAM", name: "Sam Patel" };
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };

function cellText(html) {
  return [...html.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((match) => match[1].replace(/<[^>]+>/g, "").trim());
}

test("Chicago morning clock and the 10:00 due line", () => {
  assert.equal(na.checkinDate(EARLY), "2026-11-03");
  assert.equal(na.zonedParts(EARLY).minutes, 9 * 60 + 30);
  assert.equal(na.zonedParts(DUE).minutes, 10 * 60);
  const early = na.buildDemo(EARLY);
  const due = na.buildDemo(DUE);
  assert.equal(na.statusOf(early, "MSPWE", early.today, early.now), "open");
  assert.equal(na.statusOf(due, "MSPWE", due.today, due.now), "overdue");
  assert.equal(na.statusOf(early, "MSPMS", early.today, early.now), "overdue");
  assert.equal(na.statusOf(early, "MSPAM", early.today, early.now), "open");
  assert.equal(na.statusOf(early, "MSPWE", na.addDays(early.today, -2), early.now), "no_report");
});

test("each hotel sees only itself and corporate sees every hotel", () => {
  assert.deepEqual(na.hotelsFor("GM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(na.hotelsFor("AGM", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(na.hotelsFor("Above Property", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(na.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(na.hotelsFor("Front Desk", "MSPWE"), []);
  assert.equal(na.canAct(agm, "MSPWE"), false);
  assert.equal(na.canAct(corp, "MSPMS"), true);
  assert.equal(menus.menuAllows("naudit", "GM", "MSPWE"), true);
  assert.equal(menus.menuAllows("naudit", "AGM", "MSPAM"), true);
  assert.equal(menus.menuAllows("naudit", "JR Corporate", "MSPMS"), true);
  assert.equal(menus.menuAllows("naudit", "Front Desk", "MSPWE"), false);
  assert.equal(menus.menuAllows("naudit", "Housekeeper", "MSPWE"), false);
  assert.equal(menus.menuAllows("naudit", "GM", "MSPWE", function (_hotel, feature) {
    return feature !== "night_audit";
  }), false);
});

test("sample items are fake, carry forward, and roll up by hotel and category", () => {
  const model = na.buildDemo(DUE);
  model.items.forEach((item) => {
    assert.equal(item.guest.indexOf("Sample "), 0, item.guest);
    assert.equal(item.confirmation.indexOf("DEMO"), 0, item.confirmation);
  });
  const open = na.openItems(model, "MSPWE", model.today);
  assert.equal(open.length, 4);
  assert.equal(open.filter((item) => item.carried).length, 1);
  assert.equal(na.summary(model, "MSPWE", model.today).amount, 1098);
  assert.equal(na.summary(model, "MSPAM", model.today).open, 0);
  assert.equal(na.summary(model, "MSPMS", model.today).amount, 1298);
  const cats = na.categorySummary(model, na.HOTELS, model.today);
  const byId = {};
  cats.forEach((row) => { byId[row.id] = row; });
  assert.equal(cats.length, na.CATEGORIES.length);
  assert.equal(byId.missed.open, 2);
  assert.equal(byId.missed.amount, 403);
  assert.equal(byId.balances.open, 1);
  assert.equal(byId.adjustments.open, 1);
  assert.equal(byId.ar.amount, 1260);
  assert.equal(byId.rates.open, 0);
  assert.equal(byId.cash.open, 0);
  const rows = na.hotelRows(model, na.HOTELS, model.now);
  assert.deepEqual(rows.map((row) => row.status), ["overdue", "overdue", "overdue"]);
  assert.equal(na.streak(model, "MSPAM", model.now), 0);
  assert.equal(na.streak(model, "MSPWE", model.now), 0);
  assert.equal(na.badgeStatus("open", "en"), "Not completed today");
  assert.equal(na.badgeStatus("open", "es"), "Sin completar hoy");
  assert.equal(na.badgeStatus("no_report", "en"), "No report yet");
  assert.equal(na.badgeStatus("on_time", "en"), "Done");
  assert.notEqual(na.badgeStatus("", "en"), "Done");
});

test("resolving clears an item, records a dismissal, and carries what is still open", () => {
  const model = na.buildDemo(EARLY);
  const denied = na.resolve(model, "na-mspwe-noshow", "done", "", desk, EARLY);
  assert.equal(denied.ok, false);
  const otherHotel = na.resolve(model, "na-mspwe-noshow", "done", "", agm, EARLY);
  assert.equal(otherHotel.error, "denied");
  const needsNote = na.resolve(model, "na-mspwe-adj", "explain", "no", gm, EARLY);
  assert.equal(needsNote.error, "note");
  const explained = na.resolve(model, "na-mspwe-adj", "explain", "Posted by the sample GM.", gm, EARLY);
  assert.equal(explained.ok, true);
  assert.equal(na.openItems(explained.model, "MSPWE", model.today).some((item) => item.id === "na-mspwe-adj"), false);
  const dismissed = na.resolve(explained.model, "na-mspwe-vcc", "not_issue", "", gm, EARLY);
  assert.equal(dismissed.ok, true);
  assert.equal(na.isSuppressed({ hotel: "MSPWE", code: "ota_vcc", confirmation: "DEMO-1042" }, dismissed.model.suppressions), true);
  const tomorrow = na.addDays(model.today, 1);
  const still = na.openItems(dismissed.model, "MSPWE", tomorrow);
  assert.equal(still.some((item) => item.id === "na-mspwe-vcc"), false);
  assert.equal(still.some((item) => item.id === "na-mspwe-noshow"), true);
  assert.equal(still.find((item) => item.id === "na-mspwe-noshow").carried, true);

  let current = dismissed.model;
  ["na-mspwe-noshow", "na-mspwe-bill"].forEach((id) => {
    current = na.resolve(current, id, "done", "", gm, EARLY).model;
  });
  assert.equal(na.statusOf(current, "MSPWE", model.today, EARLY), "on_time");
  assert.equal(na.streak(current, "MSPWE", EARLY), 1);
  assert.equal(na.summary(current, "MSPWE", model.today).open, 0);
  const again = na.resolve(current, "na-mspwe-noshow", "done", "", gm, EARLY);
  assert.equal(again.error, "closed");
});

test("an empty morning can be marked complete and the due time moves the overdue line", () => {
  const model = na.buildDemo(EARLY);
  model.items = model.items.filter((item) => item.hotel !== "MSPWE");
  const blocked = na.markComplete(na.buildDemo(EARLY), "MSPWE", gm, EARLY);
  assert.equal(blocked.error, "open");
  const unfed = na.buildDemo(EARLY);
  unfed.reports = [];
  unfed.items = unfed.items.filter((item) => item.hotel !== "MSPWE");
  assert.equal(na.markComplete(unfed, "MSPWE", gm, EARLY).error, "no_report");
  assert.equal(na.statusOf(unfed, "MSPWE", unfed.today, EARLY), "no_report");
  assert.match(na.checkinHtml(unfed, gm, { hotel: "MSPWE", lang: "en", now: EARLY }), /No report yet/);
  assert.equal(na.checkinHtml(unfed, gm, { hotel: "MSPWE", lang: "en", now: EARLY }).includes("Completed by"), false);
  const done = na.markComplete(model, "MSPWE", gm, EARLY);
  assert.equal(done.ok, true);
  assert.equal(na.statusOf(done.model, "MSPWE", model.today, EARLY), "on_time");
  const earlier = na.setDue(na.buildDemo(EARLY), "MSPWE", "07:00", gm);
  assert.equal(na.statusOf(earlier.model, "MSPWE", earlier.model.today, EARLY), "overdue");
  assert.equal(na.setDue(na.buildDemo(EARLY), "MSPWE", "06:00", gm).ok, false);
  assert.equal(na.setDue(na.buildDemo(EARLY), "MSPWE", "07:00", desk).ok, false);
  const saved = na.applySaved(na.buildDemo(EARLY), { v: 1, settings: { MSPMS: "11:00" } });
  assert.equal(na.statusOf(saved, "MSPMS", saved.today, EARLY), "open");
});

test("the parser accepts the sample line format and waits for real PMS files", () => {
  const body = [
    "NA|MSPWE|2026-11-02|missed|pet_fee|Sample Guest Ellis|DEMO-0990|75|118",
    "NA|MSPWE|2026-11-02|missed|noshow_uncharged|Sample Guest Ames|DEMO-1008|189|120"
  ].join("\n");
  const model = na.buildDemo(EARLY);
  const parsed = na.ingest({ hotel: "MSPWE", auditDate: "2026-11-02", body: body }, model.suppressions);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.suppressed, 1);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].confirmation, "DEMO-1008");
  const opera = na.parseReport({
    hotel: "MSPWE", auditDate: "2026-11-02", subject: "IHG Opera night audit", body: "Trial balance"
  });
  assert.equal(opera.status, "awaiting_sample");
  assert.equal(opera.source, "opera");
  assert.equal(opera.items.length, 0);
  assert.equal(na.detectSource("OnQ night audit", ""), "onq");
  assert.equal(na.detectSource("Marriott FOSSE", ""), "marriott");
  assert.equal(na.parseReport({ hotel: "REAL", auditDate: "2026-11-02", body: "" }).reason, "hotel");
  assert.equal(na.registerParser("opera", function () {
    return { ok: true, items: [{ confirmation: "DEMO-1" }], rows: [] };
  }), true);
  assert.equal(na.parseReport({ hotel: "MSPWE", auditDate: "2026-11-02", source: "opera", body: "" }).items.length, 1);
});

test("the check-in is one bilingual screen and table cells stay short", () => {
  const model = na.buildDemo(EARLY);
  const html = na.checkinHtml(model, gm, { hotel: "MSPWE", lang: "en", now: EARLY });
  assert.match(html, /Sample Guest Ames/);
  assert.match(html, /DEMO-1001/);
  assert.match(html, /Guaranteed no-show was not charged/);
  assert.match(html, /Post the no-show charge/);
  assert.match(html, /\$189/);
  assert.match(html, /Not an issue/);
  assert.match(html, /Not completed today/);
  assert.match(html, /Carried/);
  assert.equal(html.includes("na-mspms-ar"), false);
  cellText(html).forEach((cell) => assert.equal(cell.includes(" "), false, cell));
  const es = na.checkinHtml(model, gm, { hotel: "MSPWE", lang: "es", now: EARLY });
  assert.match(es, /No es problema/);
  assert.match(es, /Sin completar hoy/);
  assert.match(es, /No-show garantizado sin cargo/);
  assert.match(es, /Arrastrado/);
  assert.match(na.homeCard(model, gm, "en"), /Not completed today/);
  const corpHtml = na.homeCard(model, corp, "en");
  assert.match(corpHtml, /id="naHome"/);
  assert.match(corpHtml, /3 not done/);
  assert.match(corpHtml, />Open</);
  assert.match(corpHtml, />MSPWE</);
  assert.match(corpHtml, />MSPAM</);
  assert.match(corpHtml, />MSPMS</);
  assert.equal(corpHtml.includes("Sample Guest"), false);
  cellText(corpHtml).forEach((cell) => assert.equal(cell.includes(" "), false, cell));
  assert.equal(na.homeCard(model, desk, "en"), "");
  assert.equal(na.checkinHtml(model, desk, { lang: "en" }), "");
  const late = na.buildDemo(DUE);
  assert.match(na.homeCard(late, gm, "en"), /Overdue/);
  assert.match(na.homeCard(late, corp, "es"), /Atrasado/);
});

test("live mode reads a HotelKey feed and keeps the sample check-in in demo", () => {
  assert.equal(na.demoUi({ mode: "live" }), false);
  assert.equal(na.demoUi({ mode: "demo" }), true);
  assert.equal(na.demoUi(null), true);
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home-focus.js"), "utf8");
  const src = fs.readFileSync(path.join(root, "night-audit.js"), "utf8");
  assert.match(html, /night-audit\.js/);
  assert.match(sw, /night-audit\.js/);
  assert.match(sw, /hotelhq-shell-v24/);
  assert.match(home, /NightAudit\.homeHtml/);
  assert.match(src, /!\s*demoUi\(\)/);
  assert.match(src, /source", "hotelkey"/);
  assert.doesNotMatch(src, /if \(typeof document === "undefined" \|\| !demoUi\(\)\) return/);
  const logic = src.slice(src.indexOf("function hasReport"), src.indexOf("function streak"));
  assert.match(logic, /return "no_report"/);
  assert.equal(/authMode|HOTELHQ_CONFIG/.test(logic), false);
  assert.equal(na.badgeStatus("no_report", "en"), "No report yet");
  assert.equal(na.badgeStatus("overdue", "en"), "Overdue");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /private\.my_role\(\) in \('gm', 'agm'\)/);
  assert.match(sql, /night_audit_report_rows/);
  assert.match(sql, /awaiting_sample/);
  assert.match(sql, /'done', 'not_issue', 'explain'/);
  assert.match(sql, /time '10:00'/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /security definer/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /revoke all on function public\.resolve_night_audit_item/);
  assert.match(sql, /grant execute on function public\.resolve_night_audit_item/);
  assert.match(sql, /to authenticated/);
  assert.match(sql, /'night_audit'/);
  assert.match(sql, /would drop newer features/);
  assert.doesNotMatch(sql, /drop constraint if exists hotel_features_feature_check/);
  assert.doesNotMatch(sql, /create or replace function private\.set_hotel_feature/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /to anon,/);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /sb_publishable_|eyJ/);
  na.CATEGORIES.forEach((cat) => assert.match(sql, new RegExp("'" + cat.id + "'")));
});

test("a HotelKey feed shows reported counts and does not invent room lists", () => {
  const built = na.reportFromRows({
    hotel: "MSPWE",
    auditDate: "2026-11-02",
    source: "hotelkey",
    status: "parsed",
    rows: [
      { section: "gm_occupancy", cells: { metric: "occupancy_pct", today: 70, mtd: 68.5, ytd: 72.3 } },
      { section: "gm_revenue", cells: { metric: "adr", today: 110, mtd: 108.25, ytd: 105 } },
      { section: "gm_revenue", cells: { metric: "revpar", today: 77, mtd: 74.16, ytd: 75.86 } },
      { section: "gm_statistics", cells: { metric: "ooo_rooms", today: 2, mtd: 4, ytd: 10 } },
      { section: "gm_statistics", cells: { metric: "dirty_rooms", today: 20, mtd: 30, ytd: 40 } },
      { section: "gm_statistics", cells: { metric: "clean_rooms", today: 80, mtd: 90, ytd: 100 } },
      { section: "gm_statistics", cells: { metric: "ready_rooms", today: 75, mtd: 80, ytd: 90 } },
      { section: "gm_statistics", cells: { metric: "early_departures", today: 5, mtd: 6, ytd: 7 } },
      { hotel: "MSPAM", section: "early_departures", cells: { room: "999", confirmation: "DEMO-9999", guest_name: "Sample Guest Other" } },
      { section: "early_departures", cells: { room: "101", confirmation: "DEMO-2001", guest_name: "Sample Guest Ellis", kind: "early_departure" } },
      { section: "reservations", cells: { confirmation: "DEMO-3001" } }
    ],
    items: [{
      id: "na-ex-override", hotel: "MSPWE", audit_date: "2026-11-02", category: "rates", code: "override_no_reason",
      guest_name: "Sample Guest Cole", confirmation: "DEMO-1045", amount: 0
    }]
  });
  assert.equal(built.connected, true);
  assert.equal(built.lines.find((line) => line.key === "occupancy").today, 70);
  assert.equal(built.lines.find((line) => line.key === "adr").today, 110);
  assert.equal(built.lines.find((line) => line.key === "revpar").today, 77);
  assert.equal(built.ooo.today, 2);
  assert.deepEqual(built.ooo.rooms, []);
  assert.equal(built.early.gmToday, 5);
  assert.equal(built.early.rooms.length, 1);
  assert.equal(built.early.rooms[0].room, "101");
  assert.equal(built.extensions.count, 0);
  assert.deepEqual(built.extensions.rooms, []);
  assert.equal(built.sections.find((section) => section.id === "reservations").count, 1);
  assert.equal(built.items.length, 1);
  assert.equal(built.items[0].guest, "Sample Guest Cole");
  const html = na.feedHtml(built, "en");
  assert.match(html, /70\.0%/);
  assert.match(html, /\$110\.00/);
  assert.match(html, /\$77\.00/);
  assert.match(html, /no room list/i);
  assert.match(html, /0 stay extensions/);
  assert.match(html, /GM count is 5/);
  assert.match(html, /Room 101|101/);
  assert.match(html, /Sample Guest Ellis/);
  assert.equal(html.includes("999"), false);
  assert.equal(html.includes("Sample Guest Other"), false);
  const off = na.feedHtml(na.feedForHotel(built, "MSPAM"), "en");
  assert.match(off, /Feed not connected/);
  assert.equal(off.includes("Sample Guest"), false);
  assert.equal(off.includes("70.0%"), false);
  const sample = na.exampleFeed();
  sample.items.forEach((item) => {
    assert.equal(item.guest.indexOf("Sample "), 0);
    assert.equal(item.confirmation.indexOf("DEMO"), 0);
  });
  const sampleHtml = na.feedHtml(sample, "en");
  assert.match(sampleHtml, /EXAMPLE/);
  assert.match(sampleHtml, /Items to review/);
  assert.match(sampleHtml, /Rate override has no reason/);
  assert.equal(sampleHtml.includes("62.39"), false);
  assert.equal(/[1-9][0-9]{7}/.test(sampleHtml), false);
});
