const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const std = require("../labor-standards.js");

const READ = "2026-10-30";
const PAY = ["pay", "wage", "rate", "hourly"];

function names(hotel, day) {
  return std.missing(std.seed(hotel), day || READ, hotel).map((item) => item.en).sort();
}
function hours(hotel, position, day, ctx) {
  return std.hoursFor(std.seed(hotel), position, day || READ, ctx || {});
}

test("each hotel keeps Hotel Effectiveness names and hides jobs it does not have", () => {
  const am = std.positions("MSPAM").map((item) => item.en);
  const we = std.positions("MSPWE").map((item) => item.en);
  const ms = std.positions("MSPMS").map((item) => item.en);
  assert.ok(am.includes("Front Desk Agent"));
  assert.ok(am.includes("Houseperson"));
  assert.ok(am.includes("HSKP Supervisor"));
  assert.equal(am.includes("Bartender"), false);
  assert.equal(am.includes("Front Desk Clerk"), false);
  assert.equal(am.includes("Hskp Houseman"), false);
  assert.ok(we.includes("Front Desk Clerk"));
  assert.ok(we.includes("Hskp Houseman"));
  assert.ok(we.includes("Hskp Supervisor"));
  assert.equal(we.includes("Front Desk Agent"), false);
  assert.equal(we.includes("Front Desk Supervisor"), false);
  assert.equal(we.includes("Night Auditor"), false);
  assert.equal(we.includes("Bartender"), false);
  assert.equal(we.includes("Houseperson"), false);
  assert.equal(we.includes("Executive Housekeeper"), false);
  assert.ok(ms.includes("Guest Service Representative"));
  assert.ok(ms.includes("Bartender"));
  assert.ok(ms.includes("Hskp Houseman"));
  assert.equal(ms.includes("Front Desk Agent"), false);
  assert.equal(ms.includes("Front Desk Clerk"), false);
  assert.equal(ms.includes("Houseperson"), false);
});

test("Hampton has eight open positions on the read date and the executive housekeeper starts later", () => {
  assert.deepEqual(names("MSPAM"), [
    "Deep Cleaning Attendant",
    "Front Desk Manager",
    "Front Desk Supervisor",
    "GM",
    "Housekeeping Training",
    "Night Auditor",
    "Training Breakfast Attendant",
    "Training Front Desk"
  ]);
  assert.ok(names("MSPAM", "2026-02-01").includes("Executive Housekeeper"));
  assert.equal(hours("MSPAM", "agm"), 5.71);
  assert.equal(hours("MSPAM", "maint_eng"), 5.71);
  assert.equal(hours("MSPAM", "driver"), 16);
  assert.equal(hours("MSPAM", "houseperson"), 10);
  assert.equal(hours("MSPAM", "breakfast", READ, { roomsSoldPrev: 100 }), 9);
  assert.equal(hours("MSPAM", "breakfast", READ, { roomsSoldPrev: 99 }), 6);
  assert.equal(hours("MSPAM", "fd_agent", READ, { roomsSold: 70 }), 20);
  assert.equal(hours("MSPAM", "fd_agent", READ, { roomsSold: 125 }), 24);
  assert.equal(hours("MSPAM", "hskp_sup", READ, { roomsSoldPrev: 29 }), 0);
  assert.equal(hours("MSPAM", "hskp_sup", READ, { roomsSoldPrev: 30 }), 2.5);
  assert.equal(hours("MSPAM", "hskp_sup", READ, { roomsSoldPrev: 200 }), 147 * 5 / 60);
  assert.deepEqual(std.roomMinutesFrom(std.seed("MSPAM"), READ), {
    checkout: 30, stayover: 15, deep: 45, suite: 36, breakMin: null
  });
});

test("Golden Valley combines fixed and variable standards and keeps both tiers", () => {
  assert.deepEqual(names("MSPWE"), [
    "Deep Cleaning Attendant",
    "Driver",
    "Front Desk Manager",
    "GM",
    "Housekeeping Training",
    "Training Breakfast Attendant",
    "Training Front Desk"
  ]);
  assert.equal(names("MSPWE").includes("Maintenance Engineer"), false);
  assert.equal(names("MSPWE").includes("Executive Housekeeper"), false);
  assert.equal(std.seed("MSPWE").some((row) => row.position === "exec_hk"), false);
  assert.equal(hours("MSPWE", "maint_eng"), 0);
  assert.equal(hours("MSPWE", "exec_hk"), null);
  assert.equal(hours("MSPWE", "agm"), 5.71);
  assert.equal(hours("MSPWE", "breakfast", READ, { roomsSoldPrev: 0 }), 0);
  assert.equal(hours("MSPWE", "breakfast", READ, { roomsSoldPrev: 90 }), 5.5);
  assert.equal(hours("MSPWE", "breakfast", READ, { roomsSoldPrev: 91 }), 8.5);
  assert.equal(hours("MSPWE", "breakfast", "2025-12-01", { roomsSoldPrev: 100 }), 5.5);
  assert.equal(hours("MSPWE", "fd_clerk", READ, { roomsSold: 90 }), 18.28);
  assert.equal(hours("MSPWE", "fd_clerk", READ, { roomsSold: 91 }), 22.28);
  const houseman = std.seed("MSPWE").filter((row) => row.position === "hskp_houseman");
  assert.deepEqual(houseman.map((row) => row.kind), ["per_sold"]);
  assert.equal(houseman[0].basis, "prev");
  assert.equal(houseman[0].minutes, 5);
  assert.equal(hours("MSPWE", "hskp_houseman", "2025-05-20", { roomsSoldPrev: 40 }), null);
  assert.equal(hours("MSPWE", "hskp_houseman", READ, { roomsSoldPrev: 40 }), 40 * 5 / 60);
  assert.equal(hours("MSPWE", "hskp_sup", "2025-12-01", { roomsSoldPrev: 40 }), null);
  assert.equal(hours("MSPWE", "laundry", READ, { roomsSoldPrev: 32 }), 32 * 5 / 60);
  const early = std.roomMinutesFrom(std.seed("MSPWE"), "2025-03-01");
  assert.deepEqual(early, { checkout: null, stayover: null, deep: null, suite: 35, breakMin: null });
  assert.deepEqual(std.roomMinutesFrom(std.seed("MSPWE"), READ), {
    checkout: 30, stayover: 15, deep: 45, suite: 35, breakMin: null
  });
  assert.equal(std.roomMinutesFrom(std.seed("MSPWE"), "2024-12-01"), null);
});

test("SpringHill uses its own ranges and the higher tier wins a shared boundary", () => {
  assert.deepEqual(names("MSPMS"), [
    "Deep Cleaning Attendant",
    "Front Desk Manager",
    "Front Desk Supervisor",
    "GM",
    "Housekeeping Training",
    "Training Breakfast Attendant",
    "Training Front Desk"
  ]);
  assert.equal(hours("MSPMS", "maint_eng", "2026-08-01"), null);
  assert.equal(hours("MSPMS", "maint_eng"), 9.14);
  assert.equal(hours("MSPMS", "bartender"), 5.5);
  assert.equal(hours("MSPMS", "driver"), 8);
  assert.equal(hours("MSPMS", "night_auditor"), 8);
  assert.equal(hours("MSPMS", "exec_hk"), 0);
  assert.equal(hours("MSPMS", "breakfast", "2026-01-15", { roomsSoldPrev: 50 }), 0);
  assert.equal(hours("MSPMS", "breakfast", "2026-01-15", { roomsSoldPrev: 85 }), 9);
  assert.equal(hours("MSPMS", "breakfast", READ, { roomsSoldPrev: 84 }), 5);
  assert.equal(hours("MSPMS", "breakfast", READ, { roomsSoldPrev: 85 }), 9);
  assert.equal(hours("MSPMS", "gsr", READ, { roomsSold: 84 }), 10.29);
  assert.equal(hours("MSPMS", "gsr", READ, { roomsSold: 85 }), 16);
  assert.equal(hours("MSPMS", "hskp_houseman", READ, { roomsSold: 20, roomsSoldPrev: 40 }), 20 * 5 / 60);
  assert.equal(hours("MSPMS", "hskp_sup", READ, { roomsSoldPrev: 29 }), 0);
  assert.equal(hours("MSPMS", "hskp_sup", READ, { roomsSoldPrev: 114 }), 114 * 5 / 60);
  assert.equal(hours("MSPMS", "hskp_sup", READ, { roomsSoldPrev: 200 }), 114 * 5 / 60);
  assert.deepEqual(std.roomMinutesFrom(std.seed("MSPMS"), READ), {
    checkout: 35, stayover: 15, deep: 45, suite: 40, breakMin: null
  });
  assert.equal(std.roomMinutesFrom(std.seed("MSPMS"), "2026-02-01"), null);
});

test("a later standard wins an overlapping tier or the same room-type minute", () => {
  const tiers = [
    { position: "breakfast", kind: "tiered", basis: "prev", start: "2026-01-01", end: null, tiers: [{ from: 0, to: 100, hours: 6 }] },
    { position: "breakfast", kind: "tiered", basis: "prev", start: "2026-06-01", end: null, tiers: [{ from: 0, to: 100, hours: 7 }] }
  ];
  assert.equal(std.hoursFor(tiers, "breakfast", READ, { roomsSoldPrev: 50 }), 7);
  const minutes = [
    { position: "room_att", kind: "per_room", start: "2025-01-01", end: null, minutes: { suite: 35, checkout: 20 } },
    { position: "room_att", kind: "per_room", start: "2025-05-08", end: null, minutes: { checkout: 30 } }
  ];
  assert.deepEqual(std.roomMinutesFrom(minutes, READ), {
    checkout: 30, stayover: null, deep: null, suite: 35, breakMin: null
  });
});

test("saving a new fixed version leaves the variable standard in place", () => {
  const list = [
    { id: "fixed-old", hotel: "MSPWE", position: "hskp_houseman", kind: "fixed", hoursPerDay: 0, start: "2025-05-08", end: null },
    { id: "sold", hotel: "MSPWE", position: "hskp_houseman", kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: null, start: "2025-06-01", end: null }
  ];
  const rec = { id: "std-hskp_houseman-fixed-2026-03-01", hotel: "MSPWE", position: "hskp_houseman", kind: "fixed", hoursPerDay: 4, start: "2026-03-01", end: null };
  const next = std.applyVersion(list, rec);
  assert.equal(next.find((row) => row.kind === "fixed" && row.start === "2025-05-08").end, "2026-02-28");
  assert.equal(next.find((row) => row.kind === "per_sold").end, null);
  assert.equal(std.hoursFor(next, "hskp_houseman", READ, { roomsSoldPrev: 12 }), 4 + 12 * 5 / 60);
});

test("seeds have no rates, unique ids, and copy drops pay", () => {
  ["MSPAM", "MSPWE", "MSPMS"].forEach((hotel) => {
    const rows = std.seed(hotel);
    const ids = {};
    rows.forEach((row) => {
      assert.equal(ids[row.id], undefined);
      ids[row.id] = 1;
      PAY.forEach((key) => assert.equal(row[key], undefined));
      assert.equal(std.hasPay(row), false);
    });
  });
  const copied = std.copyRows([{ id: "a", position: "driver", start: "2026-01-01", kind: "fixed", hoursPerDay: 8, pay: 20, hourly: 15 }], "MSPAM");
  assert.equal(copied[0].pay, undefined);
  assert.equal(copied[0].hourly, undefined);
  assert.equal(copied[0].hotel, "MSPAM");
  assert.equal(copied[0].hoursPerDay, 8);
});

test("only corporate can edit and labor hours use the hotel's own position", () => {
  assert.equal(std.access("Above Property").edit, true);
  assert.equal(std.access("GM").edit, false);
  assert.equal(std.access("GM").view, true);
  assert.equal(std.access("AGM").view, true);
  assert.equal(std.access("Housekeeping").view, true);
  assert.equal(std.access("Front Desk").view, false);
  assert.equal(std.planPositionId("MSPAM", "Front Desk"), "fd_agent");
  assert.equal(std.planPositionId("MSPWE", "Front Desk"), "fd_clerk");
  assert.equal(std.planPositionId("MSPMS", "Front Desk"), "gsr");
  assert.equal(std.planPositionId("MSPAM", "House Person"), "houseperson");
  assert.equal(std.planPositionId("MSPWE", "House Person"), "hskp_houseman");
  assert.equal(std.planPositionId("MSPMS", "House Person"), "hskp_houseman");
  assert.equal(std.planPositionId("MSPAM", "HK Lead"), "exec_hk");
  assert.equal(std.planPositionId("MSPMS", "HK Lead"), "exec_hk");
  assert.equal(std.planPositionId("MSPWE", "HK Lead"), "hskp_sup");
  assert.equal(std.hoursFor(std.seed("MSPWE"), std.planPositionId("MSPWE", "HK Lead"), READ, { roomsSoldPrev: 40 }), 40 * 5 / 60);
});

test("the migration lets corporate write and does not delete standards or keep pay", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261109_labor_standards.sql"), "utf8");
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /private\.my_role\(\) in \('gm', 'agm', 'hk_lead'\)/);
  assert.match(sql, /raise exception 'not allowed'/);
  assert.match(sql, /row\.rec - 'pay' - 'wage' - 'rate' - 'hourly'/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
});
