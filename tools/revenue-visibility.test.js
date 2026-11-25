const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hhq = require("../permissions.js");
const na = require("../night-audit.js");
const fair = require("../fair-share.js");
const guides = require("../help-guides.js");

const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261125_property_revenue_visibility.sql"), "utf8");
const gm = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const auditRole = { role: "Night Audit", hotel: "MSPWE", name: "Sample Auditor" };
const hk = { role: "Housekeeping", hotel: "MSPWE", name: "Grace Patel" };
const maint = { role: "Maintenance", hotel: "MSPWE", name: "Luis Ortega" };

test("only GM, AGM, and corporate may see property revenue", () => {
  ["GM", "AGM", "Above Property", "JR Corporate", "corporate", "above_property", "gm", "agm"].forEach((role) => {
    assert.equal(hhq.can(role === "gm" ? "GM" : role === "agm" ? "AGM" : role, "revenue.see") || na.canSeeRevenue(role), true, role);
    assert.equal(na.canSeeRevenue(role), true, role);
    assert.equal(fair.canSeeRevenue(role), true, role);
  });
  ["Front Desk", "front_desk", "Housekeeping", "Housekeeper", "Maintenance", "Night Audit", "night_audit", "Shuttle Driver", "Breakfast Attendant", "House Person", "Laundry Attendant"].forEach((role) => {
    assert.equal(na.canSeeRevenue(role), false, role);
    assert.equal(fair.canSeeRevenue(role), false, role);
  });
  assert.equal(hhq.can("Front Desk", "revenue.see"), false);
  assert.equal(hhq.can("Housekeeping", "revenue.see"), false);
  assert.equal(hhq.can("Maintenance", "revenue.see"), false);
  assert.equal(hhq.can("GM", "revenue.see"), true);
  assert.equal(hhq.can("AGM", "revenue.see"), true);
  assert.equal(hhq.can("Above Property", "revenue.see"), true);
});

test("a front-desk night-audit feed drops revenue rows and keeps occupancy, ADR, and RevPAR", () => {
  const sample = na.exampleFeed();
  const hidden = na.feedHtml(sample, "en", { role: desk.role });
  const shown = na.feedHtml(sample, "en", { role: gm.role });
  const agmHtml = na.feedHtml(sample, "en", { role: agm.role });
  const corpHtml = na.feedHtml(sample, "en", { role: corp.role });
  assert.match(shown, /Room revenue/);
  assert.match(shown, /Total revenue/);
  assert.match(shown, /\$224,000\.00/);
  assert.match(shown, /\$2,772,000\.00/);
  assert.match(shown, /\$2,900,000\.00/);
  assert.match(agmHtml, /Room revenue/);
  assert.match(corpHtml, /Ingreso de cuartos|Room revenue/);
  assert.equal(hidden.includes("Room revenue"), false);
  assert.equal(hidden.includes("Total revenue"), false);
  assert.equal(hidden.includes("Ingreso de cuartos"), false);
  assert.equal(hidden.includes("Ingreso total"), false);
  assert.equal(hidden.includes("224,000"), false);
  assert.equal(hidden.includes("2,772,000"), false);
  assert.equal(hidden.includes("2,900,000"), false);
  assert.equal(hidden.includes("230,000"), false);
  assert.match(hidden, /Occupancy/);
  assert.match(hidden, /ADR/);
  assert.match(hidden, /RevPAR/);
  assert.match(hidden, /\$110\.00/);
  assert.match(hidden, /\$77\.00/);
  ["Housekeeping", "Maintenance", "Night Audit", "night_audit", "Shuttle Driver"].forEach((role) => {
    const html = na.feedHtml(sample, "en", { role: role });
    assert.equal(html.includes("Room revenue"), false, role);
    assert.equal(html.includes("224,000"), false, role);
    assert.match(html, /Occupancy/);
  });
  const stripped = na.reportFromRows({
    hotel: "MSPWE",
    auditDate: "2026-11-02",
    source: "hotelkey",
    origin: "example",
    hideRevenue: true,
    rows: [
      { section: "gm_occupancy", cells: { metric: "occupancy_pct", today: 70, mtd: 68.5, ytd: 72.3 } },
      { section: "gm_revenue", cells: { metric: "adr", today: 110, mtd: 108.25, ytd: 105 } },
      { section: "gm_revenue", cells: { metric: "room_revenue", today: 7700, mtd: 224000, ytd: 2772000 } },
      { section: "gm_revenue", cells: { metric: "adr_x_rooms", today: 7700, mtd: 224000, ytd: 2772000 } },
      { section: "gm_revenue", cells: { metric: "room_revenue_budget", today: 8000, mtd: 200000, ytd: 2500000 } }
    ]
  });
  assert.equal(stripped.lines.find((line) => line.key === "occupancy").today, 70);
  assert.equal(stripped.lines.find((line) => line.key === "adr").mtd, 108.25);
  assert.equal(stripped.lines.find((line) => line.key === "room_revenue").today, null);
  assert.equal(na.feedHtml(stripped, "en", { role: auditRole.role }).includes("224,000"), false);
});

test("Expedia revenue row is removed for front desk and kept for a GM", () => {
  const model = fair.buildDemo("2026-11-09T18:00:00.000Z");
  const rows = fair.compareExpedia(model, "MSPWE", "t7");
  const deskRows = fair.metricsFor(desk.role, rows);
  const gmRows = fair.metricsFor(gm.role, rows);
  assert.equal(deskRows.find((row) => row.id === "revenue"), undefined);
  assert.equal(gmRows.find((row) => row.id === "revenue").value, 11240);
  assert.equal(fair.metricsFor(hk.role, rows).some((row) => row.id === "revenue"), false);
  assert.equal(fair.metricsFor(maint.role, rows).some((row) => row.id === "revenue"), false);
  assert.equal(fair.metricsFor("night_audit", rows).some((row) => row.id === "revenue"), false);
  assert.equal(fair.metricsFor(agm.role, rows).find((row) => row.id === "revenue").value, 11240);
  const gmPage = fair.pageHtml(model, gm, { lang: "en", portfolio: false, hotel: "MSPWE" });
  const deskPage = fair.pageHtml(model, desk, { lang: "en" });
  assert.match(gmPage, /data-metric="revenue"/);
  assert.match(gmPage, /\$11,240\.00/);
  assert.equal(deskPage.includes("data-metric=\"revenue\""), false);
  assert.equal(deskPage.includes("11,240"), false);
  assert.equal(deskPage.includes("Revenue"), false);
  const str = fair.metricsFor(desk.role, fair.compare(model, "MSPWE", "t7"));
  assert.deepEqual(str.map((row) => row.id), ["occ", "adr", "revpar"]);
});

test("Ask HotelHQ does not answer a property-revenue question for front desk", () => {
  const denied = guides.answer("What is MTD room revenue?", { lang: "en", role: "Front Desk" });
  assert.equal(denied.known, false);
  assert.equal(/\$\d/.test(denied.text), false);
  const night = guides.answer("What is YTD total revenue?", { lang: "en", role: "Night Audit" });
  assert.equal(night.known, false);
  const house = guides.answer("ingreso de cuartos del mes", { lang: "es", role: "Housekeeping" });
  assert.equal(house.known, false);
  const pin = guides.answer("How do I set my PIN?", { lang: "en", role: "Front Desk" });
  assert.equal(pin.known, true);
});

test("the revenue migration is additive and locks revenue to GM, AGM, and corporate", () => {
  assert.match(sql, /private\.can_see_property_revenue/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /'gm', 'agm'/);
  assert.match(sql, /property_revenue_periods/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /as restrictive/);
  assert.match(sql, /night_audit_report_rows_revenue/);
  assert.match(sql, /expedia_fair_share_revenue_read/);
  assert.match(sql, /revenue_daily_facts_revenue/);
  assert.match(sql, /parking_car_rates_revenue/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /grant select on table public\.property_revenue_periods to authenticated/);
  assert.match(sql, /revoke all on function public\.expedia_fair_share_revenue_read\(text\) from public, anon/);
  na.REVENUE_METRICS.forEach((metric) => {
    assert.match(sql, new RegExp("'" + metric + "'"));
  });
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /truncate/i);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /to anon,/);
  assert.doesNotMatch(sql, /sb_publishable_|eyJ/);
  assert.match(sql, /clxvmtbmveusrbxacnxe/);
  assert.match(sql, /Not applied/);
});
