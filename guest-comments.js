/* Guest comments, demo site only.
   Each hotel sees its own surveys and reviews. Corporate sees every hotel.
   GM and AGM clear a comment: Actioned, Not an issue, or Assign.
   Assign opens a work order or a task from the suggested action.
   Housekeeping sees room-cleanliness scores. A housekeeper sees their own
   cleanliness mentions. The executive housekeeper sees the whole team.
   Staff names come from the housekeeping board, room assignments, and the
   schedule. A missing match stays Unknown.
   Sample comments start with "Sample comment." Staff who are not in the
   example directory start with "Sample ".
   The daily Medallia pull is a stub and stays awaiting_feed.
   Live mode loads this file and does not add a menu or a card. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var TZ = "America/Chicago";
  var KEY = "jrportal_guest_comments_v1";
  var UNKNOWN = "";
  var THEMES = [
    { id: "parking", en: "Parking", es: "Estacionamiento" },
    { id: "breakfast", en: "Breakfast", es: "Desayuno" },
    { id: "cleanliness", en: "Cleanliness", es: "Limpieza" },
    { id: "maintenance", en: "Maintenance", es: "Mantenimiento" },
    { id: "wifi", en: "Wifi", es: "Wifi" },
    { id: "noise", en: "Noise", es: "Ruido" },
    { id: "front_desk", en: "Front desk", es: "Recepción" },
    { id: "praise", en: "Praise", es: "Elogio" }
  ];
  var SOURCES = {
    medallia: { en: "Medallia survey", es: "Encuesta Medallia" },
    ihg: { en: "IHG review", es: "Reseña IHG" },
    booking: { en: "Booking", es: "Booking" },
    ctrip: { en: "Ctrip", es: "Ctrip" },
    google: { en: "Google", es: "Google" },
    expedia: { en: "Expedia", es: "Expedia" }
  };
  var METRICS = [
    { id: "overall", en: "Overall Experience", es: "Experiencia general", leader: true },
    { id: "recommend", en: "Likely to Recommend", es: "Probabilidad de recomendar", leader: true },
    { id: "condition", en: "Hotel Condition", es: "Condición del hotel", leader: true },
    { id: "checkin", en: "Check-In", es: "Registro", leader: true },
    { id: "cleanliness", en: "Room Cleanliness", es: "Limpieza de la habitación", leader: false }
  ];
  var BENCH = { overall: 8.4, recommend: 8.2, condition: 8.1, checkin: 8.6, cleanliness: 8.3 };
  var ACTIONS = {
    latch: actSpec("work_order", "Open a maintenance work order for the latch plate.", "Abre una orden de mantenimiento por la placa de la cerradura."),
    mold: actSpec("work_order", "Open a maintenance work order for the mold.", "Abre una orden de mantenimiento por el moho."),
    wifi: actSpec("task", "Coach the front desk on the wifi steps.", "Orienta a recepción sobre los pasos del wifi."),
    desk: actSpec("task", "Coach the front desk on how the problem was handled.", "Orienta a recepción sobre cómo se atendió el problema."),
    praise: actSpec("task", "Send praise recognition to the staff named.", "Envía un reconocimiento a la persona mencionada."),
    breakfast: actSpec("task", "Coach the breakfast attendant on the item in the comment.", "Orienta a desayuno sobre lo que dice el comentario."),
    clean: actSpec("task", "Coach the housekeeper on the cleanliness miss.", "Orienta a la camarista sobre la falla de limpieza."),
    parking: actSpec("task", "Review the parking note with the front desk.", "Revisa la nota de estacionamiento con recepción."),
    noise: actSpec("work_order", "Open a maintenance work order for the noise.", "Abre una orden de mantenimiento por el ruido.")
  };

  function actSpec(kind, en, es) { return { kind: kind, en: en, es: es }; }
  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }
  function metricById(id) {
    for (var i = 0; i < METRICS.length; i++) if (METRICS[i].id === id) return METRICS[i];
    return null;
  }
  function normRole(role) {
    if (role === "JR Corporate" || role === "above_property" || role === "Above Property") return "Above Property";
    if (role === "hk_lead" || role === "Housekeeping") return "Housekeeping";
    if (role === "housekeeper" || role === "Housekeeper") return "Housekeeper";
    if (role === "gm" || role === "GM") return "GM";
    if (role === "agm" || role === "AGM") return "AGM";
    if (role === "front_desk" || role === "Front Desk") return "Front Desk";
    if (role === "maintenance" || role === "Maintenance") return "Maintenance";
    return role || "";
  }
  function isCorporate(role) { return normRole(role) === "Above Property"; }
  function isLeader(role) {
    role = normRole(role);
    return role === "Above Property" || role === "GM" || role === "AGM";
  }
  function isExec(role) { return normRole(role) === "Housekeeping"; }
  function isHousekeeper(role) { return normRole(role) === "Housekeeper"; }
  function isHk(role) { return isExec(role) || isHousekeeper(role); }
  function hotelsFor(role, hotel) {
    role = normRole(role);
    if (role === "Above Property") return HOTELS.slice();
    if (role === "GM" || role === "AGM" || role === "Housekeeping" || role === "Housekeeper") {
      return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
    }
    return [];
  }
  function canAct(actor, hotel) {
    actor = actor || {};
    if (!isLeader(actor.role)) return false;
    return hotelsFor(actor.role, actor.hotel).indexOf(hotel) >= 0;
  }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function addDays(iso, days) {
    var p = String(iso || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function zonedParts(now) {
    var date = now instanceof Date ? now : new Date(now);
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hourCycle: "h23"
    });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") bag[part.type] = part.value;
    });
    return { date: bag.year + "-" + bag.month + "-" + bag.day };
  }
  function checkinDate(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    return zonedParts(now || new Date()).date;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function round1(n) {
    if (n == null || !isFinite(n)) return null;
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(n) * 10 + 1e-6) / 10;
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function samePerson(a, b) {
    return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  }
  function cleanName(value) { return String(value || "").replace(/ \(EX\)$/, "").trim(); }
  function minutes(hhmm) {
    var p = String(hhmm || "").split(":");
    if (p.length < 2) return null;
    return Number(p[0]) * 60 + Number(p[1]);
  }
  function covers(shift, hhmm) {
    var start = minutes(shift.start);
    var end = minutes(shift.end);
    var at = minutes(hhmm);
    if (start == null || end == null || at == null) return false;
    if (end > start) return at >= start && at < end;
    return at >= start || at < end;
  }
  function mornings(arrival, departure) {
    var out = [];
    if (!arrival || !departure) return out;
    var day = addDays(arrival, 1);
    while (day <= departure) {
      out.push(day);
      day = addDays(day, 1);
    }
    return out;
  }
  function safeId(id) { return /^gc-[a-z0-9-]{1,48}$/.test(String(id || "")); }

  function contextFrom(input) {
    input = input || {};
    var assignments = [];
    var inspections = [];
    var shifts = [];
    (input.assignments || []).forEach(function (row) {
      var name = cleanName(row.housekeeper || row.hk);
      if (!name || !row.date) return;
      assignments.push({ hotel: row.hotel, date: String(row.date).slice(0, 10), room: String(row.room || row.n || ""), housekeeper: name });
    });
    (input.rooms || []).forEach(function (row) {
      var name = cleanName(row.hk || row.housekeeper);
      if (!name || !row.date) return;
      assignments.push({ hotel: row.hotel, date: String(row.date).slice(0, 10), room: String(row.room || row.n || ""), housekeeper: name });
    });
    (input.inspections || input.insp || []).forEach(function (row) {
      var name = cleanName(row.inspector || row.by);
      var date = String(row.date || "").slice(0, 10);
      if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      inspections.push({ hotel: row.hotel, date: date, room: String(row.room || ""), inspector: name });
    });
    (input.shifts || []).forEach(function (row) {
      var who = cleanName(row.who);
      if (!who || !row.date) return;
      shifts.push({
        hotel: row.hotel || row.scope, date: String(row.date).slice(0, 10), pos: row.pos || "",
        who: who, start: row.start || "", end: row.end || ""
      });
    });
    return { assignments: assignments, inspections: inspections, shifts: shifts };
  }
  function mergeSources(base, extra) {
    var ctx = contextFrom({
      assignments: (base && base.assignments || []).concat(extra && extra.assignments || []),
      inspections: (base && base.inspections || []).concat(extra && extra.inspections || []),
      shifts: (base && base.shifts || []).concat(extra && extra.shifts || [])
    });
    ctx.assignments.forEach(function (row, i) { row.seq = i; });
    ctx.inspections.forEach(function (row, i) { row.seq = i; });
    ctx.shifts.forEach(function (row, i) { row.seq = i; });
    return ctx;
  }
  function latest(rows) {
    var best = null;
    rows.forEach(function (row) {
      if (!best || row.date > best.date || (row.date === best.date && (row.seq || 0) >= (best.seq || 0))) best = row;
    });
    return best;
  }
  function attribute(comment, sources) {
    sources = sources || {};
    comment = comment || {};
    var room = String(comment.room || "");
    var hkHits = (sources.assignments || []).filter(function (row) {
      return row.hotel === comment.hotel && room && String(row.room) === room && row.date >= comment.arrival && row.date <= comment.departure && row.housekeeper;
    });
    var inspHits = (sources.inspections || []).filter(function (row) {
      return row.hotel === comment.hotel && room && String(row.room) === room && row.date >= comment.arrival && row.date <= comment.departure && row.inspector;
    });
    var deskHits = (sources.shifts || []).filter(function (row) {
      return row.hotel === comment.hotel && row.date === comment.arrival && row.pos === "Front Desk" && covers(row, comment.checkIn) && row.who;
    });
    var breakfast = [];
    mornings(comment.arrival, comment.departure).forEach(function (day) {
      (sources.shifts || []).forEach(function (row) {
        if (row.hotel === comment.hotel && row.date === day && row.pos === "Breakfast Attendant" && row.who && breakfast.indexOf(row.who) < 0) breakfast.push(row.who);
      });
    });
    var hk = latest(hkHits);
    var insp = latest(inspHits);
    return {
      housekeeper: hk ? hk.housekeeper : UNKNOWN,
      inspector: insp ? insp.inspector : UNKNOWN,
      frontDesk: deskHits.length ? deskHits[0].who : UNKNOWN,
      breakfast: breakfast
    };
  }
  function whoText(name, lang) { return name ? name : tx(lang, "Unknown", "Desconocido"); }
  function breakfastText(names, lang) { return names && names.length ? names.join(", ") : tx(lang, "Unknown", "Desconocido"); }

  function periodBounds(today) {
    return {
      ytd: { id: "ytd", start: today.slice(0, 4) + "-01-01", end: today },
      mtd: { id: "mtd", start: today.slice(0, 8) + "01", end: today }
    };
  }
  function average(comments, hotel, metric, start, end) {
    var vals = [];
    (comments || []).forEach(function (row) {
      if (row.hotel !== hotel || row.date < start || row.date > end) return;
      var value = row.metrics ? row.metrics[metric] : null;
      if (value == null || value === "") return;
      vals.push(Number(value));
    });
    if (!vals.length) return { actual: null, n: 0 };
    var sum = 0;
    vals.forEach(function (n) { sum += n; });
    return { actual: round1(sum / vals.length), n: vals.length };
  }
  function scoreRow(model, hotel, metric) {
    var bounds = periodBounds(model.today);
    var bench = BENCH[metric];
    function pack(bound) {
      var avg = average(model.comments, hotel, metric, bound.start, bound.end);
      return { actual: avg.actual, n: avg.n, bench: bench, gap: avg.actual == null ? null : round1(avg.actual - bench) };
    }
    return { id: metric, ytd: pack(bounds.ytd), mtd: pack(bounds.mtd) };
  }
  function isCleanMention(row) { return !!row && row.theme === "cleanliness"; }
  function mentions(model, hotel) {
    var map = {};
    (model.comments || []).forEach(function (row) {
      if (row.hotel !== hotel || !isCleanMention(row)) return;
      var name = attribute(row, model.sources).housekeeper;
      if (!name) return;
      if (!map[name]) map[name] = { name: name, praise: 0, complaint: 0 };
      if (row.tone === "praise") map[name].praise += 1;
      else map[name].complaint += 1;
    });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  }
  function mentionFor(model, hotel, name) {
    var rows = mentions(model, hotel).filter(function (row) { return samePerson(row.name, name); });
    return rows[0] || { name: name || "", praise: 0, complaint: 0 };
  }

  function statusOf(comment, actions) {
    var hit = null;
    (actions || []).forEach(function (row) { if (row && row.id === comment.id) hit = row; });
    if (!hit) return "new";
    if (hit.action === "assign") return "assigned";
    if (hit.action === "actioned" || hit.action === "not_issue") return hit.action;
    return "new";
  }
  function tally(model, hotels) {
    var fresh = 0;
    var open = 0;
    (model.comments || []).forEach(function (row) {
      if (hotels.indexOf(row.hotel) < 0) return;
      var status = statusOf(row, model.actions);
      if (status === "new") fresh += 1;
      if (status === "assigned") open += 1;
    });
    return { fresh: fresh, open: open };
  }
  function suggest(comment) {
    return ACTIONS[comment.action] || actSpec("task", "Review this comment with the team.", "Revisa este comentario con el equipo.");
  }
  function act(model, id, action, actor, now) {
    if (!safeId(id)) return { ok: false, error: "id" };
    if (action !== "actioned" && action !== "not_issue" && action !== "assign") return { ok: false, error: "action" };
    var next = clone(model);
    var comment = null;
    next.comments.forEach(function (row) { if (row.id === id) comment = row; });
    if (!comment) return { ok: false, error: "missing" };
    if (!canAct(actor, comment.hotel)) return { ok: false, error: "denied" };
    var status = statusOf(comment, next.actions);
    if (status === "actioned" || status === "not_issue") return { ok: false, error: "closed" };
    if (status === "assigned" && action === "assign") return { ok: false, error: "closed" };
    var spec = suggest(comment);
    var created = null;
    if (action === "assign") {
      created = {
        kind: spec.kind, hotel: comment.hotel, room: comment.room || "", commentId: comment.id,
        titleEn: spec.en, titleEs: spec.es, priority: Number(comment.score) > 0 && Number(comment.score) <= (comment.scoreMax === 5 ? 2 : 4) ? "High" : "Med"
      };
    }
    next.actions = (next.actions || []).filter(function (row) { return row.id !== id; });
    next.actions.push({
      id: id, action: action, kind: created ? created.kind : "", hotel: comment.hotel,
      by: actor && actor.name || "", role: actor && actor.role || "", at: now || "",
      source: "user", ref: ""
    });
    return { ok: true, model: next, created: created };
  }
  function ingestMedallia(input) {
    input = input || {};
    if (HOTELS.indexOf(input.hotel) < 0) return { ok: false, reason: "hotel", status: "failed", source: "medallia", items: [], rows: [] };
    if (input.feedDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.feedDate)) return { ok: false, reason: "date", status: "failed", source: "medallia", items: [], rows: [] };
    return { ok: true, source: "medallia", status: "awaiting_feed", hotel: input.hotel, feedDate: input.feedDate || "", items: [], rows: [] };
  }

  function row(id, hotel, when, source, score, max, room, theme, tone, action, en, es, metrics, stay) {
    return {
      id: id, hotel: hotel, when: when, source: source, score: score, scoreMax: max, room: room,
      theme: theme, tone: tone, action: action, textEn: en, textEs: es, metrics: metrics || null, stay: stay || null
    };
  }
  function stay(back, nights, checkIn, hk, inspector, desk, breakfast) {
    return { back: back, nights: nights, checkIn: checkIn, hk: hk || "", inspector: inspector || "", desk: desk || "", breakfast: breakfast || [] };
  }
  function scores(o, r, c, k, cl) { return { overall: o, recommend: r, condition: c, checkin: k, cleanliness: cl }; }
  function allScores(n) { return scores(n, n, n, n, n); }
  function whenDate(today, when) {
    if (typeof when === "number") return addDays(today, when);
    var iso = today.slice(0, 4) + "-" + when;
    return iso <= today ? iso : "";
  }
  function pushShift(bag, hotel, date, pos, who, start, end) {
    if (!who || !date) return;
    bag.shifts.push({ hotel: hotel, date: date, pos: pos, who: who, start: start, end: end });
  }
  function addStaff(bag, comment, stayRow) {
    if (!stayRow) return;
    if (comment.room && stayRow.hk) {
      var day = comment.arrival;
      while (day && comment.departure && day <= comment.departure) {
        bag.assignments.push({ hotel: comment.hotel, date: day, room: String(comment.room), housekeeper: stayRow.hk });
        day = addDays(day, 1);
      }
    }
    if (comment.room && stayRow.inspector && comment.arrival) {
      bag.inspections.push({ hotel: comment.hotel, date: comment.arrival, room: String(comment.room), inspector: stayRow.inspector });
    }
    if (stayRow.desk) pushShift(bag, comment.hotel, comment.arrival, "Front Desk", stayRow.desk, "07:00", "15:00");
    (stayRow.breakfast || []).forEach(function (name) {
      mornings(comment.arrival, comment.departure).forEach(function (morning) {
        pushShift(bag, comment.hotel, morning, "Breakfast Attendant", name, "05:30", "13:30");
      });
    });
  }
  function buildDemo(now) {
    var today = checkinDate(now);
    var specs = [
      row("gc-mspwe-latch", "MSPWE", -1, "medallia", 4, 10, "214", "maintenance", "complaint", "latch",
        "Sample comment. The door latch plate is loose.",
        "Comentario de ejemplo. La placa de la cerradura de la puerta está suelta.",
        scores(9, 9, 8, 9, 9), stay(2, 2, "14:20", "Maria Alvarez", "Grace Patel", "Jordan Lee", ["Joy Adams"])),
      row("gc-mspwe-mold", "MSPWE", -2, "ihg", 3, 10, "118", "maintenance", "complaint", "mold",
        "Sample comment. There is mold by the bathroom vent.",
        "Comentario de ejemplo. Hay moho junto al extractor del baño.",
        scores(7, 9, 6, 7, 7), stay(2, 2, "22:10", "Sample Attendant Ortiz", "", "Jordan Lee", ["Joy Adams"])),
      row("gc-mspwe-breakfast", "MSPWE", -3, "ctrip", 3, 5, "301", "breakfast", "complaint", "breakfast",
        "Sample comment. The eggs were cold.",
        "Comentario de ejemplo. Los huevos estaban fríos.",
        null, stay(1, 1, "08:00", "", "", "Jordan Lee", ["Joy Adams"])),
      row("gc-mspwe-clean", "MSPWE", -4, "medallia", 5, 10, "204", "cleanliness", "complaint", "clean",
        "Sample comment. Hair was left in the tub.",
        "Comentario de ejemplo. Quedó cabello en la tina.",
        null, stay(2, 2, "14:00", "Maria Alvarez", "Grace Patel", "Jordan Lee", ["Joy Adams"])),
      row("gc-mspwe-ortiz", "MSPWE", -5, "google", 2, 5, "208", "cleanliness", "complaint", "clean",
        "Sample comment. The floor was not vacuumed.",
        "Comentario de ejemplo. El piso no estaba aspirado.",
        null, stay(1, 1, "14:00", "Sample Attendant Ortiz", "", "", [])),
      row("gc-mspwe-parking", "MSPWE", -6, "expedia", 2, 5, "", "parking", "complaint", "parking",
        "Sample comment. The sample lot was full.",
        "Comentario de ejemplo. El estacionamiento de ejemplo estaba lleno.",
        null, null),
      row("gc-mspwe-thanks", "MSPWE", -7, "google", 5, 5, "", "praise", "praise", "praise",
        "Sample comment. Jordan Lee made the sample arrival easy.",
        "Comentario de ejemplo. Jordan Lee hizo fácil la llegada de ejemplo.",
        null, stay(0, 0, "10:00", "", "", "Jordan Lee", [])),
      row("gc-mspwe-noise", "MSPWE", -8, "ihg", 6, 10, "210", "noise", "complaint", "noise",
        "Sample comment. The sample unit was loud at night.",
        "Comentario de ejemplo. El equipo de ejemplo hizo ruido en la noche.",
        null, stay(2, 2, "14:00", "Maria Alvarez", "", "Jordan Lee", [])),
      row("gc-mspwe-desk", "MSPWE", -9, "medallia", 4, 10, "112", "front_desk", "complaint", "desk",
        "Sample comment. The desk did not explain the charge.",
        "Comentario de ejemplo. Recepción no explicó el cargo.",
        null, stay(1, 1, "09:00", "", "", "Jordan Lee", [])),
      row("gc-mspwe-wifi", "MSPWE", -20, "booking", 6, 10, "220", "wifi", "complaint", "wifi",
        "Sample comment. The wifi code from the desk did not work.",
        "Comentario de ejemplo. El código de wifi de recepción no funcionó.",
        scores(8, 8, 8, 8, 8), null),
      row("gc-mspwe-praise", "MSPWE", "01-18", "medallia", 10, 10, "105", "cleanliness", "praise", "praise",
        "Sample comment. Maria Alvarez left the room spotless.",
        "Comentario de ejemplo. Maria Alvarez dejó el cuarto impecable.",
        scores(8, 8, 8, 10, 6), stay(2, 2, "14:10", "Maria Alvarez", "Grace Patel", "Jordan Lee", ["Joy Adams"])),
      row("gc-mspam-score", "MSPAM", -1, "medallia", 9, 10, "110", "cleanliness", "praise", "praise",
        "Sample comment. Rosa Vega left the room spotless.",
        "Comentario de ejemplo. Rosa Vega dejó el cuarto impecable.",
        allScores(9), stay(2, 2, "14:00", "Rosa Vega", "Nina Shah", "Kim Nguyen", ["Joy Parker"])),
      row("gc-mspam-old", "MSPAM", -40, "booking", 7, 10, "", "parking", "complaint", "parking",
        "Sample comment. The sample lot gate stuck.",
        "Comentario de ejemplo. La puerta de ejemplo del estacionamiento se atascó.",
        allScores(7), null),
      row("gc-mspam-wifi", "MSPAM", -2, "booking", 5, 10, "214", "wifi", "complaint", "wifi",
        "Sample comment. Wifi dropped in the sample room.",
        "Comentario de ejemplo. El wifi se cortó en el cuarto de ejemplo.",
        null, null),
      row("gc-mspam-latch", "MSPAM", -3, "ihg", 4, 10, "118", "maintenance", "complaint", "latch",
        "Sample comment. The latch plate sticks.",
        "Comentario de ejemplo. La placa de la cerradura se atora.",
        null, stay(2, 2, "13:00", "Rosa Vega", "Nina Shah", "Kim Nguyen", ["Joy Parker"])),
      row("gc-mspms-score", "MSPMS", -1, "medallia", 6, 10, "118", "maintenance", "complaint", "mold",
        "Sample comment. Mold showed by the sample vent.",
        "Comentario de ejemplo. Apareció moho junto al extractor de ejemplo.",
        allScores(6), stay(2, 2, "14:00", "Ana Lopez", "Grace Kim", "Tess Brown", ["Joy Bennett"])),
      row("gc-mspms-old", "MSPMS", "02-10", "google", 4, 5, "204", "cleanliness", "complaint", "clean",
        "Sample comment. The tub was not wiped.",
        "Comentario de ejemplo. La tina no estaba limpia.",
        allScores(8), stay(1, 1, "14:00", "Ana Lopez", "Grace Kim", "Tess Brown", ["Joy Bennett"])),
      row("gc-mspms-wifi", "MSPMS", -3, "ctrip", 3, 5, "222", "wifi", "complaint", "wifi",
        "Sample comment. The sample wifi code failed.",
        "Comentario de ejemplo. El código de wifi de ejemplo falló.",
        null, null)
    ];
    var comments = [];
    var bag = { assignments: [], inspections: [], shifts: [] };
    specs.forEach(function (spec) {
      var date = whenDate(today, spec.when);
      if (!date) return;
      var comment = {
        id: spec.id, hotel: spec.hotel, date: date, source: spec.source, score: spec.score, scoreMax: spec.scoreMax,
        room: spec.room, theme: spec.theme, tone: spec.tone, action: spec.action,
        textEn: spec.textEn, textEs: spec.textEs, metrics: spec.metrics,
        arrival: "", departure: "", checkIn: ""
      };
      if (spec.stay) {
        comment.arrival = addDays(date, -spec.stay.back);
        comment.departure = addDays(comment.arrival, spec.stay.nights);
        comment.checkIn = spec.stay.checkIn;
      }
      addStaff(bag, comment, spec.stay);
      comments.push(comment);
    });
    comments.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? -1 : 1); });
    return {
      today: today,
      now: typeof now === "string" ? now : new Date(now || Date.now()).toISOString(),
      comments: comments,
      sources: mergeSources(bag, null),
      actions: [
        { id: "gc-mspwe-noise", action: "actioned", kind: "", hotel: "MSPWE", by: "Avery Cole", role: "GM", at: today + "T14:00:00.000Z", source: "sample", ref: "" },
        { id: "gc-mspwe-desk", action: "assign", kind: "task", hotel: "MSPWE", by: "Avery Cole", role: "GM", at: today + "T14:05:00.000Z", source: "sample", ref: "sample-task" }
      ],
      feed: { source: "medallia", status: "awaiting_feed" }
    };
  }

  function fmtScore(n) { return n == null ? "—" : round1(n).toFixed(1); }
  function fmtGap(n) {
    if (n == null || !isFinite(n)) return "—";
    var text = round1(n).toFixed(1);
    return Number(text) > 0 ? "+" + text : text;
  }
  function fmtDate(iso, lang) {
    var months = lang === "es"
      ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var p = String(iso || "").split("-");
    return months[(Number(p[1]) || 1) - 1] + " " + Number(p[2] || 1);
  }
  function sourceLabel(id, lang) {
    var row = SOURCES[id];
    return row ? tx(lang, row.en, row.es) : id;
  }
  function themeLabel(id, lang) {
    var row = themeById(id);
    return row ? tx(lang, row.en, row.es) : id;
  }
  function metricLabel(id, lang) {
    var row = metricById(id);
    return row ? tx(lang, row.en, row.es) : id;
  }
  function statusLabel(status, lang) {
    if (status === "new") return tx(lang, "New", "Nuevo");
    if (status === "assigned") return tx(lang, "Assigned", "Asignado");
    if (status === "actioned") return tx(lang, "Actioned", "Atendido");
    if (status === "not_issue") return tx(lang, "Not an issue", "No es problema");
    return status;
  }
  function commentText(row, lang) { return lang === "es" ? row.textEs : row.textEn; }
  function scoreText(row) { return row.score == null ? "" : String(row.score) + "/" + String(row.scoreMax || 10); }
  function roomText(row, lang) {
    return row.room ? tx(lang, "Room", "Cuarto") + " " + row.room : tx(lang, "Room unknown", "Cuarto desconocido");
  }
  function staffLine(comment, sources, lang) {
    var who = attribute(comment, sources);
    return [
      tx(lang, "Housekeeper", "Camarista") + " " + whoText(who.housekeeper, lang),
      tx(lang, "Inspector", "Inspector") + " " + whoText(who.inspector, lang),
      tx(lang, "Front desk", "Recepción") + " " + whoText(who.frontDesk, lang),
      tx(lang, "Breakfast", "Desayuno") + " " + breakfastText(who.breakfast, lang)
    ];
  }
  function gapClass(n) { return n == null ? "" : (n < 0 ? "gc-gap-down" : "gc-gap-up"); }
  function periodBits(pack, lang) {
    return "<b>" + esc(fmtScore(pack.actual)) + "</b> " +
      "<span>" + esc(tx(lang, "Benchmark", "Referencia")) + " " + esc(fmtScore(pack.bench)) + "</span> " +
      "<span class=\"" + gapClass(pack.gap) + "\">" + esc(tx(lang, "Gap", "Brecha")) + " " + esc(fmtGap(pack.gap)) + "</span>";
  }
  function metricBlock(model, hotels, metric, lang) {
    var cards = hotels.map(function (hotel) {
      var pack = scoreRow(model, hotel, metric);
      var head = hotels.length > 1 ? "<h4>" + esc(hotel) + "</h4>" : "";
      return "<article class=\"gc-hotel\">" + head +
        "<p><span>" + esc(tx(lang, "YTD", "Año")) + "</span> " + periodBits(pack.ytd, lang) + "</p>" +
        "<p><span>" + esc(tx(lang, "MTD", "Mes")) + "</span> " + periodBits(pack.mtd, lang) + "</p></article>";
    }).join("");
    return "<section class=\"gc-metric\"><h3>" + esc(metricLabel(metric, lang)) + "</h3><div class=\"gc-hotels\">" + cards + "</div></section>";
  }
  function scoresCard(model, actor, lang) {
    lang = lang === "es" ? "es" : "en";
    if (!isLeader(actor && actor.role)) return "";
    var hotels = hotelsFor(actor.role, actor.hotel).filter(featureOn);
    if (!hotels.length) return "";
    var body = METRICS.filter(function (row) { return row.leader; }).map(function (row) {
      return metricBlock(model, hotels, row.id, lang);
    }).join("");
    return "<section class=\"gc-scores\" id=\"gcScores\"><div class=\"gc-line\"><h3>" + esc(tx(lang, "Guest scores", "Calificaciones de huéspedes")) + "</h3></div>" +
      "<p class=\"gc-note\">" + esc(tx(lang, "Year to date and month to date, next to the brand benchmark.", "Año y mes, junto a la referencia de la marca.")) + "</p>" +
      body + "</section>";
  }
  function mentionText(row, lang) {
    return esc(row.name) + " · " + esc(tx(lang, "Praise", "Elogios")) + " " + row.praise + " · " + esc(tx(lang, "Complaints", "Quejas")) + " " + row.complaint;
  }
  function cleanCard(model, actor, lang) {
    lang = lang === "es" ? "es" : "en";
    if (!isHk(actor && actor.role)) return "";
    var hotels = hotelsFor(actor.role, actor.hotel).filter(featureOn);
    if (!hotels.length) return "";
    var hotel = hotels[0];
    var score = metricBlock(model, [hotel], "cleanliness", lang);
    var people = "";
    if (isExec(actor.role)) {
      var team = mentions(model, hotel);
      people = "<h4>" + esc(tx(lang, "Team cleanliness mentions", "Menciones de limpieza del equipo")) + "</h4>" +
        (team.length ? "<ul class=\"gc-team\">" + team.map(function (row) { return "<li>" + mentionText(row, lang) + "</li>"; }).join("") + "</ul>" : "<p class=\"gc-note\">" + esc(tx(lang, "No attributed cleanliness comments yet.", "Aún no hay comentarios de limpieza con nombre.")) + "</p>");
    } else {
      var mine = mentionFor(model, hotel, actor.name);
      people = "<h4>" + esc(tx(lang, "Your cleanliness mentions", "Tus menciones de limpieza")) + "</h4><p class=\"gc-count\">" +
        esc(tx(lang, "Praise", "Elogios")) + " " + mine.praise + " · " + esc(tx(lang, "Complaints", "Quejas")) + " " + mine.complaint + "</p>";
    }
    return "<section class=\"gc-clean\" id=\"gcClean\"><div class=\"gc-line\"><h3>" + esc(tx(lang, "Room Cleanliness", "Limpieza de la habitación")) + "</h3><span>" + esc(hotel) + "</span></div>" +
      score + people +
      "<button type=\"button\" class=\"btn gc-wide\" id=\"gcOpenBtn\" onclick=\"gcOpen('" + hotel + "')\">" + esc(tx(lang, "Open cleanliness comments", "Abrir comentarios de limpieza")) + "</button></section>";
  }
  function commentsCard(model, actor, lang) {
    lang = lang === "es" ? "es" : "en";
    if (!isLeader(actor && actor.role)) return "";
    var hotels = hotelsFor(actor.role, actor.hotel).filter(featureOn);
    if (!hotels.length) return "";
    var counts = tally(model, hotels);
    var hotel = hotels.length === 1 ? hotels[0] : "";
    var freshLabel = counts.fresh === 1 ? tx(lang, "new", "nuevo") : tx(lang, "new", "nuevos");
    var openLabel = counts.open === 1 ? tx(lang, "open action", "acción abierta") : tx(lang, "open actions", "acciones abiertas");
    return "<section class=\"gc-home\" id=\"gcHome\"><div class=\"gc-line\"><h3>" + esc(tx(lang, "Guest comments", "Comentarios de huéspedes")) + "</h3></div>" +
      "<p class=\"gc-note\">" + esc(counts.fresh + " " + freshLabel + " · " + counts.open + " " + openLabel) + "</p>" +
      "<button type=\"button\" class=\"btn gc-wide\" id=\"gcOpenComments\" onclick=\"gcOpen('" + hotel + "')\">" + esc(tx(lang, "Open comments", "Abrir comentarios")) + "</button></section>";
  }
  function homeCard(model, actor, lang) {
    if (isLeader(actor && actor.role)) return commentsCard(model, actor, lang) + scoresCard(model, actor, lang);
    if (isHk(actor && actor.role)) return cleanCard(model, actor, lang);
    return "";
  }
  function allowedHotels(actor) { return hotelsFor(actor && actor.role, actor && actor.hotel).filter(featureOn); }
  function visibleComments(model, actor, hotel) {
    var hotels = allowedHotels(actor);
    if (hotel && hotels.indexOf(hotel) >= 0) hotels = [hotel];
    return (model.comments || []).filter(function (row) {
      if (hotels.indexOf(row.hotel) < 0) return false;
      if (!isHk(actor.role)) return true;
      if (!isCleanMention(row)) return false;
      if (isHousekeeper(actor.role)) return samePerson(attribute(row, model.sources).housekeeper, actor.name);
      return true;
    });
  }
  function sampleNote(lang) {
    return "<p class=\"gc-note\"><span class=\"ex\">EXAMPLE</span> " + esc(tx(lang, "Sample comments for this demo. No real guests.", "Comentarios de ejemplo para esta demostración. No hay huéspedes reales.")) + "</p>";
  }
  function feedNote(lang) {
    return "<p class=\"gc-note\">" + esc(tx(lang, "Medallia daily pull: awaiting feed.", "Descarga diaria de Medallia: esperando datos.")) + "</p>";
  }
  function listItem(row, model, lang) {
    var status = statusOf(row, model.actions);
    var bits = staffLine(row, model.sources, lang).map(function (line) { return "<span>" + esc(line) + "</span>"; }).join("");
    return "<button type=\"button\" class=\"gc-row\" onclick=\"gcPick('" + row.id + "')\">" +
      "<span class=\"gc-top\"><b>" + esc(fmtDate(row.date, lang)) + "</b> <span>" + esc(sourceLabel(row.source, lang)) + "</span> <b>" + esc(scoreText(row)) + "</b> <span class=\"gc-tag\">" + esc(themeLabel(row.theme, lang)) + "</span> <span class=\"gc-badge gc-st-" + status + "\">" + esc(statusLabel(status, lang)) + "</span></span>" +
      "<span class=\"gc-room\">" + esc(roomText(row, lang)) + (row.hotel ? " · " + esc(row.hotel) : "") + "</span>" +
      "<span class=\"gc-snippet\">" + esc(commentText(row, lang)) + "</span>" +
      "<span class=\"gc-who\">" + bits + "</span></button>";
  }
  function detailHtml(row, model, actor, lang) {
    var status = statusOf(row, model.actions);
    var spec = suggest(row);
    var who = staffLine(row, model.sources, lang).map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("");
    var buttons = "";
    if (canAct(actor, row.hotel) && status !== "actioned" && status !== "not_issue") {
      var assign = status === "assigned" ? "" : "<button type=\"button\" class=\"btn\" onclick=\"gcAct('" + row.id + "','assign')\">" + esc(tx(lang, "Assign", "Asignar")) + "</button>";
      var kindLine = status === "assigned" ? "" : "<p class=\"gc-note\">" + esc(spec.kind === "work_order"
        ? tx(lang, "Assign opens a work order.", "Asignar abre una orden de trabajo.")
        : tx(lang, "Assign opens a task.", "Asignar abre una tarea.")) + "</p>";
      buttons = kindLine + "<div class=\"gc-acts\">" +
        "<button type=\"button\" class=\"btn\" onclick=\"gcAct('" + row.id + "','actioned')\">" + esc(tx(lang, "Actioned", "Atendido")) + "</button>" +
        "<button type=\"button\" class=\"btn2\" onclick=\"gcAct('" + row.id + "','not_issue')\">" + esc(tx(lang, "Not an issue", "No es problema")) + "</button>" +
        assign + "</div>";
    }
    var done = "";
    if (status === "assigned") {
      var hit = null;
      (model.actions || []).forEach(function (item) { if (item.id === row.id) hit = item; });
      done = "<p class=\"gc-note\">" + esc((hit && hit.kind === "work_order")
        ? tx(lang, "Work order opened.", "Orden de trabajo abierta.")
        : tx(lang, "Task opened.", "Tarea abierta.")) + "</p>";
    }
    return "<article class=\"gc-detail\" id=\"gcDetail\"><button type=\"button\" class=\"btn2\" onclick=\"gcBack()\">" + esc(tx(lang, "Back", "Volver")) + "</button>" +
      "<p class=\"gc-top\"><b>" + esc(fmtDate(row.date, lang)) + "</b> <span>" + esc(sourceLabel(row.source, lang)) + "</span> <b>" + esc(scoreText(row)) + "</b> <span class=\"gc-tag\">" + esc(themeLabel(row.theme, lang)) + "</span></p>" +
      "<p class=\"gc-room\">" + esc(roomText(row, lang)) + " · " + esc(row.hotel) + " · " + esc(statusLabel(status, lang)) + "</p>" +
      "<p class=\"gc-text\">" + esc(commentText(row, lang)) + "</p>" +
      "<p class=\"gc-suggest\"><b>" + esc(tx(lang, "Suggested action", "Acción sugerida")) + "</b> " + esc(tx(lang, spec.en, spec.es)) + "</p>" +
      "<ul class=\"gc-staff\">" + who + "</ul>" + done + buttons + "</article>";
  }
  function pageHtml(model, actor, view) {
    actor = actor || {};
    view = view || {};
    var lang = view.lang === "es" ? "es" : "en";
    var hotels = allowedHotels(actor);
    if (!hotels.length) return "";
    var hotel = view.hotel && hotels.indexOf(view.hotel) >= 0 ? view.hotel : (hotels.length === 1 ? hotels[0] : "");
    var rows = visibleComments(model, actor, hotel);
    var title = isHk(actor.role) ? tx(lang, "Room cleanliness", "Limpieza de la habitación") : tx(lang, "Guest comments", "Comentarios de huéspedes");
    var switcher = "";
    if (isLeader(actor.role) && hotels.length > 1) {
      switcher = "<div class=\"gc-chips\">" +
        "<button type=\"button\" class=\"" + (hotel ? "" : "on") + "\" onclick=\"gcHotel('')\">" + esc(tx(lang, "All", "Todos")) + "</button>" +
        hotels.map(function (id) {
          return "<button type=\"button\" class=\"" + (hotel === id ? "on" : "") + "\" onclick=\"gcHotel('" + id + "')\">" + esc(id) + "</button>";
        }).join("") + "</div>";
    }
    var open = null;
    if (view.openId) rows.forEach(function (row) { if (row.id === view.openId) open = row; });
    var body = open ? detailHtml(open, model, actor, lang) : "<div id=\"gcList\">" + (rows.map(function (row) { return listItem(row, model, lang); }).join("") || "<p class=\"gc-note\">" + esc(tx(lang, "No comments in this view.", "No hay comentarios en esta vista.")) + "</p>") + "</div>";
    var scores = !open && isLeader(actor.role) ? scoresCard(model, actor, lang) : "";
    var clean = !open && isHk(actor.role) ? cleanCard(model, actor, lang).replace("id=\"gcOpenBtn\"", "id=\"gcOpenBtnPage\"") : "";
    return "<div class=\"gc\" id=\"gcRoot\"><h2>" + esc(title) + "</h2>" + sampleNote(lang) + feedNote(lang) + switcher + scores + clean + body + "</div>";
  }
  function featureOn(hotel) {
    try {
      if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "guest_comments") !== false;
    } catch (e) {}
    return true;
  }
  function emptySaved() { return { v: 1, actions: [] }; }
  function readSaved() {
    try {
      if (typeof localStorage === "undefined") return emptySaved();
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1) return emptySaved();
      return data;
    } catch (e) { return emptySaved(); }
  }
  function writeSaved(overlay) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(overlay)); } catch (e) {}
  }
  function userOverlay(model) {
    return { v: 1, actions: (model.actions || []).filter(function (row) { return row.source === "user"; }) };
  }
  function applySaved(model, saved) {
    if (!saved || saved.v !== 1 || !saved.actions) return model;
    var next = clone(model);
    saved.actions.forEach(function (row) {
      if (!row || !safeId(row.id)) return;
      next.actions = (next.actions || []).filter(function (item) { return item.id !== row.id; });
      next.actions.push(row);
    });
    return next;
  }

  var api = {
    HOTELS: HOTELS, THEMES: THEMES, SOURCES: SOURCES, METRICS: METRICS, BENCH: BENCH, ACTIONS: ACTIONS,
    normRole: normRole, isLeader: isLeader, isCorporate: isCorporate, isExec: isExec, isHousekeeper: isHousekeeper, isHk: isHk,
    hotelsFor: hotelsFor, canAct: canAct, demoUi: demoUi, checkinDate: checkinDate, addDays: addDays,
    contextFrom: contextFrom, mergeSources: mergeSources, attribute: attribute, mornings: mornings,
    buildDemo: buildDemo, scoreRow: scoreRow, mentions: mentions, mentionFor: mentionFor,
    statusOf: statusOf, tally: tally, suggest: suggest, act: act, ingestMedallia: ingestMedallia,
    applySaved: applySaved, userOverlay: userOverlay,
    homeCard: homeCard, scoresCard: scoresCard, cleanCard: cleanCard, commentsCard: commentsCard, pageHtml: pageHtml,
    fmtScore: fmtScore, fmtGap: fmtGap
  };
  root.GuestComments = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  function liveSources() {
    var rooms = [];
    var insp = [];
    var shifts = [];
    try {
      var today = typeof ld === "function" ? ld() : checkinDate(new Date());
      if (typeof S !== "undefined" && S.h) {
        HOTELS.forEach(function (hotel) {
          var data = S.h[hotel];
          if (!data) return;
          (data.rooms || []).forEach(function (room) {
            if (!room || !room.hk) return;
            rooms.push({ hotel: hotel, date: today, room: room.n, hk: room.hk });
          });
          (data.insp || []).forEach(function (row) {
            insp.push({ hotel: hotel, date: row.date, room: row.room, by: row.by });
          });
        });
      }
      if (typeof S !== "undefined" && S.shifts) {
        S.shifts.forEach(function (row) {
          if (!row || row.scope === "SHUTTLE") return;
          shifts.push(row);
        });
      }
    } catch (e) {}
    return contextFrom({ rooms: rooms, inspections: insp, shifts: shifts });
  }
  function bundle() {
    var model = applySaved(buildDemo(new Date().toISOString()), readSaved());
    model.sources = mergeSources(model.sources, liveSources());
    return model;
  }
  function currentActor() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (!me) return { role: "", hotel: "", name: "" };
      return { role: me.role, hotel: me.hotel || "", name: me.name || "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function pageState() {
    var actor = currentActor();
    var hotels = allowedHotels(actor);
    var picked = "";
    try { picked = S.gcHotel || ""; } catch (e) { picked = ""; }
    if (picked && hotels.indexOf(picked) < 0) picked = "";
    if (!picked && hotels.length === 1) picked = hotels[0];
    var openId = "";
    try { openId = S.gcId || ""; } catch (e2) { openId = ""; }
    return { hotel: picked, openId: openId, lang: langNow() };
  }
  function remember(model) { writeSaved(userOverlay(model)); }
  function toast(lang, en, es) {
    try { if (typeof showToast === "function") showToast(tx(lang, en, es)); } catch (e) {}
  }
  function pushCreated(created) {
    try {
      if (!created || typeof S === "undefined" || !S.h || !S.h[created.hotel]) return;
      var data = S.h[created.hotel];
      if (created.kind === "work_order") {
        data.wo = data.wo || [];
        if (data.wo.some(function (row) { return row.gcId === created.commentId; })) return;
        var next = data.wo.reduce(function (max, row) { return Math.max(max, Number(row.id) || 0); }, 0) + 1;
        data.wo.unshift({
          id: next, room: created.room || "-", t: created.titleEn, text_en: created.titleEn, text_es: created.titleEs,
          lang: "en", p: created.priority || "Med", s: "Open", photo: "", photo_paths: [], comments: [], gcId: created.commentId
        });
        created.ref = String(next);
      } else {
        data.gcTasks = data.gcTasks || [];
        if (data.gcTasks.some(function (row) { return row.gcId === created.commentId; })) return;
        data.gcTasks.unshift({ id: "gc-task-" + created.commentId, titleEn: created.titleEn, titleEs: created.titleEs, gcId: created.commentId, s: "Open" });
        created.ref = created.commentId;
      }
    } catch (e) {}
  }
  function bootPage() {
    var actor = currentActor();
    if (!allowedHotels(actor).length) return "<div class=\"gc\" id=\"gcRoot\"></div>";
    return pageHtml(bundle(), actor, pageState());
  }
  function homeHtml() {
    if (!demoUi()) return "";
    var actor = currentActor();
    if (!allowedHotels(actor).length) return "";
    return homeCard(bundle(), actor, langNow());
  }
  api.homeHtml = homeHtml;

  root.gcOpen = function (hotel) {
    var actor = currentActor();
    if (hotel && (HOTELS.indexOf(hotel) < 0 || allowedHotels(actor).indexOf(hotel) < 0)) return;
    try { S.gcHotel = hotel || ""; S.gcId = ""; if (typeof save === "function") save(); } catch (e) {}
    if (typeof go === "function") go("gcomm");
  };
  root.gcHotel = function (hotel) {
    var actor = currentActor();
    if (hotel && (HOTELS.indexOf(hotel) < 0 || allowedHotels(actor).indexOf(hotel) < 0)) return;
    try { S.gcHotel = hotel || ""; S.gcId = ""; if (typeof save === "function") save(); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.gcPick = function (id) {
    if (!safeId(id)) return;
    try { S.gcId = id; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.gcBack = function () {
    try { S.gcId = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.gcAct = function (id, action) {
    var actor = currentActor();
    var result = act(bundle(), id, action, actor, new Date().toISOString());
    if (!result.ok) return;
    if (result.created) {
      pushCreated(result.created);
      if (result.created.ref) result.model.actions[result.model.actions.length - 1].ref = result.created.ref;
    }
    remember(result.model);
    var lang = langNow();
    if (action === "actioned") toast(lang, "Marked actioned.", "Marcado como atendido.");
    else if (action === "not_issue") toast(lang, "Marked as not an issue.", "Marcado como no es problema.");
    else if (result.created && result.created.kind === "work_order") toast(lang, "Work order opened.", "Orden de trabajo abierta.");
    else toast(lang, "Task opened.", "Tarea abierta.");
    if (typeof render === "function") render();
  };

  if (typeof M !== "undefined") M.gcomm = ["💬", "Guest comments"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Guest comments"] = "Comentarios de huéspedes";
  if (typeof V !== "undefined") V.gcomm = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = currentActor();
      var hotel = "";
      try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
      var show = demoUi() && allowedHotels({ role: actor.role || role, hotel: actor.hotel || hotel }).length > 0;
      if (show && list.indexOf("gcomm") < 0) list.splice(Math.min(2, list.length), 0, "gcomm");
      if (!show) list = list.filter(function (id) { return id !== "gcomm"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows && !root.HHQMenus.menuAllows("gcomm", actor.role || role, hotel, function (h, feature) {
        return feature === "guest_comments" ? featureOn(h) : true;
      })) list = list.filter(function (id) { return id !== "gcomm"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("gcomm") < 0) RSEC[4][2].push("gcomm"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("gcomm") < 0) NOCOLS.push("gcomm"); } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "guest_comments", en: "Guest comments", es: "Comentarios de huéspedes", order: 26 });

  var style = document.createElement("style");
  style.textContent = [
    ".gc-home,.gc-scores,.gc-clean{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".gc-home h3,.gc-scores h3,.gc-clean h3,.gc-metric h3{margin:0;font-size:16px}",
    ".gc-line{display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".gc-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".gc-metric{padding:8px 0;border-top:1px solid #e6ebf2}",
    ".gc-hotels{display:grid;grid-template-columns:repeat(3,minmax(140px,1fr));gap:8px;overflow-x:auto}",
    ".gc-hotels:has(> :only-child){grid-template-columns:1fr}",
    ".gc-hotel{background:#f4f7fb;border-radius:8px;padding:8px}",
    ".gc-hotel h4{margin:0 0 4px;font-size:13px}",
    ".gc-hotel p{margin:2px 0;font-size:13px}",
    ".gc-gap-up{color:#15642f;font-weight:800}",
    ".gc-gap-down{color:#7a1218;font-weight:800}",
    ".gc-wide{width:100%;margin-top:8px}",
    ".gc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}",
    ".gc-chips button{flex:0 0 auto;background:#e6ebf2;color:#14365d;font-weight:700;font-size:13px}",
    ".gc-chips button.on{background:#14365d;color:#fff}",
    ".gc-row{display:block;width:100%;text-align:left;background:#fff;border:0;border-top:1px solid #e6ebf2;border-radius:0;padding:10px 0}",
    ".gc-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center}",
    ".gc-tag,.gc-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800}",
    ".gc-tag{background:#eef3fa;color:#14365d}",
    ".gc-st-new{background:#fff3cd;color:#8a5a00}",
    ".gc-st-assigned{background:#e7eefb;color:#14365d}",
    ".gc-st-actioned{background:#d4f5dc;color:#15642f}",
    ".gc-st-not_issue{background:#e6ebf2;color:#3c4658}",
    ".gc-room,.gc-snippet,.gc-who{display:block;margin-top:4px}",
    ".gc-snippet{font-size:14px}",
    ".gc-who{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12px;color:#3c4658}",
    ".gc-text{font-size:16px;margin:8px 0}",
    ".gc-suggest{background:#fff7e8;border-radius:8px;padding:8px 10px}",
    ".gc-staff{margin:8px 0;padding-left:18px}",
    ".gc-acts{display:flex;gap:6px}",
    ".gc-acts button{flex:1;white-space:normal;line-height:1.2;font-size:13px}",
    ".gc-team{margin:6px 0;padding-left:18px}",
    ".gc-count{font-weight:800}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
