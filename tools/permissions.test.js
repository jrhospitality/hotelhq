const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hhq = require("../permissions.js");

test("corporate sees every hotel and everyone else sees only their own", () => {
  assert.equal(hhq.can("Above Property", "see.allHotels"), true);
  assert.equal(hhq.can("JR Corporate", "see.allHotels"), true);
  assert.equal(hhq.can("GM", "see.allHotels"), false);
  assert.equal(hhq.can("Front Desk", "see.allHotels"), false);
  assert.equal(hhq.seesHotel("GM", "MSPWE", "MSPWE"), true);
  assert.equal(hhq.seesHotel("GM", "MSPWE", "MSPAM"), false);
  assert.equal(hhq.seesHotel("AGM", "MSPMS", "MSPAM"), false);
  assert.equal(hhq.seesHotel("Above Property", null, "MSPMS"), true);
  assert.equal(hhq.seesHotel("JR Corporate", null, "MSPWE"), true);
});

test("parking and meeting rooms are front desk, AGM, GM, and corporate", () => {
  ["Front Desk", "AGM", "GM", "Above Property", "JR Corporate"].forEach((role) => {
    assert.equal(hhq.can(role, "parking"), true, role);
    assert.equal(hhq.can(role, "meetings"), true, role);
  });
  ["Shuttle Driver", "Housekeeper", "Housekeeping", "Maintenance", "Breakfast Attendant", "House Person", "Laundry Attendant"].forEach((role) => {
    assert.equal(hhq.can(role, "parking"), false, role);
    assert.equal(hhq.can(role, "meetings"), false, role);
  });
  assert.equal(hhq.can("Front Desk", "parking.setup"), false);
  assert.equal(hhq.can("GM", "parking.setup"), true);
  assert.equal(hhq.menuCap("beo"), "meetings");
  assert.equal(hhq.menuCap("parking"), "parking");
});

test("the shared shuttle is MSPAM and MSPMS only", () => {
  assert.equal(hhq.shuttleAt("MSPAM"), true);
  assert.equal(hhq.shuttleAt("MSPMS"), true);
  assert.equal(hhq.shuttleAt("MSPWE"), false);
  assert.equal(hhq.can("Shuttle Driver", "shuttle.shared"), true);
  assert.equal(hhq.can("Housekeeper", "shuttle.shared"), false);
  assert.deepEqual(
    hhq.schedPositions("GM", "MSPWE", ["Front Desk", "Shuttle Driver"]),
    ["Front Desk"]
  );
  assert.deepEqual(
    hhq.schedPositions("GM", "MSPAM", ["Front Desk", "Shuttle Driver"]),
    ["Front Desk", "Shuttle Driver"]
  );
  assert.deepEqual(hhq.schedPositions("Housekeeping", "MSPWE", ["Front Desk"]), ["HK Lead", "Housekeeper"]);
  assert.deepEqual(hhq.schedPositions("Housekeeper", "MSPWE", ["Front Desk"]), []);
});

test("the map is the only role list in this module", () => {
  const src = fs.readFileSync(path.join(__dirname, "../permissions.js"), "utf8");
  const wire = fs.readFileSync(path.join(__dirname, "../permissions-wire.js"), "utf8");
  assert.equal(wire.includes("=== \"GM\""), false);
  assert.equal(wire.includes("Above Property"), false);
  let mentions = 0;
  Object.keys(hhq.CAPS).forEach((cap) => { mentions += hhq.CAPS[cap].length; });
  assert.ok(mentions >= 100, "role placements " + mentions);
  assert.match(src, /HHQ\.can\(role, capability\)/);
});
