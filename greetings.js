/* Holiday greetings for every home screen.
   Dates are America/Chicago calendar days. Easter is computed.
   National Housekeeping Week is the second Sunday-through-Saturday week
   that sits entirely inside September.
   A birthday or work anniversary is shown to that person, and the GM home
   gets one line for the hotel. Demo names are example staff, labeled EXAMPLE. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var HK = {
    Housekeeping: 1, Housekeeper: 1, "House Person": 1, "Laundry Attendant": 1,
    hk_lead: 1, housekeeper: 1, house_person: 1, laundry: 1
  };
  var ROLE = {
    GM: "GM", gm: "GM", AGM: "AGM", agm: "AGM",
    "Above Property": "Above Property", above_property: "Above Property", "JR Corporate": "Above Property",
    Housekeeping: "Housekeeping", Housekeeper: "Housekeeper", "House Person": "House Person", "Laundry Attendant": "Laundry Attendant"
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function isLeap(year) { return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0; }
  function chicagoDate(value) {
    var s = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(d);
  }
  function parts(day) {
    return { y: +day.slice(0, 4), m: +day.slice(5, 7), d: +day.slice(8, 10) };
  }
  function nthWeekday(year, month, weekday, n) {
    var first = new Date(Date.UTC(year, month - 1, 1));
    var delta = (weekday - first.getUTCDay() + 7) % 7;
    return iso(year, month, 1 + delta + (n - 1) * 7);
  }
  function lastWeekday(year, month, weekday) {
    var last = new Date(Date.UTC(year, month, 0));
    var delta = (last.getUTCDay() - weekday + 7) % 7;
    return iso(year, month, last.getUTCDate() - delta);
  }
  function easter(year) {
    var a = year % 19;
    var b = Math.floor(year / 100);
    var c = year % 100;
    var d = Math.floor(b / 4);
    var e = b % 4;
    var f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4);
    var k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return iso(year, month, day);
  }
  function housekeepingWeek(year) {
    var sundays = [];
    var d;
    for (d = 1; d <= 24; d++) {
      if (new Date(Date.UTC(year, 8, d)).getUTCDay() === 0) sundays.push(d);
    }
    var start = sundays[1];
    return { start: iso(year, 9, start), end: iso(year, 9, start + 6) };
  }
  function span(id, start, end, emoji, color, titleEn, titleEs, bodyEn, bodyEs, extra) {
    return {
      id: id, start: start, end: end, emoji: emoji, color: color,
      titleEn: titleEn, titleEs: titleEs, bodyEn: bodyEn, bodyEs: bodyEs,
      housekeeping: !!(extra && extra.housekeeping)
    };
  }
  function holidaysFor(year) {
    var week = housekeepingWeek(year);
    var e = easter(year);
    return [
      span("new-year", iso(year, 1, 1), iso(year, 1, 1), "🎉", "#14365d", "Happy New Year", "¡Feliz Año Nuevo", "A fresh start for the whole hotel.", "Un comienzo nuevo para todo el hotel."),
      span("valentine", iso(year, 2, 14), iso(year, 2, 14), "💝", "#a33b6b", "Happy Valentine's Day", "Feliz Día de San Valentín", "Share a little kindness today.", "Comparte un poco de amabilidad hoy."),
      span("patrick", iso(year, 3, 17), iso(year, 3, 17), "☘️", "#15642f", "Happy St. Patrick's Day", "Feliz Día de San Patricio", "A bit of green for the team.", "Un poco de verde para el equipo."),
      span("easter", e, e, "🐣", "#7a6a2f", "Happy Easter", "Feliz Pascua", "Hope the day is bright.", "Que el día sea luminoso."),
      span("cinco", iso(year, 5, 5), iso(year, 5, 5), "🎉", "#15642f", "Happy Cinco de Mayo", "Feliz Cinco de Mayo", "A festive hello from the desk.", "Un saludo festivo desde recepción."),
      span("mothers", nthWeekday(year, 5, 0, 2), nthWeekday(year, 5, 0, 2), "🌷", "#a33b6b", "Happy Mother's Day", "Feliz Día de las Madres", "A warm day for the moms on our team.", "Un día cálido para las mamás del equipo."),
      span("memorial", lastWeekday(year, 5, 1), lastWeekday(year, 5, 1), "🇺🇸", "#14365d", "Memorial Day", "Día de los Caídos", "We remember those who served.", "Recordamos a quienes sirvieron."),
      span("fathers", nthWeekday(year, 6, 0, 3), nthWeekday(year, 6, 0, 3), "💙", "#14365d", "Happy Father's Day", "Feliz Día de los Padres", "A warm day for the dads on our team.", "Un día cálido para los papás del equipo."),
      span("juneteenth", iso(year, 6, 19), iso(year, 6, 19), "✊", "#14365d", "Juneteenth", "Juneteenth", "Freedom Day. We honor it together.", "Día de la libertad. Lo honramos juntos."),
      span("july4", iso(year, 7, 4), iso(year, 7, 4), "🎆", "#14365d", "Happy 4th of July", "Feliz 4 de julio", "Have a bright, safe holiday.", "Que sea un feriado luminoso y seguro."),
      span("labor", nthWeekday(year, 9, 1, 1), nthWeekday(year, 9, 1, 1), "💪", "#a15c00", "Happy Labor Day", "Feliz Día del Trabajo", "Thank you for the work you do.", "Gracias por el trabajo que haces."),
      span("housekeeping", week.start, week.end, "🧹", "#7a4e9a", "National Housekeeping Week", "Semana Nacional de Ama de Llaves", "Thank you to our housekeeping team.", "Gracias a nuestro equipo de ama de llaves.", { housekeeping: true }),
      span("halloween", iso(year, 10, 31), iso(year, 10, 31), "🎃", "#e07a1f", "Happy Halloween", "Feliz Halloween", "Have a fun, safe night.", "Que sea una noche divertida y segura."),
      span("muertos", iso(year, 11, 1), iso(year, 11, 2), "🌼", "#c45c26", "Día de los Muertos", "Día de los Muertos", "We remember with color and care.", "Recordamos con color y cuidado."),
      span("veterans", iso(year, 11, 11), iso(year, 11, 11), "🎖️", "#14365d", "Veterans Day", "Día de los Veteranos", "Thank you to those who served.", "Gracias a quienes sirvieron."),
      span("thanksgiving", nthWeekday(year, 11, 4, 4), nthWeekday(year, 11, 4, 4), "🦃", "#a15c00", "Happy Thanksgiving", "Feliz Día de Acción de Gracias", "Grateful for this team.", "Agradecidos por este equipo."),
      span("christmas-eve", iso(year, 12, 24), iso(year, 12, 24), "🌟", "#15642f", "Christmas Eve", "Nochebuena", "A calm night before the holiday.", "Una noche tranquila antes del feriado."),
      span("christmas", iso(year, 12, 25), iso(year, 12, 25), "🎄", "#15642f", "Merry Christmas", "Feliz Navidad", "Warm wishes from the whole hotel.", "Buenos deseos de todo el hotel."),
      span("new-years-eve", iso(year, 12, 31), iso(year, 12, 31), "🥂", "#14365d", "New Year's Eve", "Víspera de Año Nuevo", "See you next year.", "Nos vemos el año que entra.")
    ];
  }
  function onDate(item, day) {
    return !!day && item.start <= day && day <= item.end;
  }
  function monthDay(day) { return day.slice(5); }
  function customOn(row, day) {
    if (!row || row.active === false || !day) return false;
    var start = String(row.start || row.start_on || "");
    var end = String(row.end || row.end_on || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
    if (row.annual) {
      var s = monthDay(start);
      var e = monthDay(end);
      var t = monthDay(day);
      if (s <= e) return t >= s && t <= e;
      return t >= s || t <= e;
    }
    return start <= day && day <= end;
  }
  function holidayBanners(day, role) {
    var year = parts(day).y;
    var hk = !!HK[role] || !!HK[ROLE[role]];
    return holidaysFor(year).filter(function (item) { return onDate(item, day); }).map(function (item) {
      var bodyEn = item.bodyEn;
      var bodyEs = item.bodyEs;
      if (item.housekeeping && hk) {
        bodyEn = "This week we thank you for every room you care for.";
        bodyEs = "Esta semana te damos las gracias por cada cuarto que cuidas.";
      }
      return {
        id: item.id, emoji: item.emoji, color: item.color,
        titleEn: item.titleEn, titleEs: item.titleEs, bodyEn: bodyEn, bodyEs: bodyEs, kind: "holiday"
      };
    });
  }
  function validBirthday(month, day) {
    month = +month;
    day = +day;
    if (!month || !day) return false;
    if (month < 1 || month > 12 || day < 1) return false;
    if (month === 2) return day <= 29;
    if (month === 4 || month === 6 || month === 9 || month === 11) return day <= 30;
    return day <= 31;
  }
  function marksDay(month, day, today) {
    if (!validBirthday(month, day) || !today) return false;
    var p = parts(today);
    if (month === 2 && day === 29 && !isLeap(p.y)) return p.m === 2 && p.d === 28;
    return p.m === month && p.d === day;
  }
  function anniversaryYears(hireDate, today) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(hireDate || "")) || !today) return 0;
    var years = parts(today).y - +hireDate.slice(0, 4);
    if (years < 1) return 0;
    if (!marksDay(+hireDate.slice(5, 7), +hireDate.slice(8, 10), today)) return 0;
    return years;
  }
  function firstName(name) {
    var clean = String(name || "").replace(/\s*\(EX\)\s*/gi, " ").trim();
    return clean.split(/\s+/)[0] || "You";
  }
  function personBanners(person, today) {
    var out = [];
    if (!person) return out;
    var name = firstName(person.name);
    if (marksDay(person.birthMonth, person.birthDay, today)) {
      out.push({
        id: "birthday-" + person.id, emoji: "🎂", color: "#a33b6b", kind: "birthday", example: !!person.example,
        titleEn: "Happy birthday, " + name, titleEs: "¡Feliz cumpleaños, " + name + "!",
        bodyEn: "A little celebration just for you.", bodyEs: "Una pequeña celebración solo para ti."
      });
    }
    var years = anniversaryYears(person.hireDate, today);
    if (years) {
      out.push({
        id: "anniversary-" + person.id, emoji: "🌟", color: "#14365d", kind: "anniversary", example: !!person.example, years: years,
        titleEn: years + (years === 1 ? " year" : " years") + " with us today. Thank you, " + name,
        titleEs: years + (years === 1 ? " año" : " años") + " con nosotros hoy. Gracias, " + name,
        bodyEn: "Glad you are on the team.", bodyEs: "Qué bueno que estés en el equipo."
      });
    }
    return out;
  }
  function celebrationsToday(people, hotel, today) {
    var out = [];
    (people || []).forEach(function (person) {
      if (!person || person.hotel !== hotel) return;
      if (marksDay(person.birthMonth, person.birthDay, today)) {
        out.push({ id: person.id, name: person.name || "", kind: "birthday", example: !!person.example });
      }
      var years = anniversaryYears(person.hireDate, today);
      if (years) out.push({ id: person.id, name: person.name || "", kind: "anniversary", years: years, example: !!person.example });
    });
    out.sort(function (a, b) { return String(a.name).localeCompare(String(b.name)) || a.kind.localeCompare(b.kind); });
    return out;
  }
  function customBanners(rows, hotel, today) {
    return (rows || []).filter(function (row) {
      if (!row || row.active === false) return false;
      if (row.hotel && row.hotel !== hotel) return false;
      return customOn(row, today);
    }).map(function (row) {
      return {
        id: "custom-" + row.id, emoji: row.emoji || "✨", color: row.color || "#14365d", kind: "custom",
        titleEn: row.messageEn || row.message_en || "", titleEs: row.messageEs || row.message_es || "",
        bodyEn: "", bodyEs: ""
      };
    });
  }
  function homeModel(opts) {
    var day = chicagoDate(opts.today);
    var role = opts.role || "";
    var hotel = opts.hotel || "";
    var people = opts.people || [];
    var viewer = null;
    people.forEach(function (person) { if (person && person.id === opts.viewerId) viewer = person; });
    var banners = holidayBanners(day, role).concat(customBanners(opts.custom, hotel, day));
    if (viewer) banners = banners.concat(personBanners(viewer, day));
    return {
      day: day,
      banners: banners,
      celebrations: opts.gmView ? celebrationsToday(people, hotel, day) : []
    };
  }
  function demoPeople(today) {
    var day = chicagoDate(today);
    var md = day.slice(5);
    var month = +md.slice(0, 2);
    var date = +md.slice(3);
    var hireYear = String(parts(day).y - 4);
    return [
      { id: "mspwe-fd", hotel: "MSPWE", name: "Jordan Lee (EX)", birthMonth: month, birthDay: date, hireDate: "", example: true },
      { id: "mspwe-hk", hotel: "MSPWE", name: "Grace Patel (EX)", birthMonth: null, birthDay: null, hireDate: hireYear + "-" + md, example: true },
      { id: "mspam-fd", hotel: "MSPAM", name: "Kim Nguyen (EX)", birthMonth: month, birthDay: date, hireDate: "", example: true }
    ];
  }
  function dismissKey(day, id) { return day + "|" + id; }

  var api = {
    chicagoDate: chicagoDate,
    easter: easter,
    housekeepingWeek: housekeepingWeek,
    nthWeekday: nthWeekday,
    lastWeekday: lastWeekday,
    holidaysFor: holidaysFor,
    holidayBanners: holidayBanners,
    marksDay: marksDay,
    anniversaryYears: anniversaryYears,
    personBanners: personBanners,
    celebrationsToday: celebrationsToday,
    customOn: customOn,
    homeModel: homeModel,
    demoPeople: demoPeople,
    dismissKey: dismissKey,
    validBirthday: validBirthday
  };
  root.Greetings = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || typeof V === "undefined") return;

  var KEY = "jrportal_greetings_v1";
  var mem = null;
  var ui = { error: "", editing: null };

  function langNow() { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; }
  function L(en, es) { return langNow() === "es" ? es : en; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function nowISO() { return new Date().toISOString(); }
  function actorNow() {
    var role = "";
    var hotel = "";
    var id = "";
    var name = "";
    try { role = authRole(); } catch (e) { role = ""; }
    try {
      var user = meUser();
      if (user) {
        id = user.id || "";
        name = user.name || "";
        hotel = user.hotel || "";
        if (user.birthMonth) role = role;
      }
    } catch (e2) {}
    if (!hotel && typeof S !== "undefined" && S.hotel) hotel = S.hotel;
    return { id: id, role: role, hotel: hotel || "", name: name };
  }
  function normRole(role) { return ROLE[role] || role || ""; }
  function isCorporate(role) { return normRole(role) === "Above Property"; }
  function gmView(actor) {
    var view = "";
    try { view = S.role; } catch (e) { view = ""; }
    var leader = normRole(actor.role) === "GM" || normRole(actor.role) === "AGM" || isCorporate(actor.role);
    return leader && view === "GM";
  }
  function remoteOn() {
    return typeof useRemote === "function" && !!useRemote() && typeof sb !== "undefined" && sb;
  }
  function blankStore() { return { dismiss: {}, custom: [], people: {} }; }
  function readStore() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1) return blankStore();
      data.dismiss = data.dismiss || {};
      data.custom = data.custom || [];
      data.people = data.people || {};
      return data;
    } catch (e) { return blankStore(); }
  }
  function writeStore(data) {
    data.v = 1;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }
  function mapCustom(row) {
    return {
      id: row.id, hotel: row.hotel || "", emoji: row.emoji, color: row.color,
      messageEn: row.message_en, messageEs: row.message_es,
      start: row.start_on, end: row.end_on, annual: !!row.annual, active: row.active !== false
    };
  }
  function mapPerson(row) {
    return {
      id: row.user_id, hotel: row.hotel || "", name: row.display_name || "",
      birthMonth: row.birth_month, birthDay: row.birth_day, hireDate: row.hire_date || "", example: false
    };
  }
  function ensureRemote() {
    if (!remoteOn() || ui.remote === "loading" || ui.remote === "ready" || ui.remote === "error") return;
    ui.remote = "loading";
    Promise.all([
      sb.from("custom_greetings").select("id,hotel,emoji,color,message_en,message_es,start_on,end_on,annual,active"),
      sb.from("staff_celebrations").select("user_id,hotel,display_name,birth_month,birth_day,hire_date")
    ]).then(function (res) {
      if (res[0].error && res[1].error) { ui.remote = "error"; mem = { origin: "error", custom: [], people: [] }; render(); return; }
      mem = {
        origin: "supabase",
        custom: res[0].error ? [] : (res[0].data || []).map(mapCustom),
        people: res[1].error ? [] : (res[1].data || []).map(mapPerson)
      };
      ui.remote = "ready";
      render();
    }, function () { ui.remote = "error"; mem = { origin: "error", custom: [], people: [] }; render(); });
  }
  function bundle(actor) {
    if (remoteOn()) {
      ensureRemote();
      var remote = mem && mem.origin === "supabase" ? mem : { custom: [], people: [] };
      var mine = remote.people.filter(function (person) { return person.id === actor.id; })[0];
      if (!mine) {
        mine = { id: actor.id, hotel: actor.hotel, name: actor.name, birthMonth: null, birthDay: null, hireDate: "", example: false };
      }
      var people = remote.people.map(function (person) {
        if (person.id !== actor.id) return person;
        var copy = {};
        var key;
        for (key in person) copy[key] = person[key];
        if (!copy.name) copy.name = actor.name;
        return copy;
      });
      if (!remote.people.some(function (person) { return person.id === actor.id; })) people.push(mine);
      return { origin: mem && mem.origin || "loading", custom: remote.custom, people: people, store: readStore() };
    }
    var store = readStore();
    var people = demoPeople(nowISO()).map(function (person) {
      var saved = store.people[person.id];
      if (!saved) return person;
      return {
        id: person.id, hotel: saved.hotel || person.hotel, name: person.name,
        birthMonth: saved.birthMonth, birthDay: saved.birthDay, hireDate: saved.hireDate || "", example: false
      };
    });
    if (actor.id && !people.some(function (person) { return person.id === actor.id; })) {
      var savedMe = store.people[actor.id] || {};
      people.push({
        id: actor.id, hotel: actor.hotel, name: actor.name,
        birthMonth: savedMe.birthMonth || null, birthDay: savedMe.birthDay || null,
        hireDate: savedMe.hireDate || "", example: false
      });
    }
    return { origin: "example", custom: store.custom, people: people, store: store };
  }
  function text(item, field) {
    return langNow() === "es" ? item[field + "Es"] : item[field + "En"];
  }
  function bannerHtml(item, day, dismissed) {
    if (dismissed[dismissKey(day, item.id)]) return "";
    var example = item.example ? "<span class=\"ex\">EXAMPLE</span> " : "";
    var body = text(item, "body");
    return "<aside class=\"gr-banner\" id=\"gr-" + esc(item.id) + "\" style=\"border-color:" + esc(item.color) + "\">" +
      "<button type=\"button\" class=\"gr-x\" aria-label=\"" + esc(L("Dismiss for today", "Ocultar por hoy")) + "\" onclick=\"grDismiss('" + esc(item.id) + "')\">✕</button>" +
      "<b>" + esc(item.emoji) + " " + example + esc(text(item, "title")) + "</b>" +
      (body ? "<p>" + esc(body) + "</p>" : "") + "</aside>";
  }
  function lineHtml(rows, day, dismissed) {
    if (!rows.length || dismissed[dismissKey(day, "gm-celebrations")]) return "";
    var bits = rows.map(function (row) {
      var label = row.kind === "birthday"
        ? L("birthday", "cumpleaños")
        : row.years + " " + (row.years === 1 ? L("year", "año") : L("years", "años"));
      return esc(row.name) + " — " + esc(label);
    }).join(" · ");
    return "<aside class=\"gr-line\" id=\"gr-gm-celebrations\"><button type=\"button\" class=\"gr-x\" aria-label=\"" + esc(L("Dismiss for today", "Ocultar por hoy")) + "\" onclick=\"grDismiss('gm-celebrations')\">✕</button><b>" +
      esc(L("Celebrations today", "Celebraciones de hoy")) + "</b><p>" + bits + "</p></aside>";
  }
  function mineForm(person) {
    var month = person && person.birthMonth || "";
    var day = person && person.birthDay || "";
    var hire = person && person.hireDate || "";
    return "<details class=\"gr-mine\"><summary>" + esc(L("Birthday and anniversary (optional)", "Cumpleaños y aniversario (opcional)")) + "</summary>" +
      "<p class=\"gr-note\">" + esc(L("Month and day only. We never ask for the year.", "Solo mes y día. Nunca pedimos el año.")) + "</p>" +
      "<div class=\"gr-row\"><label>" + esc(L("Month", "Mes")) + "<input id=\"grMonth\" inputmode=\"numeric\" maxlength=\"2\" value=\"" + esc(month) + "\"></label>" +
      "<label>" + esc(L("Day", "Día")) + "<input id=\"grDay\" inputmode=\"numeric\" maxlength=\"2\" value=\"" + esc(day) + "\"></label></div>" +
      "<label class=\"gr-field\">" + esc(L("Hire date", "Fecha de ingreso")) + "<input id=\"grHire\" type=\"date\" value=\"" + esc(hire) + "\"></label>" +
      "<button type=\"button\" class=\"btn\" onclick=\"grSaveMine()\">" + esc(L("Save my dates", "Guardar mis fechas")) + "</button></details>";
  }
  function homeHtml() {
    var actor = actorNow();
    var data = bundle(actor);
    var model = homeModel({
      today: nowISO(), role: actor.role, hotel: actor.hotel, viewerId: actor.id,
      people: data.people, custom: data.custom, gmView: gmView(actor)
    });
    var dismissed = (data.store && data.store.dismiss) || {};
    var banners = model.banners.map(function (item) { return bannerHtml(item, model.day, dismissed); }).join("");
    var line = lineHtml(model.celebrations, model.day, dismissed);
    var mine = data.people.filter(function (person) { return person.id === actor.id; })[0];
    var edit = isCorporate(actor.role) ? "<button type=\"button\" class=\"btn2 gr-edit\" onclick=\"go('greet')\">" + esc(L("Custom greetings", "Saludos personalizados")) + "</button>" : "";
    if (!banners && !line && !edit && !actor.id) return "";
    var sample = data.origin === "example" && (banners || line) ? "<p class=\"gr-note\"><span class=\"ex\">EXAMPLE</span> " + esc(L("Sample celebration for this demo.", "Celebración de ejemplo para esta demostración.")) + "</p>" : "";
    return "<div class=\"raw gr\" id=\"grHome\">" + banners + line + sample + edit + mineForm(mine) + "</div>";
  }
  function editorHtml() {
    var actor = actorNow();
    if (!isCorporate(actor.role)) return "<div class=\"raw gr\"><h2>" + esc(L("Custom greetings", "Saludos personalizados")) + "</h2></div>";
    var data = bundle(actor);
    var draft = ui.editing || { id: "", hotel: "", emoji: "✨", color: "#14365d", messageEn: "", messageEs: "", start: chicagoDate(nowISO()), end: chicagoDate(nowISO()), annual: true, active: true };
    var rows = (data.custom || []).map(function (row) {
      return "<div class=\"gr-card\"><b>" + esc(row.emoji) + " " + esc(row.messageEn) + "</b><p>" + esc(row.messageEs) + "</p><p class=\"gr-note\">" +
        esc(row.start) + " – " + esc(row.end) + (row.annual ? " · " + esc(L("every year", "cada año")) : "") + (row.active ? "" : " · " + esc(L("hidden", "oculto"))) + "</p>" +
        "<button type=\"button\" class=\"btn2\" onclick=\"grEdit('" + esc(row.id) + "')\">" + esc(L("Edit", "Editar")) + "</button></div>";
    }).join("");
    var err = ui.error ? "<p class=\"gr-err\">" + esc(ui.error) + "</p>" : "";
    return "<div class=\"raw gr\" id=\"grEditor\"><button type=\"button\" class=\"btn2\" onclick=\"go('home')\">‹ " + esc(L("Home", "Inicio")) + "</button><h2>" +
      esc(L("Custom greetings", "Saludos personalizados")) + "</h2><p class=\"gr-note\">" +
      esc(L("JR Corporate can add a greeting for every hotel or just one.", "JR Corporate puede agregar un saludo para todos los hoteles o solo uno.")) + "</p>" + err +
      "<form class=\"gr-form\" onsubmit=\"grSaveCustom(event);return false;\">" +
      "<label class=\"gr-field\">" + esc(L("English", "Inglés")) + "<input id=\"grEn\" maxlength=\"200\" value=\"" + esc(draft.messageEn) + "\"></label>" +
      "<label class=\"gr-field\">" + esc(L("Spanish", "Español")) + "<input id=\"grEs\" maxlength=\"200\" value=\"" + esc(draft.messageEs) + "\"></label>" +
      "<div class=\"gr-row\"><label>" + esc(L("Emoji", "Emoji")) + "<input id=\"grEmoji\" maxlength=\"8\" value=\"" + esc(draft.emoji) + "\"></label>" +
      "<label>" + esc(L("Color", "Color")) + "<input id=\"grColor\" value=\"" + esc(draft.color) + "\"></label></div>" +
      "<div class=\"gr-row\"><label>" + esc(L("Start", "Inicio")) + "<input id=\"grStart\" type=\"date\" value=\"" + esc(draft.start) + "\"></label>" +
      "<label>" + esc(L("End", "Fin")) + "<input id=\"grEnd\" type=\"date\" value=\"" + esc(draft.end) + "\"></label></div>" +
      "<label class=\"gr-check\"><input id=\"grAnnual\" type=\"checkbox\"" + (draft.annual ? " checked" : "") + "> " + esc(L("Repeat every year", "Repetir cada año")) + "</label>" +
      "<label class=\"gr-field\">" + esc(L("Hotel", "Hotel")) + "<select id=\"grHotel\"><option value=\"\">" + esc(L("All hotels", "Todos los hoteles")) + "</option>" +
      HOTELS.map(function (hotel) { return "<option value=\"" + hotel + "\"" + (draft.hotel === hotel ? " selected" : "") + ">" + hotel + "</option>"; }).join("") +
      "</select></label><button type=\"submit\" class=\"btn\">" + esc(L("Save greeting", "Guardar saludo")) + "</button></form>" + rows + "</div>";
  }

  root.grDismiss = function (id) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(String(id))) return;
    var store = readStore();
    var day = chicagoDate(nowISO());
    store.dismiss[dismissKey(day, id)] = 1;
    writeStore(store);
    render();
  };
  root.grEdit = function (id) {
    var data = bundle(actorNow());
    var row = (data.custom || []).filter(function (item) { return String(item.id) === String(id); })[0];
    if (!row) return;
    ui.editing = row;
    ui.error = "";
    if (typeof go === "function") go("greet");
    else render();
  };
  root.grSaveMine = function () {
    var actor = actorNow();
    var month = document.getElementById("grMonth").value.trim();
    var day = document.getElementById("grDay").value.trim();
    var hire = document.getElementById("grHire").value;
    var birthMonth = month === "" ? null : +month;
    var birthDay = day === "" ? null : +day;
    if ((birthMonth == null) !== (birthDay == null) || (birthMonth != null && !validBirthday(birthMonth, birthDay))) return;
    if (hire && !/^\d{4}-\d{2}-\d{2}$/.test(hire)) return;
    if (remoteOn()) {
      sb.rpc("save_my_celebration", {
        p_hotel: actor.hotel || null, p_name: actor.name, p_month: birthMonth, p_day: birthDay, p_hire: hire || null
      }).then(function () { ui.remote = ""; mem = null; render(); });
      return;
    }
    var store = readStore();
    store.people[actor.id] = { hotel: actor.hotel, birthMonth: birthMonth, birthDay: birthDay, hireDate: hire };
    writeStore(store);
    render();
  };
  root.grSaveCustom = function (ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    var actor = actorNow();
    if (!isCorporate(actor.role)) return;
    var draft = {
      id: ui.editing && ui.editing.id || "",
      hotel: document.getElementById("grHotel").value,
      emoji: document.getElementById("grEmoji").value.trim() || "✨",
      color: document.getElementById("grColor").value.trim(),
      messageEn: document.getElementById("grEn").value.trim(),
      messageEs: document.getElementById("grEs").value.trim(),
      start: document.getElementById("grStart").value,
      end: document.getElementById("grEnd").value,
      annual: document.getElementById("grAnnual").checked,
      active: true
    };
    if (!draft.messageEn || !draft.messageEs || !/^#[0-9A-Fa-f]{6}$/.test(draft.color)) { ui.error = L("Check the greeting.", "Revisa el saludo."); render(); return; }
    if (!draft.annual && draft.end < draft.start) { ui.error = L("The end date is before the start.", "La fecha final es anterior a la inicial."); render(); return; }
    if (remoteOn()) {
      sb.rpc("save_custom_greeting", {
        p_id: draft.id ? Number(draft.id) : null, p_hotel: draft.hotel || null, p_emoji: draft.emoji, p_color: draft.color.toUpperCase(),
        p_en: draft.messageEn, p_es: draft.messageEs, p_start: draft.start, p_end: draft.end, p_annual: draft.annual, p_active: true
      }).then(function (r) {
        if (r.error) { ui.error = L("Couldn't save that greeting.", "No se pudo guardar el saludo."); render(); return; }
        ui.editing = null;
        ui.error = "";
        ui.remote = "";
        mem = null;
        render();
      });
      return;
    }
    var store = readStore();
    if (!draft.id) draft.id = "local-" + Date.now();
    var replaced = false;
    store.custom = (store.custom || []).map(function (row) {
      if (String(row.id) !== String(draft.id)) return row;
      replaced = true;
      return draft;
    });
    if (!replaced) store.custom.push(draft);
    writeStore(store);
    ui.editing = null;
    ui.error = "";
    render();
  };

  if (typeof M !== "undefined") M.greet = ["🎊", "Greetings"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Greetings = "Saludos";
  if (typeof V !== "undefined") V.greet = editorHtml;
  if (typeof V !== "undefined" && V.home) {
    var prevHome = V.home;
    V.home = function () {
      var card = "";
      try { card = homeHtml(); } catch (e) { card = ""; }
      return card + prevHome.apply(this, arguments);
    };
  }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var who = "";
      try { who = authRole(); } catch (e) { who = ""; }
      if (isCorporate(who) && role === "GM" && list.indexOf("greet") < 0) list.unshift("greet");
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined") RSEC[0][2].push("greet"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("greet") < 0) NOCOLS.push("greet"); } catch (e2) {}

  var style = document.createElement("style");
  style.textContent = [
    ".gr-banner,.gr-line{position:relative;background:#fff;border:2px solid #14365d;border-left-width:8px;border-radius:12px;padding:10px 36px 10px 12px;margin:0 0 8px}",
    ".gr-banner b,.gr-line b{display:block;font-size:16px}",
    ".gr-banner p,.gr-line p,.gr-note{margin:4px 0 0;color:#3c4658;font-size:14px}",
    ".gr-x{position:absolute;top:6px;right:6px;min-width:44px;min-height:44px;border:0;background:#eef3fa;font-weight:800}",
    ".gr-edit{width:100%;margin:0 0 8px}",
    ".gr-mine{margin:8px 0}",
    ".gr-mine summary{min-height:44px;font-weight:700;cursor:pointer}",
    ".gr-field{display:flex;flex-direction:column;gap:4px;font-weight:700;margin:8px 0}",
    ".gr-field input,.gr-field select{width:100%;font-size:16px}",
    ".gr-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
    ".gr-row label{display:flex;flex-direction:column;gap:4px;font-weight:700}",
    ".gr-check{display:flex;align-items:center;gap:8px;min-height:44px;font-weight:700}",
    ".gr-card{border:1px solid #e1e6ee;border-radius:12px;padding:8px;margin:8px 0}",
    ".gr-err{color:#c0262d;font-weight:700}"
  ].join("");
  document.head.appendChild(style);
  setTimeout(function () {
    if (typeof render !== "function") return;
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try {
        var el = document.getElementById("grHome");
        var app = document.getElementById("app");
        if (el && app && typeof S !== "undefined" && S.tab === "home" && app.firstChild !== el) app.insertAdjacentElement("afterbegin", el);
      } catch (e) {}
      return result;
    };
  }, 0);
})(typeof window !== "undefined" ? window : globalThis);
