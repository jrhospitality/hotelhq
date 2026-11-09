const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const gc = require("../guest-comments.js");
const menus = require("../feature-menus.js");

const NOW = "2026-11-04T15:00:00.000Z";
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261114_guest_comments.sql"), "utf8");
const gm = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPAM", name: "Sam Patel" };
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const maint = { role: "Maintenance", hotel: "MSPWE", name: "Luis Ortega" };
const exec = { role: "Housekeeping", hotel: "MSPWE", name: "Grace Patel" };
const hk = { role: "Housekeeper", hotel: "MSPWE", name: "Maria Alvarez" };
const otherHk = { role: "Housekeeper", hotel: "MSPMS", name: "Ana Lopez" };

function byId(model, id) {
  return model.comments.find((row) => row.id === id);
}

test("Chicago date, hotel scope, and who can open the screen", () => {
  assert.equal(gc.checkinDate(NOW), "2026-11-04");
  assert.deepEqual(gc.hotelsFor("GM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(gc.hotelsFor("AGM", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(gc.hotelsFor("Above Property", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(gc.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(gc.hotelsFor("Housekeeping", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(gc.hotelsFor("Housekeeper", "MSPMS"), ["MSPMS"]);
  assert.deepEqual(gc.hotelsFor("Front Desk", "MSPWE"), []);
  assert.deepEqual(gc.hotelsFor("Maintenance", "MSPWE"), []);
  assert.equal(gc.canAct(gm, "MSPWE"), true);
  assert.equal(gc.canAct(agm, "MSPWE"), false);
  assert.equal(gc.canAct(corp, "MSPMS"), true);
  assert.equal(gc.canAct(hk, "MSPWE"), false);
  assert.equal(gc.canAct(exec, "MSPWE"), false);
  assert.equal(gc.canAct(desk, "MSPWE"), false);
  ["GM", "AGM", "Above Property", "JR Corporate", "Housekeeping", "Housekeeper"].forEach((role) => {
    assert.equal(menus.menuAllows("gcomm", role, "MSPWE"), true, role);
  });
  assert.equal(menus.menuAllows("gcomm", "Front Desk", "MSPWE"), false);
  assert.equal(menus.menuAllows("gcomm", "Maintenance", "MSPWE"), false);
  assert.equal(menus.menuAllows("gcomm", "Breakfast Attendant", "MSPWE"), false);
  assert.equal(menus.menuAllows("gcomm", "GM", "MSPWE", function (_hotel, feature) {
    return feature !== "guest_comments";
  }), false);
});

test("sample comments are fake and every theme and source is represented", () => {
  const model = gc.buildDemo(NOW);
  const themes = {};
  const sources = {};
  model.comments.forEach((row) => {
    assert.equal(row.textEn.indexOf("Sample comment."), 0, row.id);
    assert.equal(row.textEs.indexOf("Comentario de ejemplo."), 0, row.id);
    assert.equal(row.textEn.includes("@"), false);
    themes[row.theme] = 1;
    sources[row.source] = 1;
  });
  gc.THEMES.forEach((theme) => assert.equal(themes[theme.id], 1, theme.id));
  ["medallia", "ihg", "booking", "ctrip", "google", "expedia"].forEach((source) => {
    assert.equal(sources[source], 1, source);
  });
  assert.equal(model.feed.status, "awaiting_feed");
});

test("staff match the room and the stay, and a miss stays blank", () => {
  const model = gc.buildDemo(NOW);
  const latch = gc.attribute(byId(model, "gc-mspwe-latch"), model.sources);
  assert.equal(latch.housekeeper, "Maria Alvarez");
  assert.equal(latch.inspector, "Grace Patel");
  assert.equal(latch.frontDesk, "Jordan Lee");
  assert.deepEqual(latch.breakfast, ["Joy Adams"]);
  const mold = gc.attribute(byId(model, "gc-mspwe-mold"), model.sources);
  assert.equal(mold.housekeeper, "Sample Attendant Ortiz");
  assert.equal(mold.inspector, "");
  assert.equal(mold.frontDesk, "");
  assert.deepEqual(mold.breakfast, ["Joy Adams"]);
  const wifi = gc.attribute(byId(model, "gc-mspwe-wifi"), model.sources);
  assert.equal(wifi.housekeeper, "");
  assert.equal(wifi.inspector, "");
  assert.equal(wifi.frontDesk, "");
  assert.deepEqual(wifi.breakfast, []);
  const lot = gc.attribute(byId(model, "gc-mspwe-parking"), model.sources);
  assert.equal(lot.housekeeper, "");
  assert.equal(lot.frontDesk, "");
  const board = gc.contextFrom({
    rooms: [{ hotel: "MSPWE", date: "2026-11-02", room: "214", hk: "Maria Alvarez (EX)" }],
    inspections: [{ hotel: "MSPWE", date: "2026-11-02", room: "214", by: "Grace Patel (EX)" }],
    shifts: [
      { hotel: "MSPWE", date: "2026-11-01", pos: "Front Desk", who: "Jordan Lee", start: "07:00", end: "15:00" },
      { hotel: "MSPWE", date: "2026-11-02", pos: "Breakfast Attendant", who: "Joy Adams", start: "05:30", end: "13:30" },
      { scope: "MSPWE", date: "2026-11-03", pos: "Breakfast Attendant", who: "Sample Breakfast Quinn", start: "05:30", end: "13:30" }
    ]
  });
  const fromBoard = gc.attribute(byId(model, "gc-mspwe-latch"), board);
  assert.equal(fromBoard.housekeeper, "Maria Alvarez");
  assert.equal(fromBoard.inspector, "Grace Patel");
  assert.equal(fromBoard.frontDesk, "Jordan Lee");
  assert.deepEqual(fromBoard.breakfast, ["Joy Adams", "Sample Breakfast Quinn"]);
  const missed = gc.attribute(byId(model, "gc-mspwe-latch"), gc.contextFrom({
    shifts: [{ hotel: "MSPWE", date: byId(model, "gc-mspwe-latch").arrival, pos: "Front Desk", who: "Jordan Lee", start: "15:00", end: "23:00" }]
  }));
  assert.equal(missed.frontDesk, "");
  assert.equal(missed.housekeeper, "");
});

test("suggested actions and leader clearing", () => {
  const model = gc.buildDemo(NOW);
  assert.equal(gc.suggest(byId(model, "gc-mspwe-latch")).en, "Open a maintenance work order for the latch plate.");
  assert.equal(gc.suggest(byId(model, "gc-mspwe-mold")).kind, "work_order");
  assert.equal(gc.suggest(byId(model, "gc-mspwe-wifi")).en, "Coach the front desk on the wifi steps.");
  assert.equal(gc.suggest(byId(model, "gc-mspwe-praise")).en, "Send praise recognition to the staff named.");
  assert.equal(gc.tally(model, ["MSPWE"]).fresh, 9);
  assert.equal(gc.tally(model, ["MSPWE"]).open, 1);
  assert.equal(gc.tally(model, gc.HOTELS).fresh, 16);
  assert.equal(gc.tally(model, gc.HOTELS).open, 1);
  assert.equal(gc.act(model, "gc-mspwe-latch", "actioned", desk, NOW).error, "denied");
  assert.equal(gc.act(model, "gc-mspwe-latch", "actioned", agm, NOW).error, "denied");
  assert.equal(gc.act(model, "gc-mspwe-latch", "actioned", hk, NOW).error, "denied");
  const done = gc.act(model, "gc-mspwe-latch", "actioned", gm, NOW);
  assert.equal(done.ok, true);
  assert.equal(gc.statusOf(byId(done.model, "gc-mspwe-latch"), done.model.actions), "actioned");
  assert.equal(gc.tally(done.model, ["MSPWE"]).fresh, 8);
  const dismissed = gc.act(done.model, "gc-mspwe-mold", "not_issue", gm, NOW);
  assert.equal(gc.statusOf(byId(dismissed.model, "gc-mspwe-mold"), dismissed.model.actions), "not_issue");
  const assigned = gc.act(dismissed.model, "gc-mspwe-wifi", "assign", corp, NOW);
  assert.equal(assigned.created.kind, "task");
  assert.equal(assigned.created.hotel, "MSPWE");
  const order = gc.act(model, "gc-mspwe-latch", "assign", gm, NOW);
  assert.equal(order.created.kind, "work_order");
  assert.equal(order.created.room, "214");
  assert.equal(gc.act(order.model, "gc-mspwe-latch", "assign", gm, NOW).error, "closed");
  const cleared = gc.act(order.model, "gc-mspwe-latch", "actioned", gm, NOW);
  assert.equal(gc.statusOf(byId(cleared.model, "gc-mspwe-latch"), cleared.model.actions), "actioned");
  assert.equal(gc.act(model, "gc-mspwe-noise", "actioned", gm, NOW).error, "closed");
});

test("leader scores show year and month against the benchmark, corporate side by side", () => {
  const model = gc.buildDemo(NOW);
  const overall = gc.scoreRow(model, "MSPWE", "overall");
  assert.equal(overall.ytd.actual, 8);
  assert.equal(overall.ytd.bench, 8.4);
  assert.equal(overall.ytd.gap, -0.4);
  assert.equal(overall.mtd.actual, 8);
  assert.equal(overall.mtd.gap, -0.4);
  assert.equal(gc.scoreRow(model, "MSPWE", "recommend").ytd.actual, 8.5);
  assert.equal(gc.scoreRow(model, "MSPWE", "recommend").ytd.gap, 0.3);
  assert.equal(gc.scoreRow(model, "MSPWE", "recommend").mtd.actual, 9);
  assert.equal(gc.scoreRow(model, "MSPWE", "condition").ytd.gap, -0.6);
  assert.equal(gc.scoreRow(model, "MSPWE", "checkin").mtd.gap, -0.6);
  assert.equal(gc.scoreRow(model, "MSPAM", "overall").mtd.actual, 9);
  assert.equal(gc.scoreRow(model, "MSPAM", "overall").ytd.actual, 8);
  assert.equal(gc.scoreRow(model, "MSPMS", "overall").mtd.actual, 6);
  assert.equal(gc.scoreRow(model, "MSPMS", "overall").ytd.actual, 7);
  const home = gc.homeCard(model, gm, "en");
  assert.match(home, /id="gcHome"/);
  assert.match(home, /id="gcScores"/);
  assert.match(home, /9 new/);
  assert.match(home, /1 open action/);
  assert.match(home, /Overall Experience/);
  assert.match(home, /Likely to Recommend/);
  assert.match(home, /Hotel Condition/);
  assert.match(home, /Check-In/);
  assert.match(home, /YTD/);
  assert.match(home, /MTD/);
  assert.match(home, /Benchmark 8.4/);
  assert.match(home, /Gap -0.4/);
  assert.equal(home.includes("MSPAM"), false);
  assert.equal(home.includes("id=\"gcClean\""), false);
  assert.equal(home.includes("Room Cleanliness"), false);
  const corpHtml = gc.scoresCard(model, corp, "en");
  assert.match(corpHtml, />MSPWE</);
  assert.match(corpHtml, />MSPAM</);
  assert.match(corpHtml, />MSPMS</);
  assert.match(gc.homeCard(model, corp, "es"), /16 nuevos/);
  assert.match(gc.homeCard(model, corp, "es"), /Experiencia general/);
  assert.match(gc.homeCard(model, corp, "es"), /Brecha/);
  assert.equal(gc.homeCard(model, desk, "en"), "");
  assert.equal(gc.homeCard(model, maint, "en"), "");
  assert.equal(gc.pageHtml(model, desk, { lang: "en" }), "");
});

test("housekeeping sees cleanliness scores, and mentions stay with the person who cleaned", () => {
  const model = gc.buildDemo(NOW);
  const clean = gc.scoreRow(model, "MSPWE", "cleanliness");
  assert.equal(clean.ytd.actual, 7.5);
  assert.equal(clean.ytd.bench, 8.3);
  assert.equal(clean.ytd.gap, -0.8);
  assert.equal(clean.mtd.actual, 8);
  const team = gc.mentions(model, "MSPWE");
  assert.deepEqual(team, [
    { name: "Maria Alvarez", praise: 1, complaint: 1 },
    { name: "Sample Attendant Ortiz", praise: 0, complaint: 1 }
  ]);
  const execHtml = gc.homeCard(model, exec, "en");
  assert.match(execHtml, /id="gcClean"/);
  assert.match(execHtml, /Room Cleanliness/);
  assert.match(execHtml, /Benchmark 8.3/);
  assert.match(execHtml, /Maria Alvarez/);
  assert.match(execHtml, /Sample Attendant Ortiz/);
  assert.match(execHtml, /Praise 1/);
  assert.match(execHtml, /Complaints 1/);
  assert.equal(execHtml.includes("id=\"gcScores\""), false);
  assert.equal(execHtml.includes("Overall Experience"), false);
  const mine = gc.homeCard(model, hk, "en");
  assert.match(mine, /Your cleanliness mentions/);
  assert.match(mine, /Praise 1/);
  assert.match(mine, /Complaints 1/);
  assert.equal(mine.includes("Sample Attendant Ortiz"), false);
  assert.equal(mine.includes("Rosa Vega"), false);
  const spanish = gc.homeCard(model, exec, "es");
  assert.match(spanish, /Limpieza de la habitación/);
  assert.match(spanish, /Elogios/);
  assert.match(spanish, /Quejas/);
  const ana = gc.cleanCard(model, otherHk, "en");
  assert.match(ana, /Praise 0/);
  assert.match(ana, /Complaints 1/);
  assert.equal(ana.includes("Maria Alvarez"), false);
  const page = gc.pageHtml(model, hk, { lang: "en", hotel: "MSPWE" });
  assert.match(page, /Hair was left in the tub/);
  assert.match(page, /left the room spotless/);
  assert.equal(page.includes("not vacuumed"), false);
  assert.equal(page.includes("latch plate"), false);
  const execPage = gc.pageHtml(model, exec, { lang: "en", hotel: "MSPWE" });
  assert.match(execPage, /not vacuumed/);
  assert.equal(execPage.includes("latch plate"), false);
});

test("the list shows attribution and the detail shows the suggested action", () => {
  const model = gc.buildDemo(NOW);
  const list = gc.pageHtml(model, gm, { lang: "en", hotel: "MSPWE" });
  assert.match(list, /id="gcList"/);
  assert.match(list, /Medallia survey/);
  assert.match(list, /4\/10/);
  assert.match(list, /Room 214/);
  assert.match(list, /Housekeeper Maria Alvarez/);
  assert.match(list, /Inspector Grace Patel/);
  assert.match(list, /Front desk Jordan Lee/);
  assert.match(list, /Breakfast Joy Adams/);
  assert.match(list, /Housekeeper Sample Attendant Ortiz/);
  assert.match(list, /Inspector Unknown/);
  assert.match(list, /Front desk Unknown/);
  assert.match(list, /Room unknown/);
  assert.equal(list.includes("Rosa Vega"), false);
  const detail = gc.pageHtml(model, gm, { lang: "en", hotel: "MSPWE", openId: "gc-mspwe-latch" });
  assert.match(detail, /id="gcDetail"/);
  assert.match(detail, /Suggested action/);
  assert.match(detail, /Open a maintenance work order for the latch plate/);
  assert.match(detail, /Assign opens a work order/);
  assert.match(detail, /Actioned/);
  assert.match(detail, /Not an issue/);
  assert.match(detail, /Assign/);
  const es = gc.pageHtml(model, gm, { lang: "es", hotel: "MSPWE", openId: "gc-mspwe-wifi" });
  assert.match(es, /Acción sugerida/);
  assert.match(es, /Orienta a recepción sobre los pasos del wifi/);
  assert.match(es, /Desconocido/);
  assert.match(es, /No es problema/);
  assert.match(es, /Asignar abre una tarea/);
  const other = gc.pageHtml(model, agm, { lang: "en", hotel: "MSPWE" });
  assert.equal(other.includes("gc-mspwe-latch"), false);
  assert.match(other, /Rosa Vega/);
});

test("the Medallia stub waits, and live mode does not turn the screen on", () => {
  const pull = gc.ingestMedallia({ hotel: "MSPWE", feedDate: "2026-11-04", items: [{ body: "ignored" }] });
  assert.equal(pull.ok, true);
  assert.equal(pull.status, "awaiting_feed");
  assert.equal(pull.source, "medallia");
  assert.equal(pull.items.length, 0);
  assert.equal(gc.ingestMedallia({ hotel: "REAL" }).reason, "hotel");
  assert.equal(gc.ingestMedallia({ hotel: "MSPWE", feedDate: "11/04" }).reason, "date");
  assert.equal(gc.demoUi({ mode: "live" }), false);
  assert.equal(gc.demoUi({ mode: "demo" }), true);
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home-focus.js"), "utf8");
  const src = fs.readFileSync(path.join(root, "guest-comments.js"), "utf8");
  assert.match(html, /guest-comments\.js/);
  assert.match(sw, /guest-comments\.js/);
  assert.match(sw, /hotelhq-shell-v23/);
  assert.match(home, /GuestComments\.homeHtml/);
  assert.match(src, /!\s*demoUi\(\)/);
  global.HotelFeatures = {
    on: function (hotel, feature) { return !(feature === "guest_comments" && hotel === "MSPAM"); }
  };
  const hidden = gc.scoresCard(gc.buildDemo(NOW), corp, "en");
  assert.equal(hidden.includes(">MSPAM<"), false);
  assert.match(hidden, />MSPWE</);
  delete global.HotelFeatures;
});

test("the migration is additive and keeps each hotel in its own rows", () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /private\.my_role\(\) in \('gm', 'agm'\)/);
  assert.match(sql, /'hk_lead', 'housekeeper'/);
  assert.match(sql, /theme = 'cleanliness'/);
  assert.match(sql, /guest_comment_feeds/);
  assert.match(sql, /guest_comments/);
  assert.match(sql, /guest_comment_actions/);
  assert.match(sql, /awaiting_feed/);
  assert.match(sql, /'actioned', 'not_issue', 'assign'/);
  assert.match(sql, /'work_order', 'task'/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /security definer/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /revoke all on function public\.act_guest_comment/);
  assert.match(sql, /grant execute on function public\.ingest_guest_comment_feed/);
  assert.match(sql, /to authenticated/);
  assert.match(sql, /'guest_comments'/);
  assert.match(sql, /'night_audit'/);
  gc.THEMES.forEach((theme) => assert.match(sql, new RegExp("'" + theme.id + "'")));
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /to anon,/);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /sb_publishable_|eyJ/);
});
