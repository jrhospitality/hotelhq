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

test("missed Golden Valley checklists are recorded once and acknowledged in the briefing, not pushed", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261127_mspwe_fd_overdue_alert.sql"), "utf8");
  assert.match(sql, /create table if not exists public\.checklist_overdue_notices/);
  assert.match(sql, /add column if not exists acknowledged_at timestamptz/);
  assert.match(sql, /add column if not exists acknowledged_by uuid/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.checklist_overdue_notices/);
  assert.match(sql, /private\.notify_mspwe_overdue_checklists/);
  assert.match(sql, /on conflict \(assignment_id\) do nothing/);
  assert.match(sql, /public\.list_mspwe_missed_checklists/);
  assert.match(sql, /public\.acknowledge_mspwe_missed_checklist/);
  assert.match(sql, /private\.is_mgr_of\('MSPWE'\)/);
  assert.match(sql, /acknowledged_by = \(select auth\.uid\(\)\)/);
  assert.match(sql, /n\.acknowledged_at is null/);
  assert.doesNotMatch(sql, /queue_notification/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  const push = fs.readFileSync(path.join(root, "supabase/functions/send-push/index.ts"), "utf8");
  assert.equal(push.includes('n.event === "checklist_overdue"'), false);
  const brief = require("../daily-briefing.js");
  const sample = brief.demoMissed();
  assert.equal(sample[0].person, "Jordan Lee (EX)");
  const html = brief.missedHtml(sample, "en");
  assert.match(html, /id="dbMissed"/);
  assert.match(html, /Missed checklists/);
  assert.match(html, /Jordan Lee \(EX\)/);
  assert.match(html, /Front Desk Shift Success List - PM/);
  assert.match(html, /Due 11:00 PM/);
  assert.match(html, /Acknowledge/);
  assert.match(brief.missedHtml(sample, "es"), /Listas no terminadas/);
  assert.equal(brief.withoutAcknowledged(sample, { demo: { by: "Avery Cole (EX)", at: "2026-11-27T23:05:00Z" } }).length, 0);
});
