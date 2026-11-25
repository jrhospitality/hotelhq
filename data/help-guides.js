/* Role how-to guides for the MSPWE staff rollout.
   Ask HotelHQ may quote these steps and nothing else.
   Demo recordings use example names only. Do not put PINs, guest names, or keys in this file. */
(function (root) {
  "use strict";

  var UNKNOWN = {
    en: "I don't know, ask your GM",
    es: "No lo sé, pregunta a tu GM"
  };

  var SIGN_IN = {
    id: "sign-in",
    title: { en: "Sign in and set your PIN", es: "Entrar y crear tu PIN" },
    keywords: [
      "sign in", "signin", "log in", "login", "temporary pin", "temp pin", "set a pin", "new pin", "set pin",
      "entrar", "entrada", "pin temporal", "pin nuevo", "crear pin", "cambiar pin", "clave", "clave temporal",
      "locked", "bloqueado", "too many", "demasiados", "sign out", "salir"
    ],
    steps: [
      {
        en: "Open HotelHQ. Tap English or Español. HotelHQ keeps that choice on this phone.",
        es: "Abre HotelHQ. Toca English o Español. HotelHQ guarda esa elección en este teléfono.",
        shot: { en: "help/shots/sign-in-en.png", es: "help/shots/sign-in-es.png" }
      },
      {
        en: "Under 1. Hotel, type MSPWE and tap Holiday Inn Express Golden Valley.",
        es: "En 1. Hotel, escribe MSPWE y toca Holiday Inn Express Golden Valley.",
        shot: { en: "help/shots/sign-in-en.png", es: "help/shots/sign-in-es.png" }
      },
      {
        en: "Under 2. Your name, tap your name. Demo names are examples. On the live site the list is your hotel's staff.",
        es: "En 2. Tu nombre, toca tu nombre. Los nombres del demo son ejemplos. En el sitio real la lista es el personal de tu hotel.",
        shot: { en: "help/shots/sign-in-en.png", es: "help/shots/sign-in-es.png" }
      },
      {
        en: "Under 3. PIN, tap each digit of the temporary PIN your GM gave you. Dots fill in. Leave Show PIN off on a shared phone. Tap Sign in.",
        es: "En 3. PIN, toca cada dígito del PIN temporal que te dio tu gerente. Aparecen puntos. No toques Ver PIN en un teléfono compartido. Toca Entrar.",
        shot: { en: "help/shots/sign-in-en.png", es: "help/shots/sign-in-es.png" }
      },
      {
        en: "When the PIN is temporary, HotelHQ opens Set a new PIN. Tap a new 4 to 6 digit PIN that is not easy to guess, then tap Save. Tap the same PIN again and tap Save. Easy sequences are rejected.",
        es: "Si el PIN es temporal, HotelHQ abre Elige un PIN nuevo. Toca un PIN nuevo de 4 a 6 dígitos que no sea fácil de adivinar y toca Guardar. Toca el mismo PIN otra vez y toca Guardar. Las secuencias fáciles no sirven.",
        shot: { en: "help/shots/set-pin-en.png", es: "help/shots/set-pin-es.png" }
      },
      {
        en: "You land on Home. Your hotel and name are on the top bar. Tap that bar, then Sign out, when you finish on a shared phone.",
        es: "Llegas a Inicio. Tu hotel y tu nombre están en la barra de arriba. Toca esa barra y luego Salir cuando termines en un teléfono compartido.",
        shot: { en: "help/shots/set-pin-en.png", es: "help/shots/set-pin-es.png" }
      },
      {
        en: "If the PIN does not match, check the hotel and the name, then try again. Five misses locks sign-in for 15 minutes. Ask your GM to reset the PIN.",
        es: "Si el PIN no coincide, revisa el hotel y el nombre, e intenta otra vez. Cinco fallos bloquean la entrada por 15 minutos. Pide a tu gerente que reinicie el PIN.",
        shot: { en: "help/shots/sign-in-en.png", es: "help/shots/sign-in-es.png" }
      }
    ]
  };

  function step(en, es, shotEn, shotEs) {
    return { en: en, es: es, shot: { en: shotEn, es: shotEs || shotEn } };
  }

  var GUIDES = [
    {
      id: "front-desk",
      roles: ["Front Desk"],
      title: { en: "Front Desk", es: "Recepción" },
      blurb: {
        en: "Sign in, Home, shift notes, guest chats that need a response, and guest requests.",
        es: "Entrada, Inicio, notas de turno, chats que necesitan respuesta y solicitudes de huéspedes."
      },
      video: { en: "help/videos/front-desk-en.mp4", es: "help/videos/front-desk-es.mp4" },
      sections: [
        SIGN_IN,
        {
          id: "home",
          title: { en: "Home screen", es: "Pantalla de inicio" },
          keywords: ["home screen", "home", "inicio", "pantalla de inicio", "search", "buscar", "front desk home", "recepcion"],
          steps: [
            step("Home greets you by name. The search bar finds rooms, tasks, and screens.", "Inicio te saluda por tu nombre. La barra de búsqueda encuentra cuartos, tareas y pantallas.", "help/shots/front-desk-home-en.png", "help/shots/front-desk-home-es.png"),
            step("The first big button is Log guest request. Under it are work order, room status, and shift notes.", "El primer botón grande es Registrar solicitud. Debajo están la orden de trabajo, el estado de cuartos y las notas de turno.", "help/shots/front-desk-home-en.png", "help/shots/front-desk-home-es.png"),
            step("The bottom bar is Home, Guest requests, Rooms, Shift Notes, and More. More holds the rest.", "La barra de abajo es Inicio, Solicitudes, Cuartos, Notas y Más. Más tiene el resto.", "help/shots/front-desk-home-en.png", "help/shots/front-desk-home-es.png"),
            step("A red guest-chat button on Home means chats are waiting. Tap it. That is the messages-needing-response list.", "Un botón rojo de chats en Inicio significa que hay chats en espera. Tócalo. Esa es la lista de mensajes que necesitan respuesta.", "help/shots/front-desk-home-en.png", "help/shots/front-desk-home-es.png")
          ]
        },
        {
          id: "shift-notes",
          title: { en: "Shift notes", es: "Notas de turno" },
          keywords: ["shift notes", "shift note", "handoff", "pass on", "notas de turno", "nota de turno", "pase", "relevo"],
          steps: [
            step("Tap Shift Notes on the bottom bar.", "Toca Notas en la barra de abajo.", "help/shots/front-desk-notes-en.png", "help/shots/front-desk-notes-es.png"),
            step("Choose AM, PM, or Night Audit.", "Elige AM, PM o Auditoría nocturna.", "help/shots/front-desk-notes-en.png", "help/shots/front-desk-notes-es.png"),
            step("Type the handoff for the next shift. Room numbers are fine. Do not type a full guest name, a card number, or a key code.", "Escribe el pase para el siguiente turno. El número de cuarto está bien. No escribas el nombre completo del huésped, un número de tarjeta ni un código de llave.", "help/shots/front-desk-notes-en.png", "help/shots/front-desk-notes-es.png"),
            step("Tap Post handoff. The note appears in the log with your name and the time.", "Toca Publicar pase. La nota queda en el registro con tu nombre y la hora.", "help/shots/front-desk-notes-en.png", "help/shots/front-desk-notes-es.png"),
            step("Read the log at the start of your shift so you see what the last shift left you.", "Lee el registro al empezar tu turno para ver lo que dejó el turno anterior.", "help/shots/front-desk-notes-en.png", "help/shots/front-desk-notes-es.png")
          ]
        },
        {
          id: "guest-chats",
          title: { en: "Messages that need a response", es: "Mensajes que necesitan respuesta" },
          keywords: ["guest chat", "guest chats", "message", "messages", "needs a response", "need a response", "mark responded", "kipsu", "chat de huesped", "chats", "mensaje", "mensajes", "necesita respuesta", "necesitan respuesta", "marcar respondido"],
          steps: [
            step("On Home, tap the button that says a guest chat needs a response. The oldest wait is on that button.", "En Inicio, toca el botón que dice que un chat de huésped necesita respuesta. El botón muestra cuánto lleva el más antiguo.", "help/shots/front-desk-chats-en.png", "help/shots/front-desk-chats-es.png"),
            step("Guest chats opens on the Waiting list. The oldest chat is first. Demo rows say EXAMPLE and are not real guests.", "Chats de huéspedes abre la lista En espera. El chat más antiguo va primero. Las filas del demo dicen EJEMPLO y no son huéspedes reales.", "help/shots/front-desk-chats-en.png", "help/shots/front-desk-chats-es.png"),
            step("Read the room and the short preview. Reply to the guest in the brand chat tool you already use.", "Lee el cuarto y el texto corto. Responde al huésped en la herramienta de chat de la marca que ya usas.", "help/shots/front-desk-chats-en.png", "help/shots/front-desk-chats-es.png"),
            step("Back in HotelHQ, tap Mark responded. The chat moves to Responded and the Home count drops.", "De vuelta en HotelHQ, toca Marcar respondido. El chat pasa a Respondidos y baja el conteo de Inicio.", "help/shots/front-desk-chats-en.png", "help/shots/front-desk-chats-es.png"),
            step("If nothing is waiting, the page says no guest chats are waiting.", "Si no hay nada en espera, la página dice que no hay chats de huéspedes en espera.", "help/shots/front-desk-chats-en.png", "help/shots/front-desk-chats-es.png")
          ]
        },
        {
          id: "guest-requests",
          title: { en: "Guest requests", es: "Solicitudes de huéspedes" },
          keywords: ["guest request", "guest requests", "log a request", "solicitud", "solicitudes", "queja", "complaint", "send request"],
          steps: [
            step("Tap Guest Requests on the bottom bar, or Log guest request on Home.", "Toca Solicitudes en la barra de abajo, o Registrar solicitud en Inicio.", "help/shots/front-desk-requests-en.png", "help/shots/front-desk-requests-es.png"),
            step("Enter the room number and the guest's last initial only. Do not type the full name.", "Escribe el número de cuarto y solo la inicial del apellido. No escribas el nombre completo.", "help/shots/front-desk-requests-en.png", "help/shots/front-desk-requests-es.png"),
            step("Type what the guest needs, then tap Send. The request goes to the department that does the work.", "Escribe lo que el huésped necesita y toca Enviar. La solicitud va al departamento que hace el trabajo.", "help/shots/front-desk-requests-en.png", "help/shots/front-desk-requests-es.png"),
            step("Open items stay on the list. A banner means one is past the response time. Tap Resolve when the work is done and you have followed up.", "Lo abierto se queda en la lista. Un aviso significa que ya pasó el tiempo de respuesta. Toca Resolver cuando el trabajo esté hecho y hayas dado seguimiento.", "help/shots/front-desk-requests-en.png", "help/shots/front-desk-requests-es.png")
          ]
        }
      ]
    },
    {
      id: "housekeeping",
      roles: ["Housekeeper", "Housekeeping", "Laundry Attendant"],
      title: { en: "Housekeeping", es: "Ama de llaves" },
      blurb: {
        en: "Room attendants, the housekeeping lead, and laundry. My Rooms, mark clean, expected done-by, and points.",
        es: "Camaristas, la líder de ama de llaves y lavandería. Mis cuartos, marcar limpio, hora prevista y puntos."
      },
      video: { en: "help/videos/housekeeping-en.mp4", es: "help/videos/housekeeping-es.mp4" },
      sections: [
        SIGN_IN,
        {
          id: "attendant-home",
          title: { en: "Room attendant Home", es: "Inicio de la camarista" },
          keywords: ["room attendant", "housekeeper home", "camarista", "inicio camarista", "my home", "expected done", "done by", "hora prevista", "out time", "hora de salida"],
          steps: [
            step("Sign in as the room attendant. Home shows your name and your rooms for today.", "Entra como camarista. Inicio muestra tu nombre y tus cuartos de hoy.", "help/shots/hk-home-en.png", "help/shots/hk-home-es.png"),
            step("The big time is your estimated out time. Under it, Expected done by is the same finish time for the rooms you still have.", "La hora grande es tu hora de salida estimada. Debajo, Expected done by (Hora prevista) es la misma hora de término para los cuartos que te faltan.", "help/shots/hk-home-en.png", "help/shots/hk-home-es.png"),
            step("On track means you are inside the shift. Running behind, or Past scheduled end, means the remaining rooms push you past the scheduled end. Tell your lead if you are behind.", "A tiempo significa que vas dentro del turno. Running behind o Después del fin de turno significa que los cuartos que faltan te pasan de la hora programada. Avisa a tu líder si vas atrasada.", "help/shots/hk-home-en.png", "help/shots/hk-home-es.png"),
            step("Your points this month are on Home. The line under the out time shows the bonus points if you beat that time with every assigned room done.", "Tus puntos de este mes están en Inicio. La línea bajo la hora de salida muestra los puntos de bono si superas esa hora con todo tu trabajo terminado.", "help/shots/hk-home-en.png", "help/shots/hk-home-es.png"),
            step("The bottom bar is Home, My Rooms, Checklists, Schedule, and More.", "La barra de abajo es Inicio, Mis cuartos, Listas, Horario y Más.", "help/shots/hk-home-en.png", "help/shots/hk-home-es.png")
          ]
        },
        {
          id: "my-rooms",
          title: { en: "My Rooms and mark clean", es: "Mis cuartos y marcar limpio" },
          keywords: ["my rooms", "mis cuartos", "mark clean", "marcar limpio", "done / clean", "listo / limpio", "start room", "empezar cuarto", "dirty room", "cuarto sucio"],
          steps: [
            step("Tap My Rooms. Rush rooms are first. Each card shows the room number and Dirty, In progress, or Waiting for inspection.", "Toca Mis cuartos. Los urgentes van primero. Cada tarjeta muestra el número y Sucio, En proceso o Espera inspección.", "help/shots/hk-rooms-en.png", "help/shots/hk-rooms-es.png"),
            step("Tap Start when you begin the room. The card changes to In progress.", "Toca Empezar cuando empiezas el cuarto. La tarjeta pasa a En proceso.", "help/shots/hk-rooms-en.png", "help/shots/hk-rooms-es.png"),
            step("When the room is clean, tap Done / Clean. HotelHQ marks it cleaned and waiting for inspection. You do not inspect your own room.", "Cuando el cuarto está limpio, toca Listo / Limpio. HotelHQ lo marca limpio y en espera de inspección. Tú no inspeccionas tu propio cuarto.", "help/shots/hk-clean-en.png", "help/shots/hk-clean-es.png"),
            step("DND and Refused are for rooms you could not service. Your lead sees those on Escalations.", "No molestar y Rechazó servicio son para cuartos que no pudiste atender. Tu líder los ve en Alertas.", "help/shots/hk-rooms-en.png", "help/shots/hk-rooms-es.png"),
            step("The Done count at the top of My Rooms is how many of your rooms are finished.", "El conteo de Listo arriba de Mis cuartos es cuántos de tus cuartos ya terminaste.", "help/shots/hk-clean-en.png", "help/shots/hk-clean-es.png")
          ]
        },
        {
          id: "points",
          title: { en: "Points", es: "Puntos" },
          keywords: ["points", "puntos", "bonus", "bono", "out-time bonus", "puntos de bono", "your points this month", "tus puntos"],
          steps: [
            step("On My Rooms, Points shows your points this month.", "En Mis cuartos, Puntos muestra tus puntos de este mes.", "help/shots/hk-points-en.png", "help/shots/hk-points-es.png"),
            step("Report maintenance problem, with a photo, adds points when the report is accepted. Photo is required.", "Reportar problema de mantenimiento, con foto, suma puntos cuando aceptan el reporte. La foto es obligatoria.", "help/shots/hk-points-en.png", "help/shots/hk-points-es.png"),
            step("Out-time bonus points are awarded only if all of your assigned work is done, no room failed inspection, and you clock out by the estimated out time.", "Los puntos por salir a tiempo se dan solo si todo tu trabajo asignado está hecho, ningún cuarto falló la inspección y marcas salida a la hora estimada o antes.", "help/shots/hk-home-en.png", "help/shots/hk-home-es.png"),
            step("The GM sets the bonus amounts. You see the points on your Home card. You do not type the points yourself.", "El gerente define los montos del bono. Tú ves los puntos en tu tarjeta de Inicio. Tú no escribes los puntos.", "help/shots/hk-points-en.png", "help/shots/hk-points-es.png")
          ]
        },
        {
          id: "exec",
          title: { en: "Housekeeping lead", es: "Líder de ama de llaves" },
          keywords: ["exec housekeeper", "executive housekeeper", "housekeeping lead", "hk lead", "lider", "ama de llaves", "room board", "tablero", "inspect", "inspeccionar", "assign", "asignar", "expected done team"],
          steps: [
            step("Sign in as the housekeeping lead. Home shows Expected done by for each room attendant and for laundry.", "Entra como líder de ama de llaves. Inicio muestra la hora prevista de cada camarista y de lavandería.", "help/shots/hk-lead-en.png", "help/shots/hk-lead-es.png"),
            step("HK Lead today shows dirty rooms, rooms ready to inspect, escalations, and who is unassigned.", "Líder HK hoy muestra cuartos sucios, cuartos listos para inspeccionar, alertas y quién no está en turno.", "help/shots/hk-lead-en.png", "help/shots/hk-lead-es.png"),
            step("Tap Rooms for the room board. Assign attendants, or tap Auto-assign dirty rooms to on-shift housekeepers.", "Toca Cuartos para el tablero. Asigna camaristas, o toca Asignar cuartos sucios a camaristas en turno.", "help/shots/hk-board-en.png", "help/shots/hk-board-es.png"),
            step("Tap Inspect. Open a room that is waiting. Check each item. Tap Pass, or type a note and tap Fail to send it back as Reclean. Do not pass a room you cleaned yourself.", "Toca Inspección. Abre un cuarto que está en espera. Marca cada punto. Toca Pasa, o escribe una nota y toca No pasa para regresarlo a limpiar de nuevo. No apruebes un cuarto que tú limpiaste.", "help/shots/hk-board-en.png", "help/shots/hk-board-es.png")
          ]
        },
        {
          id: "laundry",
          title: { en: "Laundry", es: "Lavandería" },
          keywords: ["laundry", "lavanderia", "loads", "cargas", "linen", "blancos", "start wash", "empezar lavado", "laundry attendant"],
          steps: [
            step("Sign in as the laundry attendant. Home shows Expected done by from today's planned laundry hours, and your estimated out time.", "Entra como lavandería. Inicio muestra la hora prevista según las horas de lavandería del día, y tu hora de salida estimada.", "help/shots/hk-laundry-en.png", "help/shots/hk-laundry-es.png"),
            step("Tap Laundry on the bottom bar. Under Loads log, choose the linen type and tap Start wash. Then tap Start dry, then Finish.", "Toca Lavandería en la barra de abajo. En Registro de cargas, elige el tipo de blanco y toca Empezar lavado. Luego toca Empezar secado y Terminar.", "help/shots/hk-laundry-en.png", "help/shots/hk-laundry-es.png"),
            step("Log clean linen counts. A LOW count is under the par. Chemical levels are on the same screen.", "Anota los conteos de blancos limpios. BAJO significa que está bajo el par. Los niveles de químico están en la misma pantalla.", "help/shots/hk-laundry-en.png", "help/shots/hk-laundry-es.png"),
            step("Tap Load done on Home as you finish loads. That updates the out time.", "Toca Carga hecha en Inicio conforme terminas cargas. Eso actualiza la hora de salida.", "help/shots/hk-laundry-en.png", "help/shots/hk-laundry-es.png")
          ]
        }
      ]
    },
    {
      id: "maintenance",
      roles: ["Maintenance"],
      title: { en: "Maintenance", es: "Mantenimiento" },
      blurb: {
        en: "Sign in, Home, work orders with photos, and preventive maintenance.",
        es: "Entrada, Inicio, órdenes de trabajo con foto y mantenimiento preventivo."
      },
      video: { en: "help/videos/maintenance-en.mp4", es: "help/videos/maintenance-es.mp4" },
      sections: [
        SIGN_IN,
        {
          id: "home",
          title: { en: "Home screen", es: "Pantalla de inicio" },
          keywords: ["maintenance home", "home screen", "inicio mantenimiento", "pantalla de inicio", "open work orders", "ordenes abiertas", "today's pms", "pm de hoy"],
          steps: [
            step("Home greets you by name. Open work orders is the first big button and shows how many are open.", "Inicio te saluda por tu nombre. Órdenes abiertas es el primer botón grande y muestra cuántas están abiertas.", "help/shots/mt-home-en.png", "help/shots/mt-home-es.png"),
            step("New work order + photo, Today's PMs, and My tasks are the next buttons.", "Nueva orden + foto, PMs de hoy y Mis tareas son los siguientes botones.", "help/shots/mt-home-en.png", "help/shots/mt-home-es.png"),
            step("The bottom bar is Home, Work Orders, PMs, My Tasks, and More.", "La barra de abajo es Inicio, Órdenes de trabajo, MP, Mis tareas y Más.", "help/shots/mt-home-en.png", "help/shots/mt-home-es.png"),
            step("Search finds a room number or a work order.", "Buscar encuentra un número de cuarto o una orden de trabajo.", "help/shots/mt-home-en.png", "help/shots/mt-home-es.png")
          ]
        },
        {
          id: "work-orders",
          title: { en: "Work orders with photos", es: "Órdenes de trabajo con foto" },
          keywords: ["work order", "work orders", "orden de trabajo", "ordenes", "photo", "foto", "add photo", "agregar foto", "submit work order"],
          steps: [
            step("Tap Work Orders. Open orders are listed with the room and the status.", "Toca Órdenes de trabajo. Las órdenes abiertas muestran el cuarto y el estado.", "help/shots/mt-wo-en.png", "help/shots/mt-wo-es.png"),
            step("Tap New request. Choose Work order. Type the room and what is wrong.", "Toca Nueva solicitud. Elige Orden de trabajo. Escribe el cuarto y qué pasa.", "help/shots/mt-wo-en.png", "help/shots/mt-wo-es.png"),
            step("Tap Add photo and take the picture. You should see the photo before you send it.", "Toca Agregar foto y toma la foto. Debes ver la foto antes de enviarla.", "help/shots/mt-wo-en.png", "help/shots/mt-wo-es.png"),
            step("Tap Send. The new order is at the top of the list with the photo.", "Toca Enviar. La orden nueva queda arriba de la lista con la foto.", "help/shots/mt-wo-en.png", "help/shots/mt-wo-es.png"),
            step("On an open order, change the status to In Progress while you work and Done when it is fixed. Add a comment if the next shift needs it.", "En una orden abierta, cambia el estado a En proceso mientras trabajas y a Hecho cuando quede reparada. Agrega un comentario si el siguiente turno lo necesita.", "help/shots/mt-wo-en.png", "help/shots/mt-wo-es.png")
          ]
        },
        {
          id: "pm",
          title: { en: "Preventive maintenance", es: "Mantenimiento preventivo" },
          keywords: ["preventive maintenance", "preventive", "pm", "pms", "mantenimiento preventivo", "guestroom pm", "pm 582", "mp", "checklist pm"],
          steps: [
            step("Tap PMs. The top card is the guestroom PM pace: rooms done, days left in the quarter, and rooms per day needed.", "Toca MP. La tarjeta de arriba es el ritmo de MP de habitaciones: cuartos hechos, días que quedan del trimestre y cuartos por día.", "help/shots/mt-pm-en.png", "help/shots/mt-pm-es.png"),
            step("Today's auto-assigned room PMs lists your rooms. Vacant clean rooms are picked first.", "MP de cuartos asignados hoy lista tus cuartos. Primero se eligen los vacíos y limpios.", "help/shots/mt-pm-en.png", "help/shots/mt-pm-es.png"),
            step("Tap PM 582 on a room to open the guestroom checklist. Check each item, then tap Mark room PM complete.", "Toca PM 582 en un cuarto para abrir la lista de la habitación. Marca cada punto y luego toca Marcar el cuarto MP terminado.", "help/shots/mt-pm-en.png", "help/shots/mt-pm-es.png"),
            step("Equipment and area PMs are listed by due date. OVERDUE means it carried over. Check the box when that PM is done.", "Los MP de equipo y áreas están por fecha. ATRASADO significa que viene del día anterior. Marca la casilla cuando ese MP esté hecho.", "help/shots/mt-pm-en.png", "help/shots/mt-pm-es.png"),
            step("My tasks shows the room PMs and equipment PMs assigned to you, including overdue ones.", "Mis tareas muestra los MP de cuartos y de equipo asignados a ti, incluidos los atrasados.", "help/shots/mt-home-en.png", "help/shots/mt-home-es.png")
          ]
        }
      ]
    },
    {
      id: "gm",
      roles: ["GM", "AGM"],
      title: { en: "GM and AGM", es: "Gerente y subgerente" },
      blurb: {
        en: "Dashboard, daily briefing, night audit review, and the team list.",
        es: "Tablero, resumen diario, revisión de la auditoría nocturna y el equipo."
      },
      video: { en: "help/videos/gm-en.mp4", es: "help/videos/gm-es.mp4" },
      sections: [
        SIGN_IN,
        {
          id: "dashboard",
          title: { en: "Dashboard", es: "Tablero" },
          keywords: ["dashboard", "gm dashboard", "tablero", "tablero del gerente", "home screen", "pantalla de inicio", "open wos", "dirty rooms", "occ"],
          steps: [
            step("Sign in as GM or AGM. Home is your dashboard for this hotel.", "Entra como gerente o subgerente. Inicio es tu tablero de este hotel.", "help/shots/gm-home-en.png", "help/shots/gm-home-es.png"),
            step("GM Dashboard shows open work orders, dirty rooms, low stock, PMs due, labor variance hours, occupancy today, and open guest issues.", "El tablero del gerente muestra órdenes abiertas, cuartos sucios, inventario bajo, MP por vencer, horas de diferencia de labor, ocupación de hoy y quejas abiertas.", "help/shots/gm-home-en.png", "help/shots/gm-home-es.png"),
            step("The daily briefing sits on Home. Tap Full briefing to open the whole page. Night audit sits on Home too. Tap Open night audit.", "El resumen diario está en Inicio. Toca Resumen completo para abrir toda la página. La auditoría nocturna también está en Inicio. Toca Abrir auditoría.", "help/shots/gm-home-en.png", "help/shots/gm-home-es.png"),
            step("Expected done by lists each room attendant and laundry with the finish time and On time or Running behind.", "Hora prevista lista a cada camarista y a lavandería con la hora de término y A tiempo o Atrasado.", "help/shots/gm-home-en.png", "help/shots/gm-home-es.png"),
            step("Housekeeper points this month are on Home. The bottom bar is Home, Guest requests, Work Orders, Labor, and More.", "Los puntos de camaristas de este mes están en Inicio. La barra de abajo es Inicio, Solicitudes, Órdenes, Labor y Más.", "help/shots/gm-home-en.png", "help/shots/gm-home-es.png")
          ]
        },
        {
          id: "briefing",
          title: { en: "Daily briefing", es: "Resumen diario" },
          keywords: ["daily briefing", "briefing", "morning huddle", "resumen diario", "informe", "junta de la manana", "arrivals", "llegadas", "vips"],
          steps: [
            step("On Home, tap Full briefing, or open Daily Briefing from More.", "En Inicio, toca Resumen completo, o abre Resumen diario desde Más.", "help/shots/gm-brief-en.png", "help/shots/gm-brief-es.png"),
            step("The page shows today's occupancy, arrivals, and departures, then VIPs, groups, out-of-order rooms, open guest issues, rush rooms, and PMs due.", "La página muestra la ocupación, las llegadas y las salidas de hoy, luego VIPs, grupos, cuartos fuera de servicio, quejas abiertas, cuartos urgentes y MP pendientes.", "help/shots/gm-brief-en.png", "help/shots/gm-brief-es.png"),
            step("Rows marked EXAMPLE or Manual until PMS feed is connected are typed samples, not a live PMS feed.", "Las filas marcadas EJEMPLO o Manual hasta conectar el PMS son textos de ejemplo, no un PMS en vivo.", "help/shots/gm-brief-en.png", "help/shots/gm-brief-es.png"),
            step("Tap Edit manual fields to type today's VIPs, groups, events, weather, and the GM note. Tap Save.", "Toca Editar campos manuales para escribir los VIPs, grupos, eventos, clima y la nota del gerente de hoy. Toca Guardar.", "help/shots/gm-brief-en.png", "help/shots/gm-brief-es.png")
          ]
        },
        {
          id: "night-audit",
          title: { en: "Night audit review", es: "Revisión de la auditoría nocturna" },
          keywords: ["night audit", "auditoria nocturna", "audit review", "revisar auditoria", "open night audit", "abrir auditoria", "occupancy", "revpar"],
          steps: [
            step("On Home, tap Open night audit. You can also open Night Audit from More.", "En Inicio, toca Abrir auditoría. También puedes abrir Auditoría nocturna desde Más.", "help/shots/gm-audit-en.png", "help/shots/gm-audit-es.png"),
            step("The page is for your hotel. Demo figures are sample rows. They are not last night's live audit.", "La página es de tu hotel. Las cifras del demo son filas de ejemplo. No son la auditoría real de anoche.", "help/shots/gm-audit-en.png", "help/shots/gm-audit-es.png"),
            step("Review each open item. Open one to read why it was flagged. Mark the items you have checked.", "Revisa cada punto abierto. Abre uno para leer por qué se marcó. Marca los puntos que ya revisaste.", "help/shots/gm-audit-en.png", "help/shots/gm-audit-es.png"),
            step("Use the check-in on that page when the review is finished. The Home card then shows the review state.", "Usa la revisión de esa página cuando termines. La tarjeta de Inicio muestra entonces el estado de la revisión.", "help/shots/gm-audit-en.png", "help/shots/gm-audit-es.png")
          ]
        },
        {
          id: "team",
          title: { en: "Team", es: "Equipo" },
          keywords: ["team", "team view", "equipo", "reset pin", "reiniciar pin", "temporary pin", "pin temporal", "staff list", "lista de personal"],
          steps: [
            step("Tap More, then Team. You see the people at your hotel. Demo names are examples.", "Toca Más y luego Equipo. Ves a las personas de tu hotel. Los nombres del demo son ejemplos.", "help/shots/gm-team-en.png", "help/shots/gm-team-es.png"),
            step("Tap a person to see the position and the hotel.", "Toca a una persona para ver el puesto y el hotel.", "help/shots/gm-team-profile-en.png", "help/shots/gm-team-profile-es.png"),
            step("Tap Reset PIN only when that person forgot theirs or is new. A temporary PIN appears once on this screen. Read it to them, then tap Hide code. HotelHQ does not save that temporary PIN.", "Toca Restablecer PIN solo cuando esa persona olvidó el suyo o es nueva. Un PIN temporal aparece una sola vez en esta pantalla. Léelo en voz alta y luego toca Ocultar código. HotelHQ no guarda ese PIN temporal.", "help/shots/gm-team-profile-en.png", "help/shots/gm-team-profile-es.png"),
            step("They sign in with that temporary PIN and HotelHQ makes them set their own PIN before Home opens. You cannot reset your own PIN or another GM's PIN.", "Esa persona entra con ese PIN temporal y HotelHQ le pide crear su propio PIN antes de abrir Inicio. No puedes reiniciar tu propio PIN ni el de otro gerente.", "help/shots/gm-team-profile-en.png", "help/shots/gm-team-profile-es.png")
          ]
        }
      ]
    }
  ];

  var STOP = { the: 1, and: 1, for: 1, you: 1, your: 1, how: 1, can: 1, what: 1, where: 1, when: 1, does: 1, did: 1, are: 1, was: 1, with: 1, this: 1, that: 1, from: 1, have: 1, que: 1, los: 1, las: 1, una: 1, del: 1, por: 1, con: 1, como: 1, para: 1, donde: 1, cuando: 1, puedo: 1, esta: 1, este: 1, eso: 1, sus: 1, mis: 1 };
  var GENERIC = { hotel: 1, hotelhq: 1, screen: 1, tap: 1, open: 1, today: 1, staff: 1, home: 1, inicio: 1, pantalla: 1, toca: 1, abre: 1, ver: 1, see: 1, show: 1, need: 1, needs: 1, app: 1, phone: 1, telefono: 1, hacer: 1, hago: 1, using: 1, use: 1, the: 1, how: 1 };

  function fold(value) {
    return String(value == null ? "" : value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function wordsOf(value) {
    return fold(value).split(/[^a-z0-9]+/).filter(function (word) {
      return word.length > 2 && !STOP[word] && !GENERIC[word];
    });
  }

  function blob(section) {
    var parts = [section.title.en, section.title.es].concat(section.keywords || []);
    (section.steps || []).forEach(function (item) { parts.push(item.en, item.es); });
    return fold(parts.join(" \n "));
  }

  function keywordBlob(section) {
    return fold([section.title.en, section.title.es].concat(section.keywords || []).join(" \n "));
  }

  function hit(hay, word) {
    if (!word || !hay) return false;
    if (hay.indexOf(word) >= 0) return true;
    if (word.length > 4 && word.charAt(word.length - 1) === "s" && hay.indexOf(word.slice(0, -1)) >= 0) return true;
    return false;
  }

  function scoreSection(section, question, contentWords) {
    var body = blob(section);
    var keys = keywordBlob(section);
    var phrase = fold(question);
    var score = 0;
    var keyHits = 0;
    (section.keywords || []).forEach(function (keyword) {
      var folded = fold(keyword);
      if (folded.length >= 4 && phrase.indexOf(folded) >= 0) {
        score += 4;
        keyHits += 1;
      }
    });
    contentWords.forEach(function (word) {
      if (hit(keys, word)) {
        score += 2;
        keyHits += 1;
      } else if (hit(body, word)) score += 1;
    });
    return { score: score, keyHits: keyHits };
  }

  function answer(question, lang, role) {
    var language = lang === "es" ? "es" : "en";
    var asked = String(question || "").trim();
    var contentWords = wordsOf(asked);
    if (!asked || !contentWords.length) {
      return { known: false, text: UNKNOWN[language], steps: [], guideId: "", sectionId: "", title: "", section: "", video: "", shot: "" };
    }
    var best = null;
    GUIDES.forEach(function (guide, guideIndex) {
      guide.sections.forEach(function (section, sectionIndex) {
        var scored = scoreSection(section, asked, contentWords);
        var roleHit = role && guide.roles.indexOf(role) >= 0 ? 1 : 0;
        var row = {
          score: scored.score,
          keyHits: scored.keyHits,
          roleHit: roleHit,
          guideIndex: guideIndex,
          sectionIndex: sectionIndex,
          guide: guide,
          section: section
        };
        if (!best || row.score > best.score || (row.score === best.score && row.roleHit > best.roleHit) || (row.score === best.score && row.roleHit === best.roleHit && (row.guideIndex < best.guideIndex || (row.guideIndex === best.guideIndex && row.sectionIndex < best.sectionIndex)))) {
          best = row;
        }
      });
    });
    if (!best || best.score < 2 || (best.keyHits < 1 && best.score < 3)) {
      return { known: false, text: UNKNOWN[language], steps: [], guideId: "", sectionId: "", title: "", section: "", video: "", shot: "" };
    }
    var steps = best.section.steps.map(function (item) { return item[language]; });
    var first = best.section.steps[0] && best.section.steps[0].shot;
    return {
      known: true,
      text: steps.join("\n"),
      steps: steps,
      guideId: best.guide.id,
      sectionId: best.section.id,
      title: best.guide.title[language],
      section: best.section.title[language],
      video: best.guide.video[language],
      shot: first ? first[language] : ""
    };
  }

  function guideById(id) {
    for (var i = 0; i < GUIDES.length; i++) if (GUIDES[i].id === id) return GUIDES[i];
    return null;
  }

  var api = { GUIDES: GUIDES, UNKNOWN: UNKNOWN, answer: answer, guideById: guideById, fold: fold };
  root.HHQHelp = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
