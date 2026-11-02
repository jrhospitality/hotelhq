const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const more = require("../more-menu.js");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const HOUSEKEEPER = ["sched", "myrooms", "check", "ckhub", "onb", "pts", "photos", "about", "fun", "goals", "avatar", "settings", "floors"];
const FRONT_DESK = ["greq", "gi", "notes", "rooms", "rushq", "parking", "recs", "lf", "comp", "shut", "meetings", "slead", "wo", "settings"];

test("tiles stay inside the ids this role can already open", () => {
  const hk = more.groupsFor(HOUSEKEEPER);
  const flat = hk.flatMap((group) => group.items);
  assert.deepEqual(flat.slice().sort(), HOUSEKEEPER.filter((id) => id !== "home").slice().sort());
  assert.equal(flat.includes("parking"), false);
  assert.equal(flat.includes("meetings"), false);
  assert.equal(flat.includes("slead"), false);
  assert.equal(flat.includes("labor"), false);
  assert.equal(flat.includes("shut"), false);
  assert.equal(flat.includes("home"), false);
  const desk = more.groupsFor(FRONT_DESK.concat(["home", "parking"]));
  const deskIds = desk.flatMap((group) => group.items);
  assert.equal(deskIds.filter((id) => id === "parking").length, 1);
  assert.equal(deskIds.includes("labor"), false);
  assert.equal(deskIds.includes("sleads"), false);
  assert.equal(deskIds.includes("home"), false);
});

test("groups use the area names and an allowed unknown screen is not dropped", () => {
  assert.deepEqual(more.GROUPS.map((group) => group.en), [
    "Front Desk", "Housekeeping", "Maintenance", "Sales & Events", "Team", "Admin & Reports"
  ]);
  assert.deepEqual(more.GROUPS.map((group) => group.es), [
    "Recepción", "Ama de llaves", "Mantenimiento", "Ventas y eventos", "Equipo", "Administración y reportes"
  ]);
  const grouped = more.groupsFor(["rooms", "wo", "slead", "labor", "custom_screen"]);
  assert.equal(grouped.find((group) => group.id === "housekeeping").items.includes("rooms"), true);
  assert.equal(grouped.find((group) => group.id === "maintenance").items.includes("wo"), true);
  assert.equal(grouped.find((group) => group.id === "sales").items.includes("slead"), true);
  assert.equal(grouped.find((group) => group.id === "admin").items.includes("labor"), true);
  assert.deepEqual(grouped.find((group) => group.id === "more").items, ["custom_screen"]);
  const seen = {};
  more.GROUPS.forEach((group) => group.ids.forEach((id) => {
    assert.equal(seen[id], undefined, id);
    seen[id] = group.id;
  }));
});

test("each tile is an inline svg with an English or Spanish label", () => {
  global.M = {
    rooms: ["bed", "Rooms"],
    wo: ["wrench", "Work Orders"],
    slead: ["users", "Sales Lead"],
    settings: ["gear", "Settings"]
  };
  global.I18N = { es: { Rooms: "Cuartos", "Work Orders": "Órdenes de trabajo", "Sales Lead": "Prospecto de ventas", Settings: "Ajustes" } };
  const en = more.htmlFor(["rooms", "wo", "slead", "settings"], "en", { help: true });
  const es = more.htmlFor(["rooms", "wo", "slead", "settings"], "es", { help: true });
  assert.match(en, /<svg class="i"/);
  assert.match(en, /viewBox="0 0 24 24"/);
  assert.match(en, /stroke="currentColor"/);
  assert.match(en, /Housekeeping/);
  assert.match(en, />Rooms</);
  assert.match(en, /Sales &amp; Events/);
  assert.match(en, /Admin &amp; Reports/);
  assert.match(en, /Help &amp; tour/);
  assert.match(en, /--more-accent:#0f766e/);
  assert.match(en, /--more-accent:#92400e/);
  assert.match(en, /--more-accent:#6d28d9/);
  assert.match(en, /--more-accent:#334155/);
  assert.match(en, /more-dot/);
  assert.equal(en.includes("🛏️"), false);
  assert.match(es, /Ama de llaves/);
  assert.match(es, />Cuartos</);
  assert.match(es, /Ventas y eventos/);
  assert.match(es, /Administración y reportes/);
  assert.match(es, /Ayuda y recorrido/);
  assert.equal(more.settingText("en"), "Show More expanded on home screen");
  assert.equal(more.settingText("es"), "Mostrar Más expandido en la pantalla de inicio");
  assert.match(more.settingHtml("en"), /type="checkbox"/);
  assert.equal(more.settingHtml("en").includes(" checked"), false);
  assert.equal(more.expanded(), false);
  const css = read("more-menu.js");
  assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /min-width:1024px\)/);
  assert.match(css, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css, /min-width:1400px\)/);
  assert.match(css, /grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(css, /width:44px;height:44px/);
  assert.match(css, /color-mix\(in srgb,var\(--more-accent,#334155\) 12%,#fff\)/);
  assert.match(css, /border-radius:16px/);
  assert.match(css, /-webkit-line-clamp:2/);
  assert.match(css, /translateY\(-3px\)/);
  assert.match(css, /scale\(\.97\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.deepEqual(more.GROUPS.map((group) => group.accent), ["#1d4ed8", "#0f766e", "#92400e", "#6d28d9", "#166534", "#334155"]);
});

test("home stays collapsed until the saved per-user flag is on", () => {
  const home = read("home-focus.js");
  const html = read("index.html");
  const ux = read("ux.js");
  const features = read("hotel-features.js");
  assert.match(home, /HHQMore\.expanded\(\)/);
  assert.match(home, /more\.open = true/);
  assert.match(home, /HHQMore\.homeHtml/);
  assert.match(home, /L\("More", "Más"\)/);
  assert.doesNotMatch(home, /<details[^>]*\sopen/);
  assert.match(html, /const USER_MORE_KEY="jrportal_user_more"/);
  assert.match(html, /function setMoreExpanded\(on\)/);
  assert.match(html, /function moreExpandedOf\(u\)/);
  assert.match(html, /show_more_expanded/);
  assert.match(html, /sb\.rpc\("set_my_more_expanded",\{p_on:on\}\)/);
  assert.match(ux, /window\.uxAllowed=allowed/);
  assert.match(ux, /HHQMore\.sheetHtml/);
  assert.match(features, /list\.indexOf\("settings"\) < 0\) list\.push\("settings"\)/);
  assert.match(features, /HHQMore\.settingHtml/);
  assert.equal(features.includes("corporate() && list.indexOf(\"settings\")"), false);
});

test("the profile column is additive and only the signed-in person can change it", () => {
  const sql = read("supabase/migrations/20261105_show_more_expanded.sql");
  assert.match(sql, /add column if not exists show_more_expanded boolean not null default false/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /where user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /revoke all on function public\.set_my_more_expanded\(boolean\) from public, anon/);
  assert.match(sql, /grant execute on function public\.set_my_more_expanded\(boolean\) to authenticated/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /drop column/i);
  assert.doesNotMatch(sql, /delete from/i);
  const sw = read("sw.js");
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v17"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v16"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v15"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v14"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v13"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v12"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v11"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v10"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v9/);
  assert.doesNotMatch(sw, /hotelhq-shell-v8/);
  assert.doesNotMatch(sw, /hotelhq-shell-v7/);
  assert.doesNotMatch(sw, /hotelhq-shell-v6/);
  assert.doesNotMatch(sw, /hotelhq-shell-v5/);
  assert.doesNotMatch(sw, /hotelhq-shell-v4/);
  assert.doesNotMatch(sw, /hotelhq-shell-v3/);
});
