const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const pk = require("../parking.js");

const NOW = "2026-10-28T18:00:00.000Z";
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261030_parking.sql"), "utf8");
const fd = { role: "Front Desk", hotel: "MSPWE" };
const driver = { role: "Shuttle Driver", hotel: "MSPAM" };
const gm = { role: "GM", hotel: "MSPAM" };
const agm = { role: "AGM", hotel: "MSPWE" };
const corp = { role: "JR Corporate", hotel: null };
const hk = { role: "Housekeeper", hotel: "MSPWE" };

function demo() { return pk.buildDemo(NOW); }
function stallNo(state, id) {
  const s = state.stalls.find((x) => x.id === id);
  return s ? s.stallNo : "";
}

test("chicago clock and park-and-fly defaults", () => {
  assert.equal(pk.chicagoDate(NOW), "2026-10-28");
  assert.equal(Date.parse(pk.fromChicagoLocal("2026-10-28T13:00")), Date.parse(NOW));
  assert.equal(Date.parse(pk.fromChicagoLocal("2026-01-15T12:00")), Date.parse("2026-01-15T18:00:00.000Z"));
  assert.equal(pk.fromChicagoLocal(""), "");
  assert.equal(pk.defaultSettings("MSPWE").parkFlyEnabled, false);
  assert.equal(pk.defaultSettings("MSPAM").parkFlyEnabled, true);
  assert.equal(pk.defaultSettings("MSPMS").parkFlyEnabled, true);
  assert.equal(pk.defaultSettings("MSPAM").maxHoursWithoutRoom, 72);
  assert.equal(pk.defaultSettings("MSPAM").longTermNights, 7);
  assert.equal(pk.defaultSettings("MSPAM").parkFlyGraceHours, 2);
  assert.equal(pk.defaultSettings("MSPWE").parkingEnabled, false);
  assert.equal(pk.defaultSettings("MSPAM").parkingEnabled, true);
  assert.equal(pk.parkingOn(demo(), "MSPWE"), false);
  assert.equal(pk.parkingOn(demo(), "MSPAM"), true);
});

test("roles and hotels", () => {
  ["Front Desk", "GM", "AGM", "Above Property", "JR Corporate"].forEach((role) => {
    assert.equal(pk.canSee(role), true, role);
    assert.equal(pk.canLog(role), true, role);
  });
  ["Shuttle Driver", "Housekeeper", "Housekeeping", "Laundry Attendant", "House Person", "Maintenance", "Breakfast Attendant"].forEach((role) => {
    assert.equal(pk.canSee(role), false, role);
    assert.equal(pk.canLog(role), false, role);
    assert.equal(pk.showParkingTile(role, true), false, role);
  });
  assert.equal(pk.showParkingTile("Front Desk", true), true);
  assert.equal(pk.showParkingTile("Front Desk", false), false);
  assert.equal(pk.showParkingTile("GM", true), true);
  assert.equal(pk.canSetup("GM"), true);
  assert.equal(pk.canSetup("AGM"), true);
  assert.equal(pk.canSetup("JR Corporate"), true);
  assert.equal(pk.canSetup("Front Desk"), false);
  assert.equal(pk.canSetup("Shuttle Driver"), false);
  assert.deepEqual(pk.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(pk.hotelsFor("GM", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(pk.hotelsFor("Shuttle Driver", "MSPMS"), []);
  assert.deepEqual(pk.hotelsFor("Housekeeper", "MSPWE"), []);
});

test("closest stall, long-term area, and park and fly area", () => {
  const state = demo();
  assert.equal(stallNo(state, pk.suggestStall(state, { hotel: "MSPWE", room: "102", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 2, 11, 0) }).stallId), "A1");
  assert.equal(pk.suggestStall(state, { hotel: "MSPWE", room: "102", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 2, 11, 0) }).reason, "closest");
  assert.equal(stallNo(state, pk.suggestStall(state, { hotel: "MSPWE", room: "106", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).stallId), "A1");
  assert.equal(stallNo(state, pk.suggestStall(state, { hotel: "MSPWE", room: "208", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).stallId), "B1");
  assert.equal(pk.suggestStall(state, { hotel: "MSPWE", room: "306", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).stallId, "");

  const week = { hotel: "MSPWE", room: "102", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 7, 12, 0) };
  const over = { hotel: "MSPWE", room: "102", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 8, 12, 0) };
  assert.equal(pk.stayNights(week.checkedIn, week.expectedOut), 7);
  assert.equal(pk.stayNights(over.checkedIn, over.expectedOut), 8);
  assert.equal(pk.wantsLongTerm(week, state.settings.MSPWE), false);
  assert.equal(pk.wantsLongTerm(over, state.settings.MSPWE), true);
  assert.equal(stallNo(state, pk.suggestStall(state, week).stallId), "A1");
  assert.equal(stallNo(state, pk.suggestStall(state, over).stallId), "L2");
  assert.equal(pk.suggestStall(state, { hotel: "MSPWE", room: "102", vehicleType: "guest", longTerm: true, checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).reason, "long_term");

  assert.equal(stallNo(state, pk.suggestStall(state, { hotel: "MSPAM", room: "110", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).stallId), "A1");
  assert.equal(pk.suggestStall(state, { hotel: "MSPAM", room: "450", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).reason, "unmapped");
  const fly = pk.suggestStall(state, { hotel: "MSPAM", room: "201", vehicleType: "park_fly", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) });
  assert.equal(fly.reason, "park_fly");
  assert.equal(stallNo(state, fly.stallId), "P5");
  assert.equal(pk.suggestStall(state, { hotel: "MSPWE", vehicleType: "park_fly", checkedIn: NOW }).reason, "off");
});

test("overstay rules skip park and fly until pickup plus grace", () => {
  const state = demo();
  const byPlate = (hotel, plate) => state.visits.find((v) => v.hotel === hotel && v.plate === plate);
  const flag = (v) => pk.isOverstay(v, state.settings[v.hotel], NOW);
  assert.equal(flag(byPlate("MSPWE", "EXA1101")).reason, "checkout");
  assert.equal(flag(byPlate("MSPWE", "EXA1102")).reason, "hours");
  assert.equal(flag(byPlate("MSPWE", "EXA1103")).over, false);
  assert.equal(flag(byPlate("MSPWE", "EXA1104")).over, false);
  assert.equal(flag(byPlate("MSPWE", "EXA1105")).over, false);
  assert.equal(byPlate("MSPWE", "EXA1105").unknown, true);
  assert.equal(flag(byPlate("MSPAM", "EXA2103")).over, false);
  assert.equal(flag(byPlate("MSPAM", "EXA2104")).over, false);
  assert.equal(flag(byPlate("MSPAM", "EXA2106")).reason, "pickup");

  const bare = { hotel: "MSPWE", vehicleType: "guest", room: "", checkedIn: pk.shift(NOW, -72), expectedOut: "", checkedOut: "" };
  assert.equal(pk.isOverstay(bare, state.settings.MSPWE, NOW).over, false);
  bare.checkedIn = pk.shift(NOW, -72 - 1 / 60);
  assert.equal(pk.isOverstay(bare, state.settings.MSPWE, NOW).reason, "hours");
  bare.room = "101";
  bare.checkedIn = pk.shift(NOW, -80);
  bare.expectedOut = pk.shift(NOW, 5);
  assert.equal(pk.isOverstay(bare, state.settings.MSPWE, NOW).over, false);

  const fly = { hotel: "MSPAM", vehicleType: "park_fly", room: "", checkedIn: pk.shift(NOW, -100), expectedOut: pk.shift(NOW, -5), pfPickup: pk.shift(NOW, 2), checkedOut: "" };
  assert.equal(pk.isOverstay(fly, state.settings.MSPAM, NOW).over, false);
  fly.pfPickup = pk.shift(NOW, -2);
  assert.equal(pk.isOverstay(fly, state.settings.MSPAM, NOW).over, false);
  fly.pfPickup = pk.shift(NOW, -2 - 1 / 60);
  assert.equal(pk.isOverstay(fly, state.settings.MSPAM, NOW).reason, "pickup");
});

test("live list, stats, search, and history", () => {
  const state = demo();
  assert.deepEqual(pk.liveList(state, "MSPWE", NOW).map((v) => v.plate), ["EXA1102", "EXA1104", "EXA1101", "EXA1103", "EXA1105"]);
  const we = pk.stats(state, "MSPWE", NOW);
  assert.equal(we.cars, 5);
  assert.equal(we.overstays, 2);
  assert.equal(we.parkFly, 0);
  assert.equal(pk.formatDuration(we.avgMs, "en"), "1d 12h");
  const am = pk.stats(state, "MSPAM", NOW);
  assert.equal(am.cars, 6);
  assert.equal(am.parkFly, 4);
  assert.equal(am.overstays, 1);
  assert.equal(am.returningToday, 1);
  assert.equal(am.returningTomorrow, 1);
  assert.equal(pk.formatDuration(am.avgMs, "en"), "20h 0m");
  const ms = pk.stats(state, "MSPMS", NOW);
  assert.equal(ms.cars, 3);
  assert.equal(ms.returningToday, 0);
  assert.equal(ms.returningTomorrow, 1);
  assert.equal(ms.overstays, 1);
  const back = pk.returning(state, "MSPAM", NOW);
  assert.deepEqual(back.today.map((v) => v.plate), ["EXA2104"]);
  assert.deepEqual(back.tomorrow.map((v) => v.plate), ["EXA2105"]);
  assert.equal(pk.pageModel(state, gm, NOW, "MSPAM", { q: "2104" }).live.length, 1);
  assert.equal(pk.pageModel(state, gm, NOW, "MSPAM", { q: "2108" }).history[0].plate, "EXA2108");

  const hidden = pk.homeSummary(state, corp, NOW, "es");
  assert.equal(hidden.length, 2);
  assert.equal(hidden.some((row) => row.hotel === "MSPWE"), false);
  const shown = demo();
  shown.settings.MSPWE.parkingEnabled = true;
  const summary = pk.homeSummary(shown, corp, NOW, "es");
  assert.equal(summary.length, 3);
  assert.equal(summary[0].parkFly, "Apagado");
  assert.equal(summary[1].parkFly, "4");
  assert.equal(pk.homeSummary(state, hk, NOW, "en").length, 0);
});

test("log, override, mark out, and setup", () => {
  const state = demo();
  const logged = pk.logVisit(state, { hotel: "MSPWE", plate: "exa-1999", state: "mn", room: "102", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 2, 11, 0), make: "Sample", paid: false }, fd, NOW);
  assert.equal(logged.ok, true);
  assert.equal(logged.visit.plate, "EXA1999");
  assert.equal(logged.visit.state, "MN");
  assert.equal(stallNo(logged.state, logged.visit.stallId), "A1");
  assert.equal(pk.durationMs(logged.visit, NOW), 0);
  const again = pk.logVisit(logged.state, { hotel: "MSPWE", plate: "EXA1999", state: "MN", room: "104", checkedIn: NOW }, fd, NOW);
  assert.equal(again.error, "already");
  const taken = pk.logVisit(state, { hotel: "MSPWE", plate: "EXA1888", state: "MN", stallId: "we-a3", room: "106", checkedIn: NOW }, fd, NOW);
  assert.equal(taken.error, "stall_occupied");
  const override = pk.logVisit(state, { hotel: "MSPWE", plate: "EXA1888", state: "MN", stallId: "we-b1", room: "102", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }, fd, NOW);
  assert.equal(override.ok, true);
  assert.equal(stallNo(override.state, override.visit.stallId), "B1");
  assert.equal(override.visit.longTerm, false);
  const fly = pk.logVisit(state, {
    hotel: "MSPAM", plate: "EXA2999", state: "WI", vehicleType: "park_fly", room: "201",
    pfConfirm: "sample-9", pfDays: 4, pfDropoff: "2026-10-28", pfPickup: pk.atLocal(NOW, 3, 15, 0), pfFlight: "SAMPLE 300"
  }, { role: "Front Desk", hotel: "MSPAM" }, NOW);
  assert.equal(pk.logVisit(state, {
    hotel: "MSPAM", plate: "EXA2998", state: "WI", vehicleType: "park_fly",
    pfConfirm: "SAMPLE8", pfDays: 2, pfDropoff: "2026-10-28", pfPickup: pk.atLocal(NOW, 2, 9, 0)
  }, driver, NOW).error, "role");
  assert.equal(fly.ok, true);
  assert.equal(stallNo(fly.state, fly.visit.stallId), "P5");
  assert.equal(fly.visit.pfConfirm, "SAMPLE-9");
  assert.equal(pk.logVisit(state, { hotel: "MSPWE", plate: "EXA2777", state: "MN", vehicleType: "park_fly", pfConfirm: "SAMPLE8", pfDays: 2, pfDropoff: "2026-10-28", pfPickup: pk.atLocal(NOW, 2, 9, 0) }, fd, NOW).error, "park_fly_off");
  assert.equal(pk.logVisit(state, { hotel: "MSPAM", plate: "EXA1111", state: "MN", room: "101", checkedIn: NOW }, fd, NOW).error, "hotel");
  assert.equal(pk.logVisit(state, { hotel: "MSPWE", plate: "EXA1111", state: "MN", checkedIn: NOW }, hk, NOW).error, "role");
  const found = pk.logVisit(state, { hotel: "MSPWE", plate: "EXA1555", state: "MN", unknown: true, color: "Silver", checkedIn: NOW }, fd, NOW);
  assert.equal(found.error, "stall_required");
  const walked = pk.logVisit(state, { hotel: "MSPWE", plate: "EXA1555", state: "MN", unknown: true, stallId: "we-a2", checkedIn: NOW }, fd, NOW);
  assert.equal(walked.visit.unknown, true);
  const left = pk.markOut(walked.state, walked.visit.id, pk.shift(NOW, 3), fd);
  assert.equal(left.ok, true);
  assert.equal(left.visit.checkedOut, pk.shift(NOW, 3));
  assert.equal(pk.durationMs(left.visit, pk.shift(NOW, 10)), 3 * 3600000);
  assert.equal(pk.markOut(state, "we-v1", pk.shift(NOW, -40), fd).error, "time");
  assert.equal(pk.saveZone(state, { hotel: "MSPWE", name: "Lot C", purpose: "standard" }, fd).error, "role");
  const zone = pk.saveZone(state, { hotel: "MSPWE", name: "Lot C", purpose: "standard" }, agm);
  assert.equal(zone.ok, true);
  const stall = pk.saveStall(zone.state, { hotel: "MSPWE", zoneId: zone.id, stallNo: "c1", notes: "EV" }, agm);
  assert.equal(stall.ok, true);
  const range = pk.saveRange(stall.state, { stallId: stall.id, roomLo: 305, roomHi: 308, floor: "3", wing: "South", rank: 1 }, agm);
  assert.equal(range.ok, true);
  assert.equal(stallNo(range.state, pk.suggestStall(range.state, { hotel: "MSPWE", room: "306", vehicleType: "guest", checkedIn: NOW, expectedOut: pk.atLocal(NOW, 1, 11, 0) }).stallId), "C1");
  const tight = pk.saveSettings(state, { hotel: "MSPWE", maxHoursWithoutRoom: 1, longTermNights: 7, parkFlyEnabled: false, parkFlyGraceHours: 2 }, agm);
  assert.equal(tight.ok, true);
  const edge = Object.assign({}, state.visits.find((v) => v.plate === "EXA1105"), { checkedIn: pk.shift(NOW, -2) });
  assert.equal(pk.isOverstay(edge, tight.state.settings.MSPWE, NOW).reason, "hours");
  assert.equal(pk.isOverstay(state.visits.find((v) => v.plate === "EXA1105"), tight.state.settings.MSPWE, NOW).over, false);
  assert.equal(pk.saveSettings(state, { hotel: "MSPWE", maxHoursWithoutRoom: 1, longTermNights: 7, parkFlyEnabled: false, parkFlyGraceHours: 2 }, { role: "GM", hotel: "MSPAM" }).error, "hotel");
});

test("one value per cell, both languages, and sample labeling", () => {
  const state = demo();
  const visit = state.visits.find((v) => v.plate === "EXA1101");
  const cells = pk.cellsFor(visit, state, NOW, "en");
  assert.equal(cells.plate, "EXA1101");
  assert.equal(cells.state, "MN");
  assert.equal(cells.stall, "A3");
  assert.equal(cells.make, "Sample");
  assert.equal(cells.color, "Blue");
  Object.keys(cells).forEach((key) => {
    assert.equal(String(cells[key]).includes(" · "), false, key);
    if (key !== "plate") assert.equal(String(cells[key]).includes(visit.plate), false, key);
  });
  assert.equal(cells.plate.includes(cells.state), false);

  const en = pk.renderParking(state, { actor: gm, now: NOW, hotel: "MSPAM", lang: "en", ui: { screen: "board", q: "" } });
  const es = pk.renderParking(state, { actor: gm, now: NOW, hotel: "MSPAM", lang: "es", ui: { screen: "board", q: "" } });
  assert.match(en, /id="pkRoot"/);
  assert.match(en, /class="raw pk"/);
  assert.match(en, /EXAMPLE/);
  assert.match(en, /Sample vehicles for this demo/);
  assert.match(en, /id="pkHero"/);
  assert.match(en, /id="pkCars">6</);
  assert.match(en, /Cars parked tonight/);
  assert.match(en, /1 Overnight guests \/ 4 Park &amp; Fly \/ 1 Long-term/);
  assert.match(en, /id="pkOpenStalls"/);
  assert.match(en, /id="pkTomorrow"/);
  assert.match(en, /id="pkCal"/);
  assert.match(en, /<details class="pk-fold" id="pkMapFold">/);
  assert.match(en, /<details class="pk-fold" id="pkListFold">/);
  assert.equal(en.includes("<details class=\"pk-fold\" id=\"pkMapFold\" open>"), false);
  assert.match(en, /id="pkSuggest"|pkBoard/);
  assert.match(es, /EJEMPLO/);
  assert.match(es, /Vehículos de ejemplo/);
  assert.match(es, /Autos estacionados esta noche/);
  assert.match(es, /Calendario de estaciona y vuela/);
  assert.match(es, /Estaciona y vuela/);
  ["Cars parked tonight", "Overnight guests", "Open stalls", "Tomorrow night", "Park & Fly calendar", "Log a vehicle", "Lot walk", "Sample vehicles for this demo. Not real plates or guests.", "Arriving", "Leaving"].forEach((enText) => {
    assert.equal(es.includes(enText), false, enText);
  });
  const cellsHtml = [...en.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
  assert.ok(cellsHtml.length > 5);
  cellsHtml.forEach((text) => assert.equal(text.includes(" · "), false, text));
  const weOff = pk.renderParking(state, { actor: { role: "GM", hotel: "MSPWE" }, now: NOW, hotel: "MSPWE", lang: "en", ui: { screen: "board" } });
  assert.match(weOff, /id="pkOff"/);
  assert.equal(weOff.includes("id=\"pkBoard\""), false);
  const weState = demo();
  weState.settings.MSPWE.parkingEnabled = true;
  const we = pk.renderParking(weState, { actor: { role: "GM", hotel: "MSPWE" }, now: NOW, hotel: "MSPWE", lang: "en", ui: { screen: "board" } });
  assert.equal(we.includes("id=\"pkCal\""), false);
  assert.match(we, /id="pkHero"/);
  assert.equal(we.includes("Returning today"), false);
  const denied = pk.renderParking(state, { actor: hk, now: NOW, hotel: "MSPAM", lang: "en", ui: { screen: "board" } });
  assert.match(denied, /id="pkDenied"/);
  assert.equal(denied.includes("EXA2106"), false);
  assert.equal(denied.includes("id=\"pkCars\""), false);
  assert.equal(pk.renderParking(state, { actor: driver, now: NOW, hotel: "MSPAM", lang: "en", ui: { screen: "board" } }).includes("id=\"pkHero\""), false);
  const logState = demo();
  logState.settings.MSPWE.parkingEnabled = true;
  const log = pk.renderParking(logState, { actor: fd, now: NOW, hotel: "MSPWE", lang: "es", ui: { screen: "log", draft: { room: "102", vehicleType: "guest", state: "MN" } } });
  assert.match(log, /id="pkSaveBtn"/);
  assert.equal(log.includes("id=\"pkSave\""), false);
  assert.match(log, /onsubmit="window.pkSave\(event\)"/);
  assert.match(log, /id="pkSuggest"/);
  assert.match(log, />A1</);
  assert.match(log, /Cajón libre más cercano/);
  const home = pk.homeCardHtml(state, corp, NOW, "en");
  assert.match(home, /id="pkHome"/);
  assert.match(home, /EXAMPLE/);
  assert.equal(home.includes(">MSPWE<"), false);
  assert.match(home, /MSPAM/);
  assert.match(home, /MSPMS/);

  const sameOk = { No: 1, Hotel: 1, Color: 1 };
  Object.keys(pk.PHRASES).forEach((enText) => {
    const esText = pk.PHRASES[enText];
    assert.ok(esText, enText);
    if (!sameOk[enText]) assert.notEqual(esText, enText, enText);
  });
  const blob = JSON.stringify(state) + en + es;
  assert.equal(blob.includes("@"), false);
  assert.equal(/\$\d/.test(blob), false);
  assert.equal(/Bhakta|Uselman|Relikor|Jordan Lee|Riley Brooks/i.test(blob), false);
  state.visits.forEach((v) => {
    assert.match(v.plate, /^(EXA|SAMPLE)/);
    assert.equal(v.guestName, undefined);
  });
});

test("migration locks parking down and stores no sample plates", () => {
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /security invoker/);
  assert.match(sql, /security_invoker = true/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.equal(/hotel = any \(select private\.my_hotels\(\)\)/.test(sql), false);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /revoke all on function public\.parking_log_visit\(text, text, text, text, text, text, bigint, text, timestamptz, timestamptz, text, boolean, text, boolean, boolean, text, text, integer, date, timestamptz, text, text, text\) from public, anon/);
  assert.match(sql, /park_fly_enabled boolean not null/);
  assert.match(sql, /\('MSPWE', 72, 7, false, 2\)/);
  assert.match(sql, /\('MSPAM', 72, 7, true, 2\)/);
  assert.match(sql, /\('MSPMS', 72, 7, true, 2\)/);
  assert.match(sql, /Do not store guest names/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.equal(/anon execute/i.test(sql), false);
  assert.equal(/EXA\d/.test(sql), false);
  assert.match(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), /parking\.js/);
  const js = fs.readFileSync(path.join(__dirname, "../parking.js"), "utf8");
  assert.doesNotMatch(js, /Uselman|Bhakta|Relikor|5820|service_role|sb_secret/i);
  const row = pk.mapVisit({
    id: 9, hotel: "MSPAM", plate: "EXA1000", plate_state: "MN", stall_id: 4, room: "201",
    checked_in_at: NOW, expected_out_at: null, checked_out_at: null, paid: false, long_term: false,
    unknown: false, vehicle_type: "park_fly", pf_confirm: "SAMPLE1", pf_days: 4, pf_dropoff: "2026-10-28",
    pf_pickup_at: NOW, pf_flight: "SAMPLE 100", pf_extra_note: null, make: null, model: null, color: null, permit: null, rate_note: null, note: null
  });
  assert.equal(row.stallId, "4");
  assert.equal(row.vehicleType, "park_fly");
  assert.equal(row.pfConfirm, "SAMPLE1");
  assert.equal(row.expectedOut, "");
});

test("park and fly calendar, hero, and role alerts", () => {
  const state = demo();
  const model = pk.pageModel(state, gm, NOW, "MSPAM", { screen: "board" });
  assert.equal(model.tonight.cars, 6);
  assert.equal(model.tonight.guests, 1);
  assert.equal(model.tonight.parkFly, 4);
  assert.equal(model.tonight.longTerm, 1);
  assert.equal(model.tonight.openStalls, 3);
  assert.equal(model.tomorrowCount, 4);
  assert.equal(model.calendar.days.find((d) => d.date === "2026-10-29").dropoffs, 1);
  assert.equal(model.calendar.days.find((d) => d.date === "2026-10-29").parked, 2);
  assert.equal(pk.calendarOn(state, "MSPWE"), false);
  assert.equal(pk.calendarOn(state, "MSPAM"), true);
  const day = pk.renderParking(state, { actor: gm, now: NOW, hotel: "MSPAM", lang: "es", ui: { screen: "board", month: "2026-10", day: "2026-10-29" } });
  assert.match(day, /id="pkDay"/);
  assert.match(day, /SAMPLE9/);
  assert.match(day, /Octubre 2026/);
  const saved = pk.saveBooking(state, {
    hotel: "MSPAM", lastName: "Sample", confirm: "SAMPLE12", dropoff: "2026-10-28", pickup: "2026-10-31", plate: "EXA2888", state: "WI"
  }, { role: "Front Desk", hotel: "MSPAM" }, NOW);
  assert.equal(saved.ok, true);
  assert.ok(saved.booking.visitId);
  assert.equal(saved.state.visits.some((v) => v.plate === "EXA2888" && !v.checkedOut), true);
  const future = pk.saveBooking(state, {
    hotel: "MSPAM", lastName: "Sample", confirm: "SAMPLE13", dropoff: "2026-11-02", pickup: "2026-11-06"
  }, gm, NOW);
  assert.equal(future.ok, true);
  assert.equal(future.booking.visitId, "");
  assert.equal(future.booking.plate, "");
  const arrived = pk.arriveBooking(future.state, future.booking.id, { plate: "EXA2771", state: "MN" }, gm, NOW);
  assert.equal(arrived.booking.plate, "EXA2771");
  assert.equal(arrived.booking.visitId, "");
  const later = pk.settleBookings(arrived.state, "2026-11-02T18:00:00.000Z");
  assert.equal(later.changed, true);
  assert.ok(later.state.bookings.find((b) => b.confirm === "SAMPLE13").visitId);
  assert.equal(pk.saveBooking(state, {
    hotel: "MSPWE", lastName: "Sample", confirm: "SAMPLE14", dropoff: "2026-11-02", pickup: "2026-11-04"
  }, { role: "GM", hotel: "MSPWE" }, NOW).error, "park_fly_off");
  assert.equal(pk.saveBooking(state, {
    hotel: "MSPAM", lastName: "Sample", confirm: "SAMPLE15", dropoff: "2026-11-02", pickup: "2026-11-04"
  }, hk, NOW).error, "role");
  const alerts = pk.parkingAlertRows(state, gm, NOW, "en");
  assert.equal(alerts.some((a) => a.kind === "parking" && a.hotel === "MSPAM"), true);
  assert.equal(pk.parkingAlertRows(state, hk, NOW, "en").length, 0);
  assert.equal(pk.parkingAlertRows(state, driver, NOW, "en").length, 0);
  assert.equal(pk.isParkingAlert({ kind: "parking", title: "Room" }), true);
  assert.equal(pk.isParkingAlert({ title: "Park & Fly overdue", body: "Still here" }), true);
  assert.equal(pk.isParkingAlert({ title: "Room 214 do not disturb" }), false);
  assert.equal(pk.homeSummary(state, driver, NOW, "en").length, 0);
  const roleSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261101_parking_roles_and_bookings.sql"), "utf8");
  assert.match(roleSql, /private\.my_role\(\) in \('front_desk', 'gm', 'agm', 'above_property'\)/);
  assert.doesNotMatch(roleSql, /shuttle_driver/);
  assert.match(roleSql, /create table if not exists public\.parking_bookings/);
  assert.match(roleSql, /hotel in \('MSPAM', 'MSPMS'\)/);
  assert.match(roleSql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(roleSql, /set search_path = ''/);
  assert.match(roleSql, /security invoker/);
  assert.doesNotMatch(roleSql, /drop table/i);
  assert.doesNotMatch(roleSql, /delete from/i);
  assert.equal(/anon execute/i.test(roleSql), false);
  const bodies = roleSql.split(/create or replace function/i).slice(1);
  bodies.forEach((body) => assert.match(body, /set search_path = ''/));
});
