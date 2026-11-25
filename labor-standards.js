/* Labor standards, one hotel at a time, in the Hotel Effectiveness shape.
   Corporate edits. GM, AGM, and the housekeeping lead only read their own hotel.
   A position can have several standards active on the same day (fixed plus variable,
   separate tiers, or room-type minutes with their own dates). Those add together.
   No pay rates. History stays; the screen shows what is active on the chosen date. */
(function (root) {
  "use strict";

  function pos(id, en, es) { return { id: id, en: en, es: es }; }
  var P = {
    gm: pos("gm", "GM", "Gerente general"),
    agm: pos("agm", "AGM", "Gerente asistente"),
    maint_eng: pos("maint_eng", "Maintenance Engineer", "Ingeniero de mantenimiento"),
    fd_mgr: pos("fd_mgr", "Front Desk Manager", "Gerente de recepción"),
    fd_sup: pos("fd_sup", "Front Desk Supervisor", "Supervisor de recepción"),
    fd_agent: pos("fd_agent", "Front Desk Agent", "Agente de recepción"),
    fd_clerk: pos("fd_clerk", "Front Desk Clerk", "Recepcionista"),
    gsr: pos("gsr", "Guest Service Representative", "Representante de servicio al huésped"),
    night_auditor: pos("night_auditor", "Night Auditor", "Auditor nocturno"),
    driver: pos("driver", "Driver", "Chofer"),
    breakfast: pos("breakfast", "Breakfast Attendant", "Desayuno"),
    train_bfast: pos("train_bfast", "Training Breakfast Attendant", "Desayuno en entrenamiento"),
    train_fd: pos("train_fd", "Training Front Desk", "Recepción en entrenamiento"),
    bartender: pos("bartender", "Bartender", "Bartender"),
    exec_hk: pos("exec_hk", "Executive Housekeeper", "Ama de llaves ejecutiva"),
    hskp_sup_am: pos("hskp_sup", "HSKP Supervisor", "Supervisor de housekeeping"),
    hskp_sup: pos("hskp_sup", "Hskp Supervisor", "Supervisor de housekeeping"),
    room_att: pos("room_att", "Room Attendant", "Camarista"),
    houseperson: pos("houseperson", "Houseperson", "Houseperson"),
    hskp_houseman: pos("hskp_houseman", "Hskp Houseman", "Houseman de housekeeping"),
    laundry: pos("laundry", "Laundry Attendant", "Lavandería"),
    deep_clean: pos("deep_clean", "Deep Cleaning Attendant", "Limpieza profunda"),
    hk_train: pos("hk_train", "Housekeeping Training", "Housekeeping en entrenamiento")
  };
  function dept(id, en, es, positions) { return { id: id, en: en, es: es, positions: positions }; }
  var MGMT = dept("ag_mgmt", "A&G/Management", "A&G/Gerencia", [P.gm, P.agm]);
  var MAINT = dept("ag_maint", "A&G/Prop Ops & Maint", "A&G/Operaciones y mantenimiento", [P.maint_eng]);
  var HK_TAIL = [P.room_att, P.laundry, P.deep_clean, P.hk_train];
  var CATALOG = {
    MSPAM: [
      MGMT,
      MAINT,
      dept("rooms_gs", "Rooms/Guest Services", "Habitaciones/Servicio al huésped", [P.fd_mgr, P.fd_sup, P.fd_agent, P.night_auditor, P.driver, P.breakfast, P.train_bfast, P.train_fd]),
      dept("rooms_hk", "Rooms/Housekeeping", "Habitaciones/Housekeeping", [P.exec_hk, P.hskp_sup_am, P.houseperson].concat(HK_TAIL))
    ],
    MSPWE: [
      MGMT,
      MAINT,
      dept("rooms_gs", "Rooms/Guest Services", "Habitaciones/Servicio al huésped", [P.fd_mgr, P.fd_clerk, P.driver, P.breakfast, P.train_bfast, P.train_fd]),
      dept("rooms_hk", "Rooms/Housekeeping", "Habitaciones/Housekeeping", [P.hskp_sup, P.hskp_houseman].concat(HK_TAIL))
    ],
    MSPMS: [
      MGMT,
      MAINT,
      dept("fb", "F&B", "Alimentos y bebidas", [P.bartender]),
      dept("rooms_gs", "Rooms/Guest Services", "Habitaciones/Servicio al huésped", [P.fd_mgr, P.fd_sup, P.gsr, P.night_auditor, P.driver, P.breakfast, P.train_bfast, P.train_fd]),
      dept("rooms_hk", "Rooms/Housekeeping", "Habitaciones/Housekeeping", [P.exec_hk, P.hskp_sup, P.hskp_houseman].concat(HK_TAIL))
    ]
  };

  function planPositionId(hotel, planPosition) {
    if (planPosition === "Front Desk") return hotel === "MSPWE" ? "fd_clerk" : hotel === "MSPMS" ? "gsr" : "fd_agent";
    if (planPosition === "House Person") return hotel === "MSPAM" ? "houseperson" : "hskp_houseman";
    /* MSPWE has no Executive Housekeeper job. The HotelHQ housekeeping lead there
       keeps that role's access and is measured on the Hskp Supervisor standard. */
    if (planPosition === "HK Lead") return hotel === "MSPWE" ? "hskp_sup" : "exec_hk";
    var shared = { Housekeeper: "room_att", Maintenance: "maint_eng", "Laundry Attendant": "laundry", "Breakfast Attendant": "breakfast" };
    return shared[planPosition] || null;
  }
  function fteDay(weekly) {
    return Math.round((Number(weekly) / 7) * 100) / 100;
  }
  function prevDay(iso) {
    var parts = String(iso || "").split("-");
    var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    d.setUTCDate(d.getUTCDate() - 1);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }
  function row(hotel, position, start, body, slot) {
    var rec = { id: "seed-" + hotel + "-" + position + "-" + (slot || body.kind) + "-" + start, hotel: hotel, position: position, start: start, end: null };
    Object.keys(body).forEach(function (key) { rec[key] = body[key]; });
    return rec;
  }
  function seed(hotel) {
    var day = "2026-01-01";
    if (hotel === "MSPAM") {
      return [
        row(hotel, "agm", day, { kind: "fixed_fte", fte: 1, weeklyHours: 40, hoursPerDay: fteDay(40) }),
        row(hotel, "maint_eng", day, { kind: "fixed", hoursPerDay: 5.71 }),
        row(hotel, "breakfast", day, { kind: "tiered", basis: "prev", tiers: [{ from: 0, to: 100, hours: 6 }, { from: 100, to: 147, hours: 9 }] }),
        row(hotel, "driver", day, { kind: "fixed", hoursPerDay: 16 }),
        row(hotel, "fd_agent", day, { kind: "tiered", basis: "same", tiers: [{ from: 0, to: 70, hours: 16 }, { from: 70, to: 125, hours: 20 }, { from: 125, to: 147, hours: 24 }] }),
        row(hotel, "exec_hk", "2026-02-23", { kind: "fixed_fte", fte: 1, weeklyHours: 40, hoursPerDay: fteDay(40) }),
        row(hotel, "houseperson", day, { kind: "fixed", hoursPerDay: 10 }),
        row(hotel, "hskp_sup", day, { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: 147, bandFrom: 30 }),
        row(hotel, "laundry", day, { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: null }),
        row(hotel, "room_att", day, { kind: "per_room", minutes: { checkout: 30, deep: 45, stayover: 15, suite: 36 } })
      ];
    }
    if (hotel === "MSPWE") {
      return [
        row(hotel, "agm", "2025-05-24", { kind: "fixed_fte", fte: 1, weeklyHours: 40, hoursPerDay: fteDay(40) }),
        row(hotel, "maint_eng", "2025-05-08", { kind: "fixed", hoursPerDay: 0 }),
        row(hotel, "breakfast", "2025-05-08", { kind: "tiered", basis: "prev", tiers: [{ from: 1, to: 90, hours: 5.5 }] }, "1-90"),
        row(hotel, "breakfast", "2026-01-01", { kind: "tiered", basis: "prev", tiers: [{ from: 91, to: 118, hours: 8.5 }] }, "91-118"),
        row(hotel, "fd_clerk", "2025-05-24", { kind: "tiered", basis: "same", tiers: [{ from: 1, to: 90, hours: 18.28 }] }, "1-90"),
        row(hotel, "fd_clerk", "2026-01-01", { kind: "tiered", basis: "same", tiers: [{ from: 91, to: 118, hours: 22.28 }] }, "91-118"),
        row(hotel, "hskp_houseman", "2025-06-01", { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: null }),
        row(hotel, "hskp_sup", "2026-01-01", { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: null }),
        row(hotel, "laundry", "2025-05-08", { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: null }),
        row(hotel, "room_att", "2025-05-08", { kind: "per_room", minutes: { checkout: 30 } }, "checkout"),
        row(hotel, "room_att", "2025-05-08", { kind: "per_room", minutes: { deep: 45 } }, "deep"),
        row(hotel, "room_att", "2025-05-08", { kind: "per_room", minutes: { stayover: 15 } }, "stayover"),
        row(hotel, "room_att", "2025-01-01", { kind: "per_room", minutes: { suite: 35 } }, "suite")
      ];
    }
    if (hotel === "MSPMS") {
      return [
        row(hotel, "agm", day, { kind: "fixed_fte", fte: 1, weeklyHours: 40, hoursPerDay: fteDay(40) }),
        row(hotel, "maint_eng", "2026-09-01", { kind: "fixed", hoursPerDay: 9.14 }),
        row(hotel, "bartender", day, { kind: "fixed", hoursPerDay: 5.5 }),
        row(hotel, "breakfast", "2026-02-23", { kind: "tiered", basis: "prev", tiers: [{ from: 0, to: 85, hours: 5 }] }, "0-85"),
        row(hotel, "breakfast", day, { kind: "tiered", basis: "prev", tiers: [{ from: 85, to: 114, hours: 9 }] }, "85-114"),
        row(hotel, "driver", day, { kind: "fixed", hoursPerDay: 8 }),
        row(hotel, "gsr", day, { kind: "tiered", basis: "same", tiers: [{ from: 0, to: 85, hours: 10.29 }, { from: 85, to: 114, hours: 16 }] }),
        row(hotel, "night_auditor", day, { kind: "fixed", hoursPerDay: 8 }),
        row(hotel, "exec_hk", "2026-02-23", { kind: "fixed", hoursPerDay: 0 }),
        row(hotel, "hskp_houseman", "2026-02-23", { kind: "per_sold", basis: "same", minutes: 5, from: 0, to: null }),
        row(hotel, "hskp_sup", "2026-02-23", { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: 114, bandFrom: 30 }),
        row(hotel, "laundry", "2026-02-23", { kind: "per_sold", basis: "prev", minutes: 5, from: 0, to: null }),
        row(hotel, "room_att", "2026-02-23", { kind: "per_room", minutes: { checkout: 35, deep: 45, stayover: 15, suite: 40 } })
      ];
    }
    return [];
  }
  function deptsFor(hotel) { return CATALOG[hotel] || []; }
  function positions(hotel) {
    var list = [];
    deptsFor(hotel).forEach(function (dept) {
      dept.positions.forEach(function (item) { list.push(item); });
    });
    return list;
  }
  function access(role) {
    var edit = role === "Above Property";
    var view = edit || role === "GM" || role === "AGM" || role === "Housekeeping";
    return { edit: edit, view: view };
  }
  function activeRows(rows, position, asOf) {
    var day = String(asOf || "");
    return (rows || []).filter(function (row) {
      return row && row.position === position && row.start && row.start <= day && (!row.end || row.end >= day);
    }).sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  }
  function missing(rows, asOf, hotel) {
    return positions(hotel).filter(function (item) { return !activeRows(rows, item.id, asOf).length; });
  }
  function tierHours(tiers, rooms) {
    var n = Number(rooms);
    if (!isFinite(n) || !tiers || !tiers.length) return null;
    function rank(a, b) {
      var from = Number(b.from) - Number(a.from);
      if (from) return from;
      var as = String(a.start || ""), bs = String(b.start || "");
      if (as === bs) return 0;
      return as < bs ? 1 : -1;
    }
    var matches = tiers.filter(function (tier) {
      var from = Number(tier.from);
      var to = tier.to == null || tier.to === "" ? null : Number(tier.to);
      return n >= from && (to == null || n <= to);
    });
    if (matches.length) {
      matches.sort(rank);
      return Number(matches[0].hours);
    }
    var minFrom = Infinity;
    var capped = [];
    tiers.forEach(function (tier) {
      var from = Number(tier.from);
      if (from < minFrom) minFrom = from;
      if (tier.to != null && tier.to !== "" && n > Number(tier.to)) capped.push(tier);
    });
    if (n < minFrom) return 0;
    if (!capped.length) return null;
    capped.sort(function (a, b) {
      var to = Number(b.to) - Number(a.to);
      return to || rank(a, b);
    });
    return Number(capped[0].hours);
  }
  function planHours(row, ctx) {
    if (!row) return null;
    ctx = ctx || {};
    if (row.kind === "fixed" || row.kind === "fixed_fte") {
      var hours = Number(row.hoursPerDay);
      return isFinite(hours) ? hours : null;
    }
    if (row.kind === "tiered") {
      var sold = row.basis === "prev" ? ctx.roomsSoldPrev : ctx.roomsSold;
      var tiers = (row.tiers || []).map(function (tier) {
        return { from: tier.from, to: tier.to, hours: tier.hours, start: row.start };
      });
      return tierHours(tiers, sold);
    }
    if (row.kind === "per_sold") {
      var count = row.basis === "same" ? ctx.roomsSold : ctx.roomsSoldPrev;
      if (count == null || !isFinite(Number(count))) return null;
      var rooms = Number(count);
      if (row.bandFrom != null && rooms < Number(row.bandFrom)) return 0;
      var startAt = row.from == null || row.from === "" ? 0 : Number(row.from);
      var to = row.to == null || row.to === "" ? null : Number(row.to);
      if (to != null && rooms > to) rooms = to;
      var counted = rooms - startAt;
      if (counted < 0) counted = 0;
      return counted * Number(row.minutes) / 60;
    }
    if (row.kind === "per_room") {
      var mins = row.minutes || {};
      var total = (Number(ctx.checkout) || 0) * (Number(mins.checkout) || 0) +
        (Number(ctx.stayover) || 0) * (Number(mins.stayover) || 0) +
        (Number(ctx.deep) || 0) * (Number(mins.deep) || 0) +
        (Number(ctx.suite) || 0) * (Number(mins.suite) || 0);
      return total / 60;
    }
    return null;
  }
  function mergedMinutes(live) {
    var keys = ["checkout", "stayover", "deep", "suite"];
    var out = { checkout: null, stayover: null, deep: null, suite: null };
    var any = false;
    keys.forEach(function (key) {
      var hits = (live || []).filter(function (row) {
        return row && row.kind === "per_room" && row.minutes && row.minutes[key] != null && row.minutes[key] !== "";
      });
      hits.sort(function (a, b) { return a.start < b.start ? 1 : a.start > b.start ? -1 : 0; });
      if (!hits.length) return;
      var n = Number(hits[0].minutes[key]);
      out[key] = isFinite(n) ? n : null;
      if (out[key] != null) any = true;
    });
    return any ? out : null;
  }
  function hoursFor(rows, position, asOf, ctx) {
    var live = activeRows(rows, position, asOf);
    if (!live.length) return null;
    ctx = ctx || {};
    var total = 0;
    var any = false;
    function add(hours) {
      if (hours == null || !isFinite(hours)) return;
      total += hours;
      any = true;
    }
    live.forEach(function (row) {
      if (row.kind === "fixed" || row.kind === "fixed_fte" || row.kind === "per_sold") add(planHours(row, ctx));
    });
    var bases = {};
    live.forEach(function (row) {
      if (row.kind !== "tiered") return;
      var basis = row.basis === "same" ? "same" : "prev";
      bases[basis] = bases[basis] || [];
      (row.tiers || []).forEach(function (tier) {
        bases[basis].push({ from: tier.from, to: tier.to, hours: tier.hours, start: row.start });
      });
    });
    Object.keys(bases).forEach(function (basis) {
      var sold = basis === "prev" ? ctx.roomsSoldPrev : ctx.roomsSold;
      add(tierHours(bases[basis], sold));
    });
    var mins = mergedMinutes(live);
    if (mins) {
      var piece = 0;
      ["checkout", "stayover", "deep", "suite"].forEach(function (key) {
        if (mins[key] == null) return;
        piece += (Number(ctx[key]) || 0) * mins[key];
      });
      add(piece / 60);
    }
    return any ? total : null;
  }
  function roomMinutesFrom(rows, asOf) {
    var mins = mergedMinutes(activeRows(rows, "room_att", asOf));
    if (!mins) return null;
    return { checkout: mins.checkout, stayover: mins.stayover, deep: mins.deep, suite: mins.suite, breakMin: null };
  }
  function hasPay(row) {
    if (!row) return false;
    return ["pay", "wage", "rate", "hourly"].some(function (key) { return row[key] != null; });
  }
  function copyRows(source, target) {
    return (source || []).map(function (row) {
      var next = {};
      Object.keys(row).forEach(function (key) {
        if (key === "pay" || key === "wage" || key === "rate" || key === "hourly") return;
        next[key] = row[key];
      });
      next.hotel = target;
      next.id = "copy-" + target + "-" + (row.id || (row.position + "-" + row.start));
      return next;
    });
  }
  function replaceGroup(kind) {
    if (kind === "fixed" || kind === "fixed_fte") return "fixed";
    if (kind === "per_sold") return "per_sold";
    return null;
  }
  function applyVersion(list, rec) {
    var group = replaceGroup(rec.kind);
    var replaced = false;
    var next = (list || []).map(function (row) {
      if (row.position === rec.position && row.id && row.id === rec.id) { replaced = true; return rec; }
      if (group && row.position === rec.position && replaceGroup(row.kind) === group && !row.end && row.start < rec.start) {
        var copy = {};
        Object.keys(row).forEach(function (key) { copy[key] = row[key]; });
        copy.end = prevDay(rec.start);
        return copy;
      }
      return row;
    });
    if (!replaced) next.push(rec);
    return next;
  }

  var api = {
    CATALOG: CATALOG,
    seed: seed,
    deptsFor: deptsFor,
    positions: positions,
    access: access,
    activeRows: activeRows,
    missing: missing,
    tierHours: tierHours,
    planHours: planHours,
    hoursFor: hoursFor,
    mergedMinutes: mergedMinutes,
    roomMinutesFrom: roomMinutesFrom,
    planPositionId: planPositionId,
    hasPay: hasPay,
    copyRows: copyRows,
    applyVersion: applyVersion,
    fteDay: fteDay,
    prevDay: prevDay
  };
  root.HHQLaborStd = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var KEY = "jrportal_he_std_v1";
  var asOf = "";
  var draft = null;

  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function role() {
    try { return authRole(); } catch (e) { return ""; }
  }
  function today() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function bag() {
    var data = {};
    try { data = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { data = {}; }
    var changed = false;
    ["MSPAM", "MSPWE", "MSPMS"].forEach(function (hotel) {
      if (!Object.prototype.hasOwnProperty.call(data, hotel)) {
        data[hotel] = seed(hotel);
        changed = true;
      }
    });
    if (changed) {
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e2) {}
    }
    return data;
  }
  function saveBag(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    if (typeof useRemote === "function" && useRemote() && root.sb && sb.rpc && access(role()).edit) {
      sb.rpc("save_labor_standards", { p_rows: data }).catch(function () {});
    }
  }
  function rowsFor(hotel) { return bag()[hotel] || []; }
  function hotelNow() {
    var who = access(role());
    if (!who.edit) {
      try {
        var me = meUser();
        return (me && me.hotel) || S.hotel || "";
      } catch (e) { return ""; }
    }
    try { return S.hotel && S.hotel !== "CORP" ? S.hotel : "MSPAM"; } catch (e2) { return "MSPAM"; }
  }
  function summary(row) {
    if (!row) return L("No standard", "Sin estándar");
    if (row.kind === "fixed_fte") return L("Fixed", "Fijo") + " · " + row.fte + " FTE · " + row.weeklyHours + " " + L("hrs/wk", "hrs/sem") + " · " + row.hoursPerDay + " " + L("hrs/day", "hrs/día");
    if (row.kind === "fixed") return L("Fixed", "Fijo") + " · " + row.hoursPerDay + " " + L("hrs/day", "hrs/día");
    if (row.kind === "tiered") {
      var when = row.basis === "prev" ? L("prev-day rooms sold", "cuartos vendidos el día anterior") : L("same-day rooms sold", "cuartos vendidos el mismo día");
      var bits = (row.tiers || []).map(function (tier) { return tier.from + "–" + tier.to + " = " + tier.hours + " " + L("hrs", "hrs"); });
      return L("Variable", "Variable") + " · " + when + " · " + bits.join("; ");
    }
    if (row.kind === "per_sold") {
      var whenSold = row.basis === "same" ? L("same day", "mismo día") : L("prev day", "día anterior");
      var band = "";
      if (row.bandFrom != null || (row.to != null && row.to !== "")) {
        band = (row.bandFrom != null ? row.bandFrom : 0) + "–" + (row.to == null ? "" : row.to) + " · ";
      }
      var startAt = "";
      if (row.bandFrom != null && Number(row.from) === 0) startAt = " (" + L("from 0", "desde 0") + ")";
      else if (row.from != null && Number(row.from) !== 0) startAt = " (" + L("from", "desde") + " " + row.from + ")";
      return L("Variable", "Variable") + " · " + whenSold + " · " + band + row.minutes + " " + L("min per room sold", "min por cuarto vendido") + startAt;
    }
    if (row.kind === "per_room") {
      var m = row.minutes || {};
      var parts = [];
      if (m.checkout != null) parts.push(m.checkout + " " + L("min checkout", "min salida"));
      if (m.deep != null) parts.push(m.deep + " " + L("min deep clean", "min profunda"));
      if (m.stayover != null) parts.push(m.stayover + " " + L("min stayover", "min continuación"));
      if (m.suite != null) parts.push(m.suite + " " + L("min suite", "min suite"));
      return L("Variable", "Variable") + " · " + parts.join(" · ");
    }
    return L("No standard", "Sin estándar");
  }
  function summaryLive(live) {
    if (!live || !live.length) return L("No standard", "Sin estándar");
    var parts = [];
    var tiers = {};
    live.forEach(function (row) {
      if (row.kind === "tiered") {
        var basis = row.basis === "same" ? "same" : "prev";
        tiers[basis] = (tiers[basis] || []).concat(row.tiers || []);
        return;
      }
      if (row.kind === "per_room") return;
      parts.push(summary(row));
    });
    Object.keys(tiers).forEach(function (basis) {
      var list = tiers[basis].slice().sort(function (a, b) { return Number(a.from) - Number(b.from); });
      parts.push(summary({ kind: "tiered", basis: basis, tiers: list }));
    });
    var mins = mergedMinutes(live);
    if (mins) parts.push(summary({ kind: "per_room", minutes: mins }));
    return parts.join(" + ");
  }
  function dates(row) {
    if (!row) return "—";
    return row.start + (row.end ? " – " + row.end : " –");
  }
  function datesLive(live) {
    if (!live || !live.length) return "—";
    var seen = {};
    var bits = [];
    live.forEach(function (row) {
      var label = dates(row);
      if (seen[label]) return;
      seen[label] = 1;
      bits.push(label);
    });
    return bits.join(" · ");
  }
  api.rowsFor = rowsFor;
  api.summary = summary;
  api.roomMinutes = function (hotel, date) { return roomMinutesFrom(rowsFor(hotel), date || today()); };
  api.laundryHours = function (hotel, date, roomsSoldPrev) {
    return hoursFor(rowsFor(hotel), "laundry", date || today(), { roomsSoldPrev: roomsSoldPrev, roomsSold: roomsSoldPrev });
  };
  api.planHoursFor = function (hotel, planPosition, date, ctx) {
    var id = planPositionId(hotel, planPosition);
    if (!id) return null;
    return hoursFor(rowsFor(hotel), id, date, ctx || {});
  };

  function page() {
    var who = access(role());
    if (!who.view) return "<div class=\"card\"><p>" + esc(L("Labor standards are for managers.", "Los estándares de labor son para gerentes.")) + "</p></div>";
    var hotel = hotelNow();
    var day = asOf || today();
    var rows = rowsFor(hotel);
    var gone = missing(rows, day, hotel);
    var hotels = "";
    if (who.edit && typeof HOTELS !== "undefined") {
      hotels = "<div class=\"ls-hotels\">" + Object.keys(HOTELS).map(function (code) {
        return "<button type=\"button\" class=\"" + (code === hotel ? "on" : "") + "\" onclick=\"HHQStdHotel('" + code + "')\">" + esc(code) + "</button>";
      }).join("") + "</div>";
    }
    var banner = who.edit ? "" : "<p class=\"ls-lock\">" + esc(L("Set by JR Corporate", "Definido por JR Corporativo")) + "</p>";
    var copy = "";
    if (who.edit && !rows.length) {
      var others = Object.keys(typeof HOTELS !== "undefined" ? HOTELS : {}).filter(function (code) { return code !== hotel && (bag()[code] || []).length; });
      copy = "<div class=\"card\"><p>" + esc(L("No standards yet.", "Aún no hay estándares.")) + "</p>" +
        (others.length ? "<label>" + esc(L("Copy from another hotel", "Copiar de otro hotel")) +
          "<select id=\"lsCopy\" onchange=\"HHQStdCopy(this.value)\"><option value=\"\">" + esc(L("Choose", "Elegir")) + "</option>" +
          others.map(function (code) { return "<option value=\"" + code + "\">" + esc(code) + "</option>"; }).join("") +
          "</select></label>" : "") + "</div>";
    }
    var body = deptsFor(hotel).map(function (group) {
      var lines = group.positions.map(function (item) {
        var live = activeRows(rows, item.id, day);
        var hist = rows.filter(function (entry) { return entry.position === item.id; });
        var edit = "";
        if (who.edit && draft && draft.position === item.id) edit = form(draft);
        else if (who.edit) edit = "<button type=\"button\" class=\"btn2\" onclick=\"HHQStdEdit('" + item.id + "')\">" + esc(L("Add standard", "Agregar estándar")) + "</button>";
        var past = hist.length > 1 ? "<details><summary>" + esc(L("History", "Historial")) + " (" + hist.length + ")</summary>" + hist.map(function (entry) {
          return "<p><small>" + esc(dates(entry)) + "</small> " + esc(summary(entry)) + "</p>";
        }).join("") + "</details>" : "";
        return "<div class=\"ls-pos" + (live.length ? "" : " ls-empty") + "\"><div><b>" + esc(L(item.en, item.es)) + "</b><small>" + esc(summaryLive(live)) + "</small></div><div><small>" + esc(L("Effective", "Vigente")) + "</small><b>" + esc(datesLive(live)) + "</b></div>" + edit + past + "</div>";
      }).join("");
      return "<section class=\"card ls-dept\"><h3>" + esc(L(group.en, group.es)) + "</h3>" + lines + "</section>";
    }).join("");
    return "<div class=\"ls-page\" id=\"lsPage\"><h2>" + esc(L("Labor standards", "Estándares de labor")) + "</h2>" + hotels + banner +
      "<div class=\"ls-asof\"><label>" + esc(L("As of", "Al")) + " <input type=\"date\" id=\"lsAsOf\" value=\"" + esc(day) + "\" onchange=\"HHQStdDate(this.value)\"></label>" +
      (gone.length ? "<p class=\"ls-flag\">" + esc(gone.length + " " + L("positions with no standards yet", "puestos sin estándar todavía")) + "</p>" : "") +
      "</div>" + copy + body + "</div>";
  }
  function form(row) {
    var kind = row.kind || "fixed";
    var types = [["fixed", "Fixed hours/day", "Horas fijas/día"], ["fixed_fte", "Salaried FTE", "FTE asalariado"], ["tiered", "Hours by rooms sold", "Horas por cuartos vendidos"], ["per_room", "Minutes per room type", "Minutos por tipo de cuarto"], ["per_sold", "Minutes per room sold", "Minutos por cuarto vendido"]];
    var fields = "<label>" + esc(L("Type", "Tipo")) + "<select onchange=\"HHQStdKind(this.value)\">" + types.map(function (item) {
      return "<option value=\"" + item[0] + "\"" + (kind === item[0] ? " selected" : "") + ">" + esc(L(item[1], item[2])) + "</option>";
    }).join("") + "</select></label>";
    if (kind === "fixed") fields += "<label>" + esc(L("Hours per day", "Horas por día")) + "<input inputmode=\"decimal\" value=\"" + esc(row.hoursPerDay == null ? "" : row.hoursPerDay) + "\" onchange=\"HHQStdField('hoursPerDay', this.value)\"></label>";
    if (kind === "fixed_fte") {
      fields += "<label>" + esc(L("FTE", "FTE")) + "<input inputmode=\"decimal\" value=\"" + esc(row.fte == null ? 1 : row.fte) + "\" onchange=\"HHQStdField('fte', this.value)\"></label>";
      fields += "<label>" + esc(L("Weekly hours", "Horas por semana")) + "<input inputmode=\"decimal\" value=\"" + esc(row.weeklyHours == null ? 40 : row.weeklyHours) + "\" onchange=\"HHQStdField('weeklyHours', this.value)\"></label>";
      fields += "<p>" + esc((row.hoursPerDay || fteDay(row.weeklyHours || 40)) + " " + L("hrs/day", "hrs/día")) + "</p>";
    }
    if (kind === "tiered" || kind === "per_sold") {
      fields += "<label>" + esc(L("Rooms sold", "Cuartos vendidos")) + "<select onchange=\"HHQStdField('basis', this.value)\"><option value=\"prev\"" + (row.basis !== "same" ? " selected" : "") + ">" + esc(L("Previous day", "Día anterior")) + "</option><option value=\"same\"" + (row.basis === "same" ? " selected" : "") + ">" + esc(L("Same day", "Mismo día")) + "</option></select></label>";
    }
    if (kind === "tiered") {
      fields += (row.tiers || [{ from: 0, to: "", hours: "" }]).map(function (tier, index) {
        return "<div class=\"ls-tier\"><input inputmode=\"decimal\" aria-label=\"from\" value=\"" + esc(tier.from) + "\" onchange=\"HHQStdTier(" + index + ",'from',this.value)\"><input inputmode=\"decimal\" aria-label=\"to\" value=\"" + esc(tier.to) + "\" onchange=\"HHQStdTier(" + index + ",'to',this.value)\"><input inputmode=\"decimal\" aria-label=\"hours\" value=\"" + esc(tier.hours) + "\" onchange=\"HHQStdTier(" + index + ",'hours',this.value)\"></div>";
      }).join("") + "<button type=\"button\" class=\"btn2\" onclick=\"HHQStdTierAdd()\">" + esc(L("Add range", "Agregar rango")) + "</button>";
    }
    if (kind === "per_sold") fields += "<label>" + esc(L("Minutes per room sold", "Minutos por cuarto vendido")) + "<input inputmode=\"decimal\" value=\"" + esc(typeof row.minutes === "number" ? row.minutes : "") + "\" onchange=\"HHQStdField('minutes', this.value)\"></label>";
    if (kind === "per_room") {
      var mins = row.minutes && typeof row.minutes === "object" ? row.minutes : {};
      ["checkout", "stayover", "deep", "suite"].forEach(function (key) {
        var labels = { checkout: ["Checkout", "Salida"], stayover: ["Stayover", "Continuación"], deep: ["Deep clean", "Profunda"], suite: ["Suite", "Suite"] };
        fields += "<label>" + esc(L(labels[key][0], labels[key][1])) + "<input inputmode=\"decimal\" value=\"" + esc(mins[key] == null ? "" : mins[key]) + "\" onchange=\"HHQStdMinute('" + key + "', this.value)\"></label>";
      });
    }
    fields += "<label>" + esc(L("Effective start", "Inicio")) + "<input type=\"date\" value=\"" + esc(row.start || today()) + "\" onchange=\"HHQStdField('start', this.value)\"></label>";
    fields += "<label>" + esc(L("Effective end (optional)", "Fin (opcional)")) + "<input type=\"date\" value=\"" + esc(row.end || "") + "\" onchange=\"HHQStdField('end', this.value)\"></label>";
    return "<form class=\"ls-form\" onsubmit=\"HHQStdSave(event)\">" + fields + "<button type=\"submit\" class=\"btn\">" + esc(L("Save version", "Guardar versión")) + "</button></form>";
  }
  root.HHQStdHotel = function (code) {
    if (!access(role()).edit || typeof HOTELS === "undefined" || !HOTELS[code]) return;
    S.hotel = code;
    draft = null;
    try { save(); } catch (e) {}
    render();
  };
  root.HHQStdDate = function (value) { asOf = value || ""; render(); };
  root.HHQStdEdit = function (position) {
    if (!access(role()).edit) return;
    draft = { position: position, kind: "fixed", hoursPerDay: "", start: asOf || today(), end: "", tiers: [{ from: 0, to: "", hours: "" }], minutes: {}, basis: "prev" };
    render();
  };
  root.HHQStdKind = function (kind) {
    if (!draft) return;
    draft.kind = kind;
    if (kind === "per_room") draft.minutes = {};
    if (kind === "per_sold") draft.minutes = "";
    render();
  };
  root.HHQStdField = function (key, value) {
    if (!draft) return;
    if (key === "hoursPerDay" || key === "fte" || key === "weeklyHours" || key === "minutes") draft[key] = value === "" ? "" : Number(value);
    else draft[key] = value;
    if (key === "weeklyHours" || key === "fte") draft.hoursPerDay = fteDay(draft.weeklyHours || 0);
  };
  root.HHQStdTier = function (index, key, value) {
    if (!draft) return;
    draft.tiers = draft.tiers || [];
    draft.tiers[index] = draft.tiers[index] || { from: 0, to: "", hours: "" };
    draft.tiers[index][key] = value === "" ? "" : Number(value);
  };
  root.HHQStdTierAdd = function () {
    if (!draft) return;
    draft.tiers = draft.tiers || [];
    draft.tiers.push({ from: "", to: "", hours: "" });
    render();
  };
  root.HHQStdMinute = function (key, value) {
    if (!draft) return;
    if (!draft.minutes || typeof draft.minutes !== "object") draft.minutes = {};
    draft.minutes[key] = value === "" ? "" : Number(value);
  };
  root.HHQStdCopy = function (source) {
    if (!access(role()).edit || !source) return;
    var data = bag();
    var hotel = hotelNow();
    data[hotel] = copyRows(data[source] || [], hotel);
    saveBag(data);
    render();
  };
  root.HHQStdSave = function (event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!access(role()).edit || !draft || !draft.start) return;
    var hotel = hotelNow();
    var data = bag();
    var rec = { id: "std-" + draft.position + "-" + draft.kind + "-" + draft.start, hotel: hotel, position: draft.position, kind: draft.kind, start: draft.start, end: draft.end || null };
    if (draft.kind === "fixed") rec.hoursPerDay = Number(draft.hoursPerDay);
    if (draft.kind === "fixed_fte") { rec.fte = Number(draft.fte) || 1; rec.weeklyHours = Number(draft.weeklyHours) || 0; rec.hoursPerDay = fteDay(rec.weeklyHours); }
    if (draft.kind === "tiered") { rec.basis = draft.basis === "same" ? "same" : "prev"; rec.tiers = (draft.tiers || []).filter(function (tier) { return tier.hours !== "" && tier.from !== ""; }); }
    if (draft.kind === "per_sold") { rec.basis = draft.basis === "same" ? "same" : "prev"; rec.minutes = Number(draft.minutes); rec.from = 0; }
    if (draft.kind === "per_room") {
      rec.minutes = {};
      var mins = draft.minutes && typeof draft.minutes === "object" ? draft.minutes : {};
      ["checkout", "stayover", "deep", "suite"].forEach(function (key) {
        if (mins[key] === "" || mins[key] == null) return;
        rec.minutes[key] = Number(mins[key]);
      });
    }
    data[hotel] = applyVersion(data[hotel] || [], rec);
    saveBag(data);
    draft = null;
    render();
  };
  if (typeof M !== "undefined") M.lstd = ["📋", "Labor standards"];
  if (typeof V !== "undefined") V.lstd = page;
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Labor standards"] = "Estándares de labor";
  ["GM", "Housekeeping"].forEach(function (key) {
    if (typeof TILES !== "undefined") {
      TILES[key] = TILES[key] || [];
      if (TILES[key].indexOf("lstd") < 0) TILES[key].push("lstd");
    }
  });
  if (typeof render === "function") {
    var prevRender = render;
    root.render = function () {
      try {
        if (typeof S !== "undefined" && S.tab === "lstd" && !access(role()).view) S.tab = "home";
      } catch (e) {}
      return prevRender.apply(this, arguments);
    };
  }
  var css = document.createElement("style");
  css.textContent = ".ls-page h2{margin-top:0}.ls-hotels,.ls-asof{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}.ls-hotels button{background:#f7f8fa;border:1px solid #e6e8ee;border-radius:10px}.ls-hotels button.on{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.ls-lock,.ls-flag{margin:0;font-weight:750}.ls-flag{color:#9a3412}.ls-dept h3{margin:0 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#5c6570}.ls-pos{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:flex-start;padding:10px 0;border-top:1px solid #e6e8ee}.ls-pos b{display:block}.ls-pos small{color:#5c6570;font-weight:650}.ls-empty b{color:#9a3412}.ls-form{flex:1 1 100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;background:#f7f8fa;border-radius:12px;padding:10px}.ls-form label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:13px}.ls-tier{display:flex;gap:6px}.ls-pos details{flex:1 1 100%}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
