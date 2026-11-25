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
  assert.match(src, /No feeds are connected for this hotel/);
  assert.equal(src.includes("Nothing to report for this hotel today"), false);
  assert.match(src, /authRole\(\)/);
  assert.match(src, /u\.hotel/);
});

test("live and demo share the missing-feed wording", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const train = fs.readFileSync(path.join(root, "training.js"), "utf8");
  const ihg = fs.readFileSync(path.join(root, "ihg-inspect.js"), "utf8");
  const audit = fs.readFileSync(path.join(root, "night-audit.js"), "utf8");
  assert.equal(html.includes('authMode==="live"||imported'), false);
  assert.equal(html.includes('authMode==="live"||jget(IA'), false);
  assert.match(html, /Hotel Effectiveness is not connected, so this is not an all-clear/);
  assert.match(html, /Hotel Effectiveness punches are not connected, so this is not an all-clear/);
  assert.match(train, /Brand feed is not connected\. This is not an all-clear\./);
  assert.equal(train.includes("No brand file is waiting"), false);
  assert.match(ihg, /Room attendant list is not connected\. This is not an all-clear\./);
  assert.equal(ihg.includes("demoRoster"), false);
  const logic = audit.slice(audit.indexOf("function hasReport"), audit.indexOf("function streak"));
  assert.match(logic, /return "no_report"/);
  assert.equal(/authMode|HOTELHQ_CONFIG/.test(logic), false);
});
