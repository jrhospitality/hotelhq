const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const daily = require("../daily-assign.js");

const WED = "2026-11-25";
const SAT = "2026-11-28";

function row(rows, employee, templateId) {
  return rows.find(function (item) {
    return item.employee === employee && (templateId ? item.templateId === templateId : item.kind === "walk");
  });
}

test("a published shift assigns that department and shift, and a punch assigns when no shift is published", () => {
  const rows = daily.plan(daily.exampleInput(WED));
  const jordan = row(rows, "mspwe-fd", "fd-am");
  assert.equal(jordan.source, "schedule");
  assert.equal(jordan.shift, "AM");
  assert.equal(jordan.due, "2026-11-25T15:00");
  assert.equal(row(rows, "mspwe-fd", "fd-pm"), undefined);
  const luis = row(rows, "mspwe-mt", "mt");
  assert.equal(luis.source, "schedule");
  assert.equal(luis.due, "2026-11-25T16:30");
  assert.equal(rows.some(function (item) { return item.templateId === "winter"; }), false);
  assert.equal(row(rows, "mspwe-hk", "hk").department, "housekeeping");
  assert.equal(row(rows, "mspwe-hkr", "hk").department, "housekeeping");
  const kim = row(rows, "mspam-fd", "fd-pm-am");
  assert.equal(kim.source, "punch");
  assert.equal(kim.shift, "PM");
  assert.equal(kim.due, "2026-11-25T23:00");
  const nora = row(rows, "mspms-bar", "bar");
  assert.equal(nora.source, "schedule");
  assert.equal(nora.title_es, "Lista de turno de bartender");
  assert.equal(daily.shiftBucket("04:59"), "Night Audit");
  assert.equal(daily.shiftBucket("05:00"), "AM");
  assert.equal(daily.shiftBucket("13:59"), "AM");
  assert.equal(daily.shiftBucket("14:00"), "PM");
  assert.equal(daily.shiftBucket("21:59"), "PM");
  assert.equal(daily.shiftBucket("22:00"), "Night Audit");
  assert.equal(daily.bucketEnd(WED, "23:10"), "2026-11-26T07:00");
  assert.equal(daily.bucketEnd(WED, "02:00"), "2026-11-25T07:00");
});

test("the same person, template, and date is inserted once", () => {
  const first = daily.plan(daily.exampleInput(WED));
  const again = daily.merge(first, daily.plan(daily.exampleInput(WED)));
  assert.equal(again.length, first.length);
  const keys = first.map(function (item) { return item.key; });
  assert.equal(new Set(keys).size, keys.length);
  const jordanKeys = keys.filter(function (key) { return key.indexOf("checklist|mspwe-fd|fd-am|") === 0; });
  assert.deepEqual(jordanKeys, ["checklist|mspwe-fd|fd-am|" + WED]);
});

test("an unpublished shift does not assign, and schedule data blocks the weekday walk fallback", () => {
  const input = daily.exampleInput(WED);
  input.shifts.forEach(function (shift) {
    if (shift.employee === "mspwe-fd") shift.published = false;
  });
  input.people.push({
    id: "mspwe-gm-off", name: "Riley Brooks", hotel: "MSPWE", role: "GM", active: true, scheduleData: true
  });
  const rows = daily.plan(input);
  assert.equal(row(rows, "mspwe-fd", "fd-am"), undefined);
  assert.equal(rows.some(function (item) { return item.employee === "mspwe-gm-off"; }), false);
});

test("Golden Valley assigns the walk on weekdays when the GM has no schedule data, and either manager can finish it", () => {
  assert.equal(daily.isWeekday(WED), true);
  assert.equal(daily.isWeekday(SAT), false);
  const wed = daily.plan(daily.exampleInput(WED));
  const avery = row(wed, "mspwe-gm");
  const blake = row(wed, "mspwe-agm");
  assert.equal(avery.kind, "walk");
  assert.equal(avery.source, "weekday_fallback");
  assert.equal(avery.due, "2026-11-25T17:00");
  assert.equal(blake.kind, "walk");
  assert.equal(blake.source, "schedule");
  assert.equal(blake.due, "2026-11-25T16:00");
  assert.equal(wed.filter(function (item) { return item.kind === "walk" && item.hotel === "MSPWE"; }).length, 2);
  const done = daily.complete(wed, avery.key, "Avery Cole");
  const closed = done.filter(function (item) { return item.kind === "walk" && item.hotel === "MSPWE"; });
  assert.equal(closed.length, 2);
  assert.ok(closed.every(function (item) { return item.completed && item.completedBy === "Avery Cole"; }));
  const sat = daily.plan(daily.exampleInput(SAT));
  assert.equal(row(sat, "mspwe-gm"), undefined);
  assert.equal(row(sat, "mspwe-agm").source, "schedule");
  const noFlag = daily.exampleInput(WED);
  noFlag.hotels[0].walkWeekdayFallback = false;
  assert.equal(row(daily.plan(noFlag), "mspwe-gm"), undefined);
});

test("overdue starts at the end of the shift, and leaders see completion in both languages", () => {
  const rows = daily.plan(daily.exampleInput(WED));
  const jordan = row(rows, "mspwe-fd", "fd-am");
  assert.equal(daily.isOverdue(jordan, "2026-11-25T14:59"), false);
  assert.equal(daily.isOverdue(jordan, "2026-11-25T15:00"), true);
  assert.equal(daily.isOverdue(Object.assign({}, jordan, { completed: true }), "2026-11-25T18:00"), false);
  const mine = daily.visible(rows, { id: "mspwe-fd", role: "Front Desk", hotel: "MSPWE" });
  assert.ok(mine.every(function (item) { return item.employee === "mspwe-fd"; }));
  const fd = daily.cardHtml(mine, "en", { now: "2026-11-25T15:00", viewer: { id: "mspwe-fd", role: "Front Desk", hotel: "MSPWE" }, example: true });
  assert.match(fd, /id="dailyAssign"/);
  assert.match(fd, /EXAMPLE/);
  assert.match(fd, /1st Shift - AM Check list/);
  assert.match(fd, /Overdue/);
  assert.equal(fd.includes("Luis Ortega"), false);
  assert.equal(fd.includes("Team today"), false);
  const leaders = daily.visible(rows, { id: "mspwe-gm", role: "GM", hotel: "MSPWE" });
  const gm = daily.cardHtml(leaders, "en", { now: "2026-11-25T15:00", viewer: { id: "mspwe-gm", role: "GM", hotel: "MSPWE" }, example: true });
  assert.match(gm, /Team today/);
  assert.match(gm, /Luis Ortega/);
  assert.match(gm, /Property walk/);
  assert.match(gm, /Grace Patel/);
  const es = daily.cardHtml(leaders, "es", { now: "2026-11-25T15:00", viewer: { id: "mspwe-gm", role: "GM", hotel: "MSPWE" }, example: true });
  assert.match(es, /EJEMPLO/);
  assert.match(es, /Equipo de hoy/);
  assert.match(es, /Recorrido de la propiedad/);
  assert.match(es, /Atrasada/);
  assert.match(es, /Lista diaria de mantenimiento/);
  assert.equal(es.includes("Team today"), false);
  const corp = daily.visible(rows, { id: "demo-corp-1", role: "Above Property", hotel: "MSPWE" });
  assert.ok(corp.every(function (item) { return item.hotel === "MSPWE"; }));
  assert.ok(daily.visible(rows, { id: "demo-corp-1", role: "Above Property", all: true }).some(function (item) { return item.hotel === "MSPMS"; }));
  const note = daily.notices([jordan, row(rows, "mspwe-gm")])[0];
  assert.equal(note.kind, "daily_assigned");
  assert.equal(daily.notices([row(rows, "mspwe-gm")])[0].title_en, "Property walk assigned");
  assert.equal(daily.notices([row(rows, "mspwe-gm")])[0].title_es, "Recorrido asignado");
  assert.equal(note.title_es, "Lista asignada");
});

test("the migration is additive, cron is early morning Central, and the push event stays beside the old ones", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261125_daily_auto_assign.sql"), "utf8");
  assert.match(sql, /add column if not exists shift text/);
  assert.match(sql, /create table if not exists public\.daily_assignments/);
  assert.match(sql, /create table if not exists public\.daily_assign_settings/);
  assert.match(sql, /walk_weekday_fallback/);
  assert.match(sql, /'MSPWE', true/);
  assert.match(sql, /daily_assignments_person_template_date_uq/);
  assert.match(sql, /daily_assignments_walk_person_date_uq/);
  assert.match(sql, /private\.run_daily_assignments/);
  assert.match(sql, /weekday_fallback/);
  assert.match(sql, /private\.trg_daily_assign_punch/);
  assert.match(sql, /after insert or update of punch_in on public\.time_punches/i);
  assert.match(sql, /daily-assign/);
  assert.match(sql, /20 11 \* \* \*/);
  assert.match(sql, /5:20 AM CST/);
  assert.match(sql, /pm-daily/);
  assert.match(sql, /daily_assigned/);
  assert.match(sql, /public\.complete_daily_assignment/);
  assert.match(sql, /public\.set_walk_weekday_fallback/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function private\.run_daily_assignments/);
  assert.match(sql, /security definer/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /update\s+public\.checklist_runs/i);
  assert.doesNotMatch(sql, /update\s+public\.property_walks/i);
  const push = fs.readFileSync(path.join(__dirname, "../supabase/functions/send-push/index.ts"), "utf8");
  assert.match(push, /"daily_assigned"/);
  assert.match(push, /"pm_assigned"/);
  assert.match(push, /"work_order\.created"/);
  assert.match(push, /"punch_missing"/);
  assert.match(push, /Checklist assigned/);
  assert.match(push, /Lista asignada/);
  assert.match(push, /Property walk assigned/);
  assert.match(push, /Recorrido asignado/);
  assert.match(push, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.equal(/eyJ[A-Za-z0-9_-]{20,}/.test(push), false);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.ok(html.indexOf('src="daily-assign.js"') < html.indexOf('src="home-focus.js"'));
  const home = fs.readFileSync(path.join(__dirname, "../home-focus.js"), "utf8");
  assert.match(home, /DailyAssign\.homeHtml/);
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v38"/);
  assert.match(sw, /\.\/daily-assign\.js/);
});
