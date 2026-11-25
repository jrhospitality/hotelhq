/* Daily labor for the GM and AGM.
   Yesterday opens first. Every loaded day shows, including days with no flags.
   Maintenance and Prop Ops stay off this daily view.
   Demo mode uses fictional EXAMPLE names and does not call the network.
   Live mode reads the morning Hotel Effectiveness snapshot. Checkoff stays in
   HotelHQ and is never written back to Hotel Effectiveness.
   MSPWE (Golden Valley, HE property 118172) is the launch hotel.
   MSPMS (SpringHill) and MSPAM (Hampton) are in the rollup and stay off until
   their property ids are saved. */
(function (root) {
  "use strict";

  var he = null;
  if (typeof require === "function") {
    try { he = require("./tools/he-labor.js"); } catch (e) { he = null; }
  }
  if (!he && root.HELabor) he = root.HELabor;

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = {
    MSPWE: "Golden Valley",
    MSPAM: "Hampton",
    MSPMS: "SpringHill"
  };
  var TZ = "America/Chicago";
  var STANDARDS = { minutesPerCheckout: 30, minutesPerStayover: 15, hoursPerOccupiedRoom: 0.36 };

  function norm(role) {
    var key = role == null ? "" : String(role);
    var map = { "JR Corporate": "Above Property", corporate: "Above Property", above_property: "Above Property", gm: "GM", agm: "AGM", front_desk: "Front Desk" };
    key = map[key] || key;
    if (root.HHQ && root.HHQ.norm) return root.HHQ.norm(key);
    return key;
  }
  function canSee(role) {
    role = norm(role);
    if (root.HHQ && root.HHQ.can) return !!root.HHQ.can(role, "labor.daily");
    return role === "GM" || role === "AGM" || role === "Above Property";
  }
  function hotelsFor(role, hotel) {
    if (!canSee(role)) return [];
    if (norm(role) === "Above Property") return HOTELS.slice();
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function chicagoDate(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    var date = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag.year + "-" + bag.month + "-" + bag.day;
  }
  function addDays(iso, n) {
    if (he && he.addDays) return he.addDays(iso, n);
    var p = String(iso).split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }
  function mondayOf(iso) {
    var p = String(iso).split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    var day = dt.getUTCDay();
    var delta = day === 0 ? 6 : day - 1;
    dt.setUTCDate(dt.getUTCDate() - delta);
    return dt.toISOString().slice(0, 10);
  }
  function round2(n) {
    if (n == null || !isFinite(Number(n))) return null;
    var sign = Number(n) < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(Number(n)) * 100 + 1e-9) / 100;
  }
  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function hoursText(n) {
    n = num(n);
    if (n == null) return "—";
    return (Math.round(Math.abs(n) * 10 + 1e-9) / 10).toFixed(1);
  }
  function signedHours(n) {
    n = num(n);
    if (n == null) return "—";
    var text = (Math.round(Math.abs(n) * 10 + 1e-9) / 10).toFixed(1);
    if (n > 0) return "+" + text;
    if (n < 0) return "-" + text;
    return "0.0";
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function pretty(iso, lang) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
    var p = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
      timeZone: "UTC", month: "short", day: "numeric"
    }).format(dt);
  }
  function positionGroup(position) {
    if (he && he.positionGroup) return he.positionGroup(position);
    if (/maintenance|prop\s*ops|property\s*ops|property operations|^maint\b|\bmaint\b|\bengineer\b/i.test(position || "")) return "excluded";
    if (/front\s*desk|front office/i.test(position || "")) return "front_desk";
    if (/housekeep|room attendant|hskp|room cleaner/i.test(position || "")) return "housekeeping";
    return "other";
  }
  function itemState(item, today) {
    if (!item || item.status === "done") return "done";
    if (item.status === "overdue") return "overdue";
    if (item.dueOn && today && item.dueOn < today) return "overdue";
    return "open";
  }
  function counts(days, hotel, today) {
    var open = 0;
    var overdue = 0;
    (days || []).forEach(function (day) {
      if (hotel && day.hotel !== hotel) return;
      (day.items || []).forEach(function (item) {
        var state = itemState(item, today);
        if (state === "open") open += 1;
        if (state === "overdue") overdue += 1;
      });
    });
    return { open: open, overdue: overdue };
  }
  function dayFor(bundle, hotel, date) {
    var found = null;
    ((bundle && bundle.days) || []).forEach(function (day) {
      if (day.hotel === hotel && day.workDate === date) found = day;
    });
    return found;
  }
  function roomsFor(bundle, hotel, date) {
    var sold = null;
    ((bundle && bundle.occupancy) || []).forEach(function (row) {
      if (row.hotel === hotel && row.date === date && row.roomsSold != null) sold = row.roomsSold;
    });
    if (sold != null) return sold;
    var day = dayFor(bundle, hotel, date);
    return day && day.roomsSold != null ? day.roomsSold : null;
  }
  function wtd(bundle, hotel, date) {
    var start = mondayOf(date);
    var rooms = 0;
    var roomDays = 0;
    var actual = 0;
    var plan = 0;
    var hourDays = 0;
    var cursor = start;
    while (cursor <= date) {
      var sold = roomsFor(bundle, hotel, cursor);
      if (sold != null) {
        rooms += sold;
        roomDays += 1;
      }
      var day = dayFor(bundle, hotel, cursor);
      if (day && day.loaded && day.totals && day.totals.actual != null) {
        actual += Number(day.totals.actual) || 0;
        plan += Number(day.totals.plan) || 0;
        hourDays += 1;
      }
      cursor = addDays(cursor, 1);
    }
    return {
      rooms: roomDays ? rooms : null,
      actual: hourDays ? round2(actual) : null,
      plan: hourDays ? round2(plan) : null
    };
  }
  function winLoss(actual, plan, lang) {
    if (actual == null || plan == null) return { text: "—", tone: "none" };
    var gap = round2(Number(actual) - Number(plan));
    var abs = hoursText(Math.abs(gap));
    if (gap > 0) return { text: tx(lang, "Loss ", "De más ") + abs + "h", tone: "bad" };
    return { text: tx(lang, "Win ", "A favor ") + abs + "h", tone: "good" };
  }
  function enabled(bundle, hotel) {
    var meta = bundle && bundle.hotels && bundle.hotels[hotel];
    if (meta && meta.enabled === false) return false;
    if (meta && meta.enabled === true) return true;
    return hotel === "MSPWE";
  }

  function flaggedFacts(workDate) {
    return {
      hotel: "MSPWE",
      work_date: workDate,
      source: "he",
      housekeeping_loaded: true,
      punches_loaded: true,
      positions_loaded: true,
      associates_loaded: true,
      positions: [
        { position: "Front Desk", actual_hours: 24.5, plan_hours: 24, scheduled_hours: 24 },
        { position: "Room Attendant", actual_hours: 36, plan_hours: 32, scheduled_hours: 34 },
        { position: "Breakfast Attendant", actual_hours: 8, plan_hours: 8, scheduled_hours: 8 },
        { position: "Maintenance", actual_hours: 10, plan_hours: 8, scheduled_hours: 8 },
        { position: "Prop Ops", actual_hours: 4, plan_hours: 4, scheduled_hours: 4 }
      ],
      housekeeping: [
        { name: "Alex Example", position: "Room Attendant", hours: 8.2, cleans: 12, checkouts: 8, stayovers: 4 },
        { name: "Blake Example", position: "Room Attendant", hours: 7.5, cleans: 0 },
        { name: "Casey Example", position: "Room Attendant", hours: 0, cleans: 4 },
        { name: "Drew Example", position: "Hskp Supervisor", hours: 8, cleans: 0 }
      ],
      associates: [
        { name: "Alex Example", position: "Room Attendant", actual_hours: 8.2, plan_hours: 7.5, scheduled_hours: 8, plan_scope: "associate", scheduled_scope: "associate" },
        { name: "Jordan Example", position: "Front Desk", actual_hours: 8.5, plan_hours: 24, scheduled_hours: 24, plan_scope: "position", scheduled_scope: "position" }
      ],
      punches: [
        { name: "Riley Example", position: "Front Desk", missing: "out" },
        { name: "Quinn Example", position: "", missing: "in" }
      ]
    };
  }
  function quietFacts(workDate) {
    return {
      hotel: "MSPWE",
      work_date: workDate,
      source: "he",
      housekeeping_loaded: true,
      punches_loaded: true,
      positions_loaded: true,
      associates_loaded: true,
      positions: [
        { position: "Front Desk", actual_hours: 24, plan_hours: 24, scheduled_hours: 24 },
        { position: "Room Attendant", actual_hours: 30, plan_hours: 32, scheduled_hours: 32 },
        { position: "Breakfast Attendant", actual_hours: 8, plan_hours: 8, scheduled_hours: 8 }
      ],
      housekeeping: [
        { name: "Jordan Example", position: "Room Attendant", hours: 8, cleans: 16, checkouts: 8, stayovers: 8 }
      ],
      associates: [
        { name: "Jordan Example", position: "Room Attendant", actual_hours: 8, plan_hours: 8, scheduled_hours: 8, plan_scope: "associate", scheduled_scope: "associate" }
      ],
      punches: []
    };
  }
  function buildExample(now) {
    var today = chicagoDate(now || new Date().toISOString());
    var yesterday = addDays(today, -1);
    var prior = addDays(today, -2);
    var days = [];
    if (he && he.deriveDay) {
      days.push(he.deriveDay(flaggedFacts(yesterday), { standards: STANDARDS, roomsSold: 82 }));
      days.push(he.deriveDay(quietFacts(prior), { standards: STANDARDS, roomsSold: 70 }));
    }
    var occupancy = [];
    var cursor = mondayOf(yesterday);
    while (cursor <= yesterday) {
      var sold = cursor === yesterday ? 82 : cursor === prior ? 70 : 76;
      occupancy.push({ hotel: "MSPWE", date: cursor, roomsSold: sold });
      cursor = addDays(cursor, 1);
    }
    return {
      origin: "example",
      today: today,
      days: days,
      occupancy: occupancy,
      hotels: {
        MSPWE: { enabled: true, hePropertyId: "118172", name: NAMES.MSPWE },
        MSPAM: { enabled: false, hePropertyId: "", name: NAMES.MSPAM },
        MSPMS: { enabled: false, hePropertyId: "", name: NAMES.MSPMS }
      }
    };
  }
  function applyCheck(day, itemNo, actor, note, nowIso) {
    var copy = JSON.parse(JSON.stringify(day));
    copy.items.forEach(function (item) {
      if (Number(item.itemNo) !== Number(itemNo) || item.status === "done") return;
      item.status = "done";
      item.checkedByName = actor && actor.name ? actor.name : "GM";
      item.checkedAt = nowIso || "";
      item.note = String(note || "").slice(0, 240);
    });
    return copy;
  }

  function hoursRow(label, actual, plan, scheduled) {
    var gap = actual == null || plan == null ? null : round2(actual - plan);
    return "<tr><td>" + esc(label) + "</td><td class=\"num\">" + esc(hoursText(actual)) + "</td><td class=\"num\">" +
      esc(hoursText(plan)) + "</td><td class=\"num\">" + esc(hoursText(scheduled)) + "</td><td class=\"num\">" +
      esc(signedHours(gap)) + "</td></tr>";
  }
  function tableHead(lang) {
    return "<tr><th>" + esc(tx(lang, "Position", "Puesto")) + "</th><th>" + esc(tx(lang, "Actual", "Real")) +
      "</th><th>" + esc(tx(lang, "Plan", "Plan")) + "</th><th>" + esc(tx(lang, "Scheduled", "Programado")) +
      "</th><th>" + esc(tx(lang, "Var", "Var")) + "</th></tr>";
  }
  function groupRows(day, group) {
    return (day.positions || []).filter(function (row) { return row.group === group; });
  }
  function sectionTable(title, rows, lang, empty) {
    var body = rows.length ? rows.map(function (row) {
      return hoursRow(row.position, row.actual, row.plan, row.scheduled);
    }).join("") : "<tr><td colspan=\"5\">" + esc(empty) + "</td></tr>";
    return "<section class=\"dl-sec\"><h3>" + esc(title) + "</h3><div class=\"dl-scroll\"><table class=\"dl-t\">" +
      tableHead(lang) + body + "</table></div></section>";
  }
  function housekeepingSection(day, lang) {
    var rows = groupRows(day, "housekeeping");
    var summary = rows.map(function (row) {
      return hoursRow(row.position, row.actual, row.plan, row.scheduled);
    }).join("");
    var people = (day.housekeeping || []).map(function (row) {
      var mpr = hoursText(row.mprActual) + " / " + hoursText(row.mprTarget);
      var tag = row.supervisor ? " · " + esc(tx(lang, "Supervisor", "Supervisor")) : "";
      return "<tr><td>" + esc(row.name || tx(lang, "Unknown associate", "Asociado desconocido")) + tag +
        "<br><small>" + esc(row.position || "") + "</small></td><td class=\"num\">" + esc(hoursText(row.hours)) +
        "</td><td class=\"num\">" + esc(row.cleans == null ? "—" : String(row.cleans)) + "</td><td class=\"num\">" +
        esc(mpr) + "</td></tr>";
    }).join("");
    var peopleHead = "<tr><th>" + esc(tx(lang, "Associate", "Asociado")) + "</th><th>" + esc(tx(lang, "Hours", "Horas")) +
      "</th><th>" + esc(tx(lang, "Cleans", "Limpiezas")) + "</th><th>" + esc(tx(lang, "MPR actual / target", "MPR real / meta")) + "</th></tr>";
    var empty = "<p class=\"dl-note\">" + esc(tx(lang, "No housekeeping lines on this file.", "No hay líneas de ama de llaves en este archivo.")) + "</p>";
    return "<section class=\"dl-sec\" data-group=\"housekeeping\"><h3>" + esc(tx(lang, "Housekeeping", "Ama de llaves")) +
      "</h3><div class=\"dl-scroll\"><table class=\"dl-t\">" + tableHead(lang) + (summary || "") + "</table></div>" +
      (people ? "<div class=\"dl-scroll\"><table class=\"dl-t\">" + peopleHead + people + "</table></div>" : empty) + "</section>";
  }
  function overplanSection(day, lang) {
    var rows = day.overplan || [];
    var head = "<tr><th>" + esc(tx(lang, "Associate", "Asociado")) + "</th><th>" + esc(tx(lang, "Actual", "Real")) +
      "</th><th>" + esc(tx(lang, "Plan", "Plan")) + "</th><th>" + esc(tx(lang, "Scheduled", "Programado")) +
      "</th><th>" + esc(tx(lang, "Var", "Var")) + "</th></tr>";
    var body = rows.length ? rows.map(function (row) {
      var flag = row.planScope === "position" || row.scheduledScope === "position"
        ? "<br><small class=\"dl-flag\">" + esc(tx(lang, "Position total, not a personal plan", "Total del puesto, no un plan personal")) + "</small>"
        : "";
      return "<tr><td>" + esc(row.name || "") + "<br><small>" + esc(row.position || "") + "</small>" + flag +
        "</td><td class=\"num\">" + esc(hoursText(row.actual)) + "</td><td class=\"num\">" + esc(hoursText(row.plan)) +
        "</td><td class=\"num\">" + esc(hoursText(row.scheduled)) + "</td><td class=\"num\">" + esc(signedHours(row.variance)) + "</td></tr>";
    }).join("") : "<tr><td colspan=\"5\">" + esc(tx(lang, "No associates over plan.", "Nadie sobre el plan.")) + "</td></tr>";
    return "<section class=\"dl-sec\" data-overplan=\"1\"><h3>" + esc(tx(lang, "Over-plan associates", "Asociados sobre el plan")) +
      "</h3><div class=\"dl-scroll\"><table class=\"dl-t\">" + head + body + "</table></div></section>";
  }
  function checkList(day, lang, today) {
    var items = day.items || [];
    if (!items.length) {
      return "<section class=\"dl-sec\" data-actions=\"1\"><h3>" + esc(tx(lang, "Action items", "Tareas")) +
        "</h3><p class=\"dl-note\">" + esc(tx(lang, "No action items.", "No hay tareas.")) + "</p></section>";
    }
    var rows = items.map(function (item) {
      var state = itemState(item, today);
      var what = lang === "es" ? item.whatEs : item.whatEn;
      var done = state === "done";
      var token = item.id != null ? "db:" + String(item.id).replace(/[^0-9]/g, "") : "ex:" + day.hotel + ":" + day.workDate + ":" + item.itemNo;
      var noteKey = item.id != null ? "db-" + String(item.id).replace(/[^0-9]/g, "") : String(item.itemNo);
      var box = done ? "<span class=\"dl-done\">" + esc(tx(lang, "Done", "Listo")) + "</span>"
        : "<button type=\"button\" class=\"btn\" onclick=\"dlCheck('" + token + "')\">" + esc(tx(lang, "Check off", "Marcar listo")) + "</button>";
      var note = done && item.note ? "<p class=\"dl-note\">" + esc(item.note) + "</p>" : "";
      var whoWhen = done && item.checkedByName ? "<p class=\"dl-note\">" + esc(item.checkedByName) + "</p>" : "";
      var field = done ? "" : "<label class=\"dl-note\">" + esc(tx(lang, "Note (optional)", "Nota (opcional)")) +
        "<input id=\"dl-note-" + noteKey + "\" maxlength=\"240\"></label>";
      var badge = state === "overdue" ? "<span class=\"dl-badge dl-bad\">" + esc(tx(lang, "Overdue", "Atrasada")) + "</span>" : "";
      return "<li data-kind=\"" + esc(item.kind) + "\" data-state=\"" + state + "\"><p><b>" + item.itemNo + ". " +
        esc(item.who) + "</b> " + badge + "</p><p>" + esc(what) + "</p><p class=\"dl-note\">" +
        esc(tx(lang, "By end of day", "Al final del día")) + " " + esc(pretty(item.dueOn, lang)) + "</p>" +
        whoWhen + note + field + box + "</li>";
    }).join("");
    var flags = items.filter(function (item) { return item.kind !== "five_minute_checkin"; }).length;
    var quiet = flags === 0 ? "<p class=\"dl-note\" data-no-flags=\"1\">" + esc(tx(lang, "No exception flags. The 5-minute check-in is still on the list.", "Sin excepciones. El check-in de 5 minutos sigue en la lista.")) + "</p>" : "";
    return "<section class=\"dl-sec\" data-actions=\"1\"><h3>" + esc(tx(lang, "Action items", "Tareas")) +
      "</h3>" + quiet + "<ol class=\"dl-items\">" + rows + "</ol></section>";
  }
  function dayHtml(bundle, hotel, date, lang, today) {
    var day = dayFor(bundle, hotel, date);
    var sold = roomsFor(bundle, hotel, date);
    var week = wtd(bundle, hotel, date);
    var headline = day && day.loaded ? winLoss(day.totals.actual, day.totals.plan, lang) : { text: "—", tone: "none" };
    var weekHeadline = winLoss(week.actual, week.plan, lang);
    var banner = bundle.origin === "example"
      ? "<p class=\"dl-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
        esc(tx(lang, "Sample figures for this demo. Not a live Hotel Effectiveness file.", "Cifras de ejemplo para esta demostración. No es un archivo real de Hotel Effectiveness.")) + "</p>"
      : "";
    var kpis = "<div class=\"dl-k\"><div><b class=\"dl-" + headline.tone + "\">" + esc(headline.text) + "</b><span>" +
      esc(tx(lang, "Win / loss", "A favor / de más")) + "</span></div><div><b>" + esc(sold == null ? "—" : String(sold)) +
      "</b><span>" + esc(tx(lang, "Rooms sold", "Cuartos vendidos")) + "</span></div><div><b>" +
      esc(week.rooms == null ? "—" : String(week.rooms)) + "</b><span>" + esc(tx(lang, "Rooms sold WTD", "Cuartos vendidos, semana")) +
      "</span></div><div><b class=\"dl-" + weekHeadline.tone + "\">" + esc(weekHeadline.text) + "</b><span>" +
      esc(tx(lang, "Win / loss WTD", "Semana a la fecha")) + "</span></div></div>";
    if (!day || !day.loaded) {
      return banner + kpis + "<p class=\"dl-missing\" data-empty=\"1\">" +
        esc(tx(lang, "No labor file for this day.", "No hay archivo de labor para este día.")) + "</p>";
    }
    var overall = "<section class=\"dl-sec\" data-group=\"overall\"><h3>" + esc(tx(lang, "Overall", "Total")) +
      "</h3><div class=\"dl-scroll\"><table class=\"dl-t\">" + tableHead(lang) +
      hoursRow(tx(lang, "Daily total", "Total del día"), day.totals.actual, day.totals.plan, day.totals.scheduled) +
      "</table></div></section>";
    var hidden = "<p class=\"dl-note\">" + esc(tx(lang, "Maintenance and Prop Ops are not on this daily view.", "Mantenimiento y Prop Ops no aparecen en esta vista diaria.")) + "</p>";
    return banner + kpis + hidden + overall +
      sectionTable(tx(lang, "Front desk", "Recepción"), groupRows(day, "front_desk"), lang, tx(lang, "No front desk line.", "No hay línea de recepción.")) +
      housekeepingSection(day, lang) +
      sectionTable(tx(lang, "Other positions", "Otros puestos"), groupRows(day, "other"), lang, tx(lang, "No other positions.", "No hay otros puestos.")) +
      overplanSection(day, lang) + checkList(day, lang, today);
  }
  function rollupHtml(bundle, lang, today, date) {
    var rows = HOTELS.map(function (hotel) {
      if (!enabled(bundle, hotel)) {
        return "<tr data-hotel=\"" + hotel + "\" data-enabled=\"0\"><td>" + esc(NAMES[hotel]) + " <small>" + hotel +
          "</small></td><td colspan=\"4\">" + esc(tx(lang, "Not added yet", "Aún no agregado")) + "</td></tr>";
      }
      var day = dayFor(bundle, hotel, date);
      var gap = day && day.loaded ? winLoss(day.totals.actual, day.totals.plan, lang).text : "—";
      var sold = roomsFor(bundle, hotel, date);
      var count = counts(bundle.days, hotel, today);
      return "<tr data-hotel=\"" + hotel + "\" data-enabled=\"1\"><td><button type=\"button\" class=\"dl-jump\" onclick=\"dlHotel('" +
        hotel + "')\">" + esc(NAMES[hotel]) + "</button><br><small>" + hotel + "</small></td><td>" + esc(gap) +
        "</td><td class=\"num\">" + esc(sold == null ? "—" : String(sold)) + "</td><td class=\"num\">" + count.open +
        "</td><td class=\"num\">" + count.overdue + "</td></tr>";
    }).join("");
    var banner = bundle.origin === "example"
      ? "<p class=\"dl-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
        esc(tx(lang, "Sample rollup. SpringHill and Hampton are not on daily labor yet.", "Resumen de ejemplo. SpringHill y Hampton aún no están en labor diaria.")) + "</p>"
      : "";
    return banner + "<div class=\"dl-scroll\"><table class=\"dl-t\"><tr><th>" + esc(tx(lang, "Hotel", "Hotel")) +
      "</th><th>" + esc(tx(lang, "Win / loss", "A favor / de más")) + "</th><th>" + esc(tx(lang, "Rooms sold", "Cuartos vendidos")) +
      "</th><th>" + esc(tx(lang, "Open", "Abiertas")) + "</th><th>" + esc(tx(lang, "Overdue", "Atrasadas")) +
      "</th></tr>" + rows + "</table></div>";
  }
  function pageHtml(bundle, actor, view) {
    bundle = bundle || { days: [], occupancy: [], hotels: {}, origin: "example", today: chicagoDate() };
    view = view || {};
    var lang = view.lang === "es" ? "es" : "en";
    var today = view.today || bundle.today || chicagoDate();
    var hotels = hotelsFor(actor && actor.role, actor && actor.hotel);
    if (!hotels.length) return "<section class=\"dl\" id=\"dlRoot\" hidden></section>";
    var date = /^\d{4}-\d{2}-\d{2}$/.test(view.date || "") ? view.date : addDays(today, -1);
    var hotel = hotels.indexOf(view.hotel) >= 0 ? view.hotel : (norm(actor.role) === "Above Property" ? "" : hotels[0]);
    var example = bundle.origin === "example" ? " data-example=\"1\"" : "";
    var picker = "<label class=\"dl-date\">" + esc(tx(lang, "Work date", "Fecha de trabajo")) +
      "<input type=\"date\" value=\"" + esc(date) + "\" onchange=\"dlDate(this.value)\"></label>";
    var back = hotel && norm(actor.role) === "Above Property"
      ? "<button type=\"button\" class=\"btn2\" onclick=\"dlHotel('')\">" + esc(tx(lang, "All hotels", "Todos los hoteles")) + "</button>"
      : "";
    var body = !hotel ? rollupHtml(bundle, lang, today, date) : dayHtml(bundle, hotel, date, lang, today);
    return "<section class=\"dl\" id=\"dlRoot\"" + example + " data-date=\"" + esc(date) + "\"><h2>" +
      esc(tx(lang, "Daily labor", "Labor del día")) + "</h2>" + picker + back + body + "</section>";
  }
  function homeCard(bundle, actor, lang, today) {
    var hotels = hotelsFor(actor && actor.role, actor && actor.hotel);
    if (!hotels.length) return "";
    lang = lang === "es" ? "es" : "en";
    today = today || (bundle && bundle.today) || chicagoDate();
    var mine = (bundle.days || []).filter(function (day) { return hotels.indexOf(day.hotel) >= 0; });
    var count = counts(mine, "", today);
    var example = bundle.origin === "example"
      ? "<p class=\"dl-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span></p>"
      : "";
    var line;
    if (!mine.length && count.open + count.overdue === 0) {
      line = "<p class=\"dl-note\" data-empty=\"1\">" + esc(tx(lang, "No labor file yet.", "Aún no hay archivo de labor.")) + "</p>";
    } else {
      line = "<p class=\"dl-count\" data-open=\"" + count.open + "\" data-overdue=\"" + count.overdue + "\"><b>" +
        count.open + "</b> " + esc(tx(lang, "open", "abiertas")) + " · <b>" + count.overdue + "</b> " +
        esc(tx(lang, "overdue", "atrasadas")) + "</p>";
    }
    return "<section class=\"dl-home\" id=\"dlHome\">" + example + "<h3>" + esc(tx(lang, "Daily labor", "Labor del día")) +
      "</h3>" + line + "<button type=\"button\" class=\"btn dl-wide\" onclick=\"dlOpen()\">" +
      esc(tx(lang, "Open daily labor", "Abrir labor del día")) + "</button></section>";
  }

  var api = {
    HOTELS: HOTELS,
    NAMES: NAMES,
    norm: norm,
    canSee: canSee,
    hotelsFor: hotelsFor,
    demoUi: demoUi,
    chicagoDate: chicagoDate,
    addDays: addDays,
    mondayOf: mondayOf,
    itemState: itemState,
    counts: counts,
    wtd: wtd,
    winLoss: winLoss,
    roomsFor: roomsFor,
    buildExample: buildExample,
    applyCheck: applyCheck,
    pageHtml: pageHtml,
    homeCard: homeCard,
    positionGroup: positionGroup
  };
  root.DailyLabor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  var liveState = "";
  var liveBundle = null;
  var demoBundle = null;

  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return me ? { role: me.role, hotel: me.hotel || "", name: me.name || "" } : { role: "", hotel: "", name: "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function pageState() {
    var today = chicagoDate(new Date().toISOString());
    var date = addDays(today, -1);
    var hotel = "";
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(S.dlDate || "")) date = S.dlDate;
      if (HOTELS.indexOf(S.dlHotel) >= 0 || S.dlHotel === "") hotel = S.dlHotel || "";
    } catch (e) {}
    var actor = actorNow();
    if (norm(actor.role) !== "Above Property") hotel = actor.hotel;
    return { lang: langNow(), date: date, hotel: hotel, today: today };
  }
  function currentExample() {
    if (!demoBundle) demoBundle = buildExample(new Date().toISOString());
    return demoBundle;
  }
  function mapLive(pack) {
    var byKey = {};
    (pack.days || []).forEach(function (row) {
      var key = row.hotel_id + "|" + String(row.work_date).slice(0, 10);
      byKey[key] = {
        id: row.id,
        hotel: row.hotel_id,
        workDate: String(row.work_date).slice(0, 10),
        dueOn: String(row.due_on || "").slice(0, 10),
        roomsSold: num(row.rooms_sold),
        loaded: true,
        positions: [],
        housekeeping: [],
        overplan: [],
        items: [],
        totals: { actual: num(row.actual_hours), plan: num(row.plan_hours), scheduled: num(row.scheduled_hours) }
      };
    });
    (pack.positions || []).forEach(function (row) {
      var day = byKey[row.hotel_id + "|" + String(row.work_date).slice(0, 10)];
      if (!day) return;
      day.positions.push({
        position: row.position_label,
        actual: num(row.actual_hours),
        plan: num(row.plan_hours),
        scheduled: num(row.scheduled_hours),
        group: row.include_in_daily === false ? "excluded" : positionGroup(row.position_label)
      });
    });
    (pack.housekeeping || []).forEach(function (row) {
      var day = byKey[row.hotel_id + "|" + String(row.work_date).slice(0, 10)];
      if (!day) return;
      day.housekeeping.push({
        name: row.display_name,
        position: row.position_label,
        hours: num(row.hours),
        cleans: row.cleans == null ? null : Number(row.cleans),
        mprActual: num(row.mpr_actual),
        mprTarget: num(row.mpr_target),
        supervisor: !!row.is_supervisor
      });
    });
    (pack.overplan || []).forEach(function (row) {
      var day = byKey[row.hotel_id + "|" + String(row.work_date).slice(0, 10)];
      if (!day) return;
      day.overplan.push({
        name: row.display_name,
        position: row.position_label,
        actual: num(row.actual_hours),
        plan: num(row.plan_hours),
        scheduled: num(row.scheduled_hours),
        variance: num(row.variance_hours),
        planScope: row.plan_scope,
        scheduledScope: row.scheduled_scope
      });
    });
    (pack.actions || []).forEach(function (row) {
      var day = byKey[row.hotel_id + "|" + String(row.work_date).slice(0, 10)];
      if (!day) return;
      day.items.push({
        id: row.id,
        itemNo: row.item_no,
        kind: row.kind,
        who: row.who_name,
        whatEn: row.what_en,
        whatEs: row.what_es,
        dueOn: String(row.due_on || "").slice(0, 10),
        status: row.status,
        note: row.check_note || "",
        checkedAt: row.checked_at || ""
      });
    });
    var hotels = {};
    (pack.meta || []).forEach(function (row) {
      hotels[row.hotel_id] = { enabled: !!row.enabled, hePropertyId: row.he_property_id || "", name: NAMES[row.hotel_id] || row.hotel_id };
    });
    HOTELS.forEach(function (code) {
      if (!hotels[code]) hotels[code] = { enabled: code === "MSPWE", hePropertyId: code === "MSPWE" ? "118172" : "", name: NAMES[code] };
    });
    return {
      origin: "live",
      today: chicagoDate(new Date().toISOString()),
      days: Object.keys(byKey).map(function (key) { return byKey[key]; }),
      occupancy: (pack.occupancy || []).map(function (row) {
        return { hotel: row.hotel_id, date: String(row.occ_date).slice(0, 10), roomsSold: num(row.occupied_rooms) };
      }),
      hotels: hotels
    };
  }
  function ensureLive() {
    if (demoUi()) return;
    if (liveState === "loading" || liveState === "ready" || liveState === "empty" || liveState === "error") return;
    var today = chicagoDate(new Date().toISOString());
    var from = addDays(today, -21);
    if (typeof useRemote !== "function" || !useRemote() || typeof sb === "undefined" || !sb) {
      liveState = "empty";
      liveBundle = { origin: "live", today: today, days: [], occupancy: [], hotels: {} };
      return;
    }
    liveState = "loading";
    var actor = actorNow();
    var hotels = hotelsFor(actor.role, actor.hotel);
    function scoped(query) {
      if (hotels.length === 1) return query.eq("hotel_id", hotels[0]);
      return query.in("hotel_id", hotels);
    }
    Promise.all([
      scoped(sb.from("labor_daily_days").select("id,hotel_id,work_date,due_on,rooms_sold,actual_hours,plan_hours,scheduled_hours").gte("work_date", from).lte("work_date", today)).limit(400),
      scoped(sb.from("labor_daily_positions").select("hotel_id,work_date,position_label,actual_hours,plan_hours,scheduled_hours,include_in_daily").gte("work_date", from).lte("work_date", today)).limit(2000),
      scoped(sb.from("labor_daily_housekeeping").select("hotel_id,work_date,display_name,position_label,hours,cleans,mpr_actual,mpr_target,is_supervisor").gte("work_date", from).lte("work_date", today)).limit(2000),
      scoped(sb.from("labor_daily_overplan").select("hotel_id,work_date,display_name,position_label,actual_hours,plan_hours,scheduled_hours,variance_hours,plan_scope,scheduled_scope").gte("work_date", from).lte("work_date", today)).limit(2000),
      scoped(sb.from("labor_daily_actions").select("id,hotel_id,work_date,item_no,kind,who_name,what_en,what_es,due_on,status,check_note,checked_at").gte("work_date", from).lte("work_date", today)).limit(2000),
      scoped(sb.from("daily_occupancy").select("hotel_id,occ_date,occupied_rooms,source").eq("source", "actual").gte("occ_date", from).lte("occ_date", today)).limit(400),
      sb.from("labor_daily_hotels").select("hotel_id,he_property_id,enabled")
    ]).then(function (parts) {
      if (parts.some(function (part) { return part && part.error; })) {
        liveState = "error";
        liveBundle = { origin: "live", today: today, days: [], occupancy: [], hotels: {} };
      } else {
        liveBundle = mapLive({
          days: parts[0].data || [],
          positions: parts[1].data || [],
          housekeeping: parts[2].data || [],
          overplan: parts[3].data || [],
          actions: parts[4].data || [],
          occupancy: parts[5].data || [],
          meta: parts[6].data || []
        });
        liveState = liveBundle.days.length ? "ready" : "empty";
      }
      try { render(); } catch (e) {}
    }, function () {
      liveState = "error";
      liveBundle = { origin: "live", today: today, days: [], occupancy: [], hotels: {} };
      try { render(); } catch (e2) {}
    });
  }
  function bootPage() {
    var actor = actorNow();
    if (!canSee(actor.role)) return "<section class=\"dl\" id=\"dlRoot\" hidden></section>";
    var view = pageState();
    if (!demoUi()) {
      ensureLive();
      if (liveState === "loading" || liveState === "") {
        return "<section class=\"dl\" id=\"dlRoot\"><h2>" + esc(tx(view.lang, "Daily labor", "Labor del día")) +
          "</h2><p class=\"dl-note\">" + esc(tx(view.lang, "Loading the morning labor file.", "Cargando el archivo de labor de la mañana.")) + "</p></section>";
      }
      var html = pageHtml(liveBundle || { origin: "live", today: view.today, days: [], occupancy: [], hotels: {} }, actor, view);
      if (liveState === "error") {
        html = html.replace("</h2>", "</h2><p class=\"dl-note\">" + esc(tx(view.lang, "Couldn't load daily labor.", "No se pudo cargar la labor diaria.")) + "</p>");
      }
      return html;
    }
    return pageHtml(currentExample(), actor, view);
  }
  function homeHtml() {
    var actor = actorNow();
    if (!canSee(actor.role)) return "";
    var lang = langNow();
    if (!demoUi()) {
      ensureLive();
      if (liveState === "loading" || liveState === "") {
        return "<section class=\"dl-home\" id=\"dlHome\"><h3>" + esc(tx(lang, "Daily labor", "Labor del día")) +
          "</h3><p class=\"dl-note\">" + esc(tx(lang, "Loading the morning labor file.", "Cargando el archivo de labor de la mañana.")) + "</p></section>";
      }
      return homeCard(liveBundle || { origin: "live", today: chicagoDate(new Date().toISOString()), days: [] }, actor, lang);
    }
    var bundle = currentExample();
    return homeCard(bundle, actor, lang, bundle.today);
  }
  api.homeHtml = homeHtml;
  api.mapLive = mapLive;
  if (typeof document === "undefined") return;

  root.dlOpen = function () {
    if (!canSee(actorNow().role)) return;
    if (typeof go === "function") go("dlabor");
  };
  root.dlDate = function (value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return;
    if (!canSee(actorNow().role)) return;
    try { S.dlDate = value; if (typeof save === "function") save(); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.dlHotel = function (hotel) {
    var actor = actorNow();
    if (norm(actor.role) !== "Above Property") return;
    if (hotel && HOTELS.indexOf(hotel) < 0) return;
    try { S.dlHotel = hotel || ""; if (typeof save === "function") save(); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.dlCheck = function (token) {
    var actor = actorNow();
    if (!canSee(actor.role)) return;
    var note = "";
    var match = /^ex:(MSPWE|MSPAM|MSPMS):(\d{4}-\d{2}-\d{2}):(\d+)$/.exec(String(token || ""));
    var db = /^db:(\d+)$/.exec(String(token || ""));
    if (match) {
      var field = document.getElementById("dl-note-" + match[3]);
      note = field ? String(field.value || "").slice(0, 240) : "";
      if (!demoUi()) return;
      var bundle = currentExample();
      bundle.days = bundle.days.map(function (day) {
        if (day.hotel !== match[1] || day.workDate !== match[2]) return day;
        return applyCheck(day, Number(match[3]), actor, note, new Date().toISOString());
      });
      if (typeof render === "function") render();
      return;
    }
    if (!db || demoUi() || typeof sb === "undefined" || !sb || !sb.rpc) return;
    var itemField = document.getElementById("dl-note-db-" + db[1]);
    note = itemField ? String(itemField.value || "").slice(0, 240) : "";
    sb.rpc("check_labor_action_item", { p_id: Number(db[1]), p_note: note }).then(function (res) {
      if (res && res.error) return;
      if (liveBundle) {
        liveBundle.days.forEach(function (day) {
          (day.items || []).forEach(function (item) {
            if (Number(item.id) === Number(db[1])) {
              item.status = "done";
              item.note = note;
              item.checkedByName = actor.name || "";
            }
          });
        });
      }
      if (typeof render === "function") render();
    });
  };

  if (typeof M !== "undefined") M.dlabor = ["🕒", "Daily labor"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Daily labor"] = "Labor del día";
  if (typeof V !== "undefined") V.dlabor = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = actorNow();
      var show = canSee(actor.role || role);
      if (show && list.indexOf("dlabor") < 0) list.splice(Math.min(2, list.length), 0, "dlabor");
      if (!show) list = list.filter(function (id) { return id !== "dlabor"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("dlabor") < 0) RSEC[4][2].push("dlabor"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("dlabor") < 0) NOCOLS.push("dlabor"); } catch (e2) {}

  var style = document.createElement("style");
  style.textContent = [
    ".dl-home{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".dl-home h3,.dl h2,.dl-sec h3{margin:0 0 6px}",
    ".dl-sec{margin:12px 0}",
    ".dl-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".dl-count b{font-size:18px}",
    ".dl-wide{width:100%;margin-top:8px}",
    ".dl-k{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:8px 0}",
    ".dl-k div{background:#eef3fa;border-radius:8px;padding:8px}",
    ".dl-k b{display:block;font-size:16px}",
    ".dl-k span{display:block;color:#3c4658;font-size:12px}",
    ".dl-good{color:#15642f}",
    ".dl-bad{color:#7a1218}",
    ".dl-scroll{overflow-x:auto}",
    ".dl-t{width:100%;border-collapse:collapse;font-size:14px}",
    ".dl-t th,.dl-t td{padding:6px 4px;border-bottom:1px solid #e6ebf2;text-align:left;vertical-align:top}",
    ".dl-t .num,.dl-t th:nth-child(n+2){text-align:right}",
    ".dl-date{display:flex;flex-direction:column;font-size:13px;font-weight:700;margin:8px 0}",
    ".dl-items{list-style:none;padding:0;margin:0}",
    ".dl-items li{padding:8px 0;border-top:1px solid #e6ebf2}",
    ".dl-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800}",
    ".dl-bad{background:#fde2e1}",
    ".dl-done{color:#15642f;font-weight:800}",
    ".dl-flag{color:#8a5a00;font-weight:700}",
    ".dl-missing{background:#eef1f4;border-radius:8px;padding:8px 10px;font-weight:700}",
    ".dl-jump{background:transparent;border:0;padding:0;min-height:44px;font-weight:800;color:#14365d}",
    ".dl-note input{display:block;width:100%;margin-top:4px;font-weight:400}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
