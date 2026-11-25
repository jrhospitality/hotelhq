const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const hf = require("../hotel-features.js");
const pk = require("../parking.js");

const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261031_hotel_features.sql"), "utf8");

test("parking starts off at Golden Valley and other modules stay on", () => {
  assert.equal(hf.defaultOn("MSPWE", "parking"), false);
  assert.equal(hf.defaultOn("MSPAM", "parking"), true);
  assert.equal(hf.defaultOn("MSPMS", "parking"), true);
  ["sales_leads", "greetings", "guest_scores"].forEach((feature) => {
    hf.HOTELS.forEach((hotel) => assert.equal(hf.defaultOn(hotel, feature), true, hotel + " " + feature));
  });
  assert.equal(hf.defaultOn("MSPWE", "unknown"), true);
  assert.deepEqual(hf.list().map((row) => row.id), []);
  hf.register({ id: "guest_scores", en: "Guest scores", es: "Calificaciones de huéspedes", order: 20 });
  hf.register({ id: "parking", en: "Parking", es: "Estacionamiento", order: 10 });
  hf.register({ id: "parking", en: "Parking", es: "Estacionamiento", order: 10 });
  assert.deepEqual(hf.list().map((row) => row.id), ["parking", "guest_scores"]);
  const html = hf.sectionHtml("en");
  assert.match(html, /Hotel Features/);
  assert.match(html, /Parking/);
  assert.match(html, /Guest scores/);
  assert.equal(html.includes("Sales leads"), false);
  assert.equal(html.includes("Greetings"), false);
  assert.match(html, /aria-label="Parking, MSPWE" onchange/);
  assert.match(html, /aria-label="Parking, MSPAM" checked/);
  assert.equal(pk.defaultSettings("MSPWE").parkingEnabled, false);
  assert.equal(pk.parkingOn(pk.buildDemo("2026-10-28T18:00:00.000Z"), "MSPWE"), false);
  assert.equal(pk.parkingOn(pk.buildDemo("2026-10-28T18:00:00.000Z"), "MSPMS"), true);
});

test("a turned-off hotel drops out of the parking home card and page", () => {
  const now = "2026-10-28T18:00:00.000Z";
  const state = pk.buildDemo(now);
  const corp = { role: "JR Corporate", hotel: null };
  const home = pk.homeCardHtml(state, corp, now, "en");
  assert.equal(home.includes(">MSPWE<"), false);
  assert.match(home, />MSPAM</);
  const off = pk.renderParking(state, { actor: { role: "Front Desk", hotel: "MSPWE" }, now, hotel: "MSPWE", lang: "en", ui: { screen: "board" } });
  assert.match(off, /id="pkOff"/);
  assert.equal(off.includes("id=\"pkLogBtn\""), false);
  const saved = pk.saveSettings(state, { hotel: "MSPWE", maxHoursWithoutRoom: 48, longTermNights: 7, parkFlyEnabled: false, parkFlyGraceHours: 2 }, { role: "GM", hotel: "MSPWE" });
  assert.equal(saved.state.settings.MSPWE.parkingEnabled, false);
});

test("the features migration adds the column, turns MSPWE off, and stays private", () => {
  assert.match(sql, /add column if not exists parking_enabled boolean not null default true/);
  assert.match(sql, /set parking_enabled = false\s+where hotel = 'MSPWE'/);
  assert.match(sql, /create table if not exists public\.hotel_features/);
  assert.match(sql, /'parking', 'sales_leads', 'greetings', 'guest_scores'/);
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /revoke all on function public\.set_hotel_feature\(text, text, boolean\) from public, anon/);
  assert.match(sql, /grant execute on function public\.set_hotel_feature\(text, text, boolean\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  const bodies = sql.split(/create or replace function/i).slice(1);
  assert.ok(bodies.length >= 4);
  bodies.forEach((body) => assert.match(body, /set search_path = ''/));
});
