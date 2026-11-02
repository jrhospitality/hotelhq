/* HotelHQ PIN rules shared by the page and tools/auth-pin.test.js.
   Demo mode never calls Supabase. Live mode uses a publishable key from config.js only. */
(function (root) {
  const PLACEHOLDER = /paste|replace|your_key|placeholder|todo|changeme/i;
  const RETIRED = {
    "1001": 1, "1002": 1, "1003": 1
  };
  const LEAD = { "Above Property": 1, GM: 1, AGM: 1 };

  function isLiveKey(key) {
    const k = String(key || "").trim();
    if (k.length < 20 || PLACEHOLDER.test(k)) return false;
    if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(k)) return true;
    return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(k);
  }

  function isPin(pin) {
    return /^\d{4,6}$/.test(String(pin || ""));
  }

  function pinRejected(pin) {
    const p = String(pin || "");
    if (!isPin(p)) return "length";
    if (RETIRED[p]) return "retired";
    if (/^(\d)\1+$/.test(p)) return "trivial";
    if (p === "1234" || p === "12345" || p === "123456" || p === "4321" || p === "654321") return "trivial";
    return "";
  }

  function canResetPin(actor, target) {
    if (!actor || !target) return false;
    const actorId = String(actor.user_id || actor.id || "");
    const targetId = String(target.user_id || target.id || "");
    if (!actorId || !targetId || actorId === targetId) return false;
    if (actor.role === "Above Property") return true;
    if (actor.role !== "GM" && actor.role !== "AGM") return false;
    if (!actor.hotel || !target.hotel || actor.hotel !== target.hotel) return false;
    if (LEAD[target.role]) return false;
    return true;
  }

  function allowsNetwork(mode) {
    return mode === "live";
  }

  function listedForSite(user, site, mode) {
    if (!user || user.active === false) return false;
    const corporate = user.hotel == null || user.hotel === "";
    if (site === "CORP") return corporate;
    const extras = Array.isArray(user.extra_hotels) ? user.extra_hotels : [];
    const here = user.hotel === site || extras.indexOf(site) >= 0;
    if (mode === "live" && corporate) return true;
    return !!here;
  }

  const api = { isLiveKey, isPin, pinRejected, canResetPin, allowsNetwork, listedForSite, RETIRED };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HQAuth = api;
})(typeof window !== "undefined" ? window : globalThis);
