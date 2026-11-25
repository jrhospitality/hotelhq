/* Parking capture and market sales per occupied room.
   Corporate sees MSPWE, MSPAM, and MSPMS. GM and AGM see their own hotel.
   Front desk and other roles do not see this screen.
   Parking capture = (parking revenue / per-car rate) / rooms sold.
   Rooms sold already exclude comp and house use. Implied cars may be fractional.
   Hampton sums PARKING + ADD-ON SELF-PARKING + PARKING-THIRD PARTY OPERATED.
   Golden Valley sums PARKING + PARKING - MANUAL.
   SpringHill uses Daily Parking (PK) net.
   The per-car rate is $15 at Hampton and SpringHill and $10 at Golden Valley,
   and corporate can change it. Golden Valley's parking tile stays hidden while
   hotel_features.parking is off. The rate stays stored.
   Market per occupied room = (front desk + kiosk) / rooms sold.
   The $2 goal is the retail playbook line in retail-market.js.
   Golden Valley's kiosk started 2026-11-02. A missing kiosk from that date on
   flags the combined figure and holds the goal comparison.
   Demo numbers are labeled examples. Live mode reads revenue_daily_facts. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = { MSPWE: "Golden Valley", MSPAM: "Hampton", MSPMS: "SpringHill" };
  var DEFAULT_RATES = { MSPWE: 10, MSPAM: 15, MSPMS: 15 };
  var MARKET_GOAL = 2;
  var KIOSK_HOTEL = "MSPWE";
  var KIOSK_START = "2026-11-02";
  var TZ = "America/Chicago";
  var PERIODS = [
    { id: "today", en: "Today", es: "Hoy" },
    { id: "mtd", en: "Month to date", es: "Mes a la fecha" },
    { id: "month", en: "Monthly", es: "Mensual" }
  ];

  function norm(role) {
    if (root.HHQ && root.HHQ.norm) return root.HHQ.norm(role);
    if (role === "JR Corporate" || role === "corporate" || role === "above_property") return "Above Property";
    if (role === "gm") return "GM";
    if (role === "agm") return "AGM";
    if (role === "front_desk") return "Front Desk";
    return role || "";
  }
  function canSee(role) {
    role = norm(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "capture.see");
    return role === "GM" || role === "AGM" || role === "Above Property";
  }
  function canEdit(role) { return norm(role) === "Above Property"; }
  function hotelsFor(role, hotel) {
    if (!canSee(role)) return [];
    if (norm(role) === "Above Property") return HOTELS.slice();
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
  function todayOf(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    var date = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag.year + "-" + bag.month + "-" + bag.day;
  }
  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }
  function round2(n) {
    var sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(Number(n)) * 100 + 1e-9) / 100;
  }
  function addDays(iso, n) {
    var parts = iso.split("-");
    var dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }
  function monthStart(iso) { return iso.slice(0, 8) + "01"; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function fmtMoney(n) {
    n = num(n);
    if (n == null) return "—";
    var sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(round2(n)).toFixed(2);
  }
  function fmtPct(ratio) {
    ratio = num(ratio);
    if (ratio == null) return "—";
    return (Math.round(ratio * 1000) / 10).toFixed(1) + "%";
  }
  function fmtCars(n) {
    n = num(n);
    if (n == null) return "—";
    var sign = n < 0 ? "-" : "";
    return sign + (Math.round(Math.abs(n) * 10) / 10).toFixed(1);
  }
  function fmtSignedMoney(n) {
    n = num(n);
    if (n == null) return "—";
    if (n > 0) return "+" + fmtMoney(n);
    return fmtMoney(n);
  }
  function monthLabel(ym, lang) {
    var en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var es = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    var names = lang === "es" ? es : en;
    return names[Number(ym.slice(5, 7)) - 1] + " " + ym.slice(0, 4);
  }
  function kioskRequired(hotel, date) {
    return hotel === KIOSK_HOTEL && String(date || "") >= KIOSK_START;
  }
  function sumKnown(values) {
    var any = false;
    var total = 0;
    (values || []).forEach(function (value) {
      var n = num(value);
      if (n == null) return;
      any = true;
      total += n;
    });
    return any ? total : null;
  }
  function parkingRevenue(hotel, row) {
    row = row || {};
    if (hotel === "MSPAM") return sumKnown([row.parking_parking, row.parking_addon_self, row.parking_third_party]);
    if (hotel === "MSPWE") return sumKnown([row.parking_parking, row.parking_manual]);
    if (hotel === "MSPMS") return num(row.parking_daily_pk);
    return null;
  }
  function impliedCars(revenue, rate) {
    revenue = num(revenue);
    rate = num(rate);
    if (revenue == null || rate == null || rate === 0) return null;
    return revenue / rate;
  }
  function captureRate(revenue, rate, rooms) {
    var cars = impliedCars(revenue, rate);
    rooms = num(rooms);
    if (cars == null || rooms == null || rooms === 0) return null;
    return cars / rooms;
  }
  function perRoom(revenue, rooms) {
    revenue = num(revenue);
    rooms = num(rooms);
    if (revenue == null || rooms == null || rooms === 0) return null;
    return revenue / rooms;
  }
  function marketParts(hotel, row) {
    row = row || {};
    var front = num(row.market_front_desk);
    var kiosk = num(row.market_kiosk);
    var frontMissing = front == null;
    var kioskMissing = kiosk == null && kioskRequired(hotel, row.business_date);
    var revenue = null;
    if (front != null || kiosk != null) revenue = (front || 0) + (kiosk || 0);
    return {
      front: front,
      kiosk: kiosk,
      revenue: revenue,
      frontMissing: frontMissing,
      kioskMissing: kioskMissing,
      incomplete: frontMissing || kioskMissing
    };
  }
  function parkingOnOf(view, hotel) {
    if (view && typeof view.parkingOn === "function") return view.parkingOn(hotel) !== false;
    return hotel !== "MSPWE";
  }
  function summarize(rows, hotel, rate, parkingOn) {
    var rooms = 0;
    var parking = 0;
    var parkingSeen = false;
    var front = 0;
    var frontSeen = false;
    var kiosk = 0;
    var kioskSeen = false;
    var kioskMissing = false;
    var frontMissing = false;
    (rows || []).forEach(function (row) {
      rooms += Number(row.rooms_sold) || 0;
      var park = parkingRevenue(hotel, row);
      if (park != null) {
        parking += park;
        parkingSeen = true;
      }
      var parts = marketParts(hotel, row);
      if (parts.front != null) {
        front += parts.front;
        frontSeen = true;
      } else frontMissing = true;
      if (parts.kiosk != null) {
        kiosk += parts.kiosk;
        kioskSeen = true;
      }
      if (parts.kioskMissing) kioskMissing = true;
    });
    var market = (frontSeen || kioskSeen) ? (frontSeen ? front : 0) + (kioskSeen ? kiosk : 0) : null;
    var days = (rows || []).length;
    return {
      hotel: hotel,
      days: days,
      rooms: rooms,
      parking: parkingSeen ? parking : null,
      cars: parkingSeen ? impliedCars(parking, rate) : null,
      capture: parkingOn && parkingSeen ? captureRate(parking, rate, rooms) : null,
      parkingHidden: !parkingOn,
      market: market,
      perRoom: perRoom(market, rooms),
      incomplete: days > 0 && (frontMissing || kioskMissing),
      kioskMissing: kioskMissing,
      frontMissing: frontMissing,
      rate: num(rate)
    };
  }
  function boundsFor(period, today) {
    if (period === "mtd") return { start: monthStart(today), end: today };
    return { start: today, end: today };
  }
  function rowsBetween(rows, hotel, start, end) {
    return (rows || []).filter(function (row) {
      return row.hotel === hotel && row.business_date >= start && row.business_date <= end;
    });
  }
  function periodSummary(model, hotel, period, today, parkingOn) {
    var bounds = boundsFor(period, today);
    var rows = rowsBetween(model && model.rows, hotel, bounds.start, bounds.end);
    return summarize(rows, hotel, model && model.rates ? model.rates[hotel] : null, parkingOn);
  }
  function monthKeys(rows, hotels, today) {
    var seen = {};
    (rows || []).forEach(function (row) {
      if (hotels.indexOf(row.hotel) < 0 || !row.business_date || row.business_date > today) return;
      seen[row.business_date.slice(0, 7)] = true;
    });
    return Object.keys(seen).sort().reverse();
  }
  function monthEnd(ym, today) {
    var start = ym + "-01";
    var parts = start.split("-");
    var dt = new Date(Date.UTC(Number(parts[0]), Number(parts[1]), 0));
    var end = dt.toISOString().slice(0, 10);
    return end > today ? today : end;
  }
  function monthlyRows(model, hotels, today, parkingOn) {
    return monthKeys(model && model.rows, hotels, today).map(function (ym) {
      var end = monthEnd(ym, today);
      return {
        id: ym,
        hotels: hotels.map(function (hotel) {
          var rows = rowsBetween(model.rows, hotel, ym + "-01", end);
          var summary = summarize(rows, hotel, model.rates ? model.rates[hotel] : null, parkingOn(hotel));
          summary.month = ym;
          return summary;
        })
      };
    });
  }
  function hasRows(model, hotels) {
    return (model && model.rows || []).some(function (row) { return hotels.indexOf(row.hotel) >= 0; });
  }
  function parseRate(raw) {
    var text = String(raw == null ? "" : raw).trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
    var n = Number(text);
    if (!isFinite(n) || n <= 0 || n >= 1000) return null;
    return round2(n);
  }
  function setRate(model, hotel, raw, actor) {
    if (!canEdit(actor && actor.role)) return { ok: false, error: "role" };
    if (HOTELS.indexOf(hotel) < 0) return { ok: false, error: "hotel" };
    var rate = parseRate(raw);
    if (rate == null) return { ok: false, error: "rate" };
    var next = JSON.parse(JSON.stringify(model));
    next.rates = next.rates || {};
    next.rates[hotel] = rate;
    return { ok: true, model: next, rate: rate };
  }
  function demoDates(today) {
    var start = monthStart(today);
    var list = [addDays(start, -15), start, addDays(start, 4), today];
    var out = [];
    list.forEach(function (date) {
      if (date && date <= today && out.indexOf(date) < 0) out.push(date);
    });
    return out;
  }
  function demoRooms(hotel, date) {
    var day = Number(date.slice(8, 10));
    if (hotel === "MSPWE") return 42 + (day % 7);
    if (hotel === "MSPAM") return 81 + (day % 7);
    return 72 + (day % 7);
  }
  function demoRow(hotel, date, today) {
    var day = Number(date.slice(8, 10));
    var row = {
      hotel: hotel,
      business_date: date,
      rooms_sold: demoRooms(hotel, date),
      parking_parking: null,
      parking_addon_self: null,
      parking_third_party: null,
      parking_manual: null,
      parking_daily_pk: null,
      market_front_desk: hotel === "MSPWE" ? 12 + day : hotel === "MSPAM" ? 40 + day : 36 + day,
      market_kiosk: null,
      source: "example",
      line_items: []
    };
    if (hotel === "MSPAM") {
      row.parking_parking = 40 + day;
      row.parking_addon_self = 12;
      row.parking_third_party = 7;
    } else if (hotel === "MSPWE") {
      row.parking_parking = 15 + day;
      row.parking_manual = 6;
      if (date >= KIOSK_START && date !== today) row.market_kiosk = 18;
    } else {
      row.parking_daily_pk = 33 + day;
    }
    row.line_items = lineItems(hotel, row);
    return row;
  }
  function lineItems(hotel, row) {
    var items = [{ kind: "rooms", code: "ROOMS_SOLD", label: "Rooms sold excluding comp and house use", count: row.rooms_sold }];
    if (hotel === "MSPAM") {
      items.push({ kind: "parking", code: "PARKING", label: "PARKING", amount: row.parking_parking });
      items.push({ kind: "parking", code: "ADD_ON_SELF_PARKING", label: "ADD-ON SELF-PARKING", amount: row.parking_addon_self });
      items.push({ kind: "parking", code: "PARKING_THIRD_PARTY", label: "PARKING-THIRD PARTY OPERATED", amount: row.parking_third_party });
    } else if (hotel === "MSPWE") {
      items.push({ kind: "parking", code: "PARKING", label: "PARKING", amount: row.parking_parking });
      items.push({ kind: "parking", code: "PARKING_MANUAL", label: "PARKING - MANUAL", amount: row.parking_manual });
    } else {
      items.push({ kind: "parking", code: "DAILY_PARKING_PK", label: "Daily Parking (PK)", amount: row.parking_daily_pk });
    }
    items.push({ kind: "market", code: "MARKET", label: "Market", channel: "front_desk", amount: row.market_front_desk });
    if (row.market_kiosk != null) items.push({ kind: "market", code: "KIOSK", label: "Market kiosk", channel: "kiosk", amount: row.market_kiosk });
    return items;
  }
  function buildDemo(now) {
    var today = todayOf(now || new Date().toISOString());
    var rows = [];
    demoDates(today).forEach(function (date) {
      HOTELS.forEach(function (hotel) { rows.push(demoRow(hotel, date, today)); });
    });
    return { today: today, rates: { MSPWE: DEFAULT_RATES.MSPWE, MSPAM: DEFAULT_RATES.MSPAM, MSPMS: DEFAULT_RATES.MSPMS }, rows: rows, origin: "example" };
  }
  function goalText(summary, lang) {
    if (!summary.days) return tx(lang, "No row for this period.", "No hay fila en este periodo.");
    if (summary.perRoom == null) return tx(lang, "Market sales are not loaded.", "No hay ventas de la tienda.");
    if (summary.incomplete) {
      if (summary.kioskMissing) return tx(lang, "Incomplete. Kiosk sales from Nov 2, 2026 are not loaded, so this is not compared with the $2 goal.", "Incompleto. Faltan las ventas del kiosco desde el 2 de noviembre de 2026, así que no se compara con la meta de $2.");
      return tx(lang, "Incomplete. Front desk market sales are missing, so this is not compared with the $2 goal.", "Incompleto. Faltan las ventas de la tienda en recepción, así que no se compara con la meta de $2.");
    }
    var gap = round2(summary.perRoom - MARKET_GOAL);
    return fmtSignedMoney(gap) + " " + tx(lang, "vs $2 goal", "contra la meta de $2");
  }
  function parkingDetail(summary, lang) {
    if (!summary.days) return tx(lang, "No row for this period.", "No hay fila en este periodo.");
    if (summary.parking == null) return tx(lang, "Parking lines are not loaded.", "No hay líneas de estacionamiento.");
    return fmtCars(summary.cars) + " " + tx(lang, "cars", "autos") + " · " + fmtMoney(summary.parking) + " · " + fmtMoney(summary.rate) + " / " + tx(lang, "car", "auto") + " · " + summary.rooms + " " + tx(lang, "rooms", "cuartos");
  }
  function marketDetail(summary, lang) {
    if (!summary.days || summary.market == null) return "";
    return fmtMoney(summary.market) + " · " + summary.rooms + " " + tx(lang, "rooms", "cuartos");
  }
  function tileParking(summary, lang) {
    if (summary.parkingHidden) return "";
    return "<div class=\"cap-tile\" data-metric=\"parking\" data-hotel=\"" + esc(summary.hotel) + "\"><span class=\"cap-k\">" +
      esc(tx(lang, "Parking capture", "Captura de estacionamiento")) + "</span><b>" + esc(summary.days ? fmtPct(summary.capture) : "—") +
      "</b><small>" + esc(parkingDetail(summary, lang)) + "</small></div>";
  }
  function tileMarket(summary, lang) {
    var flag = summary.incomplete ? "<span class=\"cap-flag\">" + esc(tx(lang, "Incomplete", "Incompleto")) + "</span>" : "";
    var tone = !summary.days || summary.perRoom == null || summary.incomplete ? "" : (summary.perRoom >= MARKET_GOAL ? " cap-met" : " cap-short");
    return "<div class=\"cap-tile" + tone + "\" data-metric=\"market\" data-hotel=\"" + esc(summary.hotel) + "\"" +
      (summary.incomplete ? " data-incomplete=\"1\"" : "") + "><span class=\"cap-k\">" +
      esc(tx(lang, "Market / room", "Tienda / cuarto")) + "</span><b>" + esc(summary.days && summary.perRoom != null ? fmtMoney(summary.perRoom) : "—") +
      "</b>" + flag + "<small>" + esc(goalText(summary, lang)) + (marketDetail(summary, lang) ? " · " + esc(marketDetail(summary, lang)) : "") + "</small></div>";
  }
  function hotelCard(summary, lang) {
    return "<article class=\"cap-hotel\" data-hotel=\"" + esc(summary.hotel) + "\"><h3><b>" + esc(summary.hotel) + "</b> " +
      esc(NAMES[summary.hotel] || "") + "</h3><div class=\"cap-metrics\">" + tileParking(summary, lang) + tileMarket(summary, lang) + "</div></article>";
  }
  function parkingCell(summary, lang) {
    if (summary.parkingHidden) return "<td data-metric=\"parking\" data-hotel=\"" + esc(summary.hotel) + "\" data-hidden=\"1\">" + esc(tx(lang, "Off", "Apagado")) + "</td>";
    if (!summary.days || summary.capture == null) return "<td data-metric=\"parking\" data-hotel=\"" + esc(summary.hotel) + "\">—</td>";
    return "<td data-metric=\"parking\" data-hotel=\"" + esc(summary.hotel) + "\"><b>" + esc(fmtPct(summary.capture)) + "</b><small>" + esc(fmtCars(summary.cars)) + " " + esc(tx(lang, "cars", "autos")) + "</small></td>";
  }
  function marketCell(summary, lang) {
    var flag = summary.incomplete ? " data-incomplete=\"1\"" : "";
    var text = !summary.days || summary.perRoom == null ? "—" : fmtMoney(summary.perRoom);
    var note = summary.days ? goalText(summary, lang) : "";
    return "<td data-metric=\"market\" data-hotel=\"" + esc(summary.hotel) + "\"" + flag + "><b>" + esc(text) + "</b>" + (note ? "<small>" + esc(note) + "</small>" : "") + "</td>";
  }
  function monthTable(block, lang, many) {
    var head = "<tr><th>" + esc(tx(lang, "Hotel", "Hotel")) + "</th><th>" + esc(tx(lang, "Rooms sold", "Cuartos vendidos")) + "</th><th>" +
      esc(tx(lang, "Parking capture", "Captura de estacionamiento")) + "</th><th>" + esc(tx(lang, "Market / room", "Tienda / cuarto")) + "</th></tr>";
    var body = block.hotels.map(function (summary) {
      var rooms = summary.days ? String(summary.rooms) : "—";
      return "<tr data-hotel=\"" + esc(summary.hotel) + "\" data-month=\"" + esc(block.id) + "\"><th scope=\"row\">" + esc(summary.hotel) + " " +
        esc(NAMES[summary.hotel] || "") + "</th><td>" + esc(rooms) + "</td>" + parkingCell(summary, lang) + marketCell(summary, lang) + "</tr>";
    }).join("");
    var title = many ? tx(lang, "Monthly comparison", "Comparación mensual") : tx(lang, "Monthly", "Mensual");
    return "<section class=\"cap-month-block\" data-month=\"" + esc(block.id) + "\"><h3>" + esc(title) + " · " + esc(monthLabel(block.id, lang)) +
      "</h3><div class=\"cap-scroll\"><table class=\"cap-table\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table></div></section>";
  }
  function rateBlock(model, actor, hotels, view) {
    var lang = view.lang === "es" ? "es" : "en";
    var edit = canEdit(actor && actor.role);
    var rows = hotels.map(function (hotel) {
      var rate = model.rates ? model.rates[hotel] : null;
      var hidden = !parkingOnOf(view, hotel);
      var control = edit
        ? "<input id=\"capRate-" + hotel + "\" inputmode=\"decimal\" aria-label=\"" + esc(hotel + " " + tx(lang, "per car", "por auto")) + "\" value=\"" + esc(rate == null ? "" : Number(rate).toFixed(2)) + "\">" +
          "<button type=\"button\" class=\"btn\" onclick=\"capSave('" + hotel + "')\">" + esc(tx(lang, "Save", "Guardar")) + "</button>"
        : "<b>" + esc(rate == null ? "—" : fmtMoney(rate)) + "</b>";
      var note = hidden ? "<small>" + esc(tx(lang, "Parking tile is hidden while parking is off. The rate stays saved.", "La ficha de estacionamiento está oculta mientras el módulo está apagado. La tarifa sigue guardada.")) + "</small>" : "";
      var err = view.error === hotel + ":rate" ? "<small class=\"cap-err\">" + esc(tx(lang, "Enter a rate above 0, up to two decimals.", "Escribe una tarifa mayor que 0, con hasta dos decimales.")) + "</small>" : "";
      var saveErr = view.error === hotel + ":save" ? "<small class=\"cap-err\">" + esc(tx(lang, "The rate was not saved.", "No se guardó la tarifa.")) + "</small>" : "";
      return "<div class=\"cap-rate\" data-rate-hotel=\"" + esc(hotel) + "\"><span><b>" + esc(hotel) + "</b> " + esc(NAMES[hotel] || "") + "</span>" + control + note + err + saveErr + "</div>";
    }).join("");
    return "<section class=\"cap-rates\" data-rates=\"1\"><h3>" + esc(tx(lang, "Per-car parking rate", "Tarifa de estacionamiento por auto")) + "</h3><p class=\"cap-note\">" +
      esc(tx(lang, "Corporate sets this. Capture divides parking revenue by the rate.", "Corporativo define esto. La captura divide el ingreso de estacionamiento entre la tarifa.")) + "</p>" + rows + "</section>";
  }
  function pageHtml(model, actor, view) {
    view = view || {};
    actor = actor || {};
    var lang = view.lang === "es" ? "es" : "en";
    var hotels = hotelsFor(actor.role, actor.hotel);
    if (!hotels.length) return "";
    model = model || { rows: [], rates: {}, origin: "live", today: view.today || "" };
    var today = model.today || view.today || "";
    var period = view.period === "mtd" || view.period === "month" ? view.period : "today";
    var parkingOn = function (hotel) { return parkingOnOf(view, hotel); };
    var example = model.origin === "example";
    var banner = example
      ? "<p class=\"cap-note\"><span class=\"ex\">EXAMPLE</span> " + esc(tx(lang, "Sample figures for this demo. Not a live night audit.", "Cifras de ejemplo para esta demostración. No es una auditoría en vivo.")) + "</p>"
      : "";
    var chips = "<div class=\"cap-chips\">" + PERIODS.map(function (item) {
      return "<button type=\"button\" class=\"" + (item.id === period ? "on" : "") + "\" aria-pressed=\"" + (item.id === period ? "true" : "false") + "\" onclick=\"capView('" + item.id + "')\">" + esc(tx(lang, item.en, item.es)) + "</button>";
    }).join("") + "</div>";
    var note = "<p class=\"cap-note\">" + esc(tx(lang, "Business date", "Fecha de negocio")) + " " + esc(today) + ". " +
      esc(tx(lang, "Rooms sold exclude comp and house use. Parking capture is implied cars divided by rooms sold.", "Los cuartos vendidos excluyen cortesía y uso de la casa. La captura es autos implícitos divididos entre cuartos vendidos.")) + "</p>";
    var body = "";
    if (!hasRows(model, hotels)) {
      body = "<div class=\"cap-empty\" data-empty=\"1\"><p>" + esc(tx(lang, "No daily rows yet. Figures appear after the night-audit load.", "Aún no hay filas diarias. Las cifras aparecen después de la carga de la auditoría.")) + "</p></div>";
    } else if (period === "month") {
      body = monthlyRows(model, hotels, today, parkingOn).map(function (block) { return monthTable(block, lang, hotels.length > 1); }).join("");
    } else {
      body = "<div class=\"cap-tiles\">" + hotels.map(function (hotel) {
        return hotelCard(periodSummary(model, hotel, period, today, parkingOn(hotel)), lang);
      }).join("") + "</div>";
    }
    return "<section class=\"cap\" id=\"capRoot\" data-capture=\"1\" data-period=\"" + period + "\"" + (example ? " data-example=\"1\"" : "") + "><h2>" +
      esc(tx(lang, "Parking and market", "Estacionamiento y tienda")) + "</h2>" + banner + chips + note + body + rateBlock(model, actor, hotels, view) + "</section>";
  }
  function homeCard(model, actor, lang, view) {
    var hotels = hotelsFor(actor && actor.role, actor && actor.hotel);
    if (!hotels.length) return "";
    view = view || {};
    lang = lang === "es" ? "es" : "en";
    var today = model && model.today || "";
    var parkingOn = function (hotel) { return parkingOnOf(view, hotel); };
    var example = model && model.origin === "example";
    var banner = example ? "<p class=\"cap-note\"><span class=\"ex\">EXAMPLE</span> " + esc(tx(lang, "Sample figures for this demo. Not a live night audit.", "Cifras de ejemplo para esta demostración. No es una auditoría en vivo.")) + "</p>" : "";
    var lines = "";
    if (!hasRows(model, hotels)) {
      lines = "<p class=\"cap-note\" data-empty=\"1\">" + esc(tx(lang, "No daily rows yet.", "Aún no hay filas diarias.")) + "</p>";
    } else {
      lines = "<ul class=\"cap-home-list\">" + hotels.map(function (hotel) {
        var summary = periodSummary(model, hotel, "today", today, parkingOn(hotel));
        var park = summary.parkingHidden ? "" : " · " + esc(tx(lang, "Parking", "Estacionamiento")) + " " + esc(summary.days ? fmtPct(summary.capture) : "—");
        var market = esc(tx(lang, "Market", "Tienda")) + " " + esc(summary.days && summary.perRoom != null ? fmtMoney(summary.perRoom) : "—");
        var flag = summary.incomplete ? " · " + esc(tx(lang, "Incomplete", "Incompleto")) : "";
        return "<li data-hotel=\"" + esc(hotel) + "\"><b>" + esc(hotel) + "</b> " + market + park + flag + "</li>";
      }).join("") + "</ul>";
    }
    return "<section class=\"cap-home\" id=\"capHome\"><h3>" + esc(tx(lang, "Parking and market", "Estacionamiento y tienda")) + "</h3>" + banner + lines +
      "<button type=\"button\" class=\"btn cap-wide\" onclick=\"capOpen()\">" + esc(tx(lang, "Open parking and market", "Abrir estacionamiento y tienda")) + "</button></section>";
  }

  var api = {
    HOTELS: HOTELS, NAMES: NAMES, DEFAULT_RATES: DEFAULT_RATES, MARKET_GOAL: MARKET_GOAL,
    KIOSK_HOTEL: KIOSK_HOTEL, KIOSK_START: KIOSK_START, PERIODS: PERIODS,
    norm: norm, canSee: canSee, canEdit: canEdit, hotelsFor: hotelsFor, demoUi: demoUi, todayOf: todayOf,
    parkingRevenue: parkingRevenue, impliedCars: impliedCars, captureRate: captureRate, perRoom: perRoom,
    marketParts: marketParts, summarize: summarize, periodSummary: periodSummary, monthlyRows: monthlyRows,
    parseRate: parseRate, setRate: setRate, buildDemo: buildDemo, lineItems: lineItems,
    fmtMoney: fmtMoney, fmtPct: fmtPct, fmtCars: fmtCars, goalText: goalText,
    pageHtml: pageHtml, homeCard: homeCard
  };
  root.RevenueCapture = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var liveState = "";
  var liveModel = null;
  var rateOverride = null;

  function langNow() { try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; } }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return me ? { role: me.role, hotel: me.hotel || "", name: me.name || "" } : { role: "", hotel: "", name: "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function parkingOn(hotel) {
    try { if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "parking") !== false; } catch (e) {}
    return hotel !== "MSPWE";
  }
  function pageState() {
    var period = "today";
    var error = "";
    try {
      if (S.capView === "mtd" || S.capView === "month") period = S.capView;
      error = S.capErr || "";
    } catch (e) {}
    return { period: period, lang: langNow(), parkingOn: parkingOn, error: error, today: todayOf(new Date().toISOString()) };
  }
  function bundle() {
    var model = buildDemo(new Date().toISOString());
    if (rateOverride) {
      HOTELS.forEach(function (hotel) {
        if (rateOverride[hotel] != null) model.rates[hotel] = rateOverride[hotel];
      });
    }
    return model;
  }
  function asDate(value) {
    var text = String(value || "");
    return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
  }
  function mapFact(row) {
    return {
      hotel: row.hotel,
      business_date: asDate(row.business_date),
      rooms_sold: Number(row.rooms_sold) || 0,
      parking_parking: num(row.parking_parking),
      parking_addon_self: num(row.parking_addon_self),
      parking_third_party: num(row.parking_third_party),
      parking_manual: num(row.parking_manual),
      parking_daily_pk: num(row.parking_daily_pk),
      market_front_desk: num(row.market_front_desk),
      market_kiosk: num(row.market_kiosk),
      source: row.source || "",
      line_items: []
    };
  }
  function emptyLive(today) {
    return { today: today, rates: {}, rows: [], origin: "live" };
  }
  function ensureLive() {
    if (demoUi()) return;
    if (liveState === "loading" || liveState === "ready" || liveState === "empty" || liveState === "error") return;
    var today = todayOf(new Date().toISOString());
    if (typeof useRemote !== "function" || !useRemote() || typeof sb === "undefined" || !sb) {
      liveState = "empty";
      liveModel = emptyLive(today);
      return;
    }
    liveState = "loading";
    liveModel = emptyLive(today);
    var actor = actorNow();
    var hotels = hotelsFor(actor.role, actor.hotel);
    var from = addDays(monthStart(today), -400);
    var facts = sb.from("revenue_daily_facts").select("hotel,business_date,rooms_sold,parking_parking,parking_addon_self,parking_third_party,parking_manual,parking_daily_pk,market_front_desk,market_kiosk,source").gte("business_date", from).lte("business_date", today).order("business_date", { ascending: true }).limit(1500);
    var rates = sb.from("parking_car_rates").select("hotel,per_car_rate");
    if (hotels.length === 1) {
      facts = facts.eq("hotel", hotels[0]);
      rates = rates.eq("hotel", hotels[0]);
    }
    Promise.all([facts, rates]).then(function (parts) {
      var factRes = parts[0] || {};
      var rateRes = parts[1] || {};
      if (factRes.error && rateRes.error) {
        liveState = "error";
        liveModel = emptyLive(today);
      } else {
        var rows = factRes.error ? [] : (factRes.data || []).map(mapFact).filter(function (row) {
          return hotels.indexOf(row.hotel) >= 0 && row.business_date;
        });
        var bag = {};
        if (!rateRes.error) (rateRes.data || []).forEach(function (row) {
          if (hotels.indexOf(row.hotel) >= 0) bag[row.hotel] = num(row.per_car_rate);
        });
        liveModel = { today: today, rates: bag, rows: rows, origin: "live" };
        liveState = rows.length ? "ready" : "empty";
      }
      try { render(); } catch (e) {}
    }, function () {
      liveState = "error";
      liveModel = emptyLive(today);
      try { render(); } catch (e2) {}
    });
  }
  function livePage(actor, view) {
    ensureLive();
    var lang = view.lang;
    if (liveState === "loading" || liveState === "") {
      return "<section class=\"cap\" id=\"capRoot\"><h2>" + esc(tx(lang, "Parking and market", "Estacionamiento y tienda")) + "</h2><p class=\"cap-note\">" +
        esc(tx(lang, "Loading daily rows.", "Cargando filas diarias.")) + "</p></section>";
    }
    var html = pageHtml(liveModel || emptyLive(view.today), actor, view);
    if (liveState === "error") {
      html = html.replace("</h2>", "</h2><p class=\"cap-note\">" + esc(tx(lang, "Couldn't load the daily rows.", "No se pudieron cargar las filas diarias.")) + "</p>");
    }
    return html;
  }
  function bootPage() {
    var actor = actorNow();
    if (!canSee(actor.role)) return "<div class=\"cap\" id=\"capRoot\" hidden></div>";
    var view = pageState();
    if (!demoUi()) return livePage(actor, view);
    return pageHtml(bundle(), actor, view);
  }
  function homeHtml() {
    var actor = actorNow();
    if (!canSee(actor.role)) return "";
    var view = { lang: langNow(), parkingOn: parkingOn };
    if (!demoUi()) {
      ensureLive();
      if (liveState === "loading" || liveState === "") {
        return "<section class=\"cap-home\" id=\"capHome\"><h3>" + esc(tx(view.lang, "Parking and market", "Estacionamiento y tienda")) + "</h3><p class=\"cap-note\">" +
          esc(tx(view.lang, "Loading daily rows.", "Cargando filas diarias.")) + "</p></section>";
      }
      return homeCard(liveModel || emptyLive(todayOf(new Date().toISOString())), actor, view.lang, view);
    }
    return homeCard(bundle(), actor, view.lang, view);
  }
  api.homeHtml = homeHtml;

  root.capOpen = function () {
    if (!canSee(actorNow().role)) return;
    if (typeof go === "function") go("capture");
  };
  root.capView = function (period) {
    if (period !== "today" && period !== "mtd" && period !== "month") return;
    if (!canSee(actorNow().role)) return;
    try { S.capView = period; S.capErr = ""; if (typeof save === "function") save(); } catch (e) {}
    if (typeof render === "function") render();
  };
  root.capSave = function (hotel) {
    if (HOTELS.indexOf(hotel) < 0 || !canEdit(actorNow().role)) return;
    var el = document.getElementById("capRate-" + hotel);
    var raw = el ? el.value : "";
    var actor = actorNow();
    var model = demoUi() ? bundle() : (liveModel || emptyLive(todayOf(new Date().toISOString())));
    var result = setRate(model, hotel, raw, actor);
    if (!result.ok) {
      try { S.capErr = hotel + ":" + result.error; } catch (e) {}
      if (typeof render === "function") render();
      return;
    }
    if (demoUi()) {
      rateOverride = rateOverride || {};
      rateOverride[hotel] = result.rate;
      try { S.capErr = ""; } catch (e2) {}
      if (typeof render === "function") render();
      return;
    }
    if (typeof sb === "undefined" || !sb) return;
    sb.from("parking_car_rates").update({ per_car_rate: result.rate }).eq("hotel", hotel).select("hotel,per_car_rate").then(function (res) {
      if (!res || res.error || !res.data || !res.data.length) {
        try { S.capErr = hotel + ":save"; } catch (e3) {}
      } else {
        liveModel = liveModel || emptyLive(todayOf(new Date().toISOString()));
        liveModel.rates[hotel] = num(res.data[0].per_car_rate);
        try { S.capErr = ""; } catch (e4) {}
      }
      if (typeof render === "function") render();
    });
  };

  if (typeof M !== "undefined") M.capture = ["🅿️", "Capture"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Capture = "Captura";
  if (typeof V !== "undefined") V.capture = bootPage;
  function showCapture() { return canSee(actorNow().role); }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      if (showCapture() && list.indexOf("capture") < 0) list.splice(Math.min(1, list.length), 0, "capture");
      if (!showCapture()) list = list.filter(function (id) { return id !== "capture"; });
      return list;
    };
  }
  if (typeof navFor === "function") {
    var prevNav = navFor;
    root.navFor = function (role) {
      var list = (prevNav(role) || []).slice();
      if (showCapture() && list.indexOf("capture") < 0) {
        var at = list.indexOf("home");
        list.splice(at >= 0 ? at + 1 : 0, 0, "capture");
      }
      if (!showCapture()) list = list.filter(function (id) { return id !== "capture"; });
      return list;
    };
  }
  try {
    if (typeof RSEC !== "undefined" && RSEC[0] && RSEC[0][2].indexOf("capture") < 0) {
      var atHome = RSEC[0][2].indexOf("home");
      RSEC[0][2].splice(atHome >= 0 ? atHome + 1 : 0, 0, "capture");
    }
  } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("capture") < 0) NOCOLS.push("capture"); } catch (e2) {}

  var style = document.createElement("style");
  style.textContent = [
    ".cap,.cap-home{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}",
    ".cap h2,.cap h3,.cap-home h3{margin:0}",
    ".cap-note{margin:0;color:#3c4658;font-size:13px;font-weight:650}",
    ".cap-chips{display:flex;gap:6px;flex-wrap:wrap}",
    ".cap-chips button{border:1px solid #c9d2e0;background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-weight:700;min-height:40px;color:#1f2a44}",
    ".cap-chips button.on{background:#1f2a44;color:#fff;border-color:#1f2a44}",
    ".cap-tiles{display:grid;grid-template-columns:1fr;gap:8px}",
    ".cap-hotel,.cap-rates,.cap-empty{background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px}",
    ".cap-metrics{display:flex;flex-direction:column;gap:8px}",
    ".cap-tile{background:#f6f8fb;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:2px}",
    ".cap-tile b{font-size:28px;line-height:1.1;font-variant-numeric:tabular-nums}",
    ".cap-k{font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#55606f}",
    ".cap-tile small,.cap-table small,.cap-rate small{display:block;color:#3c4658;font-size:12px;font-weight:650}",
    ".cap-flag{display:inline-block;align-self:flex-start;background:#fff4e5;color:#9a3412;font-weight:800;font-size:12px;border-radius:999px;padding:2px 8px}",
    ".cap-met{background:#e7f6ec}",
    ".cap-short{background:#fff8f1}",
    ".cap-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}",
    ".cap-table{width:100%;border-collapse:collapse;min-width:640px;font-variant-numeric:tabular-nums}",
    ".cap-table th,.cap-table td{padding:8px 6px;border-bottom:1px solid #e6ebf2;text-align:right;font-size:14px;vertical-align:top}",
    ".cap-table thead th{font-size:12px;letter-spacing:.03em;text-transform:uppercase;color:#55606f}",
    ".cap-table tbody th,.cap-table thead th:first-child{text-align:left}",
    ".cap-rate{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid #eef1f5}",
    ".cap-rate input{height:40px;width:110px;font:inherit;border:1px solid #c9d2e0;border-radius:8px;padding:0 8px}",
    ".cap-err{color:#9a3412}",
    ".cap-home-list{margin:0;padding-left:18px}",
    ".cap-wide{align-self:flex-start}",
    ".cap-month-block{display:flex;flex-direction:column;gap:6px}",
    "@media(min-width:768px){.cap-tiles{grid-template-columns:repeat(3,1fr)}.cap-hotel .cap-tile b{font-size:32px}}"
  ].join("");
  document.head.appendChild(style);
  try { if (typeof meUser === "function" && meUser() && typeof render === "function") render(); } catch (e3) {}
})(typeof window !== "undefined" ? window : globalThis);
