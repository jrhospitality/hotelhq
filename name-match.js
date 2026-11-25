/* Sign-in name matching for HotelHQ.
   Demo mode filters the example roster already in the page.
   Live mode uses the same rules in private.staff_sign_in_search.
   No network, no staff records, no keys. */
(function (root) {
  "use strict";

  var HOTELS = { MSPWE: 1, MSPAM: 1, MSPMS: 1, CORP: 1 };
  var MATCH_LIMIT = 8;

  function foldName(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanList(list) {
    var out = [];
    var seen = {};
    (Array.isArray(list) ? list : []).forEach(function (item) {
      var text = String(item || "").trim().replace(/\s+/g, " ");
      if (!text || text.length > 40) return;
      var key = foldName(text);
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push(text);
    });
    return out.slice(0, 6);
  }

  function partsOf(person) {
    var legal = foldName(person && person.name);
    var preferred = foldName(person && (person.preferred_name || person.preferredName));
    var aliases = cleanList(person && person.aliases).map(foldName);
    var tokens = [];
    var seen = {};
    function add(text, kind) {
      if (!text || seen[kind + ":" + text]) return;
      seen[kind + ":" + text] = 1;
      tokens.push({ text: text, kind: kind });
    }
    function split(text, kind) {
      if (!text) return;
      add(text, kind);
      text.split(" ").forEach(function (word) { add(word, kind); });
    }
    split(legal, "legal");
    split(preferred, "preferred");
    aliases.forEach(function (alias) { split(alias, "alias"); });
    return { legal: legal, preferred: preferred, tokens: tokens };
  }

  function damerau(a, b, cap) {
    if (a === b) return 0;
    var al = a.length;
    var bl = b.length;
    if (!al || !bl) return Math.max(al, bl);
    if (Math.abs(al - bl) > cap) return cap + 1;
    var matrix = [];
    var i, j;
    for (i = 0; i <= al; i++) {
      matrix[i] = new Array(bl + 1);
      matrix[i][0] = i;
    }
    for (j = 0; j <= bl; j++) matrix[0][j] = j;
    for (i = 1; i <= al; i++) {
      var rowBest = matrix[i][0];
      for (j = 1; j <= bl; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        var value = matrix[i - 1][j] + 1;
        if (matrix[i][j - 1] + 1 < value) value = matrix[i][j - 1] + 1;
        if (matrix[i - 1][j - 1] + cost < value) value = matrix[i - 1][j - 1] + cost;
        if (i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) {
          if (matrix[i - 2][j - 2] + 1 < value) value = matrix[i - 2][j - 2] + 1;
        }
        matrix[i][j] = value;
        if (value < rowBest) rowBest = value;
      }
      if (rowBest > cap) return cap + 1;
    }
    return matrix[al][bl];
  }

  function fuzzyCap(query) {
    if (query.length >= 6) return 2;
    if (query.length >= 4) return 1;
    return 0;
  }

  function wordScore(word, token) {
    if (!word || !token) return 0;
    var preferred = token.kind === "preferred" || token.kind === "alias";
    if (token.text === word) return preferred ? 420 : 400;
    if (token.text.indexOf(word) === 0) return preferred ? 320 : 300;
    if (word.length >= 2 && token.text.indexOf(word) >= 0) return 180;
    var cap = fuzzyCap(word);
    if (!cap) return 0;
    var dist = damerau(word, token.text, cap);
    if (dist <= cap) return 140 - dist * 20 + (preferred ? 10 : 0);
    return 0;
  }

  function scorePerson(person, query) {
    var q = foldName(query);
    if (!q || !person || person.active === false) return 0;
    var words = q.split(" ").filter(Boolean);
    if (!words.length) return 0;
    var parts = partsOf(person);
    if (!parts.tokens.length) return 0;
    var total = 0;
    var prefix = false;
    var i;
    for (i = 0; i < words.length; i++) {
      var best = 0;
      var hitPrefix = false;
      parts.tokens.forEach(function (token) {
        var score = wordScore(words[i], token);
        if (score > best) best = score;
        if (score >= 300) hitPrefix = true;
      });
      if (!best) return 0;
      total += best;
      if (hitPrefix) prefix = true;
    }
    if (prefix) total += 15;
    return total;
  }

  function knownHotel(hotel) {
    return !!HOTELS[String(hotel || "")];
  }

  function minQueryLength(mode) {
    return mode === "live" ? 2 : 1;
  }

  function inSignInScope(person, hotel, mode) {
    if (!person || person.active === false || !knownHotel(hotel)) return false;
    var home = person.hotel || "";
    if (hotel === "CORP") return !home;
    var extras = Array.isArray(person.extra_hotels) ? person.extra_hotels : [];
    if (home === hotel || extras.indexOf(hotel) >= 0) return true;
    return mode === "live" && !home;
  }

  function matchNames(people, query, hotel, mode) {
    var q = foldName(query);
    if (q.length < minQueryLength(mode || "demo")) return [];
    var rows = (people || []).filter(function (person) {
      return inSignInScope(person, hotel, mode || "demo");
    }).map(function (person) {
      return { person: person, score: scorePerson(person, q) };
    }).filter(function (row) { return row.score > 0; });
    rows.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var an = foldName(a.person.preferred_name || a.person.name);
      var bn = foldName(b.person.preferred_name || b.person.name);
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return rows.slice(0, MATCH_LIMIT).map(function (row) { return row.person; });
  }

  function displayName(person) {
    var preferred = String(person && person.preferred_name || "").trim();
    if (preferred) return preferred;
    return String(person && person.name || "").trim();
  }

  var api = {
    MATCH_LIMIT: MATCH_LIMIT,
    foldName: foldName,
    cleanList: cleanList,
    editDistance: function (a, b, cap) { return damerau(foldName(a), foldName(b), cap == null ? 2 : cap); },
    scorePerson: scorePerson,
    knownHotel: knownHotel,
    minQueryLength: minQueryLength,
    inSignInScope: inSignInScope,
    matchNames: matchNames,
    displayName: displayName
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.HQNames = api;
})(typeof window !== "undefined" ? window : globalThis);
