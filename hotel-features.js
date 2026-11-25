/* Per-hotel module switches. JR Corporate edits them under Settings.
   A module appears in that list only after its own file calls HotelFeatures.register.
   Parking and guest scores register themselves. Sales leads and greetings do not,
   until those features are on this page.
   A missing row stays on. Parking at MSPWE starts off.
   Other code reads HotelFeatures.on(hotel, id). */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var registered = [];

  function known(feature) {
    for (var i = 0; i < registered.length; i++) if (registered[i].id === feature) return registered[i];
    return null;
  }
  function register(spec) {
    if (!spec || !/^[a-z][a-z0-9_]{0,40}$/.test(spec.id || "")) return;
    var row = known(spec.id);
    var next = {
      id: spec.id,
      en: spec.en || spec.id,
      es: spec.es || spec.en || spec.id,
      order: spec.order == null ? 100 : spec.order
    };
    if (row) {
      row.en = next.en;
      row.es = next.es;
      row.order = next.order;
    } else registered.push(next);
    registered.sort(function (a, b) { return a.order - b.order || a.en.localeCompare(b.en); });
  }
  function list() {
    return registered.map(function (f) { return { id: f.id, en: f.en, es: f.es }; });
  }
  function defaultOn(hotel, feature) {
    if (HOTELS.indexOf(hotel) < 0) return false;
    if (feature === "parking" && hotel === "MSPWE") return false;
    if (feature === "shuttle" && hotel === "MSPWE") return false;
    return true;
  }
  function key(hotel, feature) { return hotel + "|" + feature; }

  var api = {
    HOTELS: HOTELS,
    register: register,
    list: list,
    defaultOn: defaultOn,
    on: defaultOn,
    sectionHtml: sectionHtml
  };
  root.HotelFeatures = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  (root.HF_QUEUE || []).forEach(register);
  root.HF_QUEUE = [];

  var KEY = "jrportal_hotel_features_v1";
  var remote = null;
  var remoteState = "";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function labelOf(feature) { return L(feature.en, feature.es); }
  function corporate() {
    var role = "";
    try { role = authRole(); } catch (e) { role = ""; }
    return role === "Above Property" || role === "JR Corporate";
  }
  function remoteOn() {
    return typeof useRemote === "function" && !!useRemote() && typeof sb !== "undefined" && sb;
  }
  function readBag() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1 || !data.rows) return {};
      return data.rows;
    } catch (e) { return {}; }
  }
  function writeBag(rows) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, rows: rows })); } catch (e) {}
  }
  function ensureRemote() {
    if (!remoteOn() || remoteState === "loading" || remoteState === "ready") return;
    remoteState = "loading";
    sb.from("hotel_features").select("hotel,feature,enabled").then(function (res) {
      remote = {};
      if (!res.error) (res.data || []).forEach(function (row) { remote[key(row.hotel, row.feature)] = !!row.enabled; });
      remoteState = "ready";
      if (typeof render === "function") render();
    }, function () { remoteState = "ready"; remote = {}; });
  }
  function on(hotel, feature) {
    if (remoteOn()) ensureRemote();
    var id = key(hotel, feature);
    if (remoteOn() && remote && Object.prototype.hasOwnProperty.call(remote, id)) return !!remote[id];
    if (!remoteOn()) {
      var bag = readBag();
      if (Object.prototype.hasOwnProperty.call(bag, id)) return !!bag[id];
    }
    return defaultOn(hotel, feature);
  }
  api.on = on;
  function setOn(hotel, feature, enabled) {
    if (!corporate() || !known(feature) || HOTELS.indexOf(hotel) < 0) return;
    enabled = !!enabled;
    if (remoteOn()) {
      sb.rpc("set_hotel_feature", { p_hotel: hotel, p_feature: feature, p_enabled: enabled }).then(function () {
        remote = remote || {};
        remote[key(hotel, feature)] = enabled;
        if (feature === "parking" && root.Parking && root.Parking.noteModule) root.Parking.noteModule(hotel, enabled);
        if (typeof render === "function") render();
      });
      return;
    }
    var bag = readBag();
    bag[key(hotel, feature)] = enabled;
    writeBag(bag);
    if (feature === "parking" && root.Parking && root.Parking.noteModule) root.Parking.noteModule(hotel, enabled);
    if (typeof render === "function") render();
  }
  root.hfSet = function (hotel, feature, enabled) { setOn(hotel, feature, enabled); };

  function sectionHtml(lang) {
    var features = list();
    if (!features.length) return "";
    var es = lang === "es";
    function t(en, sp) { return es ? sp : en; }
    var head = HOTELS.map(function (hotel) { return "<th scope=\"col\">" + esc(hotel) + "</th>"; }).join("");
    var body = features.map(function (feature) {
      var cells = HOTELS.map(function (hotel) {
        var checked = api.on(hotel, feature.id) ? " checked" : "";
        var name = (es ? feature.es : feature.en) + ", " + hotel;
        return "<td><input type=\"checkbox\" aria-label=\"" + esc(name) + "\"" + checked + " onchange=\"hfSet('" + hotel + "','" + feature.id + "',this.checked)\"></td>";
      }).join("");
      return "<tr><th scope=\"row\">" + esc(es ? feature.es : feature.en) + "</th>" + cells + "</tr>";
    }).join("");
    return "<section class=\"hf\" id=\"hfCard\"><h3>" + esc(t("Hotel Features", "Módulos del hotel")) + "</h3><p class=\"hf-note\">" +
      esc(t("Turn a module off for one hotel. Staff there no longer see it.", "Apaga un módulo en un hotel. El personal de ahí ya no lo ve.")) + "</p>" +
      "<table class=\"hf-t\"><thead><tr><th scope=\"col\">" + esc(t("Module", "Módulo")) + "</th>" + head + "</tr></thead><tbody>" + body + "</tbody></table></section>";
  }
  api.sectionHtml = sectionHtml;

  function pageHtml() {
    var lang = (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en";
    var pref = (root.HHQMore && root.HHQMore.settingHtml) ? root.HHQMore.settingHtml(lang) : "";
    var features = corporate() ? sectionHtml(lang) : "";
    return "<div class=\"raw hf\" id=\"hfSettings\"><h2>" + esc(L("Settings", "Ajustes")) + "</h2>" + pref + features + "</div>";
  }

  if (typeof M !== "undefined") M.settings = ["⚙️", "Settings"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Settings = "Ajustes";
  if (typeof V !== "undefined") V.settings = pageHtml;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      if (list.indexOf("settings") < 0) list.push("settings");
      return list;
    };
  }
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("settings") < 0) NOCOLS.push("settings"); } catch (e2) {}

  var style = document.createElement("style");
  style.textContent = [
    ".hf-note{font-size:13px;color:#3c4658;margin:0 0 8px}",
    ".hf-t{width:100%;border-collapse:collapse;font-size:14px}",
    ".hf-t th,.hf-t td{padding:8px 4px;border-bottom:1px solid #e6ebf2;text-align:center;vertical-align:middle}",
    ".hf-t th:first-child,.hf-t td:first-child{text-align:left}",
    ".hf-t input{width:22px;height:22px;min-height:0}"
  ].join("");
  document.head.appendChild(style);
  try { if (typeof meUser === "function" && meUser() && typeof render === "function") render(); } catch (e3) {}
})(typeof window !== "undefined" ? window : globalThis);
