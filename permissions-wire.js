/* Points the named checks at HHQ. Load after every screen script. */
(function (root) {
  "use strict";
  var H = root.HHQ;
  if (!H || typeof document === "undefined") return;

  function role() {
    try { return authRole(); } catch (e) { return ""; }
  }
  function put(name, fn) {
    if (typeof root[name] === "function") root[name] = fn;
  }

  put("leader", function () { return H.can(role(), "leader.viewAs"); });
  put("gamifyOff", function () { return H.can(role(), "gamify.off"); });
  put("canSetHkPriority", function () { return H.can(role(), "hk.priority"); });
  put("canEditEquip", function () { return H.can(role(), "equip.edit"); });
  put("canManagePm", function () { return H.can(role(), "pm.manage"); });
  put("canSeeReports", function () { return H.can(role(), "reports.see"); });
  put("canPublish", function () { return H.can(role(), "sched.publish"); });
  put("canBoard", function () { return H.can(role(), "board.hk"); });
  put("careLead", function () { return H.can(role(), "care.lead"); });
  put("compCanLog", function () { return H.can(role(), "comp.log"); });
  put("giCanLog", function () { return H.can(role(), "gi.log"); });
  put("giCanWork", function () { return H.can(role(), "gi.work"); });
  put("lfCanManage", function () { return H.can(role(), "lf.manage"); });
  put("lfCanLog", function () { return H.can(role(), "lf.log"); });
  put("rushCanFlag", function () { return H.can(role(), "rush.flag"); });
  put("brCanEdit", function () { return H.can(role(), "brief.edit"); });
  put("nrCanSee", function () { return H.can(role(), "notes.receipts"); });
  put("canEditSched", function () { return H.schedPositions(role(), S.hotel, typeof POS !== "undefined" ? POS : []).length > 0; });
  put("schedPos", function () { return H.schedPositions(role(), S.hotel, typeof POS !== "undefined" ? POS : []); });

  if (typeof root.setHotel === "function") {
    var prevHotel = root.setHotel;
    root.setHotel = function (k) {
      if (!H.can(role(), "see.allHotels") || typeof HOTELS === "undefined" || !HOTELS[k]) return;
      return prevHotel(k);
    };
  }
  if (typeof root.enforceAccess === "function") {
    var prevAccess = root.enforceAccess;
    root.enforceAccess = function () {
      prevAccess();
      var u = typeof meUser === "function" ? meUser() : null;
      if (u && !H.can(u.role, "see.allHotels") && u.hotel) S.hotel = u.hotel;
    };
  }
  if (typeof root.alertForMe === "function") {
    var prevAlert = root.alertForMe;
    root.alertForMe = function (a) {
      var own = "";
      try { own = (meUser() && meUser().hotel) || S.hotel; } catch (e) { own = ""; }
      if (a && a.hotel && !H.seesHotel(role(), own, a.hotel)) return false;
      return prevAlert(a);
    };
  }
  if (typeof root.tilesFor === "function") {
    var prevTiles = root.tilesFor;
    root.tilesFor = function (r) {
      return (prevTiles(r) || []).filter(function (id) {
        var cap = H.menuCap(id);
        if (cap && !H.can(r, cap)) return false;
        if (id === "shut" && !H.shuttleAt(S.hotel)) return false;
        return true;
      });
    };
  }
  if (typeof root.navFor === "function") {
    var prevNav = root.navFor;
    root.navFor = function (r) {
      return (prevNav(r) || []).filter(function (id) {
        var cap = H.menuCap(id);
        if (cap && !H.can(r, cap)) return false;
        if (id === "shut" && !H.shuttleAt(S.hotel)) return false;
        return true;
      });
    };
  }
  if (typeof root.render === "function") {
    var prevRender = root.render;
    root.render = function () {
      var out = prevRender.apply(this, arguments);
      try {
        var hotel = document.getElementById("hotel");
        if (hotel && !H.can(role(), "see.allHotels")) {
          hotel.hidden = true;
          hotel.innerHTML = "";
        }
      } catch (e) {}
      return out;
    };
  }
  try { if (typeof meUser === "function" && meUser()) root.render(); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
