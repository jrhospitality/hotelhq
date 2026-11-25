/* Accounts receivable for MSPWE (HotelKey), MSPAM (PEP), and MSPMS (Astay).
   On the 1st, the GM gets "Send direct-bill invoices", due the 5th America/Chicago.
   Each company is marked sent or not, with the amount and the date. Proof is a link
   or file for the PMS aging report, or "no open AR" with a note. After the 5th an
   open task is overdue to JR Corporate.
   Morning balance checks sit on Night Audit. The GM or AGM clears each one:
   collected, moved to direct bill, or explained. Open more than 3 days escalates.
   Hampton PEP can send closed folios, house accounts, direct-bill aging
   (Current and Over 7/14/30/60/90/120/150, plus settlements), and in-house
   charges and payments. That in-house file has no ending balance, so the
   over-threshold check stays "source missing" until a balance arrives.
   Golden Valley and SpringHill currently send ledger totals only (guest, city,
   AR, house, deposit, yesterday and today). Those checks are "source missing"
   and the ledgers are the fallback. No row at all is "no feed yet".
   Guest names are not stored. Folio, room, and account codes only.
   Demo rows are example data. This file does not parse report email. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var TZ = "America/Chicago";
  var DUE_DAY = 5;
  var ESCALATE_DAYS = 3;
  var DEFAULT_THRESHOLD = 500;
  var KEY = "jrportal_ar_v1";
  var SYSTEMS = {
    MSPWE: { en: "Golden Valley", es: "Golden Valley", pms: "HotelKey" },
    MSPAM: { en: "Hampton", es: "Hampton", pms: "PEP" },
    MSPMS: { en: "SpringHill", es: "SpringHill", pms: "Astay" }
  };
  var CHECKS = [
    { id: "checkout_balance", en: "Checked-out folios with a balance", es: "Folios de salida con saldo" },
    { id: "house_account", en: "House accounts with a balance", es: "Cuentas de casa con saldo" },
    { id: "inhouse_over", en: "In-house balances over the threshold", es: "Saldos en casa sobre el límite" }
  ];
  var LEDGERS = [
    { id: "guest", en: "Guest ledger", es: "Libro de huéspedes" },
    { id: "city", en: "City ledger", es: "Libro de ciudad" },
    { id: "ar", en: "AR ledger", es: "Libro de CxC" },
    { id: "house", en: "House ledger", es: "Libro de casa" },
    { id: "deposit", en: "Deposit ledger", es: "Libro de depósitos" }
  ];
  var PEP_BUCKETS = [
    ["current", "Current", "Corriente"],
    ["over_7", "Over 7", "Más de 7"],
    ["over_14", "Over 14", "Más de 14"],
    ["over_30", "Over 30", "Más de 30"],
    ["over_60", "Over 60", "Más de 60"],
    ["over_90", "Over 90", "Más de 90"],
    ["over_120", "Over 120", "Más de 120"],
    ["over_150", "Over 150", "Más de 150"]
  ];
  var STANDARD_BUCKETS = [
    ["current", "Current", "Corriente"],
    ["d30", "30", "30"],
    ["d60", "60", "60"],
    ["d90_plus", "90+", "90+"]
  ];

  function isCorporate(role) {
    return role === "Above Property" || role === "JR Corporate" || role === "above_property" || role === "corporate";
  }
  function isGm(role) {
    return role === "GM" || role === "AGM" || role === "gm" || role === "agm";
  }
  function isDesk(role) {
    return role === "Front Desk" || role === "front_desk";
  }
  function hotelsFor(role, hotel) {
    if (isCorporate(role)) return HOTELS.slice();
    if ((isGm(role) || isDesk(role)) && HOTELS.indexOf(hotel) >= 0) return [hotel];
    return [];
  }
  function canSeeHotel(actor, hotel) {
    actor = actor || {};
    return hotelsFor(actor.role, actor.hotel).indexOf(hotel) >= 0;
  }
  function canInvoice(actor, hotel) {
    return isGm(actor && actor.role) && canSeeHotel(actor, hotel);
  }
  function canResolve(actor, hotel) {
    if (!actor || HOTELS.indexOf(hotel) < 0) return false;
    if (isCorporate(actor.role)) return true;
    return isGm(actor.role) && actor.hotel === hotel;
  }
  function canThreshold(actor) { return isCorporate(actor && actor.role); }
  function canAging(actor) { return isCorporate(actor && actor.role); }
  function visibleKinds(actor) {
    if (isCorporate(actor && actor.role) || isGm(actor && actor.role)) {
      return ["checkout_balance", "house_account", "inhouse_over"];
    }
    if (isDesk(actor && actor.role)) return ["inhouse_over"];
    return [];
  }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
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
  function addDays(iso, days) {
    var p = String(iso || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function daysBetween(earlier, later) {
    var a = String(earlier || "").split("-").map(Number);
    var b = String(later || "").split("-").map(Number);
    return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86400000);
  }
  function monthStart(iso) { return String(iso || "").slice(0, 8) + "01"; }
  function dueDate(period) { return String(period || "").slice(0, 8) + "05"; }
  function dayOf(value) {
    var s = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (!s) return "";
    return checkinDate(s);
  }
  function monthStatus(period, submittedAt, today) {
    var due = dueDate(period);
    if (submittedAt) return dayOf(submittedAt) <= due ? "on_time" : "late";
    if (today < period) return "upcoming";
    if (today <= due) return "open";
    return "overdue";
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function round2(n) { return Math.round(Number(n) * 100) / 100; }
  function money(n) {
    if (n == null || n === "" || !isFinite(Number(n))) return "—";
    var v = round2(n);
    var sign = v < 0 ? "-" : "";
    var parts = Math.abs(v).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return sign + "$" + parts.join(".");
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function hotelLabel(hotel) {
    var sys = SYSTEMS[hotel] || { en: hotel, pms: "" };
    return hotel + " · " + sys.en + " · " + sys.pms;
  }
  function checkById(id) {
    for (var i = 0; i < CHECKS.length; i++) if (CHECKS[i].id === id) return CHECKS[i];
    return null;
  }
  function flagId(hotel, kind, folio) {
    var slug = String(folio || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    var kindSlug = kind === "checkout_balance" ? "out" : (kind === "house_account" ? "house" : "in");
    return ("arf-" + String(hotel || "").toLowerCase() + "-" + kindSlug + "-" + slug).slice(0, 48);
  }
  function safeFlag(id) {
    return /^arf-[a-z0-9-]{1,48}$/.test(String(id || "")) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
  }
  function blankMonth(hotel, period) {
    return {
      hotel: hotel, period: period, proofKind: "", proofUrl: "", proofName: "", proofNote: "",
      submittedAt: "", submittedName: "", source: "example"
    };
  }
  function flagsFromDetail(spec) {
    spec = spec || {};
    var hotel = spec.hotel || "";
    var audit = spec.auditDate || "";
    var threshold = spec.threshold == null ? DEFAULT_THRESHOLD : Number(spec.threshold);
    var out = [];
    function push(kind, folio, room, amount, stay, opened) {
      if (!folio || !isFinite(amount) || Number(amount) === 0) return;
      out.push({
        id: flagId(hotel, kind, folio),
        hotel: hotel,
        auditDate: audit,
        checkKind: kind,
        folioRef: String(folio),
        room: room || "",
        amount: round2(amount),
        openedOn: opened || audit,
        stayStatus: stay || "",
        source: spec.source || "example"
      });
    }
    (spec.closedFolios || []).forEach(function (row) {
      if (!row || ["CHECKED_OUT", "NO_SHOW", "CANCELLED"].indexOf(row.stayStatus) < 0) return;
      if (row.endingBalance == null || Number(row.endingBalance) === 0) return;
      push("checkout_balance", row.folioRef, row.room, row.endingBalance, row.stayStatus, row.openedOn);
    });
    (spec.houseFolios || []).forEach(function (row) {
      if (!row || row.endingBalance == null || Number(row.endingBalance) === 0) return;
      push("house_account", row.accountCode, "", row.endingBalance, "", row.openedOn);
    });
    (spec.inhouseFolios || []).forEach(function (row) {
      if (!row || row.endingBalance == null || row.endingBalance === "") return;
      if (!(Number(row.endingBalance) > threshold)) return;
      push("inhouse_over", row.folioRef, row.room, row.endingBalance, "", row.openedOn);
    });
    return out;
  }
  function buildDemo(now) {
    var today = checkinDate(now);
    var month = monthStart(today);
    var audit = addDays(today, -1);
    var sentOn = addDays(month, 2);
    var escalatedOn = addDays(today, -5);
    var accounts = [
      { id: "acct-mspam-100", hotel: "MSPAM", code: "EX-AR-100", label: "Example City Ledger North", active: true, source: "example" },
      { id: "acct-mspam-101", hotel: "MSPAM", code: "EX-AR-101", label: "Example Airline Crew", active: true, source: "example" }
    ];
    var lines = [];
    if (sentOn <= today) {
      lines.push({ hotel: "MSPAM", period: month, accountId: "acct-mspam-100", sent: true, amount: 1840, sentOn: sentOn, source: "example" });
    }
    var months = [
      blankMonth("MSPWE", month),
      blankMonth("MSPAM", month),
      blankMonth("MSPMS", month)
    ];
    if (sentOn <= today) {
      months[2].proofKind = "no_open_ar";
      months[2].proofNote = "Example: no company accounts on this feed.";
      months[2].submittedAt = sentOn + "T15:00:00.000Z";
      months[2].submittedName = "Example GM";
    }
    var north = [400, 0, 100, 200, 0, 50, 0, 0];
    var crew = [800, 0, 0, 150, 0, 0, 0, 0];
    var agingAccounts = [];
    PEP_BUCKETS.forEach(function (bucket, i) {
      agingAccounts.push({ hotel: "MSPAM", asOf: audit, section: "aging", accountCode: "EX-AR-100", companyLabel: "Example City Ledger North", bucketSet: "pep", bucket: bucket[0], amount: north[i], source: "example" });
      agingAccounts.push({ hotel: "MSPAM", asOf: audit, section: "aging", accountCode: "EX-AR-101", companyLabel: "Example Airline Crew", bucketSet: "pep", bucket: bucket[0], amount: crew[i], source: "example" });
    });
    agingAccounts.push({ hotel: "MSPAM", asOf: audit, section: "settlements", accountCode: "EX-AR-100", companyLabel: "Example City Ledger North", bucketSet: "pep", bucket: "total", amount: -200, source: "example" });
    var agingSummaries = [];
    function addStandard(hotel, amounts) {
      STANDARD_BUCKETS.forEach(function (bucket, i) {
        agingSummaries.push({ hotel: hotel, asOf: audit, bucketSet: "standard", bucket: bucket[0], amount: amounts[i], source: "example", byUser: false });
      });
    }
    addStandard("MSPWE", [2400, 1800, 640, 820]);
    addStandard("MSPMS", [900, 200, 0, 1260]);
    var closedFolios = [
      { hotel: "MSPAM", auditDate: audit, folioRef: "EX-44021", room: "214", stayStatus: "CHECKED_OUT", endingBalance: 186.4, openedOn: escalatedOn, checkIn: addDays(audit, -2), checkOut: audit },
      { hotel: "MSPAM", auditDate: audit, folioRef: "EX-44022", room: "118", stayStatus: "CHECKED_OUT", endingBalance: 0, checkIn: addDays(audit, -1), checkOut: audit },
      { hotel: "MSPAM", auditDate: audit, folioRef: "EX-44023", room: "105", stayStatus: "NO_SHOW", endingBalance: 40, openedOn: audit, checkIn: audit, checkOut: audit },
      { hotel: "MSPAM", auditDate: audit, folioRef: "EX-44024", room: "220", stayStatus: "CANCELLED", endingBalance: 0, checkIn: audit, checkOut: audit }
    ];
    var houseFolios = [
      { hotel: "MSPAM", auditDate: audit, accountCode: "HA-12", accountType: "HOUSE", accountStatus: "OPEN", openingBalance: 10, netChange: 30, endingBalance: 40, lastPosted: audit, openedOn: audit },
      { hotel: "MSPAM", auditDate: audit, accountCode: "HA-02", accountType: "HOUSE", accountStatus: "OPEN", openingBalance: 0, netChange: 0, endingBalance: 0, lastPosted: audit }
    ];
    var inhouseFolios = [
      { hotel: "MSPAM", auditDate: audit, folioRef: "EX-44110", room: "210", charges: 180, payments: 0, endingBalance: null }
    ];
    var flags = flagsFromDetail({
      hotel: "MSPAM", auditDate: audit, threshold: DEFAULT_THRESHOLD, source: "example",
      closedFolios: closedFolios, houseFolios: houseFolios, inhouseFolios: inhouseFolios
    });
    function missing(hotel, kind, en, es) {
      return {
        hotel: hotel, auditDate: audit, checkKind: kind, status: "source_missing", detailLevel: "ledger",
        source: "example", reasonEn: en, reasonEs: es
      };
    }
    var checks = [
      { hotel: "MSPAM", auditDate: audit, checkKind: "checkout_balance", status: "ready", detailLevel: "folio", source: "example", reasonEn: "", reasonEs: "" },
      { hotel: "MSPAM", auditDate: audit, checkKind: "house_account", status: "ready", detailLevel: "folio", source: "example", reasonEn: "", reasonEs: "" },
      {
        hotel: "MSPAM", auditDate: audit, checkKind: "inhouse_over", status: "source_missing", detailLevel: "folio", source: "example",
        reasonEn: "The PEP in-house file has today's charges and payments only, so there is no ending balance to compare.",
        reasonEs: "El archivo PEP en casa solo trae cargos y pagos de hoy, así que no hay saldo final para comparar."
      },
      missing("MSPWE", "checkout_balance", "HotelKey sends ledger totals. Closed-folio detail is not on this feed.", "HotelKey manda totales de libro. El detalle de folios cerrados no está en esta fuente."),
      missing("MSPWE", "house_account", "HotelKey sends ledger totals. House-account detail is not on this feed.", "HotelKey manda totales de libro. El detalle de cuentas de casa no está en esta fuente."),
      missing("MSPWE", "inhouse_over", "HotelKey sends ledger totals. In-house folio balances are not on this feed.", "HotelKey manda totales de libro. Los saldos en casa no están en esta fuente."),
      missing("MSPMS", "checkout_balance", "Astay sends ledger totals. Closed-folio detail is not on this feed.", "Astay manda totales de libro. El detalle de folios cerrados no está en esta fuente."),
      missing("MSPMS", "house_account", "Astay sends ledger totals. House-account detail is not on this feed.", "Astay manda totales de libro. El detalle de cuentas de casa no está en esta fuente."),
      missing("MSPMS", "inhouse_over", "Astay sends ledger totals. In-house folio balances are not on this feed.", "Astay manda totales de libro. Los saldos en casa no están en esta fuente.")
    ];
    function ledger(hotel, name, yesterday, todayBalance) {
      return { hotel: hotel, auditDate: audit, ledger: name, yesterday: yesterday, today: todayBalance, source: "example" };
    }
    var ledgers = [
      ledger("MSPWE", "guest", 4200, 3950), ledger("MSPWE", "city", 8100, 8400), ledger("MSPWE", "ar", 2600, 2400),
      ledger("MSPWE", "house", 150, 40), ledger("MSPWE", "deposit", 900, 1100),
      ledger("MSPMS", "guest", 3100, 2880), ledger("MSPMS", "city", 4500, 4700), ledger("MSPMS", "ar", 1260, 1400),
      ledger("MSPMS", "house", 80, 80), ledger("MSPMS", "deposit", 600, 550)
    ];
    return {
      origin: "example",
      now: now instanceof Date ? now.toISOString() : String(now),
      today: today,
      thresholds: { MSPWE: DEFAULT_THRESHOLD, MSPAM: DEFAULT_THRESHOLD, MSPMS: DEFAULT_THRESHOLD },
      thresholdTouched: false,
      accounts: accounts,
      months: months,
      lines: lines,
      agingAccounts: agingAccounts,
      agingSummaries: agingSummaries,
      checks: checks,
      flags: flags,
      resolutions: [],
      ledgers: ledgers,
      closedFolios: closedFolios,
      houseFolios: houseFolios,
      inhouseFolios: inhouseFolios
    };
  }
  function findMonth(model, hotel, period) {
    var found = null;
    (model.months || []).forEach(function (row) { if (row.hotel === hotel && row.period === period) found = row; });
    return found;
  }
  function findAccount(model, hotel, id) {
    var found = null;
    (model.accounts || []).forEach(function (row) {
      if (row.hotel === hotel && row.active !== false && (row.id === id || row.code === id)) found = row;
    });
    return found;
  }
  function findLine(model, hotel, period, accountId) {
    var found = null;
    (model.lines || []).forEach(function (row) {
      if (row.hotel === hotel && row.period === period && row.accountId === accountId) found = row;
    });
    return found;
  }
  function findFlag(model, id) {
    var found = null;
    (model.flags || []).forEach(function (row) { if (row.id === id) found = row; });
    return found;
  }
  function resolutionFor(model, id) {
    var found = null;
    (model.resolutions || []).forEach(function (row) { if (row.flagId === id) found = row; });
    return found;
  }
  function latestAudit(model, hotel) {
    var date = "";
    function see(row) { if (row && row.hotel === hotel && row.auditDate && row.auditDate > date) date = row.auditDate; }
    (model.checks || []).forEach(see);
    (model.ledgers || []).forEach(see);
    (model.flags || []).forEach(see);
    (model.closedFolios || []).forEach(see);
    (model.houseFolios || []).forEach(see);
    (model.inhouseFolios || []).forEach(see);
    return date;
  }
  function checkState(model, hotel, kind) {
    var date = latestAudit(model, hotel);
    if (!date) return { state: "no_feed", auditDate: "", reasonEn: "", reasonEs: "", detailLevel: "none", source: "" };
    var row = null;
    (model.checks || []).forEach(function (item) {
      if (item.hotel === hotel && item.auditDate === date && item.checkKind === kind) row = item;
    });
    if (row && row.status === "ready") {
      return { state: "ready", auditDate: date, reasonEn: row.reasonEn || "", reasonEs: row.reasonEs || "", detailLevel: row.detailLevel || "folio", source: row.source || "" };
    }
    if (row) {
      return { state: "source_missing", auditDate: date, reasonEn: row.reasonEn || row.reason || "", reasonEs: row.reasonEs || "", detailLevel: row.detailLevel || "none", source: row.source || "" };
    }
    return { state: "source_missing", auditDate: date, reasonEn: "", reasonEs: "", detailLevel: "none", source: "" };
  }
  function flagsFor(model, hotel, kind) {
    var state = checkState(model, hotel, kind);
    if (state.state !== "ready") return [];
    return (model.flags || []).filter(function (flag) {
      return flag.hotel === hotel && flag.auditDate === state.auditDate && flag.checkKind === kind;
    }).map(function (flag) {
      return Object.assign({}, flag, { resolution: resolutionFor(model, flag.id) });
    });
  }
  function isEscalated(flag, today, resolved) {
    if (!flag || resolved) return false;
    return daysBetween(flag.openedOn, today) > ESCALATE_DAYS;
  }
  function thresholdFor(model, hotel) {
    var value = model.thresholds && model.thresholds[hotel];
    return value == null ? DEFAULT_THRESHOLD : Number(value);
  }
  function currentMonth(model, hotel) {
    var period = monthStart(model.today);
    return findMonth(model, hotel, period) || blankMonth(hotel, period);
  }
  function lineStats(model, hotel, period) {
    var accounts = (model.accounts || []).filter(function (row) { return row.hotel === hotel && row.active !== false; });
    var sent = 0;
    var recorded = 0;
    accounts.forEach(function (account) {
      var line = findLine(model, hotel, period, account.id);
      if (!line) return;
      recorded += 1;
      if (line.sent) sent += 1;
    });
    return { accounts: accounts.length, sent: sent, recorded: recorded };
  }
  function latestRows(rows, hotel, bucketSet) {
    var mine = (rows || []).filter(function (row) { return row.hotel === hotel && (!bucketSet || row.bucketSet === bucketSet); });
    var asOf = "";
    mine.forEach(function (row) { if (row.asOf > asOf) asOf = row.asOf; });
    if (!asOf) return [];
    var day = mine.filter(function (row) { return row.asOf === asOf; });
    var order = ["entered", "loaded", "example"];
    for (var i = 0; i < order.length; i++) {
      var hit = day.filter(function (row) { return row.source === order[i]; });
      if (hit.length) return hit;
    }
    return day;
  }
  function summaryBuckets(model, hotel, bucketSet) {
    return latestRows(model.agingSummaries, hotel, bucketSet);
  }
  function accountBuckets(model, hotel, section, bucketSet) {
    return latestRows(model.agingAccounts, hotel, bucketSet).filter(function (row) {
      return row.section === section;
    });
  }
  function bucketAmount(rows, bucket) {
    var sum = 0;
    var any = false;
    (rows || []).forEach(function (row) {
      if (row.bucket !== bucket) return;
      any = true;
      sum += Number(row.amount) || 0;
    });
    return any ? round2(sum) : null;
  }
  function ledgersFor(model, hotel) {
    var date = latestAudit(model, hotel);
    if (!date) return [];
    return LEDGERS.map(function (ledger) {
      var found = null;
      (model.ledgers || []).forEach(function (row) {
        if (row.hotel === hotel && row.auditDate === date && row.ledger === ledger.id) found = row;
      });
      return found ? { id: ledger.id, en: ledger.en, es: ledger.es, yesterday: found.yesterday, today: found.today } : null;
    }).filter(function (row) { return row; });
  }
  function saveLines(model, hotel, period, rows, actor) {
    if (!canInvoice(actor, hotel)) return { ok: false, error: "denied" };
    if (!/^\d{4}-\d{2}-01$/.test(period || "") || period > model.today) return { ok: false, error: "month" };
    var existing = findMonth(model, hotel, period);
    if (existing && existing.submittedAt) return { ok: false, error: "submitted" };
    var prepared = [];
    for (var i = 0; i < (rows || []).length; i++) {
      var row = rows[i] || {};
      var account = findAccount(model, hotel, row.accountId);
      if (!account) return { ok: false, error: "account" };
      var sent = !!row.sent;
      var amount = null;
      var sentOn = "";
      if (sent) {
        amount = round2(row.amount);
        sentOn = String(row.sentOn || "");
        if (!isFinite(amount) || amount < 0 || amount >= 1000000) return { ok: false, error: "amount" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sentOn) || sentOn < period || sentOn > model.today) return { ok: false, error: "date" };
      }
      prepared.push({ hotel: hotel, period: period, accountId: account.id, sent: sent, amount: sent ? amount : null, sentOn: sent ? sentOn : "", source: "user" });
    }
    var next = clone(model);
    if (!findMonth(next, hotel, period)) next.months.push(blankMonth(hotel, period));
    prepared.forEach(function (line) {
      next.lines = (next.lines || []).filter(function (have) {
        return !(have.hotel === line.hotel && have.period === line.period && have.accountId === line.accountId);
      });
      next.lines.push(line);
    });
    return { ok: true, model: next };
  }
  function proofError(proof) {
    proof = proof || {};
    var kind = proof.kind;
    var url = String(proof.url || "").replace(/^\s+|\s+$/g, "");
    var name = String(proof.name || "").replace(/^\s+|\s+$/g, "");
    var note = String(proof.note || "").replace(/^\s+|\s+$/g, "");
    if (url.length > 400 || name.length > 120 || note.length > 400) return "proof";
    if (kind === "no_open_ar") return note.length >= 3 ? "" : "note";
    if (kind === "link") return url.indexOf("https://") === 0 ? "" : "proof";
    if (kind === "file") {
      if (!name) return "proof";
      if (url.indexOf("https://") === 0 || /^(MSPWE|MSPAM|MSPMS)\//.test(url)) return "";
      return "proof";
    }
    return "proof";
  }
  function submitMonth(model, hotel, period, proof, actor, now) {
    if (!canInvoice(actor, hotel)) return { ok: false, error: "denied" };
    if (!/^\d{4}-\d{2}-01$/.test(period || "") || period > model.today) return { ok: false, error: "month" };
    var existing = findMonth(model, hotel, period);
    if (existing && existing.submittedAt) return { ok: false, error: "submitted" };
    var problem = proofError(proof);
    if (problem) return { ok: false, error: problem };
    var accounts = (model.accounts || []).filter(function (row) { return row.hotel === hotel && row.active !== false; });
    var sentAny = false;
    for (var i = 0; i < accounts.length; i++) {
      var line = findLine(model, hotel, period, accounts[i].id);
      if (!line) return { ok: false, error: "lines" };
      if (line.sent) sentAny = true;
    }
    if (proof.kind === "no_open_ar" && sentAny) return { ok: false, error: "sent" };
    var next = clone(model);
    var month = findMonth(next, hotel, period);
    if (!month) {
      month = blankMonth(hotel, period);
      next.months.push(month);
    }
    month.proofKind = proof.kind;
    month.proofUrl = String(proof.url || "").replace(/^\s+|\s+$/g, "");
    month.proofName = String(proof.name || "").replace(/^\s+|\s+$/g, "");
    month.proofNote = String(proof.note || "").replace(/^\s+|\s+$/g, "");
    month.submittedAt = now instanceof Date ? now.toISOString() : String(now);
    month.submittedName = (actor && actor.name) || "";
    month.source = "user";
    return { ok: true, model: next };
  }
  function resolveFlag(model, id, action, note, actor, now) {
    if (!safeFlag(id) || ["collected", "direct_bill", "explain"].indexOf(action) < 0) return { ok: false, error: "unknown" };
    var flag = findFlag(model, id);
    if (!flag || !canResolve(actor, flag.hotel)) return { ok: false, error: "denied" };
    if (resolutionFor(model, id)) return { ok: false, error: "closed" };
    note = String(note || "").replace(/^\s+|\s+$/g, "");
    if (action === "explain" && (note.length < 3 || note.length > 240)) return { ok: false, error: "note" };
    if (note.length > 240) note = note.slice(0, 240);
    var next = clone(model);
    next.resolutions.push({
      flagId: id, hotel: flag.hotel, action: action, note: note,
      by: (actor && (actor.name || actor.role)) || "", at: now instanceof Date ? now.toISOString() : String(now), source: "user"
    });
    return { ok: true, model: next };
  }
  function setThreshold(model, hotel, amount, actor) {
    if (!canThreshold(actor) || HOTELS.indexOf(hotel) < 0) return { ok: false, error: "denied" };
    amount = round2(amount);
    if (!(amount > 0) || amount >= 1000000) return { ok: false, error: "amount" };
    var next = clone(model);
    next.thresholds[hotel] = amount;
    next.thresholdTouched = true;
    return { ok: true, model: next };
  }
  function saveAging(model, hotel, asOf, buckets, actor) {
    if (!canAging(actor) || HOTELS.indexOf(hotel) < 0) return { ok: false, error: "denied" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf || "") || asOf > model.today) return { ok: false, error: "date" };
    var keys = ["current", "d30", "d60", "d90"];
    var amounts = {};
    for (var i = 0; i < keys.length; i++) {
      var value = round2(buckets && buckets[keys[i]]);
      if (!isFinite(value) || value < 0 || value >= 100000000) return { ok: false, error: "amount" };
      amounts[keys[i] === "d90" ? "d90_plus" : keys[i]] = value;
    }
    var next = clone(model);
    Object.keys(amounts).forEach(function (bucket) {
      next.agingSummaries = (next.agingSummaries || []).filter(function (row) {
        return !(row.hotel === hotel && row.asOf === asOf && row.bucketSet === "standard" && row.bucket === bucket && row.source === "entered");
      });
      next.agingSummaries.push({
        hotel: hotel, asOf: asOf, bucketSet: "standard", bucket: bucket, amount: amounts[bucket],
        source: "entered", byUser: true
      });
    });
    return { ok: true, model: next };
  }
  function applySaved(model, saved) {
    var next = clone(model);
    saved = saved || {};
    (saved.lines || []).forEach(function (line) {
      if (!line || HOTELS.indexOf(line.hotel) < 0) return;
      next.lines = (next.lines || []).filter(function (have) {
        return !(have.hotel === line.hotel && have.period === line.period && have.accountId === line.accountId);
      });
      next.lines.push(line);
    });
    (saved.months || []).forEach(function (month) {
      if (!month || HOTELS.indexOf(month.hotel) < 0) return;
      var replaced = false;
      next.months = (next.months || []).map(function (have) {
        if (have.hotel === month.hotel && have.period === month.period) { replaced = true; return month; }
        return have;
      });
      if (!replaced) next.months.push(month);
    });
    (saved.resolutions || []).forEach(function (row) {
      if (!row || !findFlag(next, row.flagId) || resolutionFor(next, row.flagId)) return;
      next.resolutions.push(row);
    });
    (saved.aging || []).forEach(function (row) {
      if (!row || HOTELS.indexOf(row.hotel) < 0) return;
      next.agingSummaries = (next.agingSummaries || []).filter(function (have) {
        return !(have.hotel === row.hotel && have.asOf === row.asOf && have.bucketSet === row.bucketSet && have.bucket === row.bucket && have.source === row.source);
      });
      next.agingSummaries.push(row);
    });
    if (saved.thresholds) {
      HOTELS.forEach(function (hotel) {
        if (saved.thresholds[hotel] > 0) next.thresholds[hotel] = Number(saved.thresholds[hotel]);
      });
      next.thresholdTouched = true;
    }
    return next;
  }
  function userOverlay(model) {
    return {
      v: 1,
      lines: (model.lines || []).filter(function (row) { return row.source === "user"; }),
      months: (model.months || []).filter(function (row) { return row.source === "user"; }),
      resolutions: (model.resolutions || []).filter(function (row) { return row.source === "user"; }),
      aging: (model.agingSummaries || []).filter(function (row) { return row.source === "entered" && row.byUser; }),
      thresholds: model.thresholdTouched ? model.thresholds : null
    };
  }
  function modelFromRows(pack, now) {
    pack = pack || {};
    var today = checkinDate(now || new Date().toISOString());
    var thresholds = { MSPWE: DEFAULT_THRESHOLD, MSPAM: DEFAULT_THRESHOLD, MSPMS: DEFAULT_THRESHOLD };
    (pack.settings || []).forEach(function (row) {
      if (HOTELS.indexOf(row.hotel) >= 0 && row.inhouse_threshold != null) thresholds[row.hotel] = Number(row.inhouse_threshold);
    });
    return {
      origin: pack.origin || "live",
      today: today,
      now: now instanceof Date ? now.toISOString() : String(now || ""),
      loadError: !!pack.loadError,
      thresholds: thresholds,
      thresholdTouched: false,
      accounts: (pack.accounts || []).map(function (row) {
        return { id: row.id, hotel: row.hotel, code: row.account_code, label: row.label || "", active: row.active !== false, source: row.source || "loaded" };
      }),
      months: (pack.months || []).map(function (row) {
        return {
          hotel: row.hotel, period: String(row.period_month || "").slice(0, 10), proofKind: row.proof_kind || "",
          proofUrl: row.proof_url || "", proofName: row.proof_name || "", proofNote: row.proof_note || "",
          submittedAt: row.submitted_at || "", submittedName: row.submitted_name || "", source: "loaded"
        };
      }),
      lines: (pack.lines || []).map(function (row) {
        return {
          hotel: row.hotel, period: String(row.period_month || "").slice(0, 10), accountId: row.account_id,
          sent: !!row.sent, amount: row.amount == null ? null : Number(row.amount), sentOn: row.sent_on ? String(row.sent_on).slice(0, 10) : "", source: "loaded"
        };
      }),
      agingSummaries: (pack.agingSummaries || []).map(function (row) {
        return { hotel: row.hotel, asOf: String(row.as_of || "").slice(0, 10), bucketSet: row.bucket_set, bucket: row.bucket, amount: Number(row.amount) || 0, source: row.source || "loaded", byUser: false };
      }),
      agingAccounts: (pack.agingAccounts || []).map(function (row) {
        return {
          hotel: row.hotel, asOf: String(row.as_of || "").slice(0, 10), section: row.section, accountCode: row.account_code,
          companyLabel: row.company_label || "", bucketSet: row.bucket_set, bucket: row.bucket, amount: Number(row.amount) || 0, source: row.source || "loaded"
        };
      }),
      checks: (pack.checks || []).map(function (row) {
        return {
          hotel: row.hotel, auditDate: String(row.audit_date || "").slice(0, 10), checkKind: row.check_kind, status: row.status,
          detailLevel: row.detail_level || "none", source: row.source || "", reasonEn: row.reason || "", reasonEs: ""
        };
      }),
      flags: (pack.flags || []).map(function (row) {
        return {
          id: row.id, hotel: row.hotel, auditDate: String(row.audit_date || "").slice(0, 10), checkKind: row.check_kind,
          folioRef: row.folio_ref, room: row.room || "", amount: Number(row.amount), openedOn: String(row.opened_on || "").slice(0, 10),
          stayStatus: row.stay_status || "", source: row.source || "loaded"
        };
      }),
      resolutions: (pack.resolutions || []).map(function (row) {
        return { flagId: row.flag_id, hotel: row.hotel, action: row.action, note: row.note || "", by: row.resolved_name || "", at: row.resolved_at || "", source: "loaded" };
      }),
      ledgers: (pack.ledgers || []).map(function (row) {
        return { hotel: row.hotel, auditDate: String(row.audit_date || "").slice(0, 10), ledger: row.ledger, yesterday: Number(row.yesterday_balance), today: Number(row.today_balance), source: row.source || "loaded" };
      }),
      closedFolios: [],
      houseFolios: [],
      inhouseFolios: []
    };
  }

  function statusLabel(status, lang) {
    if (status === "overdue") return tx(lang, "Overdue", "Atrasado");
    if (status === "open") return tx(lang, "Open", "Abierto");
    if (status === "on_time") return tx(lang, "Sent on time", "Enviado a tiempo");
    if (status === "late") return tx(lang, "Sent late", "Enviado tarde");
    if (status === "source_missing") return tx(lang, "Source missing", "Falta la fuente");
    if (status === "no_feed") return tx(lang, "No feed yet", "Aún no hay datos");
    if (status === "clear") return tx(lang, "Clear", "Al día");
    return status;
  }
  function statusClass(status) {
    if (status === "overdue" || status === "late") return "overdue";
    if (status === "on_time" || status === "clear") return "on_time";
    if (status === "open") return "open";
    return "no_report";
  }
  function badge(status, text) {
    return "<span class=\"na-badge na-st-" + statusClass(status) + "\">" + esc(text) + "</span>";
  }
  function prettyDate(iso, lang) {
    var months = lang === "es"
      ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var p = String(iso || "").split("-");
    if (p.length < 3 || !p[1]) return String(iso || "");
    return months[Number(p[1]) - 1] + " " + Number(p[2]);
  }
  function stayLabel(status, lang) {
    if (status === "CHECKED_OUT") return tx(lang, "Checked out", "Salida");
    if (status === "NO_SHOW") return tx(lang, "No-show", "No-show");
    if (status === "CANCELLED") return tx(lang, "Cancelled", "Cancelado");
    return "";
  }
  function exampleBanner(model, lang) {
    if (!model || model.origin !== "example") return "";
    return "<p class=\"na-note\"><span class=\"ex\">EXAMPLE</span> " + esc(tx(lang, "Sample balances and companies. No real guests.", "Saldos y empresas de ejemplo. No hay huéspedes reales.")) + "</p>";
  }
  function bucketGrid(defs, rows, lang) {
    return "<div class=\"ar-buckets\">" + defs.map(function (bucket) {
      var amount = bucketAmount(rows, bucket[0]);
      var label = lang === "es" ? bucket[2] : bucket[1];
      return "<div><b>" + esc(label) + "</b><span>" + esc(amount == null ? "—" : money(amount)) + "</span></div>";
    }).join("") + "</div>";
  }
  function agingBlock(model, hotel, lang) {
    var html = "";
    var pep = accountBuckets(model, hotel, "aging", "pep");
    var settlements = accountBuckets(model, hotel, "settlements", "pep");
    var standard = summaryBuckets(model, hotel, "standard");
    if (pep.length) {
      html += "<p class=\"na-note\">" + esc(tx(lang, "PEP aging · Current and Over 7/14/30/60/90/120/150", "Antigüedad PEP · Corriente y más de 7/14/30/60/90/120/150")) + "</p>" + bucketGrid(PEP_BUCKETS, pep, lang);
      var settle = bucketAmount(settlements, "total");
      html += "<p class=\"na-note\">" + esc(tx(lang, "Settlements", "Liquidaciones")) + " " + esc(settle == null ? "—" : money(settle)) + "</p>";
    }
    if (standard.length) {
      html += "<p class=\"na-note\">" + esc(tx(lang, "30/60/90 summary", "Resumen 30/60/90")) + "</p>" + bucketGrid(STANDARD_BUCKETS, standard, lang);
    }
    if (!html) html = "<p class=\"na-note\">" + esc(tx(lang, "No aging summary on this feed.", "No hay antigüedad en esta fuente.")) + "</p>";
    return html;
  }
  function ledgerTable(model, hotel, lang) {
    var rows = ledgersFor(model, hotel);
    if (!rows.length) return "";
    var body = rows.map(function (row) {
      var label = lang === "es" ? row.es : row.en;
      return "<tr><td>" + esc(label) + "</td><td>" + esc(money(row.yesterday)) + "</td><td>" + esc(money(row.today)) + "</td></tr>";
    }).join("");
    return "<h3>" + esc(tx(lang, "Ledger totals", "Totales de libro")) + "</h3><p class=\"na-note\">" +
      esc(tx(lang, "Folio detail is not on this feed. These are the ledger totals.", "El detalle de folios no está en esta fuente. Estos son los totales de libro.")) +
      "</p><table class=\"ar-t\" id=\"arLedgers-" + esc(hotel) + "\"><thead><tr><th>" + esc(tx(lang, "Ledger", "Libro")) + "</th><th>" +
      esc(tx(lang, "Yesterday", "Ayer")) + "</th><th>" + esc(tx(lang, "Today", "Hoy")) + "</th></tr></thead><tbody>" + body + "</tbody></table>";
  }
  function flagHtml(flag, model, actor, view) {
    var lang = view.lang === "es" ? "es" : "en";
    var open = !flag.resolution;
    var escalated = open && isEscalated(flag, model.today, false);
    var bits = [flag.folioRef];
    if (flag.room) bits.push(tx(lang, "room", "cuarto") + " " + flag.room);
    var stay = stayLabel(flag.stayStatus, lang);
    if (stay) bits.push(stay);
    var days = daysBetween(flag.openedOn, model.today);
    bits.push(days === 1 ? tx(lang, "Open 1 day", "Abierto 1 día") : tx(lang, "Open " + days + " days", "Abierto " + days + " días"));
    var html = "<article class=\"ar-flag" + (escalated ? " ar-esc" : "") + "\" id=\"" + esc(flag.id) + "\">" +
      "<div class=\"na-line\"><b>" + esc(bits.join(" · ")) + "</b><b>" + esc(money(flag.amount)) + "</b></div>";
    if (escalated) html += "<p>" + badge("overdue", tx(lang, "Escalated to Corporate", "Escalado a Corporativo")) + "</p>";
    if (!open) {
      var action = flag.resolution.action === "direct_bill" ? tx(lang, "Moved to direct bill", "Pasado a cuenta directa") : (flag.resolution.action === "explain" ? tx(lang, "Explained", "Explicado") : tx(lang, "Collected", "Cobrado"));
      html += "<p class=\"na-note\">" + esc(action + (flag.resolution.note ? " · " + flag.resolution.note : "") + (flag.resolution.by ? " · " + flag.resolution.by : "")) + "</p></article>";
      return html;
    }
    if (!canResolve(actor, flag.hotel) || !safeFlag(flag.id)) return html + "</article>";
    html += "<div class=\"na-acts\">" +
      "<button type=\"button\" class=\"btn\" onclick=\"arAct('" + flag.id + "','collected')\">" + esc(tx(lang, "Collected", "Cobrado")) + "</button>" +
      "<button type=\"button\" class=\"btn2\" onclick=\"arAct('" + flag.id + "','direct_bill')\">" + esc(tx(lang, "Moved to direct bill", "A cuenta directa")) + "</button>" +
      "<button type=\"button\" class=\"btn2\" onclick=\"arExplain('" + flag.id + "')\">" + esc(tx(lang, "Explained", "Explicado")) + "</button></div>";
    if (view.openId === flag.id) {
      html += "<label class=\"na-note-label\">" + esc(tx(lang, "Note", "Nota")) +
        "<textarea id=\"arNote\" maxlength=\"240\"></textarea></label>" +
        "<button type=\"button\" class=\"btn\" onclick=\"arAct('" + flag.id + "','explain')\">" + esc(tx(lang, "Save note", "Guardar nota")) + "</button>";
      if (view.error === "note") html += "<p class=\"bad\">" + esc(tx(lang, "Add a short note.", "Agrega una nota breve.")) + "</p>";
    }
    return html + "</article>";
  }
  function balanceHtml(model, actor, view) {
    view = view || {};
    actor = actor || {};
    var lang = view.lang === "es" ? "es" : "en";
    var kinds = visibleKinds(actor);
    if (!kinds.length) return "";
    var hotels = hotelsFor(actor.role, actor.hotel);
    var hotel = hotels.indexOf(view.hotel) >= 0 ? view.hotel : hotels[0];
    if (!hotel) return "";
    var audit = latestAudit(model, hotel);
    var title = kinds.length === 1 ? tx(lang, "In-house balances", "Saldos en casa") : tx(lang, "Balance checks", "Revisión de saldos");
    var head = "<section class=\"ar\" id=\"arBalances\"><div class=\"na-line\"><h3>" + esc(title) + "</h3></div>" + exampleBanner(model, lang) +
      "<p class=\"na-note\">" + esc(hotelLabel(hotel)) + "</p>" +
      "<p class=\"na-note\">" + esc(tx(lang, "In-house flag threshold", "Límite en casa") + " " + money(thresholdFor(model, hotel)) + ". " + tx(lang, "JR Corporate sets this amount.", "JR Corporate fija este monto.")) + "</p>";
    if (!audit) {
      return head + "<p class=\"ar-miss\" role=\"status\">" + esc(tx(lang, "No AR balance feed yet.", "Aún no hay datos de saldos.")) + "</p>" +
        (model.loadError ? "<p class=\"na-note\">" + esc(tx(lang, "The AR tables could not be read.", "No se pudieron leer las tablas de CxC.")) + "</p>" : "") +
        "</section>";
    }
    head += "<p class=\"na-note\">" + esc(tx(lang, "Audit date", "Fecha de auditoría") + " " + audit) + "</p>";
    var body = kinds.map(function (kind) {
      var spec = checkById(kind);
      var state = checkState(model, hotel, kind);
      var label = lang === "es" ? spec.es : spec.en;
      if (kind === "inhouse_over") label = tx(lang, "In-house balances over ", "Saldos en casa sobre ") + money(thresholdFor(model, hotel));
      var flags = flagsFor(model, hotel, kind);
      var open = flags.filter(function (flag) { return !flag.resolution; });
      var closed = flags.filter(function (flag) { return flag.resolution; });
      var pill = state.state === "source_missing"
        ? badge("source_missing", statusLabel("source_missing", lang))
        : (open.length ? badge("open", open.length + " " + tx(lang, "open", "abiertos")) : badge("clear", statusLabel("clear", lang)));
      var html = "<article class=\"ar-check\" id=\"ar-check-" + kind + "\"><div class=\"na-line\"><b>" + esc(label) + "</b>" + pill + "</div>";
      if (state.state === "source_missing") {
        var why = lang === "es" ? (state.reasonEs || state.reasonEn) : state.reasonEn;
        if (!why) why = tx(lang, "This check's report is not on the feed.", "El reporte de esta revisión no está en la fuente.");
        html += "<p class=\"ar-miss\">" + esc(why) + "</p></article>";
        return html;
      }
      if (!open.length && !closed.length) {
        html += "<p class=\"na-note\">" + esc(tx(lang, "No balance on this check.", "No hay saldo en esta revisión.")) + "</p></article>";
        return html;
      }
      html += open.map(function (flag) { return flagHtml(flag, model, actor, view); }).join("");
      if (closed.length) {
        html += "<details><summary>" + esc(closed.length + " " + tx(lang, "resolved", "resueltos")) + "</summary>" +
          closed.map(function (flag) { return flagHtml(flag, model, actor, view); }).join("") + "</details>";
      }
      return html + "</article>";
    }).join("");
    var ledgers = (isGm(actor.role) || isCorporate(actor.role)) ? ledgerTable(model, hotel, lang) : "";
    return head + body + ledgers + "</section>";
  }
  function companyFields(model, hotel, period, lang, locked) {
    var accounts = (model.accounts || []).filter(function (row) { return row.hotel === hotel && row.active !== false; });
    if (!accounts.length) {
      return "<p class=\"ar-miss\">" + esc(tx(lang, "No direct-bill companies are on this feed. Link the aging report, or mark no open AR.", "No hay empresas de cuenta directa en esta fuente. Enlaza el reporte de antigüedad o marca que no hay CxC.")) + "</p>";
    }
    return accounts.map(function (account) {
      var line = findLine(model, hotel, period, account.id);
      var sent = line && line.sent ? "yes" : "no";
      var amount = line && line.sent ? Number(line.amount).toFixed(2) : "";
      var date = line && line.sent ? line.sentOn : "";
      var disabled = locked ? " disabled" : "";
      return "<article class=\"ar-co\" data-ar-account=\"" + esc(account.id) + "\"><b>" + esc(account.label) + "</b><p class=\"na-note\">" + esc(account.code) + "</p>" +
        "<label>" + esc(tx(lang, "Sent", "Enviada")) +
        "<select id=\"arSent-" + esc(account.id) + "\" aria-label=\"" + esc(tx(lang, "Sent", "Enviada") + " " + account.code) + "\"" + disabled + ">" +
        "<option value=\"yes\"" + (sent === "yes" ? " selected" : "") + ">" + esc(tx(lang, "Yes", "Sí")) + "</option>" +
        "<option value=\"no\"" + (sent === "no" ? " selected" : "") + ">" + esc(tx(lang, "No", "No")) + "</option></select></label>" +
        "<label>" + esc(tx(lang, "Amount", "Monto")) +
        "<input id=\"arAmt-" + esc(account.id) + "\" inputmode=\"decimal\" value=\"" + esc(amount) + "\" aria-label=\"" + esc(tx(lang, "Amount", "Monto") + " " + account.code) + "\"" + disabled + "></label>" +
        "<label>" + esc(tx(lang, "Date sent", "Fecha de envío")) +
        "<input id=\"arDate-" + esc(account.id) + "\" type=\"date\" value=\"" + esc(date) + "\" aria-label=\"" + esc(tx(lang, "Date sent", "Fecha de envío") + " " + account.code) + "\"" + disabled + "></label></article>";
    }).join("") + (locked ? "" : "<button type=\"button\" class=\"btn ar-wide\" onclick=\"arSaveLines()\">" + esc(tx(lang, "Save invoice lines", "Guardar facturas")) + "</button>");
  }
  function proofFields(month, lang, locked) {
    var kind = month.proofKind || "link";
    var disabled = locked ? " disabled" : "";
    return "<h3>" + esc(tx(lang, "Proof", "Comprobante")) + "</h3><p class=\"na-note\">" +
      esc(tx(lang, "Link or attach the PMS aging report, or mark no open AR and add a note.", "Enlaza o adjunta el reporte de antigüedad, o marca que no hay CxC y agrega una nota.")) + "</p>" +
      "<label>" + esc(tx(lang, "Proof type", "Tipo de comprobante")) +
      "<select id=\"arProofKind\"" + disabled + ">" +
      "<option value=\"link\"" + (kind === "link" ? " selected" : "") + ">" + esc(tx(lang, "Link the aging report", "Enlace del reporte")) + "</option>" +
      "<option value=\"file\"" + (kind === "file" ? " selected" : "") + ">" + esc(tx(lang, "Attach the aging report", "Adjuntar el reporte")) + "</option>" +
      "<option value=\"no_open_ar\"" + (kind === "no_open_ar" ? " selected" : "") + ">" + esc(tx(lang, "No open AR", "Sin CxC abierta")) + "</option></select></label>" +
      "<label>" + esc(tx(lang, "Report link", "Enlace del reporte")) +
      "<input id=\"arProofUrl\" type=\"url\" value=\"" + esc(month.proofUrl || "") + "\" placeholder=\"https://\"" + disabled + "></label>" +
      "<label class=\"photo-pick\">" + esc(tx(lang, "Attach a PDF or image", "Adjuntar PDF o imagen")) +
      "<input id=\"arProofFile\" type=\"file\" accept=\"application/pdf,image/png,image/jpeg,image/webp\"" + disabled + "></label>" +
      (month.proofName ? "<p class=\"na-note\">" + esc(month.proofName) + "</p>" : "") +
      "<label>" + esc(tx(lang, "Note", "Nota")) +
      "<textarea id=\"arProofNote\" maxlength=\"400\"" + disabled + ">" + esc(month.proofNote || "") + "</textarea></label>";
  }
  function invoiceHtml(model, actor, view) {
    view = view || {};
    actor = actor || {};
    var lang = view.lang === "es" ? "es" : "en";
    if (!isGm(actor.role)) return "";
    var hotel = canSeeHotel(actor, view.hotel) ? view.hotel : actor.hotel;
    if (!canInvoice(actor, hotel)) return "";
    var month = currentMonth(model, hotel);
    var status = monthStatus(month.period, month.submittedAt, model.today);
    var locked = !!month.submittedAt;
    var ledgers = ledgersFor(model, hotel);
    var arLedger = null;
    ledgers.forEach(function (row) { if (row.id === "ar") arLedger = row; });
    var context = "";
    if (!(model.accounts || []).some(function (row) { return row.hotel === hotel && row.active !== false; }) && arLedger) {
      context = "<p class=\"na-note\">" + esc(tx(lang, "AR ledger today", "Libro de CxC hoy") + " " + money(arLedger.today) + ". " + tx(lang, "Company detail is not on this feed.", "El detalle por empresa no está en esta fuente.")) + "</p>";
    }
    var error = "";
    if (view.error === "proof") error = tx(lang, "Add the report link or file.", "Agrega el enlace o el archivo.");
    if (view.error === "note") error = tx(lang, "Add a short note for no open AR.", "Agrega una nota breve si no hay CxC.");
    if (view.error === "lines") error = tx(lang, "Record sent or not sent for every company.", "Anota si enviaste o no cada empresa.");
    if (view.error === "sent") error = tx(lang, "No open AR cannot include a sent invoice.", "Sin CxC no puede incluir una factura enviada.");
    if (view.error === "amount" || view.error === "date") error = tx(lang, "A sent invoice needs an amount and a date in this month.", "Una factura enviada necesita monto y una fecha de este mes.");
    return "<div class=\"ar\" id=\"arInvoice\"><h2>" + esc(tx(lang, "Send direct-bill invoices", "Enviar facturas de cuenta directa")) + "</h2>" +
      exampleBanner(model, lang) +
      "<div class=\"na-line\"><b>" + esc(hotelLabel(hotel)) + "</b>" + badge(status, statusLabel(status, lang)) + "</div>" +
      "<p class=\"na-note\">" + esc(tx(lang, "Due", "Límite") + " " + prettyDate(dueDate(month.period), lang) + " · " + tx(lang, "America/Chicago. Overdue to JR Corporate after the 5th.", "America/Chicago. Atrasado para JR Corporate después del día 5.")) + "</p>" +
      context + agingBlock(model, hotel, lang) + companyFields(model, hotel, month.period, lang, locked) +
      proofFields(month, lang, locked) +
      (error ? "<p class=\"bad\">" + esc(error) + "</p>" : "") +
      (locked ? "<p class=\"na-done\">" + esc(tx(lang, "Submitted", "Enviado") + (month.submittedName ? " · " + month.submittedName : "")) + "</p>" : "<button type=\"button\" class=\"btn ar-wide\" onclick=\"arSubmit()\">" + esc(tx(lang, "Submit direct-bill invoices", "Enviar facturas")) + "</button>") +
      "</div>";
  }
  function overviewHtml(model, actor, view) {
    view = view || {};
    if (!isCorporate(actor && actor.role)) return "";
    var lang = view.lang === "es" ? "es" : "en";
    var cards = HOTELS.map(function (hotel) {
      var month = currentMonth(model, hotel);
      var status = monthStatus(month.period, month.submittedAt, model.today);
      var stats = lineStats(model, hotel, month.period);
      var companies = stats.accounts ? (stats.sent + " " + tx(lang, "of", "de") + " " + stats.accounts + " " + tx(lang, "sent", "enviadas")) : tx(lang, "No company detail", "Sin detalle por empresa");
      if (month.proofKind === "no_open_ar" && month.submittedAt) companies = tx(lang, "No open AR", "Sin CxC abierta");
      var checks = CHECKS.map(function (spec) {
        var state = checkState(model, hotel, spec.id);
        var flags = flagsFor(model, hotel, spec.id).filter(function (flag) { return !flag.resolution; });
        var text = state.state === "no_feed" ? statusLabel("no_feed", lang) : (state.state === "source_missing" ? statusLabel("source_missing", lang) : (flags.length ? flags.length + " " + tx(lang, "open", "abiertos") : statusLabel("clear", lang)));
        return "<p class=\"na-note\">" + esc((lang === "es" ? spec.es : spec.en) + ": " + text) + "</p>";
      }).join("");
      return "<article class=\"card ar-hotel\"><h3>" + esc(hotelLabel(hotel)) + "</h3>" +
        "<div class=\"na-line\"><span>" + esc(tx(lang, "Invoices", "Facturas")) + "</span>" + badge(status, statusLabel(status, lang)) + "</div>" +
        "<p class=\"na-note\">" + esc(companies) + "</p>" + agingBlock(model, hotel, lang) + checks + ledgerTable(model, hotel, lang) + "</article>";
    }).join("");
    var escalated = [];
    HOTELS.forEach(function (hotel) {
      CHECKS.forEach(function (spec) {
        flagsFor(model, hotel, spec.id).forEach(function (flag) {
          if (!flag.resolution && isEscalated(flag, model.today, false)) escalated.push(flag);
        });
      });
    });
    var escalatedHtml = "<h3>" + esc(tx(lang, "Escalated to Corporate", "Escalado a Corporativo")) + "</h3>" +
      (escalated.length ? escalated.map(function (flag) { return flagHtml(flag, model, actor, view); }).join("") : "<p class=\"na-note\">" + esc(tx(lang, "No balance has been open more than 3 days.", "Ningún saldo lleva más de 3 días abierto.")) + "</p>");
    var agingForm = "<h3>" + esc(tx(lang, "Enter 30/60/90", "Capturar 30/60/90")) + "</h3><div class=\"ar-form\">" +
      "<label>" + esc(tx(lang, "Hotel", "Hotel")) + "<select id=\"arAgeHotel\">" + HOTELS.map(function (hotel) { return "<option>" + hotel + "</option>"; }).join("") + "</select></label>" +
      "<label>" + esc(tx(lang, "As of", "Al")) + "<input id=\"arAgeDate\" type=\"date\" value=\"" + esc(model.today) + "\"></label>" +
      "<label>Current <input id=\"arAgeCurrent\" inputmode=\"decimal\" value=\"0\"></label>" +
      "<label>30 <input id=\"arAge30\" inputmode=\"decimal\" value=\"0\"></label>" +
      "<label>60 <input id=\"arAge60\" inputmode=\"decimal\" value=\"0\"></label>" +
      "<label>90+ <input id=\"arAge90\" inputmode=\"decimal\" value=\"0\"></label>" +
      "<button type=\"button\" class=\"btn ar-wide\" onclick=\"arAging()\">" + esc(tx(lang, "Save aging summary", "Guardar antigüedad")) + "</button></div>";
    var thresholds = "<h3>" + esc(tx(lang, "In-house threshold", "Límite en casa")) + "</h3>" + HOTELS.map(function (hotel) {
      return "<label class=\"ar-form\">" + esc(hotelLabel(hotel)) +
        "<input id=\"arThresh-" + hotel + "\" inputmode=\"decimal\" value=\"" + esc(String(thresholdFor(model, hotel))) + "\"></label>" +
        "<button type=\"button\" class=\"btn2 ar-wide\" onclick=\"arThreshold('" + hotel + "')\">" + esc(tx(lang, "Save threshold", "Guardar límite")) + "</button>";
    }).join("");
    var overdue = HOTELS.filter(function (hotel) {
      var month = currentMonth(model, hotel);
      return monthStatus(month.period, month.submittedAt, model.today) === "overdue";
    }).length;
    return "<div class=\"ar\" id=\"arOverview\"><h2>" + esc(tx(lang, "Accounts receivable", "Cuentas por cobrar")) + "</h2>" +
      exampleBanner(model, lang) +
      "<p class=\"na-note\">" + esc(overdue + " " + tx(lang, "hotels overdue to JR Corporate", "hoteles atrasados para JR Corporate")) + "</p>" +
      cards + escalatedHtml + agingForm + thresholds +
      (view.error ? "<p class=\"bad\">" + esc(tx(lang, "Could not save that.", "No se pudo guardar.")) + "</p>" : "") +
      "</div>";
  }
  function pageFor(model, actor, view) {
    actor = actor || {};
    if (isCorporate(actor.role)) return overviewHtml(model, actor, view);
    if (isGm(actor.role)) return invoiceHtml(model, actor, view);
    if (isDesk(actor.role)) return balanceHtml(model, actor, view);
    return "";
  }
  function homeCard(model, actor, lang) {
    actor = actor || {};
    lang = lang === "es" ? "es" : "en";
    if (isCorporate(actor.role)) {
      var overdue = HOTELS.filter(function (hotel) {
        var month = currentMonth(model, hotel);
        return monthStatus(month.period, month.submittedAt, model.today) === "overdue";
      }).length;
      var missing = 0;
      HOTELS.forEach(function (hotel) {
        CHECKS.forEach(function (spec) {
          if (checkState(model, hotel, spec.id).state === "source_missing") missing += 1;
        });
      });
      return "<section class=\"ar-home\" id=\"arHome\"><div class=\"na-line\"><h3>" + esc(tx(lang, "Accounts receivable", "Cuentas por cobrar")) + "</h3>" +
        badge(overdue ? "overdue" : "open", overdue ? statusLabel("overdue", lang) : tx(lang, "Open", "Abierto")) + "</div>" +
        "<p class=\"na-note\">" + esc(overdue + " " + tx(lang, "hotels overdue to JR Corporate", "hoteles atrasados para JR Corporate") + " · " + missing + " " + tx(lang, "checks source missing", "revisiones sin fuente")) + "</p>" +
        "<button type=\"button\" class=\"btn ar-wide\" onclick=\"arOpen()\">" + esc(tx(lang, "Open accounts receivable", "Abrir cuentas por cobrar")) + "</button></section>";
    }
    if (isGm(actor.role) && HOTELS.indexOf(actor.hotel) >= 0) {
      var month = currentMonth(model, actor.hotel);
      var status = monthStatus(month.period, month.submittedAt, model.today);
      if (status === "upcoming") return "";
      return "<section class=\"ar-home\" id=\"arHome\"><div class=\"na-line\"><h3>" + esc(tx(lang, "Send direct-bill invoices", "Enviar facturas de cuenta directa")) + "</h3>" +
        badge(status, statusLabel(status, lang)) + "</div>" +
        "<p class=\"na-note\">" + esc(actor.hotel + " · " + tx(lang, "Due", "Límite") + " " + prettyDate(dueDate(month.period), lang)) + "</p>" +
        "<button type=\"button\" class=\"btn ar-wide\" onclick=\"arOpen()\">" + esc(tx(lang, "Open the invoice task", "Abrir la tarea de facturas")) + "</button></section>";
    }
    if (isDesk(actor.role) && HOTELS.indexOf(actor.hotel) >= 0) {
      var state = checkState(model, actor.hotel, "inhouse_over");
      var open = flagsFor(model, actor.hotel, "inhouse_over").filter(function (flag) { return !flag.resolution; }).length;
      var text = state.state === "no_feed"
        ? tx(lang, "No in-house balance feed yet.", "Aún no hay datos de saldos en casa.")
        : (state.state === "source_missing" ? tx(lang, "Source missing for in-house balances.", "Falta la fuente de saldos en casa.") : open + " " + tx(lang, "over", "sobre") + " " + money(thresholdFor(model, actor.hotel)));
      return "<section class=\"ar-home\" id=\"arHome\"><h3>" + esc(tx(lang, "In-house balances", "Saldos en casa")) + "</h3><p class=\"na-note\">" + esc(text) + "</p>" +
        "<button type=\"button\" class=\"btn ar-wide\" onclick=\"arOpen()\">" + esc(tx(lang, "Open the list", "Abrir la lista")) + "</button></section>";
    }
    return "";
  }

  var api = {
    HOTELS: HOTELS, CHECKS: CHECKS, LEDGERS: LEDGERS, PEP_BUCKETS: PEP_BUCKETS, STANDARD_BUCKETS: STANDARD_BUCKETS,
    SYSTEMS: SYSTEMS, DEFAULT_THRESHOLD: DEFAULT_THRESHOLD, DUE_DAY: DUE_DAY, ESCALATE_DAYS: ESCALATE_DAYS, TZ: TZ,
    isCorporate: isCorporate, isGm: isGm, isDesk: isDesk, hotelsFor: hotelsFor, canInvoice: canInvoice,
    canResolve: canResolve, canThreshold: canThreshold, canAging: canAging, demoUi: demoUi,
    checkinDate: checkinDate, addDays: addDays, monthStart: monthStart, dueDate: dueDate, monthStatus: monthStatus,
    buildDemo: buildDemo, flagsFromDetail: flagsFromDetail, checkState: checkState, flagsFor: flagsFor,
    isEscalated: isEscalated, summaryBuckets: summaryBuckets, accountBuckets: accountBuckets, bucketAmount: bucketAmount,
    saveLines: saveLines, submitMonth: submitMonth, resolveFlag: resolveFlag, setThreshold: setThreshold, saveAging: saveAging,
    applySaved: applySaved, userOverlay: userOverlay, modelFromRows: modelFromRows,
    balanceHtml: balanceHtml, invoiceHtml: invoiceHtml, overviewHtml: overviewHtml, homeCard: homeCard, pageFor: pageFor,
    money: money
  };
  api.nightSection = function (actor, opts) {
    if (!isGm(actor && actor.role) && !isCorporate(actor && actor.role)) return "";
    return balanceHtml(bundle(), actor, opts || {});
  };
  function bundle() {
    return applySaved(buildDemo(new Date().toISOString()), readSaved());
  }
  function readSaved() {
    try {
      if (typeof localStorage === "undefined") return {};
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1) return {};
      return data;
    } catch (e) { return {}; }
  }
  api.bundle = bundle;
  root.AccountsReceivable = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

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
  function remember(model) {
    try { if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(userOverlay(model))); } catch (e) {}
  }
  function pageView() {
    var view = { lang: langNow(), hotel: "", openId: "", error: "" };
    try {
      view.hotel = S.arHotel || S.hotel || "";
      view.openId = S.arItem || "";
      view.error = S.arErr || "";
    } catch (e) {}
    return view;
  }
  var liveState = "";
  var liveModel = null;
  function ensureLive() {
    if (demoUi()) return;
    if (liveState === "loading" || liveState === "ready") return;
    if (typeof useRemote !== "function" || !useRemote() || typeof sb === "undefined" || !sb) {
      liveState = "ready";
      liveModel = modelFromRows({ origin: "live", loadError: true }, new Date().toISOString());
      return;
    }
    liveState = "loading";
    Promise.all([
      sb.from("ar_settings").select("hotel,inhouse_threshold"),
      sb.from("ar_accounts").select("id,hotel,account_code,label,active,source").eq("active", true),
      sb.from("ar_invoice_months").select("hotel,period_month,proof_kind,proof_url,proof_name,proof_note,submitted_at,submitted_name"),
      sb.from("ar_invoice_lines").select("hotel,period_month,account_id,sent,amount,sent_on"),
      sb.from("ar_aging_summaries").select("hotel,as_of,bucket_set,bucket,amount,source").order("as_of", { ascending: false }).limit(200),
      sb.from("ar_aging_accounts").select("hotel,as_of,section,account_code,company_label,bucket_set,bucket,amount,source").order("as_of", { ascending: false }).limit(500),
      sb.from("ar_balance_checks").select("hotel,audit_date,check_kind,status,detail_level,source,reason").order("audit_date", { ascending: false }).limit(90),
      sb.from("ar_ledger_totals").select("hotel,audit_date,ledger,yesterday_balance,today_balance,source").order("audit_date", { ascending: false }).limit(90),
      sb.from("ar_balance_flags").select("id,hotel,audit_date,check_kind,folio_ref,room,amount,opened_on,stay_status,source").order("audit_date", { ascending: false }).limit(300),
      sb.from("ar_balance_resolutions").select("flag_id,hotel,action,note,resolved_name,resolved_at").limit(300)
    ]).then(function (parts) {
      var failed = (parts || []).some(function (res) { return !res || res.error; });
      function rows(i) { return parts[i] && parts[i].data ? parts[i].data : []; }
      liveModel = modelFromRows({
        origin: "live", loadError: failed, settings: rows(0), accounts: rows(1), months: rows(2), lines: rows(3),
        agingSummaries: rows(4), agingAccounts: rows(5), checks: rows(6), ledgers: rows(7), flags: rows(8), resolutions: rows(9)
      }, new Date().toISOString());
      liveState = "ready";
      try { render(); } catch (e) {}
    }, function () {
      liveModel = modelFromRows({ origin: "live", loadError: true }, new Date().toISOString());
      liveState = "ready";
      try { render(); } catch (e2) {}
    });
  }
  function currentModel() {
    if (demoUi()) return bundle();
    ensureLive();
    return liveModel || modelFromRows({ origin: "live" }, new Date().toISOString());
  }
  api.nightSection = function (actor, opts) {
    if (!isGm(actor && actor.role) && !isCorporate(actor && actor.role)) return "";
    opts = opts || {};
    opts.lang = opts.lang || langNow();
    try { opts.openId = S.arItem || opts.openId || ""; opts.error = S.arErr || ""; } catch (e) {}
    if (!demoUi() && liveState !== "ready") {
      ensureLive();
      return "<section class=\"ar\" id=\"arBalances\"><h3>" + esc(tx(opts.lang, "Balance checks", "Revisión de saldos")) + "</h3><p class=\"na-note\">" + esc(tx(opts.lang, "Loading the AR feed.", "Cargando la fuente de CxC.")) + "</p></section>";
    }
    return balanceHtml(currentModel(), actor, opts);
  };
  function bootPage() {
    var actor = currentActor();
    var model = currentModel();
    if (!demoUi() && liveState !== "ready") {
      return "<div class=\"ar\" id=\"arInvoice\"><h2>" + esc(tx(langNow(), "Accounts receivable", "Cuentas por cobrar")) + "</h2><p class=\"na-note\">" + esc(tx(langNow(), "Loading the AR feed.", "Cargando la fuente de CxC.")) + "</p></div>";
    }
    return pageFor(model, actor, pageView());
  }
  function homeHtml() {
    var actor = currentActor();
    if (!isGm(actor.role) && !isCorporate(actor.role) && !isDesk(actor.role)) return "";
    if (!demoUi() && liveState !== "ready") return "";
    return homeCard(currentModel(), actor, langNow());
  }
  api.homeHtml = homeHtml;

  function toast(text) {
    try { if (typeof showToast === "function") showToast(text); } catch (e) {}
  }
  function refresh(model) {
    remember(model);
    try { S.arErr = ""; } catch (e) {}
    if (typeof render === "function") render();
  }
  root.arOpen = function () {
    var actor = currentActor();
    if (!isGm(actor.role) && !isCorporate(actor.role) && !isDesk(actor.role)) return;
    if (typeof go === "function") go("ar");
  };
  root.arExplain = function (id) {
    if (!safeFlag(id)) return;
    try { S.arItem = id; S.arErr = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.arAct = function (id, action) {
    if (!safeFlag(id)) return;
    var note = "";
    if (action === "explain") {
      var el = document.getElementById("arNote");
      note = el ? el.value : "";
    }
    var actor = currentActor();
    if (!demoUi()) {
      if (typeof sb === "undefined" || !sb || !sb.rpc) return;
      if (action === "explain" && String(note || "").replace(/^\s+|\s+$/g, "").length < 3) {
        try { S.arItem = id; S.arErr = "note"; } catch (e) {}
        if (typeof render === "function") render();
        return;
      }
      sb.rpc("resolve_ar_balance_flag", { p_flag: id, p_action: action, p_note: note }).then(function (res) {
        if (res && res.error) return;
        if (liveModel && liveModel.resolutions) {
          liveModel.resolutions.push({ flagId: id, action: action, note: note, by: actor.name || "", source: "loaded" });
        }
        try { S.arItem = ""; } catch (e2) {}
        if (typeof render === "function") render();
      });
      return;
    }
    var result = resolveFlag(bundle(), id, action, note, actor, new Date().toISOString());
    if (!result.ok) {
      try { S.arItem = id; S.arErr = result.error; } catch (e3) {}
      if (typeof render === "function") render();
      return;
    }
    try { S.arItem = ""; } catch (e4) {}
    refresh(result.model);
  };
  root.arSaveLines = function () {
    if (!demoUi() && liveState !== "ready") return;
    var actor = currentActor();
    var model = currentModel();
    var hotel = actor.hotel;
    var period = monthStart(model.today);
    var rows = [];
    document.querySelectorAll("[data-ar-account]").forEach(function (node) {
      var id = node.getAttribute("data-ar-account");
      var sentEl = document.getElementById("arSent-" + id);
      var amtEl = document.getElementById("arAmt-" + id);
      var dateEl = document.getElementById("arDate-" + id);
      rows.push({
        accountId: id,
        sent: sentEl && sentEl.value === "yes",
        amount: amtEl ? amtEl.value : "",
        sentOn: dateEl ? dateEl.value : ""
      });
    });
    if (!demoUi()) {
      var chain = Promise.resolve();
      rows.forEach(function (row) {
        chain = chain.then(function () {
          return sb.rpc("save_ar_invoice_line", {
            p_hotel: hotel, p_month: period, p_account: row.accountId, p_sent: row.sent,
            p_amount: row.sent ? Number(row.amount) : null, p_sent_on: row.sent ? row.sentOn : null
          });
        });
      });
      chain.then(function () { liveState = ""; ensureLive(); }, function () {});
      return;
    }
    var result = saveLines(model, hotel, period, rows, actor);
    if (!result.ok) {
      try { S.arErr = result.error; } catch (e) {}
      if (typeof render === "function") render();
      return;
    }
    refresh(result.model);
    toast(tx(langNow(), "Invoice lines saved", "Facturas guardadas"));
  };
  root.arSubmit = function () {
    var actor = currentActor();
    var model = currentModel();
    var hotel = actor.hotel;
    var period = monthStart(model.today);
    var kindEl = document.getElementById("arProofKind");
    var urlEl = document.getElementById("arProofUrl");
    var noteEl = document.getElementById("arProofNote");
    var fileEl = document.getElementById("arProofFile");
    var proof = {
      kind: kindEl ? kindEl.value : "",
      url: urlEl ? urlEl.value : "",
      name: "",
      note: noteEl ? noteEl.value : ""
    };
    var file = fileEl && fileEl.files && fileEl.files[0];
    if (file) proof.name = file.name;
    function afterProof() {
      if (!demoUi()) {
        sb.rpc("submit_ar_invoice_month", {
          p_hotel: hotel, p_month: period, p_proof_kind: proof.kind, p_proof_url: proof.url,
          p_proof_name: proof.name, p_proof_note: proof.note
        }).then(function (res) {
          if (res && res.error) {
            try { S.arErr = "proof"; } catch (e) {}
            if (typeof render === "function") render();
            return;
          }
          liveState = "";
          ensureLive();
        });
        return;
      }
      if (proof.kind === "file" && proof.name && proof.url.indexOf("https://") !== 0 && proof.url.indexOf(hotel + "/") !== 0) {
        proof.url = "https://example.invalid/ar/" + encodeURIComponent(proof.name);
      }
      var result = submitMonth(model, hotel, period, proof, actor, new Date().toISOString());
      if (!result.ok) {
        try { S.arErr = result.error; } catch (e2) {}
        if (typeof render === "function") render();
        return;
      }
      refresh(result.model);
    }
    if (!demoUi() && proof.kind === "file" && file && sb && sb.storage) {
      var safe = String(file.name || "report").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
      var path = hotel + "/" + period + "/" + Date.now() + "-" + safe;
      sb.storage.from("ar-proofs").upload(path, file, { contentType: file.type || "application/pdf", upsert: false }).then(function (res) {
        if (res && res.error) {
          try { S.arErr = "proof"; } catch (e3) {}
          if (typeof render === "function") render();
          return;
        }
        proof.url = path;
        proof.name = file.name;
        afterProof();
      }, function () {
        try { S.arErr = "proof"; } catch (e4) {}
        if (typeof render === "function") render();
      });
      return;
    }
    afterProof();
  };
  root.arAging = function () {
    var actor = currentActor();
    var hotelEl = document.getElementById("arAgeHotel");
    var hotel = hotelEl ? hotelEl.value : "";
    var dateEl = document.getElementById("arAgeDate");
    var buckets = {
      current: document.getElementById("arAgeCurrent") ? document.getElementById("arAgeCurrent").value : "",
      d30: document.getElementById("arAge30") ? document.getElementById("arAge30").value : "",
      d60: document.getElementById("arAge60") ? document.getElementById("arAge60").value : "",
      d90: document.getElementById("arAge90") ? document.getElementById("arAge90").value : ""
    };
    var asOf = dateEl ? dateEl.value : "";
    if (!demoUi()) {
      sb.rpc("save_ar_aging_summary", {
        p_hotel: hotel, p_as_of: asOf, p_current: Number(buckets.current), p_d30: Number(buckets.d30),
        p_d60: Number(buckets.d60), p_d90: Number(buckets.d90)
      }).then(function () { liveState = ""; ensureLive(); });
      return;
    }
    var result = saveAging(currentModel(), hotel, asOf, buckets, actor);
    if (!result.ok) {
      try { S.arErr = result.error; } catch (e) {}
      if (typeof render === "function") render();
      return;
    }
    refresh(result.model);
  };
  root.arThreshold = function (hotel) {
    if (HOTELS.indexOf(hotel) < 0) return;
    var el = document.getElementById("arThresh-" + hotel);
    var amount = el ? el.value : "";
    var actor = currentActor();
    if (!demoUi()) {
      sb.rpc("set_ar_inhouse_threshold", { p_hotel: hotel, p_amount: Number(amount) }).then(function () { liveState = ""; ensureLive(); });
      return;
    }
    var result = setThreshold(currentModel(), hotel, amount, actor);
    if (!result.ok) return;
    refresh(result.model);
  };

  if (typeof M !== "undefined") M.ar = ["💵", "Accounts receivable"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Accounts receivable"] = "Cuentas por cobrar";
  if (typeof V !== "undefined") V.ar = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = currentActor();
      var who = actor.role || role;
      var show = isGm(who) || isCorporate(who) || isDesk(who);
      if (show && list.indexOf("ar") < 0) list.splice(Math.min(1, list.length), 0, "ar");
      if (!show) list = list.filter(function (id) { return id !== "ar"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("ar") < 0) RSEC[4][2].push("ar"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("ar") < 0) NOCOLS.push("ar"); } catch (e2) {}

  var style = document.createElement("style");
  style.textContent = [
    ".ar-home{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".ar-home h3,.ar h3{margin:8px 0 4px}",
    ".ar-wide{width:100%;margin-top:8px}",
    ".ar-miss{background:#eef1f4;color:#3c4658;border-radius:8px;padding:8px 10px}",
    ".ar-esc{background:#fff6f6;border-radius:8px;padding:8px;margin-top:6px}",
    ".ar-buckets{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}",
    ".ar-buckets div{background:#eef3fa;border-radius:8px;padding:8px}",
    ".ar-buckets b{display:block;font-size:12px;color:#3c4658;font-weight:700}",
    ".ar-co{padding:8px 0;border-top:1px solid #e6ebf2}",
    ".ar-co label,.ar-form label{display:block;font-size:13px;font-weight:700;margin:6px 0}",
    ".ar-co input,.ar-co select,.ar-form input,.ar-form select,.ar-form textarea{width:100%;font-weight:400}",
    ".ar-t{width:100%;border-collapse:collapse;font-size:14px}",
    ".ar-t td,.ar-t th{padding:6px 4px;border-bottom:1px solid #e6ebf2;text-align:left}",
    ".ar .na-badge{display:inline-block;padding:3px 8px;border-radius:999px;font-size:12px;font-weight:800}",
    ".ar .na-st-open,.ar-home .na-st-open{background:#fff3cd;color:#8a5a00}",
    ".ar .na-st-overdue,.ar-home .na-st-overdue{background:#fde2e1;color:#7a1218}",
    ".ar .na-st-on_time,.ar-home .na-st-on_time{background:#d4f5dc;color:#15642f}",
    ".ar .na-st-no_report,.ar-home .na-st-no_report{background:#eef1f4;color:#5c6570}",
    ".ar .na-done{background:#d4f5dc;color:#15642f;border-radius:8px;padding:8px 10px;font-weight:800}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
