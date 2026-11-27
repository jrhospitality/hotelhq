/* Daily auto-assignment.
   Each person who is working gets that department's daily checklist templates
   for their shift. The property walk goes to the GM or AGM who is working.
   Either of them can finish it, and then it is done for both.
   A published shift says who is working. With no published shift that day,
   the first clock-in does. Golden Valley (MSPWE) can also assign the walk
   on weekdays to a GM or AGM who has no schedule data at all.
   With no published shift and no clock-in, the person is asked
   "Which shift are you working?" and that shift's list is assigned
   (source "asked"). Demo keeps the answer on this device. Live Golden
   Valley front desk keeps it in shift_selections.
   Demo mode uses EXAMPLE names only. */
(function (root) {
  "use strict";

  var ROLE_DEPT = {
    "Front Desk": "front_desk", front_desk: "front_desk",
    Housekeeping: "housekeeping", hk_lead: "housekeeping",
    Housekeeper: "housekeeping", housekeeper: "housekeeping",
    Maintenance: "maintenance", maintenance: "maintenance",
    "Shuttle Driver": "shuttle", shuttle_driver: "shuttle",
    "House Person": "house_person", house_person: "house_person",
    "Laundry Attendant": "laundry", laundry: "laundry",
    "Breakfast Attendant": "breakfast", breakfast: "breakfast",
    Bartender: "bar", bartender: "bar",
    GM: "management", gm: "management",
    AGM: "management", agm: "management",
    "Above Property": "management", above_property: "management"
  };
  var ROLE_DB = {
    "Above Property": "above_property", "JR Corporate": "above_property", corporate: "above_property",
    GM: "gm", AGM: "agm",
    "Front Desk": "front_desk", Housekeeping: "hk_lead", Housekeeper: "housekeeper",
    Maintenance: "maintenance", "Shuttle Driver": "shuttle_driver", "House Person": "house_person",
    "Laundry Attendant": "laundry", "Breakfast Attendant": "breakfast", Bartender: "bartender"
  };

  function pad(n) { return String(n).padStart(2, "0"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function deptOf(roleOrDept) {
    var key = roleOrDept == null ? "" : String(roleOrDept);
    if (ROLE_DEPT[key]) return ROLE_DEPT[key];
    var low = key.trim().toLowerCase();
    if (ROLE_DEPT[low]) return ROLE_DEPT[low];
    return low.replace(/\s+/g, "_");
  }
  function normRole(role) {
    var key = role == null ? "" : String(role);
    if (ROLE_DB[key]) return ROLE_DB[key];
    return key.trim().toLowerCase().replace(/\s+/g, "_");
  }
  function isLeader(role) {
    var db = normRole(role);
    return db === "gm" || db === "agm" || db === "above_property";
  }
  function normShift(value) {
    var key = String(value == null ? "" : value).trim().toLowerCase();
    if (!key || key === "any" || key === "all") return "";
    if (key === "am" || key === "1st" || key === "1" || key === "morning") return "AM";
    if (key === "pm" || key === "2nd" || key === "2" || key === "afternoon") return "PM";
    if (key === "night" || key === "night audit" || key === "audit" || key === "3rd" || key === "3" || key === "na" || key === "overnight") return "Night Audit";
    return String(value).trim();
  }
  function minutes(value) {
    var text = String(value == null ? "" : value).trim();
    var ampm = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]m)?$/i);
    if (!ampm) return null;
    var h = Number(ampm[1]);
    var m = Number(ampm[2]);
    if (ampm[3]) {
      var ap = ampm[3].toLowerCase();
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
    }
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }
  function hhmm(mins) {
    var day = ((mins % 1440) + 1440) % 1440;
    return pad(Math.floor(day / 60)) + ":" + pad(day % 60);
  }
  function shiftBucket(start) {
    var mins = minutes(start);
    if (mins == null) return "";
    if (mins >= 5 * 60 && mins < 14 * 60) return "AM";
    if (mins >= 14 * 60 && mins < 22 * 60) return "PM";
    return "Night Audit";
  }
  /* Golden Valley front desk only (America/Chicago). Jay's shifts are
     AM 7 AM-3 PM, PM 3-11 PM, and Night Audit 11 PM-7 AM.
     A punch-in or start time lands in AM 5:00-12:59, PM 1:00-8:59,
     or Night Audit 9:00 PM-4:59 AM. Other hotels and departments stay on
     shiftBucket, which matches private.shift_bucket. Live Golden Valley
     front desk uses private.mspwe_fd_bucket with these same windows. */
  function mspweFdBucket(start) {
    var mins = minutes(start);
    if (mins == null) return "";
    if (mins >= 5 * 60 && mins < 13 * 60) return "AM";
    if (mins >= 13 * 60 && mins < 21 * 60) return "PM";
    return "Night Audit";
  }
  function bucketFor(hotel, department, start) {
    if (hotel === "MSPWE" && department === "front_desk") return mspweFdBucket(start);
    return shiftBucket(start);
  }
  function shiftMatches(templateShift, bucket) {
    var want = normShift(templateShift);
    if (!want) return true;
    return want === normShift(bucket);
  }
  function addDays(iso, days) {
    var parts = String(iso).slice(0, 10).split("-");
    var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    d.setUTCDate(d.getUTCDate() + days);
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function isWeekday(iso) {
    var parts = String(iso).slice(0, 10).split("-");
    var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    var day = d.getUTCDay();
    return day >= 1 && day <= 5;
  }
  function dueStamp(date, start, end) {
    var startMin = minutes(start);
    var endMin = minutes(end);
    if (startMin == null || endMin == null) return String(date).slice(0, 10) + "T17:00";
    var day = String(date).slice(0, 10);
    if (endMin <= startMin) day = addDays(day, 1);
    return day + "T" + hhmm(endMin);
  }
  function bucketEndFor(date, start, bucket) {
    if (bucket === "AM") return dueStamp(date, start, "15:00");
    if (bucket === "PM") return dueStamp(date, start, "23:00");
    return dueStamp(date, start, "07:00");
  }
  function bucketEnd(date, start) {
    return bucketEndFor(date, start, shiftBucket(start));
  }
  var ASKED_START = { AM: "07:00", PM: "15:00", "Night Audit": "23:00" };
  function askedStart(shift) {
    return ASKED_START[normShift(shift)] || "";
  }
  function answerFor(answers, person, hotel, date) {
    var hit = (answers || []).filter(function (a) {
      return a && a.employee === person.id && a.hotel === hotel && String(a.date).slice(0, 10) === date && askedStart(a.shift);
    });
    return hit.length ? hit[hit.length - 1] : null;
  }
  function needsShiftAsk(input, personId) {
    input = input || {};
    var date = String(input.date || "").slice(0, 10);
    var person = (input.people || []).filter(function (p) { return p && p.id === personId && p.active !== false; })[0];
    if (!person || !person.hotel) return false;
    if (publishedToday(input.shifts, person, person.hotel, date).length) return false;
    if (firstPunch(input.punches, person, person.hotel, date)) return false;
    return !answerFor(input.answers, person, person.hotel, date);
  }
  function liveAskNeeded(rows, viewer, selection) {
    if (!viewer || viewer.hotel !== "MSPWE" || normRole(viewer.role) !== "front_desk") return false;
    if (selection) return false;
    return !(rows || []).some(function (row) {
      return row && row.employee === viewer.id && row.kind === "checklist" && deptOf(row.department) === "front_desk";
    });
  }
  function fmtDue(stamp) {
    var hm = String(stamp || "").slice(11, 16);
    var mins = minutes(hm);
    if (mins == null) return hm;
    var h = Math.floor(mins / 60);
    var ap = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 || 12;
    return h12 + ":" + pad(mins % 60) + " " + ap;
  }
  function isDailyTemplate(t) {
    if (!t || t.active === false) return false;
    var kind = String(t.kind || "daily").toLowerCase();
    if (kind !== "daily") return false;
    var cadence = String(t.cadence || "daily").toLowerCase().replace(/\s+/g, "_");
    return cadence === "daily" || cadence === "per_shift";
  }
  function roleOk(template, person) {
    if (!template.role && !template.auto_assign_role) return true;
    var want = normRole(template.role || template.auto_assign_role);
    return want === normRole(person.role);
  }
  function hasScheduleData(person, shifts) {
    if (person && person.scheduleData === false) return false;
    if (person && person.scheduleData === true) return true;
    return (shifts || []).some(function (shift) { return shift && shift.employee === person.id; });
  }
  function publishedToday(shifts, person, hotel, date) {
    return (shifts || []).filter(function (shift) {
      return shift && shift.published === true && shift.employee === person.id && shift.hotel === hotel && String(shift.date).slice(0, 10) === date;
    });
  }
  function firstPunch(punches, person, hotel, date) {
    var rows = (punches || []).filter(function (punch) {
      return punch && punch.employee === person.id && punch.hotel === hotel && String(punch.date).slice(0, 10) === date && punch.punchIn;
    }).sort(function (a, b) { return minutes(a.punchIn) - minutes(b.punchIn); });
    return rows[0] || null;
  }
  function keyFor(row) {
    if (row.kind === "walk") return "walk|" + row.hotel + "|" + row.employee + "|" + row.date;
    return "checklist|" + row.employee + "|" + row.templateId + "|" + row.date;
  }

  function plan(input) {
    input = input || {};
    var date = String(input.date || "").slice(0, 10);
    var hotels = {};
    (input.hotels || []).forEach(function (hotel) {
      if (!hotel || !hotel.id) return;
      hotels[hotel.id] = { id: hotel.id, walkWeekdayFallback: hotel.walkWeekdayFallback === true };
    });
    var people = (input.people || []).filter(function (person) { return person && person.active !== false && person.id && person.hotel; });
    var shifts = input.shifts || [];
    var punches = input.punches || [];
    var answers = input.answers || [];
    var templates = (input.templates || []).filter(isDailyTemplate);
    var byKey = {};

    people.forEach(function (person) {
      if (!hotels[person.hotel]) hotels[person.hotel] = { id: person.hotel, walkWeekdayFallback: false };
      var scheduled = publishedToday(shifts, person, person.hotel, date);
      var punch = scheduled.length ? null : firstPunch(punches, person, person.hotel, date);
      var blocks = scheduled.map(function (shift) {
        var department = deptOf(shift.department || person.role);
        var start = shift.start;
        var mspweFd = person.hotel === "MSPWE" && department === "front_desk";
        return {
          department: department,
          start: start,
          due: mspweFd ? bucketEndFor(date, start, mspweFdBucket(start)) : dueStamp(date, start, shift.end),
          source: "schedule"
        };
      });
      if (punch) {
        var punchDept = deptOf(punch.department || person.role);
        blocks.push({
          department: punchDept,
          start: punch.punchIn,
          due: bucketEndFor(date, punch.punchIn, bucketFor(person.hotel, punchDept, punch.punchIn)),
          source: "punch"
        });
      }
      var asked = scheduled.length || punch ? null : answerFor(answers, person, person.hotel, date);
      if (asked) {
        var askedDept = deptOf(person.role);
        var askedAt = askedStart(asked.shift);
        blocks.push({
          department: askedDept,
          start: askedAt,
          due: bucketEndFor(date, askedAt, bucketFor(person.hotel, askedDept, askedAt)),
          source: "asked"
        });
      }
      blocks.forEach(function (block) {
        if (!block.department) return;
        var bucket = bucketFor(person.hotel, block.department, block.start);
        templates.forEach(function (template) {
          if (template.hotel !== person.hotel) return;
          if (deptOf(template.department) !== block.department) return;
          if (!shiftMatches(template.shift, bucket)) return;
          if (!roleOk(template, person)) return;
          var row = {
            hotel: person.hotel,
            date: date,
            kind: "checklist",
            templateId: template.id,
            employee: person.id,
            name: person.name || "",
            department: block.department,
            shift: bucket,
            title_en: template.name_en || template.name || "Checklist",
            title_es: template.name_es || template.name_en || template.name || "Lista",
            due: block.due,
            source: block.source,
            completed: false,
            completedBy: ""
          };
          row.key = keyFor(row);
          row.dueLabel = fmtDue(row.due);
          var prev = byKey[row.key];
          if (!prev || String(row.due) > String(prev.due)) byKey[row.key] = row;
        });
      });

      if (normRole(person.role) !== "gm" && normRole(person.role) !== "agm") return;
      var walk = null;
      if (scheduled.length) {
        var end = scheduled[0];
        scheduled.forEach(function (shift) {
          var due = dueStamp(date, shift.start, shift.end);
          if (!end || due > dueStamp(date, end.start, end.end)) end = shift;
        });
        walk = { start: end.start, due: dueStamp(date, end.start, end.end), source: "schedule" };
      } else if (punch) {
        walk = { start: punch.punchIn, due: bucketEnd(date, punch.punchIn), source: "punch" };
      } else if (hotels[person.hotel].walkWeekdayFallback && isWeekday(date) && !hasScheduleData(person, shifts)) {
        walk = { start: "08:00", due: date + "T17:00", source: "weekday_fallback" };
      }
      if (!walk) return;
      var walkRow = {
        hotel: person.hotel,
        date: date,
        kind: "walk",
        templateId: "",
        employee: person.id,
        name: person.name || "",
        department: "management",
        shift: shiftBucket(walk.start),
        title_en: "Property walk",
        title_es: "Recorrido de la propiedad",
        due: walk.due,
        source: walk.source,
        completed: false,
        completedBy: ""
      };
      walkRow.key = keyFor(walkRow);
      walkRow.dueLabel = fmtDue(walkRow.due);
      byKey[walkRow.key] = walkRow;
    });

    return Object.keys(byKey).map(function (key) { return byKey[key]; }).sort(function (a, b) {
      return (a.hotel + a.kind + a.name + a.title_en).localeCompare(b.hotel + b.kind + b.name + b.title_en);
    });
  }

  function merge(existing, incoming) {
    var seen = {};
    (existing || []).forEach(function (row) { if (row && row.key) seen[row.key] = row; });
    (incoming || []).forEach(function (row) {
      if (row && row.key && !seen[row.key]) seen[row.key] = row;
    });
    return Object.keys(seen).map(function (key) { return seen[key]; });
  }

  function complete(rows, key, by) {
    var hit = (rows || []).filter(function (row) { return row.key === key; })[0];
    if (!hit) return (rows || []).slice();
    return (rows || []).map(function (row) {
      var copy = Object.assign({}, row);
      var sameWalk = hit.kind === "walk" && row.kind === "walk" && row.hotel === hit.hotel && row.date === hit.date;
      if (row.key === key || sameWalk) {
        copy.completed = true;
        copy.completedBy = by || hit.employee;
      }
      return copy;
    });
  }

  function isOverdue(row, nowStamp) {
    if (!row || row.completed) return false;
    if (!row.due || !nowStamp) return false;
    return String(nowStamp) >= String(row.due);
  }

  function visible(rows, viewer) {
    viewer = viewer || {};
    var role = normRole(viewer.role);
    return (rows || []).filter(function (row) {
      if (role === "above_property") {
        if (viewer.hotel && viewer.all !== true) return row.hotel === viewer.hotel;
        return true;
      }
      if (role === "gm" || role === "agm") return row.hotel === viewer.hotel;
      return row.employee === viewer.id;
    });
  }

  function notices(rows) {
    return (rows || []).filter(function (row) { return row && !row.completed; }).map(function (row) {
      var walk = row.kind === "walk";
      return {
        kind: "daily_assigned",
        user: row.employee,
        hotel: row.hotel,
        title_en: walk ? "Property walk assigned" : "Checklist assigned",
        title_es: walk ? "Recorrido asignado" : "Lista asignada",
        body_en: (walk ? "Property walk" : row.title_en) + " · " + (row.dueLabel || ""),
        body_es: (walk ? "Recorrido de la propiedad" : row.title_es) + " · " + (row.dueLabel || "")
      };
    });
  }

  function exampleInput(date) {
    date = String(date || "2026-11-25").slice(0, 10);
    function shift(employee, hotel, department, start, end) {
      return { employee: employee, hotel: hotel, department: department, date: date, start: start, end: end, published: true };
    }
    return {
      date: date,
      hotels: [
        { id: "MSPWE", walkWeekdayFallback: true },
        { id: "MSPAM", walkWeekdayFallback: false },
        { id: "MSPMS", walkWeekdayFallback: false }
      ],
      people: [
        { id: "mspwe-gm", name: "Avery Cole", hotel: "MSPWE", role: "GM", active: true, scheduleData: false },
        { id: "mspwe-agm", name: "Blake Morgan", hotel: "MSPWE", role: "AGM", active: true },
        { id: "mspwe-fd", name: "Jordan Lee", hotel: "MSPWE", role: "Front Desk", active: true },
        { id: "mspwe-hk", name: "Grace Patel", hotel: "MSPWE", role: "Housekeeping", active: true },
        { id: "mspwe-hkr", name: "Maria Alvarez", hotel: "MSPWE", role: "Housekeeper", active: true },
        { id: "mspwe-mt", name: "Luis Ortega", hotel: "MSPWE", role: "Maintenance", active: true },
        { id: "mspam-fd", name: "Kim Nguyen", hotel: "MSPAM", role: "Front Desk", active: true, scheduleData: false },
        { id: "mspms-bar", name: "Nora Blake", hotel: "MSPMS", role: "Bartender", active: true }
      ],
      shifts: [
        shift("mspwe-agm", "MSPWE", "management", "08:00", "16:00"),
        shift("mspwe-fd", "MSPWE", "front_desk", "07:00", "15:00"),
        shift("mspwe-hk", "MSPWE", "housekeeping", "08:00", "16:00"),
        shift("mspwe-hkr", "MSPWE", "housekeeping", "09:00", "15:30"),
        shift("mspwe-mt", "MSPWE", "maintenance", "08:00", "16:30"),
        shift("mspms-bar", "MSPMS", "bar", "15:00", "23:00")
      ],
      punches: [
        { employee: "mspam-fd", hotel: "MSPAM", department: "front_desk", date: date, punchIn: "15:10" }
      ],
      templates: [
        { id: "fd-am", hotel: "MSPWE", department: "front_desk", shift: "AM", name_en: "1st Shift - AM Check list", name_es: "Lista del 1.er turno - AM", kind: "daily", cadence: "daily", active: true },
        { id: "fd-pm", hotel: "MSPWE", department: "front_desk", shift: "PM", name_en: "2nd Shift - PM checklist", name_es: "Lista del 2.º turno - PM", kind: "daily", cadence: "daily", active: true },
        { id: "fd-na", hotel: "MSPWE", department: "front_desk", shift: "Night Audit", name_en: "Night Audit Success List", name_es: "Lista de éxito de la auditoría nocturna", kind: "daily", cadence: "per_shift", active: true },
        { id: "fd-pm-am", hotel: "MSPAM", department: "front_desk", shift: "PM", name_en: "2nd Shift - PM checklist", name_es: "Lista del 2.º turno - PM", kind: "daily", cadence: "daily", active: true },
        { id: "hk", hotel: "MSPWE", department: "housekeeping", shift: "", name_en: "Housekeeping daily", name_es: "Lista diaria de ama de llaves", kind: "daily", cadence: "daily", active: true },
        { id: "mt", hotel: "MSPWE", department: "maintenance", shift: "", name_en: "Daily Maintenance Checklist", name_es: "Lista diaria de mantenimiento", kind: "daily", cadence: "daily", active: true },
        { id: "bar", hotel: "MSPMS", department: "bar", shift: "", role: "bartender", name_en: "Bartender Shift Checklist", name_es: "Lista de turno de bartender", kind: "daily", cadence: "per_shift", active: true },
        { id: "winter", hotel: "MSPWE", department: "maintenance", name_en: "Winter preparedness", name_es: "Preparación de invierno", kind: "seasonal", cadence: "yearly", active: true }
      ]
    };
  }

  function stateOf(row, nowStamp, lang) {
    if (row.completed) return { cls: "da-done", en: "Done", es: "Listo" };
    if (isOverdue(row, nowStamp)) return { cls: "da-bad", en: "Overdue", es: "Atrasada" };
    return { cls: "da-open", en: "Open", es: "Abierta" };
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }

  function cardHtml(rows, lang, opts) {
    opts = opts || {};
    lang = lang === "es" ? "es" : "en";
    var nowStamp = opts.now || "";
    var viewer = opts.viewer || {};
    var mine = (rows || []).filter(function (row) { return row.employee === viewer.id; });
    var team = isLeader(viewer.role) ? (rows || []) : [];
    if (!mine.length && !team.length) return "";
    var example = opts.example
      ? '<span class="ex">' + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> "
      : "";
    function item(row, own) {
      var state = stateOf(row, nowStamp, lang);
      var title = lang === "es" ? row.title_es : row.title_en;
      var who = own ? "" : "<b>" + esc(row.name || "") + "</b> · ";
      var done = own && !row.completed
        ? '<button type="button" class="btn2" data-key="' + esc(row.key) + '" onclick="DailyAssign.finish(this.getAttribute(\'data-key\'))">' + esc(tx(lang, "Mark done", "Marcar listo")) + "</button>"
        : "";
      var open = row.kind === "walk" ? "walk" : "check";
      return '<li class="' + state.cls + '"><span>' + who + esc(title) + '</span><small>' + esc(tx(lang, "Due", "Vence")) + " " + esc(row.dueLabel || "") + " · " + esc(tx(lang, state.en, state.es)) + "</small>" +
        '<span class="da-actions"><button type="button" class="btn2" onclick="go(\'' + open + '\')">' + esc(tx(lang, "Open", "Abrir")) + "</button>" + done + "</span></li>";
    }
    var yours = mine.map(function (row) { return item(row, true); }).join("");
    var yoursBlock = yours
      ? "<h3>" + esc(tx(lang, "Yours today", "Lo tuyo hoy")) + "</h3><ul>" + yours + "</ul>"
      : "";
    var teamBlock = "";
    if (team.length) {
      var lines = team.map(function (row) {
        var state = stateOf(row, nowStamp, lang);
        var title = lang === "es" ? row.title_es : row.title_en;
        var by = row.completed && row.completedBy ? " · " + esc(row.completedBy) : "";
        return "<li class=\"" + state.cls + "\"><b>" + esc(row.name || "") + "</b> · " + esc(title) + "<small>" + esc(tx(lang, state.en, state.es)) + by + "</small></li>";
      }).join("");
      teamBlock = "<h3>" + esc(tx(lang, "Team today", "Equipo de hoy")) + "</h3><ul>" + lines + "</ul>";
    }
    return '<section class="card" id="dailyAssign">' + example + "<h3>" + esc(tx(lang, "Today's checklists", "Listas de hoy")) + "</h3>" +
      "<p><small>" + esc(tx(lang, "Assigned for the shift you are working. Overdue starts at the end of that shift.", "Asignadas para el turno que trabajas. Se marcan atrasadas al final de ese turno.")) + "</small></p>" +
      yoursBlock + teamBlock + "</section>";
  }

  var api = {
    deptOf: deptOf,
    normRole: normRole,
    shiftBucket: shiftBucket,
    mspweFdBucket: mspweFdBucket,
    askedStart: askedStart,
    needsShiftAsk: needsShiftAsk,
    liveAskNeeded: liveAskNeeded,
    shiftMatches: shiftMatches,
    isWeekday: isWeekday,
    isDailyTemplate: isDailyTemplate,
    dueStamp: dueStamp,
    bucketEnd: bucketEnd,
    fmtDue: fmtDue,
    plan: plan,
    merge: merge,
    complete: complete,
    isOverdue: isOverdue,
    visible: visible,
    notices: notices,
    exampleInput: exampleInput,
    cardHtml: cardHtml,
    isLeader: isLeader
  };
  root.DailyAssign = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!root.document) return;

  var DONE_KEY = "jrportal_daily_done_v1";
  var cache = { key: "", rows: null, loading: false, error: false };

  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function todayIso() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function nowStamp() {
    var d = new Date();
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(d);
      var bag = {};
      parts.forEach(function (part) { bag[part.type] = part.value; });
      return bag.year + "-" + bag.month + "-" + bag.day + "T" + bag.hour + ":" + bag.minute;
    } catch (e2) {
      return todayIso() + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }
  }
  function remoteOn() {
    try { return typeof useRemote === "function" && useRemote() && typeof sb !== "undefined" && sb; } catch (e) { return false; }
  }
  function viewerNow() {
    var user = null;
    try { user = typeof meUser === "function" ? meUser() : null; } catch (e) { user = null; }
    if (!user) return null;
    var id = remoteOn() && user.user_id ? user.user_id : user.id;
    var hotel = "";
    try { hotel = (typeof S !== "undefined" && S.hotel) || user.hotel || ""; } catch (e2) { hotel = user.hotel || ""; }
    return { id: id, name: user.name || "", role: user.role || "", hotel: hotel };
  }
  function doneBag() {
    try { return JSON.parse(localStorage.getItem(DONE_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function applyDone(rows) {
    var bag = doneBag();
    var marked = rows.map(function (row) {
      var hit = bag[row.key];
      if (!hit) return row;
      var copy = Object.assign({}, row);
      copy.completed = true;
      copy.completedBy = hit.by || row.employee;
      return copy;
    });
    var walks = {};
    marked.forEach(function (row) {
      if (row.kind === "walk" && row.completed) walks[row.hotel + "|" + row.date] = row.completedBy;
    });
    return marked.map(function (row) {
      var who = walks[row.hotel + "|" + row.date];
      if (row.kind !== "walk" || !who || row.completed) return row;
      var copy = Object.assign({}, row);
      copy.completed = true;
      copy.completedBy = who;
      return copy;
    });
  }
  function namesById() {
    var map = {};
    try {
      (typeof USERS !== "undefined" ? USERS : []).forEach(function (user) {
        if (!user) return;
        map[user.user_id || user.id] = user.name || "";
      });
    } catch (e) {}
    return map;
  }
  function fromDb(row, names) {
    var date = String(row.work_date || "").slice(0, 10);
    var title = row.checklist_templates || {};
    var walk = row.kind === "walk";
    var due = "";
    if (row.due_at) {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23"
      }).formatToParts(new Date(row.due_at));
      var bag = {};
      parts.forEach(function (part) { bag[part.type] = part.value; });
      due = bag.year + "-" + bag.month + "-" + bag.day + "T" + bag.hour + ":" + bag.minute;
    }
    var mapped = {
      id: row.id,
      hotel: row.hotel_id,
      date: date,
      kind: row.kind,
      templateId: row.template_id || "",
      employee: row.employee,
      name: names[row.employee] || "",
      department: row.department || "",
      shift: row.shift || "",
      title_en: walk ? "Property walk" : (title.name || "Checklist"),
      title_es: walk ? "Recorrido de la propiedad" : (title.name_es || title.name || "Lista"),
      due: due,
      source: row.source || "",
      completed: !!row.completed_at,
      completedBy: names[row.completed_by] || ""
    };
    mapped.key = keyFor(mapped);
    mapped.dueLabel = fmtDue(mapped.due);
    return mapped;
  }
  function ensureLive(hotel, date) {
    var key = hotel + "|" + date;
    if (cache.key === key && (cache.rows || cache.loading || cache.error)) return;
    cache = { key: key, rows: null, loading: true, error: false };
    var names = namesById();
    sb.from("daily_assignments")
      .select("id,hotel_id,work_date,kind,template_id,employee,department,shift,due_at,source,completed_at,completed_by,checklist_templates(name,name_es)")
      .eq("hotel_id", hotel)
      .eq("work_date", date)
      .then(function (res) {
        if (cache.key !== key) return;
        cache.loading = false;
        if (res.error) { cache.error = true; cache.rows = []; return; }
        cache.rows = (res.data || []).map(function (row) { return fromDb(row, names); });
        if (typeof render === "function") render();
      }, function () {
        if (cache.key !== key) return;
        cache.loading = false;
        cache.error = true;
        cache.rows = [];
      });
  }
  function homeHtml() {
    var viewer = viewerNow();
    if (!viewer || !viewer.hotel) return "";
    var date = todayIso();
    var lang = langNow();
    if (remoteOn()) {
      ensureLive(viewer.hotel, date);
      var SP = root.ShiftPick;
      if (SP && SP.applies && SP.applies(viewer)) {
        if (SP.ensureLive) SP.ensureLive(viewer, date);
        if (!cache.rows || cache.loading || cache.error) return "";
        if (SP.selectionReady && !SP.selectionReady(viewer, date)) return "";
        if (liveAskNeeded(cache.rows, viewer, SP.liveAnswer ? SP.liveAnswer(viewer, date) : "")) {
          var liveAsk = SP.askHtml(null, viewer, lang, { live: true });
          if (liveAsk) return liveAsk;
        }
      }
      if (!cache.rows || !cache.rows.length) return "";
      var rows = visible(cache.rows, viewer);
      return cardHtml(rows, lang, { now: nowStamp(), viewer: viewer, example: false });
    }
    var input = exampleInput(date);
    if (root.ShiftPick && root.ShiftPick.demoInput) {
      input = root.ShiftPick.demoInput(input, viewer, date);
      var ask = root.ShiftPick.askHtml(input, viewer, lang);
      if (ask) return ask;
    }
    var planned = applyDone(plan(input));
    var rowsDemo = visible(planned, viewer);
    return cardHtml(rowsDemo, lang, { now: nowStamp(), viewer: viewer, example: true });
  }
  api.homeHtml = homeHtml;
  api.reload = function () {
    cache = { key: "", rows: null, loading: false, error: false };
  };
  api.mineShift = function (viewer) {
    if (!viewer) return "";
    var hit = (cache.rows || []).filter(function (row) {
      return row.employee === viewer.id && row.kind === "checklist" && deptOf(row.department) === "front_desk" && row.shift;
    })[0];
    return hit ? hit.shift : "";
  };
  root.DailyAssign.finish = function (key) {
    if (!key) return;
    var viewer = viewerNow();
    if (!viewer) return;
    if (remoteOn()) {
      var row = (cache.rows || []).filter(function (item) { return item.key === key; })[0];
      if (!row || !row.id || !sb.rpc) return;
      sb.rpc("complete_daily_assignment", { p_id: row.id }).then(function () {
        cache = { key: "", rows: null, loading: false, error: false };
        if (typeof render === "function") render();
      }, function () {});
      return;
    }
    var bag = doneBag();
    bag[key] = { by: viewer.name || viewer.id, at: new Date().toISOString() };
    try { localStorage.setItem(DONE_KEY, JSON.stringify(bag)); } catch (e) {}
    if (typeof render === "function") render();
  };

  var css = document.createElement("style");
  css.textContent = "#dailyAssign ul{list-style:none;margin:8px 0 0;padding:0}#dailyAssign li{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #e6e8ee}#dailyAssign small{display:block;color:#5c6570;font-weight:650}#dailyAssign .da-bad small{color:#9a3412;font-weight:800}#dailyAssign .da-done small{color:#067647}#dailyAssign .da-actions{display:flex;gap:6px}#dailyAssign h3{margin:8px 0 0}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
