#!/usr/bin/env node
/* HotelKey daily reports -> Night Audit review payload for MSPWE.
   Prints JSON for public.ingest_hotelkey_night_audit. It does not write
   to the database and it does not keep guest names.

   HotelKey emails CSVs to hotelshq@jrhospitality.com around 5:45 AM
   America/Chicago. Subjects look like "MSPWE Closed Folio Balances",
   "MSPWE House Account Folio Balances", "MSPWE AR Invoice Aging",
   "MSPWE Final Audit", "MSPWE In House Guest Folio Balances", and
   "MSPWE Tax Exemptions Forecast". Housekeeping Detail follows about
   7:45 AM. This repo does not read that mailbox. A separate loader
   already fills hotelkey_audit_lines, ar_closed_folios,
   hotelkey_tax_exemption_forecast, and hotelkey_live_room_status.
   This script does not replace that loader.

   Run it after the CSVs are on disk, for yesterday's business date.
   Housekeeping is not an input to the flags, so 6:15 AM CT is enough.
   Pass --housekeeping only when that file has already arrived.

   node tools/hotelkey-night-audit.js \
     --hotel MSPWE \
     --audit-date yesterday \
     --closed "/path/MSPWE Closed Folio Balances.csv" \
     --final "/path/MSPWE Final Audit.csv" \
     --tax "/path/MSPWE Tax Exemptions Forecast.csv" \
     --rooms "/path/mspwe-ooo.json" \
     --house "/path/MSPWE House Account Folio Balances.csv" \
     --inhouse "/path/MSPWE In House Guest Folio Balances.csv" \
     --aging "/path/MSPWE AR Invoice Aging.csv" \
     --housekeeping "/path/MSPWE Housekeeping Detail.csv" \
     > /tmp/mspwe-night-audit.json

   curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/ingest_hotelkey_night_audit" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     --data-binary @/tmp/mspwe-night-audit.json

   --rooms is a JSON array of hotelkey_live_room_status rows
   ({ "room_number", "ooo" }) or a CSV with those columns. The service
   role can build it with:
   select json_agg(json_build_object('room_number', room_number, 'ooo', ooo))
   from public.hotelkey_live_room_status where hotel_id = 'MSPWE';

   Closed folio columns (any one name from each group):
   folio_ref | confirmation | folio, room | room_number,
   stay_status | status, ending_balance | balance.
   Guest name columns are ignored.
   Final Audit columns: section, line_name | line, line_code | code,
   actual_today | today, net_today | net, plus optional mtd and ytd.
   Tax columns: folio_ref | confirmation, category, and, only when the
   file actually has one, certificate | tax_certificate | cert_on_file.
*/
"use strict";

var fs = require("node:fs");

var HOTELS = { MSPWE: 1, MSPAM: 1, MSPMS: 1 };
var TZ = "America/Chicago";
var NOSHOW_CODES = { NSRR: 1, NSFC: 1, ENSRR: 1, "1307": 1 };

var CLOSED_ALIASES = {
  folio_ref: ["folio_ref", "confirmation", "confirmation_no", "confirmation_number", "conf_number", "folio", "folio_number", "folio_no"],
  room: ["room", "room_number", "room_no"],
  stay_status: ["stay_status", "status", "reservation_status", "folio_status"],
  ending_balance: ["ending_balance", "balance", "folio_balance", "ending_bal"]
};
var AUDIT_ALIASES = {
  section: ["section"],
  line_name: ["line_name", "line", "description"],
  line_code: ["line_code", "code"],
  actual_today: ["actual_today", "actual", "today"],
  net_today: ["net_today", "net"],
  mtd: ["mtd"],
  ytd: ["ytd"]
};
var TAX_ALIASES = {
  folio_ref: ["folio_ref", "confirmation", "confirmation_no", "confirmation_number", "folio", "folio_number"],
  room: ["room", "room_number", "room_no"],
  category: ["category", "exemption_category", "tax_exemption", "exempt_category"],
  exempted_revenue: ["exempted_revenue", "revenue", "exempt_amount"],
  certificate: ["certificate", "tax_certificate", "exemption_certificate", "cert_on_file", "certificate_on_file"]
};
var ROOM_ALIASES = {
  room_number: ["room_number", "room", "room_no"],
  ooo: ["ooo", "out_of_order"]
};

function normHeader(value) {
  return String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
function chicagoDate(now) {
  var date = now instanceof Date ? now : new Date(now || Date.now());
  var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  var bag = {};
  fmt.formatToParts(date).forEach(function (part) {
    if (part.type !== "literal") bag[part.type] = part.value;
  });
  return bag.year + "-" + bag.month + "-" + bag.day;
}
function addDays(iso, days) {
  var p = String(iso || "").split("-").map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function resolveAuditDate(value, now) {
  var text = String(value || "").trim();
  if (text === "yesterday") return addDays(chicagoDate(now || new Date()), -1);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}
function num(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  var s = String(value).trim();
  if (!s || s === "-" || s === "—") return null;
  var neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (s.charAt(0) === "-") {
    neg = true;
    s = s.slice(1);
  }
  s = s.replace(/[$,\s]/g, "");
  if (!s) return null;
  var n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}
function round2(n) {
  var sign = n < 0 ? -1 : 1;
  return sign * (Math.round((Math.abs(Number(n)) * 100) + 1e-9) / 100);
}
function clip(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}
function folioRef(value) {
  var s = String(value || "").trim().replace(/[^A-Za-z0-9._-]/g, "");
  if (!s) return "";
  return s.slice(0, 20);
}
function roomOf(value) {
  return String(value || "").trim().replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
}
function stayStatus(value) {
  var s = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (s === "CHECKED_OUT" || s === "CHECKOUT" || s === "CHECKEDOUT" || s === "DEPARTED") return "CHECKED_OUT";
  if (s === "NO_SHOW" || s === "NOSHOW") return "NO_SHOW";
  if (s === "CANCELLED" || s === "CANCELED") return "CANCELLED";
  return "";
}
function truthyFlag(value) {
  var s = String(value == null ? "" : value).trim().toLowerCase();
  return s === "1" || s === "y" || s === "yes" || s === "true" || s === "t";
}
function certMissing(value) {
  var s = String(value == null ? "" : value).trim().toLowerCase();
  return !s || s === "n" || s === "no" || s === "false" || s === "missing";
}
function parseCsv(text) {
  var rows = [];
  var row = [];
  var cell = "";
  var quoted = false;
  var s = String(text || "").replace(/^\uFEFF/, "");
  s = s.indexOf("\n") < 0 ? s.replace(/\r/g, "\n") : s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (quoted) {
      if (c === "\"") {
        if (s.charAt(i + 1) === "\"") {
          cell += "\"";
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === "\"") quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(function (line) {
    return line.some(function (value) { return String(value).trim() !== ""; });
  });
}
function headerPick(rows, aliases) {
  var best = 0;
  var bestHits = 0;
  var limit = Math.min(rows.length, 25);
  for (var i = 0; i < limit; i++) {
    var cells = rows[i].map(normHeader);
    var hits = 0;
    Object.keys(aliases).forEach(function (field) {
      if (cells.some(function (cell) { return aliases[field].indexOf(cell) >= 0; })) hits++;
    });
    if (hits > bestHits) {
      bestHits = hits;
      best = i;
    }
  }
  return { index: best, hits: bestHits };
}
function loadCsv(text, aliases, required) {
  var grid = parseCsv(text);
  if (!grid.length) return { ok: false, headers: [], rows: [], missing: required.slice() };
  var picked = headerPick(grid, aliases);
  var headers = grid[picked.index].map(normHeader);
  var index = {};
  Object.keys(aliases).forEach(function (field) {
    for (var i = 0; i < headers.length; i++) {
      if (aliases[field].indexOf(headers[i]) >= 0) {
        index[field] = i;
        break;
      }
    }
  });
  var missing = (required || []).filter(function (field) { return index[field] == null; });
  if (missing.length) return { ok: false, headers: headers, rows: [], missing: missing };
  var out = [];
  for (var r = picked.index + 1; r < grid.length; r++) {
    var obj = {};
    Object.keys(index).forEach(function (field) {
      obj[field] = grid[r][index[field]] == null ? "" : String(grid[r][index[field]]).trim();
    });
    out.push(obj);
  }
  return { ok: true, headers: headers, rows: out, missing: [] };
}
function coverage(id, support, en, es) {
  return { check_id: id, support: support, reason_en: clip(en, 240), reason_es: clip(es, 240) };
}
function item(hotel, code, category, guest, confirmation, amount, room, whyEn, whyEs, fixEn, fixEs) {
  var conf = folioRef(confirmation);
  var rm = roomOf(room);
  var abs = round2(Math.abs(Number(amount) || 0));
  if (!conf || abs < 0 || abs >= 1000000) return null;
  return {
    category: category,
    code: code,
    guest_name: clip(guest, 80) || ("Folio " + conf).slice(0, 80),
    confirmation: conf,
    why_en: clip(whyEn, 160),
    why_es: clip(whyEs, 160),
    fix_en: clip(fixEn, 200),
    fix_es: clip(fixEs, 200),
    amount: abs,
    room: rm,
    fingerprint: hotel + "|" + code + "|" + conf
  };
}
function labelFor(room, confirmation) {
  if (room) return "Room " + room;
  return "Folio " + confirmation;
}
function findLine(lines, name) {
  var want = normHeader(name);
  for (var i = 0; i < lines.length; i++) {
    if (normHeader(lines[i].line_name) === want) return lines[i];
  }
  return null;
}
function moneyOf(line) {
  if (!line) return null;
  if (line.net_today != null && line.net_today !== "") return num(line.net_today);
  return num(line.actual_today);
}
function countOf(line) {
  if (!line) return null;
  var n = num(line.actual_today);
  if (n == null) return null;
  return Math.round(n);
}
function sumCodes(lines, codes) {
  var seen = false;
  var total = 0;
  lines.forEach(function (line) {
    var code = String(line.line_code || "").trim().toUpperCase();
    if (!codes[code]) return;
    var n = moneyOf(line);
    if (n == null) return;
    seen = true;
    total += n;
  });
  return seen ? round2(total) : null;
}
function gmRow(section, metric, line) {
  if (!line) return null;
  var today = num(line.actual_today);
  if (today == null && line.net_today != null) today = num(line.net_today);
  if (today == null) return null;
  return {
    section: section,
    raw_line: "",
    cells: {
      metric: metric,
      today: today,
      mtd: num(line.mtd),
      ytd: num(line.ytd)
    }
  };
}
function normalizeAudit(rows) {
  return (rows || []).map(function (row) {
    return {
      section: normHeader(row.section || ""),
      line_name: String(row.line_name || "").trim(),
      line_code: String(row.line_code || "").trim(),
      actual_today: row.actual_today,
      net_today: row.net_today,
      mtd: row.mtd,
      ytd: row.ytd
    };
  }).filter(function (row) { return row.line_name && normHeader(row.line_name) !== "totals"; });
}
function reviewFromParts(input) {
  input = input || {};
  var hotel = String(input.hotel || "");
  var auditDate = resolveAuditDate(input.auditDate || input.audit_date, input.now);
  if (!HOTELS[hotel]) return { ok: false, reason: "hotel" };
  if (!auditDate) return { ok: false, reason: "audit_date" };
  var closed = input.closedFolios;
  var lines = input.auditLines == null ? null : normalizeAudit(input.auditLines);
  var taxRows = input.taxRows;
  var rooms = input.rooms;
  var files = input.files || {};
  var notes = [];
  var items = [];
  var rows = [];

  if (closed == null) {
    notes.push(coverage("checkout_balance", "unsupported",
      "Closed Folio Balances was not in this package.",
      "Saldos de folios cerrados no vino en este paquete."));
  } else {
    notes.push(coverage("checkout_balance", "supported",
      "Scored from Closed Folio Balances. A non-zero ending balance is an open folio.",
      "Se revisa en saldos de folios cerrados. Un saldo distinto de cero es un folio abierto."));
    var best = {};
    closed.forEach(function (row) {
      row = row || {};
      var rawStatus = row.stay_status || row.status;
      var status = stayStatus(rawStatus);
      if (!status && String(rawStatus || "").trim()) return;
      if (!status) status = "CHECKED_OUT";
      var conf = folioRef(row.folio_ref || row.confirmation);
      var balance = num(row.ending_balance != null ? row.ending_balance : row.balance);
      if (!conf || balance == null || round2(balance) === 0) return;
      var code = status === "CANCELLED" ? "cancel_balance" : "checkout_balance";
      var key = code + "|" + conf;
      var prev = best[key];
      if (!prev || Math.abs(balance) > Math.abs(prev.balance) + 0.001) {
        best[key] = { status: status, conf: conf, room: roomOf(row.room), balance: balance, code: code };
      }
    });
    Object.keys(best).sort().forEach(function (key) {
      var row = best[key];
      var whyEn = "Checked-out folio still has a balance";
      var whyEs = "Folio de salida con saldo";
      var fixEn = "Collect or transfer the balance";
      var fixEs = "Cobra o transfiere el saldo";
      if (row.status === "CANCELLED") {
        whyEn = "Cancelled folio still has a balance";
        whyEs = "Folio cancelado con saldo";
        fixEn = "Clear the cancelled folio";
        fixEs = "Liquida el folio cancelado";
      } else if (row.status === "NO_SHOW") {
        whyEn = "No-show folio still has a balance";
        whyEs = "Folio de no-show con saldo";
      } else if (row.balance < 0) {
        whyEn = "Checked-out folio still has a credit";
        whyEs = "Folio de salida con crédito";
        fixEn = "Refund or transfer the credit";
        fixEs = "Reembolsa o transfiere el crédito";
      }
      var made = item(hotel, row.code, "balances", labelFor(row.room, row.conf), row.conf, row.balance, row.room, whyEn, whyEs, fixEn, fixEs);
      if (made) items.push(made);
    });
  }

  notes.push(coverage("cancel_fee", "unsupported",
    "Final Audit lists every cancellation, not late cancels, and no file shows a fee that was skipped.",
    "La auditoría final lista toda cancelación, no solo las tardías, y ningún archivo muestra una penalización omitida."));
  notes.push(coverage("rate_override", "unsupported",
    "No daily file has a rate-override row or a reason column.",
    "Ningún archivo diario trae un cambio de tarifa ni una columna de motivo."));
  notes.push(coverage("adjustment_reason", "unsupported",
    "Final Audit has adjustment totals only, with no reason on each adjustment.",
    "La auditoría final solo trae totales de ajustes, sin motivo en cada ajuste."));

  if (lines == null) {
    notes.push(coverage("noshow_fee", "unsupported",
      "Final Audit was not in this package.",
      "La auditoría final no vino en este paquete."));
    notes.push(coverage("cash_variance", "unsupported",
      "Final Audit was not in this package.",
      "La auditoría final no vino en este paquete."));
    notes.push(coverage("ooo_returned", "unsupported",
      "Final Audit was not in this package.",
      "La auditoría final no vino en este paquete."));
  } else {
    var noShowCount = countOf(findLine(lines, "No Show"));
    var noShowRev = sumCodes(lines, NOSHOW_CODES);
    if (noShowCount == null) {
      notes.push(coverage("noshow_fee", "unsupported",
        "The Final Audit has no No Show count.",
        "La auditoría final no trae el conteo de no-show."));
    } else if (noShowCount >= 1 && noShowRev == null) {
      notes.push(coverage("noshow_fee", "unsupported",
        "No-show revenue lines were not on the Final Audit.",
        "La auditoría final no trae las líneas de ingreso de no-show."));
    } else {
      notes.push(coverage("noshow_fee", "supported",
        "Scored from the No Show count against no-show room revenue. A count above zero with zero revenue is a missed fee.",
        "Se compara el conteo de no-show con el ingreso de no-show. Un conteo mayor a cero con ingreso cero es un cargo omitido."));
      if (noShowCount >= 1 && noShowRev === 0) {
        var missed = item(hotel, "noshow_uncharged", "missed", "No-show count", "NOSHOW", 0, "",
          "No-show count is " + noShowCount + " and no-show revenue is 0",
          "El conteo de no-show es " + noShowCount + " y el ingreso es 0",
          "Post the no-show charge", "Publica el cargo de no-show");
        if (missed) items.push(missed);
      }
    }

    var cashLine = findLine(lines, "Cash Over / Short");
    var cash = moneyOf(cashLine);
    if (!cashLine || cash == null) {
      notes.push(coverage("cash_variance", "unsupported",
        "Cash Over / Short was not on the Final Audit.",
        "La auditoría final no trae sobrante o faltante de caja."));
    } else {
      notes.push(coverage("cash_variance", "supported",
        "Scored from Final Audit Cash Over / Short.",
        "Se revisa el sobrante o faltante de caja de la auditoría final."));
      var cashRounded = round2(cash);
      if (cashRounded !== 0) {
        var over = cashRounded > 0;
        var cashItem = item(hotel, over ? "cash_over" : "cash_short", "cash", "Cash drawer", "CASH", cashRounded, "",
          over ? "Cash drawer is over for the shift" : "Cash drawer is short for the shift",
          over ? "Caja sobrante en el turno" : "Caja faltante en el turno",
          over ? "Recount and note the overage" : "Recount and note the shortage",
          over ? "Recuenta y anota el sobrante" : "Recuenta y anota el faltante");
        if (cashItem) items.push(cashItem);
      }
    }

    var oooCount = countOf(findLine(lines, "Out of Order"));
    if (oooCount == null) {
      notes.push(coverage("ooo_returned", "unsupported",
        "Out of Order was not on the Final Audit.",
        "La auditoría final no trae fuera de servicio."));
    } else if (rooms == null) {
      notes.push(coverage("ooo_returned", "unsupported",
        "Final Audit has an out-of-order count only. Pass hotelkey_live_room_status to name the rooms.",
        "La auditoría final solo trae el conteo de fuera de servicio. Pasa hotelkey_live_room_status para nombrar los cuartos."));
    } else {
      notes.push(coverage("ooo_returned", "supported",
        "Rooms still out of order come from hotelkey_live_room_status when the Final Audit count is above zero.",
        "Los cuartos que siguen fuera de servicio salen de hotelkey_live_room_status cuando el conteo de la auditoría es mayor a cero."));
      if (oooCount >= 1) {
        var seenRoom = {};
        rooms.forEach(function (row) {
          row = row || {};
          var ooo = row.ooo === true || row.ooo === 1 || truthyFlag(row.ooo);
          var room = roomOf(row.room_number || row.room);
          if (!ooo || !room || seenRoom[room]) return;
          seenRoom[room] = 1;
          var oooItem = item(hotel, "ooo_not_returned", "rooms", "Room " + room, "OOO" + room, 0, room,
            "Room is still out of order and not for sale",
            "El cuarto sigue fuera de servicio y no está a la venta",
            "Return the room to inventory", "Devuelve el cuarto al inventario");
          if (oooItem) items.push(oooItem);
        });
      }
    }

    [
      gmRow("gm_occupancy", "occupancy_pct", findLine(lines, "Occupancy Excluding Out of Order Rooms and Including Comp, House Use Rooms")),
      gmRow("gm_revenue", "adr", findLine(lines, "ADR Excluding Comp House Use Rooms")),
      gmRow("gm_revenue", "revpar", findLine(lines, "RevPar Without Out Of Order Rooms")),
      gmRow("gm_statistics", "ooo_rooms", findLine(lines, "Out of Order")),
      gmRow("gm_statistics", "available_rooms", findLine(lines, "Available Rooms")),
      gmRow("gm_statistics", "rooms_occupied", findLine(lines, "Room Sold Without Comp House Use Rooms")),
      gmRow("gm_statistics", "dirty_rooms", findLine(lines, "Dirty Rooms")),
      gmRow("gm_statistics", "clean_rooms", findLine(lines, "Clean Rooms")),
      gmRow("gm_revenue", "room_revenue", (function () {
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].section === "revenue_category" && normHeader(lines[i].line_name) === "room_revenue") return lines[i];
        }
        return null;
      })())
    ].forEach(function (row) { if (row) rows.push(row); });
  }

  if (taxRows == null) {
    notes.push(coverage("tax_certificate", "unsupported",
      "Tax Exemptions Forecast was not in this package.",
      "El pronóstico de exenciones no vino en este paquete."));
  } else if (!input.taxHasCertificate) {
    notes.push(coverage("tax_certificate", "unsupported",
      "Tax Exemptions Forecast has a category and tax amounts, not a certificate on file.",
      "El pronóstico de exenciones trae categoría e impuestos, no un certificado."));
  } else {
    notes.push(coverage("tax_certificate", "supported",
      "Scored only where the tax file has a certificate column.",
      "Solo se revisa cuando el archivo de impuestos trae una columna de certificado."));
    var seenTax = {};
    taxRows.forEach(function (row) {
      row = row || {};
      if (!certMissing(row.certificate)) return;
      var conf = folioRef(row.folio_ref || row.confirmation);
      var room = roomOf(row.room);
      if (!conf || seenTax[conf]) return;
      seenTax[conf] = 1;
      var taxItem = item(hotel, "exempt_no_cert", "taxes", labelFor(room, conf), conf, num(row.exempted_revenue) || 0, room,
        "Tax-exempt stay has no certificate", "Exento de impuesto sin certificado",
        "File the certificate or post tax", "Archiva el certificado o cobra el impuesto");
      if (taxItem) items.push(taxItem);
    });
  }

  notes.push(coverage("inhouse_balance", "unsupported",
    files.inhouse
      ? "In House Guest Folio Balances are guests still in house, not checked-out folios."
      : "In House Guest Folio Balances was not in this package. In-house guests are not checked-out folios.",
    files.inhouse
      ? "Los saldos de huéspedes en casa no son folios de salida."
      : "Saldos de huéspedes en casa no vino en este paquete. No son folios de salida."));
  notes.push(coverage("house_account", "unsupported",
    "House account balances stay on the AR screen, not this check-in.",
    "Los saldos de cuentas de casa quedan en CxC, no en esta revisión."));
  notes.push(coverage("ar_aging", "unsupported",
    "AR Invoice Aging is company aging. It does not show these folio exceptions.",
    "El antigüedad de CxC es por empresa. No muestra estas excepciones de folio."));
  notes.push(coverage("housekeeping", "unsupported",
    "Housekeeping Detail lists checkout and stayover service, not out-of-order rooms or certificates.",
    "El detalle de ama de llaves lista salida y stayover, no cuartos fuera de servicio ni certificados."));

  notes.forEach(function (note) {
    rows.push({
      section: "check_coverage",
      raw_line: note.check_id,
      cells: { check_id: note.check_id, support: note.support, reason_en: note.reason_en, reason_es: note.reason_es }
    });
  });

  return {
    ok: true,
    hotel: hotel,
    auditDate: auditDate,
    items: items,
    rows: rows,
    coverage: notes,
    unsupported: notes.filter(function (note) { return note.support === "unsupported"; }).map(function (note) { return note.check_id; })
  };
}
function payloadForRpc(review) {
  if (!review || !review.ok) return null;
  return {
    p: {
      hotel: review.hotel,
      audit_date: review.auditDate,
      source: "hotelkey",
      subject: clip(review.hotel + " HotelKey daily reports", 200),
      status: "parsed",
      rows: review.rows,
      items: review.items,
      coverage: review.coverage
    }
  };
}
function readText(file) {
  return fs.readFileSync(file, "utf8");
}
function loadRooms(file) {
  var text = readText(file).trim();
  if (!text) return { ok: true, rooms: [] };
  if (text.charAt(0) === "[" || text.charAt(0) === "{") {
    var parsed = JSON.parse(text);
    var list = Array.isArray(parsed) ? parsed : (parsed.rooms || []);
    return { ok: true, rooms: list };
  }
  var table = loadCsv(text, ROOM_ALIASES, ["room_number", "ooo"]);
  if (!table.ok) return { ok: false, headers: table.headers, missing: table.missing };
  return { ok: true, rooms: table.rows };
}
function runCli(argv, now) {
  var hotel = "";
  var auditDate = "";
  var paths = {};
  var args = argv || [];
  for (var i = 0; i < args.length; i++) {
    var key = args[i];
    var value = args[i + 1];
    if (key === "--hotel") hotel = value;
    else if (key === "--audit-date" || key === "--date") auditDate = value;
    else if (key === "--closed") paths.closed = value;
    else if (key === "--final") paths.final = value;
    else if (key === "--tax") paths.tax = value;
    else if (key === "--rooms") paths.rooms = value;
    else if (key === "--house") paths.house = value;
    else if (key === "--inhouse") paths.inhouse = value;
    else if (key === "--aging") paths.aging = value;
    else if (key === "--housekeeping") paths.housekeeping = value;
    else return fail("Unknown argument " + key);
    i++;
    if (!value) return fail("Missing value for " + key);
  }
  if (!hotel || !auditDate) return fail("Pass --hotel and --audit-date (YYYY-MM-DD or yesterday).");
  var closed = null;
  var auditLines = null;
  var taxRows = null;
  var taxHasCertificate = false;
  var rooms = null;
  if (paths.closed) {
    if (!fs.existsSync(paths.closed)) return fail("File not found.");
    var closedTable = loadCsv(readText(paths.closed), CLOSED_ALIASES, ["folio_ref", "ending_balance"]);
    if (!closedTable.ok) return fail("Unrecognized Closed Folio Balances headers: " + closedTable.headers.join(","));
    closed = closedTable.rows;
  }
  if (paths.final) {
    if (!fs.existsSync(paths.final)) return fail("File not found.");
    var auditTable = loadCsv(readText(paths.final), AUDIT_ALIASES, ["line_name", "actual_today"]);
    if (!auditTable.ok) return fail("Unrecognized Final Audit headers: " + auditTable.headers.join(","));
    auditLines = auditTable.rows;
  }
  if (paths.tax) {
    if (!fs.existsSync(paths.tax)) return fail("File not found.");
    var taxTable = loadCsv(readText(paths.tax), TAX_ALIASES, ["folio_ref"]);
    if (!taxTable.ok) return fail("Unrecognized Tax Exemptions Forecast headers: " + taxTable.headers.join(","));
    taxRows = taxTable.rows;
    taxHasCertificate = taxTable.headers.indexOf("certificate") >= 0 || taxTable.headers.indexOf("tax_certificate") >= 0 || taxTable.headers.indexOf("exemption_certificate") >= 0 || taxTable.headers.indexOf("cert_on_file") >= 0 || taxTable.headers.indexOf("certificate_on_file") >= 0;
  }
  if (paths.rooms) {
    if (!fs.existsSync(paths.rooms)) return fail("File not found.");
    var roomFile = loadRooms(paths.rooms);
    if (!roomFile.ok) return fail("Unrecognized room status headers: " + (roomFile.headers || []).join(","));
    rooms = roomFile.rooms;
  }
  var optional = ["house", "inhouse", "aging", "housekeeping"];
  for (var n = 0; n < optional.length; n++) {
    if (paths[optional[n]] && !fs.existsSync(paths[optional[n]])) return fail("File not found.");
  }
  var review = reviewFromParts({
    hotel: hotel,
    auditDate: auditDate,
    now: now,
    closedFolios: closed,
    auditLines: auditLines,
    taxRows: taxRows,
    taxHasCertificate: taxHasCertificate,
    rooms: rooms,
    files: {
      house: !!paths.house,
      inhouse: !!paths.inhouse,
      aging: !!paths.aging,
      housekeeping: !!paths.housekeeping
    }
  });
  if (!review.ok) return fail(review.reason || "rejected");
  process.stdout.write(JSON.stringify(payloadForRpc(review)));
  return 0;
}
function fail(message) {
  process.stderr.write(String(message || "failed") + "\n");
  return 1;
}

var api = {
  HOTELS: HOTELS,
  parseCsv: parseCsv,
  loadCsv: loadCsv,
  reviewFromParts: reviewFromParts,
  payloadForRpc: payloadForRpc,
  resolveAuditDate: resolveAuditDate,
  chicagoDate: chicagoDate,
  runCli: runCli
};

module.exports = api;
if (require.main === module) process.exit(runCli(process.argv.slice(2)) || 0);
