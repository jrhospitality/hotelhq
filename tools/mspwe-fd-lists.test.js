"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");

require("../data/mspwe-fd-lists.js");
require("../daily-assign.js");
require("../shift-pick.js");
const lists = require("../mspwe-fd-lists.js");

const root = path.join(__dirname, "..");

test("Larry's lists match templates 8, 9 and 10, including the $300 amount items", () => {
  assert.deepEqual(lists.lists().map((list) => [list.id, list.shift, list.items.length]), [
    [8, "AM", 44],
    [9, "PM", 30],
    [10, "Night Audit", 34]
  ]);
  const am = lists.byShift("AM").items[1];
  assert.equal(am.n, 2);
  assert.equal(am.type, "amount");
  assert.equal(am.count, "start");
  assert.equal(am.expected, 300);
  assert.equal(lists.byShift("PM").items.filter((item) => item.count === "drop").length, 1);
  assert.equal(lists.byShift("Night Audit").items.filter((item) => item.count === "end" && item.expected === 300).length, 1);
  const text = lists.lists().map((list) => list.items.map((item) => item.en).join("\n")).join("\n");
  assert.equal(/email the agm/i.test(text), false);
  assert.match(lists.byShift("AM").name_en, /Front Desk Shift Success List - AM/);
});

test("a person sees only the Golden Valley front desk list assigned to them", () => {
  const fd = { id: "mspwe-fd", role: "Front Desk", hotel: "MSPWE" };
  assert.equal(lists.assignedShift(fd), "AM");
  assert.deepEqual(lists.forViewer(fd).map((list) => list.id), [8]);
  const gm = { id: "mspwe-gm", role: "GM", hotel: "MSPWE" };
  assert.deepEqual(lists.forViewer(gm), []);
  assert.equal(lists.showLiveList({ id: 9, department: "front_desk" }, fd), false);
  assert.equal(lists.showLiveList({ id: 8, department: "front_desk" }, fd), true);
  assert.equal(lists.showLiveList({ id: 11, department: "front_desk" }, fd), false);
  assert.equal(lists.showLiveList({ id: 4, department: "housekeeping" }, gm), true);
  assert.equal(lists.isFrontDeskList({ name: "1st Shift - AM Check list", role: "Front Desk" }), true);
  assert.equal(lists.isFrontDeskList({ name: "Daily Maintenance Checklist", role: "Maintenance" }), false);
  assert.equal(lists.keepItem({ def: "Front Desk", grp: "1st Shift - AM Check list" }, "MSPWE"), false);
  assert.equal(lists.keepItem({ def: "Housekeeping", grp: "Housekeeping daily" }, "MSPWE"), true);
  assert.equal(lists.keepItem({ def: "Front Desk", grp: "1st Shift - AM Check list" }, "MSPAM"), true);
});

test("Golden Valley home shows only that person's assignments; other hotels keep the team list", () => {
  const daily = require("../daily-assign.js");
  const rows = daily.plan(daily.exampleInput("2026-11-25"));
  const gm = { id: "mspwe-gm", role: "GM", hotel: "MSPWE" };
  const own = daily.homeScope(rows, gm).map((row) => row.employee);
  assert.ok(own.every((id) => id === "mspwe-gm"));
  assert.equal(own.includes("mspwe-fd"), false);
  const other = daily.homeScope(rows, { id: "mspam-fd", role: "GM", hotel: "MSPAM" });
  assert.ok(other.some((row) => row.employee === "mspam-fd"));
});

test("the overdue alert migration is additive, once per assignment, and does not email", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261127_mspwe_fd_overdue_alert.sql"), "utf8");
  assert.match(sql, /create table if not exists public\.checklist_overdue_notices/);
  assert.match(sql, /assignment_id bigint primary key/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.notify_mspwe_overdue_checklists/);
  assert.match(sql, /private\.queue_notification\('checklist_overdue'/);
  assert.match(sql, /d\.hotel_id = 'MSPWE'/);
  assert.match(sql, /d\.kind = 'checklist'/);
  assert.match(sql, /d\.due_at <= pg_catalog\.now\(\)/);
  assert.match(sql, /on conflict \(assignment_id\) do nothing/);
  assert.match(sql, /set detail = v_title \|\| ': ' \|\| v_body/);
  assert.match(sql, /pr\.role = 'gm' and pr\.active/);
  assert.doesNotMatch(sql, /set title = v_title/);
  assert.match(sql, /mspwe-checklist-overdue/);
  assert.match(sql, /\*\/15 \* \* \* \*/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /call_send_push|smtp\.|mailto/i);
  const push = fs.readFileSync(path.join(root, "supabase/functions/send-push/index.ts"), "utf8");
  assert.match(push, /"checklist_overdue"/);
  assert.match(push, /n\.event === "checklist_overdue"/);
  assert.match(push, /n\.recipients/);
  assert.match(push, /action === "initial"/);
  assert.match(push, /people\(n\.hotel_id, ev\.roles, c\.extra\)/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf('src="data/mspwe-fd-lists.js"') > 0);
  assert.ok(html.indexOf('src="mspwe-fd-lists.js"') > html.indexOf('src="daily-assign.js"'));
  assert.match(fs.readFileSync(path.join(root, "sw.js"), "utf8"), /\.\/mspwe-fd-lists\.js/);
});
