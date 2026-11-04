const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mspwe = require("../mspwe-checklists.js");

function ens(list) {
  return list.map((item) => item.en);
}
function bilingual(list) {
  list.forEach((item) => {
    assert.ok(item.en && item.en.length > 8);
    assert.ok(item.es && item.es.length > 8);
    assert.notEqual(item.es, item.en);
  });
}

test("every Golden Valley line is bilingual and uses the normal checklist, not a new points rule", () => {
  bilingual(mspwe.BREAKFAST);
  bilingual(mspwe.POOL);
  bilingual(mspwe.NIGHT);
  bilingual(mspwe.ROOM_TPL.items);
  bilingual(mspwe.DEEP_TPL.items);
  mspwe.MONTHLY.forEach((list) => bilingual(list.items));
  assert.equal(mspwe.BREAKFAST.length, 15);
  assert.match(mspwe.BREAKFAST.map((item) => item.en).join(" "), /135°F/);
  assert.match(mspwe.BREAKFAST.map((item) => item.en).join(" "), /41°F/);
  assert.match(mspwe.BREAKFAST.map((item) => item.en).join(" "), /date labels/i);
  assert.equal(mspwe.POOL.length, 8);
  assert.equal(mspwe.NIGHT.length, 4);
  assert.equal(JSON.stringify(mspwe).includes("points"), false);
  assert.equal(mspwe.foodTempOk("Hot", 135), true);
  assert.equal(mspwe.foodTempOk("Hot", 134), false);
  assert.equal(mspwe.foodTempOk("Cold", 41), true);
  assert.equal(mspwe.foodTempOk("Cold", 42), false);
});

test("breakfast expands only at Golden Valley and a second pass does not duplicate it", () => {
  const mspweCheck = { "Breakfast Attendant": [["Setup: coffee brewed", 1]] };
  const other = { "Breakfast Attendant": [["Setup: coffee brewed", 1]] };
  assert.equal(mspwe.applyHotel("MSPWE", { check: mspweCheck, ckCustom: [] }), true);
  assert.equal(mspwe.applyHotel("MSPAM", { check: other, ckCustom: [] }), false);
  assert.equal(mspweCheck["Breakfast Attendant"].length, 15);
  assert.equal(mspweCheck["Breakfast Attendant"][0][1], 0);
  assert.equal(other["Breakfast Attendant"].length, 1);
  const hot = mspweCheck["Breakfast Attendant"].find((row) => row[0].en.indexOf("Log hot food") === 0);
  assert.equal(hot[1], 0);
  assert.equal(mspwe.foldBreakfast(mspweCheck), false);
  assert.equal(mspweCheck["Breakfast Attendant"].length, 15);
});

test("night audit, pool, and monthly logs land on MSPWE only", () => {
  const lists = {
    MSPWE: [
      { name: "1st Shift - AM Check list", role: "Front Desk", per: "Daily", items: ["Count drawer"] },
      { name: "3rd Shift - Night Audit Checklist", role: "Front Desk", per: "Daily", items: ["Count drawer"] },
      { name: "Daily Maintenance Checklist", role: "Maintenance", per: "Daily", items: ["Exterior"] }
    ],
    MSPAM: [
      { name: "Monthly Emergency Lighting Log", role: "Maintenance", per: "Monthly", items: ["Is the emergency light functional?"] },
      { name: "Monthly Exit Sign Lights Log", role: "Maintenance", per: "Monthly", items: ["Is the Exit Sign functional?"] }
    ],
    MSPMS: [{ name: "Public Area: Lobby PM", role: "Maintenance", per: "Quarterly", items: ["Lobby"] }]
  };
  const beforeAm = lists.MSPWE[0].items.length;
  const beforeMspam = JSON.stringify(lists.MSPAM);
  mspwe.foldLists(lists);
  mspwe.foldLists(lists);
  const night = lists.MSPWE.find((list) => list.name === mspwe.NIGHT_NAME);
  ens(mspwe.NIGHT).forEach((en) => assert.equal(night.items.filter((item) => (item.en || item) === en).length, 1));
  assert.equal(lists.MSPWE[0].items.length, beforeAm);
  assert.equal(lists.MSPWE[0].items.includes("Confirm the fire panel is normal"), false);
  const pool = lists.MSPWE.filter((list) => list.name === mspwe.POOL_NAME);
  assert.equal(pool.length, 1);
  assert.equal(pool[0].role, "Maintenance");
  assert.equal(pool[0].per, "Daily");
  assert.equal(pool[0].items.length, mspwe.POOL.length);
  mspwe.MONTHLY.forEach((spec) => {
    const rows = lists.MSPWE.filter((list) => list.name === spec.name);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].per, "Monthly");
    assert.equal(rows[0].items[0].en, spec.items[0].en);
    assert.notEqual(rows[0].items[0].es, rows[0].items[0].en);
  });
  assert.equal(JSON.stringify(lists.MSPAM), beforeMspam);
  assert.equal(lists.MSPMS.some((list) => list.name === mspwe.POOL_NAME), false);
  const chem = mspwe.applyChem({ chlorine: "1" }, "ph", "7.4");
  assert.deepEqual(chem, { chlorine: "1", ph: "7.4", temp: "" });
});

test("room cleaning and deep clean templates are seeded only for MSPWE", () => {
  const data = { ckCustom: [{ id: "mine", kind: "daily", name_en: "Mine", name_es: "Mía", items: [{ en: "One", es: "Uno" }] }] };
  mspwe.seedTemplates(data);
  mspwe.seedTemplates(data);
  assert.equal(data.ckCustom.filter((row) => row.id === "mspwe-room-clean").length, 1);
  assert.equal(data.ckCustom.filter((row) => row.id === "mspwe-deep-clean").length, 1);
  assert.equal(data.ckCustom[0].id, "mine");
  const room = data.ckCustom.find((row) => row.id === "mspwe-room-clean");
  const deep = data.ckCustom.find((row) => row.id === "mspwe-deep-clean");
  assert.equal(room.kind, "room_inspection");
  assert.equal(deep.kind, "deep_clean");
  bilingual(room.items);
  bilingual(deep.items);
  const other = { ckCustom: [] };
  assert.equal(mspwe.applyHotel("MSPMS", other), false);
  assert.equal(other.ckCustom.length, 0);
});

test("the weekly walk hides shuttle only at Golden Valley", () => {
  const walk = {
    Exterior: ["Parking lot & landscape", { en: "Shuttle/vehicles", es: "Shuttle y vehículos" }, "Swimming pool"],
    Interior: ["Lobby"]
  };
  const hidden = mspwe.walkFor(walk, "MSPWE");
  assert.equal(hidden.Exterior.some((item) => (item.en || item) === "Shuttle/vehicles"), false);
  assert.equal(hidden.Exterior.length, 2);
  assert.equal(hidden.Interior[0], "Lobby");
  assert.equal(walk.Exterior.length, 3);
  assert.equal(mspwe.walkFor(walk, "MSPAM").Exterior.length, 3);
  assert.equal(mspwe.walkFor(walk, "MSPMS").Exterior.length, 3);
});

test("lost and found can record a release on the log form", () => {
  assert.deepEqual(mspwe.foundStatus("", "", "2026-11-02T00:00:00.000Z"), { st: "stored", rel: null });
  const released = mspwe.foundStatus("Front desk drawer", "2026-11-02", "2026-11-01T00:00:00.000Z");
  assert.equal(released.st, "claimed");
  assert.equal(released.rel.to, "Front desk drawer");
  assert.equal(released.rel.at.slice(0, 10), "2026-11-02");
  const disposed = mspwe.foundStatus("", "2026-11-03", "2026-11-01T00:00:00.000Z", "Disposed per policy");
  assert.equal(disposed.st, "disposed");
  assert.equal(disposed.rel.to, "Disposed per policy");
});

test("the app wires the lists, the walk filter, and the cache", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const engine = fs.readFileSync(path.join(root, "checklist-engine.js"), "utf8");
  assert.match(html, /mspwe-checklists\.js/);
  assert.match(html, /function walkAreas\(\)/);
  assert.match(html, /Object\.values\(walkAreas\(\)\)\.flat\(\)/);
  assert.match(html, /id="lfRelTo"/);
  assert.match(html, /id="lfDisp"/);
  assert.match(html, /HHQMspwe\.foundStatus/);
  assert.match(html, /Setup: coffee brewed/);
  assert.match(engine, /walkAreas\(\)/);
  assert.match(sw, /mspwe-checklists\.js/);
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v20"/);
  const migrations = fs.readdirSync(path.join(root, "supabase/migrations"));
  assert.equal(migrations.some((name) => /mspwe/i.test(name) && /check|pool|lost/i.test(name)), false);
});
