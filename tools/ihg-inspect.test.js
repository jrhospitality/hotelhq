const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ihg = require("../ihg-inspect.js");

function marks(result, overrides) {
  const out = {};
  ihg.ITEMS.forEach((item) => {
    out[item.id] = { result: result, note: "", photo: "" };
  });
  Object.keys(overrides || {}).forEach((id) => {
    out[id] = Object.assign({ note: "", photo: "" }, overrides[id]);
  });
  return out;
}
function record(extra) {
  return ihg.buildRecord(Object.assign({
    hotel: "MSPAM",
    date: "2026-10-30",
    room: "214",
    attendant: "Rosa Vega",
    inspector: "Nina Shah",
    marks: marks("pass")
  }, extra));
}

test("the form has the five steps, the line points, and scales a full pass to 100", () => {
  assert.deepEqual(ihg.STEPS.map((step) => step.en), [
    "Survey", "Service", "Shine Bathroom", "Shine Sleeping Room", "Stage", "Self-Inspect"
  ]);
  assert.deepEqual(ihg.STEPS.map((step) => step.n), ["1", "2", "3", "3", "4", "5"]);
  const raw = ihg.ITEMS.reduce((sum, item) => sum + item.points, 0);
  assert.equal(raw, 101);
  assert.equal(ihg.ITEMS.filter((item) => item.optional).map((item) => item.id).join(","), "appliances,shower,balcony");
  assert.deepEqual(ihg.ITEMS.filter((item) => item.workOrder).map((item) => item.id), ["bulbs", "hvac", "appliances", "door"]);
  ihg.ITEMS.forEach((item) => {
    assert.ok(item.en.length > 8);
    assert.ok(item.es.length > 8);
    assert.equal(item.en.includes("example"), false);
  });
  const perfect = record();
  assert.equal(perfect.ok, true);
  assert.equal(perfect.row.score, 100);
  assert.equal(perfect.row.earned, raw);
  assert.equal(perfect.row.possible, raw);
});

test("a miss scores 0 for that line and an applicable N/A is dropped from the total", () => {
  const missed = record({ marks: marks("pass", { bulbs: { result: "fail", note: "Two lamps out", photo: "" } }) });
  assert.equal(missed.row.score, Math.round((101 - 2) / 101 * 100));
  assert.equal(missed.row.marks.bulbs.note, "Two lamps out");
  const skipped = record({ marks: marks("pass", { balcony: { result: "na" }, appliances: { result: "na" } }) });
  assert.equal(skipped.row.score, 100);
  assert.equal(skipped.row.possible, 101 - 1 - 2);
  const blocked = record({ marks: marks("pass", { bulbs: { result: "na" } }) });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error, "na");
  assert.equal(ihg.workOrderText("hvac", "Not cooling", "en").includes("HVAC"), true);
  assert.equal(ihg.workOrderText("bed_made", "", "en"), "");
});

test("one inspection per attendant fills that week, and the month averages weeks on file", () => {
  assert.equal(ihg.monthWeek("2026-10-01").index, 1);
  assert.equal(ihg.monthWeek("2026-10-08").index, 2);
  assert.equal(ihg.monthWeek("2026-10-15").index, 3);
  assert.deepEqual(ihg.monthWeek("2026-10-30"), { month: "2026-10", index: 4, start: "2026-10-22", end: "2026-10-31" });
  const first = record({ date: "2026-10-05", marks: marks("pass", { bulbs: { result: "fail" } }) }).row;
  const fourth = record({ date: "2026-10-30" }).row;
  const rows = ihg.saveRecord(ihg.saveRecord([], first), fourth);
  assert.equal(rows.length, 2);
  assert.deepEqual(ihg.stillNeeded(rows, ["Rosa Vega", "Ana Lopez"], "2026-10-30"), ["Ana Lopez"]);
  assert.equal(ihg.weeklyScore(rows, "Rosa Vega", "2026-10", 1), first.score);
  assert.equal(ihg.weeklyScore(rows, "Rosa Vega", "2026-10", 4), 100);
  assert.equal(ihg.weeklyScore(rows, "Rosa Vega", "2026-10", 2), null);
  const month = ihg.monthlyScore(rows, "Rosa Vega", "2026-10");
  assert.equal(month.weeks, 2);
  assert.equal(month.score, Math.round((first.score + 100) / 2));
  const replaced = ihg.saveRecord(rows, record({ date: "2026-10-06" }).row);
  assert.equal(replaced.filter((row) => row.attendant === "Rosa Vega" && ihg.monthWeek(row.date).index === 1).length, 1);
  assert.equal(ihg.weeklyScore(replaced, "Rosa Vega", "2026-10", 1), 100);
});

test("room attendants see only their own rows and corporate can read every hotel", () => {
  const rows = [
    record().row,
    record({ hotel: "MSPMS", attendant: "Ana Lopez", inspector: "Grace Kim" }).row
  ];
  assert.deepEqual(ihg.visibleRows(rows, "Housekeeper", "Rosa Vega", "MSPAM").map((row) => row.attendant), ["Rosa Vega"]);
  assert.equal(ihg.visibleRows(rows, "Housekeeper", "Rosa Vega", "MSPMS").length, 0);
  assert.equal(ihg.visibleRows(rows, "Housekeeping", "Nina Shah", "MSPAM").length, 1);
  assert.equal(ihg.visibleRows(rows, "GM", "Riley Brooks", "MSPAM").length, 1);
  assert.equal(ihg.visibleRows(rows, "AGM", "Sam Patel", "MSPAM").length, 1);
  assert.equal(ihg.visibleRows(rows, "Above Property", "Alex Rivera", "").length, 2);
  assert.equal(ihg.visibleRows(rows, "Front Desk", "Kim Nguyen", "MSPAM").length, 0);
  assert.equal(ihg.access("Housekeeper").edit, false);
  assert.equal(ihg.access("Housekeeping").edit, true);
  assert.equal(ihg.access("Above Property").allHotels, true);
});

test("the migration adds the IHG table and leaves the existing inspections alone", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261110_ihg_room_inspections.sql"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(sql, /create table if not exists public\.ihg_room_inspections/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /private\.my_role\(\) in \('gm', 'agm', 'hk_lead'\)/);
  assert.match(sql, /private\.my_role\(\) = 'housekeeper'/);
  assert.match(sql, /raise exception 'not allowed'/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /alter table public\.inspections/i);
  assert.match(html, /function addI\(\)/);
  assert.match(html, /function inspPass\(/);
  assert.match(html, /ihg-inspect\.js/);
  assert.equal(sql.toLowerCase().includes("rosa"), false);
  assert.equal(sql.toLowerCase().includes("nina"), false);
});
