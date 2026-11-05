const test = require("node:test");
const assert = require("node:assert/strict");
const brief = require("../daily-briefing.js");

test("briefing keeps only sections that have a real value", () => {
  const full = brief.sections({
    occ: 81,
    arrivals: 40,
    departures: null,
    laborActual: 42.5,
    laborPlan: 40,
    openWo: 3,
    overdueWo: 1,
    meetings: ["10:00 Sample Board"],
    leads: ["New · Ada"],
    alerts: ["1 overdue work orders"]
  });
  assert.deepEqual(full.map((row) => row.id), ["occ", "travel", "labor", "wo", "meet", "leads", "alerts"]);
  assert.equal(full.find((row) => row.id === "travel").rows.some((row) => row.en === "Departures"), false);
  assert.equal(full.find((row) => row.id === "occ").value, "81%");
  const empty = brief.sections({ occ: null, arrivals: null, departures: "", meetings: [], leads: [], alerts: [] });
  assert.deepEqual(empty, []);
});

test("spanish labels exist for the briefing title", () => {
  const fs = require("node:fs");
  const src = fs.readFileSync(require("node:path").join(__dirname, "../daily-briefing.js"), "utf8");
  assert.match(src, /Resumen diario/);
  assert.match(src, /Nothing to report for this hotel today/);
  assert.match(src, /No feeds are connected for this hotel/);
  assert.match(src, /authRole\(\)/);
  assert.match(src, /u\.hotel/);
});
