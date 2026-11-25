/* Hotel Effectiveness morning export -> daily labor payload.
   The box at /workspace/cleans-MMDD/ saves CSV or TSV. This file reads those
   exports and returns the JSON the ingest function stores.
   It does not keep employee codes, clock IDs, badges, or PINs.
   Names in tests and examples are fictional. Do not point this at a real file
   and commit the output.

   Hotels:
     MSPWE  Holiday Inn Express Golden Valley  HE property 118172  enabled
     MSPMS  SpringHill Suites                  property id later    off
     MSPAM  Hampton Inn & Suites               property id later    off

   Command (prints the payload, does not post):
     node tools/parse-he-labor.js --dir /workspace/cleans-1130 --hotel MSPWE --date 2026-11-29

   Command (posts yesterday's payload; token stays in the environment):
     HOTELHQ_LABOR_INGEST_TOKEN=... node tools/parse-he-labor.js \
       --dir /workspace/cleans-1130 --hotel MSPWE --date 2026-11-29 --post

   Payload (no action items; the database builds the checklist):
     {
       "hotel": "MSPWE",
       "work_date": "2026-11-29",
       "he_property_id": "118172",
       "source": "he",
       "housekeeping_loaded": true,
       "punches_loaded": true,
       "positions_loaded": true,
       "associates_loaded": true,
       "positions": [
         {"position":"Front Desk","actual_hours":24.5,"plan_hours":24,"scheduled_hours":24}
       ],
       "housekeeping": [
         {"name":"Alex Example","position":"Room Attendant","hours":8.1,"cleans":14,
          "mpr_actual":34.7,"checkouts":8,"stayovers":6}
       ],
       "associates": [
         {"name":"Alex Example","position":"Room Attendant","actual_hours":8.1,
          "plan_hours":7.5,"scheduled_hours":8,"plan_scope":"associate","scheduled_scope":"associate"}
       ],
       "punches": [
         {"name":"Riley Example","position":"Front Desk","missing":"out"}
       ]
     }
   missing is "in", "out", or "both".
   plan_scope and scheduled_scope are "associate" or "position".
   Maintenance and Prop Ops may be included; the daily view leaves them out.
   Do not send pin, password, ssn, employee_code, employee_id, badge, or job_code.
*/
"use strict";

var HOTELS = {
  MSPWE: { hePropertyId: "118172", name: "Holiday Inn Express Golden Valley", enabled: true },
  MSPMS: { hePropertyId: "", name: "SpringHill Suites", enabled: false },
  MSPAM: { hePropertyId: "", name: "Hampton Inn & Suites", enabled: false }
};

var SECRET_HEADER = /^(pin|password|passwd|ssn|social security|employee id|employee code|emp code|emp id|he code|he employee id|he id|badge|badge id|clock id|punch code|job code|associate code|staff code|user code)$/;
var SECRET_KEY = /^(pin|password|passwd|ssn|employee_code|employee_id|emp_code|emp_id|he_code|he_employee_id|he_id|badge|clock_id|punch_code|job_code|associate_code|staff_code)$/;

var HEADER_FIELD = {
  employee: "name",
  associate: "name",
  "associate name": "name",
  "employee name": "name",
  name: "name",
  "staff name": "name",
  position: "position",
  job: "position",
  "job title": "position",
  "position title": "position",
  department: "department",
  dept: "department",
  actual: "actual",
  "actual hours": "actual",
  "act hrs": "actual",
  "act hours": "actual",
  hours: "actual",
  "total hours": "actual",
  "reg hours": "actual",
  "worked hours": "actual",
  plan: "plan",
  "plan hours": "plan",
  "planned hours": "plan",
  planned: "plan",
  scheduled: "scheduled",
  "scheduled hours": "scheduled",
  "sched hours": "scheduled",
  sched: "scheduled",
  schedule: "scheduled",
  cleans: "cleans",
  rooms: "cleans",
  "rooms cleaned": "cleans",
  "total cleans": "cleans",
  "room count": "cleans",
  "cleaned rooms": "cleans",
  mpr: "mpr",
  "min per room": "mpr",
  "minutes per room": "mpr",
  "minutes room": "mpr",
  checkouts: "checkouts",
  checkout: "checkouts",
  co: "checkouts",
  "checkout cleans": "checkouts",
  stayovers: "stayovers",
  stayover: "stayovers",
  so: "stayovers",
  "stayover cleans": "stayovers",
  missing: "missing",
  punch: "missing",
  exception: "missing",
  "missing punch": "missing",
  "in out": "missing",
  "punch exception": "missing",
  date: "date",
  "work date": "date",
  "business date": "date",
  "labor date": "date",
  hotel: "hotel",
  property: "hotel",
  "hotel id": "hotel",
  "property id": "hotel",
  "he hotel": "hotel",
  "he property": "hotel",
  location: "hotel",
  "plan level": "plan_scope",
  "plan scope": "plan_scope",
  "scheduled level": "scheduled_scope",
  "scheduled scope": "scheduled_scope",
  "schedule level": "scheduled_scope"
};

function round2(n) {
  if (n == null || !isFinite(Number(n))) return null;
  var sign = Number(n) < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(Number(n)) * 100 + 1e-9) / 100;
}
function cents(n) {
  if (n == null || !isFinite(Number(n))) return null;
  return Math.round(Number(n) * 100);
}
function hoursText(n) {
  if (n == null || !isFinite(Number(n))) return "0.0";
  return (Math.round(Number(n) * 10 + 1e-9) / 10).toFixed(1);
}
function overPlan(actual, plan) {
  var a = cents(actual);
  var p = cents(plan);
  if (a == null || p == null) return false;
  return a - p > 25;
}
function addDays(iso, n) {
  var p = String(iso || "").split("-").map(Number);
  var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function normHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function normKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function isSupervisor(position) {
  return /supervisor|executive housekeeper|\bsupv\b/i.test(String(position || ""));
}
function excludedPosition(position) {
  return /maintenance|prop\s*ops|property\s*ops|property operations|^maint\b|\bmaint\b|\bengineer\b/i.test(String(position || ""));
}
function positionGroup(position) {
  if (excludedPosition(position)) return "excluded";
  if (/front\s*desk|front office/i.test(position || "")) return "front_desk";
  if (/housekeep|room attendant|hskp|room cleaner/i.test(position || "")) return "housekeeping";
  return "other";
}
function unknownPosition(position) {
  var s = String(position || "").trim();
  if (!s) return true;
  return /^(unknown|unassigned|n\/a|na|none|-+|\?+)$/i.test(s);
}
function cleanName(value) {
  var s = String(value == null ? "" : value).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (/^\d{3,}$/.test(s)) return "";
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s;
}
function cleanPosition(value) {
  var s = String(value == null ? "" : value).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s;
}
function parseNumber(value) {
  if (value == null) return null;
  var s = String(value).trim().replace(/,/g, "").replace(/%/g, "");
  if (!s || s === "-" || /^n\/?a$/i.test(s)) return null;
  var neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1).trim();
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = Number(s);
  if (!isFinite(n)) return null;
  return neg ? -Math.abs(n) : n;
}
function parseDate(value) {
  var s = String(value || "").trim();
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  var us = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!us) return "";
  var year = us[3].length === 2 ? "20" + us[3] : us[3];
  var month = ("0" + us[1]).slice(-2);
  var day = ("0" + us[2]).slice(-2);
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return "";
  return year + "-" + month + "-" + day;
}
function hotelFromCell(value) {
  var s = String(value || "").trim();
  if (!s) return "";
  var up = s.toUpperCase();
  if (HOTELS[up]) return up;
  if (s === HOTELS.MSPWE.hePropertyId) return "MSPWE";
  if (/golden valley/i.test(s)) return "MSPWE";
  if (/spring\s*hill/i.test(s)) return "MSPMS";
  if (/hampton/i.test(s)) return "MSPAM";
  return "";
}
function missingOf(value) {
  var s = String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (/both|in\s*\/\s*out|in and out|missing in and out/.test(s)) return "both";
  var hasIn = /\bin\b|clock in|punch in|missing in/.test(s);
  var hasOut = /\bout\b|clock out|punch out|missing out/.test(s);
  if (hasIn && hasOut) return "both";
  if (hasOut) return "out";
  if (hasIn) return "in";
  return "";
}
function scopeOf(value, fallback) {
  var s = String(value || "").toLowerCase();
  if (/position|dept|department|group/.test(s)) return "position";
  if (/associate|employee|person|individual/.test(s)) return "associate";
  return fallback;
}
function parseTable(text) {
  var src = String(text || "").replace(/^\uFEFF/, "");
  var rows = [];
  var row = [];
  var cell = "";
  var quoted = false;
  var sample = src.slice(0, 2000);
  var commas = (sample.match(/,/g) || []).length;
  var tabs = (sample.match(/\t/g) || []).length;
  var delim = tabs > commas ? "\t" : ",";
  for (var i = 0; i < src.length; i++) {
    var ch = src.charAt(i);
    if (quoted) {
      if (ch === "\"") {
        if (src.charAt(i + 1) === "\"") {
          cell += "\"";
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === "\"") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src.charAt(i + 1) === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some(function (part) { return String(part).trim() !== ""; })) rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some(function (part) { return String(part).trim() !== ""; })) rows.push(row);
  }
  return rows;
}
function mapHeaders(headers) {
  var map = {};
  var dropped = [];
  headers.forEach(function (header, index) {
    var key = normHeader(header);
    if (!key) return;
    if (SECRET_HEADER.test(key)) {
      dropped.push(key);
      return;
    }
    var field = HEADER_FIELD[key];
    if (field && map[field] == null) map[field] = index;
  });
  return { map: map, dropped: dropped };
}
function classify(name, fields) {
  var n = String(name || "").toLowerCase();
  if (/hskp|housekeep|hk.?detail/.test(n)) return "housekeeping";
  if (/missing|punch/.test(n)) return "punches";
  if (/associate|employee/.test(n)) return "associates";
  if (/win|loss|position|wls/.test(n)) return "positions";
  if (fields.missing) return "punches";
  if (fields.cleans != null || fields.mpr != null) return "housekeeping";
  if (fields.name != null && (fields.plan != null || fields.scheduled != null)) return "associates";
  if (fields.position != null && fields.actual != null) return "positions";
  return "";
}
function cell(row, map, field) {
  if (map[field] == null) return "";
  return row[map[field]] == null ? "" : row[map[field]];
}
function skipTotal(position) {
  return /^(total|overall|grand total|hotel total|dept total|department total)$/i.test(String(position || "").trim());
}
function assertHours(n, max, label, errors) {
  if (n == null) return null;
  var v = round2(n);
  if (v < 0 || v > max) errors.push(label + " hours are out of range");
  return v;
}
function walkKeys(value, bad) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(function (item) { walkKeys(item, bad); });
    return;
  }
  Object.keys(value).forEach(function (key) {
    if (SECRET_KEY.test(normKey(key))) bad.push(normKey(key));
    else walkKeys(value[key], bad);
  });
}
function rejectSecrets(payload) {
  var bad = [];
  walkKeys(payload, bad);
  if (bad.length) {
    var err = new Error("refusing employee code or PIN");
    err.code = "secret";
    throw err;
  }
}

function readFiles(files, options) {
  options = options || {};
  var hotel = String(options.hotel || "").toUpperCase();
  var workDate = String(options.workDate || options.work_date || "");
  var errors = [];
  if (!HOTELS[hotel]) errors.push("unknown hotel");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) errors.push("work_date");
  var lists = { housekeeping: [], punches: [], positions: [], associates: [] };
  var loaded = { housekeeping: false, punches: false, positions: false, associates: false };
  var propertyIds = {};
  var dropped = [];
  (files || []).forEach(function (file) {
    var name = String(file.name || "");
    var text = String(file.text || "");
    if (text.length > 2000000) {
      errors.push(name + " is too large");
      return;
    }
    if (/\.xlsx?$/i.test(name) || /^PK/.test(text.slice(0, 2))) {
      errors.push(name + " is Excel. Save the Hotel Effectiveness report as CSV.");
      return;
    }
    if (/<html|<!doctype html/i.test(text.slice(0, 400))) {
      errors.push(name + " is a web page. Save the report as CSV.");
      return;
    }
    if (/\.json$/i.test(name)) {
      errors.push(name + " is JSON. Save the Hotel Effectiveness report as CSV.");
      return;
    }
    var table = parseTable(text);
    if (!table.length) return;
    var mapped = mapHeaders(table[0]);
    mapped.dropped.forEach(function (header) {
      if (dropped.indexOf(header) < 0) dropped.push(header);
    });
    var kind = classify(name, mapped.map);
    if (!kind) {
      errors.push(name + " is not a housekeeping, missing-punch, position, or associate export");
      return;
    }
    loaded[kind] = true;
    table.slice(1).forEach(function (row) {
      var rowHotel = hotelFromCell(cell(row, mapped.map, "hotel"));
      var rawHotel = String(cell(row, mapped.map, "hotel") || "").trim();
      if (rawHotel && !rowHotel) {
        if (/^\d{3,12}$/.test(rawHotel)) propertyIds[rawHotel] = true;
        else errors.push(name + " has a hotel this daily labor page does not know");
        return;
      }
      if (rowHotel && rowHotel !== hotel) return;
      if (/^\d{3,12}$/.test(rawHotel)) propertyIds[rawHotel] = true;
      var rowDate = parseDate(cell(row, mapped.map, "date"));
      if (rowDate && rowDate !== workDate) return;
      var position = cleanPosition(cell(row, mapped.map, "position") || cell(row, mapped.map, "department"));
      if (skipTotal(position)) return;
      var rawName = String(cell(row, mapped.map, "name") || "").trim();
      var nameValue = cleanName(rawName);
      if (rawName && !nameValue) return;
      if (kind === "positions") {
        lists.positions.push({
          position: position,
          actual_hours: parseNumber(cell(row, mapped.map, "actual")),
          plan_hours: parseNumber(cell(row, mapped.map, "plan")),
          scheduled_hours: parseNumber(cell(row, mapped.map, "scheduled"))
        });
        return;
      }
      if (kind === "housekeeping") {
        lists.housekeeping.push({
          name: nameValue,
          position: position,
          hours: parseNumber(cell(row, mapped.map, "actual")),
          cleans: parseNumber(cell(row, mapped.map, "cleans")),
          mpr_actual: parseNumber(cell(row, mapped.map, "mpr")),
          checkouts: parseNumber(cell(row, mapped.map, "checkouts")),
          stayovers: parseNumber(cell(row, mapped.map, "stayovers"))
        });
        return;
      }
      if (kind === "associates") {
        lists.associates.push({
          name: nameValue,
          position: position,
          actual_hours: parseNumber(cell(row, mapped.map, "actual")),
          plan_hours: parseNumber(cell(row, mapped.map, "plan")),
          scheduled_hours: parseNumber(cell(row, mapped.map, "scheduled")),
          plan_scope: scopeOf(cell(row, mapped.map, "plan_scope"), mapped.map.plan_scope != null ? "associate" : (mapped.map.plan != null ? "associate" : "position")),
          scheduled_scope: scopeOf(cell(row, mapped.map, "scheduled_scope"), mapped.map.scheduled != null ? "associate" : "position")
        });
        return;
      }
      var missing = missingOf(cell(row, mapped.map, "missing"));
      if (!missing && !unknownPosition(position)) return;
      lists.punches.push({ name: nameValue, position: position, missing: missing || "both" });
    });
  });
  var knownProperty = HOTELS[hotel] && HOTELS[hotel].hePropertyId;
  Object.keys(propertyIds).forEach(function (id) {
    if (knownProperty && id !== knownProperty) errors.push("HE property id does not match " + hotel);
  });
  var payload = {
    hotel: hotel,
    work_date: workDate,
    he_property_id: knownProperty || "",
    source: "he",
    housekeeping_loaded: loaded.housekeeping,
    punches_loaded: loaded.punches,
    positions_loaded: loaded.positions,
    associates_loaded: loaded.associates,
    positions: lists.positions,
    housekeeping: lists.housekeeping,
    associates: lists.associates,
    punches: lists.punches
  };
  if (!knownProperty) payload.he_property_id = "";
  try { rejectSecrets(payload); } catch (e) { errors.push(e.message); }
  if (errors.length) return { ok: false, errors: errors, payload: null, dropped: dropped };
  return { ok: true, errors: [], payload: payload, dropped: dropped };
}

function mprTarget(row, standards) {
  standards = standards || {};
  var co = Number(row.checkouts) || 0;
  var so = Number(row.stayovers) || 0;
  var coMin = standards.minutesPerCheckout;
  var soMin = standards.minutesPerStayover;
  if (co + so > 0 && coMin != null && soMin != null) {
    return round2(((co * Number(coMin)) + (so * Number(soMin))) / (co + so));
  }
  if (standards.hoursPerOccupiedRoom != null) return round2(Number(standards.hoursPerOccupiedRoom) * 60);
  return null;
}
function mprActual(row) {
  if (row.mpr_actual != null && row.mpr_actual !== "") return round2(row.mpr_actual);
  var hours = Number(row.hours);
  var cleans = Number(row.cleans);
  if (isFinite(hours) && isFinite(cleans) && cleans > 0) return round2((hours * 60) / cleans);
  return null;
}

function deriveDay(payload, options) {
  payload = payload || {};
  options = options || {};
  rejectSecrets(payload);
  var hotel = String(payload.hotel || "").toUpperCase();
  var workDate = String(payload.work_date || "");
  if (!HOTELS[hotel]) {
    var unknown = new Error("unknown hotel");
    unknown.code = "hotel";
    throw unknown;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    var dateErr = new Error("work_date");
    dateErr.code = "date";
    throw dateErr;
  }
  var standards = options.standards || {};
  var roomsSold = options.roomsSold;
  if (roomsSold == null && payload.rooms_sold != null && payload.rooms_sold !== "") roomsSold = Number(payload.rooms_sold);
  if (roomsSold != null && (!isFinite(Number(roomsSold)) || Number(roomsSold) < 0)) roomsSold = null;
  if (roomsSold != null) roomsSold = Math.round(Number(roomsSold));
  var dueOn = addDays(workDate, 1);
  var positions = (payload.positions || []).map(function (row) {
    return {
      position: cleanPosition(row.position),
      actual: round2(row.actual_hours != null ? row.actual_hours : row.actual),
      plan: round2(row.plan_hours != null ? row.plan_hours : row.plan),
      scheduled: round2(row.scheduled_hours != null ? row.scheduled_hours : row.scheduled),
      group: positionGroup(row.position)
    };
  }).filter(function (row) { return row.position && !skipTotal(row.position); });
  var housekeeping = (payload.housekeeping || []).map(function (row) {
    var position = cleanPosition(row.position);
    var next = {
      name: cleanName(row.name),
      position: position,
      hours: round2(row.hours != null ? row.hours : row.actual_hours),
      cleans: row.cleans == null || row.cleans === "" ? null : Math.round(Number(row.cleans)),
      checkouts: row.checkouts == null || row.checkouts === "" ? null : Math.round(Number(row.checkouts)),
      stayovers: row.stayovers == null || row.stayovers === "" ? null : Math.round(Number(row.stayovers)),
      supervisor: isSupervisor(position)
    };
    next.mprActual = mprActual(row);
    next.mprTarget = next.supervisor ? null : mprTarget(next, standards);
    return next;
  });
  var positionByName = {};
  positions.forEach(function (row) { positionByName[row.position.toLowerCase()] = row; });
  var overplan = [];
  (payload.associates || []).forEach(function (row) {
    var position = cleanPosition(row.position);
    var actual = round2(row.actual_hours != null ? row.actual_hours : row.actual);
    var plan = round2(row.plan_hours != null ? row.plan_hours : row.plan);
    var scheduled = round2(row.scheduled_hours != null ? row.scheduled_hours : row.scheduled);
    var planScope = row.plan_scope === "position" ? "position" : "associate";
    var scheduledScope = row.scheduled_scope === "position" ? "position" : "associate";
    var parent = positionByName[position.toLowerCase()];
    var personalOver = planScope === "associate" && overPlan(actual, plan);
    var positionOver = planScope === "position" && parent && parent.group !== "excluded" && overPlan(parent.actual, parent.plan) && actual != null && cents(actual) > 0;
    if (!personalOver && !positionOver) return;
    overplan.push({
      name: cleanName(row.name),
      position: position,
      actual: actual,
      plan: plan,
      scheduled: scheduled,
      variance: personalOver ? round2(actual - plan) : null,
      planScope: planScope,
      scheduledScope: scheduledScope
    });
  });
  var items = [];
  function addItem(kind, who, whatEn, whatEs) {
    items.push({
      itemNo: items.length + 1,
      kind: kind,
      who: who || "Unknown associate",
      whatEn: whatEn,
      whatEs: whatEs,
      dueOn: dueOn,
      status: "open"
    });
  }
  (payload.punches || []).forEach(function (row) {
    var name = cleanName(row.name) || "Unknown associate";
    var missing = row.missing === "in" || row.missing === "out" || row.missing === "both" ? row.missing : "both";
    var en = missing === "in" ? "Fix the missing In punch for " + name + "."
      : missing === "out" ? "Fix the missing Out punch for " + name + "."
      : "Fix the missing In and Out punches for " + name + ".";
    var es = missing === "in" ? "Corrige la marcación de entrada que falta de " + name + "."
      : missing === "out" ? "Corrige la marcación de salida que falta de " + name + "."
      : "Corrige las marcaciones de entrada y salida que faltan de " + name + ".";
    addItem("missing_punch", name, en, es);
  });
  var seenUnknown = {};
  function noteUnknown(name, position) {
    if (!unknownPosition(position)) return;
    var who = cleanName(name) || "Unknown associate";
    var key = who.toLowerCase();
    if (seenUnknown[key]) return;
    seenUnknown[key] = true;
    addItem(
      "unknown_position",
      who,
      "Give " + who + " a position. The punch position is blank or unknown.",
      "Asigna un puesto a " + who + ". El puesto de la marcación está vacío o es desconocido."
    );
  }
  (payload.punches || []).forEach(function (row) { noteUnknown(row.name, row.position); });
  housekeeping.forEach(function (row) { noteUnknown(row.name, row.position); });
  (payload.associates || []).forEach(function (row) { noteUnknown(row.name, row.position); });
  housekeeping.forEach(function (row) {
    if (row.supervisor) return;
    var who = row.name || "Unknown associate";
    if (row.hours != null && cents(row.hours) > 0 && row.cleans === 0) {
      addItem(
        "hours_zero_cleans",
        who,
        who + " has " + hoursText(row.hours) + " hours and 0 cleans.",
        who + " tiene " + hoursText(row.hours) + " horas y 0 limpiezas."
      );
    }
  });
  housekeeping.forEach(function (row) {
    if (row.supervisor) return;
    var who = row.name || "Unknown associate";
    if (row.cleans != null && row.cleans > 0 && (row.hours == null || cents(row.hours) === 0)) {
      addItem(
        "cleans_zero_hours",
        who,
        who + " has " + row.cleans + " cleans and 0 hours.",
        who + " tiene " + row.cleans + " limpiezas y 0 horas."
      );
    }
  });
  if (payload.housekeeping_loaded) {
    var cleans = 0;
    housekeeping.forEach(function (row) {
      if (row.supervisor) return;
      cleans += Number(row.cleans) || 0;
    });
    if (cleans === 0 && roomsSold != null && roomsSold > 0) {
      addItem(
        "zero_cleans_vs_sold",
        "Housekeeping",
        "Housekeeping recorded 0 cleans and the night audit shows " + roomsSold + " rooms sold.",
        "Ama de llaves registró 0 limpiezas y la auditoría nocturna muestra " + roomsSold + " cuartos vendidos."
      );
    }
  }
  addItem(
    "five_minute_checkin",
    "GM / AGM",
    "Complete the 5-minute check-in: compare yesterday actual vs plan, adjust today's shifts, talk with anyone near overtime, and note the variance.",
    "Completa el check-in de 5 minutos: compara el real de ayer contra el plan, ajusta los turnos de hoy, habla con quien esté cerca de tiempo extra y anota la variación."
  );
  overplan.forEach(function (row) {
    var who = row.name || "Unknown associate";
    if (row.planScope === "position") {
      addItem(
        "trim_overplan",
        who,
        "Review " + who + " (" + (row.position || "unknown position") + "). Actual " + hoursText(row.actual) + "h. Plan " + hoursText(row.plan) + "h is the position total, not a personal plan.",
        "Revisa a " + who + " (" + (row.position || "puesto desconocido") + "). Real " + hoursText(row.actual) + "h. El plan de " + hoursText(row.plan) + "h es el total del puesto, no un plan personal."
      );
      return;
    }
    addItem(
      "trim_overplan",
      who,
      "Trim " + who + " (" + (row.position || "unknown position") + "): actual " + hoursText(row.actual) + "h, plan " + hoursText(row.plan) + "h, scheduled " + hoursText(row.scheduled) + "h, over by " + hoursText(row.variance) + "h.",
      "Recorta a " + who + " (" + (row.position || "puesto desconocido") + "): real " + hoursText(row.actual) + "h, plan " + hoursText(row.plan) + "h, programado " + hoursText(row.scheduled) + "h, " + hoursText(row.variance) + "h de más."
    );
  });
  var totals = { actual: 0, plan: 0, scheduled: 0, any: false };
  positions.forEach(function (row) {
    if (row.group === "excluded") return;
    totals.any = true;
    totals.actual = round2(totals.actual + (row.actual || 0));
    totals.plan = round2(totals.plan + (row.plan || 0));
    totals.scheduled = round2(totals.scheduled + (row.scheduled || 0));
  });
  return {
    hotel: hotel,
    workDate: workDate,
    dueOn: dueOn,
    roomsSold: roomsSold,
    loaded: true,
    positions: positions,
    housekeeping: housekeeping,
    overplan: overplan,
    items: items,
    totals: totals.any ? totals : { actual: null, plan: null, scheduled: null },
    exceptionCount: items.filter(function (item) { return item.kind !== "five_minute_checkin"; }).length,
    files: {
      housekeeping: !!payload.housekeeping_loaded,
      punches: !!payload.punches_loaded,
      positions: !!payload.positions_loaded,
      associates: !!payload.associates_loaded
    }
  };
}

var api = {
  HOTELS: HOTELS,
  SECRET_KEY: SECRET_KEY,
  round2: round2,
  hoursText: hoursText,
  overPlan: overPlan,
  addDays: addDays,
  isSupervisor: isSupervisor,
  excludedPosition: excludedPosition,
  positionGroup: positionGroup,
  cleanName: cleanName,
  parseTable: parseTable,
  readFiles: readFiles,
  deriveDay: deriveDay,
  rejectSecrets: rejectSecrets,
  hotelFromCell: hotelFromCell
};

if (typeof module !== "undefined" && module.exports) module.exports = api;
if (typeof window !== "undefined") window.HELabor = api;
