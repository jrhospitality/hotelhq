/* Who can see which hotel.
   JR Corporate sees every hotel.
   Everyone else stays on the hotel assigned to their sign-in.
   The shuttle sign-up queue is the only cross-hotel exception:
   front desk and shuttle drivers at MSPAM and MSPMS see both airport hotels.
   MSPWE never sees that queue. */
(function (root) {
  "use strict";

  var PROPERTIES = ["MSPWE", "MSPAM", "MSPMS"];
  var AIRPORTS = ["MSPAM", "MSPMS"];

  function isCorporate(role) {
    return role === "Above Property" || role === "JR Corporate" || role === "above_property";
  }

  function knownHotel(hotel) {
    return PROPERTIES.indexOf(hotel) >= 0;
  }

  function assignedHotel(role, userHotel, currentHotel) {
    if (isCorporate(role)) return knownHotel(currentHotel) ? currentHotel : "MSPWE";
    return knownHotel(userHotel) ? userHotel : "";
  }

  function hotelsToLoad(role, hotel) {
    if (isCorporate(role)) return PROPERTIES.slice();
    return knownHotel(hotel) ? [hotel] : [];
  }

  function seesSharedShuttle(role, hotel) {
    if (isCorporate(role)) return true;
    if (AIRPORTS.indexOf(hotel) < 0) return false;
    return role === "Front Desk" || role === "Shuttle Driver" || role === "front_desk" || role === "shuttle_driver";
  }

  function shuttlePaxVisible(role, hotel, paxHotel) {
    if (isCorporate(role)) return true;
    if (AIRPORTS.indexOf(hotel) < 0) return false;
    if (seesSharedShuttle(role, hotel)) return !paxHotel || AIRPORTS.indexOf(paxHotel) >= 0;
    return paxHotel === hotel;
  }

  function ownShift(role, hotel, shift, driverHotel) {
    if (!shift) return false;
    if (isCorporate(role)) return true;
    if (shift.scope && shift.scope !== "SHUTTLE" && shift.scope !== hotel) return false;
    if (shift.scope === "SHUTTLE" || shift.pos === "Shuttle Driver") {
      if (!shift.who) return AIRPORTS.indexOf(hotel) >= 0;
      return driverHotel === hotel;
    }
    return !shift.scope || shift.scope === hotel;
  }

  var api = {
    PROPERTIES: PROPERTIES,
    AIRPORTS: AIRPORTS,
    isCorporate: isCorporate,
    assignedHotel: assignedHotel,
    hotelsToLoad: hotelsToLoad,
    seesSharedShuttle: seesSharedShuttle,
    shuttlePaxVisible: shuttlePaxVisible,
    ownShift: ownShift
  };
  root.HotelScope = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
