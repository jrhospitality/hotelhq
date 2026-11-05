/* IHG Way of Clean guest-room evaluation.
   This is the documented room inspection for every hotel. The older pass/fail
   room-board inspection stays in place. No sample staff rows are stored here.
   Line points follow the form. The printed page-1 footer says 42, and the lines
   on that page add to 43, so a finished inspection is scaled to 100. */
(function (root) {
  "use strict";

  function item(id, step, points, en, es, flags) {
    flags = flags || {};
    return { id: id, step: step, points: points, en: en, es: es, optional: !!flags.optional, workOrder: !!flags.workOrder };
  }
  var STEPS = [
    { id: "survey", n: "1", en: "Survey", es: "Revisar" },
    { id: "service", n: "2", en: "Service", es: "Servicio" },
    { id: "shine_bath", n: "3", en: "Shine Bathroom", es: "Brillar el baño" },
    { id: "shine_sleep", n: "3", en: "Shine Sleeping Room", es: "Brillar la habitación" },
    { id: "stage", n: "4", en: "Stage", es: "Presentar" },
    { id: "self", n: "5", en: "Self-Inspect", es: "Autoinspección" }
  ];
  var ITEMS = [
    item("bulbs", "survey", 2, "Light bulbs and light switches are working", "Los focos y los interruptores funcionan", { workOrder: true }),
    item("hvac", "survey", 2, "HVAC or PTAC system is working properly", "El aire o el PTAC funciona bien", { workOrder: true }),
    item("cords", "survey", 1, "Electrical cords and power outlets are not frayed or damaged", "Los cables y los contactos no están pelados ni dañados"),
    item("windows", "survey", 2, "Windows are clean, in proper working order, and locks are working", "Las ventanas están limpias, funcionan y los seguros sirven"),
    item("curtains", "survey", 2, "Curtains, valances, and sheers are free of mold, mildew, stains and holes", "Las cortinas, cenefas y visillos no tienen moho, manchas ni hoyos"),
    item("pictures", "survey", 1, "Pictures are hung properly", "Los cuadros están bien colgados"),
    item("furniture", "survey", 2, "Furniture and upholstery are in good condition", "Los muebles y la tapicería están en buen estado"),
    item("walls", "survey", 1, "Walls are not visibly damaged or marked", "Las paredes no se ven dañadas ni marcadas"),
    item("appliances", "survey", 2, "Refrigerator and/or kitchen appliances are working and in good condition, if applicable", "El refrigerador y los aparatos de cocina funcionan y están en buen estado, si aplica", { optional: true, workOrder: true }),
    item("signs", "survey", 2, "Room rate and fire evacuation signs are in place and in good condition", "Los letreros de tarifa y de evacuación están en su lugar y en buen estado"),
    item("door", "survey", 2, "Door lock works properly; door does not squeak; door automatically locks", "La cerradura funciona, la puerta no rechina y se asegura sola", { workOrder: true }),
    item("odor", "survey", 2, "Room is odor free", "La habitación no tiene olores"),
    item("left_behind", "survey", 1, "Room checked for items left behind by guest", "Se revisó la habitación por objetos que dejó el huésped"),
    item("bed_base", "service", 2, "Headboard, skirt, and bed base free of stains, burns, damage, and bed bugs", "La cabecera, el faldón y la base de la cama no tienen manchas, quemaduras, daño ni chinches"),
    item("debris", "service", 2, "Room is clear of debris, trash, and room service items", "La habitación no tiene basura, restos ni bandejas de room service"),
    item("ice", "service", 2, "Ice bucket empty, clean and has fresh liner", "La hielera está vacía, limpia y con bolsa nueva"),
    item("used_amenities", "service", 1, "Partially used or water damaged amenities removed from the room", "Se quitaron las amenidades a medias o dañadas por el agua"),
    item("waste_out", "service", 2, "Waste bin free from odor, stains, spots, streaks, scratches, dents, hair, etc.", "El bote no tiene olor, manchas, rayones, golpes, cabello, etc."),
    item("waste_in", "service", 2, "Inside of waste bin clean and odor free", "El interior del bote está limpio y sin olor"),
    item("cobwebs", "service", 2, "Cobwebs removed from ceilings, walls and corners", "Se quitaron las telarañas del techo, las paredes y las esquinas"),
    item("ledges", "service", 2, "High ledges dusted", "Se desempolvaron las repisas altas"),
    item("curtain_rails", "service", 2, "Top of curtain rails dusted", "Se desempolvó la parte de arriba de los rieles"),
    item("ceiling_lights", "service", 2, "Ceiling light fixtures dusted", "Se desempolvaron las lámparas del techo"),
    item("frames", "service", 2, "Picture frames dusted", "Se desempolvaron los marcos"),
    item("bath_surfaces", "shine_bath", 2, "Bathroom door front and back, switches, walls, ceiling, exhaust vent, and light fixtures are clean", "La puerta del baño por ambos lados, los interruptores, las paredes, el techo, el extractor y las lámparas están limpios"),
    item("bath_mirrors", "shine_bath", 2, "Bathroom mirrors and artwork are clean and streak free", "Los espejos y los cuadros del baño están limpios y sin rayas"),
    item("sink", "shine_bath", 2, "Bathroom sink, drain trap, handles, and fixtures are clean; sink chrome dry and buffed", "El lavabo, la trampa, las manijas y los herrajes están limpios; el cromo está seco y pulido"),
    item("shower", "shine_bath", 2, "Shower and/or tub free from hair or residue; shower head positioned correctly; shower curtain clean, dry, and positioned correctly, if applicable", "La regadera o la tina no tienen cabello ni residuos; la regadera está bien puesta; la cortina está limpia, seca y bien colocada, si aplica", { optional: true }),
    item("toilet_in", "shine_bath", 2, "Inside the toilet bowl clean", "El interior del inodoro está limpio"),
    item("toilet_out", "shine_bath", 2, "Exterior of toilet bowl clean, dry, and in good condition; wall areas beside and behind the toilet clean", "El exterior del inodoro está limpio, seco y en buen estado; la pared a los lados y detrás está limpia"),
    item("black_light", "shine_bath", 2, "Black light showed no remaining evidence of previous guest", "La luz negra no mostró rastros del huésped anterior"),
    item("bath_amenities", "shine_bath", 1, "Bathroom amenities, tissues, and toilet paper replaced and neatly arranged", "Las amenidades, los pañuelos y el papel de baño están nuevos y bien puestos"),
    item("bath_floor", "shine_bath", 2, "Bathroom floor clean; baseboards, tile edges, corners, and behind the door clean", "El piso del baño está limpio; los zoclos, los bordes, las esquinas y detrás de la puerta también"),
    item("hvac_clean", "shine_sleep", 1, "Wall switches, HVAC or PTAC clean and free of fingerprints; HVAC or PTAC set to correct temperature", "Los interruptores y el aire o PTAC están limpios y sin huellas; el aire está a la temperatura correcta"),
    item("furniture_clean", "shine_sleep", 2, "Armoire, dresser, chest of drawers surfaces, shelves, desk, and nightstand clean inside and out", "El armario, la cómoda, las superficies, las repisas, el escritorio y el buró están limpios por dentro y por fuera"),
    item("closet", "shine_sleep", 1, "Inside of closet clean; equipment and collateral in closet clean, in place, and in working order", "El interior del clóset está limpio; el equipo y el material están limpios, en su lugar y funcionan"),
    item("lamps", "shine_sleep", 2, "Lamps and lightshades clean and straight", "Las lámparas y las pantallas están limpias y derechas"),
    item("headboard_clean", "shine_sleep", 2, "Bed headboard clean, free from fingerprints, grease, or oil marks", "La cabecera está limpia, sin huellas, grasa ni aceite"),
    item("nightstand_wall", "shine_sleep", 2, "Walls around and behind nightstand clean; radio alarm clock working, clean, and alarm off", "Las paredes junto al buró y detrás están limpias; el radio reloj funciona, está limpio y la alarma está apagada"),
    item("cords_clean", "shine_sleep", 2, "Electrical cords clean and dusted", "Los cables están limpios y sin polvo"),
    item("phone", "shine_sleep", 2, "Telephone clean and in working order; telephone cord neatly presented", "El teléfono está limpio y funciona; el cable está bien acomodado"),
    item("tv", "shine_sleep", 2, "Television and remote control clean and in working order", "La televisión y el control están limpios y funcionan"),
    item("marketing", "shine_sleep", 2, "Standard brand marketing and in-room guest information in correct place and free from stain", "El material de la marca y la información para el huésped están en su lugar y sin manchas"),
    item("iron", "shine_sleep", 2, "Iron water receptacle empty; iron clean and in working order; ironing board in place and clean", "El depósito de la plancha está vacío; la plancha está limpia y funciona; la tabla está en su lugar y limpia"),
    item("coffee", "shine_sleep", 2, "Coffee and tea facility clean and supplies replenished", "La estación de café y té está limpia y surtida"),
    item("upholstery", "shine_sleep", 2, "Upholstery free from stains and in good condition; desk chair operates correctly", "La tapicería no tiene manchas y está en buen estado; la silla del escritorio funciona"),
    item("windows_clean", "shine_sleep", 2, "Windows, ledges, and frames clean; mirrors and artwork clean and free of streaks", "Las ventanas, las repisas y los marcos están limpios; los espejos y los cuadros están limpios y sin rayas"),
    item("balcony", "shine_sleep", 1, "Balconies and outside spaces clean, if applicable", "Los balcones y los espacios exteriores están limpios, si aplica", { optional: true }),
    item("bed_made", "stage", 2, "Bed made to brand standards", "La cama está tendida según el estándar de la marca"),
    item("baseboards", "stage", 2, "Sleeping room baseboards and corners free from dirt", "Los zoclos y las esquinas de la habitación no tienen suciedad"),
    item("carpet", "stage", 2, "Exposed areas of carpet clean and vacuumed, including under bed skirt, behind door, and by nightstand", "La alfombra visible está limpia y aspirada, incluso bajo el faldón, detrás de la puerta y junto al buró"),
    item("satisfied", "self", 2, "Room attendant satisfied with work in the room", "El camarista está conforme con el trabajo en la habitación"),
    item("status_updated", "self", 2, "Status of room updated and maintenance issues reported", "El estatus de la habitación está actualizado y lo de mantenimiento ya se reportó"),
    item("cart_supplies", "self", 2, "Cart has sufficient supplies of cleaning products, tools, and appropriate amount of amenities", "El carrito tiene suficientes productos, herramientas y amenidades"),
    item("cart_clean", "self", 2, "Cart is clean and professionally presented", "El carrito está limpio y se ve profesional")
  ];
  var BY_ID = {};
  ITEMS.forEach(function (row) { BY_ID[row.id] = row; });

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function monthWeek(iso) {
    var month = String(iso || "").slice(0, 7);
    var day = Number(String(iso || "").slice(8, 10));
    var index = day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
    var year = Number(month.slice(0, 4));
    var mon = Number(month.slice(5, 7));
    var last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
    var startDay = [1, 8, 15, 22][index - 1];
    var endDay = [7, 14, 21, last][index - 1];
    return { month: month, index: index, start: month + "-" + pad(startDay), end: month + "-" + pad(endDay) };
  }
  function inWeek(row, month, index) {
    if (!row || !row.date) return false;
    var week = monthWeek(row.date);
    return week.month === month && week.index === index;
  }
  function score(marks) {
    var earned = 0;
    var possible = 0;
    var misses = [];
    ITEMS.forEach(function (row) {
      var mark = marks && marks[row.id];
      var result = mark && mark.result;
      if (result === "na") return;
      if (result !== "pass" && result !== "fail") return;
      possible += row.points;
      if (result === "pass") earned += row.points;
      else misses.push(row.id);
    });
    return {
      earned: earned,
      possible: possible,
      score: possible ? Math.round(earned / possible * 100) : null,
      misses: misses
    };
  }
  function buildRecord(input) {
    input = input || {};
    if (!input.hotel || !input.date || !String(input.room || "").trim() || !String(input.attendant || "").trim() || !String(input.inspector || "").trim()) {
      return { ok: false, error: "header" };
    }
    var marks = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var row = ITEMS[i];
      var mark = (input.marks || {})[row.id] || {};
      var result = mark.result;
      if (result !== "pass" && result !== "fail" && result !== "na") return { ok: false, error: "item", id: row.id };
      if (result === "na" && !row.optional) return { ok: false, error: "na", id: row.id };
      marks[row.id] = {
        result: result,
        note: result === "fail" ? String(mark.note || "") : "",
        photo: result === "fail" ? String(mark.photo || "") : ""
      };
    }
    var rated = score(marks);
    var week = monthWeek(input.date);
    return {
      ok: true,
      row: {
        id: input.id || ("ihg-" + input.hotel + "-" + input.date + "-" + week.index + "-" + String(input.attendant).toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24)),
        hotel: input.hotel,
        date: input.date,
        room: String(input.room).trim(),
        attendant: String(input.attendant).trim(),
        inspector: String(input.inspector).trim(),
        marks: marks,
        earned: rated.earned,
        possible: rated.possible,
        score: rated.score
      }
    };
  }
  function saveRecord(list, row) {
    var week = monthWeek(row.date);
    var next = (list || []).filter(function (item) {
      if (!item || item.hotel !== row.hotel || item.attendant !== row.attendant) return true;
      var other = monthWeek(item.date);
      return other.month !== week.month || other.index !== week.index;
    });
    next.unshift(row);
    return next;
  }
  function weekInspection(rows, attendant, month, index) {
    var hits = (rows || []).filter(function (row) {
      return row && row.attendant === attendant && inWeek(row, month, index);
    });
    hits.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    return hits[0] || null;
  }
  function weeklyScore(rows, attendant, month, index) {
    var row = weekInspection(rows, attendant, month, index);
    return row ? row.score : null;
  }
  function monthlyScore(rows, attendant, month) {
    var scores = [];
    for (var index = 1; index <= 4; index++) {
      var value = weeklyScore(rows, attendant, month, index);
      if (value != null) scores.push(value);
    }
    if (!scores.length) return null;
    var sum = scores.reduce(function (total, value) { return total + value; }, 0);
    return { score: Math.round(sum / scores.length), weeks: scores.length };
  }
  function stillNeeded(rows, attendants, today) {
    var week = monthWeek(today);
    return (attendants || []).filter(function (name) {
      return !weekInspection(rows, name, week.month, week.index);
    });
  }
  function access(role) {
    var lead = role === "Housekeeping" || role === "GM" || role === "AGM" || role === "Above Property";
    var own = role === "Housekeeper";
    return { view: lead || own, edit: lead, allHotels: role === "Above Property", ownOnly: own };
  }
  function visibleRows(rows, role, name, hotel) {
    var who = access(role);
    if (!who.view) return [];
    return (rows || []).filter(function (row) {
      if (!row) return false;
      if (!who.allHotels && row.hotel !== hotel) return false;
      if (who.allHotels && hotel && row.hotel !== hotel) return false;
      if (who.ownOnly && row.attendant !== name) return false;
      return true;
    });
  }
  function workOrderText(itemId, note, lang) {
    var row = BY_ID[itemId];
    if (!row || !row.workOrder) return "";
    var label = lang === "es" ? row.es : row.en;
    var extra = note ? " — " + note : "";
    return label + extra;
  }

  var api = {
    STEPS: STEPS,
    ITEMS: ITEMS,
    monthWeek: monthWeek,
    score: score,
    buildRecord: buildRecord,
    saveRecord: saveRecord,
    weekInspection: weekInspection,
    weeklyScore: weeklyScore,
    monthlyScore: monthlyScore,
    stillNeeded: stillNeeded,
    access: access,
    visibleRows: visibleRows,
    workOrderText: workOrderText
  };
  root.HHQIhg = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var KEY = "jrportal_ihg_insp_v1";
  var draft = null;
  var hotelPick = "";

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
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function me() {
    try { return meUser() || {}; } catch (e) { return {}; }
  }
  function hotelNow() {
    var who = access(role());
    if (who.allHotels) return hotelPick || "";
    var user = me();
    return user.hotel || (typeof S !== "undefined" ? S.hotel : "") || "";
  }
  function bag() {
    var data = {};
    try { data = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { data = {}; }
    return data;
  }
  function rowsFor(hotel) {
    var data = bag();
    if (!hotel) {
      var all = [];
      Object.keys(data).forEach(function (code) {
        (data[code] || []).forEach(function (row) { all.push(row); });
      });
      return all;
    }
    return data[hotel] || [];
  }
  function writeRows(hotel, list) {
    var data = bag();
    data[hotel] = list;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    if (typeof useRemote === "function" && useRemote() && root.sb && sb.rpc && access(role()).edit) {
      sb.rpc("save_ihg_room_inspection", { p_row: list[0] || null }).catch(function () {});
    }
  }
  function attendants(hotel) {
    if (typeof USERS === "undefined") return [];
    return USERS.filter(function (user) {
      return user && user.active !== false && user.role === "Housekeeper" && (!hotel || user.hotel === hotel);
    }).map(function (user) { return user.name; });
  }
  function itemLabel(row) { return L(row.en, row.es); }
  function stepLabel(step) { return L("Step", "Paso") + " " + step.n + " — " + L(step.en, step.es); }

  function monthBoard(rows, names, month) {
    if (!names.length) return "";
    var head = "<tr><th>" + esc(L("Room attendant", "Camarista")) + "</th>";
    for (var index = 1; index <= 4; index++) head += "<th>" + esc(L("Week", "Semana") + " " + index) + "</th>";
    head += "<th>" + esc(L("Month", "Mes")) + "</th></tr>";
    var body = names.map(function (name) {
      var cells = "<td>" + esc(name) + "</td>";
      for (var week = 1; week <= 4; week++) {
        var value = weeklyScore(rows, name, month, week);
        cells += "<td>" + (value == null ? "—" : esc(String(value))) + "</td>";
      }
      var monthScore = monthlyScore(rows, name, month);
      cells += "<td><b>" + (monthScore ? esc(String(monthScore.score)) + " <small>(" + monthScore.weeks + "/4)</small>" : "—") + "</b></td>";
      return "<tr>" + cells + "</tr>";
    }).join("");
    return "<table class=\"ihg-month\"><thead>" + head + "</thead><tbody>" + body + "</tbody></table>";
  }
  function history(rows, canEdit) {
    if (!rows.length) return "<p>" + esc(L("No documented inspections yet.", "Todavía no hay inspecciones documentadas.")) + "</p>";
    return rows.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (row) {
      var misses = ITEMS.filter(function (itemRow) { return row.marks && row.marks[itemRow.id] && row.marks[itemRow.id].result === "fail"; });
      var bits = misses.map(function (itemRow) {
        var mark = row.marks[itemRow.id];
        var wo = "";
        if (itemRow.workOrder && canEdit && mark.workOrder) wo = " <small>" + esc(L("Work order opened", "Orden abierta")) + "</small>";
        else if (itemRow.workOrder && canEdit) wo = " <button type=\"button\" class=\"btn2\" onclick=\"HHQIhgWo('" + esc(row.id) + "','" + itemRow.id + "')\">" + esc(L("Create work order", "Crear orden de trabajo")) + "</button>";
        return "<li>" + esc(itemLabel(itemRow)) + (mark.note ? " — " + esc(mark.note) : "") + wo + "</li>";
      }).join("");
      return "<article class=\"ihg-row\"><b>" + esc(row.date) + " · " + esc(L("Room", "Habitación")) + " " + esc(row.room) + " · " + esc(row.score) + "</b><small>" + esc(row.attendant) + " · " + esc(row.inspector) + " · " + esc(row.hotel) + "</small>" + (bits ? "<ul>" + bits + "</ul>" : "") + "</article>";
    }).join("");
  }
  function form(hotel) {
    if (!draft) draft = { hotel: hotel, date: today(), room: "", attendant: "", inspector: me().name || "", marks: {} };
    draft.hotel = hotel;
    var names = attendants(hotel);
    var fields = "<label>" + esc(L("Date", "Fecha")) + "<input type=\"date\" value=\"" + esc(draft.date) + "\" onchange=\"HHQIhgField('date', this.value)\"></label>";
    fields += "<label>" + esc(L("Room #", "Habitación")) + "<input value=\"" + esc(draft.room) + "\" onchange=\"HHQIhgField('room', this.value)\"></label>";
    fields += "<label>" + esc(L("Room attendant", "Camarista")) + "<select onchange=\"HHQIhgField('attendant', this.value)\"><option value=\"\">" + esc(L("Choose", "Elegir")) + "</option>" + names.map(function (name) {
      return "<option" + (draft.attendant === name ? " selected" : "") + ">" + esc(name) + "</option>";
    }).join("") + "</select></label>";
    fields += "<label>" + esc(L("Inspector", "Inspector")) + "<input value=\"" + esc(draft.inspector) + "\" onchange=\"HHQIhgField('inspector', this.value)\"></label>";
    fields += "<p class=\"ihg-hotel\">" + esc(L("Hotel", "Hotel")) + " <b>" + esc(hotel) + "</b></p>";
    fields += "<button type=\"button\" class=\"btn2\" onclick=\"HHQIhgPassAll()\">" + esc(L("Mark all pass", "Marcar todo bien")) + "</button>";
    var body = STEPS.map(function (step) {
      var lines = ITEMS.filter(function (row) { return row.step === step.id; }).map(function (row) {
        var mark = draft.marks[row.id] || {};
        var result = mark.result || "";
        function button(value, label) {
          if (value === "na" && !row.optional) return "";
          return "<button type=\"button\" class=\"ihg-choice" + (result === value ? " on" : "") + "\" onclick=\"HHQIhgMark('" + row.id + "','" + value + "')\">" + esc(label) + "</button>";
        }
        var extra = result === "fail" ? "<label>" + esc(L("Note", "Nota")) + "<input value=\"" + esc(mark.note || "") + "\" onchange=\"HHQIhgNote('" + row.id + "', this.value)\"></label><label>" + esc(L("Photo", "Foto")) + "<input type=\"file\" accept=\"image/*\" onchange=\"HHQIhgPhoto('" + row.id + "', this)\"></label>" : "";
        return "<div class=\"ihg-item\"><div><b>" + esc(itemLabel(row)) + "</b><small>" + row.points + " " + esc(L("pts", "pts")) + (row.optional ? " · " + esc(L("if applicable", "si aplica")) : "") + "</small></div><div class=\"ihg-choices\">" + button("pass", L("Pass", "Bien")) + button("fail", L("Miss", "Falla")) + button("na", "N/A") + "</div>" + extra + "</div>";
      }).join("");
      return "<section class=\"ihg-step\"><h3>" + esc(stepLabel(step)) + "</h3>" + lines + "</section>";
    }).join("");
    var preview = score(draft.marks);
    var tally = preview.possible ? "<p><b>" + esc(L("Score", "Puntaje")) + " " + preview.score + "</b> <small>" + preview.earned + "/" + preview.possible + "</small></p>" : "";
    return "<form class=\"ihg-form\" onsubmit=\"HHQIhgSave(event)\">" + fields + body + tally + "<p id=\"ihgErr\" class=\"bad\"></p><button type=\"submit\" class=\"btn\">" + esc(L("Save inspection", "Guardar inspección")) + "</button></form>";
  }
  function page() {
    var who = access(role());
    if (!who.view) return "<div class=\"card\"><p>" + esc(L("Room inspections are for housekeeping and managers.", "Las inspecciones de habitación son para housekeeping y gerentes.")) + "</p></div>";
    var hotel = hotelNow();
    var day = today();
    var week = monthWeek(day);
    var rows = visibleRows(rowsFor(who.allHotels ? hotel : hotel), role(), me().name || "", hotel);
    var hotels = "";
    if (who.allHotels && typeof HOTELS !== "undefined") {
      hotels = "<div class=\"ihg-hotels\"><button type=\"button\" class=\"" + (hotel ? "" : "on") + "\" onclick=\"HHQIhgHotel('')\">" + esc(L("All", "Todos")) + "</button>" + Object.keys(HOTELS).map(function (code) {
        return "<button type=\"button\" class=\"" + (code === hotel ? "on" : "") + "\" onclick=\"HHQIhgHotel('" + code + "')\">" + esc(code) + "</button>";
      }).join("") + "</div>";
    }
    var gap = "";
    if (who.edit && hotel) {
      var roster = attendants(hotel);
      var missing = stillNeeded(rowsFor(hotel), roster, day);
      var gapBody = "";
      var demoRoster = true;
      try { if (typeof authMode !== "undefined" && authMode === "live") demoRoster = false; } catch (e) {}
      if (demoRoster && root.HOTELHQ_CONFIG && String(root.HOTELHQ_CONFIG.mode) === "live") demoRoster = false;
      if (!roster.length && demoRoster) gapBody = "<p>" + esc(L("Room attendant list is not connected. This is not an all-clear.", "La lista de camaristas no está conectada. Esto no es un todo en orden.")) + "</p>";
      else if (missing.length) gapBody = "<ul>" + missing.map(function (name) { return "<li>" + esc(name) + "</li>"; }).join("") + "</ul>";
      else gapBody = "<p>" + esc(L("Every room attendant has one this week.", "Cada camarista ya tiene una esta semana.")) + "</p>";
      gap = "<div class=\"card ihg-gap\"><h3>" + esc(L("Still needs an inspection this week", "Todavía falta una inspección esta semana")) + "</h3><p>" + esc(L("Week", "Semana") + " " + week.index + " · " + week.start + " – " + week.end) + "</p>" + gapBody + "</div>";
    }
    var names = who.ownOnly ? [me().name || ""] : (hotel ? attendants(hotel) : []);
    var board = hotel ? "<div class=\"card\"><h3>" + esc(week.month) + "</h3>" + monthBoard(rows, names.filter(Boolean), week.month) + "<small>" + esc(L("Weekly score is that week's inspection. Monthly score is the average of weeks 1–4 on file.", "El puntaje semanal es la inspección de esa semana. El mensual es el promedio de las semanas 1 a 4 registradas.")) + "</small></div>" : "";
    var editor = who.edit && hotel ? "<div class=\"card\"><h3>" + esc(L("IHG Way of Clean", "IHG Way of Clean")) + "</h3>" + form(hotel) + "</div>" : "";
    return "<div class=\"ihg-page\" id=\"ihgPage\"><h2>" + esc(L("Room inspections", "Inspecciones de habitación")) + "</h2>" + hotels + gap + editor + board + "<div class=\"card\"><h3>" + esc(L("History", "Historial")) + "</h3>" + history(rows, who.edit) + "</div></div>";
  }

  root.HHQIhgHotel = function (code) { hotelPick = code || ""; draft = null; render(); };
  root.HHQIhgField = function (key, value) { if (draft) draft[key] = value; };
  root.HHQIhgMark = function (id, result) {
    if (!draft) return;
    draft.marks[id] = draft.marks[id] || {};
    draft.marks[id].result = result;
    render();
  };
  root.HHQIhgNote = function (id, value) {
    if (!draft) return;
    draft.marks[id] = draft.marks[id] || { result: "fail" };
    draft.marks[id].note = value;
  };
  root.HHQIhgPhoto = function (id, input) {
    var file = input.files && input.files[0];
    if (!draft || !file) return;
    var reader = new FileReader();
    reader.onload = function () {
      draft.marks[id] = draft.marks[id] || { result: "fail" };
      draft.marks[id].photo = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };
  root.HHQIhgPassAll = function () {
    if (!draft) return;
    ITEMS.forEach(function (row) { draft.marks[row.id] = { result: "pass", note: "", photo: "" }; });
    render();
  };
  root.HHQIhgSave = function (event) {
    if (event && event.preventDefault) event.preventDefault();
    if (!access(role()).edit || !draft) return;
    var built = buildRecord(draft);
    var err = document.getElementById("ihgErr");
    if (!built.ok) {
      if (err) err.textContent = L("Choose pass, miss, or N/A on every line, and fill the header.", "Elige bien, falla o N/A en cada línea y llena el encabezado.");
      return;
    }
    var list = saveRecord(rowsFor(built.row.hotel), built.row);
    writeRows(built.row.hotel, list);
    draft = null;
    try { save(); } catch (e) {}
    render();
  };
  root.HHQIhgWo = function (id, itemId) {
    if (!access(role()).edit || !BY_ID[itemId] || !BY_ID[itemId].workOrder) return;
    var hotel = hotelNow();
    var rows = rowsFor(hotel);
    var row = null;
    if (!hotel) {
      Object.keys(bag()).some(function (code) {
        row = (bag()[code] || []).filter(function (item) { return item.id === id; })[0] || null;
        if (row) hotel = code;
        return !!row;
      });
      rows = rowsFor(hotel);
    } else row = rows.filter(function (item) { return item.id === id; })[0];
    if (!row || !row.marks[itemId] || row.marks[itemId].result !== "fail" || row.marks[itemId].workOrder) return;
    var text = workOrderText(itemId, row.marks[itemId].note, (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en");
    row.marks[itemId].workOrder = true;
    writeRows(hotel, rows);
    try {
      var data = D();
      data.wo = data.wo || [];
      data.wo.unshift({ id: data.wo.length + 1, room: row.room, t: text + " (IHG room inspection)", p: "Med", s: "Open", photo: row.marks[itemId].photo || "", comments: [] });
      save();
    } catch (e2) {}
    render();
  };

  if (typeof M !== "undefined") M.ihg = ["📋", "Room inspections"];
  if (typeof V !== "undefined") V.ihg = page;
  if (typeof I18N !== "undefined" && I18N.es) {
    I18N.es["Room inspections"] = "Inspecciones de habitación";
    I18N.es["IHG Way of Clean"] = "IHG Way of Clean";
  }
  ["GM", "Housekeeping", "Housekeeper"].forEach(function (key) {
    if (typeof TILES !== "undefined") {
      TILES[key] = TILES[key] || [];
      if (TILES[key].indexOf("ihg") < 0) TILES[key].push("ihg");
    }
  });
  var css = document.createElement("style");
  css.textContent = ".ihg-page h2{margin-top:0}.ihg-hotels{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.ihg-hotels button{background:#f7f8fa;border:1px solid #e6e8ee;border-radius:10px}.ihg-hotels button.on{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.ihg-form{display:grid;gap:10px}.ihg-form label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:13px}.ihg-step h3{margin:12px 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#5c6570}.ihg-item{padding:8px 0;border-top:1px solid #e6e8ee}.ihg-item small{color:#5c6570}.ihg-choices{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ihg-choice{background:#f7f8fa;border:1px solid #e6e8ee;border-radius:10px;min-height:36px}.ihg-choice.on{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.ihg-month{width:100%;border-collapse:collapse}.ihg-month th,.ihg-month td{text-align:left;padding:6px 4px;border-bottom:1px solid #e6e8ee}.ihg-row{padding:8px 0;border-top:1px solid #e6e8ee}.ihg-row small{display:block;color:#5c6570}.ihg-gap li{font-weight:750}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
