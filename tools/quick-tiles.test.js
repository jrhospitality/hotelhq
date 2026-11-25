const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const tiles = require("../quick-tiles.js");

function on(map) {
  return function (hotel, feature) {
    const key = hotel + "|" + feature;
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    if (feature === "shuttle" && hotel === "MSPWE") return false;
    if (feature === "parking" && hotel === "MSPWE") return false;
    return true;
  };
}
const features = on({});
const desk = ["notes", "parking", "shut", "meetings", "wo", "greq", "rooms", "recs", "onb", "settings"];
const hk = ["rooms", "myrooms", "insp", "check", "onb", "settings"];
const mt = ["wo", "pm", "check", "onb", "settings"];
const lead = ["labor", "insp", "wo", "sleads", "slead", "check", "notes", "parking", "shut", "meetings", "onb"];
const corp = ["crep", "sleads", "slead", "fc", "labor", "onb"];

test("front desk order follows the shuttle switch and drops tiles the hotel does not have", () => {
  assert.deepEqual(tiles.pick("Front Desk", "MSPAM", null, desk, features), ["shut", "recs", "parking", "notes", "meetings", "wo"]);
  assert.deepEqual(tiles.pick("Front Desk", "MSPMS", null, desk, features), ["shut", "recs", "parking", "notes", "meetings", "wo"]);
  assert.deepEqual(tiles.pick("Front Desk", "MSPWE", null, desk, features), ["recs", "notes", "meetings", "wo"]);
  assert.deepEqual(tiles.pick("Night Audit", "MSPAM", null, desk, features).slice(0, 2), ["shut", "recs"]);
  assert.equal(tiles.pick("Night Auditor", "MSPWE", null, desk, features)[0], "recs");
  assert.equal(tiles.pick("Front Desk", "MSPAM", null, desk, features).includes("onb"), false);
  assert.equal(tiles.labelOf("recs", "en"), "Local Tips");
  assert.equal(tiles.labelOf("recs", "es"), "Tips locales");
});

test("housekeeping, maintenance, leaders, and corporate keep their own defaults", () => {
  assert.deepEqual(tiles.pick("Housekeeping", "MSPWE", null, hk, features), ["rooms", "myrooms", "insp", "issue"]);
  assert.deepEqual(tiles.pick("Maintenance", "MSPAM", null, mt, features), ["wo", "pm", "issue"]);
  assert.deepEqual(tiles.pick("GM", "MSPWE", null, lead, features).slice(0, 5), ["labor", "insp", "wo", "sleads", "check"]);
  assert.equal(tiles.pick("GM", "MSPWE", null, lead, features).includes("shut"), false);
  assert.equal(tiles.pick("GM", "MSPWE", null, lead, features).includes("dbrief"), false);
  assert.deepEqual(tiles.pick("GM", "MSPAM", null, lead, features).slice(0, 2), ["shut", "labor"]);
  assert.deepEqual(tiles.pick("GM", "MSPMS", null, lead, features).slice(0, 1), ["shut"]);
  assert.equal(tiles.pick("GM", "MSPAM", null, lead, features).includes("onb"), false);
  assert.deepEqual(tiles.pick("AGM", "MSPAM", null, lead, features).slice(0, 4), ["shut", "notes", "parking", "meetings"]);
  assert.deepEqual(tiles.pick("AGM", "MSPMS", null, lead, features).slice(0, 2), ["shut", "notes"]);
  assert.equal(tiles.pick("AGM", "MSPWE", null, lead, features).includes("shut"), false);
  assert.equal(tiles.pick("AGM", "MSPWE", null, lead, features).includes("dbrief"), false);
  assert.equal(tiles.pick("AGM", "MSPWE", null, lead, features)[0], "notes");
  assert.equal(tiles.pick("AGM", "MSPAM", null, lead.concat(["recs"]), features).includes("recs"), false);
  assert.equal(tiles.pick("AGM", "MSPWE", null, lead.concat(["recs"]), features).includes("recs"), false);
  assert.equal(tiles.choices("AGM", "MSPAM", lead.concat(["recs"]), features).includes("recs"), true);
  const bar = ["shut", "recs", "my", "sched"];
  assert.deepEqual(tiles.pick("Bartender", "MSPAM", null, bar, features), ["shut", "recs"]);
  assert.deepEqual(tiles.pick("Bartender", "MSPMS", null, bar, features), ["shut", "recs"]);
  assert.deepEqual(tiles.pick("Bartender", "MSPWE", null, bar, features), ["recs"]);
  assert.deepEqual(tiles.pick("Above Property", "MSPWE", null, corp.concat(["shut"]), features), ["crep", "hcmp", "sleads"]);
  assert.deepEqual(tiles.pick("JR Corporate", "MSPAM", null, corp.concat(["shut"]), features).slice(0, 2), ["dbrief", "shut"]);
  assert.equal(tiles.pick("Above Property", "MSPWE", null, corp.concat(["shut"]), features).includes("shut"), false);
});

test("a saved list replaces defaults, stays inside access, and stops at 8", () => {
  const saved = ["wo", "onb", "notes", "shut", "parking", "meetings", "greq", "rooms", "settings", "insp"];
  assert.deepEqual(tiles.pick("Front Desk", "MSPWE", saved, desk, features), ["wo", "notes", "meetings", "greq", "rooms", "settings"]);
  assert.deepEqual(tiles.pick("Front Desk", "MSPAM", ["notes", "recs"], desk, features), ["notes", "recs"]);
  assert.equal(tiles.pick("Front Desk", "MSPAM", saved, desk, features).length <= 8, true);
  assert.equal(tiles.pick("Front Desk", "MSPAM", [], desk, features).length, 0);
  assert.equal(tiles.labelOf("dbrief", "es"), "Resumen diario");
  assert.equal(tiles.labelOf("parking", "en"), "Park & Fly");
  assert.equal(tiles.labelOf("issue", "es"), "Reportar falla");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261107_home_tiles.sql"), "utf8");
  assert.match(html, /function setHomeTiles\(ids\)/);
  assert.match(html, /home_tiles/);
  assert.match(sql, /add column if not exists home_tiles text\[\]/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /where user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  const more = fs.readFileSync(path.join(__dirname, "../more-menu.js"), "utf8");
  assert.match(more, /photos", "onb"\]/);
  const ux = fs.readFileSync(path.join(__dirname, "../ux.js"), "utf8");
  assert.equal(ux.includes("Finish onboarding"), false);
  assert.equal(ux.includes("go('onb')"), false);
});
