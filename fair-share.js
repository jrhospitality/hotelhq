/* Revenue tab, demo site only. Not shown on Home.
   GM sees the hotel they run. Corporate sees MSPWE, MSPAM, and MSPMS.
   AGM, front desk, and other roles do not see this tab.
   T7 is the trailing 7 days. T28 is the trailing 28 days.
   STR fair share and Expedia fair share both stay on this tab.
   Fair share is the hotel divided by its competitive set, times 100.
   MPI is occupancy, ARI is ADR, and RGI is RevPAR. 100 is an even share.
   Sample figures only. No live STR, DaySTAR, MINT, Hilton, or Expedia feed.
   IHG DaySTAR/STAR access for HotelHQ was still pending as of November 5, 2026.
   Operations has Expedia Partner Central access for these three hotels.
   This file does not call Partner Central.
   Later imports write public.fair_share_snapshots and public.expedia_fair_share_snapshots. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = {
    MSPWE: "Holiday Inn Express Golden Valley",
    MSPAM: "Hampton Inn & Suites MSP Airport/MOA",
    MSPMS: "SpringHill Suites MSP Airport/MOA"
  };
  var PERIODS = [
    { id: "t7", days: 7, en: "Trailing 7 days", es: "Últimos 7 días" },
    { id: "t28", days: 28, en: "Trailing 28 days", es: "Últimos 28 días" }
  ];
  var METRICS = [
    { id: "occ", indexId: "mpi", en: "Occupancy", es: "Ocupación", index: "MPI", kind: "occ" },
    { id: "adr", indexId: "ari", en: "ADR", es: "ADR", index: "ARI", kind: "money" },
    { id: "revpar", indexId: "rgi", en: "RevPAR", es: "RevPAR", index: "RGI", kind: "money" }
  ];
  var EXPEDIA_METRICS = [
    { id: "search", en: "Search share", es: "Participación en búsquedas", index: "", kind: "pct" },
    { id: "nights", en: "Room nights", es: "Noches", index: "", kind: "count" },
    { id: "revenue", en: "Revenue", es: "Ingresos", index: "", kind: "money" }
  ];
  var SOURCES = ["sample", "str", "daystar", "mint", "hilton", "manual"];
  var IMPORT_SOURCES = ["str", "daystar", "mint", "hilton", "manual"];
  var EXPEDIA_SOURCES = ["sample", "partner_central", "manual"];
  var EXPEDIA_IMPORTS = ["partner_central", "manual"];
  var COMP = "Sample competitive set";
  var EXPEDIA_COMP = "Sample Expedia competitive set";
  var TZ = "America/Chicago";
  var KEY = "jrportal_fair_share_v1";
  var FIELDS = ["occ", "occComp", "occLy", "occCompLy", "adr", "adrComp", "adrLy", "adrCompLy", "revpar", "revparComp", "revparLy", "revparCompLy"];
  var EXPEDIA_FIELDS = ["search", "searchComp", "searchLy", "searchCompLy", "nights", "nightsComp", "nightsLy", "nightsCompLy", "revenue", "revenueComp", "revenueLy", "revenueCompLy"];
  var SAMPLE = {
    MSPWE: {
      t7: { occ: 78.4, occComp: 74.1, occLy: 74.2, occCompLy: 73.0, adr: 129.50, adrComp: 134.20, adrLy: 124.10, adrCompLy: 128.40, revpar: 101.53, revparComp: 99.44, revparLy: 92.08, revparCompLy: 93.73 },
      t28: { occ: 74.6, occComp: 73.2, occLy: 71.8, occCompLy: 72.4, adr: 126.40, adrComp: 131.10, adrLy: 121.80, adrCompLy: 127.50, revpar: 94.29, revparComp: 95.97, revparLy: 87.45, revparCompLy: 92.31 }
    },
    MSPAM: {
      t7: { occ: 69.2, occComp: 73.5, occLy: 71.0, occCompLy: 72.8, adr: 148.75, adrComp: 141.20, adrLy: 139.40, adrCompLy: 136.10, revpar: 102.94, revparComp: 103.78, revparLy: 98.97, revparCompLy: 99.08 },
      t28: { occ: 71.4, occComp: 72.6, occLy: 70.1, occCompLy: 71.9, adr: 144.20, adrComp: 140.80, adrLy: 136.50, adrCompLy: 134.90, revpar: 102.96, revparComp: 102.22, revparLy: 95.69, revparCompLy: 96.99 }
    },
    MSPMS: {
      t7: { occ: 64.8, occComp: 71.4, occLy: 66.5, occCompLy: 70.2, adr: 132.10, adrComp: 138.60, adrLy: 129.40, adrCompLy: 135.20, revpar: 85.60, revparComp: 98.96, revparLy: 86.05, revparCompLy: 94.91 },
      t28: { occ: 67.1, occComp: 70.8, occLy: 68.4, occCompLy: 70.0, adr: 130.25, adrComp: 136.40, adrLy: 127.90, adrCompLy: 133.10, revpar: 87.40, revparComp: 96.57, revparLy: 87.48, revparCompLy: 93.17 }
    }
  };
  var EXPEDIA = {
    MSPWE: {
      t7: { search: 24.6, searchComp: 21.0, searchLy: 22.0, searchCompLy: 20.5, nights: 86, nightsComp: 92, nightsLy: 80, nightsCompLy: 88, revenue: 11240, revenueComp: 12480, revenueLy: 10110, revenueCompLy: 11840 },
      t28: { search: 23.1, searchComp: 20.8, searchLy: 21.4, searchCompLy: 20.2, nights: 310, nightsComp: 328, nightsLy: 290, nightsCompLy: 320, revenue: 41250, revenueComp: 44800, revenueLy: 38100, revenueCompLy: 42600 }
    },
    MSPAM: {
      t7: { search: 14.2, searchComp: 17.8, searchLy: 15.0, searchCompLy: 17.4, nights: 74, nightsComp: 70, nightsLy: 68, nightsCompLy: 71, revenue: 13880, revenueComp: 12150, revenueLy: 12440, revenueCompLy: 11820 },
      t28: { search: 15.6, searchComp: 17.2, searchLy: 15.1, searchCompLy: 16.9, nights: 268, nightsComp: 255, nightsLy: 250, nightsCompLy: 258, revenue: 48620, revenueComp: 44210, revenueLy: 45100, revenueCompLy: 43040 }
    },
    MSPMS: {
      t7: { search: 11.8, searchComp: 15.4, searchLy: 12.6, searchCompLy: 15.1, nights: 51, nightsComp: 66, nightsLy: 55, nightsCompLy: 64, revenue: 6840, revenueComp: 9120, revenueLy: 7210, revenueCompLy: 8680 },
      t28: { search: 12.4, searchComp: 15.0, searchLy: 13.0, searchCompLy: 14.8, nights: 198, nightsComp: 240, nightsLy: 210, nightsCompLy: 236, revenue: 26140, revenueComp: 33200, revenueLy: 27400, revenueCompLy: 31850 }
    }
  };

  function norm(role) {
    if (root.HHQ && root.HHQ.norm) return root.HHQ.norm(role);
    if (role === "JR Corporate" || role === "corporate" || role === "above_property") return "Above Property";
    if (role === "gm") return "GM";
    if (role === "agm") return "AGM";
    if (role === "front_desk") return "Front Desk";
    return role || "";
  }
  function canSee(role) {
    role = norm(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "fairshare.see");
    return role === "GM" || role === "Above Property";
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
  function todayOf(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    var date = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag.year + "-" + bag.month + "-" + bag.day;
  }
  function round1(n) {
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(Number(n)) * 10 + 1e-9) / 10;
  }
  function round2(n) {
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(Number(n)) * 100 + 1e-9) / 100;
  }
  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function shareIndex(hotel, comp) {
    hotel = num(hotel);
    comp = num(comp);
    if (hotel == null || comp == null || comp === 0) return null;
    return round1(hotel / comp * 100);
  }
  function yoyPoints(current, prior) {
    current = num(current);
    prior = num(prior);
    if (current == null || prior == null) return null;
    return round1(current - prior);
  }
  function yoyPercent(current, prior) {
    current = num(current);
    prior = num(prior);
    if (current == null || prior == null || prior === 0) return null;
    return round1((current - prior) / prior * 100);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function periodById(id) {
    for (var i = 0; i < PERIODS.length; i++) if (PERIODS[i].id === id) return PERIODS[i];
    return null;
  }
  function pick(window, metric, side, prior) {
    var key = metric.id;
    if (side === "comp") key += "Comp";
    if (prior) key += "Ly";
    return window ? num(window[key]) : null;
  }
  function measure(window, metric) {
    var value = pick(window, metric, "hotel", false);
    var comp = pick(window, metric, "comp", false);
    var prior = pick(window, metric, "hotel", true);
    var compPrior = pick(window, metric, "comp", true);
    var index = shareIndex(value, comp);
    var indexPrior = shareIndex(prior, compPrior);
    return {
      id: metric.id,
      indexId: metric.indexId,
      index: metric.index,
      kind: metric.kind,
      en: metric.en,
      es: metric.es,
      value: value,
      comp: comp,
      prior: prior,
      indexValue: index,
      indexPrior: indexPrior,
      yoy: metric.kind === "occ" || metric.kind === "pct" ? yoyPoints(value, prior) : yoyPercent(value, prior),
      indexYoy: yoyPoints(index, indexPrior)
    };
  }
  function compare(model, hotel, period) {
    var bag = model && model.hotels && model.hotels[hotel];
    var window = bag && bag[period];
    if (!window) return [];
    return METRICS.map(function (metric) { return measure(window, metric); });
  }
  function compareExpedia(model, hotel, period) {
    var bag = model && model.hotels && model.hotels[hotel] && model.hotels[hotel].expedia;
    var window = bag && bag[period];
    if (!window) return [];
    return EXPEDIA_METRICS.map(function (metric) { return measure(window, metric); });
  }
  function toneIndex(n) {
    if (n == null || !isFinite(Number(n))) return "none";
    if (Number(n) >= 100) return "good";
    if (Number(n) >= 95) return "watch";
    return "bad";
  }
  function toneYoy(n) {
    if (n == null || !isFinite(Number(n))) return "none";
    if (Number(n) >= 0) return "good";
    if (Number(n) >= -2) return "watch";
    return "bad";
  }
  function fmtOcc(n) { return n == null ? "—" : round1(n).toFixed(1) + "%"; }
  function fmtCount(n) { return n == null ? "—" : String(Math.round(Number(n))); }
  function fmtMoney(n) {
    if (n == null) return "—";
    var rounded = round2(n);
    var neg = rounded < 0;
    var parts = Math.abs(rounded).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-$" : "$") + parts.join(".");
  }
  function fmtKind(n, kind) {
    if (kind === "occ" || kind === "pct") return fmtOcc(n);
    if (kind === "count") return fmtCount(n);
    return fmtMoney(n);
  }
  function fmtValue(metric) { return fmtKind(metric.value, metric.kind); }
  function fmtComp(metric) { return fmtKind(metric.comp, metric.kind); }
  function fmtIndex(n) { return n == null ? "—" : round1(n).toFixed(1); }
  function fmtMove(n, kind, lang) {
    if (n == null) return "—";
    var sign = n > 0 ? "+" : "";
    var text = sign + round1(n).toFixed(1);
    if (kind === "occ" || kind === "pct" || kind === "index") return text + " " + tx(lang, "pts", "pts");
    return text + "%";
  }
  function buildDemo(now) {
    var hotels = {};
    HOTELS.forEach(function (code) {
      hotels[code] = {
        compSet: COMP,
        currency: "USD",
        source: "sample",
        t7: clone(SAMPLE[code].t7),
        t28: clone(SAMPLE[code].t28),
        expedia: {
          compSet: EXPEDIA_COMP,
          currency: "USD",
          source: "sample",
          t7: clone(EXPEDIA[code].t7),
          t28: clone(EXPEDIA[code].t28)
        }
      };
    });
    return {
      asOf: todayOf(now),
      feed: {
        connected: false,
        sources: ["str", "daystar", "mint", "hilton"],
        pendingAsOf: "2026-11-05"
      },
      expediaFeed: {
        connected: false,
        sources: ["partner_central"],
        access: ["MSPWE", "MSPAM", "MSPMS"]
      },
      hotels: hotels
    };
  }
  function snake(key) {
    return key.replace(/[A-Z]/g, function (c) { return "_" + c.toLowerCase(); });
  }
  function snapshotRows(model) {
    var out = [];
    HOTELS.forEach(function (hotel) {
      var bag = model.hotels[hotel];
      PERIODS.forEach(function (period) {
        var window = bag[period.id];
        var row = {
          hotel: hotel,
          period: period.id,
          period_end: model.asOf,
          source: bag.source || "sample",
          currency: bag.currency || "USD",
          comp_set_label: bag.compSet
        };
        FIELDS.forEach(function (key) { row[snake(key)] = window[key]; });
        out.push(row);
      });
    });
    return out;
  }
  function expediaRows(model) {
    var out = [];
    HOTELS.forEach(function (hotel) {
      var bag = model.hotels[hotel].expedia;
      PERIODS.forEach(function (period) {
        var window = bag[period.id];
        var row = {
          hotel: hotel,
          period: period.id,
          period_end: model.asOf,
          source: bag.source || "sample",
          currency: bag.currency || "USD",
          comp_set_label: bag.compSet
        };
        EXPEDIA_FIELDS.forEach(function (key) { row[snake(key)] = window[key]; });
        out.push(row);
      });
    });
    return out;
  }
  function importSlot(hotel, source, periodEnd, note) {
    if (HOTELS.indexOf(hotel) < 0 || IMPORT_SOURCES.indexOf(source) < 0) return null;
    if (periodEnd && !/^\d{4}-\d{2}-\d{2}$/.test(String(periodEnd))) return null;
    return {
      hotel: hotel,
      source: source,
      status: "pending",
      period_end: periodEnd || null,
      note: String(note || "").slice(0, 240)
    };
  }
  function expediaImportSlot(hotel, source, periodEnd, note) {
    if (HOTELS.indexOf(hotel) < 0 || EXPEDIA_IMPORTS.indexOf(source) < 0) return null;
    if (periodEnd && !/^\d{4}-\d{2}-\d{2}$/.test(String(periodEnd))) return null;
    return {
      hotel: hotel,
      source: source,
      status: "pending",
      period_end: periodEnd || null,
      note: String(note || "").slice(0, 240)
    };
  }
  function writeFields(window, row, fields, pctPrefix) {
    fields.forEach(function (key) {
      var raw = row[key] != null ? row[key] : row[snake(key)];
      var n = num(raw);
      if (n == null || n < 0 || n > 10000000) return;
      if (key.indexOf(pctPrefix) === 0 && n > 100) return;
      window[key] = key.indexOf(pctPrefix) === 0 ? round1(n) : (key.indexOf("nights") === 0 ? Math.round(n) : round2(n));
    });
  }
  function applySaved(model, saved) {
    if (!saved || saved.v !== 1 || !saved.rows) return model;
    var next = clone(model);
    saved.rows.forEach(function (row) {
      if (!row || HOTELS.indexOf(row.hotel) < 0 || !periodById(row.period)) return;
      var bag = next.hotels[row.hotel];
      if (!bag) return;
      if (row.feed === "expedia") {
        if (EXPEDIA_SOURCES.indexOf(row.source) < 0 || !bag.expedia || !bag.expedia[row.period]) return;
        writeFields(bag.expedia[row.period], row, EXPEDIA_FIELDS, "search");
        if (row.comp_set_label || row.compSet) bag.expedia.compSet = String(row.comp_set_label || row.compSet).slice(0, 80);
        bag.expedia.source = row.source;
        return;
      }
      if (SOURCES.indexOf(row.source) < 0 || !bag[row.period]) return;
      writeFields(bag[row.period], row, FIELDS, "occ");
      if (row.comp_set_label || row.compSet) bag.compSet = String(row.comp_set_label || row.compSet).slice(0, 80);
      bag.source = row.source;
    });
    return next;
  }
  function sampleNote(lang) {
    return "<p class=\"fs-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample figures for this demo. Not a live STR, DaySTAR, MINT, or Hilton feed.", "Cifras de ejemplo para esta demo. No es un feed en vivo de STR, DaySTAR, MINT o Hilton.")) + "</p>" +
      "<p class=\"fs-note\">" + esc(tx(lang, "IHG DaySTAR/STAR access for HotelHQ was still pending as of November 5, 2026.", "El acceso de HotelHQ a IHG DaySTAR/STAR seguía pendiente al 5 de noviembre de 2026.")) + "</p>";
  }
  function legend(lang) {
    return "<p class=\"fs-note\">" + esc(tx(lang,
      "Fair share is the hotel divided by its competitive set, times 100. 100 is an even share. MPI is occupancy, ARI is ADR, and RGI is RevPAR. YOY compares this window with the same window last year. The small number under fair share is how that index moved.",
      "La participación justa es el hotel dividido entre su grupo competitivo, por 100. 100 es una parte pareja. MPI es ocupación, ARI es ADR y RGI es RevPAR. Interanual compara esta ventana con la misma ventana del año pasado. El número pequeño bajo la participación justa es cómo se movió ese índice."
    )) + "</p>";
  }
  function expediaNote(lang) {
    return "<p class=\"fs-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample Expedia figures for this demo. Not a live Partner Central feed.", "Cifras de Expedia de ejemplo. No es un feed en vivo de Partner Central.")) + "</p>" +
      "<p class=\"fs-note\">" + esc(tx(lang, "Operations has Expedia Partner Central access for these three hotels. This screen does not call it.", "Operaciones ya tiene acceso a Expedia Partner Central para estos tres hoteles. Esta pantalla no lo consulta.")) + "</p>" +
      "<p class=\"fs-note\">" + esc(tx(lang, "Search share is visibility. Room nights and revenue are property totals versus the sample Expedia competitive set, not bookings.", "La participación en búsquedas es visibilidad. Las noches y los ingresos son totales del hotel contra el grupo competitivo de Expedia de ejemplo, no reservas.")) + "</p>";
  }
  function periodHtml(model, hotel, period, lang, feed) {
    var rootBag = model.hotels[hotel];
    var bag = feed === "expedia" ? rootBag.expedia : rootBag;
    var rows = feed === "expedia" ? compareExpedia(model, hotel, period.id) : compare(model, hotel, period.id);
    var compLabel = feed === "expedia"
      ? tx(lang, "Sample Expedia competitive set", "Grupo competitivo de Expedia de ejemplo")
      : (bag.compSet || COMP);
    var head = "<tr><th>" + esc(tx(lang, "Metric", "Medida")) + "</th><th>" + esc(tx(lang, "Hotel", "Hotel")) + "</th><th>" + esc(tx(lang, "Comp set", "Grupo comp.")) + "</th><th>" + esc(tx(lang, "Fair share", "Participación justa")) + "</th><th>" + esc(tx(lang, "YOY", "Interanual")) + "</th></tr>";
    var body = rows.map(function (row) {
      var indexText = fmtIndex(row.indexValue) + (row.index ? " " + row.index : "");
      return "<tr data-metric=\"" + row.id + "\"><th>" + esc(tx(lang, row.en, row.es)) + "</th><td>" + esc(fmtValue(row)) + "</td><td>" + esc(fmtComp(row)) + "</td><td class=\"fs-" + toneIndex(row.indexValue) + "\"><b>" + esc(indexText) + "</b><small>" + esc(fmtMove(row.indexYoy, "index", lang)) + "</small></td><td class=\"fs-" + toneYoy(row.yoy) + "\">" + esc(fmtMove(row.yoy, row.kind, lang)) + "</td></tr>";
    }).join("");
    return "<section class=\"fs-period\" data-feed=\"" + feed + "\" data-period=\"" + period.id + "\" data-hotel=\"" + esc(hotel) + "\"><h3>" + esc(period.id.toUpperCase()) + " · " + esc(tx(lang, period.en, period.es)) + "</h3><p class=\"fs-note\">" +
      esc(tx(lang, "Period ending", "Periodo que termina") + " " + model.asOf + " · " + compLabel) + "</p><div class=\"fs-scroll\"><table class=\"fs-table\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table></div></section>";
  }
  function hotelHtml(model, hotel, lang, feed) {
    return "<section class=\"fs-hotel\" data-feed=\"" + feed + "\" data-hotel=\"" + esc(hotel) + "\"><h3><b>" + esc(hotel) + "</b> " + esc(NAMES[hotel] || hotel) + "</h3>" +
      PERIODS.map(function (period) { return periodHtml(model, hotel, period, lang, feed); }).join("") + "</section>";
  }
  function sourceBlock(model, hotels, lang, feed) {
    var title = feed === "expedia"
      ? ["Expedia fair share", "Participación justa de Expedia"]
      : ["STR fair share", "Participación justa STR"];
    var note = feed === "expedia" ? expediaNote(lang) : sampleNote(lang) + legend(lang);
    return "<section class=\"fs-source\" data-feed=\"" + feed + "\"><h3 class=\"fs-source-title\">" + esc(tx(lang, title[0], title[1])) + "</h3>" + note +
      hotels.map(function (hotel) { return hotelHtml(model, hotel, lang, feed); }).join("") + "</section>";
  }
  function sectionHtml(model, actor, view) {
    view = view || {};
    actor = actor || {};
    var lang = view.lang === "es" ? "es" : "en";
    var allowed = hotelsFor(actor.role, actor.hotel);
    if (!allowed.length) return "";
    var hotels = allowed;
    if (view.hotel && allowed.indexOf(view.hotel) >= 0 && view.portfolio === false) hotels = [view.hotel];
    var many = hotels.length > 1;
    return "<section class=\"fs" + (many ? " fs-portfolio" : "") + "\" id=\"revRoot\" data-revenue=\"1\">" +
      "<h2>" + esc(tx(lang, "Revenue", "Ingresos")) + "</h2>" +
      sourceBlock(model, hotels, lang, "str") +
      sourceBlock(model, hotels, lang, "expedia") + "</section>";
  }
  function pageHtml(model, actor, view) {
    var html = sectionHtml(model, actor, view);
    if (!html) return "<div class=\"fs\" id=\"revRoot\" hidden></div>";
    return html;
  }

  var api = {
    HOTELS: HOTELS, NAMES: NAMES, PERIODS: PERIODS, METRICS: METRICS, EXPEDIA_METRICS: EXPEDIA_METRICS,
    SOURCES: SOURCES, IMPORT_SOURCES: IMPORT_SOURCES, EXPEDIA_SOURCES: EXPEDIA_SOURCES, EXPEDIA_IMPORTS: EXPEDIA_IMPORTS,
    norm: norm, canSee: canSee, hotelsFor: hotelsFor, demoUi: demoUi, todayOf: todayOf,
    shareIndex: shareIndex, yoyPoints: yoyPoints, yoyPercent: yoyPercent, toneIndex: toneIndex, toneYoy: toneYoy,
    buildDemo: buildDemo, compare: compare, compareExpedia: compareExpedia, snapshotRows: snapshotRows, expediaRows: expediaRows,
    importSlot: importSlot, expediaImportSlot: expediaImportSlot, applySaved: applySaved,
    sectionHtml: sectionHtml, pageHtml: pageHtml, fmtMove: fmtMove
  };
  root.FairShare = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  function langNow() { try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; } }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return me ? { role: me.role, hotel: me.hotel || "", name: me.name || "" } : { role: "", hotel: "", name: "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function surfaceNow() {
    try { return (typeof S !== "undefined" && S.role) || actorNow().role; } catch (e) { return actorNow().role; }
  }
  function featureOn(hotel) {
    try { if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "fair_share") !== false; } catch (e) {}
    return true;
  }
  function readSaved() {
    try { var data = JSON.parse(localStorage.getItem(KEY) || "null"); return data && data.v === 1 ? data : null; } catch (e) { return null; }
  }
  function bundle() { return applySaved(buildDemo(new Date().toISOString()), readSaved()); }
  function bootPage() {
    var actor = actorNow();
    var surface = norm(surfaceNow());
    if (surface !== "GM" && surface !== "Above Property") return "<div class=\"fs\" id=\"revRoot\" hidden></div>";
    var hotel = "";
    try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
    if (!featureOn(hotel || actor.hotel || "MSPWE")) return "<div class=\"fs\" id=\"revRoot\" hidden></div>";
    return pageHtml(bundle(), actor, { lang: langNow(), hotel: hotel, portfolio: norm(actor.role) === "Above Property" });
  }
  if (typeof M !== "undefined") M.rev = ["📈", "Revenue"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Revenue = "Ingresos";
  if (typeof V !== "undefined") V.rev = bootPage;
  if (typeof NAV5 !== "undefined" && NAV5.GM) {
    var gmNav = NAV5.GM.filter(function (id) { return id !== "rev"; });
    var navAt = gmNav.indexOf("home");
    gmNav.splice(navAt >= 0 ? navAt + 1 : 0, 0, "rev");
    NAV5.GM = gmNav;
  }
  function showRev(role) {
    var actor = actorNow();
    var surface = norm(role);
    var hotel = "";
    try { hotel = (typeof S !== "undefined" && S.hotel) || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
    return hotelsFor(actor.role, actor.hotel).length > 0 && (surface === "GM" || surface === "Above Property") && featureOn(hotel || actor.hotel || "MSPWE");
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = actorNow();
      var hotel = "";
      try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
      var show = showRev(role);
      if (show && list.indexOf("rev") < 0) list.splice(Math.min(1, list.length), 0, "rev");
      if (!show) list = list.filter(function (id) { return id !== "rev" && id !== "fshare"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows && !root.HHQMenus.menuAllows("rev", actor.role, hotel, function (h, feature) {
        return feature === "fair_share" ? featureOn(h) : true;
      })) list = list.filter(function (id) { return id !== "rev" && id !== "fshare"; });
      return list;
    };
  }
  if (typeof navFor === "function") {
    var prevNav = navFor;
    root.navFor = function (role) {
      var list = (prevNav(role) || []).slice();
      if (showRev(role) && list.indexOf("rev") < 0) {
        var at = list.indexOf("home");
        list.splice(at >= 0 ? at + 1 : 0, 0, "rev");
      }
      if (!showRev(role)) list = list.filter(function (id) { return id !== "rev" && id !== "fshare"; });
      return list;
    };
  }
  try {
    if (typeof RSEC !== "undefined" && RSEC[0] && RSEC[0][2].indexOf("rev") < 0) {
      var atHome = RSEC[0][2].indexOf("home");
      RSEC[0][2].splice(atHome >= 0 ? atHome + 1 : 0, 0, "rev");
    }
  } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("rev") < 0) NOCOLS.push("rev"); } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "fair_share", en: "Revenue", es: "Ingresos", order: 18 });

  var style = document.createElement("style");
  style.textContent = [
    ".fs{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}",
    ".fs h2,.fs h3{margin:0}",
    ".fs-source{display:flex;flex-direction:column;gap:8px;margin:4px 0 16px}",
    ".fs-source-title{font-size:18px;color:#14365d}",
    ".fs-note{margin:0;color:#3c4658;font-size:13px;font-weight:650}",
    ".fs-hotel{background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px}",
    ".fs-hotel h3 b{margin-right:6px}",
    ".fs-period{margin-top:10px}",
    ".fs-period h3{font-size:14px;letter-spacing:.03em;text-transform:uppercase;color:#14365d}",
    ".fs-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:6px}",
    ".fs-table{width:100%;border-collapse:collapse;min-width:520px;font-variant-numeric:tabular-nums}",
    ".fs-table th,.fs-table td{padding:8px 6px;border-bottom:1px solid #e6ebf2;text-align:right;font-size:15px}",
    ".fs-table thead th{font-size:12px;letter-spacing:.03em;text-transform:uppercase;color:#55606f;text-align:right}",
    ".fs-table tbody th,.fs-table thead th:first-child,.fs-table td:first-child,.fs-table tbody th{text-align:left}",
    ".fs-table small{display:block;font-size:12px;font-weight:700;color:#3c4658}",
    ".fs-good{background:#e7f6ec;color:#0f7a3a}",
    ".fs-watch{background:#fff4e5;color:#9a3412}",
    ".fs-bad{background:#fdecea;color:#b42318}",
    ".fs-none{background:#f7f8fa;color:#5c6570}",
    "@media(min-width:768px){.fs-portfolio{gap:12px}}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
