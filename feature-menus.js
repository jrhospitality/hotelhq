/* Menus follow hotel_features. A screen stays hidden when its switch is off.
   Parking and meeting rooms stay limited to front desk, AGM, GM, and corporate.
   The shared shuttle stays on MSPAM and MSPMS only, and only while its switch is on.
   Screens register with HotelFeatures so corporate can flip the switch in Settings. */
(function (root) {
  "use strict";

  var SCREEN = {
    shut: "shuttle",
    parking: "parking",
    gscores: "guest_scores",
    winter: "winter",
    meet: "meetings",
    meetings: "meetings",
    beo: "meetings",
    mr: "meetings",
    naudit: "night_audit",
    gcomm: "guest_comments",
    train: "training",
    inspx: "inspections",
    ifix: "inspections",
    permits: "licenses",
    fshare: "fair_share",
    gchat: "guest_messages"
  };
  var DESK = ["Front Desk", "AGM", "GM", "Above Property", "JR Corporate"];
  var AUDIT = ["GM", "AGM", "Above Property"];
  var COMMENTS = ["GM", "AGM", "Above Property", "Housekeeping", "Housekeeper"];
  var TRAIN = ["GM", "AGM", "Above Property", "JR Corporate"];
  var DOCS = ["GM", "Above Property", "JR Corporate"];
  var FAIR = ["GM", "Above Property"];
  var CHAT = ["Front Desk", "AGM"];
  var SHUTTLE = ["MSPAM", "MSPMS"];

  function norm(role) {
    if (root.HHQ && root.HHQ.norm) return root.HHQ.norm(role);
    if (role === "JR Corporate") return "Above Property";
    return role || "";
  }
  function menuAllows(id, role, hotel, featureOn) {
    var feature = SCREEN[id];
    if (!feature) return true;
    role = norm(role);
    if (feature === "shuttle") {
      if (SHUTTLE.indexOf(hotel) < 0) return false;
    }
    if (feature === "parking" || feature === "meetings") {
      if (DESK.indexOf(role) < 0) return false;
    }
    if (feature === "night_audit" && AUDIT.indexOf(role) < 0) return false;
    if (feature === "guest_comments" && COMMENTS.indexOf(role) < 0) return false;
    if (id === "ifix") {
      if (DOCS.indexOf(role) >= 0) return false;
      if (typeof featureOn === "function" && featureOn(hotel, "inspections") === false) return false;
      return true;
    }
    if (feature === "training" && TRAIN.indexOf(role) < 0) return false;
    if ((feature === "inspections" || feature === "licenses") && DOCS.indexOf(role) < 0) return false;
    if (feature === "fair_share" && FAIR.indexOf(role) < 0) return false;
    if (feature === "guest_messages" && CHAT.indexOf(role) < 0) return false;
    if (typeof featureOn === "function" && featureOn(hotel, feature) === false) return false;
    return true;
  }
  function filterIds(ids, role, hotel, featureOn) {
    return (ids || []).filter(function (id) { return menuAllows(id, role, hotel, featureOn); });
  }

  var api = { SCREEN: SCREEN, menuAllows: menuAllows, filterIds: filterIds };
  root.HHQMenus = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var specs = [
    { id: "shuttle", en: "Shuttle", es: "Shuttle", order: 30 },
    { id: "meetings", en: "Meeting rooms", es: "Salones", order: 40 },
    { id: "winter", en: "Winter preparedness", es: "Preparación de invierno", order: 50 }
  ];
  specs.forEach(function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  });

  function featureOn(hotel, feature) {
    if (feature === "shuttle" && SHUTTLE.indexOf(hotel) < 0) return false;
    if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, feature);
    if (feature === "parking" && hotel === "MSPWE") return false;
    return true;
  }
  if (root.HotelFeatures && root.HotelFeatures.on) {
    var prevOn = root.HotelFeatures.on;
    root.HotelFeatures.on = function (hotel, feature) {
      if (feature === "shuttle" && SHUTTLE.indexOf(hotel) < 0) return false;
      return prevOn(hotel, feature);
    };
  }
  function hotel() {
    try { return S.hotel; } catch (e) { return ""; }
  }
  if (typeof root.tilesFor === "function") {
    var prevTiles = root.tilesFor;
    root.tilesFor = function (role) {
      return filterIds(prevTiles(role) || [], role, hotel(), featureOn);
    };
  }
  if (typeof root.navFor === "function") {
    var prevNav = root.navFor;
    root.navFor = function (role) {
      return filterIds(prevNav(role) || [], role, hotel(), featureOn);
    };
  }
  try { if (typeof meUser === "function" && meUser() && typeof render === "function") render(); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
