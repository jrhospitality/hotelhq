/* Yearly winter preparedness checklist.
   A fresh copy is assigned to every hotel each October (default Oct 15, due about
   three weeks later on Nov 5). JR Corporate can change both dates. Past years stay
   as history. Demo mode keeps everything in localStorage and does not call Supabase.
   Item wording is the seasonal checklist. No staff names, vendor prices, or keys. */
(function (root) {
  "use strict";
  var HOTELS = ["MSPAM", "MSPMS", "MSPWE"];
  var HOTEL_LABEL = {
    MSPAM: ["Hampton", "Hampton"],
    MSPMS: ["SpringHill", "SpringHill"],
    MSPWE: ["Golden Valley", "Golden Valley"]
  };
  var SECTIONS = [
    [1, "Building, pipes & life safety", "Edificio, tuberías y seguridad de vida"],
    [2, "Equipment & vehicles", "Equipo y vehículos"],
    [3, "After a storm", "Después de una tormenta"],
    [4, "Winter emergency supplies on hand for guests & staff", "Suministros de emergencia de invierno para huéspedes y personal"],
    [5, "Snow removal vendor", "Proveedor de remoción de nieve"]
  ];
  var ITEMS = [
    [1, 1, "Train staff on where the water shutoffs are and how to shut them off. Post photos and drawings/maps near the timeclocks, in BOH, and in the emergency manual.", "Capacita al personal sobre dónde están las llaves de cierre del agua y cómo cerrarlas. Publica fotos y planos o mapas cerca de los relojes checadores, en BOH y en el manual de emergencias.", ""],
    [2, 1, "Make sure all stairwell and vestibule heaters are working properly.", "Asegúrate de que todos los calentadores de escaleras y vestíbulos funcionen bien.", ""],
    [3, 1, "Make sure all back-of-house areas have enough heat. Maintenance staff check all BOH areas daily for cold spots (DAILY). All BOH areas must stay above 40°F.", "Asegúrate de que todas las áreas de servicio tengan suficiente calor. El personal de mantenimiento revisa todas las áreas BOH cada día en busca de puntos fríos (DIARIO). Todas las áreas BOH deben mantenerse por encima de 40°F.", "cold"],
    [4, 1, "Make sure all buildings are \"weather tight.\" Close all windows, doors, vents, etc. Seal any openings in exterior walls, ceilings/roofs, and floors so they aren't exposed to outside air.", "Asegúrate de que todos los edificios estén \"cerrados al clima\". Cierra todas las ventanas, puertas, ventilas, etc. Sella cualquier abertura en paredes exteriores, techos y pisos para que no queden expuestas al aire exterior.", ""],
    [5, 1, "Insulate piping and install heat tracing lines on critical piping, which greatly lowers the risk of a pipe freeze. Facilities personnel should inspect hard-to-heat areas.", "Aísla la tubería e instala líneas de trazado de calor en la tubería crítica, lo que baja mucho el riesgo de que un tubo se congele. El personal de instalaciones debe revisar las áreas difíciles de calentar.", ""],
    [6, 1, "Verify that all roof drains, drainpipes, and gutters are free of debris and drain properly. Complete the fall clean-up of all planting beds and planters.", "Verifica que todos los desagües del techo, bajantes y canaletas estén libres de escombros y drenen bien. Completa la limpieza de otoño de todos los arriates y macetas.", ""],
    [7, 1, "Check any rooms that are out of order for a long time regularly to make sure they stay heated. If the hotel has a dry sprinkler system, drain the water from the low points.", "Revisa con regularidad los cuartos que están fuera de servicio por mucho tiempo para asegurarte de que sigan con calefacción. Si el hotel tiene un sistema de rociadores secos, drena el agua de los puntos bajos.", "ooo"],
    [8, 1, "Check the fire pumps and make sure the pump room has enough heat.", "Revisa las bombas contra incendio y asegúrate de que el cuarto de bombas tenga suficiente calor.", ""],
    [9, 1, "Make sure the fire panel is fully working with no troubles.", "Asegúrate de que el panel de incendio funcione por completo y no tenga fallas.", ""],
    [10, 1, "Hold PIC training with managers, front desk, auditors, and engineering staff. Discuss who is responsible for shoveling and applying ice melt, how often to do it, etc.", "Haz la capacitación PIC con gerentes, recepción, auditores y personal de ingeniería. Hablen de quién palea y aplica el derretidor de hielo, con qué frecuencia, etc.", ""],
    [11, 1, "Flush and winterize the outdoor lawn sprinkler system.", "Enjuaga y prepara para el invierno el sistema de riego del césped.", ""],
    [12, 1, "Bring in outdoor furniture that isn't weather-resistant.", "Guarda los muebles de exterior que no resisten el clima.", ""],
    [13, 1, "Keep wet floor signs handy, along with a doodlebug/spray to clean up dry salt.", "Ten a la mano los letreros de piso mojado, junto con un doodlebug o spray para limpiar la sal seca.", ""],
    [14, 1, "Talk to staff about winter safety and planning for more travel time.", "Habla con el personal sobre la seguridad en invierno y planear más tiempo de traslado.", ""],
    [15, 2, "Service and tune up the snow blowers so they work properly. Make sure gasoline/oil is on hand and stored properly.", "Da servicio y ajusta las sopladoras de nieve para que funcionen bien. Asegúrate de tener gasolina y aceite a la mano y guardados correctamente.", ""],
    [16, 2, "Inspect the shuttle van tires to make sure they're in good condition and safe for winter.", "Inspecciona las llantas de la van del shuttle para confirmar que estén en buen estado y sean seguras para el invierno.", ""],
    [17, 3, "After the storm passes, inspect, document, and repair any damage to roofs, skylights, or overhangs. Notify emergency response teams of any injuries or deaths. Then restock supplies and maintain the equipment for the next storm. (After each storm.)", "Cuando pase la tormenta, inspecciona, documenta y repara cualquier daño en techos, tragaluces o voladizos. Avisa a los equipos de emergencia si hay personas lesionadas o fallecidas. Luego repón los suministros y mantén el equipo para la próxima tormenta. (Después de cada tormenta.)", "storm"],
    [18, 4, "Ice melt (at all building entrances)", "Derretidor de hielo (en todas las entradas del edificio)", ""],
    [19, 4, "Shovels", "Palas", ""],
    [20, 4, "Car scrapers", "Raspadores para autos", ""],
    [21, 4, "Flashlights", "Linternas", ""],
    [22, 4, "Extra blankets", "Cobijas extra", ""],
    [23, 4, "Cans of deicer", "Latas de descongelante", ""],
    [24, 4, "Dollar-store snug gloves for guests who forget theirs", "Guantes abrigados de tienda de dólar para huéspedes que olvidan los suyos", ""],
    [25, 4, "Portable car battery charger and/or a set of jumper cables", "Cargador portátil de batería de auto y/o un juego de cables pasa-corriente", ""],
    [26, 5, "Make sure snow removal agreements are in place and insurance documents are on file.", "Asegúrate de que los acuerdos de remoción de nieve estén vigentes y de que los documentos del seguro estén archivados.", ""],
    [27, 5, "Mark curbs and obstacles with flags.", "Marca banquetas y obstáculos con banderas.", ""],
    [28, 5, "Post the snow removal company's number at the front desk, with a log to track when they remove snow and/or salt or sand the lot. (Ongoing log, every visit.)", "Publica en recepción el número de la compañía de remoción de nieve, con una bitácora de cuándo quitan la nieve y/o echan sal o arena en el estacionamiento. (Bitácora continua, cada visita.)", "snow"]
  ];
  var CLOSING = [
    "Emergency access roads must be cleared. Communicate the severe-weather procedures to key operating and emergency staff.",
    "Los caminos de acceso de emergencia deben quedar despejados. Comunica los procedimientos de clima severo al personal clave de operación y de emergencias."
  ];
  var RECUR = { cold: ["Daily", "Diario"], ooo: ["Regularly", "Con regularidad"], storm: ["After each storm", "Después de cada tormenta"], snow: ["Every visit", "Cada visita"] };

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function isISO(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return false;
    var p = String(s).split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return dt.getUTCFullYear() === p[0] && dt.getUTCMonth() === p[1] - 1 && dt.getUTCDate() === p[2];
  }
  function defsOf(state) {
    var d = state && state.defaults || {};
    return {
      assignMonth: clamp(d.assignMonth, 1, 12, 10),
      assignDay: clamp(d.assignDay, 1, 28, 15),
      dueMonth: clamp(d.dueMonth, 1, 12, 11),
      dueDay: clamp(d.dueDay, 1, 28, 5)
    };
  }
  function clamp(n, a, b, fallback) {
    n = Math.round(Number(n));
    if (!isFinite(n)) return fallback;
    return Math.min(b, Math.max(a, n));
  }
  function blankState() {
    return { v: 1, defaults: { assignMonth: 10, assignDay: 15, dueMonth: 11, dueDay: 5 }, years: {} };
  }
  function blankItem() { return { status: "open", reason: "", note: "", photo: "", by: "", byId: "", at: "" }; }
  function templateAssign(state, year) {
    var d = defsOf(state);
    return iso(year, d.assignMonth, d.assignDay);
  }
  function dueSeed(state, year, hotel) {
    if (year === 2026 && hotel === "MSPAM") return "2026-11-04";
    if (year === 2026 && hotel === "MSPMS") return "2026-11-05";
    if (year === 2026 && hotel === "MSPWE") return "2026-11-06";
    var d = defsOf(state);
    return iso(year, d.dueMonth, d.dueDay);
  }
  function yearBucket(state, year) { return state.years[String(year)] || null; }
  function assignFor(state, year) {
    var bucket = yearBucket(state, year);
    if (bucket && bucket.assignOn) return bucket.assignOn;
    return templateAssign(state, year);
  }
  function activeYear(state, today) {
    var cal = +String(today).slice(0, 4);
    var best = 0;
    var year;
    for (year = 2026; year <= cal + 1; year++) {
      var existing = yearBucket(state, year);
      var assign = existing && existing.assignOn ? existing.assignOn : templateAssign(state, year);
      if (assign <= today || (existing && year <= cal)) best = year;
    }
    return best;
  }
  function blankSeason(state, year, hotel, assignOn) {
    var items = {};
    var n;
    for (n = 1; n <= 28; n++) items[n] = blankItem();
    return {
      hotel: hotel,
      year: year,
      dueOn: dueSeed(state, year, hotel),
      optional: year === 2026 && hotel === "MSPWE",
      snowPhone: "",
      items: items,
      logs: []
    };
  }
  function ensure(state, today) {
    if (!state.years) state.years = {};
    if (!state.defaults) state.defaults = blankState().defaults;
    var year = activeYear(state, today);
    if (!year) return state;
    var key = String(year);
    if (!state.years[key] && templateAssign(state, year) > today) return state;
    if (!state.years[key]) state.years[key] = { year: year, assignOn: templateAssign(state, year), hotels: {} };
    var bucket = state.years[key];
    if (!bucket.hotels) bucket.hotels = {};
    if (!bucket.assignOn) bucket.assignOn = templateAssign(state, year);
    HOTELS.forEach(function (hotel) {
      if (!bucket.hotels[hotel]) bucket.hotels[hotel] = blankSeason(state, year, hotel, bucket.assignOn);
      var season = bucket.hotels[hotel];
      var n;
      for (n = 1; n <= 28; n++) if (!season.items[n]) season.items[n] = blankItem();
      if (!Array.isArray(season.logs)) season.logs = [];
    });
    return state;
  }
  function season(state, year, hotel) {
    var bucket = yearBucket(state, year);
    return bucket && bucket.hotels ? bucket.hotels[hotel] : null;
  }
  function counts(row) {
    var done = 0, na = 0, open = 0, n, st;
    for (n = 1; n <= 28; n++) {
      st = row && row.items && row.items[n] ? row.items[n].status : "open";
      if (st === "done") done++;
      else if (st === "na") na++;
      else open++;
    }
    return { done: done, na: na, open: open, pct: Math.round(100 * (done + na) / 28) };
  }
  function isHistory(state, year, today) {
    var active = activeYear(state, today);
    return !!active && year < active;
  }
  function isOverdue(row, today) {
    if (!row || row.optional) return false;
    if (counts(row).pct >= 100) return false;
    return String(today) > String(row.dueOn);
  }
  function pastSuggested(row, today) {
    return !!(row && row.optional && counts(row).pct < 100 && String(today) > String(row.dueOn));
  }
  function canCheck(actor) {
    return !!(actor && actor.hotel && (actor.role === "GM" || actor.role === "AGM" || actor.role === "Maintenance"));
  }
  function canSnow(actor) {
    return canCheck(actor) || !!(actor && actor.hotel && actor.role === "Front Desk");
  }
  function canDates(actor) { return !!(actor && actor.role === "Above Property"); }
  function ownHotel(actor, hotel) {
    return !!(actor && actor.hotel === hotel);
  }
  function fail(code) { return { ok: false, error: code }; }
  function setStatus(state, year, hotel, n, status, reason, actor, now, today) {
    if (!season(state, year, hotel)) return fail("missing");
    if (isHistory(state, year, today)) return fail("history");
    if (!canCheck(actor) || !ownHotel(actor, hotel)) return fail("role");
    if (status !== "open" && status !== "done" && status !== "na") return fail("status");
    n = +n;
    if (n < 1 || n > 28) return fail("item");
    reason = String(reason || "").trim();
    if (status === "na" && !reason) return fail("reason");
    var item = season(state, year, hotel).items[n];
    item.status = status;
    item.reason = status === "na" ? reason : "";
    if (status === "open") { item.by = ""; item.byId = ""; item.at = ""; }
    else { item.by = actor.name || ""; item.byId = actor.id || ""; item.at = now || ""; }
    return { ok: true };
  }
  function setMeta(state, year, hotel, n, patch, actor, today) {
    if (!season(state, year, hotel)) return fail("missing");
    if (isHistory(state, year, today)) return fail("history");
    if (!canCheck(actor) || !ownHotel(actor, hotel)) return fail("role");
    n = +n;
    var item = season(state, year, hotel).items[n];
    if (!item) return fail("item");
    if (patch.note != null) item.note = String(patch.note).slice(0, 2000);
    if (patch.photo != null) item.photo = safePhoto(patch.photo);
    return { ok: true };
  }
  function setPhone(state, year, hotel, phone, actor, today) {
    var row = season(state, year, hotel);
    if (!row) return fail("missing");
    if (isHistory(state, year, today)) return fail("history");
    if (!canCheck(actor) || !ownHotel(actor, hotel)) return fail("role");
    row.snowPhone = String(phone || "").trim().slice(0, 40);
    return { ok: true };
  }
  function addLog(state, year, hotel, entry, actor, today) {
    var row = season(state, year, hotel);
    if (!row) return fail("missing");
    if (isHistory(state, year, today)) return fail("history");
    entry = entry || {};
    var kind = entry.kind;
    if (kind === "snow") {
      if (!canSnow(actor) || !ownHotel(actor, hotel)) return fail("role");
    } else if (!canCheck(actor) || !ownHotel(actor, hotel)) return fail("role");
    if (kind !== "cold" && kind !== "ooo" && kind !== "storm" && kind !== "snow") return fail("kind");
    var day = entry.day || today;
    if (!isISO(day)) return fail("date");
    var log = {
      id: entry.id || ("L" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36)),
      kind: kind,
      day: day,
      at: entry.at || "",
      by: actor.name || "",
      byId: actor.id || "",
      note: String(entry.note || "").trim().slice(0, 2000),
      photo: safePhoto(entry.photo || "")
    };
    if (kind === "cold") {
      if (String(entry.tempF == null ? "" : entry.tempF).trim() === "") return fail("temp");
      var temp = Number(entry.tempF);
      if (!isFinite(temp)) return fail("temp");
      log.tempF = Math.round(temp * 10) / 10;
      log.below = !(log.tempF > 40);
      log.area = String(entry.area || "").trim().slice(0, 80);
      if (!log.area) return fail("area");
    } else if (kind === "ooo") {
      log.room = String(entry.room || "").trim().slice(0, 20);
      if (!log.room) return fail("room");
      log.heated = !!entry.heated;
    } else if (kind === "storm") {
      if (!log.note) return fail("note");
      log.notified = !!entry.notified;
    } else {
      log.snow = !!entry.snow;
      log.salt = !!entry.salt;
      if (!log.snow && !log.salt) return fail("action");
    }
    row.logs.push(log);
    return { ok: true, log: log };
  }
  function setDates(state, year, patch, actor, today) {
    if (!canDates(actor)) return fail("role");
    if (!yearBucket(state, year)) return fail("missing");
    if (isHistory(state, year, today)) return fail("history");
    patch = patch || {};
    if (!isISO(patch.assignOn)) return fail("date");
    if (+patch.assignOn.slice(0, 4) !== +year) return fail("date");
    var bucket = yearBucket(state, year);
    var next = {};
    var i;
    for (i = 0; i < HOTELS.length; i++) {
      var hotel = HOTELS[i];
      var src = (patch.hotels && patch.hotels[hotel]) || {};
      var due = src.dueOn || (bucket.hotels[hotel] && bucket.hotels[hotel].dueOn);
      if (!isISO(due) || due < patch.assignOn) return fail("date");
      var dueYear = +due.slice(0, 4);
      if (dueYear !== +year && dueYear !== +year + 1) return fail("date");
      next[hotel] = { dueOn: due, optional: !!src.optional };
    }
    bucket.assignOn = patch.assignOn;
    HOTELS.forEach(function (hotel) {
      var row = bucket.hotels[hotel];
      row.dueOn = next[hotel].dueOn;
      row.optional = next[hotel].optional;
    });
    return { ok: true };
  }
  function setDefaults(state, patch, actor) {
    if (!canDates(actor)) return fail("role");
    state.defaults = {
      assignMonth: clamp(patch.assignMonth, 1, 12, 10),
      assignDay: clamp(patch.assignDay, 1, 28, 15),
      dueMonth: clamp(patch.dueMonth, 1, 12, 11),
      dueDay: clamp(patch.dueDay, 1, 28, 5)
    };
    return { ok: true };
  }
  function safePhoto(p) {
    return typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(p) ? p : "";
  }
  function logsOf(row, kind) {
    return (row && row.logs || []).filter(function (log) { return log.kind === kind; });
  }
  function loggedOn(row, kind, day) {
    return logsOf(row, kind).some(function (log) { return log.day === day; });
  }
  function itemByNo(n) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i][0] === n) return ITEMS[i];
    return null;
  }

  var api = {
    HOTELS: HOTELS,
    HOTEL_LABEL: HOTEL_LABEL,
    SECTIONS: SECTIONS,
    ITEMS: ITEMS,
    CLOSING: CLOSING,
    RECUR: RECUR,
    blankState: blankState,
    ensure: ensure,
    activeYear: activeYear,
    season: season,
    counts: counts,
    isHistory: isHistory,
    isOverdue: isOverdue,
    pastSuggested: pastSuggested,
    canCheck: canCheck,
    canSnow: canSnow,
    canDates: canDates,
    setStatus: setStatus,
    setMeta: setMeta,
    setPhone: setPhone,
    addLog: addLog,
    setDates: setDates,
    setDefaults: setDefaults,
    templateAssign: templateAssign,
    logsOf: logsOf,
    loggedOn: loggedOn,
    itemByNo: itemByNo,
    isISO: isISO
  };
  root.WinterPrep = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;

  var KEY = "jrportal_winter_v1";
  var mem = null;
  var ui = { year: 0, drill: "", na: 0 };
  var syncErr = "";
  var pulled = false;
  var idMap = {};

  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function todayISO() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function nowISO() { return new Date().toISOString(); }
  function actor() {
    var u = typeof meUser === "function" ? meUser() : null;
    if (!u) return null;
    return {
      id: u.id,
      name: typeof cw === "function" ? cw() : (u.name || ""),
      role: typeof authRole === "function" ? authRole() : u.role,
      hotel: u.hotel || null
    };
  }
  function toast(en, es) {
    if (typeof showToast === "function") showToast(L(en, es));
  }
  function fmtDate(iso) {
    if (!api.isISO(iso)) return "";
    var p = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    var wd = dt.getUTCDay();
    var enW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var esW = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    var enM = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var esM = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    var w = (L(enW[wd], esW[wd]));
    var m = (L(enM[p[1] - 1], esM[p[1] - 1]));
    return w + ", " + m + " " + p[2] + ", " + p[0];
  }
  function fmtStamp(iso) {
    if (!iso) return "";
    var dt = new Date(iso);
    if (isNaN(+dt)) return "";
    try {
      return dt.toLocaleString(L("en-US", "es-MX"), { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch (e) { return iso; }
  }
  function hotelName(code) {
    var pair = HOTEL_LABEL[code] || [code, code];
    return L(pair[0], pair[1]);
  }
  function load() {
    if (!mem) {
      try { mem = JSON.parse(root.localStorage.getItem(KEY) || "null"); } catch (e) { mem = null; }
      if (!mem || mem.v !== 1 || !mem.years) mem = blankState();
    }
    ensure(mem, todayISO());
    return mem;
  }
  function persist() {
    try { root.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { toast("This browser didn't keep the change.", "Este navegador no guardó el cambio."); }
  }
  function remoteOn() {
    try { return typeof useRemote === "function" && !!useRemote() && typeof sb !== "undefined" && sb && sb.from; }
    catch (e) { return false; }
  }
  function errText(code) {
    var map = {
      history: ["Past years stay as history and can't be edited.", "Los años pasados quedan en el historial y no se pueden editar."],
      role: ["GM, AGM, and maintenance check items off. Front desk logs snow visits.", "El GM, el AGM y mantenimiento marcan los puntos. Recepción anota las visitas de nieve."],
      reason: ["N/A needs a reason.", "N/A necesita un motivo."],
      date: ["Check the assign date and the due date.", "Revisa la fecha de asignación y la fecha límite."],
      temp: ["Enter the temperature in °F.", "Escribe la temperatura en °F."],
      area: ["Name the area you checked.", "Escribe el área que revisaste."],
      room: ["Enter the room number.", "Escribe el número de cuarto."],
      note: ["Add a short note of what you found.", "Agrega una nota breve de lo que encontraste."],
      action: ["Mark snow removal, salt or sand, or both.", "Marca remoción de nieve, sal o arena, o ambas."]
    };
    var pair = map[code] || ["Couldn't save that.", "No se pudo guardar."];
    return L(pair[0], pair[1]);
  }
  function after(res) {
    if (!res.ok) { toast(errText(res.error), errText(res.error)); return false; }
    persist();
    return true;
  }

  function bar(pct) {
    var n = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<span class="wn-bar" role="progressbar" aria-valuenow="' + n + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + n + '%"></i></span>';
  }
  function progressLine(state, year, hotel) {
    var row = season(state, year, hotel);
    var c = counts(row);
    return '<div class="wn-line"><span class="wn-hotel">' + esc(hotelName(hotel)) + "</span>" + bar(c.pct) + '<span class="wn-pct">' + c.pct + "%</span></div>";
  }
  function hotelsForHome(who) {
    if (!who) return [];
    if (who.role === "Above Property") return HOTELS.slice();
    return who.hotel ? [who.hotel] : [];
  }
  function dueLine(row, today) {
    var bits = L("Due", "Vence") + " " + fmtDate(row.dueOn);
    if (row.optional) bits += ' · <span class="pill OC">' + L("Optional", "Opcional") + "</span>";
    if (isOverdue(row, today)) bits += ' · <span class="bad">' + L("Overdue", "Atrasada") + "</span>";
    else if (pastSuggested(row, today)) bits += ' · <span class="bad">' + L("Suggested date passed", "Pasó la fecha sugerida") + "</span>";
    else if (counts(row).pct >= 100) bits += ' · <span class="good">' + L("Complete", "Completa") + "</span>";
    return bits;
  }
  function homeCards() {
    var who = actor();
    if (!who || typeof S === "undefined") return "";
    var state = load();
    var today = todayISO();
    var year = activeYear(state, today);
    if (!year) return "";
    kickPull();
    var hotels = hotelsForHome(who);
    if (who.role === "Above Property" && S.role === "GM") return corpCard(state, year, hotels, today);
    if ((who.role === "GM" || who.role === "AGM") && S.role === "GM") return hotelCard(state, year, hotels[0], today);
    if (who.role === "Maintenance" && S.role === "Maintenance") return hotelCard(state, year, hotels[0], today);
    if (who.role === "Front Desk" && S.role === "Front Desk") return snowCard(state, year, hotels[0], today);
    return "";
  }
  function hotelCard(state, year, hotel, today) {
    var row = season(state, year, hotel);
    if (!row || !hotel) return "";
    var cold = loggedOn(row, "cold", today)
      ? '<span class="good">' + L("Cold-spot check logged today", "Revisión de puntos fríos registrada hoy") + "</span>"
      : '<span class="bad">' + L("No cold-spot check logged today", "Sin revisión de puntos fríos hoy") + "</span>";
    return '<button type="button" class="card wn-home" id="wn-card" onclick="go(\'winter\')"><b>❄️ ' + L("Winter preparedness", "Preparación de invierno") + "</b>"
      + '<div class="wn-lines">' + progressLine(state, year, hotel) + "</div>"
      + "<small>" + dueLine(row, today) + "</small><small>" + cold + "</small></button>";
  }
  function corpCard(state, year, hotels, today) {
    var bucket = yearBucket(state, year);
    var overdue = 0;
    (hotels || []).forEach(function (hotel) {
      if (isOverdue(season(state, year, hotel), today)) overdue++;
    });
    var rows = (hotels || []).map(function (hotel) { return progressLine(state, year, hotel); }).join("");
    return '<button type="button" class="card wn-home" id="wn-card" onclick="go(\'winter\')"><b>❄️ ' + L("Winter preparedness", "Preparación de invierno") + " · " + year + "</b>"
      + '<div class="wn-lines">' + rows + "</div>"
      + "<small>" + (overdue ? '<span class="bad">' + overdue + " " + L("overdue", "atrasadas") + "</span>" : '<span class="good">' + L("No required hotel is overdue", "Ningún hotel obligatorio está atrasado") + "</span>")
      + " · " + L("Assigned", "Asignada") + " " + fmtDate(bucket.assignOn) + "</small></button>";
  }
  function snowCard(state, year, hotel, today) {
    var row = season(state, year, hotel);
    if (!row) return "";
    var visits = logsOf(row, "snow");
    var last = visits.length ? visits[visits.length - 1] : null;
    return '<button type="button" class="card wn-home" id="wn-card" onclick="go(\'winter\')"><b>❄️ ' + L("Snow removal visit log", "Bitácora de visitas de nieve") + "</b><small>"
      + visits.length + " " + L("visits", "visitas")
      + (last ? " · " + L("Last", "Última") + " " + fmtDate(last.day) : " · " + L("No visits logged yet", "Aún no hay visitas"))
      + "</small></button>";
  }

  function view() {
    var who = actor();
    if (!who) return "";
    var state = load();
    var today = todayISO();
    var year = ui.year || activeYear(state, today);
    kickPull();
    if (!year || !yearBucket(state, year)) {
      return '<div class="raw wn" id="wn-page"><h2>❄️ ' + L("Winter preparedness", "Preparación de invierno") + "</h2><div class=\"card\">"
        + L("The next checklist is assigned on October 15. JR Corporate can move that date.", "La próxima lista se asigna el 15 de octubre. JR Corporate puede mover esa fecha.")
        + (canDates(who) ? defaultsForm(state) : "") + syncNote() + "</div></div>";
    }
    if (who.role === "Front Desk") return snowPage(state, year, who.hotel, who, today);
    if (who.role === "Above Property" && !ui.drill) return portfolio(state, year, who, today);
    var hotel = who.role === "Above Property" ? ui.drill : who.hotel;
    return checklist(state, year, hotel, who, today);
  }

  function yearButtons(state, year) {
    var years = Object.keys(state.years).map(Number).sort(function (a, b) { return b - a; });
    if (!years.length) return "";
    return '<div class="seg wn-years">' + years.map(function (y) {
      var hist = isHistory(state, y, todayISO());
      return '<button type="button" class="' + (y === year ? "on" : "") + '" onclick="WN.year(' + y + ')">' + y + (hist ? " · " + L("History", "Historial") : "") + "</button>";
    }).join("") + "</div>";
  }
  function portfolio(state, year, who, today) {
    var bucket = yearBucket(state, year);
    var overdue = 0;
    var cards = HOTELS.map(function (hotel) {
      var row = bucket.hotels[hotel];
      var c = counts(row);
      if (isOverdue(row, today)) overdue++;
      return '<div class="card"><h3>' + esc(hotelName(hotel)) + " · " + esc(hotel) + "</h3>"
        + "<div>" + c.pct + "% " + L("complete", "lista") + " · " + (c.done + c.na) + "/28</div>" + bar(c.pct)
        + "<small>" + dueLine(row, today) + "</small>"
        + '<button type="button" class="btn2" onclick="WN.openHotel(\'' + hotel + "')\">" + L("View checklist", "Ver la lista") + "</button></div>";
    }).join("");
    return '<div class="raw wn" id="wn-page"><h2>❄️ ' + L("Winter preparedness", "Preparación de invierno") + "</h2>"
      + "<p>" + L("Each October every hotel gets a fresh copy. Past years stay as history. For 2026, Hampton is due Nov 4, SpringHill Nov 5, and Golden Valley is optional with a default of Nov 6.", "Cada octubre cada hotel recibe una copia nueva. Los años pasados quedan en el historial. En 2026, Hampton vence el 4 de nov, SpringHill el 5 de nov, y Golden Valley es opcional con el 6 de nov como fecha inicial.") + "</p>"
      + yearButtons(state, year)
      + '<div class="kpi"><div><b>' + overdue + "</b>" + L("Overdue", "Atrasadas") + "</div><div><b>" + fmtDate(bucket.assignOn) + "</b>" + L("Assigned", "Asignada") + "</div><div><b>" + year + "</b>" + L("Season", "Temporada") + "</div></div>"
      + cards
      + (isHistory(state, year, today) ? '<div class="card">' + L("This year is history. Dates and checks stay as they were.", "Este año es historial. Las fechas y las marcas se quedan como estaban.") + "</div>" : datesForm(state, year))
      + defaultsForm(state) + syncNote() + "</div>";
  }
  function datesForm(state, year) {
    var bucket = yearBucket(state, year);
    var rows = HOTELS.map(function (hotel) {
      var row = bucket.hotels[hotel];
      return '<label>' + esc(hotelName(hotel)) + ' ' + L("due date", "fecha límite")
        + '<input type="date" id="wn-due-' + hotel + '" value="' + esc(row.dueOn) + '"></label>'
        + '<label class="wn-check"><input type="checkbox" id="wn-opt-' + hotel + '"' + (row.optional ? " checked" : "") + "> " + L("Optional", "Opcional") + "</label>";
    }).join("");
    return '<div class="card"><h3>' + L("This year's dates", "Fechas de este año") + "</h3>"
      + "<small>" + L("JR Corporate can move the assign date and each hotel's due date.", "JR Corporate puede mover la fecha de asignación y la fecha límite de cada hotel.") + "</small>"
      + '<label>' + L("Assign date", "Fecha de asignación") + '<input type="date" id="wn-assign" value="' + esc(bucket.assignOn) + '"></label>'
      + rows
      + '<button type="button" class="btn" onclick="WN.saveDates()">' + L("Save dates", "Guardar fechas") + "</button></div>";
  }
  function defaultsForm(state) {
    var d = defsOf(state);
    var preview = L("Next new year assigns on month ", "El próximo año nuevo se asigna el mes ") + d.assignMonth + L(", day ", ", día ") + d.assignDay
      + L(", and is due month ", " y vence el mes ") + d.dueMonth + L(", day ", ", día ") + d.dueDay + ".";
    return '<div class="card"><h3>' + L("Yearly schedule", "Calendario anual") + "</h3>"
      + "<small>" + L("These defaults apply the next time a year is created. October 15 and November 5 are the starting point, about three weeks apart.", "Estos valores aplican la próxima vez que se cree un año. El punto de partida es el 15 de octubre y el 5 de noviembre, unas tres semanas después.") + "</small>"
      + '<div class="row"><label>' + L("Assign month", "Mes de asignación") + '<input id="wn-am" type="number" min="1" max="12" value="' + d.assignMonth + '"></label>'
      + '<label>' + L("Assign day", "Día de asignación") + '<input id="wn-ad" type="number" min="1" max="28" value="' + d.assignDay + '"></label></div>'
      + '<div class="row"><label>' + L("Due month", "Mes límite") + '<input id="wn-dm" type="number" min="1" max="12" value="' + d.dueMonth + '"></label>'
      + '<label>' + L("Due day", "Día límite") + '<input id="wn-dd" type="number" min="1" max="28" value="' + d.dueDay + '"></label></div>'
      + "<small>" + esc(preview) + "</small>"
      + '<button type="button" class="btn" onclick="WN.saveDefaults()">' + L("Save yearly schedule", "Guardar calendario anual") + "</button></div>";
  }
  function checklist(state, year, hotel, who, today) {
    var row = season(state, year, hotel);
    if (!row) return "";
    var bucket = yearBucket(state, year);
    var hist = isHistory(state, year, today);
    var edit = canCheck(who) && ownHotel(who, hotel) && !hist;
    var c = counts(row);
    var back = who.role === "Above Property" ? '<button type="button" class="btn2 wn-back" onclick="WN.back()">‹ ' + L("All hotels", "Todos los hoteles") + "</button>" : "";
    var body = SECTIONS.map(function (sec) {
      var items = ITEMS.filter(function (it) { return it[1] === sec[0]; });
      return '<section class="card"><h3>' + sec[0] + ". " + esc(L(sec[1], sec[2])) + "</h3>"
        + items.map(function (it) { return itemHtml(it, row, edit, today); }).join("")
        + (sec[0] === 5 ? "<small>" + esc(L(CLOSING[0], CLOSING[1])) + "</small>" : "")
        + "</section>";
    }).join("");
    return '<div class="raw wn" id="wn-page">' + back + "<h2>❄️ " + esc(hotelName(hotel)) + " · " + L("Winter preparedness", "Preparación de invierno") + "</h2>"
      + yearButtons(state, year)
      + (hist ? '<div class="warn">' + L("History. This year's copy is closed.", "Historial. La copia de este año está cerrada.") + "</div>" : "")
      + (!edit && who.role === "Above Property" ? "<small>" + L("GM, AGM, and maintenance check items off at the hotel.", "En el hotel, el GM, el AGM y mantenimiento marcan los puntos.") + "</small>" : "")
      + '<div class="card"><div>' + c.pct + "% · " + (c.done + c.na) + "/28</div>" + bar(c.pct)
      + "<small>" + L("Assigned", "Asignada") + " " + fmtDate(bucket.assignOn) + " · " + dueLine(row, today) + "</small></div>"
      + body + syncNote() + "</div>";
  }
  function itemHtml(it, row, edit, today) {
    var n = it[0];
    var item = row.items[n] || blankItem();
    var recur = it[4];
    var text = L(it[2], it[3]);
    var status = item.status || "open";
    var who = "";
    if (status === "done" && item.at) who = "<small>" + L("Completed by", "Completó") + " " + esc(item.by || L("Staff", "Personal")) + " · " + esc(fmtStamp(item.at)) + "</small>";
    if (status === "na" && item.at) who = "<small>" + L("Marked N/A by", "Marcó N/A") + " " + esc(item.by || L("Staff", "Personal")) + (item.reason ? " · " + esc(item.reason) : "") + " · " + esc(fmtStamp(item.at)) + "</small>";
    var controls = "";
    if (edit) {
      controls = '<div class="wn-seg" role="group" aria-label="' + esc(L("Status", "Estado")) + '">'
        + segBtn(n, "done", status, L("Done", "Listo"))
        + segBtn(n, "na", status, L("N/A", "N/A"))
        + segBtn(n, "open", status, L("Not started", "Sin empezar"))
        + "</div>"
        + (ui.na === n ? '<label>' + L("Reason for N/A", "Motivo de N/A") + '<input id="wn-na-' + n + '" value="' + esc(item.reason || "") + '" placeholder="' + esc(L("Why this doesn't apply", "Por qué no aplica")) + '"></label><button type="button" class="btn" onclick="WN.saveNa(' + n + ')">' + L("Save N/A", "Guardar N/A") + "</button>" : "")
        + '<details class="wn-more"' + (item.note || item.photo ? " open" : "") + "><summary>" + L("Note and photo", "Nota y foto") + "</summary>"
        + '<label>' + L("Note", "Nota") + '<textarea id="wn-note-' + n + '" rows="2" onchange="WN.note(' + n + ', this.value)">' + esc(item.note || "") + "</textarea></label>"
        + photoBox(n, item.photo) + "</details>";
    } else if (item.note) {
      controls = "<small>" + esc(item.note) + "</small>";
    }
    if (showPhoto(item.photo) && !edit) controls += '<img class="prev" alt="" src="' + esc(showPhoto(item.photo)) + '">';
    var extra = "";
    if (recur === "cold") extra = coldBox(row, n, edit, today);
    if (recur === "ooo") extra = oooBox(row, n, edit);
    if (recur === "storm") extra = stormBox(row, n, edit);
    if (recur === "snow") extra = snowBox(row, n, edit, true);
    var badge = recur ? '<span class="pill OD">' + L("Recurring", "Recurrente") + " · " + esc(L(RECUR[recur][0], RECUR[recur][1])) + "</span> " : "";
    return '<article class="wn-item" id="wn-item-' + n + '" data-n="' + n + '" data-en="' + esc(it[2]) + '"><div class="wn-copy"><b>' + n + ".</b> " + badge + esc(text) + "</div>" + who + controls + extra + "</article>";
  }
  function segBtn(n, status, current, label) {
    return '<button type="button" class="' + (current === status ? "on" : "") + '" aria-pressed="' + (current === status ? "true" : "false") + '" onclick="WN.set(' + n + ",'" + status + '\')">' + label + "</button>";
  }
  function showPhoto(p) {
    return /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(p || "") ? p : "";
  }
  function photoBox(n, photo) {
    photo = showPhoto(photo);
    return '<label class="photo-pick">' + L("Add photo", "Agregar foto") + '<input type="file" accept="image/*" capture="environment" onchange="WN.photo(' + n + ', this)"></label>'
      + (photo ? '<img class="prev" alt="" src="' + esc(photo) + '">' : "");
  }
  function logList(logs, renderLine) {
    if (!logs.length) return "<small>" + L("Nothing logged yet.", "Aún no hay registros.") + "</small>";
    return logs.slice().reverse().map(renderLine).join("");
  }
  function coldBox(row, n, edit, today) {
    var logs = logsOf(row, "cold");
    var flag = loggedOn(row, "cold", today)
      ? '<span class="good">' + L("Logged today", "Registrado hoy") + "</span>"
      : '<span class="bad">' + L("Not logged today", "Sin registro hoy") + "</span>";
    var form = edit ? '<div class="wn-log"><label>' + L("Area", "Área") + '<input id="wn-cold-area" placeholder="' + esc(L("Stairwell, laundry, kitchen…", "Escalera, lavandería, cocina…")) + '"></label>'
      + '<label>' + L("Temperature °F", "Temperatura °F") + '<input id="wn-cold-temp" inputmode="decimal" placeholder="55"></label>'
      + '<label>' + L("Note", "Nota") + '<input id="wn-cold-note"></label>'
      + '<button type="button" class="btn" onclick="WN.logCold(' + n + ')">' + L("Save today's check", "Guardar la revisión de hoy") + "</button>"
      + "<small>" + L("Areas must stay above 40°F. A colder reading is saved and flagged.", "Las áreas deben estar por encima de 40°F. Una lectura más baja se guarda y se marca.") + "</small></div>" : "";
    return '<div class="wn-recur"><b>' + L("Daily cold-spot check", "Revisión diaria de puntos fríos") + "</b> " + flag + form
      + logList(logs, function (log) {
        return '<div class="li"><span>' + esc(fmtDate(log.day)) + " · " + esc(log.area) + " · " + esc(String(log.tempF)) + "°F"
          + (log.below ? ' <span class="bad">' + L("40°F or below", "40°F o menos") + "</span>" : "")
          + "<br><small>" + esc(log.by || "") + (log.note ? " · " + esc(log.note) : "") + "</small></span></div>";
      }) + "</div>";
  }
  function oooBox(row, n, edit) {
    var logs = logsOf(row, "ooo");
    var form = edit ? '<div class="wn-log"><label>' + L("Room", "Cuarto") + '<input id="wn-ooo-room" inputmode="numeric"></label>'
      + '<label class="wn-check"><input type="checkbox" id="wn-ooo-heat" checked> ' + L("Stayed heated", "Siguió con calefacción") + "</label>"
      + '<label>' + L("Note", "Nota") + '<input id="wn-ooo-note"></label>'
      + '<button type="button" class="btn" onclick="WN.logOoo(' + n + ')">' + L("Save room check", "Guardar revisión del cuarto") + "</button></div>" : "";
    return '<div class="wn-recur"><b>' + L("Long-term out-of-order rooms", "Cuartos fuera de servicio por mucho tiempo") + "</b>" + form
      + logList(logs, function (log) {
        return "<div class=\"li\"><span>" + esc(fmtDate(log.day)) + " · " + L("Room", "Cuarto") + " " + esc(log.room)
          + " · " + (log.heated ? L("Heated", "Con calefacción") : '<span class="bad">' + L("Not heated", "Sin calefacción") + "</span>")
          + "<br><small>" + esc(log.by || "") + (log.note ? " · " + esc(log.note) : "") + "</small></span></div>";
      }) + "</div>";
  }
  function stormBox(row, n, edit) {
    var logs = logsOf(row, "storm");
    var form = edit ? '<div class="wn-log"><label>' + L("What you inspected and repaired", "Qué inspeccionaste y reparaste") + '<textarea id="wn-storm-note" rows="2"></textarea></label>'
      + '<label class="wn-check"><input type="checkbox" id="wn-storm-notify"> ' + L("Emergency teams notified if anyone was hurt", "Se avisó a emergencias si alguien resultó herido") + "</label>"
      + '<button type="button" class="btn" onclick="WN.logStorm(' + n + ')">' + L("Save storm follow-up", "Guardar el seguimiento de la tormenta") + "</button></div>" : "";
    return '<div class="wn-recur"><b>' + L("After each storm", "Después de cada tormenta") + "</b>" + form
      + logList(logs, function (log) {
        return '<div class="li"><span>' + esc(fmtDate(log.day)) + " · " + esc(log.note)
          + "<br><small>" + esc(log.by || "") + (log.notified ? " · " + L("Emergency teams notified", "Emergencias avisadas") : "") + "</small></span></div>";
      }) + "</div>";
  }
  function snowBox(row, n, edit, withPhone) {
    var logs = logsOf(row, "snow");
    var phone = withPhone ? '<label>' + L("Snow removal company number at the front desk", "Número de la compañía de remoción de nieve en recepción")
      + '<input id="wn-phone" value="' + esc(row.snowPhone || "") + '" placeholder="' + esc(L("Phone number", "Teléfono")) + '" onchange="WN.phone(this.value)"></label>' : "";
    var shown = row.snowPhone ? '<p><a href="tel:' + esc(String(row.snowPhone).replace(/[^\d+]/g, "")) + '">' + esc(row.snowPhone) + "</a></p>" : "<small>" + L("The number has not been posted yet.", "El número aún no está publicado.") + "</small>";
    var form = edit || (actor() && actor().role === "Front Desk") ? snowForm() : "";
    if (isHistory(load(), ui.year || activeYear(load(), todayISO()), todayISO())) form = "";
    return '<div class="wn-recur" id="wn-snow"><b>' + L("Snow removal visit log", "Bitácora de visitas de nieve") + "</b>"
      + (withPhone && edit ? phone : shown) + form
      + logList(logs, function (log) {
        var what = [log.snow ? L("Removed snow", "Quitó nieve") : "", log.salt ? L("Salt or sand", "Sal o arena") : ""].filter(Boolean).join(" · ");
        return '<div class="li"><span>' + esc(fmtDate(log.day)) + " · " + esc(what)
          + "<br><small>" + esc(log.by || "") + " · " + esc(fmtStamp(log.at)) + (log.note ? " · " + esc(log.note) : "") + "</small></span></div>";
      }) + "</div>";
  }
  function snowForm() {
    return '<div class="wn-log"><label class="wn-check"><input type="checkbox" id="wn-snow-yes"> ' + L("Removed snow", "Quitó nieve") + "</label>"
      + '<label class="wn-check"><input type="checkbox" id="wn-salt-yes"> ' + L("Salt or sand", "Sal o arena") + "</label>"
      + '<label>' + L("Note", "Nota") + '<input id="wn-snow-note" placeholder="' + esc(L("Lot, sidewalks, time…", "Estacionamiento, banquetas, hora…")) + '"></label>'
      + '<button type="button" class="btn" onclick="WN.logSnow()">' + L("Log this visit", "Anotar esta visita") + "</button></div>";
  }
  function snowPage(state, year, hotel, who, today) {
    var row = season(state, year, hotel);
    if (!row) return "";
    var hist = isHistory(state, year, today);
    return '<div class="raw wn" id="wn-page"><h2>❄️ ' + L("Snow removal visit log", "Bitácora de visitas de nieve") + "</h2>"
      + yearButtons(state, year)
      + '<div class="card"><p>' + esc(L(itemByNo(28)[2], itemByNo(28)[3])) + "</p>"
      + (row.snowPhone ? '<p class="wn-phone"><a href="tel:' + esc(String(row.snowPhone).replace(/[^\d+]/g, "")) + '">' + esc(row.snowPhone) + "</a></p>" : "<p>" + L("The number has not been posted yet.", "El número aún no está publicado.") + "</p>")
      + (hist ? "<small>" + L("This year is history.", "Este año es historial.") + "</small>" : snowForm())
      + logList(logsOf(row, "snow"), function (log) {
        var what = [log.snow ? L("Removed snow", "Quitó nieve") : "", log.salt ? L("Salt or sand", "Sal o arena") : ""].filter(Boolean).join(" · ");
        return '<div class="li"><span><b>' + esc(fmtDate(log.day)) + "</b> · " + esc(what) + "<br><small>" + esc(log.by || "") + " · " + esc(fmtStamp(log.at)) + (log.note ? " · " + esc(log.note) : "") + "</small></span></div>";
      })
      + "</div>" + syncNote() + "</div>";
  }
  function syncNote() {
    return syncErr ? '<div class="warn">' + L("Saved on this device. The server copy did not update.", "Guardado en este dispositivo. La copia del servidor no se actualizó.") + "</div>" : "";
  }
  function currentYear() {
    var state = load();
    return ui.year || activeYear(state, todayISO());
  }
  function currentHotel() {
    var who = actor();
    if (!who) return "";
    if (who.role === "Above Property") return ui.drill || "";
    return who.hotel;
  }

  root.WN = {
    year: function (y) { ui.year = y; ui.drill = ""; ui.na = 0; render(); },
    openHotel: function (hotel) { ui.drill = hotel; ui.na = 0; render(); root.scrollTo(0, 0); },
    back: function () { ui.drill = ""; ui.na = 0; render(); },
    set: function (n, status) {
      if (status === "na") { ui.na = n; render(); return; }
      var state = load();
      var year = currentYear();
      var hotel = currentHotel();
      if (after(setStatus(state, year, hotel, n, status, "", actor(), nowISO(), todayISO()))) {
        ui.na = 0;
        pushItem(year, hotel, n);
        render();
      }
    },
    saveNa: function (n) {
      var input = document.getElementById("wn-na-" + n);
      var state = load();
      var year = currentYear();
      var hotel = currentHotel();
      if (after(setStatus(state, year, hotel, n, "na", input ? input.value : "", actor(), nowISO(), todayISO()))) {
        ui.na = 0;
        pushItem(year, hotel, n);
        render();
      }
    },
    note: function (n, value) {
      var state = load();
      var year = currentYear();
      var hotel = currentHotel();
      if (after(setMeta(state, year, hotel, n, { note: value }, actor(), todayISO()))) pushItem(year, hotel, n);
    },
    photo: function (n, input) {
      var file = input.files && input.files[0];
      if (!file) return;
      compress(file, function (url) {
        var state = load();
        var year = currentYear();
        var hotel = currentHotel();
        if (after(setMeta(state, year, hotel, n, { photo: url }, actor(), todayISO()))) {
          pushItem(year, hotel, n);
          render();
        }
      });
    },
    phone: function (value) {
      var state = load();
      var year = currentYear();
      var hotel = currentHotel();
      if (after(setPhone(state, year, hotel, value, actor(), todayISO()))) pushSeason(year, hotel);
    },
    logCold: function () {
      var temp = document.getElementById("wn-cold-temp");
      var area = document.getElementById("wn-cold-area");
      var note = document.getElementById("wn-cold-note");
      saveLog({ kind: "cold", tempF: temp ? temp.value : "", area: area ? area.value : "", note: note ? note.value : "" });
    },
    logOoo: function () {
      var room = document.getElementById("wn-ooo-room");
      var heat = document.getElementById("wn-ooo-heat");
      var note = document.getElementById("wn-ooo-note");
      saveLog({ kind: "ooo", room: room ? room.value : "", heated: !!(heat && heat.checked), note: note ? note.value : "" });
    },
    logStorm: function () {
      var note = document.getElementById("wn-storm-note");
      var notified = document.getElementById("wn-storm-notify");
      saveLog({ kind: "storm", note: note ? note.value : "", notified: !!(notified && notified.checked) });
    },
    logSnow: function () {
      var snow = document.getElementById("wn-snow-yes");
      var salt = document.getElementById("wn-salt-yes");
      var note = document.getElementById("wn-snow-note");
      saveLog({ kind: "snow", snow: !!(snow && snow.checked), salt: !!(salt && salt.checked), note: note ? note.value : "" });
    },
    saveDates: function () {
      var state = load();
      var year = currentYear();
      var hotels = {};
      HOTELS.forEach(function (hotel) {
        var due = document.getElementById("wn-due-" + hotel);
        var opt = document.getElementById("wn-opt-" + hotel);
        hotels[hotel] = { dueOn: due ? due.value : "", optional: !!(opt && opt.checked) };
      });
      var assign = document.getElementById("wn-assign");
      if (after(setDates(state, year, { assignOn: assign ? assign.value : "", hotels: hotels }, actor(), todayISO()))) {
        HOTELS.forEach(function (hotel) { pushSeason(year, hotel); });
        render();
      }
    },
    saveDefaults: function () {
      var state = load();
      var read = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
      if (after(setDefaults(state, {
        assignMonth: read("wn-am"), assignDay: read("wn-ad"), dueMonth: read("wn-dm"), dueDay: read("wn-dd")
      }, actor()))) {
        ensure(state, todayISO());
        persist();
        pushSettings();
        if (remoteOn()) pullRemote();
        render();
      }
    }
  };

  function saveLog(entry) {
    var state = load();
    var year = currentYear();
    var hotel = actor() && actor().role === "Front Desk" ? actor().hotel : currentHotel();
    entry.day = todayISO();
    entry.at = nowISO();
    var res = addLog(state, year, hotel, entry, actor(), todayISO());
    if (after(res)) {
      pushLog(year, hotel, res.log);
      render();
    }
  }
  function compress(file, done) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 640 / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function kickPull() {
    if (pulled || !remoteOn()) return;
    pulled = true;
    pullRemote();
  }
  function pullRemote() {
    var today = todayISO();
    var year = activeYear(load(), today) || +today.slice(0, 4);
    sb.rpc("winter_ensure_year", { p_year: year }).then(function (ens) {
      if (ens && ens.error) throw ens.error;
      return sb.from("winter_seasons").select("id,hotel_id,year,assign_on,due_on,optional,snow_phone");
    }).then(function (res) {
      if (!res || res.error) throw res && res.error;
      var rows = res.data || [];
      rows.forEach(function (row) { idMap[row.year + "|" + row.hotel_id] = row.id; });
      var ids = rows.map(function (row) { return row.id; });
      if (!ids.length) return { seasons: rows, items: [], logs: [] };
      return Promise.all([
        sb.from("winter_items").select("season_id,item_no,status,na_reason,note,photo,completed_at").in("season_id", ids),
        sb.from("winter_logs").select("season_id,kind,logged_at,note,photo,temp_f,area,room,action").in("season_id", ids)
      ]).then(function (pair) {
        if (pair[0].error) throw pair[0].error;
        if (pair[1].error) throw pair[1].error;
        return { seasons: rows, items: pair[0].data || [], logs: pair[1].data || [] };
      });
    }).then(function (pack) {
      if (!pack) return;
      mergeRemote(pack);
      persist();
      syncErr = "";
      if (typeof render === "function") render();
    }).catch(function () { syncErr = "pull"; });
  }
  function mergeRemote(pack) {
    var state = load();
    var byId = {};
    pack.seasons.forEach(function (row) {
      var key = String(row.year);
      if (!state.years[key]) state.years[key] = { year: row.year, assignOn: row.assign_on, hotels: {} };
      state.years[key].assignOn = row.assign_on;
      if (!state.years[key].hotels[row.hotel_id]) state.years[key].hotels[row.hotel_id] = blankSeason(state, row.year, row.hotel_id, row.assign_on);
      var dest = state.years[key].hotels[row.hotel_id];
      dest.dueOn = row.due_on;
      dest.optional = !!row.optional;
      dest.snowPhone = row.snow_phone || "";
      byId[row.id] = { year: row.year, hotel: row.hotel_id };
    });
    pack.items.forEach(function (item) {
      var where = byId[item.season_id];
      if (!where) return;
      var dest = state.years[String(where.year)].hotels[where.hotel].items[item.item_no];
      if (!dest) return;
      dest.status = item.status || "open";
      dest.reason = item.na_reason || "";
      dest.note = item.note || "";
      dest.photo = item.photo || "";
      dest.at = item.completed_at || "";
    });
    pack.seasons.forEach(function (row) {
      var dest = state.years[String(row.year)].hotels[row.hotel_id];
      dest.logs = [];
    });
    pack.logs.forEach(function (log) {
      var where = byId[log.season_id];
      if (!where) return;
      var dest = state.years[String(where.year)].hotels[where.hotel];
      var entry = {
        id: "R" + dest.logs.length,
        kind: log.kind,
        day: String(log.logged_at || "").slice(0, 10),
        at: log.logged_at || "",
        by: "",
        byId: "",
        note: log.note || "",
        photo: log.photo || ""
      };
      if (log.kind === "cold") { entry.tempF = Number(log.temp_f); entry.below = !(entry.tempF > 40); entry.area = log.area || ""; }
      if (log.kind === "ooo") { entry.room = log.room || ""; entry.heated = log.action !== "cold"; }
      if (log.kind === "storm") entry.notified = log.action === "notified";
      if (log.kind === "snow") { entry.snow = String(log.action || "").indexOf("snow") >= 0; entry.salt = String(log.action || "").indexOf("salt") >= 0; }
      dest.logs.push(entry);
    });
  }
  function pushItem(year, hotel, n) {
    if (!remoteOn()) return;
    var id = idMap[year + "|" + hotel];
    var item = season(load(), year, hotel).items[n];
    var write = function (seasonId) {
      sb.from("winter_items").update({
        status: item.status,
        na_reason: item.status === "na" ? item.reason : null,
        note: item.note || null,
        photo: item.photo || null
      }).eq("season_id", seasonId).eq("item_no", n).then(function (res) {
        if (res.error) syncErr = "push";
      });
    };
    if (id) write(id);
    else sb.from("winter_seasons").select("id").eq("year", year).eq("hotel_id", hotel).maybeSingle().then(function (res) {
      if (res.error || !res.data) { syncErr = "push"; return; }
      idMap[year + "|" + hotel] = res.data.id;
      write(res.data.id);
    });
  }
  function pushSeason(year, hotel) {
    if (!remoteOn()) return;
    var row = season(load(), year, hotel);
    var bucket = yearBucket(load(), year);
    sb.from("winter_seasons").update({
      assign_on: bucket.assignOn,
      due_on: row.dueOn,
      optional: !!row.optional,
      snow_phone: row.snowPhone || null
    }).eq("year", year).eq("hotel_id", hotel).then(function (res) { if (res.error) syncErr = "push"; });
  }
  function pushSettings() {
    if (!remoteOn()) return;
    var d = defsOf(load());
    sb.from("winter_settings").update(d.assignMonth == null ? d : {
      assign_month: d.assignMonth, assign_day: d.assignDay, due_month: d.dueMonth, due_day: d.dueDay
    }).eq("id", 1).then(function (res) { if (res.error) syncErr = "push"; });
  }
  function pushLog(year, hotel, log) {
    if (!remoteOn() || !log) return;
    var action = "";
    if (log.kind === "snow") action = (log.snow ? "snow" : "") + (log.salt ? "+salt" : "");
    if (log.kind === "ooo") action = log.heated ? "heated" : "cold";
    if (log.kind === "storm") action = log.notified ? "notified" : "";
    var body = {
      kind: log.kind,
      logged_at: log.at || nowISO(),
      note: log.note || null,
      photo: log.photo || null,
      temp_f: log.kind === "cold" ? log.tempF : null,
      area: log.area || null,
      room: log.room || null,
      action: action || null
    };
    var write = function (seasonId) {
      body.season_id = seasonId;
      sb.from("winter_logs").insert(body).then(function (res) { if (res.error) syncErr = "push"; });
    };
    var id = idMap[year + "|" + hotel];
    if (id) write(id);
    else sb.from("winter_seasons").select("id").eq("year", year).eq("hotel_id", hotel).maybeSingle().then(function (res) {
      if (res.error || !res.data) { syncErr = "push"; return; }
      idMap[year + "|" + hotel] = res.data.id;
      write(res.data.id);
    });
  }

  if (typeof M !== "undefined") M.winter = ["❄️", "Winter preparedness"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["Winter preparedness"] = "Preparación de invierno";
  if (typeof V !== "undefined") V.winter = view;
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try { card = homeCards(); } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = prevTiles(role) || [];
      if ((role === "GM" || role === "Maintenance" || role === "Front Desk") && list.indexOf("winter") < 0) list = list.concat(["winter"]);
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined") RSEC[0][2].push("winter"); } catch (e) {}
  try { if (typeof RQL !== "undefined") RQL.winter = ["Winter preparedness", "Preparación de invierno"]; } catch (e) {}

  var style = document.createElement("style");
  style.textContent = [
    ".wn-home{display:block;width:100%;text-align:left;color:inherit;cursor:pointer;background:#fff;color:#1d2433}",
    ".wn-home small{display:block;margin-top:4px;font-weight:500}",
    ".wn-lines{display:flex;flex-direction:column;gap:8px;margin-top:8px;width:100%}",
    ".wn-line{display:flex;align-items:center;gap:8px;width:100%;min-width:0}",
    ".wn-line .wn-hotel{flex:0 1 38%;min-width:0;font-weight:700;text-align:left;background:none;padding:0;border-radius:0;line-height:1.2}",
    ".wn-line .wn-bar{flex:1 1 auto;display:block;height:10px;min-width:48px;margin:0;background:#e3e8f0;border-radius:6px;overflow:hidden}",
    ".wn-line .wn-pct{flex:0 0 3.2em;text-align:right;font-weight:800;font-variant-numeric:tabular-nums}",
    ".wn-bar{display:block;height:10px;background:#e3e8f0;border-radius:6px;overflow:hidden;margin:6px 0}",
    ".wn-bar i{display:block;height:100%;background:#15642f;min-width:0}",
    ".wn-item{padding:10px 0;border-bottom:1px solid #e6ebf2}",
    ".wn-copy{font-size:15px;line-height:1.35}",
    ".wn-seg{display:flex;gap:6px;margin:8px 0}",
    ".wn-seg button{flex:1;min-height:44px;background:#e6ebf2;border:0;font-weight:700}",
    ".wn-seg button.on{background:#14365d;color:#fff}",
    ".wn-check{display:flex;align-items:center;gap:8px;min-height:44px}",
    ".wn-recur{background:#f6f8fb;border-radius:10px;padding:8px;margin-top:8px}",
    ".wn-log label,.wn-log small{display:block;margin:6px 0;font-weight:600}",
    ".wn-log .btn{width:100%}",
    ".wn-years{margin:8px 0}",
    ".wn-back{margin-bottom:8px}",
    ".wn-more{margin-top:4px}.wn-more summary{cursor:pointer;font-weight:700}",
    ".wn-phone{font-size:22px;font-weight:800}",
    ".wn a{color:#14365d}"
  ].join("");
  if (typeof document !== "undefined" && document.head) document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
