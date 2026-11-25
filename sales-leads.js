/* Sales leads filed by front desk, AGM, GM, and JR Corporate.
   The property and the staff name are filled in. The guest needs a phone or an
   email. Demo rows use fake contacts (example.test, 555-010 numbers) and say so.
   With Supabase on, save_sales_lead writes the row, then the sales-lead-email
   function mails the hotel's sales manager through Gmail SMTP. A failed send
   keeps the lead and flags it "Email not sent". A reply stores responded_at and shows
   a Responded badge. JR Corporate's Sales Leads by Hotel card is built here and
   home-focus.js parks it under More, not on the home surface. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var HOTEL_OK = { MSPWE: 1, MSPAM: 1, MSPMS: 1 };
  var HOTEL_LABEL = {
    MSPWE: "MSPWE · HIE&S Golden Valley",
    MSPAM: "MSPAM · Hampton Inn & Suites MSP Airport/MOA",
    MSPMS: "MSPMS · SpringHill Suites MSP Airport/MOA"
  };
  var NEEDS = ["Local Negotiated Rate", "Group Block", "Meeting Space", "Other"];
  var STATUSES = ["New", "Contacted", "Won", "Lost"];
  var CAPTURE = { "Front Desk": 1, GM: 1, AGM: 1, "Above Property": 1 };
  var MANAGE = { GM: 1, AGM: 1, "Above Property": 1, "Sales Manager": 1 };
  var CONFIGURE = { GM: 1, "Above Property": 1 };
  var ROLE = {
    "Front Desk": "Front Desk",
    front_desk: "Front Desk",
    GM: "GM",
    gm: "GM",
    AGM: "AGM",
    agm: "AGM",
    "Above Property": "Above Property",
    above_property: "Above Property",
    "JR Corporate": "Above Property",
    "Sales Manager": "Sales Manager",
    sales_manager: "Sales Manager"
  };
  var PHRASES = {
    "Sales Lead": "Prospecto de ventas",
    "Sales Leads": "Prospectos de ventas",
    "New leads this week": "Prospectos nuevos esta semana",
    "Sample leads for this demo. Fake contacts only.": "Prospectos de ejemplo. Solo contactos falsos.",
    "EXAMPLE": "EJEMPLO",
    "Property": "Propiedad",
    "Your name": "Tu nombre",
    "First name": "Nombre",
    "Last name": "Apellido",
    "Phone": "Teléfono",
    "Email": "Correo",
    "Read it back to the guest.": "Léelo de nuevo al huésped.",
    "What do they need?": "¿Qué necesita?",
    "Local Negotiated Rate": "Tarifa negociada local",
    "Group Block": "Bloqueo de grupo",
    "Meeting Space": "Salón de reuniones",
    "Other": "Otro",
    "What else do they need?": "¿Qué más necesita?",
    "Group dates (optional)": "Fechas del grupo (opcional)",
    "Add the dates if the guest knows them.": "Agrega las fechas si el huésped las sabe.",
    "Start": "Inicio",
    "End": "Fin",
    "Notes": "Notas",
    "Send to sales": "Enviar a ventas",
    "Lead saved": "Prospecto guardado",
    "Email not sent": "Correo no enviado",
    "Email sent": "Correo enviado",
    "The demo does not send mail.": "La demostración no envía correo.",
    "No sales manager email is set for this hotel.": "Este hotel no tiene correo del gerente de ventas.",
    "The Gmail app password is not set.": "Falta la contraseña de aplicación de Gmail.",
    "The Gmail login is not set.": "Falta el correo de acceso de Gmail.",
    "The email service did not accept it.": "El servicio de correo no lo aceptó.",
    "Add another lead": "Agregar otro prospecto",
    "See sales leads": "Ver prospectos",
    "All": "Todos",
    "New": "Nuevo",
    "Contacted": "Contactado",
    "Won": "Ganado",
    "Lost": "Perdido",
    "Filed by": "Lo anotó",
    "Fake contact": "Contacto falso",
    "No sales leads yet.": "Todavía no hay prospectos.",
    "Couldn't load sales leads.": "No se pudieron cargar los prospectos.",
    "Loading sales leads…": "Cargando prospectos…",
    "Sales manager emails": "Correos del gerente de ventas",
    "One address per line. Up to five. GM and JR Corporate can change these.": "Un correo por línea. Hasta cinco. El gerente y JR Corporate pueden cambiarlos.",
    "Jay sets the Supabase secrets HOTELHQ_GMAIL_USER and HOTELHQ_GMAIL_APP_PASSWORD. Do not put a real address in the public repo.": "Jay configura los secretos de Supabase HOTELHQ_GMAIL_USER y HOTELHQ_GMAIL_APP_PASSWORD. No pongas un correo real en el repositorio público.",
    "Add email": "Agregar correo",
    "Save emails": "Guardar correos",
    "No sales manager email yet.": "Todavía no hay correo del gerente de ventas.",
    "Saved on this device. No email is sent from the demo.": "Guardado en este dispositivo. La demostración no envía correo.",
    "Switch property above to file a lead for another hotel.": "Cambia la propiedad arriba para anotar un prospecto de otro hotel.",
    "Try email again": "Reintentar el correo",
    "Enter the contact's first and last name.": "Escribe el nombre y el apellido del contacto.",
    "Enter a phone number or an email.": "Escribe un teléfono o un correo.",
    "Check the phone number.": "Revisa el teléfono.",
    "Check the email address.": "Revisa el correo.",
    "Choose what the contact needs.": "Elige qué necesita el contacto.",
    "Say what else they need.": "Escribe qué más necesita.",
    "The end date is before the start date.": "La fecha final es anterior a la inicial.",
    "Shorten the notes.": "Acorta las notas.",
    "Choose a property first.": "Elige primero la propiedad.",
    "You can't file a sales lead.": "No puedes anotar un prospecto.",
    "Couldn't save that lead. Try again.": "No se pudo guardar. Inténtalo de nuevo.",
    "Check the sales manager email.": "Revisa el correo del gerente de ventas.",
    "Status": "Estado",
    "Contact": "Contacto",
    "Sales Leads by Hotel": "Prospectos por hotel",
    "Leads": "Prospectos",
    "Responded": "Respondido",
    "Waiting": "En espera",
    "Avg response hrs": "Horas prom. de respuesta",
    "Mark responded": "Marcar respondido"
  };
  var ERRORS = {
    name: "Enter the contact's first and last name.",
    contact: "Enter a phone number or an email.",
    phone: "Check the phone number.",
    email: "Check the email address.",
    needs: "Choose what the contact needs.",
    other: "Say what else they need.",
    dates: "The end date is before the start date.",
    notes: "Shorten the notes.",
    hotel: "Choose a property first.",
    role: "You can't file a sales lead.",
    save: "Couldn't save that lead. Try again.",
    emails: "Check the sales manager email."
  };
  var EMAIL_REASON = {
    demo: "The demo does not send mail.",
    no_route: "No sales manager email is set for this hotel.",
    no_password: "The Gmail app password is not set.",
    no_key: "The Gmail app password is not set.",
    no_from: "The Gmail login is not set.",
    provider: "The email service did not accept it.",
    config: "The email service did not accept it.",
    busy: "The email service did not accept it."
  };

  function normRole(role) { return ROLE[role] || ""; }
  function canCapture(role) { return !!CAPTURE[normRole(role)]; }
  function canManage(role) { return !!MANAGE[normRole(role)]; }
  function canConfigure(role) { return !!CONFIGURE[normRole(role)]; }
  function label(en, lang) {
    if (lang === "es" && PHRASES[en]) return PHRASES[en];
    return en;
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function digits(value) { return String(value || "").replace(/\D/g, ""); }
  function isEmail(value) {
    return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(value || "").trim());
  }
  function cleanName(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function chicagoDate(iso) {
    var s = String(iso || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }
  function addDays(day, n) {
    var p = String(day).split("-").map(Number);
    var utc = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    utc.setUTCDate(utc.getUTCDate() + n);
    return utc.toISOString().slice(0, 10);
  }
  function weekStart(iso) {
    var day = chicagoDate(iso);
    if (!day) return "";
    var p = day.split("-").map(Number);
    var utc = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    var dow = utc.getUTCDay();
    utc.setUTCDate(utc.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    return utc.toISOString().slice(0, 10);
  }
  function inThisWeek(createdAt, todayIso) {
    var day = chicagoDate(createdAt);
    var start = weekStart(todayIso);
    if (!day || !start) return false;
    return day >= start && day < addDays(start, 7);
  }
  function countNewThisWeek(leads, hotel, todayIso) {
    var n = 0;
    var i;
    for (i = 0; i < (leads || []).length; i++) {
      var row = leads[i];
      if (row.hotel === hotel && row.status === "New" && inThisWeek(row.createdAt, todayIso)) n++;
    }
    return n;
  }
  function subjectLine(hotel, first, last) {
    var contact = cleanName(String(first || "") + " " + String(last || "")).replace(/[\r\n]+/g, " ");
    return "New sales lead - " + hotel + " - " + contact;
  }
  function blankRoutes() {
    return { MSPWE: [], MSPAM: [], MSPMS: [] };
  }
  function noon(day) { return day + "T16:00:00.000Z"; }
  function addHours(iso, hours) {
    var ms = Date.parse(iso);
    if (isNaN(ms)) return "";
    return new Date(ms + hours * 3600000).toISOString();
  }
  function demoLead(row) {
    row.example = true;
    row.emailStatus = row.emailStatus || "failed";
    row.emailError = row.emailError || "demo";
    row.needsOther = row.needsOther || "";
    row.groupStart = row.groupStart || "";
    row.groupEnd = row.groupEnd || "";
    row.notes = row.notes || "FAKE contact for this demo. Not a real guest.";
    row.updatedAt = row.updatedAt || row.createdAt;
    row.respondedAt = row.respondedAt || "";
    row.respondedBy = row.respondedBy || "";
    return row;
  }
  function buildDemo(todayIso) {
    var start = weekStart(todayIso);
    var today = chicagoDate(todayIso);
    var later = addDays(today, 30);
    var mspamNew = noon(addDays(start, 1));
    var mspweLost = noon(addDays(start, -4));
    var mspamWon = noon(addDays(start, -3));
    return {
      origin: "example",
      routes: blankRoutes(),
      leads: [
        demoLead({
          id: "ex-mspwe-new", hotel: "MSPWE", createdByName: "Jordan Lee (EX)",
          contactFirst: "Alex", contactLast: "Example", contactPhone: "(555) 010-0142",
          contactEmail: "alex.example@example.test", needs: ["Local Negotiated Rate"],
          status: "New", createdAt: noon(start)
        }),
        demoLead({
          id: "ex-mspam-new", hotel: "MSPAM", createdByName: "Kim Nguyen (EX)",
          contactFirst: "Riley", contactLast: "Sample", contactPhone: "",
          contactEmail: "riley.sample@example.test", needs: ["Group Block", "Meeting Space"],
          groupStart: later, groupEnd: addDays(later, 2), status: "New", createdAt: mspamNew,
          respondedAt: addHours(mspamNew, 5), respondedBy: "Kim Nguyen (EX)",
          notes: "FAKE contact. Asked about a group block. Not a real guest."
        }),
        demoLead({
          id: "ex-mspms-new", hotel: "MSPMS", createdByName: "Tess Brown (EX)",
          contactFirst: "Jordan", contactLast: "Demo", contactPhone: "(555) 010-0198",
          contactEmail: "", needs: ["Meeting Space", "Other"], needsOther: "FAKE welcome dinner",
          status: "New", createdAt: noon(addDays(start, 2))
        }),
        demoLead({
          id: "ex-mspwe-lost", hotel: "MSPWE", createdByName: "Jordan Lee (EX)",
          contactFirst: "Casey", contactLast: "Fictional", contactPhone: "(555) 010-0177",
          contactEmail: "casey.fictional@example.test", needs: ["Other"], needsOther: "FAKE site visit",
          status: "Lost", createdAt: mspweLost,
          respondedAt: addHours(mspweLost, 26), respondedBy: "Jordan Lee (EX)"
        }),
        demoLead({
          id: "ex-mspam-won", hotel: "MSPAM", createdByName: "Kim Nguyen (EX)",
          contactFirst: "Sam", contactLast: "Placeholder", contactPhone: "(555) 010-0104",
          contactEmail: "sam.placeholder@example.test", needs: ["Local Negotiated Rate"],
          status: "Won", createdAt: mspamWon,
          respondedAt: addHours(mspamWon, 2), respondedBy: "Kim Nguyen (EX)"
        })
      ]
    };
  }
  function validateLead(input) {
    var hotel = input && input.hotel;
    var first = cleanName(input && input.first);
    var last = cleanName(input && input.last);
    var phone = String(input && input.phone || "").trim();
    var email = String(input && input.email || "").trim().toLowerCase();
    var needs = [];
    var i;
    var other = cleanName(input && input.other);
    var start = String(input && input.start || "");
    var end = String(input && input.end || "");
    var notes = String(input && input.notes || "").trim();
    if (!HOTEL_OK[hotel]) return { ok: false, error: "hotel" };
    if (!first || !last || first.length > 80 || last.length > 80) return { ok: false, error: "name" };
    if (phone && (digits(phone).length < 7 || digits(phone).length > 15)) return { ok: false, error: "phone" };
    if (email && !isEmail(email)) return { ok: false, error: "email" };
    if (!phone && !email) return { ok: false, error: "contact" };
    var rawNeeds = input && input.needs || [];
    for (i = 0; i < rawNeeds.length; i++) {
      if (NEEDS.indexOf(rawNeeds[i]) >= 0 && needs.indexOf(rawNeeds[i]) < 0) needs.push(rawNeeds[i]);
    }
    if (!needs.length || rawNeeds.length !== needs.length) return { ok: false, error: "needs" };
    if (needs.indexOf("Other") >= 0) {
      if (!other || other.length > 200) return { ok: false, error: "other" };
    } else other = "";
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return { ok: false, error: "dates" };
    if (end && !/^\d{4}-\d{2}-\d{2}$/.test(end)) return { ok: false, error: "dates" };
    if (start && end && end < start) return { ok: false, error: "dates" };
    if (notes.length > 2000) return { ok: false, error: "notes" };
    return {
      ok: true,
      error: "",
      value: {
        hotel: hotel,
        contactFirst: first,
        contactLast: last,
        contactPhone: phone,
        contactEmail: email,
        needs: needs,
        needsOther: other,
        groupStart: start,
        groupEnd: end,
        notes: notes
      }
    };
  }
  function cleanEmails(list) {
    var out = [];
    var i;
    for (i = 0; i < (list || []).length; i++) {
      var email = String(list[i] || "").trim().toLowerCase();
      if (!email) continue;
      if (!isEmail(email) || email.length > 120) return { ok: false, emails: [] };
      if (out.indexOf(email) < 0) out.push(email);
    }
    if (out.length > 5) return { ok: false, emails: [] };
    return { ok: true, emails: out };
  }
  function mapLead(row) {
    return {
      id: row.id,
      hotel: row.hotel,
      example: false,
      createdByName: row.created_by_name || "",
      contactFirst: row.contact_first || "",
      contactLast: row.contact_last || "",
      contactPhone: row.contact_phone || "",
      contactEmail: row.contact_email || "",
      needs: row.needs || [],
      needsOther: row.needs_other || "",
      groupStart: row.group_start || "",
      groupEnd: row.group_end || "",
      notes: row.notes || "",
      status: row.status || "New",
      emailStatus: row.email_status || "pending",
      emailError: row.email_error || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      respondedAt: row.responded_at || "",
      respondedBy: row.responded_by || ""
    };
  }
  function waitingLeads(leads, hotel) {
    return (leads || []).filter(function (row) {
      if (!row || row.hotel !== hotel) return false;
      if (row.status === "Won" || row.status === "Lost") return false;
      if (row.status === "New") return true;
      return !row.respondedAt;
    });
  }
  function rollup(leads, hotels) {
    var list = (hotels && hotels.length) ? hotels : HOTELS;
    return list.map(function (hotel) {
      var rows = (leads || []).filter(function (row) { return row && row.hotel === hotel; });
      var answered = rows.filter(function (row) { return !!row.respondedAt; });
      var totalHours = 0;
      var n = 0;
      answered.forEach(function (row) {
        var start = Date.parse(row.createdAt);
        var end = Date.parse(row.respondedAt);
        if (isNaN(start) || isNaN(end) || end < start) return;
        totalHours += (end - start) / 3600000;
        n++;
      });
      return {
        hotel: hotel,
        total: rows.length,
        responded: answered.length,
        awaiting: rows.length - answered.length,
        avgHours: n ? Math.round((totalHours / n) * 10) / 10 : null
      };
    });
  }
  function formatHours(value) {
    if (value == null || value === "") return "—";
    var n = Number(value);
    if (!isFinite(n) || n < 0) return "—";
    return String(Math.round(n * 10) / 10);
  }
  function rollupRows(state, hotels) {
    var saved = state && state.rollup;
    if (saved && saved.length) {
      var by = {};
      saved.forEach(function (row) { if (row && row.hotel) by[row.hotel] = row; });
      return hotels.map(function (hotel) {
        var row = by[hotel];
        if (!row) return { hotel: hotel, total: 0, responded: 0, awaiting: 0, avgHours: null };
        return {
          hotel: hotel,
          total: Number(row.total) || 0,
          responded: Number(row.responded) || 0,
          awaiting: Number(row.awaiting) || 0,
          avgHours: row.avgHours == null || row.avgHours === "" ? null : Number(row.avgHours)
        };
      });
    }
    return rollup(state && state.leads, hotels);
  }
  function mapRollup(row) {
    return {
      hotel: row.hotel,
      total: Number(row.total_leads) || 0,
      responded: Number(row.responded) || 0,
      awaiting: Number(row.awaiting) || 0,
      avgHours: row.avg_hours == null || row.avg_hours === "" ? null : Number(row.avg_hours)
    };
  }
  function mapRoutes(rows) {
    var routes = blankRoutes();
    (rows || []).forEach(function (row) {
      if (routes[row.hotel]) routes[row.hotel] = (row.emails || []).slice();
    });
    return routes;
  }
  function telHref(phone) {
    var d = digits(phone);
    if (d.length === 10) return "tel:+1" + d;
    if (d.length >= 7) return "tel:+" + d;
    return "";
  }
  function blankDraft() {
    return { first: "", last: "", phone: "", email: "", needs: [], other: "", start: "", end: "", notes: "" };
  }
  function field(name, control) {
    return "<label class=\"sl-field\">" + esc(name) + control + "</label>";
  }
  function formHtml(draft, ctx) {
    var lang = ctx.lang;
    var needs = draft.needs || [];
    var chips = NEEDS.map(function (need) {
      var on = needs.indexOf(need) >= 0;
      return "<button type=\"button\" class=\"" + (on ? "on" : "") + "\" aria-pressed=\"" + (on ? "true" : "false") + "\" onclick=\"slNeed('" + need + "')\">" + esc(label(need, lang)) + "</button>";
    }).join("");
    var other = needs.indexOf("Other") >= 0
      ? field(label("What else do they need?", lang), "<input id=\"slOther\" maxlength=\"200\" value=\"" + esc(draft.other || "") + "\" oninput=\"slInput()\">")
      : "";
    var err = ctx.error ? "<p class=\"sl-err\" id=\"slError\">" + esc(label(ERRORS[ctx.error] || ERRORS.save, lang)) + "</p>" : "";
    var emailWarn = ctx.emailWarn ? "<p class=\"sl-err\" id=\"slEmailWarn\">" + esc(label(ERRORS.email, lang)) + "</p>" : "";
    var corp = ctx.corporate ? "<p class=\"sl-note\">" + esc(label("Switch property above to file a lead for another hotel.", lang)) + "</p>" : "";
    return "<form class=\"raw sl\" id=\"slForm\" autocomplete=\"off\" onsubmit=\"slSubmit(event);return false;\">" +
      "<h2>" + esc(label("Sales Lead", lang)) + "</h2>" + corp + err +
      "<p class=\"sl-lock\"><span>" + esc(label("Property", lang)) + "</span><b id=\"slProperty\">" + esc(ctx.hotelLabel) + "</b></p>" +
      "<p class=\"sl-lock\"><span>" + esc(label("Your name", lang)) + "</span><b id=\"slStaff\">" + esc(ctx.staffName) + "</b></p>" +
      field(label("First name", lang), "<input id=\"slFirst\" maxlength=\"80\" required autocomplete=\"off\" value=\"" + esc(draft.first || "") + "\" oninput=\"slInput()\">") +
      field(label("Last name", lang), "<input id=\"slLast\" maxlength=\"80\" required autocomplete=\"off\" value=\"" + esc(draft.last || "") + "\" oninput=\"slInput()\">") +
      field(label("Phone", lang), "<input id=\"slPhone\" type=\"tel\" inputmode=\"tel\" maxlength=\"20\" autocomplete=\"off\" value=\"" + esc(draft.phone || "") + "\" oninput=\"slInput()\">") +
      field(label("Email", lang), "<input id=\"slEmail\" type=\"email\" inputmode=\"email\" maxlength=\"120\" autocomplete=\"off\" value=\"" + esc(draft.email || "") + "\" oninput=\"slInput()\" onblur=\"slEmailBlur()\">") +
      "<p class=\"sl-hint\" id=\"slEmailHint\">" + esc(label("Read it back to the guest.", lang)) + "</p>" + emailWarn +
      "<p class=\"sl-label\">" + esc(label("What do they need?", lang)) + "</p><div class=\"sl-needs\" id=\"slNeeds\">" + chips + "</div>" + other +
      "<p class=\"sl-label\">" + esc(label("Group dates (optional)", lang)) + "</p>" +
      "<p class=\"sl-note\">" + esc(label("Add the dates if the guest knows them.", lang)) + "</p>" +
      "<div class=\"sl-dates\">" +
      field(label("Start", lang), "<input id=\"slStart\" type=\"date\" value=\"" + esc(draft.start || "") + "\" oninput=\"slInput()\">") +
      field(label("End", lang), "<input id=\"slEnd\" type=\"date\" value=\"" + esc(draft.end || "") + "\" oninput=\"slInput()\">") +
      "</div>" +
      field(label("Notes", lang), "<textarea id=\"slNotes\" maxlength=\"2000\" rows=\"3\" oninput=\"slInput()\">" + esc(draft.notes || "") + "</textarea>") +
      "<button type=\"button\" class=\"btn sl-go\" id=\"slSend\" onclick=\"slSubmit(event)\"" + (ctx.saving ? " disabled" : "") + ">" + esc(label("Send to sales", lang)) + "</button></form>";
  }
  function reasonText(code, lang) {
    var en = EMAIL_REASON[code];
    return en ? label(en, lang) : "";
  }
  function doneHtml(ctx) {
    var lang = ctx.lang;
    var sent = ctx.emailResult === "sent";
    var flag = sent
      ? "<p class=\"sl-sent\" id=\"slEmailFlag\">" + esc(label("Email sent", lang)) + "</p>"
      : "<p class=\"sl-flag\" id=\"slEmailFlag\">" + esc(label("Email not sent", lang)) + "</p>";
    var why = !sent && ctx.emailReason ? "<p class=\"sl-note\">" + esc(reasonText(ctx.emailReason, lang)) + "</p>" : "";
    var list = ctx.canManage ? "<button type=\"button\" class=\"btn2\" onclick=\"go('sleads')\">" + esc(label("See sales leads", lang)) + "</button>" : "";
    return "<div class=\"raw sl\" id=\"slDone\"><h2>" + esc(label("Lead saved", lang)) + "</h2><p><b>" + esc(ctx.savedName || "") + "</b></p>" +
      flag + why + "<button type=\"button\" class=\"btn sl-go\" onclick=\"slAgain()\">" + esc(label("Add another lead", lang)) + "</button>" + list + "</div>";
  }
  function emailFlag(row, lang) {
    if (row.emailStatus === "sent") return "<p class=\"sl-sent\">" + esc(label("Email sent", lang)) + "</p>";
    var extra = reasonText(row.emailError, lang);
    return "<p class=\"sl-flag\">" + esc(label("Email not sent", lang)) + (extra ? " " + esc(extra) : "") + "</p>";
  }
  function leadCard(row, ctx) {
    var lang = ctx.lang;
    var needs = (row.needs || []).map(function (need) { return label(need, lang); });
    if (row.needsOther) needs.push(row.needsOther);
    var phone = row.contactPhone ? (telHref(row.contactPhone) ? "<a href=\"" + esc(telHref(row.contactPhone)) + "\">" + esc(row.contactPhone) + "</a>" : esc(row.contactPhone)) : "";
    var email = row.contactEmail ? "<a href=\"mailto:" + esc(row.contactEmail) + "\">" + esc(row.contactEmail) + "</a>" : "";
    var dates = [row.groupStart, row.groupEnd].filter(Boolean).join(" – ");
    var status = STATUSES.map(function (item) {
      var on = row.status === item;
      return "<button type=\"button\" class=\"" + (on ? "on" : "") + "\" aria-pressed=\"" + (on ? "true" : "false") + "\" onclick=\"slStatus('" + esc(row.id) + "','" + item + "')\">" + esc(label(item, lang)) + "</button>";
    }).join("");
    var again = ctx.origin === "supabase" && row.emailStatus !== "sent" && ctx.canManage && /^\d+$/.test(String(row.id))
      ? "<button type=\"button\" class=\"btn2\" onclick=\"slResend('" + esc(row.id) + "')\">" + esc(label("Try email again", lang)) + "</button>"
      : "";
    var fake = row.example ? "<p class=\"sl-note\"><span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span> " + esc(label("Fake contact", lang)) + "</p>" : "";
    var badge = row.respondedAt ? "<p><span class=\"sl-badge\">" + esc(label("Responded", lang)) + "</span></p>" : "";
    var mark = !row.respondedAt && ctx.canManage
      ? "<button type=\"button\" class=\"btn2 sl-respond\" onclick=\"slRespond('" + esc(row.id) + "')\">" + esc(label("Mark responded", lang)) + "</button>"
      : "";
    return "<article class=\"sl-card\" id=\"slLead-" + esc(row.id) + "\">" + fake +
      "<h3>" + esc(row.contactFirst + " " + row.contactLast) + "</h3>" + badge +
      "<p>" + phone + (phone && email ? " · " : "") + email + "</p>" +
      "<p>" + esc(needs.join(", ")) + "</p>" +
      (dates ? "<p>" + esc(dates) + "</p>" : "") +
      (row.notes ? "<p>" + esc(row.notes) + "</p>" : "") +
      "<p class=\"sl-note\">" + esc(label("Filed by", lang)) + " " + esc(row.createdByName || "") + "</p>" +
      emailFlag(row, lang) + "<div class=\"sl-status\" role=\"group\" aria-label=\"" + esc(label("Status", lang)) + "\">" + status + "</div>" + mark + again + "</article>";
  }
  function rollupCardHtml(state, ctx) {
    var lang = ctx.lang;
    if (!ctx.corporate || !state || state.origin === "loading") return "";
    if (state.origin === "error") {
      return "<div class=\"card raw sl\" id=\"slRollup\"><h3>" + esc(label("Sales Leads by Hotel", lang)) + "</h3><p class=\"sl-err\">" + esc(label("Couldn't load sales leads.", lang)) + "</p></div>";
    }
    var rows = rollupRows(state, HOTELS);
    var body = rows.map(function (row) {
      return "<tr><td>" + esc(row.hotel) + "</td><td>" + esc(String(row.total)) + "</td><td>" + esc(String(row.responded)) + "</td><td>" + esc(String(row.awaiting)) + "</td><td>" + esc(formatHours(row.avgHours)) + "</td></tr>";
    }).join("");
    var headers = ["Hotel", "Leads", "Responded", "Waiting", "Avg response hrs"].map(function (key) {
      return "<th>" + esc(label(key, lang)) + "</th>";
    }).join("");
    var sample = state.origin === "example" ? "<p class=\"sl-note\"><span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span> " + esc(label("Sample leads for this demo. Fake contacts only.", lang)) + "</p>" : "";
    return "<div class=\"card raw sl\" id=\"slRollup\"><h3>" + esc(label("Sales Leads by Hotel", lang)) + "</h3>" + sample +
      "<div class=\"sl-roll\"><table class=\"sl-t fit\"><thead><tr>" + headers + "</tr></thead><tbody>" + body + "</tbody></table></div></div>";
  }
  function settingsHtml(routes, ctx) {
    var lang = ctx.lang;
    if (!ctx.canManage) return "";
    var saved = routes[ctx.hotel] || [];
    if (!ctx.canConfigure) {
      var shown = saved.length ? saved.map(esc).join(", ") : esc(label("No sales manager email yet.", lang));
      return "<section class=\"card\" id=\"slSettings\"><h3>" + esc(label("Sales manager emails", lang)) + "</h3><p>" + shown + "</p></section>";
    }
    var draft = ctx.routeDraft && ctx.routeDraft.length ? ctx.routeDraft : (saved.length ? saved.slice() : [""]);
    var inputs = draft.map(function (email, i) {
      return "<input id=\"slMail" + i + "\" type=\"email\" maxlength=\"120\" autocomplete=\"off\" value=\"" + esc(email) + "\" oninput=\"slRouteInput()\" placeholder=\"name@example.test\">";
    }).join("");
    var demo = ctx.origin !== "supabase" ? "<p class=\"sl-note\">" + esc(label("Saved on this device. No email is sent from the demo.", lang)) + "</p>" : "";
    var open = ctx.settingsOpen ? "" : " hidden";
    return "<section class=\"card\" id=\"slSettings\"><button type=\"button\" class=\"btn2\" id=\"slSettingsBtn\" onclick=\"slSettings(" + (ctx.settingsOpen ? "0" : "1") + ")\">" +
      esc(label("Sales manager emails", lang)) + "</button><div id=\"slSettingsBody\"" + open + ">" +
      "<p class=\"sl-note\">" + esc(label("One address per line. Up to five. GM and JR Corporate can change these.", lang)) + "</p>" +
      "<p class=\"sl-note\">" + esc(label("Jay sets the Supabase secrets HOTELHQ_GMAIL_USER and HOTELHQ_GMAIL_APP_PASSWORD. Do not put a real address in the public repo.", lang)) + "</p>" +
      demo + inputs +
      "<button type=\"button\" class=\"btn2\" onclick=\"slRouteAdd()\">" + esc(label("Add email", lang)) + "</button>" +
      "<button type=\"button\" class=\"btn\" id=\"slSaveEmails\" onclick=\"slSaveEmails()\">" + esc(label("Save emails", lang)) + "</button></div></section>";
  }
  function listHtml(state, ctx) {
    var lang = ctx.lang;
    if (state.origin === "loading") return "<div class=\"raw sl\" id=\"slList\"><h2>" + esc(label("Sales Leads", lang)) + "</h2><p>" + esc(label("Loading sales leads…", lang)) + "</p></div>";
    if (state.origin === "error") return "<div class=\"raw sl\" id=\"slList\"><h2>" + esc(label("Sales Leads", lang)) + "</h2><p class=\"sl-err\">" + esc(label("Couldn't load sales leads.", lang)) + "</p></div>";
    var filters = ["All"].concat(STATUSES).map(function (item) {
      var on = ctx.filter === item;
      return "<button type=\"button\" class=\"" + (on ? "on" : "") + "\" aria-pressed=\"" + (on ? "true" : "false") + "\" onclick=\"slFilter('" + item + "')\">" + esc(label(item, lang)) + "</button>";
    }).join("");
    var rows = (state.leads || []).filter(function (row) {
      return row.hotel === ctx.hotel && (ctx.filter === "All" || row.status === ctx.filter);
    });
    var cards = rows.map(function (row) { return leadCard(row, ctx); }).join("");
    var empty = cards ? "" : "<p id=\"slEmpty\">" + esc(label("No sales leads yet.", lang)) + "</p>";
    var sample = state.origin === "example" ? "<p class=\"sl-note\"><span class=\"ex\">" + esc(label("EXAMPLE", lang)) + "</span> " + esc(label("Sample leads for this demo. Fake contacts only.", lang)) + "</p>" : "";
    var err = ctx.error ? "<p class=\"sl-err\">" + esc(label(ERRORS[ctx.error] || ERRORS.save, lang)) + "</p>" : "";
    var file = ctx.canCapture ? "<button type=\"button\" class=\"btn sl-go\" onclick=\"slOpen()\">" + esc(label("Sales Lead", lang)) + "</button>" : "";
    return "<div class=\"raw sl\" id=\"slList\"><h2>" + esc(label("Sales Leads", lang)) + "</h2>" + sample + err + file +
      settingsHtml(state.routes || blankRoutes(), ctx) +
      "<div class=\"sl-filters\">" + filters + "</div>" + empty + cards + "</div>";
  }
  function homeCardHtml(state, ctx) {
    var roll = rollupCardHtml(state, ctx);
    var view = ctx.viewRole;
    var showButton = ctx.canCapture && (view === "GM" || view === "Front Desk" || view === "AGM");
    var showCount = ctx.canManage && (view === "GM" || view === "Sales Manager");
    if ((!showButton && !showCount) || !ctx.hotel || !state || state.origin === "loading") return roll;
    var button = showButton ? "<button type=\"button\" class=\"btn sl-go\" id=\"slCapture\" onclick=\"slOpen()\">" + esc(label("Sales Lead", ctx.lang)) + "</button>" : "";
    var count = showCount ? "<button type=\"button\" class=\"sl-count\" id=\"slWeek\" onclick=\"go('sleads')\"><b>" + countNewThisWeek(state.leads || [], ctx.hotel, ctx.now) + "</b><span>" + esc(label("New leads this week", ctx.lang)) + "</span></button>" : "";
    var sample = state.origin === "example" && showCount ? "<p class=\"sl-note\"><span class=\"ex\">" + esc(label("EXAMPLE", ctx.lang)) + "</span> " + esc(label("Sample leads for this demo. Fake contacts only.", ctx.lang)) + "</p>" : "";
    var pair = !!(button && count);
    return roll + "<div class=\"card raw sl" + (pair ? " sl-pair" : "") + "\" id=\"slHome\">" + button + count + sample + "</div>";
  }

  var api = {
    HOTELS: HOTELS,
    NEEDS: NEEDS,
    STATUSES: STATUSES,
    PHRASES: PHRASES,
    label: label,
    canCapture: canCapture,
    canManage: canManage,
    canConfigure: canConfigure,
    chicagoDate: chicagoDate,
    weekStart: weekStart,
    inThisWeek: inThisWeek,
    countNewThisWeek: countNewThisWeek,
    subjectLine: subjectLine,
    validateLead: validateLead,
    cleanEmails: cleanEmails,
    buildDemo: buildDemo,
    mapLead: mapLead,
    mapRollup: mapRollup,
    rollup: rollup,
    formatHours: formatHours,
    formHtml: formHtml,
    listHtml: listHtml,
    rollupCardHtml: rollupCardHtml,
    homeCardHtml: homeCardHtml,
    telHref: telHref,
    waitingLeads: waitingLeads
  };
  root.SalesLeads = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  var KEY = "jrportal_sales_leads_v1";
  var mem = null;
  var ui = {
    screen: "form",
    draft: blankDraft(),
    error: "",
    emailWarn: false,
    emailResult: "",
    emailReason: "",
    savedName: "",
    filter: "All",
    settingsOpen: false,
    routeDraft: null,
    saving: false,
    remoteState: ""
  };

  function L(en) { return label(en, langNow()); }
  function langNow() { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; }
  function nowISO() { return new Date().toISOString(); }
  function actorNow() {
    var role = "";
    var hotel = "";
    var name = "";
    try { role = authRole(); } catch (e) { role = ""; }
    try {
      var user = meUser();
      if (user) {
        if (user.hotel) hotel = user.hotel;
        name = user.name || "";
      }
    } catch (e2) { hotel = ""; }
    if (!hotel && typeof S !== "undefined" && S.hotel) hotel = S.hotel;
    return { role: role, hotel: hotel || "", name: name || "" };
  }
  function hotelNow(actor) {
    var header = (typeof S !== "undefined" && S.hotel) || "";
    if (normRole(actor.role) === "Above Property" && HOTEL_OK[header]) return header;
    if (HOTEL_OK[actor.hotel]) return actor.hotel;
    if (HOTEL_OK[header]) return header;
    return "";
  }
  function viewRole() {
    try { return S.role || ""; } catch (e) { return ""; }
  }
  function remoteOn() {
    return typeof useRemote === "function" && !!useRemote() && typeof sb !== "undefined" && sb;
  }
  function readStore() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.demoVersion !== 1 || !data.leads || !data.routes) return null;
      return { origin: "example", routes: data.routes, leads: data.leads };
    } catch (e) { return null; }
  }
  function writeStore(state) {
    try { localStorage.setItem(KEY, JSON.stringify({ demoVersion: 1, routes: state.routes, leads: state.leads })); } catch (e) {}
  }
  function rpcCode(error) {
    var msg = String((error && (error.message || error.details)) || error || "");
    var keys = ["sl_name", "sl_contact", "sl_phone", "sl_email", "sl_needs", "sl_other", "sl_dates", "sl_notes", "sl_hotel", "sl_role", "sl_emails", "sl_status"];
    var i;
    for (i = 0; i < keys.length; i++) if (msg.indexOf(keys[i]) >= 0) return keys[i].replace(/^sl_/, "");
    return "save";
  }
  var LEAD_COLS = "id,hotel,created_by_name,contact_first,contact_last,contact_phone,contact_email,needs,needs_other,group_start,group_end,notes,status,email_status,email_error,created_at,updated_at,responded_at,responded_by";
  var LEAD_COLS_BASE = "id,hotel,created_by_name,contact_first,contact_last,contact_phone,contact_email,needs,needs_other,group_start,group_end,notes,status,email_status,email_error,created_at,updated_at";
  function failRemote() {
    ui.remoteState = "error";
    mem = { origin: "error", routes: blankRoutes(), leads: [] };
    render();
  }
  function applyRemote(leadRows, routeRows, rollRows) {
    mem = {
      origin: "supabase",
      routes: mapRoutes(routeRows || []),
      leads: (leadRows || []).map(mapLead),
      rollup: rollRows ? rollRows.map(mapRollup) : null
    };
    ui.remoteState = "ready";
    render();
  }
  function ensureRemote() {
    if (!remoteOn() || ui.remoteState === "loading" || ui.remoteState === "ready" || ui.remoteState === "error") return;
    ui.remoteState = "loading";
    Promise.all([
      sb.from("sales_leads").select(LEAD_COLS).order("created_at", { ascending: false }).limit(200),
      sb.from("sales_lead_routes").select("hotel,emails"),
      sb.from("sales_lead_rollup").select("hotel,total_leads,responded,awaiting,avg_hours")
    ]).then(function (res) {
      var leadErr = res[0].error;
      var missing = leadErr && /responded_(at|by)/i.test(String(leadErr.message || leadErr.details || ""));
      if (missing) {
        sb.from("sales_leads").select(LEAD_COLS_BASE).order("created_at", { ascending: false }).limit(200).then(function (again) {
          if (again.error) { failRemote(); return; }
          applyRemote(again.data, res[1].error ? [] : res[1].data, null);
        }, failRemote);
        return;
      }
      if (leadErr) { failRemote(); return; }
      applyRemote(res[0].data, res[1].error ? [] : res[1].data, res[2].error ? null : res[2].data);
    }, failRemote);
  }
  function current() {
    if (remoteOn()) {
      if (!mem || mem.origin === "example") mem = null;
      ensureRemote();
      if (!mem) mem = { origin: "loading", routes: blankRoutes(), leads: [] };
      return mem;
    }
    if (mem && mem.origin === "example") return mem;
    mem = readStore() || buildDemo(nowISO());
    return mem;
  }
  api.currentState = function () { return current(); };
  function commit(next) {
    mem = next;
    if (!remoteOn() && next.origin === "example") writeStore(next);
    render();
  }
  function ctxFor(actor, state) {
    var hotel = hotelNow(actor);
    return {
      lang: langNow(),
      hotel: hotel,
      hotelLabel: HOTEL_LABEL[hotel] || hotel,
      staffName: actor.name,
      corporate: normRole(actor.role) === "Above Property",
      canCapture: canCapture(actor.role),
      canManage: canManage(actor.role),
      canConfigure: canConfigure(actor.role),
      viewRole: viewRole(),
      now: nowISO(),
      origin: state ? state.origin : "",
      error: ui.error,
      emailWarn: ui.emailWarn,
      emailResult: ui.emailResult,
      emailReason: ui.emailReason,
      savedName: ui.savedName,
      filter: ui.filter,
      settingsOpen: ui.settingsOpen,
      routeDraft: ui.routeDraft,
      saving: ui.saving
    };
  }
  function val(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value : (fallback || "");
  }
  function readDraft() {
    var prev = ui.draft || blankDraft();
    return {
      first: val("slFirst", prev.first),
      last: val("slLast", prev.last),
      phone: val("slPhone", prev.phone),
      email: val("slEmail", prev.email),
      needs: (prev.needs || []).slice(),
      other: val("slOther", prev.other),
      start: val("slStart", prev.start),
      end: val("slEnd", prev.end),
      notes: val("slNotes", prev.notes)
    };
  }
  function readRoute() {
    var rows = [];
    var i = 0;
    var el = document.getElementById("slMail0");
    if (!el) return (ui.routeDraft || [""]).slice();
    while (document.getElementById("slMail" + i)) {
      rows.push(document.getElementById("slMail" + i).value);
      i++;
    }
    return rows;
  }
  function pageForm(actor) {
    var state = current();
    var ctx = ctxFor(actor, state);
    if (!ctx.canCapture) return "<div class=\"raw sl\"><h2>" + esc(L("Sales Lead")) + "</h2></div>";
    if (ui.screen === "done") return doneHtml(ctx);
    return formHtml(ui.draft || blankDraft(), ctx);
  }
  function pageList(actor) {
    var state = current();
    var ctx = ctxFor(actor, state);
    if (!ctx.canManage) return "<div class=\"raw sl\" id=\"slList\"><h2>" + esc(L("Sales Leads")) + "</h2></div>";
    return listHtml(state, ctx);
  }
  function finishSaved(value, result, reason) {
    ui.saving = false;
    ui.screen = "done";
    ui.error = "";
    ui.emailWarn = false;
    ui.emailResult = result === "sent" ? "sent" : "not_sent";
    ui.emailReason = reason || "";
    ui.savedName = value.contactFirst + " " + value.contactLast;
    ui.draft = blankDraft();
  }
  function reloadRemote() {
    ui.remoteState = "";
    mem = null;
    ensureRemote();
  }

  root.slInput = function () { ui.draft = readDraft(); };
  root.slEmailBlur = function () {
    ui.draft = readDraft();
    ui.emailWarn = !!(ui.draft.email && !isEmail(ui.draft.email));
    var el = document.getElementById("slEmailWarn");
    var hint = document.getElementById("slEmailHint");
    if (ui.emailWarn && !el && hint) {
      hint.insertAdjacentHTML("afterend", "<p class=\"sl-err\" id=\"slEmailWarn\">" + esc(L(ERRORS.email)) + "</p>");
    } else if (!ui.emailWarn && el) el.remove();
  };
  root.slNeed = function (need) {
    if (NEEDS.indexOf(need) < 0) return;
    ui.draft = readDraft();
    var at = ui.draft.needs.indexOf(need);
    if (at >= 0) ui.draft.needs.splice(at, 1);
    else ui.draft.needs.push(need);
    render();
  };
  root.slOpen = function () {
    ui.screen = "form";
    ui.draft = blankDraft();
    ui.error = "";
    ui.emailWarn = false;
    ui.emailResult = "";
    ui.emailReason = "";
    if (typeof go === "function") go("slead");
    else render();
  };
  root.slAgain = function () {
    ui.screen = "form";
    ui.draft = blankDraft();
    ui.error = "";
    ui.emailWarn = false;
    render();
  };
  root.slFilter = function (filter) {
    if (["All"].concat(STATUSES).indexOf(filter) < 0) return;
    ui.filter = filter;
    ui.error = "";
    render();
  };
  root.slSettings = function (open) {
    var actor = actorNow();
    if (!canConfigure(actor.role)) return;
    ui.routeDraft = readRoute();
    ui.settingsOpen = !!open;
    if (open) {
      var saved = (current().routes || blankRoutes())[hotelNow(actor)] || [];
      if (!ui.routeDraft || !ui.routeDraft.join("").trim()) ui.routeDraft = saved.length ? saved.slice() : [""];
    }
    render();
  };
  root.slRouteInput = function () { ui.routeDraft = readRoute(); };
  root.slRouteAdd = function () {
    if (!canConfigure(actorNow().role)) return;
    var rows = readRoute();
    if (rows.length >= 5) return;
    rows.push("");
    ui.routeDraft = rows;
    ui.settingsOpen = true;
    render();
  };
  root.slSaveEmails = function () {
    var actor = actorNow();
    var hotel = hotelNow(actor);
    if (!canConfigure(actor.role) || !hotel) return;
    var cleaned = cleanEmails(readRoute());
    if (!cleaned.ok) { ui.error = "emails"; ui.settingsOpen = true; render(); return; }
    var state = current();
    if (remoteOn() && state.origin === "supabase") {
      ui.saving = true;
      render();
      sb.rpc("set_sales_lead_emails", { p_hotel: hotel, p_emails: cleaned.emails }).then(function (r) {
        ui.saving = false;
        ui.settingsOpen = true;
        if (r.error) { ui.error = rpcCode(r.error); render(); return; }
        ui.error = "";
        ui.routeDraft = cleaned.emails.length ? cleaned.emails.slice() : [""];
        reloadRemote();
      }, function () { ui.saving = false; ui.error = "save"; render(); });
      return;
    }
    var routes = {};
    HOTELS.forEach(function (code) { routes[code] = (state.routes[code] || []).slice(); });
    routes[hotel] = cleaned.emails;
    ui.error = "";
    ui.settingsOpen = true;
    ui.routeDraft = cleaned.emails.length ? cleaned.emails.slice() : [""];
    commit({ origin: "example", routes: routes, leads: state.leads });
  };
  root.slRespond = function (id) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(id))) return;
    var actor = actorNow();
    if (!canManage(actor.role) || !cleanName(actor.name)) return;
    var state = current();
    var row = null;
    state.leads.forEach(function (item) { if (String(item.id) === String(id)) row = item; });
    if (!row || row.respondedAt || row.hotel !== hotelNow(actor)) return;
    if (remoteOn() && state.origin === "supabase") {
      if (!/^\d+$/.test(String(id))) return;
      sb.rpc("mark_sales_lead_responded", { p_id: Number(id), p_name: cleanName(actor.name) }).then(function (r) {
        if (r.error) { ui.error = rpcCode(r.error); render(); return; }
        ui.error = "";
        reloadRemote();
      }, function () { ui.error = "save"; render(); });
      return;
    }
    var at = nowISO();
    var leads = state.leads.map(function (item) {
      if (String(item.id) !== String(id)) return item;
      var copy = {};
      var key;
      for (key in item) copy[key] = item[key];
      copy.respondedAt = at;
      copy.respondedBy = cleanName(actor.name);
      copy.updatedAt = at;
      return copy;
    });
    ui.error = "";
    commit({ origin: state.origin, routes: state.routes, leads: leads });
  };
  root.slStatus = function (id, status) {
    if (STATUSES.indexOf(status) < 0 || !/^[A-Za-z0-9_-]{1,40}$/.test(String(id))) return;
    var actor = actorNow();
    if (!canManage(actor.role)) return;
    var state = current();
    var row = null;
    state.leads.forEach(function (item) { if (String(item.id) === String(id)) row = item; });
    if (!row || row.hotel !== hotelNow(actor)) return;
    if (remoteOn() && state.origin === "supabase") {
      sb.rpc("set_sales_lead_status", { p_id: Number(id), p_status: status }).then(function (r) {
        if (r.error) { ui.error = rpcCode(r.error); render(); return; }
        ui.error = "";
        reloadRemote();
      }, function () { ui.error = "save"; render(); });
      return;
    }
    var leads = state.leads.map(function (item) {
      if (String(item.id) !== String(id)) return item;
      var copy = {};
      var key;
      for (key in item) copy[key] = item[key];
      copy.status = status;
      copy.updatedAt = nowISO();
      return copy;
    });
    ui.error = "";
    commit({ origin: state.origin, routes: state.routes, leads: leads });
  };
  root.slResend = function (id) {
    if (!/^\d+$/.test(String(id)) || !remoteOn() || !canManage(actorNow().role)) return;
    sb.functions.invoke("sales-lead-email", { body: { id: Number(id), retry: true } }).then(function () {
      reloadRemote();
    }, function () { reloadRemote(); });
  };
  root.slSubmit = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    if (ui.saving) return;
    var actor = actorNow();
    var hotel = hotelNow(actor);
    if (!canCapture(actor.role)) { ui.error = "role"; render(); return; }
    ui.draft = readDraft();
    var checked = validateLead({
      hotel: hotel,
      first: ui.draft.first,
      last: ui.draft.last,
      phone: ui.draft.phone,
      email: ui.draft.email,
      needs: ui.draft.needs,
      other: ui.draft.other,
      start: ui.draft.start,
      end: ui.draft.end,
      notes: ui.draft.notes
    });
    if (!checked.ok) {
      ui.error = checked.error;
      ui.emailWarn = checked.error === "email";
      render();
      return;
    }
    var value = checked.value;
    var state = current();
    if (remoteOn() && state.origin !== "error") {
      ui.saving = true;
      ui.error = "";
      render();
      sb.rpc("save_sales_lead", {
        p_hotel: hotel,
        p_name: actor.name,
        p_first: value.contactFirst,
        p_last: value.contactLast,
        p_phone: value.contactPhone || null,
        p_email: value.contactEmail || null,
        p_needs: value.needs,
        p_other: value.needsOther || null,
        p_group_start: value.groupStart || null,
        p_group_end: value.groupEnd || null,
        p_notes: value.notes || null
      }).then(function (r) {
        if (r.error || r.data == null) {
          ui.saving = false;
          ui.error = rpcCode(r.error);
          render();
          return;
        }
        sb.functions.invoke("sales-lead-email", { body: { id: r.data } }).then(function (sent) {
          var data = sent && sent.data;
          finishSaved(value, data && data.email === "sent" ? "sent" : "not_sent", data && data.reason);
          reloadRemote();
          render();
        }, function () {
          finishSaved(value, "not_sent", "provider");
          reloadRemote();
          render();
        });
      }, function () {
        ui.saving = false;
        ui.error = "save";
        render();
      });
      return;
    }
    var row = {
      id: "local-" + Date.now(),
      hotel: hotel,
      example: false,
      createdByName: actor.name,
      contactFirst: value.contactFirst,
      contactLast: value.contactLast,
      contactPhone: value.contactPhone,
      contactEmail: value.contactEmail,
      needs: value.needs,
      needsOther: value.needsOther,
      groupStart: value.groupStart,
      groupEnd: value.groupEnd,
      notes: value.notes,
      status: "New",
      emailStatus: "failed",
      emailError: "demo",
      createdAt: nowISO(),
      updatedAt: nowISO(),
      respondedAt: "",
      respondedBy: ""
    };
    finishSaved(value, "not_sent", "demo");
    commit({ origin: "example", routes: state.routes || blankRoutes(), leads: [row].concat(state.leads || []) });
  };

  if (typeof M !== "undefined") {
    M.slead = ["🤝", "Sales Lead"];
    M.sleads = ["📋", "Sales Leads"];
  }
  if (typeof I18N !== "undefined" && I18N.es) {
    I18N.es["Sales Lead"] = PHRASES["Sales Lead"];
    I18N.es["Sales Leads"] = PHRASES["Sales Leads"];
  }
  if (typeof V !== "undefined") {
    V.slead = function () { return pageForm(actorNow()); };
    V.sleads = function () { return pageList(actorNow()); };
  }
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try { card = homeCardHtml(current(), ctxFor(actorNow(), current())); } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var who = "";
      try { who = authRole(); } catch (e) { who = ""; }
      if (canCapture(who) && (role === "Front Desk" || role === "GM" || role === "AGM") && list.indexOf("slead") < 0) list.unshift("slead");
      if (canManage(who) && (role === "GM" || role === "Sales Manager") && list.indexOf("sleads") < 0) list.splice(Math.min(1, list.length), 0, "sleads");
      return list;
    };
  }
  if (typeof go === "function") {
    var prevGo = go;
    root.go = function (tab) {
      if (tab === "slead" && typeof S !== "undefined" && S.tab !== "slead") {
        ui.screen = "form";
        ui.draft = blankDraft();
        ui.error = "";
        ui.emailWarn = false;
        ui.emailResult = "";
      }
      return prevGo.apply(this, arguments);
    };
  }
  try { if (typeof RSEC !== "undefined") { RSEC[2][2].push("slead"); RSEC[2][2].push("sleads"); } } catch (e) {}
  try { if (typeof NOCOLS !== "undefined") { if (NOCOLS.indexOf("slead") < 0) NOCOLS.push("slead"); if (NOCOLS.indexOf("sleads") < 0) NOCOLS.push("sleads"); } } catch (e2) {}
  try { if (typeof RQL !== "undefined") { RQL.slead = ["Sales lead", "Prospecto de ventas"]; RQL.sleads = ["Sales leads", "Prospectos de ventas"]; } } catch (e3) {}

  var style = document.createElement("style");
  style.textContent = [
    ".sl-go{width:100%;min-height:64px;font-size:20px;font-weight:800;margin-top:8px}",
    "#slHome.sl-pair{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}",
    "#slHome.sl-pair .sl-go{flex:1.2;min-height:52px;font-size:17px;margin:0}",
    "#slHome.sl-pair .sl-count{flex:1;margin:0}",
    "#slHome.sl-pair .sl-note{flex-basis:100%}",
    ".sl-count{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#eef3fa;border:0;border-radius:12px;padding:8px 12px;margin-top:8px}",
    ".sl-count b{font-size:22px;color:#14365d;min-width:1.2em}",
    ".sl-count span{font-weight:700}",
    ".sl-field{display:flex;flex-direction:column;gap:4px;font-weight:700;margin:8px 0}",
    ".sl-field input,.sl-field textarea,.sl-field select{width:100%;font-size:16px}",
    ".sl-lock{display:flex;justify-content:space-between;gap:8px;margin:4px 0}",
    ".sl-lock span{color:#3c4658}",
    ".sl-hint{margin:0 0 8px;color:#14365d;font-weight:700}",
    ".sl-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".sl-err{color:#c0262d;font-weight:700}",
    ".sl-label{font-weight:700;margin:10px 0 4px}",
    ".sl-needs{display:flex;flex-direction:column;gap:8px}",
    ".sl-needs button{width:100%;text-align:left;background:#e6ebf2;border:2px solid transparent;font-weight:700;min-height:48px}",
    ".sl-needs button.on{background:#14365d;color:#fff;border-color:#14365d}",
    ".sl-dates{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".sl-flag{background:#fde2e1;color:#8a1c1c;border-radius:10px;padding:10px;font-weight:800}",
    ".sl-sent{background:#d4f5dc;color:#15642f;border-radius:10px;padding:10px;font-weight:800}",
    ".sl-card{border:1px solid #e1e6ee;border-radius:12px;padding:10px;margin:0 0 10px;background:#fff}",
    ".sl-card h3{margin:0 0 4px}",
    ".sl-badge{display:inline-block;background:#d4f5dc;color:#15642f;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:800}",
    ".sl-roll{overflow-x:auto}",
    ".sl-t{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}",
    ".sl-t th,.sl-t td{text-align:left;padding:6px 4px;border-bottom:1px solid #e1e6ee}",
    ".sl-t th{white-space:normal;font-weight:700;vertical-align:bottom}",
    ".sl-t td{white-space:nowrap;font-weight:700}",
    ".sl-respond{width:100%;margin-top:8px}",
    ".sl-card a{color:#14365d}",
    ".sl-status{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}",
    ".sl-status button{flex:1 1 40%;min-height:44px;background:#e6ebf2;border:0;font-weight:700}",
    ".sl-status button.on{background:#14365d;color:#fff}",
    ".sl-filters{display:flex;gap:6px;overflow-x:auto;margin:8px 0}",
    ".sl-filters button{flex:0 0 auto;background:#e6ebf2;border:0;font-weight:700}",
    ".sl-filters button.on{background:#14365d;color:#fff}",
    "#slSettings input{width:100%;margin:0 0 8px}",
    "#slSettings .btn,#slSettings .btn2{width:100%;margin-top:8px}"
  ].join("");
  document.head.appendChild(style);
  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try {
        var roll = document.getElementById("slRollup");
        var card = document.getElementById("slHome");
        var app = document.getElementById("app");
        if (!app || typeof S === "undefined" || S.tab !== "home") return result;
        if (document.getElementById("hhqFocus")) return result;
        if (roll && app.firstChild !== roll) app.insertAdjacentElement("afterbegin", roll);
        if (card && card.previousElementSibling !== roll) {
          if (roll && roll.parentNode === app) roll.insertAdjacentElement("afterend", card);
          else if (app.firstChild !== card) app.insertAdjacentElement("afterbegin", card);
        }
      } catch (e) {}
      return result;
    };
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
