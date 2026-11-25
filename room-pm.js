/* Weekly guestroom PM pacing.
   Monday's batch is the rooms not yet completed this quarter, divided by the
   Mondays left in the quarter (including this Monday, through the last Monday
   on or before quarter end), rounded up. Quarter progress is completed tasks
   in the quarter. The demo uses example counts and example staff, not a copy
   of which real rooms were finished. */
(function (root) {
  "use strict";

  var DEMO_PROGRAMS = [
    { id: "guestrooms", title_en: "Guestrooms", title_es: "Habitaciones", done: 91 },
    { id: "smoke", title_en: "Quarterly Smoke Detector Testing", title_es: "Prueba trimestral de detectores de humo", done: 82 },
    { id: "mattress", title_en: "Mattress Rotation Log", title_es: "Rotación de colchones", done: 105 }
  ];

  function pad(n) { return String(n).padStart(2, "0"); }
  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function parseDay(iso) {
    var p = String(iso || "").slice(0, 10).split("-");
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1, 12, 0, 0, 0);
  }
  function addDays(iso, n) {
    var d = parseDay(iso);
    d.setDate(d.getDate() + n);
    return ymd(d);
  }
  function mondayOf(iso) {
    var d = parseDay(iso);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return ymd(d);
  }
  function quarterBounds(iso) {
    var d = parseDay(iso);
    var q = Math.floor(d.getMonth() / 3);
    var start = new Date(d.getFullYear(), q * 3, 1, 12, 0, 0, 0);
    var end = new Date(d.getFullYear(), q * 3 + 3, 0, 12, 0, 0, 0);
    return { start: ymd(start), end: ymd(end) };
  }
  function mondaysBetween(startIso, endIso) {
    var n = 0;
    var d = parseDay(startIso);
    var end = parseDay(endIso);
    while (d <= end) {
      n += 1;
      d.setDate(d.getDate() + 7);
    }
    return Math.max(1, n);
  }
  function weeksLeft(iso) {
    var monday = mondayOf(iso);
    var q = quarterBounds(iso);
    if (monday > q.end) return 1;
    return mondaysBetween(monday, q.end);
  }
  function weeksInQuarter(iso) {
    var q = quarterBounds(iso);
    var first = mondayOf(q.start);
    if (first < q.start) first = addDays(first, 7);
    if (first > q.end) return 1;
    return mondaysBetween(first, q.end);
  }
  function batchSize(remaining, weeks) {
    var left = Math.max(0, remaining | 0);
    if (!left) return 0;
    return Math.ceil(left / Math.max(1, weeks | 0));
  }
  function paceOf(done, total, left, weeks, quarterWeeks) {
    if (left <= 0) return "on_pace";
    var needed = Math.ceil(left / Math.max(1, weeks));
    var even = Math.ceil(Math.max(total, 1) / Math.max(1, quarterWeeks));
    return needed > even ? "behind" : "on_pace";
  }
  function num(room) { return parseInt(room, 10) || 0; }
  function sortRooms(list) {
    var seen = {};
    return (list || []).map(function (r) { return String(r); }).filter(function (r) {
      if (!/^[0-9]+$/.test(r) || seen[r]) return false;
      seen[r] = 1;
      return true;
    }).sort(function (a, b) { return num(a) - num(b) || (a < b ? -1 : a > b ? 1 : 0); });
  }
  function feedCode(row) {
    if (row == null) return "";
    if (typeof row === "string") {
      var plain = row.trim().toUpperCase();
      return plain === "VC" || plain === "VD" || plain === "OC" || plain === "OD" || plain === "OOO" ? plain : "";
    }
    var code = String(row.hhq_code || "").trim().toUpperCase();
    if (code === "VC" || code === "VD" || code === "OC" || code === "OD" || code === "OOO") return code;
    if (row.ooo || row.oos) return "OOO";
    if (row.occupied === true) return "OD";
    var hk = String(row.hk_status || row.fo_status || row.s || "").trim().toUpperCase();
    if (hk === "VC" || hk === "VD" || hk === "OC" || hk === "OD" || hk === "OOO") return hk;
    return "";
  }
  function statusMap(opts) {
    opts = opts || {};
    var out = {};
    (opts.rooms || []).forEach(function (row) {
      var code = feedCode(row);
      var n = String(row.room_number != null ? row.room_number : row.n != null ? row.n : "");
      if (n && code) out[n] = code;
    });
    (opts.hotelkey || []).forEach(function (row) {
      var code = feedCode(row);
      if (row && row.room_number != null && code) out[String(row.room_number)] = code;
    });
    return out;
  }
  function occupancy(status) {
    var s = feedCode(status);
    if (s === "VC" || s === "VD") return "vacant";
    if (s === "OC" || s === "OD") return "occupied";
    if (s === "OOO") return "ooo";
    return "unknown";
  }
  function exampleStatus(room) {
    var n = num(room);
    if (n % 19 === 0) return "OOO";
    if (n % 5 === 0) return "OD";
    if (n % 3 === 0) return "OC";
    if (n % 2 === 0) return "VD";
    return "VC";
  }
  function assignRooms(rooms, staff) {
    var people = (staff || []).filter(function (s) { return s && s.active !== false && s.id; });
    var loads = {};
    people.forEach(function (s) { loads[s.id] = s.open || 0; });
    return rooms.map(function (room) {
      if (!people.length) return { room: String(room), assigneeId: "", assigneeName: "" };
      var who = people.slice().sort(function (a, b) {
        return (loads[a.id] - loads[b.id]) || String(a.id).localeCompare(String(b.id));
      })[0];
      loads[who.id] += 1;
      return { room: String(room), assigneeId: who.id, assigneeName: who.name || "" };
    });
  }
  function planProgram(opts) {
    var rooms = sortRooms(opts.rooms);
    var monday = mondayOf(opts.asOf);
    var q = quarterBounds(opts.asOf);
    var weeks = weeksLeft(opts.asOf);
    var quarterWeeks = weeksInQuarter(opts.asOf);
    var doneSet = {};
    sortRooms(opts.doneRooms).forEach(function (r) { if (rooms.indexOf(r) >= 0) doneSet[r] = 1; });
    var stored = (opts.tasks || []).filter(function (t) {
      return t && t.programId === opts.program.id && t.week === monday;
    });
    var carried = (opts.tasks || []).filter(function (t) {
      return t && t.programId === opts.program.id && !t.done && t.week !== monday;
    }).length;
    var done = rooms.filter(function (r) { return doneSet[r]; }).length;
    var leftRooms = rooms.filter(function (r) { return !doneSet[r]; });
    var due = addDays(monday, 6);
    if (due > q.end) due = q.end;
    var roomTaken = {};
    (opts.tasks || []).forEach(function (t) {
      if (t && t.programId === opts.program.id && !t.done) roomTaken[String(t.room)] = 1;
    });
    var fresh = leftRooms.filter(function (r) { return !roomTaken[r]; });
    var want = Math.max(0, batchSize(leftRooms.length, weeks) - carried);
    var created = [];
    if (!stored.length) {
      assignRooms(fresh.slice(0, want), opts.staff).forEach(function (row, i) {
        created.push({
          id: opts.program.id + "-" + monday.replace(/-/g, "") + "-" + (i + 1),
          programId: opts.program.id,
          title_en: opts.program.title_en,
          title_es: opts.program.title_es || opts.program.title_en,
          room: row.room,
          assigneeId: row.assigneeId,
          assigneeName: row.assigneeName,
          week: monday,
          due: due,
          done: false
        });
      });
    }
    return {
      id: opts.program.id,
      title_en: opts.program.title_en,
      title_es: opts.program.title_es || opts.program.title_en,
      total: rooms.length,
      done: done,
      left: leftRooms.length,
      weeks: weeks,
      weeksInQuarter: quarterWeeks,
      pace: paceOf(done, rooms.length, leftRooms.length, weeks, quarterWeeks),
      monday: monday,
      due: due,
      tasks: stored.length ? stored : created,
      created: !stored.length,
      doneRooms: rooms.filter(function (r) { return doneSet[r]; })
    };
  }
  function planHotel(opts) {
    var rooms = sortRooms(opts.rooms);
    var staff = (opts.staff || []).filter(function (s) { return s && s.active !== false; });
    var loads = {};
    staff.forEach(function (s) { loads[s.id] = s.open || 0; });
    var all = (opts.tasks || []).slice();
    var created = [];
    var programs = (opts.programs || []).map(function (program) {
      var base = opts.doneRooms && opts.doneRooms[program.id]
        ? opts.doneRooms[program.id].slice()
        : rooms.slice(0, Math.min(program.done || 0, rooms.length));
      var finished = all.filter(function (t) { return t.programId === program.id && t.done; }).map(function (t) { return t.room; });
      var view = planProgram({
        asOf: opts.asOf,
        rooms: rooms,
        doneRooms: base.concat(opts.extraDone || []).concat(finished),
        staff: staff.map(function (s) { return { id: s.id, name: s.name, open: loads[s.id] || 0, active: true }; }),
        program: program,
        tasks: all
      });
      if (view.created) {
        view.tasks.forEach(function (t) {
          all.push(t);
          created.push(t);
          if (t.assigneeId) loads[t.assigneeId] = (loads[t.assigneeId] || 0) + 1;
        });
      }
      return view;
    });
    return { programs: programs, tasks: all, created: created };
  }
  function progressFromTasks(rows, rooms, quarterStart, quarterEnd, scheduleId) {
    var universe = sortRooms(rooms);
    var done = {};
    (rows || []).forEach(function (row) {
      if (!row || !row.done) return;
      var sid = row.pace_schedule_id || row.schedule_id;
      if (scheduleId != null && String(sid) !== String(scheduleId)) return;
      var asset = String(row.asset || row.room || "");
      if (!/^[0-9]+$/.test(asset)) return;
      var day = String(row.completed_at || "").slice(0, 10);
      if (!day || day < quarterStart || day > quarterEnd) return;
      done[asset] = 1;
    });
    var total = universe.length || Object.keys(done).length;
    var count = universe.length ? universe.filter(function (r) { return done[r]; }).length : Object.keys(done).length;
    return { total: total, done: count, left: Math.max(0, total - count) };
  }
  function suggest(opts) {
    var rooms = sortRooms(opts.rooms);
    var done = {};
    sortRooms(opts.doneRooms).forEach(function (r) { done[r] = 1; });
    var open = {};
    (opts.tasks || []).forEach(function (t) {
      if (!t || t.done || t === opts.current) return;
      if (opts.current && t.programId !== opts.current.programId) return;
      open[String(t.room)] = 1;
    });
    var current = opts.current ? String(opts.current.room) : "";
    var statuses = opts.statuses || {};
    function rank(room) {
      var occ = occupancy(statuses[room]);
      if (occ === "vacant") return 0;
      if (occ === "unknown") return 1;
      if (occ === "occupied") return 2;
      return 3;
    }
    return rooms.filter(function (r) { return r !== current && !done[r] && !open[r]; }).sort(function (a, b) {
      return rank(a) - rank(b) || num(a) - num(b);
    });
  }
  function applySwap(opts) {
    var task = opts.task;
    var room = String(opts.room || "");
    var from = task ? String(task.room) : "";
    if (!task || !/^[0-9]+$/.test(room) || room === from) return { ok: false };
    var done = {};
    sortRooms(opts.doneRooms).forEach(function (r) { done[r] = 1; });
    if (done[room]) return { ok: false };
    var clash = (opts.tasks || []).some(function (t) {
      return t !== task && !t.done && t.programId === task.programId && String(t.room) === room;
    });
    if (clash) return { ok: false };
    var before = (opts.tasks || []).length;
    task.room = room;
    return {
      ok: true,
      from: from,
      to: room,
      reason: "occupied",
      count: before,
      log: {
        who: opts.who || "",
        whoId: opts.whoId || "",
        from: from,
        to: room,
        reason: "occupied",
        taskId: task.id,
        at: opts.at || ""
      }
    };
  }
  function assignmentNotices(tasks) {
    var groups = {};
    (tasks || []).forEach(function (t) {
      if (!groups[t.programId]) groups[t.programId] = { en: t.title_en, es: t.title_es || t.title_en, rooms: [] };
      groups[t.programId].rooms.push(t.room);
    });
    return Object.keys(groups).map(function (id) {
      var g = groups[id];
      var list = g.rooms.join(", ");
      return {
        kind: "pm_assigned",
        title_en: "PM assigned",
        title_es: "MP asignado",
        body_en: g.en + ": " + list,
        body_es: g.es + ": " + list
      };
    });
  }
  function L(en, es, lang) {
    if (lang) return lang === "es" ? es : en;
    return (typeof LANG !== "undefined" && LANG === "es") ? es : en;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function cardHtml(view, lang, extras) {
    extras = extras || {};
    var pace = view.pace === "behind" ? L("Behind", "Atrasado", lang) : L("On pace", "Al día", lang);
    var paceClass = view.pace === "behind" ? "bad" : "good";
    var title = lang === "es" ? view.title_es : view.title_en;
    var rows = (view.tasks || []).map(function (t) { return rowHtml(t, view, lang, extras); }).join("");
    var math = view.left + " ÷ " + view.weeks;
    return '<div class="card" id="room-pm-' + esc(view.id) + '"><h3>' + esc(title) + "</h3>" +
      '<div class="kpi"><div><b>' + view.done + "/" + view.total + "</b>" + esc(L("Rooms done", "Habitaciones listas", lang)) + "</div>" +
      "<div><b>" + view.left + "</b>" + esc(L("Still to do", "Faltan", lang)) + "</div>" +
      "<div><b>" + view.weeks + "</b>" + esc(L("Weeks left", "Semanas restantes", lang)) + "</div>" +
      '<div><b class="' + paceClass + '">' + esc(pace) + "</b>" + esc(L("Quarter pace", "Ritmo del trimestre", lang)) + "</div></div>" +
      "<p><b>" + (view.tasks || []).length + "</b> " + esc(L("rooms this week", "habitaciones esta semana", lang)) +
      " <small>(" + esc(math) + " " + esc(L("rounded up", "redondeado hacia arriba", lang)) + ")</small></p>" +
      (rows || "<p>" + esc(L("Monday morning assigns the next rooms.", "El lunes por la mañana se asignan las siguientes habitaciones.")) + "</p>") +
      "</div>";
  }
  function rowHtml(t, view, lang, extras) {
    var occ = occupancy(extras.statuses && extras.statuses[t.room]);
    var pill = occ === "occupied" ? '<span class="pill VD">' + esc(L("Occupied", "Ocupada", lang)) + "</span>"
      : occ === "ooo" ? '<span class="pill OD">' + esc(L("Out of order", "Fuera de servicio", lang)) + "</span>"
      : occ === "vacant" ? '<span class="pill VC">' + esc(L("Vacant", "Vacante", lang)) + "</span>" : "";
    var who = t.assigneeName || L("Unassigned", "Sin asignar", lang);
    var title = lang === "es" ? (t.title_es || t.title_en) : t.title_en;
    var swap = t.done ? "" : '<button type="button" class="btn2" onclick="HHQRoomPm.openSwap(\'' + esc(t.id) + '\')">' + esc(L("Swap room", "Cambiar habitación", lang)) + "</button>";
    var panel = extras.swapId === t.id ? swapPanel(t, view, lang, extras) : "";
    var log = (extras.logs || []).filter(function (row) { return row.taskId === t.id; })[0];
    var note = log ? "<br><small>" + esc(L("Swapped", "Cambió", lang) + " " + log.from + " → " + log.to + " · " + log.reason + (log.who ? " · " + log.who : "")) + "</small>" : "";
    var box = t.done ? "" : '<input type="checkbox" aria-label="' + esc(L("Done", "Listo", lang)) + '" onchange="HHQRoomPm.complete(\'' + esc(t.id) + '\', this.checked)">';
    return '<div class="li" data-room-pm="' + esc(t.room) + '"><span style="flex:1"><b>' + esc(L("Room", "Habitación", lang)) + " " + esc(t.room) + "</b> " + pill +
      "<br><small>" + esc(title) + " · " + esc(L("Assigned to", "Asignado a", lang)) + " " + esc(who) + "</small>" + note + "</span>" +
      swap + '<button type="button" class="btn2" onclick="S.pmRoom=' + num(t.room) + ';save();render()">☑ PM</button>' + box + "</div>" + panel;
  }
  function swapPanel(t, view, lang, extras) {
    var options = (extras.suggestions || []).map(function (room) {
      var occ = occupancy(extras.statuses && extras.statuses[room]);
      var tag = occ === "vacant" ? " · " + L("Vacant", "Vacante", lang) : occ === "occupied" ? " · " + L("Occupied", "Ocupada", lang) : occ === "ooo" ? " · " + L("Out of order", "Fuera de servicio", lang) : "";
      return '<option value="' + esc(room) + '">' + esc(room + tag) + "</option>";
    }).join("");
    var hint = (extras.suggestions || []).some(function (room) { return occupancy(extras.statuses && extras.statuses[room]) === "vacant"; })
      ? L("Vacant rooms still open this quarter are listed first.", "Primero van las habitaciones vacías que faltan este trimestre.", lang)
      : L("No vacant status on file. These are the rooms still open this quarter.", "No hay estado de vacante. Estas son las habitaciones que faltan este trimestre.", lang);
    return '<div class="card" id="room-pm-swap"><h3>' + esc(L("Swap room", "Cambiar habitación", lang)) + " " + esc(t.room) + "</h3><p>" + esc(hint) + " " +
      esc(L("The weekly count stays the same, and the first room goes back into a later week.", "La cantidad de la semana no cambia, y la primera habitación vuelve a una semana posterior.", lang)) +
      '</p><select id="roomPmSwapPick">' + options + '</select><div class="row"><button type="button" class="btn" onclick="HHQRoomPm.confirmSwap(\'' + esc(t.id) + '\')">' +
      esc(L("Swap room", "Cambiar habitación", lang)) + '</button><button type="button" class="btn2" onclick="HHQRoomPm.openSwap(\'\')">' +
      esc(L("Cancel", "Cancelar", lang)) + "</button></div></div>";
  }

  var api = {
    DEMO_PROGRAMS: DEMO_PROGRAMS,
    mondayOf: mondayOf,
    quarterBounds: quarterBounds,
    weeksLeft: weeksLeft,
    weeksInQuarter: weeksInQuarter,
    batchSize: batchSize,
    paceOf: paceOf,
    occupancy: occupancy,
    feedCode: feedCode,
    statusMap: statusMap,
    exampleStatus: exampleStatus,
    assignRooms: assignRooms,
    planProgram: planProgram,
    planHotel: planHotel,
    progressFromTasks: progressFromTasks,
    suggest: suggest,
    applySwap: applySwap,
    assignmentNotices: assignmentNotices,
    cardHtml: cardHtml,
    sortRooms: sortRooms
  };
  root.HHQRoomPm = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function todayIso() {
    var d = new Date();
    return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0));
  }
  function remote() {
    return typeof useRemote === "function" && !!useRemote();
  }
  function hotelRooms() {
    if (S && S.hotel === "MSPWE" && MSPWE_FLOOR_MAP && !remote()) {
      var list = [];
      MSPWE_FLOOR_MAP.floors.forEach(function (f) { (f.rooms || []).forEach(function (r) { list.push(String(r.n)); }); });
      if (list.length) return list;
    }
    var d = D ? D() : { rooms: [] };
    var fromBoard = (d.rooms || []).map(function (r) { return String(r.n); });
    var fromTable = (d.roomNumbers || []).map(String);
    return fromTable.length ? fromTable : fromBoard;
  }
  function staffNow() {
    var hotel = S && S.hotel;
    return (USERS || []).filter(function (u) {
      return u && u.hotel === hotel && u.role === "Maintenance" && u.active !== false;
    }).map(function (u) { return { id: u.id, name: u.name, active: true }; });
  }
  var feedByHotel = {};
  function ensureHotelkey() {
    if (!remote() || !sb || !S || !S.hotel) return;
    var hotel = S.hotel;
    var slot = feedByHotel[hotel];
    if (slot && (slot.loaded || slot.loading)) return;
    feedByHotel[hotel] = { loaded: false, loading: true, rows: [] };
    sb.from("hotelkey_live_room_status").select("room_number,hhq_code,occupied,ooo,oos").eq("hotel_id", hotel).limit(500).then(function (res) {
      feedByHotel[hotel] = { loaded: true, loading: false, rows: (res && res.data) || [] };
      if (typeof render === "function") render();
    }, function () {
      feedByHotel[hotel] = { loaded: true, loading: false, rows: [] };
    });
  }
  function currentStatus() {
    var d = D ? D() : { rooms: [] };
    if (remote()) {
      ensureHotelkey();
      var slot = feedByHotel[S && S.hotel] || { rows: [] };
      return statusMap({ rooms: d.rooms || [], hotelkey: slot.rows || [] });
    }
    var out = statusMap({ rooms: d.rooms || [] });
    if (S && S.hotel === "MSPWE") {
      hotelRooms().forEach(function (room) {
        if (!out[room]) out[room] = exampleStatus(room);
      });
    }
    return out;
  }
  function nameOf(uid) {
    var hit = (USERS || []).find(function (u) { return u && (u.user_id === uid || u.id === uid); });
    return hit ? hit.name : "";
  }
  function liveView() {
    var d = D();
    var asOf = todayIso();
    var q = quarterBounds(asOf);
    var monday = mondayOf(asOf);
    var rooms = hotelRooms();
    var slim = d.pmTaskSlim || [];
    var schedules = (d.pmSched || []).filter(function (s) { return s && s.frequency === "quarterly" && s.active !== false; });
    var programs = [];
    var tasks = [];
    schedules.forEach(function (s) {
      var rows = slim.filter(function (row) {
        return String(row.schedule_id || "") === String(s.sb_id || s.id) || String(row.pace_schedule_id || "") === String(s.sb_id || s.id);
      });
      if (!rows.some(function (row) { return /^[0-9]+$/.test(String(row.asset || "")); })) return;
      var prog = progressFromTasks(rows, rooms.length ? rooms : rows.map(function (row) { return row.asset; }), q.start, q.end, s.sb_id || s.id);
      var weekTasks = rows.filter(function (row) { return String(row.pace_week || "") === monday; }).map(function (row) {
        return {
          id: String(row.id),
          sb_id: row.id,
          programId: String(s.sb_id || s.id),
          title_en: s.title_en || "Guestrooms",
          title_es: s.title_es || s.title_en || "Habitaciones",
          room: String(row.asset || ""),
          assigneeId: row.assigned_to || "",
          assigneeName: nameOf(row.assigned_to),
          week: monday,
          due: row.due_date || "",
          done: !!row.done
        };
      });
      weekTasks.forEach(function (t) { tasks.push(t); });
      programs.push({
        id: String(s.sb_id || s.id),
        title_en: s.title_en || "Guestrooms",
        title_es: s.title_es || s.title_en || "Habitaciones",
        total: prog.total,
        done: prog.done,
        left: prog.left,
        weeks: weeksLeft(asOf),
        pace: paceOf(prog.done, prog.total, prog.left, weeksLeft(asOf), weeksInQuarter(asOf)),
        tasks: weekTasks.filter(function (t) { return !t.done; }).concat(weekTasks.filter(function (t) { return t.done; })),
        doneRooms: []
      });
    });
    return { programs: programs, tasks: tasks, log: d.roomPmLog || [] };
  }
  function ensureBag() {
    if (remote()) return liveView();
    var d = D();
    var asOf = todayIso();
    var monday = mondayOf(asOf);
    d.roomPm = d.roomPm || { week: "", tasks: [], log: [], extraDone: [], noticed: "" };
    if (d.roomPm.week !== monday) {
      d.roomPm.week = monday;
      d.roomPm.tasks = [];
      d.roomPm.noticed = "";
    }
    var programs = S.hotel === "MSPWE" ? DEMO_PROGRAMS : [{ id: "guestrooms", title_en: "Guestrooms", title_es: "Habitaciones", done: 0 }];
    var plan = planHotel({
      asOf: asOf,
      rooms: hotelRooms(),
      programs: programs,
      staff: staffNow(),
      tasks: d.roomPm.tasks,
      extraDone: d.roomPm.extraDone || []
    });
    if (plan.created.length) {
      d.roomPm.tasks = plan.tasks;
      if (d.roomPm.noticed !== monday) {
        d.roomPm.noticed = monday;
        assignmentNotices(plan.created).forEach(function (note) {
          if (HHQNotify && HHQNotify.post) {
            HHQNotify.post({
              channel: "push",
              hotel: S.hotel,
              role: "Maintenance",
              kind: "pm_assigned",
              title: { en: note.title_en, es: note.title_es },
              body: { en: note.body_en, es: note.body_es }
            });
          }
        });
      }
      if (typeof save === "function") save();
    }
    return { programs: plan.programs, tasks: d.roomPm.tasks, log: d.roomPm.log || [], bag: d.roomPm };
  }
  function suggestionsFor(task, bag) {
    var view = (bag.programs || []).find(function (p) { return String(p.id) === String(task.programId); });
    return suggest({
      rooms: hotelRooms(),
      doneRooms: view ? view.doneRooms : [],
      tasks: bag.tasks,
      current: task,
      statuses: currentStatus()
    });
  }
  api.section = function () {
    var bag = ensureBag();
    var lang = LANG === "es" ? "es" : "en";
    var note = remote()
      ? L("HotelKey marks occupied and out-of-order rooms. Swap offers vacant rooms first.", "HotelKey marca ocupadas y fuera de servicio. El cambio ofrece primero las vacías.", lang)
      : L("Example room codes. Swap offers vacant rooms first.", "Códigos de ejemplo. El cambio ofrece primero las vacías.", lang);
    return '<p id="room-pm-status"><small>' + esc(note) + "</small></p>" + bag.programs.map(function (view) {
      return cardHtml(view, lang, {
        statuses: currentStatus(),
        swapId: S && S.roomPmSwap,
        suggestions: S && S.roomPmSwap ? suggestionsFor((bag.tasks || []).find(function (t) { return t.id === S.roomPmSwap; }) || { room: "", programId: view.id }, bag) : [],
        logs: bag.log
      });
    }).join("");
  };
  api.forUser = function (name) {
    var bag = ensureBag();
    var me = typeof meUser === "function" ? meUser() : null;
    var mine = (bag.tasks || []).filter(function (t) {
      if (t.assigneeName && t.assigneeName === name) return true;
      if (me && t.assigneeId && (t.assigneeId === me.id || t.assigneeId === me.user_id)) return true;
      return false;
    });
    var monday = mondayOf(todayIso());
    var open = mine.filter(function (t) { return !t.done; });
    var overdue = open.filter(function (t) { return t.week && t.week < monday; });
    var lang = LANG === "es" ? "es" : "en";
    var html = mine.length ? '<div class="card" id="room-pm-mine"><h3>' + esc(L("Room PMs this week", "MP de habitaciones esta semana", lang)) + "</h3>" +
      mine.map(function (t) {
        var view = (bag.programs || []).find(function (p) { return String(p.id) === String(t.programId); }) || { id: t.programId, tasks: mine };
        return rowHtml(t, view, lang, { statuses: currentStatus(), swapId: S && S.roomPmSwap, suggestions: S && S.roomPmSwap === t.id ? suggestionsFor(t, bag) : [], logs: bag.log });
      }).join("") + "</div>" : "";
    return { open: open.length, overdue: overdue.length, total: mine.length, html: html };
  };
  api.legacyToday = function () {
    try {
      var bag = ensureBag();
      var monday = mondayOf(todayIso());
      return (bag.tasks || []).filter(function (t) { return !t.done && t.week && t.week < monday; }).map(function (t) {
        return { room: t.room, od: 1, done: false, who: t.assigneeName };
      });
    } catch (e) { return []; }
  };
  api.openSwap = function (id) {
    if (!S) return;
    S.roomPmSwap = id || "";
    if (typeof save === "function") save();
    if (typeof render === "function") render();
  };
  api.confirmSwap = function (id) {
    var sel = document.getElementById("roomPmSwapPick");
    if (!sel || !sel.value) return;
    var bag = ensureBag();
    var task = (bag.tasks || []).find(function (t) { return t.id === id; });
    if (!task || task.done) return;
    var view = (bag.programs || []).find(function (p) { return String(p.id) === String(task.programId); });
    var result = applySwap({
      task: task,
      room: sel.value,
      tasks: bag.tasks,
      doneRooms: view ? view.doneRooms : [],
      who: typeof cw === "function" ? cw() : "",
      whoId: (typeof meUser === "function" && meUser()) ? meUser().id : "",
      at: new Date().toISOString()
    });
    if (!result.ok) return;
    if (remote()) {
      var taskId = task.sb_id || task.id;
      var payload = { hotel_id: S.hotel, hotel: S.hotel, entity: "pm_task", entity_id: String(taskId), action: "swap_room", before: { room: result.from }, after: { room: result.to, reason: "occupied" } };
      if (sb && sb.rpc) {
        sb.rpc("swap_room_pm", { p_task_id: taskId, p_room: result.to }).then(function (res) {
          if (res && res.error) {
            sb.from("pm_tasks").update({ asset: result.to }).eq("id", taskId).then(function () {}, function () {});
            sb.from("audit_log").insert(payload).then(function () {}, function () {});
          }
        }, function () {});
      }
    } else if (bag.bag) {
      bag.bag.log = bag.bag.log || [];
      bag.bag.log.unshift(result.log);
    }
    if (!remote() && !bag.bag) {
      var d = D();
      d.roomPmLog = d.roomPmLog || [];
      d.roomPmLog.unshift(result.log);
    }
    S.roomPmSwap = "";
    if (typeof save === "function") save();
    if (typeof render === "function") render();
  };
  api.complete = function (id, on) {
    var bag = ensureBag();
    var task = (bag.tasks || []).find(function (t) { return t.id === id; });
    if (!task) return;
    task.done = !!on;
    if (!remote() && bag.bag) {
      bag.bag.extraDone = bag.bag.extraDone || [];
      if (on && bag.bag.extraDone.indexOf(task.room) < 0) bag.bag.extraDone.push(task.room);
      if (!on) bag.bag.extraDone = bag.bag.extraDone.filter(function (r) { return r !== task.room; });
    }
    if (remote() && sb) {
      var patch = { done: !!on };
      if (on) patch.completed_at = new Date().toISOString();
      sb.from("pm_tasks").update(patch).eq("id", task.sb_id || task.id).then(function () {}, function () {});
    }
    if (typeof save === "function") save();
    if (typeof render === "function") render();
  };
  api.completeButton = function (room) {
    var bag = ensureBag();
    var task = (bag.tasks || []).find(function (t) { return String(t.room) === String(room) && !t.done; });
    if (!task) return "";
    return '<button class="btn" style="width:100%;margin-top:8px" onclick="HHQRoomPm.complete(\'' + esc(task.id) + '\', true)">' +
      esc(L("Mark room", "Marcar habitación")) + " " + esc(room) + " " + esc(L("PM complete", "MP lista")) + "</button>";
  };
  if (typeof pmToday === "function") pmToday = function () { return api.legacyToday(); };
  try {
    if (typeof meUser === "function" && meUser() && typeof render === "function") render();
  } catch (e) {}
})(typeof globalThis !== "undefined" ? globalThis : this);
