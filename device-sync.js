/* Copies device-only records into Supabase once.
   Demo mode (no live session) keeps reading and writing localStorage.
   The copy does not delete the device copy. The migration is not applied from here. */
(function (root) {
  "use strict";

  var STORES = [
    { store: "portal_state", key: "jrportal_v7" },
    { store: "labor_plan", key: "jrportal_lplan_v1" },
    { store: "training_requests", key: "jrportal_trreq_v1" },
    { store: "labor_standards", key: "jrportal_lstd_v1" },
    { store: "occ_override", key: "jrportal_occov_v1" },
    { store: "occ_calc", key: "jrportal_occcalc_v1" },
    { store: "ot_day", key: "jrportal_otday_v1" },
    { store: "ot_bonus", key: "jrportal_otbonus_v1" },
    { store: "ot_rec", key: "jrportal_otrec_v1" },
    { store: "winter", key: "jrportal_winter_v1" },
    { store: "parking_device", key: "jrportal_parking_v1" },
    { store: "qotd_custom", key: "jrqotd_custom" },
    { store: "qotd_confirmed", key: "jrqotd_confirmed" },
    { store: "qotd_important", key: "jrqotd_important" },
    { store: "qotd_freq", key: "jrqotd_freq" },
    { store: "qotd_pts", key: "jrqotd_pts" },
    { store: "qotd_retired", key: "jrqotd_retired" }
  ];

  function rowsFrom(read, hotel) {
    var out = [];
    STORES.forEach(function (spec) {
      var raw = read(spec.key);
      if (raw == null || raw === "" || raw === "null" || raw === "{}") return;
      out.push({ hotel: hotel || "MSPWE", store: spec.store, payload: raw });
    });
    return out;
  }
  function note(lang) {
    return lang === "es"
      ? "La bitácora de llaves, los cambios de horario, el plan de labor y el invierno siguen en este dispositivo. El primer inicio de sesión real los copia una vez."
      : "Key log, schedule edits, the labor plan, and winter stay on this device. The first real sign-in copies them once.";
  }

  var api = { STORES: STORES, rowsFrom: rowsFrom, note: note };
  root.HHQDevice = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var FLAG = "hhq_device_import_v1";
  function remoteOn() {
    return typeof useRemote === "function" && !!useRemote() && root.sb;
  }
  function readKey(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  api.importOnce = function () {
    if (!remoteOn()) return Promise.resolve([]);
    var flag = "";
    try { flag = localStorage.getItem(FLAG) || ""; } catch (e) { flag = ""; }
    if (flag === "1") return Promise.resolve([]);
    var hotel = typeof S !== "undefined" && S.hotel ? S.hotel : "MSPWE";
    var rows = rowsFrom(readKey, hotel);
    if (!rows.length) {
      try { localStorage.setItem(FLAG, "1"); } catch (e2) {}
      return Promise.resolve([]);
    }
    return root.sb.from("app_device_store").upsert(rows.map(function (r) {
      var payload = r.payload;
      try { payload = JSON.parse(r.payload); } catch (e) { payload = { raw: r.payload }; }
      return { hotel: r.hotel, store: r.store, payload: payload };
    }), { onConflict: "hotel,store" }).then(function () {
      try { localStorage.setItem(FLAG, "1"); } catch (e) {}
      return rows;
    }, function () { return rows; });
  };
  if (typeof V !== "undefined" && V.home) {
    var prev = V.home;
    V.home = function () {
      var html = prev.apply(this, arguments);
      if (remoteOn()) return html;
      var lang = (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en";
      return '<p class="wlnote" id="deviceNote">' + note(lang) + "</p>" + html;
    };
  }
  try { api.importOnce(); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
