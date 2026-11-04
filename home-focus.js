/* Home shows at most four compact pieces: a Today summary, urgent alerts,
   the role's main actions, and a collapsed More section. Cards with nothing
   to show are omitted. Sales Leads by Hotel (#slRollup) and the sales-lead
   home card stay in More. Nothing is removed from its own screen. */
(function (root) {
  "use strict";

  function L(en, es) {
    return (typeof LANG !== "undefined" && LANG === "es") ? es : en;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function todayModel(role, snap) {
    snap = snap || {};
    function row(n, en, es) { return { n: String(n), en: en, es: es }; }
    var items;
    if (role === "Shuttle Driver" && snap.shuttle === false) {
      return { noteEn: "No shuttle at this property.", noteEs: "No hay shuttle en esta propiedad.", items: [] };
    }
    if (role === "Front Desk") items = [row(snap.arr == null ? "—" : snap.arr, "Arrivals", "Llegadas"), row(num(snap.dirty), "Dirty", "Sucios"), row(num(snap.openWo), "Open WOs", "Órdenes")];
    else if (role === "Housekeeping") items = [row(num(snap.dirty), "Dirty", "Sucios"), row(num(snap.rfi), "To inspect", "Por inspeccionar"), row(num(snap.esc), "Escalations", "Escalaciones")];
    else if (role === "Housekeeper") items = [row(snap.done == null ? "0/0" : snap.done, "Done", "Listos"), row(num(snap.progress), "In progress", "En proceso"), row(num(snap.dnd), "DND / refused", "No molestar")];
    else if (role === "Maintenance") items = [row(num(snap.openWo), "Open WOs", "Órdenes"), row(num(snap.overduePm), "Overdue PMs", "PM atrasados"), row(num(snap.check) + "%", "Checklist", "Lista")];
    else if (role === "Shuttle Driver") items = [row(num(snap.runs), "Runs left", "Viajes"), row(num(snap.check) + "%", "Checklist", "Lista")];
    else if (role === "House Person" || role === "Laundry Attendant" || role === "Breakfast Attendant") items = [row(num(snap.openReq), "Open requests", "Solicitudes"), row(num(snap.check) + "%", "Checklist", "Lista")];
    else items = [row(snap.occ == null ? "—" : snap.occ + "%", "Occupancy", "Ocupación"), row(num(snap.dirty), "Dirty", "Sucios"), row(snap.issues != null ? snap.issues : num(snap.openWo), "Open issues", "Asuntos")];
    return { noteEn: "", noteEs: "", items: items.slice(0, 4) };
  }
  function num(v) { return v == null || v === "" ? 0 : v; }

  function portfolioRow(code, name, snap) {
    if (!snap) return { hotel: code, name: name || code, metric: "—", metricEn: "Occ", metricEs: "Ocup.", issues: "—" };
    var occ = snap.occ != null && snap.occ !== "";
    return {
      hotel: code,
      name: name || code,
      metric: occ ? String(snap.occ) + "%" : (snap.ready != null ? String(snap.ready) : "—"),
      metricEn: occ ? "Occ" : "Rooms ready",
      metricEs: occ ? "Ocup." : "Cuartos listos",
      issues: snap.issues != null ? snap.issues : 0
    };
  }
  function hotelsFor(role, own, all, sees) {
    return (all || []).filter(function (hotel) { return sees(role, own, hotel); });
  }
  function slotFor(id) {
    if (id === "hhqToday" || id === "uxHero") return "today";
    if (id === "hhqUrgent") return "urgent";
    if (id === "hhqActions") return "actions";
    if (id === "hhqMore" || id === "hhqFocus") return "shell";
    return "more";
  }
  function cardIsEmpty(card) {
    card = card || {};
    if (card.keep) return false;
    var rows = Number(card.rows) || 0;
    if (rows > 0) return false;
    if (card.badge === 0 && (card.id === "opsList" || card.id === "alerts" || card.id === "reminders")) return true;
    if (card.id === "mtMgrHome" && card.count === 0) return true;
    if ((card.id === "mtDayBanner" || card.id === "todayCard" || card.id === "alerts") && rows === 0) return true;
    var text = String(card.text || "").replace(/\s+/g, " ").trim();
    if (!text && !card.controls) return true;
    var low = text.toLowerCase();
    var empty = [
      "no alerts.", "no alerts", "sin alertas.", "no hay alertas.",
      "nothing urgent right now.", "nada urgente por ahora.",
      "nothing here yet.", "nada aquí todavía.",
      "no requests yet.", "aún no hay solicitudes.",
      "no open punch issues.",
      "no meetings today.", "no hay reuniones hoy.",
      "none right now.", "nada por ahora."
    ];
    if (empty.indexOf(low) >= 0) return true;
    if (!card.controls && text.length < 180 && /nothing here yet|nada aquí todavía|no alerts|nothing urgent|nada urgente|no requests yet|aún no hay solicitudes|no meetings today|no hay reuniones|no open punch/i.test(text)) return true;
    return false;
  }
  function urgentItems(input) {
    input = input || {};
    var items = [];
    if (input.featureMeet !== false && input.canMeet !== false && input.meetings > 0) items.push({ kind: "meeting", n: input.meetings });
    if (input.overdueWo > 0) items.push({ kind: "wo", n: input.overdueWo });
    if (input.overduePm > 0 && input.seesPm) items.push({ kind: "pm", n: input.overduePm });
    if (input.overdueTasks > 0) items.push({ kind: "task", n: input.overdueTasks });
    if (input.lateRush > 0) items.push({ kind: "rush", n: input.lateRush });
    return items;
  }

  function homeMode(role) {
    var key = role == null ? "" : String(role);
    var alias = { "JR Corporate": "Above Property", corporate: "Above Property", above_property: "Above Property" };
    key = alias[key] || key;
    return key === "Above Property" ? "data" : "ops";
  }
  function dataCards(input) {
    input = input || {};
    var cards = [];
    function add(id, value, en, es, hint) {
      if (value == null || value === "") return;
      cards.push({ id: id, value: String(value), en: en, es: es, hint: hint || "" });
    }
    add("occ", input.occ, "Occupancy", "Ocupación", input.occHint);
    add("adr", input.adr, "ADR", "ADR", input.adrHint);
    add("revpar", input.revpar, "RevPAR", "RevPAR", input.revparHint);
    add("labor", input.laborVar, "Labor vs plan", "Labor contra el plan", input.laborHint);
    add("wo", input.openWo, "Open work orders", "Órdenes abiertas", input.woHint);
    add("score", input.score, "Guest score", "Calificación", input.scoreHint);
    add("leads", input.leads, "Sales leads", "Prospectos", input.leadsHint);
    add("response", input.avgHours, "Avg response hrs", "Horas de respuesta", input.responseHint);
    return cards;
  }
  function compareColumns(rows) {
    var cols = [
      { id: "occ", en: "Occ", es: "Ocup." },
      { id: "adr", en: "ADR", es: "ADR" },
      { id: "revpar", en: "RevPAR", es: "RevPAR" },
      { id: "labor", en: "Labor vs plan", es: "Labor vs plan" },
      { id: "wo", en: "Open WOs", es: "Órdenes" },
      { id: "score", en: "Guest score", es: "Calificación" },
      { id: "leads", en: "Leads", es: "Prospectos" },
      { id: "hours", en: "Avg response", es: "Respuesta" }
    ];
    return cols.filter(function (col) {
      return (rows || []).some(function (row) { return row && row[col.id] != null && row[col.id] !== ""; });
    });
  }
  function sparkPath(values, w, h) {
    var nums = (values || []).map(Number).filter(function (n) { return isFinite(n); });
    if (nums.length < 2) return "";
    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);
    var span = max - min || 1;
    var width = w || 112;
    var height = h || 28;
    return nums.map(function (n, i) {
      var x = (i / (nums.length - 1)) * width;
      var y = height - ((n - min) / span) * (height - 4) - 2;
      return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
  }
  function opsSections(input) {
    input = input || {};
    var out = [];
    if (input.tasks && input.tasks.length) out.push("tasks");
    if (input.rooms && input.rooms.length) out.push("rooms");
    if (input.alerts && input.alerts.length) out.push("alerts");
    if (input.notes && input.notes.length) out.push("notes");
    if (input.orders && input.orders.length) out.push("orders");
    if (input.checks && input.checks.length) out.push("checks");
    return out;
  }

  var api = {
    todayModel: todayModel,
    portfolioRow: portfolioRow,
    hotelsFor: hotelsFor,
    slotFor: slotFor,
    cardIsEmpty: cardIsEmpty,
    urgentItems: urgentItems,
    homeMode: homeMode,
    dataCards: dataCards,
    compareColumns: compareColumns,
    sparkPath: sparkPath,
    opsSections: opsSections
  };
  root.HHQHome = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  var folding = false;
  var PLACE = /no requests yet|aún no hay solicitudes|nothing here yet|nada aquí todavía|no alerts|nothing urgent|nada urgente|none yet|none right now|nada por ahora|no meetings today|no hay reuniones|no open punch/i;

  function roleNow() {
    try { return authRole() || S.role || ""; } catch (e) { return (typeof S !== "undefined" && S.role) || ""; }
  }
  function can(cap) {
    try { if (root.HHQ && HHQ.can) return !!HHQ.can(roleNow(), cap); } catch (e) {}
    return false;
  }
  function featureOn(hotel, feature) {
    try { if (root.HotelFeatures && HotelFeatures.on) return HotelFeatures.on(hotel, feature) !== false; } catch (e) {}
    return true;
  }
  function corporatePortfolio() {
    if (!can("see.allHotels")) return false;
    if (typeof S !== "undefined" && S.role && S.role !== "GM") return false;
    return !S.hhqDrill;
  }
  function seenHotels() {
    var own = "";
    try { var u = meUser(); own = (u && u.hotel) || ""; } catch (e) {}
    var all = Object.keys(typeof HOTELS !== "undefined" ? HOTELS : {});
    return hotelsFor(roleNow(), own, all, function (role, hotelOwn, hotel) {
      try { if (root.HHQ && HHQ.seesHotel) return HHQ.seesHotel(role, hotelOwn, hotel); } catch (e) {}
      return can("see.allHotels") || !hotelOwn || hotelOwn === hotel;
    });
  }
  function snapOf(hotel) {
    var bag = (typeof S !== "undefined" && S.h) ? S.h[hotel] : null;
    if (!bag) return null;
    var rooms = bag.rooms || [];
    var openWo = (bag.wo || []).filter(function (w) { return w.s !== "Done"; }).length;
    var esc = (bag.esc || []).filter(function (x) { return x.st !== "Resolved" && x.st !== "Acknowledged"; }).length;
    return {
      openWo: openWo,
      dirty: rooms.filter(function (x) { return /D$/.test(x.s || ""); }).length,
      ready: rooms.filter(function (x) { return x.s === "VC" || x.s === "OC"; }).length,
      rfi: rooms.filter(function (x) { return x.s === "RFI"; }).length,
      esc: esc,
      occ: bag.fc && bag.fc[0] ? bag.fc[0].occ : null,
      arr: bag.fc && bag.fc[0] ? bag.fc[0].arr : null,
      issues: openWo + esc
    };
  }
  function liveSnap() {
    var hotel = S.hotel;
    var base = snapOf(hotel) || {};
    var role = S.role;
    base.shuttle = featureOn(hotel, "shuttle") && (hotel === "MSPAM" || hotel === "MSPMS");
    if (role === "Maintenance" || role === "Shuttle Driver" || role === "House Person" || role === "Laundry Attendant" || role === "Breakfast Attendant") {
      try { base.check = typeof lpct === "function" ? lpct(role) : 0; } catch (e) { base.check = 0; }
    }
    if (role === "Shuttle Driver") {
      try { base.runs = typeof SH === "function" ? SH().runs.filter(function (x) { return x.st !== "Complete"; }).length : 0; } catch (e2) { base.runs = 0; }
    }
    if (role === "House Person" || role === "Laundry Attendant" || role === "Breakfast Attendant") {
      try { base.openReq = typeof myReqs === "function" ? myReqs().filter(function (x) { return x.st !== "Done"; }).length : 0; } catch (e3) { base.openReq = 0; }
    }
    if (role === "Housekeeper") {
      var me = "";
      try { me = cw(); } catch (e5) { me = ""; }
      var rooms = ((S.h || {})[hotel] || {}).rooms || [];
      var mine = rooms.filter(function (x) { return x.hk === me && ((/VD|OD|RFI/).test(x.s || "") || x.x || x.t1); });
      base.done = mine.filter(function (x) { return x.t1 || x.s === "RFI"; }).length + "/" + mine.length;
      base.progress = mine.filter(function (x) { return x.t0 && !x.t1; }).length;
      base.dnd = mine.filter(function (x) { return x.x; }).length;
    }
    return base;
  }
  function overduePm() {
    var n = 0;
    if (typeof eqList === "function") n += eqList().filter(function (e) { return e.od; }).length;
    if (typeof pmToday === "function") n += pmToday().filter(function (x) { return x.od && !x.done; }).length;
    return n;
  }
  function overdueWo() {
    var bag = (S.h || {})[S.hotel] || {};
    var today = typeof ld === "function" ? ld() : "";
    return (bag.wo || []).filter(function (w) {
      if (!w || w.s === "Done") return false;
      if (w.od || w.overdue) return true;
      return !!(w.due && today && String(w.due) < today);
    }).length;
  }
  function overdueTasks(role) {
    if (typeof ITEMS !== "function" || typeof od !== "function") return 0;
    return ITEMS().filter(function (it) {
      if (!od(it)) return false;
      var grp = String(it.grp || "");
      if (role === "GM" || role === "AGM") return grp.indexOf("GM") === 0;
      if (role === "Front Desk") return it.def === "Front Desk" || grp.indexOf("Front Desk") === 0;
      if (role === "Housekeeping") return it.def === "Housekeeping" || grp.indexOf("Housekeeping") === 0;
      if (role === "Maintenance") return it.def === "Maintenance" || grp.indexOf("Maintenance") === 0;
      return it.def === role || grp.indexOf(role) === 0;
    }).length;
  }
  function lateRush(role) {
    var allowed = role === "Housekeeper" || can("rush.see");
    if (!allowed || typeof rushList !== "function" || typeof rushLate !== "function") return 0;
    var rows = rushList().filter(rushLate);
    if (role === "Housekeeper") {
      var me = "";
      try { me = cw(); } catch (e) { me = ""; }
      rows = rows.filter(function (r) { return !r.hk || r.hk === me; });
    }
    return rows.length;
  }
  function seesPm() {
    try {
      if (typeof tilesFor === "function" && (tilesFor(S.role) || []).indexOf("pm") >= 0) return true;
    } catch (e) {}
    return S.role === "GM" || S.role === "Maintenance" || can("pm.manage");
  }
  function realRows(el) {
    var n = 0;
    el.querySelectorAll(".li, .td-row, .mt-line, .miss-row, .rhline, .gs-jump, .tile, tbody tr").forEach(function (row) {
      var text = (row.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || PLACE.test(text)) return;
      n++;
    });
    return n;
  }
  function isQuiet(el) {
    if (!el || el.nodeType !== 1) return true;
    if (el.id === "hhqFocus" || el.id === "uxHero" || el.id === "hhqToday") return false;
    if (el.classList && el.classList.contains("ux-sec")) return true;
    var badge = el.querySelector(".badge");
    var badgeN = badge ? parseInt(badge.textContent, 10) : null;
    var countEl = el.id === "mtMgrHome" ? el.querySelector("b") : null;
    return cardIsEmpty({
      id: el.id,
      rows: realRows(el),
      badge: badge && (badge.classList.contains("zero") || badgeN === 0) ? 0 : (badge ? badgeN : null),
      count: countEl ? parseInt(countEl.textContent, 10) || 0 : null,
      text: (el.textContent || "").replace(/\s+/g, " ").trim(),
      controls: !!el.querySelector("input, textarea, select, img, canvas, table")
    });
  }
  function titleOf(el) {
    if (el.id === "slRollup" || el.id === "slHome") {
      var heading = el.querySelector("h3, h2");
      if (heading && heading.textContent.trim()) return heading.textContent.replace(/\s+/g, " ").trim().slice(0, 72);
      return L("Sales leads", "Prospectos");
    }
    if (el.classList.contains("grid")) return L("Screens", "Pantallas");
    if (el.classList.contains("onc-home") || el.id === "oncMe") return L("On the clock", "En el reloj");
    if (el.id === "deviceNote") return L("Saved on this device", "Guardado en este aparato");
    if (el.id === "pwaInstall") return L("Install HotelHQ", "Instalar HotelHQ");
    if (el.classList.contains("fm-home")) return L("Floor map", "Mapa del piso");
    var head = el.querySelector("h2, h3");
    var text = (head ? head.textContent : el.textContent) || "";
    text = text.replace(/\s+/g, " ").trim();
    return text.slice(0, 72) || L("Details", "Detalle");
  }
  function wrap(el) {
    if (!el || el.tagName === "DETAILS") return el;
    var box = document.createElement("details");
    box.className = "hhq-fold";
    var sum = document.createElement("summary");
    sum.textContent = titleOf(el);
    box.appendChild(sum);
    box.appendChild(el);
    return box;
  }
  function meetingUrgent() {
    var feature = featureOn(S.hotel, "meetings");
    var allowed = can("meetings");
    if (!feature || !allowed) return [];
    var items = [];
    var day = document.getElementById("mtDayBanner");
    if (day) {
      [].forEach.call(day.querySelectorAll(".mt-line"), function (line, i) {
        if (i > 2) return;
        var name = ((line.querySelector("b") || {}).textContent || "").trim() || L("Meeting", "Reunión");
        var spans = [].map.call(line.querySelectorAll("span"), function (s) { return (s.textContent || "").trim(); });
        var label = L("Meeting today", "Reunión hoy") + " · " + name;
        if (spans[0]) label += " · " + spans[0];
        if (spans[1]) label += " · " + spans[1];
        items.push({ label: label, onclick: line.getAttribute("onclick") || "go('meetings')" });
      });
    }
    if (!items.length) {
      var mgr = document.getElementById("mtMgrHome");
      var n = mgr ? parseInt(((mgr.querySelector("b") || {}).textContent || "0"), 10) || 0 : 0;
      if (urgentItems({ featureMeet: true, canMeet: true, meetings: n }).some(function (it) { return it.kind === "meeting"; })) {
        items.push({ label: n + " " + L("meetings today", "reuniones hoy"), onclick: "go('meetings')" });
      }
    }
    return items;
  }
  function urgentButtons() {
    var role = S.role;
    var items = meetingUrgent();
    var where = corporatePortfolio() ? S.hotel + " · " : "";
    var pmOk = seesPm();
    urgentItems({
      overdueWo: overdueWo(),
      overduePm: pmOk ? overduePm() : 0,
      seesPm: pmOk,
      overdueTasks: overdueTasks(role),
      lateRush: lateRush(role),
      meetings: 0
    }).forEach(function (it) {
      if (it.kind === "wo") items.push({ label: it.n + " " + L("overdue work orders", "órdenes atrasadas"), onclick: "go('wo')" });
      if (it.kind === "pm") items.push({ label: it.n + " " + L("overdue work", "trabajo atrasado"), onclick: "go('pm')" });
      if (it.kind === "task") items.push({ label: it.n + " " + L("overdue tasks", "tareas atrasadas"), onclick: "go('" + (role === "GM" || role === "AGM" ? "gmc" : "check") + "')" });
      if (it.kind === "rush") items.push({ label: it.n + " " + L("overdue rush rooms", "cuartos urgentes atrasados"), onclick: "go('rushq')" });
    });
    if (where) items.forEach(function (item) { item.label = where + item.label; });
    return items;
  }
  function hotelButtons() {
    return seenHotels().map(function (code) {
      var full = (typeof HOTELS !== "undefined" && HOTELS[code]) || code;
      var parts = String(full).split(" · ");
      var row = portfolioRow(code, parts[1] || "", snapOf(code));
      return "<button type=\"button\" class=\"hhq-hotel\" onclick=\"hhqOpenHotel('" + esc(code) + "')\">" +
        "<span><b>" + esc(parts[0] || code) + "</b><small>" + esc(row.name) + "</small></span>" +
        "<span><b>" + esc(row.metric) + "</b><small>" + esc(L(row.metricEn, row.metricEs)) + "</small></span>" +
        "<span><b>" + esc(row.issues) + "</b><small>" + esc(L("Open issues", "Asuntos")) + "</small></span>" +
        "<span class=\"hhq-go\" aria-hidden=\"true\">›</span></button>";
    }).join("");
  }
  function kpiHtml(model) {
    if (model.noteEn) return "<p class=\"hhq-note\">" + esc(L(model.noteEn, model.noteEs)) + "</p>";
    if (!model.items.length) return "";
    return "<div class=\"hhq-kpis hhq-slim\">" + model.items.map(function (item) {
      return "<div><b>" + esc(item.n) + "</b><span>" + esc(L(item.en, item.es)) + "</span></div>";
    }).join("") + "</div>";
  }
  function finite(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function avgOf(list) {
    var nums = (list || []).map(finite).filter(function (n) { return n != null; });
    if (!nums.length) return null;
    return nums.reduce(function (s, n) { return s + n; }, 0) / nums.length;
  }
  function fmtSignedHours(n) {
    if (n == null || !isFinite(Number(n))) return null;
    var v = Math.round(Number(n) * 10) / 10;
    return (v > 0 ? "+" : "") + v + "h";
  }
  function fmtPct(n) {
    if (n == null || !isFinite(Number(n))) return null;
    return String(Math.round(Number(n))) + "%";
  }
  function money(n) {
    if (n == null || !isFinite(Number(n))) return null;
    return "$" + (Math.round(Number(n) * 100) / 100).toFixed(2);
  }
  var scoreMemo = null;
  var leadMemo = null;
  function scoreBundle() {
    var day = new Date().toISOString().slice(0, 10);
    if (scoreMemo && scoreMemo.day === day) return scoreMemo.data;
    if (!root.GuestScores || !GuestScores.buildDemo) return null;
    try {
      scoreMemo = { day: day, data: GuestScores.buildDemo(day) };
      return scoreMemo.data;
    } catch (e) { return null; }
  }
  function leadBundle() {
    var day = new Date().toISOString().slice(0, 10);
    if (leadMemo && leadMemo.day === day) return leadMemo.data;
    if (!root.SalesLeads || !SalesLeads.buildDemo || !SalesLeads.rollup) return null;
    try {
      leadMemo = { day: day, data: SalesLeads.buildDemo(day) };
      return leadMemo.data;
    } catch (e2) { return null; }
  }
  function hotelFacts(code) {
    var bag = (typeof S !== "undefined" && S.h) ? (S.h[code] || {}) : {};
    var fc = bag.fc || [];
    var first = fc[0] || {};
    var occ = first.occ != null && first.occ !== "" ? finite(first.occ) : null;
    var adr = first.adr != null && first.adr !== "" ? finite(first.adr) : (bag.adr != null ? finite(bag.adr) : null);
    var revpar = first.revpar != null && first.revpar !== "" ? finite(first.revpar) : (bag.revpar != null ? finite(bag.revpar) : null);
    var series = fc.map(function (row) { return row && row.occ != null ? finite(row.occ) : null; }).filter(function (n) { return n != null; });
    var labor = null;
    if (bag.labor && bag.labor.length) {
      labor = bag.labor.reduce(function (sum, row) {
        return sum + (finite(row.a) || 0) - (finite(row.p) || 0);
      }, 0);
    }
    var openWo = bag.wo ? bag.wo.filter(function (w) { return w && w.s !== "Done"; }).length : null;
    var score = null;
    var goal = null;
    if (featureOn(code, "guest_scores")) {
      var packed = scoreBundle();
      if (packed && root.GuestScores && GuestScores.summarize) {
        var today = scoreMemo.day;
        var sum = GuestScores.summarize(packed.surveys, today, code, "itr", "topbox");
        if (sum && sum.wave && sum.wave.n > 0 && sum.wave.value != null) score = sum.wave.value;
        if (GuestScores.monthRows) {
          var months = GuestScores.monthRows(packed.surveys, packed.goals, today, code, "itr", "topbox");
          for (var i = months.length - 1; i >= 0; i--) {
            if (months[i].goal != null) { goal = months[i].goal; break; }
          }
        }
      }
    }
    var leads = null;
    var hours = null;
    if (featureOn(code, "sales_leads")) {
      var leadsData = leadBundle();
      if (leadsData) {
        var rolled = SalesLeads.rollup(leadsData.leads, [code]);
        var row = rolled && rolled[0];
        if (row) {
          leads = row.total;
          hours = row.avgHours;
        }
      }
    }
    return {
      code: code,
      occ: occ,
      adr: adr,
      revpar: revpar,
      series: series,
      labor: labor,
      openWo: openWo,
      score: score,
      goal: goal,
      leads: leads,
      hours: hours
    };
  }
  function dataBoardHtml() {
    var hotels = seenHotels();
    var facts = hotels.map(hotelFacts);
    var cards = dataCards({
      occ: fmtPct(avgOf(facts.map(function (f) { return f.occ; }))),
      adr: money(avgOf(facts.map(function (f) { return f.adr; }))),
      revpar: money(avgOf(facts.map(function (f) { return f.revpar; }))),
      laborVar: fmtSignedHours((function () {
        var rows = facts.filter(function (f) { return f.labor != null; });
        if (!rows.length) return null;
        return rows.reduce(function (s, f) { return s + f.labor; }, 0);
      })()),
      openWo: (function () {
        var rows = facts.filter(function (f) { return f.openWo != null; });
        if (!rows.length) return null;
        return String(rows.reduce(function (s, f) { return s + f.openWo; }, 0));
      })(),
      score: (function () {
        var n = avgOf(facts.map(function (f) { return f.score; }));
        return n == null ? null : (Math.round(n * 10) / 10).toFixed(1) + "%";
      })(),
      scoreHint: (function () {
        var n = avgOf(facts.map(function (f) { return f.goal; }));
        return n == null ? "" : L("Goal", "Meta") + " " + (Math.round(n * 10) / 10).toFixed(1) + "%";
      })(),
      leads: (function () {
        var rows = facts.filter(function (f) { return f.leads != null; });
        if (!rows.length) return null;
        return String(rows.reduce(function (s, f) { return s + f.leads; }, 0));
      })(),
      avgHours: (function () {
        var n = avgOf(facts.map(function (f) { return f.hours; }));
        if (n == null) return null;
        return root.SalesLeads && SalesLeads.formatHours ? SalesLeads.formatHours(n) : (Math.round(n * 10) / 10).toFixed(1);
      })()
    });
    var display = facts.map(function (f) {
      var full = (typeof HOTELS !== "undefined" && HOTELS[f.code]) || f.code;
      var parts = String(full).split(" · ");
      var scoreText = f.score == null ? null : (Math.round(f.score * 10) / 10).toFixed(1) + "%";
      if (scoreText && f.goal != null) scoreText += " · " + (Math.round(f.goal * 10) / 10).toFixed(1) + "%";
      return {
        code: f.code,
        name: parts[1] || "",
        series: f.series,
        occ: f.occ == null ? null : f.occ + "%",
        adr: money(f.adr),
        revpar: money(f.revpar),
        labor: fmtSignedHours(f.labor),
        wo: f.openWo == null ? null : String(f.openWo),
        score: scoreText,
        leads: f.leads == null ? null : String(f.leads),
        hours: f.hours == null ? null : (root.SalesLeads && SalesLeads.formatHours ? SalesLeads.formatHours(f.hours) : String(f.hours))
      };
    });
    var cols = compareColumns(display);
    var kpi = cards.length ? "<div class=\"hhq-kpis hhq-stat\" id=\"hhqStat\">" + cards.map(function (card) {
      return "<div data-kpi=\"" + esc(card.id) + "\"><b>" + esc(card.value) + "</b><span>" + esc(L(card.en, card.es)) + "</span>" + (card.hint ? "<small>" + esc(card.hint) + "</small>" : "") + "</div>";
    }).join("") + "</div>" : "";
    var sparks = display.filter(function (row) { return sparkPath(row.series); });
    var spark = sparks.length ? "<div class=\"hhq-sparks\" id=\"hhqSparks\">" + sparks.map(function (row) {
      var d = sparkPath(row.series);
      return "<button type=\"button\" class=\"hhq-spark\" onclick=\"hhqOpenHotel('" + esc(row.code) + "')\"><b>" + esc(row.code) + "</b><svg viewBox=\"0 0 112 28\" width=\"112\" height=\"28\" aria-hidden=\"true\"><path d=\"" + d + "\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg><span>" + esc(row.occ || "") + "</span></button>";
    }).join("") + "</div>" : "";
    var table = display.length ? "<div class=\"hhq-scroll\"><table class=\"hhq-cmp\" id=\"hhqCompare\"><thead><tr><th>" + esc(L("Hotel", "Hotel")) + "</th>" + cols.map(function (col) {
      return "<th>" + esc(L(col.en, col.es)) + "</th>";
    }).join("") + "</tr></thead><tbody>" + display.map(function (row) {
      return "<tr><td><button type=\"button\" class=\"hhq-hotel-link\" onclick=\"hhqOpenHotel('" + esc(row.code) + "')\"><b>" + esc(row.code) + "</b><small>" + esc(row.name) + "</small></button></td>" + cols.map(function (col) {
        var val = row[col.id];
        return "<td>" + esc(val == null || val === "" ? "—" : val) + "</td>";
      }).join("") + "</tr>";
    }).join("") + "</tbody></table></div>" : "";
    if (!kpi && !spark && !table) return "";
    return "<div class=\"hhq-board\" id=\"hhqData\"><p class=\"hhq-day\">" + esc(L("Portfolio", "Portafolio")) + "</p>" + kpi + spark + table + "</div>";
  }
  function labelOf(it) {
    var label = it && it.label;
    try { if (typeof bi === "function") return String(bi(label) || ""); } catch (e) {}
    if (Array.isArray(label)) return String(label[0] || "");
    if (label && typeof label === "object") return String(label.en || label.es || "");
    return String(label || "");
  }
  function opsModel() {
    var bag = (S.h || {})[S.hotel] || {};
    var tasks = [];
    try {
      if (typeof myReqs === "function") {
        myReqs().filter(function (row) { return row && row.st !== "Done"; }).slice(0, 4).forEach(function (row) {
          tasks.push(String(row.text || row.t || L("Request", "Solicitud")));
        });
      }
    } catch (e) {}
    if (S.role === "Housekeeper") {
      var me = "";
      try { me = cw(); } catch (e2) { me = ""; }
      (bag.rooms || []).filter(function (room) {
        return room.hk === me && (/D$|RFI/.test(room.s || "")) && !room.t1;
      }).slice(0, 4).forEach(function (room) {
        tasks.push(L("Room", "Cuarto") + " " + room.n);
      });
    }
    var checks = [];
    if (typeof ITEMS === "function" && typeof isD === "function") {
      checks = ITEMS().filter(function (it) {
        if (S.role !== "GM" && String(it.key || "").indexOf("GM-") === 0) return false;
        var grp = String(it.grp || "");
        var mine = it.def === S.role || grp.indexOf(S.role) === 0 || (S.role === "GM" && grp.indexOf("GM") === 0);
        if (!mine) return false;
        try { return !isD(it.key, it.per); } catch (err) { return false; }
      }).slice(0, 4).map(labelOf).filter(Boolean);
    }
    var notes = (bag.notes || []).slice(0, 2).map(function (note) {
      return { title: String(note.sh || ""), text: String(note.t || "") };
    }).filter(function (note) { return note.text; });
    var orders = (bag.wo || []).filter(function (row) { return row && row.s !== "Done"; }).slice(0, 4).map(function (row) {
      return { room: String(row.room || ""), text: String(row.t || ""), status: String(row.s || ""), pri: String(row.p || "") };
    });
    var rooms = bag.rooms || [];
    return { tasks: tasks, rooms: rooms, notes: notes, orders: orders, checks: checks };
  }
  function opsPanelHtml() {
    var model = opsModel();
    var keys = opsSections(model);
    if (!keys.length) return "";
    var statusName = {
      VC: ["Vacant clean", "Vacío limpio"],
      VD: ["Vacant dirty", "Vacío sucio"],
      OC: ["Occupied clean", "Ocupado limpio"],
      OD: ["Occupied dirty", "Ocupado sucio"],
      OOO: ["Out of order", "Fuera de servicio"],
      RFI: ["Ready to inspect", "Listo p/ inspección"]
    };
    function jump(id, en, es) {
      return "<button type=\"button\" class=\"hhq-jump\" onclick=\"go('" + id + "')\">" + esc(L(en, es)) + "</button>";
    }
    var blocks = {
      tasks: function () {
        return "<section id=\"hhqTasks\"><div class=\"hhq-hd\"><h3>" + esc(L("Today's tasks", "Tareas de hoy")) + "</h3>" + jump("my", "Open", "Abrir") + "</div><ul>" + model.tasks.map(function (line) {
          return "<li>" + esc(line) + "</li>";
        }).join("") + "</ul></section>";
      },
      rooms: function () {
        var counts = {};
        model.rooms.forEach(function (room) {
          var key = room.s || "";
          if (!key) return;
          counts[key] = (counts[key] || 0) + 1;
        });
        var pills = Object.keys(counts).map(function (key) {
          var name = statusName[key] || [key, key];
          return "<span class=\"pill " + esc(key) + "\">" + esc(counts[key] + " " + L(name[0], name[1])) + "</span>";
        }).join("");
        if (!pills) return "";
        return "<section id=\"hhqRooms\"><div class=\"hhq-hd\"><h3>" + esc(L("Room status", "Estado de cuartos")) + "</h3>" + jump("rooms", "Board", "Tablero") + "</div><div class=\"hhq-pills\">" + pills + "</div></section>";
      },
      notes: function () {
        return "<section id=\"hhqNotes\"><div class=\"hhq-hd\"><h3>" + esc(L("Shift notes", "Notas de turno")) + "</h3>" + jump("notes", "Open", "Abrir") + "</div>" + model.notes.map(function (note) {
          return "<p><b>" + esc(note.title) + "</b> " + esc(note.text) + "</p>";
        }).join("") + "</section>";
      },
      orders: function () {
        return "<section id=\"hhqOrders\"><div class=\"hhq-hd\"><h3>" + esc(L("Work orders", "Órdenes")) + "</h3>" + jump("wo", "Open", "Abrir") + "</div><ul>" + model.orders.map(function (row) {
          var cls = row.status === "Done" ? "VC" : row.status === "In Progress" ? "OD" : (row.pri === "High" ? "VD" : "OC");
          var pill = "<span class=\"pill " + cls + "\">" + esc(row.status || row.pri || "") + "</span> ";
          return "<li>" + pill + "<b>" + esc(row.room) + "</b> " + esc(row.text) + "</li>";
        }).join("") + "</ul></section>";
      },
      checks: function () {
        return "<section id=\"hhqChecks\"><div class=\"hhq-hd\"><h3>" + esc(L("Checklists", "Listas")) + "</h3>" + jump("check", "Open", "Abrir") + "</div><ul>" + model.checks.map(function (line) {
          return "<li>" + esc(line) + "</li>";
        }).join("") + "</ul></section>";
      }
    };
    return "<div class=\"hhq-ops\" id=\"hhqOps\">" + keys.map(function (key) {
      return blocks[key] ? blocks[key]() : "";
    }).join("") + "</div>";
  }
  function buildTop(hi, search) {
    var section = document.createElement("section");
    section.id = "uxHero";
    section.className = "hhq-home " + (corporatePortfolio() ? "hhq-data-home" : "hhq-ops-home");
    var today = document.createElement("div");
    today.className = "hhq-today";
    today.id = "hhqToday";
    if (hi) today.appendChild(hi);
    if (corporatePortfolio()) {
      today.insertAdjacentHTML("beforeend", dataBoardHtml());
    } else {
      if (can("see.allHotels") && S.hhqDrill) {
        today.insertAdjacentHTML("beforeend", "<button type=\"button\" class=\"hhq-back\" onclick=\"hhqPortfolio()\">‹ " + esc(L("All hotels", "Todos los hoteles")) + "</button>");
      }
      var model = todayModel(S.role, liveSnap());
      today.insertAdjacentHTML("beforeend", "<p class=\"hhq-day\">" + esc(L("Today", "Hoy")) + "</p>" + kpiHtml(model));
    }
    if (search) today.appendChild(search);
    section.appendChild(today);
    var urgent = urgentButtons();
    if (urgent.length) {
      var box = document.createElement("div");
      box.className = "hhq-urgent";
      box.id = "hhqUrgent";
      urgent.forEach(function (item) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = item.label;
        btn.setAttribute("onclick", item.onclick);
        box.appendChild(btn);
      });
      section.appendChild(box);
    }
    return section;
  }
  function placeActions(section, actions) {
    if (!actions.length) return;
    var grid = document.createElement("div");
    grid.className = "hhq-actions";
    grid.id = "hhqActions";
    actions.forEach(function (btn) { grid.appendChild(btn); });
    section.appendChild(grid);
  }
  function signedIn() {
    return typeof meUser === "function" && !!meUser();
  }
  function fold() {
    if (folding || typeof S === "undefined" || S.tab !== "home" || !signedIn()) return;
    var app = document.getElementById("app");
    if (!app || app.querySelector("#hhqFocus")) return;
    folding = true;
    try {
      var kids = [].slice.call(app.children);
      var hero = document.getElementById("uxHero");
      var hi = hero ? hero.querySelector(".ux-hi") : null;
      var search = hero ? hero.querySelector(".ux-search") : null;
      if (hero) {
        [].slice.call(hero.querySelectorAll(".ux-act, .ux-acts")).forEach(function (node) { node.remove(); });
        hero.removeAttribute("id");
      }
      var shell = document.createElement("div");
      shell.id = "hhqFocus";
      var top = buildTop(hi, search);
      if (window.HHQDone && HHQDone.homeHtml) top.insertAdjacentHTML("beforeend", HHQDone.homeHtml());
      if (window.NightAudit && NightAudit.homeHtml) top.insertAdjacentHTML("beforeend", NightAudit.homeHtml());
      if (window.GuestComments && GuestComments.homeHtml) top.insertAdjacentHTML("beforeend", GuestComments.homeHtml());
      if (window.HHQBrief && HHQBrief.inlineHtml) top.insertAdjacentHTML("beforeend", HHQBrief.inlineHtml());
      var pair = document.createElement("div");
      pair.className = "hhq-pair";
      pair.id = "hhqPair";
      if (window.HHQNotes && HHQNotes.homeHtml) pair.insertAdjacentHTML("beforeend", HHQNotes.homeHtml());
      if (window.HHQTiles && HHQTiles.homeHtml) pair.insertAdjacentHTML("beforeend", HHQTiles.homeHtml());
      if (pair.childNodes.length) top.appendChild(pair);
      shell.appendChild(top);
      var more = document.createElement("details");
      more.id = "hhqMore";
      if (window.HHQMore && HHQMore.expanded && HHQMore.expanded()) more.open = true;
      var sum = document.createElement("summary");
      sum.textContent = L("More", "Más");
      var body = document.createElement("div");
      body.id = "hhqMoreBody";
      more.appendChild(sum);
      more.appendChild(body);
      if (window.HHQMore && HHQMore.homeHtml) body.insertAdjacentHTML("beforeend", HHQMore.homeHtml());
      shell.appendChild(more);
      app.insertBefore(shell, app.firstChild);
      kids.forEach(function (el) {
        if (!el.parentNode || el === shell || el.id === "hhqFocus") return;
        if (el === hero) {
          [].slice.call(hero.querySelectorAll(".ux-sec")).forEach(function (node) { node.remove(); });
          if (!(hero.textContent || "").replace(/\s+/g, "").length) { hero.remove(); return; }
        }
        if (el.classList && el.classList.contains("warn")) {
          var today = document.getElementById("hhqToday");
          if (today) today.insertBefore(el, today.children[1] || null);
          return;
        }
        if (el.id === "qotd") {
          var anchor = top.querySelector("#hhqUrgent") || top.querySelector("#hhqToday");
          if (anchor && anchor.nextSibling) top.insertBefore(el, anchor.nextSibling);
          else top.appendChild(el);
          return;
        }
        if (isQuiet(el)) { el.remove(); return; }
        body.appendChild(wrap(el));
      });
    } finally { folding = false; }
  }
  function tidy() {
    if (folding || typeof S === "undefined" || S.tab !== "home" || !signedIn()) return;
    var app = document.getElementById("app");
    var body = document.getElementById("hhqMoreBody");
    if (!app || !body || !document.getElementById("hhqFocus")) return;
    var stray = [].filter.call(app.children, function (el) { return el.id !== "hhqFocus"; });
    if (!stray.length) return;
    folding = true;
    try {
      stray.forEach(function (el) {
        if (isQuiet(el)) el.remove();
        else body.appendChild(wrap(el));
      });
    } finally { folding = false; }
  }

  root.hhqOpenHotel = function (code) {
    if (!/^[A-Z0-9]+$/.test(String(code || ""))) return;
    if (!can("see.allHotels")) return;
    if (typeof HOTELS !== "undefined" && !HOTELS[code]) return;
    S.hhqDrill = 1;
    if (S.hotel !== code && typeof setHotel === "function") setHotel(code);
    else {
      if (typeof save === "function") save();
      if (typeof render === "function") render();
    }
  };
  root.hhqPortfolio = function () {
    if (!can("see.allHotels")) return;
    S.hhqDrill = 0;
    if (typeof save === "function") save();
    if (typeof render === "function") render();
  };

  var css = document.createElement("style");
  css.textContent = [
    "#hhqFocus{display:block}",
    "#uxHero.hhq-home{background:transparent;color:inherit;padding:0;margin:0}",
    ".hhq-today{background:#fff;border-radius:12px;padding:12px;margin:0 0 8px;box-shadow:0 1px 3px #0001}",
    ".hhq-day{margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#55606f}",
    ".hhq-note{margin:0;font-weight:700}",
    ".hhq-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}",
    ".hhq-kpis div{background:#eef3fa;border-radius:10px;text-align:center;padding:8px 4px;min-width:0}",
    ".hhq-kpis b{display:block;font-size:22px;line-height:1.15}",
    ".hhq-kpis div{overflow:visible}",
    ".hhq-kpis span{display:block;font-size:12px;color:#55606f;font-weight:700;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}",
    ".hhq-hotels{display:flex;flex-direction:column}",
    ".hhq-hotel{display:grid;grid-template-columns:minmax(0,1.5fr) .7fr .9fr auto;gap:6px;align-items:center;width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid #e6ebf2;min-height:64px;padding:8px 2px;border-radius:0}",
    ".hhq-hotel b{display:block;font-size:16px}",
    ".hhq-hotel small{display:block;color:#55606f;font-weight:650;font-size:12px;line-height:1.2}",
    ".hhq-go{font-size:22px;color:#14365d}",
    ".hhq-back{display:inline-flex;align-items:center;background:#eef3fa;border:0;border-radius:10px;min-height:44px;font-weight:800;margin:0 0 8px;padding:0 12px}",
    ".hhq-urgent{background:#fff7f2;border-radius:12px;padding:0 12px;margin:0 0 8px}",
    ".hhq-urgent button{display:flex;align-items:center;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #f0e2d6;border-radius:0;min-height:36px!important;font-weight:700;font-size:14px;line-height:1.3;color:#7a2e0e;padding:6px 0;white-space:normal}",
    ".hhq-urgent button:last-child{border-bottom:0}",
    ".hhq-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 8px}",
    "#hhqFocus .ux-act{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;width:100%;background:#fff;color:#14365d;border:0;border-radius:12px;min-height:76px;padding:10px;box-shadow:0 1px 3px #0001;text-align:left}",
    "#hhqFocus .ux-act .chev{display:none}",
    "#hhqFocus .ux-act .ic{font-size:22px}",
    "#hhqFocus .ux-act small{display:block;color:#55606f;font-weight:600}",
    "#hhqFocus .ux-act.pri{background:#14365d;color:#fff}",
    "#hhqFocus .ux-act.pri small{color:#e7eef8}",
    "#hhqFocus .ux-hi{color:#14365d;font-size:20px;font-weight:800;margin:0 0 6px}",
    "#hhqFocus .ux-search{width:100%;text-align:left;background:#eef3fa;color:#243044;border:0;border-radius:12px;min-height:48px;margin:8px 0 0}",
    "#hhqMore{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:4px 12px 12px;margin:0 0 12px;box-shadow:0 1px 2px rgba(16,24,40,.05)}",
    "#hhqMore > summary{min-height:44px;display:flex;align-items:center;font-weight:800;letter-spacing:.04em;text-transform:uppercase;font-size:13px;color:#5c6570;cursor:pointer}",
    ".hhq-fold{border-top:1px solid #e6ebf2}",
    ".hhq-fold > summary{min-height:48px;display:flex;align-items:center;font-weight:700;cursor:pointer}",
    ".hhq-today .warn{margin:0 0 8px}",
    "@media(min-width:1024px){",
    "#uxHero.hhq-home{display:flex;flex-direction:column;gap:16px}",
    "#uxHero.hhq-home>.hhq-today,#uxHero.hhq-home>.hhq-urgent,#uxHero.hhq-home>.hhq-brief,#uxHero.hhq-home>.hhq-pair{margin:0}",
    ".hhq-urgent{padding:0 14px}",
    ".hhq-urgent button{min-height:34px!important;padding:5px 0}",
    ".hhq-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}",
    ".hhq-kpis span{white-space:normal;overflow:visible}",
    ".hhq-pair{display:grid;grid-template-columns:minmax(280px,.9fr) minmax(0,1.2fr);gap:16px;align-items:start}",
    ".hhq-pair:not(:has(.hhq-notes)){grid-template-columns:1fr}",
    "#hhqMore{margin-top:16px;background:#fff;border:1px solid #e6e8ee;border-radius:12px}",
    "#uxHero.hhq-home>.hhq-ops{grid-column:1/-1}",
    "#uxHero.hhq-home.hhq-data-home>.hhq-today{grid-column:1/-1}",
    "}",
    ".hhq-today,.hhq-urgent,#hhqMore,.hhq-ops section{background:var(--surface,#fff);border:1px solid var(--line,#e6e8ee);box-shadow:var(--shadow,0 1px 2px rgba(16,24,40,.05))}",
    ".hhq-urgent{background:var(--warn-bg,#fff7ed);border-color:var(--warn-line,#fed7aa)}",
    ".hhq-stat{grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px}",
    ".hhq-stat div,.hhq-slim div{background:var(--surface-2,#f7f8fa);border:1px solid var(--line,#e6e8ee);border-radius:12px;padding:12px 8px}",
    ".hhq-stat small{display:block;margin-top:4px;color:var(--muted,#5c6570);font-size:12px;font-weight:650}",
    ".hhq-slim{margin-top:8px}",
    ".hhq-ops-home .hhq-actions{margin-top:8px}",
    ".hhq-ops-home .ux-act{min-height:88px;font-size:16px}",
    "#hhqFocus .ux-act{background:var(--surface,#fff);color:var(--ink,#1c1f26);border:1px solid var(--line,#e6e8ee)}",
    "#hhqFocus .ux-act.pri{background:var(--accent,#3b5bdb);color:#fff;border-color:transparent}",
    "#hhqFocus .ux-hi{color:var(--ink,#1c1f26)}",
    "#hhqFocus .ux-search{background:var(--surface-2,#f7f8fa);color:var(--ink,#1c1f26);border:1px solid var(--line,#e6e8ee)}",
    ".hhq-board{display:flex;flex-direction:column;gap:12px}",
    ".hhq-sparks{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}",
    ".hhq-spark{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:var(--surface,#fff);border:1px solid var(--line,#e6e8ee);border-radius:12px;min-height:48px;padding:8px 10px;color:var(--accent,#3b5bdb)}",
    ".hhq-spark b{min-width:64px}",
    ".hhq-spark span{margin-left:auto;color:var(--ink,#1c1f26);font-weight:700}",
    ".hhq-scroll{overflow:auto;border:1px solid var(--line,#e6e8ee);border-radius:12px}",
    ".hhq-cmp{width:100%;border-collapse:separate;border-spacing:0;font-size:14px}",
    ".hhq-cmp th{position:sticky;top:0;background:var(--surface-2,#f7f8fa);color:var(--muted,#5c6570);font-size:12px;letter-spacing:.04em;text-transform:uppercase;text-align:left;padding:8px 12px;border-bottom:1px solid var(--line,#e6e8ee)}",
    ".hhq-cmp td{padding:8px 12px;border-bottom:1px solid var(--line,#e6e8ee);vertical-align:middle}",
    ".hhq-cmp tbody tr:nth-child(even) td{background:var(--zebra,#fafbfc)}",
    ".hhq-hotel-link{display:flex;flex-direction:column;align-items:flex-start;background:transparent;border:0;padding:0;min-height:44px;color:inherit;font-weight:700}",
    ".hhq-hotel-link small{color:var(--muted,#5c6570);font-weight:600}",
    ".hhq-ops{display:grid;gap:8px;margin-top:8px}",
    ".hhq-ops section{border-radius:12px;padding:8px 12px 12px}",
    ".hhq-hd{display:flex;align-items:center;justify-content:space-between;gap:8px}",
    ".hhq-ops h3{margin:8px 0;font-size:15px}",
    ".hhq-ops ul{margin:0;padding-left:18px}",
    ".hhq-ops li,.hhq-ops p{margin:0 0 8px;line-height:1.4}",
    ".hhq-pills{display:flex;flex-wrap:wrap;gap:8px}",
    ".hhq-jump{background:var(--surface-2,#f7f8fa);border:1px solid var(--line,#e6e8ee);border-radius:10px;min-height:36px;font-weight:700;padding:0 12px}",
    "@media(min-width:1024px){",
    ".hhq-ops{grid-template-columns:1fr 1fr}",
    ".hhq-ops section:last-child:nth-child(odd){grid-column:1/-1}",
    "}"
  ].join("");
  document.head.appendChild(css);

  var obs = new MutationObserver(function () { tidy(); });
  var watched = document.getElementById("app");
  if (watched) obs.observe(watched, { childList: true });

  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { fold(); } catch (e) {}
      return result;
    };
    try { if (typeof meUser === "function" && meUser() && S.tab === "home") fold(); } catch (e2) {}
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
