/* How-to guides for the staff rollout. English and Spanish.
   One guide per job family. The page follows the language toggle.
   Ask HotelHQ quotes these steps and does not add steps of its own.
   Screenshots and videos are demo-mode only. Example names, no live data. */
(function (root) {
  "use strict";

  var STOP = {
    a: 1, an: 1, the: 1, to: 1, how: 1, do: 1, i: 1, my: 1, me: 1, of: 1, in: 1, on: 1, for: 1, and: 1,
    is: 1, it: 1, can: 1, what: 1, where: 1, when: 1, why: 1, who: 1, with: 1, from: 1, this: 1, that: 1,
    please: 1, just: 1, now: 1, today: 1, really: 1, quick: 1, quickly: 1, show: 1, see: 1, want: 1,
    need: 1, help: 1, tell: 1, about: 1, does: 1, did: 1, you: 1, your: 1, we: 1, our: 1, at: 1, or: 1,
    are: 1, was: 1, be: 1, will: 1, should: 1, there: 1, much: 1, many: 1, has: 1, have: 1, had: 1,
    not: 1, no: 1, yes: 1, if: 1, so: 1, than: 1, then: 1, into: 1, over: 1, also: 1, too: 1, very: 1,
    el: 1, la: 1, los: 1, las: 1, un: 1, una: 1, de: 1, del: 1, que: 1, como: 1, yo: 1, mi: 1, mis: 1,
    en: 1, por: 1, para: 1, con: 1, se: 1, es: 1, al: 1, y: 1, o: 1, lo: 1, le: 1, les: 1, su: 1, sus: 1,
    quiero: 1, necesito: 1, puedo: 1, favor: 1, donde: 1, ver: 1, hacer: 1, hago: 1, tengo: 1, una: 1,
    hay: 1, esta: 1, este: 1, esto: 1, eso: 1, cual: 1, cuales: 1, porque: 1, cuando: 1
  };

  function step(en, es) { return { en: en, es: es }; }
  function shot(id) { return "assets/howto/" + id + "-"; }

  var GUIDES = [
    {
      id: "fd",
      roles: ["Front Desk"],
      title: { en: "Front Desk", es: "Recepción" },
      blurb: {
        en: "Shift notes, room status, guest requests, and messages that need a reply.",
        es: "Notas de turno, estado de cuartos, solicitudes de huéspedes y mensajes por responder."
      },
      video: { en: "assets/howto/fd-en.mp4", es: "assets/howto/fd-es.mp4" },
      sections: [
        {
          id: "fd-notes",
          title: { en: "Shift notes", es: "Notas de turno" },
          keys: "shift note notes handoff handover pass nota notas turno relevo entrega",
          steps: [
            step("Open Shift notes from the bottom bar.", "Abre Notas de turno en la barra de abajo."),
            step("Pick the shift: AM, PM, or Night Audit.", "Elige el turno: AM, PM o Auditoría nocturna."),
            step("Type the handoff for the next person. Names of example staff are fine in the demo. Do not put a card number, a full guest name, or a PIN.", "Escribe el relevo para quien sigue. En la demo bastan nombres de ejemplo. No pongas tarjeta, nombre completo del huésped ni un PIN."),
            step("Tap Post handoff. The note stays on the log for the next shift.", "Toca Publicar relevo. La nota queda en el registro para el siguiente turno.")
          ]
        },
        {
          id: "fd-rooms",
          title: { en: "Room status", es: "Estado de cuartos" },
          keys: "room rooms status board vacant occupied dirty ready ooo cuarto cuartos estado tablero vacio ocupado sucio listo fuera",
          steps: [
            step("Open Rooms. This is the room board for the hotel.", "Abre Cuartos. Es el tablero de la propiedad."),
            step("Tap a chip to filter: all rooms, dirty, in progress, cleaned, ready, reclean, or out of order.", "Toca una ficha para filtrar: todos, sucio, en progreso, limpio, listo, re-limpieza o fuera de servicio."),
            step("Each card shows the room number, the status, and who is assigned when someone is.", "Cada tarjeta muestra el número, el estado y quién lo tiene si ya está asignado."),
            step("You are looking. Housekeeping changes the clean status from My Rooms.", "Aquí solo miras. Ama de llaves cambia el estado de limpieza en Mis cuartos.")
          ]
        },
        {
          id: "fd-requests",
          title: { en: "Guest requests and complaints", es: "Solicitudes y quejas" },
          keys: "guest request requests complaint complaints log towels pillow solicitud solicitudes queja quejas huesped toallas almohada",
          steps: [
            step("Open Guest Requests from the bottom bar.", "Abre Solicitudes en la barra de abajo."),
            step("Choose Request or Complaint. A complaint also lands on the guest-issue log.", "Elige Solicitud o Queja. La queja también queda en el registro de quejas."),
            step("Enter the room number and the guest's last initial only. Pick a category and a priority.", "Escribe el número de cuarto y solo la inicial del apellido. Elige categoría y prioridad."),
            step("Write what they need, then tap Send. The open list shows what is still waiting.", "Escribe qué necesita y toca Enviar. La lista abierta muestra lo que sigue en espera.")
          ]
        },
        {
          id: "fd-chats",
          title: { en: "Messages that need a response", es: "Mensajes por responder" },
          keys: "message messages chat chats reply respond response responses waiting kipsu respuesta responder espera mensaje mensajes",
          steps: [
            step("Open Guest chats. The demo shows sample chats, not a live brand inbox.", "Abre Chats de huéspedes. La demo muestra chats de ejemplo, no una bandeja real de la marca."),
            step("Read Waiting. The oldest ones sit at the top.", "Lee En espera. Los más antiguos quedan arriba."),
            step("Reply in the brand tool you already use, then come back and tap Mark responded.", "Responde en la herramienta de la marca que ya usas y regresa a tocar Marcar respondido."),
            step("Responded chats leave the waiting list. If nothing is waiting, the page says so.", "Los chats respondidos salen de la espera. Si no hay nada, la página lo dice.")
          ]
        }
      ]
    },
    {
      id: "hk",
      roles: ["Housekeeper", "Laundry Attendant", "Housekeeping", "House Person"],
      title: { en: "Housekeeping", es: "Ama de llaves" },
      blurb: {
        en: "Room attendants and laundry. Sign in, rooms, status, a photo work order, points, and wash loads.",
        es: "Camaristas y lavandería. Entrada, cuartos, estado, orden con foto, puntos y cargas de lavado."
      },
      video: { en: "assets/howto/hk-en.mp4", es: "assets/howto/hk-es.mp4" },
      sections: [
        {
          id: "hk-pin",
          title: { en: "Sign in and set your PIN", es: "Entrar y crear tu PIN" },
          keys: "pin pins temporary temp sign signin login reset new clave temporal contrasena nueva ingreso entrar",
          steps: [
            step("On the sign-in screen, type the hotel (MSPWE for Golden Valley) and pick your name.", "En la entrada, escribe el hotel (MSPWE para Golden Valley) y elige tu nombre."),
            step("If your manager reset your PIN, enter the temporary PIN they showed you. It works once.", "Si tu gerente reinició tu PIN, escribe el PIN temporal que te mostró. Sirve una sola vez."),
            step("HotelHQ asks for a new 4 to 6 digit PIN. Easy ones such as 1234 are rejected.", "HotelHQ pide un PIN nuevo de 4 a 6 dígitos. Los fáciles, como 1234, se rechazan."),
            step("Type the same PIN again and tap Save. Next time, use the PIN you chose.", "Escribe el mismo PIN otra vez y toca Guardar. La próxima vez usa el PIN que elegiste.")
          ]
        },
        {
          id: "hk-rooms",
          title: { en: "See your assigned rooms", es: "Ver tus cuartos" },
          keys: "assigned assignment board my rooms room list asignado asignados tablero cuartos lista camarista",
          steps: [
            step("Open My Rooms from the bottom bar.", "Abre Mis cuartos en la barra de abajo."),
            step("You only see rooms with your name. Rush and priority rooms are marked.", "Solo ves los cuartos con tu nombre. Los urgentes y prioritarios van marcados."),
            step("The bar at the top shows how many you have finished.", "La barra de arriba muestra cuántos ya terminaste."),
            step("If the page says no rooms are assigned yet, ask the housekeeping lead to assign the board.", "Si dice que aún no hay cuartos, pide a la jefa de ama de llaves que asigne el tablero.")
          ]
        },
        {
          id: "hk-clean",
          title: { en: "Mark a room clean or set a status", es: "Marcar limpio o poner estado" },
          keys: "mark clean done start dnd refused status reclean marco limpio listo empezar rechazo estado relimpieza",
          steps: [
            step("On My Rooms, tap Start when you walk in. The room shows In progress.", "En Mis cuartos, toca Empezar al entrar. El cuarto pasa a En progreso."),
            step("When you finish, tap Done / Clean. It goes to Waiting for inspection.", "Al terminar, toca Listo / Limpio. Pasa a Esperando inspección."),
            step("If you cannot clean it, tap DND or Refused. That status is visible to the lead.", "Si no puedes limpiarlo, toca DND o Rechazado. La jefa ve ese estado."),
            step("A room sent back says Reclean and shows the note from inspection.", "Un cuarto devuelto dice Re-limpieza y muestra la nota de la inspección.")
          ]
        },
        {
          id: "hk-photo",
          title: { en: "Report a work order with a photo", es: "Reportar una orden con foto" },
          keys: "report photo leak plumbing problem toilet shower hvac picture foto reportar fuga plomeria problema inodoro regadera",
          steps: [
            step("On My Rooms, tap Report maintenance problem.", "En Mis cuartos, toca Reportar problema de mantenimiento."),
            step("Pick the room, then tap the problem (plumbing, toilet, AC, and the rest).", "Elige el cuarto y toca el problema (plomería, inodoro, aire y los demás)."),
            step("Add a photo. The send button stays off until the room, the problem, and the photo are all there.", "Agrega una foto. Enviar sigue apagado hasta que haya cuarto, problema y foto."),
            step("Tap Submit. Maintenance gets the order. You get points for an accepted photo report.", "Toca Enviar. Mantenimiento recibe la orden. Ganas puntos por un reporte con foto aceptado.")
          ]
        },
        {
          id: "hk-points",
          title: { en: "See your points", es: "Ver tus puntos" },
          keys: "points point score rewards earn redeem puntos premio premios ganar canjear",
          steps: [
            step("On My Rooms, the points line shows what you earned this month for photo reports.", "En Mis cuartos, la línea de puntos muestra lo que ganaste este mes por reportes con foto."),
            step("Open Points from More for the full screen: this week, this month, and how points are earned.", "Abre Puntos en Más para la pantalla completa: esta semana, este mes y cómo se ganan."),
            step("Rewards need GM approval. The demo does not send a real gift card.", "Los premios necesitan la aprobación del GM. La demo no envía una tarjeta real.")
          ]
        },
        {
          id: "hk-when",
          title: { en: "When you should be done", es: "A qué hora terminas" },
          keys: "expected finish finishby done out time projected termino termina prevista salida hora",
          steps: [
            step("On Home, read Expected done by. It is your projected finish for the rooms or the laundry hours still left.", "En Inicio, lee Termina a las. Es la hora prevista según los cuartos o las horas de lavandería que faltan."),
            step("Room attendants: it uses the rooms still open on your name, the minutes per room, and the break.", "Camaristas: usa los cuartos abiertos con tu nombre, los minutos por cuarto y el descanso."),
            step("Laundry: it uses the planned laundry hours for today.", "Lavandería: usa las horas de lavandería planeadas para hoy."),
            step("If the line says to set labor standards, the minutes are not in yet. Tell your manager.", "Si dice que definan los estándares de labor, aún no hay minutos. Avísale a tu gerente.")
          ]
        },
        {
          id: "hk-laundry",
          title: { en: "Laundry loads", es: "Cargas de lavandería" },
          keys: "laundry wash dry linen load loads towels sheets dryer lavanderia lavar secar ropa carga cargas toallas sabanas",
          steps: [
            step("Sign in with the laundry attendant name, then open Laundry on the bottom bar.", "Entra con el nombre de lavandería y abre Lavandería en la barra de abajo."),
            step("Pick the linen type and tap Start wash.", "Elige el tipo de ropa y toca Empezar lavado."),
            step("When it is ready, tap Start dry, then Finish.", "Cuando esté, toca Empezar secado y luego Terminar."),
            step("Low chemicals have a Request button. That request goes to the GM for approval.", "Los químicos bajos tienen un botón Pedir. Esa solicitud va al GM para aprobación.")
          ]
        }
      ]
    },
    {
      id: "mt",
      roles: ["Maintenance"],
      title: { en: "Maintenance", es: "Mantenimiento" },
      blurb: {
        en: "Work orders with photos, and today's preventive maintenance.",
        es: "Órdenes de trabajo con foto y el mantenimiento preventivo de hoy."
      },
      video: { en: "assets/howto/mt-en.mp4", es: "assets/howto/mt-es.mp4" },
      sections: [
        {
          id: "mt-orders",
          title: { en: "Work orders with photos", es: "Órdenes con foto" },
          keys: "work order orders wo ticket photo picture close status orden ordenes foto fotos ticket cerrar",
          steps: [
            step("Open Work Orders. Each open order shows the room, the problem, and the photo if one was sent with it.", "Abre Órdenes de trabajo. Cada orden abierta muestra el cuarto, el problema y la foto si la enviaron con ella."),
            step("Tap New request. Enter the room and what is wrong, then Send.", "Toca Nueva solicitud. Escribe el cuarto y qué falla, y luego Enviar."),
            step("The new order is added to the list. A photo from housekeeping stays on that order.", "La orden nueva entra a la lista. La foto de ama de llaves se queda en esa orden."),
            step("Set the status to In Progress while you work it, and Done when it is fixed.", "Pon el estado En progreso mientras trabajas y Listo cuando quede.")
          ]
        },
        {
          id: "mt-pm",
          title: { en: "Preventive maintenance", es: "Mantenimiento preventivo" },
          keys: "preventive pm pms checklist filter ptac guestroom quarter due preventivo mantenimiento lista filtro trimestre vence",
          steps: [
            step("Open PMs. The top card is the quarter pacing for guestroom PMs.", "Abre PMs. La tarjeta de arriba es el ritmo del trimestre para los PM de cuartos."),
            step("Today's auto-assigned room PMs are listed with a name. Vacant clean rooms are picked first.", "Los PM de cuarto asignados hoy traen un nombre. Primero van los cuartos vacíos y limpios."),
            step("Tap PM 582 on a room to open the guestroom checklist. Check the items you completed.", "Toca PM 582 en un cuarto para abrir la lista. Marca lo que ya hiciste."),
            step("Tap Mark room PM complete when that room is done. Equipment PMs below are checked the same way.", "Toca Marcar PM del cuarto completo cuando termines. Los PM de equipo, más abajo, se marcan igual.")
          ]
        }
      ]
    },
    {
      id: "gm",
      roles: ["GM", "AGM", "Above Property"],
      title: { en: "GM and AGM", es: "GM y AGM" },
      blurb: {
        en: "Dashboard, daily briefing, who should be done, and approvals. AGM uses the same screens.",
        es: "Tablero, resumen del día, a qué hora termina el equipo y aprobaciones. El AGM usa las mismas pantallas."
      },
      video: { en: "assets/howto/gm-en.mp4", es: "assets/howto/gm-es.mp4" },
      sections: [
        {
          id: "gm-dash",
          title: { en: "Dashboard", es: "Tablero" },
          keys: "dashboard home occupancy labor glance score rooms panel tablero inicio ocupacion labor calificacion",
          steps: [
            step("Home is the dashboard. It opens on your hotel.", "Inicio es el tablero. Abre en tu hotel."),
            step("Read occupancy, arrivals, room counts, open work orders, and labor.", "Lee ocupación, llegadas, conteo de cuartos, órdenes abiertas y labor."),
            step("Tiles that say no data yet are waiting on a feed. The demo does not invent a number.", "Las fichas que dicen que aún no hay datos esperan una fuente. La demo no inventa un número."),
            step("Tap a tile to open that screen. Search is on the home page if you need a room number.", "Toca una ficha para abrir esa pantalla. La búsqueda está en inicio si necesitas un número de cuarto.")
          ]
        },
        {
          id: "gm-brief",
          title: { en: "Daily briefing", es: "Resumen diario" },
          keys: "briefing brief huddle daily morning resumen informe junta manana",
          steps: [
            step("Open More, then Daily Briefing.", "Abre Más y luego Resumen diario."),
            step("The page is today's huddle: arrivals, departures, VIPs, out-of-order rooms, open guest issues, rush rooms, and PMs due.", "La página es la junta de hoy: llegadas, salidas, VIPs, cuartos fuera de servicio, quejas abiertas, cuartos urgentes y PM pendientes."),
            step("GM and AGM can edit the manual lines (groups, events, the GM note). Tap Edit manual fields, then save.", "GM y AGM pueden editar las líneas manuales (grupos, eventos, la nota del GM). Toca Editar campos manuales y guarda."),
            step("The numbers come from the demo hotel. They are examples until live data is connected.", "Los números salen del hotel de la demo. Son ejemplos hasta conectar los datos en vivo.")
          ]
        },
        {
          id: "gm-done",
          title: { en: "Team expected done-by", es: "Hora prevista del equipo" },
          keys: "expected finish team attendant attendants laundry behind schedule prevista equipo camarista camaristas lavanderia atraso",
          steps: [
            step("On Home, scroll to Expected done by. It lists room attendants and laundry at this hotel.", "En Inicio, baja hasta Hora prevista. Lista a las camaristas y a lavandería de este hotel."),
            step("Each row is a name, the projected finish, the scheduled end, and a flag.", "Cada fila es un nombre, la hora prevista, el fin programado y una marca."),
            step("On time is green. Running behind is amber or red when the projection passes the end of the shift.", "A tiempo va en verde. Atrasado va en ámbar o rojo cuando la previsión pasa el fin del turno."),
            step("A blank time means the labor standard or the shift start is missing. Set labor standards before you rely on it.", "Una hora en blanco significa que falta el estándar de labor o la hora de entrada. Define los estándares antes de usarla.")
          ]
        },
        {
          id: "gm-approve",
          title: { en: "Approvals", es: "Aprobaciones" },
          keys: "approve approval order ordering supplies inventory pending reward rewards aprobar aprobacion pedido suministros inventario pendiente premio",
          steps: [
            step("Open Ordering from More. Requests waiting on you say Pending GM approval.", "Abre Pedidos en Más. Las solicitudes que te esperan dicen Pendiente de aprobación del GM."),
            step("Read the items, then tap Approve. The status changes to Approved.", "Lee los artículos y toca Aprobar. El estado pasa a Aprobado."),
            step("If nothing is waiting, open Inventory, then Ordering, and submit the low-stock request so you can see the queue.", "Si no hay nada en espera, abre Inventario, luego Pedidos, y envía la solicitud de bajo stock para ver la fila."),
            step("Point rewards also say Needs GM approval. Approving an order here does not send a gift card.", "Los premios de puntos también dicen que requieren aprobación del GM. Aprobar un pedido aquí no envía una tarjeta de regalo.")
          ]
        }
      ]
    }
  ];

  var BY_ID = {};
  GUIDES.forEach(function (guide) {
    BY_ID[guide.id] = guide;
    guide.sections.forEach(function (section) {
      section.keyList = tokens(section.keys);
      section.shot = shot(section.id);
    });
  });

  function tokens(value) {
    var raw = String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var parts = raw.split(/[^a-z0-9]+/);
    var out = [];
    parts.forEach(function (word) {
      if (!word || word.length < 2 || STOP[word]) return;
      out.push(word);
    });
    return out;
  }
  function pick(pair, lang) {
    if (!pair) return "";
    return lang === "es" ? pair.es : pair.en;
  }
  function guideForRole(role) {
    var found = "fd";
    GUIDES.forEach(function (guide) {
      if (guide.roles.indexOf(role) >= 0) found = guide.id;
    });
    return found;
  }
  function sectionById(id) {
    var found = null;
    GUIDES.forEach(function (guide) {
      guide.sections.forEach(function (section) {
        if (section.id === id) found = { guide: guide, section: section };
      });
    });
    return found;
  }
  function search(question, lang, role) {
    lang = lang === "es" ? "es" : "en";
    var words = tokens(question);
    var best = null;
    if (!words.length) return { known: false, lang: lang };
    GUIDES.forEach(function (guide) {
      var roleHit = guide.roles.indexOf(role) >= 0;
      guide.sections.forEach(function (section) {
        var score = 0;
        var hits = 0;
        words.forEach(function (word) {
          if (section.keyList.indexOf(word) >= 0) {
            score += 4;
            hits += 1;
          } else score -= 2;
        });
        var row = { score: score, hits: hits, roleHit: roleHit, guide: guide, section: section };
        if (!best || row.score > best.score || (row.score === best.score && row.roleHit && !best.roleHit)) best = row;
      });
    });
    if (!best || best.hits < 1 || best.score < 4) return { known: false, lang: lang };
    return {
      known: true,
      lang: lang,
      guideId: best.guide.id,
      sectionId: best.section.id,
      guideTitle: pick(best.guide.title, lang),
      sectionTitle: pick(best.section.title, lang),
      steps: best.section.steps.map(function (row) { return pick(row, lang); })
    };
  }
  function unknownText(lang) {
    return lang === "es"
      ? "No encuentro eso en las guías de HotelHQ."
      : "I don't see that in the HotelHQ how-to guides.";
  }
  function answer(question, lang, role) {
    var hit = search(question, lang, role);
    if (!hit.known) {
      return { known: false, lang: hit.lang, text: unknownText(hit.lang), guideId: "", sectionId: "", guideTitle: "", sectionTitle: "", steps: [] };
    }
    return {
      known: true,
      lang: hit.lang,
      text: hit.steps.join("\n"),
      guideId: hit.guideId,
      sectionId: hit.sectionId,
      guideTitle: hit.guideTitle,
      sectionTitle: hit.sectionTitle,
      steps: hit.steps.slice()
    };
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function roleNow() {
    try {
      if (typeof authRole === "function") {
        var auth = authRole();
        if (auth) return auth;
      }
    } catch (e) {}
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return (me && me.role) || "";
    } catch (e2) { return ""; }
  }
  function page(state) {
    state = state || {};
    var lang = state.lang === "es" ? "es" : "en";
    var current = BY_ID[state.guideId] ? state.guideId : guideForRole(state.role);
    var guide = BY_ID[current];
    var focus = state.sectionId || "";
    var tabs = GUIDES.map(function (item) {
      var on = item.id === current;
      return '<button type="button" class="howto-tab' + (on ? " on" : "") + '" aria-pressed="' + (on ? "true" : "false") + '" onclick="HHQHowTo.open(\'' + item.id + '\')">' + esc(pick(item.title, lang)) + "</button>";
    }).join("");
    var video = guide.video[lang];
    var sections = guide.sections.map(function (section, index) {
      var src = section.shot + lang + ".png";
      var steps = section.steps.map(function (row) {
        return "<li>" + esc(pick(row, lang)) + "</li>";
      }).join("");
      return '<article class="howto-sec' + (focus === section.id ? " on" : "") + '" id="howto-' + section.id + '"><h3>' + (index + 1) + ". " + esc(pick(section.title, lang)) + '</h3><img class="howto-shot" src="' + esc(src) + '" alt="' + esc(pick(section.title, lang)) + '" onerror="this.hidden=true"><ol>' + steps + "</ol></article>";
    }).join("");
    var demo = lang === "es"
      ? "Grabado en el modo demo. Solo nombres de ejemplo. No hay personal, huéspedes ni datos reales del hotel."
      : "Recorded in demo mode. Example names only. No real staff, guests, or hotel data.";
    var tour = lang === "es" ? "Repetir el recorrido" : "Replay the tour";
    return '<div class="howto" id="howtoRoot"><h2>' + esc(lang === "es" ? "Guías" : "How-to") + "</h2>" +
      '<p class="howto-demo"><span class="ex">' + esc(lang === "es" ? "EJEMPLO" : "EXAMPLE") + "</span> " + esc(demo) + "</p>" +
      '<div class="howto-tabs" role="tablist">' + tabs + "</div>" +
      "<h3>" + esc(pick(guide.title, lang)) + "</h3><p>" + esc(pick(guide.blurb, lang)) + "</p>" +
      '<video class="howto-vid" controls playsinline preload="metadata" src="' + esc(video) + '"></video>' +
      sections +
      '<button type="button" class="btn2 howto-tour" onclick="if(window.uxTour)uxTour(1)">' + esc(tour) + "</button></div>";
  }

  var api = {
    GUIDES: GUIDES,
    tokens: tokens,
    search: search,
    answer: answer,
    unknownText: unknownText,
    guideForRole: guideForRole,
    sectionById: sectionById,
    page: page
  };
  root.HHQHowTo = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  if (typeof M !== "undefined") M.howto = ["📘", "How-to"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es["How-to"] = "Guías";
  if (typeof TILES !== "undefined") {
    Object.keys(TILES).forEach(function (role) {
      if (TILES[role].indexOf("howto") < 0) TILES[role].push("howto");
    });
  }
  if (typeof ROLES !== "undefined") {
    ROLES.forEach(function (role) {
      TILES[role] = TILES[role] || [];
      if (TILES[role].indexOf("howto") < 0) TILES[role].push("howto");
    });
  }
  if (typeof V !== "undefined") {
    V.howto = function () {
      var guideId = "";
      var sectionId = "";
      try { guideId = S.howto || ""; sectionId = S.howtoSec || ""; } catch (e) {}
      return page({ lang: langNow(), role: roleNow(), guideId: guideId, sectionId: sectionId });
    };
  }
  root.HHQHowTo.open = function (guideId, sectionId) {
    try {
      S.howto = guideId || guideForRole(roleNow());
      S.howtoSec = sectionId || "";
    } catch (e) {}
    try { if (root.HHQAsk && HHQAsk.close) HHQAsk.close(); } catch (e2) {}
    try { if (root.uxClose) root.uxClose(); } catch (e3) {}
    if (typeof go === "function") go("howto");
    if (sectionId) {
      setTimeout(function () {
        var el = document.getElementById("howto-" + sectionId);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: "start" });
      }, 60);
    }
  };
  var css = document.createElement("style");
  css.textContent = [
    ".howto-demo{color:#3c4658}",
    ".howto-tabs{display:flex;gap:8px;overflow:auto;margin:8px 0 12px;padding-bottom:4px}",
    ".howto-tab{flex:0 0 auto;border:1px solid #d5deea;background:#fff;border-radius:999px;padding:8px 14px;font-weight:750}",
    ".howto-tab.on{background:#14365d;color:#fff;border-color:#14365d}",
    ".howto-vid{width:100%;max-height:70vh;background:#10233f;border-radius:14px;margin:8px 0 12px}",
    ".howto-sec{background:#fff;border:1px solid #e6e8ee;border-radius:14px;padding:12px;margin:0 0 12px}",
    ".howto-sec.on{border-color:#14365d;box-shadow:0 0 0 2px #14365d22}",
    ".howto-sec h3{margin:0 0 8px}",
    ".howto-shot{width:100%;border-radius:12px;border:1px solid #e6e8ee;margin:0 0 8px;background:#f4f6f8}",
    ".howto-sec ol{margin:0;padding-left:20px}",
    ".howto-sec li{margin:0 0 8px}",
    ".howto-tour{width:100%;margin-top:4px}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
