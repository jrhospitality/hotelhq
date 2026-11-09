const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const lc = require("../licenses.js");
const menus = require("../feature-menus.js");

const NOW = "2026-11-05T16:00:00.000Z";
const TODAY = "2026-11-05";
const gm = { role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const corp = { role: "JR Corporate", hotel: null, name: "Alex Rivera" };
const desk = { role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };

test("only GM and corporate can open licenses", () => {
  assert.deepEqual(lc.hotelsFor("GM", "MSPMS"), ["MSPMS"]);
  assert.deepEqual(lc.hotelsFor("AGM", "MSPWE"), []);
  assert.deepEqual(lc.hotelsFor("JR Corporate", null), ["MSPWE", "MSPAM", "MSPMS"]);
  assert.deepEqual(lc.hotelsFor("Maintenance", "MSPWE"), []);
  assert.equal(lc.manages(gm, "MSPAM"), false);
  assert.equal(lc.manages(corp, "MSPAM"), true);
  assert.equal(menus.menuAllows("permits", "GM", "MSPWE"), true);
  assert.equal(menus.menuAllows("permits", "Above Property", "MSPMS"), true);
  assert.equal(menus.menuAllows("permits", "AGM", "MSPWE"), false);
  assert.equal(menus.menuAllows("permits", "Front Desk", "MSPWE"), false);
  assert.equal(menus.menuAllows("permits", "GM", "MSPWE", function (_h, feature) { return feature !== "licenses"; }), false);
});

test("statuses land on the 90, 60, and 30 day marks", () => {
  const model = lc.buildDemo(NOW);
  const kinds = {};
  model.licenses.forEach((row) => {
    kinds[row.kind] = 1;
    assert.match(row.number, /^SAMPLE-/);
    assert.match(row.agency, /^Sample /);
    assert.match(row.documentName, /^sample-/);
  });
  lc.KINDS.forEach((kind) => assert.equal(kinds[kind.id], 1, kind.id));
  const we = lc.attentionOf(model, "MSPWE", TODAY);
  assert.equal(we.expired, 1);
  assert.equal(we.due30, 1);
  assert.equal(we.due60, 1);
  assert.equal(we.due90, 1);
  const alarm = model.licenses.find((row) => row.id === "lic-mspwe-fire_alarm");
  assert.equal(lc.statusOf(alarm, TODAY), "expired");
  const sprinkler = model.licenses.find((row) => row.id === "lic-mspwe-sprinkler");
  assert.equal(lc.statusOf(sprinkler, TODAY), "due_30");
  const food = model.licenses.find((row) => row.id === "lic-mspwe-food_health");
  assert.equal(lc.statusOf(food, TODAY), "due_60");
  const elevator = model.licenses.find((row) => row.id === "lic-mspwe-elevator");
  assert.equal(lc.statusOf(elevator, TODAY), "due_90");
  assert.equal(model.licenses.filter((row) => row.kind === "liquor").map((row) => row.hotel).join(), "MSPMS");
  assert.equal(model.licenses.filter((row) => row.kind === "pool").map((row) => row.hotel).join(), "MSPWE");
  assert.equal(lc.statusOf(model.licenses.find((row) => row.id === "lic-mspms-liquor"), TODAY), "due_30");
  assert.equal(lc.money(180), "$180.00");
});

test("each hotel list stays local and corporate sees all three", () => {
  const model = lc.buildDemo(NOW);
  const page = lc.pageHtml(model, gm, { hotel: "MSPWE", lang: "en", today: TODAY });
  assert.match(page, /id="lcList"/);
  assert.match(page, /Licenses and permits/);
  assert.match(page, /SAMPLE-MSPWE-POOL/);
  assert.match(page, /Avery Cole/);
  assert.match(page, /Expired/);
  assert.match(page, /Due in 30 days/);
  assert.equal(page.includes("SAMPLE-MSPMS"), false);
  assert.equal(page.includes("SAMPLE-MSPAM"), false);
  assert.equal(page.includes("id=\"lcBoard\""), false);
  const es = lc.pageHtml(model, gm, { hotel: "MSPWE", lang: "es", today: TODAY, licenseId: "lic-mspwe-pool" });
  assert.match(es, /Licencias y permisos/);
  assert.match(es, /Permiso de alberca/);
  assert.match(es, /Editar permiso/);
  assert.match(es, /Cuota de renovación/);
  const corpPage = lc.pageHtml(model, corp, { lang: "en", today: TODAY });
  assert.match(corpPage, /id="lcBoard"/);
  assert.match(corpPage, /MSPWE/);
  assert.match(corpPage, /MSPAM/);
  assert.match(corpPage, /MSPMS/);
  const spring = lc.pageHtml(model, corp, { hotel: "MSPMS", lang: "en", today: TODAY });
  assert.match(spring, /SAMPLE-MSPMS-LIQUOR/);
  assert.equal(spring.includes("SAMPLE-MSPWE-POOL"), false);
  assert.equal(lc.pageHtml(model, agm, { lang: "en", today: TODAY }).includes("SAMPLE-"), false);
  assert.equal(lc.pageHtml(model, desk, { lang: "en", today: TODAY }).includes("SAMPLE-"), false);
});

test("a GM can edit a permit and reminders use one window each", () => {
  const model = lc.buildDemo(NOW);
  const saved = lc.saveLicense(model, {
    id: "lic-mspwe-pool",
    hotel: "MSPWE",
    kind: "pool",
    agency: "Sample Health Department",
    number: "SAMPLE-MSPWE-POOL",
    issuedOn: "2025-01-01",
    expiresOn: "2027-06-01",
    renewalFee: 95,
    responsibleName: "Avery Cole",
    documentName: "pool-card.pdf"
  }, gm);
  assert.equal(saved.ok, true);
  const pool = model.licenses.find((row) => row.id === "lic-mspwe-pool");
  assert.equal(pool.renewalFee, 95);
  assert.equal(pool.documentName, "pool-card.pdf");
  assert.equal(lc.statusOf(pool, TODAY), "current");
  assert.equal(lc.saveLicense(model, {
    hotel: "MSPAM", kind: "pool", agency: "Sample Health Department", number: "SAMPLE-MSPAM-POOL",
    issuedOn: TODAY, expiresOn: "2027-01-01", renewalFee: 10, responsibleName: "Riley Brooks"
  }, gm).ok, false);
  assert.equal(lc.saveLicense(model, {
    hotel: "MSPWE", kind: "pool", agency: "Sample Health Department", number: "SAMPLE-MSPWE-POOL2",
    issuedOn: TODAY, expiresOn: "2027-01-01", renewalFee: 10, responsibleName: "Avery Cole"
  }, agm).ok, false);
  const added = lc.saveLicense(model, {
    hotel: "MSPWE", kind: "pool", agency: "Sample Health Department", number: "SAMPLE-MSPWE-POOL2",
    issuedOn: TODAY, expiresOn: "2026-11-20", renewalFee: 40, responsibleName: "Avery Cole"
  }, gm);
  assert.equal(added.ok, true);
  const plan = lc.reminderPlan(model, gm, TODAY);
  const windows = {};
  plan.forEach((row) => {
    assert.equal(row.hotel, "MSPWE");
    const match = row.title.en.match(/within (\d+) days|expired/);
    windows[row.ref] = match[0];
  });
  assert.equal(windows["lic-mspwe-fire_alarm"], "expired");
  assert.equal(windows["lic-mspwe-sprinkler"], "within 30 days");
  assert.equal(windows["lic-mspwe-food_health"], "within 60 days");
  assert.equal(windows["lic-mspwe-elevator"], "within 90 days");
  assert.equal(windows["lic-mspwe-pool"], undefined);
  assert.equal(lc.reminderPlan(model, agm, TODAY).length, 0);
  assert.ok(lc.reminderPlan(model, corp, TODAY).some((row) => row.hotel === "MSPMS" && row.kind === "compliance_lic_lic-mspms-liquor"));
  const restored = lc.applySaved(lc.buildDemo(NOW), lc.userOverlay(model, lc.buildDemo(NOW)));
  assert.equal(restored.licenses.find((row) => row.id === "lic-mspwe-pool").renewalFee, 95);
});

test("live mode stays off and the private bucket is not public", () => {
  assert.equal(lc.demoUi({ mode: "live" }), false);
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261115_compliance.sql"), "utf8");
  const src = fs.readFileSync(path.join(root, "licenses.js"), "utf8");
  assert.match(html, /src="licenses\.js"/);
  assert.ok(html.indexOf('src="licenses.js"') < html.indexOf('src="glance-home.js"'));
  assert.match(sw, /\.\/licenses\.js/);
  assert.match(sw, /hotelhq-shell-v23/);
  assert.match(sql, /compliance-docs/);
  assert.match(sql, /public = false/);
  assert.match(sql, /file_size_limit/);
  assert.match(sql, /application\/pdf/);
  assert.match(sql, /private\.compliance_object_allowed/);
  assert.match(sql, /'training', 'inspections', 'licenses'/);
  assert.match(sql, /brand_import/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on table public\.licenses from public, anon/);
  assert.doesNotMatch(sql, /to anon/);
  assert.equal(src.includes("supabaseKey"), false);
  assert.equal(src.includes("sb.from"), false);
});
