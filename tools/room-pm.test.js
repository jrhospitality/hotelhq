const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const floors = require("../data/mspwe-floors.js");
const rpm = require("../room-pm.js");

const rooms = floors.floors.flatMap(function (floor) { return floor.rooms.map(function (room) { return String(room.n); }); });
const AS_OF = "2026-11-25";
const staff = [{ id: "mspwe-mt", name: "Luis Ortega", active: true }];

function mspwePlan() {
  return rpm.planHotel({
    asOf: AS_OF,
    rooms: rooms,
    programs: rpm.DEMO_PROGRAMS,
    staff: staff,
    tasks: []
  });
}

test("Monday 2026-11-23 leaves six Mondays in the quarter and a 5-room guestroom batch", () => {
  assert.equal(rooms.length, 117);
  assert.equal(rpm.mondayOf(AS_OF), "2026-11-23");
  assert.deepEqual(rpm.quarterBounds(AS_OF), { start: "2026-10-01", end: "2026-12-31" });
  assert.equal(rpm.weeksLeft("2026-11-23"), 6);
  assert.equal(rpm.weeksLeft(AS_OF), 6);
  assert.equal(rpm.weeksInQuarter(AS_OF), 13);
  assert.equal(rpm.batchSize(26, 6), 5);
  assert.equal(rpm.batchSize(35, 6), 6);
  assert.equal(rpm.batchSize(12, 6), 2);
  const plan = mspwePlan();
  const guest = plan.programs.find(function (p) { return p.id === "guestrooms"; });
  const smoke = plan.programs.find(function (p) { return p.id === "smoke"; });
  const mattress = plan.programs.find(function (p) { return p.id === "mattress"; });
  assert.equal(guest.done, 91);
  assert.equal(guest.total, 117);
  assert.equal(guest.left, 26);
  assert.equal(guest.weeks, 6);
  assert.equal(guest.pace, "on_pace");
  assert.equal(guest.tasks.length, 5);
  assert.equal(smoke.tasks.length, 6);
  assert.equal(mattress.tasks.length, 2);
  assert.ok(guest.tasks.every(function (t) { return t.assigneeName === "Luis Ortega"; }));
  const flagged = guest.tasks.filter(function (t) { return rpm.occupancy(rpm.exampleStatus(t.room)) !== "vacant"; });
  assert.ok(flagged.length >= 1, guest.tasks.map(function (t) { return t.room + ":" + rpm.exampleStatus(t.room); }).join(" "));
  assert.equal(plan.tasks.length, 13);
});

test("two maintenance users split the batch by who has fewer open rooms", () => {
  const plan = rpm.planHotel({
    asOf: "2026-12-28",
    rooms: ["101", "102", "103", "104", "105"],
    programs: [{ id: "guestrooms", title_en: "Guestrooms", title_es: "Habitaciones", done: 0 }],
    staff: [
      { id: "b", name: "Blake", active: true },
      { id: "a", name: "Avery", active: true, open: 2 }
    ],
    tasks: []
  });
  assert.equal(plan.programs[0].tasks.length, 5);
  const names = plan.programs[0].tasks.map(function (t) { return t.assigneeName; });
  assert.deepEqual(names, ["Blake", "Blake", "Avery", "Blake", "Avery"]);
});

test("quarter progress counts completed tasks in this quarter only", () => {
  const rows = [
    { asset: "101", schedule_id: 44, done: true, completed_at: "2026-11-02T18:00:00Z" },
    { asset: "102", schedule_id: 44, done: true, completed_at: "2026-08-02T18:00:00Z" },
    { asset: "103", schedule_id: 44, done: false, completed_at: "" }
  ];
  const prog = rpm.progressFromTasks(rows, ["101", "102", "103"], "2026-10-01", "2026-12-31", 44);
  assert.equal(prog.done, 1);
  assert.equal(prog.total, 3);
  assert.equal(prog.left, 2);
});

test("HotelKey codes beat the room row, and swaps list vacant rooms first", () => {
  const map = rpm.statusMap({
    rooms: [{ room_number: "201", hk_status: "VC", fo_status: "VC" }, { n: "202", s: "VD" }],
    hotelkey: [
      { room_number: "201", hhq_code: "OD", occupied: true, ooo: false },
      { room_number: "203", hhq_code: "OOO", ooo: true },
      { room_number: "204", hhq_code: "VC" },
      { room_number: "205", occupied: true }
    ]
  });
  assert.equal(map["201"], "OD");
  assert.equal(map["202"], "VD");
  assert.equal(map["203"], "OOO");
  assert.equal(rpm.occupancy(map["204"]), "vacant");
  assert.equal(rpm.occupancy("OC"), "occupied");
  const current = { id: "t1", programId: "guestrooms", room: "201", done: false };
  const statuses = Object.assign({}, map, { "206": "VC" });
  const ranked = rpm.suggest({
    rooms: ["201", "202", "203", "204", "205", "206"],
    doneRooms: [],
    tasks: [current, { id: "t2", programId: "guestrooms", room: "206", done: false }],
    current: current,
    statuses: statuses
  });
  assert.deepEqual(ranked, ["202", "204", "205", "203"]);
  assert.deepEqual(ranked.map(function (room) { return rpm.occupancy(statuses[room]); }), ["vacant", "vacant", "occupied", "ooo"]);
});

test("a swap keeps the weekly count and returns the first room to the pool", () => {
  const plan = mspwePlan();
  const task = plan.programs[0].tasks[0];
  const from = task.room;
  const before = plan.tasks.length;
  const suggestions = rpm.suggest({
    rooms: rooms,
    doneRooms: plan.programs[0].doneRooms,
    tasks: plan.tasks,
    current: task,
    statuses: { [from]: "OC", "348": "VC" }
  });
  assert.equal(suggestions[0] === from, false);
  assert.equal(rpm.occupancy("VC"), "vacant");
  const result = rpm.applySwap({
    task: task,
    room: suggestions[0],
    tasks: plan.tasks,
    doneRooms: plan.programs[0].doneRooms,
    who: "Luis Ortega",
    at: "2026-11-25T14:00:00Z"
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "occupied");
  assert.equal(result.log.who, "Luis Ortega");
  assert.equal(result.log.from, from);
  assert.equal(plan.tasks.length, before);
  assert.equal(plan.tasks.filter(function (t) { return t.programId === "guestrooms" && !t.done; }).length, 5);
  assert.equal(plan.tasks.some(function (t) { return t.programId === "guestrooms" && t.room === from; }), false);
  const again = rpm.suggest({
    rooms: rooms,
    doneRooms: plan.programs[0].doneRooms,
    tasks: plan.tasks,
    current: { programId: "guestrooms", room: "99999", done: false },
    statuses: {}
  });
  assert.ok(again.indexOf(from) >= 0);
});

test("the guestroom card shows the assignee, pace, and occupied or out-of-order flags", () => {
  const plan = mspwePlan();
  const guest = plan.programs[0];
  const statuses = {};
  guest.tasks.forEach(function (t, i) { statuses[t.room] = i === 0 ? "OD" : i === 1 ? "OOO" : "VC"; });
  const html = rpm.cardHtml(guest, "en", { statuses: statuses });
  assert.match(html, /id="room-pm-guestrooms"/);
  assert.match(html, /91\/117/);
  assert.match(html, /26/);
  assert.match(html, />6</);
  assert.match(html, /On pace/);
  assert.match(html, /5/);
  assert.match(html, /Luis Ortega/);
  assert.match(html, /Swap room/);
  assert.match(html, /Occupied/);
  assert.match(html, /Out of order/);
  const es = rpm.cardHtml(guest, "es", { statuses: statuses });
  assert.match(es, /Al día/);
  assert.match(es, /Cambiar habitación/);
  assert.match(es, /Ocupada/);
  assert.match(es, /Fuera de servicio/);
  assert.equal(es.includes("On pace"), false);
  const notes = rpm.assignmentNotices(guest.tasks);
  assert.equal(notes[0].kind, "pm_assigned");
  assert.equal(notes[0].title_en, "PM assigned");
  assert.match(notes[0].body_en, /Guestrooms/);
  assert.equal(notes[0].title_es, "MP asignado");
});

test("the migration is additive and does not touch HotelKey or room status", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261125_weekly_room_pm.sql"), "utf8");
  assert.match(sql, /add column if not exists pace_schedule_id/);
  assert.match(sql, /add column if not exists pace_week/);
  assert.match(sql, /private\.run_weekly_room_pms/);
  assert.match(sql, /pm-weekly-rooms/);
  assert.match(sql, /15 11 \* \* 1/);
  assert.match(sql, /pm_assigned/);
  assert.match(sql, /public\.swap_room_pm/);
  assert.match(sql, /reason', 'occupied'/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function private\.run_weekly_room_pms/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.hotelkey_live_room_status/i);
  assert.doesNotMatch(sql, /update\s+public\.hotelkey_live_room_status/i);
  assert.doesNotMatch(sql, /update\s+public\.rooms/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.rooms/i);
  const js = fs.readFileSync(path.join(__dirname, "../room-pm.js"), "utf8");
  assert.match(js, /hotelkey_live_room_status/);
  assert.match(js, /\.select\("room_number,hhq_code,occupied,ooo,oos"\)/);
  assert.equal(/hotelkey_live_room_status[\s\S]{0,80}\.(insert|update|delete|upsert)/.test(js), false);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sched = html.slice(html.indexOf("function pmSchedBody"), html.indexOf("function pmJobBody"));
  assert.equal(sched.includes("next_due"), false);
  const job = html.slice(html.indexOf("function pmJobBody"), html.indexOf("async function syncPmSched"));
  assert.equal(job.includes("status:"), false);
  assert.match(html, /openTaskForSchedule/);
  assert.match(html, /room-pm\.js/);
  assert.match(html, /HHQRoomPm\.section/);
  const push = fs.readFileSync(path.join(__dirname, "../supabase/functions/send-push/index.ts"), "utf8");
  assert.match(push, /"pm_assigned"/);
  assert.match(push, /PM assigned/);
  assert.match(push, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
  assert.equal(/eyJ[A-Za-z0-9_-]{20,}/.test(push), false);
  assert.equal(/Efrain|Dominguez/.test(sql + js + html.slice(html.indexOf("function pmSchedBody"))), false);
});
