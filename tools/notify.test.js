const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const n = require("../notify.js");

test("a reminder keeps both languages and a known channel", () => {
  const row = n.remind({
    channel: "push",
    hotel: "MSPAM",
    title: { en: "Clock in", es: "Checa tu entrada" },
    body: { en: "Your shift started.", es: "Tu turno empezó." },
    due: "2026-10-29T12:00:00.000Z"
  });
  assert.equal(row.channel, "push");
  assert.equal(row.title_es, "Checa tu entrada");
  assert.equal(row.body_en, "Your shift started.");
  assert.equal(n.remind({ channel: "sms" }).channel, "in_app");
  assert.deepEqual(n.CHANNELS, ["in_app", "push", "scheduled"]);
});

test("due reminders are the unread ones whose time has passed", () => {
  const rows = n.due([
    { due_at: "2026-10-29T11:00:00.000Z", title_en: "a" },
    { due_at: "2026-10-29T15:00:00.000Z", title_en: "later" },
    { due_at: "2026-10-29T10:00:00.000Z", read_at: "2026-10-29T10:05:00.000Z", title_en: "read" }
  ], "2026-10-29T12:00:00.000Z");
  assert.deepEqual(rows.map(function (r) { return r.title_en; }), ["a"]);
});

test("the reminders migration is additive and scoped to my hotels", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261102_reminders.sql"), "utf8");
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /'in_app', 'push', 'scheduled'/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
});
