/* Outbound shuttle sign-up for the shared Hampton (MSPAM) and SpringHill (MSPMS) van.
   Rides to MSP Terminal 1, Terminal 2, and Mall of America are booked here.
   Return pickups stay in TrackMyShuttle. Front desk and drivers at either airport
   hotel see both hotels' sign-ups. Golden Valley does not. The guest code is a
   per-hotel setting (shuttle_settings.tracking_code), seeded in the migration.
   Demo rows are marked (EX). No phone, billing, or plate. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPAM", "MSPMS"];
  var FEATURE = "shuttle";
  var DEFAULT_URL = "https://www.trackmyshuttle.com/";
  /* Offline demo copy of the migration seed. The screen reads trackingCode from settings. */
  var SEED_CODE = { MSPAM: "2860", MSPMS: "2871" };
  var BOOK_ROLES = { "Front Desk": 1, GM: 1, AGM: 1, "Above Property": 1 };
  var SETUP_ROLES = { GM: 1, AGM: 1, "Above Property": 1 };
  var DRIVER = "Shuttle Driver";
  var DESTS = ["t1", "t2", "moa", "other"];
  var DEST_ORDER = { t1: 0, t2: 1, moa: 2, other: 3 };
  var PHRASES = {
    "Shuttle": "Shuttle",
    "EXAMPLE": "EJEMPLO",
    "Sample rides for this demo. Not real guests.": "Viajes de ejemplo. No son huéspedes reales.",
    "No shuttle at this property.": "Este hotel no tiene shuttle.",
    "Outbound shuttle": "Shuttle de salida",
    "One van for Hampton and SpringHill. Sign up rides that leave the hotel. Seats are shared.": "Una van para Hampton y SpringHill. Anota los viajes que salen del hotel. Los asientos son compartidos.",
    "Pickups: TrackMyShuttle": "Recogidas: TrackMyShuttle",
    "Airport and mall pickups are in TrackMyShuttle. This list is only for rides leaving the hotel.": "Las recogidas en el aeropuerto y el mall están en TrackMyShuttle. Esta lista es solo para viajes que salen del hotel.",
    "Guest code": "Código del huésped",
    "Hampton (MSPAM)": "Hampton (MSPAM)",
    "SpringHill (MSPMS)": "SpringHill (MSPMS)",
    "Copy code": "Copiar código",
    "Code copied.": "Código copiado.",
    "Copy guest message": "Copiar mensaje para el huésped",
    "Guest message copied.": "Mensaje copiado.",
    "Could not copy.": "No se pudo copiar.",
    "No guest code yet. A GM can add it.": "Todavía no hay código. El gerente puede agregarlo.",
    "Show this code and QR to the guest.": "Muestra este código y el QR al huésped.",
    "TrackMyShuttle guest code": "Código de huésped de TrackMyShuttle",
    "Sign up a guest": "Anotar un huésped",
    "Hotel": "Hotel",
    "Destination": "Destino",
    "Airport T1": "Aeropuerto T1",
    "Airport T2": "Aeropuerto T2",
    "Mall of America": "Mall of America",
    "Other": "Otro",
    "Where to": "A dónde",
    "Departure": "Salida",
    "Last name": "Apellido",
    "Room number": "Número de cuarto",
    "Last name or room": "Apellido o cuarto",
    "Number of guests": "Número de huéspedes",
    "Party size": "Personas",
    "Bags": "Maletas",
    "Flight time": "Hora del vuelo",
    "Optional": "Opcional",
    "Notes": "Notas",
    "Add to run": "Agregar al viaje",
    "seats left": "asientos libres",
    "seat taken by": "asiento tomado por",
    "seats taken by": "asientos tomados por",
    "Full": "Lleno",
    "Past": "Pasó",
    "That run is full.": "Ese viaje está lleno.",
    "Not enough seats on that run.": "No hay lugares en ese viaje.",
    "No more runs today.": "Ya no hay viajes hoy.",
    "Enter a last name.": "Escribe un apellido.",
    "Enter a room number.": "Escribe el número de cuarto.",
    "No phone number. Use a last name or a room.": "Sin teléfono. Usa un apellido o un cuarto.",
    "Enter where they are going.": "Escribe a dónde van.",
    "Pick a departure.": "Elige una salida.",
    "You can't change the shuttle list.": "No puedes cambiar la lista del shuttle.",
    "That hotel is not on your list.": "Ese hotel no está en tu lista.",
    "Shuttle is off at this hotel.": "El shuttle está apagado en este hotel.",
    "Could not save.": "No se pudo guardar.",
    "Signed up.": "Anotado.",
    "Already on the shuttle list.": "Ya está en la lista del shuttle.",
    "Today's sign-ups": "Anotados de hoy",
    "No sign-ups yet.": "Todavía no hay anotados.",
    "Booked": "Anotado",
    "Boarded": "Abordó",
    "No-show": "No se presentó",
    "Done": "Listo",
    "Driver runs": "Viajes del chofer",
    "Pickup at": "Recoge en",
    "guests": "personas",
    "bags": "maletas",
    "Today": "Hoy",
    "Runs": "Viajes",
    "Ridership today": "Pasajeros de hoy",
    "Signed up": "Anotados",
    "Rode": "Viajaron",
    "No rides recorded today.": "Hoy no hay viajes registrados.",
    "Shuttle settings": "Ajustes del shuttle",
    "Back": "Volver",
    "Departure every": "Salida cada",
    "minutes": "minutos",
    "Seats per run": "Asientos por viaje",
    "First run": "Primer viaje",
    "Last run": "Último viaje",
    "TrackMyShuttle link": "Enlace de TrackMyShuttle",
    "Corporate sets the TrackMyShuttle link.": "Corporativo define el enlace de TrackMyShuttle.",
    "First pickup": "Primera recogida",
    "Second pickup": "Segunda recogida",
    "Save settings": "Guardar ajustes",
    "Settings saved.": "Ajustes guardados.",
    "Enter the guest code, letters and numbers only.": "Escribe el código, solo letras y números.",
    "Enter a link that starts with https://": "Escribe un enlace que empiece con https://",
    "Pick two different hotels.": "Elige dos hoteles distintos.",
    "Last run has to be after the first run.": "El último viaje tiene que ser después del primero.",
    "Reset sample data": "Restablecer datos de ejemplo",
    "Sample data reset.": "Datos de ejemplo restablecidos.",
    "New shuttle signup": "Nueva reserva de shuttle",
    "Park & Fly": "Estaciona y vuela",
    "Shuttle signup": "Anotar en el shuttle",
    "From a Park & Fly car. Add a room number. The plate is not stored here.": "Desde un auto de Estaciona y vuela. Agrega el número de cuarto. La placa no se guarda aquí.",
    "Loading shuttle…": "Cargando el shuttle…",
    "Status": "Estatus",
    "Room": "Cuarto",
    "Flight": "Vuelo",
    "Shared seats": "Asientos compartidos",
    "Open settings": "Abrir ajustes"
  };

  var ERRORS = {
    full: "That run is full.",
    seats: "Not enough seats on that run.",
    name: "Enter a last name.",
    room: "Enter a room number.",
    phone: "No phone number. Use a last name or a room.",
    destination: "Enter where they are going.",
    slot: "Pick a departure.",
    role: "You can't change the shuttle list.",
    hotel: "That hotel is not on your list.",
    feature: "Shuttle is off at this hotel.",
    save: "Could not save.",
    already: "Already on the shuttle list.",
    code: "Enter the guest code, letters and numbers only.",
    url: "Enter a link that starts with https://",
    order: "Pick two different hotels.",
    hours: "Last run has to be after the first run.",
    party: "Could not save.",
    bags: "Could not save.",
    flight: "Could not save.",
    notes: "Could not save.",
    parking: "Could not save.",
    none: "No more runs today."
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function normRole(role) { return role === "JR Corporate" ? "Above Property" : (role || ""); }
  function canBook(role) { return !!BOOK_ROLES[normRole(role)]; }
  function canConfigure(role) { return !!SETUP_ROLES[normRole(role)]; }
  function canEditUrl(role) { return normRole(role) === "Above Property"; }
  function isDriver(role) { return normRole(role) === DRIVER; }
  function label(en, lang) {
    var es = PHRASES[en];
    if (es == null) es = en;
    return lang === "es" ? es : en;
  }
  function hotelName(hotel, lang) {
    if (hotel === "MSPAM") return label("Hampton (MSPAM)", lang);
    if (hotel === "MSPMS") return label("SpringHill (MSPMS)", lang);
    return hotel || "";
  }
  function destName(code, lang) {
    if (code === "t1") return label("Airport T1", lang);
    if (code === "t2") return label("Airport T2", lang);
    if (code === "moa") return label("Mall of America", lang);
    if (code === "other") return label("Other", lang);
    return code || label("Other", lang);
  }
  function canonStatus(value) {
    var s = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (s === "complete" || s === "completed") return "done";
    if (s === "noshow") return "no_show";
    if (s === "en_route") return "boarded";
    if (s === "boarded" || s === "no_show" || s === "done" || s === "booked") return s;
    return "booked";
  }
  function canonDest(code, note) {
    var raw = String(code || "").trim();
    var c = raw.toLowerCase();
    var extra = note || "";
    if (c === "t1" || c === "terminal 1" || c === "terminal1" || c === "msp t1" || c === "msp terminal 1") return { destination: "t1", note: extra };
    if (c === "t2" || c === "terminal 2" || c === "terminal2" || c === "msp t2" || c === "msp terminal 2") return { destination: "t2", note: extra };
    if (c === "moa" || c === "mall" || c === "mall of america") return { destination: "moa", note: extra };
    if (c === "other") return { destination: "other", note: extra };
    if (!raw) return { destination: "t1", note: extra };
    return { destination: "other", note: extra || raw };
  }
  function statusName(status, lang) {
    if (status === "boarded") return label("Boarded", lang);
    if (status === "no_show") return label("No-show", lang);
    if (status === "done") return label("Done", lang);
    return label("Booked", lang);
  }
  function defaultSettings(hotel) {
    return {
      hotel: hotel,
      trackingCode: SEED_CODE[hotel] || "",
      slotMinutes: 30,
      seatCapacity: 11,
      openMinute: 0,
      closeMinute: 1440,
      trackUrl: DEFAULT_URL,
      pickupOrder: ["MSPAM", "MSPMS"]
    };
  }
  function defaultFeatures() {
    return [
      { hotel: "MSPWE", feature: FEATURE, enabled: false },
      { hotel: "MSPAM", feature: FEATURE, enabled: true },
      { hotel: "MSPMS", feature: FEATURE, enabled: true }
    ];
  }
  function featureOn(state, hotel) {
    if (typeof document !== "undefined" && root.HotelFeatures && typeof root.HotelFeatures.on === "function") {
      return !!root.HotelFeatures.on(hotel, FEATURE);
    }
    var rows = (state && state.features) || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].hotel === hotel && rows[i].feature === FEATURE) return !!rows[i].enabled;
    }
    return false;
  }
  function poolHotels(state) {
    return ["MSPWE", "MSPAM", "MSPMS"].filter(function (h) { return featureOn(state, h); });
  }
  function poolSettings(state) {
    var a = state.settings && state.settings.MSPAM;
    var b = state.settings && state.settings.MSPMS;
    return a || b || defaultSettings("MSPAM");
  }
  function settingsFor(state, hotel) {
    if (state.settings && state.settings[hotel]) return state.settings[hotel];
    return null;
  }
  function chicagoParts(iso) {
    var d = new Date(iso);
    var g = { year: "", month: "", day: "", hour: "", minute: "" };
    if (isNaN(d.getTime())) return g;
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(d).forEach(function (p) {
      if (Object.prototype.hasOwnProperty.call(g, p.type)) g[p.type] = p.value;
    });
    if (g.hour === "24") g.hour = "00";
    ["month", "day", "hour", "minute"].forEach(function (k) {
      if (g[k] && g[k].length === 1) g[k] = "0" + g[k];
    });
    return g;
  }
  function chicagoDate(iso) {
    var p = chicagoParts(iso);
    return p.year ? p.year + "-" + p.month + "-" + p.day : "";
  }
  function fromChicagoLocal(local) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(local || ""))) return "";
    var offsets = ["-05:00", "-06:00"];
    for (var i = 0; i < offsets.length; i++) {
      var d = new Date(local + ":00" + offsets[i]);
      if (isNaN(d.getTime())) continue;
      var p = chicagoParts(d.toISOString());
      if (p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute === local) return d.toISOString();
    }
    return "";
  }
  function minuteToTime(min) {
    var m = Math.max(0, Math.min(1439, Number(min) || 0));
    return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  }
  function timeToMinute(value) {
    var m = String(value || "").match(/^(\d{2}):(\d{2})$/);
    if (!m) return null;
    var h = Number(m[1]), min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }
  function formatTime(iso, lang) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(lang === "es" ? "es-MX" : "en-US", {
      timeZone: "America/Chicago", hour: "numeric", minute: "2-digit"
    });
  }
  function slotsFor(settings, day) {
    var open = Number(settings.openMinute);
    var close = Number(settings.closeMinute);
    var step = Number(settings.slotMinutes) || 30;
    var out = [];
    if (!day || !(step > 0) || !(close > open)) return out;
    for (var m = open; m < 1440 && m <= close; m += step) {
      var local = day + "T" + minuteToTime(m);
      var iso = fromChicagoLocal(local);
      if (!iso) continue;
      out.push({ departAt: iso, minute: m, local: local });
    }
    return out;
  }
  function sameSlot(a, b) {
    var da = Date.parse(a), db = Date.parse(b);
    if (!isNaN(da) && !isNaN(db)) return da === db;
    return String(a || "") === String(b || "");
  }
  function takenSeats(signups, departAt) {
    return (signups || []).reduce(function (sum, s) {
      if (!sameSlot(s.departAt, departAt) || s.status === "no_show") return sum;
      return sum + (Number(s.partySize) || 0);
    }, 0);
  }
  function seatsLeft(state, departAt) {
    var cap = Number(poolSettings(state).seatCapacity) || 11;
    var used = takenSeats(state.signups, departAt);
    var counts = state && state.dayCounts;
    if (counts && counts.length) {
      for (var i = 0; i < counts.length; i++) {
        if (sameSlot(counts[i].depart_at || counts[i].departAt, departAt)) used = Number(counts[i].seats) || 0;
      }
    }
    return { capacity: cap, used: used, left: Math.max(0, cap - used), full: used >= cap };
  }
  function shouldAlert(departAt, nowIso) {
    var d = Date.parse(departAt), n = Date.parse(nowIso);
    if (isNaN(d) || isNaN(n)) return false;
    var delta = d - n;
    return delta <= 60 * 60 * 1000 && delta >= -5 * 60 * 1000;
  }
  function cleanCode(value) {
    var s = String(value == null ? "" : value).trim();
    if (!s) return "";
    return /^[0-9A-Za-z]{1,12}$/.test(s) ? s : null;
  }
  function trackLink(url, code) {
    var base = String(url || "").trim();
    if (!/^https:\/\//i.test(base)) base = DEFAULT_URL;
    var hash = "";
    var h = base.indexOf("#");
    if (h >= 0) { hash = base.slice(h); base = base.slice(0, h); }
    if (!code) return base + hash;
    var join = base.indexOf("?") >= 0 ? "&" : "?";
    return base + join + "code=" + encodeURIComponent(code) + hash;
  }
  function shareText(lang, code, url) {
    var link = trackLink(url, code);
    var shown = code || "";
    if (lang === "es") {
      return "Recogida del shuttle del hotel. Código TrackMyShuttle " + shown + ". " + link;
    }
    return "Hotel shuttle pickup. TrackMyShuttle code " + shown + ". " + link;
  }
  function qrPayload(url, code) {
    return "TrackMyShuttle code " + (code || "") + "\n" + trackLink(url, code);
  }
  function validName(value) {
    var s = String(value || "").trim();
    if (!s || s.length > 40) return "";
    if (/[0-9]{7,}/.test(s)) return "";
    if (!/^[A-Za-z][A-Za-z .'-]{0,39}$/.test(s)) return "";
    return s;
  }
  function validRoom(value) {
    var s = String(value || "").trim();
    return /^[0-9]{2,4}$/.test(s) ? s : "";
  }
  function cloneSettings(s) {
    var n = Object.assign({}, s || {});
    n.pickupOrder = (s && s.pickupOrder ? s.pickupOrder : ["MSPAM", "MSPMS"]).slice();
    return n;
  }
  function cloneState(state) {
    var settings = {};
    HOTELS.forEach(function (h) { settings[h] = cloneSettings(state.settings[h] || defaultSettings(h)); });
    return {
      origin: state.origin,
      features: (state.features || []).map(function (f) { return Object.assign({}, f); }),
      settings: settings,
      signups: (state.signups || []).map(function (s) { return Object.assign({}, s); })
    };
  }
  function actorHotels(actor, state) {
    var role = normRole(actor && actor.role);
    if (role === "Above Property") return poolHotels(state);
    var home = actor && actor.hotel;
    if (home && featureOn(state, home)) return [home];
    return [];
  }
  function canSeeHotel(actor, state, hotel) {
    if (isDriver(actor && actor.role) && featureOn(state, actor.hotel) && featureOn(state, hotel)) return true;
    return actorHotels(actor, state).indexOf(hotel) >= 0;
  }

  function book(state, input, actor, nowIso) {
    var next = cloneState(state);
    var role = normRole(actor && actor.role);
    var hotel = role === "Above Property" ? (input && input.hotel) : (actor && actor.hotel);
    if (!hotel) hotel = input && input.hotel;
    if (!canBook(actor && actor.role)) return { ok: false, error: "role" };
    if (!featureOn(next, hotel)) return { ok: false, error: "feature" };
    if (actorHotels(actor, next).indexOf(hotel) < 0) return { ok: false, error: "hotel" };
    var dest = input.destination;
    if (DESTS.indexOf(dest) < 0) return { ok: false, error: "destination" };
    var note = String(input.destinationNote || "").trim();
    if (dest === "other") {
      if (!note || note.length > 80) return { ok: false, error: "destination" };
    } else note = "";
    var rawLabel = String((input && (input.room || input.guestLabel)) || "");
    if (/[0-9]{7,}/.test(rawLabel)) return { ok: false, error: "phone" };
    var guest = validRoom(rawLabel);
    if (!guest) return { ok: false, error: "room" };
    var party = Number(input.partySize);
    var bags = input.bags == null || input.bags === "" ? 0 : Number(input.bags);
    if (!Number.isInteger(party) || party < 1 || party > 30) return { ok: false, error: "party" };
    if (!Number.isInteger(bags) || bags < 0 || bags > 20) return { ok: false, error: "bags" };
    var flight = String(input.flightTime || "").trim();
    if (flight && !/^[0-2][0-9]:[0-5][0-9]$/.test(flight)) return { ok: false, error: "flight" };
    var notes = String(input.notes || "").trim();
    if (notes.length > 200) return { ok: false, error: "notes" };
    var cfg = poolSettings(next);
    var day = chicagoDate(input.departAt || nowIso);
    var slotOk = slotsFor(cfg, chicagoDate(input.departAt)).some(function (s) { return sameSlot(s.departAt, input.departAt); });
    if (!slotOk) return { ok: false, error: "slot" };
    var when = Date.parse(input.departAt);
    if (isNaN(when) || when < Date.parse(nowIso) - 10 * 60 * 1000) return { ok: false, error: "slot" };
    var parkingId = input.parkingVisitId ? String(input.parkingVisitId) : "";
    if (parkingId && next.signups.some(function (s) {
      return String(s.parkingVisitId || "") === parkingId && (s.status === "booked" || s.status === "boarded");
    })) return { ok: false, error: "already" };
    var seat = seatsLeft(next, input.departAt);
    if (seat.full || seat.left < 1) return { ok: false, error: "full" };
    if (party > seat.left) return { ok: false, error: "seats" };
    var row = {
      id: "s" + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
      hotel: hotel,
      destination: dest,
      destinationNote: note,
      departAt: input.departAt,
      guestLabel: guest,
      labelKind: "room",
      partySize: party,
      bags: bags,
      notes: notes,
      flightTime: flight,
      status: "booked",
      statusAt: "",
      boardedAt: "",
      noshowAt: "",
      doneAt: "",
      parkingVisitId: parkingId,
      createdAt: nowIso,
      ex: false
    };
    next.signups.push(row);
    return { ok: true, state: next, signup: row, alert: shouldAlert(row.departAt, nowIso) };
  }
  function setStatus(state, id, status, actor, nowIso) {
    if (["boarded", "no_show", "done"].indexOf(status) < 0) return { ok: false, error: "status" };
    var next = cloneState(state);
    var row = next.signups.filter(function (s) { return String(s.id) === String(id); })[0];
    if (!row) return { ok: false, error: "missing" };
    var role = normRole(actor && actor.role);
    var poolStaff = role === "Front Desk" || role === "GM" || role === "AGM" || role === DRIVER;
    var allowed = featureOn(next, row.hotel) && (role === "Above Property" || (poolStaff && featureOn(next, actor.hotel)));
    if (!allowed) return { ok: false, error: "role" };
    row.status = status;
    row.statusAt = nowIso;
    if (status === "boarded") row.boardedAt = nowIso;
    if (status === "no_show") row.noshowAt = nowIso;
    if (status === "done") row.doneAt = nowIso;
    return { ok: true, state: next, signup: row };
  }
  function saveSettings(state, input, actor) {
    if (!canConfigure(actor && actor.role)) return { ok: false, error: "role" };
    var hotel = input.hotel;
    if (!featureOn(state, hotel)) return { ok: false, error: "feature" };
    if (normRole(actor.role) !== "Above Property" && actor.hotel !== hotel) return { ok: false, error: "hotel" };
    var step = Number(input.slotMinutes);
    if ([15, 20, 30, 60].indexOf(step) < 0) return { ok: false, error: "slot" };
    var cap = Number(input.seatCapacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 30) return { ok: false, error: "capacity" };
    var open = Number(input.openMinute);
    var close = Number(input.closeMinute);
    if (!Number.isInteger(open) || !Number.isInteger(close) || open < 0 || close > 1440 || close <= open) return { ok: false, error: "hours" };
    var order = input.pickupOrder || [];
    if (order.length !== 2 || order[0] === order[1] || HOTELS.indexOf(order[0]) < 0 || HOTELS.indexOf(order[1]) < 0) return { ok: false, error: "order" };
    var code = cleanCode(input.trackingCode);
    if (code == null) return { ok: false, error: "code" };
    var next = cloneState(state);
    var url = poolSettings(next).trackUrl || DEFAULT_URL;
    if (canEditUrl(actor.role)) {
      var raw = String(input.trackUrl || "").trim();
      if (!/^https:\/\//i.test(raw)) return { ok: false, error: "url" };
      url = raw;
    }
    HOTELS.forEach(function (h) {
      var row = next.settings[h];
      row.slotMinutes = step;
      row.seatCapacity = cap;
      row.openMinute = open;
      row.closeMinute = close;
      row.trackUrl = url;
      row.pickupOrder = order.slice();
    });
    next.settings[hotel].trackingCode = code;
    return { ok: true, state: next };
  }
  function ridership(state, day) {
    var out = {};
    (state.signups || []).forEach(function (s) {
      if (chicagoDate(s.departAt) !== day) return;
      var key = s.hotel + "|" + s.destination;
      if (!out[key]) out[key] = { hotel: s.hotel, destination: s.destination, signedUp: 0, rode: 0 };
      if (s.status !== "no_show") out[key].signedUp += Number(s.partySize) || 0;
      if (s.status === "boarded" || s.status === "done") out[key].rode += Number(s.partySize) || 0;
    });
    return Object.keys(out).map(function (k) { return out[k]; }).sort(function (a, b) {
      return a.hotel.localeCompare(b.hotel) || String(a.destination).localeCompare(String(b.destination));
    });
  }
  function buildAlert(signup, lang) {
    if (!signup) return null;
    var body = hotelName(signup.hotel, lang) + " · " + formatTime(signup.departAt, lang) + " · " + destName(signup.destination, lang) + " · " + signup.partySize + " " + label("guests", lang);
    return {
      title: "New shuttle signup",
      body: body,
      hotels: ["MSPAM", "MSPMS"],
      roles: [DRIVER],
      kind: "shuttle_signup"
    };
  }
  function draftFromParking(visit) {
    var room = visit && /^[0-9]{2,4}$/.test(String(visit.room || "")) ? String(visit.room) : "";
    var confirm = String(visit && visit.pfConfirm || "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 24);
    return {
      hotel: visit && visit.hotel,
      destination: "t1",
      destinationNote: "",
      labelKind: "room",
      guestLabel: room,
      partySize: 1,
      bags: 1,
      flightTime: "",
      notes: confirm ? "Park & Fly " + confirm : "Park & Fly",
      parkingVisitId: visit ? String(visit.id) : ""
    };
  }
  function pickupGroups(signups, settings) {
    var order = (settings.pickupOrder || ["MSPAM", "MSPMS"]).slice();
    (signups || []).forEach(function (s) { if (order.indexOf(s.hotel) < 0) order.push(s.hotel); });
    return order.map(function (hotel) {
      return {
        hotel: hotel,
        rows: (signups || []).filter(function (s) { return s.hotel === hotel; }).sort(function (a, b) {
          return (DEST_ORDER[a.destination] - DEST_ORDER[b.destination]) || String(a.createdAt).localeCompare(String(b.createdAt));
        })
      };
    }).filter(function (g) { return g.rows.length; });
  }
  function runsFor(state, day) {
    var cfg = poolSettings(state);
    return slotsFor(cfg, day).map(function (slot) {
      var rows = (state.signups || []).filter(function (s) { return sameSlot(s.departAt, slot.departAt); });
      return { slot: slot, seat: seatsLeft(state, slot.departAt), groups: pickupGroups(rows, cfg) };
    }).filter(function (run) { return run.groups.length; });
  }

  function buildDemo(now) {
    var settings = {};
    HOTELS.forEach(function (h) { settings[h] = defaultSettings(h); });
    var day = chicagoDate(now);
    function at(hh, mm) { return fromChicagoLocal(day + "T" + pad(hh) + ":" + pad(mm)); }
    function row(partial) {
      return Object.assign({
        destinationNote: "", bags: 1, notes: "", flightTime: "", status: "booked",
        statusAt: "", boardedAt: "", noshowAt: "", doneAt: "", parkingVisitId: "",
        createdAt: now, ex: true, labelKind: "room"
      }, partial);
    }
    return {
      origin: "example",
      features: defaultFeatures(),
      settings: settings,
      signups: [
        row({ id: "ex1", hotel: "MSPAM", destination: "moa", departAt: at(12, 0), guestLabel: "412", partySize: 3, bags: 4, status: "done", statusAt: at(12, 40), doneAt: at(12, 40), boardedAt: at(12, 8) }),
        row({ id: "ex2", hotel: "MSPMS", destination: "t1", departAt: at(9, 0), guestLabel: "308", partySize: 2, bags: 2, status: "no_show", statusAt: at(9, 12), noshowAt: at(9, 12) }),
        row({ id: "ex3", hotel: "MSPAM", destination: "t1", departAt: at(17, 0), guestLabel: "118", partySize: 2, bags: 2, flightTime: "19:10", status: "booked" }),
        row({ id: "ex4", hotel: "MSPMS", destination: "t2", departAt: at(17, 0), guestLabel: "220", partySize: 1, bags: 1, status: "boarded", statusAt: at(17, 6), boardedAt: at(17, 6) }),
        row({ id: "ex5", hotel: "MSPAM", destination: "t2", departAt: at(18, 0), guestLabel: "214", partySize: 4, bags: 5, flightTime: "20:05", status: "booked" }),
        row({ id: "ex6", hotel: "MSPMS", destination: "other", destinationNote: "Light rail", departAt: at(18, 0), guestLabel: "109", partySize: 1, bags: 0, status: "booked" })
      ]
    };
  }

  /* QR, byte mode, ECC M, versions 1–6. Mask 0. Payload is ASCII: code plus the TrackMyShuttle link. */
  var GF_EXP = new Array(512);
  var GF_LOG = new Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();
  function gfMul(a, b) {
    if (!a || !b) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }
  function rsGenerator(ecLen) {
    var gen = [1];
    for (var i = 0; i < ecLen; i++) {
      var alpha = GF_EXP[i];
      var out = new Array(gen.length + 1);
      for (var z = 0; z < out.length; z++) out[z] = 0;
      for (var j = 0; j < gen.length; j++) {
        out[j] ^= gen[j];
        out[j + 1] ^= gfMul(gen[j], alpha);
      }
      gen = out;
    }
    return gen;
  }
  function rsEncode(data, ecLen) {
    var gen = rsGenerator(ecLen);
    var res = data.concat(new Array(ecLen).fill(0));
    for (var i = 0; i < data.length; i++) {
      var coef = res[i];
      if (!coef) continue;
      for (var j = 0; j < gen.length; j++) res[i + j] ^= gfMul(gen[j], coef);
    }
    return res.slice(data.length);
  }
  var QR_VER = {
    1: { ec: 10, blocks: 1, data: 16, align: [] },
    2: { ec: 16, blocks: 1, data: 28, align: [6, 18] },
    3: { ec: 26, blocks: 1, data: 44, align: [6, 22] },
    4: { ec: 18, blocks: 2, data: 32, align: [6, 26] },
    5: { ec: 24, blocks: 2, data: 43, align: [6, 30] },
    6: { ec: 16, blocks: 4, data: 27, align: [6, 34] }
  };
  function qrCapacity(version) {
    var spec = QR_VER[version];
    return Math.floor((spec.blocks * spec.data * 8 - 12 - 4) / 8);
  }
  function chooseVersion(len) {
    for (var v = 1; v <= 6; v++) if (qrCapacity(v) >= len) return v;
    return 0;
  }
  function bytesOf(text) {
    var out = [];
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if (c > 255) return null;
      out.push(c);
    }
    return out;
  }
  function encodeData(text, version) {
    var spec = QR_VER[version];
    var total = spec.blocks * spec.data;
    var raw = bytesOf(text);
    if (!raw) return null;
    var bits = [];
    function put(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    }
    put(0x4, 4);
    put(raw.length, 8);
    raw.forEach(function (b) { put(b, 8); });
    var cap = total * 8;
    var term = Math.min(4, cap - bits.length);
    if (term < 0) return null;
    put(0, term);
    while (bits.length % 8) bits.push(0);
    var pads = [0xEC, 0x11], pi = 0;
    while (bits.length < cap) { put(pads[pi % 2], 8); pi++; }
    var out = [];
    for (var i = 0; i < bits.length; i += 8) {
      var n = 0;
      for (var b = 0; b < 8; b++) n = (n << 1) | bits[i + b];
      out.push(n);
    }
    return out;
  }
  function interleave(version, data) {
    var spec = QR_VER[version];
    var blocks = [];
    var ecs = [];
    for (var i = 0; i < spec.blocks; i++) {
      var slice = data.slice(i * spec.data, (i + 1) * spec.data);
      blocks.push(slice);
      ecs.push(rsEncode(slice, spec.ec));
    }
    var out = [];
    for (var c = 0; c < spec.data; c++) blocks.forEach(function (b) { if (c < b.length) out.push(b[c]); });
    for (var e = 0; e < spec.ec; e++) ecs.forEach(function (b) { out.push(b[e]); });
    return out;
  }
  function blank(size) {
    var m = [], f = [];
    for (var r = 0; r < size; r++) {
      m.push(new Array(size).fill(false));
      f.push(new Array(size).fill(false));
    }
    return { m: m, f: f };
  }
  function paint(grid, r, c, on) {
    grid.m[r][c] = !!on;
    grid.f[r][c] = true;
  }
  function drawFinder(grid, r0, c0) {
    for (var dr = -1; dr <= 7; dr++) {
      for (var dc = -1; dc <= 7; dc++) {
        var r = r0 + dr, c = c0 + dc;
        if (r < 0 || c < 0 || r >= grid.m.length || c >= grid.m.length) continue;
        var edge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        var core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        var on = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (edge || core);
        paint(grid, r, c, on);
      }
    }
  }
  function drawAlign(grid, cx, cy) {
    for (var dr = -2; dr <= 2; dr++) {
      for (var dc = -2; dc <= 2; dc++) {
        var on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
        paint(grid, cy + dr, cx + dc, on);
      }
    }
  }
  function overlapsFinder(size, x, y) {
    if (x <= 8 && y <= 8) return true;
    if (x >= size - 9 && y <= 8) return true;
    if (x <= 8 && y >= size - 9) return true;
    return false;
  }
  function reserveFormat(grid) {
    var size = grid.m.length;
    var voffset = 0;
    var hoffset = 0;
    for (var i = 0; i < 8; i++) {
      if (i === 6) { voffset += 1; hoffset = 1; }
      grid.f[i + voffset][8] = true;
      grid.f[8][i + hoffset] = true;
      grid.f[8][size - 1 - i] = true;
      grid.f[size - 1 - i][8] = true;
    }
    grid.f[size - 8][8] = true;
  }
  function formatBits(mask) {
    var data = mask & 7;
    var rem = data << 10;
    for (var i = 14; i >= 10; i--) {
      if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
    }
    return (((data << 10) | (rem & 0x3ff)) ^ 0x5412) & 0x7fff;
  }
  function writeFormat(grid, bits) {
    var size = grid.m.length;
    var voffset = 0;
    var hoffset = 0;
    for (var i = 0; i < 8; i++) {
      var vbit = (bits >> i) & 1;
      var hbit = (bits >> (14 - i)) & 1;
      if (i === 6) { voffset += 1; hoffset = 1; }
      paint(grid, i + voffset, 8, vbit === 1);
      paint(grid, 8, i + hoffset, hbit === 1);
      paint(grid, 8, size - 1 - i, vbit === 1);
      paint(grid, size - 1 - i, 8, hbit === 1);
    }
    paint(grid, size - 8, 8, true);
  }
  function placeData(grid, codewords) {
    var size = grid.m.length;
    var bits = [];
    codewords.forEach(function (w) {
      for (var b = 7; b >= 0; b--) bits.push((w >>> b) & 1);
    });
    var idx = 0;
    for (var col0 = size - 1; col0 > 0; col0 -= 2) {
      var right = col0 <= 6 ? col0 - 1 : col0;
      for (var vertical = 0; vertical < size; vertical++) {
        for (var z = 0; z < 2; z++) {
          var j = right - z;
          if (j < 0) continue;
          var upwards = (right & 2) === 0;
          if (j < 6) upwards = !upwards;
          var i = upwards ? size - 1 - vertical : vertical;
          if (grid.f[i][j]) continue;
          var bit = idx < bits.length ? bits[idx++] : 0;
          var flip = ((i + j) % 2) === 0;
          grid.m[i][j] = flip ? bit === 0 : bit === 1;
        }
      }
    }
  }
  function qrMatrix(text) {
    var version = chooseVersion(text.length);
    if (!version) {
      var link = text.split("\n").pop();
      version = chooseVersion(link.length);
      text = link;
    }
    if (!version) return [];
    var data = encodeData(text, version);
    if (!data) return [];
    var codewords = interleave(version, data);
    var size = 21 + 4 * (version - 1);
    var grid = blank(size);
    drawFinder(grid, 0, 0);
    drawFinder(grid, 0, size - 7);
    drawFinder(grid, size - 7, 0);
    for (var i = 0; i < size; i++) {
      if (!grid.f[6][i]) paint(grid, 6, i, i % 2 === 0);
      if (!grid.f[i][6]) paint(grid, i, 6, i % 2 === 0);
    }
    var align = QR_VER[version].align;
    for (var a = 0; a < align.length; a++) {
      for (var b = 0; b < align.length; b++) {
        if (overlapsFinder(size, align[a], align[b])) continue;
        drawAlign(grid, align[a], align[b]);
      }
    }
    paint(grid, 4 * version + 9, 8, true);
    reserveFormat(grid);
    placeData(grid, codewords);
    writeFormat(grid, formatBits(0));
    return grid.m;
  }
  function qrSvg(text, title) {
    var m = qrMatrix(text);
    if (!m.length) return "";
    var n = m.length;
    var qz = 4;
    var s = n + qz * 2;
    var rects = [];
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (m[r][c]) rects.push("<rect x=\"" + (c + qz) + "\" y=\"" + (r + qz) + "\" width=\"1\" height=\"1\"/>");
      }
    }
    return "<svg class=\"sh-qr\" id=\"shQr\" viewBox=\"0 0 " + s + " " + s + "\" role=\"img\" aria-label=\"" + esc(title || "QR") + "\" shape-rendering=\"crispEdges\"><rect width=\"" + s + "\" height=\"" + s + "\" fill=\"#fff\"/><g fill=\"#14365d\">" + rects.join("") + "</g></svg>";
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function viewingDriver(actor) {
    var view = normRole(actor && (actor.view || actor.role));
    return view === DRIVER;
  }
  function seatTone(left) {
    var n = Number(left);
    if (!(n > 0)) return "full";
    if (n <= 3) return "low";
    return "ok";
  }
  function slotLabel(slot, seat, now, lang) {
    var when = formatTime(slot.departAt, lang);
    var past = Date.parse(slot.departAt) < Date.parse(now) - 10 * 60 * 1000;
    if (past) return when + " · " + label("Past", lang);
    if (seatTone(seat.left) === "full") return when + " · " + label("Full", lang);
    return when + " · " + seat.left + " " + label("seats left", lang);
  }
  function seesEveryHotel(role) {
    return normRole(role) === "Above Property";
  }
  function shortHotel(hotel) {
    if (hotel === "MSPAM") return "Hampton";
    if (hotel === "MSPMS") return "SpringHill";
    return hotel || "";
  }
  function takenLine(seats, hotel, lang) {
    var n = Number(seats) || 0;
    var word = n === 1 ? label("seat taken by", lang) : label("seats taken by", lang);
    return n + " " + word + " " + shortHotel(hotel);
  }
  function queueModel(signups, hotel, role, otherSeats) {
    var rows = signups || [];
    if (seesEveryHotel(role)) return { detail: rows.slice(), other: [] };
    var detail = rows.filter(function (s) { return s && s.hotel === hotel; });
    var map = {};
    rows.forEach(function (s) {
      if (!s || s.hotel === hotel || s.status === "no_show") return;
      var key = String(s.departAt || "") + "|" + s.hotel;
      if (!map[key]) map[key] = { departAt: s.departAt, hotel: s.hotel, seats: 0 };
      map[key].seats += Number(s.partySize) || 0;
    });
    var other = Object.keys(map).map(function (k) { return map[k]; }).filter(function (row) { return row.seats > 0; });
    if (!other.length && otherSeats && otherSeats.length) other = otherSeats.filter(function (row) { return row && row.seats > 0 && row.hotel !== hotel; });
    return { detail: detail, other: other };
  }
  function trackHotels(state, role, hotel) {
    if (seesEveryHotel(role)) return poolHotels(state);
    return hotel ? [hotel] : [];
  }
  function guestBits(row, lang) {
    var room = validRoom(row && row.guestLabel);
    var guests = Number(row && row.partySize) || 0;
    var parts = [hotelName(row && row.hotel, lang)];
    if (room) parts.push(label("Room", lang) + " " + room);
    parts.push(guests + " " + label("guests", lang));
    return parts.join(" · ");
  }
  function guestLine(row, lang) {
    var dest = destName(row.destination, lang);
    if (row.destination === "other" && row.destinationNote) dest += " · " + row.destinationNote;
    var extra = row.bags + " " + label("bags", lang);
    if (row.flightTime) extra += " · " + label("Flight", lang) + " " + row.flightTime;
    if (row.notes) extra += " · " + row.notes;
    var stamp = row.statusAt ? " · " + formatTime(row.statusAt, lang) : "";
    var ex = row.ex ? " <span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span>" : "";
    return "<b>" + esc(guestBits(row, lang)) + "</b> " + ex + "<br><small>" + esc(dest) + " · " + esc(extra) + " · " + esc(statusName(row.status, lang)) + esc(stamp) + "</small>";
  }
  function slotCard(slot, seat, signups, lang, opts) {
    opts = opts || {};
    var tone = seatTone(seat.left);
    var past = !!opts.past;
    var disabled = past || tone === "full";
    var selected = !!opts.selected && !disabled;
    var pct = seat.capacity ? Math.max(0, Math.min(100, Math.round((100 * seat.used) / seat.capacity))) : 0;
    var big = tone === "full" ? label("Full", lang) : String(seat.left);
    var small = tone === "full" ? label("Full", lang) : label("seats left", lang);
    var people = (signups || []).map(function (row) {
      if (row && row.aggregate) return "<li class=\"sh-agg\">" + esc(takenLine(row.seats, row.hotel, lang)) + "</li>";
      return "<li>" + esc(guestBits(row, lang)) + "</li>";
    }).join("");
    return "<label class=\"sh-slot sh-" + tone + (past ? " sh-past" : "") + (selected ? " is-on" : "") + "\">" +
      "<input type=\"radio\" name=\"shSlotPick\" value=\"" + esc(slot.departAt) + "\"" + (selected ? " checked" : "") + (disabled ? " disabled" : "") + " onchange=\"shDraft('departAt', this.value)\">" +
      "<span class=\"sh-slot-top\"><span class=\"sh-slot-time\">" + esc(formatTime(slot.departAt, lang)) + "</span>" +
      "<span class=\"sh-slot-left\"><b>" + esc(big) + "</b> <span>" + esc(small) + "</span></span></span>" +
      "<span class=\"sh-bar\" aria-hidden=\"true\"><i style=\"width:" + pct + "%\"></i></span>" +
      (people ? "<ul class=\"sh-slot-pax\">" + people + "</ul>" : "") + "</label>";
  }
  function pickupCard(settings, hotel, lang, suffix) {
    var tail = suffix ? "-" + suffix : "";
    var code = settings && settings.trackingCode || "";
    var url = settings && settings.trackUrl || DEFAULT_URL;
    var link = trackLink(url, code);
    var payload = qrPayload(url, code);
    var qrTitle = label("TrackMyShuttle guest code", lang) + " " + code + ". " + link;
    var codeHtml = code
      ? "<b id=\"shCode" + tail + "\">" + esc(code) + "</b><small>" + esc(hotelName(hotel, lang)) + " · " + esc(label("Guest code", lang)) + "</small>"
      : "<b id=\"shCode" + tail + "\">—</b><small>" + esc(label("No guest code yet. A GM can add it.", lang)) + "</small>";
    var arg = suffix ? "('" + esc(suffix) + "')" : "()";
    return "<section class=\"card sh-pickup\" id=\"shPickup" + tail + "\"><h3>" + esc(label("Pickups: TrackMyShuttle", lang)) + "</h3><p class=\"sh-note\">" + esc(label("Airport and mall pickups are in TrackMyShuttle. This list is only for rides leaving the hotel.", lang)) + "</p><div class=\"sh-code-row\"><div class=\"sh-code\">" + codeHtml + "</div><button type=\"button\" class=\"btn\" id=\"shCopy" + tail + "\" onclick=\"shCopyCode" + arg + "\">" + esc(label("Copy code", lang)) + "</button></div><a class=\"btn sh-track\" id=\"shTrack" + tail + "\" href=\"" + esc(link) + "\" target=\"_blank\" rel=\"noopener\">" + esc(label("Pickups: TrackMyShuttle", lang)) + "</a><button type=\"button\" class=\"btn2\" id=\"shShare" + tail + "\" onclick=\"shCopyShare" + arg + "\">" + esc(label("Copy guest message", lang)) + "</button>" + qrSvg(payload, qrTitle).replace(" id=\"shQr\"", " id=\"shQr" + tail + "\"") + "<p class=\"sh-note\">" + esc(label("Show this code and QR to the guest.", lang)) + "</p></section>";
  }
  function renderShuttle(state, opts) {
    var lang = opts.lang === "es" ? "es" : "en";
    var actor = opts.actor || {};
    var now = opts.now;
    var hotel = opts.hotel;
    var ui = opts.ui || {};
    if (state.origin === "loading") {
      return "<div class=\"raw sh\" id=\"shRoot\"><h2>" + esc(label("Shuttle", lang)) + "</h2><p>" + esc(label("Loading shuttle…", lang)) + "</p></div>";
    }
    var role = normRole(actor.role);
    var shuttleRole = role === "Above Property" || role === "GM" || role === "AGM" || role === "Front Desk" || role === DRIVER;
    var poolHere = featureOn(state, hotel) || (isDriver(role) && featureOn(state, actor.hotel));
    if (!shuttleRole || !poolHere) {
      return "<div class=\"raw sh\" id=\"shRoot\"><h2>" + esc(label("Shuttle", lang)) + "</h2><div class=\"card\"><p>" + esc(label("No shuttle at this property.", lang)) + "</p></div></div>";
    }
    var banner = state.origin === "supabase" ? "" : "<p class=\"sh-note\"><span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span> " + esc(label("Sample rides for this demo. Not real guests.", lang)) + "</p>";
    var err = ui.error ? "<p class=\"bad\" id=\"shErr\">" + esc(label(ERRORS[ui.error] || "Could not save.", lang)) + "</p>" : "";
    var noticeKey = ui.notice === "booked" ? "Signed up." : ui.notice === "copied" ? "Code copied." : ui.notice === "shared" ? "Guest message copied." : ui.notice === "settings" ? "Settings saved." : ui.notice === "reset" ? "Sample data reset." : ui.notice === "copyfail" ? "Could not copy." : "";
    var notice = noticeKey ? "<p class=\"sh-note\" id=\"shNotice\">" + esc(label(noticeKey, lang)) + "</p>" : "";
    var driver = viewingDriver(actor);
    var body = driver ? renderDriver(state, actor, now, lang) : (ui.screen === "config" ? renderConfig(state, hotel, lang, actor) : renderDesk(state, actor, now, hotel, lang, ui));
    return "<div class=\"raw sh\" id=\"shRoot\"><h2>" + esc(label(driver ? "Driver runs" : "Outbound shuttle", lang)) + "</h2>" + banner + err + notice + body + "</div>";
  }
  function renderDesk(state, actor, now, hotel, lang, ui) {
    var day = chicagoDate(now);
    var intro = "<p class=\"sh-note\">" + esc(label("One van for Hampton and SpringHill. Sign up rides that leave the hotel. Seats are shared.", lang)) + "</p>";
    var form = canBook(actor.role) ? renderForm(state, now, hotel, lang, ui, actor.role) : "";
    var today = (state.signups || []).filter(function (s) {
      return featureOn(state, s.hotel) && chicagoDate(s.departAt) === day;
    });
    var model = queueModel(today, hotel, actor.role, state.otherSeats);
    var groups = pickupGroups(model.detail, poolSettings(state));
    var otherDay = {};
    model.other.forEach(function (row) {
      otherDay[row.hotel] = (otherDay[row.hotel] || 0) + row.seats;
    });
    var agg = Object.keys(otherDay).map(function (code) {
      return "<p class=\"sh-agg\" id=\"shAgg-" + esc(code) + "\">" + esc(takenLine(otherDay[code], code, lang)) + "</p>";
    }).join("");
    var list = "<section class=\"card\" id=\"shList\"><h3>" + esc(label("Today's sign-ups", lang)) + "</h3>" + (groups.length ? groups.map(function (g) {
      return "<h3>" + esc(hotelName(g.hotel, lang)) + "</h3>" + g.rows.map(function (row) {
        return "<div class=\"sh-guest\" id=\"shRow-" + esc(row.id) + "\">" + guestLine(row, lang) + "</div>";
      }).join("");
    }).join("") : "<p>" + esc(label("No sign-ups yet.", lang)) + "</p>") + agg + "</section>";
    var ride = canConfigure(actor.role) ? renderRidership(state, day, lang, actor) : "";
    var setup = canConfigure(actor.role) ? "<button type=\"button\" class=\"btn2\" id=\"shConfig\" onclick=\"shScreen('config')\">" + esc(label("Open settings", lang)) + "</button>" : "";
    var reset = state.origin === "example" ? "<button type=\"button\" class=\"btn2\" onclick=\"shReset()\">" + esc(label("Reset sample data", lang)) + "</button>" : "";
    var codes = trackHotels(state, actor.role, hotel).map(function (h, i) {
      return pickupCard(settingsFor(state, h) || defaultSettings(h), h, lang, i === 0 ? "" : h);
    }).join("");
    return intro + codes + form + list + ride + "<div class=\"sh-actions\">" + setup + reset + "</div>";
  }
  function renderForm(state, now, hotel, lang, ui, role) {
    var draft = ui.draft || {};
    var cfg = poolSettings(state);
    var day = chicagoDate(now);
    var slots = slotsFor(cfg, day);
    var future = slots.filter(function (s) { return Date.parse(s.departAt) >= Date.parse(now) - 10 * 60 * 1000; });
    var openSlots = future.filter(function (s) { return seatTone(seatsLeft(state, s.departAt).left) !== "full"; });
    var selected = draft.departAt || (openSlots[0] && openSlots[0].departAt) || "";
    var selectedOpen = openSlots.some(function (s) { return sameSlot(s.departAt, selected); });
    if (!selectedOpen) selected = (openSlots[0] && openSlots[0].departAt) || "";
    var seat = selected ? seatsLeft(state, selected) : { left: 0, full: true, capacity: cfg.seatCapacity, used: cfg.seatCapacity };
    var model = queueModel(state.signups || [], hotel, role, state.otherSeats);
    var cards = future.map(function (slot) {
      var info = seatsLeft(state, slot.departAt);
      var rows = model.detail.filter(function (s) { return sameSlot(s.departAt, slot.departAt); });
      model.other.filter(function (s) { return sameSlot(s.departAt, slot.departAt); }).forEach(function (row) {
        rows.push({ aggregate: true, seats: row.seats, hotel: row.hotel });
      });
      return slotCard(slot, info, rows, lang, { selected: sameSlot(slot.departAt, selected) });
    }).join("");
    var dest = draft.destination || "t1";
    var maxParty = Math.max(0, Number(seat.left) || 0);
    var party = Number(draft.partySize) || 1;
    if (party < 1) party = 1;
    if (maxParty && party > maxParty) party = maxParty;
    var park = draft.parkingVisitId ? "<p class=\"sh-note\" id=\"shParkNote\">" + esc(label("From a Park & Fly car. Add a room number. The plate is not stored here.", lang)) + "</p>" : "";
    var none = future.length ? "" : "<p class=\"sh-full\" id=\"shNone\">" + esc(label("No more runs today.", lang)) + "</p>";
    var hotelLine = "<p class=\"sh-note\" id=\"shHotel\">" + esc(label("Hotel", lang)) + ": <b>" + esc(hotelName(hotel, lang)) + "</b></p>";
    return "<form class=\"card\" id=\"shForm\" onsubmit=\"shBook(event)\"><h3>" + esc(label("Sign up a guest", lang)) + "</h3>" + park + hotelLine +
      "<label class=\"sh-field\">" + esc(label("Destination", lang)) + "<select id=\"shDest\" onchange=\"shDraft('destination', this.value)\">" + DESTS.map(function (d) {
        return "<option value=\"" + d + "\"" + (d === dest ? " selected" : "") + ">" + esc(destName(d, lang)) + "</option>";
      }).join("") + "</select></label>" +
      (dest === "other" ? "<label class=\"sh-field\">" + esc(label("Where to", lang)) + "<input id=\"shOther\" maxlength=\"80\" value=\"" + esc(draft.destinationNote || "") + "\"></label>" : "<input id=\"shOther\" type=\"hidden\" value=\"\">") +
      "<div class=\"sh-slots\" id=\"shSlots\" role=\"radiogroup\" aria-label=\"" + esc(label("Departure", lang)) + "\">" + cards + "</div>" + none +
      "<label class=\"sh-field\">" + esc(label("Room number", lang)) + "<input id=\"shRoom\" inputmode=\"numeric\" maxlength=\"4\" required autocomplete=\"off\" value=\"" + esc(draft.guestLabel || "") + "\"></label>" +
      "<label class=\"sh-field\">" + esc(label("Number of guests", lang)) + "<input id=\"shParty\" type=\"number\" min=\"1\" max=\"" + (maxParty || 1) + "\" step=\"1\" inputmode=\"numeric\" required value=\"" + esc(maxParty ? party : "") + "\"" + (maxParty ? "" : " disabled") + "></label>" +
      "<label class=\"sh-field\">" + esc(label("Bags", lang)) + "<input id=\"shBags\" type=\"number\" min=\"0\" max=\"20\" inputmode=\"numeric\" value=\"" + esc(draft.bags == null ? 0 : draft.bags) + "\"></label>" +
      "<label class=\"sh-field\">" + esc(label("Flight time", lang)) + " (" + esc(label("Optional", lang)) + ")<input id=\"shFlight\" type=\"time\" value=\"" + esc(draft.flightTime || "") + "\"></label>" +
      "<label class=\"sh-field\">" + esc(label("Notes", lang)) + " (" + esc(label("Optional", lang)) + ")<input id=\"shNotes\" maxlength=\"200\" value=\"" + esc(draft.notes || "") + "\"></label>" +
      "<button type=\"submit\" class=\"btn\" id=\"shSave\"" + (maxParty ? "" : " disabled") + ">" + esc(label("Add to run", lang)) + "</button></form>";
  }
  function renderDriver(state, actor, now, lang) {
    var day = chicagoDate(now);
    var cfg = poolSettings(state);
    var home = featureOn(state, actor.hotel) ? actor.hotel : "MSPAM";
    var codes = trackHotels(state, actor.role, home).map(function (h) {
      var row = settingsFor(state, h) || defaultSettings(h);
      return pickupCard(row, h, lang, h);
    }).join("");
    var runs = runsFor(state, day);
    var model = queueModel(state.signups || [], home, actor.role, state.otherSeats);
    var body = runs.length ? runs.map(function (run) {
      var head = formatTime(run.slot.departAt, lang) + " · " + run.seat.used + "/" + run.seat.capacity;
      var own = model.detail.filter(function (s) { return sameSlot(s.departAt, run.slot.departAt); });
      var agg = model.other.filter(function (s) { return sameSlot(s.departAt, run.slot.departAt); }).map(function (row) {
        return "<p class=\"sh-agg\">" + esc(takenLine(row.seats, row.hotel, lang)) + "</p>";
      }).join("");
      var groups = pickupGroups(own, cfg).map(function (g) {
        return "<h3>" + esc(label("Pickup at", lang)) + " " + esc(hotelName(g.hotel, lang)) + "</h3>" + g.rows.map(function (row) {
          var buttons = "<div class=\"sh-actions\">" + ["boarded", "no_show", "done"].map(function (st) {
            var cls = row.status === st ? "btn" : "btn2";
            return "<button type=\"button\" class=\"" + cls + "\" onclick=\"shStatus('" + esc(row.id) + "','" + st + "')\">" + esc(statusName(st, lang)) + "</button>";
          }).join("") + "</div>";
          return "<div class=\"sh-guest\" id=\"shRow-" + esc(row.id) + "\">" + guestLine(row, lang) + buttons + "</div>";
        }).join("");
      }).join("");
      return "<section class=\"card sh-run\"><h3>" + esc(head) + (run.seat.full ? " · " + esc(label("Full", lang)) : "") + "</h3>" + groups + agg + "</section>";
    }).join("") : "<div class=\"card\"><p>" + esc(label("No sign-ups yet.", lang)) + "</p></div>";
    return "<p class=\"sh-note\">" + esc(hotelName(home, lang)) + "</p>" + codes + body;
  }
  function renderRidership(state, day, lang, actor) {
    var rows = ridership(state, day);
    if (!seesEveryHotel(actor && actor.role)) {
      var own = actor && actor.hotel;
      rows = rows.filter(function (row) { return row.hotel === own; });
    }
    var body = rows.length ? "<table class=\"sh-t\"><tr><th>" + esc(label("Hotel", lang)) + "</th><th>" + esc(label("Destination", lang)) + "</th><th>" + esc(label("Signed up", lang)) + "</th><th>" + esc(label("Rode", lang)) + "</th></tr>" + rows.map(function (r) {
      return "<tr><td>" + esc(r.hotel) + "</td><td>" + esc(destName(r.destination, lang)) + "</td><td>" + r.signedUp + "</td><td>" + r.rode + "</td></tr>";
    }).join("") + "</table>" : "<p>" + esc(label("No rides recorded today.", lang)) + "</p>";
    return "<section class=\"card\" id=\"shRide\"><h3>" + esc(label("Ridership today", lang)) + "</h3>" + body + "</section>";
  }
  function renderConfig(state, hotel, lang, actor) {
    var cfg = settingsFor(state, hotel) || poolSettings(state);
    var pool = poolSettings(state);
    var urlField = canEditUrl(actor.role)
      ? "<label class=\"sh-field\">" + esc(label("TrackMyShuttle link", lang)) + "<input id=\"shUrl\" type=\"url\" value=\"" + esc(pool.trackUrl || DEFAULT_URL) + "\"></label>"
      : "<p class=\"sh-note\">" + esc(label("Corporate sets the TrackMyShuttle link.", lang)) + "</p><p class=\"sh-note\" id=\"shUrlShown\">" + esc(pool.trackUrl || DEFAULT_URL) + "</p>";
    var order = pool.pickupOrder || ["MSPAM", "MSPMS"];
    function hotelOpts(selected) {
      return HOTELS.map(function (h) {
        return "<option value=\"" + h + "\"" + (h === selected ? " selected" : "") + ">" + esc(hotelName(h, lang)) + "</option>";
      }).join("");
    }
    return "<button type=\"button\" class=\"btn2\" onclick=\"shScreen('desk')\">" + esc(label("Back", lang)) + "</button><form class=\"card\" id=\"shCfg\" onsubmit=\"shSaveSettings(event)\"><h3>" + esc(label("Shuttle settings", lang)) + " · " + esc(hotel) + "</h3>" +
      "<label class=\"sh-field\">" + esc(label("Guest code", lang)) + "<input id=\"shTrackCode\" maxlength=\"12\" autocomplete=\"off\" value=\"" + esc(cfg.trackingCode || "") + "\"></label>" +
      "<label class=\"sh-field\">" + esc(label("Departure every", lang)) + "<select id=\"shStep\">" + [15, 20, 30, 60].map(function (n) {
        return "<option value=\"" + n + "\"" + (pool.slotMinutes === n ? " selected" : "") + ">" + n + " " + esc(label("minutes", lang)) + "</option>";
      }).join("") + "</select></label>" +
      "<label class=\"sh-field\">" + esc(label("Seats per run", lang)) + "<input id=\"shCap\" type=\"number\" min=\"1\" max=\"30\" value=\"" + esc(pool.seatCapacity) + "\"></label>" +
      "<label class=\"sh-field\">" + esc(label("First run", lang)) + "<input id=\"shOpen\" type=\"time\" value=\"" + esc(minuteToTime(pool.openMinute)) + "\"></label>" +
      "<label class=\"sh-field\">" + esc(label("Last run", lang)) + "<input id=\"shClose\" type=\"time\" value=\"" + esc(minuteToTime(pool.closeMinute)) + "\"></label>" +
      urlField +
      "<label class=\"sh-field\">" + esc(label("First pickup", lang)) + "<select id=\"shFirst\">" + hotelOpts(order[0]) + "</select></label>" +
      "<label class=\"sh-field\">" + esc(label("Second pickup", lang)) + "<select id=\"shSecond\">" + hotelOpts(order[1] || "MSPMS") + "</select></label>" +
      "<button type=\"submit\" class=\"btn\" id=\"shSaveCfg\">" + esc(label("Save settings", lang)) + "</button></form>";
  }

  var api = {
    HOTELS: HOTELS,
    FEATURE: FEATURE,
    DEFAULT_URL: DEFAULT_URL,
    SEED_CODE: SEED_CODE,
    PHRASES: PHRASES,
    label: label,
    canBook: canBook,
    canConfigure: canConfigure,
    canEditUrl: canEditUrl,
    isDriver: isDriver,
    featureOn: featureOn,
    poolHotels: poolHotels,
    defaultSettings: defaultSettings,
    defaultFeatures: defaultFeatures,
    chicagoDate: chicagoDate,
    fromChicagoLocal: fromChicagoLocal,
    seesEveryHotel: seesEveryHotel,
    queueModel: queueModel,
    trackHotels: trackHotels,
    takenLine: takenLine,
    slotsFor: slotsFor,
    seatsLeft: seatsLeft,
    seatTone: seatTone,
    takenSeats: takenSeats,
    shouldAlert: shouldAlert,
    trackLink: trackLink,
    shareText: shareText,
    qrPayload: qrPayload,
    qrMatrix: qrMatrix,
    qrCodewords: function (text) {
      var version = chooseVersion(text.length) || 6;
      var data = encodeData(text, version);
      return { version: version, data: data, words: data ? interleave(version, data) : [] };
    },
    qrCapacity: qrCapacity,
    formatBits: formatBits,
    book: book,
    setStatus: setStatus,
    saveSettings: saveSettings,
    ridership: ridership,
    buildAlert: buildAlert,
    draftFromParking: draftFromParking,
    pickupGroups: pickupGroups,
    runsFor: runsFor,
    buildDemo: buildDemo,
    renderShuttle: renderShuttle,
    validName: validName,
    validRoom: validRoom,
    minuteToTime: minuteToTime,
    timeToMinute: timeToMinute
  };
  root.Shuttle = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  (function seedShuttleFeature() {
    var spec = { id: "shuttle", en: "Shuttle", es: "Shuttle", order: 30 };
    if (root.HotelFeatures && typeof root.HotelFeatures.register === "function") root.HotelFeatures.register(spec);
    else {
      root.HF_QUEUE = root.HF_QUEUE || [];
      root.HF_QUEUE.push(spec);
    }
    try {
      var raw = localStorage.getItem("jrportal_hotel_features_v1");
      var data = raw ? JSON.parse(raw) : null;
      if (data && data.v !== 1) return;
      if (!data) data = { v: 1, rows: {} };
      data.rows = data.rows || {};
      var seed = { "MSPWE|shuttle": false, "MSPAM|shuttle": true, "MSPMS|shuttle": true };
      var changed = !raw;
      Object.keys(seed).forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(data.rows, k)) {
          data.rows[k] = seed[k];
          changed = true;
        }
      });
      if (changed) localStorage.setItem("jrportal_hotel_features_v1", JSON.stringify(data));
    } catch (e) {}
  })();

  var KEY = "jrportal_shuttle_v1";
  var mem = null;
  var ui = { screen: "desk", error: "", notice: "", draft: null };
  var remoteState = "";
  var parkMemo = {};

  function L(en) { return label(en, langNow()); }
  function langNow() { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; }
  function nowISO() { return new Date().toISOString(); }
  function actorNow() {
    var role = "", hotel = "", view = "";
    try { role = authRole(); } catch (e) { role = ""; }
    try { view = (typeof S !== "undefined" && S.role) || role; } catch (e2) { view = role; }
    try {
      var u = meUser();
      if (u && u.hotel) hotel = u.hotel;
    } catch (e3) { hotel = ""; }
    if (!hotel && typeof S !== "undefined" && S.hotel) hotel = S.hotel;
    return { role: role, hotel: hotel || "", view: view || role };
  }
  function remoteOn() {
    return typeof useRemote === "function" && useRemote() && typeof sb !== "undefined" && sb;
  }
  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.demoVersion !== 1 || !data.settings || !data.signups || !data.features) return null;
      return data;
    } catch (e) { return null; }
  }
  function writeStore(data) {
    var copy = cloneState(data);
    copy.demoVersion = 1;
    copy.origin = data.origin === "supabase" ? "supabase" : "example";
    try { localStorage.setItem(KEY, JSON.stringify(copy)); } catch (e) {}
  }
  function emptyState() {
    var settings = {};
    HOTELS.forEach(function (h) { settings[h] = defaultSettings(h); });
    return { origin: "loading", features: defaultFeatures(), settings: settings, signups: [] };
  }
  function mapSignup(row) {
    // The shared select grant exposes the sign-up columns. The migration copies
    // run_at into depart_at, hotel_id into hotel, and guest_name or room_number
    // into guest_label, and leaves the older columns in place.
    var dest = canonDest(row.destination, row.destination_note || "");
    return {
      id: String(row.id),
      hotel: row.hotel || "",
      destination: dest.destination,
      destinationNote: dest.note,
      departAt: row.depart_at || "",
      guestLabel: row.guest_label || "",
      labelKind: row.label_kind === "room" ? "room" : "name",
      partySize: Number(row.party_size) || 1,
      bags: Number(row.bags) || 0,
      notes: row.notes || "",
      flightTime: row.flight_time || "",
      status: canonStatus(row.status),
      statusAt: row.status_at || "",
      boardedAt: row.boarded_at || "",
      noshowAt: row.noshow_at || "",
      doneAt: row.done_at || "",
      parkingVisitId: row.parking_visit_id == null ? "" : String(row.parking_visit_id),
      createdAt: row.created_at || "",
      ex: false
    };
  }
  function mapSettings(row) {
    return {
      hotel: row.hotel,
      trackingCode: row.tracking_code || "",
      slotMinutes: Number(row.slot_minutes) || 30,
      seatCapacity: Number(row.seat_capacity) || 14,
      openMinute: Number(row.open_minute),
      closeMinute: Number(row.close_minute),
      trackUrl: row.track_url || DEFAULT_URL,
      pickupOrder: Array.isArray(row.pickup_order) && row.pickup_order.length === 2 ? row.pickup_order.slice() : ["MSPAM", "MSPMS"]
    };
  }
  function ensureRemote() {
    if (!remoteOn() || remoteState === "loading" || remoteState === "ready" || remoteState === "demo") return;
    remoteState = "loading";
    Promise.all([
      sb.from("hotel_features").select("hotel,feature,enabled").eq("feature", FEATURE),
      sb.from("shuttle_settings").select("hotel,tracking_code,slot_minutes,seat_capacity,open_minute,close_minute,track_url,pickup_order"),
      sb.from("shuttle_signups").select("id,hotel,destination,destination_note,depart_at,guest_label,label_kind,party_size,bags,notes,flight_time,status,status_at,boarded_at,noshow_at,done_at").order("depart_at", { ascending: true }).limit(400)
    ]).then(function (res) {
      if (res.some(function (r) { return r.error; })) { remoteState = "demo"; mem = readStore() || buildDemo(nowISO()); render(); return; }
      var features = defaultFeatures();
      (res[0].data || []).forEach(function (row) {
        features = features.filter(function (f) { return !(f.hotel === row.hotel && f.feature === row.feature); });
        features.push({ hotel: row.hotel, feature: row.feature, enabled: !!row.enabled });
      });
      var settings = {};
      HOTELS.forEach(function (h) { settings[h] = defaultSettings(h); settings[h].trackingCode = ""; });
      (res[1].data || []).forEach(function (row) { if (HOTELS.indexOf(row.hotel) >= 0) settings[row.hotel] = mapSettings(row); });
      mem = { origin: "supabase", features: features, settings: settings, signups: (res[2].data || []).map(mapSignup) };
      remoteState = "ready";
      var actor = actorNow();
      var day = chicagoDate(nowISO());
      if (canBook(actor.role) || isDriver(actor.role) || seesEveryHotel(actor.role)) {
        sb.rpc("shuttle_day_counts", { p_day: day }).then(function (r) {
          if (!r.error && mem) mem.dayCounts = r.data || [];
          render();
        }, function () { render(); });
        if (!seesEveryHotel(actor.role)) {
          sb.rpc("shuttle_other_seats", { p_day: day }).then(function (r) {
            if (!r.error && mem) mem.otherSeats = (r.data || []).map(function (row) {
              return { departAt: row.depart_at, hotel: row.hotel, seats: Number(row.seats) || 0 };
            });
            render();
          }, function () {});
        }
      }
      render();
    }, function () { remoteState = "demo"; mem = readStore() || buildDemo(nowISO()); render(); });
  }
  function current() {
    if (remoteOn()) {
      ensureRemote();
      if (!mem) mem = emptyState();
      return mem;
    }
    if (mem) return mem;
    mem = readStore() || buildDemo(nowISO());
    return mem;
  }
  function commit(next, notice) {
    mem = next;
    if (!remoteOn() && next.origin !== "supabase") writeStore(next);
    ui.notice = notice || "";
    ui.error = "";
    if (typeof save === "function") save();
    render();
  }
  function pageHtml() {
    var actor = actorNow();
    var hotel = (typeof S !== "undefined" && S.hotel) || actor.hotel;
    return renderShuttle(current(), { actor: actor, now: nowISO(), hotel: hotel, lang: langNow(), ui: ui });
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function showError(code) { ui.error = code || "save"; ui.notice = ""; render(); }
  function readDraft() {
    var prev = ui.draft || {};
    var picked = "";
    var radios = document.getElementsByName("shSlotPick");
    for (var i = 0; i < radios.length; i++) if (radios[i].checked) picked = radios[i].value;
    return {
      destination: val("shDest") || prev.destination || "t1",
      destinationNote: val("shOther"),
      departAt: picked || prev.departAt || "",
      labelKind: "room",
      guestLabel: val("shRoom"),
      partySize: val("shParty") || prev.partySize || 1,
      bags: val("shBags") === "" ? 0 : val("shBags"),
      flightTime: val("shFlight"),
      notes: val("shNotes"),
      parkingVisitId: prev.parkingVisitId || "",
      hotel: ""
    };
  }
  function fanout(signup) {
    var note = buildAlert(signup, langNow());
    if (!note || !shouldAlert(signup.departAt, nowISO())) return;
    note.hotels.forEach(function (hotel) {
      if (typeof careAlert === "function") careAlert(note.title, note.body, { roles: note.roles, hotel: hotel, kind: note.kind });
      if (remoteOn()) sb.from("notifications").insert({ title: note.title, body: note.body, role: DRIVER, hotel: hotel, kind: note.kind }).then(function () {}, function () {});
    });
  }
  function codeFor(hotel) {
    var state = current();
    var row = settingsFor(state, hotel) || settingsFor(state, (typeof S !== "undefined" && S.hotel) || "MSPAM");
    return row ? (row.trackingCode || "") : "";
  }
  function linkFor(hotel) {
    var state = current();
    var row = settingsFor(state, hotel) || poolSettings(state);
    return trackLink(row.trackUrl, codeFor(hotel));
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error("copy"));
      } catch (e) {
        try { document.body.removeChild(ta); } catch (e2) {}
        reject(e);
      }
    });
  }

  root.shScreen = function (screen) {
    ui.screen = screen === "config" ? "config" : "desk";
    ui.error = "";
    ui.notice = "";
    render();
  };
  root.shDraft = function (key, value) {
    ui.draft = readDraft();
    ui.draft[key] = value;
    ui.error = "";
    render();
    setTimeout(function () {
      var id = key === "guestLabel" ? "shRoom" : key === "departAt" ? "shRoom" : key === "destination" ? "shDest" : "";
      var el = id && document.getElementById(id);
      if (el) el.focus();
    }, 0);
  };
  root.shBook = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var draft = readDraft();
    var hotel = (typeof S !== "undefined" && S.hotel) || actor.hotel;
    var input = {
      hotel: hotel,
      destination: draft.destination,
      destinationNote: draft.destinationNote,
      departAt: draft.departAt,
      labelKind: "room",
      room: draft.guestLabel,
      guestLabel: draft.guestLabel,
      partySize: Number(draft.partySize),
      bags: draft.bags === "" ? 0 : Number(draft.bags),
      flightTime: draft.flightTime,
      notes: draft.notes,
      parkingVisitId: draft.parkingVisitId
    };
    var res = book(current(), input, actor, nowISO());
    if (!res.ok) return showError(res.error);
    ui.draft = null;
    ui.screen = "desk";
    if (res.alert) fanout(res.signup);
    if (remoteOn()) {
      sb.rpc("shuttle_book", {
        p_hotel: input.hotel,
        p_destination: input.destination,
        p_destination_note: input.destinationNote || null,
        p_depart: input.departAt,
        p_guest_label: input.guestLabel,
        p_label_kind: "room",
        p_party: input.partySize,
        p_bags: input.bags,
        p_notes: input.notes || null,
        p_flight: input.flightTime || null,
        p_parking_visit: /^\d+$/.test(String(input.parkingVisitId || "")) ? Number(input.parkingVisitId) : null
      }).then(function (r) {
        if (r.error) return showError(/full/.test(String(r.error.message || r.error)) ? "full" : "save");
        remoteState = "";
        mem = null;
        ui.notice = "booked";
        ensureRemote();
      });
      return;
    }
    commit(res.state, "booked");
  };
  root.shStatus = function (id, status) {
    if (!/^[A-Za-z0-9_-]+$/.test(String(id))) return;
    var actor = actorNow();
    var now = nowISO();
    var res = setStatus(current(), id, status, actor, now);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("shuttle_set_status", { p_id: Number(id), p_status: status }).then(function (r) {
        if (r.error) return showError("save");
        remoteState = "";
        mem = null;
        ensureRemote();
      });
      return;
    }
    commit(res.state, "");
  };
  root.shSaveSettings = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var hotel = (typeof S !== "undefined" && S.hotel) || actor.hotel;
    var input = {
      hotel: hotel,
      trackingCode: val("shTrackCode"),
      slotMinutes: Number(val("shStep")),
      seatCapacity: Number(val("shCap")),
      openMinute: timeToMinute(val("shOpen")),
      closeMinute: timeToMinute(val("shClose")),
      trackUrl: val("shUrl"),
      pickupOrder: [val("shFirst"), val("shSecond")]
    };
    var res = saveSettings(current(), input, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("shuttle_save_settings", {
        p_hotel: input.hotel,
        p_tracking_code: input.trackingCode,
        p_slot_minutes: input.slotMinutes,
        p_seat_capacity: input.seatCapacity,
        p_open_minute: input.openMinute,
        p_close_minute: input.closeMinute,
        p_track_url: input.trackUrl || null,
        p_pickup_order: input.pickupOrder
      }).then(function (r) {
        if (r.error) return showError("save");
        remoteState = "";
        mem = null;
        ui.notice = "settings";
        ui.screen = "desk";
        ensureRemote();
      });
      return;
    }
    ui.screen = "desk";
    commit(res.state, "settings");
  };
  root.shCopyCode = function (hotel) {
    var h = hotel || ((typeof S !== "undefined" && S.hotel) || "");
    var code = codeFor(h);
    if (!code) return showError("code");
    copyText(code).then(function () { ui.notice = "copied"; ui.error = ""; render(); }, function () { ui.notice = "copyfail"; ui.error = ""; render(); });
  };
  root.shCopyShare = function (hotel) {
    var h = hotel || ((typeof S !== "undefined" && S.hotel) || "");
    var state = current();
    var row = settingsFor(state, h) || poolSettings(state);
    var text = shareText(langNow(), row.trackingCode || "", row.trackUrl);
    copyText(text).then(function () { ui.notice = "shared"; ui.error = ""; render(); }, function () { ui.notice = "copyfail"; ui.error = ""; render(); });
  };
  root.shReset = function () {
    if (remoteOn()) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = buildDemo(nowISO());
    ui.screen = "desk";
    ui.draft = null;
    ui.error = "";
    ui.notice = "reset";
    render();
  };
  root.shFromParking = function (id) {
    var visit = parkMemo[String(id)];
    if (!visit) return;
    var actor = actorNow();
    if (!canBook(actor.role) || !featureOn(current(), visit.hotel)) return;
    ui.draft = draftFromParking(visit);
    ui.screen = "desk";
    ui.error = "";
    ui.notice = "";
    if (typeof S !== "undefined" && S.hotel !== visit.hotel && normRole(actor.role) === "Above Property" && typeof setHotel === "function") {
      S.hotel = visit.hotel;
    }
    if (typeof go === "function") go("shut");
    else render();
  };
  root.shParkingAction = function (visit) {
    if (!visit || visit.vehicleType !== "park_fly" || visit.checkedOut) return "";
    var state = current();
    if (!featureOn(state, visit.hotel)) return "";
    if (!canBook(actorNow().role)) return "";
    parkMemo[String(visit.id)] = {
      id: visit.id,
      hotel: visit.hotel,
      room: visit.room || "",
      pfConfirm: visit.pfConfirm || ""
    };
    return "<button type=\"button\" class=\"btn2 sh-from-park\" onclick=\"shFromParking('" + esc(visit.id) + "')\">" + esc(L("Shuttle signup")) + "</button>";
  };

  if (typeof M !== "undefined") M.shut = ["🚐", "Shuttle"];
  if (typeof I18N !== "undefined" && I18N.es) {
    I18N.es.Shuttle = "Shuttle";
    I18N.es["New shuttle signup"] = PHRASES["New shuttle signup"];
    I18N.es["Rides to the airport or the mall: use the 🚐 Shuttle sign-up. Pickups from the airport or mall use TrackMyShuttle."] = "Viajes al aeropuerto o al mall: usa el registro 🚐 del shuttle. Las recogidas en el aeropuerto o el mall van en TrackMyShuttle.";
  }
  if (typeof V !== "undefined") V.shut = pageHtml;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var hotel = (typeof S !== "undefined" && S.hotel) || "";
      var who = normRole(role);
      try { who = normRole(authRole() || role); } catch (e) {}
      var manager = who === "GM" || who === "AGM" || who === "Above Property" || normRole(role) === "GM" || normRole(role) === "AGM";
      if (featureOn(current(), hotel) && manager && list.indexOf("shut") < 0) list.push("shut");
      if (!featureOn(current(), hotel)) list = list.filter(function (id) { return id !== "shut"; });
      return list;
    };
  }
  if (typeof navFor === "function") {
    var prevNav = navFor;
    root.navFor = function (role) {
      var list = (prevNav(role) || []).slice();
      var hotel = (typeof S !== "undefined" && S.hotel) || "";
      if (!featureOn(current(), hotel)) list = list.filter(function (id) { return id !== "shut"; });
      return list;
    };
  }
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("shut") < 0) NOCOLS.push("shut"); } catch (e) {}

  var style = document.createElement("style");
  style.textContent = [
    ".sh-note{font-size:14px;color:#3c4658;margin:6px 0}",
    ".sh-field{display:flex;flex-direction:column;gap:4px;font-weight:700;margin:8px 0}",
    ".sh-field input,.sh-field select{width:100%}",
    ".sh-code{background:#14365d;color:#fff;border-radius:12px;padding:14px 10px;text-align:center}",
    ".sh-code b{display:block;font-size:48px;letter-spacing:4px;line-height:1.1}",
    ".sh-code small{display:block;margin-top:4px;font-size:13px;letter-spacing:0}",
    ".sh-code-row{display:flex;flex-direction:column;gap:8px;margin:8px 0}",
    ".sh-track{display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:8px}",
    ".sh-qr{width:min(220px,72vw);height:auto;display:block;margin:10px auto;background:#fff}",
    ".sh-full{background:#fde2e1;color:#c0262d;padding:8px;border-radius:8px;font-weight:700}",
    ".sh-guest{padding:8px 0;border-bottom:1px solid #eee}",
    ".sh-slots{display:flex;flex-direction:column;gap:8px;margin:8px 0}",
    ".sh-slot{display:block;position:relative;border:1px solid #e6e8ee;border-radius:14px;padding:10px 12px;background:#fff;text-align:left}",
    ".sh-slot input{position:absolute;opacity:0;width:1px;height:1px}",
    ".sh-slot-top{display:flex;align-items:center;justify-content:space-between;gap:8px}",
    ".sh-slot-time{font-size:18px;font-weight:800}",
    ".sh-slot-left{font-size:13px;font-weight:750;text-align:right;line-height:1.1}",
    ".sh-slot-left b{display:block;font-size:32px;line-height:1}",
    ".sh-bar{display:block;height:8px;border-radius:99px;background:#e6e8ee;overflow:hidden;margin-top:8px}",
    ".sh-bar i{display:block;height:100%;width:0}",
    ".sh-ok{border-color:#86efac}",
    ".sh-ok .sh-slot-left{color:#166534}",
    ".sh-ok .sh-bar i{background:#16a34a}",
    ".sh-low{border-color:#fdba74}",
    ".sh-low .sh-slot-left{color:#9a3412}",
    ".sh-low .sh-bar i{background:#d97706}",
    ".sh-full{border-color:#fecaca;background:#fff1f2}",
    ".sh-full .sh-slot-left{color:#b91c1c}",
    ".sh-full .sh-bar i{background:#dc2626}",
    ".sh-slot.is-on{outline:2px solid #3b5bdb}",
    ".sh-past{opacity:.72}",
    ".sh-slot-pax{margin:8px 0 0;padding:0;list-style:none;font-size:14px;font-weight:650}",
    ".sh-slot-pax li{padding:2px 0}",
    ".sh-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}",
    ".sh-actions .btn,.sh-actions .btn2{width:100%;min-height:44px}",
    ".sh-kind{display:flex;gap:12px;margin:8px 0}",
    ".sh-kind label{font-weight:700}",
    ".sh-t{width:100%;font-size:14px}",
    "#shRoot .btn,#shRoot .btn2{width:100%}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
