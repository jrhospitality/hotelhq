const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const gs = require("../guest-scores.js");

const TODAY = "2026-10-28";
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261029_guest_scores.sql"), "utf8");

test("role map matches the migration seed", () => {
  const block = sql.split("GS_ACCESS_SEED_START")[1].split("GS_ACCESS_SEED_END")[0];
  const pairs = [...block.matchAll(/\('([a-z_]+)', '([a-z0-9_*]+)'\)/g)].map((m) => m[1] + "|" + m[2]);
  const expected = [];
  Object.keys(gs.ACCESS).forEach((role) => {
    gs.ACCESS[role].forEach((metric) => expected.push(role + "|" + metric));
  });
  assert.deepEqual(pairs, expected);
});

test("department roles only receive their metrics", () => {
  assert.deepEqual(gs.metricsForRole("Housekeeping"), ["itr", "cleanliness"]);
  assert.deepEqual(gs.metricsForRole("Executive Housekeeper"), ["itr", "cleanliness"]);
  assert.deepEqual(gs.metricsForRole("Housekeeper"), ["itr", "cleanliness"]);
  assert.deepEqual(gs.metricsForRole("Laundry Attendant"), ["itr", "cleanliness"]);
  assert.deepEqual(gs.metricsForRole("House Person"), ["itr", "cleanliness"]);
  assert.equal(gs.metricsForRole("GM"), null);
  assert.equal(gs.metricsForRole("AGM"), null);
  assert.equal(gs.metricsForRole("JR Corporate"), null);
  assert.equal(gs.allows(gs.ACCESS.breakfast, "breakfast_ihg"), true);
  assert.equal(gs.allows(gs.ACCESS.breakfast, "breakfast_future"), true);
  assert.equal(gs.allows(gs.ACCESS.breakfast, "pool"), false);
  assert.equal(gs.allows(gs.ACCESS.breakfast, "cleanliness"), false);
  assert.equal(gs.allows(gs.ACCESS.front_desk, "check_in"), true);
  assert.equal(gs.allows(gs.ACCESS.front_desk, "check_in_speed"), true);
  assert.equal(gs.allows(gs.ACCESS.front_desk, "maintenance"), false);
  assert.equal(gs.allows(gs.ACCESS.maintenance, "maintenance"), true);
  assert.equal(gs.allows(gs.ACCESS.maintenance, "maintenance_hvac"), true);
  assert.equal(gs.allows(gs.ACCESS.housekeeper, "staff_service"), false);
  assert.equal(gs.allows(null, "pool"), true);
});

test("sample wave has green and red ITR months and hides other fields", () => {
  const demo = gs.buildDemo(TODAY);
  assert.equal(demo.origin, "example");
  const rows = gs.monthRows(demo.surveys, demo.goals, TODAY, "MSPWE", "itr", "topbox");
  assert.equal(rows[0].month, "2026-07-01");
  assert.equal(rows[0].meet, true);
  assert.equal(rows[3].month, "2026-10-01");
  assert.equal(rows[3].meet, false);
  assert.equal(rows[4].actual, null);
  assert.ok(rows[0].n > 0);

  const win = gs.windows(TODAY);
  assert.equal(win.t14.start, "2026-10-15");
  assert.equal(win.mtd.start, "2026-10-01");
  assert.equal(win.wave.start, "2026-07-01");
  const itr = gs.summarize(demo.surveys, TODAY, "MSPWE", "itr", "topbox");
  assert.ok(itr.t14.n > 0);
  assert.ok(itr.wave.n > itr.mtd.n);
  assert.ok(itr.wave.n > itr.t14.n);

  const stars = gs.summarize(demo.surveys, TODAY, "MSPAM", "google_stars", "stars");
  assert.ok(stars.wave.n > 0);
  assert.ok(stars.wave.value > 1 && stars.wave.value <= 5);
  assert.equal(gs.fmt(stars.wave).includes("%"), false);
  assert.equal(gs.fmt(itr.wave).endsWith("%"), true);

  const hk = gs.project(demo.surveys, "housekeeper", ["MSPWE"]);
  const hkKeys = new Set();
  hk.forEach((s) => {
    assert.equal(s.comment, "");
    assert.equal(s.room, "");
    Object.keys(s.metrics).forEach((k) => hkKeys.add(k));
  });
  assert.deepEqual([...hkKeys].sort(), ["cleanliness", "itr"]);

  const bf = gs.project(demo.surveys, "Breakfast Attendant", ["MSPWE"]);
  const bfKeys = new Set();
  bf.forEach((s) => Object.keys(s.metrics).forEach((k) => bfKeys.add(k)));
  ["itr", "fb_overall", "breakfast_service", "food_quality", "breakfast_ihg"].forEach((k) => assert.ok(bfKeys.has(k), k));
  ["pool", "cleanliness", "google_stars", "staff_service", "elite_appreciation"].forEach((k) => assert.equal(bfKeys.has(k), false, k));

  const hilton = gs.project(demo.surveys, "breakfast", ["MSPAM"]);
  const hKeys = new Set();
  hilton.forEach((s) => Object.keys(s.metrics).forEach((k) => hKeys.add(k)));
  assert.equal(hKeys.has("breakfast_hilton"), true);
  assert.equal(hKeys.has("breakfast_ihg"), false);

  const fd = gs.project(demo.surveys, "Front Desk", ["MSPMS"]);
  const fdKeys = new Set();
  fd.forEach((s) => Object.keys(s.metrics).forEach((k) => fdKeys.add(k)));
  assert.equal(fdKeys.has("staff_service"), true);
  assert.equal(fdKeys.has("check_in"), true);
  assert.equal(fdKeys.has("pool"), false);

  const mt = gs.project(demo.surveys, "Maintenance", ["MSPWE"]);
  const mtKeys = new Set();
  mt.forEach((s) => Object.keys(s.metrics).forEach((k) => mtKeys.add(k)));
  assert.equal(mtKeys.has("maintenance"), true);
  assert.equal(mtKeys.has("itr"), true);
  assert.equal(mtKeys.has("cleanliness"), false);

  const lead = gs.project(demo.surveys, "GM", ["MSPWE"]);
  assert.ok(lead.some((s) => s.comment && s.room));
  const shown = gs.metricList("MSPWE", "GM", lead).map((m) => m.id);
  ["itr", "cleanliness", "staff_service", "maintenance", "brand_promise", "fb_overall", "breakfast_service", "food_quality", "breakfast_ihg", "fitness", "pool", "check_in", "google_stars", "tripadvisor_stars"].forEach((id) => {
    assert.ok(shown.includes(id), id);
  });
  assert.equal(shown.includes("elite_appreciation"), false);
  assert.equal(shown.includes("breakfast_hilton"), false);
  const hiltonShown = gs.metricList("MSPAM", "gm", gs.project(demo.surveys, "gm", ["MSPAM"])).map((m) => m.id);
  assert.ok(hiltonShown.includes("elite_appreciation"));
  assert.ok(hiltonShown.includes("personalized"));
  assert.ok(hiltonShown.includes("breakfast_hilton"));

  const lows = gs.lowScores(lead, "MSPWE", TODAY);
  assert.ok(lows.length > 0);
  lows.forEach((s) => {
    assert.ok(s.itr <= 6);
    assert.ok(s.room);
    assert.equal(/@/.test(s.comment), false);
    const wo = gs.workOrderFromSurvey(s);
    assert.match(wo.text_en, new RegExp("room " + s.room));
    assert.match(wo.text_es, /cuarto/);
    assert.equal(wo.department, "maintenance");
    assert.equal(/@/.test(wo.text_en + wo.text_es), false);
  });
  assert.equal(gs.lowScores(hk, "MSPWE", TODAY).length, 0);

  const blob = JSON.stringify(demo);
  assert.equal(blob.includes("@"), false);
  assert.equal(/guest name/i.test(blob), false);
  gs.METRICS.forEach((m) => {
    assert.ok(m.en && m.es && m.en !== m.es);
  });
});

test("migration locks scores down and stores no guest rows", () => {
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /private\.is_mgr_of\(hotel\)/);
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.equal(/hotel = any \(select private\.my_hotels\(\)\)/.test(sql), false);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /revoke all on function public\.set_itr_goal\(text, date, text, numeric\) from public, anon/);
  assert.match(sql, /security_invoker = true/);
  assert.equal(/insert into public\.guest_surveys/i.test(sql), false);
  assert.equal(/anon execute/i.test(sql), false);
  assert.match(sql, /Do not store guest names/);
});

test("department views keep Medallia and HotelHQ scores apart", () => {
  const today = "2026-11-12";
  const facts = gs.examplePeriods(today);
  assert.equal(facts.every((row) => row.hotel === "MSPWE"), true);
  assert.equal(facts.some((row) => row.calcMethod === "topbox_8_10" && row.metric === "overall_experience" && row.value === 81), true);
  assert.equal(facts.some((row) => row.calcMethod === "topbox_9_10" && row.metric === "overall_experience" && row.value === 64), true);
  const html = gs.departmentHtml(facts, "GM", "MSPWE", "en");
  assert.match(html, /EXAMPLE/);
  assert.match(html, /Medallia top-box, 8–10/);
  assert.match(html, /HotelHQ top-box, 9–10/);
  assert.match(html, /81\.0%/);
  assert.match(html, /64\.0%/);
  const medallia = html.split("HotelHQ top-box, 9–10")[0];
  const nine = html.split("HotelHQ top-box, 9–10")[1].split("<h3>")[0];
  assert.match(medallia, /81\.0%/);
  assert.equal(medallia.includes("64.0%"), false);
  assert.match(nine, /64\.0%/);
  assert.equal(nine.includes("81.0%"), false);
  assert.match(html, /83\.0/);
  assert.match(html, />80</);
  assert.match(html, />n</);
  assert.match(html, />24</);
  assert.match(html, /MTD/);
  assert.match(html, /T3/);
  assert.match(html, /T12/);
  assert.match(html, /My Region/);
  assert.match(html, /Prior year/);
  assert.match(html, /Unset/);
  assert.match(html, /public-area/i);
  assert.match(html, /minimum floor is 80/i);
  const fd = gs.departmentHtml(facts, "Front Desk", "MSPWE", "en");
  assert.match(fd, /Overall Experience/);
  assert.match(fd, /Member Recognition/);
  assert.equal(fd.includes("Towels"), false);
  assert.equal(fd.includes("Room Cleanliness"), false);
  assert.equal(fd.includes("Likely to Recommend"), false);
  const hk = gs.departmentHtml(facts, "Housekeeper", "MSPWE", "en");
  assert.match(hk, /Room Cleanliness/);
  assert.match(hk, /Bathroom Cleanliness/);
  assert.equal(hk.includes("Member Recognition"), false);
  assert.equal(hk.includes("Overall Experience"), false);
  const laundry = gs.departmentHtml(facts, "Laundry Attendant", "MSPWE", "en");
  assert.match(laundry, /Towels/);
  assert.match(laundry, /Room Cleanliness/);
  assert.match(laundry, /Bathroom Cleanliness/);
  assert.equal(laundry.includes("Overall Experience"), false);
  const house = gs.departmentHtml(facts, "House Person", "MSPWE", "en");
  assert.match(house, /public-area/i);
  assert.equal(house.includes("81.0%"), false);
  const other = gs.departmentHtml(facts, "GM", "MSPAM", "en");
  assert.match(other, /Medallia feed not connected/);
  assert.equal(other.includes("81.0%"), false);
  assert.match(other, /83\.0/);
  const picked = gs.pickFacts(facts.concat([{ hotel: "MSPWE", source: "medallia", metric: "overall_experience", periodKind: "mtd", periodStart: "2026-11-01", periodEnd: "2026-11-12", asOf: "2026-11-12", value: 50, n: 3, calcMethod: "topbox_8_10", priorYear: 40, region: null, brand: null }]), "MSPWE");
  assert.equal(picked.origin, "live");
  assert.equal(picked.rows.some((row) => row.source === "example"), false);
  assert.equal(picked.rows.some((row) => row.value === 50), true);
});

test("period score migration is additive and keeps the two calc methods", () => {
  const periodSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261116_guest_score_periods.sql"), "utf8");
  const exampleSql = fs.readFileSync(path.join(__dirname, "../supabase/examples/load_guest_score_period_facts.example.sql"), "utf8");
  assert.match(periodSql, /guest_score_period_facts/);
  assert.match(periodSql, /guest_score_metric_map/);
  assert.match(periodSql, /topbox_8_10/);
  assert.match(periodSql, /topbox_9_10/);
  assert.match(periodSql, /'overall_experience', 83::numeric/);
  assert.match(periodSql, /'overall_service', 88::numeric/);
  assert.match(periodSql, /'breakfast', 80::numeric/);
  assert.match(periodSql, /'hotel_condition', 82::numeric/);
  assert.match(periodSql, /'guest_room_condition', 83::numeric/);
  assert.match(periodSql, /'room_cleanliness', 87::numeric/);
  assert.match(periodSql, /'bathroom_cleanliness', 88::numeric/);
  assert.match(periodSql, /'towels', 87::numeric/);
  assert.match(periodSql, /member_recognition', null::numeric/);
  assert.match(periodSql, /floor_pct/);
  assert.match(periodSql, /verified_stay/);
  assert.match(periodSql, /enable row level security/);
  assert.match(periodSql, /private\.is_above\(\)/);
  assert.match(periodSql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(periodSql, /set search_path = ''/);
  assert.match(periodSql, /security definer/);
  assert.doesNotMatch(periodSql, /drop table/i);
  assert.doesNotMatch(periodSql, /delete from/i);
  assert.doesNotMatch(periodSql, /drop constraint/i);
  assert.doesNotMatch(periodSql, /user_metadata/i);
  assert.doesNotMatch(periodSql, /grant insert/i);
  assert.doesNotMatch(periodSql, /to anon/);
  assert.match(exampleSql, /on conflict \(hotel, source, metric, period_kind, period_start, calc_method\) do nothing/);
  assert.match(exampleSql, /'example'/);
  assert.match(exampleSql, /topbox_8_10/);
  assert.match(exampleSql, /topbox_9_10/);
  assert.doesNotMatch(exampleSql, /delete from/i);
  assert.doesNotMatch(exampleSql, /drop /i);
});
