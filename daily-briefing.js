/* Daily briefing for the GM or AGM at their own hotel.
   Every number comes from a source that already exists. A missing source is omitted. */
(function (root) {
  "use strict";

  function sections(input) {
    input = input || {};
    var out = [];
    if (input.occ != null && input.occ !== "") {
      var occ = String(input.occ);
      out.push({ id: "occ", en: "Occupancy forecast", es: "Pronóstico de ocupación", value: occ.indexOf("%") >= 0 ? occ : occ + "%" });
    }
    var travel = [];
    if (input.arrivals != null && input.arrivals !== "") travel.push({ en: "Arrivals", es: "Llegadas", value: String(input.arrivals) });
    if (input.departures != null && input.departures !== "") travel.push({ en: "Departures", es: "Salidas", value: String(input.departures) });
    if (travel.length) out.push({ id: "travel", en: "Arrivals and departures", es: "Llegadas y salidas", rows: travel });
    if (input.laborActual != null && input.laborActual !== "" && input.laborPlan != null && input.laborPlan !== "") {
      out.push({
        id: "labor",
        en: "Labor actual vs plan",
        es: "Labor real contra el plan",
        actual: String(input.laborActual),
        plan: String(input.laborPlan)
      });
    }
    if (input.openWo != null && input.openWo !== "") {
      out.push({
        id: "wo",
        en: "Work orders",
        es: "Órdenes de trabajo",
        open: String(input.openWo),
        overdue: input.overdueWo == null || input.overdueWo === "" ? null : String(input.overdueWo)
      });
    }
    if (input.meetings && input.meetings.length) out.push({ id: "meet", en: "Meeting rooms today", es: "Salones de hoy", items: input.meetings.slice() });
    if (input.leads && input.leads.length) out.push({ id: "leads", en: "Sales leads", es: "Prospectos", items: input.leads.slice() });
    if (input.alerts && input.alerts.length) out.push({ id: "alerts", en: "Urgent alerts", es: "Alertas urgentes", items: input.alerts.slice() });
    return out;
  }

  var api = { sections: sections };
  root.HHQBrief = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function hotelOf() {
    try {
      var u = meUser();
      if (u && u.hotel) return u.hotel;
      var role = "";
      try { role = authRole(); } catch (e2) { role = u && u.role; }
      if ((role === "Above Property" || role === "JR Corporate") && typeof S !== "undefined" && S.hotel) return S.hotel;
    } catch (e) {}
    return "";
  }
  function allowed() {
    var role = "";
    try { role = authRole(); } catch (e) { role = ""; }
    return role === "GM" || role === "AGM" || role === "Above Property" || role === "JR Corporate";
  }
  function bag(hotel) {
    try { return (S.h && S.h[hotel]) || {}; } catch (e) { return {}; }
  }
  function hours(rows, key) {
    if (!rows || !rows.length) return null;
    var sum = 0;
    var any = false;
    rows.forEach(function (row) {
      var n = num(row && row[key]);
      if (n == null) return;
      any = true;
      sum += n;
    });
    if (!any) return null;
    return Math.round(sum * 10) / 10;
  }
  function gather(hotel) {
    var data = bag(hotel);
    var fc = (data.fc && data.fc[0]) || {};
    var occ = fc.occ != null && fc.occ !== "" ? fc.occ : null;
    var arrivals = fc.arr != null && fc.arr !== "" ? fc.arr : null;
    var departures = fc.dep != null && fc.dep !== "" ? fc.dep : (fc.departures != null && fc.departures !== "" ? fc.departures : null);
    var openWo = null;
    var overdueWo = null;
    if (Array.isArray(data.wo)) {
      var today = "";
      try { today = typeof ld === "function" ? ld() : ""; } catch (e) { today = ""; }
      openWo = data.wo.filter(function (w) { return w && w.s !== "Done"; }).length;
      overdueWo = data.wo.filter(function (w) {
        if (!w || w.s === "Done") return false;
        if (w.od || w.overdue) return true;
        return !!(w.due && today && String(w.due) < today);
      }).length;
    }
    var meetings = [];
    try {
      if (root.Meetings && Meetings.currentState && Meetings.dayEvents && Meetings.chicagoDate) {
        var state = Meetings.currentState();
        var day = Meetings.chicagoDate(new Date().toISOString());
        if (state && day && (!root.HotelFeatures || HotelFeatures.on(hotel, "meetings") !== false)) {
          meetings = Meetings.dayEvents(state, hotel, day).filter(function (row) {
            return row && row.status !== "cancelled";
          }).map(function (row) {
            return (row.start || "") + (row.end ? "-" + row.end : "") + " " + (row.groupName || "");
          }).filter(function (line) { return line.trim(); });
        }
      }
    } catch (e2) { meetings = []; }
    var leads = [];
    try {
      if (root.SalesLeads && SalesLeads.currentState && SalesLeads.waitingLeads) {
        var leadsState = SalesLeads.currentState();
        if (leadsState && leadsState.origin !== "loading" && (!root.HotelFeatures || HotelFeatures.on(hotel, "sales_leads") !== false)) {
          leads = SalesLeads.waitingLeads(leadsState.leads, hotel).map(function (row) {
            var name = [row.contactFirst, row.contactLast].filter(Boolean).join(" ");
            return (row.status || "New") + (name ? " · " + name : "");
          });
        }
      }
    } catch (e3) { leads = []; }
    var alerts = [];
    if (overdueWo > 0) alerts.push(overdueWo + " " + L("overdue work orders", "órdenes atrasadas"));
    try {
      if (typeof pmToday === "function") {
        var latePm = pmToday().filter(function (row) { return row && row.od && !row.done; }).length;
        if (latePm > 0) alerts.push(latePm + " " + L("overdue preventive maintenance", "mantenimiento atrasado"));
      }
    } catch (e4) {}
    try {
      if (typeof rushList === "function" && typeof rushLate === "function") {
        var lateRush = rushList().filter(rushLate).length;
        if (lateRush > 0) alerts.push(lateRush + " " + L("overdue rush rooms", "cuartos urgentes atrasados"));
      }
    } catch (e5) {}
    return {
      hotel: hotel,
      occ: occ,
      arrivals: arrivals,
      departures: departures,
      laborActual: hours(data.labor, "a"),
      laborPlan: hours(data.labor, "p"),
      openWo: openWo,
      overdueWo: overdueWo,
      meetings: meetings,
      leads: leads,
      alerts: alerts
    };
  }
  function pageHtml() {
    if (!allowed()) return "<div class=\"raw db\"><h2>" + esc(L("Daily Briefing", "Resumen diario")) + "</h2><p>" + esc(L("This briefing is for the GM and AGM at their own hotel.", "Este resumen es para el GM y el AGM en su hotel.")) + "</p></div>";
    var hotel = hotelOf();
    if (!hotel) return "<div class=\"raw db\"><h2>" + esc(L("Daily Briefing", "Resumen diario")) + "</h2><p>" + esc(L("No hotel is assigned.", "No hay un hotel asignado.")) + "</p></div>";
    var blocks = sections(gather(hotel));
    var body = blocks.map(function (block) {
      if (block.value) return "<section class=\"card db-sec\"><h3>" + esc(L(block.en, block.es)) + "</h3><p class=\"db-big\">" + esc(block.value) + "</p></section>";
      if (block.rows) return "<section class=\"card db-sec\"><h3>" + esc(L(block.en, block.es)) + "</h3>" + block.rows.map(function (row) {
        return "<p><b>" + esc(row.value) + "</b> " + esc(L(row.en, row.es)) + "</p>";
      }).join("") + "</section>";
      if (block.id === "labor") return "<section class=\"card db-sec\"><h3>" + esc(L(block.en, block.es)) + "</h3><p class=\"db-big\">" + esc(block.actual) + "h</p><p>" + esc(L("Plan", "Plan")) + " " + esc(block.plan) + "h</p></section>";
      if (block.id === "wo") {
        var extra = block.overdue != null && block.overdue !== "0" ? "<p>" + esc(block.overdue) + " " + esc(L("overdue", "atrasadas")) + "</p>" : "";
        return "<section class=\"card db-sec\"><h3>" + esc(L(block.en, block.es)) + "</h3><p class=\"db-big\">" + esc(block.open) + "</p><p>" + esc(L("open", "abiertas")) + "</p>" + extra + "</section>";
      }
      return "<section class=\"card db-sec\"><h3>" + esc(L(block.en, block.es)) + "</h3><ul>" + (block.items || []).map(function (line) {
        return "<li>" + esc(line) + "</li>";
      }).join("") + "</ul></section>";
    }).join("");
    if (!body) body = "<p class=\"db-missing\">" + esc(L("No feeds are connected for this hotel. This is not an all-clear.", "No hay datos conectados para este hotel. Esto no es un todo en orden.")) + "</p>";
    var name = (typeof HOTELS !== "undefined" && HOTELS[hotel]) || hotel;
    return "<div class=\"raw db\" id=\"dbRoot\"><h2>" + esc(L("Daily Briefing", "Resumen diario")) + "</h2><p class=\"db-hotel\">" + esc(name) + "</p>" + body + "</div>";
  }

  if (typeof M !== "undefined") M.dbrief = ["📰", "Daily Briefing"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Daily Briefing"] = "Resumen diario";
  if (typeof V !== "undefined") V.dbrief = pageHtml;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var who = "";
      try { who = authRole() || role; } catch (e) { who = role; }
      if (role === "GM" && (who === "GM" || who === "AGM")) {
        list = list.filter(function (id) { return id !== "brief"; });
        if (list.indexOf("dbrief") < 0) list.push("dbrief");
      }
      if (role === "GM" && (who === "Above Property" || who === "JR Corporate")) {
        list = list.filter(function (id) { return id !== "brief"; });
        if (list.indexOf("dbrief") < 0) list.unshift("dbrief");
      }
      return list;
    };
  }
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("dbrief") < 0) NOCOLS.push("dbrief"); } catch (e6) {}

  function dayKey() { return new Date().toISOString().slice(0, 10); }
  function foldKey() {
    var uid = "";
    try { uid = (meUser() && meUser().id) || (typeof S !== "undefined" && S.uid) || ""; } catch (e) {}
    return "jrportal_brief_fold_" + uid + "_" + dayKey();
  }
  function collapsed() {
    try { return localStorage.getItem(foldKey()) === "1"; } catch (e) { return false; }
  }
  root.HHQBriefToggle = function () {
    try { localStorage.setItem(foldKey(), collapsed() ? "0" : "1"); } catch (e) {}
    if (typeof render === "function") render();
  };
  function compact(block) {
    if (block.value) return "<div class=\"db-mini\"><b>" + esc(block.value) + "</b><span>" + esc(L(block.en, block.es)) + "</span></div>";
    if (block.rows) return "<div class=\"db-mini\"><b>" + esc(block.rows.map(function (row) { return row.value + " " + L(row.en, row.es); }).join(" · ")) + "</b><span>" + esc(L(block.en, block.es)) + "</span></div>";
    if (block.id === "labor") return "<div class=\"db-mini\"><b>" + esc(block.actual) + "h</b><span>" + esc(L("Plan", "Plan")) + " " + esc(block.plan) + "h</span></div>";
    if (block.id === "wo") return "<div class=\"db-mini\"><b>" + esc(block.open) + "</b><span>" + esc(L("open", "abiertas")) + (block.overdue && block.overdue !== "0" ? " · " + esc(block.overdue) + " " + esc(L("overdue", "atrasadas")) : "") + "</span></div>";
    var first = (block.items || [])[0] || "";
    return "<div class=\"db-mini\"><b>" + esc(String(first).slice(0, 72)) + "</b><span>" + esc(L(block.en, block.es)) + "</span></div>";
  }
  function inlineHtml() {
    var role = "";
    try { role = authRole(); } catch (e) { role = ""; }
    if (role !== "GM" && role !== "AGM") return "";
    var hotel = hotelOf();
    if (!hotel) return "";
    var blocks = sections(gather(hotel));
    var title = L("Daily Briefing", "Resumen diario");
    if (!blocks.length) return "";
    if (collapsed()) {
      return '<section class="hhq-brief" id="hhqBrief"><button type="button" class="hhq-brief-bar" onclick="HHQBriefToggle()"><b>' + esc(title) + '</b><span>' + esc(L("Show", "Mostrar")) + "</span></button></section>";
    }
    return '<section class="hhq-brief" id="hhqBrief"><div class="hhq-brief-hd"><h3>' + esc(title) + '</h3><button type="button" onclick="HHQBriefToggle()">' + esc(L("Collapse", "Ocultar")) + '</button><button type="button" onclick="go(\'dbrief\')">' + esc(L("Full briefing", "Resumen completo")) + '</button></div><div class="hhq-brief-grid">' + blocks.map(compact).join("") + "</div></section>";
  }
  root.HHQBrief.inlineHtml = inlineHtml;

  var css = document.createElement("style");
  css.textContent = ".db-hotel{font-weight:750;color:#5c6570;margin:0 0 8px}.db-sec h3{margin:0 0 6px}.db-big{font-size:28px;font-weight:800;margin:0}.db-sec ul{margin:0;padding-left:18px}.db-sec li{margin:0 0 6px}.hhq-brief{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:12px;margin:0 0 12px}.hhq-brief-hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.hhq-brief-hd h3{margin:0;flex:1}.hhq-brief-hd button,.hhq-brief-bar{background:#f7f8fa;border:1px solid #e6e8ee;border-radius:10px;min-height:36px;font-weight:750;padding:0 12px}.hhq-brief-bar{display:flex;width:100%;align-items:center;justify-content:space-between}.hhq-brief-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px}.db-mini{background:#f7f8fa;border:1px solid #e6e8ee;border-radius:12px;padding:10px}.db-mini b{display:block;font-size:18px;line-height:1.2}.db-mini span{display:block;color:#5c6570;font-size:12px;font-weight:700}@media(min-width:1024px){#dbRoot{display:grid;grid-template-columns:1fr 1fr;gap:12px}#dbRoot>h2,#dbRoot>.db-hotel{grid-column:1/-1}}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
