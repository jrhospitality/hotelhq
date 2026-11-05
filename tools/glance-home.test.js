const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const glance = require("../glance-home.js");
const gc = require("../guest-comments.js");
const na = require("../night-audit.js");

const root = path.join(__dirname, "..");

test("the glance home stays off on the live site and for non-leader roles", () => {
  assert.equal(glance.demoOn({ mode: "live" }, "live"), false);
  assert.equal(glance.demoOn({ mode: "live" }, "demo"), false);
  assert.equal(glance.demoOn({ mode: "demo" }, "demo"), true);
  assert.equal(glance.demoOn(null, "demo"), true);
  const leader = { mode: "demo", cfg: { mode: "demo" }, authRole: "GM", surfaceRole: "GM", tab: "home", signedIn: true };
  assert.equal(glance.shouldMount(leader), true);
  assert.equal(glance.shouldMount(Object.assign({}, leader, { mode: "live", cfg: { mode: "live" } })), false);
  assert.equal(glance.shouldMount(Object.assign({}, leader, { authRole: "Front Desk", surfaceRole: "Front Desk" })), false);
  assert.equal(glance.shouldMount(Object.assign({}, leader, { authRole: "Above Property", surfaceRole: "Housekeeping" })), false);
  assert.equal(glance.shouldMount(Object.assign({}, leader, { tab: "wo" })), false);
  assert.equal(glance.shouldMount(Object.assign({}, leader, { signedIn: false })), false);
  assert.equal(glance.viewFor("JR Corporate"), "corporate");
  assert.equal(glance.viewFor("AGM"), "hotel");
  assert.equal(glance.layoutFor("Above Property", false), "corporate");
  assert.equal(glance.layoutFor("Above Property", true), "hotel");
  assert.equal(glance.layoutFor("GM", false), "hotel");
});

test("a hotel role sees only its own hotel and corporate sees all three", () => {
  const all = ["MSPWE", "MSPAM", "MSPMS"];
  assert.deepEqual(glance.visibleHotels("GM", "MSPWE", all), ["MSPWE"]);
  assert.deepEqual(glance.visibleHotels("AGM", "MSPAM", all), ["MSPAM"]);
  assert.deepEqual(glance.visibleHotels("Above Property", null, all), all);
  assert.deepEqual(glance.visibleHotels("Front Desk", "MSPWE", all), []);
  assert.equal(glance.hotelName("MSPWE"), "Golden Valley");
  assert.equal(glance.hotelName("MSPAM"), "Hampton");
  assert.equal(glance.hotelName("MSPMS"), "SpringHill");
});

test("room, labor, and score tones use the existing feeds", () => {
  assert.equal(glance.roomBucket({ flow: "dirty" }), "dirty");
  assert.equal(glance.roomBucket({ flow: "progress" }), "dirty");
  assert.equal(glance.roomBucket({ flow: "reclean" }), "dirty");
  assert.equal(glance.roomBucket({ flow: "cleaned" }), "clean");
  assert.equal(glance.roomBucket({ s: "RFI" }), "clean");
  assert.equal(glance.roomBucket({ flow: "ready" }), "inspected");
  assert.equal(glance.roomBucket({ s: "VC" }), "inspected");
  assert.equal(glance.roomBucket({ s: "OOO" }), "ooo");
  const counts = glance.roomCounts([
    { flow: "dirty" }, { flow: "cleaned" }, { flow: "ready" }, { s: "OOO" }
  ]);
  assert.deepEqual(counts, { dirty: 1, clean: 1, inspected: 1, ooo: 1 });
  assert.equal(glance.roomCounts(null), null);
  const labor = glance.laborOf([{ a: 38.5, p: 36 }, { a: 30, p: 32 }]);
  assert.equal(labor.actual, 68.5);
  assert.equal(labor.plan, 68);
  assert.equal(labor.variance, 0.5);
  assert.equal(glance.laborOf([]), null);
  assert.equal(glance.toneLabor(-1), "good");
  assert.equal(glance.toneLabor(0.5), "watch");
  assert.equal(glance.toneLabor(9.5), "bad");
  assert.equal(glance.toneScore(8.6, 8.4), "good");
  assert.equal(glance.toneScore(8.1, 8.4), "watch");
  assert.equal(glance.toneScore(7.5, 8.4), "bad");
  assert.equal(glance.toneAudit("on_time"), "good");
  assert.equal(glance.toneAudit("open"), "watch");
  assert.equal(glance.toneAudit("overdue"), "bad");
  assert.equal(glance.fmtDue("10:00"), "10:00 AM");
  assert.equal(glance.fmtDue("09:00"), "9:00 AM");
});

test("needs attention links to existing screens and leaves reservation activity unconnected", () => {
  const items = glance.attention({
    audit: { status: "overdue", due: "10:00" },
    comments: 4,
    overdueWo: 1,
    punches: 2,
    labor: { variance: 3, actual: 20, plan: 17 },
    reservations: null
  });
  assert.deepEqual(items.map((item) => item.id), ["audit", "comments", "orders", "labor", "reservations"]);
  assert.deepEqual(items.map((item) => item.go), ["naudit", "gcomm", "wo", "lcmd", "fc"]);
  assert.equal(items[4].tone, "none");
  assert.match(glance.attentionCopy(items[0], "en").detail, /Overdue/);
  assert.match(glance.attentionCopy(items[0], "en").detail, /10:00 AM CT/);
  assert.match(glance.attentionCopy(items[1], "es").detail, /sin atender/);
  assert.match(glance.attentionCopy(items[3], "en").detail, /open punches/);
  assert.match(glance.attentionCopy(items[3], "en").detail, /over plan/);
  assert.equal(glance.attentionCopy(items[4], "en").detail, "No data yet");
  assert.equal(glance.attentionCopy(items[4], "es").detail, "Aún no hay datos");
  const clear = glance.attention({ audit: { status: "on_time", due: "10:00" }, comments: 0, overdueWo: 0, punches: 0, labor: { variance: 0 }, reservations: null });
  assert.equal(clear[1].tone, "good");
  assert.equal(clear[2].tone, "good");
  assert.match(glance.attentionCopy(clear[2], "es").detail, /Ninguna atrasada/);
});

test("corporate rows are one short value per cell and a hotel page stays on that hotel", () => {
  const score = { ytd: 8.6, mtd: 8.1, bench: 8.4 };
  const row = glance.corporateRow({
    code: "MSPWE", occ: 81, score: score, labor: { variance: 1.2, actual: 40, plan: 38.8 }, openWo: 3, audit: "overdue"
  }, "en");
  assert.equal(row.name, "Golden Valley");
  assert.equal(row.cells.occ.text, "81%");
  assert.equal(row.cells.occ.tone, "good");
  assert.equal(row.cells.score.text, "8.6/8.1");
  assert.equal(row.cells.labor.text, "+1.2h");
  assert.equal(row.cells.labor.tone, "watch");
  assert.equal(row.cells.wo.text, "3");
  assert.equal(row.cells.audit.text, "Overdue");
  assert.equal(row.cells.audit.tone, "bad");
  assert.equal(glance.corporateRow({ code: "MSPAM", occ: null, audit: "on_time" }, "es").cells.occ.text, "Aún no hay datos");
  assert.equal(glance.corporateRow({ code: "MSPAM", audit: "on_time" }, "es").cells.audit.text, "Hecha");
  const fromFeed = glance.corporateRow({ code: "MSPWE", audit: { status: "overdue", due: "10:00" } }, "en");
  assert.equal(fromFeed.cells.audit.text, "Overdue");
  assert.equal(fromFeed.cells.audit.tone, "bad");
  assert.equal(glance.corporateRow({ code: "MSPAM", audit: { status: "on_time", due: "09:00" } }, "en").cells.audit.text, "Done");
  const snap = {
    code: "MSPWE",
    occ: 68,
    forecast: 74,
    arrivals: 42,
    departures: null,
    rooms: { dirty: 8, clean: 3, inspected: 11, ooo: 2 },
    openWo: 3,
    overdueWo: 0,
    labor: { actual: 217.5, plan: 208, variance: 9.5 },
    score: score,
    comments: 4,
    punches: 2,
    audit: { status: "overdue", due: "10:00" },
    reservations: null
  };
  const html = glance.hotelHtml(snap, "en");
  assert.match(html, /id="glanceHome"/);
  assert.match(html, /Needs attention today/);
  assert.match(html, /Golden Valley/);
  assert.match(html, /go\('fc'\)/);
  assert.match(html, /go\('rooms'\)/);
  assert.match(html, /go\('wo'\)/);
  assert.match(html, /go\('lcmd'\)/);
  assert.match(html, /go\('naudit'\)/);
  assert.match(html, /go\('gcomm'\)/);
  assert.match(html, /No data yet/);
  assert.equal(html.includes("MSPAM"), false);
  assert.equal(html.includes("MSPMS"), false);
  const es = glance.hotelHtml(snap, "es");
  assert.match(es, /Requiere atención hoy/);
  assert.match(es, /Ocupación/);
  assert.match(es, /Aún no hay datos/);
  const corp = glance.corporateHtml([
    row,
    glance.corporateRow({ code: "MSPAM", occ: 74, score: score, labor: { variance: -1 }, openWo: 0, audit: "on_time" }, "en"),
    glance.corporateRow({ code: "MSPMS", occ: 58, score: { ytd: 7.5, mtd: 7.9, bench: 8.4 }, labor: { variance: 4 }, openWo: 6, audit: "open" }, "en")
  ], "en");
  assert.match(corp, /data-glance="corporate"/);
  assert.match(corp, /Golden Valley/);
  assert.match(corp, /Hampton/);
  assert.match(corp, /SpringHill/);
  assert.match(corp, /hhqOpenHotel\('MSPWE'\)/);
  assert.match(corp, /hhqOpenHotel\('MSPAM'\)/);
  assert.match(corp, /hhqOpenHotel\('MSPMS'\)/);
  const back = glance.hotelHtml(snap, "en", { back: true });
  assert.match(back, /hhqPortfolio\(\)/);
  assert.match(back, /All hotels/);
});

test("guest scores and night audit sample data feed the glance copy", () => {
  const now = "2026-11-05T16:00:00.000Z";
  const scores = gc.scoreRow(gc.buildDemo(now), "MSPWE", "overall");
  assert.equal(scores.ytd.bench, 8.4);
  assert.ok(scores.ytd.actual != null);
  assert.equal(glance.scoreText({ ytd: scores.ytd.actual, mtd: scores.mtd.actual, bench: scores.ytd.bench }).includes("/"), true);
  const model = na.buildDemo(now);
  const rows = na.hotelRows(model, ["MSPWE", "MSPAM", "MSPMS"], now);
  assert.equal(rows.length, 3);
  rows.forEach((row) => {
    assert.match(glance.auditLabel(row.status, "en"), /Done|Due|Overdue|Late|Missed/);
  });
});

test("demo home loads the glance script and live mode never mounts it", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const src = fs.readFileSync(path.join(root, "glance-home.js"), "utf8");
  const comments = html.indexOf('src="guest-comments.js"');
  const glanceTag = html.indexOf('src="glance-home.js"');
  assert.ok(comments > 0 && glanceTag > comments);
  assert.match(sw, /\.\/glance-home\.js/);
  assert.match(src, /shouldMount\(input\)/);
  assert.match(src, /demoOn/);
  assert.match(src, /No data yet/);
  assert.match(src, /Aún no hay datos/);
  assert.equal(src.includes("supabaseKey"), false);
});
