/* Training tracker, demo site only.
   GM and AGM see their hotel. Corporate sees every hotel.
   Required courses follow the position. Managers edit the types and the positions.
   Online brand courses and in-person classes both live here.
   A completion is manual or brand_import. The brand feed stays awaiting_import
   and does not keep a file body.
   Live mode loads this file and does not add a menu. */
(function (root) {
  "use strict";

  var HOTELS = ["MSPWE", "MSPAM", "MSPMS"];
  var NAMES = { MSPWE: "Golden Valley", MSPAM: "Hampton", MSPMS: "SpringHill" };
  var TZ = "America/Chicago";
  var KEY = "jrportal_training_v1";
  var SOON = 30;
  var POSITIONS = ["GM", "AGM", "Front Desk", "Housekeeping", "Housekeeper", "Maintenance", "Shuttle Driver", "House Person", "Laundry Attendant", "Breakfast Attendant", "Bartender"];
  var KINDS = ["online", "in_person"];
  var BRANDS = ["", "ihg", "marriott", "hilton"];
  var BRAND = {
    MSPWE: { id: "ihg", key: "ihg", en: "IHG University", es: "IHG University" },
    MSPAM: { id: "hilton", key: "hilton", en: "Hilton University", es: "Hilton University" },
    MSPMS: { id: "marriott", key: "marriott", en: "Marriott University", es: "Marriott University" }
  };
  var SIGNER = { MSPWE: "Avery Cole", MSPAM: "Riley Brooks", MSPMS: "Dana Singh" };
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
  var OVERRIDES = {
    "mspwe-ba|tr-mspwe-food": { completedOn: -340, expiresOn: 25, certificateName: "sample-food-card.jpg", signedOffName: "Avery Cole" },
    "mspwe-ba|tr-mspwe-hands": { completedOn: "" },
    "mspwe-fd|tr-mspwe-cpr": { completedOn: -800, expiresOn: -35 },
    "mspwe-fd|tr-mspwe-ihg": { completedOn: -30, source: "brand_import", signedOffName: "IHG University" },
    "mspwe-hkr|tr-mspwe-fire": { completedOn: -340, expiresOn: 18, certificateName: "sample-drill.jpg" },
    "mspwe-mt|tr-mspwe-cpr": { completedOn: -700, expiresOn: 10 },
    "mspwe-hk|tr-mspwe-cpr": { completedOn: "" },
    "mspwe-la|tr-mspwe-chem": { completedOn: -400, expiresOn: -3 },
    "mspam-ba|tr-mspam-food": { completedOn: -350, expiresOn: 15, certificateName: "sample-food-card.jpg" },
    "mspam-mt|tr-mspam-cpr": { completedOn: -800, expiresOn: -20 },
    "mspam-fd|tr-mspam-hilton": { completedOn: -15, source: "brand_import", signedOffName: "Hilton University" },
    "mspam-sh|tr-mspam-fire": { completedOn: "" },
    "mspms-bar|tr-mspms-alcohol": { completedOn: -300, expiresOn: 12, certificateName: "sample-servsafe.jpg", signedOffName: "Dana Singh" },
    "mspms-ba|tr-mspms-food": { completedOn: "" },
    "mspms-mt|tr-mspms-cpr": { completedOn: -760, expiresOn: -8 },
    "mspms-fd|tr-mspms-marriott": { completedOn: -12, source: "brand_import", signedOffName: "Marriott University" }
  };

  function normRole(role) {
    if (role === "JR Corporate" || role === "above_property" || role === "Above Property") return "Above Property";
    if (role === "gm" || role === "GM") return "GM";
    if (role === "agm" || role === "AGM") return "AGM";
    return role || "";
  }
  function isCorporate(role) { return normRole(role) === "Above Property"; }
  function canSee(role) {
    role = normRole(role);
    if (root.HHQ && root.HHQ.can) return root.HHQ.can(role, "training.see");
    return role === "GM" || role === "AGM" || role === "Above Property";
  }
  function hotelsFor(role, hotel) {
    if (!canSee(role)) return [];
    if (isCorporate(role)) return HOTELS.slice();
    return HOTELS.indexOf(hotel) >= 0 ? [hotel] : [];
  }
  function canEdit(actor, hotel) {
    actor = actor || {};
    return canSee(actor.role) && hotelsFor(actor.role, actor.hotel).indexOf(hotel) >= 0;
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
  function zonedParts(now) {
    var date = now instanceof Date ? now : new Date(now);
    var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
    var bag = {};
    fmt.formatToParts(date).forEach(function (part) { if (part.type !== "literal") bag[part.type] = part.value; });
    return bag.year + "-" + bag.month + "-" + bag.day;
  }
  function todayOf(now) {
    if (typeof now === "string" && /^\d{4}-\d{2}-\d{2}$/.test(now)) return now;
    return zonedParts(now || new Date());
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function tx(lang, en, es) { return lang === "es" ? es : en; }
  function positionsAt(hotel) {
    return POSITIONS.filter(function (pos) {
      if (pos === "Bartender") return hotel === "MSPMS";
      if (pos === "Shuttle Driver") return hotel === "MSPAM" || hotel === "MSPMS";
      return true;
    });
  }
  function knownPosition(pos) { return POSITIONS.indexOf(pos) >= 0; }
  function safeType(id) { return /^tr-[a-z0-9-]{1,80}$/.test(String(id || "")); }
  function safePerson(id) { return /^[a-z0-9-]{1,40}$/.test(String(id || "")); }
  function safeRecord(id) { return /^rec-[a-z0-9-]{1,96}$/.test(String(id || "")); }
  function cleanFile(name) {
    var base = String(name || "").split(/[/\\]/).pop();
    base = base.replace(/[^A-Za-z0-9._ -]/g, "").slice(0, 80);
    return base;
  }
  function slug(name) {
    return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
  }
  function course(hotel, suffix, en, es, kind, brand, days, positions) {
    return {
      id: "tr-" + hotel.toLowerCase() + "-" + suffix,
      hotel: hotel, nameEn: en, nameEs: es, kind: kind, brand: brand || "",
      validityDays: days, positions: positions.slice(), active: true
    };
  }
  function typesForHotel(hotel) {
    var brand = BRAND[hotel];
    var hands = ["Front Desk", "Housekeeper", "Breakfast Attendant", "Laundry Attendant", "House Person"];
    if (hotel !== "MSPWE") hands.push("Shuttle Driver");
    if (hotel === "MSPMS") hands.push("Bartender");
    var list = [
      course(hotel, "food", "Food safety", "Seguridad alimentaria", "in_person", "", 365, ["Breakfast Attendant"]),
      course(hotel, brand.id, brand.en, brand.es, "online", brand.key, null, ["GM", "AGM", "Front Desk", "Housekeeping", "Housekeeper", "Maintenance"]),
      course(hotel, "cpr", "CPR and AED", "RCP y DEA", "in_person", "", 730, ["Front Desk", "Maintenance", "Housekeeping"]),
      course(hotel, "chem", "Chemical safety", "Seguridad química", "in_person", "", 365, ["Housekeeper", "Laundry Attendant", "House Person"]),
      course(hotel, "hands", "Hands-on job training", "Capacitación práctica", "in_person", "", null, hands),
      course(hotel, "fire", "Fire drill", "Simulacro de incendio", "in_person", "", 365, positionsAt(hotel))
    ];
    if (hotel === "MSPMS") list.push(course(hotel, "alcohol", "ServSafe alcohol", "ServSafe alcohol", "in_person", "", 365, ["Bartender"]));
    return list;
  }
  function buildRecord(person, type, today) {
    var spec = OVERRIDES[person.id + "|" + type.id] || {};
    var completed = spec.completedOn === "" ? "" : addDays(today, spec.completedOn == null ? -120 : spec.completedOn);
    var expires = "";
    if (completed) {
      if (spec.expiresOn === null || spec.expiresOn === undefined) {
        expires = type.validityDays ? addDays(completed, type.validityDays) : "";
      } else if (typeof spec.expiresOn === "number") expires = addDays(today, spec.expiresOn);
      else expires = "";
    }
    var suffix = type.id.replace(/^tr-[a-z]+-/, "");
    return {
      id: "rec-" + person.id + "-" + suffix,
      hotel: person.hotel,
      typeId: type.id,
      associateId: person.id,
      associateName: person.name,
      position: person.role,
      completedOn: completed,
      expiresOn: expires,
      certificateName: spec.certificateName || "",
      signedOffName: completed ? (spec.signedOffName || SIGNER[person.hotel] || "") : "",
      signedOffAt: completed ? completed + "T15:00:00.000Z" : "",
      source: spec.source || "manual"
    };
  }
  function buildDemo(now) {
    var today = todayOf(now);
    var types = [];
    HOTELS.forEach(function (hotel) { types = types.concat(typesForHotel(hotel)); });
    var records = [];
    STAFF.forEach(function (person) {
      types.forEach(function (type) {
        if (type.hotel !== person.hotel) return;
        if (type.positions.indexOf(person.role) < 0) return;
        records.push(buildRecord(person, type, today));
      });
    });
    var imports = HOTELS.map(function (hotel) {
      return { id: "tr-import-" + hotel.toLowerCase(), hotel: hotel, source: BRAND[hotel].key, status: "awaiting_import", receivedAt: today + "T15:00:00.000Z" };
    });
    return { types: types, records: records, imports: imports, staff: STAFF.map(function (row) { return { id: row.id, name: row.name, role: row.role, hotel: row.hotel }; }) };
  }
  function typeById(model, id) {
    var found = null;
    (model.types || []).forEach(function (row) { if (row.id === id) found = row; });
    return found;
  }
  function recordById(model, id) {
    var found = null;
    (model.records || []).forEach(function (row) { if (row.id === id) found = row; });
    return found;
  }
  function statusOf(record, today) {
    record = record || {};
    today = today || todayOf(new Date());
    if (!record.completedOn) return "not_started";
    if (record.expiresOn && record.expiresOn < today) return "expired";
    if (record.expiresOn && record.expiresOn <= addDays(today, SOON)) return "due_soon";
    return "done";
  }
  function recordsFor(model, hotel) {
    return (model.records || []).filter(function (row) { return row.hotel === hotel; });
  }
  function staffAt(model, hotel) {
    return (model.staff || STAFF).filter(function (row) { return row.hotel === hotel; });
  }
  function attentionOf(model, hotel, today) {
    if (HOTELS.indexOf(hotel) < 0) return null;
    var rows = recordsFor(model, hotel);
    if (!rows.length) return null;
    var bag = { expired: 0, dueSoon: 0 };
    rows.forEach(function (row) {
      var status = statusOf(row, today);
      if (status === "expired") bag.expired += 1;
      else if (status === "due_soon") bag.dueSoon += 1;
    });
    return bag;
  }
  function compliance(model, hotel, today) {
    var rows = recordsFor(model, hotel);
    var ok = 0;
    rows.forEach(function (row) {
      var status = statusOf(row, today);
      if (status === "done" || status === "due_soon") ok += 1;
    });
    return { required: rows.length, ok: ok, pct: rows.length ? Math.round(ok * 100 / rows.length) : 0 };
  }
  function complianceBoard(model, today) {
    return HOTELS.map(function (hotel) {
      var row = compliance(model, hotel, today);
      row.code = hotel;
      row.name = NAMES[hotel];
      return row;
    });
  }
  function people(model, hotel, today) {
    var rank = { expired: 3, due_soon: 2, not_started: 1, done: 0 };
    return staffAt(model, hotel).map(function (person) {
      var rows = (model.records || []).filter(function (row) { return row.associateId === person.id; });
      var worst = "done";
      var ok = 0;
      rows.forEach(function (row) {
        var status = statusOf(row, today);
        if (rank[status] > rank[worst]) worst = status;
        if (status === "done" || status === "due_soon") ok += 1;
      });
      return { person: person, required: rows.length, ok: ok, worst: rows.length ? worst : "done" };
    }).sort(function (a, b) {
      return rank[b.worst] - rank[a.worst] || a.person.name.localeCompare(b.person.name);
    });
  }
  function personRows(model, personId, today) {
    return (model.records || []).filter(function (row) { return row.associateId === personId; }).map(function (row) {
      return { record: row, type: typeById(model, row.typeId), status: statusOf(row, today) };
    });
  }
  function syncRequirements(model) {
    var next = [];
    (model.records || []).forEach(function (row) {
      var type = typeById(model, row.typeId);
      var person = null;
      (model.staff || []).forEach(function (item) { if (item.id === row.associateId) person = item; });
      if (!type || !person) return;
      if (type.positions.indexOf(person.role) < 0) return;
      next.push(row);
    });
    (model.staff || []).forEach(function (person) {
      (model.types || []).forEach(function (type) {
        if (type.hotel !== person.hotel || !type.active) return;
        if (type.positions.indexOf(person.role) < 0) return;
        if (next.some(function (row) { return row.associateId === person.id && row.typeId === type.id; })) return;
        next.push({
          id: "rec-" + person.id + "-" + type.id.replace(/^tr-[a-z0-9]+-/, ""),
          hotel: person.hotel, typeId: type.id, associateId: person.id, associateName: person.name, position: person.role,
          completedOn: "", expiresOn: "", certificateName: "", signedOffName: "", signedOffAt: "", source: "manual"
        });
      });
    });
    model.records = next;
    return model;
  }
  function readTypeInput(input) {
    input = input || {};
    var name = String(input.nameEn || "").trim();
    var nameEs = String(input.nameEs || "").trim();
    if (name.length < 2 || name.length > 80 || nameEs.length > 80) return { ok: false, reason: "name" };
    if (KINDS.indexOf(input.kind) < 0) return { ok: false, reason: "kind" };
    if (BRANDS.indexOf(input.brand || "") < 0) return { ok: false, reason: "brand" };
    var days = input.validityDays;
    if (days === "" || days == null) days = null;
    else {
      days = Number(days);
      if (!isFinite(days) || days < 1 || days > 3650) return { ok: false, reason: "validity" };
    }
    return { ok: true, nameEn: name, nameEs: nameEs || name, kind: input.kind, brand: input.brand || "", validityDays: days };
  }
  function saveType(model, id, input, actor) {
    var type = typeById(model, id);
    if (!type || !canEdit(actor, type.hotel)) return { ok: false, reason: "not_allowed" };
    var parsed = readTypeInput(input);
    if (!parsed.ok) return parsed;
    type.nameEn = parsed.nameEn;
    type.nameEs = parsed.nameEs;
    type.kind = parsed.kind;
    type.brand = parsed.brand;
    type.validityDays = parsed.validityDays;
    return { ok: true, model: model };
  }
  function setPositions(model, id, positions, actor) {
    var type = typeById(model, id);
    if (!type || !canEdit(actor, type.hotel)) return { ok: false, reason: "not_allowed" };
    var allowed = positionsAt(type.hotel);
    var next = [];
    (positions || []).forEach(function (pos) {
      if (knownPosition(pos) && allowed.indexOf(pos) >= 0 && next.indexOf(pos) < 0) next.push(pos);
    });
    type.positions = next;
    syncRequirements(model);
    return { ok: true, model: model };
  }
  function addType(model, input, actor) {
    input = input || {};
    if (!canEdit(actor, input.hotel)) return { ok: false, reason: "not_allowed" };
    var parsed = readTypeInput(input);
    if (!parsed.ok) return parsed;
    var base = "tr-" + String(input.hotel).toLowerCase() + "-" + (slug(parsed.nameEn) || "course");
    var id = base;
    var n = 2;
    while (typeById(model, id)) { id = base + "-" + n; n += 1; }
    if (!safeType(id)) return { ok: false, reason: "name" };
    model.types.push({
      id: id, hotel: input.hotel, nameEn: parsed.nameEn, nameEs: parsed.nameEs,
      kind: parsed.kind, brand: parsed.brand, validityDays: parsed.validityDays,
      positions: [], active: true
    });
    var placed = setPositions(model, id, input.positions || [], actor);
    return placed.ok ? { ok: true, model: model, id: id } : placed;
  }
  function markComplete(model, id, input, actor, nowIso) {
    var rec = recordById(model, id);
    if (!rec || !canEdit(actor, rec.hotel)) return { ok: false, reason: "not_allowed" };
    var day = String((input && input.date) || "").slice(0, 10);
    var today = todayOf(nowIso || new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day > today) return { ok: false, reason: "date" };
    var exp = String((input && input.expiresOn) || "").slice(0, 10);
    if (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)) return { ok: false, reason: "expires" };
    var type = typeById(model, rec.typeId);
    if (!exp && type && type.validityDays) exp = addDays(day, type.validityDays);
    rec.completedOn = day;
    rec.expiresOn = exp;
    rec.signedOffName = (actor && actor.name) || "";
    rec.signedOffAt = typeof nowIso === "string" ? nowIso : new Date(nowIso || Date.now()).toISOString();
    if (input && input.certificateName) rec.certificateName = cleanFile(input.certificateName);
    if (rec.source !== "brand_import") rec.source = "manual";
    return { ok: true, model: model };
  }
  function ingestBrand(model, hotel, actor, nowIso) {
    if (!canEdit(actor, hotel)) return { ok: false, reason: "not_allowed" };
    var existing = null;
    (model.imports || []).forEach(function (row) {
      if (row.hotel === hotel && row.status === "awaiting_import") existing = row;
    });
    if (existing) return { ok: true, model: model, status: "awaiting_import", id: existing.id };
    var stamp = String(nowIso || new Date().toISOString()).replace(/\W/g, "").slice(0, 15);
    var id = "tr-import-" + hotel.toLowerCase() + "-" + stamp.toLowerCase();
    model.imports = model.imports || [];
    model.imports.push({ id: id, hotel: hotel, source: BRAND[hotel].key, status: "awaiting_import", receivedAt: nowIso || new Date().toISOString() });
    return { ok: true, model: model, status: "awaiting_import", id: id };
  }
  function reminderPlan(model, actor, today) {
    var hotels = hotelsFor(actor && actor.role, actor && actor.hotel);
    var rows = [];
    hotels.forEach(function (hotel) {
      recordsFor(model, hotel).forEach(function (rec) {
        var status = statusOf(rec, today);
        if (status !== "expired" && status !== "due_soon") return;
        var type = typeById(model, rec.typeId);
        var name = type ? type.nameEn : "Training";
        var nameEs = type ? type.nameEs : "Capacitación";
        rows.push({
          hotel: hotel,
          kind: "compliance_tr_" + rec.id,
          ref: rec.id,
          role: "GM",
          title: status === "expired"
            ? { en: name + " expired", es: nameEs + " venció" }
            : { en: name + " expires soon", es: nameEs + " vence pronto" },
          body: {
            en: rec.associateName + " · " + (rec.expiresOn || ""),
            es: rec.associateName + " · " + (rec.expiresOn || "")
          }
        });
      });
    });
    return rows;
  }
  function validType(row) {
    if (!row || !safeType(row.id) || HOTELS.indexOf(row.hotel) < 0) return false;
    if (KINDS.indexOf(row.kind) < 0 || BRANDS.indexOf(row.brand || "") < 0) return false;
    if (!row.nameEn || String(row.nameEn).length > 80) return false;
    return (row.positions || []).every(knownPosition);
  }
  function validRecord(row) {
    if (!row || !safeRecord(row.id) || HOTELS.indexOf(row.hotel) < 0) return false;
    if (!safeType(row.typeId) || !safePerson(row.associateId)) return false;
    if (row.source !== "manual" && row.source !== "brand_import") return false;
    return true;
  }
  function applySaved(model, saved) {
    if (!saved || saved.v !== 1) return model;
    var next = clone(model);
    (saved.removedTypeIds || []).forEach(function (id) {
      if (!safeType(id)) return;
      next.types = next.types.filter(function (row) { return row.id !== id; });
      next.records = next.records.filter(function (row) { return row.typeId !== id; });
    });
    (saved.types || []).forEach(function (row) {
      if (!validType(row)) return;
      var replaced = false;
      next.types = next.types.map(function (item) {
        if (item.id !== row.id) return item;
        replaced = true;
        return row;
      });
      if (!replaced) next.types.push(row);
    });
    (saved.records || []).forEach(function (row) {
      if (!validRecord(row)) return;
      var replaced = false;
      next.records = next.records.map(function (item) {
        if (item.id !== row.id) return item;
        replaced = true;
        return row;
      });
      if (!replaced) next.records.push(row);
    });
    (saved.imports || []).forEach(function (row) {
      if (!row || HOTELS.indexOf(row.hotel) < 0 || row.status !== "awaiting_import") return;
      if (!(next.imports || []).some(function (item) { return item.id === row.id; })) next.imports.push(row);
    });
    return syncRequirements(next);
  }
  function userOverlay(model, base) {
    var types = [];
    var records = [];
    (model.types || []).forEach(function (row) {
      var orig = typeById(base, row.id);
      if (!orig || JSON.stringify(orig) !== JSON.stringify(row)) types.push(row);
    });
    (model.records || []).forEach(function (row) {
      var orig = recordById(base, row.id);
      if (!orig || JSON.stringify(orig) !== JSON.stringify(row)) records.push(row);
    });
    var removed = (base.types || []).filter(function (row) {
      return !(model.types || []).some(function (item) { return item.id === row.id; });
    }).map(function (row) { return row.id; });
    return { v: 1, types: types, records: records, removedTypeIds: removed, imports: model.imports || [] };
  }
  function statusLabel(status, lang) {
    var map = {
      not_started: ["Not started", "Sin empezar"],
      done: ["Done", "Hecho"],
      expired: ["Expired", "Vencido"],
      due_soon: ["Due soon", "Por vencer"]
    };
    var pair = map[status] || ["", ""];
    return tx(lang, pair[0], pair[1]);
  }
  function kindLabel(kind, lang) {
    return kind === "online" ? tx(lang, "Online", "En línea") : tx(lang, "In person", "Presencial");
  }
  function sourceLabel(source, lang) {
    return source === "brand_import" ? tx(lang, "Brand import", "Importación de marca") : tx(lang, "Manual", "Manual");
  }
  function sampleNote(lang) {
    return "<p class=\"tr-note\"><span class=\"ex\">" + esc(tx(lang, "EXAMPLE", "EJEMPLO")) + "</span> " +
      esc(tx(lang, "Sample associates and courses. Not real staff.", "Asociados y cursos de ejemplo. No es personal real.")) + "</p>";
  }
  function chips(hotel, hotels, tab, lang) {
    var hotelChips = hotels.length > 1 ? hotels.map(function (id) {
      return "<button type=\"button\" class=\"" + (hotel === id ? "on" : "") + "\" onclick=\"trHotel('" + id + "')\">" + esc(id) + "</button>";
    }).join("") : "";
    var tabs = "<button type=\"button\" class=\"" + (tab === "people" ? "on" : "") + "\" onclick=\"trTab('people')\">" + esc(tx(lang, "Associates", "Asociados")) + "</button>" +
      "<button type=\"button\" class=\"" + (tab === "requirements" ? "on" : "") + "\" onclick=\"trTab('requirements')\">" + esc(tx(lang, "Requirements", "Requisitos")) + "</button>";
    return "<div class=\"tr-chips\">" + hotelChips + tabs + "</div>";
  }
  function boardHtml(model, today, lang) {
    var cards = complianceBoard(model, today).map(function (row) {
      return "<button type=\"button\" class=\"tr-hotel\" onclick=\"trHotel('" + row.code + "')\"><b>" + esc(row.code) + "</b><small>" + esc(row.name) + "</small><span class=\"tr-pct\">" + row.pct + "%</span><small>" +
        esc(row.ok + " / " + row.required + " " + tx(lang, "current", "al día")) + "</small></button>";
    }).join("");
    return "<div class=\"tr-hotels\" id=\"trBoard\">" + cards + "</div>";
  }
  function peopleHtml(model, hotel, today, lang) {
    var summary = compliance(model, hotel, today);
    var head = "<p class=\"tr-pct\" id=\"trPct\">" + summary.pct + "%</p><p class=\"tr-note\">" +
      esc(summary.ok + " / " + summary.required + " " + tx(lang, "required courses are current. Due soon still counts until the expiration date.", "cursos requeridos están al día. Por vencer cuenta hasta la fecha de vencimiento.")) + "</p>";
    var list = people(model, hotel, today).map(function (row) {
      return "<button type=\"button\" class=\"tr-row\" onclick=\"trPerson('" + esc(row.person.id) + "')\"><span class=\"tr-top\"><b>" + esc(row.person.name) + "</b> <span class=\"tr-badge tr-st-" + row.worst + "\">" +
        esc(statusLabel(row.worst, lang)) + "</span></span><small>" + esc(row.person.role) + " · " + row.ok + "/" + row.required + "</small></button>";
    }).join("");
    return head + "<div id=\"trPeople\">" + list + "</div>";
  }
  function personHtml(model, personId, actor, today, lang) {
    var person = null;
    (model.staff || []).forEach(function (row) { if (row.id === personId) person = row; });
    if (!person) return "";
    var edit = canEdit(actor, person.hotel);
    var rows = personRows(model, personId, today).map(function (item) {
      var type = item.type || { nameEn: "", nameEs: "", kind: "in_person", brand: "" };
      var rec = item.record;
      var title = tx(lang, type.nameEn, type.nameEs || type.nameEn);
      var dates = "<small>" + esc(tx(lang, "Completed", "Completado")) + " " + esc(rec.completedOn || "—") +
        " · " + esc(tx(lang, "Expires", "Vence")) + " " + esc(rec.expiresOn || "—") + "</small>";
      var sign = rec.signedOffName ? "<small>" + esc(tx(lang, "Sign-off", "Firma")) + ": " + esc(rec.signedOffName) + "</small>" : "";
      var cert = "<small>" + esc(tx(lang, "Certificate", "Certificado")) + ": " + esc(rec.certificateName || tx(lang, "None", "Ninguno")) + "</small>";
      var form = "";
      if (edit) {
        form = "<div class=\"tr-form\"><label>" + esc(tx(lang, "Completed date", "Fecha de término")) + "</label><input id=\"tr-date-" + esc(rec.id) + "\" type=\"date\" value=\"" + esc(rec.completedOn || today) + "\">" +
          "<label>" + esc(tx(lang, "Expiration date", "Fecha de vencimiento")) + "</label><input id=\"tr-exp-" + esc(rec.id) + "\" type=\"date\" value=\"" + esc(rec.expiresOn || "") + "\">" +
          "<label>" + esc(tx(lang, "Certificate photo", "Foto del certificado")) + "</label><input id=\"tr-file-" + esc(rec.id) + "\" type=\"file\" accept=\"image/*\" onchange=\"trFile('" + esc(rec.id) + "', this)\">" +
          "<p class=\"tr-file\" id=\"tr-file-name-" + esc(rec.id) + "\"></p>" +
          "<p class=\"tr-note\">" + esc(tx(lang, "Sign-off", "Firma")) + ": " + esc(actor.name || "") + "</p>" +
          "<button type=\"button\" class=\"btn\" onclick=\"trDone('" + esc(rec.id) + "')\">" + esc(tx(lang, "Mark complete", "Marcar hecho")) + "</button></div>";
      }
      return "<article class=\"tr-card\" id=\"" + esc(rec.id) + "\"><span class=\"tr-top\"><b>" + esc(title) + "</b> <span class=\"tr-badge tr-st-" + item.status + "\">" + esc(statusLabel(item.status, lang)) + "</span></span>" +
        "<small>" + esc(kindLabel(type.kind, lang)) + (type.brand ? " · " + esc(type.brand.toUpperCase()) : "") + " · " + esc(sourceLabel(rec.source, lang)) + "</small>" +
        dates + sign + cert + form + "</article>";
    }).join("");
    return "<button type=\"button\" class=\"tr-back\" onclick=\"trBack()\">‹ " + esc(tx(lang, "Associates", "Asociados")) + "</button><h3>" + esc(person.name) + "</h3><p class=\"tr-note\">" + esc(person.role) + "</p>" + rows;
  }
  function requirementsHtml(model, hotel, actor, lang) {
    var edit = canEdit(actor, hotel);
    var cards = (model.types || []).filter(function (row) { return row.hotel === hotel; }).map(function (type) {
      var checks = positionsAt(hotel).map(function (pos) {
        var on = type.positions.indexOf(pos) >= 0 ? " checked" : "";
        var disabled = edit ? "" : " disabled";
        return "<label><input type=\"checkbox\"" + on + disabled + " onchange=\"trPos('" + esc(type.id) + "', '" + esc(pos) + "', this.checked)\"> " + esc(pos) + "</label>";
      }).join("");
      var days = type.validityDays == null ? "" : String(type.validityDays);
      return "<article class=\"tr-card\"><label>" + esc(tx(lang, "Name", "Nombre")) + "</label><input id=\"tr-en-" + esc(type.id) + "\" value=\"" + esc(type.nameEn) + "\"" + (edit ? "" : " disabled") + ">" +
        "<label>" + esc(tx(lang, "Spanish name", "Nombre en español")) + "</label><input id=\"tr-es-" + esc(type.id) + "\" value=\"" + esc(type.nameEs) + "\"" + (edit ? "" : " disabled") + ">" +
        "<label>" + esc(tx(lang, "Kind", "Tipo")) + "</label><select id=\"tr-kind-" + esc(type.id) + "\"" + (edit ? "" : " disabled") + "><option value=\"in_person\"" + (type.kind === "in_person" ? " selected" : "") + ">" + esc(tx(lang, "In person", "Presencial")) + "</option><option value=\"online\"" + (type.kind === "online" ? " selected" : "") + ">" + esc(tx(lang, "Online", "En línea")) + "</option></select>" +
        "<label>" + esc(tx(lang, "Brand", "Marca")) + "</label><select id=\"tr-brand-" + esc(type.id) + "\"" + (edit ? "" : " disabled") + "><option value=\"\">" + esc(tx(lang, "None", "Ninguna")) + "</option><option value=\"ihg\"" + (type.brand === "ihg" ? " selected" : "") + ">IHG</option><option value=\"marriott\"" + (type.brand === "marriott" ? " selected" : "") + ">Marriott</option><option value=\"hilton\"" + (type.brand === "hilton" ? " selected" : "") + ">Hilton</option></select>" +
        "<label>" + esc(tx(lang, "Valid for days", "Vigencia en días")) + "</label><input id=\"tr-days-" + esc(type.id) + "\" type=\"number\" min=\"1\" max=\"3650\" value=\"" + esc(days) + "\"" + (edit ? "" : " disabled") + ">" +
        "<div class=\"tr-checks\">" + checks + "</div>" +
        (edit ? "<button type=\"button\" class=\"btn\" onclick=\"trSave('" + esc(type.id) + "')\">" + esc(tx(lang, "Save training", "Guardar curso")) + "</button>" : "") +
        "</article>";
    }).join("");
    var adder = edit ? "<article class=\"tr-card\" id=\"trAdd\"><h3>" + esc(tx(lang, "Add a training", "Agregar un curso")) + "</h3>" +
      "<label>" + esc(tx(lang, "Name", "Nombre")) + "</label><input id=\"tr-new-en\">" +
      "<label>" + esc(tx(lang, "Spanish name", "Nombre en español")) + "</label><input id=\"tr-new-es\">" +
      "<label>" + esc(tx(lang, "Kind", "Tipo")) + "</label><select id=\"tr-new-kind\"><option value=\"in_person\">" + esc(tx(lang, "In person", "Presencial")) + "</option><option value=\"online\">" + esc(tx(lang, "Online", "En línea")) + "</option></select>" +
      "<label>" + esc(tx(lang, "Brand", "Marca")) + "</label><select id=\"tr-new-brand\"><option value=\"\">" + esc(tx(lang, "None", "Ninguna")) + "</option><option value=\"ihg\">IHG</option><option value=\"marriott\">Marriott</option><option value=\"hilton\">Hilton</option></select>" +
      "<label>" + esc(tx(lang, "Valid for days", "Vigencia en días")) + "</label><input id=\"tr-new-days\" type=\"number\" min=\"1\" max=\"3650\">" +
      "<button type=\"button\" class=\"btn\" onclick=\"trAdd()\">" + esc(tx(lang, "Add training", "Agregar curso")) + "</button></article>" : "";
    return "<div id=\"trReqs\">" + cards + adder + "</div>";
  }
  function pageHtml(model, actor, view) {
    view = view || {};
    var lang = view.lang === "es" ? "es" : "en";
    var hotels = hotelsFor(actor.role, actor.hotel);
    if (!hotels.length) return "<div class=\"tr\" id=\"trRoot\"></div>";
    var hotel = view.hotel && hotels.indexOf(view.hotel) >= 0 ? view.hotel : hotels[0];
    var today = view.today || todayOf(new Date());
    var tab = view.tab === "requirements" ? "requirements" : "people";
    var waiting = (model.imports || []).some(function (row) { return row.hotel === hotel && row.status === "awaiting_import"; });
    var feed = "<p class=\"tr-note\" id=\"trFeed\">" + esc(waiting
      ? tx(lang, "Brand import is waiting. Completions stay manual until the brand file arrives. The file itself is not stored.", "La importación de marca está en espera. Los cursos se marcan a mano hasta que llegue el archivo. El archivo no se guarda.")
      : (demoUi()
        ? tx(lang, "Brand feed is not connected. This is not an all-clear.", "La marca no está conectada. Esto no es un todo en orden.")
        : tx(lang, "No brand file is waiting.", "No hay archivo de marca en espera."))) + "</p>" +
      (canEdit(actor, hotel) ? "<button type=\"button\" class=\"btn2\" onclick=\"trImport()\">" + esc(tx(lang, "Check brand import", "Revisar importación")) + "</button>" : "");
    var body = view.personId ? personHtml(model, view.personId, actor, today, lang) : (tab === "requirements" ? requirementsHtml(model, hotel, actor, lang) : peopleHtml(model, hotel, today, lang));
    var board = !view.personId && hotels.length > 1 && tab === "people" ? boardHtml(model, today, lang) : "";
    return "<div class=\"tr\" id=\"trRoot\"><h2>" + esc(tx(lang, "Training", "Capacitación")) + "</h2>" + sampleNote(lang) +
      "<p class=\"tr-note\">" + esc(NAMES[hotel] || hotel) + "</p>" + chips(hotel, hotels, view.personId ? "people" : tab, lang) + board + feed + body + "</div>";
  }

  var api = {
    HOTELS: HOTELS, NAMES: NAMES, POSITIONS: POSITIONS, STAFF: STAFF, BRAND: BRAND,
    normRole: normRole, canSee: canSee, hotelsFor: hotelsFor, canEdit: canEdit, demoUi: demoUi,
    positionsAt: positionsAt, todayOf: todayOf, addDays: addDays, buildDemo: buildDemo,
    statusOf: statusOf, attentionOf: attentionOf, compliance: compliance, complianceBoard: complianceBoard,
    people: people, personRows: personRows, saveType: saveType, setPositions: setPositions, addType: addType,
    markComplete: markComplete, ingestBrand: ingestBrand, reminderPlan: reminderPlan,
    applySaved: applySaved, userOverlay: userOverlay, pageHtml: pageHtml, statusLabel: statusLabel,
    cleanFile: cleanFile
  };
  root.Training = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined" || !demoUi()) return;

  var files = {};
  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function actorNow() {
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      if (!me) return { role: "", hotel: "", name: "" };
      return { role: me.role, hotel: me.hotel || "", name: me.name || "" };
    } catch (e) { return { role: "", hotel: "", name: "" }; }
  }
  function readSaved() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!data || data.v !== 1) return null;
      return data;
    } catch (e) { return null; }
  }
  function baseNow() { return buildDemo(new Date().toISOString()); }
  function bundle() { return applySaved(baseNow(), readSaved()); }
  function remember(model) {
    try { localStorage.setItem(KEY, JSON.stringify(userOverlay(model, baseNow()))); } catch (e) {}
  }
  function viewNow() {
    var actor = actorNow();
    var hotels = hotelsFor(actor.role, actor.hotel);
    var hotel = "";
    var tab = "people";
    var personId = "";
    try { hotel = S.trHotel || ""; tab = S.trTab || "people"; personId = S.trPerson || ""; } catch (e) {}
    if (hotels.indexOf(hotel) < 0) hotel = hotels[0] || "";
    if (personId && !safePerson(personId)) personId = "";
    return { hotel: hotel, tab: tab, personId: personId, lang: langNow(), today: todayOf(new Date()) };
  }
  function bootPage() {
    var actor = actorNow();
    if (!hotelsFor(actor.role, actor.hotel).length) return "<div class=\"tr\" id=\"trRoot\"></div>";
    return pageHtml(bundle(), actor, viewNow());
  }
  function syncReminders() {
    if (!root.HHQNotify || !HHQNotify.post || typeof S === "undefined") return;
    var plan = reminderPlan(bundle(), actorNow(), todayOf(new Date()));
    var keep = {};
    plan.forEach(function (row) { keep[row.kind] = row; });
    S.reminders = (S.reminders || []).filter(function (row) {
      if (!row || String(row.kind).indexOf("compliance_tr_") !== 0) return true;
      return !!keep[row.kind];
    });
    plan.forEach(function (row) {
      if ((S.reminders || []).some(function (item) { return item.kind === row.kind && !item.read_at; })) return;
      HHQNotify.post({ hotel: row.hotel, channel: "in_app", role: row.role, kind: row.kind, title: row.title, body: row.body });
    });
  }
  root.trHotel = function (hotel) {
    if (HOTELS.indexOf(hotel) < 0 || hotelsFor(actorNow().role, actorNow().hotel).indexOf(hotel) < 0) return;
    try { S.trHotel = hotel; S.trPerson = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.trTab = function (tab) {
    try { S.trTab = tab === "requirements" ? "requirements" : "people"; S.trPerson = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.trPerson = function (id) {
    if (!safePerson(id)) return;
    var model = bundle();
    var person = null;
    (model.staff || []).forEach(function (row) { if (row.id === id) person = row; });
    if (!person || hotelsFor(actorNow().role, actorNow().hotel).indexOf(person.hotel) < 0) return;
    try { S.trPerson = id; S.trHotel = person.hotel; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.trBack = function () {
    try { S.trPerson = ""; } catch (e) {}
    if (typeof render === "function") render();
  };
  root.trFile = function (id, input) {
    if (!safeRecord(id) || !input || !input.files || !input.files[0]) return;
    files[id] = cleanFile(input.files[0].name);
    var node = document.getElementById("tr-file-name-" + id);
    if (node) node.textContent = files[id];
  };
  root.trDone = function (id) {
    if (!safeRecord(id)) return;
    var date = document.getElementById("tr-date-" + id);
    var exp = document.getElementById("tr-exp-" + id);
    var result = markComplete(bundle(), id, {
      date: date ? date.value : "",
      expiresOn: exp ? exp.value : "",
      certificateName: files[id] || ""
    }, actorNow(), new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    syncReminders();
    if (typeof render === "function") render();
  };
  root.trPos = function (id, pos, on) {
    if (!safeType(id) || !knownPosition(pos)) return;
    var model = bundle();
    var type = typeById(model, id);
    if (!type) return;
    var positions = type.positions.slice();
    var at = positions.indexOf(pos);
    if (on && at < 0) positions.push(pos);
    if (!on && at >= 0) positions.splice(at, 1);
    var result = setPositions(model, id, positions, actorNow());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  root.trSave = function (id) {
    if (!safeType(id)) return;
    var days = document.getElementById("tr-days-" + id);
    var result = saveType(bundle(), id, {
      nameEn: (document.getElementById("tr-en-" + id) || {}).value,
      nameEs: (document.getElementById("tr-es-" + id) || {}).value,
      kind: (document.getElementById("tr-kind-" + id) || {}).value,
      brand: (document.getElementById("tr-brand-" + id) || {}).value,
      validityDays: days ? days.value : ""
    }, actorNow());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  root.trAdd = function () {
    var hotel = viewNow().hotel;
    var days = document.getElementById("tr-new-days");
    var result = addType(bundle(), {
      hotel: hotel,
      nameEn: (document.getElementById("tr-new-en") || {}).value,
      nameEs: (document.getElementById("tr-new-es") || {}).value,
      kind: (document.getElementById("tr-new-kind") || {}).value || "in_person",
      brand: (document.getElementById("tr-new-brand") || {}).value || "",
      validityDays: days ? days.value : "",
      positions: []
    }, actorNow());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  root.trImport = function () {
    var result = ingestBrand(bundle(), viewNow().hotel, actorNow(), new Date().toISOString());
    if (!result.ok) return;
    remember(result.model);
    if (typeof render === "function") render();
  };
  function featureOn(hotel) {
    try { if (root.HotelFeatures && root.HotelFeatures.on) return root.HotelFeatures.on(hotel, "training") !== false; } catch (e) {}
    return true;
  }
  if (typeof M !== "undefined") M.train = ["🎓", "Training"];
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Training = "Capacitación";
  if (typeof V !== "undefined") V.train = bootPage;
  if (typeof tilesFor === "function") {
    var prevTiles = tilesFor;
    root.tilesFor = function (role) {
      var list = (prevTiles(role) || []).slice();
      var actor = actorNow();
      var hotel = "";
      try { hotel = S.hotel || actor.hotel || ""; } catch (e) { hotel = actor.hotel || ""; }
      var show = demoUi() && hotelsFor(actor.role || role, actor.hotel || hotel).length > 0 && featureOn(hotel || actor.hotel);
      if (show && list.indexOf("train") < 0) list.splice(Math.min(2, list.length), 0, "train");
      if (!show) list = list.filter(function (id) { return id !== "train"; });
      if (root.HHQMenus && root.HHQMenus.menuAllows && !root.HHQMenus.menuAllows("train", actor.role || role, hotel, function (h, feature) {
        return feature === "training" ? featureOn(h) : true;
      })) list = list.filter(function (id) { return id !== "train"; });
      return list;
    };
  }
  try { if (typeof RSEC !== "undefined" && RSEC[4] && RSEC[4][2].indexOf("train") < 0) RSEC[4][2].push("train"); } catch (e) {}
  try { if (typeof NOCOLS !== "undefined" && NOCOLS.indexOf("train") < 0) NOCOLS.push("train"); } catch (e2) {}
  (function (spec) {
    if (root.HotelFeatures && root.HotelFeatures.register) root.HotelFeatures.register(spec);
    else (root.HF_QUEUE = root.HF_QUEUE || []).push(spec);
  })({ id: "training", en: "Training", es: "Capacitación", order: 27 });
  syncReminders();

  var style = document.createElement("style");
  style.textContent = [
    ".tr-note{font-size:13px;color:#3c4658;margin:6px 0}",
    ".tr-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}",
    ".tr-chips button{flex:0 0 auto;background:#e6ebf2;color:#14365d;font-weight:700;font-size:13px;min-height:44px}",
    ".tr-chips button.on{background:#14365d;color:#fff}",
    ".tr-hotels{display:grid;grid-template-columns:1fr;gap:8px;margin:8px 0}",
    ".tr-hotel{display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;text-align:left;min-height:112px}",
    ".tr-hotel small{color:#55606f;font-weight:700}",
    ".tr-pct{font-size:32px;line-height:1;font-weight:800;margin:4px 0}",
    ".tr-row{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:#fff;border:0;border-top:1px solid #e6ebf2;border-radius:0;padding:12px 0;min-height:64px}",
    ".tr-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center}",
    ".tr-badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800}",
    ".tr-st-done{background:#d4f5dc;color:#15642f}",
    ".tr-st-due_soon{background:#fff3cd;color:#8a5a00}",
    ".tr-st-expired{background:#fde2e1;color:#8f1d1d}",
    ".tr-st-not_started{background:#e6ebf2;color:#3c4658}",
    ".tr-card{background:#fff;border:1px solid #e6ebf2;border-radius:12px;padding:12px;margin:8px 0}",
    ".tr-card small,.tr-row small{display:block;color:#3c4658;margin-top:4px}",
    ".tr-form label,.tr-card label{display:block;font-size:13px;font-weight:700;margin:8px 0 4px}",
    ".tr-form input,.tr-form select,.tr-card input,.tr-card select{width:100%;min-height:44px;font-size:16px}",
    ".tr-checks{display:flex;flex-direction:column;gap:2px;margin:8px 0}",
    ".tr-checks label{display:flex;align-items:center;gap:8px;min-height:44px;font-weight:650}",
    ".tr-checks input{width:22px;height:22px;min-height:0}",
    ".tr-back{display:inline-flex;align-items:center;background:#eef3fa;border:0;border-radius:10px;min-height:44px;font-weight:800;padding:0 12px}",
    ".tr .btn,.tr .btn2{min-height:44px;margin-top:8px}",
    "@media(min-width:768px){.tr-hotels{grid-template-columns:repeat(3,minmax(0,1fr))}}"
  ].join("");
  document.head.appendChild(style);
})(typeof window !== "undefined" ? window : globalThis);
