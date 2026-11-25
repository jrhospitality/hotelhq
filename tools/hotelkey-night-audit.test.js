const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const hk = require("./hotelkey-night-audit.js");

const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261125_night_audit_hotelkey.sql"), "utf8");
const MORNING = "2026-11-25T12:15:00.000Z";

function base(extra) {
  return Object.assign({
    hotel: "MSPWE",
    auditDate: "2026-11-24",
    now: MORNING,
    closedFolios: [],
    auditLines: [],
    taxRows: [],
    taxHasCertificate: false,
    rooms: [],
    files: {}
  }, extra);
}

function byCode(review) {
  const out = {};
  review.items.forEach((item) => { out[item.code + "|" + item.confirmation] = item; });
  return out;
}

test("yesterday in Chicago and a rejected hotel", () => {
  assert.equal(hk.resolveAuditDate("yesterday", MORNING), "2026-11-24");
  assert.equal(hk.resolveAuditDate("yesterday", "2026-11-25T05:30:00.000Z"), "2026-11-23");
  assert.equal(hk.reviewFromParts({ hotel: "REAL", auditDate: "2026-11-24" }).reason, "hotel");
  assert.equal(hk.reviewFromParts({ hotel: "MSPWE", auditDate: "11/24/2026" }).reason, "audit_date");
});

test("checked-out balances are flagged and guest names are dropped", () => {
  const review = hk.reviewFromParts(base({
    closedFolios: [
      { folio_ref: "DEMO-1001", room: "118", stay_status: "Checked Out", ending_balance: "$42.50", guest_name: "Sample Guest Ames" },
      { folio_ref: "DEMO-1002", room: "214", stay_status: "CHECKED_OUT", ending_balance: "0.00", guest_name: "Sample Guest Cole" },
      { folio_ref: "DEMO-1003", room: "220", stay_status: "CHECKED_OUT", ending_balance: "(15.00)" },
      { folio_ref: "DEMO-1004", room: "221", stay_status: "CANCELLED", ending_balance: "80" },
      { folio_ref: "DEMO-1005", room: "222", stay_status: "NO_SHOW", ending_balance: "25" },
      { folio_ref: "DEMO-1006", room: "223", stay_status: "IN_HOUSE", ending_balance: "900" }
    ]
  }));
  const items = byCode(review);
  assert.equal(items["checkout_balance|DEMO-1001"].amount, 42.5);
  assert.equal(items["checkout_balance|DEMO-1001"].guest_name, "Room 118");
  assert.equal(items["checkout_balance|DEMO-1001"].room, "118");
  assert.equal(items["checkout_balance|DEMO-1003"].why_en.includes("credit"), true);
  assert.equal(items["cancel_balance|DEMO-1004"].category, "balances");
  assert.equal(items["checkout_balance|DEMO-1005"].why_en.includes("No-show"), true);
  assert.equal(items["checkout_balance|DEMO-1002"], undefined);
  assert.equal(items["checkout_balance|DEMO-1006"], undefined);
  const packed = JSON.stringify(hk.payloadForRpc(review));
  assert.equal(packed.includes("Sample Guest"), false);
  assert.equal(packed.includes("Ames"), false);
  assert.equal(packed.includes("Cole"), false);
});

test("no-show fees, cash, and out-of-order rooms follow the columns that exist", () => {
  const quiet = hk.reviewFromParts(base({
    auditLines: [
      { section: "occupancy", line_name: "No Show", actual_today: 0 },
      { section: "occupancy", line_name: "Cancelled", actual_today: 6 },
      { section: "occupancy", line_name: "Out of Order", actual_today: 0 },
      { section: "cash", line_name: "Cash Over / Short", actual_today: 0, net_today: 0 },
      { section: "charge_type", line_name: "CANCELLATION CHARGE", line_code: "1308", actual_today: 0, net_today: 0 },
      { section: "room_revenue", line_name: "NO SHOW ROOM REVENUE", line_code: "NSRR", actual_today: 0, net_today: 0 }
    ],
    rooms: [{ room_number: "118", ooo: true }]
  }));
  assert.equal(quiet.items.some((item) => item.code === "noshow_uncharged" || item.code === "late_cancel_uncharged" || item.code === "cash_short" || item.code === "ooo_not_returned"), false);
  assert.equal(quiet.unsupported.includes("cancel_fee"), true);
  assert.equal(quiet.unsupported.includes("ooo_returned"), false);

  const flagged = hk.reviewFromParts(base({
    auditLines: [
      { section: "occupancy", line_name: "No Show", actual_today: "2" },
      { section: "occupancy", line_name: "Out of Order", actual_today: "1" },
      { section: "cash", line_name: "Cash Over / Short", net_today: "-32.94", actual_today: "-32.94" },
      { section: "room_revenue", line_name: "NO SHOW ROOM REVENUE", line_code: "NSRR", net_today: "0.00" },
      { section: "room_revenue", line_name: "NO SHOW ROOM REVENUE", line_code: "NSFC", net_today: "0" },
      { section: "adr", line_name: "ADR Excluding Comp House Use Rooms", actual_today: "110.00", mtd: "108.00", ytd: "105.00" }
    ],
    rooms: [
      { room_number: "101", ooo: false },
      { room_number: "118", ooo: true },
      { room_number: "118", ooo: "Y" }
    ]
  }));
  const items = byCode(flagged);
  assert.equal(items["noshow_uncharged|NOSHOW"].guest_name, "No-show count");
  assert.match(items["noshow_uncharged|NOSHOW"].why_en, /count is 2/);
  assert.equal(items["cash_short|CASH"].amount, 32.94);
  assert.equal(items["ooo_not_returned|OOO118"].room, "118");
  assert.equal(items["ooo_not_returned|OOO118"].why_en.includes("repaired"), false);
  assert.equal(flagged.items.filter((item) => item.code === "ooo_not_returned").length, 1);
  assert.equal(flagged.rows.some((row) => row.section === "gm_revenue" && row.cells.metric === "adr" && row.cells.today === 110), true);

  const posted = hk.reviewFromParts(base({
    auditLines: [
      { line_name: "No Show", actual_today: 2 },
      { line_name: "Cash Over / Short", net_today: "5.00" },
      { line_name: "NO SHOW ROOM REVENUE", line_code: "NSRR", net_today: "95.92" }
    ],
    rooms: []
  }));
  assert.equal(posted.items.some((item) => item.code === "noshow_uncharged"), false);
  assert.equal(posted.items.find((item) => item.code === "cash_over").amount, 5);
  assert.equal(posted.unsupported.includes("ooo_returned"), true);
});

test("a missing certificate column is not a missing certificate", () => {
  const bare = hk.reviewFromParts(base({
    taxRows: [{ folio_ref: "DEMO-9", room: "204", category: "Charity", exempted_revenue: "40.00" }],
    taxHasCertificate: false
  }));
  assert.equal(bare.items.some((item) => item.code === "exempt_no_cert"), false);
  assert.equal(bare.unsupported.includes("tax_certificate"), true);
  assert.equal(bare.unsupported.includes("rate_override"), true);
  assert.equal(bare.unsupported.includes("adjustment_reason"), true);
  assert.equal(bare.unsupported.includes("housekeeping"), true);
  assert.equal(bare.unsupported.includes("ar_aging"), true);
  assert.equal(bare.unsupported.includes("inhouse_balance"), true);
  assert.equal(bare.unsupported.includes("house_account"), true);

  const scored = hk.reviewFromParts(base({
    taxRows: [
      { folio_ref: "DEMO-9", room: "204", certificate: "", exempted_revenue: "40" },
      { folio_ref: "DEMO-8", room: "205", certificate: "on file", exempted_revenue: "10" }
    ],
    taxHasCertificate: true
  }));
  assert.equal(scored.items.filter((item) => item.code === "exempt_no_cert").length, 1);
  assert.equal(scored.items[0].confirmation, "DEMO-9");
  assert.equal(scored.unsupported.includes("tax_certificate"), false);
});

test("the CLI prints an RPC body and leaves the sample name out", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hk-na-"));
  const closed = path.join(dir, "closed.csv");
  const finalFile = path.join(dir, "final.csv");
  fs.writeFileSync(closed, [
    "Guest Name,Confirmation Number,Room Number,Status,Balance",
    "Sample Guest Ames,DEMO-1001,118,Checked Out,\"$42.50\"",
    "Sample Guest Cole,DEMO-1002,214,Checked Out,0"
  ].join("\n"));
  fs.writeFileSync(finalFile, [
    "section,line_name,line_code,actual_today,net_today",
    "occupancy,No Show,,0,",
    "occupancy,Out of Order,,1,1",
    "cash,Cash Over / Short,,-1.25,-1.25",
    "room_revenue,NO SHOW ROOM REVENUE,NSRR,0,0"
  ].join("\n"));
  const rooms = path.join(dir, "rooms.json");
  fs.writeFileSync(rooms, JSON.stringify([{ room_number: "118", ooo: true }]));
  let stderr = "";
  const oldErr = process.stderr.write;
  process.stderr.write = function (chunk) { stderr += chunk; return true; };
  let stdout = "";
  const oldOut = process.stdout.write;
  process.stdout.write = function (chunk) { stdout += chunk; return true; };
  const code = hk.runCli([
    "--hotel", "MSPWE",
    "--audit-date", "yesterday",
    "--closed", closed,
    "--final", finalFile,
    "--rooms", rooms
  ], MORNING);
  process.stderr.write = oldErr;
  process.stdout.write = oldOut;
  assert.equal(code, 0, stderr);
  assert.equal(stdout.includes("Sample Guest"), false);
  assert.equal(stdout.includes("Ames"), false);
  const body = JSON.parse(stdout);
  assert.equal(body.p.hotel, "MSPWE");
  assert.equal(body.p.audit_date, "2026-11-24");
  assert.equal(body.p.source, "hotelkey");
  assert.equal(body.p.status, "parsed");
  assert.equal(body.p.items.some((item) => item.confirmation === "DEMO-1001" && item.code === "checkout_balance"), true);
  assert.equal(body.p.items.some((item) => item.code === "cash_short"), true);
  assert.equal(body.p.items.some((item) => item.confirmation === "OOO118"), true);
  assert.equal(body.p.coverage.some((row) => row.check_id === "rate_override" && row.support === "unsupported"), true);
  const bad = hk.runCli(["--hotel", "MSPWE", "--audit-date", "2026-11-24", "--closed", path.join(dir, "missing.csv")], MORNING);
  assert.equal(bad, 1);
});

test("raw HotelKey headers from a multi-section final audit and the folio and tax exports", () => {
  const finalText = [
    "Room Revenue",
    "Charge Type Code,Charge Type Name,Actual Today,Adjusted,Net Today,M-T-D,Y-T-D",
    "NSRR,NO SHOW ROOM REVENUE,0,0,0,0,0",
    "RR,GUEST ROOM,100.00,0,100.00,3000,36000",
    "Statistical Counts",
    "Type,Actual Today,M-T-D,Y-T-D",
    "No Shows,2,4,10",
    "Out of Order,1,1,3",
    "Cash Deposit And Cash Drop",
    "Type,Actual Today,Adjusted,Net Today,M-T-D",
    "Cash Over / Short,-1.25,0,-1.25,-1.25",
    "Revenue & Charges",
    "Type,Actual Today,Net Today,M-T-D,Y-T-D",
    "Room Revenue,100.00,100.00,3000,36000",
    "Totals,100.00,100.00,3000,36000",
    "Occupancy",
    "Type,Actual Today,M-T-D,Y-T-D",
    "\"Occupancy Excluding Out of Order Rooms and Including Comp, House Use Rooms\",80,78,75",
    "Revenue Statistics",
    "Type,Actual Today,M-T-D,Y-T-D",
    "ADR Excluding Comp House Use Rooms,110.00,108.00,105.00",
    "RevPar Without Out Of Order Rooms,88.00,86.00,84.00"
  ].join("\n");
  const audit = hk.loadFinalAudit(finalText);
  assert.equal(audit.ok, true);
  assert.equal(audit.rows.some((row) => row.line_code === "NSRR" && row.line_name === "NO SHOW ROOM REVENUE"), true);
  assert.equal(audit.rows.some((row) => row.line_name === "No Show" && row.actual_today === "2"), true);
  assert.equal(audit.rows.some((row) => row.section === "revenue_category" && row.line_name === "Room Revenue"), true);
  assert.equal(audit.rows.some((row) => normHeader(row.line_name) === "totals"), false);

  const closedText = [
    "Reservations",
    "Confirmation Number,Today's Ending Balance,Guest Name,Status,Room Number",
    "DEMO-1001,$42.50,Sample Guest Ames,Checked Out,118",
    "DEMO-1002,0,Sample Guest Cole,Checked Out,214",
    "Net Totals",
    "Module Type,Today's Ending Balance",
    "Reservations,42.50"
  ].join("\n");
  const closed = hk.loadClosedFolios(closedText);
  assert.equal(closed.ok, true);
  assert.deepEqual(closed.rows.map((row) => row.folio_ref), ["DEMO-1001", "DEMO-1002"]);
  assert.equal(closed.rows[0].ending_balance, "$42.50");
  assert.equal(closed.rows[0].stay_status, "Checked Out");
  assert.equal(closed.rows[0].room, "118");
  assert.equal(Object.prototype.hasOwnProperty.call(closed.rows[0], "guest_name"), false);

  const taxText = [
    "Transaction Number,Room Number,Guest Name,Tax Exemption Category,Exempted Revenue,City Tax",
    "DEMO-9,204,Sample Guest Ames,Charity,40.00,0",
    "Totals,,,,40.00,0"
  ].join("\n");
  const tax = hk.loadTaxForecast(taxText);
  assert.equal(tax.ok, true);
  assert.equal(tax.rows.length, 1);
  assert.equal(tax.rows[0].folio_ref, "DEMO-9");
  assert.equal(tax.rows[0].room, "204");
  assert.equal(tax.rows[0].category, "Charity");
  assert.equal(tax.rows[0].exempted_revenue, "40.00");
  assert.equal(tax.headers.indexOf("certificate") >= 0, false);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hk-raw-"));
  const finalFile = path.join(dir, "final-audit.csv");
  const closedFile = path.join(dir, "closed-folios-balance.csv");
  const taxFile = path.join(dir, "tax-exemption-forecast.csv");
  const rooms = path.join(dir, "rooms.json");
  fs.writeFileSync(finalFile, finalText);
  fs.writeFileSync(closedFile, closedText);
  fs.writeFileSync(taxFile, taxText);
  fs.writeFileSync(rooms, JSON.stringify([{ room_number: "118", ooo: true }]));
  let stderr = "";
  const oldErr = process.stderr.write;
  process.stderr.write = function (chunk) { stderr += chunk; return true; };
  let stdout = "";
  const oldOut = process.stdout.write;
  process.stdout.write = function (chunk) { stdout += chunk; return true; };
  const code = hk.runCli([
    "--hotel", "MSPWE",
    "--audit-date", "2026-11-24",
    "--closed", closedFile,
    "--final", finalFile,
    "--tax", taxFile,
    "--rooms", rooms
  ], MORNING);
  process.stderr.write = oldErr;
  process.stdout.write = oldOut;
  assert.equal(code, 0, stderr);
  assert.equal(stdout.includes("Sample Guest"), false);
  assert.equal(stdout.includes("Ames"), false);
  assert.equal(stdout.includes("Cole"), false);
  const body = JSON.parse(stdout);
  assert.equal(body.p.items.some((item) => item.confirmation === "DEMO-1001" && item.code === "checkout_balance" && item.amount === 42.5), true);
  assert.equal(body.p.items.some((item) => item.confirmation === "Reservations"), false);
  assert.equal(body.p.items.some((item) => item.code === "noshow_uncharged"), true);
  assert.equal(body.p.items.some((item) => item.code === "cash_short" && item.amount === 1.25), true);
  assert.equal(body.p.items.some((item) => item.confirmation === "OOO118"), true);
  assert.equal(body.p.items.some((item) => item.code === "exempt_no_cert"), false);
  assert.equal(body.p.coverage.some((row) => row.check_id === "tax_certificate" && row.support === "unsupported"), true);
  assert.equal(body.p.rows.some((row) => row.section === "gm_revenue" && row.cells.metric === "room_revenue" && row.cells.today === 100), true);
  assert.equal(body.p.rows.some((row) => row.section === "gm_revenue" && row.cells.metric === "adr" && row.cells.today === 110), true);
});

function normHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

test("the migration is insert-only and limited to GM, AGM, and corporate", () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.night_audit_allowed\(hotel\)/);
  assert.match(sql, /'supported', 'unsupported'/);
  assert.match(sql, /on conflict \(hotel, audit_date, check_id\) do nothing/);
  assert.match(sql, /on conflict \(hotel, audit_date, code, confirmation\) do nothing/);
  assert.match(sql, /ingest_hotelkey_night_audit/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /security definer/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /grant select on table public\.night_audit_check_coverage to authenticated/);
  assert.match(sql, /revoke all on table public\.night_audit_check_coverage from public, anon, authenticated/);
  assert.match(sql, /to service_role/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /truncate/i);
  assert.doesNotMatch(sql, /user_metadata/i);
  assert.doesNotMatch(sql, /to anon/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
});
