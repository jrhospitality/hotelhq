const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const menus = require("../feature-menus.js");

function on(map) {
  return function (hotel, feature) {
    var key = hotel + "|" + feature;
    return !Object.prototype.hasOwnProperty.call(map, key) || !!map[key];
  };
}

test("shuttle is shared by MSPAM and MSPMS and follows the switch", () => {
  const ids = ["home", "shut", "parking", "meetings", "winter", "gscores"];
  assert.deepEqual(menus.filterIds(ids, "Front Desk", "MSPWE", on({})), ["home", "parking", "meetings", "winter", "gscores"]);
  assert.equal(menus.menuAllows("shut", "Front Desk", "MSPAM", on({})), true);
  assert.equal(menus.menuAllows("shut", "Shuttle Driver", "MSPMS", on({ "MSPMS|shuttle": false })), false);
  assert.equal(menus.menuAllows("shut", "GM", "MSPAM", on({})), true);
  assert.equal(menus.menuAllows("shut", "AGM", "MSPMS", on({})), true);
  assert.equal(menus.menuAllows("shut", "Above Property", "MSPAM", on({})), true);
  assert.equal(menus.menuAllows("shut", "GM", "MSPWE", on({})), false);
  assert.equal(menus.menuAllows("shut", "GM", "MSPWE", on({ "MSPWE|shuttle": true })), false);
});

test("parking and meeting rooms stay with front desk, AGM, GM, and corporate", () => {
  ["Front Desk", "AGM", "GM", "Above Property", "JR Corporate"].forEach(function (role) {
    assert.equal(menus.menuAllows("parking", role, "MSPAM", on({})), true, role);
    assert.equal(menus.menuAllows("beo", role, "MSPAM", on({})), true, role);
  });
  assert.equal(menus.menuAllows("parking", "Shuttle Driver", "MSPAM", on({})), false);
  assert.equal(menus.menuAllows("meetings", "Housekeeper", "MSPWE", on({})), false);
  assert.equal(menus.menuAllows("parking", "Front Desk", "MSPWE", on({ "MSPWE|parking": false })), false);
  assert.equal(menus.menuAllows("gscores", "GM", "MSPMS", on({ "MSPMS|guest_scores": false })), false);
  assert.equal(menus.menuAllows("rooms", "Housekeeper", "MSPWE", on({})), true);
});

test("the menu migration adds switches without deleting rows", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261103_feature_menus.sql"), "utf8");
  const dir = path.join(__dirname, "../supabase/migrations");
  const names = fs.readdirSync(dir).filter((name) => name.endsWith(".sql")).sort();
  const checks = names.filter((name) => fs.readFileSync(path.join(dir, name), "utf8").includes("hotel_features_feature_check"));
  assert.equal(checks[checks.length - 1], "20261113_night_audit.sql");
  assert.ok(names.indexOf("20261104_lead_responses.sql") > names.indexOf("20261103_feature_menus.sql"));
  assert.match(sql, /'parking', 'sales_leads', 'greetings', 'guest_scores'/);
  assert.match(sql, /'shuttle', 'meetings', 'winter'/);
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /on conflict \(hotel, feature\) do nothing/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
});
