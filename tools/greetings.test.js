const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const g = require("../greetings.js");

const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261031_greetings.sql"), "utf8");

function on(year, id) {
  return g.holidaysFor(year).filter((item) => item.id === id)[0];
}

test("easter and the floating US holidays land on the right days", () => {
  assert.equal(g.easter(2024), "2024-03-31");
  assert.equal(g.easter(2025), "2025-04-20");
  assert.equal(g.easter(2026), "2026-04-05");
  assert.equal(g.easter(2027), "2027-03-28");
  assert.equal(on(2026, "easter").start, "2026-04-05");
  assert.equal(on(2026, "mothers").start, "2026-05-10");
  assert.equal(on(2026, "memorial").start, "2026-05-25");
  assert.equal(on(2026, "fathers").start, "2026-06-21");
  assert.equal(on(2026, "labor").start, "2026-09-07");
  assert.equal(on(2026, "thanksgiving").start, "2026-11-26");
  assert.equal(on(2026, "july4").start, "2026-07-04");
  assert.equal(on(2026, "juneteenth").start, "2026-06-19");
  assert.equal(on(2026, "valentine").start, "2026-02-14");
  assert.equal(on(2026, "patrick").start, "2026-03-17");
  assert.equal(on(2026, "cinco").start, "2026-05-05");
  assert.equal(on(2026, "halloween").start, "2026-10-31");
  assert.equal(on(2026, "veterans").start, "2026-11-11");
  assert.equal(on(2026, "new-year").start, "2026-01-01");
  assert.equal(on(2026, "christmas-eve").start, "2026-12-24");
  assert.equal(on(2026, "christmas").start, "2026-12-25");
  assert.equal(on(2026, "new-years-eve").start, "2026-12-31");
});

test("housekeeping week is the second full week of September and muertos is two days", () => {
  assert.deepEqual(g.housekeepingWeek(2024), { start: "2024-09-08", end: "2024-09-14" });
  assert.deepEqual(g.housekeepingWeek(2025), { start: "2025-09-14", end: "2025-09-20" });
  assert.deepEqual(g.housekeepingWeek(2026), { start: "2026-09-13", end: "2026-09-19" });
  assert.equal(on(2026, "muertos").start, "2026-11-01");
  assert.equal(on(2026, "muertos").end, "2026-11-02");
  assert.equal(g.holidayBanners("2026-11-01", "Front Desk").some((b) => b.id === "muertos"), true);
  assert.equal(g.holidayBanners("2026-11-02", "Front Desk").some((b) => b.id === "muertos"), true);
  assert.equal(g.holidayBanners("2026-11-03", "Front Desk").some((b) => b.id === "muertos"), false);
  assert.equal(g.holidayBanners("2026-12-24", "GM").some((b) => b.id === "christmas"), false);
  assert.equal(g.holidayBanners("2026-12-25", "GM").some((b) => b.id === "christmas-eve"), false);
});

test("housekeeping hears a personal thank-you during their week", () => {
  const desk = g.holidayBanners("2026-09-15", "Front Desk").filter((b) => b.id === "housekeeping")[0];
  const hk = g.holidayBanners("2026-09-15", "Housekeeper").filter((b) => b.id === "housekeeping")[0];
  assert.match(desk.bodyEn, /housekeeping team/);
  assert.match(hk.bodyEn, /thank you for every room/);
  assert.match(hk.bodyEs, /gracias/);
  assert.equal(g.holidayBanners("2026-09-12", "Housekeeping").some((b) => b.id === "housekeeping"), false);
});

test("Chicago dates, leap-day birthdays, and anniversary years", () => {
  assert.equal(g.chicagoDate("2026-10-29T03:30:00.000Z"), "2026-10-28");
  assert.equal(g.chicagoDate("2026-10-29"), "2026-10-29");
  assert.equal(g.marksDay(2, 29, "2026-02-28"), true);
  assert.equal(g.marksDay(2, 29, "2024-02-29"), true);
  assert.equal(g.marksDay(2, 29, "2024-02-28"), false);
  assert.equal(g.anniversaryYears("2020-02-29", "2026-02-28"), 6);
  assert.equal(g.anniversaryYears("2026-10-29", "2026-10-29"), 0);
  assert.equal(g.anniversaryYears("2022-10-29", "2026-10-29"), 4);
  assert.equal(g.validBirthday(2, 29), true);
  assert.equal(g.validBirthday(2, 30), false);
  assert.equal(g.validBirthday(4, 31), false);
});

test("a birthday shows only to that person, and the GM line lists the hotel", () => {
  const today = "2026-10-29T16:00:00.000Z";
  const people = g.demoPeople(today);
  const fd = g.homeModel({ today, role: "Front Desk", hotel: "MSPWE", viewerId: "mspwe-fd", people, custom: [], gmView: false });
  assert.equal(fd.banners.some((b) => b.kind === "birthday"), true);
  assert.equal(fd.banners.some((b) => b.id === "anniversary-mspwe-hk"), false);
  assert.equal(fd.celebrations.length, 0);
  const hk = g.homeModel({ today, role: "Housekeeping", hotel: "MSPWE", viewerId: "mspwe-hk", people, custom: [], gmView: false });
  assert.equal(hk.banners.some((b) => b.kind === "birthday"), false);
  assert.equal(hk.banners.some((b) => b.kind === "anniversary"), true);
  const gm = g.homeModel({ today, role: "GM", hotel: "MSPWE", viewerId: "mspwe-gm", people, custom: [], gmView: true });
  assert.deepEqual(gm.celebrations.map((row) => row.name + ":" + row.kind), ["Grace Patel (EX):anniversary", "Jordan Lee (EX):birthday"]);
  const other = g.homeModel({ today, role: "GM", hotel: "MSPAM", viewerId: "mspam-gm", people, custom: [], gmView: true });
  assert.deepEqual(other.celebrations.map((row) => row.id), ["mspam-fd"]);
});

test("a custom greeting can repeat every year and stay on one hotel", () => {
  const row = { id: 4, hotel: "MSPAM", emoji: "🎈", color: "#14365d", messageEn: "Founders day", messageEs: "Día de los fundadores", start: "2024-05-02", end: "2024-05-02", annual: true, active: true };
  assert.equal(g.customOn(row, "2026-05-02"), true);
  assert.equal(g.customOn(row, "2026-05-03"), false);
  const home = g.homeModel({ today: "2026-05-02", role: "Front Desk", hotel: "MSPWE", viewerId: "x", people: [], custom: [row], gmView: false });
  assert.equal(home.banners.some((b) => b.id === "custom-4"), false);
  const there = g.homeModel({ today: "2026-05-02", role: "Front Desk", hotel: "MSPAM", viewerId: "x", people: [], custom: [row], gmView: false });
  assert.equal(there.banners.some((b) => b.id === "custom-4"), true);
  const wrap = { id: 5, hotel: "", start: "2020-12-31", end: "2020-01-01", annual: true, active: true, messageEn: "Wrap", messageEs: "Cruce" };
  assert.equal(g.customOn(wrap, "2026-12-31"), true);
  assert.equal(g.customOn(wrap, "2026-01-01"), true);
  assert.equal(g.customOn(wrap, "2026-06-01"), false);
});

test("the migration is additive, private, and does not store a birth year", () => {
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function private\.greet_is_corporate\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.save_custom_greeting\(bigint, text, text, text, text, text, date, date, boolean, boolean\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /birth_year/i);
  const bodies = sql.split(/create or replace function/i).slice(1);
  assert.ok(bodies.length >= 5);
  bodies.forEach((body) => assert.match(body, /set search_path = ''/));
});
