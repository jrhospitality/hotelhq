/* Parking log for MSPWE, MSPAM, and MSPMS.
   Front desk, AGM, GM, and JR Corporate can see and log a vehicle.
   Housekeeping, laundry, housepersons, maintenance, breakfast, and drivers cannot.
   GM, AGM, and corporate lay out numbered stalls, room proximity, the long-term
   area, and the Park & Fly area. Airport Park & Fly bookings store a last name
   and confirmation. A visit still does not store a guest name.
   Demo plates are fake (EXA / SAMPLE) and the page says so. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var HOTEL_OK = { MSPWE: 1, MSPAM: 1, MSPMS: 1 };
  var SEE_ROLES = { "Front Desk": 1, GM: 1, AGM: 1, "Above Property": 1 };
  var SETUP_ROLES = { GM: 1, AGM: 1, "Above Property": 1 };
  var ALERT_ROLES = ["Front Desk", "AGM", "GM", "Above Property"];
  var MONTHS = [
    ["January", "Enero"], ["February", "Febrero"], ["March", "Marzo"], ["April", "Abril"],
    ["May", "Mayo"], ["June", "Junio"], ["July", "Julio"], ["August", "Agosto"],
    ["September", "Septiembre"], ["October", "Octubre"], ["November", "Noviembre"], ["December", "Diciembre"]
  ];
  var WEEKDAYS = [["Su", "Do"], ["Mo", "Lu"], ["Tu", "Ma"], ["We", "Mi"], ["Th", "Ju"], ["Fr", "Vi"], ["Sa", "Sá"]];
  var PHRASES = {
    "Parking": "Estacionamiento",
    "EXAMPLE": "EJEMPLO",
    "Sample vehicles for this demo. Not real plates or guests.": "Vehículos de ejemplo para esta demostración. No hay placas ni huéspedes reales.",
    "Cars now": "Autos ahora",
    "Avg stay": "Estadía promedio",
    "Overstays today": "Excedidos hoy",
    "Park & Fly": "Estaciona y vuela",
    "Shuttle signup": "Anotar en el shuttle",
    "Returning today": "Regresan hoy",
    "Returning tomorrow": "Regresan mañana",
    "Off": "Apagado",
    "Log a vehicle": "Registrar un auto",
    "Lot walk": "Recorrido del lote",
    "History": "Historial",
    "Stall setup": "Configurar cajones",
    "Plate": "Placa",
    "State": "Estado",
    "Stall": "Cajón",
    "Lot": "Lote",
    "Room": "Cuarto",
    "Make": "Marca",
    "Model": "Modelo",
    "Color": "Color",
    "Permit": "Permiso",
    "Time in": "Hora de entrada",
    "Parked": "Tiempo estacionado",
    "Checkout": "Salida del hotel",
    "Pickup": "Recogida",
    "Type": "Tipo",
    "Paid": "Pago",
    "Overstay": "Excedido",
    "Unknown": "Desconocido",
    "Out": "Salida",
    "Mark out": "Marcar salida",
    "Guest": "Huésped",
    "Long-term": "Larga estancia",
    "Complimentary": "Cortesía",
    "Yes": "Sí",
    "No": "No",
    "Hotel": "Hotel",
    "Open": "Libre",
    "Occupied": "Ocupado",
    "Search plate": "Buscar placa",
    "No vehicles on the lot.": "No hay autos en el lote.",
    "No matches.": "Sin coincidencias.",
    "Back": "Volver",
    "Save vehicle": "Guardar auto",
    "Suggested stall": "Cajón sugerido",
    "No open stall in that area.": "No hay cajón libre en esa área.",
    "No stall is mapped to that room yet. Pick an open stall.": "Ese cuarto todavía no tiene un cajón cercano. Elige un cajón libre.",
    "Closest open stall": "Cajón libre más cercano",
    "Long-term area": "Área de larga estancia",
    "Park & Fly area": "Área de estaciona y vuela",
    "Long-term stay": "Estancia larga",
    "Hotel checkout": "Salida del hotel",
    "Does not end Park & Fly parking.": "No termina el estacionamiento de Estaciona y vuela.",
    "Package or confirmation": "Paquete o confirmación",
    "Days included": "Días incluidos",
    "Drop-off date": "Fecha en que lo dejan",
    "Expected pickup": "Recogida prevista",
    "Return flight": "Vuelo de regreso",
    "Extra days": "Días extra",
    "Permit or tag": "Permiso o etiqueta",
    "Rate note": "Nota de tarifa",
    "Paid parking": "Estacionamiento de pago",
    "Note": "Nota",
    "Found on a lot walk": "Encontrado en el recorrido del lote",
    "Where did you find it?": "¿En qué cajón lo encontraste?",
    "Save found vehicle": "Guardar auto encontrado",
    "Reset sample data": "Restablecer datos de ejemplo",
    "Stall board": "Tablero de cajones",
    "Add lot": "Agregar lote",
    "Lot name": "Nombre del lote",
    "Purpose": "Uso",
    "Guest stalls": "Cajones de huéspedes",
    "Add stall": "Agregar cajón",
    "Stall number": "Número de cajón",
    "Notes": "Notas",
    "Add proximity": "Agregar cercanía",
    "From room": "Desde el cuarto",
    "To room": "Hasta el cuarto",
    "Floor": "Piso",
    "Wing": "Ala",
    "Rank": "Cercanía",
    "Closest is 1": "1 es el más cercano",
    "Save settings": "Guardar ajustes",
    "Hours without a room": "Horas sin cuarto",
    "Long-term after nights": "Larga estancia después de noches",
    "Grace hours after pickup": "Horas de gracia después de la recogida",
    "Park & Fly at this hotel": "Estaciona y vuela en este hotel",
    "Active": "Activo",
    "Inactive": "Inactivo",
    "Turn off": "Desactivar",
    "Turn on": "Activar",
    "Avg is completed guest stays, last 30 days.": "El promedio son estadías de huéspedes ya salidas, últimos 30 días.",
    "History matches": "Coincidencias del historial",
    "Vehicle saved.": "Auto guardado.",
    "Vehicle marked out.": "Auto marcado como salido.",
    "Sample data reset.": "Datos de ejemplo restablecidos.",
    "You can't change parking.": "No puedes cambiar el estacionamiento.",
    "Enter a plate, letters and numbers only.": "Escribe la placa, solo letras y números.",
    "Enter the 2-letter state.": "Escribe el estado con 2 letras.",
    "That stall is already taken.": "Ese cajón ya está ocupado.",
    "That plate is already on the lot.": "Esa placa ya está en el lote.",
    "Park & Fly is off at this hotel.": "Estaciona y vuela está apagado en este hotel.",
    "Enter the package or confirmation number.": "Escribe el paquete o la confirmación.",
    "Enter how many days are included.": "Escribe cuántos días incluye.",
    "Enter the drop-off date.": "Escribe la fecha en que dejan el auto.",
    "Enter the expected pickup.": "Escribe la recogida prevista.",
    "Choose the stall where you found it.": "Elige el cajón donde lo encontraste.",
    "Time out can't be before time in.": "La salida no puede ser antes de la entrada.",
    "That hotel is not on your list.": "Ese hotel no está en tu lista.",
    "Enter a lot name.": "Escribe el nombre del lote.",
    "Choose a lot.": "Elige un lote.",
    "Enter the stall number.": "Escribe el número de cajón.",
    "Enter a room range, floor, or wing.": "Escribe un rango de cuartos, un piso o un ala.",
    "Could not save.": "No se pudo guardar.",
    "No stalls yet.": "Todavía no hay cajones.",
    "A GM can add lots and stall numbers.": "El gerente puede agregar lotes y números de cajón.",
    "See parking": "Ver estacionamiento",
    "Unassigned": "Sin cajón",
    "On the lot": "En el lote",
    "Checked out": "Ya salió",
    "Settings": "Ajustes",
    "Lots": "Lotes",
    "Stalls": "Cajones",
    "Room map": "Mapa de cuartos",
    "Days": "Días",
    "Flight": "Vuelo",
    "Confirmation": "Confirmación",
    "Extra": "Adicional",
    "Use the long-term stalls when the box is checked or the stay is longer than the night limit.": "Usa los cajones de larga estancia si marcas la casilla o si la estadía supera el límite de noches.",
    "Park & Fly cars use the Park & Fly stalls, not the stall closest to the room.": "Los autos de Estaciona y vuela usan esos cajones, no el cajón más cercano al cuarto.",
    "Park & Fly is off here.": "Estaciona y vuela está apagado aquí.",
    "Loading parking…": "Cargando estacionamiento…",
    "Optional": "Opcional",
    "ADA, EV, or oversized": "ADA, eléctrico o grande",
    "Save lot": "Guardar lote",
    "Save stall": "Guardar cajón",
    "Save range": "Guardar rango",
    "From": "Desde",
    "To": "Hasta",
    "Status": "Estatus",
    "This stay uses the long-term stalls.": "Esta estadía usa los cajones de larga estancia.",
    "Leave the stall blank to keep the suggestion. Pick another open stall to override it.": "Deja el cajón en blanco para usar la sugerencia. Elige otro cajón libre si quieres cambiarlo.",
    "Not flagged when the guest checks out of the room. Flagged only after pickup, plus the grace hours.": "No se marca cuando el huésped sale del cuarto. Se marca solo después de la recogida, más las horas de gracia.",
    "Parking is off at this hotel.": "El estacionamiento está apagado en este hotel.",
    "JR Corporate can turn it on.": "JR Corporate puede activarlo.",
    "Cars parked tonight": "Autos estacionados esta noche",
    "Overnight guests": "Huéspedes de noche",
    "Open stalls": "Cajones libres",
    "Tomorrow night": "Mañana en la noche",
    "projected": "proyectados",
    "Stall map": "Mapa de cajones",
    "On the lot list": "Lista de autos en el lote",
    "Park & Fly calendar": "Calendario de estaciona y vuela",
    "Arriving": "Llegan",
    "Leaving": "Salen",
    "Night": "Noche",
    "Dropping off": "Dejan el auto",
    "Picking up": "Recogen el auto",
    "Parked that night": "Estacionados esa noche",
    "Add a Park & Fly booking": "Agregar reserva de estaciona y vuela",
    "Last name": "Apellido",
    "Expected pickup date": "Fecha prevista de recogida",
    "Vehicle optional until arrival": "El vehículo es opcional hasta que llegue",
    "Add vehicle": "Agregar vehículo",
    "Save booking": "Guardar reserva",
    "No bookings this day.": "No hay reservas este día.",
    "Parking isn't on your list.": "El estacionamiento no está en tu lista.",
    "Park & Fly overdue": "Estaciona y vuela atrasado",
    "This Park & Fly car is still here after pickup.": "Este auto de estaciona y vuela sigue aquí después de la recogida.",
    "Previous month": "Mes anterior",
    "Next month": "Mes siguiente",
    "Enter the guest last name.": "Escribe el apellido del huésped.",
    "Booking saved.": "Reserva guardada.",
    "Booked": "Reservado",
    "Waiting for the vehicle": "Falta el vehículo"
  };
  var ERRORS = {
    role: "You can't change parking.",
    plate: "Enter a plate, letters and numbers only.",
    state: "Enter the 2-letter state.",
    stall_occupied: "That stall is already taken.",
    already: "That plate is already on the lot.",
    park_fly_off: "Park & Fly is off at this hotel.",
    confirm: "Enter the package or confirmation number.",
    days: "Enter how many days are included.",
    dropoff: "Enter the drop-off date.",
    pickup: "Enter the expected pickup.",
    stall_required: "Choose the stall where you found it.",
    time: "Time out can't be before time in.",
    hotel: "That hotel is not on your list.",
    name: "Enter a lot name.",
    zone: "Choose a lot.",
    stall_no: "Enter the stall number.",
    range: "Enter a room range, floor, or wing.",
    last: "Enter the guest last name.",
    save: "Could not save.",
    missing: "Could not save.",
    out: "Could not save.",
    note: "Could not save."
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function normRole(role) { return role === "JR Corporate" ? "Above Property" : (role || ""); }
  function canSee(role) { return !!SEE_ROLES[normRole(role)]; }
  function canLog(role) { return canSee(role); }
  function canSetup(role) { return !!SETUP_ROLES[normRole(role)]; }
  function hotelsFor(role, hotel) {
    var r = normRole(role);
    if (!canLog(r)) return [];
    if (r === "Above Property") return HOTELS.slice();
    return HOTEL_OK[hotel] ? [hotel] : [];
  }
  function label(en, lang) {
    var es = PHRASES[en];
    if (es == null) es = en;
    return lang === "es" ? es : en;
  }
  function defaultSettings(hotel) {
    return {
      hotel: hotel,
      maxHoursWithoutRoom: 72,
      longTermNights: 7,
      parkFlyEnabled: hotel === "MSPAM" || hotel === "MSPMS",
      parkFlyGraceHours: 2,
      parkingEnabled: hotel !== "MSPWE"
    };
  }
  function parkingOn(state, hotel) {
    try {
      if (typeof HotelFeatures !== "undefined" && HotelFeatures && HotelFeatures.on) return !!HotelFeatures.on(hotel, "parking");
    } catch (e) {}
    var row = state && state.settings && state.settings[hotel];
    if (!row || row.parkingEnabled == null) return hotel !== "MSPWE";
    return !!row.parkingEnabled;
  }
  function chicagoParts(iso) {
    var d = new Date(iso);
    var g = { year: "", month: "", day: "", hour: "", minute: "" };
    if (isNaN(d.getTime())) return g;
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(d).forEach(function (p) {
      if (Object.prototype.hasOwnProperty.call(g, p.type)) g[p.type] = p.value;
    });
    if (g.hour === "24") g.hour = "00";
    ["month", "day", "hour", "minute"].forEach(function (k) {
      if (g[k].length === 1) g[k] = "0" + g[k];
    });
    return g;
  }
  function chicagoDate(iso) {
    var p = chicagoParts(iso);
    return p.year ? p.year + "-" + p.month + "-" + p.day : "";
  }
  function toChicagoLocal(iso) {
    var p = chicagoParts(iso);
    return p.year ? p.year + "-" + p.month + "-" + p.day + "T" + p.hour + ":" + p.minute : "";
  }
  function addDays(isoDate, days) {
    var p = String(isoDate || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
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
  function shift(iso, hours) { return new Date(Date.parse(iso) + hours * 3600000).toISOString(); }
  function atLocal(now, dayOffset, hh, mm) {
    return fromChicagoLocal(addDays(chicagoDate(now), dayOffset) + "T" + pad(hh) + ":" + pad(mm));
  }
  function normPlate(p) { return String(p || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function normConfirm(p) { return String(p || "").toUpperCase().replace(/[^A-Z0-9-]/g, ""); }
  function normState(p) { return String(p || "").toUpperCase().replace(/[^A-Z]/g, ""); }
  function normName(s) {
    var t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t || t.length > 40) return "";
    if (!/^[\p{L}][\p{L} .'\-]{0,39}$/u.test(t)) return "";
    return t;
  }
  function dateDiff(a, b) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(a || "")) || !/^\d{4}-\d{2}-\d{2}$/.test(String(b || ""))) return 0;
    return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  }
  function atDate(date, hh, mm) {
    return fromChicagoLocal(date + "T" + pad(hh) + ":" + pad(mm));
  }
  function roomNumber(room) {
    var s = String(room || "").trim();
    return /^\d{2,4}$/.test(s) ? Number(s) : null;
  }
  function roomFloor(n) {
    if (n == null || n < 100) return "";
    return String(Math.floor(n / 100));
  }
  function stayNights(checkedIn, expectedOut) {
    if (!checkedIn || !expectedOut) return 0;
    var a = chicagoDate(checkedIn);
    var b = chicagoDate(expectedOut);
    if (!a || !b) return 0;
    return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
  }
  function wantsLongTerm(input, settings) {
    if (!input || input.vehicleType === "park_fly") return false;
    if (input.longTerm) return true;
    return stayNights(input.checkedIn, input.expectedOut) > (settings.longTermNights || 7);
  }
  function clone(state) { return JSON.parse(JSON.stringify(state)); }
  function zoneById(state, id) {
    var key = String(id || "");
    for (var i = 0; i < state.zones.length; i++) if (String(state.zones[i].id) === key) return state.zones[i];
    return null;
  }
  function stallById(state, id) {
    var key = String(id || "");
    if (!key) return null;
    for (var i = 0; i < state.stalls.length; i++) if (String(state.stalls[i].id) === key) return state.stalls[i];
    return null;
  }
  function zoneName(zone, lang) {
    if (!zone) return "";
    return lang === "es" && zone.nameEs ? zone.nameEs : zone.name;
  }
  function openVisitInStall(state, stallId) {
    var key = String(stallId || "");
    if (!key) return null;
    for (var i = 0; i < state.visits.length; i++) {
      var v = state.visits[i];
      if (!v.checkedOut && String(v.stallId || "") === key) return v;
    }
    return null;
  }
  function rangeMatches(range, roomNum) {
    if (range.active === false) return false;
    var floor = roomFloor(roomNum);
    if (range.floor && String(range.floor) !== floor) return false;
    var hasRange = range.roomLo !== "" && range.roomLo != null && range.roomHi !== "" && range.roomHi != null;
    if (hasRange) return roomNum >= Number(range.roomLo) && roomNum <= Number(range.roomHi);
    return !!range.floor;
  }
  function firstOpen(state, hotel, purpose) {
    var zones = state.zones.filter(function (z) {
      return z.hotel === hotel && z.active !== false && z.purpose === purpose;
    }).sort(function (a, b) { return a.sort - b.sort || String(a.name).localeCompare(String(b.name)); });
    var best = null;
    zones.forEach(function (z) {
      state.stalls.forEach(function (s) {
        if (String(s.zoneId) !== String(z.id) || s.hotel !== hotel || s.active === false) return;
        if (openVisitInStall(state, s.id)) return;
        var cand = { id: s.id, z: z.sort || 0, s: s.sort || 0, no: s.stallNo };
        if (!best || cand.z < best.z || (cand.z === best.z && (cand.s < best.s || (cand.s === best.s && cand.no < best.no)))) best = cand;
      });
    });
    return best ? best.id : "";
  }
  function suggestStall(state, input) {
    var hotel = input.hotel;
    var settings = state.settings[hotel] || defaultSettings(hotel);
    if (input.vehicleType === "park_fly") {
      if (!settings.parkFlyEnabled) return { stallId: "", reason: "off" };
      var pf = firstOpen(state, hotel, "park_fly");
      return { stallId: pf, reason: pf ? "park_fly" : "none" };
    }
    if (wantsLongTerm(input, settings)) {
      var lt = firstOpen(state, hotel, "long_term");
      return { stallId: lt, reason: lt ? "long_term" : "none" };
    }
    var room = roomNumber(input.room);
    if (room == null) return { stallId: "", reason: "none" };
    var best = null;
    var saw = false;
    state.ranges.forEach(function (r) {
      if (!rangeMatches(r, room)) return;
      var s = stallById(state, r.stallId);
      if (!s || s.hotel !== hotel || s.active === false) return;
      var z = zoneById(state, s.zoneId);
      if (!z || z.active === false || z.purpose !== "standard") return;
      saw = true;
      if (openVisitInStall(state, s.id)) return;
      var cand = { id: s.id, rank: Number(r.rank), sort: s.sort || 0, no: s.stallNo };
      if (!best || cand.rank < best.rank || (cand.rank === best.rank && (cand.sort < best.sort || (cand.sort === best.sort && cand.no < best.no)))) best = cand;
    });
    if (best) return { stallId: best.id, reason: "closest" };
    return { stallId: "", reason: saw ? "none" : "unmapped" };
  }
  function allowed(actor, hotel) {
    return hotelsFor(actor && actor.role, actor && actor.hotel).indexOf(hotel) >= 0;
  }
  function clip(s, max) {
    var t = String(s || "").trim();
    if (!t) return "";
    return t.length > max ? null : t;
  }
  function blankVisit(row) {
    return {
      id: row.id,
      hotel: row.hotel,
      plate: row.plate,
      state: row.state || "MN",
      make: row.make || "",
      model: row.model || "",
      color: row.color || "",
      stallId: row.stallId ? String(row.stallId) : "",
      room: row.room || "",
      checkedIn: row.checkedIn,
      expectedOut: row.expectedOut || "",
      checkedOut: row.checkedOut || "",
      permit: row.permit || "",
      paid: !!row.paid,
      rateNote: row.rateNote || "",
      longTerm: !!row.longTerm,
      unknown: !!row.unknown,
      vehicleType: row.vehicleType || "guest",
      pfConfirm: row.pfConfirm || "",
      pfDays: row.pfDays === 0 ? 0 : (row.pfDays || ""),
      pfDropoff: row.pfDropoff || "",
      pfPickup: row.pfPickup || "",
      pfFlight: row.pfFlight || "",
      pfExtra: row.pfExtra || "",
      note: row.note || ""
    };
  }
  function logVisit(state, input, actor, now) {
    var hotel = input && input.hotel;
    if (input && input.system) {
      if (!HOTEL_OK[hotel]) return { ok: false, error: "hotel" };
    } else {
      if (!canLog(actor && actor.role)) return { ok: false, error: "role" };
      if (!allowed(actor, hotel)) return { ok: false, error: "hotel" };
    }
    var settings = state.settings[hotel] || defaultSettings(hotel);
    var plate = normPlate(input.plate);
    if (!/^[A-Z0-9]{2,8}$/.test(plate)) return { ok: false, error: "plate" };
    var st = normState(input.state);
    if (!/^[A-Z]{2}$/.test(st)) return { ok: false, error: "state" };
    var type = input.vehicleType === "park_fly" ? "park_fly" : "guest";
    var unknown = !!input.unknown && type === "guest";
    if (type === "park_fly" && !settings.parkFlyEnabled) return { ok: false, error: "park_fly_off" };
    var checkedIn = input.checkedIn || now;
    if (!checkedIn || isNaN(Date.parse(checkedIn))) return { ok: false, error: "time" };
    var expectedOut = input.expectedOut || "";
    var make = clip(input.make, 30);
    var model = clip(input.model, 30);
    var color = clip(input.color, 30);
    var permit = clip(input.permit, 20);
    var rateNote = clip(input.rateNote, 120);
    var note = clip(input.note, 200);
    if (make == null || model == null || color == null || permit == null || rateNote == null || note == null) return { ok: false, error: "note" };
    var room = String(input.room || "").trim();
    if (room && !/^\d{2,4}$/.test(room)) return { ok: false, error: "range" };
    var pfConfirm = "";
    var pfDays = "";
    var pfDropoff = "";
    var pfPickup = "";
    var pfFlight = "";
    var pfExtra = "";
    if (type === "park_fly") {
      pfConfirm = normConfirm(input.pfConfirm);
      if (!/^[A-Z0-9-]{2,24}$/.test(pfConfirm)) return { ok: false, error: "confirm" };
      pfDays = Number(input.pfDays);
      if (!Number.isInteger(pfDays) || pfDays < 1 || pfDays > 60) return { ok: false, error: "days" };
      pfDropoff = String(input.pfDropoff || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(pfDropoff)) return { ok: false, error: "dropoff" };
      pfPickup = input.pfPickup || "";
      if (!pfPickup || isNaN(Date.parse(pfPickup))) return { ok: false, error: "pickup" };
      if (chicagoDate(pfPickup) < pfDropoff) return { ok: false, error: "pickup" };
      pfFlight = clip(input.pfFlight, 40);
      pfExtra = clip(input.pfExtra, 120);
      if (pfFlight == null || pfExtra == null) return { ok: false, error: "note" };
    }
    var draft = {
      hotel: hotel,
      vehicleType: type,
      longTerm: type === "park_fly" ? false : !!input.longTerm,
      checkedIn: checkedIn,
      expectedOut: expectedOut,
      room: room
    };
    var longTerm = type === "park_fly" ? false : wantsLongTerm(draft, settings);
    var stallId = input.stallId ? String(input.stallId) : "";
    if (!stallId && !unknown && !input.explicitBlank) stallId = suggestStall(state, draft).stallId || "";
    if (unknown && !stallId) return { ok: false, error: "stall_required" };
    if (state.visits.some(function (v) { return v.hotel === hotel && !v.checkedOut && v.plate === plate; })) return { ok: false, error: "already" };
    if (stallId) {
      var stall = stallById(state, stallId);
      var zone = stall && zoneById(state, stall.zoneId);
      if (!stall || stall.hotel !== hotel || stall.active === false || !zone || zone.active === false) return { ok: false, error: "zone" };
      if (openVisitInStall(state, stallId)) return { ok: false, error: "stall_occupied" };
    }
    var next = clone(state);
    var row = blankVisit({
      id: "loc-" + plate + "-" + next.visits.length,
      hotel: hotel,
      plate: plate,
      state: st,
      make: make,
      model: model,
      color: color,
      stallId: stallId,
      room: room,
      checkedIn: checkedIn,
      expectedOut: expectedOut,
      permit: permit,
      paid: !!input.paid,
      rateNote: rateNote,
      longTerm: longTerm,
      unknown: unknown,
      vehicleType: type,
      pfConfirm: pfConfirm,
      pfDays: pfDays,
      pfDropoff: pfDropoff,
      pfPickup: pfPickup,
      pfFlight: pfFlight,
      pfExtra: pfExtra,
      note: note
    });
    next.visits.push(row);
    return { ok: true, state: next, visit: row };
  }
  function markOut(state, id, at, actor) {
    if (!canLog(actor && actor.role)) return { ok: false, error: "role" };
    var next = clone(state);
    var v = null;
    for (var i = 0; i < next.visits.length; i++) if (String(next.visits[i].id) === String(id)) v = next.visits[i];
    if (!v) return { ok: false, error: "missing" };
    if (!allowed(actor, v.hotel)) return { ok: false, error: "hotel" };
    if (v.checkedOut) return { ok: false, error: "out" };
    if (!at || isNaN(Date.parse(at)) || Date.parse(at) < Date.parse(v.checkedIn)) return { ok: false, error: "time" };
    v.checkedOut = at;
    return { ok: true, state: next, visit: v };
  }
  function saveSettings(state, input, actor) {
    if (!canSetup(actor && actor.role)) return { ok: false, error: "role" };
    if (!allowed(actor, input.hotel)) return { ok: false, error: "hotel" };
    var hours = Number(input.maxHoursWithoutRoom);
    var nights = Number(input.longTermNights);
    var grace = Number(input.parkFlyGraceHours);
    if (!Number.isInteger(hours) || hours < 1 || hours > 720) return { ok: false, error: "note" };
    if (!Number.isInteger(nights) || nights < 1 || nights > 365) return { ok: false, error: "note" };
    if (!Number.isInteger(grace) || grace < 0 || grace > 72) return { ok: false, error: "note" };
    var next = clone(state);
    var prev = (state.settings && state.settings[input.hotel]) || defaultSettings(input.hotel);
    next.settings[input.hotel] = {
      hotel: input.hotel,
      maxHoursWithoutRoom: hours,
      longTermNights: nights,
      parkFlyEnabled: !!input.parkFlyEnabled,
      parkFlyGraceHours: grace,
      parkingEnabled: prev.parkingEnabled == null ? input.hotel !== "MSPWE" : !!prev.parkingEnabled
    };
    return { ok: true, state: next };
  }
  function saveZone(state, input, actor) {
    if (!canSetup(actor && actor.role)) return { ok: false, error: "role" };
    if (!allowed(actor, input.hotel)) return { ok: false, error: "hotel" };
    var name = String(input.name || "").trim();
    if (!name || name.length > 40) return { ok: false, error: "name" };
    if (["standard", "long_term", "park_fly"].indexOf(input.purpose) < 0) return { ok: false, error: "zone" };
    var next = clone(state);
    var dup = next.zones.some(function (z) {
      return z.hotel === input.hotel && z.name.toLowerCase() === name.toLowerCase() && String(z.id) !== String(input.id || "");
    });
    if (dup) return { ok: false, error: "name" };
    if (input.id) {
      var z = null;
      for (var i = 0; i < next.zones.length; i++) if (String(next.zones[i].id) === String(input.id)) z = next.zones[i];
      if (!z || z.hotel !== input.hotel) return { ok: false, error: "missing" };
      z.name = name;
      z.purpose = input.purpose;
      z.active = input.active !== false;
      z.sort = Number(input.sort) || z.sort || 0;
      return { ok: true, state: next, id: z.id };
    }
    var id = "loc-z-" + input.hotel + "-" + next.zones.length;
    next.zones.push({ id: id, hotel: input.hotel, name: name, nameEs: "", purpose: input.purpose, active: input.active !== false, sort: Number(input.sort) || next.zones.length + 1 });
    return { ok: true, state: next, id: id };
  }
  function saveStall(state, input, actor) {
    if (!canSetup(actor && actor.role)) return { ok: false, error: "role" };
    if (!allowed(actor, input.hotel)) return { ok: false, error: "hotel" };
    var no = String(input.stallNo || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!/^[A-Z0-9-]{1,12}$/.test(no)) return { ok: false, error: "stall_no" };
    var zone = zoneById(state, input.zoneId);
    if (!zone || zone.hotel !== input.hotel) return { ok: false, error: "zone" };
    var notes = clip(input.notes, 80);
    if (notes == null) return { ok: false, error: "note" };
    var next = clone(state);
    var dup = next.stalls.some(function (s) {
      return s.hotel === input.hotel && s.stallNo === no && String(s.id) !== String(input.id || "");
    });
    if (dup) return { ok: false, error: "stall_no" };
    if (input.id) {
      var s = null;
      for (var i = 0; i < next.stalls.length; i++) if (String(next.stalls[i].id) === String(input.id)) s = next.stalls[i];
      if (!s || s.hotel !== input.hotel) return { ok: false, error: "missing" };
      s.zoneId = String(input.zoneId);
      s.stallNo = no;
      s.notes = notes;
      s.active = input.active !== false;
      s.sort = Number(input.sort) || s.sort || 0;
      return { ok: true, state: next, id: s.id };
    }
    var id = "loc-s-" + input.hotel + "-" + next.stalls.length;
    next.stalls.push({ id: id, hotel: input.hotel, zoneId: String(input.zoneId), stallNo: no, notes: notes, active: input.active !== false, sort: Number(input.sort) || next.stalls.length + 1 });
    return { ok: true, state: next, id: id };
  }
  function saveRange(state, input, actor) {
    if (!canSetup(actor && actor.role)) return { ok: false, error: "role" };
    var stall = stallById(state, input.stallId);
    if (!stall || !allowed(actor, stall.hotel)) return { ok: false, error: stall ? "hotel" : "zone" };
    var lo = input.roomLo === "" || input.roomLo == null ? "" : Number(input.roomLo);
    var hi = input.roomHi === "" || input.roomHi == null ? "" : Number(input.roomHi);
    var floor = String(input.floor || "").trim();
    var wing = String(input.wing || "").trim();
    var rank = Number(input.rank);
    var hasRange = lo !== "" || hi !== "";
    if (hasRange && (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi > 9999 || hi < lo)) return { ok: false, error: "range" };
    if (floor && !/^\d{1,2}$/.test(floor)) return { ok: false, error: "range" };
    if (wing.length > 20) return { ok: false, error: "note" };
    if (!hasRange && !floor && !wing) return { ok: false, error: "range" };
    if (!Number.isInteger(rank) || rank < 1 || rank > 99) return { ok: false, error: "range" };
    var next = clone(state);
    var row = { hotel: stall.hotel, stallId: String(stall.id), roomLo: hasRange ? lo : "", roomHi: hasRange ? hi : "", floor: floor, wing: wing, rank: rank, active: input.active !== false };
    if (input.id) {
      var found = null;
      for (var i = 0; i < next.ranges.length; i++) if (String(next.ranges[i].id) === String(input.id)) found = next.ranges[i];
      if (!found) return { ok: false, error: "missing" };
      Object.keys(row).forEach(function (k) { found[k] = row[k]; });
      return { ok: true, state: next, id: found.id };
    }
    row.id = "loc-r-" + stall.hotel + "-" + next.ranges.length;
    next.ranges.push(row);
    return { ok: true, state: next, id: row.id };
  }
  function isOverstay(visit, settings, now) {
    var endMs = visit.checkedOut ? Date.parse(visit.checkedOut) : Date.parse(now);
    if (visit.vehicleType === "park_fly") {
      if (!visit.pfPickup) return { over: false, reason: "" };
      var limit = Date.parse(visit.pfPickup) + (Number(settings.parkFlyGraceHours) || 0) * 3600000;
      return endMs > limit ? { over: true, reason: "pickup" } : { over: false, reason: "" };
    }
    if (visit.expectedOut && endMs > Date.parse(visit.expectedOut)) return { over: true, reason: "checkout" };
    if (!String(visit.room || "").trim()) {
      var cap = Date.parse(visit.checkedIn) + Number(settings.maxHoursWithoutRoom) * 3600000;
      if (endMs > cap) return { over: true, reason: "hours" };
    }
    return { over: false, reason: "" };
  }
  function durationMs(visit, now) {
    var end = visit.checkedOut || now;
    return Math.max(0, Date.parse(end) - Date.parse(visit.checkedIn));
  }
  function formatDuration(ms, lang) {
    if (ms == null || !isFinite(ms)) return "";
    var min = Math.max(0, Math.floor(ms / 60000));
    var d = Math.floor(min / 1440);
    var h = Math.floor((min % 1440) / 60);
    var m = min % 60;
    if (lang === "es") {
      if (d > 0) return d + " d " + h + " h";
      if (h > 0) return h + " h " + m + " min";
      return m + " min";
    }
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }
  function formatWhen(iso, lang) {
    if (!iso) return "";
    var p = chicagoParts(iso);
    if (!p.year) return "";
    if (lang === "es") return Number(p.day) + "/" + Number(p.month) + " " + p.hour + ":" + p.minute;
    var hour = Number(p.hour);
    var suffix = hour >= 12 ? "PM" : "AM";
    var h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    var mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(p.month) - 1];
    return mon + " " + Number(p.day) + ", " + h12 + ":" + p.minute + " " + suffix;
  }
  function liveList(state, hotel, now) {
    return state.visits.filter(function (v) { return v.hotel === hotel && !v.checkedOut; }).sort(function (a, b) {
      return durationMs(b, now) - durationMs(a, now) || a.plate.localeCompare(b.plate);
    });
  }
  function historyList(state, hotel, now) {
    return state.visits.filter(function (v) { return v.hotel === hotel && v.checkedOut; }).sort(function (a, b) {
      return Date.parse(b.checkedOut) - Date.parse(a.checkedOut) || a.plate.localeCompare(b.plate);
    });
  }
  function returning(state, hotel, now) {
    var today = chicagoDate(now);
    var tomorrow = addDays(today, 1);
    var rows = state.visits.filter(function (v) { return v.hotel === hotel && !v.checkedOut && v.vehicleType === "park_fly" && v.pfPickup; });
    function day(v) { return chicagoDate(v.pfPickup); }
    function byPickup(a, b) { return Date.parse(a.pfPickup) - Date.parse(b.pfPickup); }
    return {
      today: rows.filter(function (v) { return day(v) === today; }).sort(byPickup),
      tomorrow: rows.filter(function (v) { return day(v) === tomorrow; }).sort(byPickup)
    };
  }
  function avgStayMs(state, hotel, now) {
    var start = Date.parse(now) - 30 * 86400000;
    var rows = state.visits.filter(function (v) {
      return v.hotel === hotel && v.checkedOut && v.vehicleType !== "park_fly" && !v.unknown && Date.parse(v.checkedOut) >= start && Date.parse(v.checkedOut) <= Date.parse(now);
    });
    if (!rows.length) return null;
    var sum = 0;
    rows.forEach(function (v) { sum += durationMs(v, now); });
    return sum / rows.length;
  }
  function openStallCount(state, hotel) {
    var n = 0;
    (state.stalls || []).forEach(function (s) {
      if (s.hotel !== hotel || s.active === false) return;
      var z = zoneById(state, s.zoneId);
      if (!z || z.active === false) return;
      if (!openVisitInStall(state, s.id)) n += 1;
    });
    return n;
  }
  function stats(state, hotel, now) {
    var settings = state.settings[hotel] || defaultSettings(hotel);
    var live = liveList(state, hotel, now);
    var ret = returning(state, hotel, now);
    var guests = 0;
    var longTerm = 0;
    var parkFly = 0;
    live.forEach(function (v) {
      if (v.vehicleType === "park_fly") parkFly += 1;
      else if (v.longTerm) longTerm += 1;
      else guests += 1;
    });
    return {
      cars: live.length,
      avgMs: avgStayMs(state, hotel, now),
      overstays: live.filter(function (v) { return isOverstay(v, settings, now).over; }).length,
      parkFly: parkFly,
      guests: guests,
      longTerm: longTerm,
      openStalls: openStallCount(state, hotel),
      returningToday: ret.today.length,
      returningTomorrow: ret.tomorrow.length
    };
  }
  function homeSummary(state, actor, now, lang) {
    return hotelsFor(actor.role, actor.hotel).filter(function (hotel) {
      return parkingOn(state, hotel);
    }).map(function (hotel) {
      var s = stats(state, hotel, now);
      var settings = state.settings[hotel] || defaultSettings(hotel);
      return {
        hotel: hotel,
        cars: s.cars,
        avg: s.avgMs == null ? "" : formatDuration(s.avgMs, lang),
        overstays: s.overstays,
        parkFly: settings.parkFlyEnabled ? String(s.parkFly) : label("Off", lang),
        returningToday: settings.parkFlyEnabled ? String(s.returningToday) : ""
      };
    });
  }
  function blankBooking(row) {
    return {
      id: row.id,
      hotel: row.hotel,
      lastName: row.lastName || "",
      confirm: row.confirm || "",
      dropoff: row.dropoff || "",
      pickup: row.pickup || "",
      plate: row.plate || "",
      state: row.state || "",
      make: row.make || "",
      model: row.model || "",
      color: row.color || "",
      visitId: row.visitId || "",
      cancelledAt: row.cancelledAt || ""
    };
  }
  function bookingsOf(state) { return (state && state.bookings) || []; }
  function calendarOn(state, hotel) {
    if (hotel !== "MSPAM" && hotel !== "MSPMS") return false;
    if (!parkingOn(state, hotel)) return false;
    var settings = state.settings[hotel] || defaultSettings(hotel);
    return !!settings.parkFlyEnabled;
  }
  function departureIso(visit) {
    if (!visit) return "";
    if (visit.vehicleType === "park_fly") return visit.pfPickup || visit.expectedOut || "";
    return visit.expectedOut || "";
  }
  function coversLotNight(visit, day, now) {
    if (!visit || visit.hotel == null) return false;
    var start = chicagoDate(visit.checkedIn);
    if (!start || start > day) return false;
    if (visit.checkedOut) {
      var out = chicagoDate(visit.checkedOut);
      if (out && out <= day) return false;
    }
    var depIso = departureIso(visit);
    var dep = depIso ? chicagoDate(depIso) : "";
    if (!dep || dep > day) return true;
    if (depIso && now && Date.parse(depIso) <= Date.parse(now) && !visit.checkedOut) return true;
    return false;
  }
  function coversFlyNight(visit, day) {
    if (!visit || visit.vehicleType !== "park_fly") return false;
    var start = visit.pfDropoff || chicagoDate(visit.checkedIn);
    if (!start || start > day) return false;
    if (visit.checkedOut) {
      var out = chicagoDate(visit.checkedOut);
      if (out && out <= day) return false;
    }
    var end = visit.pfPickup ? chicagoDate(visit.pfPickup) : "";
    if (end && end <= day) return false;
    return true;
  }
  function bookingCovers(b, day) {
    return !!(b && !b.cancelledAt && !b.visitId && b.dropoff && b.pickup && b.dropoff <= day && b.pickup > day);
  }
  function projectedLot(state, hotel, day, now) {
    var n = 0;
    (state.visits || []).forEach(function (v) {
      if (v.hotel === hotel && coversLotNight(v, day, now)) n += 1;
    });
    bookingsOf(state).forEach(function (b) {
      if (b.hotel === hotel && bookingCovers(b, day)) n += 1;
    });
    return n;
  }
  function flyDropoffs(state, hotel, day) {
    var rows = [];
    bookingsOf(state).forEach(function (b) {
      if (b.hotel === hotel && !b.cancelledAt && !b.visitId && b.dropoff === day) rows.push({ kind: "booking", booking: b });
    });
    (state.visits || []).forEach(function (v) {
      if (v.hotel !== hotel || v.vehicleType !== "park_fly") return;
      var d = v.pfDropoff || chicagoDate(v.checkedIn);
      if (d === day) rows.push({ kind: "visit", visit: v });
    });
    return rows;
  }
  function flyPickups(state, hotel, day) {
    var rows = [];
    bookingsOf(state).forEach(function (b) {
      if (b.hotel === hotel && !b.cancelledAt && !b.visitId && b.pickup === day) rows.push({ kind: "booking", booking: b });
    });
    (state.visits || []).forEach(function (v) {
      if (v.hotel !== hotel || v.vehicleType !== "park_fly" || !v.pfPickup) return;
      if (chicagoDate(v.pfPickup) === day) rows.push({ kind: "visit", visit: v });
    });
    return rows;
  }
  function flyNightCount(state, hotel, day) {
    var n = 0;
    (state.visits || []).forEach(function (v) {
      if (v.hotel === hotel && coversFlyNight(v, day)) n += 1;
    });
    bookingsOf(state).forEach(function (b) {
      if (b.hotel === hotel && bookingCovers(b, day)) n += 1;
    });
    return n;
  }
  function flyStaying(state, hotel, day) {
    var rows = [];
    (state.visits || []).forEach(function (v) {
      if (v.hotel === hotel && coversFlyNight(v, day)) rows.push({ kind: "visit", visit: v });
    });
    bookingsOf(state).forEach(function (b) {
      if (b.hotel === hotel && bookingCovers(b, day)) rows.push({ kind: "booking", booking: b });
    });
    return rows;
  }
  function monthDays(ym) {
    var parts = String(ym || "").split("-");
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    if (!year || month < 1 || month > 12) return [];
    var first = parts[0] + "-" + pad(month) + "-01";
    var days = [];
    var cursor = first;
    while (cursor.slice(0, 7) === first.slice(0, 7)) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    var startDow = new Date(first + "T12:00:00Z").getUTCDay();
    return { year: year, month: month, startDow: startDow, days: days };
  }
  function calendarModel(state, hotel, ym, selected, now) {
    var grid = monthDays(ym || chicagoDate(now).slice(0, 7));
    var days = grid.days.map(function (date) {
      return {
        date: date,
        dropoffs: flyDropoffs(state, hotel, date).length,
        pickups: flyPickups(state, hotel, date).length,
        parked: flyNightCount(state, hotel, date),
        selected: date === selected
      };
    });
    return {
      hotel: hotel,
      month: grid.year + "-" + pad(grid.month),
      year: grid.year,
      monthIndex: grid.month,
      startDow: grid.startDow,
      days: days,
      selected: selected || "",
      detail: selected ? {
        date: selected,
        dropoffs: flyDropoffs(state, hotel, selected),
        pickups: flyPickups(state, hotel, selected),
        staying: flyStaying(state, hotel, selected),
        parked: flyNightCount(state, hotel, selected)
      } : null
    };
  }
  function openBooking(state, hotel, confirm) {
    return bookingsOf(state).some(function (b) {
      return b.hotel === hotel && !b.cancelledAt && !b.visitId && b.confirm === confirm;
    });
  }
  function saveBooking(state, input, actor, now) {
    if (!canLog(actor && actor.role)) return { ok: false, error: "role" };
    var hotel = input && input.hotel;
    if (!allowed(actor, hotel)) return { ok: false, error: "hotel" };
    if (!calendarOn(state, hotel)) return { ok: false, error: "park_fly_off" };
    var lastName = normName(input.lastName);
    if (!lastName) return { ok: false, error: "last" };
    var confirm = normConfirm(input.confirm);
    if (!/^[A-Z0-9-]{2,24}$/.test(confirm)) return { ok: false, error: "confirm" };
    var dropoff = String(input.dropoff || "");
    var pickup = String(input.pickup || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dropoff)) return { ok: false, error: "dropoff" };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickup) || pickup < dropoff) return { ok: false, error: "pickup" };
    if (dateDiff(dropoff, pickup) > 60) return { ok: false, error: "days" };
    var plate = normPlate(input.plate);
    var st = normState(input.state);
    if (plate && !/^[A-Z0-9]{2,8}$/.test(plate)) return { ok: false, error: "plate" };
    if (plate && !/^[A-Z]{2}$/.test(st)) return { ok: false, error: "state" };
    if (!plate) { plate = ""; st = ""; }
    var make = clip(input.make, 30);
    var model = clip(input.model, 30);
    var color = clip(input.color, 30);
    if (make == null || model == null || color == null) return { ok: false, error: "note" };
    if (openBooking(state, hotel, confirm)) return { ok: false, error: "already" };
    var next = clone(state);
    if (!next.bookings) next.bookings = [];
    var row = blankBooking({
      id: "bk-" + hotel + "-" + confirm,
      hotel: hotel,
      lastName: lastName,
      confirm: confirm,
      dropoff: dropoff,
      pickup: pickup,
      plate: plate,
      state: st,
      make: make,
      model: model,
      color: color
    });
    next.bookings.push(row);
    var settled = settleBookings(next, now);
    var saved = bookingsOf(settled.state).filter(function (b) { return b.confirm === confirm && b.hotel === hotel; }).pop();
    return { ok: true, state: settled.state, booking: saved || row };
  }
  function arriveBooking(state, id, input, actor, now) {
    if (!canLog(actor && actor.role)) return { ok: false, error: "role" };
    var next = clone(state);
    var row = null;
    bookingsOf(next).forEach(function (b) { if (String(b.id) === String(id)) row = b; });
    if (!row || row.cancelledAt || row.visitId) return { ok: false, error: "missing" };
    if (!allowed(actor, row.hotel)) return { ok: false, error: "hotel" };
    if (!calendarOn(next, row.hotel)) return { ok: false, error: "park_fly_off" };
    var plate = normPlate(input && input.plate);
    var st = normState(input && input.state);
    if (!/^[A-Z0-9]{2,8}$/.test(plate)) return { ok: false, error: "plate" };
    if (!/^[A-Z]{2}$/.test(st)) return { ok: false, error: "state" };
    var make = clip(input.make, 30);
    var model = clip(input.model, 30);
    var color = clip(input.color, 30);
    if (make == null || model == null || color == null) return { ok: false, error: "note" };
    row.plate = plate;
    row.state = st;
    if (make) row.make = make;
    if (model) row.model = model;
    if (color) row.color = color;
    var settled = settleBookings(next, now);
    var saved = null;
    bookingsOf(settled.state).forEach(function (b) { if (String(b.id) === String(id)) saved = b; });
    return { ok: true, state: settled.state, booking: saved };
  }
  function settleBookings(state, now) {
    if (!state || state.origin === "supabase" || state.origin === "loading") return { ok: true, state: state, changed: false };
    var today = chicagoDate(now);
    var due = bookingsOf(state).some(function (b) {
      return !b.cancelledAt && !b.visitId && b.plate && b.dropoff && b.dropoff <= today && calendarOn(state, b.hotel);
    });
    if (!due) return { ok: true, state: state, changed: false };
    var next = state;
    var changed = false;
    bookingsOf(state).forEach(function (b) {
      if (b.cancelledAt || b.visitId || !b.plate || !b.dropoff || b.dropoff > today) return;
      if (!calendarOn(next, b.hotel)) return;
      var nights = dateDiff(b.dropoff, b.pickup);
      if (nights < 1) nights = 1;
      if (nights > 60) return;
      var checkedIn = b.dropoff === today ? now : atDate(b.dropoff, 12, 0);
      var res = logVisit(next, {
        system: true,
        hotel: b.hotel,
        plate: b.plate,
        state: b.state || "MN",
        make: b.make,
        model: b.model,
        color: b.color,
        vehicleType: "park_fly",
        checkedIn: checkedIn,
        pfConfirm: b.confirm,
        pfDays: nights,
        pfDropoff: b.dropoff,
        pfPickup: atDate(b.pickup, 15, 0)
      }, null, now);
      if (!res.ok) return;
      next = res.state;
      bookingsOf(next).forEach(function (row) {
        if (String(row.id) === String(b.id)) row.visitId = res.visit.id;
      });
      changed = true;
    });
    return { ok: true, state: next, changed: changed };
  }
  function isParkingAlert(a) {
    if (!a) return false;
    var kind = String(a.kind || "");
    if (kind === "parking" || kind === "park_fly") return true;
    var text = String(a.title || "") + " " + String(a.body || "") + " " + String(a.message || "");
    return /park\s*&\s*fly|estaciona y vuela/i.test(text);
  }
  function parkingAlertRows(state, actor, now, lang) {
    if (!state || !canSee(actor && actor.role)) return [];
    var rows = [];
    hotelsFor(actor.role, actor.hotel).forEach(function (hotel) {
      if (!parkingOn(state, hotel)) return;
      var settings = state.settings[hotel] || defaultSettings(hotel);
      if (!settings.parkFlyEnabled) return;
      liveList(state, hotel, now).forEach(function (v) {
        if (v.vehicleType !== "park_fly") return;
        if (!isOverstay(v, settings, now).over) return;
        rows.push({
          id: "pk-" + hotel + "-" + v.id,
          kind: "parking",
          hotel: hotel,
          roles: ALERT_ROLES.slice(),
          title: label("Park & Fly overdue", lang),
          body: v.plate + " — " + label("This Park & Fly car is still here after pickup.", lang)
        });
      });
    });
    return rows;
  }
  function showParkingTile(role, hotelOn) { return !!hotelOn && canSee(role); }
  function typeName(visit, lang) {
    if (visit.vehicleType === "park_fly") return label("Park & Fly", lang);
    if (visit.unknown) return label("Unknown", lang);
    if (visit.longTerm) return label("Long-term", lang);
    return label("Guest", lang);
  }
  function cellsFor(visit, state, now, lang) {
    var settings = state.settings[visit.hotel] || defaultSettings(visit.hotel);
    var stall = stallById(state, visit.stallId);
    var zone = stall ? zoneById(state, stall.zoneId) : null;
    var over = isOverstay(visit, settings, now);
    return {
      plate: visit.plate,
      state: visit.state,
      stall: stall ? stall.stallNo : "",
      lot: zoneName(zone, lang),
      room: visit.room || "",
      make: visit.make || "",
      model: visit.model || "",
      color: visit.color || "",
      permit: visit.permit || "",
      parked: formatDuration(durationMs(visit, now), lang),
      checkout: formatWhen(visit.expectedOut, lang),
      pickup: formatWhen(visit.pfPickup, lang),
      type: typeName(visit, lang),
      paid: visit.paid ? label("Paid", lang) : label("Complimentary", lang),
      overstay: over.over ? label("Yes", lang) : label("No", lang),
      unknown: visit.unknown ? label("Yes", lang) : label("No", lang)
    };
  }
  function board(state, hotel, now) {
    var settings = state.settings[hotel] || defaultSettings(hotel);
    return state.zones.filter(function (z) { return z.hotel === hotel && z.active !== false; }).sort(function (a, b) {
      return (a.sort || 0) - (b.sort || 0);
    }).map(function (z) {
      var stalls = state.stalls.filter(function (s) { return String(s.zoneId) === String(z.id) && s.active !== false; }).sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0) || a.stallNo.localeCompare(b.stallNo);
      }).map(function (s) {
        var v = openVisitInStall(state, s.id);
        var kind = "open";
        if (v) {
          if (v.unknown) kind = "unknown";
          else if (v.vehicleType === "park_fly") kind = "park_fly";
          else if (v.longTerm) kind = "long_term";
          else kind = "occupied";
        }
        return {
          id: s.id,
          stallNo: s.stallNo,
          notes: s.notes || "",
          kind: kind,
          over: v ? isOverstay(v, settings, now).over : false
        };
      });
      var counts = { open: 0, occupied: 0, long_term: 0, park_fly: 0, unknown: 0 };
      stalls.forEach(function (s) { counts[s.kind] += 1; });
      return { id: z.id, name: z.name, nameEs: z.nameEs || "", purpose: z.purpose, counts: counts, stalls: stalls };
    });
  }
  function pageModel(state, actor, now, hotel, ui) {
    var settings = state.settings[hotel] || defaultSettings(hotel);
    var q = normPlate(ui && ui.q);
    var today = chicagoDate(now);
    function hit(v) { return !q || v.plate.indexOf(q) >= 0; }
    return {
      hotel: hotel,
      hotels: hotelsFor(actor.role, actor.hotel),
      settings: settings,
      stats: stats(state, hotel, now),
      tonight: stats(state, hotel, now),
      tomorrowCount: projectedLot(state, hotel, addDays(today, 1), now),
      calendar: calendarOn(state, hotel) ? calendarModel(state, hotel, (ui && ui.month) || today.slice(0, 7), (ui && ui.day) || "", now) : null,
      board: board(state, hotel, now),
      live: liveList(state, hotel, now).filter(hit),
      history: historyList(state, hotel, now).filter(hit),
      returning: settings.parkFlyEnabled ? returning(state, hotel, now) : { today: [], tomorrow: [] },
      canLog: canLog(actor.role),
      canSee: canSee(actor.role),
      canSetup: canSetup(actor.role),
      query: q
    };
  }

  function zone(id, hotel, name, nameEs, purpose, sort) {
    return { id: id, hotel: hotel, name: name, nameEs: nameEs, purpose: purpose, active: true, sort: sort };
  }
  function stall(id, hotel, zoneId, stallNo, notes, sort) {
    return { id: id, hotel: hotel, zoneId: zoneId, stallNo: stallNo, notes: notes || "", active: true, sort: sort };
  }
  function range(id, hotel, stallId, lo, hi, floor, wing, rank) {
    return { id: id, hotel: hotel, stallId: stallId, roomLo: lo, roomHi: hi, floor: floor || "", wing: wing || "", rank: rank, active: true };
  }
  function car(row) { return blankVisit(row); }
  function buildDemo(now) {
    var settings = {};
    HOTELS.forEach(function (h) { settings[h] = defaultSettings(h); });
    var zones = [
      zone("we-a", "MSPWE", "Lot A", "Lote A", "standard", 1),
      zone("we-b", "MSPWE", "Lot B", "Lote B", "standard", 2),
      zone("we-l", "MSPWE", "Long-term", "Larga estancia", "long_term", 3),
      zone("am-a", "MSPAM", "Lot A", "Lote A", "standard", 1),
      zone("am-l", "MSPAM", "Long-term", "Larga estancia", "long_term", 2),
      zone("am-p", "MSPAM", "Park & Fly", "Estaciona y vuela", "park_fly", 3),
      zone("ms-a", "MSPMS", "Lot A", "Lote A", "standard", 1),
      zone("ms-l", "MSPMS", "Long-term", "Larga estancia", "long_term", 2),
      zone("ms-p", "MSPMS", "Park & Fly", "Estaciona y vuela", "park_fly", 3)
    ];
    var stalls = [
      stall("we-a1", "MSPWE", "we-a", "A1", "", 1),
      stall("we-a2", "MSPWE", "we-a", "A2", "", 2),
      stall("we-a3", "MSPWE", "we-a", "A3", "ADA", 3),
      stall("we-a4", "MSPWE", "we-a", "A4", "EV", 4),
      stall("we-b1", "MSPWE", "we-b", "B1", "", 1),
      stall("we-b2", "MSPWE", "we-b", "B2", "", 2),
      stall("we-l1", "MSPWE", "we-l", "L1", "Oversize", 1),
      stall("we-l2", "MSPWE", "we-l", "L2", "", 2),
      stall("we-l3", "MSPWE", "we-l", "L3", "", 3),
      stall("am-a1", "MSPAM", "am-a", "A1", "", 1),
      stall("am-a2", "MSPAM", "am-a", "A2", "ADA", 2),
      stall("am-l1", "MSPAM", "am-l", "L1", "", 1),
      stall("am-l2", "MSPAM", "am-l", "L2", "", 2),
      stall("am-p1", "MSPAM", "am-p", "P1", "", 1),
      stall("am-p2", "MSPAM", "am-p", "P2", "", 2),
      stall("am-p3", "MSPAM", "am-p", "P3", "", 3),
      stall("am-p4", "MSPAM", "am-p", "P4", "", 4),
      stall("am-p5", "MSPAM", "am-p", "P5", "EV", 5),
      stall("ms-a1", "MSPMS", "ms-a", "A1", "", 1),
      stall("ms-a2", "MSPMS", "ms-a", "A2", "", 2),
      stall("ms-l1", "MSPMS", "ms-l", "L1", "", 1),
      stall("ms-p1", "MSPMS", "ms-p", "P1", "", 1),
      stall("ms-p2", "MSPMS", "ms-p", "P2", "", 2),
      stall("ms-p3", "MSPMS", "ms-p", "P3", "", 3)
    ];
    var ranges = [
      range("we-r1", "MSPWE", "we-a1", 101, 104, "1", "East", 1),
      range("we-r2", "MSPWE", "we-a1", 105, 108, "1", "East", 2),
      range("we-r3", "MSPWE", "we-a2", 101, 104, "1", "East", 1),
      range("we-r4", "MSPWE", "we-a2", 105, 108, "1", "East", 2),
      range("we-r5", "MSPWE", "we-a3", 105, 108, "1", "East", 1),
      range("we-r6", "MSPWE", "we-a3", 101, 104, "1", "East", 3),
      range("we-r7", "MSPWE", "we-a4", 201, 204, "2", "West", 1),
      range("we-r8", "MSPWE", "we-a4", 101, 108, "1", "", 4),
      range("we-r9", "MSPWE", "we-b1", 301, 304, "3", "", 1),
      range("we-r10", "MSPWE", "we-b1", 201, 208, "2", "West", 2),
      range("we-r11", "MSPWE", "we-b2", 305, 308, "3", "", 1),
      range("am-r1", "MSPAM", "am-a1", 101, 120, "1", "", 1),
      range("am-r2", "MSPAM", "am-a1", 201, 208, "2", "", 2),
      range("am-r3", "MSPAM", "am-a2", 201, 208, "2", "", 1),
      range("am-r4", "MSPAM", "am-a2", 101, 120, "1", "", 2),
      range("we-r12", "MSPWE", "we-a1", 109, 120, "1", "East", 3),
      range("we-r13", "MSPWE", "we-a2", 109, 120, "1", "East", 3),
      range("ms-r1", "MSPMS", "ms-a1", 101, 108, "1", "", 1),
      range("ms-r2", "MSPMS", "ms-a2", 201, 208, "2", "", 1)
    ];
    var visits = [
      car({ id: "we-v1", hotel: "MSPWE", plate: "EXA1101", stallId: "we-a3", room: "106", make: "Sample", model: "Sedan", color: "Blue", permit: "TAGEX1", paid: true, rateNote: "On the folio", checkedIn: shift(now, -26), expectedOut: atLocal(now, 0, 11, 0) }),
      car({ id: "we-v2", hotel: "MSPWE", plate: "EXA1102", stallId: "we-l3", color: "White", checkedIn: shift(now, -80) }),
      car({ id: "we-v3", hotel: "MSPWE", plate: "EXA1103", stallId: "we-a4", room: "204", checkedIn: shift(now, -5), expectedOut: shift(now, 48) }),
      car({ id: "we-v4", hotel: "MSPWE", plate: "EXA1104", stallId: "we-l1", room: "102", longTerm: true, checkedIn: shift(now, -48), expectedOut: shift(now, 240) }),
      car({ id: "we-v5", hotel: "MSPWE", plate: "EXA1105", stallId: "we-b2", color: "Silver", unknown: true, checkedIn: shift(now, -1) }),
      car({ id: "we-v6", hotel: "MSPWE", plate: "EXA1106", room: "101", checkedIn: shift(now, -30), checkedOut: shift(now, -6), expectedOut: shift(now, -6) }),
      car({ id: "we-v7", hotel: "MSPWE", plate: "EXA1107", room: "201", checkedIn: shift(now, -72), checkedOut: shift(now, -24), expectedOut: shift(now, -24) }),
      car({ id: "am-v1", hotel: "MSPAM", plate: "EXA2101", stallId: "am-a2", room: "201", checkedIn: shift(now, -3), expectedOut: shift(now, 24) }),
      car({ id: "am-v2", hotel: "MSPAM", plate: "EXA2102", stallId: "am-l1", room: "105", longTerm: true, checkedIn: shift(now, -20), expectedOut: shift(now, 240) }),
      car({ id: "am-v3", hotel: "MSPAM", plate: "EXA2103", stallId: "am-p1", vehicleType: "park_fly", pfConfirm: "SAMPLE1", pfDays: 7, pfDropoff: addDays(chicagoDate(now), -1), pfPickup: atLocal(now, 4, 15, 0), pfFlight: "SAMPLE 100", expectedOut: atLocal(now, -1, 11, 0), checkedIn: shift(now, -30) }),
      car({ id: "am-v4", hotel: "MSPAM", plate: "EXA2104", stallId: "am-p2", vehicleType: "park_fly", pfConfirm: "SAMPLE2", pfDays: 4, pfDropoff: chicagoDate(now), pfPickup: atLocal(now, 0, 18, 0), pfFlight: "SAMPLE 200", checkedIn: shift(now, -4) }),
      car({ id: "am-v5", hotel: "MSPAM", plate: "EXA2105", stallId: "am-p3", vehicleType: "park_fly", pfConfirm: "SAMPLE3", pfDays: 5, pfDropoff: addDays(chicagoDate(now), -2), pfPickup: atLocal(now, 1, 9, 0), checkedIn: shift(now, -50) }),
      car({ id: "am-v6", hotel: "MSPAM", plate: "EXA2106", stallId: "am-p4", vehicleType: "park_fly", pfConfirm: "SAMPLE4", pfDays: 3, pfDropoff: addDays(chicagoDate(now), -4), pfPickup: atLocal(now, -1, 10, 0), pfExtra: "1 day past the package", expectedOut: atLocal(now, -3, 11, 0), checkedIn: shift(now, -96) }),
      car({ id: "am-v7", hotel: "MSPAM", plate: "EXA2107", room: "108", checkedIn: shift(now, -26), checkedOut: shift(now, -6), expectedOut: shift(now, -6) }),
      car({ id: "am-v8", hotel: "MSPAM", plate: "EXA2108", vehicleType: "park_fly", pfConfirm: "SAMPLE5", pfDays: 6, pfDropoff: addDays(chicagoDate(now), -8), pfPickup: shift(now, -6), checkedIn: shift(now, -126), checkedOut: shift(now, -6) }),
      car({ id: "ms-v1", hotel: "MSPMS", plate: "EXA3101", stallId: "ms-a1", room: "108", checkedIn: shift(now, -20), expectedOut: shift(now, -2) }),
      car({ id: "ms-v2", hotel: "MSPMS", plate: "EXA3102", stallId: "ms-p1", vehicleType: "park_fly", pfConfirm: "SAMPLE6", pfDays: 4, pfDropoff: addDays(chicagoDate(now), -1), pfPickup: atLocal(now, 1, 16, 0), checkedIn: shift(now, -20) }),
      car({ id: "ms-v3", hotel: "MSPMS", plate: "EXA3103", stallId: "ms-p2", vehicleType: "park_fly", pfConfirm: "SAMPLE7", pfDays: 8, pfDropoff: addDays(chicagoDate(now), -2), pfPickup: atLocal(now, 5, 12, 0), expectedOut: atLocal(now, -1, 11, 0), checkedIn: shift(now, -40) }),
      car({ id: "ms-v4", hotel: "MSPMS", plate: "EXA3104", room: "202", checkedIn: shift(now, -20), checkedOut: shift(now, -10), expectedOut: shift(now, -10) })
    ];
    var today = chicagoDate(now);
    var bookings = [
      blankBooking({ id: "am-b1", hotel: "MSPAM", lastName: "Sample", confirm: "SAMPLE9", dropoff: addDays(today, 1), pickup: addDays(today, 5) }),
      blankBooking({ id: "am-b2", hotel: "MSPAM", lastName: "Sample", confirm: "SAMPLE10", dropoff: addDays(today, 3), pickup: addDays(today, 8), plate: "EXA2990", state: "MN" }),
      blankBooking({ id: "ms-b1", hotel: "MSPMS", lastName: "Sample", confirm: "SAMPLE11", dropoff: addDays(today, 2), pickup: addDays(today, 6) })
    ];
    return { origin: "example", demoVersion: 3, settings: settings, zones: zones, stalls: stalls, ranges: ranges, visits: visits, bookings: bookings };
  }
  function mapSettings(row) {
    return {
      hotel: row.hotel,
      maxHoursWithoutRoom: Number(row.max_hours_without_room),
      longTermNights: Number(row.long_term_nights),
      parkFlyEnabled: !!row.park_fly_enabled,
      parkFlyGraceHours: Number(row.park_fly_grace_hours),
      parkingEnabled: row.parking_enabled == null ? row.hotel !== "MSPWE" : !!row.parking_enabled
    };
  }
  function mapZone(row) {
    return { id: String(row.id), hotel: row.hotel, name: row.name, nameEs: "", purpose: row.purpose, active: !!row.active, sort: Number(row.sort_order) || 0 };
  }
  function mapStall(row) {
    return { id: String(row.id), hotel: row.hotel, zoneId: String(row.zone_id), stallNo: row.stall_no, notes: row.notes || "", active: !!row.active, sort: Number(row.sort_order) || 0 };
  }
  function mapRange(row) {
    return {
      id: String(row.id), hotel: row.hotel, stallId: String(row.stall_id),
      roomLo: row.room_lo == null ? "" : Number(row.room_lo),
      roomHi: row.room_hi == null ? "" : Number(row.room_hi),
      floor: row.floor || "", wing: row.wing || "", rank: Number(row.rank), active: !!row.active
    };
  }
  function mapVisit(row) {
    return blankVisit({
      id: String(row.id),
      hotel: row.hotel,
      plate: row.plate,
      state: row.plate_state,
      make: row.make || "",
      model: row.model || "",
      color: row.color || "",
      stallId: row.stall_id == null ? "" : String(row.stall_id),
      room: row.room || "",
      checkedIn: row.checked_in_at,
      expectedOut: row.expected_out_at || "",
      checkedOut: row.checked_out_at || "",
      permit: row.permit || "",
      paid: !!row.paid,
      rateNote: row.rate_note || "",
      longTerm: !!row.long_term,
      unknown: !!row.unknown,
      vehicleType: row.vehicle_type,
      pfConfirm: row.pf_confirm || "",
      pfDays: row.pf_days == null ? "" : Number(row.pf_days),
      pfDropoff: row.pf_dropoff || "",
      pfPickup: row.pf_pickup_at || "",
      pfFlight: row.pf_flight || "",
      pfExtra: row.pf_extra_note || "",
      note: row.note || ""
    });
  }
  function mapBooking(row) {
    return blankBooking({
      id: String(row.id),
      hotel: row.hotel,
      lastName: row.last_name || "",
      confirm: row.confirm || "",
      dropoff: row.dropoff || "",
      pickup: row.pickup || "",
      plate: row.plate || "",
      state: row.plate_state || "",
      make: row.make || "",
      model: row.model || "",
      color: row.color || "",
      visitId: row.visit_id == null ? "" : String(row.visit_id),
      cancelledAt: row.cancelled_at || ""
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function dash(v) { return v == null || v === "" ? "—" : String(v); }
  function td(lab, value) {
    return "<td data-label=\"" + esc(lab) + "\">" + esc(dash(value)) + "</td>";
  }
  function table(headers, rows) {
    return "<table class=\"pk-t\"><thead><tr>" + headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table>";
  }
  function purposeName(purpose, lang) {
    if (purpose === "long_term") return label("Long-term", lang);
    if (purpose === "park_fly") return label("Park & Fly", lang);
    return label("Guest stalls", lang);
  }
  function statusName(kind, over, lang) {
    if (over) return label("Overstay", lang);
    if (kind === "open") return label("Open", lang);
    if (kind === "occupied") return label("Occupied", lang);
    if (kind === "long_term") return label("Long-term", lang);
    if (kind === "park_fly") return label("Park & Fly", lang);
    return label("Unknown", lang);
  }
  function suggestBlock(reason, stallNo, lang) {
    if (reason === "off") return "<p class=\"pk-note\" id=\"pkSuggest\">" + esc(label("Park & Fly is off at this hotel.", lang)) + "</p>";
    var why = reason === "unmapped" ? label("No stall is mapped to that room yet. Pick an open stall.", lang) : !stallNo ? label("No open stall in that area.", lang) : reason === "park_fly" ? label("Park & Fly area", lang) : reason === "long_term" ? label("Long-term area", lang) : label("Closest open stall", lang);
    return "<p class=\"pk-note\" id=\"pkSuggest\"><b>" + esc(stallNo || "—") + "</b></p><p class=\"pk-note\" id=\"pkSuggestWhy\">" + esc(why) + "</p>";
  }
  function liveRow(visit, state, now, lang, withOut) {
    var c = cellsFor(visit, state, now, lang);
    var over = c.overstay === label("Yes", lang);
    var cls = over ? "pk-over" : (visit.unknown ? "pk-unk" : "");
    var out = withOut ? "<td data-label=\"" + esc(label("Out", lang)) + "\"><button type=\"button\" class=\"btn2 pk-out\" onclick=\"pkOut('" + esc(visit.id) + "')\">" + esc(label("Mark out", lang)) + "</button></td>" : "";
    var shuttle = shuttleCell(visit, lang);
    return "<tr class=\"" + cls + "\">" + [
      td(label("Plate", lang), c.plate),
      td(label("Stall", lang), c.stall),
      td(label("Parked", lang), c.parked),
      td(label("Room", lang), c.room),
      td(label("Overstay", lang), c.overstay),
      td(label("Unknown", lang), c.unknown),
      td(label("Type", lang), c.type),
      td(label("Checkout", lang), c.checkout),
      td(label("Pickup", lang), c.pickup),
      td(label("State", lang), c.state),
      td(label("Lot", lang), c.lot),
      td(label("Make", lang), c.make),
      td(label("Model", lang), c.model),
      td(label("Color", lang), c.color),
      td(label("Permit", lang), c.permit),
      td(label("Paid", lang), c.paid)
    ].join("") + shuttle + out + "</tr>";
  }
  function shuttleCell(visit, lang) {
    if (typeof root.shParkingAction !== "function") return "";
    var html = "";
    try { html = root.shParkingAction(visit, lang) || ""; } catch (e) { html = ""; }
    return "<td data-label=\"" + esc(label("Shuttle signup", lang)) + "\">" + html + "</td>";
  }
  function liveHeaders(lang, withOut) {
    var h = ["Plate", "Stall", "Parked", "Room", "Overstay", "Unknown", "Type", "Checkout", "Pickup", "State", "Lot", "Make", "Model", "Color", "Permit", "Paid"].map(function (k) { return label(k, lang); });
    if (typeof root.shParkingAction === "function") h.push(label("Shuttle signup", lang));
    if (withOut) h.push(label("Out", lang));
    return h;
  }
  function kpi(items) {
    return "<div class=\"pk-kpi\" id=\"pkStats\">" + items.map(function (it) {
      return "<div><b" + (it.id ? " id=\"" + it.id + "\"" : "") + ">" + esc(dash(it.value)) + "</b><span>" + esc(it.label) + "</span></div>";
    }).join("") + "</div>";
  }
  function statsKpi(model, lang) {
    var s = model.stats;
    var items = [
      { id: "pkCars", value: s.cars, label: label("Cars now", lang) },
      { id: "pkAvg", value: s.avgMs == null ? "" : formatDuration(s.avgMs, lang), label: label("Avg stay", lang) },
      { id: "pkOver", value: s.overstays, label: label("Overstays today", lang) }
    ];
    if (model.settings.parkFlyEnabled) {
      items.push({ id: "pkPf", value: s.parkFly, label: label("Park & Fly", lang) });
      items.push({ id: "pkDue", value: s.returningToday, label: label("Returning today", lang) });
    } else items.push({ id: "pkPf", value: label("Off", lang), label: label("Park & Fly", lang) });
    return kpi(items);
  }
  function stallOptions(state, hotel, lang, selected) {
    var html = "<option value=\"\">" + esc(label("Unassigned", lang)) + "</option>";
    state.zones.filter(function (z) { return z.hotel === hotel && z.active !== false; }).sort(function (a, b) { return a.sort - b.sort; }).forEach(function (z) {
      var opts = state.stalls.filter(function (s) {
        return String(s.zoneId) === String(z.id) && s.active !== false && !openVisitInStall(state, s.id);
      }).sort(function (a, b) { return a.sort - b.sort || a.stallNo.localeCompare(b.stallNo); });
      if (!opts.length) return;
      html += "<optgroup label=\"" + esc(zoneName(z, lang)) + "\">" + opts.map(function (s) {
        return "<option value=\"" + esc(s.id) + "\"" + (String(selected) === String(s.id) ? " selected" : "") + ">" + esc(s.stallNo) + "</option>";
      }).join("") + "</optgroup>";
    });
    return html;
  }
  function renderParking(state, opts) {
    var lang = opts.lang === "es" ? "es" : "en";
    var actor = opts.actor;
    var now = opts.now;
    var ui = opts.ui || { screen: "board", q: "" };
    var hotel = opts.hotel;
    if (!canSee(actor && actor.role)) {
      return "<div class=\"raw pk\" id=\"pkRoot\"><h2>" + esc(label("Parking", lang)) + "</h2><p id=\"pkDenied\">" + esc(label("Parking isn't on your list.", lang)) + "</p></div>";
    }
    if (hotel && !parkingOn(state, hotel)) {
      return "<div class=\"raw pk\" id=\"pkRoot\"><h2>" + esc(label("Parking", lang)) + "</h2><p id=\"pkOff\">" + esc(label("Parking is off at this hotel.", lang)) + "</p><p class=\"pk-note\">" + esc(label("JR Corporate can turn it on.", lang)) + "</p></div>";
    }
    if (!hotel) {
      return "<div class=\"raw pk\" id=\"pkRoot\"><h2>" + esc(label("Parking", lang)) + "</h2><p>" + esc(label("You can't change parking.", lang)) + "</p></div>";
    }
    var model = pageModel(state, actor, now, hotel, ui);
    var screen = ui.screen || "board";
    var banner = state.origin === "supabase" ? "" : "<p class=\"pk-note\"><span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span> " + esc(label("Sample vehicles for this demo. Not real plates or guests.", lang)) + "</p>";
    var hotels = model.hotels.length > 1 ? "<div class=\"pk-hotels\">" + model.hotels.map(function (h) {
      return "<button type=\"button\" class=\"" + (h === hotel ? "on" : "") + "\" onclick=\"pkHotel('" + h + "')\">" + esc(h) + "</button>";
    }).join("") + "</div>" : "";
    var back = screen === "board" ? "" : "<button type=\"button\" class=\"btn2 pk-back\" onclick=\"pkScreen('board')\">" + esc(label("Back", lang)) + "</button>";
    var err = ui.error ? "<p class=\"fe\" id=\"pkErr\">" + esc(label(ERRORS[ui.error] || "Could not save.", lang)) + "</p>" : "";
    var noticeText = ui.notice === "out" ? "Vehicle marked out." : ui.notice === "in" ? "Vehicle saved." : ui.notice === "book" ? "Booking saved." : "Sample data reset.";
    var notice = ui.notice ? "<p class=\"pk-note\" id=\"pkNotice\">" + esc(label(noticeText, lang)) + "</p>" : "";
    var body = "";
    if (screen === "log") body = renderLog(state, model, ui, now, lang);
    else if (screen === "walk") body = renderWalk(state, model, lang);
    else if (screen === "history") body = renderHistory(model, state, now, lang);
    else if (screen === "setup") body = renderSetup(state, model, lang);
    else if (screen === "book") body = renderBook(model, ui, lang);
    else if (screen === "arrive") body = renderArrive(state, ui, lang);
    else body = heroHtml(model, lang) + renderCalendar(model, state, now, lang) + renderBoard(state, model, now, lang);
    var actions = screen === "board" ? "<div class=\"pk-actions\">" +
      "<button type=\"button\" class=\"btn\" id=\"pkLogBtn\" onclick=\"pkScreen('log')\">" + esc(label("Log a vehicle", lang)) + "</button>" +
      "<button type=\"button\" class=\"btn2\" id=\"pkWalkBtn\" onclick=\"pkScreen('walk')\">" + esc(label("Lot walk", lang)) + "</button>" +
      "<button type=\"button\" class=\"btn2\" id=\"pkHistBtn\" onclick=\"pkScreen('history')\">" + esc(label("History", lang)) + "</button>" +
      (model.canSetup ? "<button type=\"button\" class=\"btn2\" id=\"pkSetupBtn\" onclick=\"pkScreen('setup')\">" + esc(label("Stall setup", lang)) + "</button>" : "") +
      (state.origin === "example" ? "<button type=\"button\" class=\"btn2\" onclick=\"pkReset()\">" + esc(label("Reset sample data", lang)) + "</button>" : "") +
      "</div>" : "";
    var head = "<div class=\"raw pk\" id=\"pkRoot\"><h2>" + esc(label("Parking", lang)) + "</h2>" + banner + hotels + back + err + notice;
    if (screen === "board") return head + heroHtml(model, lang) + actions + renderCalendar(model, state, now, lang) + renderBoard(state, model, now, lang) + "</div>";
    return head + actions + body + "</div>";
  }
  function heroHtml(model, lang) {
    var s = model.tonight;
    var breakdown = s.guests + " " + label("Overnight guests", lang) + " / " + s.parkFly + " " + label("Park & Fly", lang) + " / " + s.longTerm + " " + label("Long-term", lang);
    var openLine = s.openStalls + " " + label("Open stalls", lang);
    var nextLine = label("Tomorrow night", lang) + ": " + model.tomorrowCount + " " + label("projected", lang);
    return "<section class=\"pk-hero\" id=\"pkHero\"><p class=\"pk-hero-label\">" + esc(label("Cars parked tonight", lang)) + "</p><p class=\"pk-hero-num\" id=\"pkCars\">" + esc(s.cars) + "</p><p class=\"pk-hero-break\" id=\"pkBreak\">" + esc(breakdown) + "</p><p class=\"pk-hero-open\" id=\"pkOpenStalls\">" + esc(openLine) + "</p><p class=\"pk-hero-next\" id=\"pkTomorrow\">" + esc(nextLine) + "</p></section>";
  }
  function dayRows(title, rows, lang, today) {
    var showArrive = rows.some(function (row) { return row.kind === "booking" && !row.booking.plate && row.booking.dropoff <= today; });
    var headers = [label("Last name", lang), label("Confirmation", lang), label("Plate", lang)];
    if (showArrive) headers.push(label("Add vehicle", lang));
    var body = rows.map(function (row) {
      var last = "";
      var confirm = "";
      var plate = "";
      if (row.kind === "visit") {
        confirm = row.visit.pfConfirm || "";
        plate = row.visit.plate || "";
      } else {
        last = row.booking.lastName || "";
        confirm = row.booking.confirm || "";
        plate = row.booking.plate || "";
      }
      var arrive = "";
      if (showArrive) {
        if (row.kind === "booking" && !row.booking.plate && row.booking.dropoff <= today) {
          arrive = "<td data-label=\"" + esc(label("Add vehicle", lang)) + "\"><button type=\"button\" class=\"btn2\" onclick=\"pkArriveOpen('" + esc(row.booking.id) + "')\">" + esc(label("Add vehicle", lang)) + "</button></td>";
        } else arrive = td(label("Add vehicle", lang), "");
      }
      return "<tr>" + td(label("Last name", lang), last) + td(label("Confirmation", lang), confirm) + td(label("Plate", lang), plate) + arrive + "</tr>";
    });
    return "<h3>" + esc(title) + "</h3>" + (rows.length ? table(headers, body) : "<p>" + esc(label("No bookings this day.", lang)) + "</p>");
  }
  function renderCalendar(model, state, now, lang) {
    var cal = model.calendar;
    if (!cal) return "";
    var monthName = MONTHS[cal.monthIndex - 1];
    var title = (lang === "es" ? monthName[1] : monthName[0]) + " " + cal.year;
    var heads = WEEKDAYS.map(function (d) { return "<div class=\"pk-dow\">" + esc(lang === "es" ? d[1] : d[0]) + "</div>"; }).join("");
    var blanks = "";
    for (var i = 0; i < cal.startDow; i++) blanks += "<div></div>";
    var cells = cal.days.map(function (d) {
      var num = Number(d.date.slice(8));
      var on = d.selected ? " on" : "";
      return "<button type=\"button\" class=\"pk-day" + on + "\" onclick=\"pkCalDay('" + d.date + "')\"><b>" + num + "</b><small>" + d.dropoffs + " " + esc(label("Arriving", lang)) + "</small><small>" + d.pickups + " " + esc(label("Leaving", lang)) + "</small><small>" + d.parked + " " + esc(label("Night", lang)) + "</small></button>";
    }).join("");
    var detail = "";
    if (cal.detail) {
      var today = chicagoDate(now);
      detail = "<section class=\"card\" id=\"pkDay\"><h3>" + esc(cal.detail.date) + "</h3><p class=\"pk-note\" id=\"pkNight\">" + esc(cal.detail.parked + " " + label("Parked that night", lang)) + "</p>" +
        dayRows(label("Dropping off", lang), cal.detail.dropoffs, lang, today) +
        dayRows(label("Picking up", lang), cal.detail.pickups, lang, today) +
        dayRows(label("Parked that night", lang), cal.detail.staying, lang, today) + "</section>";
    }
    return "<section class=\"card\" id=\"pkCal\"><h3>" + esc(label("Park & Fly calendar", lang)) + "</h3><div class=\"pk-cal-nav\"><button type=\"button\" class=\"btn2\" onclick=\"pkCalMove(-1)\">" + esc(label("Previous month", lang)) + "</button><b id=\"pkMonth\">" + esc(title) + "</b><button type=\"button\" class=\"btn2\" onclick=\"pkCalMove(1)\">" + esc(label("Next month", lang)) + "</button></div><div class=\"pk-cal\">" + heads + blanks + cells + "</div><button type=\"button\" class=\"btn\" id=\"pkBookBtn\" onclick=\"pkScreen('book')\">" + esc(label("Add a Park & Fly booking", lang)) + "</button>" + detail + "</section>";
  }
  function renderBook(model, ui, lang) {
    var d = (ui && ui.draft) || {};
    return "<form class=\"card pk-form\" id=\"pkBook\" onsubmit=\"window.pkSaveBooking(event)\"><h3>" + esc(label("Add a Park & Fly booking", lang)) + "</h3><p class=\"pk-note\">" + esc(label("Vehicle optional until arrival", lang)) + "</p>" +
      field(label("Last name", lang), "<input id=\"pkLast\" maxlength=\"40\" value=\"" + esc(d.lastName || "") + "\" required>") +
      field(label("Confirmation", lang), "<input id=\"pkBookConfirm\" maxlength=\"24\" autocapitalize=\"characters\" value=\"" + esc(d.confirm || "") + "\" required>") +
      field(label("Drop-off date", lang), "<input id=\"pkBookDrop\" type=\"date\" value=\"" + esc(d.dropoff || "") + "\" required>") +
      field(label("Expected pickup date", lang), "<input id=\"pkBookPickup\" type=\"date\" value=\"" + esc(d.pickup || "") + "\" required>") +
      field(label("Plate", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkBookPlate\" autocapitalize=\"characters\" maxlength=\"12\" value=\"" + esc(d.plate || "") + "\">") +
      field(label("State", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkBookState\" autocapitalize=\"characters\" maxlength=\"2\" value=\"" + esc(d.state || "") + "\">") +
      field(label("Color", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkBookColor\" maxlength=\"30\" value=\"" + esc(d.color || "") + "\">") +
      "<button type=\"submit\" class=\"btn\" id=\"pkBookSave\">" + esc(label("Save booking", lang)) + "</button></form>";
  }
  function renderArrive(state, ui, lang) {
    var row = null;
    bookingsOf(state).forEach(function (b) { if (String(b.id) === String(ui.bookingId || "")) row = b; });
    if (!row) return "<p>" + esc(label("Could not save.", lang)) + "</p>";
    return "<form class=\"card pk-form\" id=\"pkArrive\" onsubmit=\"window.pkSaveArrive(event)\"><h3>" + esc(label("Add vehicle", lang)) + "</h3><p class=\"pk-note\">" + esc(row.lastName + " " + row.confirm) + "</p>" +
      field(label("Plate", lang), "<input id=\"pkArrPlate\" autocapitalize=\"characters\" maxlength=\"12\" required>") +
      field(label("State", lang), "<input id=\"pkArrState\" autocapitalize=\"characters\" maxlength=\"2\" value=\"MN\" required>") +
      field(label("Color", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkArrColor\" maxlength=\"30\">") +
      "<button type=\"submit\" class=\"btn\" id=\"pkArriveSave\">" + esc(label("Save vehicle", lang)) + "</button></form>";
  }
  function fold(id, title, inner) {
    return "<details class=\"pk-fold\" id=\"" + id + "\"><summary>" + esc(title) + "</summary>" + inner + "</details>";
  }
  function renderBoard(state, model, now, lang) {
    var q = model.query ? "<p class=\"pk-note\" id=\"pkSearchNote\">" + esc(model.query) + "</p>" : "";
    var search = "<label class=\"pk-field\">" + esc(label("Search plate", lang)) + "<input id=\"pkQ\" autocomplete=\"off\" autocapitalize=\"characters\" value=\"" + esc(model.query) + "\" oninput=\"pkSearch(this.value)\"></label>";
    var boardHtml = "<section class=\"card\" id=\"pkBoard\"><h3>" + esc(label("Stall board", lang)) + "</h3>";
    if (!model.board.length) boardHtml += "<p>" + esc(label("No stalls yet.", lang)) + " " + esc(label("A GM can add lots and stall numbers.", lang)) + "</p>";
    model.board.forEach(function (z) {
      boardHtml += "<h3>" + esc(zoneName(z, lang)) + "</h3><p class=\"pk-note\">" + esc(purposeName(z.purpose, lang)) + "</p>" +
        kpi([
          { value: z.counts.open, label: label("Open", lang) },
          { value: z.counts.occupied, label: label("Occupied", lang) },
          { value: z.counts.long_term, label: label("Long-term", lang) },
          { value: z.counts.park_fly, label: label("Park & Fly", lang) },
          { value: z.counts.unknown, label: label("Unknown", lang) }
        ]).replace(" id=\"pkStats\"", "") +
        "<div class=\"pk-board\">" + z.stalls.map(function (s) {
          var status = statusName(s.kind, s.over, lang);
          return "<div class=\"pk-stall " + s.kind + (s.over ? " over" : "") + "\"><b>" + esc(s.stallNo) + "</b><small>" + esc(status) + "</small>" + (s.notes ? "<small>" + esc(s.notes) + "</small>" : "") + "</div>";
        }).join("") + "</div>";
    });
    boardHtml += "</section>";
    var rows = model.live.map(function (v) { return liveRow(v, state, now, lang, true); });
    var list = "<section class=\"card\" id=\"pkLive\"><h3>" + esc(label("On the lot", lang)) + "</h3>" +
      (rows.length ? table(liveHeaders(lang, true), rows) : "<p>" + esc(label(model.query ? "No matches." : "No vehicles on the lot.", lang)) + "</p>") + "</section>";
    var hist = "";
    if (model.query) {
      var hrows = model.history.map(function (v) { return liveRow(v, state, now, lang, false); });
      hist = "<section class=\"card\" id=\"pkHits\"><h3>" + esc(label("History matches", lang)) + "</h3>" +
        (hrows.length ? table(liveHeaders(lang, false), hrows) : "<p>" + esc(label("No matches.", lang)) + "</p>") + "</section>";
    }
    var note = "<p class=\"pk-note\">" + esc(label("Avg is completed guest stays, last 30 days.", lang)) + "</p>";
    return fold("pkMapFold", label("Stall map", lang), boardHtml) + fold("pkListFold", label("On the lot list", lang), search + q + note + list + hist);
  }
  function returnTable(rows, state, lang) {
    if (!rows.length) return "<p>" + esc(label("No vehicles on the lot.", lang)) + "</p>";
    var body = rows.map(function (v) {
      var stall = stallById(state, v.stallId);
      return "<tr>" + [
        td(label("Plate", lang), v.plate),
        td(label("Stall", lang), stall ? stall.stallNo : ""),
        td(label("Pickup", lang), formatWhen(v.pfPickup, lang)),
        td(label("Flight", lang), v.pfFlight),
        td(label("Confirmation", lang), v.pfConfirm),
        td(label("Days", lang), v.pfDays),
        td(label("Extra", lang), v.pfExtra)
      ].join("") + shuttleCell(v, lang) + "</tr>";
    });
    var heads = ["Plate", "Stall", "Pickup", "Flight", "Confirmation", "Days", "Extra"].map(function (k) { return label(k, lang); });
    if (typeof root.shParkingAction === "function") heads.push(label("Shuttle signup", lang));
    return table(heads, body);
  }
  function renderHistory(model, state, now, lang) {
    var rows = model.history.map(function (v) { return liveRow(v, state, now, lang, false); });
    return "<section class=\"card\" id=\"pkHistory\"><h3>" + esc(label("Checked out", lang)) + "</h3>" +
      (rows.length ? table(liveHeaders(lang, false), rows) : "<p>" + esc(label("No vehicles on the lot.", lang)) + "</p>") + "</section>";
  }
  function field(lab, html) { return "<label class=\"pk-field\">" + esc(lab) + html + "</label>"; }
  function renderLog(state, model, ui, now, lang) {
    var d = ui.draft || {};
    var checkedIn = d.checkedInLocal || toChicagoLocal(now);
    var draftInput = {
      hotel: model.hotel,
      vehicleType: d.vehicleType === "park_fly" ? "park_fly" : "guest",
      longTerm: !!d.longTerm,
      room: d.room || "",
      checkedIn: fromChicagoLocal(checkedIn),
      expectedOut: d.expectedLocal ? fromChicagoLocal(d.expectedLocal) : ""
    };
    var settings = model.settings;
    var forced = draftInput.vehicleType !== "park_fly" && stayNights(draftInput.checkedIn, draftInput.expectedOut) > settings.longTermNights;
    if (forced) draftInput.longTerm = true;
    var sug = suggestStall(state, draftInput);
    var sugStall = stallById(state, sug.stallId);
    var selected = d.stallTouched ? (d.stallId || "") : (sug.stallId || "");
    var pf = draftInput.vehicleType === "park_fly";
    var typeOpts = "<option value=\"guest\"" + (!pf ? " selected" : "") + ">" + esc(label("Guest", lang)) + "</option>" +
      (settings.parkFlyEnabled ? "<option value=\"park_fly\"" + (pf ? " selected" : "") + ">" + esc(label("Park & Fly", lang)) + "</option>" : "");
    return "<form class=\"card pk-form\" id=\"pkForm\" onsubmit=\"window.pkSave(event)\">" +
      "<h3>" + esc(label("Log a vehicle", lang)) + "</h3>" +
      (settings.parkFlyEnabled ? "<p class=\"pk-note\">" + esc(label("Park & Fly cars use the Park & Fly stalls, not the stall closest to the room.", lang)) + "</p>" : "<p class=\"pk-note\">" + esc(label("Park & Fly is off here.", lang)) + "</p>") +
      field(label("Type", lang), "<select id=\"pkType\" onchange=\"pkDraft('vehicleType', this.value)\">" + typeOpts + "</select>") +
      field(label("Plate", lang), "<input id=\"pkPlate\" autocapitalize=\"characters\" autocomplete=\"off\" maxlength=\"12\" value=\"" + esc(d.plate || "") + "\" required>") +
      field(label("State", lang), "<input id=\"pkState\" autocapitalize=\"characters\" maxlength=\"2\" value=\"" + esc(d.state || "MN") + "\" required>") +
      field(label("Make", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkMake\" maxlength=\"30\" value=\"" + esc(d.make || "") + "\">") +
      field(label("Model", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkModel\" maxlength=\"30\" value=\"" + esc(d.model || "") + "\">") +
      field(label("Color", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkColor\" maxlength=\"30\" value=\"" + esc(d.color || "") + "\">") +
      field(label("Room", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkRoom\" inputmode=\"numeric\" maxlength=\"4\" value=\"" + esc(d.room || "") + "\" onchange=\"pkDraft('room', this.value)\">") +
      field(label("Time in", lang), "<input id=\"pkIn\" type=\"datetime-local\" value=\"" + esc(checkedIn) + "\" onchange=\"pkDraft('checkedInLocal', this.value)\">") +
      field(label("Hotel checkout", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkExpected\" type=\"datetime-local\" value=\"" + esc(d.expectedLocal || "") + "\" onchange=\"pkDraft('expectedLocal', this.value)\">") +
      (pf ? "" : field(label("Long-term stay", lang), "<input id=\"pkLong\" type=\"checkbox\"" + ((forced || d.longTerm) ? " checked" : "") + (forced ? " disabled" : "") + " onchange=\"pkDraft('longTerm', this.checked)\">")) +
      (forced ? "<p class=\"pk-note\">" + esc(label("This stay uses the long-term stalls.", lang)) + "</p>" : "") +
      suggestBlock(sug.reason, sugStall ? sugStall.stallNo : "", lang) +
      "<p class=\"pk-note\">" + esc(label("Leave the stall blank to keep the suggestion. Pick another open stall to override it.", lang)) + "</p>" +
      field(label("Stall", lang), "<select id=\"pkStall\" onchange=\"pkDraft('stallId', this.value)\">" + stallOptions(state, model.hotel, lang, selected) + "</select>") +
      field(label("Permit or tag", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkPermit\" maxlength=\"20\" value=\"" + esc(d.permit || "") + "\">") +
      field(label("Paid parking", lang), "<input id=\"pkPaid\" type=\"checkbox\"" + (d.paid ? " checked" : "") + ">") +
      field(label("Rate note", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkRate\" maxlength=\"120\" value=\"" + esc(d.rateNote || "") + "\">") +
      (pf ? (
        field(label("Package or confirmation", lang), "<input id=\"pkConfirm\" maxlength=\"24\" value=\"" + esc(d.pfConfirm || "") + "\" required>") +
        field(label("Days included", lang), "<input id=\"pkDays\" type=\"number\" min=\"1\" max=\"60\" value=\"" + esc(d.pfDays || "") + "\" required>") +
        field(label("Drop-off date", lang), "<input id=\"pkDrop\" type=\"date\" value=\"" + esc(d.pfDropoff || chicagoDate(now)) + "\" required>") +
        field(label("Expected pickup", lang), "<input id=\"pkPickup\" type=\"datetime-local\" value=\"" + esc(d.pfPickupLocal || "") + "\" required>") +
        field(label("Return flight", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkFlight\" maxlength=\"40\" value=\"" + esc(d.pfFlight || "") + "\">") +
        field(label("Extra days", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkExtra\" maxlength=\"120\" value=\"" + esc(d.pfExtra || "") + "\">") +
        "<p class=\"pk-note\">" + esc(label("Does not end Park & Fly parking.", lang)) + "</p>"
      ) : "") +
      field(label("Note", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkNote\" maxlength=\"200\" value=\"" + esc(d.note || "") + "\">") +
      "<button type=\"submit\" class=\"btn\" id=\"pkSaveBtn\">" + esc(label("Save vehicle", lang)) + "</button></form>";
  }
  function renderWalk(state, model, lang) {
    return "<form class=\"card pk-form\" id=\"pkWalk\" onsubmit=\"window.pkSaveWalk(event)\"><h3>" + esc(label("Found on a lot walk", lang)) + "</h3>" +
      field(label("Plate", lang), "<input id=\"pkWPlate\" autocapitalize=\"characters\" autocomplete=\"off\" maxlength=\"12\" required>") +
      field(label("State", lang), "<input id=\"pkWState\" autocapitalize=\"characters\" maxlength=\"2\" value=\"MN\" required>") +
      field(label("Where did you find it?", lang), "<select id=\"pkWStall\" required>" + stallOptions(state, model.hotel, lang, "") + "</select>") +
      field(label("Color", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkWColor\" maxlength=\"30\">") +
      field(label("Make", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkWMake\" maxlength=\"30\">") +
      field(label("Model", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkWModel\" maxlength=\"30\">") +
      field(label("Note", lang) + " (" + label("Optional", lang) + ")", "<input id=\"pkWNote\" maxlength=\"200\">") +
      "<button type=\"submit\" class=\"btn\" id=\"pkWalkSave\">" + esc(label("Save found vehicle", lang)) + "</button></form>";
  }
  function renderSetup(state, model, lang) {
    if (!model.canSetup) return "<p>" + esc(label("You can't change parking.", lang)) + "</p>";
    var s = model.settings;
    var hotel = model.hotel;
    var zones = state.zones.filter(function (z) { return z.hotel === hotel; });
    var stalls = state.stalls.filter(function (st) { return st.hotel === hotel; });
    var ranges = state.ranges.filter(function (r) { return r.hotel === hotel; });
    var zoneOpts = zones.filter(function (z) { return z.active !== false; }).map(function (z) {
      return "<option value=\"" + esc(z.id) + "\">" + esc(zoneName(z, lang)) + "</option>";
    }).join("");
    var stallOpts = stalls.filter(function (st) { return st.active !== false; }).map(function (st) {
      return "<option value=\"" + esc(st.id) + "\">" + esc(st.stallNo) + "</option>";
    }).join("");
    var zoneRows = zones.map(function (z) {
      return "<tr>" + td(label("Lot", lang), zoneName(z, lang)) + td(label("Purpose", lang), purposeName(z.purpose, lang)) + td(label("Status", lang), z.active === false ? label("Inactive", lang) : label("Active", lang)) +
        "<td data-label=\"" + esc(label("Active", lang)) + "\"><button type=\"button\" class=\"btn2\" onclick=\"pkZoneToggle('" + esc(z.id) + "')\">" + esc(label(z.active === false ? "Turn on" : "Turn off", lang)) + "</button></td></tr>";
    });
    var stallRows = stalls.map(function (st) {
      var z = zoneById(state, st.zoneId);
      return "<tr>" + td(label("Stall", lang), st.stallNo) + td(label("Lot", lang), zoneName(z, lang)) + td(label("Notes", lang), st.notes) + td(label("Status", lang), st.active === false ? label("Inactive", lang) : label("Active", lang)) +
        "<td data-label=\"" + esc(label("Active", lang)) + "\"><button type=\"button\" class=\"btn2\" onclick=\"pkStallToggle('" + esc(st.id) + "')\">" + esc(label(st.active === false ? "Turn on" : "Turn off", lang)) + "</button></td></tr>";
    });
    var rangeRows = ranges.map(function (r) {
      var st = stallById(state, r.stallId);
      return "<tr>" + td(label("Stall", lang), st ? st.stallNo : "") + td(label("From", lang), r.roomLo) + td(label("To", lang), r.roomHi) + td(label("Floor", lang), r.floor) + td(label("Wing", lang), r.wing) + td(label("Rank", lang), r.rank) +
        td(label("Status", lang), r.active === false ? label("Inactive", lang) : label("Active", lang)) + "</tr>";
    });
    return "<form class=\"card pk-form\" id=\"pkSettings\" onsubmit=\"window.pkSaveSettings(event)\"><h3>" + esc(label("Settings", lang)) + "</h3>" +
      field(label("Hours without a room", lang), "<input id=\"pkHours\" type=\"number\" min=\"1\" max=\"720\" value=\"" + esc(s.maxHoursWithoutRoom) + "\">") +
      field(label("Long-term after nights", lang), "<input id=\"pkNights\" type=\"number\" min=\"1\" max=\"365\" value=\"" + esc(s.longTermNights) + "\">") +
      field(label("Park & Fly at this hotel", lang), "<input id=\"pkPfOn\" type=\"checkbox\"" + (s.parkFlyEnabled ? " checked" : "") + ">") +
      field(label("Grace hours after pickup", lang), "<input id=\"pkGrace\" type=\"number\" min=\"0\" max=\"72\" value=\"" + esc(s.parkFlyGraceHours) + "\">") +
      "<p class=\"pk-note\">" + esc(label("Use the long-term stalls when the box is checked or the stay is longer than the night limit.", lang)) + "</p>" +
      "<button type=\"submit\" class=\"btn\">" + esc(label("Save settings", lang)) + "</button></form>" +
      "<section class=\"card\"><h3>" + esc(label("Lots", lang)) + "</h3>" + table([label("Lot", lang), label("Purpose", lang), label("Status", lang), label("Active", lang)], zoneRows) +
      "<form class=\"pk-form\" onsubmit=\"window.pkSaveZone(event)\">" +
      field(label("Lot name", lang), "<input id=\"pkZoneName\" maxlength=\"40\" required>") +
      field(label("Purpose", lang), "<select id=\"pkZonePurpose\"><option value=\"standard\">" + esc(label("Guest stalls", lang)) + "</option><option value=\"long_term\">" + esc(label("Long-term", lang)) + "</option><option value=\"park_fly\">" + esc(label("Park & Fly", lang)) + "</option></select>") +
      "<button type=\"submit\" class=\"btn\">" + esc(label("Save lot", lang)) + "</button></form></section>" +
      "<section class=\"card\"><h3>" + esc(label("Stalls", lang)) + "</h3>" + table([label("Stall", lang), label("Lot", lang), label("Notes", lang), label("Status", lang), label("Active", lang)], stallRows) +
      "<form class=\"pk-form\" onsubmit=\"window.pkSaveStall(event)\">" +
      field(label("Stall number", lang), "<input id=\"pkStallNo\" maxlength=\"12\" required>") +
      field(label("Lot", lang), "<select id=\"pkStallZone\">" + zoneOpts + "</select>") +
      field(label("Notes", lang), "<input id=\"pkStallNotes\" maxlength=\"80\" placeholder=\"" + esc(label("ADA, EV, or oversized", lang)) + "\">") +
      "<button type=\"submit\" class=\"btn\">" + esc(label("Save stall", lang)) + "</button></form></section>" +
      "<section class=\"card\"><h3>" + esc(label("Room map", lang)) + "</h3><p class=\"pk-note\">" + esc(label("Closest is 1", lang)) + "</p>" +
      table([label("Stall", lang), label("From", lang), label("To", lang), label("Floor", lang), label("Wing", lang), label("Rank", lang), label("Status", lang)], rangeRows) +
      "<form class=\"pk-form\" onsubmit=\"window.pkSaveRange(event)\">" +
      field(label("Stall", lang), "<select id=\"pkRangeStall\">" + stallOpts + "</select>") +
      field(label("From room", lang), "<input id=\"pkRoomLo\" inputmode=\"numeric\">") +
      field(label("To room", lang), "<input id=\"pkRoomHi\" inputmode=\"numeric\">") +
      field(label("Floor", lang), "<input id=\"pkFloor\" maxlength=\"2\">") +
      field(label("Wing", lang), "<input id=\"pkWing\" maxlength=\"20\">") +
      field(label("Rank", lang), "<input id=\"pkRank\" type=\"number\" min=\"1\" max=\"99\" value=\"1\">") +
      "<button type=\"submit\" class=\"btn\">" + esc(label("Save range", lang)) + "</button></form></section>";
  }
  function homeCardHtml(state, actor, now, lang) {
    if (!state || state.origin === "loading" || !canLog(actor.role)) return "";
    var rows = homeSummary(state, actor, now, lang);
    if (!rows.length) return "";
    var sample = state.origin === "supabase" ? "" : "<p class=\"pk-note\"><span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span> " + esc(label("Sample vehicles for this demo. Not real plates or guests.", lang)) + "</p>";
    var leader = normRole(actor.role) === "Above Property";
    var inner;
    if (leader) {
      var body = rows.map(function (r) {
        return "<tr>" + td(label("Hotel", lang), r.hotel) + td(label("Cars now", lang), r.cars) + td(label("Avg stay", lang), r.avg) + td(label("Overstays today", lang), r.overstays) + td(label("Park & Fly", lang), r.parkFly) + td(label("Returning today", lang), r.returningToday) +
          "<td data-label=\"" + esc(label("See parking", lang)) + "\"><button type=\"button\" class=\"btn2\" onclick=\"pkOpen('" + r.hotel + "')\">" + esc(label("See parking", lang)) + "</button></td></tr>";
      });
      inner = table(["Hotel", "Cars now", "Avg stay", "Overstays today", "Park & Fly", "Returning today", "See parking"].map(function (k) {
        return k === "Hotel" ? (lang === "es" ? "Hotel" : "Hotel") : label(k, lang);
      }), body);
    } else {
      var one = rows[0];
      var tiles = [
        { id: "pkHomeCars", value: one.cars, label: label("Cars now", lang) },
        { id: "pkHomeAvg", value: one.avg, label: label("Avg stay", lang) },
        { id: "pkHomeOver", value: one.overstays, label: label("Overstays today", lang) },
        { id: "pkHomePf", value: one.parkFly, label: label("Park & Fly", lang) }
      ];
      if (one.returningToday !== "") tiles.push({ id: "pkHomeDue", value: one.returningToday, label: label("Returning today", lang) });
      inner = kpi(tiles).replace(" id=\"pkStats\"", " id=\"pkHomeStats\"") +
        "<button type=\"button\" class=\"btn\" onclick=\"pkOpen('" + one.hotel + "')\">" + esc(label("See parking", lang)) + "</button>";
    }
    return "<div class=\"card raw pk\" id=\"pkHome\"><h3>" + esc(label("Parking", lang)) + "</h3>" + sample + inner + "</div>";
  }

  var api = {
    HOTELS: HOTELS,
    PHRASES: PHRASES,
    label: label,
    canLog: canLog,
    canSee: canSee,
    canSetup: canSetup,
    showParkingTile: showParkingTile,
    hotelsFor: hotelsFor,
    defaultSettings: defaultSettings,
    chicagoDate: chicagoDate,
    toChicagoLocal: toChicagoLocal,
    fromChicagoLocal: fromChicagoLocal,
    stayNights: stayNights,
    wantsLongTerm: wantsLongTerm,
    normPlate: normPlate,
    suggestStall: suggestStall,
    logVisit: logVisit,
    markOut: markOut,
    saveSettings: saveSettings,
    saveZone: saveZone,
    saveStall: saveStall,
    saveRange: saveRange,
    isOverstay: isOverstay,
    durationMs: durationMs,
    formatDuration: formatDuration,
    formatWhen: formatWhen,
    liveList: liveList,
    historyList: historyList,
    returning: returning,
    stats: stats,
    homeSummary: homeSummary,
    projectedLot: projectedLot,
    calendarModel: calendarModel,
    calendarOn: calendarOn,
    saveBooking: saveBooking,
    arriveBooking: arriveBooking,
    settleBookings: settleBookings,
    isParkingAlert: isParkingAlert,
    parkingAlertRows: parkingAlertRows,
    mapBooking: mapBooking,
    cellsFor: cellsFor,
    board: board,
    pageModel: pageModel,
    buildDemo: buildDemo,
    mapSettings: mapSettings,
    mapZone: mapZone,
    mapStall: mapStall,
    mapRange: mapRange,
    mapVisit: mapVisit,
    renderParking: renderParking,
    parkingOn: parkingOn,
    homeCardHtml: homeCardHtml,
    atLocal: atLocal,
    shift: shift
  };
  root.Parking = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  var KEY = "jrportal_parking_v1";
  var mem = null;
  var ui = { screen: "board", hotel: "", q: "", error: "", notice: "", draft: null, seenHotel: "" };
  var remoteState = "";

  function L(en) {
    return label(en, (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en");
  }
  function langNow() { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; }
  function nowISO() { return new Date().toISOString(); }
  function actorNow() {
    var role = "";
    var hotel = "";
    try { role = authRole(); } catch (e) { role = ""; }
    try {
      var u = meUser();
      if (u && u.hotel) hotel = u.hotel;
    } catch (e2) { hotel = ""; }
    if (!hotel && typeof S !== "undefined" && S.hotel) hotel = S.hotel;
    return { role: role, hotel: hotel || "" };
  }
  function remoteOn() {
    return typeof useRemote === "function" && useRemote() && typeof sb !== "undefined" && sb;
  }
  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.demoVersion !== 3 || !data.visits || !data.settings || !data.bookings) return null;
      return data;
    } catch (e) { return null; }
  }
  function writeStore(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function emptyState() {
    var settings = {};
    HOTELS.forEach(function (h) { settings[h] = defaultSettings(h); });
    return { origin: "loading", settings: settings, zones: [], stalls: [], ranges: [], visits: [], bookings: [] };
  }
  function ensureRemote() {
    if (!remoteOn() || remoteState === "loading" || remoteState === "ready" || remoteState === "demo") return;
    remoteState = "loading";
    Promise.all([
      sb.from("parking_settings").select("hotel,max_hours_without_room,long_term_nights,park_fly_enabled,park_fly_grace_hours,parking_enabled"),
      sb.from("parking_zones").select("id,hotel,name,purpose,active,sort_order"),
      sb.from("parking_stalls").select("id,hotel,zone_id,stall_no,notes,active,sort_order"),
      sb.from("parking_stall_ranges").select("id,hotel,stall_id,room_lo,room_hi,floor,wing,rank,active"),
      sb.from("parking_visits").select("id,hotel,plate,plate_state,make,model,color,stall_id,room,checked_in_at,expected_out_at,checked_out_at,permit,paid,rate_note,long_term,unknown,vehicle_type,pf_confirm,pf_days,pf_dropoff,pf_pickup_at,pf_flight,pf_extra_note,note").order("checked_in_at", { ascending: false }).limit(500)
    ]).then(function (res) {
      if (res.some(function (r) { return r.error; })) { remoteState = "demo"; mem = readStore() || buildDemo(nowISO()); render(); return; }
      var stalls = (res[2].data || []).map(mapStall);
      var visits = (res[4].data || []).map(mapVisit);
      if (!stalls.length && !visits.length) { remoteState = "demo"; mem = readStore() || buildDemo(nowISO()); render(); return; }
      var settings = {};
      HOTELS.forEach(function (h) { settings[h] = defaultSettings(h); });
      (res[0].data || []).forEach(function (row) { settings[row.hotel] = mapSettings(row); });
      mem = {
        origin: "supabase",
        settings: settings,
        zones: (res[1].data || []).map(mapZone),
        stalls: stalls,
        ranges: (res[3].data || []).map(mapRange),
        visits: visits,
        bookings: []
      };
      remoteState = "ready";
      sb.from("parking_bookings").select("id,hotel,last_name,confirm,dropoff,pickup,plate,plate_state,make,model,color,visit_id,cancelled_at").then(function (r) {
        if (!mem || mem.origin !== "supabase") return;
        mem.bookings = !r || r.error ? [] : (r.data || []).map(mapBooking);
        render();
      }, function () {});
      if (!ui.settledRemote && canSee(actorNow().role)) {
        ui.settledRemote = true;
        sb.rpc("parking_settle_bookings").then(function (r) {
          if (r && r.error) return;
          remoteState = "";
          mem = null;
          ensureRemote();
        }, function () {});
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
    if (!mem) mem = readStore() || buildDemo(nowISO());
    if (mem && mem.origin !== "loading") {
      var settled = settleBookings(mem, nowISO());
      if (settled.changed) {
        mem = settled.state;
        writeStore(mem);
      }
    }
    return mem;
  }
  function hotelNow(actor) {
    var list = hotelsFor(actor.role, actor.hotel);
    var header = (typeof S !== "undefined" && S.hotel) || "";
    if (ui.seenHotel !== header) {
      if (ui.seenHotel) ui.hotel = "";
      ui.seenHotel = header;
    }
    if (ui.hotel && list.indexOf(ui.hotel) >= 0) return ui.hotel;
    if (list.indexOf(header) >= 0) return header;
    if (list.indexOf(actor.hotel) >= 0) return actor.hotel;
    return list[0] || "";
  }
  function commit(next) {
    mem = next;
    if (!remoteOn() && next.origin !== "supabase") writeStore(next);
    render();
  }
  function pageHtml() {
    var actor = actorNow();
    if (!canSee(actor.role)) {
      return renderParking({ settings: {}, visits: [], zones: [], stalls: [], ranges: [], bookings: [] }, { actor: actor, now: nowISO(), hotel: actor.hotel, lang: langNow(), ui: ui });
    }
    var state = current();
    if (state.origin === "loading") return "<div class=\"raw pk\" id=\"pkRoot\"><h2>" + esc(L("Parking")) + "</h2><p>" + esc(L("Loading parking…")) + "</p></div>";
    return renderParking(state, { actor: actor, now: nowISO(), hotel: hotelNow(actor), lang: langNow(), ui: ui });
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function checked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
  function showError(code) { ui.error = code || "save"; ui.notice = ""; render(); }

  root.pkScreen = function (screen) {
    ui.screen = screen;
    ui.error = "";
    ui.notice = "";
    if (screen === "log") {
      var now = nowISO();
      ui.draft = { vehicleType: "guest", plate: "", state: "MN", make: "", model: "", color: "", room: "", checkedInLocal: toChicagoLocal(now), expectedLocal: "", longTerm: false, stallTouched: false, stallId: "", permit: "", paid: false, rateNote: "", pfConfirm: "", pfDays: "", pfDropoff: chicagoDate(now), pfPickupLocal: "", pfFlight: "", pfExtra: "", note: "" };
    }
    if (screen === "book") {
      var day = chicagoDate(nowISO());
      ui.draft = { lastName: "", confirm: "", dropoff: addDays(day, 1), pickup: addDays(day, 5), plate: "", state: "", color: "" };
    }
    render();
  };
  root.pkCalDay = function (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return;
    ui.screen = "board";
    ui.month = date.slice(0, 7);
    ui.day = ui.day === date ? "" : date;
    ui.error = "";
    render();
  };
  root.pkCalMove = function (delta) {
    var base = ((ui.month || chicagoDate(nowISO()).slice(0, 7)) + "-01");
    var shifted = addDays(base, delta > 0 ? 32 : -2);
    ui.month = shifted.slice(0, 7);
    if (ui.day && ui.day.slice(0, 7) !== ui.month) ui.day = "";
    ui.screen = "board";
    render();
  };
  root.pkArriveOpen = function (id) {
    ui.bookingId = id;
    ui.screen = "arrive";
    ui.error = "";
    ui.notice = "";
    render();
  };
  root.pkSaveBooking = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var input = {
      hotel: hotelNow(actor),
      lastName: val("pkLast"),
      confirm: val("pkBookConfirm"),
      dropoff: val("pkBookDrop"),
      pickup: val("pkBookPickup"),
      plate: val("pkBookPlate"),
      state: val("pkBookState"),
      color: val("pkBookColor")
    };
    var res = saveBooking(current(), input, actor, nowISO());
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_booking", {
        p_hotel: input.hotel, p_last_name: input.lastName, p_confirm: input.confirm, p_dropoff: input.dropoff, p_pickup: input.pickup,
        p_plate: input.plate || null, p_state: input.state || null, p_make: null, p_model: null, p_color: input.color || null
      }).then(function (r) {
        if (r.error) return showError("save");
        ui.screen = "board";
        ui.notice = "book";
        ui.day = input.dropoff;
        ui.month = input.dropoff.slice(0, 7);
        remoteState = "";
        mem = null;
        ensureRemote();
      });
      return;
    }
    ui.screen = "board";
    ui.notice = "book";
    ui.day = input.dropoff;
    ui.month = input.dropoff.slice(0, 7);
    commit(res.state);
  };
  root.pkSaveArrive = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var input = { plate: val("pkArrPlate"), state: val("pkArrState"), color: val("pkArrColor") };
    var res = arriveBooking(current(), ui.bookingId, input, actor, nowISO());
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_arrive_booking", {
        p_id: Number(ui.bookingId), p_plate: input.plate, p_state: input.state, p_make: null, p_model: null, p_color: input.color || null
      }).then(function (r) {
        if (r.error) return showError("save");
        ui.screen = "board";
        ui.notice = "in";
        remoteState = "";
        mem = null;
        ensureRemote();
      });
      return;
    }
    ui.screen = "board";
    ui.notice = "in";
    commit(res.state);
  };
  root.pkHotel = function (hotel) {
    if (HOTELS.indexOf(hotel) < 0) return;
    if (hotelsFor(actorNow().role, actorNow().hotel).indexOf(hotel) < 0) return;
    ui.hotel = hotel;
    ui.screen = "board";
    render();
  };
  root.pkOpen = function (hotel) {
    if (!canSee(actorNow().role)) return;
    if (HOTELS.indexOf(hotel) >= 0) ui.hotel = hotel;
    ui.screen = "board";
    if (typeof go === "function") go("parking");
    else render();
  };
  root.pkSearch = function (v) {
    ui.q = normPlate(v);
    ui.screen = "board";
    render();
    setTimeout(function () {
      var el = document.getElementById("pkQ");
      if (!el) return;
      el.focus();
      try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
    }, 0);
  };
  function readLogDraft() {
    var prev = ui.draft || {};
    return {
      vehicleType: val("pkType") || prev.vehicleType || "guest",
      plate: val("pkPlate"),
      state: val("pkState") || prev.state || "MN",
      make: val("pkMake"),
      model: val("pkModel"),
      color: val("pkColor"),
      room: val("pkRoom"),
      checkedInLocal: val("pkIn") || prev.checkedInLocal,
      expectedLocal: val("pkExpected"),
      longTerm: checked("pkLong"),
      stallTouched: !!prev.stallTouched,
      stallId: val("pkStall"),
      permit: val("pkPermit"),
      paid: checked("pkPaid"),
      rateNote: val("pkRate"),
      pfConfirm: val("pkConfirm"),
      pfDays: val("pkDays"),
      pfDropoff: val("pkDrop") || prev.pfDropoff,
      pfPickupLocal: val("pkPickup"),
      pfFlight: val("pkFlight"),
      pfExtra: val("pkExtra"),
      note: val("pkNote")
    };
  }
  root.pkDraft = function (key, value) {
    ui.draft = readLogDraft();
    if (key === "stallId") ui.draft.stallTouched = true;
    if (key === "vehicleType" || key === "room" || key === "checkedInLocal" || key === "expectedLocal" || key === "longTerm") ui.draft.stallTouched = false;
    ui.draft[key] = value;
    render();
  };
  root.pkSave = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var hotel = hotelNow(actor);
    var type = val("pkType") === "park_fly" ? "park_fly" : "guest";
    var checkedIn = fromChicagoLocal(val("pkIn"));
    var expected = val("pkExpected") ? fromChicagoLocal(val("pkExpected")) : "";
    var input = {
      hotel: hotel,
      vehicleType: type,
      plate: val("pkPlate"),
      state: val("pkState"),
      make: val("pkMake"),
      model: val("pkModel"),
      color: val("pkColor"),
      room: val("pkRoom"),
      checkedIn: checkedIn,
      expectedOut: expected,
      longTerm: checked("pkLong"),
      stallId: val("pkStall"),
      explicitBlank: !val("pkStall") && !!(ui.draft && ui.draft.stallTouched),
      permit: val("pkPermit"),
      paid: checked("pkPaid"),
      rateNote: val("pkRate"),
      pfConfirm: val("pkConfirm"),
      pfDays: val("pkDays") === "" ? "" : Number(val("pkDays")),
      pfDropoff: val("pkDrop"),
      pfPickup: val("pkPickup") ? fromChicagoLocal(val("pkPickup")) : "",
      pfFlight: val("pkFlight"),
      pfExtra: val("pkExtra"),
      note: val("pkNote"),
      unknown: false
    };
    var res = logVisit(current(), input, actor, nowISO());
    if (!res.ok) return showError(res.error);
    ui.screen = "board";
    ui.notice = "in";
    ui.error = "";
    if (remoteOn()) return rpcLog(input, res);
    commit(res.state);
  };
  root.pkSaveWalk = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var input = {
      hotel: hotelNow(actor),
      vehicleType: "guest",
      plate: val("pkWPlate"),
      state: val("pkWState"),
      stallId: val("pkWStall"),
      color: val("pkWColor"),
      make: val("pkWMake"),
      model: val("pkWModel"),
      note: val("pkWNote"),
      unknown: true,
      checkedIn: nowISO()
    };
    var res = logVisit(current(), input, actor, input.checkedIn);
    if (!res.ok) return showError(res.error);
    ui.screen = "board";
    ui.notice = "in";
    ui.error = "";
    if (remoteOn()) return rpcLog(input, res);
    commit(res.state);
  };
  root.pkOut = function (id) {
    if (!/^[A-Za-z0-9_-]+$/.test(String(id))) return;
    var at = nowISO();
    var res = markOut(current(), id, at, actorNow());
    if (!res.ok) return showError(res.error);
    ui.notice = "out";
    ui.error = "";
    if (remoteOn()) {
      sb.rpc("parking_mark_out", { p_id: Number(id), p_out: at }).then(function (r) {
        if (r.error) return showError("save");
        remoteState = "";
        mem = null;
        ensureRemote();
      });
      return;
    }
    commit(res.state);
  };
  root.pkReset = function () {
    if (remoteOn()) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = buildDemo(nowISO());
    ui.screen = "board";
    ui.notice = "reset";
    ui.error = "";
    render();
  };
  root.pkSaveSettings = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var input = {
      hotel: hotelNow(actor),
      maxHoursWithoutRoom: Number(val("pkHours")),
      longTermNights: Number(val("pkNights")),
      parkFlyEnabled: checked("pkPfOn"),
      parkFlyGraceHours: Number(val("pkGrace"))
    };
    var res = saveSettings(current(), input, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_settings", {
        p_hotel: input.hotel, p_max_hours: input.maxHoursWithoutRoom, p_long_term_nights: input.longTermNights,
        p_park_fly: input.parkFlyEnabled, p_grace_hours: input.parkFlyGraceHours
      }).then(function (r) { if (r.error) return showError("save"); remoteState = ""; mem = null; ensureRemote(); });
      return;
    }
    ui.notice = "in";
    commit(res.state);
  };
  root.pkSaveZone = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var res = saveZone(current(), { hotel: hotelNow(actor), name: val("pkZoneName"), purpose: val("pkZonePurpose"), active: true }, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_zone", { p_id: null, p_hotel: hotelNow(actor), p_name: val("pkZoneName"), p_purpose: val("pkZonePurpose"), p_active: true, p_sort: 0 }).then(function (r) {
        if (r.error) return showError("save"); remoteState = ""; mem = null; ensureRemote();
      });
      return;
    }
    commit(res.state);
  };
  root.pkZoneToggle = function (id) {
    var actor = actorNow();
    var state = current();
    var z = zoneById(state, id);
    if (!z) return;
    var res = saveZone(state, { id: z.id, hotel: z.hotel, name: z.name, purpose: z.purpose, active: z.active === false, sort: z.sort }, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_zone", { p_id: Number(z.id), p_hotel: z.hotel, p_name: z.name, p_purpose: z.purpose, p_active: z.active === false, p_sort: z.sort || 0 }).then(function (r) {
        if (r.error) return showError("save"); remoteState = ""; mem = null; ensureRemote();
      });
      return;
    }
    commit(res.state);
  };
  root.pkSaveStall = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var res = saveStall(current(), { hotel: hotelNow(actor), zoneId: val("pkStallZone"), stallNo: val("pkStallNo"), notes: val("pkStallNotes"), active: true }, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_stall", { p_id: null, p_hotel: hotelNow(actor), p_zone_id: Number(val("pkStallZone")), p_stall_no: val("pkStallNo"), p_notes: val("pkStallNotes"), p_active: true, p_sort: 0 }).then(function (r) {
        if (r.error) return showError("save"); remoteState = ""; mem = null; ensureRemote();
      });
      return;
    }
    commit(res.state);
  };
  root.pkStallToggle = function (id) {
    var actor = actorNow();
    var state = current();
    var s = stallById(state, id);
    if (!s) return;
    var res = saveStall(state, { id: s.id, hotel: s.hotel, zoneId: s.zoneId, stallNo: s.stallNo, notes: s.notes, active: s.active === false, sort: s.sort }, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_stall", { p_id: Number(s.id), p_hotel: s.hotel, p_zone_id: Number(s.zoneId), p_stall_no: s.stallNo, p_notes: s.notes, p_active: s.active === false, p_sort: s.sort || 0 }).then(function (r) {
        if (r.error) return showError("save"); remoteState = ""; mem = null; ensureRemote();
      });
      return;
    }
    commit(res.state);
  };
  root.pkSaveRange = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var res = saveRange(current(), {
      stallId: val("pkRangeStall"),
      roomLo: val("pkRoomLo"),
      roomHi: val("pkRoomHi"),
      floor: val("pkFloor"),
      wing: val("pkWing"),
      rank: Number(val("pkRank") || 1),
      active: true
    }, actor);
    if (!res.ok) return showError(res.error);
    if (remoteOn()) {
      sb.rpc("parking_save_range", {
        p_id: null, p_stall_id: Number(val("pkRangeStall")), p_room_lo: val("pkRoomLo") === "" ? null : Number(val("pkRoomLo")),
        p_room_hi: val("pkRoomHi") === "" ? null : Number(val("pkRoomHi")), p_floor: val("pkFloor"), p_wing: val("pkWing"),
        p_rank: Number(val("pkRank") || 1), p_active: true
      }).then(function (r) { if (r.error) return showError("save"); remoteState = ""; mem = null; ensureRemote(); });
      return;
    }
    commit(res.state);
  };
  function rpcLog(input, res) {
    sb.rpc("parking_log_visit", {
      p_hotel: input.hotel,
      p_plate: input.plate,
      p_state: input.state,
      p_make: input.make || null,
      p_model: input.model || null,
      p_color: input.color || null,
      p_stall_id: input.stallId && /^\d+$/.test(String(input.stallId)) ? Number(input.stallId) : null,
      p_room: input.room || null,
      p_checked_in: input.checkedIn || null,
      p_expected_out: input.expectedOut || null,
      p_permit: input.permit || null,
      p_paid: !!input.paid,
      p_rate_note: input.rateNote || null,
      p_long_term: !!input.longTerm,
      p_unknown: !!input.unknown,
      p_vehicle_type: input.vehicleType || "guest",
      p_pf_confirm: input.pfConfirm || null,
      p_pf_days: input.pfDays === "" ? null : input.pfDays,
      p_pf_dropoff: input.pfDropoff || null,
      p_pf_pickup: input.pfPickup || null,
      p_pf_flight: input.pfFlight || null,
      p_pf_extra_note: input.pfExtra || null,
      p_note: input.note || null
    }).then(function (r) {
      if (r.error) return showError("save");
      ui.screen = "board";
      ui.notice = "in";
      remoteState = "";
      mem = null;
      ensureRemote();
    });
    return res;
  }

  if (typeof M !== "undefined") M.parking = ["🅿️", "Parking"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Parking = "Estacionamiento";
  if (typeof V !== "undefined") V.parking = pageHtml;
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try { card = homeCardHtml(current(), actorNow(), nowISO(), langNow()); } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var hotel = "";
      try { hotel = S.hotel; } catch (e) { hotel = ""; }
      var on = true;
      try { on = parkingOn(current(), hotel); } catch (e2) { on = hotel !== "MSPWE"; }
      list = list.filter(function (id) { return id !== "parking"; });
      if (showParkingTile(role, on)) list = list.concat(["parking"]);
      return list;
    };
    api.noteModule = function (hotel, enabled) {
      try {
        var state = current();
        if (!state.settings || !state.settings[hotel]) return;
        state.settings[hotel].parkingEnabled = !!enabled;
        if (!remoteOn() && state.origin === "example") writeStore(state);
      } catch (e) {}
    };
  }
  function syncParkingAlerts() {
    if (typeof S === "undefined" || !S || !Array.isArray(S.alerts)) return;
    var fresh = parkingAlertRows(current(), actorNow(), nowISO(), langNow());
    var ids = {};
    fresh.forEach(function (a) { ids[String(a.id)] = 1; });
    S.alerts = S.alerts.filter(function (a) {
      if (!isParkingAlert(a) || a.acknowledged_at) return true;
      return !!ids[String(a.id)];
    });
    fresh.forEach(function (a) {
      if (!S.alerts.some(function (x) { return String(x.id) === String(a.id); })) S.alerts.push(a);
    });
  }
  if (typeof alertsCard === "function") {
    var prevAlerts = alertsCard;
    root.alertsCard = function () {
      if (typeof ensureDemoAlerts === "function") ensureDemoAlerts();
      try { syncParkingAlerts(); } catch (e1) {}
      return prevAlerts();
    };
  }
  if (typeof alertForMe === "function") {
    var prevAlertForMe = alertForMe;
    root.alertForMe = function (a) {
      if (isParkingAlert(a)) {
        var role = "";
        try { role = authRole(); } catch (e2) { role = ""; }
        if (!canSee(role)) return false;
        if (a.hotel && !parkingOn(current(), a.hotel)) return false;
      }
      return prevAlertForMe(a);
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[0][2].indexOf("parking") < 0) RSEC[0][2].push("parking"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("parking") < 0) NOCOLS.push("parking"); } catch (e) {}
  try { if (typeof RQL !== "undefined") RQL.parking = ["Parking", "Estacionamiento"]; } catch (e) {}

  var style = document.createElement("style");
  style.textContent = [
    ".pk-hero{background:#14365d;color:#fff;border-radius:16px;padding:18px 12px 14px;text-align:center;margin:8px 0}",
    ".pk-hero-label{margin:0;font-size:15px}",
    ".pk-hero-num{margin:2px 0 8px;font-size:72px;font-weight:800;line-height:.95}",
    ".pk-hero-break,.pk-hero-open,.pk-hero-next{margin:4px 0 0;font-size:14px;color:#d6e4f5}",
    ".pk-fold{background:#fff;border:1px solid #e1e6ee;border-radius:12px;margin:8px 0;padding:4px 10px 8px}",
    ".pk-fold summary{font-weight:800;min-height:44px;display:flex;align-items:center;cursor:pointer}",
    ".pk-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}",
    ".pk-cal-nav{display:flex;gap:8px;align-items:center;margin:8px 0}",
    ".pk-cal-nav b{flex:1;text-align:center}",
    ".pk-dow{text-align:center;font-size:11px;font-weight:800;color:#3c4658}",
    ".pk-day{min-height:68px;background:#eef3fa;border:0;border-radius:8px;padding:3px;font-size:10px;line-height:1.2}",
    ".pk-day b{display:block;font-size:14px}",
    ".pk-day small{display:block}",
    ".pk-day.on{outline:2px solid #14365d;background:#d9e8ff}",
    ".pk-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".pk-kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}",
    ".pk-kpi div{background:#eef3fa;border-radius:8px;padding:8px 4px;text-align:center}",
    ".pk-kpi b{display:block;font-size:20px}",
    ".pk-kpi span{display:block;color:#3c4658;font-size:12px}",
    ".pk-actions{display:flex;flex-direction:column;gap:8px;margin:8px 0}",
    ".pk-actions .btn,.pk-actions .btn2{width:100%}",
    ".pk-field{display:flex;flex-direction:column;gap:4px;font-weight:700;margin:8px 0}",
    ".pk-field input,.pk-field select{width:100%}",
    ".pk-back{margin-bottom:8px}",
    ".pk-hotels{display:flex;gap:8px;margin:8px 0}",
    ".pk-hotels button{flex:1;min-height:44px;background:#e6ebf2;border:0;font-weight:700}",
    ".pk-hotels button.on{background:#14365d;color:#fff}",
    ".pk-board{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px;margin:8px 0}",
    ".pk-stall{min-height:72px;border-radius:10px;padding:6px;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:2px}",
    ".pk-stall b{font-size:18px}",
    ".pk-stall small{display:block;font-size:12px}",
    ".pk-stall.open{background:#d4f5dc;color:#15642f}",
    ".pk-stall.occupied{background:#fde2e1;color:#8a1c1c}",
    ".pk-stall.long_term{background:#fff3c4;color:#6b5200}",
    ".pk-stall.park_fly{background:#d9e8ff;color:#14365d}",
    ".pk-stall.unknown{background:#f3e8ff;color:#5b2a86}",
    ".pk-stall.over{outline:3px solid #c0262d}",
    ".pk-t{width:100%;border-collapse:collapse;font-size:14px}",
    ".pk-t th,.pk-t td{padding:6px 4px;border-bottom:1px solid #e6ebf2;text-align:left;vertical-align:top}",
    ".pk-over{background:#fde2e1}",
    ".pk-unk{background:#f6f0fb}",
    ".pk-form .btn{width:100%}",
    "@media(min-width:700px){.pk-kpi{grid-template-columns:repeat(3,minmax(0,1fr))}.pk-actions{flex-direction:row;flex-wrap:wrap}.pk-actions .btn,.pk-actions .btn2{width:auto;flex:1}}",
    "@media(max-width:1023px){.pk-t thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.pk-t,.pk-t tbody,.pk-t tr,.pk-t td{display:block;width:100%}.pk-t tr{border:1px solid #e1e6ee;border-radius:12px;margin:0 0 10px;padding:6px 8px;background:#fff}.pk-t td{display:grid;grid-template-columns:46% 54%;gap:6px;border:0;padding:4px 0}.pk-t td:before{content:attr(data-label);font-weight:700;color:#3c4658}.pk-over{background:#fde2e1}.pk-unk{background:#f6f0fb}}"
  ].join("");
  document.head.appendChild(style);
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "parking", en: "Parking", es: "Estacionamiento", order: 10 });
})(typeof window !== "undefined" ? window : globalThis);
