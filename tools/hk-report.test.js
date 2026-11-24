const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hk = require("../hk-report.js");

const NOW = "2026-11-17T15:00:00.000Z";

function draft(extra) {
  return Object.assign({
    room: "214",
    category: "plumbing",
    note: "",
    photo: true,
    staff: "Maria Alvarez",
    lang: "en",
    id: "hk1"
  }, extra);
}

test("a known room is 3 taps plus a photo, and an unknown room is not guessed", () => {
  assert.equal(hk.taps(true), 3);
  assert.equal(hk.taps(false), 4);
  assert.equal(hk.missing({ category: "tv", photo: true }), "room");
  assert.equal(hk.missing({ room: "214", photo: true }), "category");
  assert.equal(hk.missing({ room: "214", category: "tv" }), "photo");
  assert.equal(hk.canSubmit(draft()), true);
  assert.equal(hk.canSubmit(draft({ photo: "" })), false);
  assert.deepEqual(hk.roomChoices([{ n: 214, hk: "Maria Alvarez" }, { n: 305, hk: "Other" }], "", ""), []);
  assert.deepEqual(hk.roomChoices([{ n: 214, hk: "Maria Alvarez" }, { n: 305, hk: "Other" }], "Maria Alvarez", ""), ["214"]);
  assert.deepEqual(hk.roomChoices([{ n: 210 }, { n: 214 }, { n: 305 }], "", "21"), ["210", "214"]);
});

test("twelve problem tiles include Spanish labels", () => {
  assert.equal(hk.CATEGORIES.length, 12);
  assert.equal(hk.categoryById("hvac").es, "Aire / calefacción");
  assert.equal(hk.categoryById("pest").en, "Pest");
  const enBtn = hk.buttonHtml("en", "");
  const esBtn = hk.buttonHtml("es", "214");
  assert.match(enBtn, />Report maintenance problem</);
  assert.match(esBtn, />Reportar problema de mantenimiento</);
  assert.doesNotMatch(enBtn, />Report a problem</);
  assert.doesNotMatch(esBtn, />Reportar un problema</);
  const src = fs.readFileSync(path.join(__dirname, "../hk-report.js"), "utf8");
  assert.match(src, /hkReportTitle[\s\S]*Report maintenance problem/);
  assert.match(src, /Reportar problema de mantenimiento/);
  assert.match(src, /\.hk-report-go\{[^}]*white-space:normal/);
  assert.match(src, /\.hk-report-go span\{[^}]*overflow-wrap:break-word/);
  assert.match(src, /\.hk-sheet h2\{[^}]*white-space:normal/);
  assert.doesNotMatch(src, /Report a problem"|Reportar un problema/);
});

test("a new report earns 5 and a still-open duplicate earns 0", () => {
  const first = hk.recordSubmit([], [], draft(), NOW);
  assert.equal(first.ok, true);
  assert.equal(first.points, 5);
  assert.equal(first.order.s, "Open");
  assert.equal(first.order.room, "214");
  assert.equal(first.order.category, "plumbing");
  assert.equal(first.ledger.length, 1);
  assert.equal(first.ledger[0].reason, "earn");

  const again = hk.recordSubmit([first.order], first.ledger, draft({ id: "hk2", note: "still dripping" }), NOW);
  assert.equal(again.duplicate, true);
  assert.equal(again.points, 0);
  assert.equal(again.order.s, "Duplicate");
  const extra = again.ledger.filter((row) => row.id !== first.ledger[0].id);
  assert.equal(hk.total(extra, "Maria Alvarez", "2026-11"), 0);
  assert.equal(hk.total(again.ledger, "Maria Alvarez", "2026-11"), 5);
  assert.equal(again.ledger.filter((row) => row.reason === "duplicate").length, 1);
});

test("a rejected report reverses the 5 points and a second reject does not", () => {
  const first = hk.recordSubmit([], [], draft(), NOW);
  const rejected = hk.recordReject(first.ledger, first.order.id, NOW);
  assert.equal(rejected.points, -5);
  assert.equal(hk.total(rejected.ledger, "Maria Alvarez", "2026-11"), 0);
  assert.equal(rejected.ledger.some((row) => row.reason === "rejected"), true);
  const again = hk.recordReject(rejected.ledger, first.order.id, NOW);
  assert.equal(again.points, 0);
  assert.equal(again.ledger.length, rejected.ledger.length);
});

test("the monthly board is points only and example rows stay labeled", () => {
  const model = hk.viewModel({ ledger: [], staff: "Maria Alvarez", month: "2026-11", demo: true });
  assert.equal(model.example, true);
  assert.equal(model.you, 0);
  const a = model.board.find((row) => row.staff === "Example Keeper A (EX)");
  const b = model.board.find((row) => row.staff === "Example Keeper B (EX)");
  assert.equal(a.points, 10);
  assert.equal(a.example, true);
  assert.equal(b.points, 0);
  const html = hk.pointsHtml({ lang: "es", mode: "gm", model: model });
  assert.match(html, /Puntos de camaristas/);
  assert.match(html, /Datos de ejemplo/);
  assert.match(html, /Example Keeper A \(EX\)/);
  assert.doesNotMatch(html, /\$|gift|dólar|dollar|tarjeta/i);
  const mine = hk.pointsHtml({ lang: "en", model: model });
  assert.match(mine, /Your points this month/);
  assert.match(mine, /<b>0<\/b>/);
  assert.doesNotMatch(mine, /hk-board|Example Keeper|\$|gift card/i);
});

test("a housekeeper sees the point total and not a gift-card goal", () => {
  let orders = [];
  let ledger = [];
  for (let i = 0; i < 10; i++) {
    const res = hk.recordSubmit(orders, ledger, draft({ id: "hk" + i, room: String(300 + i), category: i % 2 ? "tv" : "plumbing" }), NOW);
    assert.equal(res.points, 5);
    orders.push(res.order);
    ledger = res.ledger;
  }
  assert.equal(hk.total(ledger, "Maria Alvarez", "2026-11"), 50);
  const dup = hk.recordSubmit(orders, ledger, draft({ id: "hk-dup", room: "300", category: "plumbing" }), NOW);
  assert.equal(dup.points, 0);
  assert.equal(hk.total(dup.ledger, "Maria Alvarez", "2026-11"), 50);
  const rejected = hk.recordReject(dup.ledger, orders[9].id, NOW);
  assert.equal(hk.total(rejected.ledger, "Maria Alvarez", "2026-11"), 45);

  const earned = hk.viewModel({ ledger: ledger, staff: "Maria Alvarez", month: "2026-11" });
  const en = hk.pointsHtml({ lang: "en", model: earned });
  const es = hk.pointsHtml({ lang: "es", model: earned });
  assert.match(en, /<b>50<\/b>/);
  assert.match(en, /Your points this month/);
  assert.match(es, /<b>50<\/b>/);
  assert.match(es, /Tus puntos este mes/);
  assert.doesNotMatch(en, /hk-board|\$|gift|card|prepaid|visa|tremendous|of 10|of 50|progress/i);
  assert.doesNotMatch(es, /hk-board|\$|tarjeta|regalo|visa|tremendous|de 10|de 50|progreso/i);

  const after = hk.viewModel({ ledger: rejected.ledger, staff: "Maria Alvarez", month: "2026-11" });
  const dropped = hk.pointsHtml({ lang: "en", model: after });
  assert.match(dropped, /<b>45<\/b>/);
  assert.doesNotMatch(dropped, /\$|gift|card/i);
});

test("the migration is additive and photos stay on the private bucket path", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261118_hk_report_points.sql"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../hk-report.js"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.match(sql, /points_ledger/);
  assert.match(sql, /private\.award/);
  assert.match(sql, /private\.reverse/);
  assert.match(sql, /hk_report_board/);
  assert.doesNotMatch(sql, /drop table|delete from public\.|truncate/i);
  assert.match(page, /capture="environment"/);
  assert.match(page, /work-order-photos/);
  assert.match(page, /disabled/);
  assert.match(sw, /hk-report\.js/);
  assert.match(sw, /hotelhq-shell-v33/);
});
