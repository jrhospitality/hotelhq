"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

globalThis.DailyAssign = require("../daily-assign.js");
const dc = require("../drawer-count.js");

const fd = { id: "fd1", name: "Sam Rivera (EX)", role: "Front Desk", hotel: "MSPWE" };
const gm = { id: "gm1", name: "Avery Cole (EX)", role: "GM", hotel: "MSPWE" };
const agm = { id: "agm1", name: "Blake Morgan (EX)", role: "AGM", hotel: "MSPWE" };
const corp = { id: "c1", name: "Corp (EX)", role: "Above Property", hotel: "" };
const other = { id: "fd2", name: "Kim (EX)", role: "Front Desk", hotel: "MSPWE" };

function row(amount, item, who) {
  return dc.entry({ amount, item, hotel: "MSPWE", date: "2026-11-27", shift: "PM", user: (who || fd).id, name: (who || fd).name, at: "2026-11-27T15:05:00Z" });
}

test("amounts parse as dollars and reject junk", () => {
  assert.equal(dc.parseAmount("300"), 300);
  assert.equal(dc.parseAmount("$1,300.5"), 1300.5);
  assert.equal(dc.parseAmount(" 299.99 "), 299.99);
  assert.equal(dc.parseAmount("abc"), null);
  assert.equal(dc.parseAmount("-5"), null);
  assert.equal(dc.parseAmount("1.234"), null);
  assert.equal(dc.money(-12.5), "-$12.50");
});

test("each shift has a start count expected at $300; PM and Night Audit also have end count and drop", () => {
  for (const shift of ["AM", "PM", "Night Audit"]) {
    const start = dc.ITEMS[shift].filter((it) => it.count === "start");
    assert.equal(start.length, 1);
    assert.equal(start[0].expected, 300);
    assert.equal(start[0].type, "amount");
  }
  for (const shift of ["PM", "Night Audit"]) {
    assert.equal(dc.ITEMS[shift].filter((it) => it.count === "end" && it.expected === 300).length, 1);
    assert.equal(dc.ITEMS[shift].filter((it) => it.count === "drop").length, 1);
  }
  assert.deepEqual(dc.amountItems([{ en: "x" }, { en: "y", type: "amount", expected: 300 }]).map((i) => i.en), ["y"]);
});

test("variance is counted minus expected and only a non-zero count variance is flagged", () => {
  const start = dc.ITEMS.PM[0];
  const ok = row("300.00", start);
  assert.equal(ok.variance, 0);
  assert.equal(dc.flagged(ok), false);
  const short = row("287.50", start);
  assert.equal(short.variance, -12.5);
  assert.equal(dc.flagged(short), true);
  const drop = row("145", dc.ITEMS.PM[2]);
  assert.equal(drop.kind, "drop");
  assert.equal(drop.drop, 145);
  assert.equal(drop.counted, null);
  assert.equal(dc.flagged(drop), false);
  assert.equal(row("nope", start), null);
});

test("GM, AGM, and Corporate see the log; front desk sees only their own counts", () => {
  const rows = [row("300", dc.ITEMS.PM[0]), row("310", dc.ITEMS.PM[0], other)];
  assert.equal(dc.visible(rows, gm).length, 2);
  assert.equal(dc.visible(rows, agm).length, 2);
  assert.equal(dc.visible(rows, corp).length, 2);
  assert.deepEqual(dc.visible(rows, fd).map((r) => r.user), ["fd1"]);
  assert.equal(dc.visible(rows, Object.assign({}, gm, { hotel: "MSPAM" })).length, 0);
});

test("variances stay flagged in-app until a leader marks them reviewed", () => {
  let rows = [row("290", dc.ITEMS.PM[0]), row("300", dc.ITEMS.PM[1])];
  assert.equal(dc.openFlags(rows, "MSPWE").length, 1);
  const html = dc.logCardHtml(gm, rows, "en");
  assert.match(html, /1 drawer variance needs review/);
  assert.match(html, /Variance -\$10\.00/);
  assert.match(html, /Mark reviewed/);
  rows = dc.review(rows, rows[0].id, "Avery Cole (EX)", "2026-11-27T16:00:00Z");
  assert.equal(dc.openFlags(rows, "MSPWE").length, 0);
  assert.match(dc.logCardHtml(gm, rows, "es"), /Revisado por Avery Cole/);
});

test("the staff card shows typed-amount boxes for the shift, in both languages", () => {
  const html = dc.staffCardHtml(fd, "Night Audit", [], "en");
  assert.equal((html.match(/inputmode="decimal"/g) || []).length, 3);
  assert.match(html, /Expected \$300\.00/);
  assert.match(dc.staffCardHtml(fd, "AM", [], "es"), /Cuenta de caja/);
});

test("live mode shows nothing", () => {
  globalThis.HOTELHQ_CONFIG = { mode: "live" };
  try { assert.equal(dc.homeHtml(), ""); } finally { delete globalThis.HOTELHQ_CONFIG; }
});

test("the migration is additive with RLS for GM, AGM, and Corporate, and the page loads the script", () => {
  const root = path.join(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261127_cash_counts.sql"), "utf8");
  assert.match(sql, /create table if not exists public\.cash_counts/);
  assert.match(sql, /variance numeric\(10, 2\) generated always as \(counted_amount - expected_amount\) stored/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.is_mgr_of\(hotel_id\)/);
  assert.match(sql, /public\.log_cash_count/);
  assert.match(sql, /public\.review_cash_count/);
  assert.match(sql, /set search_path = ''/);
  assert.doesNotMatch(sql, /drop table|delete from|alter table public\.(?!cash_counts)/i);
  assert.doesNotMatch(sql, /queue_notification|call_send_push/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf('src="drawer-count.js"') > 0 && html.indexOf('src="drawer-count.js"') < html.indexOf('src="home-focus.js"'));
  assert.match(fs.readFileSync(path.join(root, "sw.js"), "utf8"), /\.\/drawer-count\.js/);
  assert.match(fs.readFileSync(path.join(root, "home-focus.js"), "utf8"), /DrawerCount\.homeHtml\(\)/);
});
