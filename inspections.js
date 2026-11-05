/* Fire and health inspections, demo site only.
   GM and corporate upload reports and edit every action at their hotels.
   AGM does not see this section.
   An associate sees only action items assigned to them, and can mark those fixed.
   The assistant import stores awaiting_parse and does not keep the report body.
   Parsed actions are accepted only when the caller already extracted them.
   Live tables are public.compliance_inspections, public.compliance_inspection_actions,
   and public.compliance_inspection_imports. public.inspections is room inspections
   and this screen does not read or write it.
   Live mode loads this file and does not add a menu. Demo mode does not call the database. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = { MSPWE: "Golden Valley", MSPAM: "Hampton", MSPMS: "SpringHill" };
  var TZ = "America/Chicago";
  var KEY = "jrportal_inspections_v1";
  var SOON = 30;
  var KINDS = ["fire", "health"];
  var RESULTS = ["pass", "fail", "conditional"];
  var STAFF = [
    { id: "mspwe-gm", name: "Avery Cole", role: "GM", hotel: "MSPWE" },
    { id: "mspwe-agm", name: "Blake Morgan", role: "AGM", hotel: "MSPWE" },
    { id: "mspwe-fd", name: "Jordan Lee", role: "Front Desk", hotel: "MSPWE" },
    { id: "mspwe-hk", name: "Grace Patel", role: "Housekeeping", hotel: "MSPWE" },
    { id: "mspwe-hkr", name: "Maria Alvarez", role: "Housekeeper", hotel: "MSPWE" },
    { id: "mspwe-mt", name: "Luis Ortega", role: "Maintenance", hotel: "MSPWE" },
    { id: "mspwe-hp", name: "Carlos Diaz", role: "House Person", hotel: "MSPWE" },
    { id: "mspwe-la", name: "Mei Chen", role: "Laundry Attendant", hotel: "MSPWE" },
    { id: "mspwe-ba", name: "Joy Adams", role: "Breakfast Attendant", hotel: "MSPWE" },
    { id: "mspam-gm", name: "Riley Brooks", role: "GM", hotel: "MSPAM" },
    { id: "mspam-agm", name: "Sam Patel", role: "AGM", hotel: "MSPAM" },
    { id: "mspam-fd", name: "Kim Nguyen", role: "Front Desk", hotel: "MSPAM" },
    { id: "mspam-hk", name: "Nina Shah", role: "Housekeeping", hotel: "MSPAM" },
    { id: "mspam-hkr", name: "Rosa Vega", role: "Housekeeper", hotel: "MSPAM" },
    { id: "mspam-mt", name: "Dev Clark", role: "Maintenance", hotel: "MSPAM" },
    { id: "mspam-sh", name: "Tom Reed", role: "Shuttle Driver", hotel: "MSPAM" },
    { id: "mspam-hp", name: "Carlos Ruiz", role: "House Person", hotel: "MSPAM" },
    { id: "mspam-la", name: "Mei Huang", role: "Laundry Attendant", hotel: "MSPAM" },
    { id: "mspam-ba", name: "Joy Parker", role: "Breakfast Attendant", hotel: "MSPAM" },
    { id: "mspms-gm", name: "Dana Singh", role: "GM", hotel: "MSPMS" },
    { id: "mspms-agm", name: "Parker Olsen", role: "AGM", hotel: "MSPMS" },
    { id: "mspms-fd", name: "Tess Brown", role: "Front Desk", hotel: "MSPMS" },
    { id: "mspms-hk", name: "Grace Kim", role: "Housekeeping", hotel: "MSPMS" },
    { id: "mspms-hkr", name: "Ana Lopez", role: "Housekeeper", hotel: "MSPMS" },
    { id: "mspms-mt", name: "Ray Ahmed", role: "Maintenance", hotel: "MSPMS" },
    { id: "mspms-sh", name: "Ben Carter", role: "Shuttle Driver", hotel: "MSPMS" },
    { id: "mspms-hp", name: "Luis Gomez", role: "House Person", hotel: "MSPMS" },
    { id: "mspms-la", name: "Mei Tran", role: "Laundry Attendant", hotel: "MSPMS" },
    { id: "mspms-ba", name: "Joy Bennett", role: "Breakfast Attendant", hotel: "MSPMS" },
    { id: "mspms-bar", name: "Nora Blake", role: "Bartender", hotel: "MSPMS" }
  ];

  function normRole(role) {
    if (role === "JR Corporate" || role === "above_property" || role === "Above Property") return "Above Property";
    if (role === "gm" || role === "GM") return "GM";
    if (role === "agm" || role === "AGM") return "AGM";
    return role || "";
  }
  function isCorporate(role) { return normRole(role) === "Above Property"; }
  function canManage(role) {
    role = normRole(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "inspections.manage");
    return role === "GM" || role === "Above Property";
  }
  function hotelsFor(role, hotel) {
    if (!canManage(role)) return [];
    if (isCorporate(role)) return HOTELS.slice();
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function manages(actor, hotel) {
    actor = actor || {};
    return canManage(actor.role) && hotelsFor(actor.role, actor.hotel).indexOf(hotel) >= 0;
  }
  function demoUi(cfg) {
    if (cfg === undefined) {
      try { if (typeof authMode !== "undefined" && authMode === "live") return false; } catch (e) {}
      cfg = root.HOTELHQ_CONFIG || null;
    }
    if (cfg && String(cfg.mode) === "live") return false;
    return true;
  }
  function addDays(iso, days) {
    var p = String(iso || "").split("-").map(Number);
    var d = new Date(Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  function todayOf(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    var date = now instanceof Date ? now : new Date(now || Date.now());
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag.year + "-" + bag.month + "-" + bag.day;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function samePerson(a, b) { return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase(); }
  function cleanFile(name) { return String(name || "").split(/[/\\]/).pop().replace(/[^A-Za-z0-9._ -]/g, "").slice(0, 80); }
  function safeInsp(id) { return /^insp-[a-z0-9-]{1,80}$/.test(String(id || "")); }
  function safeAction(id) { return /^ia-[a-z0-9-]{1,80}$/.test(String(id || "")); }
  function inspection(partial) { return partial; }
  function buildDemo(now) {
    var today = todayOf(now);
    var inspections = [
      inspection({
        id: "insp-mspwe-fire", hotel: "MSPWE", kind: "fire", date: addDays(today, -40),
        agency: "Sample Fire Marshal", result: "conditional", score: "2 open items",
        nextDue: addDays(today, 20), documentName: "sample-fire-report.pdf",
        notes: "Sample report. Not a real inspection."
      }),
      inspection({
        id: "insp-mspwe-health", hotel: "MSPWE", kind: "health", date: addDays(today, -200),
        agency: "Sample Health Department", result: "pass", score: "96",
        nextDue: addDays(today, 180), documentName: "sample-health-report.pdf",
        notes: "Sample report. Not a real inspection."
      }),
      inspection({
        id: "insp-mspam-health", hotel: "MSPAM", kind: "health", date: addDays(today, -20),
        agency: "Sample Health Department", result: "conditional", score: "88",
        nextDue: addDays(today, 15), documentName: "sample-health-report.pdf",
        notes: "Sample report. Not a real inspection."
      }),
      inspection({
        id: "insp-mspms-fire", hotel: "MSPMS", kind: "fire", date: addDays(today, -100),
        agency: "Sample Fire Marshal", result: "pass", score: "0 violations",
        nextDue: addDays(today, 400), documentName: "sample-fire-report.pdf",
        notes: "Sample report. Not a real inspection."
      })
    ];
    var actions = [
      { id: "ia-mspwe-exit", inspectionId: "insp-mspwe-fire", hotel: "MSPWE", description: "Sample: exit sign by the laundry is dark.", ownerName: "Mei Chen", ownerRole: "Laundry Attendant", dueOn: addDays(today, -5), status: "open", proofName: "", completedOn: "", completedName: "", source: "manual" },
      { id: "ia-mspwe-ext", inspectionId: "insp-mspwe-fire", hotel: "MSPWE", description: "Sample: extinguisher tag is missing in the hall.", ownerName: "Luis Ortega", ownerRole: "Maintenance", dueOn: addDays(today, 12), status: "open", proofName: "", completedOn: "", completedName: "", source: "manual" },
      { id: "ia-mspwe-door", inspectionId: "insp-mspwe-fire", hotel: "MSPWE", description: "Sample: stairwell door now closes.", ownerName: "Maria Alvarez", ownerRole: "Housekeeper", dueOn: addDays(today, -10), status: "done", proofName: "sample-door.jpg", completedOn: addDays(today, -2), completedName: "Maria Alvarez", source: "manual" },
      { id: "ia-mspam-sink", inspectionId: "insp-mspam-health", hotel: "MSPAM", description: "Sample: hand sink log was blank.", ownerName: "Kim Nguyen", ownerRole: "Front Desk", dueOn: addDays(today, 8), status: "open", proofName: "", completedOn: "", completedName: "", source: "manual" },
      { id: "ia-mspam-temp", inspectionId: "insp-mspam-health", hotel: "MSPAM", description: "Sample: walk-in temperature log is missing.", ownerName: "Dev Clark", ownerRole: "Maintenance", dueOn: addDays(today, -2), status: "open", proofName: "", completedOn: "", completedName: "", source: "manual" },
      { id: "ia-mspms-panel", inspectionId: "insp-mspms-fire", hotel: "MSPMS", description: "Sample: alarm panel battery was replaced.", ownerName: "Ray Ahmed", ownerRole: "Maintenance", dueOn: addDays(today, -30), status: "done", proofName: "sample-panel.jpg", completedOn: addDays(today, -28), completedName: "Ray Ahmed", source: "import" }
    ];
    return {
      inspections: inspections,
      actions: actions,
      imports: [{ id: "imp-mspwe-fire", hotel: "MSPWE", kind: "fire", status: "awaiting_parse", fileName: "sample-fire-report.pdf", receivedAt: today + "T15:00:00.000Z" }],
      staff: STAFF.map(function (row) { return { id: row.id, name: row.name, role: row.role, hotel: row.hotel }; })
    };
  }
  function byId(list, id) {
    var found = null;
    (list || []).forEach(function (row) { if (row.id === id) found = row; });
    return found;
  }
  function assignedTo(action, actor) {
    if (!action || !actor) return false;
    if (HOTELS.indexOf(action.hotel) < 0) return false;
    if (!isCorporate(actor.role) && actor.hotel !== action.hotel) return false;
    if (action.ownerName) return samePerson(action.ownerName, actor.name);
    if (action.ownerRole) return normRole(action.ownerRole) === normRole(actor.role);
    return false;
  }
  function canComplete(actor, action) {
    if (!action) return false;
    if (manages(actor, action.hotel)) return true;
    return assignedTo(action, actor);
  }
  function actionState(action, today) {
    if (!action) return "open";
    if (action.status === "done") return "done";
    if (action.dueOn && action.dueOn < today) return "overdue";
    return "open";
  }
  function visibleActions(model, actor) {
    return (model.actions || []).filter(function (row) {
      if (manages(actor, row.hotel)) return true;
      return assignedTo(row, actor);
    });
  }
  function myActions(model, actor) {
    return (model.actions || []).filter(function (row) { return assignedTo(row, actor); });
  }
  function attentionOf(model, hotel, today) {
    if (HOTELS.indexOf(hotel) < 0) return null;
    var actions = (model.actions || []).filter(function (row) { return row.hotel === hotel; });
    var visits = (model.inspections || []).filter(function (row) { return row.hotel === hotel; });
    if (!actions.length && !visits.length) return null;
    var bag = { overdue: 0, open: 0, upcoming: 0 };
    actions.forEach(function (row) {
      var state = actionState(row, today);
      if (state === "overdue") bag.overdue += 1;
      else if (state === "open") bag.open += 1;
    });
    visits.forEach(function (row) {
      if (!row.nextDue) return;
      if (row.nextDue >= today && row.nextDue <= addDays(today, SOON)) bag.upcoming += 1;
    });
    return bag;
  }
  function board(model, today) {
    return HOTELS.map(function (hotel) {
      var counts = attentionOf(model, hotel, today) || { overdue: 0, open: 0, upcoming: 0 };
      var next = null;
      (model.inspections || []).forEach(function (row) {
        if (row.hotel !== hotel || !row.nextDue) return;
        if (!next || row.nextDue < next.nextDue) next = row;
      });
      return { code: hotel, name: NAMES[hotel], overdue: counts.overdue, open: counts.open, upcoming: counts.upcoming, nextDue: next ? next.nextDue : "", nextKind: next ? next.kind : "" };
    });
  }
  function dateOk(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")); }
  function saveInspection(model, input, actor) {
    input = input || {};
    var hotel = input.hotel;
    if (!manages(actor, hotel)) return { ok: false, reason: "not_allowed" };
    if (KINDS.indexOf(input.kind) < 0) return { ok: false, reason: "kind" };
    if (!dateOk(input.date)) return { ok: false, reason: "date" };
    var agency = String(input.agency || "").trim();
    if (agency.length < 2 || agency.length > 120) return { ok: false, reason: "agency" };
    if (RESULTS.indexOf(input.result) < 0) return { ok: false, reason: "result" };
    var score = String(input.score || "").trim();
    if (score.length > 40) return { ok: false, reason: "score" };
    if (input.nextDue && !dateOk(input.nextDue)) return { ok: false, reason: "due" };
    var notes = String(input.notes || "").trim();
    if (notes.length > 400) return { ok: false, reason: "notes" };
    var row = input.id ? byId(model.inspections, input.id) : null;
    if (input.id && (!row || row.hotel !== hotel)) return { ok: false, reason: "missing" };
    if (!row) {
      var id = "insp-" + hotel.toLowerCase() + "-" + String(input.kind) + "-" + String(input.date).replace(/-/g, "");
      var n = 2;
      var next = id;
      while (byId(model.inspections, next)) { next = id + "-" + n; n += 1; }
      if (!safeInsp(next)) return { ok: false, reason: "kind" };
      row = { id: next, hotel: hotel };
      model.inspections.push(row);
    }
    row.kind = input.kind;
    row.date = input.date;
    row.agency = agency;
    row.result = input.result;
    row.score = score;
    row.nextDue = input.nextDue || "";
    row.documentName = input.documentName ? cleanFile(input.documentName) : (row.documentName || "");
    row.notes = notes;
    return { ok: true, model: model, id: row.id };
  }
  function saveAction(model, input, actor) {
    input = input || {};
    var hotel = input.hotel;
    if (!manages(actor, hotel)) return { ok: false, reason: "not_allowed" };
    var description = String(input.description || "").trim();
    if (description.length < 2 || description.length > 300) return { ok: false, reason: "description" };
    var ownerName = String(input.ownerName || "").trim();
    var ownerRole = String(input.ownerRole || "").trim();
    if (!ownerName && !ownerRole) return { ok: false, reason: "owner" };
    if (ownerName.length > 80 || ownerRole.length > 40) return { ok: false, reason: "owner" };
    if (input.dueOn && !dateOk(input.dueOn)) return { ok: false, reason: "due" };
    var parent = byId(model.inspections, input.inspectionId);
    if (!parent || parent.hotel !== hotel) return { ok: false, reason: "missing" };
    var row = input.id ? byId(model.actions, input.id) : null;
    if (input.id && (!row || row.hotel !== hotel)) return { ok: false, reason: "missing" };
    if (!row) {
      var id = "ia-" + hotel.toLowerCase() + "-" + String(model.actions.length + 1);
      var n = 2;
      var next = id;
      while (byId(model.actions, next) || !safeAction(next)) { next = id + "-" + n; n += 1; if (n > 50) return { ok: false, reason: "description" }; }
      row = { id: next, hotel: hotel, status: "open", proofName: "", completedOn: "", completedName: "", source: "manual" };
      model.actions.push(row);
    }
    row.inspectionId = parent.id;
    row.description = description;
    row.ownerName = ownerName;
    row.ownerRole = ownerRole;
    row.dueOn = input.dueOn || "";
    if (row.source !== "import") row.source = "manual";
    return { ok: true, model: model, id: row.id };
  }
  function completeAction(model, id, input, actor, nowIso) {
    var row = byId(model.actions, id);
    if (!row || !canComplete(actor, row)) return { ok: false, reason: "not_allowed" };
    var day = String((input && input.date) || "").slice(0, 10);
    var today = todayOf(nowIso || new Date());
    if (!dateOk(day) || day > today) return { ok: false, reason: "date" };
    row.status = "done";
    row.completedOn = day;
    row.completedName = (actor && actor.name) || "";
    if (input && input.proofName) row.proofName = cleanFile(input.proofName);
    return { ok: true, model: model };
  }
  function ingest(model, input, actor, nowIso) {
    input = input || {};
    if (!manages(actor, input.hotel)) return { ok: false, reason: "not_allowed" };
    if (input.kind && KINDS.indexOf(input.kind) < 0) return { ok: false, reason: "kind" };
    var extracted = Array.isArray(input.actions) ? input.actions : [];
    if (extracted.length > 50) return { ok: false, reason: "actions" };
    var stamp = String(nowIso || new Date().toISOString()).replace(/\W/g, "").slice(0, 14).toLowerCase();
    var id = "imp-" + String(input.hotel).toLowerCase() + "-" + stamp;
    var status = extracted.length ? "parsed" : "awaiting_parse";
    model.imports = model.imports || [];
    model.imports.push({
      id: id, hotel: input.hotel, kind: input.kind || "", status: status,
      fileName: cleanFile(input.fileName), receivedAt: nowIso || new Date().toISOString()
    });
    if (!extracted.length) return { ok: true, model: model, status: status, id: id };
    var created = [];
    extracted.forEach(function (item) {
      var saved = saveAction(model, {
        hotel: input.hotel,
        inspectionId: item.inspectionId,
        description: item.description,
        ownerName: item.ownerName,
        ownerRole: item.ownerRole,
        dueOn: item.dueOn
      }, actor);
      if (saved.ok) {
        var row = byId(model.actions, saved.id);
        if (row) row.source = "import";
        created.push(saved.id);
      }
    });
    return { ok: true, model: model, status: created.length ? "parsed" : "awaiting_parse", id: id, created: created };
  }
  function reminderPlan(model, actor, today) {
    var rows = [];
    if (canManage(actor && actor.role)) {
      hotelsFor(actor.role, actor.hotel).forEach(function (hotel) {
        (model.inspections || []).forEach(function (row) {
          if (row.hotel !== hotel || !row.nextDue) return;
          if (row.nextDue < today || row.nextDue > addDays(today, SOON)) return;
          rows.push({
            hotel: hotel, kind: "compliance_ins_" + row.id, ref: row.id, role: "GM",
            title: { en: "Inspection due soon", es: "Inspección por vencer" },
            body: { en: (row.kind === "health" ? "Health" : "Fire") + " · " + row.nextDue, es: (row.kind === "health" ? "Salud" : "Incendio") + " · " + row.nextDue }
          });
        });
      });
    }
    visibleActions(model, actor).forEach(function (row) {
      var state = actionState(row, today);
      if (state === "done") return;
      if (!canManage(actor.role) && !assignedTo(row, actor)) return;
      rows.push({
        hotel: row.hotel, kind: "compliance_act_" + row.id, ref: row.id, role: row.ownerRole || "",
        title: state === "overdue"
          ? { en: "Inspection item overdue", es: "Pendiente de inspección atrasado" }
          : { en: "Inspection item open", es: "Pendiente de inspección abierto" },
        body: { en: row.description, es: row.description }
      });
    });
    return rows;
  }
  function applySaved(model, saved) {
    if (!saved || saved.v !== 1) return model;
    var next = clone(model);
    ["inspections", "actions", "imports"].forEach(function (key) {
      (saved[key] || []).forEach(function (row) {
        if (!row || !row.id || HOTELS.indexOf(row.hotel) < 0) return;
        var replaced = false;
        next[key] = (next[key] || []).map(function (item) {
          if (item.id !== row.id) return item;
          replaced = true;
          return row;
        });
        if (!replaced) next[key].push(row);
      });
    });
    return next;
  }
  function userOverlay(model, base) {
    function changed(key) {
      return (model[key] || []).filter(function (row) {
        var orig = byId(base[key], row.id);
        return !orig || JSON.stringify(orig) !== JSON.stringify(row);
      });
    }
    return { v: 1, inspections: changed("inspections"), actions: changed("actions"), imports: changed("imports") };
  }
  function kindLabel(kind, lang) { return kind === "health" ? tx(lang, "Health", "Salud") : tx(lang, "Fire", "Incendio"); }
  function resultLabel(result, lang) {
    var map = { pass: ["Pass", "Aprobado"], fail: ["Fail", "Reprobado"], conditional: ["Conditional", "Condicional"] };
    var pair = map[result] || [result, result];
    return tx(lang, pair[0], pair[1]);
  }
  function stateLabel(state, lang) {
    var map = { open: ["Open", "Abierto"], overdue: ["Overdue", "Atrasado"], done: ["Fixed", "Corregido"] };
    var pair = map[state] || ["", ""];
    return tx(lang, pair[0], pair[1]);
  }
  function sample(lang) {
    return "<p class=\"ix-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample reports. Not real inspections.", "Reportes de ejemplo. No son inspecciones reales.")) + "</p>";
  }
  function actionArticle(row, actor, today, lang, mine) {
    var state = actionState(row, today);
    var proof = "<small>" + esc(tx(lang, "Photo of the fix", "Foto de la corrección")) + ": " + esc(row.proofName || tx(lang, "None", "Ninguna")) + "</small>";
    var form = "";
    if (state !== "done" && canComplete(actor, row)) {
      form = "<div class=\"ix-form\"><label>" + esc(tx(lang, "Fixed on", "Corregido el")) + "</label><input id=\"ix-date-" + esc(row.id) + "\" type=\"date\" value=\"" + esc(today) + "\">" +
        "<label>" + esc(tx(lang, "Photo of the fix", "Foto de la corrección")) + "</label><input type=\"file\" accept=\"image/*\" onchange=\"ixFile('" + esc(row.id) + "', this)\">" +
        "<p class=\"ix-file\" id=\"ix-file-" + esc(row.id) + "\"></p>" +
        "<button type=\"button\" class=\"btn\" onclick=\"ixDone('" + esc(row.id) + "')\">" + esc(tx(lang, "Mark fixed", "Marcar corregido")) + "</button></div>";
    }
    return "<article class=\"ix-card\" id=\"" + esc(row.id) + "\"><span class=\"ix-top\"><b>" + esc(row.description) + "</b> <span class=\"ix-badge ix-st-" + state + "\">" + esc(stateLabel(state, lang)) + "</span></span>" +
      "<small>" + esc(row.ownerName || tx(lang, "Role", "Puesto")) + (row.ownerRole ? " · " + esc(row.ownerRole) : "") + " · " + esc(tx(lang, "Due", "Límite")) + " " + esc(row.dueOn || "—") + "</small>" +
      (mine ? "" : "<small>" + esc(row.source === "import" ? tx(lang, "From the report import", "De la importación del reporte") : tx(lang, "Added by a manager", "Agregado por un gerente")) + "</small>") +
      proof + (row.completedName ? "<small>" + esc(tx(lang, "Signed off", "Firmado")) + ": " + esc(row.completedName) + "</small>" : "") + form + "</article>";
  }
  function detailHtml(model, id, actor, today, lang) {
    var row = byId(model.inspections, id);
    if (!row || !manages(actor, row.hotel)) return "";
    var actions = (model.actions || []).filter(function (item) { return item.inspectionId === row.id; }).map(function (item) {
      return actionArticle(item, actor, today, lang, false);
    }).join("");
    var staff = (model.staff || []).filter(function (item) { return item.hotel === row.hotel; });
    var people = "<option value=\"\">" + esc(tx(lang, "Role only", "Solo el puesto")) + "</option>" + staff.map(function (item) {
      return "<option value=\"" + esc(item.name) + "\">" + esc(item.name) + "</option>";
    }).join("");
    var roles = ["Front Desk", "Housekeeping", "Housekeeper", "Maintenance", "Laundry Attendant", "Breakfast Attendant", "House Person", "GM", "AGM"];
    if (row.hotel !== "MSPWE") roles.push("Shuttle Driver");
    if (row.hotel === "MSPMS") roles.push("Bartender");
    var roleOpts = roles.map(function (role) { return "<option>" + esc(role) + "</option>"; }).join("");
    var add = "<article class=\"ix-card\" id=\"ixAdd\"><h3>" + esc(tx(lang, "Add an action item", "Agregar un pendiente")) + "</h3>" +
      "<label>" + esc(tx(lang, "Description", "Descripción")) + "</label><textarea id=\"ix-new-desc\" maxlength=\"300\"></textarea>" +
      "<label>" + esc(tx(lang, "Owner", "Responsable")) + "</label><select id=\"ix-new-owner\">" + people + "</select>" +
      "<label>" + esc(tx(lang, "Role", "Puesto")) + "</label><select id=\"ix-new-role\">" + roleOpts + "</select>" +
      "<label>" + esc(tx(lang, "Due date", "Fecha límite")) + "</label><input id=\"ix-new-due\" type=\"date\">" +
      "<button type=\"button\" class=\"btn\" onclick=\"ixAddAction('" + esc(row.id) + "')\">" + esc(tx(lang, "Add action item", "Agregar pendiente")) + "</button></article>";
    return "<button type=\"button\" class=\"ix-back\" onclick=\"ixBack()\">‹ " + esc(tx(lang, "Inspections", "Inspecciones")) + "</button>" +
      "<article class=\"ix-card\" id=\"ixDetail\"><span class=\"ix-top\"><b>" + esc(kindLabel(row.kind, lang)) + "</b> <span class=\"ix-badge\">" + esc(resultLabel(row.result, lang)) + "</span></span>" +
      "<p>" + esc(row.agency) + "</p><p>" + esc(tx(lang, "Inspected", "Inspeccionado")) + " " + esc(row.date) + " · " + esc(tx(lang, "Score", "Puntaje")) + " " + esc(row.score || "—") + "</p>" +
      "<p>" + esc(tx(lang, "Next due", "Próximo vencimiento")) + " " + esc(row.nextDue || "—") + "</p>" +
      "<p>" + esc(tx(lang, "Report", "Reporte")) + ": " + esc(row.documentName || tx(lang, "None", "Ninguno")) + "</p>" +
      "<p class=\"ix-note\">" + esc(row.notes || "") + "</p>" +
      "<label>" + esc(tx(lang, "Replace report (PDF or photo)", "Reemplazar reporte (PDF o foto)")) + "</label><input type=\"file\" accept=\"image/*,.pdf,application/pdf\" onchange=\"ixReport('" + esc(row.id) + "', this)\"></article>" +
      "<h3>" + esc(tx(lang, "Action items", "Pendientes")) + "</h3>" + actions + add;
  }
  function listHtml(model, actor, hotel, today, lang) {
    var rows = (model.inspections || []).filter(function (row) { return row.hotel === hotel; }).map(function (row) {
      var counts = (model.actions || []).filter(function (item) { return item.inspectionId === row.id && item.status !== "done"; }).length;
      return "<button type=\"button\" class=\"ix-row\" onclick=\"ixOpen('" + esc(row.id) + "')\"><span class=\"ix-top\"><b>" + esc(kindLabel(row.kind, lang)) + "</b> <span class=\"ix-badge\">" + esc(resultLabel(row.result, lang)) + "</span></span><small>" +
        esc(row.agency) + " · " + esc(row.date) + " · " + esc(tx(lang, "Next due", "Próximo vencimiento")) + " " + esc(row.nextDue || "—") + " · " + counts + " " + esc(tx(lang, "open", "abiertos")) + "</small></button>";
    }).join("");
    var waiting = (model.imports || []).filter(function (row) { return row.hotel === hotel && row.status === "awaiting_parse"; }).length;
    var form = "<article class=\"ix-card\" id=\"ixNew\"><h3>" + esc(tx(lang, "Upload a report", "Subir un reporte")) + "</h3>" +
      "<p class=\"ix-note\">" + esc(tx(lang, "The assistant reads the report and adds action items. This demo keeps the file name only and does not store the file.", "El asistente lee el reporte y agrega pendientes. Esta demostración guarda solo el nombre y no guarda el archivo.")) + "</p>" +
      "<label>" + esc(tx(lang, "Kind", "Tipo")) + "</label><select id=\"ix-kind\"><option value=\"fire\">" + esc(tx(lang, "Fire", "Incendio")) + "</option><option value=\"health\">" + esc(tx(lang, "Health", "Salud")) + "</option></select>" +
      "<label>" + esc(tx(lang, "Inspection date", "Fecha de inspección")) + "</label><input id=\"ix-date\" type=\"date\" value=\"" + esc(today) + "\">" +
      "<label>" + esc(tx(lang, "Agency", "Agencia")) + "</label><input id=\"ix-agency\" maxlength=\"120\">" +
      "<label>" + esc(tx(lang, "Result", "Resultado")) + "</label><select id=\"ix-result\"><option value=\"pass\">" + esc(tx(lang, "Pass", "Aprobado")) + "</option><option value=\"conditional\">" + esc(tx(lang, "Conditional", "Condicional")) + "</option><option value=\"fail\">" + esc(tx(lang, "Fail", "Reprobado")) + "</option></select>" +
      "<label>" + esc(tx(lang, "Score", "Puntaje")) + "</label><input id=\"ix-score\" maxlength=\"40\">" +
      "<label>" + esc(tx(lang, "Next due", "Próximo vencimiento")) + "</label><input id=\"ix-next\" type=\"date\">" +
      "<label>" + esc(tx(lang, "Report file", "Archivo del reporte")) + "</label><input id=\"ix-doc\" type=\"file\" accept=\"image/*,.pdf,application/pdf\">" +
      "<div class=\"ix-acts\"><button type=\"button\" class=\"btn\" onclick=\"ixSave()\">" + esc(tx(lang, "Save report", "Guardar reporte")) + "</button>" +
      "<button type=\"button\" class=\"btn2\" onclick=\"ixSend()\">" + esc(tx(lang, "Send to assistant", "Enviar al asistente")) + "</button></div>" +
      (waiting ? "<p class=\"ix-note\" id=\"ixWait\">" + esc(tx(lang, "A report is waiting for the assistant. No action items were created from it yet.", "Un reporte espera al asistente. Todavía no se crearon pendientes.")) + "</p>" : "") +
      "</article>";
    return "<div id=\"ixList\">" + rows + "</div>" + form;
  }
  function boardHtml(model, today, lang) {
    return "<div class=\"ix-hotels\" id=\"ixBoard\">" + board(model, today).map(function (row) {
      return "<button type=\"button\" class=\"ix-hotel\" onclick=\"ixHotel('" + row.code + "')\"><b>" + esc(row.code) + "</b><small>" + esc(row.name) + "</small><span>" +
        esc(row.overdue + " " + tx(lang, "overdue", "atrasados") + " · " + row.open + " " + tx(lang, "open", "abiertos")) + "</span><small>" +
        esc(tx(lang, "Next", "Próxima")) + " " + esc(row.nextDue || "—") + "</small></button>";
    }).join("") + "</div>";
  }
  function pageHtml(model, actor, view) {
    view = view || {};
    var lang = view.lang === "es" ? "es" : "en";
    var today = view.today || todayOf(new Date());
    if (view.mode === "mine") {
      var mine = myActions(model, actor).map(function (row) { return actionArticle(row, actor, today, lang, true); }).join("");
      return "<div class=\"ix\" id=\"ixRoot\"><h2>" + esc(tx(lang, "My inspection items", "Mis pendientes de inspección")) + "</h2>" + sample(lang) +
        (mine || "<p class=\"ix-note\">" + esc(tx(lang, "Nothing is assigned to you.", "No tienes pendientes.")) + "</p>") + "</div>";
    }
    var hotels = hotelsFor(actor.role, actor.hotel);
    if (!hotels.length) return "<div class=\"ix\" id=\"ixRoot\"></div>";
    var hotel = view.hotel && hotels.indexOf(view.hotel) >= 0 ? view.hotel : hotels[0];
    var chips = hotels.length > 1 ? "<div class=\"ix-chips\">" + hotels.map(function (id) {
      return "<button type=\"button\" class=\"" + (hotel === id ? "on" : "") + "\" onclick=\"ixHotel('" + id + "')\">" + esc(id) + "</button>";
    }).join("") + "</div>" : "";
    var body = view.inspectionId ? detailHtml(model, view.inspectionId, actor, today, lang) : listHtml(model, actor, hotel, today, lang);
    var summary = !view.inspectionId && hotels.length > 1 ? boardHtml(model, today, lang) : "";
    return "<div class=\"ix\" id=\"ixRoot\"><h2>" + esc(tx(lang, "Inspections", "Inspecciones")) + "</h2>" + sample(lang) +
      "<p class=\"ix-note\">" + esc(NAMES[hotel] || hotel) + "</p>" + chips + summary + body + "</div>";
  }

  var api = {
    HOTELS: HOTELS, NAMES: NAMES, STAFF: STAFF,
    normRole: normRole, canManage: canManage, hotelsFor: hotelsFor, manages: manages, demoUi: demoUi,
    todayOf: todayOf, addDays: addDays, buildDemo: buildDemo, assignedTo: assignedTo, canComplete: canComplete,
    actionState: actionState, visibleActions: visibleActions, myActions: myActions, attentionOf: attentionOf, board: board,
    saveInspection: saveInspection, saveAction: saveAction, completeAction: completeAction, ingest: ingest,
    reminderPlan: reminderPlan, applySaved: applySaved, userOverlay: userOverlay, pageHtml: pageHtml, cleanFile: cleanFile
  };
  root.Inspections = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  var files = {};
  function langNow() { try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; } }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return me ? { role: me.role, hotel: me.hotel || "", name: me.name || "" } : { role: "", hotel: "", name: "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function readSaved() {
    try { var data = JSON.parse(localStorage.getItem(KEY) || "null"); return data && data.v === 1 ? data : null; } catch (e) { return null; }
  }
  function baseNow() { return buildDemo(new Date().toISOString()); }
  function bundle() { return applySaved(baseNow(), readSaved()); }
  function remember(model) { try { localStorage.setItem(KEY, JSON.stringify(userOverlay(model, baseNow()))); } catch (e) {} }
  function bootManage() {
    var actor = actorNow();
    var hotel = "";
    var inspectionId = "";
    try { hotel = S.ixHotel || ""; inspectionId = S.ixId || ""; } catch (e) {}
    return pageHtml(bundle(), actor, { hotel: hotel, inspectionId: inspectionId, lang: langNow(), today: todayOf(new Date()) });
  }
  function bootMine() {
    return pageHtml(bundle(), actorNow(), { mode: "mine", lang: langNow(), today: todayOf(new Date()) });
  }
  function syncReminders() {
    if (!root.HHQNotify || !HHQNotify.post || typeof S === "undefined") return;
    var plan = reminderPlan(bundle(), actorNow(), todayOf(new Date()));
    var keep = {};
    plan.forEach(function (row) { keep[row.kind] = 1; });
    S.reminders = (S.reminders || []).filter(function (row) {
      var kind = row && String(row.kind);
      if (kind.indexOf("compliance_ins_") !== 0 && kind.indexOf("compliance_act_") !== 0) return true;
      return !!keep[kind];
    });
    plan.forEach(function (row) {
      if ((S.reminders || []).some(function (item) { return item.kind === row.kind && !item.read_at; })) return;
      HHQNotify.post({ hotel: row.hotel, channel: "in_app", role: row.role, kind: row.kind, title: row.title, body: row.body });
    });
  }
  root.ixHotel = function (hotel) {
    if (!manages(actorNow(), hotel)) return;
    try { S.ixHotel = hotel; S.ixId = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.ixOpen = function (id) {
    if (!safeInsp(id)) return;
    var row = byId(bundle().inspections, id);
    if (!row || !manages(actorNow(), row.hotel)) return;
    try { S.ixId = id; S.ixHotel = row.hotel; } catch (e) {}
    if (typeof go === "function") go("inspx");
    else if (typeof render === "function") render();
  };
  root.ixBack = function () {
    try { S.ixId = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.ixFile = function (id, input) {
    if (!safeAction(id) || !input || !input.files || !input.files[0]) return;
    files[id] = cleanFile(input.files[0].name);
    var node = document.getElementById("ix-file-" + id);
    if (node) node.textContent = files[id];
  };
  root.ixDone = function (id) {
    if (!safeAction(id)) return;
    var date = document.getElementById("ix-date-" + id);
    var result = completeAction(bundle(), id, { date: date ? date.value : "", proofName: files[id] || "" }, actorNow(), new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    syncReminders();
    if (typeof render === "function") render();
  };
  root.ixAddAction = function (inspectionId) {
    if (!safeInsp(inspectionId)) return;
    var parent = byId(bundle().inspections, inspectionId);
    if (!parent) return;
    var result = saveAction(bundle(), {
      hotel: parent.hotel,
      inspectionId: inspectionId,
      description: (document.getElementById("ix-new-desc") || {}).value,
      ownerName: (document.getElementById("ix-new-owner") || {}).value,
      ownerRole: (document.getElementById("ix-new-role") || {}).value,
      dueOn: (document.getElementById("ix-new-due") || {}).value
    }, actorNow());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  function readReport(send) {
    var hotel = "";
    try { hotel = S.ixHotel || S.hotel || ""; } catch (e) {}
    var actor = actorNow();
    if (hotelsFor(actor.role, actor.hotel).indexOf(hotel) < 0) hotel = hotelsFor(actor.role, actor.hotel)[0] || "";
    var file = document.getElementById("ix-doc");
    var fileName = file && file.files && file.files[0] ? file.files[0].name : "";
    if (send) {
      return ingest(bundle(), {
        hotel: hotel,
        kind: (document.getElementById("ix-kind") || {}).value,
        fileName: fileName
      }, actor, new Date().toISOString());
    }
    return saveInspection(bundle(), {
      hotel: hotel,
      kind: (document.getElementById("ix-kind") || {}).value,
      date: (document.getElementById("ix-date") || {}).value,
      agency: (document.getElementById("ix-agency") || {}).value,
      result: (document.getElementById("ix-result") || {}).value,
      score: (document.getElementById("ix-score") || {}).value,
      nextDue: (document.getElementById("ix-next") || {}).value,
      documentName: fileName,
      notes: "Sample report. Not a real inspection."
    }, actor);
  }
  root.ixSave = function () {
    var result = readReport(false);
    if (!result.ok) return;
    remember(result.model);
    try { S.ixId = result.id; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.ixSend = function () {
    var result = readReport(true);
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  root.ixReport = function (id, input) {
    if (!safeInsp(id) || !input || !input.files || !input.files[0]) return;
    var model = bundle();
    var row = byId(model.inspections, id);
    if (!row || !manages(actorNow(), row.hotel)) return;
    row.documentName = cleanFile(input.files[0].name);
    remember(model);
    if (typeof render === "function") render();
  };
  function featureOn(hotel) {
    try { if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "inspections") !== false; } catch (e) {}
    return true;
  }
  if (typeof M !== "undefined") {
    M.inspx = ["📋", "Inspections"];
    M.ifix = ["✅", "My inspection items"];
  }
  if (typeof I18N !== "undefined" && I18N.es) {
    I18N.es.Inspections = "Inspecciones";
    I18N.es["My inspection items"] = "Mis pendientes de inspección";
  }
  if (typeof V !== "undefined") { V.inspx = bootManage; V.ifix = bootMine; }
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = actorNow();
      var hotel = "";
      try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
      var on = featureOn(hotel || actor.hotel);
      var manage = demoUi() && on && hotelsFor(actor.role || role, actor.hotel || hotel).length > 0;
      var mine = demoUi() && on && !canManage(actor.role || role) && myActions(bundle(), actor).length > 0;
      if (manage && list.indexOf("inspx") < 0) list.splice(Math.min(3, list.length), 0, "inspx");
      if (mine && list.indexOf("ifix") < 0) list.splice(Math.min(3, list.length), 0, "ifix");
      if (!manage) list = list.filter(function (id) { return id !== "inspx"; });
      if (!mine) list = list.filter(function (id) { return id !== "ifix"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows) {
        var allow = function (h, feature) { return feature === "inspections" ? featureOn(h) : true; };
        if (!root.HHQMenus.menuAllows("inspx", actor.role || role, hotel, allow)) list = list.filter(function (id) { return id !== "inspx"; });
        if (!root.HHQMenus.menuAllows("ifix", actor.role || role, hotel, allow)) list = list.filter(function (id) { return id !== "ifix"; });
      }
      return list;
    };
  }
  try {
    if (typeof RSEC !== "undefined" && RSEC[4]) {
      if (RSEC[4][2].indexOf("inspx") < 0) RSEC[4][2].push("inspx");
      if (RSEC[4][2].indexOf("ifix") < 0) RSEC[4][2].push("ifix");
    }
  } catch (e) {}
  try {
    if (typeof NOCOLS !== "undefined") {
      if (NOCOLS.indexOf("inspx") < 0) NOCOLS.push("inspx");
      if (NOCOLS.indexOf("ifix") < 0) NOCOLS.push("ifix");
    }
  } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "inspections", en: "Inspections", es: "Inspecciones", order: 28 });
  syncReminders();
  var style = document.createElement("style");
  style.textContent = [
    ".ix-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".ix-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}",
    ".ix-chips button{flex:0 0 auto;background:#e6ebf2;color:#14365d;font-weight:700;min-height:44px}",
    ".ix-chips button.on{background:#14365d;color:#fff}",
    ".ix-hotels{display:grid;grid-template-columns:1fr;gap:8px}",
    ".ix-hotel,.ix-card{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".ix-hotel{display:flex;flex-direction:column;align-items:flex-start;text-align:left;min-height:104px}",
    ".ix-row{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:#fff;border:0;border-top:1px solid #e6ebf2;border-radius:0;padding:12px 0;min-height:64px}",
    ".ix-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center}",
    ".ix-badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#eef3fa;color:#14365d;font-size:12px;font-weight:800}",
    ".ix-st-open{background:#fff3cd;color:#8a5a00}",
    ".ix-st-overdue{background:#fde2e1;color:#8f1d1d}",
    ".ix-st-done{background:#d4f5dc;color:#15642f}",
    ".ix-card small,.ix-row small,.ix-hotel small{display:block;color:#3c4658;margin-top:4px}",
    ".ix-form label,.ix-card label{display:block;font-size:13px;font-weight:700;margin:8px 0 4px}",
    ".ix-form input,.ix-form select,.ix-card input,.ix-card select,.ix-card textarea{width:100%;min-height:44px;font-size:16px}",
    ".ix-back{display:inline-flex;align-items:center;background:#eef3fa;border:0;border-radius:10px;min-height:44px;font-weight:800;padding:0 12px}",
    ".ix-acts{display:flex;flex-wrap:wrap;gap:8px}",
    ".ix .btn,.ix .btn2{min-height:44px;margin-top:8px}",
    "@media(min-width:768px){.ix-hotels{grid-template-columns:repeat(3,minmax(0,1fr))}}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
