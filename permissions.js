/* One role -> capability map for HotelHQ.
   Other screens should call HHQ.can(role, capability) instead of listing role names.
   Closed-over checks (parking.js, winter.js, guest-scores.js, labor plan) can adopt
   the same call and keep their local list only as a fallback when this file is absent.
   Client-side only until real sign-in is on. */
(function (root) {
  "use strict";

  var ALIAS = {
    "JR Corporate": "Above Property",
    corporate: "Above Property",
    above_property: "Above Property",
    hk_lead: "Housekeeping",
    "HK Lead": "Housekeeping"
  };

  var CAPS = {
    "see.allHotels": ["Above Property"],
    "leader.viewAs": ["Above Property", "GM", "AGM"],
    "gamify.off": ["Above Property"],
    "hk.priority": ["Housekeeping", "GM", "AGM", "Above Property"],
    "equip.edit": ["Maintenance", "GM", "AGM", "Above Property"],
    "pm.manage": ["Maintenance", "GM", "AGM", "Above Property"],
    "reports.see": ["GM", "AGM", "Above Property", "Housekeeping", "Maintenance"],
    "sched.publish": ["Above Property", "GM", "AGM"],
    "sched.hk": ["Housekeeping"],
    "board.hk": ["Housekeeping", "GM", "AGM", "Above Property"],
    "care.lead": ["GM", "AGM", "Above Property"],
    "comp.log": ["GM", "AGM", "Front Desk"],
    "gi.log": ["GM", "AGM", "Front Desk"],
    "gi.work": ["GM", "AGM", "Front Desk", "Housekeeping", "Housekeeper", "Maintenance", "Breakfast Attendant", "House Person", "Laundry Attendant", "Shuttle Driver"],
    "lf.manage": ["GM", "AGM", "Front Desk", "Housekeeping"],
    "lf.log": ["GM", "AGM", "Front Desk", "Housekeeping", "Housekeeper", "Maintenance", "Breakfast Attendant", "House Person", "Laundry Attendant", "Shuttle Driver"],
    "rush.flag": ["GM", "AGM", "Front Desk"],
    "rush.see": ["GM", "AGM", "Front Desk", "Housekeeping"],
    "brief.edit": ["GM", "AGM"],
    "brief.see": ["GM", "AGM", "Front Desk", "Housekeeping", "Maintenance", "Above Property"],
    "notes.receipts": ["GM", "AGM", "Above Property"],
    "orders.approve": ["GM", "AGM", "Above Property"],
    "keylog": ["Front Desk", "GM", "AGM", "Above Property"],
    "onboard.manage": ["GM", "AGM", "Above Property"],
    "labor.plan": ["Above Property"],
    "labor.checkin": ["GM", "AGM", "Above Property"],
    "places.edit": ["GM", "AGM"],
    "features.edit": ["Above Property"],
    "audit.see": ["GM", "AGM", "Above Property"],
    "reports.corporate": ["GM", "AGM", "Above Property"],
    "import.quore": ["GM", "Maintenance", "Above Property"],
    "parking": ["Front Desk", "AGM", "GM", "Above Property"],
    "parking.setup": ["AGM", "GM", "Above Property"],
    "meetings": ["Front Desk", "AGM", "GM", "Above Property"],
    "shuttle.shared": ["Front Desk", "GM", "AGM", "Shuttle Driver", "Above Property", "Housekeeping"],
    "winter.check": ["GM", "AGM", "Maintenance"],
    "winter.snow": ["GM", "AGM", "Maintenance", "Front Desk"],
    "winter.dates": ["Above Property"],
    "scores.leader": ["GM", "AGM", "Above Property"],
    "training.see": ["GM", "AGM", "Above Property"],
    "inspections.manage": ["GM", "Above Property"],
    "licenses.manage": ["GM", "Above Property"],
    "fairshare.see": ["GM", "Above Property"],
    "guestchat.respond": ["Front Desk", "AGM"],
    "guestchat.count": ["GM"],
    "ar.invoice": ["GM", "AGM", "Above Property"],
    "ar.overview": ["Above Property"],
    "ar.collect": ["Front Desk"],
    "ar.resolve": ["GM", "AGM", "Above Property"],
    "ar.threshold": ["Above Property"],
    "ar.aging": ["Above Property"]
  };

  var SHUTTLE_HOTELS = ["MSPAM", "MSPMS"];
  var MENU = {
    parking: "parking",
    meet: "meetings",
    meetings: "meetings",
    beo: "meetings",
    mr: "meetings"
  };

  function norm(role) {
    var key = role == null ? "" : String(role);
    return ALIAS[key] || key;
  }
  function can(role, cap) {
    var list = CAPS[cap];
    if (!list) return false;
    return list.indexOf(norm(role)) >= 0;
  }
  function seesHotel(role, ownHotel, targetHotel) {
    if (!targetHotel) return true;
    if (can(role, "see.allHotels")) return true;
    return !!ownHotel && ownHotel === targetHotel;
  }
  function shuttleAt(hotel) {
    return SHUTTLE_HOTELS.indexOf(hotel) >= 0;
  }
  function menuCap(screenId) {
    return MENU[screenId] || "";
  }
  function schedPositions(role, hotel, positions) {
    var r = norm(role);
    if (can(r, "sched.hk")) return ["HK Lead", "Housekeeper"];
    if (!can(r, "sched.publish")) return [];
    return (positions || []).filter(function (p) {
      return p !== "Shuttle Driver" || shuttleAt(hotel);
    });
  }

  var api = {
    ALIAS: ALIAS,
    CAPS: CAPS,
    SHUTTLE_HOTELS: SHUTTLE_HOTELS,
    norm: norm,
    can: can,
    seesHotel: seesHotel,
    shuttleAt: shuttleAt,
    menuCap: menuCap,
    schedPositions: schedPositions
  };
  root.HHQ = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
