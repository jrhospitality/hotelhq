/* Meeting rooms and banquet event orders for MSPWE, MSPAM, and MSPMS.
   Front desk, AGM, GM, and JR Corporate see the calendar and the BEO.
   Front desk can edit. Billing notes stay with AGM, GM, and JR Corporate.
   Housekeeping, maintenance, and breakfast do not see the calendar.
   A definite event creates a cleanup task at the end time, and an optional
   setup task before the start. Assignees see that task only.
   Definite bookings remind the GM and AGM 24 hours ahead (immediately if the
   booking is created inside that window). Front desk gets a day-of list at a
   configurable morning hour and a nudge one hour before each start.
   Sample groups are labeled EXAMPLE. No real guest names.
   The sales-lead link is not wired: that feature is not on this page yet.
   Demo mode stores data on the device and does not call Supabase. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var HOTEL_OK = { MSPWE: 1, MSPAM: 1, MSPMS: 1 };
  var STYLES = [
    ["theater", "Theater", "Teatro"],
    ["classroom", "Classroom", "Salón de clases"],
    ["u_shape", "U-shape", "Forma de U"],
    ["boardroom", "Boardroom", "Sala de juntas"],
    ["banquet", "Banquet rounds", "Mesas redondas"],
    ["reception", "Reception", "Recepción"]
  ];
  var STYLE_OK = {};
  STYLES.forEach(function (row) { STYLE_OK[row[0]] = row; });
  var STATUSES = ["tentative", "definite", "cancelled"];
  var PHRASES = {
    "Meeting rooms": "Salas de reuniones",
    "Meetings": "Reuniones",
    "EXAMPLE": "EJEMPLO",
    "Sample groups for this demo. Not real guests.": "Grupos de ejemplo para esta demostración. No hay huéspedes reales.",
    "Day": "Día",
    "Week": "Semana",
    "Month": "Mes",
    "All rooms": "Todas las salas",
    "New booking": "Nueva reserva",
    "Rooms": "Salas",
    "Back": "Volver",
    "Tentative": "Tentativo",
    "Definite": "Confirmado",
    "Cancelled": "Cancelado",
    "Banquet Event Order": "Orden de evento",
    "Group or company": "Grupo o empresa",
    "On-site phone": "Teléfono en el sitio",
    "Optional": "Opcional",
    "No on-site phone": "Sin teléfono en el sitio",
    "Room": "Sala",
    "Date": "Fecha",
    "Starts": "Empieza",
    "Ends": "Termina",
    "Setup": "Montaje",
    "Teardown": "Desmontaje",
    "minutes": "minutos",
    "Guaranteed": "Garantizados",
    "Expected": "Previstos",
    "Headcount": "Asistentes",
    "Setup style": "Tipo de montaje",
    "Theater": "Teatro",
    "Classroom": "Salón de clases",
    "U-shape": "Forma de U",
    "Boardroom": "Sala de juntas",
    "Banquet rounds": "Mesas redondas",
    "Reception": "Recepción",
    "Projector": "Proyector",
    "Screen": "Pantalla",
    "Microphone": "Micrófono",
    "Speaker": "Bocina",
    "Flip chart": "Rotafolio",
    "Wi-Fi code": "Clave de Wi-Fi",
    "Food and beverage": "Alimentos y bebidas",
    "Coffee break": "Pausa de café",
    "Breakfast": "Desayuno",
    "Lunch": "Comida",
    "Snacks": "Botanas",
    "Dietary notes": "Notas de dieta",
    "Billing notes": "Notas de cobro",
    "Special instructions": "Instrucciones especiales",
    "None": "Ninguno",
    "Save booking": "Guardar reserva",
    "Edit booking": "Editar reserva",
    "Print BEO": "Imprimir orden",
    "Yes": "Sí",
    "No": "No",
    "Status": "Estado",
    "That room is already booked for this time, including setup and teardown.": "Esa sala ya está reservada en ese horario, incluido el montaje y el desmontaje.",
    "Conflicts with {group} ({status}) {time}.": "Choca con {group} ({status}) {time}.",
    "Open the BEO": "Abrir la orden",
    "Today's events": "Eventos de hoy",
    "No meetings today.": "No hay reuniones hoy.",
    "Meeting rooms are off at this hotel.": "Las salas de reuniones están apagadas en este hotel.",
    "Meeting rooms are for the front desk and managers.": "Las salas de reuniones son para recepción y los gerentes.",
    "A GM sets up the rooms.": "El gerente configura las salas.",
    "Cleanup assignee": "Quién limpia",
    "Setup assignee": "Quién monta",
    "House person on duty": "Houseman de turno",
    "Create a setup task before the start.": "Crear una tarea de montaje antes del inicio.",
    "Minutes before start": "Minutos antes del inicio",
    "Confirm headcount": "Confirmar asistentes",
    "Confirm AV": "Confirmar equipo audiovisual",
    "Confirm food and beverage": "Confirmar alimentos y bebidas",
    "Confirm setup assignee": "Confirmar quién monta",
    "Checklist": "Lista de verificación",
    "Reset sample data": "Restablecer datos de ejemplo",
    "Add room": "Agregar sala",
    "Room name": "Nombre de la sala",
    "Capacity": "Capacidad",
    "Save room": "Guardar sala",
    "Front desk morning list": "Lista matutina de recepción",
    "Save hour": "Guardar hora",
    "Enter a group or company name.": "Escribe el grupo o la empresa.",
    "Choose a room.": "Elige una sala.",
    "Choose a setup style this room allows.": "Elige un montaje que esta sala permita.",
    "End time has to be after the start.": "La hora de fin tiene que ser después del inicio.",
    "That room holds fewer people.": "Esa sala tiene menos capacidad.",
    "Enter a 10-digit phone, or leave it blank.": "Escribe un teléfono de 10 dígitos, o déjalo en blanco.",
    "That hotel is not on your list.": "Ese hotel no está en tu lista.",
    "Enter a room name.": "Escribe el nombre de la sala.",
    "Enter a capacity.": "Escribe la capacidad.",
    "Pick at least one setup style.": "Elige al menos un montaje.",
    "Enter an hour from 0 to 11.": "Escribe una hora de 0 a 11.",
    "You can't change meeting rooms.": "No puedes cambiar las salas de reuniones.",
    "You can't edit this booking.": "No puedes editar esta reserva.",
    "Meetings today": "Reuniones hoy",
    "Coming up": "Próximas",
    "Begin task": "Empezar tarea",
    "Finish task": "Terminar tarea",
    "Meeting task": "Tarea de reunión",
    "Was": "Era",
    "For": "Para",
    "Prev": "Anterior",
    "Next": "Siguiente",
    "Legend": "Leyenda",
    "Billing notes stay with managers.": "Las notas de cobro las ven solo los gerentes.",
    "Close print view": "Cerrar vista de impresión",
    "Confirm {group} on {date} at {time} in {room}. Check headcount, AV, food and beverage, and the setup assignee.": "Confirma {group} el {date} a las {time} en {room}. Revisa asistentes, equipo audiovisual, alimentos y bebidas, y quién monta.",
    "{group} starts at {time} in {room}. Headcount {count}.": "{group} empieza a las {time} en {room}. Asistentes {count}.",
    "Today's meeting list for {date}.": "Lista de reuniones de hoy, {date}.",
    "Saved.": "Guardado.",
    "Booking saved.": "Reserva guardada.",
    "Room saved.": "Sala guardada.",
    "Sample data reset.": "Datos de ejemplo restablecidos.",
    "Could not save.": "No se pudo guardar.",
    "Clear the room and return it to a standard set.": "Deja la sala lista en montaje estándar.",
    "Set the room before the group arrives.": "Prepara la sala antes de que llegue el grupo.",
    "Active": "Activa",
    "Inactive": "Inactiva",
    "Turn off": "Desactivar",
    "Turn on": "Activar",
    "Not created yet": "Aún no se crea",
    "Cleanup": "Limpieza",
    "Task only. The calendar stays with the front desk and managers.": "Solo la tarea. El calendario queda en recepción y con los gerentes.",
    "No notes.": "Sin notas.",
    "Standard set": "Montaje estándar"
  };

  function t(en, lang) {
    if (lang === "es" && Object.prototype.hasOwnProperty.call(PHRASES, en)) return PHRASES[en];
    return en;
  }
  function fill(en, lang, map) {
    var s = t(en, lang);
    Object.keys(map || {}).forEach(function (key) {
      s = s.split("{" + key + "}").join(map[key] == null ? "" : String(map[key]));
    });
    return s;
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function pad(n) { n = String(n); return n.length < 2 ? "0" + n : n; }
  function normRole(role) {
    var r = String(role || "");
    if (r === "JR Corporate" || r === "Above Property" || r === "above_property") return "corporate";
    if (r === "GM" || r === "gm") return "gm";
    if (r === "AGM" || r === "agm") return "agm";
    if (r === "Front Desk" || r === "front_desk") return "fd";
    if (r === "House Person" || r === "house_person") return "hp";
    if (r === "Housekeeping" || r === "hk_lead") return "hk";
    if (r === "Maintenance" || r === "maintenance") return "mt";
    if (r === "Breakfast Attendant" || r === "breakfast") return "bf";
    return "other";
  }
  function canSeeCalendar(role) {
    var r = normRole(role);
    return r === "fd" || r === "agm" || r === "gm" || r === "corporate";
  }
  function canEdit(role) { return canSeeCalendar(role); }
  function canBill(role) {
    var r = normRole(role);
    return r === "agm" || r === "gm" || r === "corporate";
  }
  function canConfigure(role) {
    var r = normRole(role);
    return r === "gm" || r === "corporate";
  }
  function showTile(viewedRole, authRole, on) {
    return !!on && canSeeCalendar(authRole) && (viewedRole === "GM" || viewedRole === "Front Desk" || viewedRole === "AGM");
  }
  function hotelOk(actor, hotel) {
    if (!HOTEL_OK[hotel]) return false;
    if (!actor) return false;
    if (normRole(actor.role) === "corporate") return true;
    return actor.hotel === hotel;
  }
  function meetingsOn(hotel) {
    try {
      if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "meetings") !== false;
    } catch (e) {}
    return !!HOTEL_OK[hotel];
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
  function chicagoHour(iso) {
    var p = chicagoParts(iso);
    return p.hour === "" ? null : Number(p.hour);
  }
  function addDays(isoDate, days) {
    var p = String(isoDate || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function daysInMonth(iso) {
    var p = String(iso || "").split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1], 0)).getUTCDate();
  }
  function addMonths(iso, count) {
    var p = String(iso || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1 + count, 1));
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
  function localPoint(nowIso, minuteOffset) {
    var ms = Date.parse(nowIso) + minuteOffset * 60000;
    var p = chicagoParts(new Date(ms).toISOString());
    return { date: p.year + "-" + p.month + "-" + p.day, hm: p.hour + ":" + p.minute };
  }
  function eventTimes(booking) {
    if (!booking) return null;
    var start = Date.parse(fromChicagoLocal(booking.date + "T" + booking.start));
    var end = Date.parse(fromChicagoLocal(booking.date + "T" + booking.end));
    if (isNaN(start) || isNaN(end)) return null;
    if (end <= start) end += 86400000;
    return { start: start, end: end };
  }
  function blockWindow(booking) {
    var times = eventTimes(booking);
    if (!times) return null;
    return {
      start: times.start - (Number(booking.setupMin) || 0) * 60000,
      end: times.end + (Number(booking.teardownMin) || 0) * 60000,
      eventStart: times.start,
      eventEnd: times.end
    };
  }
  function fmtTime(hm, lang) {
    var p = String(hm || "").split(":");
    var h = Number(p[0]);
    var m = p[1] || "00";
    if (isNaN(h)) return "";
    var ap = h >= 12 ? (lang === "es" ? "p.m." : "PM") : (lang === "es" ? "a.m." : "AM");
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ":" + m + " " + ap;
  }
  function fmtDate(iso, lang) {
    var p = String(iso || "").split("-").map(Number);
    if (p.length < 3 || !p[0]) return "";
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    return new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", {
      weekday: "short", month: "short", day: "numeric", timeZone: "UTC"
    }).format(d);
  }
  function fmtPhone(digits) {
    var d = String(digits || "");
    if (d.length !== 10) return d;
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }
  function phoneDigits(value) {
    var d = String(value || "").replace(/\D/g, "");
    if (!d) return "";
    if (d.length === 11 && d.charAt(0) === "1") d = d.slice(1);
    return d;
  }
  function styleLabel(id, lang) {
    var row = STYLE_OK[id];
    if (!row) return "";
    return lang === "es" ? row[2] : row[1];
  }
  function statusLabel(status, lang) {
    if (status === "definite") return t("Definite", lang);
    if (status === "cancelled") return t("Cancelled", lang);
    return t("Tentative", lang);
  }
  function roomById(state, id) {
    return (state.rooms || []).filter(function (room) { return room.id === id; })[0] || null;
  }
  function dayKey(hotel, date) { return hotel + "|" + date; }
  function defaultSettings(hotel) { return { hotel: hotel, dayAlertHour: 6 }; }
  function blankAv() { return { projector: false, screen: false, mic: false, speaker: false, flipchart: false, wifi: "" }; }
  function blankFb() { return { coffee: false, breakfast: false, lunch: false, snacks: false, dietary: "" }; }
  function blankChecks() { return { headcount: false, av: false, fb: false, setup: false }; }

  function makeRoom(hotel, key, name, capacity, styles) {
    return { id: "r-" + hotel + "-" + key, hotel: hotel, name: name, capacity: capacity, styles: styles, active: true, example: true };
  }
  function makeBooking(spec) {
    return {
      id: spec.id,
      hotel: spec.hotel,
      roomId: spec.roomId,
      status: spec.status,
      groupName: spec.groupName,
      phone: spec.phone || "",
      date: spec.date,
      start: spec.start,
      end: spec.end,
      setupMin: spec.setupMin,
      teardownMin: spec.teardownMin,
      guaranteed: spec.guaranteed,
      expected: spec.expected,
      style: spec.style,
      av: spec.av || blankAv(),
      fb: spec.fb || blankFb(),
      billing: spec.billing || "",
      notes: spec.notes || "",
      cleanupAssigneeId: spec.cleanupAssigneeId || "",
      setupEnabled: !!spec.setupEnabled,
      setupLeadMin: spec.setupLeadMin || 0,
      setupAssigneeId: spec.setupAssigneeId || "",
      checks: blankChecks(),
      reminderSent: "",
      hourAlertSent: "",
      cleanupTaskId: "",
      setupTaskId: "",
      example: true
    };
  }
  function buildDemo(now) {
    var settings = {};
    HOTELS.forEach(function (hotel) { settings[hotel] = defaultSettings(hotel); });
    var names = {
      MSPWE: ["Sample Lakeside", "Sample Huddle"],
      MSPAM: ["Sample Atrium", "Sample Boardroom"],
      MSPMS: ["Sample Lake Room", "Sample Project Room"]
    };
    var rooms = [];
    var bookings = [];
    var ended = localPoint(now, -120);
    var endedStop = localPoint(now, -60);
    var soon = localPoint(now, 50);
    var soonStop = localPoint(now, 200);
    var tomorrow = localPoint(now, 20 * 60);
    var tomorrowStop = localPoint(now, 22 * 60);
    var later = localPoint(now, 3 * 24 * 60);
    var laterStop = localPoint(now, 3 * 24 * 60 + 120);
    var maybe = localPoint(now, 240);
    var maybeStop = localPoint(now, 360);
    HOTELS.forEach(function (hotel) {
      var large = makeRoom(hotel, "large", names[hotel][0], 80, ["theater", "classroom", "banquet", "reception"]);
      var small = makeRoom(hotel, "small", names[hotel][1], 12, ["boardroom", "u_shape"]);
      rooms.push(large, small);
      bookings.push(makeBooking({
        id: "b-" + hotel + "-ended",
        hotel: hotel,
        roomId: small.id,
        status: "definite",
        groupName: "Sample Board Session",
        phone: "5550100142",
        date: ended.date,
        start: ended.hm,
        end: endedStop.hm,
        setupMin: 30,
        teardownMin: 15,
        guaranteed: 8,
        expected: 10,
        style: "boardroom",
        av: { projector: true, screen: true, mic: false, speaker: false, flipchart: true, wifi: "SAMPLE-WIFI" },
        fb: { coffee: true, breakfast: false, lunch: false, snacks: false, dietary: "Sample note: no peanuts in the room." },
        billing: "Sample invoice note for the demo.",
        notes: "Reset the chairs to a square.",
        setupEnabled: false,
        setupLeadMin: 0
      }));
      bookings.push(makeBooking({
        id: "b-" + hotel + "-soon",
        hotel: hotel,
        roomId: large.id,
        status: "definite",
        groupName: "Sample Midwest Training",
        phone: "",
        date: soon.date,
        start: soon.hm,
        end: soonStop.hm,
        setupMin: 60,
        teardownMin: 30,
        guaranteed: 40,
        expected: 48,
        style: "theater",
        av: { projector: true, screen: true, mic: true, speaker: true, flipchart: false, wifi: "SAMPLE-WIFI" },
        fb: { coffee: true, breakfast: false, lunch: true, snacks: false, dietary: "" },
        billing: "Sample invoice note for the demo.",
        notes: "Leave a center aisle.",
        setupEnabled: true,
        setupLeadMin: 90
      }));
      bookings.push(makeBooking({
        id: "b-" + hotel + "-tomorrow",
        hotel: hotel,
        roomId: small.id,
        status: "definite",
        groupName: "Sample Planning Block",
        phone: "5550100190",
        date: tomorrow.date,
        start: tomorrow.hm,
        end: tomorrowStop.hm,
        setupMin: 20,
        teardownMin: 10,
        guaranteed: 6,
        expected: 8,
        style: "u_shape",
        av: { projector: false, screen: false, mic: false, speaker: false, flipchart: true, wifi: "" },
        fb: { coffee: true, breakfast: false, lunch: false, snacks: true, dietary: "" },
        billing: "Sample invoice note for the demo.",
        notes: "",
        setupEnabled: true,
        setupLeadMin: 30
      }));
      bookings.push(makeBooking({
        id: "b-" + hotel + "-later",
        hotel: hotel,
        roomId: large.id,
        status: "definite",
        groupName: "Sample Classroom Workshop",
        phone: "",
        date: later.date,
        start: later.hm,
        end: laterStop.hm,
        setupMin: 30,
        teardownMin: 15,
        guaranteed: 18,
        expected: 24,
        style: "classroom",
        setupEnabled: false,
        setupLeadMin: 0
      }));
      bookings.push(makeBooking({
        id: "b-" + hotel + "-maybe",
        hotel: hotel,
        roomId: small.id,
        status: "tentative",
        groupName: "Sample Reception Hold",
        phone: "",
        date: maybe.date,
        start: maybe.hm,
        end: maybeStop.hm,
        setupMin: 15,
        teardownMin: 15,
        guaranteed: 0,
        expected: 12,
        style: "reception",
        setupEnabled: false,
        setupLeadMin: 0
      }));
      bookings.push(makeBooking({
        id: "b-" + hotel + "-cancel",
        hotel: hotel,
        roomId: large.id,
        status: "cancelled",
        groupName: "Sample Dropped Hold",
        phone: "",
        date: soon.date,
        start: soon.hm,
        end: soonStop.hm,
        setupMin: 30,
        teardownMin: 15,
        guaranteed: 10,
        expected: 10,
        style: "reception",
        setupEnabled: false,
        setupLeadMin: 0
      }));
    });
    return { v: 1, origin: "example", settings: settings, rooms: rooms, bookings: bookings, tasks: [], daySent: {} };
  }

  function conflicts(state, booking, ignoreId) {
    var mine = blockWindow(booking);
    if (!mine || booking.status === "cancelled") return [];
    return (state.bookings || []).filter(function (other) {
      if (!other || other.id === ignoreId || other.id === booking.id) return false;
      if (other.hotel !== booking.hotel || other.roomId !== booking.roomId) return false;
      if (other.status === "cancelled") return false;
      var win = blockWindow(other);
      if (!win) return false;
      return mine.start < win.end && win.start < mine.end;
    });
  }
  function people(roster, hotel, role) {
    return (roster || []).filter(function (person) { return person && person.hotel === hotel && person.role === role; });
  }
  function pickAssignee(booking, kind, roster) {
    var requested = kind === "setup" ? booking.setupAssigneeId : booking.cleanupAssigneeId;
    if (requested) {
      var chosen = (roster || []).filter(function (person) {
        return person && person.id === requested && person.hotel === booking.hotel;
      })[0];
      if (chosen) return { id: chosen.id, name: chosen.name, role: chosen.role };
    }
    var order = ["House Person", "Housekeeping", "GM", "AGM"];
    for (var i = 0; i < order.length; i++) {
      var list = people(roster, booking.hotel, order[i]);
      if (list.length) return { id: list[0].id, name: list[0].name, role: list[0].role };
    }
    return { id: "", name: "", role: "House Person" };
  }
  function listBits(booking, lang, kind) {
    var items = [];
    var av = booking.av || blankAv();
    var fb = booking.fb || blankFb();
    if (kind === "setup") {
      if (av.projector) items.push(t("Projector", lang));
      if (av.screen) items.push(t("Screen", lang));
      if (av.mic) items.push(t("Microphone", lang));
      if (av.speaker) items.push(t("Speaker", lang));
      if (av.flipchart) items.push(t("Flip chart", lang));
      if (av.wifi) items.push(t("Wi-Fi code", lang) + " " + av.wifi);
      if (fb.coffee) items.push(t("Coffee break", lang));
      if (fb.breakfast) items.push(t("Breakfast", lang));
      if (fb.lunch) items.push(t("Lunch", lang));
      if (fb.snacks) items.push(t("Snacks", lang));
      if (fb.dietary) items.push(fb.dietary);
    }
    if (booking.notes) items.push(booking.notes);
    return items;
  }
  function taskCopy(booking, room, kind, lang) {
    var style = styleLabel(booking.style, lang) || t("Standard set", lang);
    var roomName = room ? room.name : "";
    var extra = listBits(booking, lang, kind);
    var note = extra.length ? extra.join(". ") : (kind === "cleanup" ? t("Clear the room and return it to a standard set.", lang) : t("Set the room before the group arrives.", lang));
    if (kind === "cleanup") {
      return lang === "es"
        ? "Restablece " + roomName + ". Era " + style + ". " + note + " EJEMPLO"
        : "Reset " + roomName + ". Was " + style + ". " + note + " EXAMPLE";
    }
    return lang === "es"
      ? "Prepara " + roomName + ". Para " + style + ". " + note + " EJEMPLO"
      : "Set " + roomName + ". For " + style + ". " + note + " EXAMPLE";
  }
  function taskRecord(booking, room, kind, roster, now, id) {
    var who = pickAssignee(booking, kind, roster);
    var win = blockWindow(booking);
    var due = kind === "setup" && win ? win.eventStart - (Number(booking.setupLeadMin) || 0) * 60000 : (win ? win.eventEnd : Date.parse(now));
    return {
      id: id,
      hotel: booking.hotel,
      bookingId: booking.id,
      kind: kind,
      assigneeId: who.id,
      assigneeName: who.name,
      assigneeRole: who.role,
      roomName: room ? room.name : "",
      style: booking.style,
      notes: booking.notes || "",
      textEn: taskCopy(booking, room, kind, "en"),
      textEs: taskCopy(booking, room, kind, "es"),
      dueAt: new Date(due).toISOString(),
      createdAt: now,
      status: "Open",
      example: !!booking.example
    };
  }
  function sameClock(a, b) {
    return a.date === b.date && a.start === b.start && a.end === b.end;
  }
  function readBooking(input, previous) {
    var base = previous || {};
    var avIn = input.av || {};
    var fbIn = input.fb || {};
    return {
      id: input.id || base.id || "",
      hotel: input.hotel || base.hotel || "",
      roomId: input.roomId || "",
      status: STATUSES.indexOf(input.status) >= 0 ? input.status : "tentative",
      groupName: String(input.groupName || "").trim(),
      phone: phoneDigits(input.phone),
      date: input.date || "",
      start: input.start || "",
      end: input.end || "",
      setupMin: Math.max(0, Math.min(240, Math.round(Number(input.setupMin) || 0))),
      teardownMin: Math.max(0, Math.min(240, Math.round(Number(input.teardownMin) || 0))),
      guaranteed: Math.max(0, Math.round(Number(input.guaranteed) || 0)),
      expected: Math.max(0, Math.round(Number(input.expected) || 0)),
      style: input.style || "",
      av: {
        projector: !!avIn.projector,
        screen: !!avIn.screen,
        mic: !!avIn.mic,
        speaker: !!avIn.speaker,
        flipchart: !!avIn.flipchart,
        wifi: String(avIn.wifi || "").trim().slice(0, 40)
      },
      fb: {
        coffee: !!fbIn.coffee,
        breakfast: !!fbIn.breakfast,
        lunch: !!fbIn.lunch,
        snacks: !!fbIn.snacks,
        dietary: String(fbIn.dietary || "").trim().slice(0, 200)
      },
      billing: String(input.billing == null ? (base.billing || "") : input.billing).trim().slice(0, 500),
      notes: String(input.notes || "").trim().slice(0, 500),
      cleanupAssigneeId: input.cleanupAssigneeId || "",
      setupEnabled: !!input.setupEnabled,
      setupLeadMin: Math.max(0, Math.min(240, Math.round(Number(input.setupLeadMin) || 0))),
      setupAssigneeId: input.setupAssigneeId || "",
      checks: base.checks || blankChecks(),
      reminderSent: base.reminderSent || "",
      hourAlertSent: base.hourAlertSent || "",
      cleanupTaskId: base.cleanupTaskId || "",
      setupTaskId: base.setupTaskId || "",
      example: !!base.example
    };
  }
  function saveBooking(state, input, actor, roster) {
    var fail = function (error, extra) {
      var out = { ok: false, error: error, conflicts: [], state: state };
      if (extra) out.conflicts = extra;
      return out;
    };
    if (!actor || !canEdit(actor.role)) return fail("role");
    var previous = input.id ? (state.bookings || []).filter(function (row) { return row.id === input.id; })[0] : null;
    var booking = readBooking(input, previous);
    if (!hotelOk(actor, booking.hotel)) return fail("hotel");
    if (!canBill(actor.role)) booking.billing = previous ? previous.billing : "";
    if (booking.groupName.length < 2 || booking.groupName.length > 80) return fail("name");
    var room = roomById(state, booking.roomId);
    if (!room || room.hotel !== booking.hotel || !room.active) return fail("room");
    if (!STYLE_OK[booking.style] || room.styles.indexOf(booking.style) < 0) return fail("style");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^\d{2}:\d{2}$/.test(booking.start) || !/^\d{2}:\d{2}$/.test(booking.end)) return fail("time");
    if (!eventTimes(booking)) return fail("time");
    if (booking.expected > room.capacity || booking.guaranteed > room.capacity) return fail("capacity");
    if (booking.phone && booking.phone.length !== 10) return fail("phone");
    var hits = conflicts(state, booking, booking.id);
    if (hits.length) return fail("conflict", hits);
    if (previous && !sameClock(previous, booking)) {
      booking.reminderSent = "";
      booking.hourAlertSent = "";
    }
    var next = clone(state);
    if (!booking.id) booking.id = "b-" + Math.random().toString(36).slice(2, 10);
    var found = false;
    next.bookings = (next.bookings || []).map(function (row) {
      if (row.id !== booking.id) return row;
      found = true;
      return booking;
    });
    if (!found) next.bookings.push(booking);
    ["cleanup", "setup"].forEach(function (kind) {
      var taskId = kind === "cleanup" ? booking.cleanupTaskId : booking.setupTaskId;
      if (!taskId) return;
      next.tasks = (next.tasks || []).map(function (task) {
        if (task.id !== taskId || task.status === "Done") return task;
        var who = pickAssignee(booking, kind, roster || []);
        var copy = clone(task);
        copy.assigneeId = who.id;
        copy.assigneeName = who.name;
        copy.assigneeRole = who.role;
        copy.roomName = room.name;
        copy.style = booking.style;
        copy.notes = booking.notes;
        copy.textEn = taskCopy(booking, room, kind, "en");
        copy.textEs = taskCopy(booking, room, kind, "es");
        return copy;
      });
    });
    return { ok: true, state: next, booking: booking };
  }
  function saveRoom(state, input, actor) {
    if (!actor || !canConfigure(actor.role)) return { ok: false, error: "role", state: state };
    if (!hotelOk(actor, input.hotel)) return { ok: false, error: "hotel", state: state };
    var name = String(input.name || "").trim();
    var capacity = Math.round(Number(input.capacity) || 0);
    var styles = (input.styles || []).filter(function (id) { return !!STYLE_OK[id]; });
    if (name.length < 2 || name.length > 40) return { ok: false, error: "roomname", state: state };
    if (capacity < 1 || capacity > 500) return { ok: false, error: "cap", state: state };
    if (!styles.length) return { ok: false, error: "style", state: state };
    var next = clone(state);
    var room = {
      id: input.id || ("r-" + Math.random().toString(36).slice(2, 10)),
      hotel: input.hotel,
      name: name,
      capacity: capacity,
      styles: styles,
      active: input.active !== false,
      example: false
    };
    var found = false;
    next.rooms = (next.rooms || []).map(function (row) {
      if (row.id !== room.id) return row;
      found = true;
      room.example = row.example;
      return room;
    });
    if (!found) next.rooms.push(room);
    return { ok: true, state: next, room: room };
  }
  function saveSettings(state, input, actor) {
    if (!actor || !canConfigure(actor.role)) return { ok: false, error: "role", state: state };
    if (!hotelOk(actor, input.hotel)) return { ok: false, error: "hotel", state: state };
    var hour = Number(input.dayAlertHour);
    if (!isFinite(hour) || hour < 0 || hour > 11 || Math.round(hour) !== hour) return { ok: false, error: "hour", state: state };
    var next = clone(state);
    next.settings = next.settings || {};
    next.settings[input.hotel] = { hotel: input.hotel, dayAlertHour: hour };
    return { ok: true, state: next };
  }
  function setCheck(state, id, key, on, actor) {
    if (!actor || !canBill(actor.role)) return { ok: false, error: "role", state: state };
    if (["headcount", "av", "fb", "setup"].indexOf(key) < 0) return { ok: false, error: "check", state: state };
    var next = clone(state);
    var booking = (next.bookings || []).filter(function (row) { return row.id === id; })[0];
    if (!booking || !hotelOk(actor, booking.hotel)) return { ok: false, error: "hotel", state: state };
    booking.checks = booking.checks || blankChecks();
    booking.checks[key] = !!on;
    return { ok: true, state: next, booking: booking };
  }

  function liveBookings(state, hotel, date) {
    return (state.bookings || []).filter(function (booking) {
      return booking.hotel === hotel && booking.date === date && booking.status !== "cancelled";
    }).sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  }
  function alertBase(id, kind, hotel, roles, bookingId) {
    return { id: id, kind: kind, hotel: hotel, roles: roles, bookingId: bookingId || "", titleEn: "", titleEs: "", bodyEn: "", bodyEs: "" };
  }
  function reminderAlert(state, booking) {
    var room = roomById(state, booking.roomId);
    var map = {
      group: booking.groupName,
      date: fmtDate(booking.date, "en"),
      time: fmtTime(booking.start, "en"),
      room: room ? room.name : ""
    };
    var mapEs = {
      group: booking.groupName,
      date: fmtDate(booking.date, "es"),
      time: fmtTime(booking.start, "es"),
      room: room ? room.name : ""
    };
    var win = blockWindow(booking);
    var alert = alertBase("mt-rem-" + booking.id + "-" + (win ? win.eventStart : ""), "meeting_reminder", booking.hotel, ["GM", "AGM"], booking.id);
    alert.titleEn = t("Coming up", "en");
    alert.titleEs = t("Coming up", "es");
    alert.bodyEn = fill("Confirm {group} on {date} at {time} in {room}. Check headcount, AV, food and beverage, and the setup assignee.", "en", map);
    alert.bodyEs = fill("Confirm {group} on {date} at {time} in {room}. Check headcount, AV, food and beverage, and the setup assignee.", "es", mapEs);
    return alert;
  }
  function hourAlert(state, booking) {
    var room = roomById(state, booking.roomId);
    var map = { group: booking.groupName, time: fmtTime(booking.start, "en"), room: room ? room.name : "", count: booking.guaranteed };
    var mapEs = { group: booking.groupName, time: fmtTime(booking.start, "es"), room: room ? room.name : "", count: booking.guaranteed };
    var win = blockWindow(booking);
    var alert = alertBase("mt-hour-" + booking.id + "-" + (win ? win.eventStart : ""), "meeting_hour", booking.hotel, ["Front Desk"], booking.id);
    alert.titleEn = t("Meetings", "en");
    alert.titleEs = t("Meetings", "es");
    alert.bodyEn = fill("{group} starts at {time} in {room}. Headcount {count}.", "en", map);
    alert.bodyEs = fill("{group} starts at {time} in {room}. Headcount {count}.", "es", mapEs);
    return alert;
  }
  function dayAlert(state, hotel, date) {
    var rows = liveBookings(state, hotel, date);
    function body(lang) {
      var head = fill("Today's meeting list for {date}.", lang, { date: fmtDate(date, lang) });
      if (!rows.length) return head + " " + t("No meetings today.", lang);
      return head + " " + rows.map(function (booking) {
        var room = roomById(state, booking.roomId);
        return [
          room ? room.name : "",
          fmtTime(booking.start, lang) + "-" + fmtTime(booking.end, lang),
          booking.groupName,
          t("Headcount", lang) + " " + booking.guaranteed + "/" + booking.expected,
          booking.phone ? fmtPhone(booking.phone) : t("No on-site phone", lang)
        ].join(", ");
      }).join(" | ");
    }
    var alert = alertBase("mt-day-" + hotel + "-" + date, "meeting_day", hotel, ["Front Desk"], "");
    alert.titleEn = t("Today's events", "en");
    alert.titleEs = t("Today's events", "es");
    alert.bodyEn = body("en");
    alert.bodyEs = body("es");
    return alert;
  }
  function sweep(state, now, roster) {
    var next = clone(state);
    var alerts = [];
    var tasks = [];
    var ms = Date.parse(now);
    (next.bookings || []).forEach(function (booking) {
      var win = blockWindow(booking);
      if (!win || booking.status === "cancelled") return;
      var room = roomById(next, booking.roomId);
      if (booking.status === "definite" && !booking.reminderSent && win.eventStart > ms && win.eventStart - ms <= 24 * 3600000) {
        booking.reminderSent = now;
        alerts.push(reminderAlert(next, booking));
      }
      if (!booking.hourAlertSent && win.eventStart > ms && win.eventStart - ms <= 60 * 60000) {
        booking.hourAlertSent = now;
        alerts.push(hourAlert(next, booking));
      }
      if (booking.status === "definite" && !booking.cleanupTaskId && win.eventEnd <= ms) {
        var cleanup = taskRecord(booking, room, "cleanup", roster, now, "t-" + booking.id + "-cleanup");
        booking.cleanupTaskId = cleanup.id;
        next.tasks.push(cleanup);
        tasks.push(cleanup);
      }
      if (booking.status === "definite" && booking.setupEnabled && booking.setupLeadMin > 0 && !booking.setupTaskId) {
        var due = win.eventStart - booking.setupLeadMin * 60000;
        if (due <= ms && win.eventEnd > ms) {
          var setup = taskRecord(booking, room, "setup", roster, now, "t-" + booking.id + "-setup");
          booking.setupTaskId = setup.id;
          next.tasks.push(setup);
          tasks.push(setup);
        }
      }
    });
    var today = chicagoDate(now);
    var hour = chicagoHour(now);
    HOTELS.forEach(function (hotel) {
      var settings = (next.settings && next.settings[hotel]) || defaultSettings(hotel);
      var key = dayKey(hotel, today);
      if (hour == null || hour < settings.dayAlertHour) return;
      if (next.daySent && next.daySent[key]) return;
      next.daySent = next.daySent || {};
      next.daySent[key] = now;
      alerts.push(dayAlert(next, hotel, today));
    });
    return { state: next, alerts: alerts, tasks: tasks };
  }
  function pushPayload(alert) {
    var meet = alert.bookingId ? "?meet=" + encodeURIComponent(alert.bookingId) : "";
    return {
      title: alert.titleEn,
      body: alert.bodyEn + "\n" + alert.bodyEs,
      url: "/hotelhq/" + meet,
      tag: alert.id,
      lang: "en",
      kind: alert.kind
    };
  }
  function taskLine(task, lang) {
    if (!task) return "";
    return lang === "es" ? task.textEs : task.textEn;
  }
  function opsRequest(task) {
    var maintenance = task && task.assigneeRole === "Maintenance";
    var status = task && task.status === "Done" ? "done" : task && task.status === "Started" ? "ack" : "open";
    return {
      kind: maintenance ? "work_order" : "houseperson_help",
      dept: maintenance ? "maintenance" : "housekeeping",
      room: task ? task.roomName : "",
      title: task ? task.textEn : "",
      titleEs: task ? task.textEs : "",
      status: status,
      example: !!(task && task.example),
      source: "meeting",
      meetingTaskId: task ? task.id : "",
      assigneeRole: task ? task.assigneeRole : "",
      assigneeName: task ? task.assigneeName : ""
    };
  }
  function tasksFor(state, actor) {
    if (!actor) return [];
    return (state.tasks || []).filter(function (task) {
      if (task.hotel !== actor.hotel && normRole(actor.role) !== "corporate") return false;
      if (actor.id && task.assigneeId) return task.assigneeId === actor.id;
      if (!task.assigneeId && task.assigneeRole === actor.role) return true;
      return false;
    });
  }

  function errorText(code, lang) {
    var map = {
      name: "Enter a group or company name.",
      room: "Choose a room.",
      roomname: "Enter a room name.",
      cap: "Enter a capacity.",
      style: "Choose a setup style this room allows.",
      time: "End time has to be after the start.",
      capacity: "That room holds fewer people.",
      phone: "Enter a 10-digit phone, or leave it blank.",
      hotel: "That hotel is not on your list.",
      role: "You can't edit this booking.",
      hour: "Enter an hour from 0 to 11.",
      conflict: "That room is already booked for this time, including setup and teardown.",
      save: "Could not save."
    };
    return t(map[code] || map.save, lang);
  }
  function noticeText(code, lang) {
    var map = { saved: "Booking saved.", room: "Room saved.", reset: "Sample data reset.", hour: "Saved." };
    return t(map[code] || "", lang);
  }
  function checkItems() {
    return [
      ["headcount", "Confirm headcount"],
      ["av", "Confirm AV"],
      ["fb", "Confirm food and beverage"],
      ["setup", "Confirm setup assignee"]
    ];
  }
  function avLine(booking, lang) {
    var av = booking.av || blankAv();
    var items = [];
    if (av.projector) items.push(t("Projector", lang));
    if (av.screen) items.push(t("Screen", lang));
    if (av.mic) items.push(t("Microphone", lang));
    if (av.speaker) items.push(t("Speaker", lang));
    if (av.flipchart) items.push(t("Flip chart", lang));
    if (av.wifi) items.push(t("Wi-Fi code", lang) + " " + av.wifi);
    return items.length ? items.join(", ") : t("None", lang);
  }
  function fbLine(booking, lang) {
    var fb = booking.fb || blankFb();
    var items = [];
    if (fb.coffee) items.push(t("Coffee break", lang));
    if (fb.breakfast) items.push(t("Breakfast", lang));
    if (fb.lunch) items.push(t("Lunch", lang));
    if (fb.snacks) items.push(t("Snacks", lang));
    if (fb.dietary) items.push(fb.dietary);
    return items.length ? items.join(", ") : t("None", lang);
  }
  function clockShift(date, hm, minutes) {
    var iso = fromChicagoLocal(date + "T" + hm);
    if (!iso) return "";
    var p = chicagoParts(new Date(Date.parse(iso) + minutes * 60000).toISOString());
    return p.hour + ":" + p.minute;
  }
  function assigneeOptions(roster, hotel, selected, lang) {
    var html = "<option value=\"\">" + esc(t("House person on duty", lang)) + "</option>";
    (roster || []).filter(function (person) { return person.hotel === hotel; }).forEach(function (person) {
      html += "<option value=\"" + esc(person.id) + "\"" + (person.id === selected ? " selected" : "") + ">" + esc(person.name) + "</option>";
    });
    return html;
  }
  function field(label, inner) {
    return "<label class=\"mt-field\"><span>" + esc(label) + "</span>" + inner + "</label>";
  }
  function eventBlock(state, booking, lang, open) {
    var room = roomById(state, booking.roomId);
    var cls = "mt-ev mt-" + booking.status;
    var body = "<b>" + esc(fmtTime(booking.start, lang) + "-" + fmtTime(booking.end, lang)) + "</b> " +
      esc(booking.groupName) + "<small>" + esc(room ? room.name : "") + " · " + esc(styleLabel(booking.style, lang)) + "</small>";
    if (!open) return "<div class=\"" + cls + "\" data-status=\"" + esc(booking.status) + "\">" + body + "</div>";
    return "<button type=\"button\" class=\"" + cls + "\" data-status=\"" + esc(booking.status) + "\" onclick=\"mtOpen('" + esc(booking.id) + "')\">" + body + "</button>";
  }
  function dayEvents(state, hotel, date, roomId) {
    return (state.bookings || []).filter(function (booking) {
      return booking.hotel === hotel && booking.date === date && (!roomId || booking.roomId === roomId);
    }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  }
  function renderBeo(state, booking, opts) {
    var lang = opts.lang;
    var room = roomById(state, booking.roomId);
    var bill = canBill(opts.actor.role);
    var winStart = clockShift(booking.date, booking.start, -(booking.setupMin || 0));
    var winEnd = clockShift(booking.date, booking.end, booking.teardownMin || 0);
    var checks = booking.checks || blankChecks();
    var boxes = checkItems().map(function (item) {
      var on = !!checks[item[0]];
      if (!canBill(opts.actor.role)) {
        return "<li>" + esc(t(item[1], lang)) + ": " + esc(on ? t("Yes", lang) : t("No", lang)) + "</li>";
      }
      return "<li><button type=\"button\" class=\"btn2\" onclick=\"mtCheck('" + esc(booking.id) + "','" + item[0] + "'," + (on ? "false" : "true") + ")\">" +
        esc(t(item[1], lang)) + "</button> " + esc(on ? t("Yes", lang) : t("No", lang)) + "</li>";
    }).join("");
    var billing = bill ? "<p id=\"mtBill\"><b>" + esc(t("Billing notes", lang)) + "</b><br>" + esc(booking.billing || t("None", lang)) + "</p>" : "";
    return "<article class=\"mt-sheet\" id=\"mtBeo\">" +
      "<p class=\"mt-kicker\"><span class=\"ex\">" + esc(t("EXAMPLE", lang)) + "</span> " + esc(booking.hotel) + "</p>" +
      "<h2>" + esc(t("Banquet Event Order", lang)) + "</h2>" +
      "<p class=\"mt-" + esc(booking.status) + "\">" + esc(statusLabel(booking.status, lang)) + "</p>" +
      "<div class=\"mt-k\">" +
      "<p><b>" + esc(t("Group or company", lang)) + "</b><br>" + esc(booking.groupName) + "</p>" +
      "<p><b>" + esc(t("On-site phone", lang)) + "</b><br>" + esc(booking.phone ? fmtPhone(booking.phone) : t("No on-site phone", lang)) + "</p>" +
      "<p><b>" + esc(t("Room", lang)) + "</b><br>" + esc(room ? room.name : "") + "</p>" +
      "<p><b>" + esc(t("Date", lang)) + "</b><br>" + esc(fmtDate(booking.date, lang)) + "</p>" +
      "<p><b>" + esc(t("Starts", lang)) + "</b><br>" + esc(fmtTime(booking.start, lang)) + "</p>" +
      "<p><b>" + esc(t("Ends", lang)) + "</b><br>" + esc(fmtTime(booking.end, lang)) + "</p>" +
      "<p><b>" + esc(t("Setup", lang)) + "</b><br>" + esc(fmtTime(winStart, lang)) + " (" + booking.setupMin + " " + esc(t("minutes", lang)) + ")</p>" +
      "<p><b>" + esc(t("Teardown", lang)) + "</b><br>" + esc(fmtTime(winEnd, lang)) + " (" + booking.teardownMin + " " + esc(t("minutes", lang)) + ")</p>" +
      "<p><b>" + esc(t("Headcount", lang)) + "</b><br>" + esc(t("Guaranteed", lang)) + " " + booking.guaranteed + " / " + esc(t("Expected", lang)) + " " + booking.expected + "</p>" +
      "<p><b>" + esc(t("Setup style", lang)) + "</b><br>" + esc(styleLabel(booking.style, lang)) + "</p>" +
      "</div>" +
      "<p><b>" + esc(t("Projector", lang)) + "</b><br>" + esc(avLine(booking, lang)) + "</p>" +
      "<p><b>" + esc(t("Food and beverage", lang)) + "</b><br>" + esc(fbLine(booking, lang)) + "</p>" +
      "<p><b>" + esc(t("Special instructions", lang)) + "</b><br>" + esc(booking.notes || t("No notes.", lang)) + "</p>" +
      billing +
      "<h3>" + esc(t("Checklist", lang)) + "</h3><ul id=\"mtCheck\">" + boxes + "</ul>" +
      "<p><b>" + esc(t("Cleanup", lang)) + "</b> " + esc(booking.cleanupTaskId ? t("Saved.", lang) : t("Not created yet", lang)) + "</p>" +
      "</article>";
  }
  function renderEdit(state, booking, opts) {
    var lang = opts.lang;
    var hotel = booking.hotel;
    var rooms = (state.rooms || []).filter(function (room) { return room.hotel === hotel && room.active; });
    var room = roomById(state, booking.roomId) || rooms[0];
    var styles = room ? room.styles : [];
    var bill = canBill(opts.actor.role);
    function box(name, on, label) {
      return "<label class=\"mt-check\"><input type=\"checkbox\" id=\"" + name + "\"" + (on ? " checked" : "") + "> " + esc(label) + "</label>";
    }
    var conflict = "";
    if (opts.ui && opts.ui.error === "conflict") {
      var lines = (opts.ui.conflicts || []).map(function (other) {
        return "<p>" + esc(fill("Conflicts with {group} ({status}) {time}.", lang, {
          group: other.groupName,
          status: statusLabel(other.status, lang),
          time: fmtTime(other.start, lang) + "-" + fmtTime(other.end, lang)
        })) + "</p>";
      }).join("");
      conflict = "<div id=\"mtConflict\" role=\"alert\">" + esc(t("That room is already booked for this time, including setup and teardown.", lang)) + lines + "</div>";
    } else if (opts.ui && opts.ui.error) {
      conflict = "<div id=\"mtConflict\" role=\"alert\">" + esc(errorText(opts.ui.error, lang)) + "</div>";
    }
    return "<form class=\"mt-form\" id=\"mtForm\" onsubmit=\"mtSave(event)\">" +
      "<h2>" + esc(t("Banquet Event Order", lang)) + "</h2>" + conflict +
      field(t("Group or company", lang), "<input id=\"mtGroup\" maxlength=\"80\" value=\"" + esc(booking.groupName) + "\">") +
      field(t("On-site phone", lang) + " (" + t("Optional", lang) + ")", "<input id=\"mtPhone\" inputmode=\"tel\" value=\"" + esc(booking.phone ? fmtPhone(booking.phone) : "") + "\">") +
      field(t("Room", lang), "<select id=\"mtRoom\">" + rooms.map(function (item) {
        return "<option value=\"" + esc(item.id) + "\"" + (item.id === booking.roomId ? " selected" : "") + ">" + esc(item.name) + "</option>";
      }).join("") + "</select>") +
      field(t("Date", lang), "<input id=\"mtDate\" type=\"date\" value=\"" + esc(booking.date) + "\">") +
      field(t("Starts", lang), "<input id=\"mtStart\" type=\"time\" value=\"" + esc(booking.start) + "\">") +
      field(t("Ends", lang), "<input id=\"mtEnd\" type=\"time\" value=\"" + esc(booking.end) + "\">") +
      field(t("Setup", lang) + " (" + t("minutes", lang) + ")", "<input id=\"mtSetupMin\" type=\"number\" min=\"0\" max=\"240\" value=\"" + booking.setupMin + "\">") +
      field(t("Teardown", lang) + " (" + t("minutes", lang) + ")", "<input id=\"mtTearMin\" type=\"number\" min=\"0\" max=\"240\" value=\"" + booking.teardownMin + "\">") +
      field(t("Guaranteed", lang), "<input id=\"mtGtd\" type=\"number\" min=\"0\" value=\"" + booking.guaranteed + "\">") +
      field(t("Expected", lang), "<input id=\"mtExp\" type=\"number\" min=\"0\" value=\"" + booking.expected + "\">") +
      field(t("Setup style", lang), "<select id=\"mtStyle\">" + styles.map(function (id) {
        return "<option value=\"" + esc(id) + "\"" + (id === booking.style ? " selected" : "") + ">" + esc(styleLabel(id, lang)) + "</option>";
      }).join("") + "</select>") +
      field(t("Status", lang), "<select id=\"mtStatus\">" + STATUSES.map(function (id) {
        return "<option value=\"" + id + "\"" + (id === booking.status ? " selected" : "") + ">" + esc(statusLabel(id, lang)) + "</option>";
      }).join("") + "</select>") +
      "<fieldset><legend>" + esc(t("Projector", lang)) + "</legend>" +
      box("mtProj", booking.av.projector, t("Projector", lang)) +
      box("mtScreen", booking.av.screen, t("Screen", lang)) +
      box("mtMic", booking.av.mic, t("Microphone", lang)) +
      box("mtSpeaker", booking.av.speaker, t("Speaker", lang)) +
      box("mtFlip", booking.av.flipchart, t("Flip chart", lang)) +
      field(t("Wi-Fi code", lang), "<input id=\"mtWifi\" maxlength=\"40\" value=\"" + esc(booking.av.wifi) + "\">") +
      "</fieldset>" +
      "<fieldset><legend>" + esc(t("Food and beverage", lang)) + "</legend>" +
      box("mtCoffee", booking.fb.coffee, t("Coffee break", lang)) +
      box("mtBfast", booking.fb.breakfast, t("Breakfast", lang)) +
      box("mtLunch", booking.fb.lunch, t("Lunch", lang)) +
      box("mtSnacks", booking.fb.snacks, t("Snacks", lang)) +
      field(t("Dietary notes", lang), "<input id=\"mtDiet\" maxlength=\"200\" value=\"" + esc(booking.fb.dietary) + "\">") +
      "</fieldset>" +
      (bill ? field(t("Billing notes", lang), "<textarea id=\"mtBill\" maxlength=\"500\">" + esc(booking.billing) + "</textarea><small>" + esc(t("Billing notes stay with managers.", lang)) + "</small>") : "<p>" + esc(t("Billing notes stay with managers.", lang)) + "</p>") +
      field(t("Special instructions", lang), "<textarea id=\"mtNotes\" maxlength=\"500\">" + esc(booking.notes) + "</textarea>") +
      field(t("Cleanup assignee", lang), "<select id=\"mtCleanWho\">" + assigneeOptions(opts.roster, hotel, booking.cleanupAssigneeId, lang) + "</select>") +
      box("mtSetupOn", booking.setupEnabled, t("Create a setup task before the start.", lang)) +
      field(t("Minutes before start", lang), "<input id=\"mtSetupLead\" type=\"number\" min=\"0\" max=\"240\" value=\"" + booking.setupLeadMin + "\">") +
      field(t("Setup assignee", lang), "<select id=\"mtSetupWho\">" + assigneeOptions(opts.roster, hotel, booking.setupAssigneeId, lang) + "</select>") +
      "<button class=\"btn\" id=\"mtSaveBtn\" type=\"submit\">" + esc(t("Save booking", lang)) + "</button></form>";
  }
  function renderRooms(state, opts) {
    var lang = opts.lang;
    var hotel = opts.hotel;
    if (!canConfigure(opts.actor.role)) return "<p id=\"mtRoomsLocked\">" + esc(t("A GM sets up the rooms.", lang)) + "</p>";
    var settings = (state.settings && state.settings[hotel]) || defaultSettings(hotel);
    var list = (state.rooms || []).filter(function (room) { return room.hotel === hotel; }).map(function (room) {
      return "<li><b>" + esc(room.name) + "</b> " + room.capacity + " " +
        room.styles.map(function (id) { return esc(styleLabel(id, lang)); }).join(", ") +
        " <button type=\"button\" class=\"btn2\" onclick=\"mtEditRoom('" + esc(room.id) + "')\">" + esc(t("Rooms", lang)) + "</button></li>";
    }).join("");
    var editing = opts.ui && opts.ui.roomEdit;
    var current = editing ? (roomById(state, editing) || { id: "", name: "", capacity: 20, styles: ["boardroom"], active: true }) : { id: "", name: "", capacity: 20, styles: ["boardroom"], active: true };
    var styleBoxes = STYLES.map(function (row) {
      var on = current.styles.indexOf(row[0]) >= 0;
      return "<label class=\"mt-check\"><input type=\"checkbox\" name=\"mtRoomStyle\" value=\"" + row[0] + "\"" + (on ? " checked" : "") + "> " + esc(t(row[1], lang)) + "</label>";
    }).join("");
    return "<div id=\"mtRooms\"><h2>" + esc(t("Rooms", lang)) + "</h2><ul>" + list + "</ul>" +
      "<form id=\"mtRoomForm\" onsubmit=\"mtSaveRoom(event)\">" +
      "<h3>" + esc(t("Add room", lang)) + "</h3>" +
      "<input type=\"hidden\" id=\"mtRoomId\" value=\"" + esc(current.id) + "\">" +
      field(t("Room name", lang), "<input id=\"mtRoomName\" maxlength=\"40\" value=\"" + esc(current.name) + "\">") +
      field(t("Capacity", lang), "<input id=\"mtRoomCap\" type=\"number\" min=\"1\" max=\"500\" value=\"" + current.capacity + "\">") +
      "<fieldset><legend>" + esc(t("Setup style", lang)) + "</legend>" + styleBoxes + "</fieldset>" +
      "<label class=\"mt-check\"><input type=\"checkbox\" id=\"mtRoomOn\"" + (current.active !== false ? " checked" : "") + "> " + esc(t("Active", lang)) + "</label>" +
      "<button class=\"btn\" id=\"mtSaveRoom\" type=\"submit\">" + esc(t("Save room", lang)) + "</button></form>" +
      "<form id=\"mtHourForm\" onsubmit=\"mtSaveHour(event)\">" +
      field(t("Front desk morning list", lang), "<input id=\"mtHour\" type=\"number\" min=\"0\" max=\"11\" value=\"" + settings.dayAlertHour + "\">") +
      "<button class=\"btn2\" type=\"submit\">" + esc(t("Save hour", lang)) + "</button></form></div>";
  }
  function renderCalendar(state, opts) {
    var lang = opts.lang;
    var hotel = opts.hotel;
    var ui = opts.ui || {};
    var view = ui.view || "day";
    var anchor = ui.date || chicagoDate(opts.now);
    var roomId = ui.roomId || "";
    var rooms = (state.rooms || []).filter(function (room) { return room.hotel === hotel; });
    var chips = "<button type=\"button\" class=\"" + (roomId ? "btn2" : "btn") + "\" onclick=\"mtRoom('')\">" + esc(t("All rooms", lang)) + "</button>" +
      rooms.map(function (room) {
        return "<button type=\"button\" class=\"" + (roomId === room.id ? "btn" : "btn2") + "\" onclick=\"mtRoom('" + esc(room.id) + "')\">" + esc(room.name) + "</button>";
      }).join("");
    var views = ["day", "week", "month"].map(function (id) {
      var label = id === "day" ? "Day" : id === "week" ? "Week" : "Month";
      return "<button type=\"button\" class=\"" + (view === id ? "btn" : "btn2") + "\" onclick=\"mtView('" + id + "')\">" + esc(t(label, lang)) + "</button>";
    }).join("");
    var body = "";
    if (view === "day") {
      body = "<div id=\"mtDay\">" + dayEvents(state, hotel, anchor, roomId).map(function (booking) {
        return eventBlock(state, booking, lang, true);
      }).join("") + "</div>";
    } else if (view === "week") {
      var start = anchor;
      var dow = new Date(anchor + "T00:00:00Z").getUTCDay();
      start = addDays(anchor, -dow);
      body = "<div class=\"mt-week\" id=\"mtWeek\">" + [0, 1, 2, 3, 4, 5, 6].map(function (i) {
        var date = addDays(start, i);
        return "<section><h3>" + esc(fmtDate(date, lang)) + "</h3>" + dayEvents(state, hotel, date, roomId).map(function (booking) {
          return eventBlock(state, booking, lang, true);
        }).join("") + "</section>";
      }).join("") + "</div>";
    } else {
      var monthStart = anchor.slice(0, 8) + "01";
      var firstDow = new Date(monthStart + "T00:00:00Z").getUTCDay();
      var cells = [];
      var lastDay = daysInMonth(anchor);
      for (var i = 0; i < firstDow; i++) cells.push("<div></div>");
      for (var day = 1; day <= lastDay; day++) {
        var date = anchor.slice(0, 8) + pad(day);
        var dots = dayEvents(state, hotel, date, roomId).map(function (booking) {
          return "<i class=\"mt-dot mt-" + booking.status + "\" data-status=\"" + booking.status + "\"></i>";
        }).join("");
        cells.push("<button type=\"button\" class=\"mt-mday\" onclick=\"mtJump('" + date + "')\"><b>" + day + "</b>" + dots + "</button>");
      }
      body = "<div class=\"mt-month\" id=\"mtMonth\">" + cells.join("") + "</div>";
    }
    var legend = "<p class=\"mt-legend\" id=\"mtLegend\">" + esc(t("Legend", lang)) + " " +
      ["tentative", "definite", "cancelled"].map(function (status) {
        return "<span class=\"mt-ev mt-" + status + "\">" + esc(statusLabel(status, lang)) + "</span>";
      }).join(" ") + "</p>";
    return "<div class=\"mt-nav\">" + views + "</div><div class=\"mt-nav\"><button type=\"button\" class=\"btn2\" onclick=\"mtShift(-1)\">" +
      esc(t("Prev", lang)) + "</button><b>" + esc(fmtDate(anchor, lang)) + "</b><button type=\"button\" class=\"btn2\" onclick=\"mtShift(1)\">" +
      esc(t("Next", lang)) + "</button></div><div class=\"mt-chips\">" + chips + "</div>" + legend + body;
  }
  function renderHome(state, opts) {
    if (opts.on === false || !opts.actor || !canSeeCalendar(opts.actor.role)) return "";
    var lang = opts.lang;
    var hotel = opts.hotel;
    var today = chicagoDate(opts.now);
    var role = normRole(opts.actor.role);
    if (role === "fd") {
      var key = dayKey(hotel, today);
      if (!state.daySent || !state.daySent[key]) return "";
      var rows = liveBookings(state, hotel, today);
      var lines = rows.length ? rows.map(function (booking) {
        var room = roomById(state, booking.roomId);
        return "<button type=\"button\" class=\"mt-line\" onclick=\"mtOpen('" + esc(booking.id) + "')\">" +
          "<b>" + esc(room ? room.name : "") + "</b>" +
          "<span>" + esc(fmtTime(booking.start, lang) + "-" + fmtTime(booking.end, lang)) + "</span>" +
          "<span>" + esc(booking.groupName) + "</span>" +
          "<span>" + esc(t("Headcount", lang)) + " " + booking.guaranteed + "/" + booking.expected + "</span>" +
          "<span>" + esc(booking.phone ? fmtPhone(booking.phone) : t("No on-site phone", lang)) + "</span>" +
          "</button>";
      }).join("") : "<p>" + esc(t("No meetings today.", lang)) + "</p>";
      return "<section class=\"card raw mt\" id=\"mtDayBanner\"><h3>" + esc(t("Today's events", lang)) + " <span class=\"ex\">" + esc(t("EXAMPLE", lang)) + "</span></h3>" + lines + "</section>";
    }
    if (role !== "gm" && role !== "agm" && role !== "corporate") return "";
    var count = liveBookings(state, hotel, today).length;
    var soon = (state.bookings || []).filter(function (booking) {
      if (booking.hotel !== hotel || booking.status !== "definite" || !booking.reminderSent) return false;
      var win = blockWindow(booking);
      return win && win.eventStart > Date.parse(opts.now);
    });
    var links = soon.map(function (booking) {
      var checks = booking.checks || blankChecks();
      var ready = checks.headcount && checks.av && checks.fb && checks.setup;
      return "<p><button type=\"button\" class=\"btn2\" onclick=\"mtOpen('" + esc(booking.id) + "')\">" + esc(t("Open the BEO", lang)) + "</button> " +
        esc(booking.groupName) + " " + esc(fmtTime(booking.start, lang)) + " " + esc(ready ? t("Definite", lang) : t("Checklist", lang)) + "</p>";
    }).join("");
    return "<section class=\"card raw mt\" id=\"mtMgrHome\"><h3>" + esc(t("Meetings today", lang)) + " <span class=\"ex\">" + esc(t("EXAMPLE", lang)) + "</span></h3><p><b>" + count + "</b></p>" +
      "<button type=\"button\" class=\"btn\" onclick=\"go('meetings')\">" + esc(t("Meeting rooms", lang)) + "</button>" + links + "</section>";
  }
  function renderTask(task, index, lang) {
    if (!task) return "";
    var text = taskLine(task, lang);
    var button = task.status === "Open"
      ? "<button type=\"button\" class=\"btn raw\" onclick=\"rSt(" + index + ",'Started')\">" + esc(t("Begin task", lang)) + "</button>"
      : task.status === "Started"
        ? "<button type=\"button\" class=\"btn raw\" onclick=\"rSt(" + index + ",'Done')\">" + esc(t("Finish task", lang)) + "</button>"
        : "<span class=\"good\">✓</span>";
    return "<div class=\"li mt-task\" data-kind=\"meeting_" + esc(task.kind) + "\"><span class=\"raw\" style=\"flex:1\"><b>" + esc(text) +
      "</b><br><small>" + esc(t("Meeting task", lang)) + "</small><br><small>" + esc(t("Task only. The calendar stays with the front desk and managers.", lang)) + "</small></span>" + button + "</div>";
  }
  function renderPage(state, opts) {
    opts = opts || {};
    var lang = opts.lang === "es" ? "es" : "en";
    opts.lang = lang;
    var actor = opts.actor || { role: "", hotel: "" };
    if (!canSeeCalendar(actor.role)) {
      return "<div class=\"raw mt\" id=\"mtDenied\"><h2>" + esc(t("Meeting rooms", lang)) + "</h2><p>" + esc(t("Meeting rooms are for the front desk and managers.", lang)) + "</p></div>";
    }
    if (opts.on === false) {
      return "<div class=\"raw mt\" id=\"mtOff\"><h2>" + esc(t("Meeting rooms", lang)) + "</h2><p>" + esc(t("Meeting rooms are off at this hotel.", lang)) + "</p></div>";
    }
    var hotel = opts.hotel || actor.hotel || "MSPAM";
    var ui = opts.ui || { screen: "cal" };
    var notice = ui.notice ? "<p id=\"mtNotice\">" + esc(noticeText(ui.notice, lang)) + "</p>" : "";
    var tools = "<div class=\"mt-nav noprint\">" +
      (ui.screen !== "cal" ? "<button type=\"button\" class=\"btn2\" onclick=\"mtBack()\">" + esc(t("Back", lang)) + "</button>" : "") +
      (canEdit(actor.role) ? "<button type=\"button\" class=\"btn\" id=\"mtNew\" onclick=\"mtNew()\">" + esc(t("New booking", lang)) + "</button>" : "") +
      "<button type=\"button\" class=\"btn2\" onclick=\"mtRooms()\">" + esc(t("Rooms", lang)) + "</button>" +
      (canConfigure(actor.role) ? "<button type=\"button\" class=\"btn2\" onclick=\"mtReset()\">" + esc(t("Reset sample data", lang)) + "</button>" : "") +
      "</div>";
    var main = "";
    if (ui.screen === "beo" || ui.screen === "print") {
      var booking = (state.bookings || []).filter(function (row) { return row.id === ui.bookingId; })[0];
      if (!booking) main = "<p>" + esc(t("Choose a room.", lang)) + "</p>";
      else {
        main = renderBeo(state, booking, opts);
        if (ui.screen !== "print" && canEdit(actor.role)) {
          main += "<div class=\"mt-nav noprint\"><button type=\"button\" class=\"btn\" onclick=\"mtEdit('" + esc(booking.id) + "')\">" + esc(t("Edit booking", lang)) + "</button>" +
            "<button type=\"button\" class=\"btn2\" onclick=\"mtPrint('" + esc(booking.id) + "')\">" + esc(t("Print BEO", lang)) + "</button></div>";
        }
        if (ui.screen === "print") {
          main += "<button type=\"button\" class=\"btn noprint\" onclick=\"mtDoPrint()\">" + esc(t("Print BEO", lang)) + "</button>" +
            "<button type=\"button\" class=\"btn2 noprint\" onclick=\"mtOpen('" + esc(booking.id) + "')\">" + esc(t("Close print view", lang)) + "</button>";
        }
      }
    } else if (ui.screen === "edit") {
      var draft = ui.draft || (state.bookings || []).filter(function (row) { return row.id === ui.bookingId; })[0];
      if (!draft) {
        draft = readBooking({
          hotel: hotel,
          date: ui.date || chicagoDate(opts.now),
          start: "09:00",
          end: "10:00",
          setupMin: 30,
          teardownMin: 15,
          status: "tentative",
          style: "boardroom",
          roomId: ((state.rooms || []).filter(function (room) { return room.hotel === hotel && room.active; })[0] || {}).id || ""
        }, null);
      }
      main = renderEdit(state, draft, opts);
    } else if (ui.screen === "rooms") {
      main = renderRooms(state, opts);
    } else {
      main = renderCalendar(state, opts);
    }
    return "<div class=\"raw mt\" id=\"mtRoot\"><h2>" + esc(t("Meeting rooms", lang)) + " <span class=\"ex\">" + esc(t("EXAMPLE", lang)) + "</span></h2>" +
      "<p>" + esc(t("Sample groups for this demo. Not real guests.", lang)) + "</p>" + notice + tools + main + "</div>";
  }

  var featureSpec = { id: "meetings", en: "Meeting rooms", es: "Salas de reuniones", order: 30 };
  var api = {
    HOTELS: HOTELS,
    STYLES: STYLES,
    PHRASES: PHRASES,
    featureSpec: featureSpec,
    canSeeCalendar: canSeeCalendar,
    canEdit: canEdit,
    canBill: canBill,
    canConfigure: canConfigure,
    showTile: showTile,
    meetingsOn: meetingsOn,
    chicagoDate: chicagoDate,
    chicagoHour: chicagoHour,
    fromChicagoLocal: fromChicagoLocal,
    addDays: addDays,
    buildDemo: buildDemo,
    conflicts: conflicts,
    blockWindow: blockWindow,
    saveBooking: saveBooking,
    saveRoom: saveRoom,
    saveSettings: saveSettings,
    setCheck: setCheck,
    sweep: sweep,
    pushPayload: pushPayload,
    taskLine: taskLine,
    opsRequest: opsRequest,
    tasksFor: tasksFor,
    renderPage: renderPage,
    renderBeo: renderBeo,
    renderHome: renderHome,
    dayEvents: dayEvents,
    renderTask: renderTask,
    defaultSettings: defaultSettings,
    fmtPhone: fmtPhone,
    liveBookings: liveBookings
  };
  root.Meetings = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var KEY = "jrportal_meetings_v1";
  var mem = null;
  var ui = { screen: "cal", view: "day", date: "", roomId: "", bookingId: "", error: "", notice: "", conflicts: [], draft: null, roomEdit: "" };
  var pendingMeet = "";
  try {
    var params = new URLSearchParams(location.search);
    pendingMeet = params.get("meet") || "";
    if (pendingMeet && !/^[A-Za-z0-9_-]+$/.test(pendingMeet)) pendingMeet = "";
  } catch (e1) { pendingMeet = ""; }

  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function nowISO() { return new Date().toISOString(); }
  function actorNow() {
    var role = "";
    var hotel = "";
    var id = "";
    try { role = authRole(); } catch (e) { role = ""; }
    try { hotel = S.hotel || ""; } catch (e2) { hotel = ""; }
    try { id = S.uid || ""; } catch (e3) { id = ""; }
    return { role: role, hotel: hotel, id: id };
  }
  function rosterNow() {
    var list = [];
    try {
      list = (typeof USERS !== "undefined" ? USERS : []).filter(function (user) { return user && user.active !== false; }).map(function (user) {
        return { id: user.id, name: user.name, role: user.role, hotel: user.hotel };
      });
    } catch (e) { list = []; }
    return list;
  }
  function readStore() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1 || !data.bookings || !data.rooms) return null;
      return data;
    } catch (e) { return null; }
  }
  function writeStore(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function current() {
    if (mem) return mem;
    mem = readStore() || buildDemo(nowISO());
    return mem;
  }
  api.currentState = current;
  function showError(code) {
    ui.error = code || "save";
    ui.notice = "";
    if (typeof render === "function") render();
  }
  function mirrorTasks(state) {
    if (typeof D !== "function" || typeof ld !== "function") return;
    var hotel = "";
    try { hotel = S.hotel; } catch (e) { return; }
    var d = D();
    d.reqs = d.reqs || [];
    d.opsExtra = d.opsExtra || [];
    (state.tasks || []).forEach(function (task) {
      if (task.hotel !== hotel) return;
      var text = langNow() === "es" ? task.textEs : task.textEn;
      var row = d.reqs.filter(function (item) { return item.meetingTaskId === task.id; })[0];
      if (!row) {
        row = {
          role: task.assigneeRole || "House Person",
          kind: "meeting_" + task.kind,
          text: text,
          textEn: task.textEn,
          textEs: task.textEs,
          by: "Meetings",
          who: task.assigneeName || "Unassigned",
          st: task.status || "Open",
          day: ld(),
          meetingTaskId: task.id,
          room: task.roomName,
          ex: !!task.example
        };
        d.reqs.unshift(row);
      } else {
        if (task.status) row.st = task.status;
        row.who = task.assigneeName || row.who;
        row.role = task.assigneeRole || row.role;
        row.textEn = task.textEn;
        row.textEs = task.textEs;
        row.text = text;
        row.kind = "meeting_" + task.kind;
        row.room = task.roomName;
      }
      var ops = opsRequest(task);
      ops.title = text;
      ops.ref = row;
      ops.source = "help";
      var listed = d.opsExtra.filter(function (item) { return item.meetingTaskId === task.id; })[0];
      if (!listed) d.opsExtra.unshift(ops);
      else {
        listed.kind = ops.kind;
        listed.dept = ops.dept;
        listed.room = ops.room;
        listed.title = text;
        listed.status = ops.status;
        listed.ref = row;
        listed.assigneeName = ops.assigneeName;
        listed.assigneeRole = ops.assigneeRole;
      }
      if (task.opsSent) return;
      task.opsSent = true;
      try {
        if (typeof useRemote === "function" && useRemote() && root.sb && !task.example) {
          root.sb.from("ops_requests").insert({
            hotel_id: task.hotel,
            kind: ops.kind,
            dept: ops.dept,
            room: String(task.roomName || ""),
            title: String(task.textEn || "").slice(0, 180),
            note: task.notes || null,
            status: "open",
            source_table: "meeting_tasks",
            source_id: String(task.id),
            author_label: "Meetings",
            example: false
          });
        }
      } catch (e2) {}
    });
  }
  function pullStatus(state) {
    if (typeof D !== "function") return;
    var hotel = "";
    try { hotel = S.hotel; } catch (e) { return; }
    var reqs = D().reqs || [];
    (state.tasks || []).forEach(function (task) {
      if (task.hotel !== hotel) return;
      var row = reqs.filter(function (item) { return item.meetingTaskId === task.id; })[0];
      if (row && row.st) task.status = row.st;
    });
  }
  function postAlerts(alerts) {
    if (typeof careAlert !== "function" || typeof S === "undefined" || !S) return;
    try { if (typeof ensureDemoAlerts === "function") ensureDemoAlerts(); } catch (e) {}
    alerts.forEach(function (alert) {
      if ((S.alerts || []).some(function (row) { return row && row.id === alert.id; })) return;
      var lang = langNow();
      careAlert(lang === "es" ? alert.titleEs : alert.titleEn, lang === "es" ? alert.bodyEs : alert.bodyEn, {
        id: alert.id,
        roles: alert.roles,
        hotel: alert.hotel,
        kind: alert.kind,
        titleEn: alert.titleEn,
        titleEs: alert.titleEs,
        bodyEn: alert.bodyEn,
        bodyEs: alert.bodyEs,
        meet: alert.bookingId
      });
    });
  }
  function localizeAlerts() {
    if (typeof S === "undefined" || !S || !Array.isArray(S.alerts)) return;
    var lang = langNow();
    S.alerts.forEach(function (alert) {
      if (!alert || !alert.titleEn) return;
      alert.title = lang === "es" ? alert.titleEs : alert.titleEn;
      alert.body = lang === "es" ? alert.bodyEs : alert.bodyEn;
    });
  }
  var sweeping = false;
  function applySweep() {
    if (sweeping) return;
    sweeping = true;
    try {
      localizeAlerts();
      var state = current();
      pullStatus(state);
      var result = sweep(state, nowISO(), rosterNow());
      mem = result.state;
      mirrorTasks(mem);
      if (result.alerts.length || result.tasks.length) {
        postAlerts(result.alerts);
        writeStore(mem);
        try { if (typeof save === "function") save(); } catch (e) {}
      }
      if (pendingMeet && typeof meUser === "function" && meUser() && canSeeCalendar(actorNow().role)) {
        var id = pendingMeet;
        pendingMeet = "";
        ui.screen = "beo";
        ui.bookingId = id;
        try {
          var url = new URL(location.href);
          url.searchParams.delete("meet");
          history.replaceState(null, "", url.pathname + url.search + url.hash);
        } catch (e2) {}
        setTimeout(function () { root.mtOpen(id); }, 0);
      }
      return result;
    } finally { sweeping = false; }
  }

  function pageHtml() {
    applySweep();
    var actor = actorNow();
    var hotel = actor.hotel || "MSPAM";
    if (!ui.date) ui.date = chicagoDate(nowISO());
    try { document.body.classList.toggle("mt-print", ui.screen === "print"); } catch (e) {}
    return renderPage(current(), {
      actor: actor,
      now: nowISO(),
      hotel: hotel,
      lang: langNow(),
      ui: ui,
      on: meetingsOn(hotel),
      roster: rosterNow()
    });
  }
  function homeCard() {
    applySweep();
    var actor = actorNow();
    var viewed = "";
    try { viewed = S.role || actor.role; } catch (e) { viewed = actor.role; }
    return renderHome(current(), {
      actor: { role: viewed, hotel: actor.hotel, id: actor.id },
      now: nowISO(),
      hotel: actor.hotel,
      lang: langNow(),
      on: meetingsOn(actor.hotel)
    });
  }

  root.mtBack = function () { ui.screen = "cal"; ui.error = ""; ui.draft = null; ui.notice = ""; if (typeof render === "function") render(); };
  root.mtView = function (view) { if (view === "day" || view === "week" || view === "month") ui.view = view; ui.screen = "cal"; if (typeof render === "function") render(); };
  root.mtRoom = function (id) { ui.roomId = id || ""; ui.screen = "cal"; if (typeof render === "function") render(); };
  root.mtShift = function (dir) {
    var view = ui.view || "day";
    var anchor = ui.date || chicagoDate(nowISO());
    if (view === "month") ui.date = addMonths(anchor, dir);
    else ui.date = addDays(anchor, dir * (view === "week" ? 7 : 1));
    if (typeof render === "function") render();
  };
  root.mtJump = function (date) { ui.date = date; ui.view = "day"; ui.screen = "cal"; if (typeof render === "function") render(); };
  root.mtOpen = function (id) {
    if (!/^[A-Za-z0-9_-]+$/.test(String(id))) return;
    ui.bookingId = id;
    ui.screen = "beo";
    ui.error = "";
    ui.draft = null;
    try { if (S.tab !== "meetings" && typeof go === "function") go("meetings"); else if (typeof render === "function") render(); } catch (e) { if (typeof render === "function") render(); }
  };
  root.mtEdit = function (id) { ui.bookingId = id || ""; ui.screen = "edit"; ui.error = ""; ui.draft = null; if (typeof render === "function") render(); };
  root.mtNew = function () {
    ui.bookingId = "";
    ui.screen = "edit";
    ui.error = "";
    ui.draft = null;
    if (typeof render === "function") render();
  };
  root.mtRooms = function () { ui.screen = "rooms"; ui.error = ""; if (typeof render === "function") render(); };
  root.mtEditRoom = function (id) { ui.screen = "rooms"; ui.roomEdit = id; if (typeof render === "function") render(); };
  root.mtPrint = function (id) { ui.bookingId = id; ui.screen = "print"; if (typeof render === "function") render(); };
  root.mtDoPrint = function () { try { window.print(); } catch (e) {} };
  root.mtCheck = function (id, key, on) {
    var res = setCheck(current(), id, key, on, actorNow());
    if (!res.ok) return showError(res.error);
    mem = res.state;
    writeStore(mem);
    if (typeof render === "function") render();
  };
  function val(id) { var el = document.getElementById(id); return el ? el.value : ""; }
  function checked(id) { var el = document.getElementById(id); return !!(el && el.checked); }
  root.mtSave = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    var previous = ui.bookingId ? (current().bookings || []).filter(function (row) { return row.id === ui.bookingId; })[0] : null;
    var input = {
      id: ui.bookingId || "",
      hotel: actor.hotel,
      groupName: val("mtGroup"),
      phone: val("mtPhone"),
      roomId: val("mtRoom"),
      date: val("mtDate"),
      start: val("mtStart"),
      end: val("mtEnd"),
      setupMin: val("mtSetupMin"),
      teardownMin: val("mtTearMin"),
      guaranteed: val("mtGtd"),
      expected: val("mtExp"),
      style: val("mtStyle"),
      status: val("mtStatus"),
      av: { projector: checked("mtProj"), screen: checked("mtScreen"), mic: checked("mtMic"), speaker: checked("mtSpeaker"), flipchart: checked("mtFlip"), wifi: val("mtWifi") },
      fb: { coffee: checked("mtCoffee"), breakfast: checked("mtBfast"), lunch: checked("mtLunch"), snacks: checked("mtSnacks"), dietary: val("mtDiet") },
      billing: document.getElementById("mtBill") ? val("mtBill") : (previous ? previous.billing : ""),
      notes: val("mtNotes"),
      cleanupAssigneeId: val("mtCleanWho"),
      setupEnabled: checked("mtSetupOn"),
      setupLeadMin: val("mtSetupLead"),
      setupAssigneeId: val("mtSetupWho")
    };
    var res = saveBooking(current(), input, actor, rosterNow());
    if (!res.ok) {
      ui.draft = readBooking(input, previous);
      ui.error = res.error;
      ui.conflicts = res.conflicts || [];
      ui.screen = "edit";
      if (typeof render === "function") render();
      return;
    }
    mem = res.state;
    writeStore(mem);
    ui.screen = "beo";
    ui.bookingId = res.booking.id;
    ui.error = "";
    ui.conflicts = [];
    ui.draft = null;
    ui.notice = "saved";
    applySweep();
    if (typeof render === "function") render();
  };
  root.mtSaveRoom = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var styles = [];
    document.querySelectorAll("input[name=mtRoomStyle]").forEach(function (box) { if (box.checked) styles.push(box.value); });
    var res = saveRoom(current(), {
      id: val("mtRoomId"),
      hotel: actorNow().hotel,
      name: val("mtRoomName"),
      capacity: val("mtRoomCap"),
      styles: styles,
      active: checked("mtRoomOn")
    }, actorNow());
    if (!res.ok) return showError(res.error === "role" ? "role" : res.error);
    mem = res.state;
    writeStore(mem);
    ui.notice = "room";
    ui.roomEdit = res.room.id;
    if (typeof render === "function") render();
  };
  root.mtSaveHour = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var res = saveSettings(current(), { hotel: actorNow().hotel, dayAlertHour: Math.round(Number(val("mtHour"))) }, actorNow());
    if (!res.ok) return showError(res.error);
    mem = res.state;
    writeStore(mem);
    ui.notice = "hour";
    if (typeof render === "function") render();
  };
  root.mtReset = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    mem = buildDemo(nowISO());
    ui.screen = "cal";
    ui.notice = "reset";
    ui.error = "";
    if (typeof render === "function") render();
  };

  if (typeof root.reqRow === "function") {
    var prevReqRow = root.reqRow;
    root.reqRow = function (row) {
      if (row && row.meetingTaskId) {
        var lang = langNow();
        var text = lang === "es" && row.textEs ? row.textEs : (row.textEn || row.text);
        var index = -1;
        try { index = D().reqs.indexOf(row); } catch (e) { index = -1; }
        var button = row.st === "Open"
          ? "<button type=\"button\" class=\"btn raw\" onclick=\"rSt(" + index + ",'Started')\">" + esc(t("Begin task", lang)) + "</button>"
          : row.st === "Started"
            ? "<button type=\"button\" class=\"btn raw\" onclick=\"rSt(" + index + ",'Done')\">" + esc(t("Finish task", lang)) + "</button>"
            : "<span class=\"good\">✓</span>";
        return "<div class=\"li mt-task\" data-kind=\"" + esc(row.kind || "") + "\"><span class=\"raw\" style=\"flex:1\"><b>" + esc(text) +
          "</b><br><small>" + esc(t("Meeting task", lang)) + "</small></span>" + button + "</div>";
      }
      return prevReqRow(row);
    };
  }

  if (typeof root.M !== "undefined") root.M.meetings = ["📅", "Meetings"];
  if (typeof M !== "undefined") M.meetings = ["📅", "Meetings"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Meetings = "Reuniones";
  if (typeof V !== "undefined") V.meetings = pageHtml;
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try { card = homeCard(); } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var hotel = "";
      var real = role;
      try { hotel = S.hotel; } catch (e) { hotel = ""; }
      try { real = authRole() || role; } catch (e2) { real = role; }
      var show = showTile(role, real, meetingsOn(hotel));
      if (!show) return list.filter(function (id) { return id !== "meetings"; });
      if (list.indexOf("meetings") < 0) list.splice(Math.min(1, list.length), 0, "meetings");
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined") RSEC[0][2].push("meetings"); } catch (e4) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("meetings") < 0) NOCOLS.push("meetings"); } catch (e5) {}
  try { if (typeof RQL !== "undefined") RQL.meetings = ["Meeting rooms", "Salas de reuniones"]; } catch (e6) {}

  var style = document.createElement("style");
  style.textContent = [
    ".mt-nav{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}",
    ".mt-nav button{flex:1 1 30%;min-height:44px}",
    ".mt-chips{display:flex;gap:8px;overflow-x:auto;margin:8px 0}",
    ".mt-chips button{flex:0 0 auto}",
    ".mt-field{display:flex;flex-direction:column;gap:4px;font-weight:700;margin:8px 0}",
    ".mt-field input,.mt-field select,.mt-field textarea{width:100%;font-weight:400}",
    ".mt-check{display:flex;align-items:center;gap:8px;min-height:44px;font-weight:600}",
    ".mt-ev{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;border:0;border-radius:10px;padding:8px;margin:6px 0;min-height:44px}",
    ".mt-ev small{display:block;font-weight:600}",
    ".mt-definite{background:#d4f5dc;color:#15642f}",
    ".mt-tentative{background:#fff3cd;color:#8a5a00}",
    ".mt-cancelled{background:#eee;color:#667;text-decoration:line-through}",
    ".mt-legend .mt-ev{display:inline-block;width:auto;margin:0 4px 0 0;padding:2px 8px}",
    ".mt-dot{display:inline-block;width:8px;height:8px;border-radius:8px;margin:1px}",
    ".mt-dot.mt-definite{background:#1a7f37}",
    ".mt-dot.mt-tentative{background:#f5a623}",
    ".mt-dot.mt-cancelled{background:#999}",
    ".mt-month{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}",
    ".mt-mday{min-height:44px;padding:4px;text-align:left;background:#fff;border:1px solid #e1e6ee}",
    ".mt-week{display:flex;flex-direction:column;gap:8px}",
    ".mt-sheet{background:#fff;border:1px solid #e1e6ee;border-radius:12px;padding:12px}",
    ".mt-k{display:grid;grid-template-columns:1fr;gap:4px}",
    ".mt-line{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:#f7f9fc;border:1px solid #e1e6ee;border-radius:10px;margin:6px 0;padding:8px}",
    "#mtConflict{background:#fde2e1;color:#7a1218;border-radius:8px;padding:8px;margin:8px 0}",
    "@media(min-width:700px){.mt-k{grid-template-columns:1fr 1fr}.mt-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}}",
    "@media print{header,nav,#toast,.noprint{display:none!important}body{background:#fff;padding:0}main{max-width:none}.mt-sheet{border:0;page-break-inside:avoid}.mt-k{grid-template-columns:1fr 1fr}}",
    "body.mt-print header,body.mt-print nav,body.mt-print #toast,body.mt-print .noprint{display:none!important}"
  ].join("");
  document.head.appendChild(style);
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })(featureSpec);
  setInterval(function () {
    try {
      var result = applySweep();
      if (result && (result.alerts.length || result.tasks.length) && typeof render === "function") render();
    } catch (e) {}
  }, 60000);
  try { if (typeof meUser === "function" && meUser() && typeof render === "function") render(); } catch (e7) {}
})(typeof window !== "undefined" ? window : globalThis);
