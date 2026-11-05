const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const tr = require("../training.js");
const menus = require("../feature-menus.js");

const NOW = "2026-11-05T16:00:00.000Z";
const TODAY = "2026-11-05";
const gm = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPAM", name: "Sam Patel" };
const corp = { role: "Above Property", hotel: null, name: "Alex Rivera" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };

function record(model, person, type) {
  return model.records.find((row) => row.associateId === person && row.typeId === type);
}

test("leaders see their hotels and other roles see none", () => {
  assert.equal(tr.todayOf(NOW), TODAY);
  assert.deepEqual(tr.hotelsFor("GM", "MSPWE"), ["MSPWE"]);
  assert.deepEqual(tr.hotelsFor("AGM", "MSPAM"), ["MSPAM"]);
  assert.deepEqual(tr.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(tr.hotelsFor("Front Desk", "MSPWE"), []);
  assert.deepEqual(tr.hotelsFor("Laundry Attendant", "MSPWE"), []);
  assert.equal(tr.canEdit(gm, "MSPWE"), true);
  assert.equal(tr.canEdit(gm, "MSPAM"), false);
  assert.equal(tr.canEdit(agm, "MSPAM"), true);
  assert.equal(tr.canEdit(corp, "MSPMS"), true);
  assert.equal(tr.canEdit(desk, "MSPWE"), false);
  assert.equal(menus.menuAllows("train", "GM", "MSPWE"), true);
  assert.equal(menus.menuAllows("train", "AGM", "MSPAM"), true);
  assert.equal(menus.menuAllows("train", "Above Property", "MSPMS"), true);
  assert.equal(menus.menuAllows("train", "Front Desk", "MSPWE"), false);
  assert.equal(menus.menuAllows("train", "Housekeeper", "MSPWE"), false);
  assert.equal(menus.menuAllows("train", "GM", "MSPWE", function (_h, feature) { return feature !== "training"; }), false);
  assert.equal(tr.positionsAt("MSPWE").includes("Bartender"), false);
  assert.equal(tr.positionsAt("MSPWE").includes("Shuttle Driver"), false);
  assert.equal(tr.positionsAt("MSPMS").includes("Bartender"), true);
});

test("required courses follow the position, including brand classes and ServSafe", () => {
  const model = tr.buildDemo(NOW);
  const food = model.types.find((row) => row.id === "tr-mspwe-food");
  assert.deepEqual(food.positions, ["Breakfast Attendant"]);
  assert.equal(food.kind, "in_person");
  const ihg = model.types.find((row) => row.id === "tr-mspwe-ihg");
  assert.equal(ihg.kind, "online");
  assert.equal(ihg.brand, "ihg");
  assert.equal(model.types.some((row) => row.hotel === "MSPAM" && row.brand === "hilton"), true);
  assert.equal(model.types.some((row) => row.hotel === "MSPMS" && row.brand === "marriott"), true);
  const alcohol = model.types.find((row) => row.id === "tr-mspms-alcohol");
  assert.deepEqual(alcohol.positions, ["Bartender"]);
  assert.equal(model.types.some((row) => row.hotel !== "MSPMS" && row.id.endsWith("-alcohol")), false);
  const joy = record(model, "mspwe-ba", "tr-mspwe-food");
  assert.equal(tr.statusOf(joy, TODAY), "due_soon");
  assert.equal(joy.certificateName, "sample-food-card.jpg");
  assert.equal(joy.source, "manual");
  assert.equal(tr.statusOf(record(model, "mspwe-ba", "tr-mspwe-hands"), TODAY), "not_started");
  const jordan = record(model, "mspwe-fd", "tr-mspwe-cpr");
  assert.equal(tr.statusOf(jordan, TODAY), "expired");
  const imported = record(model, "mspwe-fd", "tr-mspwe-ihg");
  assert.equal(imported.source, "brand_import");
  assert.equal(tr.statusOf(imported, TODAY), "done");
  assert.equal(tr.statusOf(record(model, "mspms-bar", "tr-mspms-alcohol"), TODAY), "due_soon");
  assert.equal(model.records.some((row) => row.associateId === "mspwe-ba" && row.typeId === "tr-mspwe-ihg"), false);
  model.imports.forEach((row) => assert.equal(row.status, "awaiting_import"));
  assert.equal(JSON.stringify(model).includes("@"), false);
});

test("compliance is per hotel and a hotel page does not show another hotel", () => {
  const model = tr.buildDemo(NOW);
  const board = tr.complianceBoard(model, TODAY);
  assert.deepEqual(board.map((row) => row.code), ["MSPWE", "MSPAM", "MSPMS"]);
  board.forEach((row) => {
    assert.ok(row.pct > 0 && row.pct < 100, row.code + " " + row.pct);
    assert.equal(row.ok <= row.required, true);
  });
  assert.notEqual(board[0].pct, board[1].pct);
  const attn = tr.attentionOf(model, "MSPWE", TODAY);
  assert.equal(attn.expired, 2);
  assert.equal(attn.dueSoon, 3);
  assert.equal(tr.attentionOf(model, "NOPE", TODAY), null);
  const page = tr.pageHtml(model, gm, { hotel: "MSPWE", lang: "en", today: TODAY });
  assert.match(page, /id="trPeople"/);
  assert.match(page, /Joy Adams/);
  assert.match(page, /Due soon/);
  assert.match(page, /Brand import/);
  assert.equal(page.includes("Nora Blake"), false);
  assert.equal(page.includes("Kim Nguyen"), false);
  const es = tr.pageHtml(model, gm, { hotel: "MSPWE", lang: "es", today: TODAY, tab: "requirements" });
  assert.match(es, /Capacitación/);
  assert.match(es, /Requisitos/);
  assert.match(es, /Seguridad alimentaria/);
  assert.match(es, /id="trReqs"/);
  const corpPage = tr.pageHtml(model, corp, { hotel: "MSPWE", lang: "en", today: TODAY });
  assert.match(corpPage, /id="trBoard"/);
  assert.match(corpPage, /Golden Valley/);
  assert.match(corpPage, /Hampton/);
  assert.match(corpPage, /SpringHill/);
  assert.equal(tr.pageHtml(model, desk, { lang: "en", today: TODAY }).includes("Joy Adams"), false);
});

test("managers edit requirements and mark a course complete with a sign-off", () => {
  const model = tr.buildDemo(NOW);
  const blocked = tr.setPositions(model, "tr-mspwe-cpr", ["Housekeeper"], desk);
  assert.equal(blocked.ok, false);
  const added = tr.setPositions(model, "tr-mspwe-cpr", ["Front Desk", "Maintenance", "Housekeeping", "Housekeeper"], gm);
  assert.equal(added.ok, true);
  assert.equal(model.records.some((row) => row.associateId === "mspwe-hkr" && row.typeId === "tr-mspwe-cpr"), true);
  const otherHotel = tr.setPositions(model, "tr-mspam-cpr", ["Front Desk"], gm);
  assert.equal(otherHotel.ok, false);
  const renamed = tr.saveType(model, "tr-mspwe-food", {
    nameEn: "Food safety refresher", nameEs: "Repaso de alimentos", kind: "in_person", brand: "", validityDays: 365
  }, agm);
  assert.equal(renamed.ok, false);
  assert.equal(tr.saveType(model, "tr-mspwe-food", {
    nameEn: "Food safety refresher", nameEs: "Repaso de alimentos", kind: "in_person", brand: "", validityDays: 365
  }, gm).ok, true);
  const created = tr.addType(model, {
    hotel: "MSPWE", nameEn: "Pool chemical class", nameEs: "Clase de químicos", kind: "in_person", brand: "", validityDays: 180, positions: ["Maintenance"]
  }, gm);
  assert.equal(created.ok, true);
  assert.equal(model.types.some((row) => row.id === created.id), true);
  assert.equal(tr.addType(model, { hotel: "MSPWE", nameEn: "x", kind: "in_person", brand: "" }, gm).ok, false);
  const joy = record(model, "mspwe-ba", "tr-mspwe-food");
  const done = tr.markComplete(model, joy.id, { date: "2026-11-05", expiresOn: "2027-11-05", certificateName: "../secret.jpg" }, gm, NOW);
  assert.equal(done.ok, true);
  assert.equal(joy.signedOffName, "Avery Cole");
  assert.equal(joy.certificateName, "secret.jpg");
  assert.equal(tr.statusOf(joy, TODAY), "done");
  assert.equal(joy.source, "manual");
  assert.equal(tr.markComplete(model, joy.id, { date: "2026-11-06" }, gm, NOW).ok, false);
  assert.equal(tr.markComplete(model, joy.id, { date: "2026-11-05" }, desk, NOW).ok, false);
  const imported = record(model, "mspwe-fd", "tr-mspwe-ihg");
  tr.markComplete(model, imported.id, { date: "2026-11-01" }, gm, NOW);
  assert.equal(imported.source, "brand_import");
});

test("brand import stays waiting and does not invent completions", () => {
  const model = tr.buildDemo(NOW);
  const before = model.records.length;
  const result = tr.ingestBrand(model, "MSPWE", gm, NOW);
  assert.equal(result.ok, true);
  assert.equal(result.status, "awaiting_import");
  assert.equal(model.records.length, before);
  assert.equal(JSON.stringify(model.imports).includes("file body"), false);
  assert.equal(tr.ingestBrand(model, "MSPAM", gm, NOW).ok, false);
  assert.equal(tr.ingestBrand(model, "MSPMS", corp, NOW).status, "awaiting_import");
  const kept = tr.applySaved(tr.buildDemo(NOW), tr.userOverlay(model, tr.buildDemo(NOW)));
  assert.equal(kept.records.length, before);
  const plan = tr.reminderPlan(model, gm, TODAY);
  assert.ok(plan.length > 0);
  plan.forEach((row) => {
    assert.equal(row.hotel, "MSPWE");
    assert.match(row.kind, /^compliance_tr_/);
  });
  assert.equal(tr.reminderPlan(model, desk, TODAY).length, 0);
  assert.ok(tr.reminderPlan(model, corp, TODAY).some((row) => row.hotel === "MSPMS"));
});

test("live mode stays off and the shell loads the screen", () => {
  assert.equal(tr.demoUi({ mode: "live" }), false);
  assert.equal(tr.demoUi({ mode: "demo" }), true);
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const src = fs.readFileSync(path.join(root, "training.js"), "utf8");
  assert.match(html, /src="training\.js"/);
  assert.ok(html.indexOf('src="training.js"') < html.indexOf('src="glance-home.js"'));
  assert.match(sw, /\.\/training\.js/);
  assert.match(src, /!\s*demoUi\(\)/);
  assert.equal(src.includes("supabaseKey"), false);
  assert.equal(src.includes("sb.from"), false);
});
