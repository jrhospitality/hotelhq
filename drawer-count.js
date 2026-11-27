/* Drawer count for the Golden Valley (MSPWE) front desk. Demo only for now.
   Replaces the Quore Cash Count Log. Checklist items with
   {"type":"amount","expected":300,"count":"start"|"end"} take a typed dollar
   amount; {"type":"amount","count":"drop"} takes the cash drop amount.
   variance = counted - expected. Any variance is flagged in-app to the
   hotel's GM and AGM (and Corporate) until one of them marks it reviewed.
   Nothing is emailed or pushed.
   Live storage is public.cash_counts via public.log_cash_count and
   public.review_cash_count (migration 20261127_cash_counts.sql). Live mode
   shows nothing here until the release is approved. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE"];
  var EXPECTED = 300;
  var STORE = "hhq.cashCounts";
  var ITEMS = {
    AM: [
      { n: 2, en: "Start-of-shift drawer count", es: "Cuenta de caja al inicio del turno", type: "amount", expected: EXPECTED, count: "start" },
      { n: 38, en: "End-of-shift drawer count", es: "Cuenta de caja al final del turno", type: "amount", expected: EXPECTED, count: "end" }
    ],
    PM: [
      { n: 2, en: "Start-of-shift drawer count", es: "Cuenta de caja al inicio del turno", type: "amount", expected: EXPECTED, count: "start" },
      { n: 22, en: "End-of-shift drawer count (back to $300.00)", es: "Cuenta de caja al final del turno (de nuevo en $300.00)", type: "amount", expected: EXPECTED, count: "end" },
      { n: 23, en: "Cash drop", es: "Depósito de efectivo", type: "amount", count: "drop" }
    ],
    "Night Audit": [
      { n: 2, en: "Start-of-shift drawer count", es: "Cuenta de caja al inicio del turno", type: "amount", expected: EXPECTED, count: "start" },
      { n: 3, en: "Cash drop (overages)", es: "Depósito de efectivo (sobrantes)", type: "amount", count: "drop" },
      { n: 34, en: "End-of-shift drawer count (back to $300.00)", es: "Cuenta de caja al final del turno (de nuevo en $300.00)", type: "amount", expected: EXPECTED, count: "end" }
    ]
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function isDemo() {
    try { return (root.HOTELHQ_CONFIG || {}).mode !== "live"; } catch (e) { return true; }
  }
  function normRole(role) {
    var DA = root.DailyAssign;
    if (DA && DA.normRole) return DA.normRole(role);
    return String(role || "").trim().toLowerCase().replace(/\s+/g, "_");
  }
  function isLeader(role) {
    var r = normRole(role);
    return r === "gm" || r === "agm" || r === "above_property";
  }
  function parseAmount(value) {
    var text = String(value == null ? "" : value).replace(/[$,\s]/g, "");
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
    var n = Math.round(Number(text) * 100) / 100;
    if (!isFinite(n) || n > 100000) return null;
    return n;
  }
  function money(n) {
    if (n == null || !isFinite(n)) return "";
    var sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toFixed(2);
  }
  function amountItems(items) {
    return (items || []).filter(function (it) { return it && it.type === "amount"; });
  }
  function entry(opts) {
    var amount = parseAmount(opts.amount);
    if (amount == null) return null;
    var item = opts.item || {};
    var kind = item.count === "drop" ? "drop" : (item.count === "end" ? "end" : "start");
    var expected = kind === "drop" ? null : Number(item.expected != null ? item.expected : EXPECTED);
    var counted = kind === "drop" ? null : amount;
    var variance = kind === "drop" ? null : Math.round((counted - expected) * 100) / 100;
    return {
      id: opts.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      hotel: opts.hotel,
      date: String(opts.date || "").slice(0, 10),
      shift: opts.shift,
      kind: kind,
      user: opts.user,
      name: opts.name || "",
      counted: counted,
      expected: expected,
      variance: variance,
      drop: kind === "drop" ? amount : null,
      item_n: item.n || null,
      at: opts.at || new Date().toISOString(),
      reviewedBy: "",
      reviewedAt: ""
    };
  }
  function flagged(row) {
    return !!row && row.kind !== "drop" && row.variance != null && row.variance !== 0;
  }
  function openFlags(rows, hotel) {
    return (rows || []).filter(function (row) { return row.hotel === hotel && flagged(row) && !row.reviewedAt; });
  }
  function visible(rows, viewer) {
    viewer = viewer || {};
    var r = normRole(viewer.role);
    return (rows || []).filter(function (row) {
      if (r === "above_property") return !viewer.hotel || row.hotel === viewer.hotel;
      if (r === "gm" || r === "agm") return row.hotel === viewer.hotel;
      return row.user === viewer.id;
    });
  }
  function review(rows, id, by, at) {
    return (rows || []).map(function (row) {
      if (row.id !== id || row.reviewedAt || !flagged(row)) return row;
      return Object.assign({}, row, { reviewedBy: by || "", reviewedAt: at || new Date().toISOString() });
    });
  }

  function readRows(storage) {
    try { return JSON.parse((storage || root.localStorage).getItem(STORE) || "[]") || []; } catch (e) { return []; }
  }
  function writeRows(rows, storage) {
    try { (storage || root.localStorage).setItem(STORE, JSON.stringify(rows.slice(-500))); } catch (e) {}
  }

  function viewerNow() {
    var user = null;
    try { user = typeof meUser === "function" ? meUser() : null; } catch (e) { user = null; }
    if (!user) return null;
    var hotel = "";
    try { hotel = (typeof S !== "undefined" && S.hotel) || user.hotel || ""; } catch (e2) { hotel = user.hotel || ""; }
    return { id: user.id, name: user.name || "", role: user.role || "", hotel: hotel };
  }
  function todayIso() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function shiftNow(viewer, date, storage) {
    var SP = root.ShiftPick;
    var picked = SP && SP.answerOf ? SP.answerOf(viewer, date, storage) : "";
    if (picked) return picked;
    var DA = root.DailyAssign;
    var d = new Date();
    var hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if (DA && DA.mspweFdBucket && viewer.hotel === "MSPWE") return DA.mspweFdBucket(hm);
    return DA && DA.shiftBucket ? DA.shiftBucket(hm) : "AM";
  }

  function staffCardHtml(viewer, shift, rows, lang) {
    var es = lang === "es";
    var items = ITEMS[shift] || [];
    var mine = (rows || []).filter(function (r) { return r.user === viewer.id && r.date === todayIso() && r.shift === shift; });
    var lines = items.map(function (it) {
      var done = mine.filter(function (r) { return r.item_n === it.n; }).slice(-1)[0];
      var status = "";
      if (done) {
        status = done.kind === "drop"
          ? (es ? "Depósito " : "Drop ") + money(done.drop)
          : money(done.counted) + (done.variance ? " · " + (es ? "Diferencia " : "Variance ") + money(done.variance) + (es ? " · avisado al GM/AGM" : " · flagged to GM/AGM") : " · OK");
      }
      var hint = it.count === "drop" ? (es ? "Monto del depósito" : "Drop amount") : (es ? "Esperado " : "Expected ") + money(it.expected);
      return '<li class="' + (done && flagged(done) ? "dc-bad" : "") + '"><span>' + esc(es ? it.es : it.en) + "<small>" + esc(status || hint) + "</small></span>" +
        '<span class="dc-in"><input type="text" inputmode="decimal" placeholder="$0.00" aria-label="' + esc(es ? it.es : it.en) + '" id="dc-' + it.n + '">' +
        '<button type="button" class="btn2" onclick="DrawerCount.submit(' + it.n + ')">' + esc(es ? "Guardar" : "Save") + "</button></span></li>";
    }).join("");
    return '<section class="card" id="drawerCount"><span class="ex">' + esc(es ? "EJEMPLO" : "EXAMPLE") + "</span> <h3>" +
      esc(es ? "Cuenta de caja" : "Drawer count") + " · " + esc(shift) + "</h3><ul>" + lines + "</ul></section>";
  }
  function logCardHtml(viewer, rows, lang) {
    var es = lang === "es";
    var seen = visible(rows, viewer).slice().sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var open = openFlags(seen, viewer.hotel);
    var head = open.length
      ? '<p class="dc-flag">' + esc(open.length + (es ? " diferencias de caja por revisar" : (open.length === 1 ? " drawer variance needs review" : " drawer variances need review"))) + "</p>"
      : "";
    var lines = seen.slice(0, 20).map(function (r) {
      var what = r.kind === "drop"
        ? (es ? "Depósito " : "Drop ") + money(r.drop)
        : (r.kind === "start" ? (es ? "Inicio " : "Start ") : (es ? "Final " : "End ")) + money(r.counted) + " / " + money(r.expected) +
          (r.variance ? " · " + (es ? "Diferencia " : "Variance ") + money(r.variance) : "");
      var btn = flagged(r) && !r.reviewedAt
        ? ' <button type="button" class="btn2" onclick="DrawerCount.markReviewed(\'' + esc(r.id) + '\')">' + esc(es ? "Revisado" : "Mark reviewed") + "</button>"
        : (r.reviewedAt ? " <small>" + esc((es ? "Revisado por " : "Reviewed by ") + r.reviewedBy) + "</small>" : "");
      return '<li class="' + (flagged(r) && !r.reviewedAt ? "dc-bad" : "") + '"><span><b>' + esc(r.name || "") + "</b> · " + esc(r.date + " " + r.shift) + "<small>" + esc(what) + "</small></span>" + btn + "</li>";
    }).join("");
    if (!lines) lines = "<li><small>" + esc(es ? "Sin cuentas todavía." : "No counts yet.") + "</small></li>";
    return '<section class="card" id="cashLog"><span class="ex">' + esc(es ? "EJEMPLO" : "EXAMPLE") + "</span> <h3>" +
      esc(es ? "Registro de cuentas de caja" : "Cash count log") + "</h3>" + head + "<ul>" + lines + "</ul></section>";
  }
  function homeHtml() {
    if (!isDemo()) return "";
    var viewer = viewerNow();
    if (!viewer || HOTELS.indexOf(viewer.hotel) < 0) return "";
    var rows = readRows();
    var lang = langNow();
    if (isLeader(viewer.role)) return logCardHtml(viewer, rows, lang);
    if (normRole(viewer.role) !== "front_desk") return "";
    return staffCardHtml(viewer, shiftNow(viewer, todayIso()), rows, lang);
  }
  function submit(n) {
    if (!isDemo() || typeof document === "undefined") return;
    var viewer = viewerNow();
    if (!viewer) return;
    var shift = shiftNow(viewer, todayIso());
    var item = (ITEMS[shift] || []).filter(function (it) { return it.n === n; })[0];
    var box = document.getElementById("dc-" + n);
    var row = item && box ? entry({ amount: box.value, item: item, hotel: viewer.hotel, date: todayIso(), shift: shift, user: viewer.id, name: viewer.name }) : null;
    if (!row) {
      if (box) box.setAttribute("aria-invalid", "true");
      return;
    }
    var rows = readRows();
    rows.push(row);
    writeRows(rows);
    if (typeof render === "function") render();
  }
  function markReviewed(id) {
    if (!isDemo()) return;
    var viewer = viewerNow();
    if (!viewer || !isLeader(viewer.role)) return;
    writeRows(review(readRows(), id, viewer.name || viewer.id));
    if (typeof render === "function") render();
  }

  var api = {
    HOTELS: HOTELS,
    EXPECTED: EXPECTED,
    ITEMS: ITEMS,
    parseAmount: parseAmount,
    money: money,
    amountItems: amountItems,
    entry: entry,
    flagged: flagged,
    openFlags: openFlags,
    visible: visible,
    review: review,
    staffCardHtml: staffCardHtml,
    logCardHtml: logCardHtml,
    homeHtml: homeHtml,
    submit: submit,
    markReviewed: markReviewed
  };
  root.DrawerCount = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  var css = document.createElement("style");
  css.textContent = "#drawerCount ul,#cashLog ul{list-style:none;margin:8px 0 0;padding:0}#drawerCount li,#cashLog li{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #e6e8ee}#drawerCount small,#cashLog small{display:block;color:#5c6570;font-weight:650}.dc-in{display:flex;gap:6px}.dc-in input{max-width:110px}#drawerCount .dc-bad small,#cashLog .dc-bad small,.dc-flag{color:#9a3412;font-weight:800}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
