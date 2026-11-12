const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const rooms = require("../room-live.js");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("a live room patch uses the real columns and keeps the six flows", () => {
  const patch = rooms.roomPatch({ s: "OD", flow: "progress" });
  assert.deepEqual(patch, { hk_status: "OD", fo_status: "OD", status: "progress" });
  assert.equal(rooms.assignmentStatus({ flow: "progress" }), "started");
  assert.equal(rooms.assignmentStatus({ flow: "cleaned" }), "finished");
  assert.equal(rooms.assignmentStatus({ flow: "dirty" }), "assigned");
  assert.equal(rooms.FLOWS.length, 6);
  const asg = rooms.assignmentPatch({ n: 214, s: "VD", flow: "dirty", pri: "rush" }, "MSPWE", "2026-11-02", null);
  assert.equal(asg.hotel_id, "MSPWE");
  assert.equal(asg.room_number, "214");
  assert.equal(asg.assignee, null);
  assert.equal(asg.priority, "rush");
  assert.equal(asg.department, "housekeeping");
});

test("a remote room keeps the attendant already on this phone", () => {
  const local = { n: 214, hk: "Maria (EX)", pri: "rush", flow: "dirty", s: "VD", asg_id: 9, t0: "8:00 AM" };
  const next = rooms.applyRoom(local, {
    id: 40, room_number: "214", hk_status: "RFI", fo_status: "RFI", status: "cleaned"
  });
  assert.equal(next.hk, "Maria (EX)");
  assert.equal(next.pri, "rush");
  assert.equal(next.flow, "cleaned");
  assert.equal(next.s, "RFI");
  assert.equal(next.sb_id, 40);
  assert.equal(next.asg_id, 9);
  assert.equal(next.t0, "8:00 AM");
  const named = rooms.applyAssignment(next, {
    id: 9, room_number: "214", assignee: "abc", priority: "normal", status: "started", work_date: "2026-11-02"
  }, "Ana (EX)");
  assert.equal(named.hk, "Ana (EX)");
  assert.equal(named.flow, "progress");
  assert.equal(named.pri, "normal");
});

test("realtime does not start unless live mode is on", () => {
  assert.equal(rooms.start(), null);
  rooms.stop();
});

test("demo sample rooms stay in the page and live mode skips that seed", () => {
  const html = read("index.html");
  assert.match(html, /if\(useRemote\(\)\|\|\(d\.rooms\|\|\[\]\)\.some\(r=>r\.sb_id\)\)\{d\.flowReady=1;return\}/);
  assert.match(html, /set\(101,"dirty",\{pri:"rush"\}\)/);
  assert.match(html, /room-live\.js/);
  assert.match(html, /HHQRooms\.assignmentStatus/);
  assert.doesNotMatch(html, /dbInsert\("room_status_log"/);
  const sw = read("sw.js");
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v24"/);
  assert.match(sw, /\.\/room-live\.js/);
});

test("the Golden Valley seed inserts floor-map room numbers and does not delete", () => {
  const map = JSON.parse(read("data/mspwe-floors.json"));
  const numbers = [];
  map.floors.forEach((floor) => (floor.rooms || []).forEach((room) => numbers.push(String(room.n))));
  const unique = [...new Set(numbers)];
  const sql = read("supabase/migrations/20261112_mspwe_rooms.sql");
  assert.equal(unique.length, 117);
  unique.forEach((n) => assert.match(sql, new RegExp("'MSPWE', 'housekeeping', '" + n + "', ")));
  assert.match(sql, /on conflict \(hotel_id, room_number\) do nothing/);
  assert.match(sql, /add column if not exists status text/);
  assert.match(sql, /rooms_hotel_read/);
  assert.match(sql, /hk_assignments_hotel_read/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /private\.my_hotel\(\)/);
  assert.equal((sql.match(/'MSPWE', 'housekeeping'/g) || []).length, 117);
  assert.match(sql, /room_type stays null/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /drop column/i);
  assert.doesNotMatch(sql, /king|suite|queen/i);
});
