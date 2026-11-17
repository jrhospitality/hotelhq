/* Housekeeper room problems.
   One screen: room, a problem tile, a photo, then send.
   A known room is 3 taps plus the photo. With no room, they pick one.
   The room is never guessed.
   Photos go to the private work-order-photos bucket. Points are an
   insert-only ledger: +5 on submit, and a reversal when the same room
   and problem are already open, or when maintenance rejects it.
   Demo names that end in (EX) are example data. No dollar value. */
(function (root) {
  "use strict";

  var POINTS = 5;
  var CATEGORIES = [
    { id: "plumbing", en: "Plumbing / leak", es: "Plomería / fuga", icon: "💧", priority: "High" },
    { id: "toilet", en: "Toilet", es: "Inodoro", icon: "🚽", priority: "High" },
    { id: "shower", en: "Shower / tub", es: "Regadera / tina", icon: "🚿", priority: "High" },
    { id: "hvac", en: "AC / heat", es: "Aire / calefacción", icon: "❄️", priority: "High" },
    { id: "tv", en: "TV / remote", es: "TV / control", icon: "📺", priority: "Med" },
    { id: "electrical", en: "Lights / electrical", es: "Luces / eléctrico", icon: "💡", priority: "High" },
    { id: "door", en: "Door / lock", es: "Puerta / cerradura", icon: "🚪", priority: "Med" },
    { id: "furniture", en: "Furniture", es: "Muebles", icon: "🛏️", priority: "Med" },
    { id: "window", en: "Window / blinds", es: "Ventana / persianas", icon: "🪟", priority: "Med" },
    { id: "pest", en: "Pest", es: "Plaga", icon: "🐜", priority: "High" },
    { id: "appliance", en: "Appliance", es: "Aparato", icon: "🧊", priority: "Med" },
    { id: "other", en: "Other", es: "Otro", icon: "➕", priority: "Med" }
  ];
  var OPEN = { open: 1, "in progress": 1, in_progress: 1 };

  function langOf(lang) { return lang === "es" ? "es" : "en"; }
  function tx(lang, en, es) { return langOf(lang) === "es" ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }
  function monthOf(iso) {
    var s = String(iso || "");
    return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : "";
  }
  function isOpenStatus(status) {
    return !!OPEN[String(status || "").trim().toLowerCase()];
  }
  function roomKey(room) { return String(room == null ? "" : room).trim().toLowerCase(); }

  function taps(roomKnown) { return roomKnown ? 3 : 4; }

  function missing(draft) {
    draft = draft || {};
    if (!roomKey(draft.room)) return "room";
    if (!categoryById(draft.category)) return "category";
    if (!draft.photo) return "photo";
    return "";
  }
  function canSubmit(draft) { return !missing(draft); }

  function roomChoices(rooms, me, query) {
    var q = String(query || "").trim().toLowerCase();
    var list = rooms || [];
    if (q) {
      return list.filter(function (r) {
        return String(r && r.n != null ? r.n : "").toLowerCase().indexOf(q) === 0;
      }).map(function (r) { return String(r.n); }).slice(0, 12);
    }
    if (!me) return [];
    return list.filter(function (r) { return r && r.hk === me; }).map(function (r) { return String(r.n); }).slice(0, 16);
  }

  function openDuplicate(orders, room, category, exceptId) {
    var key = roomKey(room);
    if (!key || !categoryById(category)) return null;
    var found = null;
    (orders || []).forEach(function (row) {
      if (found) return;
      if (exceptId != null && String(row.id) === String(exceptId)) return;
      if (row.category !== category) return;
      if (roomKey(row.room) !== key) return;
      if (!isOpenStatus(row.s || row.status)) return;
      found = row;
    });
    return found;
  }

  function recordSubmit(orders, ledger, draft, nowIso) {
    var gap = missing(draft);
    if (gap) return { ok: false, reason: gap, order: null, ledger: ledger || [], points: 0, duplicate: false };
    draft = draft || {};
    var cat = categoryById(draft.category);
    var lang = langOf(draft.lang);
    var note = String(draft.note || "").trim().slice(0, 140);
    var staff = String(draft.staff || "").trim();
    var room = String(draft.room).trim();
    var dup = openDuplicate(orders, room, cat.id, null);
    var id = draft.id || ("hk" + (ledger || []).length + "-" + (orders || []).length);
    var title = tx(lang, cat.en, cat.es);
    if (note) title += " — " + note;
    if (staff) title += " (reported by " + staff + ")";
    var order = {
      id: id,
      room: room,
      category: cat.id,
      note: note,
      t: title,
      p: cat.priority,
      s: dup ? "Duplicate" : "Open",
      by: staff,
      at: nowIso || "",
      photo: draft.photo === true ? "attached" : draft.photo,
      example: !!draft.example
    };
    var earn = {
      id: "pt-" + ((ledger || []).length + 1),
      staff: staff,
      room: room,
      category: cat.id,
      points: POINTS,
      reason: "earn",
      reversalOf: null,
      at: nowIso || "",
      woId: id,
      example: !!draft.example
    };
    var next = (ledger || []).concat([earn]);
    var net = POINTS;
    if (dup) {
      next = next.concat([{
        id: "pt-" + (next.length + 1),
        staff: staff,
        room: room,
        category: cat.id,
        points: -POINTS,
        reason: "duplicate",
        reversalOf: earn.id,
        at: nowIso || "",
        woId: dup.id,
        example: !!draft.example
      }]);
      net = 0;
    }
    return { ok: true, reason: "", order: order, ledger: next, points: net, duplicate: !!dup, existingId: dup ? dup.id : "" };
  }

  function recordReject(ledger, woId, nowIso) {
    ledger = ledger || [];
    var earn = null;
    ledger.forEach(function (row) {
      if (String(row.woId) === String(woId) && row.reason === "earn" && row.points > 0) earn = row;
    });
    if (!earn) return { ledger: ledger, points: 0 };
    var reversed = ledger.some(function (row) { return row.reversalOf === earn.id; });
    if (reversed) return { ledger: ledger, points: 0 };
    var rev = {
      id: "pt-" + (ledger.length + 1),
      staff: earn.staff,
      room: earn.room,
      category: earn.category,
      points: -earn.points,
      reason: "rejected",
      reversalOf: earn.id,
      at: nowIso || "",
      woId: earn.woId,
      example: !!earn.example
    };
    return { ledger: ledger.concat([rev]), points: rev.points };
  }

  function total(ledger, staff, month) {
    return (ledger || []).reduce(function (sum, row) {
      if (staff && row.staff !== staff) return sum;
      if (month && monthOf(row.at) !== month) return sum;
      return sum + (Number(row.points) || 0);
    }, 0);
  }

  function board(ledger, month) {
    var map = {};
    var example = {};
    (ledger || []).forEach(function (row) {
      if (!row || !row.staff) return;
      if (month && monthOf(row.at) !== month) return;
      map[row.staff] = (map[row.staff] || 0) + (Number(row.points) || 0);
      if (row.example || /\(EX\)/.test(row.staff)) example[row.staff] = true;
    });
    return Object.keys(map).map(function (name) {
      return { staff: name, points: map[name], example: !!example[name] };
    }).sort(function (a, b) {
      return b.points - a.points || a.staff.localeCompare(b.staff);
    });
  }

  function exampleLedger(month) {
    month = month || "2026-11";
    function row(id, staff, room, category, points, reason, reversalOf, day, woId) {
      return {
        id: id, staff: staff, room: room, category: category, points: points, reason: reason,
        reversalOf: reversalOf, at: month + day, woId: woId, example: true
      };
    }
    return [
      row("ex-a1", "Example Keeper A (EX)", "214", "plumbing", 5, "earn", null, "-03T15:00:00.000Z", "ex-wo-a1"),
      row("ex-a2", "Example Keeper A (EX)", "305", "toilet", 5, "earn", null, "-04T15:00:00.000Z", "ex-wo-a2"),
      row("ex-b1", "Example Keeper B (EX)", "118", "hvac", 5, "earn", null, "-05T15:00:00.000Z", "ex-wo-b1"),
      row("ex-b2", "Example Keeper B (EX)", "118", "hvac", -5, "duplicate", "ex-b1", "-05T15:05:00.000Z", "ex-wo-b1")
    ];
  }

  function viewModel(opts) {
    opts = opts || {};
    var month = opts.month || "";
    var ledger = (opts.ledger || []).slice();
    if (opts.demo) ledger = ledger.concat(exampleLedger(month));
    return {
      you: total(ledger, opts.staff || "", month),
      board: board(ledger, month),
      example: !!opts.demo
    };
  }

  function buttonHtml(lang, room) {
    var label = tx(lang, "Report maintenance problem", "Reportar problema de mantenimiento");
    var sub = tx(lang, "Photo required", "Foto requerida");
    var arg = JSON.stringify(room == null ? "" : String(room));
    return '<button type="button" class="hk-report-go" onclick=\'HKReport.open(' + arg + ')\'><span>' + esc(label) + '</span><small>' + esc(sub) + '</small></button>';
  }

  function pointsHtml(opts) {
    opts = opts || {};
    var lang = langOf(opts.lang);
    var model = opts.model || viewModel(opts);
    var you = tx(lang, "Your points this month", "Tus puntos este mes");
    var title = opts.mode === "gm"
      ? tx(lang, "Housekeeper points", "Puntos de camaristas")
      : tx(lang, "Points", "Puntos");
    var rows = model.board.map(function (row) {
      var mark = row.example ? ' <span class="ex">' + esc(tx(lang, "Example", "Ejemplo")) + "</span>" : "";
      return "<li><span>" + esc(row.staff) + mark + "</span><b>" + row.points + "</b></li>";
    }).join("");
    var example = model.example
      ? '<span class="ex">' + esc(tx(lang, "Example data", "Datos de ejemplo")) + "</span>"
      : "";
    var yours = opts.mode === "gm" ? "" : '<p class="hk-you"><b>' + model.you + '</b> ' + esc(you) + "</p>";
    return '<section class="hk-points" id="' + (opts.mode === "gm" ? "hkGmPoints" : "hkMyPoints") + '">' +
      example + "<h3>" + esc(title) + "</h3>" + yours +
      '<ol class="hk-board">' + (rows || "<li>" + esc(tx(lang, "No points yet.", "Aún no hay puntos.")) + "</li>") + "</ol></section>";
  }

  var api = {
    POINTS: POINTS,
    CATEGORIES: CATEGORIES,
    categoryById: categoryById,
    taps: taps,
    missing: missing,
    canSubmit: canSubmit,
    roomChoices: roomChoices,
    openDuplicate: openDuplicate,
    recordSubmit: recordSubmit,
    recordReject: recordReject,
    total: total,
    board: board,
    exampleLedger: exampleLedger,
    viewModel: viewModel,
    buttonHtml: buttonHtml,
    pointsHtml: pointsHtml,
    monthOf: monthOf
  };
  root.HKReport = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var draft = blank();
  function blank() { return { room: "", category: "", note: "", photo: "", file: null, query: "" }; }
  function uiLang() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function staffName() {
    try { return typeof cw === "function" ? cw() : ""; } catch (e) { return ""; }
  }
  function hotelRooms() {
    try { return (D().rooms || []).slice(); } catch (e) { return []; }
  }
  function orders() {
    try { return D().wo || []; } catch (e) { return []; }
  }
  function ledger() {
    try { return (D().hkReportLedger || []).slice(); } catch (e) { return []; }
  }
  function putLedger(rows) {
    D().hkReportLedger = rows.filter(function (row) { return !row.example; });
  }
  function demoMode() {
    try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
    try { if (root.HOTELHQ_CONFIG && String(root.HOTELHQ_CONFIG.mode) === "live") return false; } catch (e2) {}
    return true;
  }
  function thisMonth() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function toast(text) {
    if (typeof showToast === "function") { showToast(text); return; }
    var el = document.createElement("div");
    el.className = "hk-toast";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2400);
  }

  function sheetHtml() {
    var lang = uiLang();
    var known = !!roomKey(draft.room);
    var rooms = roomChoices(hotelRooms(), staffName(), draft.query);
    var roomBlock = known
      ? '<p class="hk-room-now">' + esc(tx(lang, "Room", "Cuarto")) + " <b>" + esc(draft.room) + '</b> <button type="button" class="hk-link" onclick="HKReport.clearRoom()">' + esc(tx(lang, "Change", "Cambiar")) + "</button></p>"
      : '<label class="hk-lab" for="hkRoomQ">' + esc(tx(lang, "Room", "Cuarto")) + '</label><input id="hkRoomQ" inputmode="numeric" autocomplete="off" placeholder="' + esc(tx(lang, "Type a room number", "Escribe el número")) + '" aria-label="' + esc(tx(lang, "Room", "Cuarto")) + '" oninput="HKReport.filterRooms(this.value)"><div class="hk-rooms">' +
        (rooms.length ? rooms.map(function (n) {
          return '<button type="button" class="hk-room" onclick=\'HKReport.pickRoom(' + JSON.stringify(n) + ')\'>' + esc(n) + "</button>";
        }).join("") : '<p class="hk-hint">' + esc(tx(lang, "Pick a room. Nothing is selected for you.", "Elige un cuarto. Nada queda elegido solo.")) + "</p>") +
        "</div>";
    var tiles = CATEGORIES.map(function (cat) {
      var on = draft.category === cat.id ? " on" : "";
      return '<button type="button" class="hk-tile' + on + '" aria-pressed="' + (on ? "true" : "false") + '" onclick=\'HKReport.pickCat(' + JSON.stringify(cat.id) + ')\'><span aria-hidden="true">' + cat.icon + "</span>" + esc(tx(lang, cat.en, cat.es)) + "</button>";
    }).join("");
    var mic = speechOk()
      ? '<button type="button" class="hk-mic" onclick="HKReport.listen()">' + esc(tx(lang, "Speak", "Hablar")) + "</button>"
      : "";
    var photoName = draft.file ? draft.file.name : "";
    var ready = canSubmit({ room: draft.room, category: draft.category, photo: draft.photo });
    return '<div class="hk-sheet" role="dialog" aria-modal="true" aria-labelledby="hkReportTitle"><button type="button" class="hk-x" aria-label="' + esc(tx(lang, "Close", "Cerrar")) + '" onclick="HKReport.close()">✕</button>' +
      '<h2 id="hkReportTitle">' + esc(tx(lang, "Report maintenance problem", "Reportar problema de mantenimiento")) + "</h2>" +
      roomBlock +
      '<div class="hk-tiles">' + tiles + "</div>" +
      '<label class="hk-lab" for="hkNote">' + esc(tx(lang, "Note, optional", "Nota, opcional")) + "</label>" +
      '<div class="hk-note-row"><input id="hkNote" maxlength="140" value="' + esc(draft.note) + '" oninput="HKReport.note(this.value)">' + mic + "</div>" +
      '<label class="hk-cam">' + esc(draft.photo ? tx(lang, "Change photo", "Cambiar foto") : tx(lang, "Take photo", "Tomar foto")) +
      '<input id="hkPhoto" type="file" accept="image/*" capture="environment" onchange="HKReport.onPhoto(this)"></label>' +
      (photoName ? '<p class="hk-photo-name">' + esc(photoName) + "</p>" : '<p class="hk-hint">' + esc(tx(lang, "A photo is required.", "La foto es obligatoria.")) + "</p>") +
      '<button type="button" id="hkSend" class="hk-send" ' + (ready ? "" : "disabled") + ' onclick="HKReport.submit()">' + esc(tx(lang, "Submit", "Enviar")) + "</button></div>";
  }

  function paint() {
    var host = document.getElementById("hkReport");
    if (!host) return;
    host.innerHTML = sheetHtml();
    var note = document.getElementById("hkNote");
    if (note && document.activeElement && document.activeElement.id === "hkRoomQ") return;
  }
  function speechOk() {
    return !!(root.SpeechRecognition || root.webkitSpeechRecognition);
  }

  api.open = function (room) {
    var given = room == null ? "" : String(room).trim();
    draft = blank();
    if (given) draft.room = given;
    var host = document.getElementById("hkReport");
    if (!host) {
      host = document.createElement("div");
      host.id = "hkReport";
      document.body.appendChild(host);
    }
    paint();
  };
  api.close = function () {
    var host = document.getElementById("hkReport");
    if (host) host.remove();
    draft = blank();
  };
  api.clearRoom = function () { draft.room = ""; draft.query = ""; paint(); };
  api.pickRoom = function (room) { draft.room = String(room || "").trim(); paint(); };
  api.filterRooms = function (q) { draft.query = q || ""; paint(); var el = document.getElementById("hkRoomQ"); if (el) { el.focus(); el.value = draft.query; } };
  api.pickCat = function (id) { if (categoryById(id)) draft.category = id; paint(); };
  api.note = function (v) { draft.note = String(v || "").slice(0, 140); };
  api.onPhoto = function (input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    draft.file = file;
    draft.photo = "attached";
    paint();
  };
  api.listen = function () {
    var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!SR) return false;
    var rec = new SR();
    rec.lang = uiLang() === "es" ? "es-MX" : "en-US";
    rec.onresult = function (ev) {
      var said = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : "";
      draft.note = String(said || "").slice(0, 140);
      paint();
    };
    try { rec.start(); } catch (e) { return false; }
    return true;
  };

  async function uploadPhoto(file) {
    if (!file || typeof useRemote !== "function" || !useRemote() || !root.sb) return null;
    var hotel = S.hotel;
    var safe = String(file.name || "photo.jpg").replace(/[^A-Za-z0-9._-]/g, "_");
    var path = hotel + "/hk-report/" + Date.now() + "-" + safe;
    var up = await root.sb.storage.from("work-order-photos").upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (up.error) return null;
    var signed = await root.sb.storage.from("work-order-photos").createSignedUrl(path, 3600);
    return { path: path, url: signed.data && signed.data.signedUrl || "" };
  }

  api.submit = async function () {
    if (!canSubmit(draft)) { paint(); return; }
    var now = new Date().toISOString();
    var result = recordSubmit(orders(), ledger(), {
      room: draft.room,
      category: draft.category,
      note: draft.note,
      photo: draft.photo,
      staff: staffName(),
      lang: uiLang(),
      example: false,
      id: "hk" + Date.now()
    }, now);
    if (!result.ok) return;
    var row = result.order;
    if (draft.file && typeof useRemote === "function" && useRemote()) {
      var up = await uploadPhoto(draft.file);
      if (!up) {
        toast(tx(uiLang(), "The photo did not save. Try again.", "La foto no se guardó. Intenta otra vez."));
        return;
      }
      row.photo_paths = [up.path];
      row.photo = up.url;
    }
    row.comments = [];
    D().wo = D().wo || [];
    D().wo.unshift(row);
    putLedger(result.ledger);
    if (typeof save === "function") save();
    api.close();
    if (typeof render === "function") render();
    var lang = uiLang();
    toast(result.duplicate
      ? tx(lang, "Already open for this room. No points.", "Ya está abierto en este cuarto. Sin puntos.")
      : tx(lang, "Sent to maintenance. +5 points", "Enviado a mantenimiento. +5 puntos"));
  };

  api.markRejected = function (order) {
    if (!order) return;
    if (!demoMode()) return;
    var next = recordReject(ledger(), order.id, new Date().toISOString());
    putLedger(next.ledger);
  };

  function modelFor(staff) {
    return viewModel({ ledger: ledger(), staff: staff, month: thisMonth(), demo: demoMode(), lang: uiLang() });
  }
  function homeBits() {
    var lang = uiLang();
    var role = "";
    try { role = (typeof authRole === "function" && authRole()) || S.role || ""; } catch (e) { role = ""; }
    if (role !== "Housekeeper" && role !== "GM" && role !== "AGM") return;
    var today = document.getElementById("hhqToday") || document.getElementById("app");
    if (!today) return;
    if (role === "Housekeeper" && !document.getElementById("hkReportHome")) {
      var box = document.createElement("div");
      box.id = "hkReportHome";
      box.innerHTML = buttonHtml(lang, "") + pointsHtml({ lang: lang, model: modelFor(staffName()) });
      var next = document.getElementById("hqNext");
      if (next && next.parentNode) next.parentNode.insertBefore(box, next.nextSibling);
      else today.appendChild(box);
    }
    if ((role === "GM" || role === "AGM") && !document.getElementById("hkGmPoints")) {
      var card = document.createElement("div");
      card.innerHTML = pointsHtml({ lang: lang, mode: "gm", model: modelFor("") });
      today.appendChild(card);
    }
  }

  if (typeof root.myRoomCard === "function") {
    var prevCard = root.myRoomCard;
    root.myRoomCard = function (x) {
      var html = String(prevCard.apply(this, arguments) || "");
      var room = x && x.n != null ? String(x.n) : "";
      if (!room || html.indexOf("hk-report-go") >= 0) return html;
      return html.replace(/<\/div>\s*$/, buttonHtml(uiLang(), room) + "</div>");
    };
  }
  if (typeof root.myRoomsPage === "function") {
    var prevPage = root.myRoomsPage;
    root.myRoomsPage = function () {
      var html = String(prevPage.apply(this, arguments) || "");
      if (html.indexOf("hkReportPage") >= 0) return html;
      var block = '<div id="hkReportPage">' + buttonHtml(uiLang(), "") + pointsHtml({ lang: uiLang(), model: modelFor(staffName()) }) + "</div>";
      if (html.indexOf("</h2>") >= 0) return html.replace("</h2>", "</h2>" + block);
      return block + html;
    };
  }
  if (typeof root.uxSheet === "function") {
    var prevSheet = root.uxSheet;
    root.uxSheet = function (kind) {
      var role = "";
      try { role = S.role; } catch (e) { role = ""; }
      if (kind === "wo" && role === "Housekeeper") return api.open("");
      return prevSheet.apply(this, arguments);
    };
  }
  if (typeof root.woSet === "function") {
    var prevSet = root.woSet;
    root.woSet = function (i, v) {
      var order = null;
      try { order = D().wo[i]; } catch (e) { order = null; }
      if (order && v === "Rejected" && order.s !== "Rejected") api.markRejected(order);
      return prevSet.apply(this, arguments);
    };
  }

  var css = document.createElement("style");
  css.id = "hkReportCss";
  css.textContent = [
    ".hk-report-go{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:2px;width:100%;height:auto;min-height:56px;margin:8px 0;padding:12px 16px;border:0;border-radius:14px;background:#0c3d5c;color:#fff;font-size:18px;font-weight:800;line-height:1.25;text-align:left;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:break-word}",
    ".hk-report-go span{display:block;width:100%;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:break-word}",
    ".hk-report-go small{display:block;font-size:14px;font-weight:650;color:#d7e6ef;white-space:normal}",
    "#hkReport{position:fixed;inset:0;z-index:80;background:rgba(8,24,36,.45);display:flex;align-items:flex-end;justify-content:center}",
    ".hk-sheet{background:#f4f6f8;width:min(560px,100%);max-height:100%;overflow:auto;border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}",
    ".hk-sheet h2{margin:0 0 8px;padding-right:56px;color:#0c3d5c;font-size:28px;line-height:1.2;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:break-word}",
    ".hk-x{position:sticky;top:0;float:right;min-width:48px;min-height:48px;border:0;border-radius:12px;background:#fff;color:#0c3d5c;font-size:18px}",
    ".hk-lab{display:block;margin:10px 0 4px;font-size:15px;font-weight:750;color:#243140}",
    ".hk-room-now{font-size:18px;margin:8px 0}",
    ".hk-link{min-height:48px;border:0;background:transparent;color:#0c3d5c;font-weight:800;font-size:17px}",
    ".hk-rooms{display:flex;flex-wrap:wrap;gap:8px}",
    ".hk-room{min-width:72px;min-height:48px;border:1px solid #d5dde6;border-radius:12px;background:#fff;color:#14202b;font-size:18px;font-weight:800}",
    "#hkRoomQ,#hkNote{width:100%;min-height:48px;font-size:17px;border:1px solid #cfd6df;border-radius:12px;padding:8px 12px;box-sizing:border-box}",
    ".hk-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}",
    ".hk-tile{min-height:72px;border:1px solid #d5dde6;border-radius:14px;background:#fff;color:#14202b;font-size:17px;font-weight:750;padding:8px;text-align:left}",
    ".hk-tile span{display:block;font-size:22px;line-height:1.2}",
    ".hk-tile.on{background:#0c3d5c;color:#fff;border-color:#0c3d5c}",
    ".hk-note-row{display:flex;gap:8px;align-items:center}",
    ".hk-note-row input{flex:1;min-width:0}",
    ".hk-mic,.hk-cam{min-height:48px;border:1px solid #0c3d5c;border-radius:12px;background:#fff;color:#0c3d5c;font-size:17px;font-weight:800;padding:8px 12px}",
    ".hk-cam{display:flex;align-items:center;justify-content:center;width:100%;margin-top:10px;box-sizing:border-box}",
    ".hk-cam input{position:absolute;width:1px;height:1px;opacity:0}",
    ".hk-hint,.hk-photo-name{font-size:15px;color:#3c4a59;margin:6px 0}",
    ".hk-send{width:100%;min-height:52px;margin-top:8px;border:0;border-radius:14px;background:#0c3d5c;color:#fff;font-size:18px;font-weight:800}",
    ".hk-send[disabled]{background:#d5dde6;color:#243140}",
    ".hk-points{background:#fff;border:1px solid #e2e6ec;border-left:4px solid #0c3d5c;border-radius:14px;padding:12px;margin:8px 0}",
    ".hk-points h3{margin:4px 0;color:#0c3d5c}",
    ".hk-you{font-size:17px;margin:4px 0 8px}",
    ".hk-you b{font-size:28px;color:#0c3d5c}",
    ".hk-board{list-style:none;margin:0;padding:0}",
    ".hk-board li{display:flex;justify-content:space-between;gap:8px;min-height:36px;align-items:center;border-top:1px solid #e6ebf2;font-size:17px}",
    ".hk-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#0c3d5c;color:#fff;padding:12px 16px;border-radius:12px;z-index:90;font-weight:700;max-width:92vw}"
  ].join("");
  document.head.appendChild(css);

  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { homeBits(); } catch (e) {}
      return result;
    };
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
