/* Golden Valley (MSPWE) checklist additions.
   Uses the existing checklist lists, the breakfast temperature log, and the
   checklist-engine templates. Same checklist points as every other list. */
(function (root) {
  "use strict";

  var BREAKFAST = [
    { en: "Turn on the hot wells and confirm they are heating", es: "Enciende los pozos calientes y confirma que calientan" },
    { en: "Brew regular and decaf coffee", es: "Prepara café regular y descafeinado" },
    { en: "Set out the hot food (eggs, sausage, and potatoes)", es: "Saca la comida caliente (huevos, salchicha y papas)" },
    { en: "Set the cold bar (yogurt, fruit, milk, and juice)", es: "Prepara la barra fría (yogur, fruta, leche y jugo)" },
    { en: "Set the waffle station (batter, irons, and plates)", es: "Prepara la estación de waffles (mezcla, planchas y platos)" },
    { en: "Set cereal, bread, and pastries", es: "Coloca cereal, pan y pasteles" },
    { en: "Set signage, utensils, and allergen notes", es: "Coloca letreros, utensilios y notas de alérgenos" },
    { en: "Check date labels on open food and dairy", es: "Revisa las etiquetas de fecha en comida abierta y lácteos" },
    { en: "Log hot food temperatures (hold at or above 135°F)", es: "Registra las temperaturas de comida caliente (mantener a 135°F o más)" },
    { en: "Log cold food temperatures (hold at or below 41°F)", es: "Registra las temperaturas de comida fría (mantener a 41°F o menos)" },
    { en: "Break down: discard or store leftover food", es: "Cierre: desecha o guarda la comida que sobró" },
    { en: "Sanitize hot wells, counters, and waffle irons", es: "Sanitiza los pozos calientes, las barras y las planchas de waffle" },
    { en: "Wipe tables, chairs, and the beverage station", es: "Limpia mesas, sillas y la estación de bebidas" },
    { en: "Restock cups, lids, plates, and utensils for tomorrow", es: "Reabastece vasos, tapas, platos y utensilios para mañana" },
    { en: "Turn off equipment and lock the kitchen", es: "Apaga el equipo y cierra la cocina con llave" }
  ];

  var POOL_NAME = "Daily Pool & Fitness Checklist";
  var POOL = [
    { en: "Confirm the pool water is clear and the deck is free of hazards", es: "Confirma que el agua de la alberca está clara y que la cubierta no tiene riesgos" },
    { en: "Skim the pool and empty the skimmer baskets", es: "Limpia la superficie de la alberca y vacía las canastas" },
    { en: "Wipe the fitness equipment and the fitness room floor", es: "Limpia los aparatos del gimnasio y el piso" },
    { en: "Restock pool towels and test the emergency phone", es: "Reabastece las toallas de la alberca y prueba el teléfono de emergencia" },
    { en: "Check doors, gates, and lights in the pool and fitness rooms", es: "Revisa puertas, rejas y luces de la alberca y el gimnasio" },
    { en: "Log free chlorine (ppm)", es: "Registra el cloro libre (ppm)" },
    { en: "Log the pool pH", es: "Registra el pH de la alberca" },
    { en: "Log pool water temperature (°F)", es: "Registra la temperatura del agua de la alberca (°F)" }
  ];

  var NIGHT_NAME = "3rd Shift - Night Audit Checklist";
  var NIGHT = [
    { en: "Confirm the fire panel is normal", es: "Confirma que el panel de incendio está en normal" },
    { en: "Complete the key audit", es: "Completa la auditoría de llaves" },
    { en: "Review the incident log", es: "Revisa el registro de incidentes" },
    { en: "Lock the lobby and exterior doors for the night", es: "Cierra con llave el lobby y las puertas exteriores para la noche" }
  ];

  var MONTHLY = [
    {
      name: "Monthly Emergency Lighting Log",
      name_es: "Registro mensual de luces de emergencia",
      items: [{ en: "Is the emergency light functional?", es: "¿La luz de emergencia funciona?" }]
    },
    {
      name: "Monthly Exit Sign Lights Log",
      name_es: "Registro mensual de letreros de salida",
      items: [{ en: "Is the Exit Sign functional?", es: "¿El letrero de salida funciona?" }]
    }
  ];

  var ROOM_ITEMS = [
    { en: "Strip the bed and make it to brand standard", es: "Quita la ropa de cama y tiende la cama al estándar de la marca" },
    { en: "Clean the toilet, shower, sink, mirror, and bathroom floor", es: "Limpia el inodoro, la regadera, el lavabo, el espejo y el piso del baño" },
    { en: "Dust surfaces, including the headboard and desk", es: "Quita el polvo de las superficies, incluida la cabecera y el escritorio" },
    { en: "Vacuum the room, including under the bed and behind the door", es: "Aspira la habitación, incluso debajo de la cama y detrás de la puerta" },
    { en: "Empty trash and replace liners", es: "Vacía la basura y cambia las bolsas" },
    { en: "Restock amenities, coffee, and towels", es: "Reabastece amenidades, café y toallas" },
    { en: "Set the thermostat and check lights", es: "Ajusta el termostato y revisa las luces" },
    { en: "Look for items a guest left behind and report maintenance issues", es: "Busca objetos que el huésped haya dejado y reporta fallas de mantenimiento" }
  ];
  var DEEP_ITEMS = [
    { en: "Move furniture so the edges of the room can be cleaned", es: "Mueve los muebles para limpiar los bordes de la habitación" },
    { en: "Edge and extract the carpet", es: "Bordea y extrae la alfombra" },
    { en: "Detail the bathroom, including grout, under the vanity, and the exhaust fan", es: "Detalla el baño, incluso el emboquillado, debajo del tocador y el extractor" },
    { en: "Wash walls, baseboards, and door frames", es: "Lava paredes, zoclos y marcos de puerta" },
    { en: "Clean under the bed, in the closet, and behind the nightstands", es: "Limpia debajo de la cama, dentro del clóset y detrás de los burós" },
    { en: "Clean appliances, including the microwave and refrigerator", es: "Limpia los aparatos, incluido el microondas y el refrigerador" },
    { en: "Clean windows, tracks, and sills", es: "Limpia ventanas, rieles y repisas" },
    { en: "Put the room back together and restock it", es: "Rearma la habitación y reabastécela" }
  ];
  var ROOM_TPL = {
    id: "mspwe-room-clean",
    kind: "room_inspection",
    name_en: "Guest room cleaning",
    name_es: "Limpieza de habitación",
    items: ROOM_ITEMS
  };
  var DEEP_TPL = {
    id: "mspwe-deep-clean",
    kind: "deep_clean",
    name_en: "Deep clean starter",
    name_es: "Plantilla de limpieza profunda",
    items: DEEP_ITEMS
  };
  var SHUTTLE_WALK = "Shuttle/vehicles";
  var LIST_ES = {
    "Daily Pool & Fitness Checklist": "Lista diaria de alberca y gimnasio",
    "Monthly Emergency Lighting Log": "Registro mensual de luces de emergencia",
    "Monthly Exit Sign Lights Log": "Registro mensual de letreros de salida"
  };

  function labelEn(item) {
    if (Array.isArray(item)) return labelEn(item[0]);
    if (item && typeof item === "object") {
      if (item.en != null) return String(item.en);
      if (item.label != null) return labelEn(item.label);
    }
    return item == null ? "" : String(item);
  }
  function labelEs(item) {
    if (Array.isArray(item)) return labelEs(item[0]);
    if (item && typeof item === "object" && item.es != null) return String(item.es);
    return "";
  }
  function has(list, en) {
    return (list || []).some(function (item) { return labelEn(item) === en; });
  }
  function addItems(list, items) {
    items.forEach(function (item) {
      if (has(list, item.en)) return;
      list.push(item);
    });
  }
  function say(en, es) {
    if (typeof bx === "function") return bx(en, es);
    return en;
  }
  function esc(s) {
    if (typeof escH === "function") return escH(s);
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function addI18n() {
    if (typeof I18N === "undefined" || !I18N.es) return;
    Object.keys(LIST_ES).forEach(function (en) {
      I18N.es[en] = LIST_ES[en];
    });
  }
  function foldLists(lists) {
    if (!lists || !lists.MSPWE) return;
    var rows = lists.MSPWE;
    var night = rows.find(function (list) { return list && list.name === NIGHT_NAME; });
    if (night) {
      night.items = night.items || [];
      addItems(night.items, NIGHT);
    }
    var pool = rows.find(function (list) { return list && list.name === POOL_NAME; });
    if (!pool) {
      pool = { name: POOL_NAME, name_es: LIST_ES[POOL_NAME], role: "Maintenance", per: "Daily", shift: "", items: [] };
      rows.push(pool);
    }
    pool.items = pool.items || [];
    addItems(pool.items, POOL);
    MONTHLY.forEach(function (spec) {
      var dest = rows.find(function (list) { return list && list.name === spec.name; });
      if (!dest) {
        dest = { name: spec.name, name_es: spec.name_es, role: "Maintenance", per: "Monthly", shift: "", items: [] };
        rows.push(dest);
      }
      dest.items = dest.items || [];
      addItems(dest.items, spec.items);
    });
  }
  function foldBreakfast(check) {
    if (!check) return false;
    var cur = check["Breakfast Attendant"] || [];
    var same = cur.length === BREAKFAST.length && BREAKFAST.every(function (item, i) {
      return labelEn(cur[i]) === item.en && labelEs(cur[i]) === item.es;
    });
    if (same) return false;
    var marks = {};
    cur.forEach(function (row) {
      marks[labelEn(row)] = Array.isArray(row) ? row[1] : 0;
    });
    check["Breakfast Attendant"] = BREAKFAST.map(function (item) {
      return [{ en: item.en, es: item.es }, marks[item.en] || 0];
    });
    return true;
  }
  function seedTemplates(data) {
    if (!data) return;
    data.ckCustom = data.ckCustom || [];
    [ROOM_TPL, DEEP_TPL].forEach(function (tpl) {
      if (data.ckCustom.some(function (row) { return row && row.id === tpl.id; })) return;
      data.ckCustom.push({
        id: tpl.id,
        kind: tpl.kind,
        name_en: tpl.name_en,
        name_es: tpl.name_es,
        items: tpl.items.map(function (item) { return { en: item.en, es: item.es }; })
      });
    });
  }
  function applyHotel(hotel, data) {
    if (hotel !== "MSPWE" || !data) return false;
    var changed = false;
    if (data.check) changed = foldBreakfast(data.check) || changed;
    seedTemplates(data);
    return changed;
  }
  function walkFor(walk, hotel) {
    if (!walk || hotel !== "MSPWE") return walk || {};
    var out = {};
    Object.keys(walk).forEach(function (area) {
      out[area] = (walk[area] || []).filter(function (item) { return labelEn(item) !== SHUTTLE_WALK; });
    });
    return out;
  }
  function foodTempOk(kind, tp) {
    var n = Number(tp);
    if (!n) return false;
    return kind === "Hot" ? n >= 135 : n <= 41;
  }
  function blankChem() {
    return { chlorine: "", ph: "", temp: "" };
  }
  function applyChem(entry, field, value) {
    var next = blankChem();
    if (entry) {
      next.chlorine = entry.chlorine == null ? "" : String(entry.chlorine);
      next.ph = entry.ph == null ? "" : String(entry.ph);
      next.temp = entry.temp == null ? "" : String(entry.temp);
    }
    if (field === "chlorine" || field === "ph" || field === "temp") next[field] = String(value == null ? "" : value).trim();
    return next;
  }
  function dayKey() {
    if (typeof ld === "function") return ld();
    return new Date().toISOString().slice(0, 10);
  }
  function poolToday() {
    var data = D();
    data.poolChem = data.poolChem || {};
    var key = dayKey();
    data.poolChem[key] = applyChem(data.poolChem[key]);
    return data.poolChem[key];
  }
  function setChem(field, value) {
    if (typeof D !== "function") return null;
    var row = applyChem(poolToday(), field, value);
    D().poolChem[dayKey()] = row;
    if (typeof save === "function") save();
    return row;
  }
  function logFoodTemp(kind, value) {
    var tp = Number(value);
    if (!tp || (kind !== "Hot" && kind !== "Cold")) return null;
    var row = {
      it: kind === "Hot" ? "Hot holding" : "Cold holding",
      ty: kind,
      tp: tp,
      at: typeof now === "function" ? now() : "",
      ok: foodTempOk(kind, tp)
    };
    if (typeof LD === "function") {
      var day = LD();
      day.temps = day.temps || [];
      day.temps.unshift(row);
      if (typeof save === "function") save();
      if (typeof render === "function") render();
    }
    return row;
  }
  function foundStatus(relTo, dispDate, nowIso, disposedLabel) {
    var to = String(relTo || "").trim();
    var disp = String(dispDate || "").trim();
    if (!to && !disp) return { st: "stored", rel: null };
    var at = disp ? new Date(disp + "T12:00:00").toISOString() : (nowIso || new Date().toISOString());
    if (to) return { st: "claimed", rel: { to: to, sig: false, at: at } };
    return { st: "disposed", rel: { to: disposedLabel || "Disposed per policy", sig: false, at: at } };
  }
  function tempBox(kind) {
    var label = kind === "Hot" ? say("Hot food °F", "Comida caliente °F") : say("Cold food °F", "Comida fría °F");
    var hint = kind === "Hot" ? say("Hold at or above 135°F", "Mantener a 135°F o más") : say("Hold at or below 41°F", "Mantener a 41°F o menos");
    return '<div class="row"><input type="number" inputmode="decimal" aria-label="' + esc(label) + '" placeholder="°F" style="max-width:120px" onchange="HHQMspwe.logFoodTemp(\'' + kind + '\', this.value)"><small>' + esc(hint) + "</small></div>";
  }
  function chemBox(field) {
    var entry = blankChem();
    try { if (typeof D === "function") entry = poolToday(); } catch (e) {}
    var meta = {
      chlorine: ["Free chlorine ppm", "Cloro libre ppm", "ppm"],
      ph: ["pH", "pH", "pH"],
      temp: ["Water °F", "Agua °F", "°F"]
    }[field];
    return '<div class="row"><input type="number" inputmode="decimal" step="0.1" aria-label="' + esc(say(meta[0], meta[1])) + '" placeholder="' + esc(meta[2]) + '" style="max-width:140px" value="' + esc(entry[field] || "") + '" onchange="HHQMspwe.setChem(\'' + field + '\', this.value)"></div>';
  }
  function extraFor(en) {
    if (en.indexOf("Log hot food") === 0) return tempBox("Hot");
    if (en.indexOf("Log cold food") === 0) return tempBox("Cold");
    if (en.indexOf("Log free chlorine") === 0) return chemBox("chlorine");
    if (en.indexOf("Log the pool pH") === 0) return chemBox("ph");
    if (en.indexOf("Log pool water") === 0) return chemBox("temp");
    return "";
  }
  function install() {
    addI18n();
    var changed = false;
    if (typeof QUORE !== "undefined" && QUORE.lists) foldLists(QUORE.lists);
    if (typeof S !== "undefined" && S.h && S.h.MSPWE) changed = applyHotel("MSPWE", S.h.MSPWE) || changed;
    return changed;
  }

  var api = {
    BREAKFAST: BREAKFAST,
    POOL: POOL,
    POOL_NAME: POOL_NAME,
    NIGHT: NIGHT,
    NIGHT_NAME: NIGHT_NAME,
    MONTHLY: MONTHLY,
    ROOM_TPL: ROOM_TPL,
    DEEP_TPL: DEEP_TPL,
    SHUTTLE_WALK: SHUTTLE_WALK,
    foldLists: foldLists,
    foldBreakfast: foldBreakfast,
    seedTemplates: seedTemplates,
    applyHotel: applyHotel,
    walkFor: walkFor,
    foodTempOk: foodTempOk,
    applyChem: applyChem,
    setChem: setChem,
    logFoodTemp: logFoodTemp,
    foundStatus: foundStatus,
    install: install
  };
  root.HHQMspwe = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  install();
  if (typeof itRow === "function") {
    var prevRow = itRow;
    itRow = function (it) {
      var html = prevRow(it);
      if (!it || (typeof S !== "undefined" && S.hotel !== "MSPWE")) return html;
      return html + extraFor(labelEn(it.label != null ? it.label : it));
    };
  }
  if (typeof render === "function") {
    var prev = render;
    render = function () {
      var dirty = false;
      try { dirty = install() === true; } catch (e) {}
      var out = prev.apply(this, arguments);
      if (!dirty) return out;
      try { install(); } catch (e2) {}
      return prev.apply(this, arguments);
    };
    if (typeof S !== "undefined" && S.uid) {
      try { render(); } catch (e3) {}
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
