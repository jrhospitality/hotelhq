const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ck = require("../checklist-engine.js");
const hub = require("../ops-hub.js");

test("seasonal checklist defaults to October 15 and November 5", function () {
  assert.deepEqual(ck.SEASONAL, { assignMonth: 10, assignDay: 15, dueMonth: 11, dueDay: 5 });
  assert.deepEqual(ck.seasonDates({}), ck.SEASONAL);
  assert.deepEqual(ck.seasonDates({ assignMonth: 0, dueDay: 99 }), { assignMonth: 1, assignDay: 15, dueMonth: 11, dueDay: 28 });
});

test("template needs both languages and a known kind", function () {
  assert.equal(ck.validTemplate({ kind: "daily", name_en: "Lobby", name_es: "Lobby", items: [{ en: "Mats", es: "Tapetes" }] }), true);
  assert.equal(ck.validTemplate({ kind: "daily", name_en: "Lobby", name_es: "", items: [{ en: "Mats", es: "Tapetes" }] }), false);
  assert.equal(ck.validTemplate({ kind: "other", name_en: "Lobby", name_es: "Lobby", items: [{ en: "Mats", es: "Tapetes" }] }), false);
  assert.deepEqual(ck.KINDS, ["daily", "seasonal", "walk", "room_inspection", "deep_clean"]);
});

test("progress counts done and N/A toward complete", function () {
  assert.deepEqual(ck.tally([{ status: "done" }, { status: "na" }, { status: "open" }]), {
    done: 1, na: 1, open: 1, total: 3, pct: 67
  });
});

test("winter progress reads an existing season without dropping it", function () {
  var state = {
    defaults: { assignMonth: 10, assignDay: 15, dueMonth: 11, dueDay: 5 },
    years: { "2026": { assignOn: "2026-10-15", hotels: { MSPAM: { dueOn: "2026-11-04", items: { 1: { status: "done" }, 2: { status: "na" } } } } } }
  };
  var row = ck.winterProgress(state, "MSPAM", "2026-10-29");
  assert.equal(row.year, 2026);
  assert.equal(row.assign, "2026-10-15");
  assert.equal(row.due, "2026-11-04");
  assert.equal(row.done, 1);
  assert.equal(row.na, 1);
  assert.equal(row.open, 26);
});

test("requests route to a team and houseperson help alerts both roles", function () {
  assert.equal(hub.deptFor("work_order"), "maintenance");
  assert.equal(hub.deptFor("rush"), "housekeeping");
  assert.equal(hub.deptFor("houseperson_help"), "housekeeping");
  assert.equal(hub.deptFor("guest_request", "temp"), "maintenance");
  assert.equal(hub.deptFor("guest_request", "towels"), "housekeeping");
  assert.equal(hub.deptFor("guest_request", "noise"), "front_desk");
  assert.deepEqual(hub.alertsFor("houseperson_help"), ["house_person", "shuttle_driver"]);
  assert.equal(hub.normStatus("In Progress"), "ack");
  assert.equal(hub.normStatus("Resolved"), "done");
  assert.equal(hub.normStatus("Open"), "open");
});

test("activity log filters by category and room", function () {
  var rows = [
    { category: "shift_note", room: "214", summary: "Late arrival" },
    { category: "key_log", room: "118", summary: "keys" },
    { category: "winter_snow", room: "", summary: "Lot" },
    { category: "room_notice", room: "214", summary: "Late checkout" }
  ];
  assert.equal(hub.filterActivity(rows, { category: "winter", room: "" }).length, 1);
  assert.deepEqual(hub.filterActivity(rows, { category: "all", room: "214" }).map(function (r) { return r.category; }), ["shift_note", "room_notice"]);
});

test("migrations are additive and use the hotel list policy", function () {
  var dir = path.join(__dirname, "../supabase/migrations");
  var files = [
    "20261030_quore_parity_shared.sql",
    "20261031_checklist_engine.sql",
    "20261031_ops_requests.sql",
    "20261031_activity_log.sql"
  ];
  files.forEach(function (name) {
    var sql = fs.readFileSync(path.join(dir, name), "utf8");
    assert.equal(/drop\s+table/i.test(sql), false, name);
    assert.equal(/delete\s+from/i.test(sql), false, name);
    assert.equal(/drop\s+column/i.test(sql), false, name);
  });
  var quore = fs.readFileSync(path.join(dir, files[0]), "utf8");
  assert.match(quore, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(quore, /set search_path = ''/);
  assert.match(quore, /revoke all on function private\.hotel_in_scope\(text\) from public, anon/);
  var ops = fs.readFileSync(path.join(dir, files[2]), "utf8");
  assert.match(ops, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  var act = fs.readFileSync(path.join(dir, files[3]), "utf8");
  assert.match(act, /security_invoker = true/);
  assert.match(act, /'key_log'/);
  assert.match(act, /'winter_snow'/);
});
