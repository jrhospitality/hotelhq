/* Demo-only glance home for GM, AGM, and corporate.
   Live mode loads this file and does not change the home screen.
   Figures come from the hotel bag, Guest comments scores, Night Audit,
   the room board, work orders, and the labor rows already on the demo.
   A feed that is not connected shows "No data yet". Sample data only. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = { MSPWE: "Golden Valley", MSPAM: "Hampton", MSPMS: "SpringHill" };
  var NO_DATA = { en: "No data yet", es: "Aún no hay datos" };

  function alias(role) {
    var key = role == null ? "" : String(role);
    var map = { "JR Corporate": "Above Property", corporate: "Above Property", above_property: "Above Property", gm: "GM", agm: "AGM" };
    return map[key] || key;
  }
  function demoOn(cfg, mode) {
    if (mode === "live") return false;
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function viewFor(role) {
    role = alias(role);
    if (role === "Above Property") return "corporate";
    if (role === "GM" || role === "AGM") return "hotel";
    return "";
  }
  function layoutFor(role, drilled) {
    var view = viewFor(role);
    if (view === "corporate" && !drilled) return "corporate";
    if (view === "hotel" || (view === "corporate" && drilled)) return "hotel";
    return "";
  }
  function shouldMount(input) {
    input = input || {};
    if (!demoOn(input.cfg, input.mode)) return false;
    if (!input.signedIn || input.tab !== "home") return false;
    var surface = alias(input.surfaceRole || input.authRole);
    if (surface !== "GM" && surface !== "AGM" && surface !== "Above Property") return false;
    return viewFor(input.authRole) !== "";
  }
  function visibleHotels(role, own, all) {
    all = (all || HOTELS).slice();
    role = alias(role);
    if (role === "Above Property") return all;
    if ((role === "GM" || role === "AGM") && all.indexOf(own) >= 0) return [own];
    return [];
  }
  function hotelName(code, fallback) {
    return NAMES[code] || fallback || code || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function finite(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function round1(n) {
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(Number(n)) * 10 + 1e-6) / 10;
  }
  function fmtScore(n) {
    n = finite(n);
    if (n == null) return null;
    return round1(n).toFixed(1);
  }
  function fmtHours(n) {
    n = finite(n);
    if (n == null) return null;
    return round1(n).toFixed(1);
  }
  function signedHours(n) {
    var text = fmtHours(n);
    if (text == null) return null;
    return (Number(text) > 0 ? "+" : "") + text + "h";
  }
  function fmtDue(hhmm) {
    var p = String(hhmm || "10:00").split(":");
    var h = Number(p[0]);
    if (!isFinite(h)) h = 10;
    var m = p[1] || "00";
    var ap = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 || 12;
    return h12 + ":" + m + " " + ap;
  }
  function roomBucket(room) {
    room = room || {};
    var flow = room.flow;
    if (flow !== "dirty" && flow !== "progress" && flow !== "cleaned" && flow !== "ready" && flow !== "reclean" && flow !== "ooo") {
      if (room.s === "OOO") flow = "ooo";
      else if (room.s === "RFI") flow = "cleaned";
      else if (room.s === "VC" || room.s === "OC") flow = "ready";
      else flow = "dirty";
    }
    if (flow === "ooo") return "ooo";
    if (flow === "ready") return "inspected";
    if (flow === "cleaned") return "clean";
    return "dirty";
  }
  function roomCounts(rooms) {
    if (!rooms) return null;
    var counts = { dirty: 0, clean: 0, inspected: 0, ooo: 0 };
    rooms.forEach(function (room) { counts[roomBucket(room)] += 1; });
    return counts;
  }
  function laborOf(rows) {
    if (!rows || !rows.length) return null;
    var actual = 0;
    var plan = 0;
    var any = false;
    rows.forEach(function (row) {
      if (!row || (row.a == null && row.p == null)) return;
      any = true;
      actual += finite(row.a) || 0;
      plan += finite(row.p) || 0;
    });
    if (!any) return null;
    return { actual: round1(actual), plan: round1(plan), variance: round1(actual - plan) };
  }
  function toneLabor(variance) {
    if (variance == null || !isFinite(Number(variance))) return "none";
    if (Number(variance) <= 0.25) return "good";
    if (Number(variance) <= 2) return "watch";
    return "bad";
  }
  function toneScore(actual, bench) {
    if (actual == null || bench == null || !isFinite(Number(actual)) || !isFinite(Number(bench))) return "none";
    var gap = Number(actual) - Number(bench);
    if (gap >= -0.05) return "good";
    if (gap >= -0.4) return "watch";
    return "bad";
  }
  function toneOcc(n) {
    if (n == null || !isFinite(Number(n))) return "none";
    if (Number(n) >= 75) return "good";
    if (Number(n) >= 60) return "watch";
    return "bad";
  }
  function toneOpenWo(n) {
    if (n == null || !isFinite(Number(n))) return "none";
    if (Number(n) <= 0) return "good";
    if (Number(n) <= 4) return "watch";
    return "bad";
  }
  function toneAudit(status) {
    if (status === "on_time") return "good";
    if (status === "open" || status === "future") return "watch";
    if (!status) return "none";
    return "bad";
  }
  function toneComments(n) {
    if (n == null || !isFinite(Number(n))) return "none";
    if (Number(n) <= 0) return "good";
    if (Number(n) <= 2) return "watch";
    return "bad";
  }
  function toneOverdue(n) {
    if (n == null || !isFinite(Number(n))) return "none";
    if (Number(n) <= 0) return "good";
    return "bad";
  }
  function worse(a, b) {
    var rank = { bad: 3, watch: 2, good: 1, none: 0 };
    return (rank[a] || 0) >= (rank[b] || 0) ? (a || "none") : (b || "none");
  }
  function scoreTone(score) {
    if (!score) return "none";
    return worse(toneScore(score.ytd, score.bench), toneScore(score.mtd, score.bench));
  }
  function roomTone(counts) {
    if (!counts) return "none";
    if (counts.ooo >= 3 || counts.dirty >= 10) return "bad";
    if (counts.ooo > 0 || counts.dirty >= 6) return "watch";
    return "good";
  }
  function auditValue(audit) {
    if (!audit) return "";
    if (typeof audit === "string") return audit;
    return audit.status || "";
  }
  function auditLabel(status, lang) {
    var labels = {
      on_time: ["Done", "Hecha"],
      open: ["Due", "Pendiente"],
      overdue: ["Overdue", "Atrasada"],
      late: ["Late", "Tarde"],
      missed: ["Missed", "Faltó"],
      future: ["Later", "Después"]
    };
    var pair = labels[status];
    if (!pair) return tx(lang, NO_DATA.en, NO_DATA.es);
    return tx(lang, pair[0], pair[1]);
  }
  function scoreText(score) {
    if (!score) return null;
    var y = fmtScore(score.ytd);
    var m = fmtScore(score.mtd);
    if (y == null && m == null) return null;
    if (y == null) return m;
    if (m == null) return y;
    return y + "/" + m;
  }
  function countText(n) {
    if (n == null || !isFinite(Number(n))) return null;
    return String(Math.round(Number(n)));
  }

  function attention(input) {
    input = input || {};
    var labor = input.labor || null;
    var punches = input.punches;
    var laborTone = "none";
    if (punches != null && Number(punches) > 0) laborTone = "bad";
    else if (labor) laborTone = toneLabor(labor.variance);
    else if (punches != null) laborTone = "good";
    return [
      { id: "audit", go: "naudit", tone: toneAudit(input.audit && input.audit.status), audit: input.audit || null },
      { id: "comments", go: "gcomm", tone: toneComments(input.comments), comments: input.comments },
      { id: "orders", go: "wo", tone: toneOverdue(input.overdueWo), overdueWo: input.overdueWo },
      { id: "labor", go: "lcmd", tone: laborTone, punches: punches, labor: labor },
      { id: "reservations", go: "fc", tone: input.reservations ? "watch" : "none", reservations: input.reservations || null }
    ];
  }
  function attentionCopy(item, lang) {
    var title = {
      audit: ["Night Audit Review", "Revisión de auditoría nocturna"],
      comments: ["Guest comments", "Comentarios de huéspedes"],
      orders: ["Overdue work orders", "Órdenes atrasadas"],
      labor: ["Punches and labor", "Marcajes y labor"],
      reservations: ["Reservation activity", "Actividad de reservas"]
    }[item.id] || ["", ""];
    var detail = tx(lang, NO_DATA.en, NO_DATA.es);
    if (item.id === "audit" && item.audit && item.audit.status) {
      var due = fmtDue(item.audit.due || "10:00");
      detail = auditLabel(item.audit.status, lang) + " · " + tx(lang, "due", "límite") + " " + due + " CT";
    } else if (item.id === "comments" && item.comments != null) {
      detail = Number(item.comments) > 0
        ? item.comments + " " + tx(lang, "unactioned", "sin atender")
        : tx(lang, "None waiting", "Ninguno pendiente");
    } else if (item.id === "orders" && item.overdueWo != null) {
      detail = Number(item.overdueWo) > 0
        ? item.overdueWo + " " + tx(lang, "overdue", "atrasadas")
        : tx(lang, "None overdue", "Ninguna atrasada");
    } else if (item.id === "labor" && (item.punches != null || item.labor)) {
      var punch = item.punches == null
        ? tx(lang, NO_DATA.en, NO_DATA.es)
        : (Number(item.punches) > 0
          ? item.punches + " " + tx(lang, "open punches", "marcajes abiertos")
          : tx(lang, "No open punches", "Sin marcajes abiertos"));
      var hours = "";
      if (item.labor && item.labor.variance != null) {
        var signed = signedHours(item.labor.variance);
        if (Number(fmtHours(item.labor.variance)) > 0.25) hours = signed + " " + tx(lang, "over plan", "sobre el plan");
        else if (Number(fmtHours(item.labor.variance)) < -0.25) hours = signed + " " + tx(lang, "under plan", "bajo el plan");
        else hours = tx(lang, "On plan", "En el plan");
      }
      detail = hours ? punch + " · " + hours : punch;
    } else if (item.id === "reservations" && item.reservations) {
      var bag = item.reservations;
      detail = (bag.booked || 0) + " " + tx(lang, "new", "nuevas") + " · " +
        (bag.cancelled || 0) + " " + tx(lang, "cancellations", "cancelaciones") + " · " +
        (bag.changed || 0) + " " + tx(lang, "changes", "cambios");
    }
    return { title: tx(lang, title[0], title[1]), detail: detail };
  }

  function corporateRow(snapshot, lang) {
    snapshot = snapshot || {};
    lang = lang === "es" ? "es" : "en";
    var missing = tx(lang, NO_DATA.en, NO_DATA.es);
    var occ = finite(snapshot.occ);
    var score = scoreText(snapshot.score);
    var labor = snapshot.labor ? signedHours(snapshot.labor.variance) : null;
    var wo = countText(snapshot.openWo);
    var status = auditValue(snapshot.audit);
    var audit = status ? auditLabel(status, lang) : missing;
    return {
      code: snapshot.code,
      name: hotelName(snapshot.code, snapshot.name),
      cells: {
        occ: { text: occ == null ? missing : Math.round(occ) + "%", tone: toneOcc(occ) },
        score: { text: score || missing, tone: score ? scoreTone(snapshot.score) : "none" },
        labor: { text: labor || missing, tone: snapshot.labor ? toneLabor(snapshot.labor.variance) : "none" },
        wo: { text: wo == null ? missing : wo, tone: wo == null ? "none" : toneOpenWo(snapshot.openWo) },
        audit: { text: audit, tone: status ? toneAudit(status) : "none" }
      }
    };
  }
  function columns(lang) {
    return [
      { id: "occ", en: "Occ", es: "Ocup." },
      { id: "score", en: "Experience", es: "Experiencia" },
      { id: "labor", en: "Labor", es: "Labor" },
      { id: "wo", en: "Open WOs", es: "Órdenes" },
      { id: "audit", en: "Night audit", es: "Auditoría" }
    ].map(function (col) {
      return { id: col.id, label: tx(lang, col.en, col.es) };
    });
  }

  function pair(value, en, es, lang) {
    var text = value == null || value === "" ? tx(lang, NO_DATA.en, NO_DATA.es) : String(value);
    var quiet = text === NO_DATA.en || text === NO_DATA.es;
    return "<span><b" + (quiet ? " class=\"glance-soft\"" : "") + ">" + esc(text) + "</b><small>" + esc(tx(lang, en, es)) + "</small></span>";
  }
  function tile(tone, klass, go, inner) {
    return "<button type=\"button\" class=\"glance-tile glance-" + tone + (klass ? " " + klass : "") + "\" onclick=\"go('" + go + "')\">" + inner + "</button>";
  }
  function hotelHtml(snapshot, lang, opts) {
    snapshot = snapshot || {};
    lang = lang === "es" ? "es" : "en";
    opts = opts || {};
    var missing = tx(lang, NO_DATA.en, NO_DATA.es);
    var occ = finite(snapshot.occ);
    var forecast = finite(snapshot.forecast);
    var arrivals = snapshot.arrivals == null || snapshot.arrivals === "" ? null : snapshot.arrivals;
    var rooms = snapshot.rooms;
    var labor = snapshot.labor;
    var score = snapshot.score || {};
    var ytd = fmtScore(score.ytd);
    var mtd = fmtScore(score.mtd);
    var bench = fmtScore(score.bench);
    var openWo = countText(snapshot.openWo);
    var occSub = forecast == null
      ? tx(lang, "Today's forecast", "Pronóstico de hoy")
      : tx(lang, "Tomorrow", "Mañana") + " " + Math.round(forecast) + "%";
    var occTile = tile(toneOcc(occ), "glance-occ", "fc",
      "<b class=\"glance-num\">" + esc(occ == null ? missing : Math.round(occ) + "%") + "</b>" +
      "<span class=\"glance-lbl\">" + esc(tx(lang, "Occupancy", "Ocupación")) + "</span>" +
      "<span class=\"glance-sub\">" + esc(occSub) + "</span>");
    var moveTile = tile(snapshot.departures == null ? "none" : (arrivals == null ? "none" : "good"), "glance-move", "fc",
      "<span class=\"glance-split\">" +
      pair(arrivals, "Arrivals", "Llegadas", lang) +
      pair(snapshot.departures == null ? null : snapshot.departures, "Departures", "Salidas", lang) +
      "</span>");
    var roomTile = tile(roomTone(rooms), "glance-rooms", "rooms",
      "<span class=\"glance-quad\">" +
      pair(rooms ? rooms.dirty : null, "Dirty", "Sucios", lang) +
      pair(rooms ? rooms.clean : null, "Clean", "Limpios", lang) +
      pair(rooms ? rooms.inspected : null, "Inspected", "Inspeccionados", lang) +
      pair(rooms ? rooms.ooo : null, "OOO", "Fuera", lang) +
      "</span>");
    var woTile = tile(openWo == null ? "none" : toneOpenWo(snapshot.openWo), "glance-wo", "wo",
      "<b class=\"glance-num\">" + esc(openWo == null ? missing : openWo) + "</b>" +
      "<span class=\"glance-lbl\">" + esc(tx(lang, "Open work orders", "Órdenes abiertas")) + "</span>");
    var laborInner = labor
      ? "<span class=\"glance-split\">" +
        pair(fmtHours(labor.actual), "Actual", "Real", lang) +
        pair(fmtHours(labor.plan), "Plan", "Plan", lang) +
        "</span><span class=\"glance-sub\">" + esc(signedHours(labor.variance) || "") + "</span>"
      : "<b class=\"glance-num glance-soft\">" + esc(missing) + "</b><span class=\"glance-lbl\">" + esc(tx(lang, "Labor hours", "Horas de labor")) + "</span>";
    var laborTile = tile(labor ? toneLabor(labor.variance) : "none", "glance-labor", "lcmd", laborInner);
    var scoreInner = (ytd || mtd)
      ? "<span class=\"glance-split\">" +
        pair(ytd, "YTD", "Año", lang) +
        pair(mtd, "MTD", "Mes", lang) +
        "</span><span class=\"glance-sub\">" + esc(tx(lang, "Benchmark", "Referencia") + " " + (bench || "—")) + "</span>"
      : "<b class=\"glance-num glance-soft\">" + esc(missing) + "</b><span class=\"glance-lbl\">" + esc(tx(lang, "Guest scores", "Calificaciones")) + "</span>";
    var scoreTile = tile((ytd || mtd) ? scoreTone(score) : "none", "glance-score", "gcomm", scoreInner);
    var items = attention(snapshot).map(function (item) {
      var copy = attentionCopy(item, lang);
      return "<button type=\"button\" class=\"glance-row glance-" + item.tone + "\" onclick=\"go('" + item.go + "')\">" +
        "<span class=\"glance-dot\" aria-hidden=\"true\"></span>" +
        "<span class=\"glance-row-tx\"><b>" + esc(copy.title) + "</b><small>" + esc(copy.detail) + "</small></span>" +
        "<span class=\"glance-go\" aria-hidden=\"true\">›</span></button>";
    }).join("");
    var back = opts.back
      ? "<button type=\"button\" class=\"glance-back\" onclick=\"hhqPortfolio()\">‹ " + esc(tx(lang, "All hotels", "Todos los hoteles")) + "</button>"
      : "";
    var place = hotelName(snapshot.code, snapshot.name);
    return "<section id=\"glanceHome\" class=\"glance\" data-glance=\"hotel\" data-hotel=\"" + esc(snapshot.code || "") + "\">" +
      back +
      "<p class=\"glance-kicker\">" + esc(tx(lang, "Today", "Hoy")) + " · " + esc(place) +
      " <span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span></p>" +
      "<p class=\"glance-note\">" + esc(tx(lang, "Sample figures for this demo. No real guests.", "Cifras de ejemplo. No hay huéspedes reales.")) + "</p>" +
      "<div class=\"glance-kpis\">" + occTile + moveTile + woTile + laborTile + roomTile + scoreTile + "</div>" +
      "<section class=\"glance-attn\" aria-label=\"" + esc(tx(lang, "Needs attention today", "Requiere atención hoy")) + "\">" +
      "<h3>" + esc(tx(lang, "Needs attention today", "Requiere atención hoy")) + "</h3>" + items + "</section></section>";
  }
  function corporateHtml(rows, lang) {
    lang = lang === "es" ? "es" : "en";
    var cols = columns(lang);
    var missing = tx(lang, NO_DATA.en, NO_DATA.es);
    var head = "<tr><th>" + esc(tx(lang, "Hotel", "Hotel")) + "</th>" + cols.map(function (col) {
      return "<th>" + esc(col.label) + "</th>";
    }).join("") + "</tr>";
    var body = (rows || []).map(function (row) {
      var button = "<button type=\"button\" class=\"glance-hotel-btn\" onclick=\"hhqOpenHotel('" + esc(row.code) + "')\"><b>" +
        esc(row.code) + "</b><small>" + esc(row.name) + "</small></button>";
      var cells = cols.map(function (col) {
        var item = row.cells[col.id] || { text: missing, tone: "none" };
        return "<td class=\"glance-" + item.tone + "\">" + esc(item.text) + "</td>";
      }).join("");
      return "<tr>" + "<th>" + button + "</th>" + cells + "</tr>";
    }).join("");
    var cards = (rows || []).map(function (row) {
      var pills = cols.map(function (col) {
        var item = row.cells[col.id] || { text: missing, tone: "none" };
        return "<span class=\"glance-pill glance-" + item.tone + "\"><small>" + esc(col.label) + "</small><b>" + esc(item.text) + "</b></span>";
      }).join("");
      return "<button type=\"button\" class=\"glance-card\" onclick=\"hhqOpenHotel('" + esc(row.code) + "')\">" +
        "<span class=\"glance-card-h\"><b>" + esc(row.code) + "</b><small>" + esc(row.name) + "</small><span class=\"glance-go\" aria-hidden=\"true\">›</span></span>" +
        "<span class=\"glance-pills\">" + pills + "</span></button>";
    }).join("");
    var empty = rows && rows.length ? "" : "<p class=\"glance-note\">" + esc(missing) + "</p>";
    return "<section id=\"glanceHome\" class=\"glance glance-portfolio\" data-glance=\"corporate\">" +
      "<p class=\"glance-kicker\">" + esc(tx(lang, "All hotels", "Todos los hoteles")) +
      " <span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span></p>" +
      "<p class=\"glance-note\">" + esc(tx(lang, "Sample figures for this demo. No real guests.", "Cifras de ejemplo. No hay huéspedes reales.")) + "</p>" +
      empty +
      "<div class=\"glance-scroll\"><table class=\"glance-table\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table></div>" +
      "<div class=\"glance-cards\">" + cards + "</div></section>";
  }

  var api = {
    HOTELS: HOTELS,
    NAMES: NAMES,
    demoOn: demoOn,
    viewFor: viewFor,
    layoutFor: layoutFor,
    shouldMount: shouldMount,
    visibleHotels: visibleHotels,
    hotelName: hotelName,
    roomCounts: roomCounts,
    roomBucket: roomBucket,
    laborOf: laborOf,
    toneLabor: toneLabor,
    toneScore: toneScore,
    toneOcc: toneOcc,
    toneOpenWo: toneOpenWo,
    toneAudit: toneAudit,
    scoreTone: scoreTone,
    roomTone: roomTone,
    signedHours: signedHours,
    fmtDue: fmtDue,
    scoreText: scoreText,
    auditLabel: auditLabel,
    attention: attention,
    attentionCopy: attentionCopy,
    corporateRow: corporateRow,
    columns: columns,
    hotelHtml: hotelHtml,
    corporateHtml: corporateHtml
  };
  root.GlanceHome = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function liveNow() {
    var mode = "demo";
    var cfg = null;
    try { if (typeof authMode !== "undefined") mode = authMode; } catch (e) {}
    try { cfg = root.HOTELHQ_CONFIG || null; } catch (e2) {}
    return { mode: mode, cfg: cfg };
  }
  function mountInput() {
    var live = liveNow();
    var auth = "";
    var surface = "";
    var tab = "";
    var signed = false;
    try { auth = typeof authRole === "function" ? authRole() : ""; } catch (e) {}
    try { surface = (typeof S !== "undefined" && S.role) || auth; tab = S.tab || ""; } catch (e2) {}
    try { signed = typeof meUser === "function" && !!meUser(); } catch (e3) {}
    return { mode: live.mode, cfg: live.cfg, authRole: auth, surfaceRole: surface, tab: tab, signedIn: signed };
  }
  function ownHotel() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (me && me.hotel) return me.hotel;
    } catch (e) {}
    return "";
  }
  function featureOn(hotel, feature) {
    try {
      if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, feature) !== false;
    } catch (e) {}
    return true;
  }
  function readSaved(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
  }
  function guestModel() {
    if (!root.GuestComments || !GuestComments.buildDemo) return null;
    var model = GuestComments.buildDemo(new Date().toISOString());
    if (GuestComments.applySaved) model = GuestComments.applySaved(model, readSaved("jrportal_guest_comments_v1"));
    return model;
  }
  function auditModel() {
    if (!root.NightAudit || !NightAudit.buildDemo) return null;
    var now = new Date();
    var model = NightAudit.buildDemo(now.toISOString());
    if (NightAudit.applySaved) model = NightAudit.applySaved(model, readSaved("jrportal_night_audit_v1"));
    model._now = now;
    return model;
  }
  function snapshotOf(code, guests, audit) {
    var bag = (typeof S !== "undefined" && S.h && S.h[code]) || {};
    var fc = bag.fc || [];
    var today = fc[0] || {};
    var next = fc[1] || {};
    var open = (bag.wo || []).filter(function (row) { return row && row.s !== "Done"; });
    var todayIso = "";
    try { todayIso = typeof ld === "function" ? ld() : ""; } catch (e) {}
    var overdue = open.filter(function (row) {
      if (row.od || row.overdue) return true;
      return !!(row.due && todayIso && String(row.due) < todayIso);
    }).length;
    var score = null;
    var comments = null;
    if (guests && featureOn(code, "guest_comments") && GuestComments.scoreRow) {
      var row = GuestComments.scoreRow(guests, code, "overall");
      if (row) score = { ytd: row.ytd && row.ytd.actual, mtd: row.mtd && row.mtd.actual, bench: row.ytd && row.ytd.bench };
      if (GuestComments.tally) {
        var counts = GuestComments.tally(guests, [code]);
        comments = (counts.fresh || 0) + (counts.open || 0);
      }
    }
    var auditStatus = null;
    var due = "10:00";
    if (audit && featureOn(code, "night_audit") && NightAudit.statusOf) {
      auditStatus = NightAudit.statusOf(audit, code, audit.today, audit._now);
      if (audit.settings && audit.settings[code]) due = audit.settings[code];
    }
    var punches = null;
    try {
      if (typeof missDemoRows === "function") {
        punches = missDemoRows(code).filter(function (row) { return row && !row.fixed; }).length;
      }
    } catch (e2) { punches = null; }
    return {
      code: code,
      name: hotelName(code),
      occ: today.occ == null ? null : finite(today.occ),
      forecast: next.occ == null ? null : finite(next.occ),
      arrivals: today.arr == null ? null : today.arr,
      departures: null,
      rooms: roomCounts(bag.rooms || null),
      openWo: bag.wo ? open.length : null,
      overdueWo: bag.wo ? overdue : null,
      labor: laborOf(bag.labor),
      score: score,
      comments: comments,
      punches: punches,
      audit: auditStatus ? { status: auditStatus, due: due } : null,
      reservations: null
    };
  }
  function renderGlance() {
    var input = mountInput();
    var hero = document.getElementById("uxHero");
    var old = document.getElementById("glanceHome");
    if (!shouldMount(input)) {
      if (hero) hero.classList.remove("glance-on");
      if (old) old.remove();
      return;
    }
    if (!hero) return;
    var auth = alias(input.authRole);
    var drilled = false;
    try { drilled = !!(typeof S !== "undefined" && S.hhqDrill); } catch (e) {}
    var layout = layoutFor(auth, drilled);
    var own = ownHotel();
    var allowed = visibleHotels(auth, own, HOTELS);
    var current = "";
    try { current = S.hotel || ""; } catch (e2) {}
    if (layout === "hotel" && allowed.indexOf(current) < 0) current = allowed[0] || "";
    var guests = guestModel();
    var audit = auditModel();
    var lang = langNow();
    var html = "";
    if (layout === "corporate") {
      html = corporateHtml(allowed.map(function (code) {
        return corporateRow(snapshotOf(code, guests, audit), lang);
      }), lang);
    } else if (current) {
      html = hotelHtml(snapshotOf(current, guests, audit), lang, { back: auth === "Above Property" && drilled });
    }
    if (!html) return;
    hero.classList.add("glance-on");
    hero.classList.toggle("glance-portfolio", layout === "corporate");
    if (old) old.remove();
    var today = document.getElementById("hhqToday") || hero;
    var hi = today.querySelector(".ux-hi");
    var search = today.querySelector(".ux-search");
    if (hi && search && search.previousElementSibling !== hi) hi.after(search);
    if (search) search.insertAdjacentHTML("afterend", html);
    else if (hi) hi.insertAdjacentHTML("afterend", html);
    else today.insertAdjacentHTML("afterbegin", html);
    var placed = document.getElementById("glanceHome");
    if (search && placed && placed.nextElementSibling !== search) placed.after(search);
  }

  var css = document.createElement("style");
  css.textContent = [
    "#uxHero.glance-on .hhq-kpis,#uxHero.glance-on .hhq-board,#uxHero.glance-on .hhq-day,#uxHero.glance-on .hhq-urgent,#uxHero.glance-on #naHome,#uxHero.glance-on #gcHome,#uxHero.glance-on #gcScores,#uxHero.glance-on .gc-home,#uxHero.glance-on .gc-scores,#uxHero.glance-on .hhq-ops,#uxHero.glance-on .hhq-brief,#uxHero.glance-on .hhq-done,#uxHero.glance-on .hhq-notes,#uxHero.glance-on #qotd{display:none!important}",
    "#uxHero.glance-on.glance-portfolio .hhq-pair{display:none!important}",
    ".glance{display:flex;flex-direction:column;gap:10px;margin:0 0 8px}",
    ".glance-kicker{margin:0;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#55606f}",
    ".glance-note{margin:0;color:#55606f;font-size:13px;font-weight:650}",
    ".glance-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".glance-tile{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;text-align:left;background:#fff;border:1px solid #e6e8ee;border-top:4px solid #c5cbd6;border-radius:14px;min-height:104px;padding:12px;box-shadow:0 1px 2px rgba(16,24,40,.04)}",
    ".glance-good{border-top-color:#0f7a3a;background:#f3faf5}",
    ".glance-watch{border-top-color:#b54708;background:#fff8f1}",
    ".glance-bad{border-top-color:#b42318;background:#fdf4f3}",
    ".glance-none{border-top-color:#c5cbd6;background:#fff}",
    ".glance-num{font-size:34px;line-height:1;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}",
    ".glance-soft{font-size:18px;font-weight:750;letter-spacing:0;color:#5c6570}",
    ".glance-lbl,.glance-sub{display:block;font-size:13px;font-weight:700;color:#3c4658}",
    ".glance-sub{color:#5c6570;font-weight:650}",
    ".glance-split,.glance-quad{display:grid;width:100%;gap:8px}",
    ".glance-split{grid-template-columns:1fr 1fr}",
    ".glance-quad{grid-template-columns:repeat(4,minmax(0,1fr))}",
    ".glance-split b,.glance-quad b{display:block;font-size:28px;line-height:1.05;font-weight:800;font-variant-numeric:tabular-nums}",
    ".glance-split b.glance-soft,.glance-quad b.glance-soft{font-size:15px;line-height:1.25;font-weight:750;letter-spacing:0}",
    ".glance-split small,.glance-quad small{display:block;margin-top:4px;font-size:12px;font-weight:700;color:#55606f}",
    ".glance-rooms,.glance-score{grid-column:1/-1}",
    ".glance-attn{background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:4px 12px 8px}",
    ".glance-attn h3{margin:10px 0 4px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#55606f}",
    ".glance-row{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:0;border-bottom:1px solid #e6ebf2;border-radius:0;min-height:64px;padding:8px 0}",
    ".glance-row:last-child{border-bottom:0}",
    ".glance-dot{width:12px;height:12px;border-radius:99px;background:#c5cbd6;flex:none}",
    ".glance-row.glance-good .glance-dot{background:#0f7a3a}",
    ".glance-row.glance-watch .glance-dot{background:#b54708}",
    ".glance-row.glance-bad .glance-dot{background:#b42318}",
    ".glance-row-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}",
    ".glance-row-tx b{font-size:16px;line-height:1.25}",
    ".glance-row-tx small{font-size:14px;font-weight:650;color:#3c4658}",
    ".glance-go{font-size:22px;color:#14365d;flex:none}",
    ".glance-back{display:inline-flex;align-items:center;align-self:flex-start;background:#eef3fa;border:0;border-radius:10px;min-height:44px;font-weight:800;padding:0 12px}",
    ".glance-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid #e6e8ee;border-radius:14px;background:#fff}",
    ".glance-table{width:100%;border-collapse:separate;border-spacing:0;min-width:560px}",
    ".glance-table th,.glance-table td{padding:10px 8px;text-align:center;border-bottom:1px solid #e6e8ee;font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}",
    ".glance-table thead th{font-size:12px;letter-spacing:.03em;text-transform:uppercase;color:#55606f;font-weight:800;background:#f7f8fa}",
    ".glance-table tbody th{text-align:left;background:#fff}",
    ".glance-table td.glance-good{background:#e7f6ec;color:#0f7a3a}",
    ".glance-table td.glance-watch{background:#fff4e5;color:#9a3412}",
    ".glance-table td.glance-bad{background:#fdecea;color:#b42318}",
    ".glance-table td.glance-none{background:#f7f8fa;color:#5c6570;font-size:14px;font-weight:700}",
    ".glance-hotel-btn{display:flex;flex-direction:column;align-items:flex-start;background:transparent;border:0;min-height:48px;padding:0;text-align:left}",
    ".glance-hotel-btn small{color:#55606f;font-weight:700;font-size:13px}",
    ".glance-cards{display:none;flex-direction:column;gap:8px}",
    ".glance-card{display:flex;flex-direction:column;gap:8px;width:100%;text-align:left;background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px}",
    ".glance-card-h{display:flex;align-items:baseline;gap:8px}",
    ".glance-card-h b{font-size:18px}",
    ".glance-card-h small{color:#55606f;font-weight:700;flex:1}",
    ".glance-pills{display:grid;grid-template-columns:1fr 1fr;gap:6px}",
    ".glance-pill{display:flex;flex-direction:column;border-radius:10px;padding:8px;background:#f7f8fa;min-height:58px}",
    ".glance-pill small{font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#55606f}",
    ".glance-pill b{font-size:18px;line-height:1.2}",
    ".glance-pill.glance-good{background:#e7f6ec;color:#0f7a3a}",
    ".glance-pill.glance-watch{background:#fff4e5;color:#9a3412}",
    ".glance-pill.glance-bad{background:#fdecea;color:#b42318}",
    ".glance-pill.glance-none{color:#5c6570}",
    ".glance-pill.glance-none b{font-size:14px}",
    "@media(max-width:767px){",
    ".glance-scroll{display:none}",
    ".glance-cards{display:flex}",
    ".glance-num{font-size:32px}",
    ".glance-split b,.glance-quad b{font-size:26px}",
    "}",
    "@media(min-width:768px){",
    ".glance-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}",
    ".glance-rooms,.glance-score{grid-column:span 2}",
    "}",
    "@media(min-width:1024px){",
    ".glance-kpis{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}",
    ".glance-num{font-size:40px}",
    ".glance-table{min-width:0}",
    ".glance-table td{font-size:22px;padding:14px 10px}",
    "}"
  ].join("");
  document.head.appendChild(css);

  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { renderGlance(); } catch (e) {}
      return result;
    };
    try { renderGlance(); } catch (e2) {}
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
