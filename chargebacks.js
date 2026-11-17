/* Card disputes for the GM and AGM at their hotel, and for corporate across hotels.
   Demo rows are example data. Do not put a real guest, card, or case in this file.
   Only the last 4 digits of a card are stored. Status changes append an event.
   Nothing here deletes or rewrites that history. */
(function (root) {
  "use strict";

  var STATUSES = [
    { id: "new", en: "New", es: "Nuevo" },
    { id: "gathering", en: "Gathering evidence", es: "Reuniendo evidencia" },
    { id: "submitted", en: "Submitted", es: "Enviado" },
    { id: "won", en: "Won", es: "Ganado" },
    { id: "lost", en: "Lost", es: "Perdido" },
    { id: "accepted", en: "Accepted (no contest)", es: "Aceptado (sin disputa)" }
  ];
  var OPEN = { new: 1, gathering: 1, submitted: 1 };
  var EVIDENCE = [
    { id: "folio", en: "Folio", es: "Folio" },
    { id: "registration", en: "Signed registration card", es: "Tarjeta de registro firmada" },
    { id: "id", en: "ID", es: "Identificación" },
    { id: "authorization", en: "Card authorization", es: "Autorización de tarjeta" },
    { id: "email", en: "Guest emails / notes", es: "Correos y notas del huésped" },
    { id: "other", en: "Other", es: "Otro" }
  ];
  var BRANDS = ["Visa", "Mastercard", "Amex", "Discover", "Other"];

  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function isCorporate(role) {
    return role === "Above Property" || role === "JR Corporate" || role === "above_property" || role === "corporate";
  }
  function isGm(role) {
    return role === "GM" || role === "AGM" || role === "gm" || role === "agm";
  }
  function canSee(role) { return isGm(role) || isCorporate(role); }
  function statusById(id) {
    for (var i = 0; i < STATUSES.length; i++) if (STATUSES[i].id === id) return STATUSES[i];
    return null;
  }
  function evidenceById(id) {
    for (var i = 0; i < EVIDENCE.length; i++) if (EVIDENCE[i].id === id) return EVIDENCE[i];
    return null;
  }
  function addDays(iso, days) {
    var d = new Date(String(iso).slice(0, 10) + "T00:00:00Z");
    if (isNaN(d.getTime())) return "";
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function daySpan(today, deadline) {
    var a = Date.parse(String(today).slice(0, 10) + "T00:00:00Z");
    var b = Date.parse(String(deadline).slice(0, 10) + "T00:00:00Z");
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }
  function deadlineFlag(deadline, today) {
    var days = daySpan(today, deadline);
    if (days == null) return "";
    if (days < 0) return "overdue";
    if (days <= 3) return "soon";
    return "";
  }
  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) return "—";
    var sign = v < 0 ? "-" : "";
    var parts = Math.abs(v).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + parts.join(".");
  }
  function roundMoney(n) { return Math.round(Number(n) * 100) / 100; }

  function exampleDisputes(today) {
    today = String(today || "2026-11-17").slice(0, 10);
    function row(id, hotel, guest, amount, status, deadlineDays, kinds) {
      return {
        id: id,
        example: true,
        hotel: hotel,
        guest: guest,
        confirmation: "EX-" + id.slice(-4),
        arrival: addDays(today, -4),
        departure: addDays(today, -1),
        room: "214",
        last4: "4242",
        brand: "Visa",
        amount: amount,
        reasonCode: "13.1",
        reason: "Example: the cardholder does not recognize this stay.",
        processor: "EX-CASE-" + id.slice(-1),
        received: addDays(today, -5),
        deadline: addDays(today, deadlineDays),
        status: status,
        evidence: (kinds || []).map(function (kind, i) {
          return { id: id + "-e" + i, kind: kind, name: "example-" + kind + ".pdf", example: true };
        }),
        events: [{ id: id + "-h", status: status, actor: "Example GM (EX)", at: today + "T15:00:00.000Z", example: true }]
      };
    }
    return [
      row("ex-cb-1", "MSPWE", "Example Guest A", 186.4, "gathering", 2, ["folio"]),
      row("ex-cb-2", "MSPWE", "Example Guest B", 420, "new", -1, []),
      row("ex-cb-3", "MSPAM", "Example Guest C", 250, "won", -12, ["folio", "registration", "authorization"]),
      row("ex-cb-4", "MSPMS", "Example Guest D", 90, "lost", -8, ["folio"]),
      row("ex-cb-5", "MSPAM", "Example Guest E", 60, "accepted", -6, ["email"])
    ];
  }

  function visible(rows, actor) {
    actor = actor || {};
    return (rows || []).filter(function (row) {
      if (!canSee(actor.role)) return false;
      if (isCorporate(actor.role)) return true;
      return !!actor.hotel && row.hotel === actor.hotel;
    });
  }
  function filterRows(rows, hotel, status) {
    return (rows || []).filter(function (row) {
      if (hotel && hotel !== "all" && row.hotel !== hotel) return false;
      if (status && status !== "all" && row.status !== status) return false;
      return true;
    });
  }
  function pickHotels(directory, query) {
    var list = directory || [];
    var q = String(query || "").trim().toLowerCase();
    var hits = !q ? list : list.filter(function (hotel) {
      return (hotel.id + " " + (hotel.name || "")).toLowerCase().indexOf(q) >= 0;
    });
    var cap = q ? 12 : 8;
    return { matches: hits.slice(0, cap), more: hits.length > cap };
  }
  function totals(rows) {
    var open = 0, won = 0, lost = 0, wonCount = 0, lostCount = 0;
    (rows || []).forEach(function (row) {
      var amount = Number(row.amount) || 0;
      if (OPEN[row.status]) open += amount;
      else if (row.status === "won") { won += amount; wonCount += 1; }
      else if (row.status === "lost") { lost += amount; lostCount += 1; }
    });
    var decided = wonCount + lostCount;
    return {
      open: roundMoney(open),
      won: roundMoney(won),
      lost: roundMoney(lost),
      wonCount: wonCount,
      lostCount: lostCount,
      winRate: decided ? wonCount / decided : null
    };
  }
  function chart(summary) {
    var max = Math.max(summary.wonCount, summary.lostCount, 1);
    return {
      wonPct: Math.round(100 * summary.wonCount / max),
      lostPct: Math.round(100 * summary.lostCount / max)
    };
  }
  function homeSummary(rows, hotel, today) {
    var openRows = (rows || []).filter(function (row) {
      return row.hotel === hotel && OPEN[row.status];
    });
    var overdue = 0, soon = 0;
    openRows.forEach(function (row) {
      var flag = deadlineFlag(row.deadline, today);
      if (flag === "overdue") overdue += 1;
      else if (flag === "soon") soon += 1;
    });
    return {
      open: openRows.length,
      overdue: overdue,
      soon: soon,
      badge: overdue + soon || openRows.length,
      tone: overdue ? "overdue" : soon ? "soon" : "open"
    };
  }
  function checklist(dispute) {
    var have = {};
    ((dispute && dispute.evidence) || []).forEach(function (item) { have[item.kind] = true; });
    return EVIDENCE.map(function (item) {
      return { id: item.id, en: item.en, es: item.es, attached: !!have[item.id] };
    });
  }

  function cleanLast4(value) {
    var digits = String(value == null ? "" : value).replace(/\D/g, "");
    if (digits.length !== 4) return "";
    if (String(value).replace(/\s/g, "").length > 4 && /\d{5,}/.test(String(value))) return "";
    return digits;
  }
  function validHotel(code) { return /^[A-Z0-9]{2,12}$/.test(String(code || "")); }
  function blank(input) {
    input = input || {};
    return {
      hotel: String(input.hotel || "").trim().toUpperCase(),
      guest: String(input.guest || "").trim(),
      confirmation: String(input.confirmation || "").trim(),
      arrival: String(input.arrival || "").slice(0, 10),
      departure: String(input.departure || "").slice(0, 10),
      room: String(input.room || "").trim(),
      last4: cleanLast4(input.last4),
      brand: BRANDS.indexOf(input.brand) >= 0 ? input.brand : "",
      amount: input.amount,
      reasonCode: String(input.reasonCode || "").trim(),
      reason: String(input.reason || "").trim(),
      processor: String(input.processor || "").trim(),
      received: String(input.received || "").slice(0, 10),
      deadline: String(input.deadline || "").slice(0, 10)
    };
  }
  function problems(input) {
    var row = blank(input);
    if (!validHotel(row.hotel)) return "hotel";
    if (!row.guest || row.guest.length > 80) return "guest";
    if (!row.confirmation || row.confirmation.length > 40) return "confirmation";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(row.departure)) return "dates";
    if (row.departure < row.arrival) return "dates";
    if (!row.room || row.room.length > 12) return "room";
    if (!row.last4) return "last4";
    if (!row.brand) return "brand";
    var amount = Number(row.amount);
    if (!isFinite(amount) || amount <= 0 || amount >= 1000000) return "amount";
    if (!row.reasonCode || row.reasonCode.length > 20) return "reason";
    if (!row.reason || row.reason.length > 400) return "reason";
    if (!row.processor || row.processor.length > 40) return "processor";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.received) || !/^\d{4}-\d{2}-\d{2}$/.test(row.deadline)) return "deadline";
    return "";
  }
  function copyModel(model) {
    return {
      disputes: (model.disputes || []).map(function (row) {
        return Object.assign({}, row, {
          evidence: (row.evidence || []).map(function (item) { return Object.assign({}, item); }),
          events: (row.events || []).map(function (item) { return Object.assign({}, item); })
        });
      })
    };
  }
  function createDispute(model, input, actor, nowIso) {
    actor = actor || {};
    if (!isGm(actor.role) && !isCorporate(actor.role)) return { ok: false, error: "forbidden", model: model };
    var gap = problems(input);
    if (gap) return { ok: false, error: gap, model: model };
    if (!isCorporate(actor.role) && input.hotel !== actor.hotel && blank(input).hotel !== actor.hotel) {
      return { ok: false, error: "hotel", model: model };
    }
    var row = blank(input);
    if (!isCorporate(actor.role) && row.hotel !== String(actor.hotel || "").toUpperCase()) {
      return { ok: false, error: "hotel", model: model };
    }
    var next = copyModel(model);
    var id = "cb-" + (next.disputes.length + 1) + "-" + String(nowIso || "").replace(/\D/g, "").slice(-6);
    next.disputes.unshift({
      id: id,
      example: false,
      hotel: row.hotel,
      guest: row.guest,
      confirmation: row.confirmation,
      arrival: row.arrival,
      departure: row.departure,
      room: row.room,
      last4: row.last4,
      brand: row.brand,
      amount: roundMoney(row.amount),
      reasonCode: row.reasonCode,
      reason: row.reason,
      processor: row.processor,
      received: row.received,
      deadline: row.deadline,
      status: "new",
      evidence: [],
      events: [{ id: id + "-h", status: "new", actor: actor.name || "", at: nowIso || "", example: false }]
    });
    return { ok: true, id: id, model: next };
  }
  function setStatus(model, id, status, actor, nowIso) {
    actor = actor || {};
    if (!canSee(actor.role)) return { ok: false, error: "forbidden", model: model };
    if (!statusById(status)) return { ok: false, error: "status", model: model };
    var next = copyModel(model);
    var row = null;
    next.disputes.forEach(function (item) { if (item.id === id) row = item; });
    if (!row) return { ok: false, error: "missing", model: model };
    if (!isCorporate(actor.role) && row.hotel !== actor.hotel) return { ok: false, error: "hotel", model: model };
    if (row.status === status) return { ok: false, error: "same", model: model };
    row.events = row.events.concat([{ id: id + "-h" + row.events.length, status: status, actor: actor.name || "", at: nowIso || "", example: false }]);
    row.status = status;
    return { ok: true, model: next };
  }
  function addEvidence(model, id, kind, fileName, actor) {
    actor = actor || {};
    if (!canSee(actor.role)) return { ok: false, error: "forbidden", model: model };
    if (!evidenceById(kind)) return { ok: false, error: "kind", model: model };
    var name = String(fileName || "").trim();
    if (!name || name.length > 120) return { ok: false, error: "file", model: model };
    var next = copyModel(model);
    var row = null;
    next.disputes.forEach(function (item) { if (item.id === id) row = item; });
    if (!row) return { ok: false, error: "missing", model: model };
    if (!isCorporate(actor.role) && row.hotel !== actor.hotel) return { ok: false, error: "hotel", model: model };
    row.evidence = row.evidence.concat([{ id: id + "-e" + row.evidence.length, kind: kind, name: name, example: false }]);
    return { ok: true, model: next };
  }

  var api = {
    STATUSES: STATUSES,
    EVIDENCE: EVIDENCE,
    BRANDS: BRANDS,
    exampleDisputes: exampleDisputes,
    deadlineFlag: deadlineFlag,
    money: money,
    visible: visible,
    filterRows: filterRows,
    pickHotels: pickHotels,
    totals: totals,
    chart: chart,
    homeSummary: homeSummary,
    checklist: checklist,
    problems: problems,
    createDispute: createDispute,
    setStatus: setStatus,
    addEvidence: addEvidence,
    canSee: canSee,
    isCorporate: isCorporate,
    isGm: isGm
  };
  root.Chargebacks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var KEY = "jrportal_cb_v1";
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function L(en, es) { return tx(langNow(), en, es); }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (!me) return { role: "", hotel: "", name: "" };
      return { role: me.role || "", hotel: me.hotel || "", name: me.name || "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function demoUi() {
    try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
    return true;
  }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function readSaved() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      return data && Array.isArray(data.disputes) ? data.disputes : [];
    } catch (e) { return []; }
  }
  function writeSaved(rows) {
    try { localStorage.setItem(KEY, JSON.stringify({ disputes: rows.filter(function (row) { return !row.example; }) })); } catch (e) {}
  }
  function directory() {
    var list = [];
    try {
      if (typeof HOTELS !== "undefined") {
        Object.keys(HOTELS).forEach(function (id) {
          if (id === "CORP") return;
          list.push({ id: id, name: String(HOTELS[id] || id) });
        });
      }
    } catch (e) {}
    return list;
  }
  function modelNow() {
    var examples = demoUi() ? exampleDisputes(todayIso()) : [];
    var saved = readSaved();
    return { disputes: saved.concat(examples) };
  }
  function remember(model) { writeSaved(model.disputes || []); }
  function statusLabel(id) {
    var row = statusById(id);
    return row ? L(row.en, row.es) : id;
  }
  function flagClass(row) {
    if (!OPEN[row.status]) return "";
    var flag = deadlineFlag(row.deadline, todayIso());
    return flag ? " cb-" + flag : "";
  }

  function summaryHtml(rows) {
    var sum = totals(rows);
    var bars = chart(sum);
    var rate = sum.winRate == null ? "—" : Math.round(sum.winRate * 100) + "%";
    return '<div class="cb-sum"><div><b>' + money(sum.open) + '</b><span>' + esc(L("Open", "Abiertas")) + '</span></div>' +
      '<div><b>' + money(sum.won) + '</b><span>' + esc(L("Won", "Ganadas")) + '</span></div>' +
      '<div><b>' + money(sum.lost) + '</b><span>' + esc(L("Lost", "Perdidas")) + '</span></div>' +
      '<div><b>' + rate + '</b><span>' + esc(L("Win rate", "Tasa de ganadas")) + '</span></div></div>' +
      '<div class="cb-chart" aria-label="' + esc(L("Won versus lost", "Ganadas contra perdidas")) + '">' +
      '<div><span>' + esc(L("Won", "Ganadas")) + ' ' + sum.wonCount + '</span><i class="cb-won" style="width:' + (sum.wonCount ? bars.wonPct : 0) + '%"></i></div>' +
      '<div><span>' + esc(L("Lost", "Perdidas")) + ' ' + sum.lostCount + '</span><i class="cb-lost" style="width:' + (sum.lostCount ? bars.lostPct : 0) + '%"></i></div></div>';
  }
  function rowHtml(row) {
    var mark = row.example ? ' <span class="ex">' + esc(L("Example", "Ejemplo")) + "</span>" : "";
    return '<button type="button" class="cb-row' + flagClass(row) + '" onclick=\'Chargebacks.open(' + JSON.stringify(row.id) + ')\'>' +
      '<b>' + esc(row.guest) + mark + '</b><small>' + esc(row.hotel) + " · " + esc(row.room) + " · " + money(row.amount) + "</small>" +
      '<small>' + esc(statusLabel(row.status)) + " · " + esc(row.deadline) + "</small></button>";
  }
  function listHtml(rows, actor) {
    var corporate = isCorporate(actor.role);
    var ui = state();
    var hotels = pickHotels(directory(), ui.hotelQ);
    var hotelBits = corporate ? '<label class="cb-lab" for="cbFind">' + esc(L("Hotel", "Hotel")) + '</label><input id="cbFind" value="' + esc(ui.hotelQ) + '" placeholder="' + esc(L("Type a code or name", "Escribe código o nombre")) + '" oninput="Chargebacks.filterHotels(this.value)">' +
      '<div class="cb-hits">' + hotels.matches.map(function (hotel) {
        var on = ui.hotel === hotel.id ? " on" : "";
        return '<button type="button" class="cb-hit' + on + '" onclick=\'Chargebacks.pickHotel(' + JSON.stringify(hotel.id) + ')\'>' + esc(hotel.id) + "</button>";
      }).join("") + (hotels.more ? '<p class="cb-hint">' + esc(L("Keep typing to narrow the list.", "Sigue escribiendo para acotar.")) + "</p>" : "") + "</div>" : "";
    var statuses = '<div class="cb-status">' + '<button type="button" class="' + (ui.status === "all" ? "on" : "") + '" onclick="Chargebacks.pickStatus(\'all\')">' + esc(L("All", "Todas")) + "</button>" +
      STATUSES.map(function (item) {
        return '<button type="button" class="' + (ui.status === item.id ? "on" : "") + '" onclick=\'Chargebacks.pickStatus(' + JSON.stringify(item.id) + ')\'>' + esc(L(item.en, item.es)) + "</button>";
      }).join("") + "</div>";
    var shown = filterRows(rows, corporate ? ui.hotel : actor.hotel, ui.status);
    var example = rows.some(function (row) { return row.example; }) ? '<span class="ex">' + esc(L("Example data", "Datos de ejemplo")) + "</span>" : "";
    return '<h2>' + esc(L("Chargebacks", "Contracargos")) + "</h2>" + example + summaryHtml(shown) + hotelBits + statuses +
      '<button type="button" class="btn cb-new" onclick="Chargebacks.compose()">' + esc(L("Log a dispute", "Registrar una disputa")) + "</button>" +
      (shown.map(rowHtml).join("") || '<p class="cb-hint">' + esc(L("No disputes in this view.", "No hay disputas en esta vista.")) + "</p>");
  }
  function detailHtml(row) {
    var checks = checklist(row).map(function (item) {
      return '<li class="' + (item.attached ? "on" : "") + '"><span>' + (item.attached ? "✓" : "○") + "</span> " + esc(L(item.en, item.es)) +
        (item.attached ? "" : '<label class="cb-file">' + esc(L("Add", "Agregar")) + '<input type="file" accept="image/*,.pdf,.txt,.eml" onchange=\'Chargebacks.attach(' + JSON.stringify(row.id) + ',' + JSON.stringify(item.id) + ',this)\'></label>') +
        "</li>";
    }).join("");
    var names = (row.evidence || []).map(function (item) { return esc(item.name); }).join(", ");
    var history = (row.events || []).map(function (event) {
      return "<li><b>" + esc(statusLabel(event.status)) + "</b> <span>" + esc(event.actor || "") + "</span> <small>" + esc(String(event.at || "").replace("T", " ").slice(0, 16)) + "</small></li>";
    }).join("");
    var options = STATUSES.map(function (item) {
      return '<option value="' + item.id + '"' + (item.id === row.status ? " selected" : "") + ">" + esc(L(item.en, item.es)) + "</option>";
    }).join("");
    return '<button type="button" class="btn2 cb-back" onclick="Chargebacks.close()">' + esc(L("All disputes", "Todas las disputas")) + "</button>" +
      '<h2>' + esc(row.guest) + (row.example ? ' <span class="ex">' + esc(L("Example", "Ejemplo")) + "</span>" : "") + "</h2>" +
      '<div class="card cb-card' + flagClass(row) + '"><p>' + esc(row.hotel) + " · " + esc(L("Room", "Cuarto")) + " " + esc(row.room) + " · " + money(row.amount) + "</p>" +
      "<p>" + esc(row.confirmation) + " · " + esc(row.arrival) + " – " + esc(row.departure) + "</p>" +
      "<p>" + esc(row.brand) + " ·••• " + esc(row.last4) + "</p>" +
      "<p>" + esc(row.reasonCode) + " · " + esc(row.reason) + "</p>" +
      "<p>" + esc(row.processor) + " · " + esc(L("Received", "Recibido")) + " " + esc(row.received) + " · " + esc(L("Deadline", "Fecha límite")) + " " + esc(row.deadline) + "</p></div>" +
      '<div class="card"><h3>' + esc(L("Evidence", "Evidencia")) + "</h3><ul class=\"cb-check\">" + checks + "</ul>" +
      (names ? "<small>" + names + "</small>" : "") + "</div>" +
      '<div class="card"><h3>' + esc(L("Status", "Estado")) + "</h3><div class=\"cb-note-row\"><select id=\"cbStatus\" aria-label=\"" + esc(L("Status", "Estado")) + "\">" + options + "</select>" +
      '<button type="button" class="btn" onclick=\'Chargebacks.saveStatus(' + JSON.stringify(row.id) + ')\'>' + esc(L("Update status", "Actualizar estado")) + "</button></div></div>" +
      '<div class="card"><h3>' + esc(L("History", "Historial")) + "</h3><ol class=\"cb-history\">" + history + "</ol></div>";
  }
  function formHtml(actor) {
    var corporate = isCorporate(actor.role);
    var ui = state();
    var hotelField = corporate
      ? '<label class="cb-lab" for="cbHotelQ">' + esc(L("Hotel", "Hotel")) + '</label><input id="cbHotelQ" placeholder="' + esc(L("Type a code or name", "Escribe código o nombre")) + '" oninput="Chargebacks.filterNewHotel(this.value)" value="' + esc(ui.hotelQ) + '"><div class="cb-hits">' +
        pickHotels(directory(), ui.hotelQ).matches.map(function (hotel) {
          return '<button type="button" class="' + (ui.picked === hotel.id ? "on" : "") + '" onclick=\'Chargebacks.chooseHotel(' + JSON.stringify(hotel.id) + ')\'>' + esc(hotel.id) + " · " + esc(hotel.name) + "</button>";
        }).join("") + "</div><p>" + esc(ui.picked || L("Choose a hotel. Nothing is selected for you.", "Elige un hotel. Nada queda elegido solo.")) + "</p>"
      : '<p><b>' + esc(actor.hotel) + "</b></p>";
    function field(id, label, type, extra) {
      return '<label class="cb-lab" for="' + id + '">' + esc(label) + '</label><input id="' + id + '" ' + (type ? 'type="' + type + '" ' : "") + (extra || "") + ">";
    }
    var brands = BRANDS.map(function (brand) { return '<option value="' + brand + '">' + brand + "</option>"; }).join("");
    return '<button type="button" class="btn2 cb-back" onclick="Chargebacks.close()">' + esc(L("All disputes", "Todas las disputas")) + "</button>" +
      "<h2>" + esc(L("Log a dispute", "Registrar una disputa")) + "</h2><div class=\"card\">" + hotelField +
      field("cbGuest", L("Guest name", "Nombre del huésped")) +
      field("cbConf", L("Confirmation #", "Confirmación")) +
      field("cbIn", L("Arrival", "Llegada"), "date") +
      field("cbOut", L("Departure", "Salida"), "date") +
      field("cbRoom", L("Room", "Cuarto")) +
      field("cbLast4", L("Card last 4", "Últimos 4"), "text", 'inputmode="numeric" maxlength="4" autocomplete="off"') +
      '<label class="cb-lab" for="cbBrand">' + esc(L("Card brand", "Marca")) + '</label><select id="cbBrand"><option value="">' + esc(L("Choose", "Elige")) + "</option>" + brands + "</select>" +
      field("cbAmount", L("Amount", "Monto"), "number", 'min="0" step="0.01"') +
      field("cbCode", L("Reason code", "Código de razón")) +
      field("cbReason", L("Reason", "Razón")) +
      field("cbCase", L("Processor / case #", "Procesador / caso")) +
      field("cbReceived", L("Date received", "Fecha de recibido"), "date") +
      field("cbDeadline", L("Response deadline", "Fecha límite de respuesta"), "date") +
      '<p id="cbErr" class="cb-err"></p><button type="button" class="btn cb-new" onclick="Chargebacks.save()">' + esc(L("Save dispute", "Guardar disputa")) + "</button></div>";
  }

  function state() {
    root.__cb = root.__cb || { hotel: "all", status: "all", hotelQ: "", id: "", compose: false, picked: "" };
    return root.__cb;
  }
  function show() {
    if (typeof render === "function") render();
  }
  api.page = function () {
    var actor = actorNow();
    if (!canSee(actor.role)) return "<h2>" + esc(L("Chargebacks", "Contracargos")) + "</h2>";
    var ui = state();
    var rows = visible(modelNow().disputes, actor);
    if (ui.compose) return formHtml(actor);
    if (ui.id) {
      var row = null;
      modelNow().disputes.forEach(function (item) { if (item.id === ui.id) row = item; });
      if (row && (isCorporate(actor.role) || row.hotel === actor.hotel)) return detailHtml(row);
    }
    return listHtml(rows, actor);
  };
  api.open = function (id) { var ui = state(); ui.id = id; ui.compose = false; show(); };
  api.close = function () { var ui = state(); ui.id = ""; ui.compose = false; show(); };
  api.compose = function () { var ui = state(); ui.compose = true; ui.picked = ""; ui.hotelQ = ""; show(); };
  api.filterHotels = function (q) { state().hotelQ = q || ""; show(); api.focusFind(); };
  api.pickHotel = function (id) { var ui = state(); ui.hotel = ui.hotel === id ? "all" : id; show(); };
  api.pickStatus = function (id) { state().status = id; show(); };
  api.filterNewHotel = function (q) { state().hotelQ = q || ""; show(); api.focusFind(); };
  api.chooseHotel = function (id) { state().picked = id; show(); };
  api.focusFind = function () {
    var el = document.getElementById("cbFind") || document.getElementById("cbHotelQ");
    if (!el) return;
    el.focus();
    var end = el.value.length;
    try { el.setSelectionRange(end, end); } catch (e) {}
  };
  api.save = function () {
    var actor = actorNow();
    var hotel = isCorporate(actor.role) ? state().picked : actor.hotel;
    function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
    var result = createDispute(modelNow(), {
      hotel: hotel, guest: val("cbGuest"), confirmation: val("cbConf"), arrival: val("cbIn"), departure: val("cbOut"),
      room: val("cbRoom"), last4: val("cbLast4"), brand: val("cbBrand"), amount: val("cbAmount"),
      reasonCode: val("cbCode"), reason: val("cbReason"), processor: val("cbCase"), received: val("cbReceived"), deadline: val("cbDeadline")
    }, actor, new Date().toISOString());
    var err = document.getElementById("cbErr");
    if (!result.ok) { if (err) err.textContent = L("Check the highlighted fields. A card number longer than 4 digits is not saved.", "Revisa los campos. No se guarda un número de tarjeta de más de 4 dígitos."); return; }
    remember(result.model);
    state().compose = false;
    state().id = result.id;
    show();
  };
  api.saveStatus = function (id) {
    var sel = document.getElementById("cbStatus");
    var result = setStatus(modelNow(), id, sel ? sel.value : "", actorNow(), new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    show();
  };
  api.attach = function (id, kind, input) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    var result = addEvidence(modelNow(), id, kind, file.name, actorNow());
    if (!result.ok) return;
    remember(result.model);
    show();
  };
  api.homeHtml = function () {
    var actor = actorNow();
    if (!canSee(actor.role)) return "";
    var rows = visible(modelNow().disputes, actor);
    if (isCorporate(actor.role)) {
      var sum = totals(rows);
      return '<button type="button" class="cb-home" onclick="go(\'chargebacks\')"><span>' + esc(L("Chargebacks", "Contracargos")) + '</span><b>' + money(sum.open) + '</b><small>' + esc(L("Open across hotels", "Abiertas en los hoteles")) + "</small></button>";
    }
    var card = homeSummary(rows, actor.hotel, todayIso());
    var label = card.tone === "open"
      ? L("Open disputes", "Disputas abiertas")
      : L("Due soon or overdue", "Por vencer o vencidas");
    return '<button type="button" class="cb-home cb-' + card.tone + '" onclick="go(\'chargebacks\')"><span>' + esc(L("Chargebacks", "Contracargos")) + '</span><b class="cb-badge">' + card.badge + '</b><small>' + esc(label) + "</small></button>";
  };

  if (typeof M !== "undefined") M.chargebacks = ["💳", "Chargebacks"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Chargebacks = "Contracargos";
  if (typeof V !== "undefined") V.chargebacks = function () { return api.page(); };
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var who = actorNow().role || role;
      if (canSee(who) && list.indexOf("chargebacks") < 0) list.splice(Math.min(1, list.length), 0, "chargebacks");
      return list;
    };
  }
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("chargebacks") < 0) NOCOLS.push("chargebacks"); } catch (e) {}
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("chargebacks") < 0) RSEC[4][2].push("chargebacks"); } catch (e2) {}

  var css = document.createElement("style");
  css.textContent = [
    ".cb-home{display:flex;align-items:center;gap:10px;width:100%;min-height:56px;margin:8px 0;padding:12px 14px;border:0;border-radius:14px;background:#fff;color:#14202b;border-left:4px solid #0c3d5c;box-shadow:0 1px 2px rgba(16,24,40,.06);text-align:left;font-size:17px}",
    ".cb-home b{margin-left:auto;font-size:22px;color:#0c3d5c}",
    ".cb-home small{display:none}",
    ".cb-home.cb-soon{border-left-color:#b45309;background:#fff8ee}",
    ".cb-home.cb-soon b{color:#8a4b08}",
    ".cb-home.cb-overdue{border-left-color:#b42318;background:#fdecea}",
    ".cb-home.cb-overdue b{color:#b42318}",
    ".cb-sum{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}",
    ".cb-sum div{background:#fff;border:1px solid #e2e6ec;border-left:4px solid #0c3d5c;border-radius:12px;padding:10px}",
    ".cb-sum b{display:block;font-size:22px;color:#0c3d5c}",
    ".cb-sum span{font-size:14px;color:#3c4a59}",
    ".cb-chart{margin:8px 0 12px}",
    ".cb-chart div{margin:6px 0}",
    ".cb-chart span{display:block;font-size:14px;font-weight:700}",
    ".cb-chart i{display:block;height:12px;border-radius:99px}",
    ".cb-won{background:#0c3d5c}",
    ".cb-lost{background:#b42318}",
    ".cb-row{display:flex;flex-direction:column;align-items:flex-start;width:100%;min-height:72px;margin:0 0 8px;padding:10px 12px;border:1px solid #e2e6ec;border-left:4px solid #0c3d5c;border-radius:12px;background:#fff;text-align:left;font-size:17px;white-space:normal}",
    ".cb-row.cb-soon{border-left-color:#b45309;background:#fff8ee}",
    ".cb-row.cb-overdue{border-left-color:#b42318;background:#fdecea}",
    ".cb-row small{color:#3c4a59}",
    ".cb-status,.cb-hits{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}",
    ".cb-status button,.cb-hits button,.cb-back{min-height:48px;border:1px solid #d5dde6;border-radius:12px;background:#fff;color:#14202b;font-size:15px;padding:8px 10px}",
    ".cb-status button.on,.cb-hits button.on{background:#0c3d5c;color:#fff;border-color:#0c3d5c}",
    ".cb-new{width:100%;min-height:52px;margin:8px 0}",
    ".cb-lab{display:block;margin:10px 0 4px;font-weight:750}",
    "#app .card input,#app .card select,.cb-note-row select{width:100%;min-height:48px;font-size:17px}",
    ".cb-check{list-style:none;margin:0;padding:0}",
    ".cb-check li{display:flex;align-items:center;gap:8px;min-height:48px;border-top:1px solid #e6ebf2;font-size:17px}",
    ".cb-check li.on{color:#0c3d5c;font-weight:750}",
    ".cb-file{margin-left:auto;position:relative;min-height:40px;padding:6px 10px;border:1px solid #0c3d5c;border-radius:10px;color:#0c3d5c;font-weight:750}",
    ".cb-file input{position:absolute;inset:0;opacity:0}",
    ".cb-history{margin:0;padding-left:18px}",
    ".cb-history li{margin:6px 0;font-size:16px}",
    ".cb-hint,.cb-err{color:#3c4a59;font-size:15px}",
    ".cb-err:empty{display:none}",
    ".cb-note-row{display:flex;gap:8px;align-items:center}",
    ".cb-note-row .btn{flex:0 0 auto}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
