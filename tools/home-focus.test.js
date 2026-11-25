const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const home = require("../home-focus.js");
const hhq = require("../permissions.js");

test("each role's today summary stays within four counts", () => {
  const snap = { arr: 42, dirty: 9, openWo: 4, rfi: 2, esc: 1, occ: 88, issues: 5, ready: 12, overduePm: 1, check: 40, runs: 3, openReq: 2, done: "3/8", progress: 1, dnd: 0 };
  ["Front Desk", "Housekeeping", "Housekeeper", "Maintenance", "Shuttle Driver", "House Person", "Laundry Attendant", "Breakfast Attendant", "GM", "AGM"].forEach((role) => {
    const model = home.todayModel(role, snap);
    assert.ok(model.items.length >= 1 && model.items.length <= 4, role);
  });
  assert.deepEqual(home.todayModel("Front Desk", snap).items.map((item) => item.en), ["Arrivals", "Dirty", "Open WOs"]);
  assert.equal(home.todayModel("GM", snap).items[0].n, "88%");
  assert.equal(home.todayModel("Shuttle Driver", { shuttle: false }).items.length, 0);
  assert.match(home.todayModel("Shuttle Driver", { shuttle: false }).noteEs, /shuttle/i);
});

test("corporate rows use occupancy or rooms ready and stay inside the hotels this role can see", () => {
  const withOcc = home.portfolioRow("MSPWE", "Golden Valley", { occ: 88, ready: 12, issues: 4 });
  assert.equal(withOcc.metric, "88%");
  assert.equal(withOcc.metricEn, "Occ");
  assert.equal(withOcc.issues, 4);
  const ready = home.portfolioRow("MSPAM", "Airport", { occ: null, ready: 12, issues: 0 });
  assert.equal(ready.metric, "12");
  assert.equal(ready.metricEs, "Cuartos listos");
  const hotels = home.hotelsFor("GM", "MSPWE", ["MSPWE", "MSPAM", "MSPMS"], hhq.seesHotel);
  assert.deepEqual(hotels, ["MSPWE"]);
  assert.deepEqual(home.hotelsFor("Above Property", null, ["MSPWE", "MSPAM", "MSPMS"], hhq.seesHotel), ["MSPWE", "MSPAM", "MSPMS"]);
});

test("urgent alerts are meetings today and overdue work, and they respect switches", () => {
  assert.deepEqual(home.urgentItems({ meetings: 2, featureMeet: false, canMeet: true }), []);
  assert.deepEqual(home.urgentItems({ meetings: 2, featureMeet: true, canMeet: false }), []);
  assert.equal(home.urgentItems({ meetings: 0, overdueWo: 0, overduePm: 3, seesPm: false, overdueTasks: 0 }).length, 0);
  const shown = home.urgentItems({ meetings: 1, canMeet: true, featureMeet: true, overdueWo: 2, overduePm: 1, seesPm: true, overdueTasks: 4, lateRush: 1 });
  assert.deepEqual(shown.map((item) => item.kind), ["meeting", "wo", "pm", "task", "rush"]);
});

test("empty cards hide and the sales-lead rollup stays under More", () => {
  assert.equal(home.cardIsEmpty({ id: "alerts", rows: 0, text: "Open alerts No alerts." }), true);
  assert.equal(home.cardIsEmpty({ id: "todayCard", rows: 0, text: "Today Nothing urgent right now." }), true);
  assert.equal(home.cardIsEmpty({ id: "opsList", rows: 0, badge: 0, text: "Requests No requests yet." }), true);
  assert.equal(home.cardIsEmpty({ id: "mtMgrHome", rows: 0, count: 0, text: "Meetings today 0" }), true);
  assert.equal(home.cardIsEmpty({ id: "mtDayBanner", rows: 1, text: "Today's events Sample Board" }), false);
  assert.equal(home.cardIsEmpty({ id: "slRollup", rows: 3, text: "Sales Leads by Hotel" }), false);
  assert.equal(home.slotFor("slRollup"), "more");
  assert.equal(home.slotFor("slHome"), "more");
  assert.equal(home.slotFor("wn-card"), "more");
  assert.equal(home.slotFor("gsHome"), "more");
  assert.equal(home.slotFor("pkHome"), "more");
  assert.equal(home.slotFor("hhqToday"), "today");
  assert.equal(home.slotFor("hhqUrgent"), "urgent");
  assert.equal(home.slotFor("hhqActions"), "actions");
});

test("corporate home is data-forward and every other role stays operations-forward", () => {
  assert.equal(home.homeMode("Above Property"), "data");
  assert.equal(home.homeMode("JR Corporate"), "data");
  ["GM", "AGM", "Front Desk", "Housekeeping", "Housekeeper", "Maintenance", "Shuttle Driver", "House Person", "Laundry Attendant", "Breakfast Attendant"].forEach((role) => {
    assert.equal(home.homeMode(role), "ops", role);
  });
  const cards = home.dataCards({ occ: "81%", adr: null, revpar: null, laborVar: "+1.2h", openWo: "4", score: null, leads: "3", avgHours: "5.0" });
  assert.deepEqual(cards.map((card) => card.id), ["occ", "labor", "wo", "leads", "response"]);
  const cols = home.compareColumns([
    { occ: "80%", adr: null, revpar: null, wo: "2", leads: "1", hours: null },
    { occ: "70%", adr: null, revpar: null, wo: "0", leads: null, hours: null }
  ]);
  assert.deepEqual(cols.map((col) => col.id), ["occ", "wo", "leads"]);
  assert.equal(home.sparkPath([68, 74, 88]).startsWith("M"), true);
  assert.equal(home.sparkPath([88]), "");
  assert.deepEqual(home.opsSections({ tasks: ["Lobby"], rooms: [], alerts: [], notes: [], orders: [{ id: 1 }], checks: [] }), ["tasks", "orders"]);
  assert.deepEqual(home.opsSections({}), []);
});

test("home focus loads after the sales-lead rollup", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sales = html.indexOf('src="sales-leads.js"');
  const focus = html.indexOf('src="home-focus.js"');
  assert.ok(sales > 0 && focus > sales);
});
