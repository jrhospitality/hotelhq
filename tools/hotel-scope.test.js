const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const scope = require("../hotel-scope.js");

test("staff stay on their assigned hotel and corporate can open any property", function () {
  assert.equal(scope.assignedHotel("Front Desk", "MSPAM", "MSPWE"), "MSPAM");
  assert.equal(scope.assignedHotel("GM", "MSPMS", "MSPAM"), "MSPMS");
  assert.equal(scope.assignedHotel("Housekeeper", "", "MSPWE"), "");
  assert.equal(scope.assignedHotel("Above Property", null, "MSPMS"), "MSPMS");
  assert.equal(scope.assignedHotel("Above Property", null, ""), "MSPWE");
  assert.deepEqual(scope.hotelsToLoad("AGM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(scope.hotelsToLoad("Above Property", "MSPAM"), ["MSPWE", "MSPAM", "MSPMS"]);
});

test("only airport front desk and drivers share the shuttle sign-up queue", function () {
  assert.equal(scope.seesSharedShuttle("Front Desk", "MSPAM"), true);
  assert.equal(scope.seesSharedShuttle("Shuttle Driver", "MSPMS"), true);
  assert.equal(scope.seesSharedShuttle("GM", "MSPAM"), false);
  assert.equal(scope.seesSharedShuttle("AGM", "MSPMS"), false);
  assert.equal(scope.seesSharedShuttle("Front Desk", "MSPWE"), false);
  assert.equal(scope.seesSharedShuttle("Shuttle Driver", "MSPWE"), false);
  assert.equal(scope.shuttlePaxVisible("Front Desk", "MSPAM", "MSPMS"), true);
  assert.equal(scope.shuttlePaxVisible("Shuttle Driver", "MSPMS", "MSPAM"), true);
  assert.equal(scope.shuttlePaxVisible("GM", "MSPAM", "MSPMS"), false);
  assert.equal(scope.shuttlePaxVisible("GM", "MSPAM", "MSPAM"), true);
  assert.equal(scope.shuttlePaxVisible("Front Desk", "MSPWE", "MSPAM"), false);
  assert.equal(scope.shuttlePaxVisible("Housekeeper", "MSPMS", "MSPAM"), false);
  assert.equal(scope.shuttlePaxVisible("Above Property", "MSPWE", "MSPMS"), true);
});

test("shuttle labor shifts stay on the driver's own hotel", function () {
  const other = { scope: "SHUTTLE", pos: "Shuttle Driver", who: "Ben Carter" };
  const mine = { scope: "SHUTTLE", pos: "Shuttle Driver", who: "Tom Reed" };
  const desk = { scope: "MSPAM", pos: "Front Desk", who: "Kim Nguyen" };
  assert.equal(scope.ownShift("GM", "MSPAM", other, "MSPMS"), false);
  assert.equal(scope.ownShift("GM", "MSPAM", mine, "MSPAM"), true);
  assert.equal(scope.ownShift("GM", "MSPAM", desk, ""), true);
  assert.equal(scope.ownShift("GM", "MSPWE", other, "MSPMS"), false);
  assert.equal(scope.ownShift("Above Property", "MSPWE", other, "MSPMS"), true);
});

test("isolation migration replaces broad policies and does not drop data", function () {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261101_hotel_isolation.sql"), "utf8");
  assert.equal(/drop\s+table/i.test(sql), false);
  assert.equal(/delete\s+from/i.test(sql), false);
  assert.equal(/drop\s+column/i.test(sql), false);
  assert.match(sql, /profile_hotels/);
  assert.match(sql, /shuttle_driver', 'front_desk'/);
  assert.equal(/'gm', 'agm'/.test(sql.split("can_access")[1].split("qotd_q_mgr_read")[0]), false);
  assert.match(sql, /drop policy if exists qotd_q_mgr_read/);
  assert.match(sql, /hotel_id is null or hotel_id = \(select private\.my_hotel\(\)\)/);
});
