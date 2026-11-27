/* Shift pick for the Golden Valley (MSPWE) front desk. Demo only.
   Which shift checklist a person gets comes from, in order:
     1. a published schedule_shifts row that day (start time),
     2. the first Hotel Effectiveness clock-in that day (time_punches.punch_in),
     3. the answer to "Which shift are you working?" asked on the home screen
        after sign-in, saved on this device for that day.
   Golden Valley front desk only (America/Chicago). Jay's shifts are
   AM 7:00 AM-3:00 PM, PM 3:00-11:00 PM, and Night Audit 11:00 PM-7:00 AM.
   A punch-in or schedule start is AM 5:00 AM-12:59 PM, PM 1:00-8:59 PM,
   or Night Audit 9:00 PM-4:59 AM. A shift picked here starts at 7:00 AM,
   3:00 PM, or 11:00 PM and is due at 3:00 PM, 11:00 PM, or 7:00 AM.
   Other departments keep DailyAssign.shiftBucket and private.shift_bucket.
   Live mode never asks here; it keeps using schedule and punch only. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE"];
  var SHIFTS = [
    { key: "AM", en: "AM", es: "AM", hint_en: "7 AM-3 PM", hint_es: "7 AM-3 PM" },
    { key: "PM", en: "PM", es: "PM", hint_en: "3-11 PM", hint_es: "3-11 PM" },
    { key: "Night Audit", en: "Night Audit", es: "Auditoría nocturna", hint_en: "11 PM-7 AM", hint_es: "11 PM-7 AM" }
  ];
  var STORE = "hhq.shiftPick";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function isDemo() {
    try {
      var cfg = root.HOTELHQ_CONFIG || {};
      return cfg.mode !== "live";
    } catch (e) { return true; }
  }
  function isFrontDesk(role) {
    var r = String(role || "").trim().toLowerCase().replace(/\s+/g, "_");
    return r === "front_desk";
  }
  function applies(viewer) {
    return !!(viewer && viewer.id && HOTELS.indexOf(viewer.hotel) >= 0 && isFrontDesk(viewer.role));
  }
  function readBag(storage) {
    try { return JSON.parse((storage || root.localStorage).getItem(STORE) || "{}") || {}; } catch (e) { return {}; }
  }
  function writeBag(bag, storage) {
    try { (storage || root.localStorage).setItem(STORE, JSON.stringify(bag)); } catch (e) {}
  }
  function keyOf(viewer, date) {
    return viewer.hotel + "|" + viewer.id + "|" + String(date).slice(0, 10);
  }
  function answerOf(viewer, date, storage) {
    if (!applies(viewer)) return "";
    return readBag(storage)[keyOf(viewer, date)] || "";
  }
  function save(viewer, date, shift, storage) {
    if (!applies(viewer)) return false;
    if (!SHIFTS.some(function (s) { return s.key === shift; })) return false;
    var bag = readBag(storage);
    var today = String(date).slice(0, 10);
    Object.keys(bag).forEach(function (k) { if (k.slice(-10) < today) delete bag[k]; });
    bag[keyOf(viewer, date)] = shift;
    writeBag(bag, storage);
    return true;
  }

  /* Adds the signed-in front desk person to the example day (no schedule,
     no clock-in) and any saved answer, so the demo shows the ask flow. */
  function demoInput(input, viewer, date, storage) {
    if (!isDemo() || !applies(viewer)) return input;
    var out = Object.assign({}, input);
    var people = (input.people || []).slice();
    if (!people.some(function (p) { return p && p.id === viewer.id; })) {
      people.push({ id: viewer.id, name: viewer.name || "", hotel: viewer.hotel, role: "Front Desk", active: true });
    }
    out.people = people;
    var answer = answerOf(viewer, date, storage);
    out.answers = (input.answers || []).slice();
    if (answer) out.answers.push({ employee: viewer.id, hotel: viewer.hotel, date: String(date).slice(0, 10), shift: answer });
    return out;
  }

  function askHtml(input, viewer, lang) {
    if (!isDemo() || !applies(viewer)) return "";
    var DA = root.DailyAssign;
    if (!DA || !DA.needsShiftAsk || !DA.needsShiftAsk(input, viewer.id)) return "";
    var es = lang === "es";
    var buttons = SHIFTS.map(function (s) {
      return '<button type="button" class="btn2" data-shift="' + esc(s.key) + '" onclick="ShiftPick.choose(this.getAttribute(\'data-shift\'))">' +
        esc(es ? s.es : s.en) + "<small>" + esc(es ? s.hint_es : s.hint_en) + "</small></button>";
    }).join("");
    return '<section class="card" id="shiftPick"><span class="ex">' + esc(es ? "EJEMPLO" : "EXAMPLE") + "</span> " +
      "<h3>" + esc(es ? "¿Qué turno trabajas?" : "Which shift are you working?") + "</h3>" +
      "<p><small>" + esc(es
        ? "No vemos tu horario ni tu entrada de hoy. Elige tu turno para recibir su lista."
        : "We can't see a schedule or clock-in for you today. Pick your shift to get its checklist.") + "</small></p>" +
      '<div class="sp-btns">' + buttons + "</div></section>";
  }

  function viewerNow() {
    var user = null;
    try { user = typeof meUser === "function" ? meUser() : null; } catch (e) { user = null; }
    if (!user) return null;
    var hotel = "";
    try { hotel = (typeof S !== "undefined" && S.hotel) || user.hotel || ""; } catch (e2) { hotel = user.hotel || ""; }
    return { id: user.id, name: user.name || "", role: user.role || "", hotel: hotel };
  }
  function todayIso() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function choose(shift) {
    var viewer = viewerNow();
    if (!viewer || !isDemo()) return;
    if (save(viewer, todayIso(), shift) && typeof render === "function") render();
  }

  var api = {
    HOTELS: HOTELS,
    SHIFTS: SHIFTS,
    applies: applies,
    isDemo: isDemo,
    answerOf: answerOf,
    save: save,
    demoInput: demoInput,
    askHtml: askHtml,
    choose: choose
  };
  root.ShiftPick = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  var css = document.createElement("style");
  css.textContent = "#shiftPick .sp-btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}#shiftPick .sp-btns button{display:flex;flex-direction:column;align-items:flex-start;min-width:120px}#shiftPick .sp-btns small{font-weight:600;color:#5c6570}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
