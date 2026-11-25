const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("../icons.js");
const av = require("../avatars.js");

test("saved cartoon avatars map to a line icon or initials and keep the old record", () => {
  assert.deepEqual(av.mapChoice(null), { icon: "initials", accent: "" });
  assert.deepEqual(av.mapChoice({ style: "avataaars", seed: "me", role: "", pin: "" }).icon, "initials");
  assert.equal(av.mapChoice({ style: "lorelei", role: "fd", pin: "" }).icon, "bell");
  assert.equal(av.mapChoice({ style: "micah", role: "mt", pin: "heart" }).icon, "heart");
  assert.equal(av.mapChoice({ style: "bottts", role: "", pin: "" }).icon, "wrench");
  assert.equal(av.mapChoice("bed").icon, "bed");
  assert.equal(av.mapChoice("https://example.invalid/a.png").icon, "initials");
  assert.equal(av.mapChoice("data:image/svg+xml,broken").icon, "initials");
  assert.deepEqual(av.mapChoice({ v: 2, icon: "bed", accent: "teal" }), { icon: "bed", accent: "teal" });
  assert.equal(av.mapChoice({ v: 2, icon: "nope", accent: "blue" }).icon, "initials");
  assert.equal(av.OPTIONS.length, 16);
  assert.equal(av.OPTIONS[0].id, "initials");
  assert.equal(av.initialsOf("Rosa Vega"), "RV");
  assert.equal(av.accentFor("Rosa Vega"), av.accentFor("Rosa Vega"));
  const key = av.badgeHtml({ icon: "key", accent: "amber" }, "Kim", 36);
  assert.match(key, /stroke-width="2"/);
  assert.equal(key.includes("<img"), false);
  const letters = av.badgeHtml({ icon: "initials", accent: "slate" }, "Kim Nguyen", 36);
  assert.match(letters, /KN/);
  assert.equal(letters.includes("<img"), false);
  assert.equal(av.badgeHtml({ icon: "not-a-real-icon" }, "Kim Nguyen", 36).includes("<img"), false);
  assert.match(av.badgeHtml({ icon: "not-a-real-icon" }, "Kim Nguyen", 36), /KN/);
  const packed = av.pack({ icon: "coffee" }, { style: "lorelei", role: "fd" });
  assert.equal(packed.icon, "coffee");
  assert.equal(packed.legacy.style, "lorelei");
});

test("saving writes optimistically, retries, and rolls back when the profile save fails", async () => {
  let store = { v: 2, icon: "bed", accent: "teal" };
  let calls = 0;
  const failed = await av.commitSave({
    next: { v: 2, icon: "star", accent: "violet" },
    read: () => store,
    write: (value) => { store = value; },
    remote: async () => { calls += 1; throw new Error("down"); },
    attempts: 3,
    wait: async () => {}
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.rolledBack, true);
  assert.equal(calls, 3);
  assert.equal(store.icon, "bed");
  calls = 0;
  const saved = await av.commitSave({
    next: { v: 2, icon: "star", accent: "violet" },
    read: () => store,
    write: (value) => { store = value; },
    remote: async () => { calls += 1; if (calls < 2) throw new Error("down"); },
    attempts: 3,
    wait: async () => {}
  });
  assert.equal(saved.ok, true);
  assert.equal(store.icon, "star");
  assert.equal(calls, 2);
});

test("the profile column is additive and only the signed-in person can change it", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261111_profile_avatar.sql"), "utf8");
  assert.match(sql, /add column if not exists avatar jsonb/);
  assert.match(sql, /where user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /raise exception 'not allowed'/);
  assert.match(sql, /revoke all on function public\.set_my_avatar\(jsonb\) from public, anon/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop column/i);
});
