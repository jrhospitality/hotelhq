const test = require("node:test");
const assert = require("node:assert/strict");
const done = require("../expected-done.js");

const standards = { checkout: 30, stayover: 20, other: 25, breakMin: 30 };

test("a housekeeper finishes at start plus remaining rooms and the break", () => {
  const result = done.project({
    role: "Housekeeper",
    startMin: 8 * 60,
    endMin: 16 * 60,
    standards: standards,
    rooms: [{ kind: "checkout" }, { kind: "checkout" }, { kind: "stayover" }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.finish, 8 * 60 + 60 + 20 + 30);
  assert.equal(done.formatClock(result.finish), "9:50 AM");
  assert.equal(done.phrase(result.finish, "en"), "Expected done by 9:50 AM");
  assert.equal(done.phrase(result.finish, "es"), "Termina a las 9:50 AM");
  assert.equal(result.flag, "ok");
});

test("cleaned and refused rooms drop out and the finish moves earlier", () => {
  const rooms = [
    { hk: "Rosa", flow: "dirty", s: "VD" },
    { hk: "Rosa", flow: "cleaned", s: "RFI", t1: "10:00 AM" },
    { hk: "Rosa", flow: "dirty", s: "OD", occ: true, x: "DND" },
    { hk: "Ana", flow: "dirty", s: "VD" }
  ];
  assert.deepEqual(done.remainingRooms(rooms, "Rosa"), [{ kind: "checkout" }]);
  const open = done.project({ role: "Housekeeper", startMin: 8 * 60, endMin: 16 * 60, standards: standards, rooms: done.remainingRooms(rooms, "Rosa") });
  const after = done.project({ role: "Housekeeper", startMin: 8 * 60, endMin: 16 * 60, standards: standards, rooms: [] });
  assert.equal(open.finish, 9 * 60);
  assert.equal(after.finish, 8 * 60 + 30);
  assert.ok(after.finish < open.finish);
});

test("missing room or break standards stay blank", () => {
  const noCheckout = done.project({
    role: "Housekeeper",
    startMin: 8 * 60,
    endMin: 16 * 60,
    standards: { checkout: null, stayover: 20, breakMin: 30 },
    rooms: [{ kind: "checkout" }]
  });
  assert.equal(noCheckout.ok, false);
  assert.equal(done.hint("en"), "Set labor standards");
  assert.match(done.hint("es"), /estándares/);
  const noBreak = done.project({
    role: "Housekeeper",
    startMin: 8 * 60,
    standards: { checkout: 30, stayover: 15, deep: 45, suite: 36, breakMin: null },
    rooms: [{ kind: "checkout" }]
  });
  assert.equal(noBreak.ok, true);
  assert.equal(noBreak.finish, 8 * 60 + 30);
});

test("laundry uses planned hours and does not add a break", () => {
  const result = done.project({
    role: "Laundry Attendant",
    startMin: 7 * 60,
    endMin: 15 * 60,
    plannedHours: 8,
    standards: standards
  });
  assert.equal(result.finish, 15 * 60);
  assert.equal(done.formatClock(result.finish), "3:00 PM");
  assert.equal(result.flag, "ok");
  const missing = done.project({ role: "Laundry Attendant", startMin: 7 * 60, endMin: 15 * 60, plannedHours: null });
  assert.equal(missing.ok, false);
});

test("running behind is amber past the scheduled end and red after 30 minutes", () => {
  const amber = done.project({ role: "Laundry Attendant", startMin: 7 * 60, endMin: 15 * 60, plannedHours: 8.5 });
  const red = done.project({ role: "Laundry Attendant", startMin: 7 * 60, endMin: 15 * 60, plannedHours: 9 });
  const edge = done.project({ role: "Laundry Attendant", startMin: 7 * 60, endMin: 15 * 60, plannedHours: 8 });
  assert.equal(amber.flag, "amber");
  assert.equal(red.flag, "red");
  assert.equal(edge.flag, "ok");
  assert.equal(done.flagLabel("amber", "en"), "Running behind");
  assert.equal(done.flagLabel("red", "es"), "Atrasado");
  assert.equal(done.flagLabel("ok", "en"), "");
});

test("start uses today's punch, then the schedule, then the first activity", () => {
  const scheduled = done.pickShift([{ start: 8 * 60, end: 16 * 60 }], 10 * 60);
  assert.equal(scheduled.start, 8 * 60);
  assert.equal(done.parseClock("7:05 AM"), 7 * 60 + 5);
  assert.equal(done.parseClock("15:00"), 15 * 60);
  assert.equal(done.parseClock(""), null);
  const punch = done.chooseStart({
    punchMin: done.parseClock("8:02 AM"),
    scheduleStart: 8 * 60,
    scheduleEnd: 16 * 60,
    activityMin: 7 * 60 + 40
  });
  assert.equal(punch.basis, "punch");
  assert.equal(punch.start, 8 * 60 + 2);
  assert.equal(punch.end, 16 * 60);
  assert.equal(done.basisLabel("punch", punch.start, "en"), "from punch 8:02 AM");
  assert.equal(done.basisLabel("punch", punch.start, "es"), "desde marcaje 8:02 AM");
  const fromPunch = done.project({
    role: "Housekeeper",
    startMin: punch.start,
    endMin: punch.end,
    standards: standards,
    rooms: [{ kind: "checkout" }]
  });
  assert.equal(fromPunch.finish, 8 * 60 + 2 + 30 + 30);
  assert.equal(fromPunch.flag, "ok");
  const schedule = done.chooseStart({ punchMin: null, scheduleStart: 8 * 60, scheduleEnd: 16 * 60, activityMin: 7 * 60 + 40 });
  assert.equal(schedule.basis, "schedule");
  assert.equal(schedule.start, 8 * 60);
  assert.equal(done.basisLabel("schedule", schedule.start, "en"), "from schedule 8:00 AM");
  assert.equal(done.basisLabel("schedule", schedule.start, "es"), "desde horario 8:00 AM");
  const activity = done.chooseStart({ punchMin: done.parseClock(""), scheduleStart: null, activityMin: 7 * 60 + 40 });
  assert.equal(activity.basis, "activity");
  assert.equal(activity.start, 7 * 60 + 40);
  assert.equal(activity.end, null);
  assert.equal(done.basisLabel("activity", activity.start, "en"), "from first activity 7:40 AM");
  assert.equal(done.basisLabel("activity", activity.start, "es"), "desde la primera actividad 7:40 AM");
  const none = done.chooseStart({});
  assert.equal(none.start, null);
  assert.equal(none.basis, "");
  assert.equal(done.basisLabel("", null, "en"), "");
  const missing = done.project({ role: "Housekeeper", startMin: null, standards: standards, rooms: [] });
  assert.equal(missing.reason, "start");
});

test("a late punch still flags running behind against the scheduled end", () => {
  const chosen = done.chooseStart({ punchMin: 15 * 60, scheduleStart: 8 * 60, scheduleEnd: 16 * 60, activityMin: 8 * 60 });
  assert.equal(chosen.basis, "punch");
  assert.equal(chosen.end, 16 * 60);
  const amber = done.project({
    role: "Housekeeper",
    startMin: chosen.start,
    endMin: chosen.end,
    standards: standards,
    rooms: [{ kind: "checkout" }, { kind: "checkout" }]
  });
  assert.equal(amber.finish, 16 * 60 + 30);
  assert.equal(amber.flag, "amber");
  const red = done.project({
    role: "Laundry Attendant",
    startMin: chosen.start,
    endMin: chosen.end,
    plannedHours: 2
  });
  assert.equal(red.finish, 17 * 60);
  assert.equal(red.flag, "red");
  assert.equal(done.flagLabel(red.flag, "en"), "Running behind");
  assert.equal(done.flagLabel(red.flag, "es"), "Atrasado");
});

test("houseperson is not part of expected done", () => {
  assert.equal(done.project({ role: "House Person", startMin: 8 * 60, plannedHours: 8, standards: standards }), null);
  assert.equal(done.ROLES["House Person"], undefined);
  assert.equal(done.TEAM.Housekeeping, 1);
  assert.equal(done.TEAM["House Person"], undefined);
});
