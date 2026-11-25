const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const cb = require("../chargebacks.js");

const TODAY = "2026-11-17";
const GM = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const AGM = { role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const CORP = { role: "Above Property", hotel: "", name: "Alex Rivera" };
const HK = { role: "Housekeeper", hotel: "MSPWE", name: "Maria Alvarez" };

function input(extra) {
  return Object.assign({
    hotel: "MSPWE",
    guest: "Example Guest New",
    confirmation: "EX-2001",
    arrival: "2026-11-10",
    departure: "2026-11-12",
    room: "118",
    last4: "1881",
    brand: "Mastercard",
    amount: "75.50",
    reasonCode: "13.1",
    reason: "Example reason",
    processor: "EX-CASE-9",
    received: "2026-11-15",
    deadline: "2026-11-20"
  }, extra);
}

test("GM and AGM see their hotel, corporate sees every hotel, and a housekeeper sees none", () => {
  const rows = cb.exampleDisputes(TODAY);
  assert.deepEqual(cb.visible(rows, GM).map((row) => row.hotel), ["MSPWE", "MSPWE"]);
  assert.equal(cb.visible(rows, AGM).length, 2);
  assert.equal(cb.visible(rows, CORP).length, 5);
  assert.equal(cb.visible(rows, HK).length, 0);
  assert.equal(cb.canSee("AGM"), true);
  assert.equal(cb.canSee("Housekeeper"), false);
});

test("deadlines due within 3 days are soon and past deadlines are overdue", () => {
  assert.equal(cb.deadlineFlag("2026-11-20", TODAY), "soon");
  assert.equal(cb.deadlineFlag("2026-11-17", TODAY), "soon");
  assert.equal(cb.deadlineFlag("2026-11-16", TODAY), "overdue");
  assert.equal(cb.deadlineFlag("2026-11-28", TODAY), "");
  const home = cb.homeSummary(cb.exampleDisputes(TODAY), "MSPWE", TODAY);
  assert.equal(home.open, 2);
  assert.equal(home.overdue, 1);
  assert.equal(home.soon, 1);
  assert.equal(home.tone, "overdue");
  assert.equal(home.badge, 2);
});

test("corporate totals count open, won, and lost dollars and the win rate skips accepted", () => {
  const sum = cb.totals(cb.exampleDisputes(TODAY));
  assert.equal(sum.open, 606.4);
  assert.equal(sum.won, 250);
  assert.equal(sum.lost, 90);
  assert.equal(sum.winRate, 0.5);
  assert.equal(cb.money(sum.open), "$606.40");
  assert.deepEqual(cb.chart(sum), { wonPct: 100, lostPct: 100 });
  assert.deepEqual(cb.chart({ wonCount: 2, lostCount: 1 }), { wonPct: 100, lostPct: 50 });
});

test("the hotel picker stays short when there are many hotels", () => {
  const directory = [];
  for (let i = 0; i < 90; i++) directory.push({ id: "H" + String(i).padStart(3, "0"), name: "Hotel " + i });
  directory.push({ id: "MSPWE", name: "Holiday Inn Express Golden Valley" });
  const idle = cb.pickHotels(directory, "");
  assert.equal(idle.matches.length, 8);
  assert.equal(idle.more, true);
  const found = cb.pickHotels(directory, "golden");
  assert.deepEqual(found.matches.map((hotel) => hotel.id), ["MSPWE"]);
  assert.equal(cb.pickHotels(directory, "h01").matches.length <= 12, true);
});

test("a dispute stores last 4 only, and status history is append-only", () => {
  const start = { disputes: [] };
  assert.equal(cb.problems(input({ last4: "4242424242424242" })), "last4");
  assert.equal(cb.createDispute(start, input(), HK, "2026-11-17T12:00:00Z").error, "forbidden");
  const created = cb.createDispute(start, input(), AGM, "2026-11-17T12:00:00Z");
  assert.equal(created.ok, true);
  assert.equal(created.model.disputes[0].last4, "1881");
  assert.equal(created.model.disputes[0].events.length, 1);
  const moved = cb.setStatus(created.model, created.id, "gathering", GM, "2026-11-17T13:00:00Z");
  assert.equal(moved.ok, true);
  assert.equal(moved.model.disputes[0].events.length, 2);
  assert.equal(moved.model.disputes[0].events[0].status, "new");
  assert.equal(created.model.disputes[0].events.length, 1);
  assert.equal(created.model.disputes[0].status, "new");
  const again = cb.setStatus(moved.model, created.id, "gathering", GM, "2026-11-17T14:00:00Z");
  assert.equal(again.error, "same");
  const other = cb.setStatus(created.model, created.id, "won", { role: "GM", hotel: "MSPAM", name: "Other" }, "2026-11-17T14:00:00Z");
  assert.equal(other.error, "hotel");
});

test("evidence checklist marks the attached types and does not drop earlier files", () => {
  const created = cb.createDispute({ disputes: [] }, input(), GM, "2026-11-17T12:00:00Z");
  const added = cb.addEvidence(created.model, created.id, "folio", "example-folio.pdf", GM);
  const more = cb.addEvidence(added.model, created.id, "id", "example-id.png", AGM);
  const marks = cb.checklist(more.model.disputes[0]);
  assert.equal(marks.length, 6);
  assert.equal(marks.find((item) => item.id === "folio").attached, true);
  assert.equal(marks.find((item) => item.id === "registration").attached, false);
  assert.equal(added.model.disputes[0].evidence.length, 1);
  assert.equal(more.model.disputes[0].evidence.length, 2);
  const rows = cb.exampleDisputes(TODAY);
  assert.equal(rows.every((row) => row.example && /Example Guest/.test(row.guest)), true);
});

test("reason codes map to a category and an unknown code does not guess", () => {
  assert.equal(cb.categoryFor("10.4", "Visa"), "fraud_cnp");
  assert.equal(cb.categoryFor("10.3", "Visa"), "fraud_cp");
  assert.equal(cb.categoryFor("4837", "Mastercard"), "fraud_cnp");
  assert.equal(cb.categoryFor("F29", "Amex"), "fraud_cnp");
  assert.equal(cb.categoryFor("UA02", "Discover"), "fraud_cnp");
  assert.equal(cb.categoryFor("C18", "Amex"), "no_show");
  assert.equal(cb.categoryFor("13.7", "Visa"), "cancelled");
  assert.equal(cb.categoryFor("13.1", "Visa"), "not_received");
  assert.equal(cb.categoryFor("12.6", "Visa"), "duplicate_amount");
  assert.equal(cb.categoryFor("10.4", "Mastercard"), "");
  assert.equal(cb.categoryFor("9999", "Visa"), "");
  assert.equal(cb.CATEGORIES.length, 8);
});

test("required fields and files make a dispute ready to submit", () => {
  const open = cb.exampleDisputes(TODAY)[0];
  const partial = cb.strength(open);
  assert.equal(partial.ready, false);
  assert.ok(partial.missing.indexOf("avsCvv") >= 0);
  const made = cb.createDispute({ disputes: [] }, input({
    brand: "Visa",
    reasonCode: "10.4",
    category: "fraud_cnp",
    details: { cardEntry: "chip", authCode: "EX9", avsCvv: "Y/M", loyalty: "EX-LOYAL" }
  }), GM, "2026-11-17T12:00:00Z");
  assert.equal(made.model.disputes[0].category, "fraud_cnp");
  assert.equal(made.model.disputes[0].details.loyalty, "EX-LOYAL");
  let model = made.model;
  ["registration", "id", "authorization"].forEach((kind) => {
    model = cb.addEvidence(model, made.id, kind, "example-" + kind + ".pdf", GM).model;
  });
  const ready = cb.strength(model.disputes[0]);
  assert.equal(ready.ready, true);
  assert.equal(ready.done, ready.required);
  const rates = cb.categoryRates(cb.exampleDisputes(TODAY));
  const received = rates.find((row) => row.id === "not_received");
  const cancelled = rates.find((row) => row.id === "cancelled");
  assert.equal(received.winRate, 1);
  assert.equal(cancelled.winRate, 0);
  const kept = cb.setDetails(model, made.id, { cardEntry: "online", authCode: "EX9", avsCvv: "Y/M" }, GM);
  assert.equal(model.disputes[0].events.length, kept.model.disputes[0].events.length);
  assert.equal(kept.model.disputes[0].details.cardEntry, "online");
});

test("the migration is additive, events are not writable by clients, and the bucket is private", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261119_chargebacks.sql"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.match(sql, /enable row level security/);
  assert.match(sql, /chargeback-evidence/);
  assert.match(sql, /public = false|set public = false/);
  assert.match(sql, /grant select on table public.chargeback_events/);
  assert.doesNotMatch(sql, /grant (update|delete) on table public.chargeback_events/);
  assert.doesNotMatch(sql, /drop table|delete from public\.|truncate/i);
  assert.match(page, /chargebacks\.js/);
  assert.match(sw, /chargebacks\.js/);
  assert.match(sw, /hotelhq-shell-v42/);
  const types = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261120_chargeback_types.sql"), "utf8");
  assert.match(types, /add column if not exists category/);
  assert.match(types, /details jsonb/);
  assert.match(types, /enable row level security|Row level security on chargebacks/);
  assert.doesNotMatch(types, /drop table|delete from public\.|truncate/i);
  assert.match(fs.readFileSync(path.join(__dirname, "../home-focus.js"), "utf8"), /Chargebacks\.homeHtml/);
});
