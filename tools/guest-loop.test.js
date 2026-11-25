const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const loop = require("../guest-loop.js");

function issue(extra) {
  return Object.assign({
    id: 9,
    room: "305",
    dept: "Breakfast",
    st: "done",
    rec: "apology",
    note: "Waffle station was out of batter at 8:30.",
    dep: "2026-11-08",
    loops: []
  }, extra || {});
}

test("a resolved issue stays due until the guest follow-up is recorded", () => {
  const row = issue();
  assert.equal(loop.due(row), true);
  assert.equal(loop.closed(row), false);
  assert.equal(loop.checkoutSoon(row, 0), false);
  const open = issue({ st: "open" });
  assert.equal(loop.due(open), false);
  assert.equal(loop.checkoutSoon(open, 0), true);
  assert.equal(loop.checkoutSoon(open, 1), true);
  assert.equal(loop.checkoutSoon(open, 2), false);
  assert.equal(loop.checkoutSoon(open, -1), false);
});

test("marking the fix resolved does not close the loop", () => {
  const row = issue({ st: "prog", loop: { who: "Jordan Lee", how: "call", sat: true, action: "close", at: "2026-11-01" } });
  loop.markStatus(row, "done", "2026-11-09T15:00:00.000Z");
  assert.equal(row.st, "done");
  assert.equal(row.doneAt, "2026-11-09T15:00:00.000Z");
  assert.equal(row.loop, null);
  assert.equal(loop.due(row), true);
  assert.equal(loop.closed(row), false);
});

test("a satisfied follow-up records who called and closes the loop", () => {
  const row = issue();
  const result = loop.apply(row, {
    who: "  Jordan   Lee ",
    how: "call",
    sat: true,
    action: "close",
    at: "2026-11-09T16:00:00.000Z"
  });
  assert.equal(result.ok, true);
  assert.equal(result.alert, null);
  assert.equal(loop.closed(row), true);
  assert.equal(loop.due(row), false);
  assert.equal(row.st, "done");
  assert.equal(row.rec, "apology");
  assert.equal(row.note, "Waffle station was out of batter at 8:30.");
  assert.equal(row.loop.who, "Jordan Lee");
  assert.equal(row.loop.how, "call");
  assert.equal(row.loop.sat, true);
  assert.equal(row.loops.length, 1);
  assert.match(result.toastEn, /satisfied/i);
  assert.match(result.toastEs, /satisfecho/i);
});

test("a follow-up without a name or a contact method does not close anything", () => {
  const row = issue();
  const missingWho = loop.apply(row, { who: "   ", how: "call", sat: true, action: "close" });
  assert.equal(missingWho.ok, false);
  assert.equal(missingWho.code, "who");
  assert.equal(row.st, "done");
  assert.equal(row.loops.length, 0);
  const missingHow = loop.apply(row, { who: "Jordan Lee", how: "", sat: true, action: "close" });
  assert.equal(missingHow.code, "how");
  assert.equal(loop.due(row), true);
});

test("an unsatisfied guest cannot stay resolved", () => {
  const row = issue();
  const parked = loop.apply(row, { who: "Jordan Lee", how: "text", sat: false, action: "close" });
  assert.equal(parked.ok, false);
  assert.equal(parked.code, "action");
  assert.equal(row.st, "done");
  assert.match(parked.en, /Reopen/);
  assert.match(parked.es, /Reabre/);

  const reopened = loop.apply(row, {
    who: "Jordan Lee",
    how: "person",
    sat: false,
    action: "reopen",
    at: "2026-11-09T17:00:00.000Z"
  });
  assert.equal(reopened.ok, true);
  assert.equal(reopened.alert, null);
  assert.equal(row.st, "open");
  assert.equal(row.loop, null);
  assert.equal(row.dept, "Breakfast");
  assert.equal(row.rec, "apology");
  assert.equal(loop.due(row), false);
  assert.equal(loop.closed(row), false);
  assert.equal(row.loops[0].sat, false);
  assert.equal(row.loops[0].action, "reopen");
});

test("escalating an unsatisfied guest alerts GM and AGM and reopens the issue", () => {
  const row = issue({ esc: 0 });
  const result = loop.apply(row, {
    who: "Avery Cole",
    how: "email",
    sat: false,
    action: "escalate",
    at: "2026-11-09T18:00:00.000Z"
  });
  assert.equal(result.ok, true);
  assert.equal(row.st, "open");
  assert.equal(row.esc, 1);
  assert.equal(row.escAt, "2026-11-09T18:00:00.000Z");
  assert.equal(loop.due(row), false);
  assert.match(result.alert.titleEn, /Rm 305/);
  assert.match(result.alert.titleEs, /Hab\. 305/);
  assert.match(result.alert.bodyEn, /Avery Cole/);
  assert.match(result.alert.bodyEn, /not satisfied/);
  assert.equal(result.alert.bodyEn.includes(row.note), false);
  assert.match(result.toastEn, /GM \/ AGM/);
  assert.match(result.toastEs, /GM \/ AGM/);
});

test("a later fix needs a new follow-up, and the earlier contact stays on the issue", () => {
  const row = issue();
  loop.apply(row, { who: "Jordan Lee", how: "call", sat: false, action: "reopen", at: "2026-11-09T12:00:00.000Z" });
  loop.markStatus(row, "done", "2026-11-09T19:00:00.000Z");
  assert.equal(loop.due(row), true);
  assert.equal(row.loops.length, 1);
  loop.apply(row, { who: "Blake Morgan", how: "call", sat: true, action: "close", at: "2026-11-09T20:00:00.000Z" });
  assert.equal(loop.closed(row), true);
  assert.equal(row.loops.length, 2);
  assert.equal(row.loops[0].who, "Jordan Lee");
  assert.equal(row.loop.who, "Blake Morgan");
  const again = loop.apply(row, { who: "Blake Morgan", how: "call", sat: true, action: "close" });
  assert.equal(again.ok, false);
  assert.equal(row.loops.length, 2);
});

test("the guest issue screen keeps both reminders and the request callback", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const requests = fs.readFileSync(path.join(root, "quore-parity.js"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const today = fs.readFileSync(path.join(root, "today.js"), "utf8");
  assert.match(html, /src="guest-loop\.js"/);
  assert.match(html, /Close the loop/);
  assert.match(html, /Cerrar el ciclo/);
  assert.match(html, /guest\(s\) with open issues leave today\/tomorrow/);
  assert.match(html, /giLoopSave/);
  assert.match(sw, /\.\/guest-loop\.js/);
  assert.match(requests, /What was done\?/);
  assert.match(requests, /Follow-up call in 1 hour/);
  assert.match(requests, /grNeedsLoop/);
  assert.match(requests, /Service recovery/);
  assert.match(today, /Close the loop with room/);
  assert.match(today, /departs today/);
});
