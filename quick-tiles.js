/* Home quick tiles. Defaults follow the person's role and the hotel's feature
   switches. A saved list replaces the defaults. Null means "use defaults".
   Onboarding stays in More and is never a quick tile. */
(function (root) {
  "use strict";

  var MAX = 8;
  var BLOCKED = { onb: 1 };

  function norm(role) {
    if (role === "JR Corporate" || role === "corporate" || role === "above_property") return "Above Property";
    if (role === "Night Audit" || role === "Night Auditor" || role === "night_audit") return "Front Desk";
    return role || "";
  }
  function featureAllows(featureOn, hotel, feature) {
    if (typeof featureOn !== "function") return true;
    return featureOn(hotel, feature) !== false;
  }
  function defaultsFor(role, hotel, featureOn) {
    role = norm(role);
    var shuttle = featureAllows(featureOn, hotel, "shuttle");
    var parking = featureAllows(featureOn, hotel, "parking");
    if (role === "Front Desk") {
      return shuttle
        ? ["shut", "recs", "parking", "notes", "meetings", "wo"]
        : ["recs", "notes", "parking", "shut", "meetings", "wo"];
    }
    if (role === "Bartender") return shuttle ? ["shut", "recs"] : ["recs"];
    if (role === "Housekeeping") return ["rooms", "myrooms", "insp", "issue"];
    if (role === "Housekeeper") return ["myrooms", "rooms", "insp", "issue"];
    if (role === "Maintenance") return ["wo", "pm", "issue"];
    if (role === "AGM" && shuttle) return ["shut", "notes", "parking", "meetings", "wo", "labor", "insp", "sleads", "check"];
    if (role === "GM" && shuttle) return ["shut", "labor", "insp", "wo", "sleads", "check"];
    if (role === "AGM") return ["notes", "labor", "insp", "wo", "sleads", "check"];
    if (role === "GM") return ["labor", "insp", "wo", "sleads", "check"];
    if (role === "Above Property") return shuttle ? ["dbrief", "shut", "crep", "hcmp", "sleads"] : ["crep", "hcmp", "sleads"];
    if (role === "Shuttle Driver") return shuttle ? ["shut", "line", "my"] : ["line", "my", "check"];
    if (parking === false && shuttle === false) return ["my", "check", "sched"];
    return ["my", "line", "check"];
  }
  function virtualOk(role, id) {
    role = norm(role);
    if (id === "dbrief") return role === "Above Property";
    if (id === "hcmp") return role === "Above Property";
    if (id === "issue") return role === "Housekeeping" || role === "Housekeeper" || role === "Maintenance";
    return false;
  }
  function pick(role, hotel, saved, allowed, featureOn) {
    var allow = {};
    (allowed || []).forEach(function (id) {
      if (id && !BLOCKED[id]) allow[id] = true;
    });
    function ok(id) {
      if (!id || BLOCKED[id]) return false;
      if (id === "dbrief" && (norm(role) === "GM" || norm(role) === "AGM")) return false;
      if (virtualOk(role, id)) return true;
      if (!allow[id]) return false;
      if (id === "shut" && !featureAllows(featureOn, hotel, "shuttle")) return false;
      if (id === "parking" && !featureAllows(featureOn, hotel, "parking")) return false;
      if (id === "meetings" && !featureAllows(featureOn, hotel, "meetings")) return false;
      return true;
    }
    var source = Array.isArray(saved) ? saved : defaultsFor(role, hotel, featureOn);
    var out = [];
    source.forEach(function (id) {
      if (out.length >= MAX || out.indexOf(id) >= 0 || !ok(id)) return;
      out.push(id);
    });
    return out;
  }
  function choices(role, hotel, allowed, featureOn) {
    var seen = {};
    var out = [];
    function add(id) {
      if (!id || seen[id] || BLOCKED[id]) return;
      if (id === "dbrief" && (norm(role) === "GM" || norm(role) === "AGM")) return;
      if (!virtualOk(role, id)) {
        if ((allowed || []).indexOf(id) < 0) return;
        if (id === "shut" && !featureAllows(featureOn, hotel, "shuttle")) return;
        if (id === "parking" && !featureAllows(featureOn, hotel, "parking")) return;
        if (id === "meetings" && !featureAllows(featureOn, hotel, "meetings")) return;
      }
      seen[id] = true;
      out.push(id);
    }
    defaultsFor(role, hotel, featureOn).forEach(add);
    (allowed || []).forEach(add);
    return out;
  }

  var LABELS = {
    notes: ["Shift Notes", "Notas de turno"],
    parking: ["Park & Fly", "Estaciona y vuela"],
    shut: ["Shuttle", "Shuttle"],
    recs: ["Local Tips", "Tips locales"],
    meetings: ["Meeting Rooms", "Salones"],
    wo: ["Work Order", "Orden de trabajo"],
    rooms: ["Room Status", "Estado de cuartos"],
    myrooms: ["My Rooms", "Mis cuartos"],
    insp: ["Inspections", "Inspecciones"],
    issue: ["Report Issue", "Reportar falla"],
    pm: ["Preventive Maintenance", "Mantenimiento preventivo"],
    labor: ["Labor", "Labor"],
    slead: ["Leads", "Prospectos"],
    sleads: ["Leads", "Prospectos"],
    check: ["Checklists", "Listas"],
    gmc: ["Checklists", "Listas"],
    dbrief: ["Daily Briefing", "Resumen diario"],
    pts: ["Points & Rewards", "Puntos y premios"],
    qotd: ["Question of the Day", "Pregunta del Día"],
    crep: ["Reports", "Reportes"],
    hcmp: ["Hotel Comparison", "Comparación de hoteles"],
    fc: ["Forecast", "Pronóstico"]
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function langNow(lang) {
    if (lang === "es" || lang === "en") return lang;
    return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en";
  }
  function labelOf(id, lang) {
    var pair = LABELS[id];
    if (pair) return langNow(lang) === "es" ? pair[1] : pair[0];
    if (root.HHQMore && HHQMore.label) return HHQMore.label(id, lang);
    return id;
  }
  function accentOf(id, role) {
    role = norm(role);
    if (id === "issue" && role === "Maintenance") return "#92400e";
    if (id === "issue") return "#0f766e";
    if (id === "dbrief" || id === "hcmp" || id === "crep") return "#334155";
    var groups = (root.HHQMore && HHQMore.GROUPS) || [];
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].ids.indexOf(id) >= 0) return groups[i].accent;
    }
    return "#334155";
  }
  function iconOf(id) {
    if (root.HHQMore && HHQMore.iconSvg) return HHQMore.iconSvg(id);
    return "";
  }
  function safe(id) {
    return /^[a-z][a-z0-9_]{0,40}$/.test(String(id || "")) ? String(id) : "";
  }
  function tileButton(id, role, lang) {
    id = safe(id);
    if (!id) return "";
    var accent = /^#[0-9a-f]{6}$/i.test(accentOf(id, role)) ? accentOf(id, role) : "#334155";
    var click = id === "issue"
      ? "if(window.HQFold)HQFold.open('work_order','');else if(window.uxSheet)uxSheet('wo')"
      : "go('" + id + "')";
    var badge = "";
    if (id === "notes" && root.HHQNotes && HHQNotes.unreadCount) {
      var n = HHQNotes.unreadCount();
      if (n > 0) badge = '<span class="qt-badge" aria-label="' + n + '">' + n + "</span>";
    }
    return '<button type="button" class="more-tile qt-tile" data-id="' + id + '" style="--more-accent:' + accent + '" onclick="' + click + '"><span class="more-ic" aria-hidden="true">' + iconOf(id) + badge + '</span><span class="more-lb">' + esc(labelOf(id, lang)) + "</span></button>";
  }

  var api = {
    MAX: MAX,
    defaultsFor: defaultsFor,
    pick: pick,
    choices: choices,
    labelOf: labelOf,
    tileButton: tileButton
  };
  root.HHQTiles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function roleNow() {
    try { return norm(authRole() || S.role || ""); } catch (e) { return ""; }
  }
  function hotelNow() {
    try {
      var u = meUser();
      if (u && u.hotel) return u.hotel;
    } catch (e) {}
    try { return S.hotel || ""; } catch (e2) { return ""; }
  }
  function featureOn(hotel, feature) {
    try {
      if (root.HotelFeatures && HotelFeatures.on) return HotelFeatures.on(hotel, feature) !== false;
    } catch (e) {}
    if (feature === "shuttle" && hotel !== "MSPAM" && hotel !== "MSPMS") return false;
    if (feature === "parking" && hotel === "MSPWE") return false;
    return true;
  }
  function allowedNow() {
    var role = roleNow();
    var view = role === "AGM" || role === "Above Property" || role === "GM" ? "GM" : role;
    var ids = [];
    try { ids = typeof tilesFor === "function" ? tilesFor(view) || [] : []; } catch (e) { ids = []; }
    return ids;
  }
  function savedNow() {
    try {
      var u = meUser();
      if (!u) return null;
      if (typeof homeTilesOf === "function") return homeTilesOf(u);
      if (Array.isArray(u.home_tiles) || u.home_tiles === null) return u.home_tiles;
    } catch (e2) {}
    return null;
  }
  function currentIds() {
    return pick(roleNow(), hotelNow(), savedNow(), allowedNow(), featureOn);
  }
  function homeHtml() {
    var ids = currentIds();
    if (!ids.length) return "";
    var lang = langNow();
    var role = roleNow();
    var link = lang === "es" ? "Personalizar" : "Customize";
    var title = lang === "es" ? "Accesos rápidos" : "Quick tiles";
    return '<div class="hhq-actions qt-row" id="hhqActions"><div class="qt-head"><h3>' + esc(title) + '</h3><button type="button" class="qt-link" onclick="go(\'settings\')">' + esc(link) + '</button></div><div class="qt-grid">' +
      ids.map(function (id) { return tileButton(id, role, lang); }).join("") + "</div></div>";
  }
  function toggle(id, on) {
    id = safe(id);
    if (!id || BLOCKED[id]) return;
    var role = roleNow();
    var hotel = hotelNow();
    var allowed = allowedNow();
    var now = currentIds().slice();
    var i = now.indexOf(id);
    if (on) {
      if (i >= 0 || now.length >= MAX) return;
      if (choices(role, hotel, allowed, featureOn).indexOf(id) < 0) return;
      now.push(id);
    } else if (i >= 0) now.splice(i, 1);
    if (typeof setHomeTiles === "function") setHomeTiles(now);
  }
  function reset() {
    if (typeof setHomeTiles === "function") setHomeTiles(null);
  }
  function settingHtml(lang) {
    lang = langNow(lang);
    var role = roleNow();
    var hotel = hotelNow();
    var allowed = allowedNow();
    var picked = {};
    currentIds().forEach(function (id) { picked[id] = true; });
    var es = lang === "es";
    var rows = choices(role, hotel, allowed, featureOn).map(function (id) {
      var on = !!picked[id];
      var full = !on && currentIds().length >= MAX;
      return '<label class="qt-choice"><input type="checkbox"' + (on ? " checked" : "") + (full ? " disabled" : "") + ' onchange="HHQTiles.toggle(\'' + id + '\', this.checked)"><span>' + esc(labelOf(id, lang)) + "</span></label>";
    }).join("");
    return '<section class="qt-set" id="qtSet"><h3>' + esc(es ? "Accesos rápidos" : "Quick tiles") + "</h3><p>" +
      esc(es ? "Elige hasta 8. Vacío usa los accesos de tu puesto." : "Pin up to 8. Empty uses your role defaults.") + "</p>" +
      rows + '<button type="button" class="btn2" onclick="HHQTiles.reset()">' + esc(es ? "Usar los predeterminados" : "Use role defaults") + "</button></section>";
  }
  api.homeHtml = homeHtml;
  api.settingHtml = settingHtml;
  api.toggle = toggle;
  api.reset = reset;
  api.currentIds = currentIds;

  function compareHtml() {
    var lang = langNow();
    if (roleNow() !== "Above Property") {
      return "<div class=\"raw\"><h2>" + esc(labelOf("hcmp", lang)) + "</h2><p>" + esc(lang === "es" ? "Solo corporativo ve la comparación." : "Hotel comparison is for corporate.") + "</p></div>";
    }
    var codes = ["MSPWE", "MSPAM", "MSPMS"];
    var rows = codes.map(function (code) {
      var data = {};
      try { data = (S.h && S.h[code]) || {}; } catch (e) { data = {}; }
      var fc = (data.fc && data.fc[0]) || {};
      var occ = fc.occ != null && fc.occ !== "" ? String(fc.occ) + "%" : "";
      var arr = fc.arr != null && fc.arr !== "" ? String(fc.arr) : "";
      var open = Array.isArray(data.wo) ? String(data.wo.filter(function (w) { return w && w.s !== "Done"; }).length) : "";
      return { code: code, occ: occ, arr: arr, open: open };
    }).filter(function (row) { return row.occ || row.arr || row.open; });
    var head = "<tr><th>" + esc(lang === "es" ? "Hotel" : "Hotel") + "</th>";
    if (rows.some(function (r) { return r.occ; })) head += "<th>" + esc(lang === "es" ? "Ocupación" : "Occupancy") + "</th>";
    if (rows.some(function (r) { return r.arr; })) head += "<th>" + esc(lang === "es" ? "Llegadas" : "Arrivals") + "</th>";
    if (rows.some(function (r) { return r.open; })) head += "<th>" + esc(lang === "es" ? "Órdenes" : "Open WOs") + "</th>";
    head += "</tr>";
    var body = rows.map(function (row) {
      var cells = "<td><b>" + esc(row.code) + "</b></td>";
      if (rows.some(function (r) { return r.occ; })) cells += "<td>" + esc(row.occ || "—") + "</td>";
      if (rows.some(function (r) { return r.arr; })) cells += "<td>" + esc(row.arr || "—") + "</td>";
      if (rows.some(function (r) { return r.open; })) cells += "<td>" + esc(row.open || "—") + "</td>";
      return "<tr>" + cells + "</tr>";
    }).join("");
    var table = rows.length ? "<table class=\"hhq-cmp\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table>" : "<p>" + esc(lang === "es" ? "No hay cifras para comparar." : "No figures to compare.") + "</p>";
    return "<div class=\"raw\" id=\"hcmpRoot\"><h2>" + esc(labelOf("hcmp", lang)) + "</h2>" + table + "</div>";
  }
  if (typeof M !== "undefined") M.hcmp = ["📊", "Hotel Comparison"];
  if (typeof V !== "undefined") V.hcmp = compareHtml;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var who = roleNow();
      if (who === "Above Property" && role === "GM" && list.indexOf("hcmp") < 0) list.push("hcmp");
      return list;
    };
  }

  if (typeof V !== "undefined" && V.settings) {
    var prevSettings = V.settings;
    V.settings = function () {
      return String(prevSettings.apply(this, arguments) || "") + settingHtml();
    };
  }
  if (typeof TILES !== "undefined") {
    var barTiles = TILES.Bartender || ["sched", "my", "recs", "shut"];
    ["recs", "shut", "sched", "my"].forEach(function (id) {
      if (barTiles.indexOf(id) < 0) barTiles.push(id);
    });
    TILES.Bartender = barTiles;
  }
  if (typeof NAV !== "undefined" && !NAV.Bartender) NAV.Bartender = ["home", "my", "sched"];
  if (typeof M !== "undefined") {
    M.dbrief = M.dbrief || ["☀️", "Daily Briefing"];
    M.hcmp = M.hcmp || ["📊", "Hotel Comparison"];
    M.issue = M.issue || ["⚠️", "Report Issue"];
  }
  if (typeof I18N !== "undefined" && I18N.es) {
    I18N.es["Daily Briefing"] = "Resumen diario";
    I18N.es["Hotel Comparison"] = "Comparación de hoteles";
    I18N.es["Report Issue"] = "Reportar falla";
    I18N.es["Local Tips"] = "Tips locales";
    I18N.es.Bartender = "Cantinero";
    I18N.es["Quick tiles"] = "Accesos rápidos";
    I18N.es.Customize = "Personalizar";
    I18N.es["Park & Fly"] = "Estaciona y vuela";
    I18N.es["Meeting Rooms"] = "Salones";
    I18N.es["Room Status"] = "Estado de cuartos";
    I18N.es.Inspections = "Inspecciones";
    I18N.es.Reports = "Reportes";
    I18N.es.Leads = "Prospectos";
  }

  var css = document.createElement("style");
  css.textContent = [
    ".qt-row{display:block}",
    ".qt-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px}",
    ".qt-head h3{margin:0;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#5c6570}",
    ".qt-link{background:#eef1fd;color:#3b5bdb;border:0;border-radius:10px;min-height:36px;font-weight:750;padding:0 12px}",
    "#hhqActions.qt-row{display:block}",
    "#hhqActions .qt-tile{display:inline-flex}",
    "#hhqActions .more-tile{width:auto}",
    ".qt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
    "#hhqActions .more-tile{width:100%;aspect-ratio:auto;min-height:108px;height:auto}",
    "#hhqActions .more-lb{display:block;-webkit-line-clamp:unset;overflow:visible;min-height:0;white-space:normal;overflow-wrap:break-word}",
    "#hhqActions .qt-grid,.hhq-actions.qt-row .qt-grid{display:grid}",
    ".qt-set{margin-top:16px}",
    ".qt-choice{display:flex;align-items:center;gap:10px;min-height:48px;font-weight:700}",
    ".qt-choice input{width:22px;height:22px;min-height:22px}",
    "@media(min-width:1024px){#hhqActions .qt-grid{grid-template-columns:repeat(auto-fit,minmax(168px,1fr))}}"
  ].join("");
  document.head.appendChild(css);

  var gridCss = document.createElement("style");
  gridCss.textContent = "#hhqActions.qt-row{display:block}#hhqActions .qt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#hhqActions .more-lb{overflow:visible}@media(min-width:1024px){#uxHero.hhq-home>.hhq-actions.qt-row{grid-template-columns:unset}#hhqActions .qt-grid{grid-template-columns:repeat(auto-fit,minmax(168px,1fr))}}";
  document.head.appendChild(gridCss);
})(typeof window !== "undefined" ? window : globalThis);
