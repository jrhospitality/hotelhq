/* Checklist engine.
   One place for daily, seasonal (winter), property walk, room inspection, and deep clean.
   Existing screens keep their behavior. This hub adds progress cards, Done / N/A / notes / photos,
   and lets a GM or corporate create a template. Demo mode stays on this device.
   Seasonal defaults: assigned October 15, due November 5. */
(function (root) {
  "use strict";
  var KINDS = ["daily", "seasonal", "walk", "room_inspection", "deep_clean"];
  var SEASONAL = { assignMonth: 10, assignDay: 15, dueMonth: 11, dueDay: 5 };

  function pad(n) { return String(n).padStart(2, "0"); }
  function tally(items) {
    var done = 0, na = 0, open = 0, i, st;
    for (i = 0; i < items.length; i++) {
      st = items[i] && items[i].status;
      if (st === "done") done++;
      else if (st === "na") na++;
      else open++;
    }
    return {
      done: done, na: na, open: open, total: items.length,
      pct: items.length ? Math.round(100 * (done + na) / items.length) : 0
    };
  }
  function validTemplate(t) {
    if (!t || KINDS.indexOf(t.kind) < 0) return false;
    if (!String(t.name_en || "").trim() || !String(t.name_es || "").trim()) return false;
    if (!Array.isArray(t.items) || !t.items.length) return false;
    return t.items.every(function (it) { return String(it.en || "").trim() && String(it.es || "").trim(); });
  }
  function seasonDates(t) {
    t = t || {};
    return {
      assignMonth: clamp(t.assignMonth, 1, 12, SEASONAL.assignMonth),
      assignDay: clamp(t.assignDay, 1, 28, SEASONAL.assignDay),
      dueMonth: clamp(t.dueMonth, 1, 12, SEASONAL.dueMonth),
      dueDay: clamp(t.dueDay, 1, 28, SEASONAL.dueDay)
    };
  }
  function clamp(n, a, b, fallback) {
    n = Math.round(Number(n));
    if (!isFinite(n)) return fallback;
    return Math.min(b, Math.max(a, n));
  }
  function winterProgress(state, hotel, today) {
    var empty = { pct: 0, done: 0, na: 0, open: 28, total: 28, assign: "", due: "", year: 0, optional: false };
    if (!state || !state.years) return empty;
    today = String(today || "");
    var cal = +today.slice(0, 4);
    var defs = state.defaults || {};
    var best = 0, year, bucket, assign;
    for (year = 2026; year <= cal + 1; year++) {
      bucket = state.years[String(year)];
      assign = (bucket && bucket.assignOn) || (year + "-" + pad(clamp(defs.assignMonth, 1, 12, 10)) + "-" + pad(clamp(defs.assignDay, 1, 28, 15)));
      if (assign <= today || (bucket && year <= cal)) best = year;
    }
    bucket = state.years[String(best)];
    var row = bucket && bucket.hotels ? bucket.hotels[hotel] : null;
    if (!row) return empty;
    var items = [], n, st;
    for (n = 1; n <= 28; n++) {
      st = row.items && row.items[n] ? row.items[n].status : "open";
      items.push({ status: st });
    }
    var c = tally(items);
    c.assign = bucket.assignOn || "";
    c.due = row.dueOn || "";
    c.year = best;
    c.optional = !!row.optional;
    return c;
  }

  var api = {
    KINDS: KINDS,
    SEASONAL: SEASONAL,
    tally: tally,
    validTemplate: validTemplate,
    seasonDates: seasonDates,
    winterProgress: winterProgress
  };
  root.CheckEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;

  var B = function (en, es) { return bx(en, es); };
  var H = escH;

  function demo() { return typeof qpDemo === "function" ? qpDemo() : !(typeof useRemote === "function" && useRemote()); }
  function metaBag() { var d = D(); d.ckMeta = d.ckMeta || {}; return d.ckMeta; }
  function customs() { var d = D(); d.ckCustom = d.ckCustom || []; return d.ckCustom; }
  function runs() { var d = D(); d.ckRun = d.ckRun || {}; return d.ckRun; }
  function todayKey() { return typeof ld === "function" ? ld() : new Date().toISOString().slice(0, 10); }
  function periodFor(kind, room) {
    if (kind === "seasonal") return String(new Date().getFullYear());
    if (kind === "walk" && typeof pk === "function") return pk("Weekly");
    if (kind === "room_inspection" || kind === "deep_clean") return String(room || S.ckRoom || "");
    return todayKey();
  }
  function cell(tpl, itemKey) {
    var bag = runs();
    var id = String(tpl.id);
    bag[id] = bag[id] || {};
    var p = periodFor(tpl.kind, S.ckRoom);
    bag[id][p] = bag[id][p] || {};
    if (!bag[id][p][itemKey]) bag[id][p][itemKey] = { status: "open", note: "", naReason: "", photo: "" };
    return bag[id][p][itemKey];
  }
  function builtinMeta(key) {
    var bag = metaBag();
    if (!bag[key]) bag[key] = { status: "open", note: "", naReason: "", photo: "" };
    return bag[key];
  }
  function bar(pct) {
    return '<div class="ck-bar" role="img" aria-label="' + pct + '%"><i style="width:' + pct + '%"></i></div>';
  }
  function card(title, sub, c, onclick) {
    return '<button type="button" class="card ck-card" onclick="' + onclick + '"><b>' + title + '</b><div class="kpi"><div><b>' + c.pct + '%</b>' + H(B("Complete", "Lista")) + '</div><div><b>' + c.done + '</b>' + H(B("Done", "Hecho")) + '</div><div><b>' + c.na + '</b>N/A</div><div><b>' + c.open + '</b>' + H(B("Open", "Abiertas")) + '</div></div>' + bar(c.pct) + '<small>' + sub + '</small></button>';
  }
  function dailyTally() {
    var items = [];
    try {
      ITEMS().forEach(function (it) {
        if (it.key.indexOf("GM-") === 0) return;
        if (S.role !== "GM" && it.def !== S.role) return;
        var m = metaBag()[pk(it.per) + "|" + it.key] || {};
        var st = m.status === "na" ? "na" : ((m.status === "done" || isD(it.key, it.per)) ? "done" : "open");
        items.push({ status: st });
      });
    } catch (e) {}
    return tally(items);
  }
  function gmTally() {
    var items = [];
    ["Daily", "Weekly", "Monthly", "Quarterly"].forEach(function (per) {
      try {
        ITEMS().filter(function (x) { return x.grp === "GM " + per; }).forEach(function (it) {
          var m = metaBag()[pk(it.per) + "|" + it.key] || {};
          items.push({ status: m.status === "na" ? "na" : ((m.status === "done" || isD(it.key, it.per)) ? "done" : "open") });
        });
      } catch (e) {}
    });
    return tally(items);
  }
  function walkTally() {
    var items = [];
    try {
      var w = ((D().wk || {})[pk("Weekly")]) || {};
      Object.values(QUORE.walk).forEach(function (list) {
        list.forEach(function (x) {
          var v = w[enOf(x)] || {};
          items.push({ status: v.na ? "na" : (v.d ? "done" : "open") });
        });
      });
    } catch (e) {}
    return tally(items);
  }
  function inspTally() {
    var rows = (D().insp || []).slice(0, 30);
    var items = rows.map(function (x) {
      return { status: x.score === "" || x.score == null ? "open" : "done" };
    });
    return tally(items);
  }
  function plusDays(iso, n) {
    var d = new Date(String(iso).slice(0, 10) + "T12:00:00");
    if (isNaN(d.getTime())) return todayKey();
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function deepTally() {
    var items = [];
    try {
      var s = QPX.dcState();
      var today = todayKey();
      Object.keys(s.rooms || {}).forEach(function (n) {
        var last = s.rooms[n].last || today;
      var due = plusDays(last, s.cycle || 90);
        items.push({ status: due < today ? "open" : "done" });
      });
    } catch (e) {}
    return tally(items);
  }
  function winterTally() {
    var mem = null;
    try { mem = JSON.parse(root.localStorage.getItem("jrportal_winter_v1") || "null"); } catch (e) {}
    return winterProgress(mem, S.hotel, todayKey());
  }
  function customTally(tpl) {
    var bag = (runs()[String(tpl.id)] || {})[periodFor(tpl.kind, "")] || {};
    return tally((tpl.items || []).map(function (it, i) {
      return bag[String(i)] || { status: "open" };
    }));
  }

  function hub() {
    var w = winterTally();
    var due = w.due ? H(B("Due ", "Vence ")) + H(w.due) : H(B("Due Nov 5", "Vence el 5 de nov"));
    var assign = w.assign ? H(B("Assigned ", "Asignada ")) + H(w.assign) : H(B("Assigned Oct 15", "Asignada el 15 de oct"));
    var html = '<h2>✅ ' + H(B("Checklists", "Listas")) + '</h2><p><small>' + H(B("One list for daily work, the winter season, the property walk, room inspections, and deep cleans.", "Una lista para el día, la temporada de invierno, el recorrido, las inspecciones y las limpiezas profundas.")) + '</small></p>';
    html += '<div class="ck-cards">';
    html += card(H(B("Daily", "Diaria")), H(B("Resets on its schedule. Done, N/A, notes, and photos sit on each line.", "Se reinicia según su calendario. Hecho, N/A, notas y fotos van en cada línea.")), dailyTally(), "go('check')");
    if (S.role === "GM" || (typeof tilesFor === "function" && tilesFor(S.role).indexOf("gmc") >= 0)) html += card(H(B("GM checklists", "Listas del GM")), H(B("Daily, weekly, and monthly.", "Diaria, semanal y mensual.")), gmTally(), "go('gmc')");
    html += card("❄️ " + H(B("Winter", "Invierno")), assign + " · " + due + (w.optional ? " · " + H(B("Optional", "Opcional")) : "") + " · " + H(String(w.year || "")), w, "go('winter')");
    html += card(H(B("Property walk", "Recorrido")), H(B("Weekly areas. An issue still opens a work order.", "Áreas de la semana. Un problema sigue abriendo una orden.")), walkTally(), "go('walk')");
    html += card(H(B("Room inspection", "Inspección")), H(B("Guestroom and area inspections stay on the inspect screen.", "Las inspecciones siguen en la pantalla de inspección.")), inspTally(), "go('insp')");
    html += card(H(B("Deep clean", "Limpieza profunda")), H(B("Cycle, assign, start, and done stay on this list.", "El ciclo, la asignación, el inicio y el hecho siguen aquí.")), deepTally(), "go('dc')");
    customs().forEach(function (tpl) {
      html += card(H(B(tpl.name_en, tpl.name_es)) + (tpl.ex ? " · " + H(B("EXAMPLE", "EJEMPLO")) : ""), H(kindName(tpl.kind)), customTally(tpl), "CK.open('" + H(tpl.id) + "')");
    });
    html += "</div>";
    if (typeof leader === "function" && leader()) html += editor();
    if (S.ckOpen) html += runner(customs().find(function (t) { return String(t.id) === String(S.ckOpen); }));
    return html;
  }
  function kindName(k) {
    return {
      daily: B("Daily", "Diaria"),
      seasonal: B("Seasonal", "De temporada"),
      walk: B("Property walk", "Recorrido"),
      room_inspection: B("Room inspection", "Inspección"),
      deep_clean: B("Deep clean", "Limpieza profunda")
    }[k] || k;
  }
  function editor() {
    var f = S.ckf || (S.ckf = { kind: "daily", name_en: "", name_es: "", items: [{ en: "", es: "" }], assignMonth: 10, assignDay: 15, dueMonth: 11, dueDay: 5 });
    var rows = f.items.map(function (it, i) {
      return '<div class="row"><input aria-label="English" placeholder="' + H(B("Item (English)", "Punto (inglés)")) + '" value="' + H(it.en) + '" onchange="CK.editItem(' + i + ',\'en\',this.value)"><input aria-label="Español" placeholder="' + H(B("Item (Spanish)", "Punto (español)")) + '" value="' + H(it.es) + '" onchange="CK.editItem(' + i + ',\'es\',this.value)"></div>';
    }).join("");
    var season = f.kind === "seasonal" ? '<div class="row"><label>' + H(B("Assign month", "Mes de asignación")) + '<input type="number" min="1" max="12" value="' + f.assignMonth + '" onchange="CK.edit(\'assignMonth\',this.value)"></label><label>' + H(B("Assign day", "Día")) + '<input type="number" min="1" max="28" value="' + f.assignDay + '" onchange="CK.edit(\'assignDay\',this.value)"></label><label>' + H(B("Due month", "Mes límite")) + '<input type="number" min="1" max="12" value="' + f.dueMonth + '" onchange="CK.edit(\'dueMonth\',this.value)"></label><label>' + H(B("Due day", "Día límite")) + '<input type="number" min="1" max="28" value="' + f.dueDay + '" onchange="CK.edit(\'dueDay\',this.value)"></label></div><small>' + H(B("A new seasonal list assigns on October 15 and is due November 5 unless you change it.", "Una lista de temporada nueva se asigna el 15 de octubre y vence el 5 de noviembre, salvo que la cambies.")) + "</small>" : "";
    return '<div class="card" id="ckEditor"><h3>' + H(B("New template", "Nueva plantilla")) + '</h3><small>' + H(B("GM and corporate can add a template for this hotel.", "El GM y corporativo pueden agregar una plantilla para este hotel.")) + '</small><div class="chips">' + KINDS.map(function (k) {
      return '<button type="button" class="chip ' + (f.kind === k ? "on" : "") + '" onclick="CK.edit(\'kind\',\'' + k + '\')">' + H(kindName(k)) + "</button>";
    }).join("") + '</div><input style="width:100%" placeholder="' + H(B("Name (English)", "Nombre (inglés)")) + '" value="' + H(f.name_en) + '" onchange="CK.edit(\'name_en\',this.value)"><input style="width:100%" placeholder="' + H(B("Name (Spanish)", "Nombre (español)")) + '" value="' + H(f.name_es) + '" onchange="CK.edit(\'name_es\',this.value)">' + season + rows + '<button type="button" class="btn2" onclick="CK.addItem()">' + H(B("Add item", "Agregar punto")) + '</button><div class="bad" id="ckErr" role="alert"></div><button type="button" class="btn" style="width:100%" onclick="CK.saveTpl()">' + H(B("Save template", "Guardar plantilla")) + "</button></div>";
  }
  function runner(tpl) {
    if (!tpl) return "";
    var needsRoom = tpl.kind === "room_inspection" || tpl.kind === "deep_clean";
    var room = H(S.ckRoom || "");
    var c = customTally(tpl);
    var dates = tpl.kind === "seasonal" ? seasonDates(tpl) : null;
    var head = '<div class="card"><b>' + H(B(tpl.name_en, tpl.name_es)) + '</b> · ' + H(kindName(tpl.kind)) + '<div>' + c.pct + "% · " + (c.done + c.na) + "/" + c.total + "</div>" + bar(c.pct);
    if (dates) head += "<small>" + H(B("Assign ", "Asignar ")) + dates.assignMonth + "/" + dates.assignDay + " · " + H(B("Due ", "Vence ")) + dates.dueMonth + "/" + dates.dueDay + "</small>";
    head += "</div>";
    var roomBox = needsRoom ? '<div class="card"><label>' + H(B("Room", "Habitación")) + '<input id="ckRoom" inputmode="numeric" value="' + room + '" onchange="CK.room(this.value)"></label></div>' : "";
    var body = (tpl.items || []).map(function (it, i) {
      var m = cell(tpl, String(i));
      return itemControls("c:" + tpl.id + ":" + i, B(it.en, it.es), m, "CK.custom");
    }).join("");
    return head + roomBox + body + '<button type="button" class="btn2" onclick="CK.open(\'\')">' + H(B("Back to all lists", "Volver a las listas")) + "</button>";
  }
  function itemControls(id, label, m, ns) {
    var enc = encodeURIComponent(id);
    var naOn = m.status === "na" || m.status === "pending-na";
    return '<div class="card ck-item">' + (label ? '<div class="row" style="margin:0"><b style="flex:1">' + H(label) + '</b><span class="pill ' + (m.status === "done" ? "VC" : m.status === "na" ? "OD" : "VD") + '">' + H(m.status === "done" ? B("Done", "Hecho") : m.status === "na" ? "N/A" : B("Open", "Abierta")) + "</span></div>" : "") + '<div class="chips"><button type="button" class="chip ' + (m.status === "done" ? "on" : "") + '" onclick="' + ns + '(\'' + enc + '\',\'done\')">' + H(B("Done", "Hecho")) + '</button><button type="button" class="chip ' + (naOn ? "on" : "") + '" onclick="' + ns + '(\'' + enc + '\',\'na\')">' + H(B("N/A", "N/A")) + '</button></div>' + (naOn ? '<input style="width:100%" placeholder="' + H(B("Why is this N/A?", "¿Por qué es N/A?")) + '" value="' + H(m.naReason || "") + '" onchange="' + ns + '(\'' + enc + '\',\'reason\',this.value)">' : "") + '<input style="width:100%" placeholder="' + H(B("Note", "Nota")) + '" value="' + H(m.note || "") + '" onchange="' + ns + '(\'' + enc + '\',\'note\',this.value)"><label class="chip">' + H(B("Photo", "Foto")) + '<input type="file" accept="image/*" hidden onchange="' + ns + '(\'' + enc + '\',\'photo\',this)"></label>' + (m.photo ? '<img alt="" src="' + m.photo + '" style="max-width:160px;border-radius:8px">' : "") + "</div>";
  }
  function builtinExtra(it) {
    var key = pk(it.per) + "|" + it.key;
    var m = metaBag()[key] || { status: "open", note: "", naReason: "", photo: "" };
    return '<div class="ck-extra">' + itemControls("b:" + key, "", m, "CK.builtin").replace("<b></b>", "") + "</div>";
  }

  function pushState(row) {
    if (demo() || !root.sb) return;
    if (row.status === "na" && !String(row.na_reason || "").trim()) return;
    root.sb.from("checklist_item_state").upsert(row, { onConflict: "hotel_id,template_key,period_key,item_key,room" }).then(function (res) {
      if (res.error) console.warn("checklist_item_state", res.error.message || res.error);
    });
  }
  function pushCustom(tpl) {
    if (demo() || !root.sb || !validTemplate(tpl)) return;
    var dates = seasonDates(tpl);
    var body = {
      hotel_id: S.hotel,
      department: tpl.kind === "walk" ? "management" : (tpl.kind === "seasonal" ? "maintenance" : "housekeeping"),
      name: tpl.name_en,
      name_es: tpl.name_es,
      cadence: tpl.kind === "daily" ? "daily" : tpl.kind,
      items: tpl.items,
      source: "custom",
      active: true,
      kind: tpl.kind
    };
    if (tpl.kind === "seasonal") {
      body.assign_month = dates.assignMonth;
      body.assign_day = dates.assignDay;
      body.due_month = dates.dueMonth;
      body.due_day = dates.dueDay;
    }
    var q = tpl.sb ? root.sb.from("checklist_templates").update(body).eq("id", tpl.sb) : root.sb.from("checklist_templates").insert(body);
    q.select().single().then(function (res) {
      if (res.error) { console.warn("checklist_templates", res.error.message || res.error); return; }
      if (res.data) tpl.sb = res.data.id;
      try { save(); } catch (e) {}
    });
  }
  function pushDeep() {
    if (demo() || !root.sb || typeof QPX === "undefined") return;
    var s = QPX.dcState();
    if (s.ex) return;
    Object.keys(s.rooms || {}).forEach(function (room) {
      var r = s.rooms[room];
      root.sb.from("deep_clean_rooms").upsert({
        hotel_id: S.hotel,
        room: String(room),
        cycle_days: s.cycle || 90,
        last_done: r.last || null,
        assignee_label: r.who || ""
      }, { onConflict: "hotel_id,room" }).then(function (res) {
        if (res.error) console.warn("deep_clean_rooms", res.error.message || res.error);
      });
    });
  }

  root.CK = {
    open: function (id) { S.ckOpen = id || ""; render(); },
    edit: function (k, v) { S.ckf = S.ckf || {}; S.ckf[k] = (k === "kind" || k.indexOf("name") === 0) ? v : +v; render(); },
    editItem: function (i, k, v) { S.ckf.items[i][k] = v; },
    addItem: function () { S.ckf.items.push({ en: "", es: "" }); render(); },
    saveTpl: function () {
      var f = S.ckf, err = document.getElementById("ckErr");
      var dates = seasonDates(f);
      var tpl = { id: "c" + Date.now().toString(36), kind: f.kind, name_en: String(f.name_en || "").trim(), name_es: String(f.name_es || "").trim(), items: f.items.map(function (it) { return { en: String(it.en || "").trim(), es: String(it.es || "").trim() }; }).filter(function (it) { return it.en || it.es; }), assignMonth: dates.assignMonth, assignDay: dates.assignDay, dueMonth: dates.dueMonth, dueDay: dates.dueDay };
      tpl.items.forEach(function (it) { if (!it.es) it.es = it.en; if (!it.en) it.en = it.es; });
      if (!validTemplate(tpl)) { if (err) err.textContent = B("Add a name in both languages and at least one item.", "Agrega el nombre en los dos idiomas y al menos un punto."); return; }
      customs().unshift(tpl);
      S.ckf = null;
      S.ckOpen = tpl.id;
      save();
      pushCustom(tpl);
      render();
    },
    room: function (v) { S.ckRoom = String(v || "").trim(); render(); },
    custom: function (enc, act, val) {
      var parts = decodeURIComponent(enc).split(":");
      var tpl = customs().find(function (t) { return String(t.id) === parts[1]; });
      if (!tpl) return;
      var m = cell(tpl, parts[2]);
      applyAct(m, act, val, function () {
        pushState({
          hotel_id: S.hotel,
          template_key: String(tpl.sb || tpl.id),
          template_id: tpl.sb || null,
          period_key: periodFor(tpl.kind, S.ckRoom),
          item_key: parts[2],
          room: S.ckRoom || "",
          status: m.status === "pending-na" ? "open" : m.status,
          na_reason: m.naReason || null,
          note: m.note || null,
          photo: m.photo || null
        });
      });
    },
    builtin: function (enc, act, val) {
      var key = decodeURIComponent(enc).slice(2);
      var m = builtinMeta(key);
      applyAct(m, act, val, function () {
        var bits = key.split("|");
        pushState({
          hotel_id: S.hotel,
          template_key: "builtin",
          period_key: bits[0] || todayKey(),
          item_key: bits.slice(1).join("|"),
          room: "",
          status: m.status === "pending-na" ? "open" : (m.status === "na" ? "na" : (m.status === "done" ? "done" : "open")),
          na_reason: m.naReason || null,
          note: m.note || null,
          photo: m.photo || null
        });
      });
    },
    pull: async function () {
      if (demo() || !root.sb) return;
      var h = S.hotel;
      var tpls = await root.sb.from("checklist_templates").select("*").eq("hotel_id", h).eq("source", "custom");
      if (!tpls.error && tpls.data) {
        var mine = customs().filter(function (t) { return !t.sb; });
        var remote = tpls.data.map(function (row) {
          return {
            id: "sb" + row.id, sb: row.id, kind: row.kind || "daily",
            name_en: row.name, name_es: row.name_es || row.name,
            items: Array.isArray(row.items) ? row.items.map(function (it) {
              if (typeof it === "string") return { en: it, es: it };
              return { en: it.en || it.label || "", es: it.es || it.en || "" };
            }) : [],
            assignMonth: row.assign_month, assignDay: row.assign_day, dueMonth: row.due_month, dueDay: row.due_day
          };
        });
        D().ckCustom = remote.concat(mine);
      }
      var states = await root.sb.from("checklist_item_state").select("*").eq("hotel_id", h);
      if (!states.error && states.data) {
        states.data.forEach(function (row) {
          if (row.template_key === "builtin") {
            metaBag()[row.period_key + "|" + row.item_key] = { status: row.status, note: row.note || "", naReason: row.na_reason || "", photo: row.photo || "" };
            if (row.status === "done" && typeof tg !== "function") {}
          }
        });
      }
      var deep = await root.sb.from("deep_clean_rooms").select("*").eq("hotel_id", h);
      if (!deep.error && typeof QPX !== "undefined") {
        var s = QPX.dcState();
        if (deep.data && deep.data.length) {
          s.ex = 0; s.rooms = {}; s.hist = s.hist || [];
          deep.data.forEach(function (row) {
            if (row.cycle_days) s.cycle = row.cycle_days;
            s.rooms[row.room] = { last: row.last_done || todayKey(), st: "", who: row.assignee_label || "" };
          });
        } else if (s.ex) { s.rooms = {}; s.hist = []; s.ex = 0; }
      }
    }
  };

  function applyAct(m, act, val, done) {
    if (act === "done") m.status = m.status === "done" ? "open" : "done";
    else if (act === "na") {
      if (m.status === "na") { m.status = "open"; m.naReason = ""; }
      else m.status = "pending-na";
    } else if (act === "reason") {
      m.naReason = String(val || "");
      m.status = m.naReason.trim() ? "na" : "pending-na";
    } else if (act === "note") m.note = String(val || "");
    else if (act === "photo") { readPhoto(val, function (url) { m.photo = url; save(); render(); done(); }); return; }
    save();
    render();
    if (m.status !== "pending-na") done();
  }
  function readPhoto(input, done) {
    var file = input && input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 480 / Math.max(img.width, img.height));
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  if (typeof M !== "undefined") {
    M.ckhub = ["✅", "All checklists"];
    if (typeof I18N !== "undefined") I18N.es["All checklists"] = "Todas las listas";
  }
  if (typeof V !== "undefined") V.ckhub = hub;
  if (typeof TILES !== "undefined") Object.keys(TILES).forEach(function (role) {
    if (TILES[role].indexOf("ckhub") < 0) TILES[role].unshift("ckhub");
  });
  if (typeof NAV !== "undefined") Object.keys(NAV).forEach(function (role) {
    var i = NAV[role].indexOf("check");
    if (i >= 0) NAV[role].splice(i, 1, "ckhub");
  });
  try { if (typeof RSEC !== "undefined") RSEC[0][2].unshift("ckhub"); } catch (e) {}

  if (typeof itRow === "function") {
    var _itRow = itRow;
    itRow = function (it) { return _itRow(it) + builtinExtra(it); };
  }
  ["check", "gmc", "walk", "insp", "winter", "dc"].forEach(function (id) {
    if (typeof V === "undefined" || typeof V[id] !== "function") return;
    var fn = V[id];
    V[id] = function () {
      return '<button type="button" class="btn2 ck-back" onclick="go(\'ckhub\')">‹ ' + H(B("All checklists", "Todas las listas")) + "</button>" + fn();
    };
  });
  ["dcAsg", "dcSt", "dcDone", "dcCycle"].forEach(function (name) {
    if (typeof QP === "undefined" || typeof QP[name] !== "function") return;
    var fn = QP[name];
    QP[name] = function () { var out = fn.apply(this, arguments); pushDeep(); return out; };
  });
  if (typeof hydrate === "function") {
    var _hy = hydrate;
    hydrate = async function () {
      var out = await _hy.apply(this, arguments);
      try { await root.CK.pull(); } catch (e) { console.warn(e); }
      return out;
    };
  }

  var css = document.createElement("style");
  css.textContent = ".ck-cards{display:grid;grid-template-columns:1fr;gap:8px}.ck-card{text-align:left;width:100%;cursor:pointer;border:1px solid #d5deea}.ck-bar{height:8px;background:#e6ebf2;border-radius:4px;overflow:hidden;margin:6px 0}.ck-bar i{display:block;height:100%;background:#15642f}.ck-extra .card{margin:6px 0;background:#f7f9fc}.ck-back{margin-bottom:8px}@media(min-width:800px){.ck-cards{grid-template-columns:1fr 1fr}}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
