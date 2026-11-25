const test = require("node:test");
const assert = require("node:assert/strict");
const he = require("./he-labor.js");

const STANDARDS = { minutesPerCheckout: 30, minutesPerStayover: 15, hoursPerOccupiedRoom: 0.36 };

const POSITIONS = [
  "Position,Actual Hours,Plan Hours,Scheduled Hours,Hotel ID",
  "Front Desk,24.5,24,24,118172",
  "Room Attendant,36,32,34,118172",
  "Breakfast Attendant,8,8,8,118172",
  "Maintenance,10,8,8,118172",
  "Prop Ops,4,4,4,118172",
  "Total,82.5,76,78,118172"
].join("\n");

const HK = [
  "Employee,Position,Hours,Cleans,MPR,Checkouts,Stayovers,PIN,Employee Code",
  "Alex Example,Room Attendant,8.2,12,41,8,4,1234,99881",
  "Blake Example,Room Attendant,7.5,0,,0,0,0000,111",
  "Casey Example,Room Attendant,0,4,,0,4,9999,222",
  "Drew Example,Hskp Supervisor,8,0,,0,0,4242,333",
  "4821,Room Attendant,5,10,,5,5,1212,444"
].join("\n");

const PUNCHES = [
  "Employee,Position,Missing Punch,Date",
  "Riley Example,Front Desk,Missing Out,2026-11-29",
  "Quinn Example,,Missing In,11/29/2026",
  "Sam Example,Front Desk,Missing Out,2026-11-28"
].join("\n");

const ASSOCIATES = [
  "Name,Position,Actual,Plan,Scheduled,Plan level,Scheduled level",
  "Alex Example,Room Attendant,8.2,7.5,8,associate,associate",
  "Jordan Example,Front Desk,8.5,16,16,position,position",
  "Blair Example,Breakfast Attendant,8,8,8,associate,associate"
].join("\n");

function files() {
  return [
    { name: "Hskp Details Daily (Group).csv", text: HK },
    { name: "Missing Punches.csv", text: PUNCHES },
    { name: "Position Win Loss.csv", text: POSITIONS },
    { name: "Associate Win Loss.csv", text: ASSOCIATES }
  ];
}

test("parser keeps fictional names and drops codes, PINs, and other days", () => {
  const parsed = he.readFiles(files(), { hotel: "MSPWE", workDate: "2026-11-29" });
  assert.equal(parsed.ok, true, parsed.errors && parsed.errors.join("; "));
  const raw = JSON.stringify(parsed.payload);
  ["1234", "99881", "0000", "4242", "1212", "4821"].forEach(function (secret) {
    assert.equal(raw.includes(secret), false, secret);
  });
  assert.equal(parsed.payload.hotel, "MSPWE");
  assert.equal(parsed.payload.he_property_id, "118172");
  assert.equal(parsed.payload.positions.length, 5);
  assert.deepEqual(parsed.payload.housekeeping.map(function (row) { return row.name; }), [
    "Alex Example", "Blake Example", "Casey Example", "Drew Example"
  ]);
  assert.equal(parsed.payload.punches.length, 2);
  assert.equal(parsed.payload.punches[0].missing, "out");
  assert.equal(parsed.payload.punches[1].missing, "in");
  assert.equal(parsed.payload.punches[1].position, "");
});

test("a PIN or employee-code column is ignored and its values are not kept", () => {
  const parsed = he.readFiles([
    { name: "Missing Punches.csv", text: "Employee,PIN,Employee Code,Missing Punch\nRiley Example,1234,99881,Missing Out\n" }
  ], { hotel: "MSPWE", workDate: "2026-11-29" });
  assert.equal(parsed.ok, true, parsed.errors && parsed.errors.join("; "));
  assert.equal(parsed.dropped.indexOf("pin") >= 0, true);
  assert.equal(parsed.dropped.indexOf("employee code") >= 0, true);
  const raw = JSON.stringify(parsed.payload);
  assert.equal(raw.includes("1234"), false);
  assert.equal(raw.includes("99881"), false);
  assert.equal(parsed.payload.punches[0].name, "Riley Example");
  assert.equal(parsed.payload.punches[0].missing, "out");
});

test("SpringHill and Hampton ids are recognized and stay disabled", () => {
  assert.equal(he.hotelFromCell("118172"), "MSPWE");
  assert.equal(he.hotelFromCell("SpringHill Suites"), "MSPMS");
  assert.equal(he.hotelFromCell("Hampton"), "MSPAM");
  assert.equal(he.HOTELS.MSPWE.enabled, true);
  assert.equal(he.HOTELS.MSPMS.enabled, false);
  assert.equal(he.HOTELS.MSPAM.enabled, false);
  assert.equal(he.HOTELS.MSPMS.hePropertyId, "");
});

test("wrong property id and Excel are refused", () => {
  const wrong = he.readFiles([
    { name: "Position Win Loss.csv", text: "Position,Actual,Plan,Scheduled,Hotel ID\nFront Desk,8,8,8,999999\n" }
  ], { hotel: "MSPWE", workDate: "2026-11-29" });
  assert.equal(wrong.ok, false);
  assert.match(wrong.errors.join(" "), /property id/);
  const excel = he.readFiles([{ name: "winloss.xlsx", text: "PK fake" }], { hotel: "MSPWE", workDate: "2026-11-29" });
  assert.match(excel.errors.join(" "), /Excel/);
});

test("action items cover punches, cleans, check-in, and over-plan associates", () => {
  const parsed = he.readFiles(files(), { hotel: "MSPWE", workDate: "2026-11-29" });
  const day = he.deriveDay(parsed.payload, { standards: STANDARDS, roomsSold: 80 });
  const kinds = day.items.map(function (item) { return item.kind; });
  assert.deepEqual(kinds, [
    "missing_punch",
    "missing_punch",
    "unknown_position",
    "hours_zero_cleans",
    "cleans_zero_hours",
    "five_minute_checkin",
    "trim_overplan",
    "trim_overplan"
  ]);
  assert.equal(day.items[0].whatEn.includes("Riley Example"), true);
  assert.equal(day.items[0].whatEn.includes("Out"), true);
  assert.equal(day.items[2].who, "Quinn Example");
  const blake = day.items.filter(function (item) { return item.who === "Blake Example"; });
  assert.equal(blake.length, 1);
  assert.equal(blake[0].kind, "hours_zero_cleans");
  assert.equal(day.items.some(function (item) { return item.who === "Drew Example" && item.kind !== "five_minute_checkin" && item.kind !== "trim_overplan"; }), false);
  assert.equal(day.items.some(function (item) { return item.kind === "zero_cleans_vs_sold"; }), false);
  const alex = day.overplan.filter(function (row) { return row.name === "Alex Example"; })[0];
  assert.equal(alex.planScope, "associate");
  assert.equal(alex.variance, 0.7);
  const jordan = day.overplan.filter(function (row) { return row.name === "Jordan Example"; })[0];
  assert.equal(jordan.planScope, "position");
  assert.equal(jordan.variance, null);
  assert.equal(day.positions.filter(function (row) { return row.group === "excluded"; }).length, 2);
  assert.equal(day.totals.actual, 68.5);
  assert.equal(day.exceptionCount, 7);
  const room = day.housekeeping[0];
  assert.equal(room.mprTarget, 25);
  assert.equal(day.items.every(function (item, i) { return item.itemNo === i + 1 && item.dueOn === "2026-11-30"; }), true);
  day.items.forEach(function (item) { assert.equal(item.whatEs.length > 10, true); });
});

test("a quiet day still has the check-in and no exception flags", () => {
  const payload = {
    hotel: "MSPWE",
    work_date: "2026-11-28",
    source: "he",
    housekeeping_loaded: true,
    punches_loaded: true,
    positions_loaded: true,
    associates_loaded: true,
    positions: [
      { position: "Front Desk", actual_hours: 24, plan_hours: 24, scheduled_hours: 24 },
      { position: "Room Attendant", actual_hours: 30, plan_hours: 32, scheduled_hours: 32 }
    ],
    housekeeping: [
      { name: "Jordan Example", position: "Room Attendant", hours: 8, cleans: 16, checkouts: 8, stayovers: 8 }
    ],
    associates: [
      { name: "Jordan Example", position: "Room Attendant", actual_hours: 8, plan_hours: 8, scheduled_hours: 8, plan_scope: "associate", scheduled_scope: "associate" }
    ],
    punches: []
  };
  const day = he.deriveDay(payload, { standards: STANDARDS, roomsSold: 70 });
  assert.equal(day.exceptionCount, 0);
  assert.equal(day.items.length, 1);
  assert.equal(day.items[0].kind, "five_minute_checkin");
  assert.equal(day.loaded, true);
  assert.equal(day.totals.actual, 54);
});

test("zero cleans against rooms sold flags only when the housekeeping file was loaded", () => {
  const base = {
    hotel: "MSPWE",
    work_date: "2026-11-29",
    source: "he",
    positions_loaded: true,
    punches_loaded: false,
    associates_loaded: false,
    positions: [{ position: "Room Attendant", actual_hours: 0, plan_hours: 20, scheduled_hours: 20 }],
    housekeeping: [],
    associates: [],
    punches: []
  };
  const missingFile = he.deriveDay(Object.assign({}, base, { housekeeping_loaded: false }), { roomsSold: 40 });
  assert.equal(missingFile.items.some(function (item) { return item.kind === "zero_cleans_vs_sold"; }), false);
  const loaded = he.deriveDay(Object.assign({}, base, { housekeeping_loaded: true }), { roomsSold: 40 });
  assert.equal(loaded.items.some(function (item) { return item.kind === "zero_cleans_vs_sold"; }), true);
  const unknownRooms = he.deriveDay(Object.assign({}, base, { housekeeping_loaded: true }), {});
  assert.equal(unknownRooms.items.some(function (item) { return item.kind === "zero_cleans_vs_sold"; }), false);
});

test("payload secrets are refused and maintenance stays off the daily total", () => {
  assert.throws(function () {
    he.deriveDay({ hotel: "MSPWE", work_date: "2026-11-29", pin: "1234", positions: [] });
  }, /PIN/);
  assert.equal(he.excludedPosition("Maintenance"), true);
  assert.equal(he.excludedPosition("Prop Ops"), true);
  assert.equal(he.excludedPosition("Property Operations"), true);
  assert.equal(he.excludedPosition("Room Attendant"), false);
  assert.equal(he.isSupervisor("Hskp Supervisor"), true);
  assert.equal(he.isSupervisor("Room Attendant"), false);
  assert.equal(he.cleanName("4821"), "");
  assert.equal(he.cleanName("Alex Example"), "Alex Example");
});
