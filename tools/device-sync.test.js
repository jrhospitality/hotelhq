const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const d = require("../device-sync.js");

test("empty device keys are skipped and the named stores are planned", () => {
  const mem = {
    jrportal_lplan_v1: "{\"MSPWE\":{}}",
    jrportal_winter_v1: "",
    jrportal_v7: "{\"h\":{}}"
  };
  const rows = d.rowsFrom(function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; }, "MSPAM");
  assert.deepEqual(rows.map(function (r) { return r.store; }), ["portal_state", "labor_plan"]);
  assert.equal(rows[0].hotel, "MSPAM");
  assert.ok(d.STORES.some(function (s) { return s.store === "winter"; }));
  assert.ok(d.STORES.length >= 15);
});

test("the device note is bilingual and the migration does not delete", () => {
  assert.match(d.note("en"), /labor plan/);
  assert.match(d.note("es"), /plan de labor/);
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261102_device_store.sql"), "utf8");
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /unique \(hotel, store\)/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
});
