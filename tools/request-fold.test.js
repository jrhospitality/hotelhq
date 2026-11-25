const test = require("node:test");
const assert = require("node:assert/strict");
const fold = require("../request-fold.js");

test("report issue becomes a work order and supplies stay a request", () => {
  assert.equal(fold.foldKind("issue"), "work_order");
  assert.equal(fold.foldKind("report_issue"), "work_order");
  assert.equal(fold.foldKind("supplies"), "supplies");
  const state = { wo: [{ id: 1, t: "Old order", s: "Open" }], orders: [{ items: "Old towels", st: "Approved" }], kl: { today: [{ t: "Housekeeping key" }] } };
  const issue = fold.applyFold(state, { kind: "issue", room: "214", note: "Lamp out" });
  assert.equal(issue.wo[0].t, "Lamp out");
  assert.equal(issue.wo[1].t, "Old order");
  assert.equal(issue.kl.today[0].t, "Housekeeping key");
  const supplies = fold.applyFold(state, { kind: "supplies", note: "Bath towels ×20" });
  assert.equal(supplies.orders[0].items, "Bath towels ×20");
  assert.equal(supplies.orders[1].items, "Old towels");
  assert.equal(supplies.opsExtra[0].kind, "supplies");
});
