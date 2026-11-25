const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const dl = require("../daily-labor.js");
const hhq = require("../permissions.js");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const NOW = "2026-11-30T18:00:00.000Z";
const gm = { role: "GM", hotel: "MSPWE", name: "Blake Morgan" };
const agm = { role: "AGM", hotel: "MSPWE", name: "Riley Brooks" };
const corp = { role: "Above Property", hotel: "", name: "Alex Rivera" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };

function view(extra) {
  return Object.assign({ lang: "en", date: "2026-11-29", hotel: "MSPWE", today: "2026-11-30" }, extra || {});
}

test("GM and AGM see daily labor, and other roles do not", () => {
  assert.equal(hhq.can("GM", "labor.daily"), true);
  assert.equal(hhq.can("AGM", "labor.daily"), true);
  assert.equal(hhq.can("Above Property", "labor.daily"), true);
  assert.equal(hhq.can("Front Desk", "labor.daily"), false);
  assert.equal(hhq.can("Housekeeping", "labor.daily"), false);
  assert.equal(dl.canSee("gm"), true);
  assert.equal(dl.canSee(desk.role), false);
  assert.deepEqual(dl.hotelsFor("Above Property", ""), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(dl.hotelsFor("GM", "MSPWE"), ["MSPWE"]);
});

test("yesterday shows win/loss, rooms sold, and leaves maintenance off the daily view", () => {
  const bundle = dl.buildExample(NOW);
  const html = dl.pageHtml(bundle, gm, view());
  assert.match(html, /data-example="1"/);
  assert.match(html, /EXAMPLE/);
  assert.match(html, /Loss 4\.5h/);
  assert.match(html, />82</);
  assert.match(html, /532/);
  assert.match(html, /Front Desk/);
  assert.match(html, /Housekeeping/);
  assert.match(html, /Alex Example/);
  assert.match(html, /Position total, not a personal plan/);
  assert.match(html, /Fix the missing Out punch for Riley Example/);
  assert.equal(html.includes(">Maintenance<"), false);
  assert.equal(html.includes("10.0"), false);
  assert.equal(html.includes("Prop Ops"), true);
  assert.match(html, /Maintenance and Prop Ops are not on this daily view/);
});

test("a day with no flags still shows the tables and the 5-minute check-in", () => {
  const bundle = dl.buildExample(NOW);
  const html = dl.pageHtml(bundle, agm, view({ date: "2026-11-28" }));
  assert.match(html, /data-no-flags="1"/);
  assert.match(html, /Front Desk/);
  assert.match(html, /Win 2\.0h/);
  assert.match(html, /5-minute check-in/);
  assert.equal(html.includes("No labor file"), false);
  const missing = dl.pageHtml(bundle, gm, view({ date: "2026-11-01" }));
  assert.match(missing, /No labor file for this day/);
});

test("Spanish copy and the home card count open and overdue items", () => {
  const bundle = dl.buildExample(NOW);
  const es = dl.pageHtml(bundle, gm, view({ lang: "es" }));
  assert.match(es, /EJEMPLO/);
  assert.match(es, /Labor del día/);
  assert.match(es, /Cuartos vendidos/);
  assert.match(es, /Tareas/);
  assert.match(es, /De más 4\.5h/);
  const home = dl.homeCard(bundle, gm, "en", "2026-11-30");
  assert.match(home, /data-open="8"/);
  assert.match(home, /data-overdue="1"/);
  assert.match(home, /EXAMPLE/);
  assert.match(dl.homeCard(bundle, corp, "es", "2026-11-30"), /abiertas/);
  assert.equal(dl.homeCard(bundle, desk, "en", "2026-11-30"), "");
});

test("corporate rollup keeps SpringHill and Hampton ready but not added", () => {
  const bundle = dl.buildExample(NOW);
  const html = dl.pageHtml(bundle, corp, view({ hotel: "" }));
  assert.match(html, /data-hotel="MSPWE"/);
  assert.match(html, /data-enabled="1"/);
  assert.match(html, /data-hotel="MSPAM"[\s\S]*Not added yet/);
  assert.match(html, /data-hotel="MSPMS"[\s\S]*Not added yet/);
  assert.match(html, /EXAMPLE/);
});

test("checkoff records who and the note without changing the original day", () => {
  const bundle = dl.buildExample(NOW);
  const day = bundle.days.filter(function (row) { return row.workDate === "2026-11-29"; })[0];
  const next = dl.applyCheck(day, 1, gm, "Fixed the punch", "2026-11-30T16:00:00.000Z");
  assert.equal(day.items[0].status, "open");
  assert.equal(next.items[0].status, "done");
  assert.equal(next.items[0].checkedByName, "Blake Morgan");
  assert.equal(next.items[0].note, "Fixed the punch");
  assert.equal(dl.itemState(next.items[0], "2026-11-30"), "done");
  assert.equal(dl.itemState(bundle.days.filter(function (row) { return row.workDate === "2026-11-28"; })[0].items[0], "2026-11-30"), "overdue");
});

test("live rows keep maintenance out of the daily group and use night-audit rooms", () => {
  const live = dl.mapLive({
    days: [{ id: 4, hotel_id: "MSPWE", work_date: "2026-11-29", due_on: "2026-11-30", rooms_sold: 80, actual_hours: 10, plan_hours: 8, scheduled_hours: 9 }],
    positions: [
      { hotel_id: "MSPWE", work_date: "2026-11-29", position_label: "Maintenance", actual_hours: 10, plan_hours: 8, scheduled_hours: 8, include_in_daily: false },
      { hotel_id: "MSPWE", work_date: "2026-11-29", position_label: "Front Desk", actual_hours: 10, plan_hours: 8, scheduled_hours: 9, include_in_daily: true }
    ],
    housekeeping: [],
    overplan: [],
    actions: [{ id: 9, hotel_id: "MSPWE", work_date: "2026-11-29", item_no: 1, kind: "five_minute_checkin", who_name: "GM / AGM", what_en: "Complete the 5-minute check-in", what_es: "Completa el check-in de 5 minutos", due_on: "2026-11-30", status: "open", check_note: "" }],
    occupancy: [{ hotel_id: "MSPWE", occ_date: "2026-11-29", occupied_rooms: 81 }],
    meta: [
      { hotel_id: "MSPWE", enabled: true, he_property_id: "118172" },
      { hotel_id: "MSPAM", enabled: false, he_property_id: null },
      { hotel_id: "MSPMS", enabled: false, he_property_id: null }
    ]
  });
  assert.equal(live.origin, "live");
  assert.equal(live.days[0].positions[0].group, "excluded");
  assert.equal(live.days[0].positions[1].group, "front_desk");
  assert.equal(dl.roomsFor(live, "MSPWE", "2026-11-29"), 81);
  assert.equal(live.hotels.MSPAM.enabled, false);
  const html = dl.pageHtml(live, gm, view());
  assert.equal(html.includes("data-example"), false);
  assert.equal(html.includes(">Maintenance<"), false);
  assert.match(html, /81/);
});

test("migration, ingest command, and push events stay additive", () => {
  const sql = read("supabase/migrations/20261126_daily_labor.sql");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /on conflict \(hotel_id, work_date\) do nothing/);
  assert.match(sql, /118172/);
  assert.match(sql, /MSPAM/);
  assert.match(sql, /MSPMS/);
  assert.match(sql, /source = 'actual'/);
  assert.match(sql, /labor_daily_created/);
  assert.match(sql, /labor_daily_overdue/);
  assert.match(sql, /queue_notification/);
  assert.match(sql, /five_minute_checkin/);
  assert.match(sql, /check_labor_action_item/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /alter table public\.labor_plans/i);
  assert.doesNotMatch(sql, /insert into public\.time_punches/i);
  const cli = read("tools/parse-he-labor.js");
  assert.match(cli, /HOTELHQ_LABOR_INGEST_TOKEN/);
  assert.match(cli, /--dir \/workspace\/cleans-1130 --hotel MSPWE --date 2026-11-29 --post/);
  assert.match(cli, /Do not pass the token as an argument/);
  const push = read("supabase/functions/send-push/index.ts");
  assert.match(push, /"punch_missing"/);
  assert.match(push, /"work_order.created"/);
  assert.match(push, /"labor_daily_created"/);
  assert.match(push, /"labor_daily_overdue"/);
  assert.match(push, /roles: \["gm", "agm"\], build: \(id\) => laborDailyEvent/);
  const example = read("supabase/examples/ingest_daily_labor.example.json");
  assert.match(example, /Alex Example/);
  assert.equal(example.includes("1234"), false);
  assert.match(read("index.html"), /daily-labor\.js/);
  assert.match(read("home-focus.js"), /DailyLabor\.homeHtml/);
  assert.match(read("sw.js"), /var CACHE_VERSION = "hotelhq-shell-v39"/);
  assert.match(read("sw.js"), /\.\/daily-labor\.js/);
  assert.match(read("more-menu.js"), /dlabor/);
});
