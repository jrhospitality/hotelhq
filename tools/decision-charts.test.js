const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const charts = require("../decision-charts.js");
const audit = require("../night-audit.js");
const scores = require("../guest-scores.js");
const fair = require("../fair-share.js");

test("money, percent, and per occupied room use one format", () => {
  assert.equal(charts.fmtMoney(110), "$110.00");
  assert.equal(charts.fmtMoney(224000), "$224,000.00");
  assert.equal(charts.fmtMoney(-2.5), "-$2.50");
  assert.equal(charts.fmtMoney(null), "—");
  assert.equal(charts.fmtPct(68.54), "68.5%");
  assert.equal(charts.fmtPct(null), "—");
  assert.equal(charts.fmtPor(2), "$2.00");
  assert.equal(charts.fmtIndex(105.84), "105.8");
});

test("pace chart reads night-audit lines and skips an empty feed", () => {
  const points = charts.pacePoints(audit.exampleFeed());
  assert.equal(points.origin, "example");
  assert.equal(points.lines.occupancy.today, 70);
  assert.equal(points.lines.adr.mtd, 108.25);
  assert.equal(points.lines.revpar.ytd, 75.86);
  assert.equal(charts.pacePoints({ connected: false, lines: [] }), null);
  assert.equal(charts.pacePoints(null), null);
});

test("guest score chart uses month-to-date facts and the published goals", () => {
  const facts = scores.examplePeriods("2026-11-16");
  const model = charts.scorePoints(facts, "MSPWE", scores);
  assert.equal(model.origin, "example");
  const overall = model.rows.find((row) => row.id === "overall_experience");
  const service = model.rows.find((row) => row.id === "overall_service");
  const bath = model.rows.find((row) => row.id === "bathroom_cleanliness");
  assert.equal(overall.goal, 83);
  assert.equal(overall.value, 81);
  assert.equal(service.goal, 88);
  assert.equal(bath.goal, 88);
  assert.equal(charts.FLOOR, 80);
  assert.equal(charts.scorePoints([], "MSPWE", scores).origin, "empty");
  assert.equal(charts.scorePoints(facts, "MSPAM", scores).origin, "empty");
});

test("fair share, labor, inspections, and occupancy trend stay on real rows", () => {
  const model = fair.buildDemo("2026-11-16");
  const rows = charts.fairPoints(fair.compare(model, "MSPWE", "t7"));
  assert.deepEqual(rows.map((row) => row.id), ["MPI", "ARI", "RGI"]);
  assert.ok(rows[0].index > 100);
  const labor = charts.laborPoints([{ n: "Maria (EX)", a: 38.5, p: 36 }, { n: "Skip" }]);
  assert.deepEqual(labor, [{ name: "Maria (EX)", actual: 38.5, plan: 36 }]);
  assert.equal(charts.laborExample(labor), true);
  assert.equal(charts.laborExample([{ name: "Ana Ruiz", actual: 8, plan: 8 }]), false);
  const insp = charts.inspPoints([
    { date: "2026-11-02", score: 92, room: "214" },
    { date: "2026-11-01", score: 80, room: "101" },
    { date: "2026-11-03", score: "nope" }
  ]);
  assert.deepEqual(insp.map((row) => row.date), ["2026-11-01", "2026-11-02"]);
  assert.equal(charts.occTrend([{ d: 0, occ: 68 }, { occ: null }, { d: 2, occ: 81 }]).length, 2);
  assert.equal(charts.occTrend([{ occ: 70 }]).length, 0);
});

test("empty states are bilingual and do not invent a market number", () => {
  const es = charts.emptyPanel({
    id: "hqMarket",
    lang: "es",
    en: "Market sales per occupied room",
    es: "Ventas de tienda por cuarto ocupado",
    emptyEn: "Market sales are not loaded yet.",
    emptyEs: "Todavía no hay ventas de tienda."
  });
  assert.match(es, /Ventas de tienda por cuarto ocupado/);
  assert.match(es, /Todavía no hay ventas de tienda/);
  assert.match(es, /hq-empty/);
  assert.doesNotMatch(es, /\$\d/);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.ok(html.indexOf('src="guest-scores.js"') < html.indexOf('src="decision-charts.js"'));
  assert.match(html, /href="readability\.css"/);
  assert.match(sw, /hotelhq-shell-v33/);
  assert.match(sw, /\.\/decision-charts\.js/);
  assert.match(sw, /\.\/vendor\/chart\.umd\.min\.js/);
});
