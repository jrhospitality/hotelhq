const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ar = require("../ar.js");
const hhq = require("../permissions.js");

const NOW = "2026-11-13T18:00:00.000Z";
const gm = { role: "GM", hotel: "MSPAM", name: "Riley Brooks" };
const gmwe = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPAM", name: "Sam Patel" };
const other = { role: "AGM", hotel: "MSPMS", name: "Parker Olsen" };
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const jr = { role: "JR Corporate", hotel: null, name: "Morgan Ellis" };
const desk = { role: "Front Desk", hotel: "MSPAM", name: "Kim Nguyen" };
const deskwe = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const hk = { role: "Housekeeper", hotel: "MSPAM", name: "Rosa Vega" };

function model() { return ar.buildDemo(NOW); }

test("the morning clock, the 5th, and overdue after the 5th use Chicago time", () => {
  assert.equal(ar.checkinDate(NOW), "2026-11-13");
  assert.equal(ar.dueDate("2026-11-01"), "2026-11-05");
  assert.equal(ar.DUE_DAY, 5);
  assert.equal(ar.monthStatus("2026-11-01", "", "2026-11-01"), "open");
  assert.equal(ar.monthStatus("2026-11-01", "", "2026-11-04"), "open");
  assert.equal(ar.monthStatus("2026-11-01", "", "2026-11-05"), "open");
  assert.equal(ar.monthStatus("2026-11-01", "", ar.checkinDate("2026-11-06T05:30:00.000Z")), "open");
  assert.equal(ar.checkinDate("2026-11-06T06:00:00.000Z"), "2026-11-06");
  assert.equal(ar.monthStatus("2026-11-01", "", "2026-11-06"), "overdue");
  assert.equal(ar.monthStatus("2026-11-01", "2026-11-03T15:00:00.000Z", "2026-11-13"), "on_time");
  assert.equal(ar.monthStatus("2026-11-01", "2026-11-08T15:00:00.000Z", "2026-11-13"), "late");
  const demo = model();
  assert.equal(ar.monthStatus(ar.monthStart(demo.today), "", demo.today), "overdue");
  const mspms = demo.months.find((row) => row.hotel === "MSPMS");
  assert.equal(ar.monthStatus(mspms.period, mspms.submittedAt, demo.today), "on_time");
});

test("roles: GM and AGM see their hotel, corporate sees all, front desk sees only in-house", () => {
  assert.deepEqual(ar.hotelsFor("GM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(ar.hotelsFor("AGM", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(ar.hotelsFor("Above Property", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(ar.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(ar.hotelsFor("Front Desk", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(ar.hotelsFor("Housekeeper", "MSPAM"), []);
  assert.equal(ar.canInvoice(gm, "MSPAM"), true);
  assert.equal(ar.canInvoice(agm, "MSPAM"), true);
  assert.equal(ar.canInvoice(gm, "MSPWE"), false);
  assert.equal(ar.canInvoice(corp, "MSPAM"), false);
  assert.equal(ar.canInvoice(desk, "MSPAM"), false);
  assert.equal(ar.canResolve(gm, "MSPAM"), true);
  assert.equal(ar.canResolve(other, "MSPAM"), false);
  assert.equal(ar.canResolve(corp, "MSPMS"), true);
  assert.equal(ar.canResolve(desk, "MSPAM"), false);
  assert.equal(ar.canThreshold(corp), true);
  assert.equal(ar.canThreshold(jr), true);
  assert.equal(ar.canThreshold(gm), false);
  assert.equal(ar.canAging(desk), false);
  assert.equal(hhq.can("Front Desk", "ar.collect"), true);
  assert.equal(hhq.can("Front Desk", "ar.invoice"), false);
  assert.equal(hhq.can("GM", "ar.threshold"), false);
  assert.equal(hhq.can("Above Property", "ar.threshold"), true);
  assert.equal(hhq.can("Above Property", "ar.aging"), true);
  assert.equal(hhq.can("Housekeeper", "ar.collect"), false);
  assert.equal(hhq.can("AGM", "ar.resolve"), true);
});

test("PEP folio rows become flags, a missing ending balance does not, and ledgers are the fallback", () => {
  const demo = model();
  demo.accounts.forEach((row) => assert.equal(row.label.indexOf("Example "), 0));
  demo.agingAccounts.forEach((row) => assert.equal(row.companyLabel.indexOf("Example "), 0));
  demo.flags.forEach((flag) => {
    assert.equal(flag.guest, undefined);
    assert.match(flag.folioRef, /^[A-Z0-9][A-Z0-9-]*$/);
    assert.equal(flag.folioRef.indexOf(" "), -1);
  });
  const derived = ar.flagsFromDetail({
    hotel: "MSPAM",
    auditDate: "2026-11-12",
    threshold: 500,
    closedFolios: demo.closedFolios,
    houseFolios: demo.houseFolios,
    inhouseFolios: demo.inhouseFolios
  });
  assert.deepEqual(derived.map((row) => row.folioRef).sort(), ["EX-44021", "EX-44023", "HA-12"]);
  assert.equal(ar.checkState(demo, "MSPAM", "checkout_balance").state, "ready");
  assert.equal(ar.checkState(demo, "MSPAM", "house_account").state, "ready");
  assert.equal(ar.checkState(demo, "MSPAM", "inhouse_over").state, "source_missing");
  assert.equal(ar.checkState(demo, "MSPWE", "checkout_balance").state, "source_missing");
  assert.equal(ar.checkState(demo, "MSPWE", "house_account").state, "source_missing");
  assert.equal(ar.checkState(demo, "MSPWE", "inhouse_over").state, "source_missing");
  assert.equal(ar.checkState(demo, "MSPMS", "inhouse_over").detailLevel, "ledger");
  const open = ar.flagsFor(demo, "MSPAM", "checkout_balance");
  assert.equal(open.length, 2);
  const old = open.find((row) => row.folioRef === "EX-44021");
  assert.equal(ar.isEscalated(old, demo.today, false), true);
  assert.equal(ar.isEscalated({ openedOn: "2026-11-10" }, "2026-11-13", false), false);
  assert.equal(ar.isEscalated({ openedOn: "2026-11-09" }, "2026-11-13", false), true);
  const none = ar.flagsFromDetail({
    hotel: "MSPAM", auditDate: "2026-11-12", threshold: 500,
    closedFolios: [{ folioRef: "EX-1", stayStatus: "CHECKED_OUT", endingBalance: 0 }, { folioRef: "EX-2", stayStatus: "CHECKED_OUT", endingBalance: -15 }],
    houseFolios: [{ accountCode: "HA-1", endingBalance: 0.01 }],
    inhouseFolios: [
      { folioRef: "EX-3", endingBalance: null, charges: 180, payments: 0 },
      { folioRef: "EX-4", endingBalance: 500 },
      { folioRef: "EX-5", endingBalance: 500.01 }
    ]
  });
  assert.deepEqual(none.map((row) => row.folioRef).sort(), ["EX-2", "EX-5", "HA-1"]);
  const empty = ar.modelFromRows({}, NOW);
  assert.equal(empty.origin, "live");
  assert.equal(ar.checkState(empty, "MSPWE", "checkout_balance").state, "no_feed");
  assert.equal(ar.balanceHtml(empty, gmwe, { hotel: "MSPWE", lang: "en" }).includes("EXAMPLE"), false);
  assert.match(ar.balanceHtml(empty, gmwe, { hotel: "MSPWE", lang: "en" }), /No AR balance feed yet/);
});

test("the GM records each company and cannot submit without proof", () => {
  const demo = model();
  const html = ar.invoiceHtml(demo, gm, { hotel: "MSPAM", lang: "en" });
  assert.match(html, /id="arInvoice"/);
  assert.match(html, /EXAMPLE/);
  assert.match(html, /Send direct-bill invoices/);
  assert.match(html, /Overdue/);
  assert.match(html, /Example City Ledger North/);
  assert.match(html, /EX-AR-100/);
  assert.match(html, /1840\.00/);
  assert.match(html, /Link the aging report/);
  assert.match(html, /Attach the aging report/);
  assert.match(html, /No open AR/);
  assert.equal(html.includes("Sample Guest"), false);
  const hidden = ar.invoiceHtml(demo, gmwe, { hotel: "MSPAM", lang: "en" });
  assert.equal(hidden.includes("EX-AR-100"), false);
  assert.match(hidden, /Golden Valley/);
  assert.match(hidden, /No direct-bill companies/);
  assert.equal(ar.pageFor(demo, hk, { lang: "en" }), "");
  assert.equal(ar.pageFor(demo, desk, { lang: "en" }).includes("EX-44021"), false);
  const denied = ar.saveLines(demo, "MSPAM", "2026-11-01", [], desk);
  assert.equal(denied.error, "denied");
  const noProof = ar.submitMonth(demo, "MSPAM", "2026-11-01", { kind: "link", url: "" }, gm, NOW);
  assert.equal(noProof.error, "proof");
  const missingLine = ar.submitMonth(demo, "MSPAM", "2026-11-01", { kind: "link", url: "https://example.invalid/ar/aging.pdf" }, gm, NOW);
  assert.equal(missingLine.error, "lines");
  const saved = ar.saveLines(demo, "MSPAM", "2026-11-01", [
    { accountId: "acct-mspam-101", sent: false }
  ], gm);
  assert.equal(saved.ok, true);
  const sentBlock = ar.submitMonth(saved.model, "MSPAM", "2026-11-01", { kind: "no_open_ar", note: "Example note" }, gm, NOW);
  assert.equal(sentBlock.error, "sent");
  const shortNote = ar.submitMonth(saved.model, "MSPAM", "2026-11-01", { kind: "no_open_ar", note: "no" }, gm, NOW);
  assert.equal(shortNote.error, "note");
  const filed = ar.submitMonth(saved.model, "MSPAM", "2026-11-01", { kind: "link", url: "https://example.invalid/ar/aging.pdf" }, gm, NOW);
  assert.equal(filed.ok, true);
  assert.equal(ar.monthStatus("2026-11-01", filed.model.months.find((row) => row.hotel === "MSPAM").submittedAt, "2026-11-13"), "late");
  const again = ar.saveLines(filed.model, "MSPAM", "2026-11-01", [{ accountId: "acct-mspam-101", sent: false }], gm);
  assert.equal(again.error, "submitted");
});

test("balance flags resolve as collected, direct bill, or explained, and escalate after 3 days", () => {
  const demo = model();
  const html = ar.balanceHtml(demo, gm, { hotel: "MSPAM", lang: "en" });
  assert.match(html, /id="arBalances"/);
  assert.match(html, /EXAMPLE/);
  assert.match(html, /EX-44021/);
  assert.match(html, /Escalated to Corporate/);
  assert.match(html, /HA-12/);
  assert.match(html, /Source missing/);
  assert.match(html, /no ending balance/);
  assert.match(html, /Collected/);
  assert.match(html, /Moved to direct bill/);
  assert.equal(html.includes("Guest ledger"), false);
  assert.equal(html.includes("EX-44022"), false);
  const we = ar.balanceHtml(demo, gmwe, { hotel: "MSPWE", lang: "en" });
  assert.match(we, /Source missing/);
  assert.match(we, /Guest ledger/);
  assert.match(we, /City ledger/);
  assert.match(we, /AR ledger/);
  assert.match(we, /House ledger/);
  assert.match(we, /Deposit ledger/);
  assert.match(we, /\$3,950\.00/);
  assert.equal(we.includes("EX-44021"), false);
  const deskHtml = ar.balanceHtml(demo, desk, { hotel: "MSPAM", lang: "en" });
  assert.match(deskHtml, /Source missing/);
  assert.equal(deskHtml.includes("EX-44021"), false);
  assert.equal(deskHtml.includes("HA-12"), false);
  assert.equal(deskHtml.includes("Guest ledger"), false);
  assert.equal(deskHtml.includes("Example City"), false);
  const otherDesk = ar.balanceHtml(demo, deskwe, { hotel: "MSPAM", lang: "en" });
  assert.equal(otherDesk.includes("Hampton"), false);
  const flag = demo.flags.find((row) => row.folioRef === "EX-44023");
  assert.equal(ar.resolveFlag(demo, flag.id, "collected", "", desk, NOW).error, "denied");
  assert.equal(ar.resolveFlag(demo, flag.id, "collected", "", other, NOW).error, "denied");
  assert.equal(ar.resolveFlag(demo, flag.id, "explain", "no", gm, NOW).error, "note");
  const explained = ar.resolveFlag(demo, flag.id, "explain", "Moved after the sample audit.", gm, NOW);
  assert.equal(explained.ok, true);
  assert.equal(ar.flagsFor(explained.model, "MSPAM", "checkout_balance").some((row) => row.folioRef === "EX-44023" && !row.resolution), false);
  const house = demo.flags.find((row) => row.folioRef === "HA-12");
  const direct = ar.resolveFlag(demo, house.id, "direct_bill", "", agm, NOW);
  assert.equal(direct.ok, true);
  const old = demo.flags.find((row) => row.folioRef === "EX-44021");
  const collected = ar.resolveFlag(demo, old.id, "collected", "", corp, NOW);
  assert.equal(collected.ok, true);
  assert.equal(ar.isEscalated(old, demo.today, true), false);
});

test("corporate sees both aging sets, source missing, and ledger fallback", () => {
  const demo = model();
  const html = ar.overviewHtml(demo, corp, { lang: "en" });
  assert.match(html, /id="arOverview"/);
  assert.match(html, /EXAMPLE/);
  assert.match(html, /MSPWE/);
  assert.match(html, /MSPAM/);
  assert.match(html, /MSPMS/);
  assert.match(html, /Over 7/);
  assert.match(html, /Over 150/);
  assert.match(html, /90\+/);
  assert.match(html, /Settlements/);
  assert.match(html, /-\$200\.00/);
  assert.match(html, /Source missing/);
  assert.match(html, /Guest ledger/);
  assert.match(html, /Escalated to Corporate/);
  assert.match(html, /EX-44021/);
  assert.match(html, /2 hotels overdue/);
  assert.equal(html.includes("Sample Guest"), false);
  assert.equal(ar.overviewHtml(demo, gm, { lang: "en" }), "");
  assert.equal(ar.setThreshold(demo, "MSPAM", 750, gm).error, "denied");
  const raised = ar.setThreshold(demo, "MSPAM", 750, corp);
  assert.equal(raised.ok, true);
  assert.equal(raised.model.thresholds.MSPAM, 750);
  assert.equal(ar.setThreshold(demo, "MSPAM", 0, corp).error, "amount");
  assert.equal(ar.saveAging(demo, "MSPWE", "2026-11-12", { current: 1, d30: 2, d60: 3, d90: 4 }, gm).error, "denied");
  const aged = ar.saveAging(demo, "MSPWE", "2026-11-12", { current: 10, d30: 20, d60: 30, d90: 40 }, jr);
  assert.equal(aged.ok, true);
  const rows = ar.summaryBuckets(aged.model, "MSPWE", "standard");
  assert.equal(rows[0].source, "entered");
  assert.equal(ar.bucketAmount(rows, "d90_plus"), 40);
  const home = ar.homeCard(demo, gm, "en");
  assert.match(home, /id="arHome"/);
  assert.match(home, /Send direct-bill invoices/);
  assert.match(home, /Overdue/);
  assert.match(ar.homeCard(demo, corp, "en"), /overdue to JR Corporate/);
  assert.match(ar.homeCard(demo, desk, "en"), /Source missing/);
  assert.equal(ar.homeCard(demo, hk, "en"), "");
});

test("the migration is insert-only and the example loader is not live data", () => {
  const root = path.join(__dirname, "..");
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261117_accounts_receivable.sql"), "utf8");
  const example = fs.readFileSync(path.join(root, "supabase/examples/load_ar_feed.example.sql"), "utf8");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(sql, /source_missing/);
  assert.match(sql, /checkout_balance/);
  assert.match(sql, /house_account/);
  assert.match(sql, /inhouse_over/);
  assert.match(sql, /'guest', 'city', 'ar', 'house', 'deposit'/);
  assert.match(sql, /over_7/);
  assert.match(sql, /over_150/);
  assert.match(sql, /d90_plus/);
  assert.match(sql, /settlements/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.ar_leader/);
  assert.match(sql, /private\.ar_desk/);
  assert.match(sql, /front_desk/);
  assert.match(sql, /inhouse_threshold numeric\(12, 2\) not null default 500/);
  assert.match(sql, /security definer/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function public\.resolve_ar_balance_flag/);
  assert.match(sql, /to authenticated/);
  assert.doesNotMatch(sql, /guest_name/);
  assert.doesNotMatch(sql, /hotel_features_feature_check/);
  assert.doesNotMatch(sql, /set_hotel_feature/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop constraint/i);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /to anon,/);
  assert.match(example, /EXAMPLE DATA/);
  assert.match(example, /Do not run/);
  assert.match(example, /on conflict/i);
  assert.match(example, /ending_balance, source/);
  assert.match(example, /source_missing/);
  assert.doesNotMatch(example, /guest_name/);
  assert.doesNotMatch(example, /Sample Guest/);
  assert.match(html, /ar\.js/);
  assert.match(sw, /\.\/ar\.js/);
  assert.match(sw, /hotelhq-shell-v24/);
  const src = fs.readFileSync(path.join(root, "ar.js"), "utf8");
  assert.doesNotMatch(src, /guest_name/);
  assert.doesNotMatch(src, /Sample Guest/);
  assert.match(fs.readFileSync(path.join(root, "night-audit.js"), "utf8"), /AccountsReceivable\.nightSection/);
  assert.match(fs.readFileSync(path.join(root, "home-focus.js"), "utf8"), /AccountsReceivable\.homeHtml/);
});
