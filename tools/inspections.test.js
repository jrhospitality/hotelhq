const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ix = require("../inspections.js");
const menus = require("../feature-menus.js");

const NOW = "2026-11-05T16:00:00.000Z";
const TODAY = "2026-11-05";
const gm = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const mei = { role: "Laundry Attendant", hotel: "MSPWE", name: "Mei Chen" };
const luis = { role: "Maintenance", hotel: "MSPWE", name: "Luis Ortega" };
const jordan = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const dev = { role: "Maintenance", hotel: "MSPAM", name: "Dev Clark" };

test("GM and corporate manage inspections and AGM does not", () => {
  assert.deepEqual(ix.hotelsFor("GM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(ix.hotelsFor("AGM", "MSPWE"), []);
  assert.deepEqual(ix.hotelsFor("Above Property", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(ix.hotelsFor("Front Desk", "MSPWE"), []);
  assert.equal(ix.manages(gm, "MSPAM"), false);
  assert.equal(ix.manages(corp, "MSPMS"), true);
  assert.equal(ix.manages(agm, "MSPWE"), false);
  assert.equal(menus.menuAllows("inspx", "GM", "MSPWE"), true);
  assert.equal(menus.menuAllows("inspx", "Above Property", "MSPAM"), true);
  assert.equal(menus.menuAllows("inspx", "AGM", "MSPWE"), false);
  assert.equal(menus.menuAllows("inspx", "Laundry Attendant", "MSPWE"), false);
  assert.equal(menus.menuAllows("ifix", "AGM", "MSPWE"), true);
  assert.equal(menus.menuAllows("ifix", "Laundry Attendant", "MSPWE"), true);
  assert.equal(menus.menuAllows("ifix", "GM", "MSPWE"), false);
  assert.equal(menus.menuAllows("ifix", "Above Property", "MSPWE"), false);
  assert.equal(menus.menuAllows("inspx", "GM", "MSPWE", function (_h, feature) { return feature !== "inspections"; }), false);
});

test("sample reports flag overdue items and upcoming visits", () => {
  const model = ix.buildDemo(NOW);
  assert.equal(model.inspections.every((row) => row.notes.indexOf("Sample report.") === 0), true);
  assert.equal(model.actions.every((row) => row.description.indexOf("Sample:") === 0), true);
  const we = ix.attentionOf(model, "MSPWE", TODAY);
  assert.deepEqual(we, { overdue: 1, open: 1, upcoming: 1 });
  assert.equal(ix.attentionOf(model, "MSPAM", TODAY).upcoming, 1);
  assert.deepEqual(ix.attentionOf(model, "MSPMS", TODAY), { overdue: 0, open: 0, upcoming: 0 });
  assert.equal(model.imports[0].status, "awaiting_parse");
  assert.equal(JSON.stringify(model).includes("application/pdf"), false);
  const board = ix.board(model, TODAY);
  assert.deepEqual(board.map((row) => row.code), ["MSPWE", "MSPAM", "MSPMS"]);
});

test("a named associate sees only that item and can mark it fixed", () => {
  const model = ix.buildDemo(NOW);
  assert.deepEqual(ix.myActions(model, mei).map((row) => row.id), ["ia-mspwe-exit"]);
  assert.equal(ix.myActions(model, jordan).length, 0);
  assert.equal(ix.myActions(model, agm).length, 0);
  assert.equal(ix.assignedTo(model.actions.find((row) => row.id === "ia-mspwe-exit"), dev), false);
  const roleOnly = {
    id: "ia-mspwe-role", hotel: "MSPWE", ownerName: "", ownerRole: "Maintenance",
    description: "Sample: role task.", dueOn: TODAY, status: "open"
  };
  assert.equal(ix.assignedTo(roleOnly, luis), true);
  assert.equal(ix.assignedTo(roleOnly, dev), false);
  assert.equal(ix.assignedTo(roleOnly, mei), false);
  const mine = ix.pageHtml(model, mei, { mode: "mine", lang: "en", today: TODAY });
  assert.match(mine, /My inspection items/);
  assert.match(mine, /exit sign by the laundry/);
  assert.match(mine, /Mark fixed/);
  assert.equal(mine.includes("Sample Fire Marshal"), false);
  assert.equal(mine.includes("Kim Nguyen"), false);
  assert.equal(mine.includes("extinguisher tag"), false);
  const es = ix.pageHtml(model, mei, { mode: "mine", lang: "es", today: TODAY });
  assert.match(es, /Mis pendientes de inspección/);
  assert.match(es, /Marcar corregido/);
  assert.equal(ix.completeAction(model, "ia-mspwe-exit", { date: TODAY, proofName: "C:\\proof shot.jpg" }, jordan, NOW).ok, false);
  const fixed = ix.completeAction(model, "ia-mspwe-exit", { date: TODAY, proofName: "proof shot.jpg" }, mei, NOW);
  assert.equal(fixed.ok, true);
  const row = model.actions.find((item) => item.id === "ia-mspwe-exit");
  assert.equal(row.status, "done");
  assert.equal(row.completedName, "Mei Chen");
  assert.equal(row.proofName, "proof shot.jpg");
  assert.equal(ix.actionState(row, TODAY), "done");
  assert.equal(ix.saveAction(model, {
    hotel: "MSPWE", inspectionId: "insp-mspwe-fire", description: "Sample: changed.", ownerName: "Mei Chen", ownerRole: "Laundry Attendant"
  }, mei).ok, false);
});

test("GM edits the report and actions, and the assistant stub does not invent items", () => {
  const model = ix.buildDemo(NOW);
  const page = ix.pageHtml(model, gm, { hotel: "MSPWE", inspectionId: "insp-mspwe-fire", lang: "en", today: TODAY });
  assert.match(page, /id="ixDetail"/);
  assert.match(page, /Sample Fire Marshal/);
  assert.match(page, /Action items/);
  assert.match(page, /exit sign by the laundry/);
  assert.match(page, /extinguisher tag/);
  assert.match(page, /stairwell door/);
  assert.equal(page.includes("Kim Nguyen"), false);
  assert.equal(ix.pageHtml(model, agm, { hotel: "MSPWE", lang: "en", today: TODAY }).includes("Sample Fire Marshal"), false);
  const corpPage = ix.pageHtml(model, corp, { lang: "en", today: TODAY });
  assert.match(corpPage, /id="ixBoard"/);
  assert.match(corpPage, /MSPWE/);
  assert.match(corpPage, /MSPAM/);
  assert.match(corpPage, /MSPMS/);
  const before = model.actions.length;
  const body = "raw pdf bytes should not be stored";
  const waiting = ix.ingest(model, { hotel: "MSPWE", kind: "fire", fileName: "visit.pdf", body: body }, gm, NOW);
  assert.equal(waiting.ok, true);
  assert.equal(waiting.status, "awaiting_parse");
  assert.equal(model.actions.length, before);
  assert.equal(JSON.stringify(model).includes(body), false);
  assert.equal(ix.ingest(model, { hotel: "MSPWE", kind: "fire", fileName: "x.pdf" }, agm, NOW).ok, false);
  const parsed = ix.ingest(model, {
    hotel: "MSPWE",
    kind: "health",
    fileName: "health.pdf",
    actions: [{ inspectionId: "insp-mspwe-health", description: "Sample: gasket.", ownerName: "Luis Ortega", ownerRole: "Maintenance", dueOn: "2026-11-20" }]
  }, gm, NOW);
  assert.equal(parsed.status, "parsed");
  const created = model.actions.find((row) => row.id === parsed.created[0]);
  assert.equal(created.source, "import");
  assert.equal(created.description, "Sample: gasket.");
  const added = ix.saveInspection(model, {
    hotel: "MSPWE", kind: "fire", date: TODAY, agency: "Sample County Fire", result: "pass", score: "0", nextDue: "2027-11-05", documentName: "county.pdf", notes: "Sample report. Added by the GM."
  }, gm);
  assert.equal(added.ok, true);
  assert.equal(ix.saveInspection(model, {
    hotel: "MSPAM", kind: "fire", date: TODAY, agency: "Sample County Fire", result: "pass", score: "0"
  }, gm).ok, false);
  const plan = ix.reminderPlan(model, mei, TODAY);
  assert.ok(plan.every((row) => row.hotel === "MSPWE"));
  assert.equal(plan.some((row) => row.kind.indexOf("compliance_ins_") === 0), false);
  assert.ok(ix.reminderPlan(model, gm, TODAY).some((row) => row.kind.indexOf("compliance_ins_") === 0));
  assert.equal(ix.reminderPlan(model, agm, TODAY).some((row) => row.kind.indexOf("compliance_ins_") === 0), false);
});

test("live mode stays off and the migration keeps AGM out of the report tables", () => {
  assert.equal(ix.demoUi({ mode: "live" }), false);
  assert.equal(ix.demoUi({ mode: "demo" }), true);
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261115_compliance.sql"), "utf8");
  assert.match(html, /src="inspections\.js"/);
  assert.match(sw, /\.\/inspections\.js/);
  assert.match(sql, /awaiting_parse/);
  assert.match(sql, /private\.docs_allowed/);
  assert.match(sql, /private\.my_role\(\) = 'gm'/);
  assert.match(sql, /complete_inspection_action/);
  assert.match(sql, /source in \('manual', 'import'\)/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.equal(sql.includes("sb_publishable_"), false);
});
