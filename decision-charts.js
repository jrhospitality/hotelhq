/* Decision charts. Numbers come from feeds the app already has.
   Demo example rows stay labeled EXAMPLE. A live hotel with no feed
   gets an empty state. Nothing here invents a Toast, STR, or Medallia row. */
(function (root) {
  "use strict";

  var FLOOR = 80;
  var BRAND = "#0c3d5c";
  var POP = "#176270";
  var SLATE = "#8b97a6";
  var GOOD = "#0d7a32";
  var CLOSE = "#b45309";
  var SHORT = "#b42318";
  var GRID = "#e6eaf0";
  function scoreColor(value, goal) {
    if (value + 1e-9 >= goal) return GOOD;
    if (goal - value <= 2) return CLOSE;
    return SHORT;
  }
  var SCORE_METRICS = [
    { id: "overall_experience", en: "Overall", es: "General", goal: 83 },
    { id: "overall_service", en: "Service", es: "Servicio", goal: 88 },
    { id: "breakfast", en: "Breakfast", es: "Desayuno", goal: 80 },
    { id: "hotel_condition", en: "Hotel condition", es: "Condición del hotel", goal: 82 },
    { id: "guest_room_condition", en: "Guest room", es: "Cuarto", goal: 83 },
    { id: "room_cleanliness", en: "Room cleanliness", es: "Limpieza del cuarto", goal: 87 },
    { id: "bathroom_cleanliness", en: "Bathroom", es: "Baño", goal: 88 }
  ];

  function finite(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtMoney(n) {
    n = finite(n);
    if (n == null) return "—";
    var neg = n < 0;
    var parts = Math.abs(Math.round(n * 100) / 100).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-$" : "$") + parts.join(".");
  }
  function fmtPct(n) {
    n = finite(n);
    if (n == null) return "—";
    return (Math.round(n * 10) / 10).toFixed(1) + "%";
  }
  function fmtPor(n) {
    n = finite(n);
    if (n == null) return "—";
    return fmtMoney(n);
  }
  function fmtIndex(n) {
    n = finite(n);
    if (n == null) return "—";
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function pacePoints(feed) {
    if (!feed || !feed.connected || !Array.isArray(feed.lines)) return null;
    var lines = {};
    feed.lines.forEach(function (line) {
      if (line && (line.key === "occupancy" || line.key === "adr" || line.key === "revpar")) lines[line.key] = line;
    });
    var keys = Object.keys(lines);
    if (!keys.length) return null;
    var any = false;
    keys.forEach(function (key) {
      ["today", "mtd", "ytd"].forEach(function (part) {
        if (finite(lines[key][part]) != null) any = true;
      });
    });
    if (!any) return null;
    return { origin: feed.origin === "example" ? "example" : "live", lines: lines };
  }
  function scorePoints(facts, hotel, api) {
    api = api || (root.GuestScores || null);
    if (!api || !api.pickFacts) return { origin: "empty", rows: [] };
    var picked = api.pickFacts(facts || [], hotel);
    if (!picked || picked.origin === "empty" || !picked.rows || !picked.rows.length) return { origin: "empty", rows: [] };
    var rows = [];
    SCORE_METRICS.forEach(function (meta) {
      var fact = null;
      picked.rows.forEach(function (row) {
        if (row.metric !== meta.id || row.periodKind !== "mtd") return;
        if (row.calcMethod && row.calcMethod !== "topbox_8_10") return;
        if (!fact || String(row.asOf) > String(fact.asOf)) fact = row;
      });
      if (!fact || finite(fact.value) == null) return;
      rows.push({
        id: meta.id,
        en: meta.en,
        es: meta.es,
        goal: finite(fact.goal) == null ? meta.goal : finite(fact.goal),
        value: finite(fact.value),
        floor: FLOOR
      });
    });
    if (!rows.length) return { origin: picked.origin, rows: [] };
    return { origin: picked.origin, rows: rows };
  }
  function fairPoints(rows) {
    return (rows || []).filter(function (row) {
      return row && finite(row.indexValue) != null;
    }).map(function (row) {
      return { id: row.index || row.id, en: row.en, es: row.es, index: finite(row.indexValue) };
    });
  }
  function laborPoints(rows) {
    return (rows || []).filter(function (row) {
      return row && finite(row.a) != null && finite(row.p) != null;
    }).map(function (row) {
      return { name: String(row.n || ""), actual: finite(row.a), plan: finite(row.p) };
    });
  }
  function laborExample(rows) {
    return (rows || []).some(function (row) { return /\(EX\)/.test(String((row && (row.n || row.name)) || "")); });
  }
  function inspPoints(rows) {
    return (rows || []).filter(function (row) {
      return row && row.date && finite(row.score) != null;
    }).map(function (row) {
      return { date: String(row.date), score: finite(row.score), room: row.room == null ? "" : String(row.room) };
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function occTrend(rows) {
    var out = [];
    (rows || []).forEach(function (row, i) {
      if (!row || finite(row.occ) == null) return;
      out.push({ label: String(out.length + 1), occ: finite(row.occ) });
    });
    return out.length >= 2 ? out : [];
  }

  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function exampleTag(lang) {
    return '<span class="ex hq-example">' + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span>";
  }
  function panel(opts) {
    opts = opts || {};
    var lang = opts.lang === "es" ? "es" : "en";
    var body = opts.body || "";
    var banner = opts.example ? exampleTag(lang) : "";
    var wide = opts.wide ? " hq-span" : "";
    return '<section class="hq-panel' + wide + '" id="' + esc(opts.id) + '"><h3>' + esc(tx(lang, opts.en, opts.es)) + "</h3>" +
      (opts.noteEn ? '<p class="hq-note">' + esc(tx(lang, opts.noteEn, opts.noteEs)) + "</p>" : "") +
      banner + body + "</section>";
  }
  function emptyPanel(opts) {
    opts = opts || {};
    var lang = opts.lang === "es" ? "es" : "en";
    opts.body = '<div class="hq-empty">' + esc(tx(lang, opts.emptyEn || "Nothing to chart yet.", opts.emptyEs || "Todavía no hay nada que graficar.")) + "</div>";
    return panel(opts);
  }
  function loadingPanel(opts) {
    opts = opts || {};
    var lang = opts.lang === "es" ? "es" : "en";
    opts.body = '<div class="hq-loading">' + esc(tx(lang, "Loading…", "Cargando…")) + "</div>";
    return panel(opts);
  }

  var api = {
    FLOOR: FLOOR,
    SCORE_METRICS: SCORE_METRICS,
    fmtMoney: fmtMoney,
    fmtPct: fmtPct,
    fmtPor: fmtPor,
    fmtIndex: fmtIndex,
    pacePoints: pacePoints,
    scorePoints: scorePoints,
    fairPoints: fairPoints,
    laborPoints: laborPoints,
    laborExample: laborExample,
    inspPoints: inspPoints,
    occTrend: occTrend,
    panel: panel,
    emptyPanel: emptyPanel
  };
  root.HQCharts = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var charts = [];
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function demoNow() {
    try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
    try { if (root.HOTELHQ_CONFIG && String(root.HOTELHQ_CONFIG.mode) === "live") return false; } catch (e2) {}
    return true;
  }
  function roleNow() {
    try { return (typeof authRole === "function" && authRole()) || (typeof S !== "undefined" && S.role) || ""; } catch (e) { return ""; }
  }
  function tabNow() {
    try { return (typeof S !== "undefined" && S.tab) || ""; } catch (e) { return ""; }
  }
  function hotelNow() {
    try { return (typeof S !== "undefined" && S.hotel) || ""; } catch (e) { return ""; }
  }
  function signedIn() {
    try { return typeof meUser === "function" && !!meUser(); } catch (e) { return false; }
  }
  function leader(role) {
    return role === "GM" || role === "AGM" || role === "Above Property";
  }
  function bag(hotel, key) {
    try { return ((S.h || {})[hotel] || {})[key] || []; } catch (e) { return []; }
  }
  function clearCharts() {
    charts.forEach(function (chart) { try { chart.destroy(); } catch (e) {} });
    charts = [];
  }
  function reduced() {
    try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }
  function baseOptions(extra) {
    var opt = {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduced() ? false : { duration: 280 },
      plugins: { legend: { labels: { color: "#1c1f26", font: { size: 14 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: "#3e4a59", font: { size: 13 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: "#3e4a59", font: { size: 13 } }, grid: { color: GRID } }
      }
    };
    if (extra) Object.keys(extra).forEach(function (key) { opt[key] = extra[key]; });
    return opt;
  }
  function draw(canvas, config) {
    if (!canvas || !root.Chart) return;
    charts.push(new root.Chart(canvas, config));
  }
  var stash = {};
  function kpi(value, en, es, lang) {
    return '<div><b>' + esc(value) + "</b><span>" + esc(tx(lang, en, es)) + "</span></div>";
  }

  function paceBlock(hotel, lang, demo) {
    var title = { id: "hqPace", en: (hotel || "Hotel") + " · Occupancy, ADR, and RevPAR", es: (hotel || "Hotel") + " · Ocupación, ADR y RevPAR", lang: lang, wide: true };
    var state = "empty";
    var feed = null;
    if (root.NightAudit && NightAudit.currentFeed) {
      state = NightAudit.feedState ? NightAudit.feedState() : "empty";
      feed = NightAudit.currentFeed(hotel);
    }
    if (state === "loading") {
      title.noteEn = "Reading the HotelKey night-audit feed.";
      title.noteEs = "Leyendo el reporte de auditoría de HotelKey.";
      return loadingPanel(title);
    }
    var points = pacePoints(feed);
    var trend = demo ? occTrend(bag(hotel, "fc")) : [];
    if (!points && !trend.length) {
      title.noteEn = "Today, month to date, and year to date.";
      title.noteEs = "Hoy, mes a la fecha y año a la fecha.";
      title.emptyEn = "No occupancy, ADR, or RevPAR is loaded for this hotel yet.";
      title.emptyEs = "Todavía no hay ocupación, ADR ni RevPAR para este hotel.";
      return emptyPanel(title);
    }
    var chips = "";
    if (points) {
      var occ = points.lines.occupancy;
      var adr = points.lines.adr;
      var rev = points.lines.revpar;
      chips = '<div class="hq-kpis">' +
        kpi(occ ? fmtPct(occ.today) : "—", "Occupancy today", "Ocupación hoy", lang) +
        kpi(adr ? fmtMoney(adr.today) : "—", "ADR today", "ADR hoy", lang) +
        kpi(rev ? fmtMoney(rev.today) : "—", "RevPAR today", "RevPAR hoy", lang) +
        "</div>";
    }
    var canvases = "";
    if (trend.length) canvases += '<div class="hq-can"><canvas id="hqOccTrend" aria-label="' + esc(tx(lang, "Occupancy by day", "Ocupación por día")) + '"></canvas></div>';
    if (points && points.lines.occupancy) canvases += '<div class="hq-can"><canvas id="hqOccPace" aria-label="' + esc(tx(lang, "Occupancy today, month, and year", "Ocupación hoy, mes y año")) + '"></canvas></div>';
    if (points && (points.lines.adr || points.lines.revpar)) canvases += '<div class="hq-can"><canvas id="hqRevPace" aria-label="' + esc(tx(lang, "ADR and RevPAR", "ADR y RevPAR")) + '"></canvas></div>';
    title.example = (points && points.origin === "example") || (!points && trend.length);
    title.noteEn = points
      ? "Today, month to date, and year to date. Dollars use two decimals."
      : "Occupancy for the days already on this hotel. ADR and RevPAR appear when a night-audit report is loaded.";
    title.noteEs = points
      ? "Hoy, mes a la fecha y año a la fecha. Los dólares usan dos decimales."
      : "Ocupación de los días que ya tiene este hotel. ADR y RevPAR aparecen cuando hay un reporte de auditoría.";
    title.body = chips + canvases;
    stash.hqPace = { points: points, trend: trend };
    return panel(title);
  }
  function scoreBlock(hotel, lang, role) {
    var title = {
      id: "hqScores", en: "Guest scores vs goals", es: "Calificaciones contra metas", lang: lang, wide: true,
      noteEn: "Month to date, Medallia top-box 8–10. The line is the goal. The floor is 80.",
      noteEs: "Mes a la fecha, caja alta Medallia 8–10. La línea es la meta. El piso es 80."
    };
    var bundle = root.GuestScores && GuestScores.currentBundle ? GuestScores.currentBundle() : null;
    if (bundle && bundle.origin === "loading") return loadingPanel(title);
    var model = scorePoints(bundle && bundle.periods, hotel, root.GuestScores);
    if (root.GuestScores && GuestScores.deptsFor && role) {
      var allow = {};
      GuestScores.deptsFor(role).forEach(function (dept) {
        (dept.metrics || []).forEach(function (metric) { allow[metric.id] = true; });
      });
      if (Object.keys(allow).length) model.rows = model.rows.filter(function (row) { return allow[row.id]; });
    }
    if (!model.rows.length) {
      title.emptyEn = "Guest scores are not loaded yet. This chart stays empty until Medallia rows arrive.";
      title.emptyEs = "Todavía no hay calificaciones. Esta gráfica queda vacía hasta que lleguen filas de Medallia.";
      return emptyPanel(title);
    }
    title.example = model.origin === "example";
    title.body = '<div class="hq-can" style="height:280px"><canvas id="hqScoreChart" aria-label="' + esc(tx(lang, "Guest scores against goals", "Calificaciones contra metas")) + '"></canvas></div>';
    stash.hqScores = { rows: model.rows };
    return panel(title);
  }
  function marketBlock(lang) {
    return emptyPanel({
      id: "hqMarket", lang: lang,
      en: "Market sales per occupied room",
      es: "Ventas de tienda por cuarto ocupado",
      noteEn: "Toast plus HotelKey, daily and month to date, divided by rooms sold.",
      noteEs: "Toast más HotelKey, diario y mes a la fecha, dividido entre cuartos vendidos.",
      emptyEn: "Market sales are not loaded yet. No example dollars are shown here.",
      emptyEs: "Todavía no hay ventas de tienda. Aquí no se muestran dólares de ejemplo."
    });
  }
  function fairBlock(role, hotel, lang) {
    var title = {
      id: "hqFair", en: "Fair share index", es: "Índice de participación justa", lang: lang, wide: true,
      noteEn: "100 is an even share. MPI is occupancy, ARI is ADR, and RGI is RevPAR. Trailing 7 days.",
      noteEs: "100 es una participación pareja. MPI es ocupación, ARI es ADR y RGI es RevPAR. Últimos 7 días."
    };
    if (!root.FairShare || !FairShare.compare || !FairShare.buildDemo || (FairShare.demoUi && !FairShare.demoUi())) {
      title.emptyEn = "Fair share is not loaded yet. No STR or Expedia numbers are invented here.";
      title.emptyEs = "Todavía no hay participación justa. Aquí no se inventan cifras de STR ni Expedia.";
      return emptyPanel(title);
    }
    var hotels = FairShare.hotelsFor ? FairShare.hotelsFor(role, hotel) : [hotel];
    var model = FairShare.buildDemo(new Date().toISOString());
    var series = hotels.map(function (code) {
      return { hotel: code, rows: fairPoints(FairShare.compare(model, code, "t7")) };
    }).filter(function (row) { return row.rows.length; });
    if (!series.length) {
      title.emptyEn = "No fair-share snapshot for this hotel yet.";
      title.emptyEs = "Todavía no hay una foto de participación justa para este hotel.";
      return emptyPanel(title);
    }
    var sample = true;
    try { sample = model.hotels[series[0].hotel].source === "sample"; } catch (e) { sample = true; }
    title.example = sample;
    title.body = '<div class="hq-can"><canvas id="hqFairChart" aria-label="' + esc(tx(lang, "Fair share index", "Índice de participación justa")) + '"></canvas></div>';
    stash.hqFair = { series: series };
    return panel(title);
  }
  function laborBlock(hotel, lang, demo) {
    var title = {
      id: "hqLabor", en: "Labor hours vs plan", es: "Horas de labor contra el plan", lang: lang, wide: true,
      noteEn: "Actual hours next to the planned hours already on the labor board.",
      noteEs: "Horas reales junto a las horas del plan que ya están en labor."
    };
    var rows = laborPoints(bag(hotel, "labor"));
    if (!demo) {
      title.emptyEn = "Payroll hours are not loaded yet.";
      title.emptyEs = "Todavía no hay horas de nómina.";
      return emptyPanel(title);
    }
    if (!rows.length) {
      title.emptyEn = "No labor rows for this hotel yet.";
      title.emptyEs = "Todavía no hay filas de labor para este hotel.";
      return emptyPanel(title);
    }
    title.example = laborExample(bag(hotel, "labor"));
    title.body = '<div class="hq-can"><canvas id="hqLaborChart" aria-label="' + esc(tx(lang, "Labor hours versus plan", "Horas de labor contra el plan")) + '"></canvas></div>';
    stash.hqLabor = { rows: rows };
    return panel(title);
  }
  function inspBlock(hotel, tab, lang, demo) {
    var title = {
      id: "hqInsp", en: "Room inspection scores", es: "Puntajes de inspección de cuartos", lang: lang, wide: true,
      noteEn: "Each saved inspection, oldest first. 100 is a perfect room.",
      noteEs: "Cada inspección guardada, de la más antigua a la más nueva. 100 es un cuarto perfecto."
    };
    var saved = root.HHQIhg && HHQIhg.savedRows ? inspPoints(HHQIhg.savedRows(hotel)) : [];
    var seed = demo && tab === "insp" ? inspPoints(bag(hotel, "insp")) : [];
    var rows = saved.length ? saved : seed;
    if (!rows.length) {
      title.emptyEn = "No room inspection scores yet. A score appears here after one is saved.";
      title.emptyEs = "Todavía no hay puntajes de inspección. Aparece uno aquí cuando se guarda.";
      return emptyPanel(title);
    }
    title.example = !saved.length && seed.length;
    title.body = '<div class="hq-can"><canvas id="hqInspChart" aria-label="' + esc(tx(lang, "Inspection scores over time", "Puntajes de inspección en el tiempo")) + '"></canvas></div>';
    stash.hqInsp = { rows: rows };
    return panel(title);
  }

  function paintCanvases(lang) {
    if (!root.Chart) return;
    var labels = [tx(lang, "Today", "Hoy"), tx(lang, "MTD", "Mes"), tx(lang, "YTD", "Año")];
    var occTrendCanvas = document.getElementById("hqOccTrend");
    var pace = stash.hqPace || {};
    if (occTrendCanvas && pace.trend) {
      draw(occTrendCanvas, {
        type: "line",
        data: {
          labels: pace.trend.map(function (row) { return row.label; }),
          datasets: [{ label: tx(lang, "Occupancy", "Ocupación"), data: pace.trend.map(function (row) { return row.occ; }), borderColor: BRAND, backgroundColor: "rgba(12,61,92,.12)", fill: true, tension: 0.25, pointRadius: 3 }]
        },
        options: baseOptions({ scales: { x: baseOptions().scales.x, y: Object.assign({}, baseOptions().scales.y, { max: 100, ticks: { callback: function (v) { return v + "%"; }, color: "#3e4a59", font: { size: 13 } } }) } })
      });
    }
    var occPace = document.getElementById("hqOccPace");
    if (occPace && pace.points && pace.points.lines.occupancy) {
      var occ = pace.points.lines.occupancy;
      draw(occPace, {
        type: "bar",
        data: { labels: labels, datasets: [{ label: tx(lang, "Occupancy", "Ocupación"), data: [occ.today, occ.mtd, occ.ytd], backgroundColor: BRAND, borderRadius: 6 }] },
        options: baseOptions({ scales: { x: baseOptions().scales.x, y: Object.assign({}, baseOptions().scales.y, { max: 100, ticks: { callback: function (v) { return v + "%"; }, color: "#3e4a59", font: { size: 13 } } }) } })
      });
    }
    var revPace = document.getElementById("hqRevPace");
    if (revPace && pace.points) {
      var sets = [];
      if (pace.points.lines.adr) sets.push({ label: "ADR", data: [pace.points.lines.adr.today, pace.points.lines.adr.mtd, pace.points.lines.adr.ytd], backgroundColor: BRAND, borderRadius: 6 });
      if (pace.points.lines.revpar) sets.push({ label: "RevPAR", data: [pace.points.lines.revpar.today, pace.points.lines.revpar.mtd, pace.points.lines.revpar.ytd], backgroundColor: POP, borderRadius: 6 });
      draw(revPace, {
        type: "bar",
        data: { labels: labels, datasets: sets },
        options: baseOptions({ scales: { x: baseOptions().scales.x, y: Object.assign({}, baseOptions().scales.y, { ticks: { callback: function (v) { return "$" + v; }, color: "#3e4a59", font: { size: 13 } } }) } })
      });
    }
    var scoreCanvas = document.getElementById("hqScoreChart");
    var score = stash.hqScores || {};
    if (scoreCanvas && score.rows) {
      draw(scoreCanvas, {
        type: "bar",
        data: {
          labels: score.rows.map(function (row) { return tx(lang, row.en, row.es); }),
          datasets: [
            { type: "bar", label: tx(lang, "Score", "Calificación"), data: score.rows.map(function (row) { return row.value; }), backgroundColor: score.rows.map(function (row) { return scoreColor(row.value, row.goal); }), borderRadius: 6 },
            { type: "line", label: tx(lang, "Goal", "Meta"), data: score.rows.map(function (row) { return row.goal; }), borderColor: BRAND, pointRadius: 4, borderDash: [4, 4], fill: false },
            { type: "line", label: tx(lang, "Floor 80", "Piso 80"), data: score.rows.map(function () { return FLOOR; }), borderColor: SLATE, pointRadius: 0, borderDash: [2, 3], fill: false }
          ]
        },
        options: baseOptions({ indexAxis: "y", scales: { x: Object.assign({}, baseOptions().scales.y, { max: 100, ticks: { callback: function (v) { return v + "%"; }, color: "#3e4a59", font: { size: 13 } } }), y: baseOptions().scales.x } })
      });
    }
    var fairCanvas = document.getElementById("hqFairChart");
    var fair = stash.hqFair || {};
    if (fairCanvas && fair.series) {
      var ids = ["MPI", "ARI", "RGI"];
      var colors = { MPI: BRAND, ARI: POP, RGI: SLATE };
      draw(fairCanvas, {
        type: "bar",
        data: {
          labels: fair.series.map(function (row) { return row.hotel; }),
          datasets: ids.map(function (id) {
            return {
              label: id,
              data: fair.series.map(function (row) {
                var found = row.rows.filter(function (item) { return item.id === id; })[0];
                return found ? found.index : null;
              }),
              backgroundColor: colors[id],
              borderRadius: 6
            };
          })
        },
        options: baseOptions()
      });
    }
    var laborCanvas = document.getElementById("hqLaborChart");
    var labor = stash.hqLabor || {};
    if (laborCanvas && labor.rows) {
      draw(laborCanvas, {
        type: "bar",
        data: {
          labels: labor.rows.map(function (row) { return row.name.replace(" (EX)", ""); }),
          datasets: [
            { label: tx(lang, "Actual", "Real"), data: labor.rows.map(function (row) { return row.actual; }), backgroundColor: BRAND, borderRadius: 6 },
            { label: tx(lang, "Plan", "Plan"), data: labor.rows.map(function (row) { return row.plan; }), backgroundColor: SLATE, borderRadius: 6 }
          ]
        },
        options: baseOptions()
      });
    }
    var inspCanvas = document.getElementById("hqInspChart");
    var insp = stash.hqInsp || {};
    if (inspCanvas && insp.rows) {
      draw(inspCanvas, {
        type: "line",
        data: {
          labels: insp.rows.map(function (row) { return row.room ? row.date + " · " + row.room : row.date; }),
          datasets: [{ label: tx(lang, "Score", "Puntaje"), data: insp.rows.map(function (row) { return row.score; }), borderColor: BRAND, backgroundColor: "rgba(12,61,92,.12)", fill: true, tension: 0.2, pointRadius: 4 }]
        },
        options: baseOptions({ scales: { x: baseOptions().scales.x, y: Object.assign({}, baseOptions().scales.y, { max: 100 }) } })
      });
    }
  }

  function paint() {
    if (!signedIn() || typeof S === "undefined") return;
    clearCharts();
    document.querySelectorAll("[data-hq-chart]").forEach(function (el) { el.remove(); });
    var tab = tabNow();
    var role = roleNow();
    var hotel = hotelNow();
    var lang = langNow();
    var demo = demoNow();
    var parts = [];
    var portfolio = false;
    try { portfolio = role === "Above Property" && !S.hhqDrill; } catch (e) { portfolio = false; }
    if (tab === "home" && leader(role) && !portfolio) parts.push(paceBlock(hotel, lang, demo));
    if (tab === "naudit" && leader(role)) {
      parts.push(paceBlock(hotel, lang, demo));
      parts.push(marketBlock(lang));
    }
    if (tab === "gscores") parts.push(scoreBlock(hotel, lang, role));
    if (tab === "rev" && (role === "GM" || role === "Above Property")) parts.push(fairBlock(role, hotel, lang));
    if ((tab === "labor" || tab === "lcmd") && leader(role)) parts.push(laborBlock(hotel, lang, demo));
    if (tab === "ihg" || tab === "insp") parts.push(inspBlock(hotel, tab, lang, demo));
    var html = parts.filter(Boolean).join("");
    if (!html) return;
    var slot = tab === "home" ? (document.getElementById("hhqToday") || document.getElementById("app")) : document.getElementById("app");
    if (!slot) return;
    var wrap = document.createElement("div");
    wrap.setAttribute("data-hq-chart", "1");
    wrap.className = "hq-charts";
    wrap.innerHTML = html;
    if (tab === "home") {
      var glance = slot.querySelector("#glanceHome");
      if (glance) glance.insertAdjacentElement("afterend", wrap);
      else slot.appendChild(wrap);
    } else {
      var h2 = slot.querySelector("h2");
      var bar = h2 && h2.closest ? h2.closest(".pgbar") : null;
      if (bar) bar.insertAdjacentElement("afterend", wrap);
      else if (h2) h2.insertAdjacentElement("afterend", wrap);
      else slot.insertBefore(wrap, slot.firstChild);
    }
    if (root.Chart) paintCanvases(lang);
    else loadChart(function () { paintCanvases(lang); });
  }
  function loadChart(done) {
    if (root.Chart) { done(); return; }
    if (document.getElementById("hqChartJs")) {
      document.getElementById("hqChartJs").addEventListener("load", done, { once: true });
      return;
    }
    var script = document.createElement("script");
    script.id = "hqChartJs";
    script.src = "vendor/chart.umd.min.js";
    script.onload = done;
    document.head.appendChild(script);
  }

  var late = document.createElement("style");
  late.id = "hqPalette";
  late.textContent = [
    "#hhqFocus .ux-act.pri,.ux-act.pri,#uxHelpBtn,.btn,.qa button{background:#0c3d5c!important;color:#fff!important;border-color:transparent!important}",
    "#welcome{background:#0c3d5c!important}",
    "#welcome .wl-in{background:#0c3d5c!important}",
    ".glance-tile,.glance-pill,.glance-table td.glance-good,.glance-table td.glance-watch,.glance-table td.glance-bad,.glance-table td.glance-none{background:#fff!important;color:#1c2430!important}",
    ".glance-tile{border:1px solid #e2e6ec!important;border-left:4px solid #c5cdd6!important;box-shadow:0 1px 2px rgba(16,24,40,.06)}",
    ".glance-tile.glance-good,.glance-pill.glance-good{border-left:4px solid #0d7a32!important}",
    ".glance-tile.glance-watch,.glance-pill.glance-watch{border-left:4px solid #b45309!important}",
    ".glance-tile.glance-bad,.glance-pill.glance-bad{border-left:4px solid #b42318!important}",
    ".glance-pill{border:1px solid #e2e6ec;border-left:4px solid #c5cdd6}",
    ".glance-pill b,.glance-table td.glance-good,.glance-table td.glance-watch,.glance-table td.glance-bad{color:#1c2430!important}",
    ".glance-table td.glance-good{box-shadow:inset 4px 0 0 #0d7a32}",
    ".glance-table td.glance-watch{box-shadow:inset 4px 0 0 #b45309}",
    ".glance-table td.glance-bad{box-shadow:inset 4px 0 0 #b42318}",
    ".glance-dot{background:#c5cdd6}",
    ".glance-row.glance-good .glance-dot{background:#0d7a32!important}",
    ".glance-row.glance-watch .glance-dot{background:#b45309!important}",
    ".glance-row.glance-bad .glance-dot{background:#b42318!important}",
    "nav button.on{color:#0c3d5c!important;background:#e6eef4!important}",
    ".hhq-kpis div,.kpi div,.gs-k div{background:#fff!important;border:1px solid #e2e6ec!important;border-left:4px solid #0c3d5c!important}"
  ].join("");
  document.head.appendChild(late);

  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { paint(); } catch (e) {}
      return result;
    };
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
