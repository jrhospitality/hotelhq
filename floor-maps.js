/* Floor maps. MSPWE (Holiday Inn Express Golden Valley) is the Nov 15 pilot.
   The traced rectangles live in data/mspwe-floors.js. This file does not load
   construction drawings. Hampton and SpringHill stay empty until a map is saved
   for that hotel. Other agents own sign-in, consolidation, and sales leads. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var STORE = "jrportal_floor_maps_v1";
  var FILL = { dirty: "#f4c45a", clean: "#d6e8ff", inspected: "#1f8a4c", ooo: "#6b7280", none: "#f7f4ee" };
  var INK = { dirty: "#1c2430", clean: "#1c2430", inspected: "#ffffff", ooo: "#ffffff", none: "#1c2430" };

  function bundled() {
    if (typeof MSPWE_FLOOR_MAP !== "undefined" && MSPWE_FLOOR_MAP && MSPWE_FLOOR_MAP.hotel) return MSPWE_FLOOR_MAP;
    if (typeof require === "function") {
      try { return require("./data/mspwe-floors.js"); } catch (e) { return null; }
    }
    return null;
  }

  function roomList(floor) {
    return (floor && floor.rooms) || [];
  }

  function numbersOf(floor) {
    return roomList(floor).map(function (r) { return String(r.n); });
  }

  function sameNumbers(a, b) {
    var as = numbersOf(a).slice().sort();
    var bs = numbersOf(b).slice().sort();
    if (as.length !== bs.length) return false;
    for (var i = 0; i < as.length; i++) if (as[i] !== bs[i]) return false;
    return true;
  }

  function countRooms(map) {
    var n = 0;
    ((map && map.floors) || []).forEach(function (fl) { n += roomList(fl).length; });
    return n;
  }

  function audit(map) {
    var seen = {};
    var duplicates = [];
    var floors = {};
    ((map && map.floors) || []).forEach(function (fl) {
      var nums = [];
      roomList(fl).forEach(function (r) {
        var n = String(r.n);
        if (seen[n]) duplicates.push(n);
        seen[n] = fl.id;
        nums.push(n);
      });
      floors[String(fl.id)] = nums;
    });
    return { floors: floors, total: Object.keys(seen).length, duplicates: duplicates };
  }

  function guestFromEvac(tokens) {
    return (tokens || []).filter(function (t) { return t !== "911" && t !== "152"; });
  }

  function paint(room) {
    if (!room) return { key: "none", occupied: false, progress: false };
    var flow = room.flow || "";
    if (typeof roomFlow === "function") {
      try { flow = roomFlow(room); } catch (e) { flow = room.flow || ""; }
    }
    var s = room.s || "";
    var occupied = room.occ === true || s === "OC" || s === "OD";
    if (flow === "ooo" || s === "OOO") return { key: "ooo", occupied: false, progress: false };
    var key = "dirty";
    if (flow === "cleaned" || s === "RFI") key = "clean";
    else if (flow === "ready" || s === "VC" || s === "OC") key = "inspected";
    return { key: key, occupied: occupied, progress: flow === "progress" };
  }

  function canEdit(role) {
    return role === "Above Property" || role === "JR Corporate";
  }

  function applyEdits(floor, edits) {
    var copy = JSON.parse(JSON.stringify(floor));
    roomList(copy).forEach(function (r) {
      var p = edits && edits[String(r.n)];
      if (!p) return;
      ["x", "y", "w", "h"].forEach(function (k) {
        var n = Number(p[k]);
        if (isFinite(n)) r[k] = Math.round(n * 10) / 10;
      });
    });
    return copy;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w - 0.6 && b.x < a.x + a.w - 0.6 && a.y < b.y + b.h - 0.6 && b.y < a.y + a.h - 0.6;
  }

  var api = {
    bundled: bundled,
    audit: audit,
    guestFromEvac: guestFromEvac,
    paint: paint,
    canEdit: canEdit,
    applyEdits: applyEdits,
    sameNumbers: sameNumbers,
    countRooms: countRooms,
    overlaps: overlaps,
    HOTELS: HOTELS
  };
  root.FloorMaps = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  var ui = {
    floor: "1",
    room: "",
    scale: 1,
    x: 0,
    y: 0,
    userZoom: false,
    overlays: { hk: true, wo: true, req: true, dnd: true },
    edit: false,
    notice: "",
    error: ""
  };
  var remote = {};
  var remoteState = "";
  var bound = false;

  function L(en, es) {
    return (typeof LANG !== "undefined" && LANG === "es") ? es : en;
  }
  function esc(s) {
    if (typeof escH === "function") return escH(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function hotelNow() {
    var hotel = "";
    try { if (typeof S !== "undefined" && S.hotel) hotel = S.hotel; } catch (e) { hotel = ""; }
    return HOTELS.indexOf(hotel) >= 0 ? hotel : "MSPWE";
  }
  function roleNow() {
    try { return authRole(); } catch (e) { return ""; }
  }
  function remoteOn() {
    return typeof useRemote === "function" && !!useRemote() && typeof sb !== "undefined" && sb;
  }
  function baseMap(hotel) {
    var map = bundled();
    if (map && map.hotel === hotel) return map;
    return null;
  }
  function readStore() {
    try {
      var data = JSON.parse(localStorage.getItem(STORE) || "null");
      if (!data || data.v !== 1 || !data.rooms) return {};
      return data.rooms;
    } catch (e) { return {}; }
  }
  function writeStore(rooms) {
    try { localStorage.setItem(STORE, JSON.stringify({ v: 1, rooms: rooms })); } catch (e) {}
  }
  function localEdits(hotel, floorId) {
    var all = readStore();
    var out = {};
    var prefix = hotel + "|" + floorId + "|";
    Object.keys(all).forEach(function (k) {
      if (k.indexOf(prefix) === 0) out[k.slice(prefix.length)] = all[k];
    });
    return out;
  }
  function ensureRemote() {
    if (!remoteOn() || remoteState === "loading" || remoteState === "ready") return;
    remoteState = "loading";
    sb.from("floor_maps").select("hotel,floor,map").then(function (res) {
      remote = {};
      if (!res.error) {
        (res.data || []).forEach(function (row) {
          if (!row || HOTELS.indexOf(row.hotel) < 0) return;
          remote[row.hotel] = remote[row.hotel] || {};
          remote[row.hotel][String(row.floor)] = row.map;
        });
      }
      remoteState = "ready";
      if (typeof render === "function" && S && S.tab === "floors") render();
    }, function () { remoteState = "ready"; });
  }
  function floorBase(hotel, floorId) {
    var map = baseMap(hotel);
    if (!map) return null;
    var found = null;
    map.floors.forEach(function (fl) { if (String(fl.id) === String(floorId)) found = fl; });
    return found;
  }
  function shownFloor(hotel, floorId) {
    var base = floorBase(hotel, floorId);
    if (!base) return null;
    var remoteFloor = remote[hotel] && remote[hotel][String(floorId)];
    if (remoteFloor && remoteFloor.rooms && sameNumbers(base, remoteFloor)) {
      return applyEdits(base, positionsOf(remoteFloor));
    }
    return applyEdits(base, localEdits(hotel, floorId));
  }
  function positionsOf(floor) {
    var out = {};
    roomList(floor).forEach(function (r) { out[String(r.n)] = { x: r.x, y: r.y, w: r.w, h: r.h }; });
    return out;
  }
  function liveRooms() {
    try { return (D().rooms || []); } catch (e) { return []; }
  }
  function liveRoom(n) {
    var want = String(n);
    var hit = null;
    liveRooms().forEach(function (r) { if (String(r.n) === want) hit = r; });
    return hit;
  }
  function openOrders(n) {
    var list = [];
    try { list = D().wo || []; } catch (e) { list = []; }
    return list.filter(function (w) { return String(w.room) === String(n) && w.s !== "Done"; });
  }
  function openRequests(n) {
    var list = [];
    try {
      if (root.QPX && root.QPX.grList) list = root.QPX.grList() || [];
    } catch (e) { list = []; }
    if (!list.length) {
      try { list = (D().qp && D().qp.gr) || []; } catch (e2) { list = []; }
    }
    return list.filter(function (r) { return String(r.room) === String(n) && r.st !== "done"; });
  }
  function isDnd(n, live) {
    if (live && (live.x === "DND" || live.x === "Refused")) return true;
    try {
      var esc = D().esc || [];
      for (var i = 0; i < esc.length; i++) {
        var e = esc[i];
        if (String(e.room) === String(n) && e.ty === "DND" && e.st !== "Resolved" && e.st !== "Acknowledged") return true;
      }
    } catch (err) {}
    try {
      if (root.QPX && root.QPX.rnList) {
        var now = Date.now();
        return root.QPX.rnList().some(function (x) {
          return String(x.room) === String(n) && x.ty === "dnd" && new Date(x.until).getTime() > now;
        });
      }
    } catch (err2) {}
    return false;
  }
  function canOpen(tab) {
    try {
      if (typeof navFor === "function" && navFor(S.role).indexOf(tab) >= 0) return true;
      if (typeof tilesFor === "function" && tilesFor(S.role).indexOf(tab) >= 0) return true;
    } catch (e) {}
    return false;
  }
  function statusLabel(p) {
    if (p.key === "dirty") return L("Dirty", "Sucio");
    if (p.key === "clean") return L("Clean, not inspected", "Limpio, sin inspección");
    if (p.key === "inspected") return L("Passed inspection", "Pasó inspección");
    if (p.key === "ooo") return L("Out of order", "Fuera de servicio");
    return L("No live status", "Sin estado en el tablero");
  }
  function areaLabel(a) {
    return L(a.label_en, a.label_es);
  }

  function svgFor(floor, hotel) {
    var view = floor.view;
    var parts = [];
    parts.push('<svg class="fm-svg" viewBox="0 0 ' + view.w + " " + view.h + '" role="group" aria-label="' + esc(L(floor.label_en, floor.label_es)) + '">');
    parts.push('<rect class="fm-bg" x="0" y="0" width="' + view.w + '" height="' + view.h + '"></rect>');
    (floor.areas || []).forEach(function (a) {
      var clip = "fm-clip-" + String(a.id).replace(/[^a-z0-9_-]/gi, "");
      parts.push('<g class="fm-area fm-' + esc(a.kind) + '">');
      parts.push('<defs><clipPath id="' + clip + '"><rect x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '"></rect></clipPath></defs>');
      parts.push('<rect x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '" rx="4"></rect>');
      if (a.w >= 28 && a.h >= 16 && a.kind !== "corridor") {
        parts.push('<text clip-path="url(#' + clip + ')" x="' + (a.x + 3) + '" y="' + (a.y + Math.min(14, a.h - 4)) + '">' + esc(areaLabel(a)) + "</text>");
      }
      parts.push("</g>");
    });
    floor.rooms.forEach(function (r) {
      var live = liveRoom(r.n);
      var p = paint(live);
      var orders = openOrders(r.n);
      var reqs = openRequests(r.n);
      var dnd = isDnd(r.n, live);
      var label = L("Room", "Cuarto") + " " + r.n + ", " + statusLabel(p);
      if (p.occupied) label += ", " + L("occupied", "ocupado");
      if (dnd) label += ", " + L("do not disturb", "no molestar");
      parts.push('<g class="fm-room' + (ui.room === String(r.n) ? " on" : "") + '" data-room="' + esc(r.n) + '" tabindex="0" role="button" aria-label="' + esc(label) + '">');
      parts.push('<rect class="fm-box" x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="3" fill="' + FILL[p.key] + '" stroke="' + (ui.room === String(r.n) ? "#14365d" : "#1c2430") + '" stroke-width="' + (ui.room === String(r.n) ? 2.5 : 1) + '"></rect>');
      if (p.occupied) parts.push('<rect class="fm-occ" x="' + r.x + '" y="' + r.y + '" width="5" height="' + r.h + '" fill="#14365d"></rect>');
      if (ui.overlays.dnd && dnd) parts.push('<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="7" fill="#c0262d"></rect>');
      parts.push('<text class="fm-num" x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2 - (ui.overlays.hk && live && live.hk ? 2 : -1)) + '" fill="' + INK[p.key] + '">' + esc(r.n) + "</text>");
      if (ui.overlays.hk && live && live.hk) {
        var ini = String(live.hk).replace(/\(.*?\)/g, "").trim().split(/\s+/).map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
        parts.push('<text class="fm-hk" x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2 + 12) + '" fill="' + INK[p.key] + '">' + esc(ini) + "</text>");
      }
      var badge = r.x + r.w - 8;
      if (ui.overlays.wo && orders.length) {
        parts.push('<circle cx="' + badge + '" cy="' + (r.y + r.h - 8) + '" r="5" fill="#9a3412"></circle>');
      }
      if (ui.overlays.req && reqs.length) {
        parts.push('<circle cx="' + (r.x + 10) + '" cy="' + (r.y + r.h - 8) + '" r="5" fill="#1d4ed8"></circle>');
      }
      parts.push("</g>");
    });
    parts.push("</svg>");
    return parts.join("");
  }

  function detailHtml(hotel) {
    if (!ui.room) return '<p class="fm-hint">' + esc(L("Tap a room for status and actions.", "Toca una habitación para ver el estado y las acciones.")) + "</p>";
    var live = liveRoom(ui.room);
    var p = paint(live);
    var orders = openOrders(ui.room);
    var reqs = openRequests(ui.room);
    var dnd = isDnd(ui.room, live);
    var hk = live && live.hk ? String(live.hk).replace(/\s*\(EX\)\s*/g, "") : "";
    var bits = ['<div class="fm-detail"><div class="fm-detail-h"><b class="raw">' + esc(ui.room) + "</b> "];
    bits.push('<span class="fm-pill fm-' + p.key + '">' + esc(statusLabel(p)) + "</span>");
    if (p.occupied) bits.push('<span class="fm-pill fm-occ">' + esc(L("Occupied", "Ocupado")) + "</span>");
    if (p.progress) bits.push('<span class="fm-pill">' + esc(L("In progress", "En proceso")) + "</span>");
    if (dnd) bits.push('<span class="fm-pill fm-dnd">' + esc(L("Do not disturb", "No molestar")) + "</span>");
    bits.push("</div>");
    bits.push("<p>" + esc(hk ? L("Assigned to", "Asignada a") + " " + hk : L("No housekeeper on the board.", "Sin camarista en el tablero.")) + "</p>");
    bits.push("<p>" + esc(orders.length ? orders.length + " " + L("open work orders", "órdenes abiertas") : L("No open work orders.", "Sin órdenes abiertas.")) + "</p>");
    if (orders.length) bits.push("<ul>" + orders.map(function (w) { return "<li>" + esc(w.t || "") + "</li>"; }).join("") + "</ul>");
    bits.push("<p>" + esc(reqs.length ? reqs.length + " " + L("open guest requests", "solicitudes abiertas") : L("No open guest requests.", "Sin solicitudes abiertas.")) + "</p>");
    if (reqs.length) bits.push("<ul>" + reqs.map(function (r) { return "<li>" + esc(r.note || "") + "</li>"; }).join("") + "</ul>");
    var actions = [];
    if (canOpen("wo")) actions.push('<button type="button" class="btn" data-go="wo">' + esc(L("Create work order", "Crear orden de trabajo")) + "</button>");
    if (canOpen("greq")) actions.push('<button type="button" class="btn" data-go="greq">' + esc(L("Log a guest request", "Registrar solicitud")) + "</button>");
    if (canOpen("insp")) actions.push('<button type="button" class="btn2" data-go="insp">' + esc(L("Start inspection", "Empezar inspección")) + "</button>");
    if (actions.length) bits.push('<div class="fm-actions">' + actions.join("") + "</div>");
    if (ui.edit && canEdit(roleNow())) bits.push(editorFields(hotel));
    bits.push("</div>");
    return bits.join("");
  }

  function editorFields(hotel) {
    var floor = shownFloor(hotel, ui.floor);
    var room = null;
    if (floor) floor.rooms.forEach(function (r) { if (String(r.n) === ui.room) room = r; });
    if (!room) return "";
    function field(key, label) {
      return '<label class="fm-field">' + esc(label) + '<input data-edit="' + key + '" inputmode="decimal" value="' + esc(room[key]) + '" aria-label="' + esc(label) + '"></label>';
    }
    return '<div class="fm-editor"><p>' + esc(L("Drag the room, or type a new position. Room numbers stay put.", "Arrastra la habitación o escribe la posición. El número no cambia.")) + "</p>" +
      '<div class="fm-nudge">' +
      '<button type="button" data-nudge="y" data-step="-4" aria-label="' + esc(L("Move up", "Subir")) + '">↑</button>' +
      '<button type="button" data-nudge="x" data-step="-4" aria-label="' + esc(L("Move left", "Izquierda")) + '">←</button>' +
      '<button type="button" data-nudge="x" data-step="4" aria-label="' + esc(L("Move right", "Derecha")) + '">→</button>' +
      '<button type="button" data-nudge="y" data-step="4" aria-label="' + esc(L("Move down", "Bajar")) + '">↓</button>' +
      "</div>" +
      field("x", "X") + field("y", "Y") + field("w", L("Width", "Ancho")) + field("h", L("Height", "Alto")) +
      "</div>";
  }

  function pageHtml() {
    if (remoteOn()) ensureRemote();
    var hotel = hotelNow();
    var map = baseMap(hotel);
    var remoteFloors = remote[hotel] || {};
    var hasRemote = Object.keys(remoteFloors).length > 0;
    if (!map && !hasRemote) {
      return '<div class="fm raw"><h2>' + esc(L("Floor map", "Mapa del piso")) + "</h2><div class=\"card\"><p>" +
        esc(L("No floor map for this hotel yet. Hampton and SpringHill can be added the same way as Golden Valley.", "Este hotel todavía no tiene mapa. Hampton y SpringHill se pueden agregar igual que Golden Valley.")) +
        "</p></div></div>";
    }
    var floors = map ? map.floors : [];
    if (!floors.some(function (fl) { return String(fl.id) === ui.floor; }) && floors[0]) ui.floor = String(floors[0].id);
    var floor = shownFloor(hotel, ui.floor);
    var tabs = floors.map(function (fl) {
      var on = String(fl.id) === String(ui.floor);
      return '<button type="button" role="tab" class="' + (on ? "on" : "") + '" aria-selected="' + on + '" data-floor="' + esc(fl.id) + '">' +
        esc(L(fl.label_en, fl.label_es)) + " · " + fl.rooms.length + "</button>";
    }).join("");
    function tog(key, en, es) {
      var on = !!ui.overlays[key];
      return '<button type="button" class="fm-tog' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-overlay="' + key + '">' + esc(L(en, es)) + "</button>";
    }
    var legend = [
      ["dirty", L("Dirty", "Sucio")],
      ["clean", L("Clean, not inspected", "Limpio, sin inspección")],
      ["inspected", L("Passed inspection", "Pasó inspección")],
      ["ooo", L("Out of order", "Fuera de servicio")],
      ["none", L("No live status", "Sin estado")]
    ].map(function (item) {
      return '<span class="fm-key"><i class="fm-swatch fm-' + item[0] + '"></i>' + esc(item[1]) + "</span>";
    }).join("") + '<span class="fm-key"><i class="fm-swatch fm-occbar"></i>' + esc(L("Occupied", "Ocupado")) + "</span>";
    var note = ui.notice ? '<p class="fm-ok" role="status">' + esc(ui.notice) + "</p>" : "";
    var err = ui.error ? '<p class="fm-err" role="alert">' + esc(ui.error) + "</p>" : "";
    var editBtn = canEdit(roleNow())
      ? '<button type="button" class="btn2" id="fmEdit" aria-pressed="' + ui.edit + '">' + esc(ui.edit ? L("Done moving", "Listo") : L("Move rooms", "Mover habitaciones")) + "</button>"
      : "";
    var saveBtn = ui.edit && canEdit(roleNow())
      ? '<button type="button" class="btn" id="fmSave">' + esc(L("Save map", "Guardar mapa")) + "</button>" +
        '<button type="button" class="btn2" id="fmReset">' + esc(L("Reset traced map", "Volver al mapa trazado")) + "</button>"
      : "";
    var notes = (map && (LANG === "es" ? map.notes_es : map.notes_en) || []).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
    return '<div class="fm raw" id="fmRoot"><h2>' + esc(L("Floor map", "Mapa del piso")) + "</h2>" +
      '<p class="fm-note">' + esc(map ? L(map.name_en, map.name_es) : hotel) + " · " +
      esc(L("Simplified map for staff. Not a construction drawing.", "Mapa simple para el personal. No es un plano de obra.")) + "</p>" +
      note + err +
      '<div class="fm-tabs" role="tablist" aria-label="' + esc(L("Floor", "Piso")) + '">' + tabs + "</div>" +
      '<div class="fm-legend">' + legend + "</div>" +
      '<div class="fm-overlays">' +
      tog("hk", "Housekeepers", "Camaristas") +
      tog("wo", "Work orders", "Órdenes") +
      tog("req", "Guest requests", "Solicitudes") +
      tog("dnd", "Do not disturb", "No molestar") +
      "</div>" +
      '<div class="fm-tools">' +
      '<button type="button" class="btn2" id="fmZoomOut" aria-label="' + esc(L("Zoom out", "Alejar")) + '">−</button>' +
      '<button type="button" class="btn2" id="fmZoomIn" aria-label="' + esc(L("Zoom in", "Acercar")) + '">+</button>' +
      '<button type="button" class="btn2" id="fmFit">' + esc(L("Whole floor", "Piso completo")) + "</button>" +
      editBtn + saveBtn +
      "</div>" +
      '<p class="fm-hint">' + esc(L("Pinch to zoom. Drag to move around.", "Pellizca para acercar. Arrastra para moverte.")) + "</p>" +
      '<div class="fm-stage" id="fmStage"><div class="fm-zoom" id="fmZoom">' + (floor ? svgFor(floor, hotel) : "") + "</div></div>" +
      '<div id="fmDetail">' + detailHtml(hotel) + "</div>" +
      '<details class="fm-notes"><summary>' + esc(L("Map notes", "Notas del mapa")) + "</summary><ul>" + notes + "</ul></details></div>";
  }

  function jump(tab) {
    var n = ui.room;
    if (!n || typeof go !== "function" || !canOpen(tab)) return;
    if (tab === "greq") {
      try {
        S.grf = S.grf || { type: "request", room: "", ini: "", cat: "towels", pri: "med", note: "", to: "", cb: "" };
        S.grf.room = String(n);
        S.grf.type = "request";
      } catch (e) {}
    }
    go(tab);
    var el = tab === "wo" ? document.getElementById("wr") : tab === "insp" ? document.getElementById("ir") : document.getElementById("grRoom");
    if (el) el.value = String(n);
  }

  function rememberRoom(hotel, room) {
    var all = readStore();
    all[hotel + "|" + ui.floor + "|" + room.n] = { x: room.x, y: room.y, w: room.w, h: room.h };
    writeStore(all);
    if (remote[hotel] && remote[hotel][ui.floor] && remote[hotel][ui.floor].rooms) {
      remote[hotel][ui.floor].rooms.forEach(function (r) {
        if (String(r.n) === String(room.n)) { r.x = room.x; r.y = room.y; r.w = room.w; r.h = room.h; }
      });
    }
  }

  function moveRoom(hotel, n, patch) {
    var floor = shownFloor(hotel, ui.floor);
    if (!floor) return;
    var room = null;
    floor.rooms.forEach(function (r) { if (String(r.n) === String(n)) room = r; });
    if (!room) return;
    if (patch.x != null) room.x = Math.round((room.x + patch.x) * 10) / 10;
    if (patch.y != null) room.y = Math.round((room.y + patch.y) * 10) / 10;
    if (patch.w != null) room.w = Math.max(16, Math.min(280, Math.round(Number(patch.w) * 10) / 10));
    if (patch.h != null) room.h = Math.max(16, Math.min(280, Math.round(Number(patch.h) * 10) / 10));
    if (patch.setX != null) room.x = Math.round(Number(patch.setX) * 10) / 10;
    if (patch.setY != null) room.y = Math.round(Number(patch.setY) * 10) / 10;
    rememberRoom(hotel, room);
    var box = document.querySelector('.fm-room[data-room="' + n + '"] .fm-box');
    redrawSvg();
  }
  function redrawSvg() {
    var zoom = document.getElementById("fmZoom");
    var floor = shownFloor(hotelNow(), ui.floor);
    if (!zoom || !floor) return;
    zoom.innerHTML = svgFor(floor, hotelNow());
  }

  function saveFloor() {
    var hotel = hotelNow();
    var floor = shownFloor(hotel, ui.floor);
    var base = floorBase(hotel, ui.floor);
    if (!floor || !base || !sameNumbers(base, floor) || !canEdit(roleNow())) {
      ui.error = L("The room list cannot change.", "La lista de habitaciones no se puede cambiar.");
      render();
      return;
    }
    ui.error = "";
    var payload = {
      label_en: floor.label_en, label_es: floor.label_es, view: floor.view,
      rooms: floor.rooms, areas: floor.areas
    };
    floor.rooms.forEach(function (r) { rememberRoom(hotel, r); });
    remote[hotel] = remote[hotel] || {};
    remote[hotel][String(floor.id)] = payload;
    if (!remoteOn()) {
      ui.notice = L("Saved on this device.", "Guardado en este dispositivo.");
      render();
      return;
    }
    sb.from("floor_maps").upsert({
      hotel: hotel,
      floor: Number(floor.id),
      map: payload,
      updated_at: new Date().toISOString()
    }, { onConflict: "hotel,floor" }).then(function (res) {
      ui.notice = res.error
        ? L("Saved on this device. Supabase rejected the floor map.", "Guardado en este dispositivo. Supabase rechazó el mapa.")
        : L("Map saved.", "Mapa guardado.");
      ui.error = "";
      render();
    }, function () {
      ui.notice = L("Saved on this device. Supabase rejected the floor map.", "Guardado en este dispositivo. Supabase rechazó el mapa.");
      render();
    });
  }

  function resetFloor() {
    if (!canEdit(roleNow())) return;
    var hotel = hotelNow();
    var all = readStore();
    var prefix = hotel + "|" + ui.floor + "|";
    Object.keys(all).forEach(function (k) { if (k.indexOf(prefix) === 0) delete all[k]; });
    writeStore(all);
    if (remote[hotel]) delete remote[hotel][ui.floor];
    ui.notice = L("Back to the traced map on this device.", "Volviste al mapa trazado en este dispositivo.");
    ui.error = "";
    var base = floorBase(hotel, ui.floor);
    if (remoteOn() && base) {
      var payload = { label_en: base.label_en, label_es: base.label_es, view: base.view, rooms: base.rooms, areas: base.areas };
      sb.from("floor_maps").upsert({
        hotel: hotel, floor: Number(ui.floor), map: payload, updated_at: new Date().toISOString()
      }, { onConflict: "hotel,floor" }).then(function () { render(); }, function () { render(); });
      return;
    }
    render();
  }

  function wholeFloor() {
    ui.scale = 1;
    ui.x = 0;
    ui.y = 0;
    ui.userZoom = true;
    clampPan();
    applyZoom();
  }
  function readableZoom() {
    var stage = document.getElementById("fmStage");
    var floor = shownFloor(hotelNow(), ui.floor);
    if (!stage || !floor || !stage.clientWidth) return;
    var px = 46 * (stage.clientWidth / floor.view.w);
    ui.scale = px < 36 ? Math.min(3.2, 48 / px) : 1;
    ui.x = 0;
    ui.y = 0;
    clampPan();
    applyZoom();
  }
  function applyZoom() {
    var z = document.getElementById("fmZoom");
    if (!z) return;
    z.style.transform = "translate(" + ui.x + "px," + ui.y + "px) scale(" + ui.scale + ")";
  }
  function clampPan() {
    var stage = document.getElementById("fmStage");
    var zoom = document.getElementById("fmZoom");
    if (!stage || !zoom) return;
    var sw = stage.clientWidth;
    var sh = stage.clientHeight;
    var mw = zoom.offsetWidth * ui.scale;
    var mh = zoom.offsetHeight * ui.scale;
    if (mw <= sw) ui.x = (sw - mw) / 2;
    else ui.x = Math.min(0, Math.max(sw - mw, ui.x));
    if (mh <= sh) ui.y = Math.min(24, Math.max(sh - mh, ui.y));
    else ui.y = Math.min(0, Math.max(sh - mh, ui.y));
  }
  function stagePos(clientX, clientY) {
    var rect = document.getElementById("fmStage").getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
  function zoomAt(clientX, clientY, next) {
    var pos = stagePos(clientX, clientY);
    var lx = (pos.x - ui.x) / ui.scale;
    var ly = (pos.y - ui.y) / ui.scale;
    ui.scale = next;
    ui.x = pos.x - lx * next;
    ui.y = pos.y - ly * next;
    ui.userZoom = true;
    clampPan();
    applyZoom();
  }
  function svgPoint(ev) {
    var svg = document.querySelector("#fmZoom svg");
    if (!svg) return { x: 0, y: 0 };
    var pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    var p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  function bind() {
    var rootEl = document.getElementById("fmRoot");
    var stage = document.getElementById("fmStage");
    if (!rootEl || !stage || bound) return;
    bound = true;
    if (!ui.userZoom) readableZoom();
    else applyZoom();
    var pts = {};
    var gesture = null;
    stage.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" && ev.button !== 0) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
      var ids = Object.keys(pts);
      if (ids.length >= 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        var mid = stagePos((a.x + b.x) / 2, (a.y + b.y) / 2);
        gesture = {
          mode: "pinch",
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          scale: ui.scale,
          lx: (mid.x - ui.x) / ui.scale,
          ly: (mid.y - ui.y) / ui.scale
        };
        return;
      }
      var roomEl = ev.target.closest ? ev.target.closest("[data-room]") : null;
      gesture = {
        mode: ui.edit && roomEl ? "room" : "pan",
        x: ev.clientX, y: ev.clientY, moved: false,
        room: roomEl ? roomEl.getAttribute("data-room") : "",
        ox: ui.x, oy: ui.y
      };
      if (gesture.mode === "room") {
        var p = svgPoint(ev);
        var floor = shownFloor(hotelNow(), ui.floor);
        var rec = null;
        if (floor) floor.rooms.forEach(function (r) { if (String(r.n) === gesture.room) rec = r; });
        gesture.dx = rec ? p.x - rec.x : 0;
        gesture.dy = rec ? p.y - rec.y : 0;
        gesture.originX = rec ? rec.x : 0;
        gesture.originY = rec ? rec.y : 0;
        gesture.startP = p;
      }
    });
    stage.addEventListener("pointermove", function (ev) {
      if (!pts[ev.pointerId]) return;
      pts[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(pts);
      if (ids.length >= 2 && gesture && gesture.mode === "pinch") {
        var a = pts[ids[0]], b = pts[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        var mid = stagePos((a.x + b.x) / 2, (a.y + b.y) / 2);
        var next = Math.max(1, Math.min(6, gesture.scale * dist / gesture.dist));
        ui.scale = next;
        ui.x = mid.x - gesture.lx * next;
        ui.y = mid.y - gesture.ly * next;
        ui.userZoom = true;
        clampPan();
        applyZoom();
        ev.preventDefault();
        return;
      }
      if (!gesture || gesture.mode === "pinch") return;
      var dx = ev.clientX - gesture.x;
      var dy = ev.clientY - gesture.y;
      if (Math.hypot(dx, dy) > 6) gesture.moved = true;
      if (gesture.mode === "room" && gesture.moved) {
        var p = svgPoint(ev);
        var g = document.querySelector('.fm-room[data-room="' + gesture.room + '"]');
        if (g) g.setAttribute("transform", "translate(" + (p.x - gesture.dx - gesture.originX) + " " + (p.y - gesture.dy - gesture.originY) + ")");
        ev.preventDefault();
        return;
      }
      if (gesture.mode === "pan" && gesture.moved) {
        ui.x = gesture.ox + dx;
        ui.y = gesture.oy + dy;
        ui.userZoom = true;
        clampPan();
        applyZoom();
      }
    });
    function endPointer(ev) {
      var was = gesture;
      delete pts[ev.pointerId];
      if (Object.keys(pts).length === 0) gesture = null;
      if (was && was.mode === "room" && was.moved) {
        var end = svgPoint(ev);
        moveRoom(hotelNow(), was.room, { setX: was.originX + (end.x - was.startP.x), setY: was.originY + (end.y - was.startP.y) });
        ui.room = was.room;
        var movedDetail = document.getElementById("fmDetail");
        if (movedDetail) movedDetail.innerHTML = detailHtml(hotelNow());
        return;
      }
      if (!was || was.moved || !was.room) return;
      ui.room = was.room;
      var detail = document.getElementById("fmDetail");
      if (detail) detail.innerHTML = detailHtml(hotelNow());
      document.querySelectorAll(".fm-room").forEach(function (el) {
        el.classList.toggle("on", el.getAttribute("data-room") === ui.room);
        var box = el.querySelector(".fm-box");
        if (box) box.setAttribute("stroke-width", el.classList.contains("on") ? "2.5" : "1");
      });
    }
    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", endPointer);
    stage.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      var next = Math.max(1, Math.min(6, ui.scale * (ev.deltaY < 0 ? 1.12 : 0.9)));
      zoomAt(ev.clientX, ev.clientY, next);
    }, { passive: false });
    rootEl.addEventListener("click", function (ev) {
      var t = ev.target.closest ? ev.target.closest("[data-floor],[data-overlay],[data-go],[data-nudge],#fmZoomIn,#fmZoomOut,#fmFit,#fmEdit,#fmSave,#fmReset") : null;
      if (!t || !rootEl.contains(t)) return;
      if (t.id === "fmZoomIn") { zoomAt(stage.getBoundingClientRect().left + stage.clientWidth / 2, stage.getBoundingClientRect().top + stage.clientHeight / 2, Math.min(6, ui.scale * 1.25)); return; }
      if (t.id === "fmZoomOut") { zoomAt(stage.getBoundingClientRect().left + stage.clientWidth / 2, stage.getBoundingClientRect().top + stage.clientHeight / 2, Math.max(1, ui.scale / 1.25)); return; }
      if (t.id === "fmFit") { wholeFloor(); return; }
      if (t.id === "fmEdit") { ui.edit = !ui.edit; ui.notice = ""; render(); return; }
      if (t.id === "fmSave") { saveFloor(); return; }
      if (t.id === "fmReset") { resetFloor(); return; }
      if (t.getAttribute("data-floor")) {
        ui.floor = t.getAttribute("data-floor");
        ui.room = "";
        ui.userZoom = false;
        ui.scale = 1; ui.x = 0; ui.y = 0;
        ui.notice = "";
        render();
        return;
      }
      if (t.getAttribute("data-overlay")) {
        var key = t.getAttribute("data-overlay");
        ui.overlays[key] = !ui.overlays[key];
        render();
        return;
      }
      if (t.getAttribute("data-go")) { jump(t.getAttribute("data-go")); return; }
      if (t.getAttribute("data-nudge") && ui.room) {
        var patch = {};
        patch[t.getAttribute("data-nudge")] = Number(t.getAttribute("data-step"));
        moveRoom(hotelNow(), ui.room, patch);
        var detail = document.getElementById("fmDetail");
        if (detail) detail.innerHTML = detailHtml(hotelNow());
      }
    });
    rootEl.addEventListener("change", function (ev) {
      var input = ev.target;
      if (!input.getAttribute || !input.getAttribute("data-edit") || !ui.room) return;
      var key = input.getAttribute("data-edit");
      var patch = {};
      if (key === "x") patch.setX = input.value;
      else if (key === "y") patch.setY = input.value;
      else patch[key] = input.value;
      moveRoom(hotelNow(), ui.room, patch);
    });
    stage.addEventListener("keydown", function (ev) {
      var roomEl = ev.target.closest ? ev.target.closest("[data-room]") : null;
      if (!roomEl || (ev.key !== "Enter" && ev.key !== " ")) return;
      ev.preventDefault();
      ui.room = roomEl.getAttribute("data-room");
      var detail = document.getElementById("fmDetail");
      if (detail) detail.innerHTML = detailHtml(hotelNow());
    });
  }

  if (typeof M !== "undefined") M.floors = ["🗺️", "Floor map"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Floor map"] = "Mapa del piso";
  if (typeof V !== "undefined") V.floors = pageHtml;
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try {
        var hotel = hotelNow();
        var map = baseMap(hotel);
        var n = map ? countRooms(map) : 0;
        card = '<button type="button" class="tile fm-home raw" onclick="go(\'floors\')"><b>🗺️ ' + esc(L("Floor map", "Mapa del piso")) + "</b><small>" +
          esc(map ? (n + " " + L("rooms", "habitaciones") + " · " + L(map.name_en, map.name_es)) : L("Not drawn for this hotel yet.", "Este hotel todavía no tiene mapa.")) +
          "</small></button>";
      } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      if (list.indexOf("floors") < 0) list.push("floors");
      return list;
    };
  }
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("floors") < 0) NOCOLS.push("floors"); } catch (e) {}
  try { if (typeof RSEC !== "undefined") RSEC[1][2].push("floors"); } catch (e2) {}
  try { if (typeof RQL !== "undefined") RQL.floors = ["Floor map", "Mapa del piso"]; } catch (e3) {}

  var style = document.createElement("style");
  style.textContent = [
    ".fm{display:block;width:100%}",
    ".fm-note,.fm-hint{font-size:13px;color:#3c4658;margin:6px 0}",
    ".fm-ok{background:#e6f4ea;color:#15642f;border-radius:8px;padding:8px}",
    ".fm-err{background:#fde2e1;color:#8a1c1c;border-radius:8px;padding:8px}",
    ".fm-tabs,.fm-overlays,.fm-tools,.fm-actions,.fm-legend{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}",
    ".fm-tabs button,.fm-overlays button,.fm-tools button,.fm-actions button{min-height:44px}",
    ".fm-tabs button{flex:1;background:#e6ebf2;border:0;font-weight:700;border-radius:8px}",
    ".fm-tabs button.on,.fm-tog.on{background:#14365d;color:#fff}",
    ".fm-tog{background:#e6ebf2;border:0;border-radius:999px;padding:0 12px;font-weight:700}",
    ".fm-legend{font-size:12px;color:#1c2430}",
    ".fm-key{display:inline-flex;align-items:center;gap:4px}",
    ".fm-swatch{width:14px;height:14px;border-radius:3px;display:inline-block;border:1px solid #1c2430}",
    ".fm-swatch.fm-dirty{background:#f4c45a}.fm-swatch.fm-clean{background:#d6e8ff}.fm-swatch.fm-inspected{background:#1f8a4c}.fm-swatch.fm-ooo{background:#6b7280}.fm-swatch.fm-none{background:#f7f4ee}",
    ".fm-swatch.fm-occbar{background:#14365d;width:8px}",
    ".fm-stage{width:100%;height:62vh;min-height:280px;overflow:hidden;background:#eef2f6;border-radius:12px;touch-action:none;position:relative}",
    ".fm-zoom{width:100%;transform-origin:0 0}",
    ".fm-svg{width:100%;height:auto;display:block}",
    ".fm-bg{fill:#f8fafc}",
    ".fm-area text{font-size:11px;fill:#1c2430;font-weight:700}",
    ".fm-area.fm-corridor rect{fill:#e2e8f0;stroke:#cbd5e1}",
    ".fm-area.fm-pool rect{fill:#7dd3fc;stroke:#0369a1}",
    ".fm-area.fm-stair rect{fill:#facc15;stroke:#a16207}",
    ".fm-area.fm-elevator rect{fill:#c4b5fd;stroke:#6d28d9}",
    ".fm-area.fm-lounge rect{fill:#fdba74;stroke:#c2410c}",
    ".fm-area.fm-breakfast rect{fill:#fde047;stroke:#a16207}",
    ".fm-area.fm-fitness rect{fill:#86efac;stroke:#166534}",
    ".fm-area.fm-meeting rect{fill:#ddd6fe;stroke:#6d28d9}",
    ".fm-area.fm-lobby rect{fill:#93c5fd;stroke:#1d4ed8}",
    ".fm-area.fm-laundry rect{fill:#fb923c;stroke:#9a3412}",
    ".fm-area.fm-vending rect{fill:#e5e7eb;stroke:#374151}",
    ".fm-area.fm-linen rect{fill:#fed7aa;stroke:#9a3412}",
    ".fm-area.fm-open rect{fill:#e2e8f0;stroke:#64748b}",
    ".fm-area.fm-exit rect{fill:#fecaca;stroke:#b91c1c}",
    ".fm-room{cursor:pointer}",
    ".fm-num,.fm-hk{font-weight:800;text-anchor:middle;pointer-events:none}",
    ".fm-num{font-size:12px}.fm-hk{font-size:8px}",
    ".fm-room:focus{outline:none}",
    ".fm-room:focus .fm-box{stroke:#9a3412;stroke-width:3}",
    ".fm-detail{background:#fff;border-radius:12px;padding:12px;margin-top:8px;box-shadow:0 1px 3px #0001}",
    ".fm-detail-h{display:flex;flex-wrap:wrap;gap:6px;align-items:center}",
    ".fm-detail-h b{font-size:28px}",
    ".fm-pill{border-radius:999px;padding:2px 8px;font-size:12px;font-weight:700;background:#e6ebf2}",
    ".fm-pill.fm-dirty{background:#f4c45a}.fm-pill.fm-clean{background:#d6e8ff}.fm-pill.fm-inspected{background:#1f8a4c;color:#fff}.fm-pill.fm-ooo{background:#6b7280;color:#fff}.fm-pill.fm-occ{background:#14365d;color:#fff}.fm-pill.fm-dnd{background:#c0262d;color:#fff}",
    ".fm-actions{display:flex;flex-direction:column;gap:8px}",
    ".fm-actions .btn,.fm-actions .btn2{width:100%}",
    ".fm-editor{margin-top:8px}",
    ".fm-field{display:flex;flex-direction:column;font-weight:700;margin:6px 0}",
    ".fm-nudge{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}",
    ".fm-nudge button{min-height:44px;font-size:20px;background:#e6ebf2;border:0;border-radius:8px}",
    ".fm-home{width:100%;margin:0 0 8px;text-align:left}",
    ".fm-home small{display:block;font-weight:500}",
    ".fm-notes{margin-top:8px}",
    "@media(min-width:800px){.fm-actions{flex-direction:row}.fm-actions .btn,.fm-actions .btn2{width:auto;flex:1}}"
  ].join("");
  document.head.appendChild(style);

  if (typeof render === "function") {
    var prevRender = render;
    root.render = function () {
      bound = false;
      var result = prevRender.apply(this, arguments);
      try { if (typeof S !== "undefined" && S && S.tab === "floors") bind(); } catch (e) {}
      return result;
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
