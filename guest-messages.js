/* Unanswered brand guest chats for the front desk, demo site only.
   Front desk and AGM see their own hotel and can mark a sample chat responded.
   A GM sees a waiting count on the GM home. Other roles see nothing.
   This is not guest-issue close-the-loop, a pre-checkout reminder, or the
   one-hour guest-request callback. No live brand chat is connected.
   Later imports write public.guest_chat_messages. This file does not call Supabase.
   Sample text only. No guest names, emails, or phone numbers. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = {
    MSPWE: "Holiday Inn Express Golden Valley",
    MSPAM: "Hampton Inn & Suites MSP Airport/MOA",
    MSPMS: "SpringHill Suites MSP Airport/MOA"
  };
  var SOURCES = {
    ihg_chat: ["IHG guest chat", "Chat de huésped IHG"],
    hilton_chat: ["Hilton guest chat", "Chat de huésped Hilton"],
    marriott_chat: ["Marriott guest chat", "Chat de huésped Marriott"],
    brand_chat: ["Brand guest chat", "Chat de huésped de la marca"]
  };
  var KEY = "jrportal_guest_chats_v1";

  function norm(role) {
    if (root.HHQ && root.HHQ.norm) return root.HHQ.norm(role);
    if (role === "JR Corporate" || role === "corporate" || role === "above_property") return "Above Property";
    if (role === "gm") return "GM";
    if (role === "agm") return "AGM";
    if (role === "front_desk") return "Front Desk";
    return role || "";
  }
  function canRespond(role) {
    role = norm(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "guestchat.respond");
    return role === "Front Desk" || role === "AGM";
  }
  function canCount(role) {
    role = norm(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "guestchat.count");
    return role === "GM";
  }
  function queueHotels(role, hotel) {
    if (!canRespond(role)) return [];
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function countHotels(role, hotel) {
    if (!canCount(role)) return [];
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function safeId(id) { return /^msg-[a-z0-9-]{1,40}$/.test(String(id || "")); }
  function at(now, minutes) {
    var base = now instanceof Date ? now.getTime() : Date.parse(now);
    return new Date(base + minutes * 60000).toISOString();
  }
  function minutesBetween(iso, now) {
    var end = now instanceof Date ? now.getTime() : Date.parse(now);
    var start = Date.parse(iso);
    if (!isFinite(end) || !isFinite(start)) return 0;
    return Math.max(0, Math.round((end - start) / 60000));
  }
  function ageLabel(minutes, lang) {
    minutes = Math.max(0, Math.round(Number(minutes) || 0));
    if (minutes < 60) return minutes + " min";
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    if (minutes < 1440) {
      var hour = lang === "es" ? hours + " h" : hours + (hours === 1 ? " hr" : " hrs");
      return mins ? hour + " " + mins + " min" : hour;
    }
    var days = Math.floor(minutes / 1440);
    var left = Math.floor((minutes % 1440) / 60);
    var day = lang === "es" ? days + (days === 1 ? " día" : " días") : days + (days === 1 ? " day" : " days");
    var rest = lang === "es" ? left + " h" : left + (left === 1 ? " hr" : " hrs");
    return left ? day + " " + rest : day;
  }
  function sourceLabel(source, lang) {
    var pair = SOURCES[source];
    if (!pair) return "";
    return tx(lang, pair[0], pair[1]);
  }
  function message(now, spec) {
    return {
      id: spec.id,
      hotel: spec.hotel,
      source: spec.source || "",
      room: spec.room || "",
      previewEn: spec.en,
      previewEs: spec.es,
      receivedAt: at(now, -spec.age),
      respondedAt: spec.done == null ? "" : at(now, -spec.done),
      respondedBy: spec.by || "",
      externalId: ""
    };
  }
  function buildDemo(now) {
    var stamp = now || new Date().toISOString();
    return {
      messages: [
        message(stamp, { id: "msg-mspwe-towels", hotel: "MSPWE", source: "ihg_chat", room: "214", age: 160, en: "Sample message: extra towels for the sample stay in 214.", es: "Mensaje de ejemplo: toallas extra para la estancia de ejemplo en el 214." }),
        message(stamp, { id: "msg-mspwe-breakfast", hotel: "MSPWE", source: "ihg_chat", room: "118", age: 48, en: "Sample message: what time does the sample breakfast end?", es: "Mensaje de ejemplo: ¿a qué hora termina el desayuno de ejemplo?" }),
        message(stamp, { id: "msg-mspwe-checkout", hotel: "MSPWE", source: "ihg_chat", room: "305", age: 12, en: "Sample message: late checkout for the sample reservation in 305.", es: "Mensaje de ejemplo: salida tarde para la reserva de ejemplo en el 305." }),
        message(stamp, { id: "msg-mspwe-ice", hotel: "MSPWE", source: "ihg_chat", room: "220", age: 300, done: 40, by: "Jordan Lee", en: "Sample message: the ice machine on the sample floor.", es: "Mensaje de ejemplo: la máquina de hielo en el piso de ejemplo." }),
        message(stamp, { id: "msg-mspam-wifi", hotel: "MSPAM", source: "hilton_chat", room: "412", age: 65, en: "Sample message: the sample stay asks for the Wi-Fi name.", es: "Mensaje de ejemplo: la estancia de ejemplo pide el nombre del Wi-Fi." }),
        message(stamp, { id: "msg-mspam-blank", hotel: "MSPAM", source: "", room: "220", age: 20, en: "Sample message: a pillow request for room 220.", es: "Mensaje de ejemplo: una solicitud de almohada para el 220." }),
        message(stamp, { id: "msg-mspam-done", hotel: "MSPAM", source: "hilton_chat", room: "108", age: 180, done: 30, by: "Kim Nguyen", en: "Sample message: extra hangers for the sample stay.", es: "Mensaje de ejemplo: ganchos extra para la estancia de ejemplo." }),
        message(stamp, { id: "msg-mspms-done", hotel: "MSPMS", source: "marriott_chat", room: "506", age: 240, done: 15, by: "Tess Brown", en: "Sample message: the sample stay asked for a late bag pull.", es: "Mensaje de ejemplo: la estancia de ejemplo pidió bajar las maletas más tarde." })
      ]
    };
  }
  function byId(model, id) {
    var found = null;
    (model && model.messages || []).forEach(function (row) { if (row.id === id) found = row; });
    return found;
  }
  function waitingRows(model, hotel, now) {
    return (model.messages || []).filter(function (row) {
      return row.hotel === hotel && !row.respondedAt;
    }).sort(function (a, b) { return Date.parse(a.receivedAt) - Date.parse(b.receivedAt); }).map(function (row) {
      return { id: row.id, source: row.source, room: row.room, minutes: minutesBetween(row.receivedAt, now), previewEn: row.previewEn, previewEs: row.previewEs };
    });
  }
  function summaryFor(model, hotel, now) {
    var rows = HOTELS.indexOf(hotel) < 0 ? [] : waitingRows(model, hotel, now);
    var sources = [];
    rows.forEach(function (row) {
      var label = sourceLabel(row.source, "en");
      if (label && sources.indexOf(row.source) < 0) sources.push(row.source);
    });
    return {
      hotel: hotel,
      waiting: rows.length,
      oldestMinutes: rows.length ? rows[0].minutes : 0,
      sources: sources,
      rows: rows
    };
  }
  function sourceLine(summary, lang) {
    var labels = (summary.sources || []).map(function (source) { return sourceLabel(source, lang); }).filter(Boolean);
    if (!labels.length) return "";
    var name = labels.length > 1 ? tx(lang, "Sources", "Orígenes") : tx(lang, "Source", "Origen");
    return name + ": " + labels.join(" · ");
  }
  function alertCopy(summary, lang) {
    var n = summary.waiting || 0;
    var head = n + " " + (n === 1
      ? tx(lang, "guest chat needs a response", "chat de huésped necesita respuesta")
      : tx(lang, "guest chats need a response", "chats de huéspedes necesitan respuesta"));
    return {
      head: head,
      oldest: tx(lang, "Oldest has waited", "El más antiguo espera") + " " + ageLabel(summary.oldestMinutes, lang),
      source: sourceLine(summary, lang)
    };
  }
  function countCopy(summary, lang) {
    var n = summary.waiting || 0;
    var noun = n === 1
      ? tx(lang, "guest chat waiting", "chat de huésped en espera")
      : tx(lang, "guest chats waiting", "chats de huéspedes en espera");
    return n + " " + noun + " · " + tx(lang, "oldest", "el más antiguo") + " " + ageLabel(summary.oldestMinutes, lang);
  }
  function alertHtml(summary, lang) {
    if (!summary || summary.waiting < 1) return "";
    var copy = alertCopy(summary, lang);
    var source = copy.source ? "<small>" + esc(copy.source) + "</small>" : "";
    return "<button type=\"button\" class=\"desk-chat-alert\" id=\"deskChatAlert\" onclick=\"go('gchat')\">" +
      "<span class=\"desk-chat-badge\">" + summary.waiting + "</span><span><b>" + esc(copy.head) + "</b><small>" + esc(copy.oldest) + "</small>" + source + "</span></button>";
  }
  function countHtml(summary, lang) {
    if (!summary || summary.waiting < 1) return "";
    return "<p class=\"gm-chat-count\" id=\"gmChatCount\">" + esc(countCopy(summary, lang)) + "</p>";
  }
  function respond(model, id, actor, now) {
    actor = actor || {};
    if (!canRespond(actor.role)) return { ok: false, error: "role" };
    if (!safeId(id) || !byId(model, id)) return { ok: false, error: "missing" };
    var row = byId(model, id);
    if (queueHotels(actor.role, actor.hotel).indexOf(row.hotel) < 0) return { ok: false, error: "hotel" };
    var next = clone(model);
    var target = byId(next, id);
    if (!target.respondedAt) {
      target.respondedAt = typeof now === "string" ? now : new Date(now || Date.now()).toISOString();
      target.respondedBy = String(actor.name || "").slice(0, 80);
    }
    return { ok: true, model: next, id: id };
  }
  function applySaved(model, saved) {
    if (!saved || saved.v !== 1) return model;
    var next = clone(model);
    (saved.responded || []).forEach(function (row) {
      if (!row || !safeId(row.id)) return;
      var target = byId(next, row.id);
      if (!target || !row.respondedAt) return;
      target.respondedAt = String(row.respondedAt);
      target.respondedBy = String(row.respondedBy || "").slice(0, 80);
    });
    return next;
  }
  function userOverlay(model, base) {
    var responded = [];
    (model.messages || []).forEach(function (row) {
      var orig = byId(base, row.id);
      if (!orig) return;
      if ((orig.respondedAt || "") !== (row.respondedAt || "")) {
        responded.push({ id: row.id, respondedAt: row.respondedAt, respondedBy: row.respondedBy || "" });
      }
    });
    return { v: 1, responded: responded };
  }
  function messageRow(row) {
    return {
      hotel: row.hotel,
      source: row.source || "",
      room: row.room || "",
      preview_en: row.previewEn,
      preview_es: row.previewEs,
      received_at: row.receivedAt,
      responded_at: row.respondedAt || null,
      responded_name: row.respondedBy || "",
      external_id: row.externalId || ""
    };
  }
  function cardHtml(row, lang, now, acted) {
    var minutes = minutesBetween(row.receivedAt, now);
    var source = sourceLabel(row.source, lang) || tx(lang, "Source unknown", "Origen desconocido");
    var room = row.room ? "<b>" + esc(tx(lang, "Room", "Hab.")) + " " + esc(row.room) + "</b>" : "";
    var body = tx(lang, row.previewEn, row.previewEs);
    var badge = acted
      ? "<span class=\"desk-chat-badge gc-ok\">" + esc(tx(lang, "Done", "Listo")) + "</span>"
      : "<span class=\"desk-chat-badge\">" + esc(ageLabel(minutes, lang)) + "</span>";
    var action = acted
      ? "<small class=\"gc-who\">" + esc(tx(lang, "Responded", "Respondido")) + (row.respondedBy ? " · " + esc(row.respondedBy) : "") + "</small>"
      : "<button type=\"button\" class=\"btn\" onclick=\"gcRespond('" + esc(row.id) + "')\">" + esc(tx(lang, "Mark responded", "Marcar respondido")) + "</button>";
    return "<article class=\"gc-card" + (acted ? " gc-done" : "") + "\" id=\"" + esc(row.id) + "\" data-hotel=\"" + esc(row.hotel) + "\" data-source=\"" + esc(row.source || "") + "\"><div class=\"gc-top\">" +
      room + badge + "</div><p>" + esc(body) + "</p><small class=\"gc-src\">" + esc(source) + "</small>" + action + "</article>";
  }
  function pageHtml(model, actor, view) {
    view = view || {};
    actor = actor || {};
    var lang = view.lang === "es" ? "es" : "en";
    var hotels = queueHotels(actor.role, actor.hotel);
    if (!hotels.length) return "<div class=\"gc\" id=\"gcRoot\" hidden></div>";
    var hotel = hotels[0];
    var now = view.now || new Date().toISOString();
    var summary = summaryFor(model, hotel, now);
    var copy = summary.waiting ? alertCopy(summary, lang) : null;
    var waiting = (model.messages || []).filter(function (row) { return row.hotel === hotel && !row.respondedAt; })
      .sort(function (a, b) { return Date.parse(a.receivedAt) - Date.parse(b.receivedAt); });
    var done = (model.messages || []).filter(function (row) { return row.hotel === hotel && row.respondedAt; })
      .sort(function (a, b) { return Date.parse(b.respondedAt) - Date.parse(a.respondedAt); });
    var banner = copy
      ? "<p class=\"gc-wait\"><b>" + esc(copy.head) + "</b><br>" + esc(copy.oldest) + (copy.source ? "<br>" + esc(copy.source) : "") + "</p>"
      : "<p class=\"gc-clear\">" + esc(tx(lang, "No guest chats are waiting.", "No hay chats de huéspedes en espera.")) + "</p>";
    return "<div class=\"gc\" id=\"gcRoot\" data-hotel=\"" + esc(hotel) + "\"><h2>" + esc(tx(lang, "Guest chats", "Chats de huéspedes")) + "</h2>" +
      "<p class=\"gc-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample guest chats. No real guests. Not a live brand chat.", "Chats de huéspedes de ejemplo. No hay huéspedes reales. No es un chat de marca en vivo.")) + "</p>" +
      "<p class=\"gc-note\">" + esc(hotel + " · " + (NAMES[hotel] || hotel)) + "</p>" + banner +
      "<h3>" + esc(tx(lang, "Waiting", "En espera")) + " <span class=\"desk-chat-badge\">" + waiting.length + "</span></h3>" +
      waiting.map(function (row) { return cardHtml(row, lang, now, false); }).join("") +
      "<h3>" + esc(tx(lang, "Responded", "Respondidos")) + "</h3>" +
      (done.length ? done.map(function (row) { return cardHtml(row, lang, now, true); }).join("") : "<p class=\"gc-note\">" + esc(tx(lang, "None yet.", "Ninguno todavía.")) + "</p>") +
      "</div>";
  }

  var api = {
    HOTELS: HOTELS, NAMES: NAMES, SOURCES: SOURCES,
    norm: norm, canRespond: canRespond, canCount: canCount, queueHotels: queueHotels, countHotels: countHotels, demoUi: demoUi,
    buildDemo: buildDemo, summaryFor: summaryFor, alertCopy: alertCopy, countCopy: countCopy, alertHtml: alertHtml, countHtml: countHtml,
    ageLabel: ageLabel, sourceLine: sourceLine, respond: respond, applySaved: applySaved, userOverlay: userOverlay,
    messageRow: messageRow, pageHtml: pageHtml, minutesBetween: minutesBetween
  };
  root.GuestChats = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  function langNow() { try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; } }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return me ? { role: me.role, hotel: me.hotel || "", name: me.name || "" } : { role: "", hotel: "", name: "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function featureOn(hotel) {
    try { if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "guest_messages") !== false; } catch (e) {}
    return true;
  }
  function readSaved() {
    try { var data = JSON.parse(localStorage.getItem(KEY) || "null"); return data && data.v === 1 ? data : null; } catch (e) { return null; }
  }
  function baseNow() { return buildDemo(new Date().toISOString()); }
  function bundle() { return applySaved(baseNow(), readSaved()); }
  function remember(model) {
    try { localStorage.setItem(KEY, JSON.stringify(userOverlay(model, baseNow()))); } catch (e) {}
  }
  function bootPage() {
    var actor = actorNow();
    if (!featureOn(actor.hotel)) return "<div class=\"gc\" id=\"gcRoot\" hidden></div>";
    return pageHtml(bundle(), actor, { lang: langNow(), now: new Date().toISOString() });
  }
  if (typeof M !== "undefined") M.gchat = ["💬", "Guest chats"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Guest chats"] = "Chats de huéspedes";
  if (typeof V !== "undefined") V.gchat = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = actorNow();
      var hotel = actor.hotel || "";
      try { if (!hotel && typeof S !== "undefined") hotel = S.hotel || ""; } catch (e) {}
      var show = queueHotels(actor.role, actor.hotel).length > 0 && featureOn(actor.hotel || hotel);
      if (show && list.indexOf("gchat") < 0) list.unshift("gchat");
      if (!show) list = list.filter(function (id) { return id !== "gchat"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows && !root.HHQMenus.menuAllows("gchat", actor.role, actor.hotel || hotel, function (h, feature) {
        return feature === "guest_messages" ? featureOn(h) : true;
      })) list = list.filter(function (id) { return id !== "gchat"; });
      return list;
    };
  }
  root.gcRespond = function (id) {
    if (!safeId(id)) return;
    var actor = actorNow();
    var result = respond(bundle(), id, actor, new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  try { if (typeof RSEC !== "undefined" && RSEC[2] && RSEC[2][2].indexOf("gchat") < 0) RSEC[2][2].push("gchat"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("gchat") < 0) NOCOLS.push("gchat"); } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "guest_messages", en: "Guest chats", es: "Chats de huéspedes", order: 12 });

  function mountHome() {
    var alert = document.getElementById("deskChatAlert");
    var count = document.getElementById("gmChatCount");
    if (alert) alert.remove();
    if (count) count.remove();
    if (typeof S === "undefined" || S.tab !== "home") return;
    var actor = actorNow();
    if (!featureOn(actor.hotel)) return;
    var now = new Date().toISOString();
    var model = bundle();
    var lang = langNow();
    if (canRespond(actor.role)) {
      var summary = summaryFor(model, actor.hotel, now);
      var html = alertHtml(summary, lang);
      if (!html) return;
      var hero = document.getElementById("uxHero");
      var app = document.getElementById("app");
      if (hero) hero.insertAdjacentHTML("afterbegin", html);
      else if (app) app.insertAdjacentHTML("afterbegin", html);
      return;
    }
    var surface = "";
    try { surface = norm(S.role || actor.role); } catch (e) { surface = norm(actor.role); }
    if (!canCount(actor.role) || surface !== "GM") return;
    var quiet = countHtml(summaryFor(model, actor.hotel, now), lang);
    if (!quiet) return;
    var glance = document.getElementById("glanceHome");
    var today = document.getElementById("hhqToday");
    if (glance) glance.insertAdjacentHTML("afterend", quiet);
    else if (today) today.insertAdjacentHTML("afterend", quiet);
  }
  var style = document.createElement("style");
  style.textContent = [
    ".desk-chat-alert{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;background:#fdecea;color:#7a1218;border:2px solid #b42318;border-radius:14px;padding:12px 14px;margin:0 0 10px;box-shadow:0 1px 3px rgba(180,35,24,.15)}",
    ".desk-chat-alert b{display:block;font-size:18px;line-height:1.3}",
    ".desk-chat-alert small{display:block;margin-top:2px;font-size:14px;font-weight:750;color:#7a1218}",
    ".desk-chat-badge{display:inline-flex;min-width:28px;height:28px;padding:0 8px;border-radius:999px;background:#b42318;color:#fff;font-size:14px;font-weight:800;align-items:center;justify-content:center;flex:none}",
    ".gm-chat-count{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:8px 12px;margin:8px 0;font-weight:750;color:#9a3412}",
    ".gc-note,.gc-clear{color:#3c4658;font-size:14px;font-weight:650}",
    ".gc-wait{background:#fdecea;border:2px solid #b42318;border-radius:12px;padding:10px 12px;color:#7a1218;font-weight:750}",
    ".gc-card{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:12px;margin:8px 0}",
    ".gc-card p{margin:6px 0}",
    ".gc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}",
    ".gc-src,.gc-who{display:block;color:#3c4658;margin-top:4px}",
    ".gc-done{background:#f7f8fa}",
    ".gc-ok{background:#0f7a3a}",
    ".gc .btn{display:block;width:100%;min-height:44px;margin-top:8px}"
  ].join("");
  document.head.appendChild(style);
  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { mountHome(); } catch (e) {}
      return result;
    };
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
