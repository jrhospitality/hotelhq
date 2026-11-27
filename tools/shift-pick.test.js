"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const daily = require("../daily-assign.js");
globalThis.DailyAssign = daily;
const pick = require("../shift-pick.js");

const WED = "2026-11-25";
function mem() {
  const bag = {};
  return { getItem: (k) => (k in bag ? bag[k] : null), setItem: (k, v) => { bag[k] = String(v); } };
}
const viewer = { id: "demo-fd", name: "Sam Rivera", role: "Front Desk", hotel: "MSPWE" };

test("schedule beats punch and punch beats the asked answer", () => {
  const input = daily.exampleInput(WED);
  input.people.push({ id: "x1", name: "X", hotel: "MSPWE", role: "Front Desk", active: true });
  input.answers = [{ employee: "x1", hotel: "MSPWE", date: WED, shift: "AM" }];
  input.punches.push({ employee: "x1", hotel: "MSPWE", department: "front_desk", date: WED, punchIn: "22:40" });
  let rows = daily.plan(input).filter((r) => r.employee === "x1");
  assert.deepEqual(rows.map((r) => [r.templateId, r.source]), [["fd-na", "punch"]]);
  input.shifts.push({ employee: "x1", hotel: "MSPWE", department: "front_desk", date: WED, start: "14:45", end: "23:00", published: true });
  rows = daily.plan(input).filter((r) => r.employee === "x1");
  assert.deepEqual(rows.map((r) => [r.templateId, r.source]), [["fd-pm", "schedule"]]);
});

test("with no schedule or punch the person is asked, then gets only that shift's list", () => {
  const store = mem();
  let input = pick.demoInput(daily.exampleInput(WED), viewer, WED, store);
  assert.equal(daily.needsShiftAsk(input, viewer.id), true);
  assert.match(pick.askHtml(input, viewer, "en"), /Which shift are you working\?/);
  assert.match(pick.askHtml(input, viewer, "en"), /7 AM-3 PM/);
  assert.match(pick.askHtml(input, viewer, "en"), /3-11 PM/);
  assert.match(pick.askHtml(input, viewer, "en"), /11 PM-7 AM/);
  assert.match(pick.askHtml(input, viewer, "es"), /¿Qué turno trabajas\?/);
  assert.match(pick.askHtml(input, viewer, "es"), /Auditoría nocturna/);
  assert.equal(daily.plan(input).filter((r) => r.employee === viewer.id).length, 0);

  assert.equal(pick.save(viewer, WED, "Night Audit", store), true);
  input = pick.demoInput(daily.exampleInput(WED), viewer, WED, store);
  assert.equal(daily.needsShiftAsk(input, viewer.id), false);
  assert.equal(pick.askHtml(input, viewer, "en"), "");
  const mine = daily.plan(input).filter((r) => r.employee === viewer.id);
  assert.deepEqual(mine.map((r) => [r.templateId, r.shift, r.source, r.due]), [["fd-na", "Night Audit", "asked", "2026-11-26T07:00"]]);
});

test("Golden Valley front desk uses Jay's windows; other shifts keep the general buckets", () => {
  assert.equal(daily.mspweFdBucket("04:59"), "Night Audit");
  assert.equal(daily.mspweFdBucket("05:00"), "AM");
  assert.equal(daily.mspweFdBucket("12:59"), "AM");
  assert.equal(daily.mspweFdBucket("13:00"), "PM");
  assert.equal(daily.mspweFdBucket("20:59"), "PM");
  assert.equal(daily.mspweFdBucket("21:00"), "Night Audit");
  assert.equal(daily.shiftBucket("13:00"), "AM");
  assert.equal(daily.shiftBucket("13:59"), "AM");
  assert.equal(daily.shiftBucket("20:59"), "PM");
  assert.equal(daily.shiftBucket("21:00"), "PM");
  assert.equal(daily.shiftBucket("21:59"), "PM");
  assert.equal(daily.askedStart("AM"), "07:00");
  assert.equal(daily.askedStart("PM"), "15:00");
  assert.equal(daily.askedStart("Night Audit"), "23:00");
  assert.equal(daily.mspweFdBucket(daily.askedStart("AM")), "AM");
  assert.equal(daily.mspweFdBucket(daily.askedStart("PM")), "PM");
  assert.equal(daily.mspweFdBucket(daily.askedStart("Night Audit")), "Night Audit");

  const input = daily.exampleInput(WED);
  input.people.push(
    { id: "fd-am-edge", name: "A", hotel: "MSPWE", role: "Front Desk", active: true },
    { id: "fd-pm-edge", name: "P", hotel: "MSPWE", role: "Front Desk", active: true },
    { id: "fd-na-edge", name: "N", hotel: "MSPWE", role: "Front Desk", active: true },
    { id: "fd-sched", name: "S", hotel: "MSPWE", role: "Front Desk", active: true },
    { id: "hk-early", name: "H", hotel: "MSPWE", role: "Housekeeping", active: true },
    { id: "mspam-early", name: "M", hotel: "MSPAM", role: "Front Desk", active: true }
  );
  input.templates.push({ id: "fd-am-mspam", hotel: "MSPAM", department: "front_desk", shift: "AM", name_en: "AM", name_es: "AM", kind: "daily", cadence: "daily", active: true });
  input.punches.push(
    { employee: "fd-am-edge", hotel: "MSPWE", department: "front_desk", date: WED, punchIn: "12:59" },
    { employee: "fd-pm-edge", hotel: "MSPWE", department: "front_desk", date: WED, punchIn: "13:00" },
    { employee: "fd-na-edge", hotel: "MSPWE", department: "front_desk", date: WED, punchIn: "21:00" },
    { employee: "hk-early", hotel: "MSPWE", department: "housekeeping", date: WED, punchIn: "13:00" },
    { employee: "mspam-early", hotel: "MSPAM", department: "front_desk", date: WED, punchIn: "13:00" }
  );
  input.shifts.push({ employee: "fd-sched", hotel: "MSPWE", department: "front_desk", date: WED, start: "13:00", end: "21:00", published: true });
  const rows = daily.plan(input);
  function one(id) {
    return rows.filter((r) => r.employee === id).map((r) => [r.templateId, r.shift, r.source, r.due]);
  }
  assert.deepEqual(one("fd-am-edge"), [["fd-am", "AM", "punch", WED + "T15:00"]]);
  assert.deepEqual(one("fd-pm-edge"), [["fd-pm", "PM", "punch", WED + "T23:00"]]);
  assert.deepEqual(one("fd-na-edge"), [["fd-na", "Night Audit", "punch", "2026-11-26T07:00"]]);
  assert.deepEqual(one("hk-early"), [["hk", "AM", "punch", WED + "T15:00"]]);
  assert.deepEqual(one("mspam-early"), [["fd-am-mspam", "AM", "punch", WED + "T15:00"]]);
  assert.deepEqual(one("fd-sched"), [["fd-pm", "PM", "schedule", WED + "T23:00"]]);

  const store = mem();
  pick.save(viewer, WED, "AM", store);
  const am = daily.plan(pick.demoInput(daily.exampleInput(WED), viewer, WED, store)).filter((r) => r.employee === viewer.id);
  assert.deepEqual(am.map((r) => [r.templateId, r.shift, r.source, r.due]), [["fd-am", "AM", "asked", WED + "T15:00"]]);
  pick.save(viewer, WED, "PM", store);
  const pm = daily.plan(pick.demoInput(daily.exampleInput(WED), viewer, WED, store)).filter((r) => r.employee === viewer.id);
  assert.deepEqual(pm.map((r) => [r.templateId, r.due]), [["fd-pm", WED + "T23:00"]]);
});

test("only Golden Valley front desk is asked, and bad answers are ignored", () => {
  const store = mem();
  assert.equal(pick.save(viewer, WED, "Swing", store), false);
  assert.equal(pick.save(Object.assign({}, viewer, { hotel: "MSPAM" }), WED, "AM", store), false);
  assert.equal(pick.save(Object.assign({}, viewer, { role: "Housekeeping" }), WED, "AM", store), false);
  const hk = Object.assign({}, viewer, { role: "Housekeeping" });
  const input = daily.exampleInput(WED);
  assert.equal(pick.demoInput(input, hk, WED, store), input);
  assert.equal(pick.askHtml(input, hk, "en"), "");
});

test("live mode never asks", () => {
  globalThis.HOTELHQ_CONFIG = { mode: "live" };
  try {
    const store = mem();
    const input = daily.exampleInput(WED);
    assert.equal(pick.demoInput(input, viewer, WED, store), input);
    assert.equal(pick.askHtml(input, viewer, "en"), "");
  } finally {
    delete globalThis.HOTELHQ_CONFIG;
  }
});

test("index.html loads shift-pick.js and the service worker caches it", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf('src="shift-pick.js"') > 0);
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(sw, /\.\/shift-pick\.js/);
});
