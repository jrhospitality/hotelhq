const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const retail = require("../retail-market.js");

function ens(list) {
  return list.map((item) => item.en);
}

test("market lines are bilingual and do not invent a separate points rule", () => {
  [retail.FRONT_DESK_DAILY, retail.AGM_WEEKLY, retail.GM_MONTHLY, retail.GM_QUARTERLY].forEach((list) => {
    list.forEach((item) => {
      assert.ok(item.en.length > 12);
      assert.ok(item.es.length > 12);
      assert.notEqual(item.es, item.en);
    });
  });
  assert.equal(retail.FRONT_DESK_DAILY.length, 5);
  assert.equal(retail.AGM_WEEKLY.length, 4);
  assert.equal(retail.GM_MONTHLY.length, 2);
  assert.equal(retail.GM_QUARTERLY.length, 1);
  assert.equal(JSON.stringify(retail).includes("points"), false);
});

test("front desk daily lists at every hotel gain the market lines once", () => {
  const lists = {
    MSPWE: [
      { name: "1st Shift - AM Check list", role: "Front Desk", per: "Daily", items: ["Count drawer"] },
      { name: "2nd Shift - PM checklist", role: "Front Desk", per: "Daily", items: ["Count drawer"] },
      { name: "3rd Shift - Night Audit Checklist", role: "Front Desk", per: "Daily", items: ["Count drawer"] },
      { name: "Daily Maintenance Checklist", role: "Maintenance", per: "Daily", items: ["Exterior"] }
    ],
    MSPAM: [{ name: "Public Area: Lobby PM", role: "Maintenance", per: "Quarterly", items: ["Lobby"] }],
    MSPMS: [{ name: "Public Area: Lobby PM", role: "Maintenance", per: "Quarterly", items: ["Lobby"] }]
  };
  retail.foldLists(lists);
  retail.foldLists(lists);
  lists.MSPWE.filter((list) => list.role === "Front Desk").forEach((list) => {
    ens(retail.FRONT_DESK_DAILY).forEach((en) => assert.equal(list.items.filter((item) => (item.en || item) === en).length, 1));
  });
  assert.equal(lists.MSPWE[3].items.length, 1);
  assert.equal(lists.MSPAM[0].items.some((item) => item.en), false);
  assert.equal(lists.MSPMS[0].items.some((item) => item.en), false);
  const check = { "Front Desk": [["Count drawer", 0]] };
  retail.foldCheck(check);
  retail.foldCheck(check);
  assert.equal(check["Front Desk"].length, 6);
  assert.equal(check["Front Desk"].filter((row) => row[0].en === retail.FRONT_DESK_DAILY[0].en).length, 1);
});

test("weekly market work stays on the AGM weekly list and GM keeps month and quarter", () => {
  const items = {
    Weekly: ["Weekly staff meeting"],
    Monthly: ["P&L review (GOP and above)"]
  };
  retail.foldGm(items);
  retail.foldGm(items);
  ens(retail.AGM_WEEKLY).forEach((en) => assert.equal(items.Weekly.filter((item) => item.en === en).length, 1));
  ens(retail.GM_MONTHLY).forEach((en) => assert.equal(items.Monthly.filter((item) => item.en === en).length, 1));
  assert.equal(items.Quarterly.length, 1);
  assert.match(items.Quarterly[0].en, /planogram/i);
  assert.equal(items.Weekly.includes("Weekly staff meeting"), true);
});

test("the app folds these lines into the existing checklists", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.match(html, /retail-market\.js/);
  assert.match(html, /HHQRetail\.foldGm/);
  assert.match(html, /\["Daily","Weekly","Monthly","Quarterly"\]/);
  assert.doesNotMatch(html, /Retail Ops/);
  assert.match(sw, /retail-market\.js/);
  assert.equal(fs.existsSync(path.join(__dirname, "../supabase/migrations")), true);
  const migrations = fs.readdirSync(path.join(__dirname, "../supabase/migrations"));
  assert.equal(migrations.some((name) => /retail/i.test(name)), false);
});
