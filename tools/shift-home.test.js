const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const notes = require("../shift-home.js");

test("the home card keeps the latest notes and counts unread ones", () => {
  const rows = [
    { sh: "AM", by: "Kim", t: "VIP in 214\nsecond line", at: "7:00 AM" },
    { sh: "PM", by: "Tess", t: "Late checkout", at: "3:00 PM" },
    { sh: "Night Audit", t: "Two arrivals", at: "6:45 AM" },
    { sh: "AM", t: "Older note", at: "1:00 AM" }
  ];
  const view = notes.model(rows, {}, 3);
  assert.equal(view.empty, false);
  assert.equal(view.rows.length, 3);
  assert.equal(view.unread, 4);
  assert.equal(view.rows[0].line, "VIP in 214");
  assert.equal(view.rows[0].role, "AM");
  const read = {};
  read[notes.noteId(rows[0], 0)] = "1";
  assert.equal(notes.model(rows, read, 3).unread, 3);
  assert.equal(notes.model([], {}, 3).empty, true);
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261108_shift_note_acks.sql"), "utf8");
  assert.match(sql, /ack_my_shift_notes/);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
});
