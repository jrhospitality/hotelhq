/* Night Audit is a daily check-in for the GM and AGM.
   Each morning they clear that hotel's flagged items: Done, Not an issue, or Explain.
   Unresolved items carry to the next morning. The check-in is overdue after the due time
   (default 10:00 AM America/Chicago). Corporate sees every hotel. A hotel sees only itself.
   This screen is demo-only. Live mode loads the file and does not add a menu or a card.
   Sample guests start with "Sample" and confirmations start with "DEMO".
   Opera, OnQ, and Marriott parsers stay empty until real report samples arrive.
   The mailbox body is not stored. Parsed rows belong in night_audit_report_rows. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var TZ = "America/Chicago";
  var DEFAULT_DUE = "10:00";
  var DUE_CHOICES = ["07:00", "08:00", "09:00", "10:00", "11:00"];
  var KEY = "jrportal_night_audit_v1";
  var CATEGORIES = [
    { id: "missed", en: "Missed charges", es: "Cargos faltantes", shortEn: "Missed", shortEs: "Faltan" },
    { id: "balances", en: "Balances", es: "Saldos", shortEn: "Balance", shortEs: "Saldo" },
    { id: "rates", en: "Rates", es: "Tarifas", shortEn: "Rate", shortEs: "Tarifa" },
    { id: "adjustments", en: "Adjustments", es: "Ajustes", shortEn: "Adjust", shortEs: "Ajuste" },
    { id: "cash", en: "Cash & payments", es: "Efectivo y pagos", shortEn: "Cash", shortEs: "Efectivo" },
    { id: "rooms", en: "Rooms", es: "Cuartos", shortEn: "Room", shortEs: "Cuarto" },
    { id: "taxes", en: "Taxes", es: "Impuestos", shortEn: "Tax", shortEs: "Impuesto" },
    { id: "ar", en: "AR & audit", es: "CxC y auditoría", shortEn: "AR", shortEs: "CxC" }
  ];
  var RULES = {
    noshow_uncharged: rule("missed", "Guaranteed no-show was not charged", "No-show garantizado sin cargo", "Post the no-show charge", "Publica el cargo de no-show"),
    late_cancel_uncharged: rule("missed", "Late cancel was not charged", "Cancelación tardía sin cargo", "Post the cancel fee", "Publica la penalización"),
    early_checkin_fee: rule("missed", "Early check-in fee was not posted", "Falta el cargo por llegada temprana", "Post the early check-in fee", "Publica el cargo de llegada temprana"),
    late_checkout_fee: rule("missed", "Late checkout fee was not posted", "Falta el cargo por salida tarde", "Post the late checkout fee", "Publica el cargo de salida tarde"),
    pet_fee: rule("missed", "Pet fee was not posted", "Falta el cargo de mascota", "Post the pet fee", "Publica el cargo de mascota"),
    ota_vcc: rule("missed", "OTA virtual card was not charged", "Tarjeta virtual OTA sin cargo", "Charge the virtual card", "Cobra la tarjeta virtual"),
    checkout_balance: rule("balances", "Checked-out folio still has a balance", "Folio de salida con saldo", "Collect or transfer the balance", "Cobra o transfiere el saldo"),
    cancel_balance: rule("balances", "Cancelled folio still has a balance", "Folio cancelado con saldo", "Clear the cancelled folio", "Liquida el folio cancelado"),
    over_auth: rule("balances", "In-house balance is over the card auth", "Saldo en casa supera la autorización", "Add authorization or collect", "Amplía la autorización o cobra"),
    no_card: rule("balances", "In-house stay has no card on file", "Estadía en casa sin tarjeta", "Take a card or an approved account", "Toma una tarjeta o una cuenta aprobada"),
    direct_bill: rule("balances", "Direct bill has no approved account", "Cuenta directa sin aprobación", "Attach an approved city-ledger account", "Asigna una cuenta aprobada"),
    override_no_reason: rule("rates", "Rate override has no reason", "Cambio de tarifa sin motivo", "Add the reason or restore BAR", "Agrega el motivo o vuelve a BAR"),
    deep_cut_bar: rule("rates", "Rate is a deep cut off BAR", "Tarifa muy por debajo de BAR", "Confirm the discount or restore BAR", "Confirma el descuento o vuelve a BAR"),
    zero_rate: rule("rates", "Room rate is $0", "La tarifa del cuarto es $0", "Set the real rate or a comp code", "Pon la tarifa real o un código de cortesía"),
    walkin_below_floor: rule("rates", "Walk-in is below the rate floor", "Walk-in bajo el mínimo", "Raise the rate to the floor", "Sube la tarifa al mínimo"),
    group_outside_block: rule("rates", "Group rate is outside the block dates", "Tarifa de grupo fuera del bloque", "Match the block dates or BAR", "Ajusta a las fechas del bloque o a BAR"),
    rate_mismatch: rule("rates", "Rate charged does not match the reservation", "Tarifa cobrada distinta a la reserva", "Match the reservation rate", "Iguala la tarifa de la reserva"),
    adj_no_reason: rule("adjustments", "Adjustment has no reason", "Ajuste sin motivo", "Add a reason and an approver", "Agrega motivo y quien aprueba"),
    void_no_approver: rule("adjustments", "Void has no approver", "Anulación sin aprobación", "Add the approver", "Agrega quien aprueba"),
    refund_no_reason: rule("adjustments", "Refund has no reason", "Reembolso sin motivo", "Add the reason and an approver", "Agrega motivo y quien aprueba"),
    comp_no_approver: rule("adjustments", "Comp has no approver", "Cortesía sin aprobación", "Add the approver", "Agrega quien aprueba"),
    refund_uncharged_card: rule("adjustments", "Refund went to a card that was never charged", "Reembolso a una tarjeta nunca cobrada", "Reverse the refund", "Revierte el reembolso"),
    clerk_adjust_most: rule("adjustments", "One clerk posted most of the adjustment dollars", "Un empleado concentró los ajustes", "Review that clerk's adjustments", "Revisa los ajustes de ese empleado"),
    cash_over: rule("cash", "Cash drawer is over for the shift", "Caja sobrante en el turno", "Recount and note the overage", "Recuenta y anota el sobrante"),
    cash_short: rule("cash", "Cash drawer is short for the shift", "Caja faltante en el turno", "Recount and note the shortage", "Recuenta y anota el faltante"),
    paid_out_no_receipt: rule("cash", "Paid-out has no receipt", "Pago sin recibo", "Attach the receipt", "Adjunta el recibo"),
    batch_unsettled: rule("cash", "Card batch is not settled", "Lote de tarjetas sin cerrar", "Settle the batch", "Cierra el lote"),
    ooo_not_returned: rule("rooms", "OOO room was repaired and not returned", "Cuarto fuera de servicio reparado y no devuelto", "Return the room to inventory", "Devuelve el cuarto al inventario"),
    comp_room_no_approval: rule("rooms", "Comp room has no approval", "Cuarto de cortesía sin aprobación", "Add approval or post the rate", "Agrega aprobación o publica la tarifa"),
    house_use_no_approval: rule("rooms", "House-use room has no approval", "Uso de casa sin aprobación", "Add approval or check the guest out", "Agrega aprobación o haz la salida"),
    exempt_no_cert: rule("taxes", "Tax-exempt stay has no certificate", "Exento de impuesto sin certificado", "File the certificate or post tax", "Archiva el certificado o cobra el impuesto"),
    long_stay_threshold: rule("taxes", "Long stay hit the state exemption threshold", "Estadía larga llegó al umbral estatal", "Review the tax exemption", "Revisa la exención de impuesto"),
    room_no_tax: rule("taxes", "Room charge has no tax", "Cargo de cuarto sin impuesto", "Post the room tax", "Publica el impuesto del cuarto"),
    ar_ready: rule("ar", "AR invoice is ready to bill", "Cuenta por cobrar lista para facturar", "Send the invoice", "Envía la factura"),
    ar_aging: rule("ar", "AR balance is past due", "Cuenta por cobrar vencida", "Collect or note the follow-up", "Cobra o anota el seguimiento"),
    audit_late: rule("ar", "Night audit is late and the date did not roll", "Auditoría tarde y la fecha no cambió", "Finish the audit and roll the date", "Termina la auditoría y cambia la fecha"),
    reports_stopped: rule("ar", "Hotel reports stopped arriving", "Dejaron de llegar los reportes", "Check the PMS report email", "Revisa el correo de reportes del PMS")
  };
  var parsers = {};

  function rule(category, whyEn, whyEs, fixEn, fixEs) {
    return { category: category, whyEn: whyEn, whyEs: whyEs, fixEn: fixEn, fixEs: fixEs };
  }
  function categoryById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return null;
  }
  function isCorporate(role) {
    return role === "Above Property" || role === "JR Corporate" || role === "above_property";
  }
  function isLeader(role) {
    return isCorporate(role) || role === "GM" || role === "AGM" || role === "gm" || role === "agm";
  }
  function hotelsFor(role, hotel) {
    if (!isLeader(role)) return [];
    if (isCorporate(role)) return HOTELS.slice();
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function canAct(actor, hotel) {
    actor = actor || {};
    return hotelsFor(actor.role, actor.hotel).indexOf(hotel) >= 0;
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
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(earlier, later) {
    var a = earlier.split("-").map(Number);
    var b = later.split("-").map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }
  function zonedParts(now) {
    var date = now instanceof Date ? now : new Date(now);
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") bag[part.type] = part.value;
    });
    var hour = Number(bag.hour);
    if (hour === 24) hour = 0;
    return { date: bag.year + "-" + bag.month + "-" + bag.day, minutes: hour * 60 + Number(bag.minute) };
  }
  function checkinDate(now) { return zonedParts(now).date; }
  function dueMinutes(hhmm) { return Number(String(hhmm).slice(0, 2)) * 60 + Number(String(hhmm).slice(3, 5)); }
  function dueInstant(date, hhmm) {
    var h = Number(String(hhmm).slice(0, 2));
    var m = Number(String(hhmm).slice(3, 5));
    var y = Number(date.slice(0, 4));
    var mo = Number(date.slice(5, 7));
    var da = Number(date.slice(8, 10));
    for (var off = 5; off <= 6; off++) {
      var ms = Date.UTC(y, mo - 1, da, h + off, m, 0);
      var parts = zonedParts(new Date(ms));
      if (parts.date === date && parts.minutes === h * 60 + m) return new Date(ms).toISOString();
    }
    return new Date(Date.UTC(y, mo - 1, da, h + 6, m, 0)).toISOString();
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function money(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function catLabel(id, lang, short) {
    var cat = categoryById(id);
    if (!cat) return id;
    if (short) return lang === "es" ? cat.shortEs : cat.shortEn;
    return lang === "es" ? cat.es : cat.en;
  }
  function fmtDue(hhmm, lang) {
    var h = Number(String(hhmm).slice(0, 2));
    var m = String(hhmm).slice(3, 5);
    var ap = h >= 12 ? (lang === "es" ? "p.m." : "PM") : (lang === "es" ? "a.m." : "AM");
    return (h % 12 || 12) + ":" + m + " " + ap + " CT";
  }
  function fmtClock(iso, lang) {
    if (!iso) return "";
    var parts = zonedParts(iso);
    var h = Math.floor(parts.minutes / 60);
    var m = String(parts.minutes % 60).padStart(2, "0");
    var ap = h >= 12 ? (lang === "es" ? "p.m." : "PM") : (lang === "es" ? "a.m." : "AM");
    return (h % 12 || 12) + ":" + m + " " + ap;
  }
  function safeItem(id) { return /^na-[a-z0-9-]{1,48}$/.test(String(id || "")) ? String(id) : ""; }
  function fingerprint(item) {
    return item.hotel + "|" + item.code + "|" + item.confirmation;
  }
  function makeItem(id, hotel, auditDate, code, guest, confirmation, amount, room) {
    var spec = RULES[code];
    return {
      id: id, hotel: hotel, auditDate: auditDate, category: spec.category, code: code,
      guest: guest, confirmation: confirmation, amount: amount, room: room || "",
      whyEn: spec.whyEn, whyEs: spec.whyEs, fixEn: spec.fixEn, fixEs: spec.fixEs,
      fingerprint: hotel + "|" + code + "|" + confirmation
    };
  }
  function staff(hotel, kind) {
    if (hotel === "MSPAM") return { name: "Riley Brooks", role: "GM" };
    if (hotel === "MSPMS") return { name: "Dana Singh", role: "GM" };
    if (kind === "late") return { name: "Blake Morgan", role: "AGM" };
    return { name: "Avery Cole", role: "GM" };
  }
  function pastKind(hotel, age) {
    if (age < 1 || age > 13) return "";
    if (hotel === "MSPWE" && (age === 1 || age === 8)) return "missed";
    if (hotel === "MSPWE" && age === 3) return "late";
    if (hotel === "MSPMS" && age === 1) return "missed";
    if (hotel === "MSPMS" && age === 6) return "late";
    return "on_time";
  }
  function buildDemo(now) {
    var today = checkinDate(now);
    var lastNight = addDays(today, -1);
    var older = addDays(today, -2);
    var settings = { MSPWE: DEFAULT_DUE, MSPAM: DEFAULT_DUE, MSPMS: "09:00" };
    var items = [
      makeItem("na-mspwe-noshow", "MSPWE", older, "noshow_uncharged", "Sample Guest Ames", "DEMO-1001", 189, "118"),
      makeItem("na-mspwe-vcc", "MSPWE", lastNight, "ota_vcc", "Sample Guest Brooks", "DEMO-1042", 214, "214"),
      makeItem("na-mspwe-bill", "MSPWE", lastNight, "direct_bill", "Sample Account North", "DEMO-1044", 640, ""),
      makeItem("na-mspwe-adj", "MSPWE", lastNight, "adj_no_reason", "Sample Guest Cole", "DEMO-1045", 55, "220"),
      makeItem("na-mspam-late", "MSPAM", lastNight, "late_checkout_fee", "Sample Guest Nguyen", "DEMO-2201", 40, "105"),
      makeItem("na-mspam-zero", "MSPAM", lastNight, "zero_rate", "Sample Guest Shah", "DEMO-2202", 129, "210"),
      makeItem("na-mspam-batch", "MSPAM", lastNight, "batch_unsettled", "Sample Card Batch", "DEMO-BATCH", 0, ""),
      makeItem("na-mspms-ar", "MSPMS", older, "ar_aging", "Sample Account West", "DEMO-AR19", 1260, ""),
      makeItem("na-mspms-ooo", "MSPMS", lastNight, "ooo_not_returned", "Sample Room 118", "DEMO-3310", 0, "118"),
      makeItem("na-mspms-tax", "MSPMS", lastNight, "exempt_no_cert", "Sample Guest Blake", "DEMO-3302", 38, "204")
    ];
    var resolutions = [
      { itemId: "na-mspam-late", hotel: "MSPAM", checkinDate: today, action: "done", note: "", by: "Riley Brooks", role: "GM", at: dueInstant(today, "08:12"), source: "sample" },
      { itemId: "na-mspam-zero", hotel: "MSPAM", checkinDate: today, action: "explain", note: "Sample comp. GM approved in the demo.", by: "Riley Brooks", role: "GM", at: dueInstant(today, "08:12"), source: "sample" },
      { itemId: "na-mspam-batch", hotel: "MSPAM", checkinDate: today, action: "done", note: "", by: "Riley Brooks", role: "GM", at: dueInstant(today, "08:12"), source: "sample" }
    ];
    var completions = [{
      hotel: "MSPAM", date: today, at: dueInstant(today, "08:12"), due: settings.MSPAM,
      by: "Riley Brooks", role: "GM", openCount: 0, resolvedCount: 3, amountOpen: 0, source: "sample"
    }];
    HOTELS.forEach(function (hotel) {
      for (var age = 1; age <= 13; age++) {
        var kind = pastKind(hotel, age);
        if (kind !== "on_time" && kind !== "late") continue;
        var date = addDays(today, -age);
        var who = staff(hotel, kind);
        var at = dueInstant(date, kind === "late" ? "11:40" : "08:05");
        completions.push({
          hotel: hotel, date: date, at: at, due: settings[hotel], by: who.name, role: who.role,
          openCount: 0, resolvedCount: 3, amountOpen: 0, source: "sample"
        });
      }
    });
    return {
      origin: "example", now: now instanceof Date ? now.toISOString() : String(now), today: today,
      settings: settings, settingsTouched: false, items: items, resolutions: resolutions,
      completions: completions,
      suppressions: [{
        hotel: "MSPWE", code: "pet_fee", confirmation: "DEMO-0990",
        fingerprint: "MSPWE|pet_fee|DEMO-0990", note: "Sample stay, no pet.",
        by: "Blake Morgan", at: dueInstant(addDays(today, -4), "08:20"), active: true, source: "sample"
      }]
    };
  }
  function validDue(value) { return DUE_CHOICES.indexOf(value) >= 0; }
  function applySaved(model, saved) {
    var next = clone(model);
    saved = saved || {};
    HOTELS.forEach(function (hotel) {
      if (saved.settings && validDue(saved.settings[hotel])) next.settings[hotel] = saved.settings[hotel];
    });
    if (saved.settings) next.settingsTouched = true;
    (saved.resolutions || []).forEach(function (row) {
      if (!row || !safeItem(row.itemId) || ["done", "not_issue", "explain"].indexOf(row.action) < 0) return;
      if (!next.items.some(function (item) { return item.id === row.itemId; })) return;
      next.resolutions = next.resolutions.filter(function (have) { return have.itemId !== row.itemId; });
      next.resolutions.push(row);
    });
    (saved.suppressions || []).forEach(function (row) {
      if (!row || HOTELS.indexOf(row.hotel) < 0 || !RULES[row.code] || !row.confirmation) return;
      next.suppressions.push(row);
    });
    (saved.completions || []).forEach(function (row) {
      if (!row || HOTELS.indexOf(row.hotel) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(row.date || "")) return;
      next.completions = next.completions.filter(function (have) { return !(have.hotel === row.hotel && have.date === row.date); });
      next.completions.push(row);
    });
    return next;
  }
  function userOverlay(model) {
    return {
      v: 1,
      settings: model.settingsTouched ? model.settings : null,
      resolutions: (model.resolutions || []).filter(function (row) { return row.source === "user"; }),
      suppressions: (model.suppressions || []).filter(function (row) { return row.source === "user"; }),
      completions: (model.completions || []).filter(function (row) { return row.source === "user"; })
    };
  }
  function resolutionFor(model, itemId) {
    var found = null;
    (model.resolutions || []).forEach(function (row) { if (row.itemId === itemId) found = row; });
    return found;
  }
  function completionFor(model, hotel, date) {
    var found = null;
    (model.completions || []).forEach(function (row) { if (row.hotel === hotel && row.date === date) found = row; });
    return found;
  }
  function itemsForCheckin(model, hotel, date) {
    var night = addDays(date, -1);
    return (model.items || []).filter(function (item) {
      if (item.hotel !== hotel || !(item.auditDate < date)) return false;
      var res = resolutionFor(model, item.id);
      return !res || res.checkinDate === date;
    }).map(function (item) {
      var res = resolutionFor(model, item.id);
      return Object.assign({}, item, { carried: item.auditDate < night, resolution: res || null });
    }).sort(function (a, b) {
      if (!!a.resolution !== !!b.resolution) return a.resolution ? 1 : -1;
      if (a.carried !== b.carried) return a.carried ? -1 : 1;
      return String(a.guest).localeCompare(String(b.guest));
    });
  }
  function openItems(model, hotel, date) {
    return itemsForCheckin(model, hotel, date).filter(function (item) { return !item.resolution; });
  }
  function summary(model, hotel, date) {
    var rows = itemsForCheckin(model, hotel, date);
    var open = rows.filter(function (row) { return !row.resolution; });
    return {
      open: open.length,
      resolved: rows.length - open.length,
      amount: open.reduce(function (sum, row) { return sum + Number(row.amount || 0); }, 0),
      rows: rows
    };
  }
  function dueFor(model, hotel, date) {
    var done = completionFor(model, hotel, date);
    if (done && done.due) return done.due;
    return (model.settings && model.settings[hotel]) || DEFAULT_DUE;
  }
  function statusOf(model, hotel, date, now) {
    var today = model.today || checkinDate(now);
    var done = completionFor(model, hotel, date);
    var due = dueFor(model, hotel, date);
    if (done && done.at) return done.at <= dueInstant(date, due) ? "on_time" : "late";
    if (date < today) return "missed";
    if (date > today) return "future";
    return zonedParts(now).minutes >= dueMinutes(due) ? "overdue" : "open";
  }
  function streak(model, hotel, now) {
    var n = 0;
    for (var i = 0; i < 21; i++) {
      var st = statusOf(model, hotel, addDays(model.today, -i), now);
      if (i === 0 && st === "open") continue;
      if (i === 0 && st === "overdue") return 0;
      if (st === "on_time") n++;
      else break;
    }
    return n;
  }
  function history(model, hotel, now, days) {
    var out = [];
    days = days || 14;
    for (var i = days - 1; i >= 0; i--) {
      var date = addDays(model.today, -i);
      out.push({ date: date, status: statusOf(model, hotel, date, now) });
    }
    return out;
  }
  function categorySummary(model, hotels, date) {
    var counts = {};
    CATEGORIES.forEach(function (cat) { counts[cat.id] = { id: cat.id, open: 0, amount: 0 }; });
    (hotels || []).forEach(function (hotel) {
      openItems(model, hotel, date).forEach(function (item) {
        if (!counts[item.category]) return;
        counts[item.category].open += 1;
        counts[item.category].amount += Number(item.amount || 0);
      });
    });
    return CATEGORIES.map(function (cat) { return counts[cat.id]; });
  }
  function hotelRows(model, hotels, now) {
    return (hotels || []).map(function (hotel) {
      var sum = summary(model, hotel, model.today);
      return { hotel: hotel, status: statusOf(model, hotel, model.today, now), open: sum.open, amount: sum.amount, streak: streak(model, hotel, now) };
    });
  }
  function isSuppressed(item, list) {
    var fp = item.fingerprint || fingerprint(item);
    return (list || []).some(function (row) {
      if (row.active === false) return false;
      if (row.hotel !== item.hotel || row.code !== item.code) return false;
      if (row.confirmation && row.confirmation === item.confirmation) return true;
      return !!(row.fingerprint && row.fingerprint === fp);
    });
  }
  function resolve(model, itemId, action, note, actor, now) {
    if (!safeItem(itemId) || ["done", "not_issue", "explain"].indexOf(action) < 0) return { ok: false, error: "unknown" };
    var item = null;
    (model.items || []).forEach(function (row) { if (row.id === itemId) item = row; });
    if (!item || !canAct(actor, item.hotel)) return { ok: false, error: "denied" };
    var visible = openItems(model, item.hotel, model.today).some(function (row) { return row.id === itemId; });
    if (!visible) return { ok: false, error: "closed" };
    note = String(note || "").trim();
    if (action === "explain" && (note.length < 3 || note.length > 240)) return { ok: false, error: "note" };
    if (note.length > 240) note = note.slice(0, 240);
    var next = clone(model);
    next.resolutions.push({
      itemId: itemId, hotel: item.hotel, checkinDate: next.today, action: action,
      note: note, by: actor.name || actor.role || "", role: actor.role || "",
      at: now instanceof Date ? now.toISOString() : String(now), source: "user"
    });
    if (action === "not_issue") {
      next.suppressions.push({
        hotel: item.hotel, code: item.code, confirmation: item.confirmation, fingerprint: item.fingerprint,
        note: note, by: actor.name || "", at: String(now), active: true, source: "user"
      });
    }
    if (!openItems(next, item.hotel, next.today).length && !completionFor(next, item.hotel, next.today)) {
      var sum = summary(next, item.hotel, next.today);
      next.completions.push({
        hotel: item.hotel, date: next.today, at: String(now), due: next.settings[item.hotel] || DEFAULT_DUE,
        by: actor.name || "", role: actor.role || "", openCount: 0, resolvedCount: sum.resolved,
        amountOpen: 0, source: "user"
      });
    }
    return { ok: true, model: next };
  }
  function markComplete(model, hotel, actor, now) {
    if (!canAct(actor, hotel)) return { ok: false, error: "denied" };
    if (openItems(model, hotel, model.today).length) return { ok: false, error: "open" };
    if (completionFor(model, hotel, model.today)) return { ok: true, model: model };
    var next = clone(model);
    var sum = summary(next, hotel, next.today);
    next.completions.push({
      hotel: hotel, date: next.today, at: String(now), due: next.settings[hotel] || DEFAULT_DUE,
      by: actor.name || "", role: actor.role || "", openCount: 0, resolvedCount: sum.resolved,
      amountOpen: 0, source: "user"
    });
    return { ok: true, model: next };
  }
  function setDue(model, hotel, hhmm, actor) {
    if (!canAct(actor, hotel) || !validDue(hhmm)) return { ok: false, error: "denied" };
    var next = clone(model);
    next.settings[hotel] = hhmm;
    next.settingsTouched = true;
    return { ok: true, model: next };
  }
  function registerParser(source, fn) {
    if (!/^[a-z][a-z0-9_]{0,20}$/.test(String(source || "")) || typeof fn !== "function") return false;
    parsers[source] = fn;
    return true;
  }
  function detectSource(subject, body) {
    var text = String(subject || "") + "\n" + String(body || "");
    if (/^NA\|/m.test(text)) return "fixture";
    var low = text.toLowerCase();
    if (low.indexOf("onq") >= 0 || low.indexOf("hilton") >= 0) return "onq";
    if (low.indexOf("fosse") >= 0 || low.indexOf("marriott") >= 0) return "marriott";
    if (low.indexOf("opera") >= 0 || low.indexOf("ihg") >= 0) return "opera";
    return "unknown";
  }
  function blankParse(status, reason, source, hotel, auditDate) {
    return { ok: status === "parsed", status: status, reason: reason, source: source, hotel: hotel, auditDate: auditDate, rows: [], items: [], suppressed: 0 };
  }
  function parseFixture(body, hotel, auditDate) {
    var rows = [];
    var items = [];
    String(body || "").split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (line.indexOf("NA|") !== 0) return;
      var p = line.split("|");
      if (p.length < 8) return;
      var spec = RULES[p[4]];
      var amount = Number(p[7]);
      rows.push({
        rowNo: rows.length + 1, section: p[3], rawLine: line.slice(0, 400),
        cells: { category: p[3], code: p[4], guest: p[5], confirmation: p[6], amount: amount, room: p[8] || "" }
      });
      if (p[1] !== hotel || p[2] !== auditDate || !spec || spec.category !== p[3]) return;
      if (!p[5] || !p[6] || !isFinite(amount) || amount < 0) return;
      items.push({
        hotel: hotel, auditDate: auditDate, category: p[3], code: p[4], guest: p[5], confirmation: p[6],
        amount: amount, room: p[8] || "", whyEn: spec.whyEn, whyEs: spec.whyEs, fixEn: spec.fixEn, fixEs: spec.fixEs,
        fingerprint: hotel + "|" + p[4] + "|" + p[6]
      });
    });
    return { ok: true, status: "parsed", reason: "", source: "fixture", hotel: hotel, auditDate: auditDate, rows: rows, items: items, suppressed: 0 };
  }
  function parseReport(input) {
    input = input || {};
    var subject = String(input.subject || "");
    var body = String(input.body || "");
    var source = input.source || detectSource(subject, body);
    var hotel = String(input.hotel || "");
    if (!hotel) {
      var found = (subject + "\n" + body).match(/\b(MSPWE|MSPAM|MSPMS)\b/);
      hotel = found ? found[1] : "";
    }
    var auditDate = String(input.auditDate || input.audit_date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(auditDate)) return blankParse("rejected", "audit_date", source, hotel, "");
    if (HOTELS.indexOf(hotel) < 0) return blankParse("rejected", "hotel", source, hotel, auditDate);
    if (parsers[source]) {
      var custom = parsers[source]({ hotel: hotel, auditDate: auditDate, subject: subject, body: body, source: source }) || {};
      custom.source = source;
      custom.hotel = hotel;
      custom.auditDate = auditDate;
      custom.rows = custom.rows || [];
      custom.items = custom.items || [];
      custom.suppressed = custom.suppressed || 0;
      if (!custom.status) custom.status = custom.ok ? "parsed" : "awaiting_sample";
      return custom;
    }
    if (source === "fixture" || /^NA\|/m.test(body)) return parseFixture(body, hotel, auditDate);
    return blankParse("awaiting_sample", "awaiting_sample", source, hotel, auditDate);
  }
  function ingest(input, suppressions) {
    var parsed = parseReport(input);
    if (!parsed.items) return parsed;
    var kept = [];
    var suppressed = 0;
    parsed.items.forEach(function (item) {
      if (isSuppressed(item, suppressions)) suppressed++;
      else kept.push(item);
    });
    parsed.items = kept;
    parsed.suppressed = suppressed;
    return parsed;
  }
  function cellStatus(status, lang) {
    if (status === "overdue") return tx(lang, "Overdue", "Atrasado");
    if (status === "open") return tx(lang, "Open", "Abierto");
    if (status === "late") return tx(lang, "Late", "Tarde");
    if (status === "missed") return tx(lang, "Missed", "Faltó");
    if (status === "on_time") return tx(lang, "Done", "Hecho");
    return "";
  }
  function badgeStatus(status, lang) {
    if (status === "open") return tx(lang, "Not completed today", "Sin completar hoy");
    if (status === "overdue") return tx(lang, "Overdue", "Atrasado");
    if (status === "late") return tx(lang, "Done late", "Hecho tarde");
    if (status === "missed") return tx(lang, "Missed", "Faltó");
    return tx(lang, "Done", "Hecho");
  }
  function worst(statuses) {
    var rank = { overdue: 0, open: 1, missed: 2, late: 3, on_time: 4, future: 5 };
    return (statuses || []).slice().sort(function (a, b) { return (rank[a] == null ? 9 : rank[a]) - (rank[b] == null ? 9 : rank[b]); })[0] || "on_time";
  }
  function actionLabel(action, lang) {
    if (action === "not_issue") return tx(lang, "Not an issue", "No es problema");
    if (action === "explain") return tx(lang, "Explain", "Explicar");
    return tx(lang, "Done", "Listo");
  }
  function table(headers, rows) {
    var head = "<tr>" + headers.map(function (h) { return "<th scope=\"col\">" + esc(h) + "</th>"; }).join("") + "</tr>";
    var body = rows.map(function (row) {
      return "<tr>" + row.map(function (cell) { return "<td>" + cell + "</td>"; }).join("") + "</tr>";
    }).join("");
    return "<table class=\"na-t\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table>";
  }
  function historyHtml(model, hotel, now, lang) {
    var rows = history(model, hotel, now, 14);
    var onTime = rows.filter(function (row) { return row.status === "on_time"; }).length;
    var dots = rows.map(function (row) {
      var day = String(Number(row.date.slice(8, 10)));
      var label = row.date + " " + cellStatus(row.status, lang);
      return "<span class=\"na-dot na-st-" + row.status + "\" title=\"" + esc(label) + "\">" + esc(day) + "</span>";
    }).join("");
    return "<p class=\"na-note\">" + esc(onTime + "/14 " + tx(lang, "on time", "a tiempo")) + "</p><div class=\"na-hist\" role=\"img\" aria-label=\"" + esc(onTime + "/14 " + tx(lang, "on time", "a tiempo")) + "\">" + dots + "</div>";
  }
  function categoryTable(model, hotels, date, lang) {
    var rows = categorySummary(model, hotels, date).filter(function (row) { return row.open > 0; });
    if (!rows.length) return "";
    return "<h3>" + esc(tx(lang, "By category", "Por categoría")) + "</h3>" + table(
      [tx(lang, "Cat", "Cat"), "#", "$"],
      rows.map(function (row) { return [esc(catLabel(row.id, lang, true)), esc(String(row.open)), esc(money(row.amount))]; })
    );
  }
  function hotelTable(model, hotels, now, lang, selected) {
    var rows = hotelRows(model, hotels, now).map(function (row) {
      var code = selected === row.hotel ? "<b>" + esc(row.hotel) + "</b>" : esc(row.hotel);
      var btn = "<button type=\"button\" class=\"na-jump\" onclick=\"naHotel('" + row.hotel + "')\">" + code + "</button>";
      return [btn, esc(cellStatus(row.status, lang)), esc(String(row.open)), esc(money(row.amount))];
    });
    return "<h3>" + esc(tx(lang, "By hotel", "Por hotel")) + "</h3>" + table([tx(lang, "Hotel", "Hotel"), tx(lang, "Status", "Estado"), "#", "$"], rows);
  }
  function itemHtml(item, lang, view) {
    var why = lang === "es" ? item.whyEs : item.whyEn;
    var fix = lang === "es" ? item.fixEs : item.fixEn;
    var bits = [item.confirmation, catLabel(item.category, lang, true)];
    if (item.room) bits.push(item.room);
    if (item.carried) bits.push(tx(lang, "Carried", "Arrastrado"));
    var open = !item.resolution;
    var body = "<article class=\"na-item" + (item.carried ? " na-carried" : "") + "\" id=\"" + esc(item.id) + "\">" +
      "<div class=\"na-line\"><b>" + esc(item.guest) + "</b><b>" + esc(money(item.amount)) + "</b></div>" +
      "<p class=\"na-meta\">" + esc(bits.join(" · ")) + "</p>" +
      "<p>" + esc(why) + "</p><p class=\"na-fix\">" + esc(fix) + "</p>";
    if (!open) {
      body += "<p class=\"na-note\">" + esc(item.resolution.by + " · " + actionLabel(item.resolution.action, lang) + (item.resolution.note ? " · " + item.resolution.note : "")) + "</p></article>";
      return body;
    }
    var id = item.id;
    body += "<div class=\"na-acts\">" +
      "<button type=\"button\" class=\"btn\" onclick=\"naAct('" + id + "','done')\">" + esc(tx(lang, "Done", "Listo")) + "</button>" +
      "<button type=\"button\" class=\"btn2\" onclick=\"naAct('" + id + "','not_issue')\">" + esc(tx(lang, "Not an issue", "No es problema")) + "</button>" +
      "<button type=\"button\" class=\"btn2\" onclick=\"naExplain('" + id + "')\">" + esc(tx(lang, "Explain", "Explicar")) + "</button></div>";
    if (view.openId === id) {
      body += "<label class=\"na-note-label\">" + esc(tx(lang, "Note", "Nota")) +
        "<textarea id=\"naNote\" maxlength=\"240\" aria-label=\"" + esc(tx(lang, "Note", "Nota")) + "\"></textarea></label>" +
        "<button type=\"button\" class=\"btn\" onclick=\"naAct('" + id + "','explain')\">" + esc(tx(lang, "Save note", "Guardar nota")) + "</button>";
      if (view.error === "note") body += "<p class=\"bad\">" + esc(tx(lang, "Add a short note", "Agrega una nota breve")) + "</p>";
    }
    return body + "</article>";
  }
  function checkinHtml(model, actor, view) {
    view = view || {};
    var lang = view.lang === "es" ? "es" : "en";
    var hotels = hotelsFor(actor && actor.role, actor && actor.hotel);
    if (!hotels.length) return "";
    var hotel = hotels.indexOf(view.hotel) >= 0 ? view.hotel : hotels[0];
    var now = view.now || model.now;
    var sum = summary(model, hotel, model.today);
    var status = statusOf(model, hotel, model.today, now);
    var done = completionFor(model, hotel, model.today);
    var due = (model.settings && model.settings[hotel]) || DEFAULT_DUE;
    var cats = categorySummary(model, [hotel], model.today).filter(function (row) { return row.open > 0; });
    var chips = "<button type=\"button\" class=\"" + (view.category ? "" : "on") + "\" onclick=\"naCat('all')\">" + esc(tx(lang, "All", "Todas")) + " " + sum.open + "</button>" +
      cats.map(function (row) {
        return "<button type=\"button\" class=\"" + (view.category === row.id ? "on" : "") + "\" onclick=\"naCat('" + row.id + "')\">" + esc(catLabel(row.id, lang, true) + " " + row.open) + "</button>";
      }).join("");
    var rows = sum.rows.filter(function (item) { return !view.category || item.category === view.category; });
    var openRows = rows.filter(function (item) { return !item.resolution; });
    var closedRows = rows.filter(function (item) { return item.resolution; });
    var banner = "";
    if (done && !sum.open) {
      banner = "<p class=\"na-done\" role=\"status\">" + esc(tx(lang, "Completed by", "Completado por") + " " + done.by + " · " + fmtClock(done.at, lang)) + "</p>";
    } else if (!sum.open) {
      banner = "<button type=\"button\" class=\"btn na-wide\" onclick=\"naMark('" + hotel + "')\">" + esc(tx(lang, "Mark check-in complete", "Marcar revisión completa")) + "</button>";
    }
    var dueControl = "";
    if (canAct(actor, hotel)) {
      dueControl = "<label class=\"na-due\">" + esc(tx(lang, "Due", "Límite")) +
        "<select aria-label=\"" + esc(tx(lang, "Due time", "Hora límite")) + "\" onchange=\"naDue('" + hotel + "', this.value)\">" +
        DUE_CHOICES.map(function (choice) {
          return "<option value=\"" + choice + "\"" + (choice === due ? " selected" : "") + ">" + esc(fmtDue(choice, lang)) + "</option>";
        }).join("") + "</select></label>";
    }
    var held = (model.suppressions || []).filter(function (row) { return row.hotel === hotel && row.active !== false; }).length;
    var heldNote = held ? "<p class=\"na-note\">" + esc(held + " " + tx(lang, "similar items held off later lists", "casos similares quedan fuera de listas futuras")) + "</p>" : "";
    var list = openRows.map(function (item) { return itemHtml(item, lang, view); }).join("") ||
      "<p class=\"na-note\">" + esc(tx(lang, "Nothing open in this check-in.", "Nada abierto en esta revisión.")) + "</p>";
    var closed = closedRows.length ? "<details class=\"na-closed\"><summary>" + esc(closedRows.length + " " + tx(lang, "resolved", "resueltos")) + "</summary>" + closedRows.map(function (item) { return itemHtml(item, lang, view); }).join("") + "</details>" : "";
    var hotelsBlock = hotels.length > 1 ? hotelTable(model, hotels, now, lang, hotel) + categoryTable(model, hotels, model.today, lang) : categoryTable(model, [hotel], model.today, lang);
    return "<div class=\"na\" id=\"naRoot\"><h2>" + esc(tx(lang, "Night Audit", "Auditoría nocturna")) + "</h2>" +
      "<p class=\"na-note\"><span class=\"ex\">EXAMPLE</span> " + esc(tx(lang, "Sample items for this demo. No real guests.", "Casos de ejemplo para esta demostración. No hay huéspedes reales.")) + "</p>" +
      hotelsBlock +
      "<section class=\"card na-work\"><div class=\"na-line\"><h3>" + esc(hotel) + "</h3><span class=\"na-badge na-st-" + status + "\">" + esc(badgeStatus(status, lang)) + "</span></div>" +
      "<p class=\"na-note\">" + esc(tx(lang, "Due", "Límite") + " " + fmtDue(due, lang) + " · " + tx(lang, "Streak", "Racha") + " " + streak(model, hotel, now)) + "</p>" +
      dueControl +
      "<div class=\"na-k\"><div><b>" + sum.open + "</b><span>" + esc(tx(lang, "Open", "Abiertos")) + "</span></div><div><b>" + sum.resolved + "</b><span>" + esc(tx(lang, "Resolved", "Resueltos")) + "</span></div><div><b>" + esc(money(sum.amount)) + "</b><span>" + esc(tx(lang, "At risk", "En riesgo")) + "</span></div></div>" +
      historyHtml(model, hotel, now, lang) + banner + heldNote +
      "<div class=\"na-chips\">" + chips + "</div>" + list + closed + "</section></div>";
  }
  function homeCard(model, actor, lang) {
    lang = lang === "es" ? "es" : "en";
    var hotels = hotelsFor(actor && actor.role, actor && actor.hotel).filter(featureOn);
    if (!hotels.length) return "";
    var now = model.now;
    var rows = hotelRows(model, hotels, now);
    var status = worst(rows.map(function (row) { return row.status; }));
    var open = rows.reduce(function (sum, row) { return sum + row.open; }, 0);
    var amount = rows.reduce(function (sum, row) { return sum + row.amount; }, 0);
    var waiting = rows.filter(function (row) { return row.status === "open" || row.status === "overdue" || row.status === "missed"; }).length;
    var headline = hotels.length > 1
      ? waiting + " " + tx(lang, "not done", "sin completar")
      : hotels[0] + " · " + tx(lang, "Streak", "Racha") + " " + rows[0].streak;
    var tableHtml = hotels.length > 1 ? table(
      [tx(lang, "Hotel", "Hotel"), tx(lang, "Status", "Estado"), "#", "$"],
      rows.map(function (row) { return [esc(row.hotel), esc(cellStatus(row.status, lang)), esc(String(row.open)), esc(money(row.amount))]; })
    ) : "";
    return "<section class=\"na-home\" id=\"naHome\"><div class=\"na-line\"><h3>" + esc(tx(lang, "Night Audit", "Auditoría nocturna")) + "</h3><span class=\"na-badge na-st-" + status + "\">" + esc(badgeStatus(status, lang)) + "</span></div>" +
      "<p class=\"na-note\">" + esc(headline) + " · " + open + " " + esc(tx(lang, "open", "abiertos")) + " · " + esc(money(amount)) + "</p>" +
      tableHtml +
      "<button type=\"button\" class=\"btn na-wide\" id=\"naOpenBtn\" onclick=\"naOpen('" + (hotels.length === 1 ? hotels[0] : rows[0].hotel) + "')\">" + esc(tx(lang, "Open check-in", "Abrir revisión")) + "</button></section>";
  }
  function featureOn(hotel) {
    try {
      if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "night_audit") !== false;
    } catch (e) {}
    return true;
  }
  function emptySaved() { return { v: 1, settings: null, resolutions: [], suppressions: [], completions: [] }; }
  function readSaved() {
    try {
      if (typeof localStorage === "undefined") return emptySaved();
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1) return emptySaved();
      return data;
    } catch (e) { return emptySaved(); }
  }
  function writeSaved(overlay) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(overlay)); } catch (e) {}
  }
  function bundle() {
    return applySaved(buildDemo(new Date().toISOString()), readSaved());
  }
  function currentActor() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (!me) return { role: "", hotel: "", name: "" };
      return { role: me.role, hotel: me.hotel || "", name: me.name || "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function viewNow() {
    var actor = currentActor();
    var hotels = hotelsFor(actor.role, actor.hotel);
    var picked = "";
    try { picked = S.naHotel || S.hotel || ""; } catch (e) { picked = ""; }
    return {
      hotel: hotels.indexOf(picked) >= 0 ? picked : hotels[0],
      category: "",
      openId: "",
      error: ""
    };
  }
  function pageState() {
    var view = viewNow();
    try {
      if (S.naCat && S.naCat !== "all") view.category = S.naCat;
      view.openId = S.naItem || "";
      view.error = S.naErr || "";
    } catch (e) {}
    view.lang = langNow();
    view.now = new Date().toISOString();
    return view;
  }
  function remember(model) { writeSaved(userOverlay(model)); }
  function toast(lang, en, es) {
    try { if (typeof showToast === "function") showToast(tx(lang, en, es)); } catch (e) {}
  }

  var api = {
    HOTELS: HOTELS, CATEGORIES: CATEGORIES, RULES: RULES, DEFAULT_DUE: DEFAULT_DUE, DUE_CHOICES: DUE_CHOICES, TZ: TZ,
    isLeader: isLeader, isCorporate: isCorporate, hotelsFor: hotelsFor, canAct: canAct, demoUi: demoUi,
    checkinDate: checkinDate, zonedParts: zonedParts, dueInstant: dueInstant, addDays: addDays,
    buildDemo: buildDemo, applySaved: applySaved, userOverlay: userOverlay,
    itemsForCheckin: itemsForCheckin, openItems: openItems, summary: summary, categorySummary: categorySummary,
    hotelRows: hotelRows, statusOf: statusOf, streak: streak, history: history,
    resolve: resolve, markComplete: markComplete, setDue: setDue, isSuppressed: isSuppressed,
    parseReport: parseReport, ingest: ingest, detectSource: detectSource, registerParser: registerParser,
    checkinHtml: checkinHtml, homeCard: homeCard, money: money, cellStatus: cellStatus, badgeStatus: badgeStatus
  };
  root.NightAudit = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  function bootPage() {
    var actor = currentActor();
    if (!isLeader(actor.role)) return "<div class=\"na\" id=\"naRoot\"></div>";
    return checkinHtml(bundle(), actor, pageState());
  }
  function homeHtml() {
    if (!demoUi()) return "";
    var actor = currentActor();
    if (!isLeader(actor.role)) return "";
    return homeCard(bundle(), actor, langNow());
  }
  api.homeHtml = homeHtml;

  root.naOpen = function (hotel) {
    if (HOTELS.indexOf(hotel) < 0 || !canAct(currentActor(), hotel)) return;
    try { S.naHotel = hotel; if (typeof save === "function") save(); } catch (e) {}
    if (typeof go === "function") go("naudit");
  };
  root.naHotel = function (hotel) {
    if (HOTELS.indexOf(hotel) < 0 || !canAct(currentActor(), hotel)) return;
    try { S.naHotel = hotel; S.naItem = ""; S.naErr = ""; if (typeof save === "function") save(); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.naCat = function (id) {
    if (id !== "all" && !categoryById(id)) return;
    try { S.naCat = id; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.naExplain = function (id) {
    if (!safeItem(id)) return;
    try { S.naItem = id; S.naErr = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.naDue = function (hotel, hhmm) {
    var result = setDue(bundle(), hotel, hhmm, currentActor());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  root.naMark = function (hotel) {
    var result = markComplete(bundle(), hotel, currentActor(), new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    toast(langNow(), "Check-in complete", "Revisión completa");
    if (typeof render === "function") render();
  };
  root.naAct = function (id, action) {
    var note = "";
    if (action === "explain") {
      var el = document.getElementById("naNote");
      note = el ? el.value : "";
    }
    var actor = currentActor();
    var result = resolve(bundle(), id, action, note, actor, new Date().toISOString());
    if (!result.ok) {
      try { S.naItem = id; S.naErr = result.error; } catch (e) {}
      if (typeof render === "function") render();
      return;
    }
    remember(result.model);
    try { S.naItem = ""; S.naErr = ""; } catch (e2) {}
    var lang = langNow();
    if (action === "not_issue") toast(lang, "Recorded. Similar items can stay off later lists.", "Anotado. Casos similares pueden quedar fuera después.");
    else if (!openItems(result.model, result.model.resolutions[result.model.resolutions.length - 1].hotel, result.model.today).length) toast(lang, "Check-in complete", "Revisión completa");
    if (typeof render === "function") render();
  };

  if (typeof M !== "undefined") M.naudit = ["🌙", "Night Audit"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Night Audit"] = "Auditoría nocturna";
  if (typeof V !== "undefined") V.naudit = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = currentActor();
      var hotel = "";
      try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
      var show = demoUi() && isLeader(actor.role || role) && hotelsFor(actor.role || role, actor.hotel || hotel).some(featureOn);
      if (show && list.indexOf("naudit") < 0) list.splice(Math.min(1, list.length), 0, "naudit");
      if (!show) list = list.filter(function (id) { return id !== "naudit"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows && !root.HHQMenus.menuAllows("naudit", actor.role || role, hotel, function (h, feature) {
        return feature === "night_audit" ? featureOn(h) : true;
      })) list = list.filter(function (id) { return id !== "naudit"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("naudit") < 0) RSEC[4][2].push("naudit"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("naudit") < 0) NOCOLS.push("naudit"); } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "night_audit", en: "Night audit", es: "Auditoría nocturna", order: 25 });

  var style = document.createElement("style");
  style.textContent = [
    ".na-home{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".na-home h3,.na-work h3{margin:0;font-size:16px}",
    ".na-line{display:flex;justify-content:space-between;align-items:center;gap:8px}",
    ".na-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".na-fix{font-size:14px;margin:4px 0 8px}",
    ".na-meta{font-size:13px;color:#3c4658;margin:2px 0}",
    ".na-badge{display:inline-block;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:800;white-space:nowrap}",
    ".na-st-open{background:#fff3cd;color:#8a5a00}",
    ".na-st-overdue,.na-st-missed{background:#fde2e1;color:#7a1218}",
    ".na-st-on_time{background:#d4f5dc;color:#15642f}",
    ".na-st-late{background:#fff0c2;color:#8a5a00}",
    ".na-k{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0}",
    ".na-k div{background:#eef3fa;border-radius:8px;padding:8px 4px;text-align:center}",
    ".na-k b{display:block;font-size:18px}",
    ".na-k span{display:block;color:#3c4658;font-size:12px}",
    ".na-t{width:100%;border-collapse:collapse;font-size:14px;margin:0 0 8px}",
    ".na-t th,.na-t td{padding:6px 4px;border-bottom:1px solid #e6ebf2;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".na-t td:last-child,.na-t th:last-child,.na-t td:nth-child(3),.na-t th:nth-child(3){text-align:right}",
    ".na-jump{background:transparent;border:0;padding:0;min-height:44px;font-weight:800;color:#14365d}",
    ".na-chips,.na-hist{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}",
    ".na-chips button{flex:0 0 auto;background:#e6ebf2;color:#14365d;font-weight:700;font-size:13px}",
    ".na-chips button.on{background:#14365d;color:#fff}",
    ".na-dot{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;border-radius:6px;font-size:11px;font-weight:800}",
    ".na-item{padding:8px 0;border-top:1px solid #e6ebf2}",
    ".na-acts{display:flex;gap:6px}",
    ".na-acts button{flex:1;white-space:normal;line-height:1.2;font-size:13px}",
    ".na-note-label{display:block;font-size:13px;font-weight:700;margin-top:8px}",
    ".na-note-label textarea{display:block;width:100%;margin-top:4px;font-weight:400}",
    ".na-wide{width:100%;margin-top:8px}",
    ".na-due{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;margin:6px 0}",
    ".na-due select{flex:1}",
    ".na-done{background:#d4f5dc;color:#15642f;border-radius:8px;padding:8px 10px;font-weight:800}",
    ".na-closed{margin-top:8px}",
    ".na-carried{background:#fffaf0}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
