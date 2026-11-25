/* Expected finish for room attendants and laundry.
   Start is today's punch-in, then the scheduled start, then the first room activity.
   Housekeepers: that start + remaining rooms x minutes-per-room + break.
   Laundry: that start + today's planned laundry hours.
   Houseperson is not part of this. Missing standards stay blank.
   The punch is timePunches[hotel][name][weekday][0], loaded from time_punches.punch_in. */
(function (root) {
  "use strict";

  var ROLES = { Housekeeper: "rooms", "Laundry Attendant": "laundry" };
  var TEAM = { GM: 1, AGM: 1, Housekeeping: 1 };

  function finite(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function parseClock(value) {
    if (value == null || value === "") return null;
    var s = String(value).trim();
    var m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp](?:\s*\.?\s*[Mm]\.?)?)?$/);
    if (!m) return null;
    var h = Number(m[1]);
    var min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    var ap = (m[3] || "").toLowerCase().replace(/[^ap]/g, "");
    if (ap === "a" || ap === "p") {
      if (h > 12) return null;
      if (h === 12) h = 0;
      if (ap === "p") h += 12;
    }
    return h * 60 + min;
  }
  function formatClock(min) {
    min = Math.round(Number(min));
    if (!isFinite(min)) return "";
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60);
    var m = min % 60;
    var ap = h >= 12 ? "PM" : "AM";
    var h12 = h % 12;
    if (!h12) h12 = 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function cleanKind(room) {
    if (!room) return "checkout";
    if (room.kind === "stayover" || room.kind === "checkout" || room.kind === "deep" || room.kind === "suite" || room.kind === "other") return room.kind;
    if (room.suite || room.ty === "suite") return "suite";
    if (room.deep || room.ty === "deep" || room.ty === "other") return "deep";
    var status = String(room.s || "");
    if (status === "OD" || (room.occ && status !== "VD")) return "stayover";
    return "checkout";
  }
  function roomOpen(room) {
    if (!room || room.x) return false;
    var flow = room.flow || "";
    if (flow === "cleaned" || flow === "ready" || flow === "ooo") return false;
    if (flow === "dirty" || flow === "progress" || flow === "reclean") return true;
    var status = String(room.s || "");
    if (status === "RFI" || status === "VC" || status === "OC" || status === "OOO") return false;
    if (room.t1) return false;
    return status === "VD" || status === "OD";
  }
  function remainingRooms(rooms, name) {
    return (rooms || []).filter(function (room) {
      return room && room.hk === name && roomOpen(room);
    }).map(function (room) {
      return { kind: cleanKind(room) };
    });
  }
  function pickShift(shifts, nowMin) {
    var rows = (shifts || []).filter(function (row) { return row && finite(row.start) != null; });
    if (!rows.length) return null;
    var now = finite(nowMin);
    var open = now == null ? [] : rows.filter(function (row) {
      return now >= row.start && (row.end == null || now <= row.end);
    });
    var list = open.length ? open : rows.slice();
    list.sort(function (a, b) { return a.start - b.start; });
    return list[0];
  }
  function behind(finish, end) {
    if (finish == null || end == null) return "none";
    if (finish > end + 30) return "red";
    if (finish > end) return "amber";
    return "ok";
  }
  function chooseStart(spec) {
    spec = spec || {};
    var punch = finite(spec.punchMin);
    var schedule = finite(spec.scheduleStart);
    var end = finite(spec.scheduleEnd);
    var activity = finite(spec.activityMin);
    if (punch != null) return { start: punch, end: end, basis: "punch" };
    if (schedule != null) return { start: schedule, end: end, basis: "schedule" };
    if (activity != null) return { start: activity, end: null, basis: "activity" };
    return { start: null, end: null, basis: "" };
  }
  function basisLabel(basis, startMin, lang) {
    var clock = formatClock(startMin);
    if (!clock) return "";
    var en = { punch: "from punch ", schedule: "from schedule ", activity: "from first activity " };
    var es = { punch: "desde marcaje ", schedule: "desde horario ", activity: "desde la primera actividad " };
    var prefix = (lang === "es" ? es : en)[basis];
    return prefix ? prefix + clock : "";
  }
  function blank(reason) {
    return { ok: false, reason: reason || "standards", finish: null, end: null, flag: "none", work: null };
  }
  function project(spec) {
    spec = spec || {};
    var kind = ROLES[spec.role];
    if (!kind) return null;
    var start = finite(spec.startMin);
    var end = finite(spec.endMin);
    if (start == null) return blank("start");
    var work = 0;
    if (kind === "rooms") {
      var standards = spec.standards || {};
      var breakMin = finite(spec.breakMin);
      if (breakMin == null) breakMin = finite(standards.breakMin);
      var rooms = spec.rooms || [];
      for (var i = 0; i < rooms.length; i++) {
        var rate = finite(standards[rooms[i].kind]);
        if (rate == null) return blank("standards");
        work += rate;
      }
      if (breakMin != null) work += breakMin;
    } else {
      var hours = finite(spec.plannedHours);
      if (hours == null || hours <= 0) return blank("standards");
      work = hours * 60;
    }
    var finish = start + work;
    return { ok: true, reason: "", finish: finish, end: end, flag: behind(finish, end), work: work, start: start };
  }
  function phrase(finish, lang) {
    var clock = formatClock(finish);
    if (!clock) return "";
    return lang === "es" ? "Termina a las " + clock : "Expected done by " + clock;
  }
  function hint(lang) {
    return lang === "es" ? "Defina los estándares de labor" : "Set labor standards";
  }
  function flagLabel(flag, lang) {
    if (flag !== "amber" && flag !== "red") return "";
    return lang === "es" ? "Atrasado" : "Running behind";
  }

  var api = {
    ROLES: ROLES,
    TEAM: TEAM,
    parseClock: parseClock,
    formatClock: formatClock,
    cleanKind: cleanKind,
    roomOpen: roomOpen,
    remainingRooms: remainingRooms,
    pickShift: pickShift,
    behind: behind,
    chooseStart: chooseStart,
    basisLabel: basisLabel,
    project: project,
    phrase: phrase,
    hint: hint,
    flagLabel: flagLabel
  };
  root.HHQDone = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function lang() { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; }
  function hotelNow() {
    try { return S.hotel || ""; } catch (e) { return ""; }
  }
  function roleNow() {
    try { return typeof authRole === "function" ? authRole() : ""; } catch (e) { return ""; }
  }
  function dayIndex(date) {
    var d = date ? new Date(date + "T12:00:00") : new Date();
    return (d.getDay() + 6) % 7;
  }
  function today() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function standardsFor(hotel) {
    try {
      if (root.HHQLaborStd && HHQLaborStd.roomMinutes) return HHQLaborStd.roomMinutes(hotel, today());
    } catch (e) {}
    return null;
  }
  function shiftsFor(name, hotel, date) {
    var rows = [];
    try {
      (S.shifts || []).forEach(function (shift) {
        if (!shift || shift.who !== name || shift.date !== date) return;
        if (shift.scope && shift.scope !== hotel && shift.scope !== "SHUTTLE") return;
        var start = parseClock(shift.start);
        var end = parseClock(shift.end);
        if (start == null) return;
        rows.push({ start: start, end: end });
      });
    } catch (e2) {}
    return rows;
  }
  function punchToday(name, hotel, date) {
    try {
      var idx = dayIndex(date);
      var punch = ((timePunches[hotel] || {})[name] || [])[idx];
      if (punch && punch[0]) return parseClock(punch[0]);
    } catch (e) {}
    return null;
  }
  function firstActivity(name) {
    var best = null;
    try {
      (D().rooms || []).forEach(function (room) {
        if (!room || room.hk !== name || !room.t0) return;
        var min = parseClock(room.t0);
        if (min == null) return;
        if (best == null || min < best) best = min;
      });
    } catch (e) {}
    return best;
  }
  function plannedHours(hotel, name, date) {
    var sold = null;
    try {
      var week = laborPlan.rooms && laborPlan.rooms[hotel];
      var idx = dayIndex(date);
      if (week && week.length === 7) sold = Number(week[(idx + 6) % 7]);
    } catch (e) {}
    try {
      if (root.HHQLaborStd && HHQLaborStd.laundryHours) return HHQLaborStd.laundryHours(hotel, date, sold);
    } catch (e2) {}
    return null;
  }
  function nowMin() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
  function people() {
    var hotel = hotelNow();
    if (!hotel || typeof USERS === "undefined") return [];
    return USERS.filter(function (user) {
      return user && user.active !== false && user.hotel === hotel && ROLES[user.role];
    });
  }
  function rowFor(user) {
    var hotel = hotelNow();
    var date = today();
    var shift = pickShift(shiftsFor(user.name, hotel, date), nowMin());
    var chosen = chooseStart({
      punchMin: punchToday(user.name, hotel, date),
      scheduleStart: shift ? shift.start : null,
      scheduleEnd: shift ? shift.end : null,
      activityMin: firstActivity(user.name)
    });
    var spec = {
      role: user.role,
      startMin: chosen.start,
      endMin: chosen.end,
      standards: standardsFor(hotel),
      rooms: remainingRooms((function () { try { return D().rooms || []; } catch (e) { return []; } })(), user.name),
      plannedHours: user.role === "Laundry Attendant" ? plannedHours(hotel, user.name, date) : null
    };
    if (spec.standards) spec.breakMin = spec.standards.breakMin;
    var result = project(spec) || blank("start");
    result.basis = chosen.basis;
    result.start = chosen.start;
    return { user: user, result: result, example: !!(spec.standards && spec.standards.example) };
  }
  function clockText(result) {
    if (!result || !result.ok) return "—";
    return phrase(result.finish, lang());
  }
  function endText(result) {
    if (!result || result.end == null) return "—";
    return formatClock(result.end);
  }
  function flagHtml(result) {
    var flag = result && result.flag;
    var label = flagLabel(flag, lang());
    if (!label) return "";
    return '<span class="ed-flag ed-' + flag + '">' + esc(label) + "</span>";
  }
  function basisHtml(result) {
    var text = basisLabel(result && result.basis, result && result.start, lang());
    if (!text) return "";
    return '<small class="ed-basis">' + esc(text) + "</small>";
  }
  function homeHtml() {
    var mine = "";
    var team = "";
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (me && ROLES[me.role] && me.hotel === hotelNow()) {
        var row = rowFor(me);
        var hintText = row.result && row.result.ok ? "" : '<small class="ed-hint">' + esc(L(hint("en"), hint("es"))) + "</small>";
        var ex = row.example && row.result && row.result.ok ? '<span class="ex">EXAMPLE</span>' : "";
        mine = '<section class="hhq-done ed-me" id="hhqDoneMe"><b>' + esc(clockText(row.result)) + "</b>" + flagHtml(row.result) + ex + basisHtml(row.result) + hintText + "</section>";
      }
    } catch (e) {}
    if (TEAM[roleNow()]) {
      var rows = people().map(rowFor);
      if (rows.length) {
        var body = rows.map(function (row) {
          var missing = row.result && row.result.ok ? "" : '<small class="ed-hint">' + esc(L(hint("en"), hint("es"))) + "</small>";
          var face = (root.HHQAv && HHQAv.html) ? HHQAv.html(row.user.name, 36) : "";
          return '<div class="ed-row ed-' + esc((row.result && row.result.flag) || "none") + '"><div class="ed-who">' + face + "<div><b>" + esc(row.user.name) + '</b><small>' + esc(L(row.user.role, row.user.role === "Housekeeper" ? "Camarista" : "Lavandería")) + "</small></div></div><div><span>" + esc(clockText(row.result)) + "</span>" + basisHtml(row.result) + missing + "</div><div><small>" + esc(L("Scheduled end", "Fin programado")) + "</small><b>" + esc(endText(row.result)) + "</b></div><div>" + (flagHtml(row.result) || '<span class="ed-flag ed-ok">' + esc(L("On time", "A tiempo")) + "</span>") + "</div></div>";
        }).join("");
        team = '<section class="hhq-done" id="hhqDoneTeam"><h3>' + esc(L("Expected done by", "Hora prevista")) + "</h3>" + body + "</section>";
      }
    }
    return mine + team;
  }
  api.homeHtml = homeHtml;
  api.rowFor = rowFor;

  var css = document.createElement("style");
  css.textContent = [
    ".hhq-done{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:12px 14px;margin:0}",
    "#uxHero.glance-on #hhqDoneMe,#uxHero.glance-on #hhqDoneTeam{display:block!important}",
    ".hhq-done h3{margin:0 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#5c6570}",
    ".ed-me{display:flex;flex-wrap:wrap;align-items:center;gap:8px}",
    ".ed-me b{font-size:18px}",
    ".ed-basis{color:#5c6570;font-weight:650}",
    ".ed-me .ed-basis{flex-basis:100%}",
    ".ed-hint{color:#9a3412;font-weight:650}",
    ".ed-row{display:grid;grid-template-columns:minmax(180px,1.2fr) minmax(160px,1.4fr) minmax(120px,.8fr) auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #e6e8ee}",
    ".ed-who{display:flex;align-items:center;gap:8px}",
    ".ed-row small{display:block;color:#5c6570;font-weight:650}",
    ".ed-flag{display:inline-flex;align-items:center;min-height:28px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:750}",
    ".ed-flag.ed-ok{background:#e7f6ee;color:#0f7a3a}",
    ".ed-flag.ed-amber{background:#fff7ed;color:#9a3412}",
    ".ed-flag.ed-red{background:#fde8e8;color:#b42318}",
    ".ed-amber.ed-row,.ed-row.ed-amber{box-shadow:inset 3px 0 0 #d97706}",
    ".ed-row.ed-red{box-shadow:inset 3px 0 0 #b42318}",
    "@media(max-width:700px){.ed-row{grid-template-columns:1fr 1fr;}.ed-row div:nth-child(3),.ed-row div:nth-child(4){grid-column:auto}}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
