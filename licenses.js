/* Licenses and permits, demo site only.
   GM sees the hotel they run. Corporate sees every hotel side by side.
   AGM and other staff do not see this section.
   Reminders fire at 90, 60, and 30 days, and again after expiration.
   Live mode loads this file and does not add a menu. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = { MSPWE: "Golden Valley", MSPAM: "Hampton", MSPMS: "SpringHill" };
  var OWNER = { MSPWE: "Avery Cole", MSPAM: "Riley Brooks", MSPMS: "Dana Singh" };
  var TZ = "America/Chicago";
  var KEY = "jrportal_licenses_v1";
  var KINDS = [
    { id: "liquor", en: "Liquor license", es: "Licencia de licores" },
    { id: "food_health", en: "Food and health license", es: "Licencia de alimentos y salud" },
    { id: "lodging", en: "Lodging license", es: "Licencia de hospedaje" },
    { id: "elevator", en: "Elevator permit", es: "Permiso de elevador" },
    { id: "boiler", en: "Boiler certificate", es: "Certificado de caldera" },
    { id: "fire_alarm", en: "Fire alarm certificate", es: "Certificado de alarma de incendio" },
    { id: "sprinkler", en: "Sprinkler certificate", es: "Certificado de rociadores" },
    { id: "pool", en: "Pool permit", es: "Permiso de alberca" },
    { id: "business", en: "Business license", es: "Licencia comercial" }
  ];

  function normRole(role) {
    if (role === "JR Corporate" || role === "above_property" || role === "Above Property") return "Above Property";
    if (role === "gm" || role === "GM") return "GM";
    if (role === "agm" || role === "AGM") return "AGM";
    return role || "";
  }
  function isCorporate(role) { return normRole(role) === "Above Property"; }
  function canManage(role) {
    role = normRole(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "licenses.manage");
    return role === "GM" || role === "Above Property";
  }
  function hotelsFor(role, hotel) {
    if (!canManage(role)) return [];
    if (isCorporate(role)) return HOTELS.slice();
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function manages(actor, hotel) {
    actor = actor || {};
    return canManage(actor.role) && hotelsFor(actor.role, actor.hotel).indexOf(hotel) >= 0;
  }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function addDays(iso, days) {
    var p = String(iso || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function todayOf(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    var date = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag.year + "-" + bag.month + "-" + bag.day;
  }
  function daysUntil(today, exp) {
    var a = Date.parse(today + "T00:00:00Z");
    var b = Date.parse(exp + "T00:00:00Z");
    return Math.round((b - a) / 86400000);
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function kindById(id) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === id) return KINDS[i];
    return null;
  }
  function cleanFile(name) { return String(name || "").split(/[/\\]/).pop().replace(/[^A-Za-z0-9._ -]/g, "").slice(0, 80); }
  function safeId(id) { return /^lic-[a-z0-9-]{1,80}$/.test(String(id || "")); }
  function permit(hotel, kind, days, fee, agency) {
    return {
      id: "lic-" + hotel.toLowerCase() + "-" + kind,
      hotel: hotel, kind: kind,
      agency: agency, number: "SAMPLE-" + hotel + "-" + kind.toUpperCase().replace("_", ""),
      issuedOn: "", expiresOn: days, renewalFee: fee, responsibleName: OWNER[hotel],
      documentName: "sample-" + kind + ".pdf"
    };
  }
  function buildDemo(now) {
    var today = todayOf(now);
    function row(hotel, kind, days, fee, agency) {
      var item = permit(hotel, kind, days, fee, agency);
      item.issuedOn = addDays(today, -200);
      item.expiresOn = addDays(today, days);
      return item;
    }
    var city = "Sample City Clerk";
    var health = "Sample Health Department";
    var state = "Sample State Agency";
    var fire = "Sample Fire Marshal";
    return {
      licenses: [
        row("MSPWE", "lodging", 200, 250, city),
        row("MSPWE", "food_health", 45, 180, health),
        row("MSPWE", "elevator", 75, 320, state),
        row("MSPWE", "boiler", 400, 150, state),
        row("MSPWE", "fire_alarm", -10, 200, fire),
        row("MSPWE", "sprinkler", 25, 175, fire),
        row("MSPWE", "pool", 120, 90, health),
        row("MSPWE", "business", 500, 80, city),
        row("MSPAM", "lodging", 300, 250, city),
        row("MSPAM", "food_health", 20, 180, health),
        row("MSPAM", "elevator", 70, 320, state),
        row("MSPAM", "boiler", 10, 150, state),
        row("MSPAM", "fire_alarm", 400, 200, fire),
        row("MSPAM", "sprinkler", -2, 175, fire),
        row("MSPAM", "business", 600, 80, city),
        row("MSPMS", "liquor", 28, 500, "Sample State Alcohol Authority"),
        row("MSPMS", "lodging", 250, 250, city),
        row("MSPMS", "food_health", 55, 180, health),
        row("MSPMS", "elevator", 80, 320, state),
        row("MSPMS", "boiler", 15, 150, state),
        row("MSPMS", "fire_alarm", 350, 200, fire),
        row("MSPMS", "sprinkler", 180, 175, fire),
        row("MSPMS", "business", -20, 80, city)
      ]
    };
  }
  function byId(model, id) {
    var found = null;
    (model.licenses || []).forEach(function (row) { if (row.id === id) found = row; });
    return found;
  }
  function statusOf(row, today) {
    if (!row || !row.expiresOn) return "current";
    var days = daysUntil(today, row.expiresOn);
    if (days < 0) return "expired";
    if (days <= 30) return "due_30";
    if (days <= 60) return "due_60";
    if (days <= 90) return "due_90";
    return "current";
  }
  function attentionOf(model, hotel, today) {
    if (HOTELS.indexOf(hotel) < 0) return null;
    var rows = (model.licenses || []).filter(function (row) { return row.hotel === hotel; });
    if (!rows.length) return null;
    var bag = { expired: 0, due30: 0, due60: 0, due90: 0 };
    rows.forEach(function (row) {
      if (row.hotel !== hotel) return;
      var status = statusOf(row, today);
      if (status === "expired") bag.expired += 1;
      else if (status === "due_30") bag.due30 += 1;
      else if (status === "due_60") bag.due60 += 1;
      else if (status === "due_90") bag.due90 += 1;
    });
    return bag;
  }
  function board(model, today) {
    return HOTELS.map(function (hotel) {
      var counts = attentionOf(model, hotel, today) || { expired: 0, due30: 0, due60: 0, due90: 0 };
      return { code: hotel, name: NAMES[hotel], expired: counts.expired, due30: counts.due30, due60: counts.due60, due90: counts.due90 };
    });
  }
  function forHotel(model, hotel) {
    return (model.licenses || []).filter(function (row) { return row.hotel === hotel; });
  }
  function dateOk(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
  function saveLicense(model, input, actor) {
    input = input || {};
    if (!manages(actor, input.hotel)) return { ok: false, reason: "not_allowed" };
    if (!kindById(input.kind)) return { ok: false, reason: "kind" };
    var agency = String(input.agency || "").trim();
    var number = String(input.number || "").trim();
    var responsible = String(input.responsibleName || "").trim();
    if (agency.length < 2 || agency.length > 120) return { ok: false, reason: "agency" };
    if (number.length < 2 || number.length > 40) return { ok: false, reason: "number" };
    if (responsible.length < 2 || responsible.length > 80) return { ok: false, reason: "owner" };
    if (!dateOk(input.issuedOn) || !dateOk(input.expiresOn)) return { ok: false, reason: "date" };
    var fee = Number(input.renewalFee);
    if (!isFinite(fee) || fee < 0 || fee > 1000000) return { ok: false, reason: "fee" };
    var row = input.id ? byId(model, input.id) : null;
    if (input.id && (!row || row.hotel !== input.hotel)) return { ok: false, reason: "missing" };
    if (!row) {
      var id = "lic-" + String(input.hotel).toLowerCase() + "-" + input.kind;
      var n = 2;
      var next = id;
      while (byId(model, next)) { next = id + "-" + n; n += 1; }
      if (!safeId(next)) return { ok: false, reason: "kind" };
      row = { id: next, hotel: input.hotel };
      model.licenses.push(row);
    }
    row.kind = input.kind;
    row.agency = agency;
    row.number = number;
    row.issuedOn = input.issuedOn;
    row.expiresOn = input.expiresOn;
    row.renewalFee = Math.round(fee * 100) / 100;
    row.responsibleName = responsible;
    if (input.documentName) row.documentName = cleanFile(input.documentName);
    if (!row.documentName) row.documentName = "";
    return { ok: true, model: model, id: row.id };
  }
  function reminderPlan(model, actor, today) {
    if (!canManage(actor && actor.role)) return [];
    var rows = [];
    hotelsFor(actor.role, actor.hotel).forEach(function (hotel) {
      forHotel(model, hotel).forEach(function (row) {
        var status = statusOf(row, today);
        if (status === "current") return;
        var kind = kindById(row.kind);
        var name = kind ? kind.en : "License";
        var nameEs = kind ? kind.es : "Licencia";
        var title = {
          expired: { en: name + " expired", es: nameEs + " venció" },
          due_30: { en: name + " expires within 30 days", es: nameEs + " vence en 30 días" },
          due_60: { en: name + " expires within 60 days", es: nameEs + " vence en 60 días" },
          due_90: { en: name + " expires within 90 days", es: nameEs + " vence en 90 días" }
        }[status];
        rows.push({
          hotel: hotel, kind: "compliance_lic_" + row.id, ref: row.id, role: "GM",
          title: title,
          body: { en: row.number + " · " + row.expiresOn, es: row.number + " · " + row.expiresOn }
        });
      });
    });
    return rows;
  }
  function applySaved(model, saved) {
    if (!saved || saved.v !== 1) return model;
    var next = clone(model);
    (saved.licenses || []).forEach(function (row) {
      if (!row || !safeId(row.id) || HOTELS.indexOf(row.hotel) < 0 || !kindById(row.kind)) return;
      var replaced = false;
      next.licenses = next.licenses.map(function (item) {
        if (item.id !== row.id) return item;
        replaced = true;
        return row;
      });
      if (!replaced) next.licenses.push(row);
    });
    return next;
  }
  function userOverlay(model, base) {
    var licenses = (model.licenses || []).filter(function (row) {
      var orig = byId(base, row.id);
      return !orig || JSON.stringify(orig) !== JSON.stringify(row);
    });
    return { v: 1, licenses: licenses };
  }
  function statusLabel(status, lang) {
    var map = {
      current: ["Current", "Vigente"],
      due_90: ["Due in 90 days", "Vence en 90 días"],
      due_60: ["Due in 60 days", "Vence en 60 días"],
      due_30: ["Due in 30 days", "Vence en 30 días"],
      expired: ["Expired", "Vencido"]
    };
    var pair = map[status] || ["", ""];
    return tx(lang, pair[0], pair[1]);
  }
  function money(fee) { return "$" + Number(fee || 0).toFixed(2); }
  function sample(lang) {
    return "<p class=\"lc-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample permits. Not real licenses.", "Permisos de ejemplo. No son licencias reales.")) + "</p>";
  }
  function boardHtml(model, today, lang) {
    return "<div class=\"lc-hotels\" id=\"lcBoard\">" + board(model, today).map(function (row) {
      return "<button type=\"button\" class=\"lc-hotel\" onclick=\"lcHotel('" + row.code + "')\"><b>" + esc(row.code) + "</b><small>" + esc(row.name) + "</small><span>" +
        esc(row.expired + " " + tx(lang, "expired", "vencidos")) + "</span><small>" +
        esc(row.due30 + " / " + row.due60 + " / " + row.due90 + " · 30/60/90") + "</small></button>";
    }).join("") + "</div>";
  }
  function editorHtml(row, actor, lang, prefix, titleEn, titleEs) {
    if (!row || !manages(actor, row.hotel)) return "";
    prefix = prefix || "ed";
    var options = KINDS.map(function (kind) {
      return "<option value=\"" + kind.id + "\"" + (row.kind === kind.id ? " selected" : "") + ">" + esc(tx(lang, kind.en, kind.es)) + "</option>";
    }).join("");
    return "<article class=\"lc-card\" id=\"lc-" + prefix + "\"><h3>" + esc(tx(lang, titleEn, titleEs)) + "</h3>" +
      "<label>" + esc(tx(lang, "Kind", "Tipo")) + "</label><select id=\"lc-" + prefix + "-kind\">" + options + "</select>" +
      "<label>" + esc(tx(lang, "Agency", "Agencia")) + "</label><input id=\"lc-" + prefix + "-agency\" maxlength=\"120\" value=\"" + esc(row.agency) + "\">" +
      "<label>" + esc(tx(lang, "Number", "Número")) + "</label><input id=\"lc-" + prefix + "-number\" maxlength=\"40\" value=\"" + esc(row.number) + "\">" +
      "<label>" + esc(tx(lang, "Issued", "Emitido")) + "</label><input id=\"lc-" + prefix + "-issued\" type=\"date\" value=\"" + esc(row.issuedOn) + "\">" +
      "<label>" + esc(tx(lang, "Expires", "Vence")) + "</label><input id=\"lc-" + prefix + "-expires\" type=\"date\" value=\"" + esc(row.expiresOn) + "\">" +
      "<label>" + esc(tx(lang, "Renewal fee", "Cuota de renovación")) + "</label><input id=\"lc-" + prefix + "-fee\" type=\"number\" min=\"0\" step=\"0.01\" value=\"" + esc(row.renewalFee) + "\">" +
      "<label>" + esc(tx(lang, "Responsible person", "Persona responsable")) + "</label><input id=\"lc-" + prefix + "-who\" maxlength=\"80\" value=\"" + esc(row.responsibleName) + "\">" +
      "<label>" + esc(tx(lang, "Document", "Documento")) + "</label><input id=\"lc-" + prefix + "-file\" type=\"file\" accept=\"image/*,.pdf,application/pdf\">" +
      "<p class=\"lc-note\">" + esc(row.documentName || tx(lang, "No document yet. The demo keeps the file name on this device.", "Aún no hay documento. La demostración guarda el nombre en este dispositivo.")) + "</p>" +
      "<button type=\"button\" class=\"btn\" onclick=\"lcSave('" + esc(row.id) + "')\">" + esc(tx(lang, "Save permit", "Guardar permiso")) + "</button></article>";
  }
  function listHtml(model, actor, hotel, today, lang, openId) {
    var rows = forHotel(model, hotel).map(function (row) {
      var status = statusOf(row, today);
      var kind = kindById(row.kind);
      return "<button type=\"button\" class=\"lc-row\" onclick=\"lcOpen('" + esc(row.id) + "')\"><span class=\"lc-top\"><b>" + esc(kind ? tx(lang, kind.en, kind.es) : row.kind) + "</b> <span class=\"lc-badge lc-st-" + status + "\">" + esc(statusLabel(status, lang)) + "</span></span><small>" +
        esc(row.number) + " · " + esc(row.agency) + "</small><small>" + esc(tx(lang, "Expires", "Vence")) + " " + esc(row.expiresOn) + " · " + esc(money(row.renewalFee)) + " · " + esc(row.responsibleName) + "</small></button>";
    }).join("");
    var open = openId ? editorHtml(byId(model, openId), actor, lang, "ed", "Edit permit", "Editar permiso") : "";
    var blank = { id: "", hotel: hotel, kind: "business", agency: "", number: "", issuedOn: today, expiresOn: today, renewalFee: 0, responsibleName: OWNER[hotel] || "", documentName: "" };
    return "<div id=\"lcList\">" + rows + "</div>" + open + editorHtml(blank, actor, lang, "nw", "Add a permit", "Agregar un permiso");
  }
  function pageHtml(model, actor, view) {
    view = view || {};
    var lang = view.lang === "es" ? "es" : "en";
    var hotels = hotelsFor(actor.role, actor.hotel);
    if (!hotels.length) return "<div class=\"lc\" id=\"lcRoot\"></div>";
    var hotel = view.hotel && hotels.indexOf(view.hotel) >= 0 ? view.hotel : hotels[0];
    var today = view.today || todayOf(new Date());
    var chips = hotels.length > 1 ? "<div class=\"lc-chips\">" + hotels.map(function (id) {
      return "<button type=\"button\" class=\"" + (hotel === id ? "on" : "") + "\" onclick=\"lcHotel('" + id + "')\">" + esc(id) + "</button>";
    }).join("") + "</div>" : "";
    var summary = hotels.length > 1 ? boardHtml(model, today, lang) : "";
    return "<div class=\"lc\" id=\"lcRoot\"><h2>" + esc(tx(lang, "Licenses and permits", "Licencias y permisos")) + "</h2>" + sample(lang) +
      "<p class=\"lc-note\">" + esc(NAMES[hotel] || hotel) + "</p>" + chips + summary + listHtml(model, actor, hotel, today, lang, view.licenseId) + "</div>";
  }

  var api = {
    HOTELS: HOTELS, NAMES: NAMES, KINDS: KINDS,
    normRole: normRole, canManage: canManage, hotelsFor: hotelsFor, manages: manages, demoUi: demoUi,
    todayOf: todayOf, addDays: addDays, daysUntil: daysUntil, buildDemo: buildDemo, statusOf: statusOf,
    attentionOf: attentionOf, board: board, forHotel: forHotel, saveLicense: saveLicense, reminderPlan: reminderPlan,
    applySaved: applySaved, userOverlay: userOverlay, pageHtml: pageHtml, statusLabel: statusLabel, money: money, cleanFile: cleanFile
  };
  root.Licenses = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  function langNow() { try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; } }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return me ? { role: me.role, hotel: me.hotel || "", name: me.name || "" } : { role: "", hotel: "", name: "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function readSaved() {
    try { var data = JSON.parse(localStorage.getItem(KEY) || "null"); return data && data.v === 1 ? data : null; } catch (e) { return null; }
  }
  function baseNow() { return buildDemo(new Date().toISOString()); }
  function bundle() { return applySaved(baseNow(), readSaved()); }
  function remember(model) { try { localStorage.setItem(KEY, JSON.stringify(userOverlay(model, baseNow()))); } catch (e) {} }
  function bootPage() {
    var hotel = "";
    var licenseId = "";
    try { hotel = S.lcHotel || ""; licenseId = S.lcId || ""; } catch (e) {}
    return pageHtml(bundle(), actorNow(), { hotel: hotel, licenseId: licenseId, lang: langNow(), today: todayOf(new Date()) });
  }
  function syncReminders() {
    if (!root.HHQNotify || !HHQNotify.post || typeof S === "undefined") return;
    var plan = reminderPlan(bundle(), actorNow(), todayOf(new Date()));
    var keep = {};
    plan.forEach(function (row) { keep[row.kind] = 1; });
    S.reminders = (S.reminders || []).filter(function (row) {
      if (!row || String(row.kind).indexOf("compliance_lic_") !== 0) return true;
      return !!keep[row.kind];
    });
    plan.forEach(function (row) {
      if ((S.reminders || []).some(function (item) { return item.kind === row.kind && !item.read_at; })) return;
      HHQNotify.post({ hotel: row.hotel, channel: "in_app", role: row.role, kind: row.kind, title: row.title, body: row.body });
    });
  }
  root.lcHotel = function (hotel) {
    if (!manages(actorNow(), hotel)) return;
    try { S.lcHotel = hotel; S.lcId = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.lcOpen = function (id) {
    if (!safeId(id)) return;
    var row = byId(bundle(), id);
    if (!row || !manages(actorNow(), row.hotel)) return;
    try { S.lcId = id; S.lcHotel = row.hotel; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.lcSave = function (id) {
    var actor = actorNow();
    var hotel = "";
    try { hotel = S.lcHotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
    if (id && !safeId(id)) return;
    var existing = id ? byId(bundle(), id) : null;
    if (existing) hotel = existing.hotel;
    var prefix = id ? "ed" : "nw";
    var file = document.getElementById("lc-" + prefix + "-file");
    var picked = file && file.files && file.files[0] ? file.files[0].name : "";
    function val(suffix) {
      var node = document.getElementById("lc-" + prefix + "-" + suffix);
      return node ? node.value : "";
    }
    var result = saveLicense(bundle(), {
      id: id || "",
      hotel: hotel,
      kind: val("kind"),
      agency: val("agency"),
      number: val("number"),
      issuedOn: val("issued"),
      expiresOn: val("expires"),
      renewalFee: val("fee"),
      responsibleName: val("who"),
      documentName: picked
    }, actor);
    if (!result.ok) return;
    remember(result.model);
    try { S.lcId = result.id; } catch (e2) {}
    syncReminders();
    if (typeof render === "function") render();
  };
  function featureOn(hotel) {
    try { if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "licenses") !== false; } catch (e) {}
    return true;
  }
  if (typeof M !== "undefined") M.permits = ["📝", "Licenses"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Licenses = "Licencias";
  if (typeof V !== "undefined") V.permits = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = actorNow();
      var hotel = "";
      try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
      var show = demoUi() && hotelsFor(actor.role || role, actor.hotel || hotel).length > 0 && featureOn(hotel || actor.hotel);
      if (show && list.indexOf("permits") < 0) list.splice(Math.min(4, list.length), 0, "permits");
      if (!show) list = list.filter(function (id) { return id !== "permits"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows && !root.HHQMenus.menuAllows("permits", actor.role || role, hotel, function (h, feature) {
        return feature === "licenses" ? featureOn(h) : true;
      })) list = list.filter(function (id) { return id !== "permits"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("permits") < 0) RSEC[4][2].push("permits"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("permits") < 0) NOCOLS.push("permits"); } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "licenses", en: "Licenses and permits", es: "Licencias y permisos", order: 29 });
  syncReminders();
  var style = document.createElement("style");
  style.textContent = [
    ".lc-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".lc-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}",
    ".lc-chips button{flex:0 0 auto;background:#e6ebf2;color:#14365d;font-weight:700;min-height:44px}",
    ".lc-chips button.on{background:#14365d;color:#fff}",
    ".lc-hotels{display:grid;grid-template-columns:1fr;gap:8px}",
    ".lc-hotel,.lc-card{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".lc-hotel{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-height:104px}",
    ".lc-row{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:#fff;border:0;border-top:1px solid #e6ebf2;border-radius:0;padding:12px 0;min-height:64px}",
    ".lc-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center}",
    ".lc-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800}",
    ".lc-st-current{background:#d4f5dc;color:#15642f}",
    ".lc-st-due_90,.lc-st-due_60{background:#fff3cd;color:#8a5a00}",
    ".lc-st-due_30{background:#ffedd5;color:#9a3412}",
    ".lc-st-expired{background:#fde2e1;color:#8f1d1d}",
    ".lc-card small,.lc-row small,.lc-hotel small{display:block;color:#3c4658;margin-top:4px}",
    ".lc-card label{display:block;font-size:13px;font-weight:700;margin:8px 0 4px}",
    ".lc-card input,.lc-card select{width:100%;min-height:44px;font-size:16px}",
    ".lc .btn{min-height:44px;margin-top:8px}",
    "@media(min-width:768px){.lc-hotels{grid-template-columns:repeat(3,minmax(0,1fr))}}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
