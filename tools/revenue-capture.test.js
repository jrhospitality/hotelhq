const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cap = require("../revenue-capture.js");
const menus = require("../feature-menus.js");
const hhq = require("../permissions.js");

const NOW = "2026-11-12T18:00:00.000Z";
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const gm = { role: "GM", hotel: "MSPAM", name: "Riley Brooks" };
const agm = { role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const on = function () { return true; };
const parkingDefault = function (hotel) { return hotel !== "MSPWE"; };

function view(extra) {
  return Object.assign({ lang: "en", period: "today", parkingOn: parkingDefault, today: "2026-11-12" }, extra || {});
}

test("the owner formula check is not stored as demo or loader data", () => {
  const hampton = cap.summarize([{
    hotel: "MSPAM", business_date: "2026-11-11", rooms_sold: 100,
    parking_parking: 500, parking_addon_self: 200, parking_third_party: 65,
    parking_manual: 999, parking_daily_pk: 999,
    market_front_desk: 94.45, market_kiosk: null
  }], "MSPAM", 15, true);
  assert.equal(hampton.parking, 765);
  assert.equal(cap.fmtCars(hampton.cars), "51.0");
  assert.equal(cap.fmtPct(hampton.capture), "51.0%");
  assert.equal(cap.fmtMoney(hampton.perRoom), "$0.94");
  assert.equal(hampton.incomplete, false);

  const spring = cap.summarize([{
    hotel: "MSPMS", business_date: "2026-11-11", rooms_sold: 103,
    parking_daily_pk: 385, parking_parking: 999,
    market_front_desk: 116.94, market_kiosk: null
  }], "MSPMS", 15, true);
  assert.equal(cap.fmtPct(spring.capture), "24.9%");
  assert.equal(cap.fmtMoney(spring.perRoom), "$1.14");
  assert.equal(spring.incomplete, false);

  const valley = cap.summarize([{
    hotel: "MSPWE", business_date: "2026-11-11", rooms_sold: 58,
    parking_parking: 30, parking_manual: 12, parking_addon_self: 999,
    market_front_desk: 4, market_kiosk: null
  }], "MSPWE", 10, false);
  assert.equal(cap.parkingRevenue("MSPWE", valley && { parking_parking: 30, parking_manual: 12, parking_addon_self: 999 }), 42);
  assert.equal(cap.fmtMoney(valley.perRoom), "$0.07");
  assert.equal(valley.kioskMissing, true);
  assert.equal(valley.incomplete, true);
  assert.equal(valley.parkingHidden, true);

  const early = cap.marketParts("MSPWE", { business_date: "2026-11-01", market_front_desk: 20, market_kiosk: null });
  assert.equal(early.incomplete, false);
  const zeroKiosk = cap.marketParts("MSPWE", { business_date: "2026-11-11", market_front_desk: 4, market_kiosk: 0 });
  assert.equal(zeroKiosk.kioskMissing, false);
  assert.equal(zeroKiosk.revenue, 4);

  const demo = JSON.stringify(cap.buildDemo(NOW));
  const root = path.join(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261117_revenue_daily_facts.sql"), "utf8");
  const example = fs.readFileSync(path.join(root, "supabase/examples/load_revenue_daily_facts.example.sql"), "utf8");
  ["765", "94.45", "116.94", "385"].forEach(function (token) {
    assert.equal(demo.includes(token), false, token);
    assert.equal(sql.includes(token), false, token);
    assert.equal(example.includes(token), false, token);
  });
  assert.equal(demo.includes("\"rooms_sold\":100"), false);
  assert.equal(demo.includes("\"rooms_sold\":103"), false);
  assert.equal(demo.includes("\"rooms_sold\":58"), false);
});

test("period totals divide summed revenue by summed rooms", () => {
  const rows = [
    { hotel: "MSPAM", business_date: "2026-11-01", rooms_sold: 10, parking_parking: 30, parking_addon_self: 0, parking_third_party: 0, market_front_desk: 10, market_kiosk: null },
    { hotel: "MSPAM", business_date: "2026-11-02", rooms_sold: 30, parking_parking: 60, parking_addon_self: 0, parking_third_party: 0, market_front_desk: 90, market_kiosk: null }
  ];
  const sum = cap.summarize(rows, "MSPAM", 15, true);
  assert.equal(sum.rooms, 40);
  assert.equal(sum.parking, 90);
  assert.equal(cap.fmtCars(sum.cars), "6.0");
  assert.equal(cap.fmtPct(sum.capture), "15.0%");
  assert.equal(cap.fmtMoney(sum.perRoom), "$2.50");
  assert.equal(cap.goalText(sum, "en"), "+$0.50 vs $2 goal");
  const fractional = cap.impliedCars(100, 15);
  assert.ok(Math.abs(fractional - (100 / 15)) < 1e-9);
  assert.equal(cap.captureRate(100, 15, 0), null);
});

test("leaders see their hotels and other roles see none", () => {
  assert.equal(hhq.can("GM", "capture.see"), true);
  assert.equal(hhq.can("AGM", "capture.see"), true);
  assert.equal(hhq.can("Above Property", "capture.see"), true);
  assert.equal(hhq.can("JR Corporate", "capture.see"), true);
  assert.equal(hhq.can("Front Desk", "capture.see"), false);
  assert.equal(hhq.can("Housekeeper", "capture.see"), false);
  assert.deepEqual(cap.hotelsFor("Above Property", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(cap.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(cap.hotelsFor("GM", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(cap.hotelsFor("AGM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(cap.hotelsFor("Front Desk", "MSPWE"), []);
  assert.equal(cap.canEdit("Above Property"), true);
  assert.equal(cap.canEdit("GM"), false);
  assert.equal(menus.menuAllows("capture", "AGM", "MSPWE", function () { return false; }), true);
  assert.equal(menus.menuAllows("capture", "GM", "MSPWE"), true);
  assert.equal(menus.menuAllows("capture", "JR Corporate", "MSPMS"), true);
  assert.equal(menus.menuAllows("capture", "Front Desk", "MSPAM"), false);
  assert.equal(menus.menuAllows("capture", "Housekeeper", "MSPAM"), false);
  assert.equal(menus.menuAllows("capture", "Maintenance", "MSPMS"), false);
});

test("demo pages label example numbers and hide Golden Valley parking", () => {
  const model = cap.buildDemo(NOW);
  assert.equal(model.origin, "example");
  assert.equal(model.today, "2026-11-12");
  assert.equal(model.rates.MSPWE, 10);
  assert.equal(model.rates.MSPAM, 15);
  assert.equal(model.rates.MSPMS, 15);
  const todayValley = model.rows.filter(function (row) { return row.hotel === "MSPWE" && row.business_date === "2026-11-12"; })[0];
  const earlyValley = model.rows.filter(function (row) { return row.hotel === "MSPWE" && row.business_date === "2026-11-01"; })[0];
  const kioskValley = model.rows.filter(function (row) { return row.hotel === "MSPWE" && row.business_date === "2026-11-05"; })[0];
  assert.equal(todayValley.market_kiosk, null);
  assert.equal(cap.marketParts("MSPWE", todayValley).kioskMissing, true);
  assert.equal(cap.marketParts("MSPWE", earlyValley).incomplete, false);
  assert.equal(kioskValley.market_kiosk, 18);
  assert.equal(cap.marketParts("MSPWE", kioskValley).incomplete, false);
  assert.ok(model.rows.every(function (row) { return row.source === "example" && row.line_items.length >= 3; }));

  const corpHtml = cap.pageHtml(model, corp, view({ period: "month" }));
  assert.match(corpHtml, /EXAMPLE/);
  assert.match(corpHtml, /data-period="month"/);
  assert.match(corpHtml, /Monthly comparison/);
  assert.match(corpHtml, /MSPWE/);
  assert.match(corpHtml, /MSPAM/);
  assert.match(corpHtml, /MSPMS/);
  assert.match(corpHtml, /data-hotel="MSPWE" data-hidden="1"/);
  assert.match(corpHtml, /data-incomplete="1"/);
  assert.match(corpHtml, /data-rate-hotel="MSPWE"/);
  assert.match(corpHtml, /The rate stays saved/);
  assert.match(corpHtml, /value="10.00"/);
  assert.match(corpHtml, /value="15.00"/);
  assert.doesNotMatch(corpHtml, /51\.0%/);
  assert.equal(corpHtml.includes("MSPWE") && corpHtml.includes("data-metric=\"parking\" data-hotel=\"MSPWE\" data-hidden=\"1\""), true);

  const gmHtml = cap.pageHtml(model, gm, view({ period: "today" }));
  assert.match(gmHtml, /data-hotel="MSPAM"/);
  assert.match(gmHtml, /data-metric="parking"/);
  assert.match(gmHtml, /data-metric="market"/);
  assert.equal(gmHtml.includes("MSPWE"), false);
  assert.equal(gmHtml.includes("MSPMS"), false);
  assert.equal(gmHtml.includes("Save"), false);

  const agmHtml = cap.pageHtml(model, agm, view({ period: "mtd" }));
  assert.match(agmHtml, /data-period="mtd"/);
  assert.match(agmHtml, /data-hotel="MSPWE"/);
  assert.match(agmHtml, /Incomplete/);
  assert.equal(agmHtml.includes("data-metric=\"parking\""), false);
  assert.equal(agmHtml.includes("MSPAM"), false);
  assert.equal(cap.pageHtml(model, desk, view()), "");
  assert.equal(cap.homeCard(model, desk, "en", view()), "");
  assert.match(cap.homeCard(model, gm, "en", view()), /EXAMPLE/);
  assert.match(cap.homeCard(model, corp, "es", view()), /EJEMPLO|ejemplo|Incompleto|Tienda/);

  const empty = { today: "2026-11-12", rates: model.rates, rows: [], origin: "live" };
  const emptyHtml = cap.pageHtml(empty, corp, view());
  assert.match(emptyHtml, /data-empty="1"/);
  assert.match(emptyHtml, /No daily rows yet/);
  assert.equal(emptyHtml.includes("EXAMPLE"), false);
  assert.match(emptyHtml, /data-rates="1"/);
});

test("only corporate can change a per-car rate", () => {
  const model = cap.buildDemo(NOW);
  const saved = cap.setRate(model, "MSPAM", "12.50", corp);
  assert.equal(saved.ok, true);
  assert.equal(saved.rate, 12.5);
  assert.equal(model.rates.MSPAM, 15);
  const next = cap.periodSummary(saved.model, "MSPAM", "today", "2026-11-12", true);
  assert.notEqual(next.capture, cap.periodSummary(model, "MSPAM", "today", "2026-11-12", true).capture);
  assert.equal(cap.setRate(model, "MSPAM", "12.50", gm).ok, false);
  assert.equal(cap.setRate(model, "MSPWE", "0", corp).error, "rate");
  assert.equal(cap.setRate(model, "MSPWE", "15.555", corp).error, "rate");
  assert.equal(cap.setRate(model, "NOPE", "10", corp).error, "hotel");
});

test("the migration is insert-only and does not rewrite the feature check", () => {
  const root = path.join(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261117_revenue_daily_facts.sql"), "utf8");
  const example = fs.readFileSync(path.join(root, "supabase/examples/load_revenue_daily_facts.example.sql"), "utf8");
  const retail = fs.readFileSync(path.join(root, "retail-market.js"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home-focus.js"), "utf8");
  const src = fs.readFileSync(path.join(root, "revenue-capture.js"), "utf8");
  assert.equal(cap.MARKET_GOAL, 2);
  assert.match(retail, /\$2 goal/);
  assert.doesNotMatch(sql, /hotel_features_feature_check/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop function/i);
  assert.doesNotMatch(sql, /drop constraint/i);
  assert.match(sql, /primary key \(hotel, business_date\)/);
  assert.match(sql, /on conflict \(hotel\) do nothing/);
  assert.match(sql, /15\.00/);
  assert.match(sql, /10\.00/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /\(select private\.is_above\(\)\)/);
  assert.match(sql, /private\.my_role\(\)\) in \('gm', 'agm'\)/);
  assert.match(sql, /grant select on table public\.revenue_daily_facts to authenticated/);
  assert.match(sql, /grant update \(per_car_rate\)/);
  assert.doesNotMatch(sql, /grant insert/i);
  assert.match(sql, /set search_path = ''/);
  assert.match(example, /on conflict \(hotel, business_date\) do nothing/i);
  assert.match(example, /Do not load them into the live project/);
  assert.match(example, /ADD-ON SELF-PARKING/);
  assert.match(example, /PARKING-THIRD PARTY OPERATED/);
  assert.match(example, /PARKING - MANUAL/);
  assert.match(example, /Daily Parking \(PK\)/);
  assert.match(example, /2026-11-02/);
  assert.match(html, /revenue-capture\.js/);
  assert.ok(html.indexOf('src="guest-messages.js"') < html.indexOf('src="revenue-capture.js"'));
  assert.match(sw, /\.\/revenue-capture\.js/);
  assert.match(sw, /hotelhq-shell-v24/);
  assert.match(home, /RevenueCapture\.homeHtml/);
  assert.match(src, /revenue_daily_facts/);
  assert.match(src, /parking_car_rates/);
  assert.doesNotMatch(src, /if \(typeof document === "undefined" \|\| !demoUi\(\)\) return/);
  assert.equal(cap.demoUi({ mode: "live" }), false);
  assert.equal(cap.demoUi({ mode: "demo" }), true);
  const names = fs.readdirSync(path.join(root, "supabase/migrations")).filter(function (name) { return name.endsWith(".sql"); });
  const checks = names.filter(function (name) {
    return fs.readFileSync(path.join(root, "supabase/migrations", name), "utf8").includes("hotel_features_feature_check");
  });
  assert.equal(checks[checks.length - 1], "20261116_fair_share_and_guest_chats.sql");
});
