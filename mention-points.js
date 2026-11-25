/* Positive name mentions in a guest review wait for the property GM or AGM.
   A detected mention becomes a pending request. Points post only on Approve.
   Deny asks for a reason and tells the associate nothing.
   Approve records who decided and when, then congratulates that associate
   once, in English and Spanish, until they dismiss it.
   Demo names and excerpts are samples. This file does not call Supabase. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var PROPOSED = 500;
  var KEY = "jrportal_name_mentions_v1";
  var SOURCE_OF = {
    medallia: "medallia",
    guestVoice: "guestVoice",
    guest_comments: "guest_comments",
    google: "google",
    tripadvisor: "tripadvisor",
    expedia: "expedia",
    booking: "booking",
    ihg: "guest_comments",
    ctrip: "guest_comments",
    survey: "medallia",
    review: "guestVoice"
  };
  var SOURCE_LABEL = {
    medallia: ["Medallia", "Medallia"],
    guestVoice: ["Guest Voice", "Guest Voice"],
    guest_comments: ["Guest comment", "Comentario de huésped"],
    google: ["Google", "Google"],
    tripadvisor: ["Tripadvisor", "Tripadvisor"],
    expedia: ["Expedia", "Expedia"],
    booking: ["Booking", "Booking"]
  };

  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normRole(role) {
    if (role === "gm") return "GM";
    if (role === "agm") return "AGM";
    if (role === "above_property" || role === "JR Corporate") return "Above Property";
    return role || "";
  }
  function canReview(actor) {
    actor = actor || {};
    var role = normRole(actor.role);
    return (role === "GM" || role === "AGM") && HOTELS.indexOf(actor.hotel) >= 0;
  }
  function sameHotel(actor, hotel) {
    return canReview(actor) && actor.hotel === hotel;
  }
  function slug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
  }
  function safeId(id) { return /^nm-[a-z0-9-]{1,80}$/.test(String(id || "")); }
  function requestId(commentId, staffId) {
    return ("nm-" + slug(commentId) + "-" + slug(staffId)).slice(0, 72);
  }
  function nameIn(text, name) {
    var clean = String(name || "").trim();
    if (clean.length < 5) return false;
    var escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("(?:^|[^A-Za-z])" + escaped + "(?:$|[^A-Za-z])", "i").test(String(text || ""));
  }
  function shortExcerpt(text) {
    var value = String(text || "").replace(/\s+/g, " ").trim();
    if (value.length <= 80) return value;
    return value.slice(0, 77) + "...";
  }
  function blank(row) {
    return {
      id: row.id,
      key: row.key || row.id,
      hotel: row.hotel,
      staffId: row.staffId,
      staffName: row.staffName,
      detectedStaffId: row.detectedStaffId || row.staffId,
      excerpt: shortExcerpt(row.excerpt),
      excerptEs: shortExcerpt(row.excerptEs || row.excerpt),
      source: row.source,
      reviewDate: row.reviewDate || "",
      commentId: row.commentId || "",
      proposedPoints: row.proposedPoints > 0 ? row.proposedPoints : PROPOSED,
      awardedPoints: 0,
      status: "pending",
      denyReason: "",
      approverName: "",
      approverRole: "",
      decidedAt: "",
      example: row.example !== false
    };
  }
  function detect(comments, staff) {
    var out = [];
    (comments || []).forEach(function (row) {
      if (!row || row.tone !== "praise") return;
      var source = SOURCE_OF[row.source];
      if (!source || HOTELS.indexOf(row.hotel) < 0) return;
      var text = (row.textEn || "") + "\n" + (row.textEs || "");
      (staff || []).forEach(function (person) {
        if (!person || person.hotel !== row.hotel || !nameIn(text, person.name)) return;
        out.push(blank({
          id: requestId(row.id, person.id),
          hotel: row.hotel,
          staffId: person.id,
          staffName: person.name,
          excerpt: row.textEn,
          excerptEs: row.textEs,
          source: source,
          reviewDate: row.date || "",
          commentId: row.id
        }));
      });
    });
    return out;
  }
  function guestVoiceSample(staff, today) {
    var joy = null;
    (staff || []).forEach(function (person) {
      if (person && person.hotel === "MSPWE" && person.name === "Joy Adams") joy = person;
    });
    if (!joy) return [];
    return [blank({
      id: "nm-gv-joy",
      hotel: "MSPWE",
      staffId: joy.id,
      staffName: joy.name,
      excerpt: "Sample review. Joy Adams made the sample breakfast feel welcome.",
      excerptEs: "Reseña de ejemplo. Joy Adams hizo que el desayuno de ejemplo se sintiera bienvenido.",
      source: "guestVoice",
      reviewDate: today || "",
      commentId: "gv-joy"
    })];
  }
  function merge(detected, saved) {
    var map = {};
    (detected || []).forEach(function (row) { map[row.id] = blank(row); });
    ((saved && saved.requests) || []).forEach(function (row) {
      if (!row || !safeId(row.id) || !map[row.id]) return;
      var base = map[row.id];
      if (row.status === "approved" || row.status === "denied" || row.staffId !== base.detectedStaffId) {
        base.staffId = row.staffId || base.staffId;
        base.staffName = row.staffName || base.staffName;
        base.status = row.status === "approved" || row.status === "denied" ? row.status : "pending";
        base.awardedPoints = row.status === "approved" ? (Number(row.awardedPoints) || base.proposedPoints) : 0;
        base.denyReason = row.status === "denied" ? String(row.denyReason || "") : "";
        base.approverName = row.approverName || "";
        base.approverRole = row.approverRole || "";
        base.decidedAt = row.decidedAt || "";
      }
    });
    var extra = ((saved && saved.requests) || []).filter(function (row) {
      return row && safeId(row.id) && !map[row.id] && String(row.id).indexOf("nm-log-") === 0;
    }).map(blank);
    extra.forEach(function (row) {
      var kept = (saved.requests || []).filter(function (item) { return item.id === row.id; })[0];
      if (!kept) return;
      row.status = kept.status === "approved" || kept.status === "denied" ? kept.status : "pending";
      row.awardedPoints = row.status === "approved" ? (Number(kept.awardedPoints) || row.proposedPoints) : 0;
      row.denyReason = kept.denyReason || "";
      row.approverName = kept.approverName || "";
      row.approverRole = kept.approverRole || "";
      row.decidedAt = kept.decidedAt || "";
      row.staffId = kept.staffId || row.staffId;
      row.staffName = kept.staffName || row.staffName;
      map[row.id] = row;
    });
    return {
      v: 1,
      requests: Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
        return a.reviewDate < b.reviewDate ? 1 : a.reviewDate > b.reviewDate ? -1 : (a.id < b.id ? -1 : 1);
      }),
      notices: ((saved && saved.notices) || []).filter(function (row) { return row && safeId(row.id); })
    };
  }
  function queueTagged(model, input) {
    input = input || {};
    var source = SOURCE_OF[input.source] || "";
    if (!source || HOTELS.indexOf(input.hotel) < 0) return { ok: false, error: "source", model: model };
    if (!input.staffId || !input.staffName) return { ok: false, error: "staff", model: model };
    var excerpt = shortExcerpt(input.excerpt);
    if (!excerpt) return { ok: false, error: "excerpt", model: model };
    var next = clone(model || { v: 1, requests: [], notices: [] });
    var id = requestId("log-" + String(input.reviewDate || "day") + "-" + slug(excerpt).slice(0, 18), input.staffId);
    if (!safeId(id)) id = requestId("log", input.staffId);
    if ((next.requests || []).some(function (row) { return row.id === id; })) return { ok: true, model: next, id: id, duplicate: true };
    next.requests = next.requests || [];
    next.requests.unshift(blank({
      id: id,
      hotel: input.hotel,
      staffId: input.staffId,
      staffName: input.staffName,
      excerpt: excerpt,
      excerptEs: shortExcerpt(input.excerptEs || excerpt),
      source: source,
      reviewDate: input.reviewDate || "",
      commentId: "log",
      proposedPoints: Math.max(1, Math.min(500, Math.round(Number(input.proposedPoints) || PROPOSED)))
    }));
    return { ok: true, model: next, id: id, duplicate: false };
  }
  function find(model, id) {
    var hit = null;
    ((model && model.requests) || []).forEach(function (row) { if (row.id === id) hit = row; });
    return hit;
  }
  function pendingFor(model, actor) {
    if (!canReview(actor)) return [];
    return ((model && model.requests) || []).filter(function (row) {
      return row.status === "pending" && row.hotel === actor.hotel;
    });
  }
  function earned(model, staffId) {
    var total = 0;
    ((model && model.requests) || []).forEach(function (row) {
      if (row.staffId === staffId && row.status === "approved") total += Number(row.awardedPoints) || 0;
    });
    return total;
  }
  function decide(model, id, actor, now) {
    if (!safeId(id)) return { ok: false, error: "id" };
    var next = clone(model);
    var row = find(next, id);
    if (!row) return { ok: false, error: "missing" };
    if (!sameHotel(actor, row.hotel)) return { ok: false, error: "denied" };
    if (row.status !== "pending") return { ok: false, error: "closed" };
    if (actor.id && actor.id === row.staffId) return { ok: false, error: "self" };
    row.approverName = actor.name || "";
    row.approverRole = normRole(actor.role);
    row.decidedAt = now || "";
    return { ok: true, model: next, row: row };
  }
  function congrats(row) {
    var excerpt = shortExcerpt(row.excerpt);
    var points = Number(row.awardedPoints) || Number(row.proposedPoints) || 0;
    return {
      id: row.id,
      staffId: row.staffId,
      hotel: row.hotel,
      points: points,
      titleEn: "Congrats!",
      titleEs: "¡Felicidades!",
      bodyEn: "Congrats! A guest mentioned you by name: \"" + excerpt + "\". +" + points + " points.",
      bodyEs: "¡Felicidades! Un huésped te mencionó por tu nombre: \"" + excerpt + "\". +" + points + " puntos.",
      dismissedAt: ""
    };
  }
  function approve(model, id, actor, now) {
    var result = decide(model, id, actor, now);
    if (!result.ok) return result;
    result.row.status = "approved";
    result.row.awardedPoints = result.row.proposedPoints;
    result.row.denyReason = "";
    var note = congrats(result.row);
    result.model.notices = (result.model.notices || []).filter(function (item) { return item.id !== note.id; });
    result.model.notices.unshift(note);
    result.awarded = {
      staffId: result.row.staffId,
      hotel: result.row.hotel,
      points: result.row.awardedPoints,
      en: "Guest mentioned you by name",
      es: "Un huésped te mencionó por tu nombre"
    };
    result.notice = note;
    return result;
  }
  function deny(model, id, actor, reason, now) {
    var text = String(reason || "").trim();
    if (!text) return { ok: false, error: "reason" };
    if (text.length > 200) return { ok: false, error: "reason" };
    var result = decide(model, id, actor, now);
    if (!result.ok) return result;
    result.row.status = "denied";
    result.row.awardedPoints = 0;
    result.row.denyReason = text;
    result.model.notices = (result.model.notices || []).filter(function (item) { return item.id !== result.row.id; });
    result.awarded = null;
    result.notice = null;
    return result;
  }
  function reassign(model, id, actor, staffId, staff) {
    if (!safeId(id)) return { ok: false, error: "id" };
    var next = clone(model);
    var row = find(next, id);
    if (!row) return { ok: false, error: "missing" };
    if (!sameHotel(actor, row.hotel)) return { ok: false, error: "denied" };
    if (row.status !== "pending") return { ok: false, error: "closed" };
    var person = null;
    (staff || []).forEach(function (item) { if (item && item.id === staffId) person = item; });
    if (!person || person.hotel !== row.hotel || normRole(person.role) === "Above Property") return { ok: false, error: "staff" };
    row.staffId = person.id;
    row.staffName = person.name;
    return { ok: true, model: next, row: row, awarded: null };
  }
  function openNotices(model, staffId) {
    return ((model && model.notices) || []).filter(function (row) {
      return row && row.staffId === staffId && !row.dismissedAt;
    });
  }
  function dismiss(model, id, actor) {
    if (!safeId(id)) return { ok: false, error: "id" };
    var next = clone(model);
    var hit = null;
    (next.notices || []).forEach(function (row) { if (row.id === id) hit = row; });
    if (!hit) return { ok: false, error: "missing" };
    if (!actor || actor.id !== hit.staffId) return { ok: false, error: "denied" };
    hit.dismissedAt = hit.dismissedAt || new Date().toISOString();
    return { ok: true, model: next };
  }
  function sourceLabel(id, lang) {
    var row = SOURCE_LABEL[id] || [id, id];
    return tx(lang, row[0], row[1]);
  }
  function badgeHtml(count, lang) {
    lang = lang === "es" ? "es" : "en";
    var n = Number(count) || 0;
    return "<button type=\"button\" class=\"nm-badge\" id=\"nmPendingBadge\" onclick=\"go('nmention')\">" +
      "<span>" + esc(tx(lang, "Name mentions", "Menciones por nombre")) + "</span>" +
      "<b class=\"badge" + (n ? "" : " zero") + "\" id=\"nmPendingCount\">" + n + "</b>" +
      "<small>" + esc(n
        ? tx(lang, "Waiting for GM approval", "Esperando la aprobación del GM")
        : tx(lang, "None waiting", "Ninguna pendiente")) + "</small></button>";
  }
  function staffChoices(staff, hotel, current) {
    return (staff || []).filter(function (person) {
      return person && person.hotel === hotel && normRole(person.role) !== "Above Property";
    }).map(function (person) {
      return "<option value=\"" + esc(person.id) + "\"" + (person.id === current ? " selected" : "") + ">" + esc(person.name) + "</option>";
    }).join("");
  }
  function cardHtml(row, actor, staff, lang) {
    var mine = sameHotel(actor, row.hotel) && row.status === "pending";
    var actions = "";
    if (mine) {
      actions = "<div class=\"nm-acts\">" +
        "<button type=\"button\" class=\"btn\" onclick=\"nmApprove('" + row.id + "')\">" + esc(tx(lang, "Approve", "Aprobar")) + "</button>" +
        "<label>" + esc(tx(lang, "Change staff member", "Cambiar de asociado")) +
        "<select id=\"nmStaff-" + row.id + "\" aria-label=\"" + esc(tx(lang, "Change staff member", "Cambiar de asociado")) + "\">" + staffChoices(staff, row.hotel, row.staffId) + "</select></label>" +
        "<button type=\"button\" class=\"btn2\" onclick=\"nmReassign('" + row.id + "')\">" + esc(tx(lang, "Save staff member", "Guardar asociado")) + "</button>" +
        "<label>" + esc(tx(lang, "Deny", "Rechazar")) +
        "<input id=\"nmWhy-" + row.id + "\" maxlength=\"200\" placeholder=\"" + esc(tx(lang, "Reason", "Motivo")) + "\" aria-label=\"" + esc(tx(lang, "Reason for denying", "Motivo del rechazo")) + "\"></label>" +
        "<button type=\"button\" class=\"btn2\" onclick=\"nmDeny('" + row.id + "')\">" + esc(tx(lang, "Deny", "Rechazar")) + "</button>" +
        "<p class=\"nm-err\" id=\"nmErr-" + row.id + "\" role=\"alert\"></p></div>";
    }
    var state = row.status === "approved"
      ? tx(lang, "Approved", "Aprobado")
      : row.status === "denied"
        ? tx(lang, "Denied", "Rechazado")
        : tx(lang, "Pending", "Pendiente");
    var decided = row.decidedAt
      ? "<p class=\"nm-meta\">" + esc(state) + " · " + esc(row.approverName) + " · " + esc(row.approverRole) + " · " + esc(String(row.decidedAt).slice(0, 16).replace("T", " ")) +
        (row.status === "denied" && row.denyReason ? " · " + esc(row.denyReason) : "") + "</p>"
      : "";
    return "<article class=\"nm-card\" id=\"" + row.id + "\">" +
      "<p class=\"nm-top\"><b>" + esc(row.staffName) + "</b> <span class=\"nm-tag\">" + esc(sourceLabel(row.source, lang)) + "</span> <span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span></p>" +
      "<p class=\"nm-quote\">“" + esc(lang === "es" ? row.excerptEs : row.excerpt) + "”</p>" +
      "<p class=\"nm-meta\">" + esc(tx(lang, "Review date", "Fecha de la reseña")) + " " + esc(row.reviewDate) +
      " · " + esc(tx(lang, "Proposed points", "Puntos propuestos")) + " +" + esc(String(row.proposedPoints)) +
      " · " + esc(state) + "</p>" + decided + actions + "</article>";
  }
  function queueHtml(model, actor, staff, lang) {
    lang = lang === "es" ? "es" : "en";
    if (!canReview(actor)) return "";
    var rows = ((model && model.requests) || []).filter(function (row) { return row.hotel === actor.hotel; });
    var pending = rows.filter(function (row) { return row.status === "pending"; });
    var done = rows.filter(function (row) { return row.status !== "pending"; });
    var body = pending.map(function (row) { return cardHtml(row, actor, staff, lang); }).join("") ||
      "<p class=\"nm-note\">" + esc(tx(lang, "No mentions are waiting.", "No hay menciones en espera.")) + "</p>";
    var history = done.length
      ? "<h3>" + esc(tx(lang, "Decided", "Decididas")) + "</h3>" + done.map(function (row) { return cardHtml(row, actor, staff, lang); }).join("")
      : "";
    return "<div class=\"nm\" id=\"nmQueue\">" +
      "<p class=\"nm-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample reviews only. Points post when you approve. A denial is not sent to the associate.", "Solo reseñas de ejemplo. Los puntos se publican al aprobar. Un rechazo no se envía al asociado.")) + "</p>" +
      "<p class=\"nm-count\">" + esc(String(pending.length)) + " " + esc(tx(lang, "pending", "pendientes")) + "</p>" +
      body + history + "</div>";
  }
  function staffHomeHtml(notice, lang) {
    if (!notice) return "";
    lang = lang === "es" ? "es" : "en";
    var body = lang === "es" ? notice.bodyEs : notice.bodyEn;
    var dismiss = "<button type=\"button\" class=\"btn2\" onclick=\"nmDismiss('" + notice.id + "')\">" + esc(tx(lang, "Dismiss", "Cerrar")) + "</button>";
    return "<section class=\"nm-home\" id=\"nmStaff\">" +
      "<div class=\"nm-banner\" id=\"nmCongrats\"><p>" + esc(body) + "</p>" + dismiss + "</div>" +
      "<div class=\"card\" id=\"nmNotes\"><h3>" + esc(tx(lang, "Notifications", "Notificaciones")) + "</h3>" +
      "<div class=\"li\"><span>" + esc(body) + "</span>" + dismiss + "</div></div></section>";
  }

  var api = {
    HOTELS: HOTELS, PROPOSED: PROPOSED, SOURCE_OF: SOURCE_OF,
    normRole: normRole, canReview: canReview, detect: detect, guestVoiceSample: guestVoiceSample,
    merge: merge, queueTagged: queueTagged, pendingFor: pendingFor, earned: earned,
    approve: approve, deny: deny, reassign: reassign, dismiss: dismiss, openNotices: openNotices,
    congrats: congrats, badgeHtml: badgeHtml, queueHtml: queueHtml, staffHomeHtml: staffHomeHtml,
    sourceLabel: sourceLabel, safeId: safeId
  };
  root.MentionPoints = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function demoUi() {
    try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
    var cfg = root.HOTELHQ_CONFIG || null;
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  if (!demoUi()) return;

  function readSaved() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1) return { v: 1, requests: [], notices: [] };
      return data;
    } catch (e) { return { v: 1, requests: [], notices: [] }; }
  }
  function writeSaved(model) {
    var keep = {
      v: 1,
      requests: (model.requests || []).filter(function (row) {
        return row.status !== "pending" || String(row.id).indexOf("nm-log-") === 0 || row.staffId !== row.detectedStaffId;
      }).map(function (row) {
        return {
          id: row.id, status: row.status, staffId: row.staffId, staffName: row.staffName,
          awardedPoints: row.awardedPoints, denyReason: row.denyReason,
          approverName: row.approverName, approverRole: row.approverRole, decidedAt: row.decidedAt,
          hotel: row.hotel, excerpt: row.excerpt, excerptEs: row.excerptEs, source: row.source,
          reviewDate: row.reviewDate, proposedPoints: row.proposedPoints, commentId: row.commentId
        };
      }),
      notices: model.notices || []
    };
    (model.requests || []).forEach(function (row) {
      if (row.status === "pending" && row.staffId === row.detectedStaffId && String(row.id).indexOf("nm-log-") !== 0) return;
      if (!keep.requests.some(function (item) { return item.id === row.id; })) {
        keep.requests.push(row);
      }
    });
    try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch (e) {}
  }
  function staffList() {
    var rows = [];
    try { rows = (typeof USERS !== "undefined" && USERS.length) ? USERS : (typeof EXAMPLE_USERS !== "undefined" ? EXAMPLE_USERS : []); } catch (e) { rows = []; }
    return rows.filter(function (person) { return person && person.hotel && person.name && person.id; }).map(function (person) {
      return { id: person.id, name: person.name, hotel: person.hotel, role: person.role || "" };
    });
  }
  function today() {
    try {
      if (root.GuestComments && GuestComments.checkinDate) return GuestComments.checkinDate(new Date().toISOString());
    } catch (e) {}
    return new Date().toISOString().slice(0, 10);
  }
  function comments() {
    try {
      if (root.GuestComments && GuestComments.buildDemo) return GuestComments.buildDemo(new Date().toISOString()).comments || [];
    } catch (e) {}
    return [];
  }
  function bundle() {
    var staff = staffList();
    var detected = detect(comments(), staff).concat(guestVoiceSample(staff, today()));
    var model = merge(detected, readSaved());
    (readSaved().requests || []).forEach(function (row) {
      if (!row || String(row.id).indexOf("nm-log-") !== 0) return;
      if (model.requests.some(function (item) { return item.id === row.id; })) return;
      model.requests.unshift(blank(row));
      if (row.status === "approved" || row.status === "denied") {
        var hit = model.requests[0];
        hit.status = row.status;
        hit.awardedPoints = row.awardedPoints || 0;
        hit.denyReason = row.denyReason || "";
        hit.approverName = row.approverName || "";
        hit.approverRole = row.approverRole || "";
        hit.decidedAt = row.decidedAt || "";
      }
    });
    model.notices = readSaved().notices || model.notices;
    return model;
  }
  function actor() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (!me) return { id: "", role: "", hotel: "", name: "" };
      return { id: me.id, role: me.role, hotel: me.hotel || "", name: me.name || "" };
    } catch (e) { return { id: "", role: "", hotel: "", name: "" }; }
  }
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function remember(model) { writeSaved(model); }
  function postPoints(awarded) {
    if (!awarded || !root.ptsAwardTo) return;
    try { root.ptsAwardTo(awarded.staffId, awarded.hotel, awarded.points, awarded.en, awarded.es, null); } catch (e) {}
  }
  api.submitTagged = function (input) {
    var result = queueTagged(bundle(), input || {});
    if (!result.ok) return result;
    remember(result.model);
    return result;
  };
  function paint() {
    var oldBadge = document.getElementById("nmPendingBadge");
    var oldStaff = document.getElementById("nmStaff");
    if (oldBadge) oldBadge.remove();
    if (oldStaff) oldStaff.remove();
    var me = actor();
    var tab = "";
    try { tab = S.tab || ""; } catch (e) { tab = ""; }
    if (tab !== "home" || !me.id) return;
    var model = bundle();
    var lang = langNow();
    if (canReview(me)) {
      var host = document.getElementById("glanceHome") || document.getElementById("hhqToday") || document.getElementById("uxHero");
      if (host) host.insertAdjacentHTML("afterbegin", badgeHtml(pendingFor(model, me).length, lang));
    }
    var notes = openNotices(model, me.id);
    if (notes.length) {
      var top = document.getElementById("hhqToday") || document.getElementById("uxHero") || document.getElementById("app");
      if (top) top.insertAdjacentHTML("afterbegin", staffHomeHtml(notes[0], lang));
    }
  }
  root.nmApprove = function (id) {
    var me = actor();
    var result = approve(bundle(), id, me, new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    postPoints(result.awarded);
    try { if (typeof showToast === "function") showToast(tx(langNow(), "Approved. Points are posted.", "Aprobado. Los puntos ya están publicados.")); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.nmDeny = function (id) {
    var input = document.getElementById("nmWhy-" + id);
    var err = document.getElementById("nmErr-" + id);
    var result = deny(bundle(), id, actor(), input ? input.value : "", new Date().toISOString());
    if (!result.ok) {
      if (err) err.textContent = tx(langNow(), "Add a reason to deny this mention.", "Agrega un motivo para rechazar esta mención.");
      return;
    }
    remember(result.model);
    try { if (typeof showToast === "function") showToast(tx(langNow(), "Denied. The associate is not notified.", "Rechazado. El asociado no recibe aviso.")); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.nmReassign = function (id) {
    var input = document.getElementById("nmStaff-" + id);
    var err = document.getElementById("nmErr-" + id);
    var result = reassign(bundle(), id, actor(), input ? input.value : "", staffList());
    if (!result.ok) {
      if (err) err.textContent = tx(langNow(), "Choose an associate at this hotel.", "Elige un asociado de este hotel.");
      return;
    }
    remember(result.model);
    try { if (typeof showToast === "function") showToast(tx(langNow(), "Staff member updated. Still pending.", "Asociado actualizado. Sigue pendiente.")); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.nmDismiss = function (id) {
    var result = dismiss(bundle(), id, actor());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };

  if (typeof M !== "undefined") M.nmention = ["★", "Name mentions"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Name mentions"] = "Menciones por nombre";
  if (typeof V !== "undefined") {
    V.nmention = function () {
      var me = actor();
      if (!canReview(me)) return "";
      return queueHtml(bundle(), me, staffList(), langNow());
    };
  }
  if (typeof root.tilesFor === "function") {
    var prevTiles = root.tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var me = actor();
      if (canReview(me)) {
        if (list.indexOf("nmention") < 0) list.unshift("nmention");
      } else {
        list = list.filter(function (id) { return id !== "nmention"; });
      }
      return list;
    };
  }
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("nmention") < 0) NOCOLS.push("nmention"); } catch (e) {}

  var style = document.createElement("style");
  style.textContent = [
    ".nm-badge{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:#fff7e8;border:1px solid #f0d7a2;border-radius:14px;min-height:64px;padding:10px 12px;margin:0 0 8px}",
    ".nm-badge span{font-weight:800;flex:1}",
    ".nm-badge small{display:block;flex-basis:100%;color:#6a5010;font-weight:650}",
    ".nm-home{margin:0 0 8px}",
    ".nm-banner{background:#e7f6ec;border:1px solid #b7e4c7;border-radius:14px;padding:12px;margin:0 0 8px}",
    ".nm-banner p{margin:6px 0}",
    ".nm-note{color:#3c4658;font-size:14px}",
    ".nm-card{background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px;margin:8px 0}",
    ".nm-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 6px}",
    ".nm-tag{background:#eef3fa;color:#14365d;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:800}",
    ".nm-quote{font-size:16px;margin:0 0 6px}",
    ".nm-meta{color:#3c4658;font-size:13px;margin:0 0 8px}",
    ".nm-acts{display:flex;flex-direction:column;gap:8px}",
    ".nm-acts label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:14px}",
    ".nm-acts select,.nm-acts input{width:100%;min-height:44px;font:inherit}",
    ".nm-err{color:#9f1239;min-height:1em;margin:0}",
    ".nm-count{font-weight:800}"
  ].join("");
  document.head.appendChild(style);

  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { paint(); } catch (e) {}
      return result;
    };
    try { paint(); } catch (e2) {}
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
