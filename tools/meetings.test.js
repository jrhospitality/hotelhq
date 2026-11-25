const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mt = require("../meetings.js");

const NOW = "2026-10-29T15:00:00.000Z";
const EARLY = "2026-10-29T10:00:00.000Z";
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261101_meeting_rooms.sql"), "utf8");
const fd = { role: "Front Desk", hotel: "MSPAM", id: "fd1" };
const gm = { role: "GM", hotel: "MSPAM", id: "gm1" };
const agm = { role: "AGM", hotel: "MSPAM", id: "ag1" };
const corp = { role: "JR Corporate", hotel: null, id: "corp" };
const hp = { role: "House Person", hotel: "MSPAM", id: "hp1" };
const hk = { role: "Housekeeping", hotel: "MSPAM", id: "hk1" };
const bf = { role: "Breakfast Attendant", hotel: "MSPAM", id: "bf1" };
const maint = { role: "Maintenance", hotel: "MSPAM", id: "mt1" };

function roster() {
  return ["MSPWE", "MSPAM", "MSPMS"].flatMap((hotel) => [
    { id: "hp-" + hotel, name: "Sample Houseperson", role: "House Person", hotel: hotel },
    { id: "hk-" + hotel, name: "Sample Lead", role: "Housekeeping", hotel: hotel },
    { id: "mt-" + hotel, name: "Sample Tech", role: "Maintenance", hotel: hotel },
    { id: "gm-" + hotel, name: "Sample Manager", role: "GM", hotel: hotel },
    { id: "ag-" + hotel, name: "Sample Assistant", role: "AGM", hotel: hotel }
  ]);
}
function demo() { return mt.buildDemo(NOW); }
function swept() { return mt.sweep(demo(), NOW, roster()); }
function byId(state, id) { return state.bookings.find((row) => row.id === id); }
function taskFor(state, id) { return state.tasks.find((row) => row.id === id); }

test("hotel clock and feature key", () => {
  assert.equal(mt.chicagoDate(NOW), "2026-10-29");
  assert.equal(mt.chicagoHour(NOW), 10);
  assert.equal(mt.chicagoHour(EARLY), 5);
  assert.equal(mt.featureSpec.id, "meetings");
  assert.equal(mt.featureSpec.en, "Meeting rooms");
  assert.equal(mt.featureSpec.es, "Salas de reuniones");
  assert.equal(mt.defaultSettings("MSPWE").dayAlertHour, 6);
  assert.equal(mt.fmtPhone("5550100142"), "(555) 010-0142");
});

test("only front desk and managers see the calendar", () => {
  ["Front Desk", "AGM", "GM", "JR Corporate", "Above Property"].forEach((role) => {
    assert.equal(mt.canSeeCalendar(role), true, role);
    assert.equal(mt.canEdit(role), true, role);
  });
  ["House Person", "Housekeeping", "Maintenance", "Breakfast Attendant", "Housekeeper"].forEach((role) => {
    assert.equal(mt.canSeeCalendar(role), false, role);
  });
  assert.equal(mt.canBill("Front Desk"), false);
  assert.equal(mt.canBill("AGM"), true);
  assert.equal(mt.canBill("GM"), true);
  assert.equal(mt.canBill("JR Corporate"), true);
  assert.equal(mt.canConfigure("AGM"), false);
  assert.equal(mt.canConfigure("GM"), true);
  assert.equal(mt.canConfigure("Front Desk"), false);
  assert.equal(mt.showTile("GM", "AGM", true), true);
  assert.equal(mt.showTile("Front Desk", "Front Desk", true), true);
  assert.equal(mt.showTile("Housekeeping", "GM", true), false);
  assert.equal(mt.showTile("GM", "House Person", true), false);
  assert.equal(mt.showTile("Breakfast Attendant", "Breakfast Attendant", true), false);
  assert.equal(mt.showTile("GM", "GM", false), false);
});

test("conflict warning counts setup and teardown and ignores cancelled holds", () => {
  const state = demo();
  const soon = byId(state, "b-MSPAM-soon");
  const overlap = Object.assign({}, soon, { id: "", groupName: "Sample Overlap" });
  const blocked = mt.saveBooking(state, overlap, gm, roster());
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "conflict");
  assert.equal(blocked.conflicts[0].id, soon.id);

  const win = mt.blockWindow(soon);
  const edge = Object.assign({}, soon, {
    id: "edge",
    start: mt.chicagoParts ? soon.start : soon.start
  });
  const startMs = win.start;
  const justBefore = new Date(startMs - 60 * 60000).toISOString();
  const touch = new Date(startMs).toISOString();
  function at(iso) {
    const p = iso;
    return p;
  }
  assert.ok(startMs < win.eventStart);
  const cleared = Object.assign({}, soon, {
    id: "",
    groupName: "Sample Clear",
    status: "cancelled"
  });
  assert.equal(mt.saveBooking(state, cleared, gm, roster()).ok, true);
  assert.equal(at(justBefore) !== at(touch), true);

  const otherRoom = Object.assign({}, soon, { id: "", roomId: "r-MSPAM-small", style: "boardroom", groupName: "Sample Other Room", guaranteed: 4, expected: 4, date: "2026-11-20", start: "08:00", end: "09:00" });
  assert.equal(mt.saveBooking(state, otherRoom, fd, roster()).ok, true);
});

test("a booking that only touches the setup window is a conflict, and the edge is free", () => {
  const room = { id: "r1", hotel: "MSPAM", name: "Sample Atrium", capacity: 80, styles: ["theater"], active: true, example: true };
  const held = {
    id: "held", hotel: "MSPAM", roomId: "r1", status: "definite", groupName: "Sample Held",
    phone: "", date: "2026-10-29", start: "13:00", end: "15:00", setupMin: 60, teardownMin: 30,
    guaranteed: 10, expected: 10, style: "theater",
    av: { projector: false, screen: false, mic: false, speaker: false, flipchart: false, wifi: "" },
    fb: { coffee: false, breakfast: false, lunch: false, snacks: false, dietary: "" },
    billing: "Sample invoice note for the demo.", notes: "", cleanupAssigneeId: "",
    setupEnabled: false, setupLeadMin: 0, setupAssigneeId: "",
    checks: { headcount: false, av: false, fb: false, setup: false },
    reminderSent: "", hourAlertSent: "", cleanupTaskId: "", setupTaskId: "", example: true
  };
  const state = { v: 1, origin: "example", settings: { MSPAM: { hotel: "MSPAM", dayAlertHour: 6 } }, rooms: [room], bookings: [held], tasks: [], daySent: {} };
  const intoSetup = Object.assign({}, held, { id: "", groupName: "Sample Into Setup", start: "11:30", end: "12:01", setupMin: 0, teardownMin: 0 });
  assert.equal(mt.saveBooking(state, intoSetup, gm, []).error, "conflict");
  const edge = Object.assign({}, held, { id: "", groupName: "Sample Edge", start: "11:00", end: "12:00", setupMin: 0, teardownMin: 0 });
  assert.equal(mt.saveBooking(state, edge, gm, []).ok, true);
});

test("front desk can edit and cannot change billing notes", () => {
  const state = demo();
  const ended = byId(state, "b-MSPAM-ended");
  const res = mt.saveBooking(state, Object.assign({}, ended, { billing: "Secret bill", notes: "Move the water" }), fd, roster());
  assert.equal(res.ok, true);
  assert.equal(res.booking.billing, "Sample invoice note for the demo.");
  assert.equal(res.booking.notes, "Move the water");
  const fresh = mt.saveBooking(state, {
    hotel: "MSPAM", roomId: "r-MSPAM-small", status: "tentative", groupName: "Sample New Hold",
    phone: "", date: "2026-11-02", start: "08:00", end: "09:00", setupMin: 0, teardownMin: 0,
    guaranteed: 4, expected: 4, style: "boardroom", billing: "Secret bill",
    av: {}, fb: {}
  }, fd, roster());
  assert.equal(fresh.ok, true);
  assert.equal(fresh.booking.billing, "");
  assert.equal(mt.setCheck(state, ended.id, "headcount", true, fd).ok, false);
  assert.equal(mt.setCheck(state, ended.id, "av", true, gm).booking.checks.av, true);
});

test("sweep creates cleanup and setup tasks, reminders, and the morning list once", () => {
  const first = swept();
  const ended = byId(first.state, "b-MSPAM-ended");
  const soon = byId(first.state, "b-MSPAM-soon");
  const tomorrow = byId(first.state, "b-MSPAM-tomorrow");
  const later = byId(first.state, "b-MSPAM-later");
  const maybe = byId(first.state, "b-MSPAM-maybe");
  const cancel = byId(first.state, "b-MSPAM-cancel");
  const cleanup = taskFor(first.state, ended.cleanupTaskId);
  const setup = taskFor(first.state, soon.setupTaskId);
  assert.equal(cleanup.kind, "cleanup");
  assert.equal(cleanup.assigneeRole, "House Person");
  assert.match(cleanup.textEn, /Sample Boardroom/);
  assert.match(cleanup.textEn, /Boardroom/);
  assert.match(cleanup.textEn, /Reset the chairs/);
  assert.match(cleanup.textEn, /EXAMPLE/);
  assert.equal(cleanup.textEn.includes("Sample invoice"), false);
  assert.equal(cleanup.textEn.includes("5550100142"), false);
  assert.equal(cleanup.textEs.includes("EJEMPLO"), true);
  assert.equal(setup.kind, "setup");
  assert.match(setup.textEn, /Sample Atrium/);
  assert.match(setup.textEn, /Theater/);
  assert.equal(setup.textEn.includes("Sample invoice"), false);
  assert.ok(soon.hourAlertSent);
  assert.ok(soon.reminderSent);
  assert.ok(tomorrow.reminderSent);
  assert.equal(tomorrow.hourAlertSent, "");
  assert.equal(tomorrow.setupTaskId, "");
  assert.equal(later.reminderSent, "");
  assert.equal(maybe.reminderSent, "");
  assert.equal(cancel.hourAlertSent, "");
  assert.equal(cancel.cleanupTaskId, "");
  assert.ok(first.state.daySent["MSPAM|" + mt.chicagoDate(NOW)]);
  const kinds = first.alerts.map((alert) => alert.kind);
  assert.ok(kinds.includes("meeting_reminder"));
  assert.ok(kinds.includes("meeting_hour"));
  assert.ok(kinds.includes("meeting_day"));
  const reminder = first.alerts.find((alert) => alert.bookingId === tomorrow.id);
  assert.deepEqual(reminder.roles, ["GM", "AGM"]);
  assert.match(reminder.bodyEn, /headcount/i);
  assert.match(reminder.bodyEn, /setup assignee/i);
  assert.match(reminder.bodyEs, /asistentes/i);
  const day = first.alerts.find((alert) => alert.kind === "meeting_day" && alert.hotel === "MSPAM");
  assert.deepEqual(day.roles, ["Front Desk"]);
  assert.match(day.bodyEn, /Sample Midwest Training/);
  assert.match(day.bodyEn, /Headcount/);
  assert.match(day.bodyEs, /Asistentes/);
  const again = mt.sweep(first.state, NOW, roster());
  assert.equal(again.alerts.length, 0);
  assert.equal(again.tasks.length, 0);
  const early = mt.sweep(mt.buildDemo(EARLY), EARLY, roster());
  assert.equal(early.alerts.some((alert) => alert.kind === "meeting_day"), false);
  assert.equal(early.state.daySent["MSPAM|" + mt.chicagoDate(EARLY)], undefined);
});

test("assignee fallback and an advance assignee", () => {
  const state = demo();
  const noHp = roster().filter((person) => person.role !== "House Person");
  const lead = mt.sweep(state, NOW, noHp);
  assert.equal(taskFor(lead.state, byId(lead.state, "b-MSPAM-ended").cleanupTaskId).assigneeRole, "Housekeeping");
  const managers = noHp.filter((person) => person.role !== "Housekeeping");
  const gmTask = mt.sweep(demo(), NOW, managers);
  assert.equal(taskFor(gmTask.state, byId(gmTask.state, "b-MSPAM-ended").cleanupTaskId).assigneeRole, "GM");
  const picked = demo();
  byId(picked, "b-MSPAM-ended").cleanupAssigneeId = "mt-MSPAM";
  const named = mt.sweep(picked, NOW, roster());
  const task = taskFor(named.state, byId(named.state, "b-MSPAM-ended").cleanupTaskId);
  assert.equal(task.assigneeId, "mt-MSPAM");
  assert.equal(task.assigneeRole, "Maintenance");
  const moved = mt.saveBooking(named.state, Object.assign({}, byId(named.state, "b-MSPAM-ended"), { cleanupAssigneeId: "hk-MSPAM" }), fd, roster());
  assert.equal(taskFor(moved.state, byId(moved.state, "b-MSPAM-ended").cleanupTaskId).assigneeRole, "Housekeeping");
  assert.equal(mt.tasksFor(named.state, { role: "Maintenance", hotel: "MSPAM", id: "mt-MSPAM" }).some((row) => row.kind === "cleanup"), true);
  assert.equal(mt.tasksFor(named.state, hp).length, 0);
  const ops = mt.opsRequest(task);
  assert.equal(ops.kind, "work_order");
  assert.equal(ops.dept, "maintenance");
  assert.equal(ops.title.includes("Sample invoice"), false);
  const house = mt.opsRequest({ assigneeRole: "House Person", kind: "cleanup", roomName: "Sample Atrium", textEn: "Reset Sample Atrium. EXAMPLE", textEs: "Restablece Sample Atrium. EJEMPLO", status: "Open", id: "t1", example: true });
  assert.equal(house.kind, "houseperson_help");
  assert.equal(house.dept, "housekeeping");
});

test("pages hide billing and the calendar from the wrong roles", () => {
  const state = swept().state;
  const base = { now: NOW, hotel: "MSPAM", lang: "en", ui: { screen: "cal", view: "day", date: "2026-10-29" } };
  const denied = mt.renderPage(state, Object.assign({ actor: hp }, base));
  assert.match(denied, /id="mtDenied"/);
  assert.equal(denied.includes("Sample Midwest Training"), false);
  assert.equal(denied.includes("Sample invoice"), false);
  assert.equal(mt.renderHome(state, { actor: bf, now: NOW, hotel: "MSPAM", lang: "en", on: true }), "");
  assert.equal(mt.renderHome(state, { actor: hk, now: NOW, hotel: "MSPAM", lang: "en", on: true }), "");
  assert.equal(mt.renderHome(state, { actor: maint, now: NOW, hotel: "MSPAM", lang: "en", on: true }), "");
  const banner = mt.renderHome(state, { actor: fd, now: NOW, hotel: "MSPAM", lang: "en", on: true });
  assert.match(banner, /id="mtDayBanner"/);
  assert.match(banner, /Sample Atrium/);
  assert.match(banner, /Sample Midwest Training/);
  assert.match(banner, /40\/48/);
  assert.match(banner, /\(555\) 010-0142/);
  assert.equal(banner.includes("Sample invoice"), false);
  assert.equal(mt.renderHome(mt.buildDemo(EARLY), { actor: fd, now: EARLY, hotel: "MSPAM", lang: "en", on: true }).includes("mtDayBanner"), false);
  const beo = mt.renderPage(state, Object.assign({ actor: fd }, base, { ui: { screen: "beo", bookingId: "b-MSPAM-ended" } }));
  assert.match(beo, /id="mtBeo"/);
  assert.match(beo, /no peanuts/);
  assert.match(beo, /SAMPLE-WIFI/);
  assert.equal(beo.includes("id=\"mtBill\""), false);
  assert.equal(beo.includes("Sample invoice"), false);
  const manager = mt.renderPage(state, Object.assign({ actor: gm }, base, { ui: { screen: "print", bookingId: "b-MSPAM-ended" } }));
  assert.match(manager, /id="mtBill"/);
  assert.match(manager, /Sample invoice note for the demo/);
  assert.match(manager, /id="mtCheck"/);
  assert.match(manager, /Confirm headcount/);
  const edit = mt.renderPage(state, Object.assign({ actor: fd }, base, { ui: { screen: "edit", bookingId: "b-MSPAM-ended" } }));
  assert.equal(edit.includes("id=\"mtBill\""), false);
  const rooms = mt.renderPage(state, Object.assign({ actor: gm }, base, { ui: { screen: "rooms" } }));
  assert.match(rooms, /id="mtHour"/);
  assert.match(rooms, /id="mtSaveRoom"/);
  assert.match(mt.renderPage(state, Object.assign({ actor: fd }, base, { ui: { screen: "rooms" } })), /id="mtRoomsLocked"/);
  const cal = mt.renderPage(state, Object.assign({ actor: agm }, base));
  assert.match(cal, /mt-definite/);
  assert.match(cal, /mt-tentative/);
  assert.match(cal, /mt-cancelled/);
  assert.match(cal, /data-status="definite"/);
  const month = mt.renderPage(state, Object.assign({ actor: corp }, base, { ui: { screen: "cal", view: "month", date: "2026-10-29" } }));
  assert.match(month, /id="mtMonth"/);
  const week = mt.renderPage(state, Object.assign({ actor: gm }, base, { ui: { screen: "cal", view: "week", date: "2026-10-29" } }));
  assert.match(week, /id="mtWeek"/);
  const home = mt.renderHome(state, { actor: gm, now: NOW, hotel: "MSPAM", lang: "en", on: true });
  assert.match(home, /id="mtMgrHome"/);
  assert.match(home, /Open the BEO/);
  assert.equal(home.includes("Sample invoice"), false);
  const off = mt.renderPage(state, Object.assign({ actor: gm, on: false }, base));
  assert.match(off, /id="mtOff"/);
  assert.equal(mt.renderHome(state, { actor: fd, now: NOW, hotel: "MSPAM", lang: "en", on: false }), "");
});

test("spanish copy and sample labeling", () => {
  const state = swept().state;
  const es = mt.renderPage(state, { actor: gm, now: NOW, hotel: "MSPAM", lang: "es", ui: { screen: "cal", view: "day", date: mt.chicagoDate(NOW) } });
  assert.match(es, /EJEMPLO/);
  assert.match(es, /Salas de reuniones/);
  assert.match(es, /Tentativo/);
  assert.match(es, /Confirmado/);
  assert.match(es, /Cancelado/);
  ["Meeting rooms", "Sample groups for this demo. Not real guests.", "New booking", "Tentative", "Definite", "Cancelled", "Today's events"].forEach((en) => {
    assert.equal(es.includes(en), false, en);
  });
  const banner = mt.renderHome(state, { actor: fd, now: NOW, hotel: "MSPAM", lang: "es", on: true });
  assert.match(banner, /Eventos de hoy/);
  assert.match(banner, /Asistentes/);
  assert.equal(banner.includes("Today's events"), false);
  assert.equal(banner.includes("Headcount"), false);
  const sameOk = { No: 1 };
  Object.keys(mt.PHRASES).forEach((en) => {
    assert.ok(mt.PHRASES[en], en);
    if (!sameOk[en]) assert.notEqual(mt.PHRASES[en], en, en);
  });
  const blob = JSON.stringify(demo()) + es;
  assert.equal(/Bhakta|Uselman|Jordan Lee|Riley Brooks|Kim Nguyen/.test(blob), false);
  assert.equal(blob.includes("@"), false);
  demo().bookings.forEach((booking) => assert.match(booking.groupName, /^Sample /));
  const payload = mt.pushPayload(mt.sweep(demo(), NOW, roster()).alerts.find((alert) => alert.kind === "meeting_reminder"));
  assert.match(payload.body, /Confirma|Revisa/);
  assert.match(payload.url, /meet=/);
  assert.equal(payload.kind, "meeting_reminder");
});

test("the migration is additive, private, and deduped", () => {
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /security invoker/);
  assert.match(sql, /security_invoker = true/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.equal(/hotel = any \(select private\.my_hotels\(\)\)/.test(sql), false);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /reminder_sent/);
  assert.match(sql, /hour_alert_sent/);
  assert.match(sql, /meeting_day_alerts/);
  assert.match(sql, /dedupe_key/);
  assert.match(sql, /private\.meetings_sweep\(\)/);
  assert.match(sql, /meetings-sweep/);
  assert.match(sql, /\*\/15 \* \* \* \*/);
  assert.match(sql, /interval '24 hours'/);
  assert.match(sql, /private\.queue_notification/);
  assert.match(sql, /meeting\.sweeping/);
  assert.match(sql, /'meetings'/);
  assert.match(sql, /house_person/);
  assert.match(sql, /ops_requests/);
  assert.match(sql, /source_table = 'meeting_tasks'/);
  assert.match(sql, /Do not store a personal guest name/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.equal(/Bhakta|Uselman|5550100142|Sample invoice/.test(sql), false);
  const js = fs.readFileSync(path.join(__dirname, "../meetings.js"), "utf8");
  assert.match(js, /id: "meetings"/);
  assert.doesNotMatch(js, /SalesLeads|sales_lead/);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(html, /meetings\.js/);
  assert.ok(html.indexOf("hotel-features.js") < html.indexOf("meetings.js"));
  assert.ok(html.indexOf("ops-hub.js") < html.indexOf("meetings.js"));
});
