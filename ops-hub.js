/* New request + activity log.
   One button sends guest requests, rush rooms, houseperson help, and work orders
   to housekeeping, maintenance, or the front desk, with one status: open, ack, done.
   Houseperson help alerts the house person and the shuttle driver.
   The activity log filters shift notes, the key log, lost & found, room notices,
   log sheets, and winter snow / storm / cold logs. Search is by room.
   Demo rows stay on this device and are labeled EXAMPLE. */
(function (root) {
  "use strict";
  var KINDS = ["guest_request", "rush", "houseperson_help", "work_order"];
  var CATS = ["all", "shift_note", "key_log", "lost_found", "room_notice", "log_sheet", "winter"];

  function deptFor(kind, cat) {
    if (kind === "work_order") return "maintenance";
    if (kind === "rush" || kind === "houseperson_help") return "housekeeping";
    var map = {
      towels: "housekeeping", amen: "housekeeping", clean: "housekeeping",
      maint: "maintenance", temp: "maintenance",
      noise: "front_desk", bill: "front_desk", bfast: "front_desk", other: "front_desk"
    };
    return map[cat] || "front_desk";
  }
  function normStatus(raw) {
    var s = String(raw || "").toLowerCase();
    if (["done", "resolved", "complete", "completed", "claimed", "shipped", "disposed"].indexOf(s) >= 0) return "done";
    if (["ack", "acknowledged", "in progress", "started", "progress"].indexOf(s) >= 0) return "ack";
    return "open";
  }
  function catOn(filter, category) {
    if (!filter || filter === "all") return true;
    if (filter === "winter") return String(category || "").indexOf("winter_") === 0;
    return filter === category;
  }
  function filterActivity(rows, q) {
    q = q || {};
    var room = String(q.room || "").trim().toLowerCase();
    return (rows || []).filter(function (r) {
      if (!catOn(q.category, r.category)) return false;
      if (room && String(r.room || "").toLowerCase().indexOf(room) < 0) return false;
      return true;
    });
  }
  function alertsFor(kind) {
    return kind === "houseperson_help" ? ["house_person", "shuttle_driver"] : [];
  }

  var api = {
    KINDS: KINDS,
    CATS: CATS,
    deptFor: deptFor,
    normStatus: normStatus,
    catOn: catOn,
    filterActivity: filterActivity,
    alertsFor: alertsFor
  };
  root.RequestHub = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;

  var B = function (en, es) { return bx(en, es); };
  var H = escH;
  function demo() { return typeof qpDemo === "function" ? qpDemo() : !(typeof useRemote === "function" && useRemote()); }
  function guestRows() { return (typeof QPX !== "undefined" && QPX.grList) ? QPX.grList() : []; }

  function kindLabel(k) {
    return {
      guest_request: B("Guest request", "Solicitud de huésped"),
      rush: B("Rush room", "Cuarto urgente"),
      houseperson_help: B("Houseperson help", "Ayuda de houseperson"),
      work_order: B("Work order", "Orden de trabajo")
    }[k] || k;
  }
  function deptLabel(d) {
    return { housekeeping: B("Housekeeping", "Housekeeping"), maintenance: B("Maintenance", "Mantenimiento"), front_desk: B("Front desk", "Recepción") }[d] || d;
  }
  function catLabel(c) {
    return {
      all: B("All", "Todo"),
      shift_note: B("Shift notes", "Notas de turno"),
      key_log: B("Key log", "Bitácora de llaves"),
      lost_found: B("Lost & found", "Objetos perdidos"),
      room_notice: B("Room notices", "Avisos"),
      log_sheet: B("Log sheets", "Bitácoras"),
      winter: B("Winter logs", "Bitácoras de invierno"),
      winter_snow: B("Snow", "Nieve"),
      winter_storm: B("Storm", "Tormenta"),
      winter_cold: B("Cold", "Frío")
    }[c] || c;
  }
  function whenLabel(v) {
    var d = new Date(v);
    if (!v || isNaN(d.getTime())) return String(v || "");
    if (String(v).indexOf("T") < 0 && String(v).indexOf("-") < 0) return String(v);
    return d.toLocaleString(typeof localeTag === "function" ? localeTag() : undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function statusLabel(s) {
    return s === "done" ? B("Done", "Hecho") : s === "ack" ? B("Acknowledged", "Recibido") : B("Open", "Abierta");
  }

  function collect() {
    var rows = [];
    function add(row) { rows.push(row); }
    try {
      guestRows().forEach(function (r) {
        add({ kind: "guest_request", dept: deptFor("guest_request", r.cat), room: r.room, title: r.note || "", status: normStatus(r.st), at: r.at || "", example: !!r.ex, ref: r, source: "guest" });
      });
    } catch (e) {}
    try {
      (D().rooms || []).forEach(function (r) {
        if (r.rush && !r.rush.done && (typeof rushIsOn !== "function" || rushIsOn(r))) {
          add({ kind: "rush", dept: "housekeeping", room: String(r.n), title: (r.rush.note || B("Rush", "Urgente")), status: "open", at: r.rush.at || "", example: !!r.rush.ex, ref: r, source: "rush" });
        }
      });
    } catch (e) {}
    try {
      (D().reqs || []).forEach(function (r) {
        if (typeof isHpHelp === "function" && !isHpHelp(r.kind || r.role)) return;
        add({ kind: "houseperson_help", dept: "housekeeping", room: r.room || "", title: r.text || "", status: normStatus(r.st), at: r.day || "", example: !!r.ex, ref: r, source: "help", alerts: alertsFor("houseperson_help") });
      });
    } catch (e) {}
    try {
      (D().wo || []).forEach(function (w) {
        add({ kind: "work_order", dept: "maintenance", room: String(w.room || ""), title: (typeof ftPlain === "function" ? ftPlain(w, w.t) : w.t) || "", status: normStatus(w.s), at: w.at || "", example: !!w.ex, ref: w, source: "wo" });
      });
    } catch (e) {}
    (D().opsExtra || []).forEach(add);
    return rows.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  }

  function activityRows() {
    var rows = [];
    function add(r) { rows.push(r); }
    try {
      (D().notes || []).forEach(function (n, i) {
        add({ category: "shift_note", room: n.room || "", summary: typeof ftPlain === "function" ? ftPlain(n, n.t) : (n.t || ""), status: n.sh || "", at: n.at || "", source: "shift_notes", source_id: String(n.sb_id || i), example: !!(n.ex || /\(EX\)/.test(n.by || "")) });
      });
    } catch (e) {}
    try {
      var kl = (D().kl || {})[typeof ld === "function" ? ld() : ""] || [];
      kl.forEach(function (x, i) {
        add({ category: "key_log", room: "", summary: x.t || "", status: x.i ? "in" : "out", at: x.o || "", source: "key_log", source_id: "kl" + i, example: /\(EX\)/.test(x.by || "") });
      });
    } catch (e) {}
    try {
      if (typeof QPX !== "undefined") {
        var logs = QPX.lsRows();
        Object.keys(logs).forEach(function (sheet) {
          (logs[sheet] || []).forEach(function (e) {
            var room = e.v && e.v.room ? String(e.v.room) : "";
            add({ category: sheet === "keys" ? "key_log" : "log_sheet", room: room, summary: sheet, status: e.balanced === false ? "variance" : (e.v && e.v.why) || "", at: e.at || "", source: "log_entries", source_id: String(e.sb || e.id), example: !!e.ex });
          });
        });
        QPX.rnList().forEach(function (n) {
          add({ category: "room_notice", room: String(n.room || ""), summary: n.note || "", status: n.ty || "", at: n.at || "", source: "room_notices", source_id: String(n.sb || n.id), example: !!n.ex });
        });
      }
    } catch (e) {}
    try {
      var list = typeof lfList === "function" ? lfList() : (D().lfx || D().lf || []);
      list.forEach(function (x) {
        add({ category: "lost_found", room: String(x.room || ""), summary: x.desc || x.it || "", status: x.st || "", at: x.at || "", source: "lost_found", source_id: String(x.id || ""), example: !!x.ex });
      });
    } catch (e) {}
    try {
      var mem = JSON.parse(root.localStorage.getItem("jrportal_winter_v1") || "null");
      var year = mem && mem.years ? Object.keys(mem.years).sort().pop() : "";
      var season = year && mem.years[year].hotels ? mem.years[year].hotels[S.hotel] : null;
      (season && season.logs || []).forEach(function (log, i) {
        var cat = log.kind === "snow" ? "winter_snow" : log.kind === "storm" ? "winter_storm" : log.kind === "cold" ? "winter_cold" : "winter_log";
        add({ category: cat, room: String(log.room || ""), summary: log.note || "", status: log.kind || "", at: log.at || log.day || "", source: "winter_logs", source_id: "w" + i, example: !!log.ex });
      });
    } catch (e) {}
    (D().actRemote || []).forEach(function (r) {
      if (!rows.some(function (x) { return x.source === r.source && x.source_id === r.source_id; })) rows.push(r);
    });
    return rows;
  }

  function sheet() {
    var f = S.nrf || (S.nrf = { kind: "guest_request", cat: "towels", room: "", note: "", pri: "med" });
    var dept = deptFor(f.kind, f.cat);
    var cats = [["towels", "Towels", "Toallas"], ["clean", "Cleanliness", "Limpieza"], ["maint", "Maintenance", "Mantenimiento"], ["temp", "Heat / AC", "Calefacción / A/C"], ["noise", "Noise", "Ruido"], ["other", "Other", "Otro"]];
    var catRow = f.kind === "guest_request" ? '<div class="chips">' + cats.map(function (c) {
      return '<button type="button" class="chip ' + (f.cat === c[0] ? "on" : "") + '" onclick="HQ.pick(\'cat\',\'' + c[0] + '\')">' + H(B(c[1], c[2])) + "</button>";
    }).join("") + "</div>" : "";
    var help = f.kind === "houseperson_help" ? "<small>" + H(B("Alerts the house person and the shuttle driver.", "Avisa al houseperson y al conductor del shuttle.")) + "</small>" : "";
    return '<div class="ops-sheet" id="opsSheet" role="dialog" aria-modal="true" aria-labelledby="opsTitle"><div class="ops-card"><h3 id="opsTitle">' + H(B("New request", "Nueva solicitud")) + '</h3><div class="chips">' + KINDS.map(function (k) {
      return '<button type="button" class="chip ' + (f.kind === k ? "on" : "") + '" onclick="HQ.pick(\'kind\',\'' + k + '\')">' + H(kindLabel(k)) + "</button>";
    }).join("") + "</div>" + catRow + '<label>' + H(B("Room", "Habitación")) + '<input id="opsRoom" inputmode="numeric" value="' + H(f.room) + '"></label><label>' + H(B("What is needed?", "¿Qué se necesita?")) + '<textarea id="opsNote">' + H(f.note) + "</textarea></label>" + help + '<p><small>' + H(B("Goes to", "Va a")) + " <b>" + H(deptLabel(dept)) + "</b></small></p><div class=\"bad\" id=\"opsErr\" role=\"alert\"></div><div class=\"row\"><button type=\"button\" class=\"btn\" onclick=\"HQ.send()\">" + H(B("Send", "Enviar")) + '</button><button type="button" class="btn2" onclick="HQ.close()">' + H(B("Close", "Cerrar")) + "</button></div></div></div>";
  }

  function listHtml() {
    var rows = collect();
    var open = rows.filter(function (r) { return r.status !== "done"; }).length;
    var body = rows.slice(0, 40).map(function (r, i) {
      return '<tr><td data-l="' + H(B("Type", "Tipo")) + '">' + H(kindLabel(r.kind)) + '</td><td data-l="' + H(B("Room", "Habitación")) + '">' + H(r.room || "") + '</td><td data-l="' + H(B("Team", "Equipo")) + '">' + H(deptLabel(r.dept)) + '</td><td data-l="' + H(B("Need", "Necesidad")) + '">' + H(String(r.title || "").slice(0, 140)) + '</td><td data-l="' + H(B("Status", "Estado")) + '">' + H(statusLabel(r.status)) + '</td><td data-l="' + H(B("Example", "Ejemplo")) + '">' + (r.example ? H(B("EXAMPLE", "EJEMPLO")) : "") + '</td><td data-l="' + H(B("Update", "Actualizar")) + '">' + (r.status === "done" ? "" : '<button type="button" class="chip" onclick="HQ.advance(' + i + ')">' + H(r.status === "open" ? B("Ack", "Recibir") : B("Done", "Hecho")) + "</button>") + "</td></tr>";
    }).join("");
    return '<div class="card" id="opsList"><h3>' + H(B("Requests", "Solicitudes")) + ' <span class="badge' + (open ? "" : " zero") + '">' + open + '</span></h3><div class="qp-tw"><table class="qp-t"><thead><tr><th>' + H(B("Type", "Tipo")) + "</th><th>" + H(B("Room", "Habitación")) + "</th><th>" + H(B("Team", "Equipo")) + "</th><th>" + H(B("Need", "Necesidad")) + "</th><th>" + H(B("Status", "Estado")) + "</th><th>" + H(B("Example", "Ejemplo")) + "</th><th>" + H(B("Update", "Actualizar")) + "</th></tr></thead><tbody>" + (body || '<tr><td colspan="7"><small>' + H(B("No requests yet.", "Aún no hay solicitudes.")) + "</small></td></tr>") + "</tbody></table></div></div>";
  }

  function activityHtml() {
    var q = S.actf || (S.actf = { category: "all", room: "" });
    var rows = filterActivity(activityRows(), q);
    var chips = CATS.map(function (c) {
      return '<button type="button" class="chip ' + (q.category === c ? "on" : "") + '" onclick="HQ.act(\'category\',\'' + c + '\')">' + H(catLabel(c)) + "</button>";
    }).join("");
    var body = rows.slice(0, 80).map(function (r) {
      return "<tr><td data-l=\"" + H(B("When", "Cuándo")) + "\">" + H(whenLabel(r.at)) + "</td><td data-l=\"" + H(B("Category", "Categoría")) + "\">" + H(catLabel(r.category)) + "</td><td data-l=\"" + H(B("Room", "Habitación")) + "\">" + H(r.room || "") + "</td><td data-l=\"" + H(B("Detail", "Detalle")) + "\">" + H(String(r.summary || "").slice(0, 180)) + "</td><td data-l=\"" + H(B("Status", "Estado")) + "\">" + H(r.status || "") + "</td><td data-l=\"" + H(B("Example", "Ejemplo")) + "\">" + (r.example ? H(B("EXAMPLE", "EJEMPLO")) : "") + "</td></tr>";
    }).join("");
    return '<h2>📒 ' + H(B("Activity log", "Bitácora de actividad")) + '</h2><div class="card"><label>' + H(B("Room", "Habitación")) + '<input id="actRoom" type="search" inputmode="numeric" value="' + H(q.room) + '" oninput="HQ.act(\'room\',this.value)"></label><div class="chips">' + chips + "</div></div><div class=\"card\"><div class=\"qp-tw\"><table class=\"qp-t\"><thead><tr><th>" + H(B("When", "Cuándo")) + "</th><th>" + H(B("Category", "Categoría")) + "</th><th>" + H(B("Room", "Habitación")) + "</th><th>" + H(B("Detail", "Detalle")) + "</th><th>" + H(B("Status", "Estado")) + "</th><th>" + H(B("Example", "Ejemplo")) + "</th></tr></thead><tbody>" + (body || "<tr><td colspan=\"6\"><small>" + H(B("Nothing in this filter.", "Nada en este filtro.")) + "</small></td></tr>") + "</tbody></table></div></div>";
  }

  function readForm() {
    var f = S.nrf;
    var room = document.getElementById("opsRoom");
    var note = document.getElementById("opsNote");
    if (room) f.room = room.value.trim();
    if (note) f.note = note.value.trim();
    return f;
  }
  function pushOps(row) {
    if (demo() || !root.sb || row.example) return Promise.resolve(null);
    var body = {
      hotel_id: S.hotel, kind: row.kind, dept: row.dept, room: String(row.room || ""),
      title: String(row.title || "").slice(0, 180), note: row.note || null, priority: row.pri || null,
      status: row.status || "open", source_table: row.source_table || null, source_id: row.source_id ? String(row.source_id) : null,
      author_label: typeof cw === "function" ? cw() : "", example: false
    };
    return root.sb.from("ops_requests").insert(body).select().single().then(function (res) {
      if (res.error) { console.warn("ops_requests", res.error.message || res.error); return null; }
      return res.data;
    });
  }

  root.HQ = {
    open: function () { S.opsOpen = 1; render(); },
    close: function () { S.opsOpen = 0; render(); },
    pick: function (k, v) { readForm(); S.nrf[k] = v; render(); },
    act: function (k, v) {
      S.actf = S.actf || { category: "all", room: "" };
      S.actf[k] = v;
      if (k === "room") {
        var box = document.getElementById("actLog");
        if (box) { box.innerHTML = activityHtml(); var el = document.getElementById("actRoom"); if (el) { el.focus(); try { el.setSelectionRange(v.length, v.length); } catch (e) {} } return; }
      }
      render();
    },
    send: function () {
      var f = readForm();
      var err = document.getElementById("opsErr");
      if (!f.note) { if (err) err.textContent = B("Add a short note.", "Agrega una nota corta."); return; }
      var dept = deptFor(f.kind, f.cat);
      if (f.kind === "guest_request" && typeof QP !== "undefined") {
        var before = guestRows().length;
        S.grf = { type: "request", room: f.room, ini: "", cat: f.cat, pri: "med", note: f.note, to: "", cb: "" };
        var roomEl = document.getElementById("grRoom"), noteEl = document.getElementById("grNote");
        if (roomEl) roomEl.value = f.room;
        if (noteEl) noteEl.value = f.note;
        QP.grPost();
        var created = guestRows()[0];
        if (!created || guestRows().length === before) {
          if (err) err.textContent = B("Add the room and a short note.", "Agrega la habitación y una nota corta.");
          S.opsOpen = 1;
          return;
        }
        pushOps({ kind: "guest_request", dept: dept, room: created.room, title: created.note, status: "open", source_table: "guest_requests", source_id: created.sb || "", pri: created.pri });
      } else if (f.kind === "rush") {
        var room = (D().rooms || []).find(function (r) { return String(r.n) === String(f.room); });
        if (!room) { if (err) err.textContent = B("Pick a room that is on the board.", "Elige una habitación del tablero."); return; }
        room.pri = "rush";
        room.rush = { by: typeof cw === "function" ? cw() : "", at: Date.now(), due: 0, guest: "standard", note: f.note, done: 0 };
        try { careAlert(B("⚡ Rush room " + room.n, "⚡ Habitación urgente " + room.n), f.note, { role: "Housekeeping" }); } catch (e) {}
        save();
        pushOps({ kind: "rush", dept: "housekeeping", room: String(room.n), title: f.note, status: "open", source_table: "rooms", source_id: String(room.n) });
      } else if (f.kind === "houseperson_help") {
        var row = typeof postStaffReq === "function" ? postStaffReq("houseperson_help", f.note) : null;
        if (row) { row.room = f.room; save(); }
        pushOps({ kind: "houseperson_help", dept: "housekeeping", room: f.room, title: f.note, status: "open", source_table: "reqs", source_id: "" });
      } else if (f.kind === "work_order") {
        var d = D();
        var wo = { id: (d.wo || []).length + 1, room: f.room || "-", t: f.note, p: "Med", s: "Open", photo: "", photo_paths: [], comments: [] };
        d.wo.unshift(wo);
        save();
        pushOps({ kind: "work_order", dept: "maintenance", room: wo.room, title: f.note, status: "open", source_table: "work_orders", source_id: wo.sb_id || "" });
      }
      S.nrf = { kind: f.kind, cat: "towels", room: "", note: "", pri: "med" };
      S.opsOpen = 0;
      try { showToast(B("Sent to ", "Enviada a ") + deptLabel(dept)); } catch (e) {}
      render();
    },
    advance: function (i) {
      var row = collect()[i];
      if (!row) return;
      var next = row.status === "open" ? "ack" : "done";
      if (row.source === "guest" && typeof QP !== "undefined") {
        if (next === "ack") QP.grAck(row.ref.id);
        else { S.grRes = 0; row.ref.res = row.ref.res || ""; row.ref.st = "done"; row.ref.doneAt = new Date().toISOString(); if (typeof save === "function") save(); if (typeof qpFlush === "function") qpFlush("gr"); render(); }
      } else if (row.source === "rush") {
        if (next === "done" && typeof rushClear === "function") rushClear(row.ref.n);
        else render();
      } else if (row.source === "help") {
        var idx = (D().reqs || []).indexOf(row.ref);
        if (idx >= 0 && typeof rSt === "function") rSt(idx, next === "ack" ? "Started" : "Done");
      } else if (row.source === "wo") {
        var wi = (D().wo || []).indexOf(row.ref);
        if (wi >= 0 && typeof woSet === "function") woSet(wi, next === "ack" ? "In Progress" : "Done");
      }
      if (row.ref && row.ref.opsId && !demo() && root.sb) {
        var patch = { status: next }; if (next === "ack") patch.ack_at = new Date().toISOString(); if (next === "done") patch.done_at = new Date().toISOString();
        root.sb.from("ops_requests").update(patch).eq("id", row.ref.opsId);
      }
    },
    signKey: function () {
      var t = document.getElementById("kt"), p = document.getElementById("kp");
      var day = typeof ld === "function" ? ld() : "";
      D().kl = D().kl || {}; D().kl[day] = D().kl[day] || [];
      var row = { t: t ? t.value : "", p: p ? p.value : "", o: typeof now === "function" ? now() : "", by: typeof cw === "function" ? cw() : "" };
      D().kl[day].unshift(row);
      save();
      if (!demo() && root.sb) {
        root.sb.from("log_entries").insert({
          hotel_id: S.hotel, sheet: "keys",
          data: { room: "", key: row.t, person: row.p, out: row.o },
          out_of_range: false, author_label: row.by, example: false
        });
      }
      render();
    },
    pull: async function () {
      if (demo() || !root.sb) return;
      var feed = await root.sb.from("ops_request_feed").select("*").eq("hotel", S.hotel);
      if (!feed.error && feed.data) D().opsFeed = feed.data;
      var act = await root.sb.from("activity_log").select("*").eq("hotel", S.hotel).order("logged_at", { ascending: false }).limit(200);
      if (!act.error && act.data) {
        D().actRemote = act.data.map(function (r) {
          return { category: r.category, room: r.room || "", summary: r.summary || "", status: r.status || "", at: r.logged_at || "", source: r.source, source_id: r.source_id, example: false };
        });
      }
    }
  };

  if (typeof M !== "undefined") {
    M.alog = ["📒", "Activity log"];
    if (typeof I18N !== "undefined") I18N.es["Activity log"] = "Bitácora de actividad";
  }
  if (typeof V !== "undefined") {
    V.alog = function () { return '<div id="actLog">' + activityHtml() + "</div>"; };
    var _home = V.home;
    V.home = function () { return listHtml() + _home(); };
  }
  if (typeof TILES !== "undefined") Object.keys(TILES).forEach(function (role) {
    if (TILES[role].indexOf("alog") < 0) TILES[role].push("alog");
  });
  try { if (typeof RSEC !== "undefined") RSEC[1][2].push("alog"); } catch (e) {}

  if (typeof keyLogCard === "function") {
    var _key = keyLogCard;
    keyLogCard = function () {
      return _key().replace("D().kl[ld()].unshift({t:$('kt').value,p:$('kp').value,o:now(),by:cw()});save();render()", "HQ.signKey()");
    };
  }
  if (typeof addN === "function") {
    var _addN = addN;
    addN = function () {
      var roomEl = document.getElementById("nroom");
      var room = roomEl ? roomEl.value.trim() : "";
      _addN();
      var n = (D().notes || [])[0];
      if (n && room) { n.room = room; save(); }
      if (n && !demo() && root.sb && String(n.t || "").trim()) {
        root.sb.from("shift_notes").insert({
          hotel_id: S.hotel, department: typeof writeDept === "function" ? writeDept("front_desk") : "front_desk",
          shift: n.sh || "AM", body: typeof ftPlain === "function" ? ftPlain(n, n.t) : n.t, room: n.room || null
        }).select().single().then(function (res) { if (res.data) n.sb_id = res.data.id; });
      }
    };
  }
  if (typeof V !== "undefined" && typeof V.notes === "function") {
    var _notes = V.notes;
    V.notes = function () {
      return _notes().replace('<textarea id="nt"', '<input id="nroom" inputmode="numeric" placeholder="' + H(B("Room (optional)", "Habitación (opcional)")) + '" aria-label="' + H(B("Room", "Habitación")) + '"><textarea id="nt"');
    };
  }

  function mount() {
    if (!document.body || typeof meUser !== "function" || !meUser()) {
      var old = document.getElementById("opsBtn"); if (old) old.remove();
      var oldS = document.getElementById("opsMount"); if (oldS) oldS.remove();
      var oldF = document.getElementById("hhqFabs"); if (oldF) oldF.remove();
      return;
    }
    var btn = document.getElementById("opsBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "opsBtn";
      btn.type = "button";
      btn.className = "ops-btn";
      btn.onclick = function () { root.HQ.open(); };
      document.body.appendChild(btn);
    }
    btn.textContent = B("New request", "Nueva solicitud");
    var desk = typeof rMode === "function" && rMode() === "desk" && !(typeof S !== "undefined" && S.sbMini);
    var foot = document.getElementById("sbFoot");
    var help = document.getElementById("uxHelpBtn");
    var stack = document.getElementById("hhqFabs");
    if (desk && foot) {
      btn.classList.add("ops-in-side");
      foot.insertBefore(btn, foot.firstChild);
      if (help && help.parentNode !== document.body) document.body.appendChild(help);
      if (stack) stack.remove();
    } else {
      btn.classList.remove("ops-in-side");
      if (!stack) {
        stack = document.createElement("div");
        stack.id = "hhqFabs";
        document.body.appendChild(stack);
      }
      if (help) stack.appendChild(help);
      stack.appendChild(btn);
    }
    var mountPoint = document.getElementById("opsMount");
    if (S.opsOpen) {
      if (!mountPoint) { mountPoint = document.createElement("div"); mountPoint.id = "opsMount"; document.body.appendChild(mountPoint); }
      mountPoint.innerHTML = sheet();
    } else if (mountPoint) mountPoint.remove();
  }
  if (typeof render === "function") {
    var _render = render;
    render = function () { var out = _render.apply(this, arguments); try { mount(); } catch (e) {} return out; };
  }
  if (typeof hydrate === "function") {
    var _hy = hydrate;
    hydrate = async function () {
      var out = await _hy.apply(this, arguments);
      try { await root.HQ.pull(); } catch (e) {}
      return out;
    };
  }
  var css = document.createElement("style");
  css.textContent = "#hhqFabs{position:fixed;right:12px;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:45;display:flex;flex-direction:column;align-items:flex-end;gap:10px}.ops-btn{min-height:48px;padding:0 16px;border:0;border-radius:999px;background:#143d66;color:#fff;font:700 15px/1.2 inherit;box-shadow:0 6px 18px #0003}#hhqFabs #uxHelpBtn,#hhqFabs .ops-btn{position:static}.ops-sheet{position:fixed;inset:0;z-index:60;background:#0b1b2e88;display:flex;align-items:flex-end;justify-content:center}.ops-card{background:#fff;width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px}.ops-card textarea,.ops-card input{width:100%;margin:6px 0}@media(min-width:768px){#hhqFabs{right:16px;bottom:24px}}@media(min-width:1024px){#hhqFabs{right:24px;bottom:24px}.ops-btn.ops-in-side{position:static;width:100%;margin:0 0 8px;border-radius:10px;box-shadow:none}.ops-sheet{align-items:center;justify-content:center;padding:24px}.ops-card{border-radius:16px;width:min(640px,100%);max-height:min(80vh,760px);box-shadow:0 24px 70px #0006}}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
