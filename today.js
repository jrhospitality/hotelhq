/* One Today card. Urgency order, top 5, and the rest behind See all.
   The separate alert, punch, guest-issue, lost-and-found, deep-clean, rush,
   and event cards are removed from Home. Their screens stay. */
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
  function has(role, list) { return list.indexOf(role) >= 0; }

  function buildItems(ctx) {
    ctx = ctx || {};
    var role = ctx.role || "";
    var items = [];
    function add(row) { if (row && row.en) items.push(row); }
    (ctx.punches || []).forEach(function (p) {
      if (p.fixed) return;
      add({
        rank: p.issue === "in" || p.issue === "out" ? 10 : 15,
        go: "labor",
        en: (p.issue === "out" ? "Clock out: " : "Clock in: ") + (p.name || ""),
        es: (p.issue === "out" ? "Checa tu salida: " : "Checa tu entrada: ") + (p.name || "")
      });
    });
    (ctx.rush || []).forEach(function (r) {
      if (!has(role, ["Front Desk", "GM", "AGM", "Housekeeping", "Housekeeper"])) return;
      if (role === "Housekeeper" && r.hk && r.hk !== ctx.me) return;
      add({
        rank: r.late ? 20 : 80,
        go: "rushq",
        en: "Rush room " + r.room + (r.late ? " is late" : ""),
        es: "Cuarto urgente " + r.room + (r.late ? " va tarde" : "")
      });
    });
    (ctx.loops || []).forEach(function (g) {
      if (!g || !g.room) return;
      if (!has(role, ["Front Desk", "GM", "AGM", "Housekeeping", "Maintenance", "Breakfast Attendant"])) return;
      if (role === "Housekeeping" && g.dept !== "Housekeeping") return;
      if (role === "Maintenance" && g.dept !== "Maintenance") return;
      if (role === "Breakfast Attendant" && g.dept !== "Breakfast") return;
      add({
        rank: 25,
        go: "gi",
        en: "Close the loop with room " + g.room,
        es: "Cierra el ciclo con la hab. " + g.room
      });
    });
    (ctx.issues || []).forEach(function (g) {
      if (!has(role, ["Front Desk", "GM", "AGM", "Housekeeping", "Maintenance", "Breakfast Attendant"])) return;
      add({
        rank: g.days < 0 || g.days === 0 ? 30 : 90,
        go: "gi",
        en: "Guest issue room " + g.room + (g.days < 0 ? " already departed" : g.days === 0 ? " departs today" : " departs tomorrow"),
        es: "Queja hab. " + g.room + (g.days < 0 ? " ya salió" : g.days === 0 ? " sale hoy" : " sale mañana")
      });
    });
    if (ctx.deep && has(role, ["GM", "AGM", "Housekeeping", "Housekeeper", "Above Property"])) {
      add({
        rank: 40,
        go: "dc",
        en: ctx.deep + " room(s) overdue for a deep clean",
        es: ctx.deep + " cuarto(s) con limpieza profunda atrasada"
      });
    }
    if (ctx.lost && has(role, ["GM", "AGM", "Front Desk", "Housekeeping"])) {
      add({
        rank: 50,
        go: "lf",
        en: ctx.lost + " lost & found item(s) past 90 days",
        es: ctx.lost + " objeto(s) perdidos con más de 90 días"
      });
    }
    (ctx.alerts || []).forEach(function (a) {
      add({ rank: 60, go: "home", en: a.en || "Open alert", es: a.es || a.en || "Alerta abierta" });
    });
    if (ctx.cleans && has(role, ["GM", "AGM", "Housekeeping", "Above Property"])) {
      add({
        rank: 70,
        go: "rooms",
        en: "Housekeeping cleans were not entered",
        es: "No se capturaron las limpiezas"
      });
    }
    (ctx.events || []).forEach(function (ev) {
      if (!has(role, ["GM", "AGM", "Front Desk", "Housekeeping", "Above Property"])) return;
      add({ rank: 100, go: "brief", en: "Event: " + ev, es: "Evento: " + ev });
    });
    if (ctx.sla && has(role, ["GM", "AGM", "Front Desk", "Housekeeping"])) {
      add({
        rank: 110,
        go: "greq",
        en: ctx.sla + " guest request(s) past the response time",
        es: ctx.sla + " solicitud(es) pasaron el tiempo de respuesta"
      });
    }
    items.sort(function (a, b) { return a.rank - b.rank || a.en.localeCompare(b.en); });
    return items;
  }

  function take(items, all) {
    if (all) return items.slice();
    return items.slice(0, 5);
  }

  var api = { buildItems: buildItems, take: take };
  root.HHQToday = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined" || !V.home) return;

  function live() {
    var role = "";
    try { role = (typeof S !== "undefined" && S.role) || authRole(); } catch (e) { role = ""; }
    var me = "";
    try { me = cw(); } catch (e2) { me = ""; }
    var punches = [];
    try {
      punches = (typeof missVisibleRows === "function" ? missVisibleRows() : []).filter(function (r) { return !r.fixed; }).map(function (r) {
        return { name: r.name, issue: r.issue, fixed: false };
      });
    } catch (e3) {}
    var rush = [];
    try {
      rush = (typeof rushList === "function" ? rushList() : []).map(function (r) {
        return { room: r.n, hk: r.hk || "", late: typeof rushLate === "function" ? !!rushLate(r) : false };
      });
    } catch (e4) {}
    var issues = [];
    try {
      var due = typeof giDue === "function" ? giDue() : [];
      var open = typeof giOpen === "function" ? giOpen() : [];
      var seen = {};
      due.concat(open.filter(function (g) { return typeof giDepDay === "function" && giDepDay(g) < 0; })).forEach(function (g) {
        if (seen[g.id]) return;
        seen[g.id] = 1;
        issues.push({ room: g.room, days: typeof giDepDay === "function" ? giDepDay(g) : 0 });
      });
    } catch (e5) {}
    var loops = [];
    try {
      if (typeof giList === "function" && typeof giLoopDue === "function") {
        giList().filter(giLoopDue).forEach(function (g) {
          if (!g || !g.room) return;
          loops.push({ room: g.room, dept: g.dept || "" });
        });
      }
    } catch (e5b) {}
    var deep = 0;
    try {
      if (typeof dcState === "function" && typeof dcLeft === "function") {
        var rooms = dcState().rooms || {};
        deep = Object.keys(rooms).filter(function (n) { return dcLeft(n) < 0; }).length;
      }
    } catch (e6) {}
    var lost = 0;
    try { if (typeof lfDue === "function") lost = lfDue().length; } catch (e7) {}
    var alerts = [];
    try {
      if (typeof ensureDemoAlerts === "function") ensureDemoAlerts();
      (S.alerts || []).filter(function (a) { return typeof alertForMe !== "function" || alertForMe(a); }).forEach(function (a) {
        alerts.push({ en: a.title || a.body || "Open alert", es: a.title || a.body || "Alerta abierta" });
      });
    } catch (e8) {}
    var cleans = null;
    try { cleans = typeof cleansMissing === "function" ? cleansMissing(S.hotel) : null; } catch (e9) {}
    var events = [];
    try { events = (typeof brData === "function" ? (brData().events || []) : []).slice(0, 3); } catch (e10) {}
    var sla = 0;
    try {
      if (typeof grList === "function" && typeof grOver === "function") sla = grList().filter(function (r) { return r.st !== "done" && grOver(r); }).length;
    } catch (e11) {}
    return buildItems({
      role: role, me: me, punches: punches, rush: rush, issues: issues, loops: loops,
      deep: deep, lost: lost, alerts: alerts, cleans: cleans, events: events, sla: sla
    });
  }

  function card(items) {
    var all = !!(typeof S !== "undefined" && S.todayAll);
    var shown = take(items, all);
    var rows = shown.map(function (it) {
      return '<button type="button" class="td-row" onclick="go(\'' + it.go + '\')"><b>' + esc(L(it.en, it.es)) + "</b></button>";
    }).join("");
    var more = items.length > 5
      ? '<button type="button" class="btn2" id="todayMore" onclick="S.todayAll=S.todayAll?0:1;render()">' + esc(all ? L("Show less", "Ver menos") : L("See all", "Ver todo") + " (" + items.length + ")") + "</button>"
      : "";
    var body = rows || '<p class="td-empty">' + esc(L("Nothing urgent right now.", "Nada urgente por ahora.")) + "</p>";
    return '<section class="card" id="todayCard"><h3>' + esc(L("Today", "Hoy")) + "</h3>" + body + more + "</section>";
  }

  function strip(html) {
    var box = document.createElement("div");
    box.innerHTML = html;
    Array.prototype.forEach.call(box.querySelectorAll("#alerts, #missData, #clockBanner, #cleansMissing"), function (n) { n.remove(); });
    Array.prototype.slice.call(box.querySelectorAll(".card, .miss-banner")).forEach(function (el) {
      if (el.id === "todayCard" || el.id === "opsList" || el.id === "healthTop" || el.id === "scoreTop") return;
      var on = el.getAttribute("onclick") || "";
      var tx = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (/^Open alerts|^Alertas abiertas/.test(tx)) el.remove();
      else if (/^Missing data|^Datos faltantes/.test(tx)) el.remove();
      else if ((on.indexOf("rushq") >= 0) && /Rush rooms|Habitaciones urgentes/.test(tx)) el.remove();
      else if (on === "go('gi')" && /Guest issues|Quejas de huéspedes/.test(tx)) el.remove();
      else if (on.indexOf("lf") >= 0 && /90/.test(tx) && /Lost|Perdid/.test(tx)) el.remove();
      else if (el.classList.contains("miss-banner") && /deep clean|limpieza profunda|clock in|checa tu entrada|past response|pasaron el tiempo/.test(tx)) el.remove();
    });
    return box.innerHTML;
  }

  var prev = V.home;
  V.home = function () {
    var html = "";
    try { html = prev.apply(this, arguments) || ""; } catch (e) { html = ""; }
    var items = [];
    try { items = live(); } catch (e2) { items = []; }
    return card(items) + strip(html);
  };
  var css = document.createElement("style");
  css.textContent = "#todayCard h3{margin-top:0}.td-row{display:block;width:100%;text-align:left;background:#fff7f2;border:0;border-bottom:1px solid #f0e2d6;border-radius:0;padding:10px 4px;font:inherit}.td-row b{font-weight:650}.td-empty{margin:6px 0;color:#55606f}#todayMore{width:100%;margin-top:8px}";
  document.head.appendChild(css);
  try { if (typeof meUser === "function" && meUser() && S.tab === "home") render(); } catch (e3) {}
})(typeof window !== "undefined" ? window : globalThis);
