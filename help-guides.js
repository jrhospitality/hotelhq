/* Day-one how-to guides for HotelHQ. English and Spanish.
   Ask HotelHQ may quote these sections and may not add steps that are not here.
   Demo recordings use example hotels and example staff. No live keys. */
(function (root) {
  "use strict";

  var STOP = {
    the: 1, and: 1, for: 1, you: 1, your: 1, how: 1, what: 1, where: 1, when: 1, can: 1,
    does: 1, with: 1, this: 1, that: 1, from: 1, are: 1, was: 1, have: 1, has: 1, but: 1,
    its: 1, into: 1, about: 1, just: 1, than: 1, then: 1, them: 1, they: 1, our: 1, who: 1,
    why: 1, which: 1, will: 1, after: 1, before: 1, do: 1, did: 1, not: 1, any: 1, all: 1,
    como: 1, que: 1, donde: 1, para: 1, una: 1, uno: 1, los: 1, las: 1, con: 1, por: 1,
    del: 1, esta: 1, este: 1, eso: 1, sus: 1, tus: 1, mis: 1, ella: 1, ellos: 1, hay: 1,
    mas: 1, muy: 1, pero: 1, porque: 1, cuando: 1, cual: 1, cuales: 1
  };
  var SYN = {
    clave: "pin", codigo: "pin", pin: "pin",
    temporal: "pin", temporary: "pin", restablecer: "pin", reset: "pin",
    nota: "notes", notas: "notes", handoff: "notes", turno: "notes", shift: "notes",
    pase: "notes",
    mensaje: "chat", mensajes: "chat", chat: "chat", chats: "chat", responder: "chat",
    respond: "chat", responded: "chat",
    solicitud: "request", solicitudes: "request", request: "request", requests: "request",
    queja: "request", complaint: "request",
    cuarto: "room", cuartos: "room", habitacion: "room", habitaciones: "room",
    room: "room", rooms: "room",
    limpiar: "clean", limpio: "clean", limpieza: "clean", clean: "clean",
    marcar: "clean", marco: "clean", marque: "clean", listo: "clean",
    punto: "points", puntos: "points", points: "points", rewards: "points", premios: "points",
    lavanderia: "laundry", laundry: "laundry", carga: "laundry", cargas: "laundry",
    lavado: "laundry", linen: "laundry", blancos: "laundry",
    orden: "workorder", ordenes: "workorder", foto: "workorder", photo: "workorder",
    photos: "workorder", workorder: "workorder",
    preventivo: "pm", preventiva: "pm", pm: "pm", pms: "pm",
    resumen: "briefing", briefing: "briefing", junta: "briefing", huddle: "briefing",
    auditoria: "audit", audit: "audit", nocturna: "audit", night: "audit",
    inspect: "inspect", inspection: "inspect", inspeccion: "inspect", inspeccionar: "inspect", inspecciono: "inspect",
    assign: "assign", asignar: "assign", asigna: "assign", asigno: "assign",
    lead: "lead", lider: "lead",
    equipo: "team", team: "team", personal: "team",
    comentario: "review", comentarios: "review", resena: "review", resenas: "review",
    review: "review", reviews: "review", medallia: "review",
    inicio: "home", home: "home", pantalla: "home", screen: "home",
    hora: "doneby", prevista: "doneby", expected: "doneby", finish: "doneby"
  };
  var DISTINCT = {
    pin: 1, notes: 1, chat: 1, request: 1, clean: 1, points: 1, laundry: 1,
    workorder: 1, pm: 1, briefing: 1, audit: 1, team: 1, review: 1, home: 1, doneby: 1, room: 1,
    inspect: 1, assign: 1, lead: 1
  };
  var ES_HINT = { como: 1, que: 1, donde: 1, puedo: 1, para: 1, una: 1, los: 1, las: 1, mis: 1, como: 1, marca: 1, marcar: 1, donde: 1 };
  var EN_HINT = { how: 1, what: 1, where: 1, the: 1, my: 1, can: 1, does: 1, do: 1, mark: 1, open: 1 };

  function pinBody() {
    return {
      en: "Sign in on the HotelHQ page. 1. Hotel: type Golden Valley or MSPWE and tap Holiday Inn Express Golden Valley. 2. Your name: type the first letters of your first name, a last name, or the name people call you, then tap your name. The hotel is on that row. Do not open another person's name. If this phone signed you in before, tap Continue as your name. 3. PIN: enter the temporary PIN your manager showed you. Dots hide the numbers. Show PIN reveals them on this screen only. Tap Sign in. If that PIN was reset, HotelHQ opens Set a new PIN. The temporary PIN works once. Choose a new 4 to 6 digit PIN. A run of digits in counting order, or the same digit repeated, is rejected. Tap Save, enter the same PIN again, and tap Save. Sign out is in the header. English and Español switch the language.",
      es: "Entra en la página de HotelHQ. 1. Hotel: escribe Golden Valley o MSPWE y toca Holiday Inn Express Golden Valley. 2. Tu nombre: escribe las primeras letras de tu nombre, un apellido o el nombre con el que te llaman, y toca tu nombre. El hotel está en esa fila. No abras el nombre de otra persona. Si este teléfono ya te entró antes, toca Seguir como tu nombre. 3. PIN: escribe el PIN temporal que te mostró tu gerente. Los puntos ocultan los números. Ver PIN los muestra solo en esta pantalla. Toca Entrar. Si ese PIN se restableció, HotelHQ abre la pantalla Set a new PIN. El PIN temporal sirve una sola vez. Elige un PIN nuevo de 4 a 6 dígitos. Una serie en orden, o el mismo dígito repetido, se rechaza. Toca Guardar, escríbelo otra vez y toca Guardar. Salir está en el encabezado. English y Español cambian el idioma."
    };
  }

  var GUIDES = [
    {
      id: "front_desk",
      roles: ["Front Desk"],
      title: { en: "Front desk — day one", es: "Recepción — primer día" },
      video: { en: "media/help/front-desk-en.mp4", es: "media/help/front-desk-es.mp4" },
      sections: [
        {
          id: "pin",
          title: { en: "Sign in and set your PIN", es: "Entrar y crear tu PIN" },
          keywords: ["pin", "sign", "entrar", "temporary", "temporal", "save", "guardar", "clave"],
          body: pinBody()
        },
        {
          id: "home",
          title: { en: "Home screen", es: "Pantalla de inicio" },
          keywords: ["home", "inicio", "search", "buscar", "more", "mas", "welcome", "vamos"],
          body: {
            en: "After sign-in, a welcome message may cover the page. Tap Let's go. In Spanish that button is ¡Vamos!. Home greets you by first name and has Search for rooms, tasks, and screens. The large buttons are your top tasks. On a phone the bottom bar is Home, Guest requests, Rooms, Shift notes, and More. More holds the other screens, including Help & tour.",
            es: "Después de entrar, un mensaje de bienvenida puede cubrir la página. Toca ¡Vamos!. En inglés el botón es Let's go. Inicio te saluda por tu nombre y tiene Buscar para cuartos, tareas y pantallas. Los botones grandes son tus tareas principales. En el teléfono la barra de abajo es Inicio, Solicitudes, Cuartos, Notas y Más. Más tiene las otras pantallas, incluida Ayuda y recorrido."
          }
        },
        {
          id: "notes",
          title: { en: "Shift notes and handoff", es: "Notas de turno y pase" },
          keywords: ["shift", "notes", "handoff", "pase", "notas", "unread", "mark", "read"],
          body: {
            en: "Open Shift Notes from the bottom bar or from More. On Home, unread shift notes show a count, Mark read, and Add note. On the Shift Notes screen, choose AM, PM, or Night Audit, type the handoff for the next shift, and tap Post handoff. The log lists the notes for this hotel. A GM or AGM can also see who has read a note. You only write notes for the hotel you signed in to.",
            es: "Abre Notas de turno desde la barra de abajo o desde Más. En Inicio, las notas sin leer muestran un número, Marcar leídas y Agregar nota. En la pantalla, elige AM, PM o Auditoría nocturna, escribe el pase para el siguiente turno y toca Publicar pase. El registro lista las notas de este hotel. Un gerente o subgerente también puede ver quién leyó una nota. Solo escribes notas del hotel en el que entraste."
          }
        },
        {
          id: "chats",
          title: { en: "Messages that need a response", es: "Mensajes que hay que responder" },
          keywords: ["guest", "chat", "chats", "message", "mensaje", "responded", "ihg"],
          body: {
            en: "Guest chats is the list of brand messages waiting on a reply. Front desk and AGM see their own hotel. On the demo site, Home shows a banner when sample messages are waiting. Open Guest chats. Each card shows the room, how long it has waited, and the sample message. Answer the guest in the brand chat, then tap Mark responded. HotelHQ does not send the reply. A GM sees a waiting count on Home and does not get the reply button. This list is on the demo site. It is not on the live site until a brand feed is connected.",
            es: "Chats de huéspedes es la lista de mensajes de la marca que esperan respuesta. Recepción y el subgerente ven su hotel. En el sitio demo, Inicio muestra un aviso cuando hay mensajes de ejemplo en espera. Abre Chats de huéspedes. Cada tarjeta muestra el cuarto, cuánto tiempo lleva y el mensaje de ejemplo. Responde al huésped en el chat de la marca y luego toca Marcar respondido. HotelHQ no envía la respuesta. El gerente ve el número en espera en Inicio y no tiene el botón de respuesta. Esta lista está en el sitio demo. No está en el sitio en vivo hasta que se conecte el feed de la marca."
          }
        },
        {
          id: "requests",
          title: { en: "Guest requests", es: "Solicitudes de huéspedes" },
          keywords: ["guest", "request", "solicitud", "complaint", "queja", "room", "initial"],
          body: {
            en: "Open Guest requests. Log a request or a complaint. Enter the room number and the guest's last initial only, not a full name. Pick a category and a priority, type what the guest needs, and tap Send. It goes to the department for that category. On an open item, tap On it when you start, assign it if needed, then Resolve and write what was done. A complaint also asks you to contact the guest and close the loop. The list can be filtered to Open, My dept, Resolved, or All.",
            es: "Abre Solicitudes. Registra una solicitud o una queja. Escribe el número de habitación y solo la inicial del apellido, no el nombre completo. Elige categoría y prioridad, escribe qué necesita el huésped y toca Enviar. Va al departamento de esa categoría. En un caso abierto, toca En camino cuando empiezas, asígnalo si hace falta, luego Resolver y escribe qué se hizo. Una queja también pide contactar al huésped y cerrar el ciclo. La lista se filtra en Abiertas, Mi depto, Resueltas o Todas."
          }
        }
      ]
    },
    {
      id: "housekeeping",
      roles: ["Housekeeper", "Laundry Attendant", "Housekeeping"],
      title: { en: "Housekeeping — room attendant and laundry", es: "Ama de llaves — camarista y lavandería" },
      video: { en: "media/help/housekeeping-en.mp4", es: "media/help/housekeeping-es.mp4" },
      sections: [
        {
          id: "pin",
          title: { en: "Sign in and set your PIN", es: "Entrar y crear tu PIN" },
          keywords: ["pin", "sign", "entrar", "temporary", "temporal", "save", "guardar", "clave"],
          body: pinBody()
        },
        {
          id: "home",
          title: { en: "Home screen", es: "Pantalla de inicio" },
          keywords: ["home", "inicio", "search", "buscar", "more", "welcome"],
          body: {
            en: "After sign-in, tap Let's go if a welcome message is showing. In Spanish that button is ¡Vamos!. Home greets you and has Search. A room attendant's phone bar is Home, My Rooms, Checklists, Schedule, and More. A laundry attendant's bar is Home, My Tasks, Station, Schedule, and More. Room attendant Home shows today's room progress. Laundry Home shows open requests and checklist progress. Both can show Expected done by when the standards for this hotel are loaded.",
            es: "Después de entrar, toca ¡Vamos! si aparece el mensaje de bienvenida. En inglés el botón es Let's go. Inicio te saluda y tiene Buscar. En el teléfono, la camarista ve Inicio, Mis cuartos, Listas, Horario y Más. Lavandería ve Inicio, Mis tareas, Estación, Horario y Más. El inicio de la camarista muestra el avance de cuartos de hoy. El de lavandería muestra solicitudes abiertas y el avance de la lista. Los dos pueden mostrar la hora prevista cuando este hotel tiene los estándares cargados."
          }
        },
        {
          id: "rooms",
          title: { en: "My rooms and marking clean", es: "Mis cuartos y marcar limpio" },
          keywords: ["rooms", "my", "clean", "start", "done", "dnd", "rush", "cuartos"],
          body: {
            en: "Open My Rooms. You only see rooms assigned to you. A dirty or reclean room has Start. That marks it in progress. When you finish, tap Done / Clean. The room then waits for inspection. DND and Refused are on the same card if the guest will not allow service. Rush rooms are listed first. If no rooms are assigned, the screen says no rooms assigned yet. Report a repair from the bottom of My Rooms with the room, what is wrong, and a photo. That creates a work order.",
            es: "Abre Mis cuartos. Solo ves los cuartos asignados a ti. Un cuarto sucio o para volver a limpiar tiene Empezar. Eso lo marca en proceso. Al terminar, toca Listo / Limpio. El cuarto queda en espera de inspección. No molestar y Rechazó servicio están en la misma tarjeta si el huésped no permite el servicio. Los cuartos urgentes van primero. Si no tienes cuartos, la pantalla dice que todavía no tienes cuartos. Reporta una reparación al final de Mis cuartos con el cuarto, qué pasa y una foto. Eso crea una orden de trabajo."
          }
        },
        {
          id: "doneby",
          title: { en: "Expected done-by time", es: "Hora prevista de terminar" },
          keywords: ["expected", "done", "finish", "prevista", "hora", "laundry", "rooms"],
          body: {
            en: "Expected done by is on Home for room attendants and laundry, not for the houseperson. For a room attendant it estimates finish from the shift start, the rooms still open, the minutes per room, and the break. For laundry it uses the shift start plus today's planned laundry hours. The line reads Expected done by and a clock time. If the standards are missing, the time stays blank. A blank time is not an all-clear. GM, AGM, and the housekeeping lead also see the team's expected times on Home.",
            es: "La hora prevista está en Inicio para camaristas y lavandería, no para el houseman. Para la camarista estima el fin con la hora de entrada, los cuartos que faltan, los minutos por cuarto y el descanso. Para lavandería usa la hora de entrada más las horas de lavandería planeadas hoy. La línea dice Termina a las y una hora. Si faltan los estándares, la hora queda en blanco. Una hora en blanco no significa que ya terminaste. El gerente, el subgerente y el líder de ama de llaves también ven las horas del equipo en Inicio."
          }
        },
        {
          id: "points",
          title: { en: "Points", es: "Puntos" },
          keywords: ["points", "puntos", "rewards", "premios", "level", "nivel"],
          body: {
            en: "Open Points & Rewards from More. You see your points, your level, this week, and how points are earned. Examples on that screen include a finished checklist, a fast work order, a shift note, and a guest compliment that tags you. Redeem shows rewards that need GM approval. Points on this screen are for the signed-in person at this hotel.",
            es: "Abre Puntos y premios desde Más. Ves tus puntos, tu nivel, esta semana y cómo se ganan. En esa pantalla hay ejemplos como una lista terminada, una orden cerrada rápido, una nota de turno y un cumplido de huésped que te etiqueta. Canjear muestra premios que el gerente tiene que aprobar. Los puntos de esta pantalla son de la persona que entró, en este hotel."
          }
        },
        {
          id: "lead",
          title: { en: "Inspect and assign rooms", es: "Inspeccionar y asignar cuartos" },
          keywords: ["lead", "lider", "inspect", "inspeccionar", "assign", "asignar", "board", "tablero", "pass", "fail"],
          body: {
            en: "Sign in as the housekeeping lead. Home shows HK Lead · today: dirty rooms, rooms ready to inspect, escalations, and rooms assigned to someone off shift. Open Rooms for the room board. Assign an attendant on a dirty room, or tap Auto-assign dirty rooms to on-shift housekeepers. Open Inspect. Ready to Inspect lists rooms that are waiting, and rush rooms are first. Tap Open inspection, check each item that passes, and tap Pass. To send a room back, type a note and tap Fail. Do not pass a room you cleaned. HotelHQ asks the GM, the AGM, or another lead to inspect that room.",
            es: "Entra como líder de ama de llaves. Inicio muestra HK Lead · today: cuartos sucios, cuartos listos para inspeccionar, escalaciones y cuartos asignados a alguien fuera de turno. Abre Cuartos para el tablero. Asigna una camarista en un cuarto sucio, o toca Auto-assign dirty rooms to on-shift housekeepers. Abre Inspect. Ready to Inspect lista los cuartos en espera, y los urgentes van primero. Toca Open inspection, marca cada punto que pasa y toca Pass. Para regresarlo, escribe una nota y toca Fail. No apruebes un cuarto que tú limpiaste. HotelHQ pide que lo inspeccione el gerente, el subgerente u otro líder."
          }
        },
        {
          id: "laundry",
          title: { en: "Laundry station", es: "Estación de lavandería" },
          keywords: ["laundry", "lavanderia", "wash", "dry", "par", "linen", "chemical", "station"],
          body: {
            en: "Laundry attendants open Station. The screen title is Laundry. Loads log: pick the item, such as Sheets or Towels, and tap Start wash. When it is washed, tap Start dry. When it is dry, tap Finish. Clean linen par / counts: update the count. LOW means the count is under 70 percent of par. OK means it is at or above that. Chemicals & supplies: update the percent and tap Request when a chemical needs a refill. The daily checklist and requests from the desk are on the same screen. On Home, tap Load done as each load is finished. The loads-left count drops.",
            es: "Lavandería abre Estación. El título es Lavandería. Registro de cargas: elige el artículo, como Sábanas o Toallas, y toca Empezar lavado. Cuando termine el lavado, toca Empezar secado. Cuando seque, toca Terminar. Par y conteo de blancos limpios: actualiza el conteo. BAJO significa que está bajo el 70 por ciento del par. OK significa que está en ese nivel o arriba. Químicos e insumos: actualiza el porcentaje y toca Pedir cuando un químico necesita relleno. La lista del día y las solicitudes de recepción están en la misma pantalla. En Inicio, toca Carga hecha cuando terminas una carga. Bajan las cargas que faltan."
          }
        }
      ]
    },
    {
      id: "maintenance",
      roles: ["Maintenance"],
      title: { en: "Maintenance — day one", es: "Mantenimiento — primer día" },
      video: { en: "media/help/maintenance-en.mp4", es: "media/help/maintenance-es.mp4" },
      sections: [
        {
          id: "pin",
          title: { en: "Sign in and set your PIN", es: "Entrar y crear tu PIN" },
          keywords: ["pin", "sign", "entrar", "temporary", "temporal", "save", "guardar", "clave"],
          body: pinBody()
        },
        {
          id: "home",
          title: { en: "Home screen", es: "Pantalla de inicio" },
          keywords: ["home", "inicio", "search", "work", "orders"],
          body: {
            en: "After sign-in, tap Let's go if the welcome is showing. In Spanish that button is ¡Vamos!. Home greets you and has Search. The large buttons open work orders, a new work order with a photo, today's PMs, and My Tasks. On a phone the bottom bar is Home, Work Orders, PMs, My Tasks, and More.",
            es: "Después de entrar, toca ¡Vamos! si aparece la bienvenida. En inglés el botón es Let's go. Inicio te saluda y tiene Buscar. Los botones grandes abren órdenes de trabajo, una orden nueva con foto, los MP de hoy y Mis tareas. En el teléfono la barra de abajo es Inicio, Órdenes de trabajo, MP, Mis tareas y Más."
          }
        },
        {
          id: "orders",
          title: { en: "Work orders with photos", es: "Órdenes de trabajo con foto" },
          keywords: ["work", "order", "photo", "foto", "submit", "priority", "comment"],
          body: {
            en: "Open Work Orders. Tap New request. Work order is already selected when you open it from this screen. Enter the room and what is wrong. Tap Add photo and take or choose a picture, then Send. The order shows on the list with the photo. Change the status in the list on the order: Open, In Progress, Done, or Rejected. Add a comment on that order when you need to leave an update.",
            es: "Abre Órdenes de trabajo. Toca Nueva solicitud. Orden de trabajo ya está elegida cuando la abres desde esta pantalla. Escribe el cuarto y qué pasa. Toca Agregar foto y toma o elige una imagen, luego Enviar. La orden aparece en la lista con la foto. Cambia el estatus en la lista de la orden: Abierta, En proceso, Listo o Rejected. Agrega un comentario en esa orden cuando quieras dejar una actualización."
          }
        },
        {
          id: "pm",
          title: { en: "Preventive maintenance", es: "Mantenimiento preventivo" },
          keywords: ["pm", "preventive", "preventivo", "guestroom", "checklist", "overdue", "582"],
          body: {
            en: "Open PMs. Preventive Maintenance shows the guestroom PM quarter pace, how many rooms are done, and how many rooms per day are still needed. Today's auto-assigned room PMs list the rooms for people on shift. Vacant clean rooms are picked first. Tap PM 582 on a room to open the guestroom checklist, check the items, and tap Mark room PM complete. Equipment and area PMs are listed by due date. Check the box when that PM is done. OVERDUE means it was still open from an earlier due date.",
            es: "Abre MP. Mantenimiento preventivo muestra el ritmo trimestral de MP de habitaciones, cuántos cuartos van hechos y cuántos cuartos por día faltan. Los MP de cuartos asignados hoy listan los cuartos del personal en turno. Primero se eligen los cuartos vacíos y limpios. Toca PM 582 en un cuarto para abrir la lista de la habitación, marca los puntos y toca Marcar el cuarto MP terminado. Los MP de equipo y áreas están por fecha. Marca la casilla cuando ese MP esté hecho. ATRASADO significa que seguía abierto de una fecha anterior."
          }
        }
      ]
    },
    {
      id: "gm",
      roles: ["GM", "AGM"],
      title: { en: "GM and AGM — day one", es: "Gerente y subgerente — primer día" },
      video: { en: "media/help/gm-en.mp4", es: "media/help/gm-es.mp4" },
      sections: [
        {
          id: "pin",
          title: { en: "Sign in, set your PIN, reset a PIN", es: "Entrar, crear tu PIN y restablecer un PIN" },
          keywords: ["pin", "reset", "temporary", "team", "temporal", "clave"],
          body: {
            en: "Sign in the same way as the team. 1. Hotel: type Golden Valley or MSPWE and tap Holiday Inn Express Golden Valley. 2. Your name: type the first letters and tap the name. 3. PIN: the temporary PIN, hidden by dots. Tap Sign in. If your PIN was reset, Set a new PIN opens. The temporary PIN works once. Enter a new 4 to 6 digit PIN, tap Save, enter it again, and tap Save. A run of digits in counting order, or the same digit repeated, is rejected. To reset someone else, open Team, tap their name, and tap Reset PIN. You can reset a person at your hotel. You cannot reset your own PIN or another GM or AGM. In demo, the temporary PIN is shown once on that screen and Supabase is not contacted. On the live site it is shown once on that screen and it is not saved in HotelHQ.",
            es: "Entra igual que el equipo. 1. Hotel: escribe Golden Valley o MSPWE y toca Holiday Inn Express Golden Valley. 2. Tu nombre: escribe las primeras letras y toca el nombre. 3. PIN: el PIN temporal, oculto con puntos. Toca Entrar. Si tu PIN se restableció, se abre Set a new PIN. El PIN temporal sirve una sola vez. Escribe un PIN nuevo de 4 a 6 dígitos, toca Guardar, escríbelo otra vez y toca Guardar. Una serie en orden, o el mismo dígito repetido, se rechaza. Para restablecer el de otra persona, abre Equipo, toca su nombre y toca Reset PIN. Puedes restablecer a una persona de tu hotel. No puedes restablecer el tuyo ni el de otro gerente o subgerente. En demo, el PIN temporal se muestra una vez en esa pantalla y no se contacta a Supabase. En el sitio en vivo se muestra una vez en esa pantalla y no se guarda en HotelHQ."
          }
        },
        {
          id: "home",
          title: { en: "Home screen", es: "Pantalla de inicio" },
          keywords: ["home", "inicio", "search", "more", "welcome"],
          body: {
            en: "After sign-in, tap Let's go if the welcome is showing. In Spanish that button is ¡Vamos!. Home greets you and has Search. The large buttons are the top tasks for the GM view, such as work orders. More has Team, Night Audit, Guest comments, and the other screens. Help & tour is inside More. The Daily Briefing card sits on Home when the numbers exist.",
            es: "Después de entrar, toca ¡Vamos! si aparece la bienvenida. En inglés el botón es Let's go. Inicio te saluda y tiene Buscar. Los botones grandes son las tareas principales de la vista de gerencia, como las órdenes de trabajo. Más tiene Equipo, Auditoría nocturna, Comentarios de huéspedes y las otras pantallas. Ayuda y recorrido está en Más. La tarjeta Resumen diario está en Inicio cuando hay números."
          }
        },
        {
          id: "briefing",
          title: { en: "Daily briefing", es: "Resumen diario" },
          keywords: ["briefing", "daily", "occupancy", "arrivals", "labor", "resumen"],
          body: {
            en: "The Daily Briefing on Home is for the GM and AGM at their own hotel. It shows only numbers the app already has: occupancy forecast, arrivals and departures, labor actual versus plan, open work orders, and urgent alerts such as overdue work orders. Collapse hides the card. Full briefing opens the Daily Briefing screen with the same blocks. If a feed is missing, that block is left out. A missing block is not an all-clear. There is also an older morning huddle screen under More for VIPs, groups, and notes typed by the GM. Those typed fields are manual.",
            es: "El Resumen diario en Inicio es para el gerente y el subgerente en su hotel. Solo muestra números que la app ya tiene: pronóstico de ocupación, llegadas y salidas, labor real contra el plan, órdenes abiertas y alertas urgentes como órdenes atrasadas. Ocultar esconde la tarjeta. Resumen completo abre la pantalla Resumen diario con los mismos bloques. Si falta un dato, ese bloque no aparece. Un bloque que falta no significa que todo está bien. También hay una pantalla de junta de la mañana en Más para VIP, grupos y notas escritas por el gerente. Esos campos escritos son manuales."
          }
        },
        {
          id: "audit",
          title: { en: "Night audit review", es: "Revisión de la auditoría nocturna" },
          keywords: ["night", "audit", "auditoria", "hotelkey", "explain", "done"],
          body: {
            en: "Open Night Audit from More or from the Night Audit card on Home. It is the morning check of flagged night-audit items for your hotel. Each open item can be marked Done, Not an issue, or Explain. Explain asks for a short note, then Save note. The screen shows how many are open, how many are resolved, and the amount at risk. In demo the rows are samples and are labeled EXAMPLE. On the live site the items come from the HotelKey night-audit feed for that hotel. You only clear items for a hotel you are allowed to open.",
            es: "Abre Auditoría nocturna desde Más o desde la tarjeta en Inicio. Es la revisión de la mañana de los casos marcados de la auditoría de tu hotel. Cada caso abierto se puede marcar Listo, No es problema o Explicar. Explicar pide una nota corta y luego Guardar nota. La pantalla muestra cuántos están abiertos, cuántos resueltos y el monto en riesgo. En demo las filas son de ejemplo y dicen EXAMPLE. En el sitio en vivo los casos vienen del feed de auditoría HotelKey de ese hotel. Solo cierras casos de un hotel que puedes abrir."
          }
        },
        {
          id: "team",
          title: { en: "Team view", es: "Vista de equipo" },
          keywords: ["team", "equipo", "staff", "reset", "pin", "position"],
          body: {
            en: "Open Team from More. You see the people at your hotel, with position and hotel under each name. Tap a name to open that person. Preferred name is the name they go by at sign-in. Other names are extra spellings. Save name stores them. Reset PIN is on that page when you are allowed to reset it. Back to team returns to the list. Above-property leaders can see every hotel. A GM or AGM sees their own hotel. The department switcher on Home lets a leader look at another department's screens. Personal rooms and tasks stay with that staff member.",
            es: "Abre Equipo desde Más. Ves a las personas de tu hotel, con puesto y hotel bajo cada nombre. Toca un nombre para abrir a esa persona. Nombre que usa es el nombre con el que entran. Otros nombres son formas extra de escribirlo. Guardar nombre los guarda. Reset PIN está en esa página cuando puedes restablecerlo. Back to team regresa a la lista. Quien está arriba de la propiedad puede ver todos los hoteles. Un gerente o subgerente ve su hotel. El selector de departamento en Inicio deja a un líder ver las pantallas de otro departamento. Los cuartos y las tareas personales siguen con esa persona."
          }
        },
        {
          id: "reviews",
          title: { en: "Guest reviews", es: "Comentarios de huéspedes" },
          keywords: ["guest", "comments", "reviews", "medallia", "actioned", "assign", "comentario"],
          body: {
            en: "Guest comments is the guest-review list. On the demo site, open it from More. GM and AGM see scores and comments for their hotel. Open a comment to read it, the source, and the suggested action. Tap Actioned, Not an issue, or Assign. Assign opens a work order or a task from that suggestion. Housekeeping sees room-cleanliness comments. A room attendant sees their own cleanliness mentions. This screen is on the demo site. Live mode does not add the menu until the comment feed is connected. Sample comments start with Sample comment.",
            es: "Comentarios de huéspedes es la lista de reseñas. En el sitio demo, ábrela desde Más. El gerente y el subgerente ven calificaciones y comentarios de su hotel. Abre un comentario para leerlo, la fuente y la acción sugerida. Toca Atendido, No es problema o Asignar. Asignar abre una orden de trabajo o una tarea a partir de esa sugerencia. Ama de llaves ve los comentarios de limpieza del cuarto. La camarista ve sus propias menciones de limpieza. Esta pantalla está en el sitio demo. El modo en vivo no agrega el menú hasta que se conecte el feed de comentarios. Los comentarios de ejemplo empiezan con Sample comment."
          }
        }
      ]
    }
  ];

  function fold(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function words(value) {
    return fold(value).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(function (word) {
      return word.length > 2 && !STOP[word];
    });
  }
  function canon(word) {
    return SYN[word] || word;
  }
  function bag(parts) {
    var out = {};
    parts.forEach(function (part) {
      words(part).forEach(function (word) { out[canon(word)] = 1; });
    });
    return out;
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
    });
  }
  function langOf(value) {
    return value === "es" ? "es" : "en";
  }
  function guessLang(question, fallback) {
    var raw = fold(question).replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
    var es = 0;
    var en = 0;
    raw.forEach(function (word) {
      if (ES_HINT[word]) es += 1;
      if (EN_HINT[word]) en += 1;
    });
    if (es > en) return "es";
    if (en > es) return "en";
    return langOf(fallback);
  }
  function guideById(id) {
    for (var i = 0; i < GUIDES.length; i++) if (GUIDES[i].id === id) return GUIDES[i];
    return null;
  }
  function guideForRole(role) {
    for (var i = 0; i < GUIDES.length; i++) {
      if (GUIDES[i].roles.indexOf(role) >= 0) return GUIDES[i];
    }
    return null;
  }
  function mediaOk(path) {
    var value = String(path || "");
    return /^media\/help\/[a-z0-9.-]+\.(mp4|vtt)$/.test(value) && value.indexOf("..") < 0;
  }
  function captionsFor(guide, videoLang) {
    var stem = String(guide.video[videoLang] || "").replace(/\.mp4$/, "");
    return { en: stem + ".en.vtt", es: stem + ".es.vtt" };
  }
  function unknown(lang) {
    return {
      known: false,
      lang: lang,
      title: "",
      text: lang === "es"
        ? "No encuentro eso en las guías de HotelHQ."
        : "I don't know that from the HotelHQ guides.",
      guideId: "",
      sectionId: "",
      video: "",
      captions: { en: "", es: "" }
    };
  }
  function maySeeRevenue(role) {
    var key = role == null ? "" : String(role);
    if (key === "gm" || key === "GM") key = "GM";
    else if (key === "agm" || key === "AGM") key = "AGM";
    else if (key === "above_property" || key === "corporate" || key === "JR Corporate" || key === "Above Property") key = "Above Property";
    if (root.HHQ && root.HHQ.can) return !!root.HHQ.can(key, "revenue.see");
    return key === "GM" || key === "AGM" || key === "Above Property";
  }
  function asksForPropertyRevenue(question) {
    return /room revenue|total revenue|mtd revenue|ytd revenue|revenue mtd|revenue ytd|budget vs|versus budget|adr\s*[x×]\s*rooms|ingreso de cuartos|ingreso total|ingresos del mes|ingresos del a[nñ]o/i.test(String(question || ""));
  }
  function answer(question, opts) {
    opts = opts || {};
    var lang = opts.lang === "es" || opts.lang === "en" ? opts.lang : guessLang(question, opts.uiLang || "en");
    if (asksForPropertyRevenue(question) && !maySeeRevenue(opts.role)) return unknown(lang);
    var queryWords = words(question).map(canon);
    var unique = {};
    queryWords.forEach(function (word) { unique[word] = 1; });
    var tokens = Object.keys(unique);
    if (!tokens.length) return unknown(lang);
    var roleGuide = guideForRole(opts.role || "");
    var best = null;
    GUIDES.forEach(function (guide) {
      guide.sections.forEach(function (section) {
        if (section.revenue && !maySeeRevenue(opts.role)) return;
        var have = bag([
          section.title.en, section.title.es, section.body.en, section.body.es,
          (section.keywords || []).join(" ")
        ]);
        var overlap = 0;
        var distinct = false;
        tokens.forEach(function (token) {
          if (!have[token]) return;
          overlap += 1;
          if (DISTINCT[token]) distinct = true;
        });
        if (!overlap) return;
        var titleBag = bag([section.title.en, section.title.es]);
        var titleHits = 0;
        tokens.forEach(function (token) { if (titleBag[token]) titleHits += 1; });
        var score = overlap + titleHits;
        if (roleGuide && roleGuide.id === guide.id) score += 1.5;
        var row = { guide: guide, section: section, score: score, overlap: overlap, titleHits: titleHits, distinct: distinct };
        if (!best || row.score > best.score || (row.score === best.score && row.titleHits > best.titleHits)) best = row;
      });
    });
    if (!best || (best.overlap < 2 && !best.distinct)) return unknown(lang);
    var caps = captionsFor(best.guide, lang);
    return {
      known: true,
      lang: lang,
      guideId: best.guide.id,
      sectionId: best.section.id,
      guideTitle: best.guide.title[lang],
      title: best.section.title[lang],
      text: best.section.body[lang],
      video: best.guide.video[lang],
      captions: caps
    };
  }
  function videoHtml(guide, lang) {
    var src = guide.video[lang];
    var caps = captionsFor(guide, lang);
    if (!mediaOk(src) || !mediaOk(caps.en) || !mediaOk(caps.es)) return "";
    var enDefault = lang === "en" ? " default" : "";
    var esDefault = lang === "es" ? " default" : "";
    return "<video class=\"help-video\" controls playsinline preload=\"metadata\" src=\"" + esc(src) + "\">" +
      "<track kind=\"captions\" src=\"" + esc(caps.en) + "\" srclang=\"en\" label=\"English\"" + enDefault + ">" +
      "<track kind=\"captions\" src=\"" + esc(caps.es) + "\" srclang=\"es\" label=\"Español\"" + esDefault + ">" +
      "</video>";
  }
  function pageHtml(lang, opts) {
    opts = opts || {};
    lang = langOf(lang || opts.lang);
    var mine = guideForRole(opts.role || "");
    var ordered = GUIDES.slice().sort(function (a, b) {
      if (mine && a.id === mine.id) return -1;
      if (mine && b.id === mine.id) return 1;
      return 0;
    });
    var title = lang === "es" ? "Ayuda" : "Help";
    var lead = lang === "es"
      ? "Guías del primer día para Holiday Inn Express Golden Valley. Los pasos coinciden con las pantallas de HotelHQ. Los videos son del modo demo, con datos de ejemplo."
      : "Day-one guides for Holiday Inn Express Golden Valley. The steps match the HotelHQ screens. The videos are from demo mode, with example data.";
    var replay = lang === "es" ? "Repetir el recorrido" : "Replay the tour";
    var watch = lang === "es" ? "Video" : "Video";
    var html = "<div class=\"raw help-hub\" id=\"helpHub\"><h2>" + esc(title) + "</h2><p class=\"help-lead\">" + esc(lead) + "</p>" +
      "<button type=\"button\" class=\"btn2 help-replay\" onclick=\"if(window.uxTour)uxTour(1)\">" + esc(replay) + "</button>";
    ordered.forEach(function (guide) {
      var open = opts.openId && opts.openId === guide.id ? " open" : "";
      html += "<details class=\"help-guide\" id=\"help-" + guide.id + "\"" + open + "><summary>" + esc(guide.title[lang]) + "</summary>" +
        "<p class=\"help-watch\">" + esc(watch) + "</p>" + videoHtml(guide, lang);
      guide.sections.forEach(function (section) {
        if (section.revenue && !maySeeRevenue(opts.role)) return;
        html += "<section class=\"help-sec\" id=\"help-" + guide.id + "-" + section.id + "\"><h3>" + esc(section.title[lang]) + "</h3><p>" + esc(section.body[lang]) + "</p></section>";
      });
      html += "</details>";
    });
    return html + "</div>";
  }

  var api = {
    GUIDES: GUIDES,
    answer: answer,
    pageHtml: pageHtml,
    guideForRole: guideForRole,
    guideById: guideById,
    guessLang: guessLang,
    mediaOk: mediaOk,
    captionsFor: captionsFor
  };
  root.HelpGuides = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
