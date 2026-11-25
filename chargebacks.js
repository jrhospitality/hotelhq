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
  var CHOICES = {
    chip: ["Chip", "Chip"], swipe: ["Swipe", "Banda"], keyed: ["Keyed", "Digitada"], online: ["Online", "En línea"],
    yes: ["Yes", "Sí"], no: ["No", "No"], none: ["None on file", "No hay"],
    damage: ["Damage", "Daño"], smoking: ["Smoking", "Fumar"], incidental: ["Other incidental", "Otro cargo"]
  };
  function choice(id, en, es, required, options) {
    return { id: id, en: en, es: es, required: !!required, options: options || null };
  }
  function proof(id, en, es, required) {
    return { id: id, en: en, es: es, required: !!required };
  }
  var CATEGORIES = [
    {
      id: "fraud_cnp", en: "Fraud / card not present", es: "Fraude / tarjeta no presente",
      fields: [
        choice("cardEntry", "Card entry at check-in", "Cómo se leyó la tarjeta", true, ["chip", "swipe", "keyed", "online"]),
        choice("authCode", "Authorization code", "Código de autorización", true),
        choice("avsCvv", "AVS / CVV result", "Resultado AVS / CVV", true),
        choice("bookingChannel", "IP or booking channel", "IP o canal de reserva", false),
        choice("bookingEmail", "Booking email", "Correo de la reserva", false),
        choice("priorStays", "Prior stays by this guest", "Estancias previas de este huésped", false),
        choice("loyalty", "Loyalty number", "Número de lealtad", false)
      ],
      evidence: [
        proof("registration", "Signed registration card", "Tarjeta de registro firmada", true),
        proof("id", "Guest ID copy", "Copia de identificación", true),
        proof("authorization", "Card authorization", "Autorización de tarjeta", true),
        proof("email", "Booking email", "Correo de la reserva", false),
        proof("folio", "Folio", "Folio", false)
      ]
    },
    {
      id: "fraud_cp", en: "Fraud / card present", es: "Fraude / tarjeta presente",
      fields: [
        choice("cardEntry", "Card entry at check-in", "Cómo se leyó la tarjeta", true, ["chip", "swipe"]),
        choice("authCode", "Authorization code", "Código de autorización", false)
      ],
      evidence: [
        proof("chip_log", "Chip read log", "Registro de lectura del chip", true),
        proof("signature", "Signature", "Firma", true),
        proof("id_match", "ID matched to the cardholder", "Identificación igual al tarjetahabiente", true),
        proof("id", "Guest ID copy", "Copia de identificación", false)
      ]
    },
    {
      id: "no_show", en: "No-show", es: "No se presentó",
      fields: [
        choice("policyShown", "Cancellation policy shown at booking", "Política de cancelación mostrada al reservar", true, ["yes", "no"]),
        choice("cancelNumber", "Cancellation number", "Número de cancelación", true, ["none"])
      ],
      evidence: [
        proof("guarantee", "Guaranteed reservation", "Reserva garantizada", true),
        proof("policy", "Cancellation policy", "Política de cancelación", true),
        proof("confirmation_email", "Confirmation email sent", "Correo de confirmación enviado", true),
        proof("no_show_posting", "Night audit no-show posting", "Cargo de no-show en la auditoría", true)
      ]
    },
    {
      id: "cancelled", en: "Cancelled but charged", es: "Cancelada pero cobrada",
      fields: [
        choice("cancelAt", "Cancel request date and time", "Fecha y hora de la cancelación", true),
        choice("deadlineAt", "Cancellation deadline", "Límite para cancelar", true),
        choice("cancelNumber", "Cancellation number given", "Número de cancelación dado", true)
      ],
      evidence: [
        proof("policy", "Cancellation policy", "Política de cancelación", true),
        proof("email", "Cancel request", "Solicitud de cancelación", false)
      ]
    },
    {
      id: "not_received", en: "Services not received or not as described", es: "Servicio no recibido o no como se describió",
      fields: [
        choice("compensation", "Compensation given", "Compensación dada", true),
        choice("resolution", "How the complaint was resolved", "Cómo se resolvió la queja", false)
      ],
      evidence: [
        proof("folio", "Folio", "Folio", true),
        proof("key_log", "Key card log", "Registro de llave", true),
        proof("complaint", "Guest complaint and resolution", "Queja y resolución", true),
        proof("guest_history", "Medallia or guest messages", "Medallia o mensajes del huésped", false)
      ]
    },
    {
      id: "duplicate_amount", en: "Duplicate, wrong amount, or credit not processed", es: "Duplicado, monto incorrecto o crédito no procesado",
      fields: [
        choice("explanation", "What was posted and why", "Qué se cargó y por qué", true),
        choice("refunds", "Refunds, with dates and amounts", "Reembolsos, con fechas y montos", false)
      ],
      evidence: [
        proof("folio", "Folio showing one posting", "Folio con un solo cargo", true),
        proof("refund", "Refund receipt", "Recibo del reembolso", false)
      ]
    },
    {
      id: "deposit", en: "Advance deposit or prepaid", es: "Depósito o prepago",
      fields: [
        choice("termsAck", "Terms acknowledged", "Términos aceptados", true, ["yes", "no"])
      ],
      evidence: [
        proof("deposit_policy", "Deposit policy", "Política de depósito", true),
        proof("confirmation_email", "Confirmation showing the terms", "Confirmación con los términos", false)
      ]
    },
    {
      id: "incidental", en: "Incidental, damage, or smoking fee", es: "Cargo incidental, daño o fumar",
      fields: [
        choice("feeKind", "Fee type", "Tipo de cargo", true, ["damage", "smoking", "incidental"])
      ],
      evidence: [
        proof("signed_policy", "Signed policy", "Política firmada", true),
        proof("photos", "Timestamped photos", "Fotos con fecha y hora", true),
        proof("work_order", "Maintenance work order", "Orden de mantenimiento", true),
        proof("cleaning_invoice", "Cleaning invoice", "Factura de limpieza", false)
      ]
    }
  ];
  var REASON_CODES = [
    { code: "10.4", brand: "Visa", category: "fraud_cnp" },
    { code: "10.5", brand: "Visa", category: "fraud_cnp" },
    { code: "4837", brand: "Mastercard", category: "fraud_cnp" },
    { code: "4863", brand: "Mastercard", category: "fraud_cnp" },
    { code: "F29", brand: "Amex", category: "fraud_cnp" },
    { code: "F24", brand: "Amex", category: "fraud_cnp" },
    { code: "UA02", brand: "Discover", category: "fraud_cnp" },
    { code: "10.3", brand: "Visa", category: "fraud_cp" },
    { code: "10.1", brand: "Visa", category: "fraud_cp" },
    { code: "4870", brand: "Mastercard", category: "fraud_cp" },
    { code: "4871", brand: "Mastercard", category: "fraud_cp" },
    { code: "F10", brand: "Amex", category: "fraud_cp" },
    { code: "UA01", brand: "Discover", category: "fraud_cp" },
    { code: "C18", brand: "Amex", category: "no_show" },
    { code: "4855", brand: "Mastercard", category: "no_show" },
    { code: "NS", brand: "Discover", category: "no_show" },
    { code: "13.7", brand: "Visa", category: "cancelled" },
    { code: "13.2", brand: "Visa", category: "cancelled" },
    { code: "4841", brand: "Mastercard", category: "cancelled" },
    { code: "C04", brand: "Amex", category: "cancelled" },
    { code: "C05", brand: "Amex", category: "cancelled" },
    { code: "13.1", brand: "Visa", category: "not_received" },
    { code: "13.3", brand: "Visa", category: "not_received" },
    { code: "4853", brand: "Mastercard", category: "not_received" },
    { code: "C08", brand: "Amex", category: "not_received" },
    { code: "C31", brand: "Amex", category: "not_received" },
    { code: "RG", brand: "Discover", category: "not_received" },
    { code: "RN", brand: "Discover", category: "not_received" },
    { code: "12.6", brand: "Visa", category: "duplicate_amount" },
    { code: "12.5", brand: "Visa", category: "duplicate_amount" },
    { code: "13.6", brand: "Visa", category: "duplicate_amount" },
    { code: "4834", brand: "Mastercard", category: "duplicate_amount" },
    { code: "4860", brand: "Mastercard", category: "duplicate_amount" },
    { code: "C02", brand: "Amex", category: "duplicate_amount" },
    { code: "C14", brand: "Amex", category: "duplicate_amount" },
    { code: "DP", brand: "Discover", category: "duplicate_amount" },
    { code: "AW", brand: "Discover", category: "duplicate_amount" }
  ];

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
  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }
  function evidenceById(id) {
    var i, j, ev;
    for (i = 0; i < EVIDENCE.length; i++) if (EVIDENCE[i].id === id) return EVIDENCE[i];
    for (i = 0; i < CATEGORIES.length; i++) {
      ev = CATEGORIES[i].evidence || [];
      for (j = 0; j < ev.length; j++) if (ev[j].id === id) return ev[j];
    }
    return null;
  }
  function normCode(code) { return String(code || "").toUpperCase().replace(/\s+/g, ""); }
  function categoryFor(code, brand) {
    var key = normCode(code);
    var want = String(brand || "");
    var hits = REASON_CODES.filter(function (row) { return normCode(row.code) === key && (!want || row.brand === want); });
    if (!hits.length) return "";
    if (!want) {
      var cats = {};
      hits.forEach(function (row) { cats[row.category] = 1; });
      if (Object.keys(cats).length !== 1) return "";
    }
    return hits[0].category;
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
    function row(id, hotel, guest, amount, status, deadlineDays, kinds, category, details) {
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
        category: category || "",
        details: details || {},
        evidence: (kinds || []).map(function (kind, i) {
          return { id: id + "-e" + i, kind: kind, name: "example-" + kind + ".pdf", example: true };
        }),
        events: [{ id: id + "-h", status: status, actor: "Example GM (EX)", at: today + "T15:00:00.000Z", example: true }]
      };
    }
    return [
      row("ex-cb-1", "MSPWE", "Example Guest A", 186.4, "gathering", 2, ["folio"], "fraud_cnp", { cardEntry: "online", authCode: "EX123" }),
      row("ex-cb-2", "MSPWE", "Example Guest B", 420, "new", -1, [], "no_show", { policyShown: "yes" }),
      row("ex-cb-3", "MSPAM", "Example Guest C", 250, "won", -12, ["folio", "key_log", "complaint"], "not_received", { compensation: "None", resolution: "Example: no complaint was filed." }),
      row("ex-cb-4", "MSPMS", "Example Guest D", 90, "lost", -8, ["policy"], "cancelled", { cancelAt: "2026-11-01 09:00", deadlineAt: "2026-11-02 18:00", cancelNumber: "none" }),
      row("ex-cb-5", "MSPAM", "Example Guest E", 60, "accepted", -6, ["email"], "deposit", { termsAck: "yes" })
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
    var cat = categoryById(dispute && dispute.category);
    var items = cat ? cat.evidence : EVIDENCE;
    return items.map(function (item) {
      return { id: item.id, en: item.en, es: item.es, required: !!item.required, attached: !!have[item.id] };
    });
  }
  function fieldFilled(details, field) {
    return String(details && details[field.id] != null ? details[field.id] : "").trim().length > 0;
  }
  function strength(dispute) {
    var cat = categoryById(dispute && dispute.category);
    if (!cat) return { ready: false, required: 0, done: 0, missing: [] };
    var details = (dispute && dispute.details) || {};
    var have = {};
    var missing = [];
    var required = 0;
    var done = 0;
    ((dispute && dispute.evidence) || []).forEach(function (item) { have[item.kind] = true; });
    (cat.fields || []).forEach(function (field) {
      if (!field.required) return;
      required += 1;
      if (fieldFilled(details, field)) done += 1;
      else missing.push(field.id);
    });
    (cat.evidence || []).forEach(function (item) {
      if (!item.required) return;
      required += 1;
      if (have[item.id]) done += 1;
      else missing.push(item.id);
    });
    return { ready: required > 0 && done === required, required: required, done: done, missing: missing };
  }
  function categoryRates(rows) {
    return CATEGORIES.map(function (cat) {
      var decided = (rows || []).filter(function (row) {
        return row.category === cat.id && (row.status === "won" || row.status === "lost");
      });
      var won = decided.filter(function (row) { return row.status === "won"; }).length;
      return { id: cat.id, en: cat.en, es: cat.es, won: won, lost: decided.length - won, winRate: decided.length ? won / decided.length : null };
    }).filter(function (row) { return row.won + row.lost > 0; });
  }
  function sanitizeDetails(category, details) {
    var cat = categoryById(category);
    var out = {};
    if (!cat) return out;
    (cat.fields || []).forEach(function (field) {
      var value = String(details && details[field.id] != null ? details[field.id] : "").trim().slice(0, 200);
      if (!value) return;
      if (field.options && field.options.indexOf(value) < 0) return;
      out[field.id] = value;
    });
    return out;
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
          details: Object.assign({}, row.details || {}),
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
    var category = categoryById(input.category) ? input.category : categoryFor(row.reasonCode, row.brand);
    if (input.category && !categoryById(input.category)) return { ok: false, error: "category", model: model };
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
      category: category || "",
      details: sanitizeDetails(category, input.details),
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
  function setDetails(model, id, details, actor) {
    actor = actor || {};
    if (!canSee(actor.role)) return { ok: false, error: "forbidden", model: model };
    var next = copyModel(model);
    var row = null;
    next.disputes.forEach(function (item) { if (item.id === id) row = item; });
    if (!row) return { ok: false, error: "missing", model: model };
    if (!isCorporate(actor.role) && row.hotel !== actor.hotel) return { ok: false, error: "hotel", model: model };
    row.details = sanitizeDetails(row.category, details);
    return { ok: true, model: next };
  }

  var api = {
    STATUSES: STATUSES,
    EVIDENCE: EVIDENCE,
    CATEGORIES: CATEGORIES,
    BRANDS: BRANDS,
    categoryFor: categoryFor,
    categoryById: categoryById,
    strength: strength,
    categoryRates: categoryRates,
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
    setDetails: setDetails,
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
  function ratesHtml(rows) {
    var rates = categoryRates(rows);
    if (!rates.length) return "";
    return '<div class="card"><h3>' + esc(L("Win rate by category", "Tasa por categoría")) + "</h3>" +
      rates.map(function (row) {
        var rate = row.winRate == null ? "—" : Math.round(row.winRate * 100) + "%";
        return "<p><b>" + esc(L(row.en, row.es)) + "</b> " + rate + " <small>" + row.won + "–" + row.lost + "</small></p>";
      }).join("") + "</div>";
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
    return '<h2>' + esc(L("Chargebacks", "Contracargos")) + "</h2>" + example + summaryHtml(shown) + (corporate ? ratesHtml(shown) : "") + hotelBits + statuses +
      '<button type="button" class="btn cb-new" onclick="Chargebacks.compose()">' + esc(L("Log a dispute", "Registrar una disputa")) + "</button>" +
      (shown.map(rowHtml).join("") || '<p class="cb-hint">' + esc(L("No disputes in this view.", "No hay disputas en esta vista.")) + "</p>");
  }
  function detailHtml(row) {
    var cat = categoryById(row.category);
    var pack = strength(row);
    var ready = pack.ready
      ? '<p class="cb-ready">' + esc(L("Ready to submit", "Listo para enviar")) + " · " + pack.done + "/" + pack.required + "</p>"
      : '<p class="cb-gap">' + esc(L("Not ready", "Aún no está listo")) + " · " + pack.done + "/" + pack.required + "</p>";
    var fields = cat ? (cat.fields || []).map(function (field) {
      var value = (row.details || {})[field.id] || "";
      var tag = field.required ? L("Required", "Requerido") : L("Recommended", "Recomendado");
      return "<p><b>" + esc(L(field.en, field.es)) + "</b> · " + esc(tag) + "<br>" + esc(value || "—") + "</p>";
    }).join("") : "";
    var checks = checklist(row).map(function (item) {
      return '<li class="' + (item.attached ? "on" : "") + '"><span>' + (item.attached ? "✓" : "○") + "</span> " + esc(L(item.en, item.es)) +
        (cat ? " · " + esc(item.required ? L("Required", "Requerido") : L("Recommended", "Recomendado")) : "") +
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
      "<p>" + esc(row.processor) + " · " + esc(L("Received", "Recibido")) + " " + esc(row.received) + " · " + esc(L("Deadline", "Fecha límite")) + " " + esc(row.deadline) + "</p>" +
      (cat ? "<p><b>" + esc(L(cat.en, cat.es)) + "</b></p>" + ready + fields : "") + "</div>" +
      '<div class="card"><h3>' + esc(L("Evidence", "Evidencia")) + "</h3><ul class=\"cb-check\">" + checks + "</ul>" +
      (names ? "<small>" + names + "</small>" : "") + "</div>" +
      '<div class="card"><h3>' + esc(L("Status", "Estado")) + "</h3><div class=\"cb-note-row\"><select id=\"cbStatus\" aria-label=\"" + esc(L("Status", "Estado")) + "\">" + options + "</select>" +
      '<button type="button" class="btn" onclick=\'Chargebacks.saveStatus(' + JSON.stringify(row.id) + ')\'>' + esc(L("Update status", "Actualizar estado")) + "</button></div></div>" +
      '<div class="card"><h3>' + esc(L("History", "Historial")) + "</h3><ol class=\"cb-history\">" + history + "</ol></div>";
  }
  function extraFields(category, draft) {
    var cat = categoryById(category);
    if (!cat) return "";
    draft = draft || {};
    return (cat.fields || []).map(function (field) {
      var tag = field.required ? L("Required", "Requerido") : L("Recommended", "Recomendado");
      var value = draft[field.id] || "";
      if (field.options) {
        var opts = '<option value=""></option>' + field.options.map(function (opt) {
          var label = CHOICES[opt] ? L(CHOICES[opt][0], CHOICES[opt][1]) : opt;
          return '<option value="' + esc(opt) + '"' + (value === opt ? " selected" : "") + ">" + esc(label) + "</option>";
        }).join("");
        return '<label class="cb-lab" for="cbx-' + field.id + '">' + esc(L(field.en, field.es)) + " · " + esc(tag) + '</label><select id="cbx-' + field.id + '">' + opts + "</select>";
      }
      return '<label class="cb-lab" for="cbx-' + field.id + '">' + esc(L(field.en, field.es)) + " · " + esc(tag) + '</label><input id="cbx-' + field.id + '" value="' + esc(value) + '">';
    }).join("") + '<p class="cb-hint">' + esc(L("Save the dispute, then attach the required files.", "Guarda la disputa y luego adjunta los archivos requeridos.")) + "</p>";
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
    var draft = ui.draft || {};
    function field(id, label, type, extra, value) {
      return '<label class="cb-lab" for="' + id + '">' + esc(label) + '</label><input id="' + id + '" ' + (type ? 'type="' + type + '" ' : "") + 'value="' + esc(value || "") + '" ' + (extra || "") + ">";
    }
    var brands = BRANDS.map(function (brand) { return '<option value="' + brand + '"' + (draft.brand === brand ? " selected" : "") + ">" + brand + "</option>"; }).join("");
    return '<button type="button" class="btn2 cb-back" onclick="Chargebacks.close()">' + esc(L("All disputes", "Todas las disputas")) + "</button>" +
      "<h2>" + esc(L("Log a dispute", "Registrar una disputa")) + "</h2><div class=\"card\">" + hotelField +
      field("cbGuest", L("Guest name", "Nombre del huésped"), "", "", draft.guest) +
      field("cbConf", L("Confirmation #", "Confirmación"), "", "", draft.confirmation) +
      field("cbIn", L("Arrival", "Llegada"), "date", "", draft.arrival) +
      field("cbOut", L("Departure", "Salida"), "date", "", draft.departure) +
      field("cbRoom", L("Room", "Cuarto"), "", "", draft.room) +
      field("cbLast4", L("Card last 4", "Últimos 4"), "text", 'inputmode="numeric" maxlength="4" autocomplete="off"', draft.last4) +
      '<label class="cb-lab" for="cbBrand">' + esc(L("Card brand", "Marca")) + '</label><select id="cbBrand" onchange="Chargebacks.suggestCategory()"><option value="">' + esc(L("Choose", "Elige")) + "</option>" + brands + "</select>" +
      field("cbAmount", L("Amount", "Monto"), "number", 'min="0" step="0.01"', draft.amount) +
      field("cbCode", L("Reason code", "Código de razón"), "text", 'onchange="Chargebacks.suggestCategory()"', draft.reasonCode) +
      '<p class="cb-hint">' + esc(ui.suggested ? L("This code usually means: ", "Este código suele ser: ") + (categoryById(ui.suggested) ? L(categoryById(ui.suggested).en, categoryById(ui.suggested).es) : "") : "") + "</p>" +
      '<div class="cb-status">' + CATEGORIES.map(function (item) {
        return '<button type="button" class="' + (ui.category === item.id ? "on" : "") + '" onclick=\'Chargebacks.pickCategory(' + JSON.stringify(item.id) + ')\'>' + esc(L(item.en, item.es)) + "</button>";
      }).join("") + "</div>" + extraFields(ui.category, ui.draft) +
      field("cbReason", L("Reason", "Razón"), "", "", draft.reason) +
      field("cbCase", L("Processor / case #", "Procesador / caso"), "", "", draft.processor) +
      field("cbReceived", L("Date received", "Fecha de recibido"), "date", "", draft.received) +
      field("cbDeadline", L("Response deadline", "Fecha límite de respuesta"), "date", "", draft.deadline) +
      '<p id="cbErr" class="cb-err"></p><button type="button" class="btn cb-new" onclick="Chargebacks.save()">' + esc(L("Save dispute", "Guardar disputa")) + "</button></div>";
  }

  function state() {
    root.__cb = root.__cb || { hotel: "all", status: "all", hotelQ: "", id: "", compose: false, picked: "", category: "", suggested: "", draft: {} };
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
  api.compose = function () { var ui = state(); ui.compose = true; ui.picked = ""; ui.hotelQ = ""; ui.category = ""; ui.suggested = ""; ui.draft = {}; show(); };
  api.filterHotels = function (q) { state().hotelQ = q || ""; show(); api.focusFind(); };
  api.pickHotel = function (id) { var ui = state(); ui.hotel = ui.hotel === id ? "all" : id; show(); };
  api.pickStatus = function (id) { state().status = id; show(); };
  api.filterNewHotel = function (q) { state().hotelQ = q || ""; show(); api.focusFind(); };
  api.chooseHotel = function (id) { state().picked = id; show(); };
  function captureDraft() {
    function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
    var draft = Object.assign({}, state().draft || {});
    var map = { cbGuest: "guest", cbConf: "confirmation", cbIn: "arrival", cbOut: "departure", cbRoom: "room", cbLast4: "last4", cbBrand: "brand", cbAmount: "amount", cbCode: "reasonCode", cbReason: "reason", cbCase: "processor", cbReceived: "received", cbDeadline: "deadline" };
    Object.keys(map).forEach(function (id) { if (document.getElementById(id)) draft[map[id]] = val(id); });
    var cat = categoryById(state().category);
    if (cat) (cat.fields || []).forEach(function (field) {
      var el = document.getElementById("cbx-" + field.id);
      if (el) draft[field.id] = el.value;
    });
    state().draft = draft;
    return draft;
  }
  api.pickCategory = function (id) {
    captureDraft();
    state().category = categoryById(id) ? id : "";
    show();
  };
  api.suggestCategory = function () {
    var draft = captureDraft();
    var hit = categoryFor(draft.reasonCode, draft.brand);
    state().suggested = hit;
    if (!state().category && hit) state().category = hit;
    show();
  };
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
    var draft = captureDraft();
    var details = {};
    var cat = categoryById(state().category);
    if (cat) (cat.fields || []).forEach(function (field) { details[field.id] = draft[field.id] || ""; });
    var result = createDispute(modelNow(), {
      hotel: hotel, guest: val("cbGuest"), confirmation: val("cbConf"), arrival: val("cbIn"), departure: val("cbOut"),
      room: val("cbRoom"), last4: val("cbLast4"), brand: val("cbBrand"), amount: val("cbAmount"),
      reasonCode: val("cbCode"), reason: val("cbReason"), processor: val("cbCase"), received: val("cbReceived"), deadline: val("cbDeadline"),
      category: state().category, details: details
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
    ".cb-ready{font-weight:800;color:#0c3d5c}",
    ".cb-gap{font-weight:800;color:#8a4b08}",
    ".cb-status button{white-space:normal;text-align:left;height:auto}",
    ".cb-note-row{display:flex;gap:8px;align-items:center}",
    ".cb-note-row .btn{flex:0 0 auto}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
