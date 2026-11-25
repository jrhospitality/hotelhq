/* HotelKey guest requests on the Front Desk, GM, and AGM home.
   Demo rows are EXAMPLE lines. Do not put a real remark, confirmation,
   or guest name in this file. Live mode reads hotelkey_reservation_requests.
   A content change needs a new acknowledgment. Rows are not deleted. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var TZ = "America/Chicago";
  var KINDS = ["preference", "remarks", "stay_remarks", "billing_remarks", "housekeeping_remarks", "booking_remarks"];
  var CATEGORIES = ["", "STAY", "HOUSEKEEPING", "ROOM", "DIETARY"];
  var KIND_LABEL = {
    preference: ["Preference", "Preferencia"],
    remarks: ["Remarks", "Observaciones"],
    stay_remarks: ["Stay remarks", "Observaciones de la estancia"],
    billing_remarks: ["Billing remarks", "Observaciones de cobro"],
    housekeeping_remarks: ["Housekeeping remarks", "Observaciones de ama de llaves"],
    booking_remarks: ["Booking remarks", "Observaciones de la reserva"]
  };
  var CATEGORY_LABEL = {
    STAY: ["Stay", "Estancia"],
    HOUSEKEEPING: ["Housekeeping", "Ama de llaves"],
    ROOM: ["Room", "Habitación"],
    DIETARY: ["Dietary", "Dieta"]
  };
  var HOME_ROLES = {
    "Front Desk": 1, front_desk: 1,
    GM: 1, gm: 1,
    AGM: 1, agm: 1,
    "Above Property": 1, above_property: 1, "JR Corporate": 1, corporate: 1
  };
  var ACK_ROLES = HOME_ROLES;
  var sessionAcks = {};
  var liveHotel = "";
  var liveState = "";
  var liveLines = [];
  var liveAcks = [];
  var liveMessage = "";

  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function trim(value) { return String(value == null ? "" : value).replace(/^\s+|\s+$/g, ""); }
  function clip(value, max) {
    var text = trim(value);
    return text.length > max ? text.slice(0, max) : text;
  }
  function isCorporate(role) {
    return role === "Above Property" || role === "above_property" || role === "JR Corporate" || role === "corporate";
  }
  function canSeeHome(role) { return !!HOME_ROLES[role]; }
  function canAcknowledge(role) { return !!ACK_ROLES[role]; }
  function hotelOk(hotel) { return HOTELS.indexOf(hotel) >= 0; }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function todayIso(now) {
    var date = now instanceof Date ? now : new Date(now || Date.now());
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
      }).format(date);
    } catch (e) {
      return date.toISOString().slice(0, 10);
    }
  }
  function addDays(iso, days) {
    var p = String(iso || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function utf8(str) {
    var out = [];
    var i = 0;
    for (i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var u = ((c & 0x3ff) << 10) + (str.charCodeAt(++i) & 0x3ff) + 0x10000;
        out.push(0xf0 | (u >> 18), 0x80 | ((u >> 12) & 0x3f), 0x80 | ((u >> 6) & 0x3f), 0x80 | (u & 0x3f));
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
  }
  function rotr(n, x) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
  function sha256hex(str) {
    var bytes = utf8(String(str));
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    var hi = Math.floor(bitLen / 0x100000000);
    var lo = bitLen >>> 0;
    var s = 0;
    for (s = 3; s >= 0; s--) bytes.push((hi >>> (s * 8)) & 0xff);
    for (s = 3; s >= 0; s--) bytes.push((lo >>> (s * 8)) & 0xff);
    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    var off = 0;
    for (off = 0; off < bytes.length; off += 64) {
      var t = 0;
      for (t = 0; t < 16; t++) {
        w[t] = ((bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) | (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3]) >>> 0;
      }
      for (t = 16; t < 64; t++) {
        var s0 = (rotr(7, w[t - 15]) ^ rotr(18, w[t - 15]) ^ (w[t - 15] >>> 3)) >>> 0;
        var s1 = (rotr(17, w[t - 2]) ^ rotr(19, w[t - 2]) ^ (w[t - 2] >>> 10)) >>> 0;
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = (rotr(6, e) ^ rotr(11, e) ^ rotr(25, e)) >>> 0;
        var ch = ((e & f) ^ ((~e) & g)) >>> 0;
        var temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = (rotr(2, a) ^ rotr(13, a) ^ rotr(22, a)) >>> 0;
        var maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        var temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (n) { return ("00000000" + n.toString(16)).slice(-8); }).join("");
  }
  function contentHash(line) {
    var parts = [
      line.kind || "",
      line.preferenceId || "",
      trim(line.preferenceName),
      line.category || "",
      trim(line.text)
    ];
    return sha256hex(parts.join("\u001f"));
  }
  function lineKey(line) {
    return [line.hotel, line.reservationId, line.kind, line.preferenceId || ""].join("|");
  }
  function normalizeLine(raw, hotel) {
    raw = raw || {};
    var kind = String(raw.kind || "");
    if (KINDS.indexOf(kind) < 0 || !hotelOk(hotel)) return null;
    var reservationId = String(raw.reservationId || raw.reservation_id || "");
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(reservationId)) return null;
    var preferenceId = String(raw.preferenceId || raw.preference_id || "");
    var preferenceName = clip(raw.preferenceName || raw.preference_name, 200);
    var category = String(raw.category || "").toUpperCase();
    var text = clip(raw.text != null ? raw.text : raw.request_text, 4000);
    if (CATEGORIES.indexOf(category) < 0) return null;
    if (kind === "preference") {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(preferenceId) || !preferenceName) return null;
    } else {
      if (preferenceId || !text) return null;
      preferenceId = "";
      preferenceName = "";
      category = "";
    }
    var room = String(raw.room || "");
    if (room && !/^[A-Za-z0-9-]{1,10}$/.test(room)) return null;
    var confirmation = clip(raw.confirmation, 40);
    var status = String(raw.status || "").toUpperCase();
    if (!/^[A-Z0-9_]{1,40}$/.test(status)) return null;
    var arrival = raw.arrival ? String(raw.arrival).slice(0, 10) : "";
    var departure = raw.departure ? String(raw.departure).slice(0, 10) : "";
    if (arrival && !/^\d{4}-\d{2}-\d{2}$/.test(arrival)) return null;
    if (departure && !/^\d{4}-\d{2}-\d{2}$/.test(departure)) return null;
    if (arrival && departure && departure < arrival) return null;
    var line = {
      id: raw.id != null ? raw.id : "",
      hotel: hotel,
      reservationId: reservationId,
      confirmation: confirmation,
      room: room,
      arrival: arrival,
      departure: departure,
      status: status,
      kind: kind,
      preferenceId: preferenceId,
      preferenceName: preferenceName,
      category: category,
      text: text,
      active: status === "HOLD" || status === "CHECKED_IN",
      example: raw.example === true
    };
    line.contentHash = contentHash(line);
    return line;
  }
  function groupOf(line, today) {
    if (!line || line.active === false) return "";
    if (line.status === "CHECKED_IN") return "inhouse";
    if (line.status === "HOLD" && line.arrival === today) return "arrival";
    return "";
  }
  function ackFor(line, acks) {
    var found = null;
    (acks || []).forEach(function (ack) {
      if (!ack) return;
      if (String(ack.requestId) !== String(line.id)) return;
      if (ack.contentHash !== line.contentHash) return;
      found = ack;
    });
    return found;
  }
  function isAcknowledged(line, acks) { return !!ackFor(line, acks); }
  function unackedCount(model) {
    var today = model.today;
    var n = 0;
    (model.lines || []).forEach(function (line) {
      if (line.hotel !== model.hotel) return;
      if (!groupOf(line, today)) return;
      if (!isAcknowledged(line, model.acks)) n += 1;
    });
    return n;
  }
  function applySnapshot(lines, acks, incoming, hotel, nowIso) {
    var kept = (lines || []).map(function (line) {
      var copy = {};
      Object.keys(line).forEach(function (key) { copy[key] = line[key]; });
      return copy;
    });
    if (!hotelOk(hotel) || !Array.isArray(incoming)) {
      return { lines: kept, acks: acks || [], saved: 0, inactive: 0, seen: false, rejected: false };
    }
    var saved = [];
    incoming.forEach(function (raw) {
      var line = normalizeLine(raw, hotel);
      if (line) saved.push(line);
    });
    if (!saved.length && incoming.length) {
      return { lines: kept, acks: acks || [], saved: 0, inactive: 0, seen: false, rejected: true };
    }
    var byKey = {};
    kept.forEach(function (line) {
      if (line.hotel === hotel) byKey[lineKey(line)] = line;
    });
    var seen = {};
    saved.forEach(function (line) {
      var key = lineKey(line);
      seen[key] = 1;
      var prev = byKey[key];
      if (prev) {
        var id = prev.id;
        var first = prev.firstSeen;
        Object.keys(line).forEach(function (name) { prev[name] = line[name]; });
        prev.id = id;
        prev.firstSeen = first || nowIso;
        prev.lastSeen = nowIso;
      } else {
        line.id = line.id || ("snap-" + key.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60));
        line.firstSeen = nowIso;
        line.lastSeen = nowIso;
        kept.push(line);
        byKey[key] = line;
      }
    });
    var inactive = 0;
    kept.forEach(function (line) {
      if (line.hotel !== hotel || !line.active) return;
      if (seen[lineKey(line)]) return;
      line.active = false;
      inactive += 1;
    });
    return { lines: kept, acks: acks || [], saved: saved.length, inactive: inactive, seen: true, rejected: false };
  }
  function sampleLine(hotel, spec) {
    var line = normalizeLine({
      id: "ex-" + hotel + "-" + spec.id,
      reservation_id: "ex-" + hotel.toLowerCase() + "-" + spec.res,
      confirmation: "EX-" + hotel + "-" + spec.conf,
      room: spec.room,
      arrival: spec.arrival,
      departure: spec.departure,
      status: spec.status,
      kind: spec.kind,
      preference_id: spec.preferenceId || "",
      preference_name: spec.preferenceName || "",
      category: spec.category || "",
      text: spec.text || "",
      example: true
    }, hotel);
    return line;
  }
  function exampleLines(hotel, today) {
    if (!hotelOk(hotel)) return [];
    var out = addDays(today, 2);
    var inDate = addDays(today, -1);
    var later = addDays(today, 3);
    return [
      sampleLine(hotel, { id: "arr-pref", res: "a", conf: "01", room: "118", arrival: today, departure: out, status: "HOLD", kind: "preference", preferenceId: "ex-late", preferenceName: "Late checkout", category: "STAY" }),
      sampleLine(hotel, { id: "arr-rem", res: "a", conf: "01", room: "118", arrival: today, departure: out, status: "HOLD", kind: "remarks", text: "EXAMPLE: high floor if one is open." }),
      sampleLine(hotel, { id: "arr-book", res: "b", conf: "02", room: "204", arrival: today, departure: out, status: "HOLD", kind: "booking_remarks", text: "EXAMPLE: sample booking note, not a real guest." }),
      sampleLine(hotel, { id: "in-pref", res: "c", conf: "03", room: "312", arrival: inDate, departure: out, status: "CHECKED_IN", kind: "preference", preferenceId: "ex-pillow", preferenceName: "Extra pillows", category: "HOUSEKEEPING" }),
      sampleLine(hotel, { id: "in-diet", res: "c", conf: "03", room: "312", arrival: inDate, departure: out, status: "CHECKED_IN", kind: "preference", preferenceId: "ex-nuts", preferenceName: "No nuts", category: "DIETARY" }),
      sampleLine(hotel, { id: "in-stay", res: "d", conf: "04", room: "318", arrival: inDate, departure: out, status: "CHECKED_IN", kind: "stay_remarks", text: "EXAMPLE: foam pillows on the bed." }),
      sampleLine(hotel, { id: "in-bill", res: "d", conf: "04", room: "318", arrival: inDate, departure: out, status: "CHECKED_IN", kind: "billing_remarks", text: "EXAMPLE: direct bill to Sample Company." }),
      sampleLine(hotel, { id: "in-hk", res: "d", conf: "04", room: "318", arrival: inDate, departure: out, status: "CHECKED_IN", kind: "housekeeping_remarks", text: "EXAMPLE: do not knock before 9." }),
      sampleLine(hotel, { id: "later", res: "e", conf: "05", room: "410", arrival: later, departure: addDays(later, 1), status: "HOLD", kind: "preference", preferenceId: "ex-quiet", preferenceName: "Quiet room", category: "ROOM" }),
      sampleLine(hotel, { id: "out", res: "f", conf: "06", room: "101", arrival: addDays(today, -3), departure: today, status: "CHECKED_OUT", kind: "remarks", text: "EXAMPLE: checked out sample." })
    ].filter(Boolean);
  }
  function exampleAcks(lines, today) {
    var pillows = (lines || []).filter(function (line) { return line.preferenceId === "ex-pillow"; })[0];
    if (!pillows) return [];
    return [{
      requestId: pillows.id,
      hotel: pillows.hotel,
      contentHash: pillows.contentHash,
      acknowledgedBy: "mspwe-fd",
      acknowledgedName: "Jordan Lee",
      note: "",
      acknowledgedAt: today + "T21:10:00.000Z",
      example: true
    }];
  }
  function demoModel(hotel, today) {
    var lines = exampleLines(hotel, today);
    var acks = exampleAcks(lines, today).concat(Object.keys(sessionAcks).map(function (id) { return sessionAcks[id]; }));
    return { hotel: hotel, today: today, lines: lines, acks: acks, example: true };
  }
  function rowsFromLive(hotel, requestRows, ackRows) {
    var lines = [];
    (requestRows || []).forEach(function (row) {
      var line = normalizeLine(row, hotel);
      if (!line) return;
      line.id = row.id;
      line.contentHash = row.content_hash || line.contentHash;
      line.active = row.active !== false && line.active;
      line.firstSeen = row.first_seen || "";
      line.lastSeen = row.last_seen || "";
      lines.push(line);
    });
    var acks = (ackRows || []).map(function (row) {
      return {
        requestId: row.request_id,
        hotel: row.hotel,
        contentHash: row.content_hash,
        acknowledgedName: row.acknowledged_name || "",
        acknowledgedAt: row.acknowledged_at || "",
        note: row.note || ""
      };
    });
    return { hotel: hotel, today: todayIso(), lines: lines, acks: acks, example: false };
  }
  function canAckLine(actor, line) {
    actor = actor || {};
    if (!line || !canAcknowledge(actor.role)) return false;
    if (isCorporate(actor.role)) return true;
    return !!actor.hotel && actor.hotel === line.hotel;
  }
  function acknowledge(model, id, actor, note, nowIso) {
    var line = (model.lines || []).filter(function (row) { return String(row.id) === String(id); })[0];
    if (!line || line.active === false || !groupOf(line, model.today)) return { ok: false, error: "missing" };
    if (!canAckLine(actor, line)) return { ok: false, error: "denied" };
    var text = clip(note, 500);
    var existing = ackFor(line, model.acks);
    var nextAcks = (model.acks || []).slice();
    if (existing) {
      if (!existing.note && text) {
        nextAcks = nextAcks.map(function (ack) {
          if (ack === existing) return Object.assign({}, ack, { note: text });
          return ack;
        });
      }
      return { ok: true, ack: existing.note || !text ? existing : Object.assign({}, existing, { note: text }), model: { hotel: model.hotel, today: model.today, lines: model.lines, acks: nextAcks, example: model.example } };
    }
    var ack = {
      requestId: line.id,
      hotel: line.hotel,
      contentHash: line.contentHash,
      acknowledgedBy: actor.id || "",
      acknowledgedName: actor.name || "",
      note: text,
      acknowledgedAt: nowIso
    };
    nextAcks.push(ack);
    return { ok: true, ack: ack, model: { hotel: model.hotel, today: model.today, lines: model.lines, acks: nextAcks, example: model.example } };
  }
  function fmtWhen(iso, lang) {
    if (!iso) return "";
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    try {
      return date.toLocaleString(lang === "es" ? "es-MX" : "en-US", {
        timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
      });
    } catch (e2) {
      return iso.slice(0, 16);
    }
  }
  function safeId(id) {
    var text = String(id == null ? "" : id);
    return /^[A-Za-z0-9_-]{1,80}$/.test(text) ? text : "";
  }
  function labelOf(line, lang) {
    if (line.kind === "preference") return line.preferenceName;
    return line.text;
  }
  function kindOf(line, lang) {
    var pair = KIND_LABEL[line.kind] || [line.kind, line.kind];
    var kind = tx(lang, pair[0], pair[1]);
    if (line.kind === "preference" && line.category && CATEGORY_LABEL[line.category]) {
      var cat = CATEGORY_LABEL[line.category];
      return kind + " · " + tx(lang, cat[0], cat[1]);
    }
    return kind;
  }
  function grouped(model) {
    var buckets = { arrival: [], inhouse: [] };
    (model.lines || []).forEach(function (line) {
      if (line.hotel !== model.hotel) return;
      var group = groupOf(line, model.today);
      if (group) buckets[group].push(line);
    });
    ["arrival", "inhouse"].forEach(function (name) {
      buckets[name].sort(function (a, b) {
        var ar = parseInt(a.room, 10);
        var br = parseInt(b.room, 10);
        if (ar !== br && isFinite(ar) && isFinite(br)) return ar - br;
        return String(a.room).localeCompare(String(b.room)) || String(a.confirmation).localeCompare(String(b.confirmation));
      });
    });
    return buckets;
  }
  function rowHtml(line, model, opts) {
    var lang = opts.lang === "es" ? "es" : "en";
    var ack = ackFor(line, model.acks);
    var id = safeId(line.id);
    var example = opts.example ? " <span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span>" : "";
    var meta = "<p class=\"greq-meta\"><b>" + esc(tx(lang, "Rm", "Hab.")) + " " + esc(line.room || "—") + "</b> · " + esc(line.confirmation || "—") + example + "</p>";
    var body = "<p class=\"greq-label\">" + esc(labelOf(line, lang)) + "</p><p class=\"greq-kind\">" + esc(kindOf(line, lang)) + "</p>";
    var foot = "";
    if (ack) {
      foot = "<p class=\"greq-done\">" + esc(tx(lang, "Acknowledged", "Confirmado")) + " · " + esc(ack.acknowledgedName || tx(lang, "Staff", "Personal")) + " · " + esc(fmtWhen(ack.acknowledgedAt, lang)) + "</p>";
      if (ack.note) foot += "<p class=\"greq-acknote\">" + esc(ack.note) + "</p>";
    } else if (opts.actor && canAckLine(opts.actor, line) && id) {
      foot = "<label class=\"greq-note-lab\">" + esc(tx(lang, "Note (optional)", "Nota (opcional)")) +
        "<input id=\"grNote-" + id + "\" maxlength=\"500\" autocomplete=\"off\"></label>" +
        "<button type=\"button\" class=\"btn greq-ack\" onclick=\"grAck('" + id + "')\">" + esc(tx(lang, "Acknowledge", "Confirmar")) + "</button>";
    }
    return "<article class=\"greq-row" + (ack ? " greq-is-done" : "") + "\" data-gr=\"" + esc(id) + "\">" + meta + body + foot + "</article>";
  }
  function sectionHtml(title, rows, model, opts, lang) {
    var body = rows.length
      ? rows.map(function (line) { return rowHtml(line, model, opts); }).join("")
      : "<p class=\"greq-empty\">" + esc(tx(lang, "None right now.", "Ninguna ahora.")) + "</p>";
    return "<h4>" + esc(title) + "</h4>" + body;
  }
  function cardHtml(model, opts) {
    opts = opts || {};
    var lang = opts.lang === "es" ? "es" : "en";
    var count = unackedCount(model);
    var groups = grouped(model);
    var banner = "";
    if (opts.example || model.example) {
      banner = "<p class=\"greq-sample\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
        esc(tx(lang, "Sample requests for this demo. No real guests.", "Solicitudes de ejemplo para esta demostración. No hay huéspedes reales.")) + "</p>";
    }
    var err = opts.message === "missing"
      ? "<p class=\"greq-empty\">" + esc(tx(lang, "Guest requests are not on this database yet.", "Las solicitudes aún no están en esta base.")) + "</p>"
      : (opts.message === "save"
        ? "<p class=\"greq-empty\">" + esc(tx(lang, "Could not save the acknowledgment.", "No se pudo guardar la confirmación.")) + "</p>"
        : "");
    return "<section class=\"greq-card\" id=\"greqHome\"><div class=\"greq-hd\"><h3>" + esc(tx(lang, "Guest requests", "Solicitudes del huésped")) + "</h3>" +
      "<span class=\"qt-badge\" id=\"grCount\">" + count + "</span></div>" +
      "<p class=\"greq-count\">" + esc(count + " " + tx(lang, "unacknowledged", "sin confirmar")) + "</p>" +
      banner + err +
      sectionHtml(tx(lang, "Arrivals today", "Llegadas de hoy"), groups.arrival, model, opts, lang) +
      sectionHtml(tx(lang, "In-house", "En casa"), groups.inhouse, model, opts, lang) +
      "</section>";
  }
  function currentActor() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (!me) return { role: "", hotel: "", name: "", id: "" };
      return { role: me.role || "", hotel: me.hotel || "", name: me.name || "", id: me.id || "" };
    } catch (e) {
      return { role: "", hotel: "", name: "", id: "" };
    }
  }
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function viewHotel(actor) {
    actor = actor || {};
    if (hotelOk(actor.hotel)) return actor.hotel;
    if (!isCorporate(actor.role)) return "";
    var selected = "";
    try { selected = (typeof S !== "undefined" && S.hotel) || ""; } catch (e) { selected = ""; }
    return hotelOk(selected) ? selected : "MSPWE";
  }
  function payloadExample() {
    return {
      p_token: "<device token>",
      p: {
        hotel: "MSPWE",
        status: "ok",
        requests: [
          {
            reservation_id: "ex-res-1",
            confirmation: "EX-MSPWE-01",
            room: "118",
            arrival: "2026-11-25",
            departure: "2026-11-27",
            status: "HOLD",
            kind: "preference",
            preference_id: "ex-late",
            preference_name: "Late checkout",
            category: "STAY",
            text: ""
          },
          {
            reservation_id: "ex-res-1",
            confirmation: "EX-MSPWE-01",
            room: "118",
            arrival: "2026-11-25",
            departure: "2026-11-27",
            status: "HOLD",
            kind: "remarks",
            preference_id: "",
            preference_name: "",
            category: "",
            text: "EXAMPLE: high floor if one is open."
          }
        ]
      }
    };
  }
  function homeHtml() {
    var actor = currentActor();
    var hotel = viewHotel(actor);
    if (!canSeeHome(actor.role) || !hotel) return "";
    var lang = langNow();
    if (demoUi()) return cardHtml(demoModel(hotel, todayIso()), { example: true, lang: lang, actor: actor });
    return liveHomeHtml(actor, hotel, lang);
  }
  function liveHomeHtml(actor, hotel, lang) {
    if (typeof document === "undefined") return "";
    ensureLive(hotel);
    if (liveState === "loading" || liveState === "") {
      return "<section class=\"greq-card\" id=\"greqHome\"><h3>" + esc(tx(lang, "Guest requests", "Solicitudes del huésped")) + "</h3><p class=\"greq-empty\">" +
        esc(tx(lang, "Loading guest requests.", "Cargando solicitudes.")) + "</p></section>";
    }
    if (liveState === "error") {
      return cardHtml({ hotel: hotel, today: todayIso(), lines: [], acks: [] }, { lang: lang, actor: actor, message: "missing" });
    }
    return cardHtml({ hotel: hotel, today: todayIso(), lines: liveLines, acks: liveAcks }, { lang: lang, actor: actor, message: liveMessage });
  }
  function ensureLive(hotel) {
    if (liveHotel === hotel && (liveState === "loading" || liveState === "ready" || liveState === "error")) return;
    liveHotel = hotel;
    liveState = "loading";
    liveLines = [];
    liveAcks = [];
    liveMessage = "";
    if (typeof sb === "undefined" || !sb || !sb.from) {
      liveState = "error";
      return;
    }
    Promise.all([
      sb.from("hotelkey_reservation_requests").select("id,hotel,reservation_id,confirmation,room,arrival,departure,status,kind,preference_id,preference_name,category,request_text,content_hash,active,first_seen,last_seen").eq("hotel", hotel).eq("active", true).limit(500),
      sb.from("hotelkey_reservation_request_acks").select("request_id,hotel,content_hash,acknowledged_name,acknowledged_at,note").eq("hotel", hotel).limit(1000)
    ]).then(function (pair) {
      if (liveHotel !== hotel) return;
      var req = pair[0] || {};
      var ack = pair[1] || {};
      if (req.error || ack.error) {
        liveState = "error";
      } else {
        var model = rowsFromLive(hotel, req.data || [], ack.data || []);
        liveLines = model.lines;
        liveAcks = model.acks;
        liveState = "ready";
      }
      try { if (typeof render === "function") render(); } catch (e) {}
    }, function () {
      if (liveHotel !== hotel) return;
      liveState = "error";
      try { if (typeof render === "function") render(); } catch (e2) {}
    });
  }
  function resetDemo() { sessionAcks = {}; }

  var api = {
    hotels: HOTELS,
    kinds: KINDS,
    sha256hex: sha256hex,
    contentHash: contentHash,
    normalizeLine: normalizeLine,
    groupOf: groupOf,
    isAcknowledged: isAcknowledged,
    unackedCount: unackedCount,
    applySnapshot: applySnapshot,
    exampleLines: exampleLines,
    exampleAcks: exampleAcks,
    demoModel: demoModel,
    rowsFromLive: rowsFromLive,
    canSeeHome: canSeeHome,
    canAcknowledge: canAcknowledge,
    canAckLine: canAckLine,
    acknowledge: acknowledge,
    cardHtml: cardHtml,
    homeHtml: homeHtml,
    demoUi: demoUi,
    payloadExample: payloadExample,
    todayIso: todayIso,
    resetDemo: resetDemo
  };
  root.GuestRequests = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function paintCard() {
    if (typeof document === "undefined") return;
    var current = document.getElementById("greqHome");
    var html = homeHtml();
    if (!current || !html) {
      try { if (typeof render === "function") render(); } catch (e) {}
      return;
    }
    var holder = document.createElement("div");
    holder.innerHTML = html;
    if (holder.firstElementChild) current.replaceWith(holder.firstElementChild);
  }

  root.grAck = function (id) {
    var safe = safeId(id);
    if (!safe) return;
    var actor = currentActor();
    var noteEl = typeof document !== "undefined" ? document.getElementById("grNote-" + safe) : null;
    var note = noteEl ? noteEl.value : "";
    if (demoUi()) {
      var hotel = viewHotel(actor);
      var result = acknowledge(demoModel(hotel, todayIso()), safe, actor, note, new Date().toISOString());
      if (result.ok) sessionAcks[safe] = result.ack;
      paintCard();
      return;
    }
    if (typeof sb === "undefined" || !sb || !sb.rpc) return;
    var numeric = Number(safe);
    if (!isFinite(numeric)) return;
    sb.rpc("acknowledge_hotelkey_request", { p_id: numeric, p_note: note }).then(function (res) {
      if (!res || res.error || !res.data) {
        liveMessage = "save";
      } else {
        liveMessage = "";
        liveAcks = liveAcks.filter(function (ack) {
          return !(String(ack.requestId) === String(res.data.id) && ack.contentHash === res.data.content_hash);
        });
        liveAcks.push({
          requestId: res.data.id,
          hotel: res.data.hotel,
          contentHash: res.data.content_hash,
          acknowledgedName: res.data.acknowledged_name || actor.name || "",
          acknowledgedAt: res.data.acknowledged_at || new Date().toISOString(),
          note: res.data.note || ""
        });
      }
      paintCard();
    }, function () {
      liveMessage = "save";
      paintCard();
    });
  };

  if (typeof document === "undefined") return;
  if (typeof I18N !== "undefined" && I18N.es) {
    I18N.es["Guest requests"] = "Solicitudes del huésped";
    I18N.es["Arrivals today"] = "Llegadas de hoy";
    I18N.es["In-house"] = "En casa";
    I18N.es.Acknowledge = "Confirmar";
    I18N.es.Acknowledged = "Confirmado";
  }
  var css = document.createElement("style");
  css.textContent = [
    ".greq-card{background:#fff;border:1px solid #e2e6ec;border-left:4px solid #0c3d5c;border-radius:14px;padding:12px 14px;margin:8px 0}",
    ".greq-hd{display:flex;align-items:center;gap:8px}.greq-hd h3{margin:0;font-size:18px}",
    ".greq-count,.greq-sample,.greq-empty,.greq-kind,.greq-done,.greq-acknote{margin:4px 0;color:#3c4a59;font-size:14px}",
    ".greq-card h4{margin:12px 0 6px;font-size:15px}",
    ".greq-row{border:1px solid #e2e6ec;border-radius:12px;padding:10px;margin:0 0 8px;background:#fff}",
    ".greq-row.greq-is-done{background:#f3faf4;border-color:#b7e0c2}",
    ".greq-meta{margin:0 0 4px}.greq-label{margin:0;font-size:17px;font-weight:700}",
    ".greq-note-lab{display:block;font-size:14px;margin-top:8px}",
    ".greq-note-lab input{display:block;width:100%;min-height:44px;margin-top:4px;border:1px solid #d5dde6;border-radius:10px;padding:8px;font-size:16px}",
    ".greq-ack{width:100%;min-height:48px;margin-top:8px}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
