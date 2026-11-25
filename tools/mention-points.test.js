const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const mp = require("../mention-points.js");
const gc = require("../guest-comments.js");

const NOW = "2026-11-04T15:00:00.000Z";
const root = path.join(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261121_name_mention_approval.sql"), "utf8");
const gm = { id: "mspwe-gm", role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const agm = { id: "mspwe-agm", role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const other = { id: "mspam-agm", role: "AGM", hotel: "MSPAM", name: "Sam Patel" };
const corp = { id: "demo-corp-1", role: "Above Property", hotel: null, name: "Alex Rivera" };
const desk = { id: "mspwe-fd", role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const hk = { id: "mspwe-hkr", role: "Housekeeper", hotel: "MSPWE", name: "Maria Alvarez" };
const joy = { id: "mspwe-ba", role: "Breakfast Attendant", hotel: "MSPWE", name: "Joy Adams" };
const rosa = { id: "mspam-hkr", role: "Housekeeper", hotel: "MSPAM", name: "Rosa Vega" };
const staff = [gm, agm, desk, hk, joy, rosa, corp];

function model() {
  const comments = gc.buildDemo(NOW).comments;
  return mp.merge(mp.detect(comments, staff).concat(mp.guestVoiceSample(staff, "2026-11-04")), { v: 1, requests: [], notices: [] });
}
function byStaff(rows, id) {
  return rows.filter((row) => row.staffId === id);
}

test("a positive name in a review becomes a pending request and does not post points", () => {
  const rows = model().requests;
  const maria = byStaff(rows, hk.id).find((row) => row.source === "medallia");
  const jordan = byStaff(rows, desk.id).find((row) => row.source === "google");
  const breakfast = byStaff(rows, joy.id).find((row) => row.source === "guestVoice");
  const rosaRow = byStaff(rows, rosa.id).find((row) => row.source === "medallia");
  assert.ok(maria);
  assert.equal(maria.status, "pending");
  assert.equal(maria.awardedPoints, 0);
  assert.equal(maria.proposedPoints, 500);
  assert.match(maria.excerpt, /Maria Alvarez/);
  assert.equal(maria.reviewDate, "2026-01-18");
  assert.ok(jordan);
  assert.match(jordan.excerpt, /Jordan Lee/);
  assert.ok(breakfast);
  assert.match(breakfast.excerpt, /^Sample review\./);
  assert.ok(rosaRow);
  assert.equal(mp.earned(model(), hk.id), 0);
  assert.equal(mp.earned(model(), desk.id), 0);
  const complaint = {
    id: "gc-name-complaint", hotel: "MSPWE", tone: "complaint", source: "medallia", date: "2026-11-01",
    textEn: "Sample comment. Maria Alvarez was named in a complaint.", textEs: "Comentario de ejemplo."
  };
  assert.equal(mp.detect([complaint], staff).length, 0);
});

test("only the GM or AGM of that hotel can approve, reassign, or deny", () => {
  const pending = model();
  const id = byStaff(pending.requests, hk.id)[0].id;
  assert.equal(mp.canReview(gm), true);
  assert.equal(mp.canReview(agm), true);
  assert.equal(mp.canReview(corp), false);
  assert.equal(mp.canReview(desk), false);
  assert.equal(mp.canReview(hk), false);
  assert.equal(mp.approve(pending, id, corp, NOW).ok, false);
  assert.equal(mp.approve(pending, id, other, NOW).ok, false);
  assert.equal(mp.approve(pending, id, desk, NOW).ok, false);
  assert.equal(mp.approve(pending, id, hk, NOW).error, "denied");
  assert.equal(mp.approve(pending, id, Object.assign({}, gm, { id: hk.id }), NOW).error, "self");
  assert.equal(mp.deny(pending, id, desk, "Not this person", NOW).ok, false);
  assert.equal(mp.reassign(pending, id, other, joy.id, staff).ok, false);
  const moved = mp.reassign(pending, id, agm, joy.id, staff);
  assert.equal(moved.ok, true);
  assert.equal(moved.row.status, "pending");
  assert.equal(moved.row.staffId, joy.id);
  assert.equal(mp.earned(moved.model, joy.id), 0);
  assert.equal(mp.openNotices(moved.model, joy.id).length, 0);
  const denied = mp.deny(pending, id, gm, "", NOW);
  assert.equal(denied.ok, false);
  assert.equal(denied.error, "reason");
  const no = mp.deny(pending, id, gm, "The name is a different person.", NOW);
  assert.equal(no.ok, true);
  assert.equal(no.row.status, "denied");
  assert.equal(no.awarded, null);
  assert.equal(no.notice, null);
  assert.equal(mp.openNotices(no.model, hk.id).length, 0);
  assert.equal(mp.earned(no.model, hk.id), 0);
  assert.equal(mp.approve(no.model, id, gm, NOW).ok, false);
});

test("approve posts points once and congratulates that associate in both languages", () => {
  const pending = model();
  const id = byStaff(pending.requests, hk.id)[0].id;
  const yes = mp.approve(pending, id, gm, NOW);
  assert.equal(yes.ok, true);
  assert.equal(yes.row.status, "approved");
  assert.equal(yes.row.awardedPoints, 500);
  assert.equal(yes.row.approverName, "Avery Cole");
  assert.equal(yes.row.approverRole, "GM");
  assert.equal(yes.row.decidedAt, NOW);
  assert.equal(yes.awarded.staffId, hk.id);
  assert.equal(yes.awarded.points, 500);
  assert.equal(mp.earned(yes.model, hk.id), 500);
  assert.equal(mp.earned(yes.model, desk.id), 0);
  assert.equal(mp.pendingFor(yes.model, gm).some((row) => row.id === id), false);
  const note = mp.openNotices(yes.model, hk.id)[0];
  assert.match(note.bodyEn, /Congrats! A guest mentioned you by name: ".*Maria Alvarez.*"\. \+500 points\./);
  assert.match(note.bodyEs, /¡Felicidades! Un huésped te mencionó por tu nombre: ".*Maria Alvarez.*"\. \+500 puntos\./);
  assert.equal(mp.openNotices(yes.model, desk.id).length, 0);
  const again = mp.approve(yes.model, id, agm, NOW);
  assert.equal(again.ok, false);
  const hidden = mp.dismiss(yes.model, id, desk);
  assert.equal(hidden.ok, false);
  const gone = mp.dismiss(yes.model, id, hk);
  assert.equal(gone.ok, true);
  assert.equal(mp.openNotices(gone.model, hk.id).length, 0);
  assert.equal(mp.earned(gone.model, hk.id), 500);
  const kept = mp.merge(mp.detect(gc.buildDemo(NOW).comments, staff), gone.model);
  assert.equal(kept.requests.find((row) => row.id === id).status, "approved");
  assert.equal(mp.openNotices(kept, hk.id).length, 0);
});

test("the queue, badge, and staff home are in English and Spanish", () => {
  const pending = model();
  const en = mp.queueHtml(pending, gm, staff, "en");
  const es = mp.queueHtml(pending, gm, staff, "es");
  assert.match(en, /id="nmQueue"/);
  assert.match(en, /Approve/);
  assert.match(en, /Change staff member/);
  assert.match(en, /Deny/);
  assert.match(en, /Maria Alvarez/);
  assert.match(en, /Guest Voice/);
  assert.match(en, /EXAMPLE/);
  assert.match(es, /Aprobar/);
  assert.match(es, /Cambiar de asociado/);
  assert.match(es, /Rechazar/);
  assert.match(es, /Motivo/);
  assert.equal(mp.queueHtml(pending, desk, staff, "en"), "");
  assert.equal(mp.queueHtml(pending, corp, staff, "en"), "");
  const badge = mp.badgeHtml(mp.pendingFor(pending, gm).length, "en");
  assert.match(badge, /id="nmPendingBadge"/);
  assert.match(badge, /id="nmPendingCount">3</);
  assert.match(mp.badgeHtml(3, "es"), /Menciones por nombre/);
  const note = mp.congrats(byStaff(pending.requests, hk.id)[0]);
  note.points = 500;
  const home = mp.staffHomeHtml(Object.assign(mp.congrats({
    id: "nm-gc-mspwe-praise-mspwe-hkr",
    staffId: hk.id,
    excerpt: "Sample comment. Maria Alvarez left the room spotless.",
    awardedPoints: 500
  }), { points: 500, bodyEn: mp.congrats({ id: "x", staffId: hk.id, excerpt: "Sample comment. Maria Alvarez left the room spotless.", awardedPoints: 500 }).bodyEn, bodyEs: mp.congrats({ id: "x", staffId: hk.id, excerpt: "Sample comment. Maria Alvarez left the room spotless.", awardedPoints: 500 }).bodyEs }), "es");
  assert.match(home, /id="nmCongrats"/);
  assert.match(home, /id="nmNotes"/);
  assert.match(home, /Notificaciones/);
  assert.match(home, /\+500 puntos/);
  const tagged = mp.queueTagged({ v: 1, requests: [], notices: [] }, {
    hotel: "MSPWE", staffId: desk.id, staffName: desk.name, source: "survey",
    excerpt: "Sample survey. Jordan Lee helped with the sample arrival.", reviewDate: "2026-11-04", proposedPoints: 50
  });
  assert.equal(tagged.ok, true);
  assert.equal(tagged.model.requests[0].status, "pending");
  assert.equal(tagged.model.requests[0].source, "medallia");
  assert.equal(tagged.model.requests[0].awardedPoints, 0);
});

test("the migration is additive and points post only when a GM or AGM approves", () => {
  assert.match(sql, /add column if not exists deny_reason/);
  assert.match(sql, /add column if not exists proposed_points/);
  assert.match(sql, /add column if not exists awarded_points/);
  assert.match(sql, /add column if not exists approver_role/);
  assert.match(sql, /create table if not exists public\.name_mention_notices/);
  assert.match(sql, /private\.name_mention_leader/);
  assert.match(sql, /'gm', 'agm'/);
  assert.match(sql, /not \(select private\.is_above\(\)\)/);
  assert.match(sql, /private\.award\(m\.employee, m\.hotel_id, 'guest_mention'/);
  assert.match(sql, /deny reason required/);
  assert.match(sql, /status = 'confirmed'/);
  assert.match(sql, /status = 'rejected'/);
  assert.match(sql, /guestVoice/);
  assert.match(sql, /guest_comments/);
  assert.match(sql, /Congrats! A guest mentioned you by name/);
  assert.match(sql, /Un huésped te mencionó por tu nombre/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all on function public\.deny_name_mention/);
  assert.match(sql, /grant execute on function public\.confirm_mention\(bigint, boolean\) to authenticated/);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /drop column/i);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
  const denyFn = sql.slice(sql.indexOf("function private.deny_mention"), sql.indexOf("function public.deny_name_mention"));
  assert.doesNotMatch(denyFn, /private\.award/);
  assert.doesNotMatch(denyFn, /name_mention_notices/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(html, /mention-points\.js/);
  assert.match(html, /MentionPoints\.submitTagged/);
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v36"/);
  assert.match(sw, /mention-points\.js/);
  assert.match(html, /Points are not posted yet/);
});
