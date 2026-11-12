const test = require("node:test");
const assert = require("node:assert/strict");
const today = require("../today.js");

test("today sorts by urgency and keeps the top 5", () => {
  const items = today.buildItems({
    role: "Front Desk",
    me: "Kim",
    punches: [{ name: "Kim", issue: "in" }],
    rush: [{ room: 214, late: false }, { room: 101, late: true }],
    issues: [{ room: "305", days: 0 }],
    deep: 2,
    lost: 1,
    alerts: [{ en: "PTAC", es: "PTAC" }],
    cleans: { date: "2026-10-28" },
    events: ["Fundraiser"],
    sla: 1
  });
  assert.equal(items[0].en.indexOf("Clock in") === 0, true);
  assert.ok(items[1].en.indexOf("101") >= 0);
  assert.equal(today.take(items, false).length, 5);
  assert.equal(today.take(items, true).length, items.length);
  assert.ok(items.every(function (it, i) { return i === 0 || items[i - 1].rank <= it.rank; }));
});

test("a resolved guest issue that still needs a follow-up shows on Today", () => {
  const desk = today.buildItems({
    role: "Front Desk",
    loops: [{ room: "305", dept: "Breakfast" }],
    issues: [{ room: "214", days: 1 }]
  });
  assert.equal(desk[0].en, "Close the loop with room 305");
  assert.equal(desk[0].go, "gi");
  assert.equal(desk[1].en, "Guest issue room 214 departs tomorrow");
  const maintenance = today.buildItems({
    role: "Maintenance",
    loops: [{ room: "305", dept: "Breakfast" }, { room: "108", dept: "Maintenance" }]
  });
  assert.deepEqual(maintenance.map(function (it) { return it.en; }), ["Close the loop with room 108"]);
  const breakfast = today.buildItems({
    role: "Breakfast Attendant",
    loops: [{ room: "305", dept: "Breakfast" }]
  });
  assert.equal(breakfast[0].es, "Cierra el ciclo con la hab. 305");
  assert.equal(today.buildItems({ role: "Front Desk", loops: [{ room: "", dept: "Breakfast" }] }).length, 0);
});

test("a housekeeper does not see the front-desk lost-and-found pile", () => {
  const items = today.buildItems({
    role: "Housekeeper",
    me: "Maria",
    lost: 4,
    rush: [{ room: 118, hk: "Maria", late: true }, { room: 220, hk: "Rosa", late: true }],
    events: ["Ballroom"]
  });
  assert.equal(items.some(function (it) { return it.go === "lf"; }), false);
  assert.equal(items.some(function (it) { return it.go === "brief"; }), false);
  assert.equal(items.filter(function (it) { return it.go === "rushq"; }).length, 1);
});
