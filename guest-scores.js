/* Guest scores.
   GS_ACCESS is the one role -> metric list. The same rows are seeded in
   supabase/migrations/20261029_guest_scores.sql (guest_score_access).
   Leaders are omitted and see every metric. A trailing * is a prefix so a new
   brand breakfast or check-in question is included without a new policy.
   hk_lead is the executive housekeeper and the HK lead.
   Demo numbers are labeled sample data. No guest names. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var BRAND = { MSPWE: "IHG", MSPAM: "Hilton", MSPMS: "Marriott" };
  var ACCESS = {
    hk_lead: ["itr", "cleanliness"],
    housekeeper: ["itr", "cleanliness"],
    laundry: ["itr", "cleanliness"],
    house_person: ["itr", "cleanliness"],
    breakfast: ["itr", "fb_overall", "breakfast_service", "food_quality", "breakfast_*"],
    front_desk: ["itr", "staff_service", "check_in", "check_in_*"],
    maintenance: ["itr", "maintenance", "maintenance_*"]
  };
  var ROLE_ALIAS = {
    hk_lead: "hk_lead",
    housekeeper: "housekeeper",
    laundry: "laundry",
    house_person: "house_person",
    breakfast: "breakfast",
    front_desk: "front_desk",
    maintenance: "maintenance",
    gm: "gm",
    agm: "agm",
    above_property: "above_property",
    Housekeeping: "hk_lead",
    "HK Lead": "hk_lead",
    "Exec Housekeeper": "hk_lead",
    "Executive Housekeeper": "hk_lead",
    Housekeeper: "housekeeper",
    "Laundry Attendant": "laundry",
    Laundry: "laundry",
    "House Person": "house_person",
    Houseperson: "house_person",
    "Breakfast Attendant": "breakfast",
    Breakfast: "breakfast",
    "Front Desk": "front_desk",
    Maintenance: "maintenance",
    GM: "gm",
    AGM: "agm",
    "Above Property": "above_property",
    "JR Corporate": "above_property"
  };
  var LEADERS = { gm: 1, agm: 1, above_property: 1 };
  var METRICS = [
    { id: "itr", en: "Intent to Recommend", es: "Intención de recomendar", short: "ITR", kind: "topbox" },
    { id: "cleanliness", en: "Cleanliness", es: "Limpieza", short: "Clean", kind: "topbox" },
    { id: "staff_service", en: "Staff Service", es: "Servicio del personal", short: "Staff", kind: "topbox" },
    { id: "maintenance", en: "Maintenance & Upkeep", es: "Mantenimiento y conservación", short: "Upkeep", kind: "topbox" },
    { id: "brand_promise", en: "Brand Promise Delivery", es: "Cumplimiento de la promesa de marca", short: "Promise", kind: "topbox" },
    { id: "elite_appreciation", en: "Elite Appreciation", es: "Reconocimiento elite", short: "Elite", kind: "topbox", brands: ["Hilton", "Marriott"] },
    { id: "anticipated_needs", en: "Anticipated Needs", es: "Necesidades anticipadas", short: "Needs", kind: "topbox", brands: ["Hilton", "Marriott"] },
    { id: "personalized", en: "Personalized Experience", es: "Experiencia personalizada", short: "Personal", kind: "topbox", brands: ["Hilton", "Marriott"] },
    { id: "fb_overall", en: "F&B overall", es: "Alimentos y bebidas", short: "F&B", kind: "topbox" },
    { id: "breakfast_service", en: "Breakfast service", es: "Servicio de desayuno", short: "Bfast svc", kind: "topbox" },
    { id: "food_quality", en: "Breakfast food quality", es: "Calidad de la comida del desayuno", short: "Food", kind: "topbox" },
    { id: "breakfast_ihg", en: "IHG breakfast score", es: "Calificación de desayuno IHG", short: "IHG bfast", kind: "topbox", brands: ["IHG"] },
    { id: "breakfast_hilton", en: "Hilton breakfast score", es: "Calificación de desayuno Hilton", short: "Hilton bfast", kind: "topbox", brands: ["Hilton"] },
    { id: "breakfast_marriott", en: "Marriott breakfast score", es: "Calificación de desayuno Marriott", short: "Marriott bfast", kind: "topbox", brands: ["Marriott"] },
    { id: "fitness", en: "Fitness Center", es: "Gimnasio", short: "Fitness", kind: "topbox" },
    { id: "pool", en: "Pool", es: "Alberca", short: "Pool", kind: "topbox" },
    { id: "check_in", en: "Check-in", es: "Registro de llegada", short: "Check-in", kind: "topbox" },
    { id: "google_stars", en: "Google star average", es: "Promedio de estrellas en Google", short: "Google", kind: "stars" },
    { id: "tripadvisor_stars", en: "TripAdvisor star average", es: "Promedio de estrellas en TripAdvisor", short: "TripAdvisor", kind: "stars" }
  ];
  var GOAL_BASE = {
    itr: 74, cleanliness: 81, staff_service: 78, maintenance: 70, check_in: 77,
    fb_overall: 73, breakfast_service: 75, food_quality: 74,
    breakfast_ihg: 77, breakfast_hilton: 76, breakfast_marriott: 75,
    google_stars: 4.4, tripadvisor_stars: 4.2
  };
  var LIFT = {
    MSPWE: [4, -3, 5, -6, 2, 1],
    MSPAM: [3, -5, 2, 3, -2, 1],
    MSPMS: [-5, 3, -2, -7, 2, 4]
  };
  var NOTES = [
    ["AC was loud at night", "El aire hizo ruido en la noche"],
    ["Bathroom fan not working", "El ventilador del baño no funciona"],
    ["Carpet stain by the bed", "Mancha en la alfombra junto a la cama"],
    ["Shower drain was slow", "El desagüe de la regadera estaba lento"],
    ["TV remote was missing", "Faltaba el control de la TV"]
  ];
  var PER_MONTH = 20;

  function pad(n) { return String(n).padStart(2, "0"); }
  function normalize(role) { return ROLE_ALIAS[role] || String(role || ""); }
  function isLeader(role) { return !!LEADERS[normalize(role)]; }
  function metricsForRole(role) {
    var key = normalize(role);
    if (LEADERS[key]) return null;
    return ACCESS[key] ? ACCESS[key].slice() : [];
  }
  function allows(rules, metric) {
    if (rules == null) return true;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.charAt(rule.length - 1) === "*") {
        if (metric.indexOf(rule.slice(0, -1)) === 0) return true;
      } else if (rule === metric) return true;
    }
    return false;
  }
  function metricById(id) {
    for (var i = 0; i < METRICS.length; i++) if (METRICS[i].id === id) return METRICS[i];
    return { id: id, en: id, es: id, short: id, kind: /stars$/.test(id) ? "stars" : "topbox" };
  }
  function addDays(iso, days) {
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function daysInMonth(month) {
    var p = month.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1], 0)).getUTCDate();
  }
  function waveOf(today) {
    var y = Number(today.slice(0, 4));
    var m = Number(today.slice(5, 7));
    if (m <= 6) return { start: y + "-01-01", end: y + "-06-30", half: 1, year: y };
    return { start: y + "-07-01", end: y + "-12-31", half: 2, year: y };
  }
  function waveMonths(today) {
    var w = waveOf(today);
    var startM = w.half === 2 ? 7 : 1;
    var out = [];
    for (var i = 0; i < 6; i++) out.push(w.year + "-" + pad(startM + i) + "-01");
    return out;
  }
  function windows(today) {
    var wave = waveOf(today);
    return {
      t14: { start: addDays(today, -13), end: today },
      mtd: { start: today.slice(0, 8) + "01", end: today },
      wave: { start: wave.start, end: today }
    };
  }
  function monthEnd(month, today) {
    if (month > today) return null;
    var last = month.slice(0, 8) + pad(daysInMonth(month));
    return last < today ? last : today;
  }
  function stat(values, kind) {
    var vals = [];
    for (var i = 0; i < values.length; i++) {
      var n = Number(values[i]);
      if (Number.isFinite(n)) vals.push(n);
    }
    if (!vals.length) return { n: 0, value: null, kind: kind || "topbox" };
    if (kind === "stars") {
      var sum = 0;
      for (var s = 0; s < vals.length; s++) sum += vals[s];
      return { n: vals.length, value: sum / vals.length, kind: "stars" };
    }
    var top = 0;
    for (var t = 0; t < vals.length; t++) if (vals[t] >= 9 && vals[t] <= 10) top++;
    return { n: vals.length, value: 100 * top / vals.length, kind: "topbox" };
  }
  function fmt(row) {
    if (!row || row.value == null || !Number.isFinite(row.value)) return "—";
    var n = (Math.round(row.value * 10) / 10).toFixed(1);
    return row.kind === "stars" ? n : n + "%";
  }
  function fmtGoal(goal, kind) {
    if (goal == null || !Number.isFinite(Number(goal))) return "—";
    var n = (Math.round(Number(goal) * 10) / 10).toFixed(1);
    return kind === "stars" ? n : n + "%";
  }
  function meets(actual, goal) {
    if (actual == null || goal == null || !Number.isFinite(Number(goal)) || !Number.isFinite(Number(actual))) return null;
    return Math.round(actual * 10) / 10 + 1e-9 >= Math.round(Number(goal) * 10) / 10;
  }
  function goalOf(goals, hotel, metric, month) {
    var bucket = goals && goals[hotel] && goals[hotel][metric];
    if (!bucket || bucket[month] == null || bucket[month] === "") return null;
    var n = Number(bucket[month]);
    return Number.isFinite(n) ? n : null;
  }
  function valuesOf(surveys, hotel, metric, start, end) {
    var out = [];
    for (var i = 0; i < surveys.length; i++) {
      var s = surveys[i];
      if (s.hotel !== hotel || s.date < start || s.date > end) continue;
      var v = s.metrics ? s.metrics[metric] : null;
      if (v == null || v === "") continue;
      out.push(Number(v));
    }
    return out;
  }
  function summarize(surveys, today, hotel, metric, kind) {
    var w = windows(today);
    return {
      t14: stat(valuesOf(surveys, hotel, metric, w.t14.start, w.t14.end), kind),
      mtd: stat(valuesOf(surveys, hotel, metric, w.mtd.start, w.mtd.end), kind),
      wave: stat(valuesOf(surveys, hotel, metric, w.wave.start, w.wave.end), kind)
    };
  }
  function monthRows(surveys, goals, today, hotel, metric, kind) {
    return waveMonths(today).map(function (month) {
      var end = monthEnd(month, today);
      var vals = end ? valuesOf(surveys, hotel, metric, month, end) : [];
      var row = stat(vals, kind);
      var goal = goalOf(goals, hotel, metric, month);
      var actual = !end || row.n === 0 ? null : row.value;
      return { month: month, goal: goal, actual: actual, n: end ? row.n : 0, meet: meets(actual, goal), kind: kind };
    });
  }
  function project(surveys, role, hotels) {
    var rules = metricsForRole(role);
    var leader = rules == null;
    var allow = {};
    for (var h = 0; h < hotels.length; h++) allow[hotels[h]] = 1;
    var out = [];
    for (var i = 0; i < surveys.length; i++) {
      var s = surveys[i];
      if (!allow[s.hotel]) continue;
      var metrics = {};
      var keys = Object.keys(s.metrics || {});
      for (var k = 0; k < keys.length; k++) if (allows(rules, keys[k])) metrics[keys[k]] = s.metrics[keys[k]];
      if (!Object.keys(metrics).length) continue;
      if (leader) {
        out.push({
          id: s.id, hotel: s.hotel, date: s.date, room: s.room || "", source: s.source || "",
          itr: s.itr == null ? (metrics.itr == null ? null : Number(metrics.itr)) : Number(s.itr),
          comment: s.comment || "", commentEs: s.commentEs || "", metrics: metrics
        });
      } else {
        out.push({
          id: s.id, hotel: s.hotel, date: s.date, room: "", source: s.source || "",
          itr: metrics.itr == null ? null : Number(metrics.itr),
          comment: "", commentEs: "", metrics: metrics
        });
      }
    }
    return out;
  }
  function lowScores(surveys, hotel, today) {
    var wave = waveOf(today);
    return surveys.filter(function (s) {
      return s.hotel === hotel && s.room && s.itr != null && Number(s.itr) <= 6 && s.date >= wave.start && s.date <= today;
    }).sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : String(a.room).localeCompare(String(b.room));
    });
  }
  function metricList(hotel, role, surveys) {
    var rules = metricsForRole(role);
    var brand = BRAND[hotel];
    var present = {};
    for (var i = 0; i < surveys.length; i++) {
      if (surveys[i].hotel !== hotel) continue;
      Object.keys(surveys[i].metrics || {}).forEach(function (k) { present[k] = 1; });
    }
    var out = METRICS.filter(function (m) {
      if (!allows(rules, m.id)) return false;
      if (m.brands && m.brands.indexOf(brand) < 0 && !present[m.id]) return false;
      return true;
    });
    if (rules == null) {
      Object.keys(present).forEach(function (id) {
        if (!out.some(function (m) { return m.id === id; })) out.push(metricById(id));
      });
    }
    return out;
  }
  function workOrderFromSurvey(survey) {
    var room = String(survey.room || "");
    var score = survey.itr == null ? "" : String(survey.itr);
    return {
      room: room,
      department: "maintenance",
      priority: Number(survey.itr) <= 3 ? "High" : "Med",
      text_en: "Guest score follow-up, room " + room + ". ITR " + score + " of 10. Check maintenance and upkeep.",
      text_es: "Seguimiento de calificación, cuarto " + room + ". ITR " + score + " de 10. Revisar mantenimiento y conservación."
    };
  }
function fillScores(n, pct) {
  var top = Math.round(n * pct / 100);
  var low = 2;
  if (top > n - low) top = n - low;
  if (top < 0) top = 0;
  var passive = n - top - low;
  var bag = [];
  for (var i = 0; i < top; i++) bag.push(i % 2 ? 10 : 9);
  for (var p = 0; p < passive; p++) bag.push(p % 2 ? 8 : 7);
  for (var k = 0; k < low; k++) bag.push([6, 4][k % 2]);
  var out = new Array(n);
  var used = {};
  for (var s = 0; s < n; s++) {
    var slot = (s * 7) % n;
    while (used[slot]) slot = (slot + 1) % n;
    used[slot] = 1;
    out[slot] = bag[s];
  }
  return out;
}
  function actualPct(hotel, metric, index) {
    var lift = LIFT[hotel][index];
    if (metric !== "itr") lift = Math.round(lift / 2);
    var base = GOAL_BASE[metric] == null ? 75 : GOAL_BASE[metric];
    var bias = { maintenance: -4, pool: 2, fitness: 3, staff_service: 2, check_in: 1, breakfast_service: 1, fb_overall: -1, anticipated_needs: -2, brand_promise: 1 }[metric] || 0;
    return Math.max(40, Math.min(92, base + bias + lift));
  }
  function starScores(lift) {
    if (lift < 0) return [4, 4, 3, 3, 4];
    return [5, 5, 5, 4, 4];
  }
  var FLOOR = 80;
  var PERIOD_KINDS = ["mtd", "t3", "t12"];
  var DEPTS = [
    {
      id: "front_desk", en: "Front Desk", es: "Recepción",
      roles: ["front_desk", "gm", "agm", "above_property"],
      metrics: [
        { id: "overall_experience", en: "Overall Experience", es: "Experiencia general", goal: 83, medallia: "Overall Experience" },
        { id: "overall_service", en: "Service", es: "Servicio", goal: 88, medallia: "Overall Service" },
        { id: "check_in", en: "Overall Check-In", es: "Registro de llegada", goal: null, medallia: "Overall Check-In" },
        { id: "member_recognition", en: "Member Recognition", es: "Reconocimiento de socios", goal: null, medallia: "Loyalty Recognition", roles: ["front_desk", "gm", "agm", "above_property"] }
      ]
    },
    {
      id: "breakfast", en: "Breakfast", es: "Desayuno",
      roles: ["breakfast", "gm", "agm", "above_property"],
      metrics: [
        { id: "breakfast", en: "Breakfast", es: "Desayuno", goal: 80, medallia: "Overall Breakfast" },
        { id: "fb_overall", en: "Overall F&B", es: "Alimentos y bebidas", goal: null, medallia: "Overall F&B" }
      ]
    },
    {
      id: "maintenance", en: "Maintenance", es: "Mantenimiento",
      roles: ["maintenance", "gm", "agm", "above_property"],
      metrics: [
        { id: "hotel_condition", en: "Hotel Condition", es: "Condición del hotel", goal: 82, medallia: "Hotel Condition" },
        { id: "guest_room_condition", en: "Guest Room Condition", es: "Condición del cuarto", goal: 83, medallia: "Overall Guest Room" }
      ]
    },
    {
      id: "housekeeping", en: "Housekeeping", es: "Ama de llaves",
      roles: ["hk_lead", "housekeeper", "gm", "agm", "above_property"],
      metrics: [
        { id: "room_cleanliness", en: "Room Cleanliness", es: "Limpieza del cuarto", goal: 87 },
        { id: "bathroom_cleanliness", en: "Bathroom Cleanliness", es: "Limpieza del baño", goal: 88, medallia: "Overall Guest Bathroom" }
      ]
    },
    {
      id: "laundry", en: "Laundry", es: "Lavandería",
      roles: ["laundry", "gm", "agm", "above_property"],
      metrics: [
        { id: "towels", en: "Towels", es: "Toallas", goal: 87 },
        { id: "room_cleanliness", en: "Room Cleanliness", es: "Limpieza del cuarto", goal: 87, shared: true },
        { id: "bathroom_cleanliness", en: "Bathroom Cleanliness", es: "Limpieza del baño", goal: 88, shared: true }
      ]
    },
    {
      id: "houseman", en: "Houseman", es: "Houseman",
      roles: ["house_person", "gm", "agm", "above_property"],
      inspections: "public_area",
      metrics: []
    },
    {
      id: "hotel", en: "Hotel", es: "Hotel",
      roles: ["gm", "agm", "above_property"],
      metrics: [
        { id: "itr", en: "Likely to Recommend", es: "Probabilidad de recomendar", goal: null, medallia: "Likely to Recommend" },
        { id: "problem_handling", en: "Problem Handling", es: "Manejo de problemas", goal: null, medallia: "Problem Handling" },
        { id: "wifi", en: "Overall Wi-Fi", es: "Wi-Fi general", goal: null, medallia: "Overall Wi-Fi" }
      ]
    }
  ];
  var EXAMPLE_BASE = {
    overall_experience: 81, overall_service: 90, check_in: 86, member_recognition: 70,
    breakfast: 78, fb_overall: 77, hotel_condition: 84, guest_room_condition: 80,
    room_cleanliness: 85, bathroom_cleanliness: 89, towels: 88, itr: 73, problem_handling: 75, wifi: 82
  };

  function gsTx(lang, en, es) { return lang === "es" ? es : en; }
  function escGs(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function periodWindow(today, kind) {
    if (kind === "mtd") return { start: today.slice(0, 8) + "01", end: today };
    if (kind === "t3") return { start: addDays(today, -91), end: today };
    return { start: addDays(today, -364), end: today };
  }
  function shiftExample(base, kind) {
    if (kind === "t3") return Math.round((base - 1.5) * 10) / 10;
    if (kind === "t12") return Math.round((base + 1) * 10) / 10;
    return base;
  }
  function exampleN(kind) {
    if (kind === "t3") return 70;
    if (kind === "t12") return 240;
    return 24;
  }
  function examplePeriods(today) {
    var metrics = [];
    DEPTS.forEach(function (dept) {
      (dept.metrics || []).forEach(function (metric) {
        if (!metrics.some(function (item) { return item.id === metric.id; })) metrics.push(metric);
      });
    });
    var out = [];
    function push(metric, kind, method, value, goal) {
      var win = periodWindow(today, kind);
      out.push({
        hotel: "MSPWE", source: "example", metric: metric, periodKind: kind,
        periodStart: win.start, periodEnd: win.end, asOf: today,
        value: value, n: exampleN(kind), calcMethod: method,
        goal: goal, priorYear: Math.round((value - 4) * 10) / 10, region: null, brand: null
      });
    }
    metrics.forEach(function (metric) {
      PERIOD_KINDS.forEach(function (kind) {
        var base = EXAMPLE_BASE[metric.id] == null ? 80 : EXAMPLE_BASE[metric.id];
        push(metric.id, kind, "topbox_8_10", shiftExample(base, kind), metric.goal);
      });
    });
    PERIOD_KINDS.forEach(function (kind) {
      push("overall_experience", kind, "topbox_9_10", shiftExample(64, kind), 83);
    });
    return out;
  }
  function deptsFor(role) {
    var key = normalize(role);
    return DEPTS.filter(function (dept) {
      if (LEADERS[key]) return true;
      return (dept.roles || []).indexOf(key) >= 0;
    }).map(function (dept) {
      var metrics = (dept.metrics || []).filter(function (metric) {
        if (!metric.roles || LEADERS[key]) return true;
        return metric.roles.indexOf(key) >= 0;
      });
      return {
        id: dept.id, en: dept.en, es: dept.es, inspections: dept.inspections || "",
        metrics: metrics
      };
    });
  }
  function normFact(row) {
    row = row || {};
    var prior = row.priorYear != null ? row.priorYear : row.prior_year;
    return {
      hotel: row.hotel,
      source: row.source || "",
      metric: row.metric,
      periodKind: row.periodKind || row.period_kind,
      periodStart: String(row.periodStart || row.period_start || "").slice(0, 10),
      periodEnd: String(row.periodEnd || row.period_end || "").slice(0, 10),
      asOf: String(row.asOf || row.as_of || "").slice(0, 10),
      value: row.value == null || row.value === "" ? null : Number(row.value),
      n: row.n == null || row.n === "" ? null : Number(row.n),
      calcMethod: row.calcMethod || row.calc_method || "",
      goal: row.goal == null || row.goal === "" ? null : Number(row.goal),
      priorYear: prior == null || prior === "" ? null : Number(prior),
      region: row.region == null || row.region === "" ? null : Number(row.region),
      brand: row.brand == null || row.brand === "" ? null : Number(row.brand)
    };
  }
  function pickFacts(facts, hotel) {
    var rows = [];
    (facts || []).forEach(function (row) {
      var next = normFact(row);
      if (next.hotel === hotel) rows.push(next);
    });
    var liveRows = rows.filter(function (row) { return row.source && row.source !== "example"; });
    if (liveRows.length) return { origin: "live", rows: liveRows };
    if (rows.length) return { origin: "example", rows: rows };
    return { origin: "empty", rows: [] };
  }
  function factFor(rows, metric, kind, method) {
    var found = null;
    rows.forEach(function (row) {
      if (row.metric !== metric || row.periodKind !== kind || row.calcMethod !== method) return;
      if (!found || String(row.asOf) > String(found.asOf)) found = row;
    });
    return found;
  }
  function fmtPct(value) {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return (Math.round(Number(value) * 10) / 10).toFixed(1) + "%";
  }
  function fmtGoalText(goal, lang) {
    if (goal == null || !Number.isFinite(Number(goal))) return gsTx(lang, "Unset", "Sin definir");
    return (Math.round(Number(goal) * 10) / 10).toFixed(1);
  }
  function fmtDay(iso, lang) {
    if (!iso) return "";
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).replace(".", "");
  }
  function fmtSpan(start, end, lang) {
    if (!start || !end) return "—";
    if (start.slice(0, 4) !== end.slice(0, 4)) return fmtDay(start, lang) + ", " + start.slice(0, 4) + "–" + fmtDay(end, lang) + ", " + end.slice(0, 4);
    return fmtDay(start, lang) + "–" + fmtDay(end, lang) + ", " + end.slice(0, 4);
  }
  function methodLabel(method, lang) {
    if (method === "topbox_9_10") return gsTx(lang, "HotelHQ top-box, 9–10", "HotelHQ caja alta, 9–10");
    return gsTx(lang, "Medallia top-box, 8–10", "Medallia caja alta, 8–10");
  }
  function scoreResult(value, goal, lang) {
    if (value == null || !Number.isFinite(Number(value))) return gsTx(lang, "No score yet", "Sin calificación");
    var floorNote = Number(value) < FLOOR ? " · " + gsTx(lang, "Below floor", "Bajo el piso") : "";
    if (goal == null || !Number.isFinite(Number(goal))) return gsTx(lang, "No goal yet", "Sin meta") + floorNote;
    var met = Math.round(Number(value) * 10) / 10 + 1e-9 >= Math.round(Number(goal) * 10) / 10;
    return (met ? gsTx(lang, "Met goal", "Cumple la meta") : gsTx(lang, "Short of goal", "Bajo la meta")) + floorNote;
  }
  function departmentHtml(facts, role, hotel, lang) {
    lang = lang === "es" ? "es" : "en";
    if (HOTELS.indexOf(hotel) < 0) return "";
    var depts = deptsFor(role);
    if (!depts.length) return "";
    var picked = pickFacts(facts, hotel);
    var methods = ["topbox_8_10"];
    picked.rows.forEach(function (row) {
      if (row.calcMethod && methods.indexOf(row.calcMethod) < 0) methods.push(row.calcMethod);
    });
    var banner = "";
    if (picked.origin === "example") {
      banner = "<p class=\"gs-note\"><span class=\"ex\">EXAMPLE</span> " + escGs(gsTx(lang, "Sample department scores for this demo. No real guests.", "Calificaciones de ejemplo por departamento. No hay huéspedes reales.")) + "</p>";
    } else if (picked.origin === "empty") {
      banner = "<p class=\"gs-note\">" + escGs(gsTx(lang, "Medallia feed not connected.", "La fuente Medallia no está conectada.")) + "</p>";
    }
    var note = "<p class=\"gs-note\">" + escGs(gsTx(lang,
      "Medallia top-box is the share of 8–10 scores. HotelHQ top-box is the share of 9–10 scores. They stay in separate tables. My Region and Brand stay blank until the extract includes them. Prior year is same period year ago. The minimum floor is 80, separate from the internal goal and from IHG official targets.",
      "La caja alta de Medallia es la parte de notas 8–10. La caja alta de HotelHQ es la parte de notas 9–10. Van en tablas separadas. Mi región y la marca quedan en blanco hasta que el extracto las traiga. El año anterior es el mismo período del año pasado. El piso mínimo es 80, aparte de la meta interna y de las metas oficiales de IHG."
    )) + "</p>";
    var blocks = depts.map(function (dept) {
      if (dept.inspections && !dept.metrics.length) {
        return "<section class=\"gs-dept\"><h3>" + escGs(lang === "es" ? dept.es : dept.en) + "</h3><p class=\"gs-note\">" + escGs(gsTx(lang,
          "IHG has no public-area guest score. Public-area inspections belong on this view. Cleaner and inspector names stay off until a row has a verified room, stay, and check-in time.",
          "IHG no tiene una métrica de áreas públicas. Las inspecciones de áreas públicas van en esta vista. Los nombres de quien limpia o inspecciona no aparecen hasta que haya un cuarto, una estadía y una hora de llegada verificados."
        )) + "</p></section>";
      }
      var tables = methods.map(function (method) {
        var any = dept.metrics.some(function (metric) {
          return PERIOD_KINDS.some(function (kind) { return !!factFor(picked.rows, metric.id, kind, method); });
        });
        if (method !== "topbox_8_10" && !any) return "";
        var body = dept.metrics.map(function (metric) {
          var has = PERIOD_KINDS.some(function (kind) { return !!factFor(picked.rows, metric.id, kind, method); });
          if (method !== "topbox_8_10" && !has) return "";
          return PERIOD_KINDS.map(function (kind) {
            var fact = factFor(picked.rows, metric.id, kind, method);
            var today = fact && fact.asOf ? fact.asOf : new Date().toISOString().slice(0, 10);
            var win = fact && fact.periodStart ? { start: fact.periodStart, end: fact.periodEnd } : periodWindow(today, kind);
            var value = fact ? fact.value : null;
            var n = fact && fact.n != null ? String(fact.n) : "—";
            var prior = fact ? fmtPct(fact.priorYear) : "—";
            var region = fact ? fmtPct(fact.region) : "—";
            var brand = fact ? fmtPct(fact.brand) : "—";
            var cls = "";
            if (value != null && metric.goal != null) cls = Number(value) + 1e-9 >= Number(metric.goal) ? "gs-met" : "gs-miss";
            return "<tr class=\"" + cls + "\"><td>" + escGs(lang === "es" ? metric.es : metric.en) + "</td><td>" + escGs(kind.toUpperCase()) + "</td><td>" +
              escGs(fmtSpan(win.start, win.end, lang)) + "</td><td>" + escGs(fmtPct(value)) + "</td><td>" + escGs(n) + "</td><td>" +
              escGs(fmtGoalText(metric.goal, lang)) + "</td><td>" + FLOOR + "</td><td>" + escGs(prior) + "</td><td>" + escGs(region) + "</td><td>" + escGs(brand) + "</td><td>" +
              escGs(scoreResult(value, metric.goal, lang)) + "</td></tr>";
          }).join("");
        }).join("");
        if (!body) return "";
        return "<h4>" + escGs(methodLabel(method, lang)) + "</h4><div class=\"gs-scroll\"><table class=\"gs-t\"><thead><tr><th>" +
          escGs(gsTx(lang, "Metric", "Métrica")) + "</th><th>" + escGs(gsTx(lang, "Period", "Período")) + "</th><th>" +
          escGs(gsTx(lang, "Dates", "Fechas")) + "</th><th>" + escGs(gsTx(lang, "Score", "Nota")) + "</th><th>n</th><th>" +
          escGs(gsTx(lang, "Goal", "Meta")) + "</th><th>" + escGs(gsTx(lang, "Floor", "Piso")) + "</th><th>" +
          escGs(gsTx(lang, "Prior year", "Año anterior")) + "</th><th>" + escGs(gsTx(lang, "My Region", "Mi región")) + "</th><th>" +
          escGs(gsTx(lang, "Brand", "Marca")) + "</th><th>" + escGs(gsTx(lang, "Result", "Resultado")) + "</th></tr></thead><tbody>" +
          body + "</tbody></table></div>";
      }).join("");
      return "<section class=\"gs-dept\"><h3>" + escGs(lang === "es" ? dept.es : dept.en) + "</h3>" + tables + "</section>";
    }).join("");
    return "<div class=\"gs-depts\" id=\"gsDepts\">" + banner + note + blocks + "</div>";
  }

  function buildDemo(today) {
    var surveys = [];
    var goals = {};
    var months = waveMonths(today);
    HOTELS.forEach(function (hotel) {
      goals[hotel] = {};
      Object.keys(GOAL_BASE).forEach(function (metric) {
        goals[hotel][metric] = {};
        months.forEach(function (month) { goals[hotel][metric][month] = GOAL_BASE[metric]; });
      });
      months.forEach(function (month, index) {
        var end = monthEnd(month, today);
        if (!end) return;
        var endDay = Number(end.slice(8, 10));
        var itrScores = fillScores(PER_MONTH, actualPct(hotel, "itr", index));
        var pools = {};
        METRICS.forEach(function (m) {
          if (m.kind === "stars") return;
          if (m.brands && m.brands.indexOf(BRAND[hotel]) < 0) return;
          pools[m.id] = fillScores(PER_MONTH, actualPct(hotel, m.id, index));
        });
        for (var i = 0; i < PER_MONTH; i++) {
          var day = 1 + Math.floor(i * endDay / PER_MONTH);
          if (day > endDay) day = endDay;
          var date = month.slice(0, 8) + pad(day);
          var metrics = {};
          Object.keys(pools).forEach(function (id) {
            if (id === "fitness" && i % 3 !== 0) return;
            if (id === "pool" && i % 5 >= 2) return;
            metrics[id] = pools[id][i];
          });
          var itr = metrics.itr;
          var note = itr <= 6 ? NOTES[i % NOTES.length] : null;
          var floor = 1 + (i % 3);
          var room = String(floor * 100 + (i % 8) + 1);
          surveys.push({
            id: "ex-" + hotel + "-" + date.replace(/-/g, "") + "-" + i,
            hotel: hotel,
            date: date,
            room: room,
            source: BRAND[hotel].toLowerCase(),
            itr: itr,
            comment: note ? note[0] : "",
            commentEs: note ? note[1] : "",
            metrics: metrics
          });
        }
        ["google_stars", "tripadvisor_stars"].forEach(function (metric) {
          var scores = starScores(LIFT[hotel][index]);
          for (var s = 0; s < scores.length; s++) {
            var sday = 1 + Math.floor((s + 1) * endDay / (scores.length + 1));
            if (sday > endDay) sday = endDay;
            var sdate = month.slice(0, 8) + pad(sday);
            var one = {};
            one[metric] = scores[s];
            surveys.push({
              id: "ex-" + hotel + "-" + metric + "-" + sdate.replace(/-/g, "") + "-" + s,
              hotel: hotel,
              date: sdate,
              room: "",
              source: metric === "google_stars" ? "google" : "tripadvisor",
              itr: null,
              comment: "",
              commentEs: "",
              metrics: one
            });
          }
        });
      });
    });
    return { origin: "example", surveys: surveys, goals: goals, periods: examplePeriods(today) };
  }

  var api = {
    ACCESS: ACCESS,
    METRICS: METRICS,
    HOTELS: HOTELS,
    BRAND: BRAND,
    normalize: normalize,
    isLeader: isLeader,
    metricsForRole: metricsForRole,
    allows: allows,
    metricById: metricById,
    waveOf: waveOf,
    waveMonths: waveMonths,
    windows: windows,
    stat: stat,
    fmt: fmt,
    fmtGoal: fmtGoal,
    meets: meets,
    summarize: summarize,
    monthRows: monthRows,
    project: project,
    lowScores: lowScores,
    metricList: metricList,
    workOrderFromSurvey: workOrderFromSurvey,
    buildDemo: buildDemo,
    FLOOR: FLOOR,
    DEPTS: DEPTS,
    examplePeriods: examplePeriods,
    deptsFor: deptsFor,
    pickFacts: pickFacts,
    departmentHtml: departmentHtml
  };
  root.GuestScores = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  var live = null;
  var liveState = "";

  function tx(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function dbRole() {
    var role = "";
    try { role = authRole(); } catch (e) { role = ""; }
    return normalize(role);
  }
  function ownHotel() {
    var u = null;
    try { u = meUser(); } catch (e) { u = null; }
    if (u && u.hotel) return u.hotel;
    return (typeof S !== "undefined" && HOTELS.indexOf(S.hotel) >= 0) ? S.hotel : "";
  }
  function hotelsFor(role) {
    if (normalize(role) === "above_property") return HOTELS.slice();
    var h = ownHotel();
    return HOTELS.indexOf(h) >= 0 ? [h] : [];
  }
  function todayISO() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    return new Date().toISOString().slice(0, 10);
  }
  function monthName(month) {
    var p = month.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, 1));
    var loc = (typeof LANG !== "undefined" && LANG === "es") ? "es-MX" : "en-US";
    return d.toLocaleDateString(loc, { month: "short", timeZone: "UTC" }).replace(".", "");
  }
  function safeId(v) { return /^[A-Za-z0-9_-]+$/.test(String(v || "")); }
  function labelOf(m) { return tx(m.en, m.es); }
  function shortOf(m) { return tx(m.short || m.en, m.short || m.es); }

  function mergeGoals(base) {
    var out = {};
    HOTELS.forEach(function (hotel) {
      out[hotel] = {};
      var src = (base && base[hotel]) || {};
      Object.keys(src).forEach(function (metric) { out[hotel][metric] = Object.assign({}, src[metric]); });
      var over = (typeof S !== "undefined" && S.gsGoals && S.gsGoals[hotel]) || {};
      Object.keys(over).forEach(function (metric) {
        out[hotel][metric] = Object.assign({}, out[hotel][metric] || {}, over[metric]);
      });
    });
    return out;
  }
  function mapSurveyRow(r) {
    var metrics = {};
    (r.guest_survey_metrics || []).forEach(function (m) { metrics[m.metric] = Number(m.score); });
    if (r.itr != null && metrics.itr == null) metrics.itr = Number(r.itr);
    return {
      id: String(r.id),
      hotel: r.hotel,
      date: String(r.survey_date).slice(0, 10),
      room: r.room || "",
      source: r.source || "",
      itr: r.itr == null ? (metrics.itr == null ? null : Number(metrics.itr)) : Number(r.itr),
      comment: r.comment || "",
      commentEs: "",
      metrics: metrics
    };
  }
  function mapFacts(rows) {
    var map = {};
    (rows || []).forEach(function (r) {
      var id = String(r.survey_id);
      if (!map[id]) map[id] = { id: id, hotel: r.hotel, date: String(r.survey_date).slice(0, 10), room: "", source: "", itr: null, comment: "", commentEs: "", metrics: {} };
      map[id].metrics[r.metric] = Number(r.score);
      if (r.metric === "itr") map[id].itr = Number(r.score);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function mapGoals(rows) {
    var out = {};
    (rows || []).forEach(function (r) {
      var month = String(r.month).slice(0, 10);
      if (!out[r.hotel]) out[r.hotel] = {};
      if (!out[r.hotel][r.metric]) out[r.hotel][r.metric] = {};
      out[r.hotel][r.metric][month] = Number(r.goal_pct);
    });
    return out;
  }
  function scoreLive() {
    try { if (typeof authMode !== "undefined" && authMode === "live") return true; } catch (e) {}
    try { if (root.HOTELHQ_CONFIG && String(root.HOTELHQ_CONFIG.mode) === "live") return true; } catch (e2) {}
    return false;
  }
  function mapPeriod(r) {
    return {
      hotel: r.hotel, source: r.source || "", metric: r.metric,
      periodKind: r.period_kind, periodStart: String(r.period_start || "").slice(0, 10),
      periodEnd: String(r.period_end || "").slice(0, 10), asOf: String(r.as_of || "").slice(0, 10),
      value: r.value == null ? null : Number(r.value), n: r.n == null ? null : Number(r.n),
      calcMethod: r.calc_method, goal: r.goal == null ? null : Number(r.goal),
      priorYear: r.prior_year == null ? null : Number(r.prior_year),
      region: r.region == null ? null : Number(r.region), brand: r.brand == null ? null : Number(r.brand)
    };
  }
  function ensureLive() {
    if (!scoreLive() || liveState === "loading" || liveState === "ready" || liveState === "empty") return;
    if (typeof useRemote !== "function" || !useRemote() || typeof sb === "undefined" || !sb) {
      liveState = "empty";
      live = { surveys: [], goals: {}, periods: [] };
      return;
    }
    liveState = "loading";
    var from = addDays(waveOf(todayISO()).start, -14);
    var leader = isLeader(dbRole());
    var hotels = hotelsFor(dbRole());
    var scores = leader
      ? sb.from("guest_surveys").select("id,hotel,survey_date,room,source,itr,comment,guest_survey_metrics(metric,score)").gte("survey_date", from).limit(5000)
      : sb.from("guest_score_facts").select("survey_id,hotel,survey_date,metric,score").gte("survey_date", from).limit(8000);
    if (hotels.length === 1) scores = scores.eq("hotel", hotels[0]);
    var goals = sb.from("itr_goals").select("hotel,month,metric,goal_pct").limit(2000);
    var periods = sb.from("guest_score_period_facts").select("hotel,source,metric,period_kind,period_start,period_end,as_of,value,n,calc_method,goal,prior_year,region,brand").limit(2000);
    if (hotels.length === 1) periods = periods.eq("hotel", hotels[0]);
    else if (hotels.length) periods = periods.in("hotel", hotels);
    Promise.all([scores, goals, periods]).then(function (res) {
      var sres = res[0] || {}, gres = res[1] || {}, pres = res[2] || {};
      var surveys = [];
      if (!sres.error && sres.data && sres.data.length) surveys = leader ? sres.data.map(mapSurveyRow) : mapFacts(sres.data);
      live = {
        surveys: surveys,
        goals: gres.error ? {} : mapGoals(gres.data || []),
        periods: pres.error ? [] : (pres.data || []).map(mapPeriod)
      };
      liveState = "ready";
      try { render(); } catch (e) {}
    }, function () {
      liveState = "empty";
      live = { surveys: [], goals: {}, periods: [] };
      try { render(); } catch (e2) {}
    });
  }
  function bundle() {
    ensureLive();
    var today = todayISO();
    if (scoreLive()) {
      return {
        origin: liveState === "loading" ? "loading" : "live",
        surveys: (live && live.surveys) || [],
        goals: mergeGoals(live && live.goals),
        periods: (live && live.periods) || [],
        today: today
      };
    }
    var demo = buildDemo(today);
    demo.goals = mergeGoals(demo.goals);
    demo.today = today;
    return demo;
  }

  function kpi(summary) {
    return '<div class="gs-k">' + ["t14", "mtd", "wave"].map(function (key) {
      var name = key === "t14" ? tx("T14", "14 días") : key === "mtd" ? tx("MTD", "Mes") : tx("Wave", "Ola");
      var row = summary[key];
      return '<div><b>' + esc(fmt(row)) + '</b><span>' + esc(name) + '</span><small>n=' + row.n + '</small></div>';
    }).join("") + "</div>";
  }
  function chart(rows, kind) {
    var max = kind === "stars" ? 5 : 100;
    var w = 360, h = 168, padL = 28, padB = 24, padT = 8, padR = 8;
    var iw = w - padL - padR, ih = h - padT - padB, y0 = padT + ih;
    var bars = "";
    rows.forEach(function (r, i) {
      var gw = iw / Math.max(1, rows.length);
      var x = padL + i * gw;
      var bw = Math.max(4, gw * 0.26);
      function rect(px, val, fill) {
        if (val == null || !Number.isFinite(val)) return "";
        var bh = Math.max(0, ih * (val / max));
        return '<rect x="' + (px).toFixed(1) + '" y="' + (y0 - bh).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="' + fill + '"></rect>';
      }
      bars += rect(x + gw * 0.16, r.goal, "#9eb6d6");
      var fill = r.meet == null ? "#14365d" : (r.meet ? "#1a7f37" : "#c0262d");
      bars += rect(x + gw * 0.52, r.actual, fill);
      bars += '<text x="' + (x + gw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="9" fill="#445">' + esc(monthName(r.month)) + "</text>";
    });
    var aria = tx("Goal versus actual. Pale bar is the goal. Green met the goal. Red missed it.", "Meta contra real. La barra clara es la meta. Verde cumplió. Rojo no cumplió.");
    return '<svg class="gs-chart" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(aria) + '"><line x1="' + padL + '" y1="' + y0 + '" x2="' + (w - padR) + '" y2="' + y0 + '" stroke="#ddd"></line>' + bars + "</svg>";
  }
  function resultText(row) {
    if (row.actual == null && row.n === 0) return tx("No surveys yet", "Sin encuestas");
    if (row.goal == null) return tx("No goal yet", "Sin meta");
    if (row.meet) return tx("Met", "Cumple");
    return tx("Missed", "No cumple");
  }
  function monthTable(rows, hotel, metric, kind, editable) {
    var body = rows.map(function (r) {
      var cls = r.meet == null ? "" : (r.meet ? "gs-met" : "gs-miss");
      var goalCell;
      if (editable) {
        var max = kind === "stars" ? 5 : 100;
        var min = kind === "stars" ? 1 : 0;
        var val = r.goal == null ? "" : String(r.goal);
        goalCell = '<input type="number" min="' + min + '" max="' + max + '" step="0.1" value="' + esc(val) + '" aria-label="' + esc(monthName(r.month) + " " + metric) + '" onchange="gsSetGoal(\'' + hotel + '\',\'' + r.month + '\',\'' + metric + '\',this.value)">';
      } else goalCell = esc(fmtGoal(r.goal, kind));
      return '<tr class="' + cls + '"><td>' + esc(monthName(r.month)) + "</td><td>" + goalCell + "</td><td>" + esc(fmt({ value: r.actual, kind: kind })) + "</td><td>" + r.n + "</td><td>" + esc(resultText(r)) + "</td></tr>";
    }).join("");
    return '<table class="gs-t"><thead><tr><th>' + esc(tx("Month", "Mes")) + "</th><th>" + esc(tx("Goal", "Meta")) + "</th><th>" + esc(tx("Actual", "Real")) + "</th><th>n</th><th>" + esc(tx("Result", "Resultado")) + "</th></tr></thead><tbody>" + body + "</tbody></table>";
  }
  function metricBlock(surveys, goals, today, hotel, meta, withChart) {
    var sum = summarize(surveys, today, hotel, meta.id, meta.kind);
    var rows = monthRows(surveys, goals, today, hotel, meta.id, meta.kind);
    return '<section class="gs-metric"><h3>' + esc(labelOf(meta)) + "</h3>" + kpi(sum) + (withChart ? chart(rows, meta.kind) : "") + monthTable(rows, hotel, meta.id, meta.kind, false) + "</section>";
  }
  function sampleNote(origin) {
    if (origin !== "example") return "";
    return '<p class="gs-note"><span class="ex">EXAMPLE</span> ' + esc(tx("Sample surveys for this demo. No real guests.", "Encuestas de ejemplo para esta demostración. No hay huéspedes reales.")) + "</p>";
  }
  function waveTitle(today) {
    var w = waveOf(today);
    var name = w.half === 2 ? tx("Jul–Dec", "jul–dic") : tx("Jan–Jun", "ene–jun");
    return name + " " + w.year;
  }

  function lineCard(data, role) {
    var hotel = ownHotel();
    if (HOTELS.indexOf(hotel) < 0 || !guestScoresOn(hotel)) return "";
    var lang = (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en";
    var depts = departmentHtml(data.periods || [], role, hotel, lang);
    var surveys = project(data.surveys || [], role, [hotel]);
    var list = data.surveys && data.surveys.length ? metricList(hotel, role, surveys) : [];
    if (!list.length && !depts) return "";
    var blocks = list.map(function (meta, i) {
      return metricBlock(surveys, data.goals, data.today, hotel, meta, i === 0);
    }).join("");
    var surveyNote = list.length ? '<p class="gs-note">' + esc(tx("Top-box is 9–10 out of 10. The pale bar is the goal. Green met it. Red missed it.", "La caja alta es 9–10 de 10. La barra clara es la meta. Verde cumplió. Rojo no cumplió.")) + "</p>" : "";
    return '<div class="card gs" id="gsHome"><h3>' + esc(tx("Guest scores", "Calificaciones de huéspedes")) + "</h3>" + sampleNote(data.origin) + '<p class="gs-note">' + esc(hotel + " · " + BRAND[hotel]) + " · " + esc(tx("Scores for your department at this hotel.", "Calificaciones de tu departamento en este hotel.")) + (list.length ? " · " + esc(waveTitle(data.today)) : "") + "</p>" + blocks + surveyNote + depts + "</div>";
  }
  function leaderCard(data, role) {
    var hotels = hotelsFor(role).filter(guestScoresOn);
    if (!hotels.length) return "";
    var bits = hotels.map(function (hotel) {
      var sum = summarize(data.surveys, data.today, hotel, "itr", "topbox");
      return '<button type="button" class="gs-jump" onclick="go(\'gscores\')"><b>' + esc(hotel + " · " + BRAND[hotel]) + "</b>" + kpi(sum) + "</button>";
    }).join("");
    return '<div class="card gs" id="gsHome"><div class="row"><h3 style="flex:1">' + esc(tx("Guest scores", "Calificaciones de huéspedes")) + '</h3><button type="button" class="btn2" onclick="go(\'gscores\')">' + esc(tx("See all", "Ver todo")) + "</button></div>" + sampleNote(data.origin) + '<p class="gs-note">ITR · ' + esc(tx("top-box 9–10", "caja alta 9–10")) + " · " + esc(waveTitle(data.today)) + "</p>" + bits + "</div>";
  }
  function guestScoresOn(hotel) {
    try {
      if (typeof HotelFeatures !== "undefined" && HotelFeatures.on) return HotelFeatures.on(hotel, "guest_scores") !== false;
    } catch (e) {}
    return true;
  }
  function homeCard() {
    var role = dbRole();
    if (!role) return "";
    if (!guestScoresOn(ownHotel())) return "";
    var data = bundle();
    var lang = (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en";
    if (isLeader(role) && (!data.surveys || !data.surveys.length)) {
      var hotel = ownHotel() || (hotelsFor(role)[0] || "");
      return '<div class="card gs" id="gsHome"><h3>' + esc(tx("Guest scores", "Calificaciones de huéspedes")) + "</h3><p class=\"gs-note\">" + esc(hotel) + "</p>" + departmentHtml(data.periods || [], role, hotel, lang) + '<button type="button" class="btn" onclick="go(\'gscores\')">' + esc(tx("Open department scores", "Abrir calificaciones")) + "</button></div>";
    }
    if (isLeader(role)) return leaderCard(data, role);
    if (!metricsForRole(role).length) return "";
    return lineCard(data, role);
  }

  function page() {
    var role = dbRole();
    if (!isLeader(role)) {
      if (!metricsForRole(role).length) return '<div class="card gs"><h2>' + esc(tx("Guest scores", "Calificaciones de huéspedes")) + "</h2></div>";
      return '<div class="gs" id="gsRoot"><h2>' + esc(tx("Guest scores", "Calificaciones de huéspedes")) + "</h2>" + lineCard(bundle(), role) + "</div>";
    }
    var data = bundle();
    var hotels = hotelsFor(role);
    var detail = (S.gsHotel && hotels.indexOf(S.gsHotel) >= 0) ? S.gsHotel : (hotels.indexOf(S.hotel) >= 0 ? S.hotel : hotels[0]);
    var surveys = project(data.surveys, role, hotels);
    var mine = surveys.filter(function (s) { return s.hotel === detail; });
    var list = metricList(detail, role, mine);
    var chosen = (S.gsMetric && list.some(function (m) { return m.id === S.gsMetric; })) ? S.gsMetric : "itr";
    var chosenMeta = metricById(chosen);
    var editable = normalize(role) === "above_property";
    var hotelButtons = hotels.length < 2 ? "" : hotels.map(function (hotel) {
      var sum = summarize(mine.length && hotel === detail ? mine : surveys, data.today, hotel, "itr", "topbox");
      return '<button type="button" class="' + (hotel === detail ? "on" : "") + '" onclick="gsPickHotel(\'' + hotel + '\')"><b>' + esc(hotel + " · " + BRAND[hotel]) + "</b>" + kpi(sum) + "</button>";
    }).join("");
    var grid = list.map(function (meta) {
      var sum = summarize(mine, data.today, detail, meta.id, meta.kind);
      return '<section class="gs-metric"><h3>' + esc(labelOf(meta)) + "</h3>" + kpi(sum) + "</section>";
    }).join("");
    var chips = list.map(function (meta) {
      return '<button type="button" class="' + (meta.id === chosen ? "on" : "") + '" onclick="gsPickMetric(\'' + meta.id + '\')">' + esc(shortOf(meta)) + "</button>";
    }).join("");
    var rows = monthRows(mine, data.goals, data.today, detail, chosen, chosenMeta.kind);
    var lows = lowScores(mine, detail, data.today).slice(0, 40);
    var woRows = lows.map(function (s) {
      var made = false;
      try { made = ((S.h[s.hotel] || {}).wo || []).some(function (w) { return w.gsId === s.id; }); } catch (e) { made = false; }
      var btn = made
        ? '<button type="button" class="btn2" disabled>' + esc(tx("Work order created", "Orden de trabajo creada")) + "</button>"
        : '<button type="button" class="btn" onclick="gsWo(\'' + s.id + '\')">' + esc(tx("Create work order", "Crear orden de trabajo")) + "</button>";
      var comment = tx(s.comment, s.commentEs);
      return '<div class="gs-low"><div class="row"><b>' + esc(s.date) + "</b><b>" + esc(tx("Room", "Cuarto")) + " " + esc(s.room) + "</b><b>ITR " + esc(String(s.itr)) + "</b></div>" + (comment ? "<p>" + esc(comment) + "</p>" : "") + btn + "</div>";
    }).join("");
    var surveyOn = !!(data.surveys && data.surveys.length);
    return '<div class="gs" id="gsRoot"><h2>' + esc(tx("Guest scores", "Calificaciones de huéspedes")) + "</h2>" +
      sampleNote(data.origin) +
      (surveyOn
        ? '<p class="gs-note">' + esc(tx("Top-box is the share of scores that are 9 or 10 out of 10. Google and TripAdvisor are star averages. ITR is the headline.", "La caja alta es la parte de notas de 9 o 10 sobre 10. Google y TripAdvisor son promedios de estrellas. ITR es la cifra principal.")) + " · " + esc(waveTitle(data.today)) + "</p>" +
          (hotelButtons ? '<div class="gs-hotels">' + hotelButtons + "</div>" : "") +
          '<div class="card"><h3>' + esc(detail + " · " + BRAND[detail]) + " · " + esc(tx("All metrics", "Todas las métricas")) + "</h3>" + grid + "</div>" +
          '<div class="card" id="gsGoal"><h3>' + esc(labelOf(chosenMeta)) + " · " + esc(tx("Goal vs actual", "Meta contra real")) + "</h3>" +
          '<div class="wlseg">' + chips + "</div>" + chart(rows, chosenMeta.kind) +
          '<p class="gs-note">' + esc(tx("The pale bar is the goal. Green means the month met the goal. Red means it missed.", "La barra clara es la meta. Verde significa que el mes cumplió. Rojo significa que no cumplió.")) + (editable ? " " + esc(tx("JR Corporate can set a goal for any metric.", "JR Corporativo puede poner una meta para cualquier métrica.")) : "") + "</p>" +
          monthTable(rows, detail, chosen, chosenMeta.kind, editable) + "</div>" +
          '<div class="card" id="gsLow"><h3>' + esc(tx("Surveys with ITR of 6 or less", "Encuestas con ITR de 6 o menos")) + "</h3>" +
          (woRows || '<p class="gs-note">' + esc(tx("No surveys at 6 or below in this wave.", "No hay encuestas de 6 o menos en esta ola.")) + "</p>") + "</div>"
        : (hotels.length > 1 ? '<div class="gs-hotels">' + hotels.map(function (hotel) {
          return '<button type="button" class="' + (hotel === detail ? "on" : "") + '" onclick="gsPickHotel(\'' + hotel + '\')">' + esc(hotel + " · " + BRAND[hotel]) + "</button>";
        }).join("") + "</div>" : "")) +
      departmentHtml(data.periods || [], role, detail, (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en") + "</div>";
  }

  root.gsPickHotel = function (hotel) {
    if (!isLeader(dbRole()) || HOTELS.indexOf(hotel) < 0) return;
    if (dbRole() !== "above_property" && hotel !== ownHotel()) return;
    S.gsHotel = hotel;
    if (dbRole() === "above_property") S.hotel = hotel;
    save();
    render();
  };
  root.gsPickMetric = function (metric) {
    if (!/^[a-z0-9_]+$/.test(metric)) return;
    S.gsMetric = metric;
    render();
  };
  root.gsSetGoal = function (hotel, month, metric, raw) {
    if (dbRole() !== "above_property") return;
    if (HOTELS.indexOf(hotel) < 0 || !/^\d{4}-\d{2}-01$/.test(month) || !/^[a-z0-9_]+$/.test(metric)) return;
    var meta = metricById(metric);
    var n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (meta.kind === "stars") { if (n < 1 || n > 5) return; }
    else if (n < 0 || n > 100) return;
    S.gsGoals = S.gsGoals || {};
    S.gsGoals[hotel] = S.gsGoals[hotel] || {};
    S.gsGoals[hotel][metric] = S.gsGoals[hotel][metric] || {};
    S.gsGoals[hotel][metric][month] = n;
    save();
    if (typeof useRemote === "function" && useRemote() && typeof sb !== "undefined" && sb && sb.rpc) {
      sb.rpc("set_itr_goal", { p_hotel: hotel, p_month: month, p_metric: metric, p_goal: n });
    }
    render();
  };
  root.gsWo = function (id) {
    if (!isLeader(dbRole()) || !safeId(id)) return;
    var data = bundle();
    var survey = null;
    for (var i = 0; i < data.surveys.length; i++) if (data.surveys[i].id === id) survey = data.surveys[i];
    if (!survey || !survey.room || survey.itr == null) return;
    var hotel = survey.hotel;
    if (!S.h[hotel]) return;
    var list = S.h[hotel].wo || (S.h[hotel].wo = []);
    if (list.some(function (w) { return w.gsId === id; })) return;
    var draft = workOrderFromSurvey(survey);
    var next = list.reduce(function (m, w) { return Math.max(m, Number(w.id) || 0); }, 0) + 1;
    list.unshift({
      id: next, room: draft.room, t: draft.text_en, text_en: draft.text_en, text_es: draft.text_es,
      lang: "en", p: draft.priority, s: "Open", photo: "", photo_paths: [], comments: [], gsId: id
    });
    save();
    try { showToast(tx("Work order created", "Orden de trabajo creada")); } catch (e) {}
    render();
  };

  if (typeof M !== "undefined") M.gscores = ["📈", "Guest Scores"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Guest Scores"] = "Calificaciones de huéspedes";
  if (typeof V !== "undefined") V.gscores = page;
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try { card = homeCard(); } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var who = role;
      try { who = authRole() || role; } catch (e) { who = role; }
      var hotel = "";
      try { hotel = S.hotel; } catch (e2) { hotel = ""; }
      var show = guestScoresOn(hotel) && (isLeader(who) || deptsFor(who).length > 0);
      if (show && list.indexOf("gscores") < 0) list.splice(Math.min(2, list.length), 0, "gscores");
      if (!guestScoresOn(hotel)) list = list.filter(function (id) { return id !== "gscores"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined") RSEC[4][2].push("gscores"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("gscores") < 0) NOCOLS.push("gscores"); } catch (e) {}

  var style = document.createElement("style");
  style.textContent = [
    ".gs-k{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0}",
    ".gs-k div{background:#eef3fa;border-radius:8px;padding:8px 4px;text-align:center}",
    ".gs-k b{display:block;font-size:20px}",
    ".gs-k span,.gs-k small{display:block;color:#3c4658;font-size:12px}",
    ".gs-t{width:100%;border-collapse:collapse;font-size:14px}",
    ".gs-t th,.gs-t td{padding:6px 4px;border-bottom:1px solid #e6ebf2;text-align:left;vertical-align:middle}",
    ".gs-t input{max-width:92px;min-height:44px}",
    ".gs-met{background:#d4f5dc}",
    ".gs-miss{background:#fde2e1}",
    ".gs-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".gs-chart{width:100%;height:auto;display:block}",
    ".gs-hotels{display:grid;gap:8px;margin-bottom:12px}",
    ".gs-hotels button,.gs-jump{display:block;width:100%;text-align:left;background:#fff;border:1px solid #e1e6ee;border-radius:12px;padding:8px;margin:0 0 8px}",
    ".gs-hotels button.on{border-color:#14365d;background:#f4f7fb}",
    ".gs-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}",
    ".gs-scroll .gs-t{min-width:640px}",
    ".gs-metric{padding:8px 0;border-top:1px solid #e6ebf2}",
    ".gs-metric h3{margin:8px 0 4px}",
    ".gs-low{padding:8px 0;border-bottom:1px solid #e6ebf2}",
    ".gs-low .btn,.gs-low .btn2{width:100%}",
    ".gs-dept{margin-top:12px}",
    ".gs-dept h3{margin:12px 0 4px}",
    ".gs-dept h4{margin:8px 0 4px;font-size:14px}"
  ].join("");
  document.head.appendChild(style);
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "guest_scores", en: "Guest scores", es: "Calificaciones de huéspedes", order: 20 });
})(typeof window !== "undefined" ? window : globalThis);
