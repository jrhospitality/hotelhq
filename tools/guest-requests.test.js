const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const crypto = require("node:crypto");
const gr = require("../guest-requests.js");

const root = path.join(__dirname, "..");
const TODAY = "2026-11-25";
const NOW = "2026-11-25T21:30:00.000Z";
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261125_hotelkey_reservation_requests.sql"), "utf8");
const desk = { id: "mspwe-fd", role: "Front Desk", hotel: "MSPWE", name: "Jordan Lee" };
const agm = { id: "mspwe-agm", role: "AGM", hotel: "MSPWE", name: "Blake Morgan" };
const gm = { id: "mspwe-gm", role: "GM", hotel: "MSPWE", name: "Avery Cole" };
const corp = { id: "demo-corp-1", role: "Above Property", hotel: "MSPWE", name: "Alex Rivera" };
const other = { id: "mspam-fd", role: "Front Desk", hotel: "MSPAM", name: "Kim Nguyen" };
const hk = { id: "mspwe-hk", role: "Housekeeping", hotel: "MSPWE", name: "Grace Patel" };

function hashOf(kind, preferenceId, name, category, text) {
  return crypto.createHash("sha256").update([kind, preferenceId, name, category, text].join("\u001f"), "utf8").digest("hex");
}

test("content hash matches sha256 of the stored fields", () => {
  assert.equal(gr.sha256hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const line = {
    kind: "remarks",
    preferenceId: "",
    preferenceName: "",
    category: "",
    text: "EXAMPLE: high floor if one is open."
  };
  assert.equal(gr.contentHash(line), hashOf(line.kind, "", "", "", line.text));
  assert.equal(gr.contentHash(Object.assign({}, line, { text: "  " + line.text + " " })), gr.contentHash(line));
});

test("demo lines are example-only and group arrivals apart from in-house", () => {
  const model = gr.demoModel("MSPWE", TODAY);
  assert.equal(model.example, true);
  assert.ok(model.lines.length >= 8);
  model.lines.forEach((line) => {
    assert.equal(line.example, true);
    assert.equal(line.hotel, "MSPWE");
    assert.match(line.confirmation, /^EX-MSPWE-/);
    assert.match(line.reservationId, /^ex-mspwe-/);
    assert.doesNotMatch(line.text + line.preferenceName, /@|phone|555-/);
  });
  const arrivals = model.lines.filter((line) => gr.groupOf(line, TODAY) === "arrival");
  const inhouse = model.lines.filter((line) => gr.groupOf(line, TODAY) === "inhouse");
  assert.ok(arrivals.some((line) => line.kind === "preference" && line.preferenceName === "Late checkout"));
  assert.ok(arrivals.some((line) => line.kind === "remarks"));
  assert.ok(arrivals.some((line) => line.kind === "booking_remarks"));
  assert.ok(inhouse.some((line) => line.kind === "stay_remarks"));
  assert.ok(inhouse.some((line) => line.kind === "billing_remarks"));
  assert.ok(inhouse.some((line) => line.kind === "housekeeping_remarks"));
  assert.equal(model.lines.some((line) => line.preferenceName === "Quiet room" && gr.groupOf(line, TODAY) === ""), true);
  assert.equal(model.lines.some((line) => line.status === "CHECKED_OUT" && line.active === false), true);
  const pillows = model.lines.find((line) => line.preferenceId === "ex-pillow");
  assert.equal(gr.isAcknowledged(pillows, model.acks), true);
  assert.ok(gr.unackedCount(model) > 0);
  assert.ok(gr.unackedCount(model) < model.lines.filter((line) => gr.groupOf(line, TODAY)).length);
});

test("front desk, GM, AGM, and corporate can acknowledge; housekeeping cannot", () => {
  const model = gr.demoModel("MSPWE", TODAY);
  const open = model.lines.find((line) => line.kind === "remarks" && gr.groupOf(line, TODAY) === "arrival");
  assert.equal(gr.canSeeHome("Front Desk"), true);
  assert.equal(gr.canSeeHome("GM"), true);
  assert.equal(gr.canSeeHome("AGM"), true);
  assert.equal(gr.canSeeHome("Above Property"), true);
  assert.equal(gr.canSeeHome("Housekeeping"), false);
  assert.equal(gr.canSeeHome("Housekeeper"), false);
  assert.equal(gr.acknowledge(model, open.id, hk, "", NOW).ok, false);
  assert.equal(gr.acknowledge(model, open.id, other, "", NOW).error, "denied");
  [desk, agm, gm, corp].forEach((actor) => {
    const result = gr.acknowledge(model, open.id, actor, "EXAMPLE note", NOW);
    assert.equal(result.ok, true);
    assert.equal(result.ack.acknowledgedName, actor.name);
    assert.equal(result.ack.note, "EXAMPLE note");
    assert.equal(gr.isAcknowledged(open, result.model.acks), true);
    assert.equal(gr.unackedCount(result.model), gr.unackedCount(model) - 1);
  });
  const again = gr.acknowledge(gr.acknowledge(model, open.id, desk, "", NOW).model, open.id, desk, "Added later", NOW);
  assert.equal(again.ok, true);
  assert.equal(again.ack.note, "Added later");
});

test("a changed remark needs a new acknowledgment and a dropped stay stays on file", () => {
  const model = gr.demoModel("MSPWE", TODAY);
  const remark = model.lines.find((line) => line.kind === "remarks" && line.reservationId === "ex-mspwe-a");
  const acked = gr.acknowledge(model, remark.id, desk, "", NOW);
  const snapshot = acked.model.lines.filter((line) => {
    return line.hotel === "MSPWE" && line.active && line.id !== remark.id && line.preferenceId !== "ex-quiet";
  }).map((line) => ({
    reservation_id: line.reservationId,
    confirmation: line.confirmation,
    room: line.room,
    arrival: line.arrival,
    departure: line.departure,
    status: line.status,
    kind: line.kind,
    preference_id: line.preferenceId,
    preference_name: line.preferenceName,
    category: line.category,
    text: line.text
  }));
  snapshot.push({
    reservation_id: remark.reservationId,
    confirmation: remark.confirmation,
    room: "119",
    arrival: remark.arrival,
    departure: remark.departure,
    status: remark.status,
    kind: "remarks",
    text: "EXAMPLE: different sample wording."
  });
  const next = gr.applySnapshot(acked.model.lines, acked.model.acks, snapshot, "MSPWE", NOW);
  const updated = next.lines.find((line) => line.id === remark.id);
  assert.equal(updated.room, "119");
  assert.equal(updated.text, "EXAMPLE: different sample wording.");
  assert.notEqual(updated.contentHash, remark.contentHash);
  assert.equal(gr.isAcknowledged(updated, next.acks), false);
  assert.equal(next.acks.length, acked.model.acks.length);
  const quiet = next.lines.find((line) => line.preferenceId === "ex-quiet");
  assert.equal(quiet.active, false);
  assert.ok(next.lines.some((line) => line.id === quiet.id));
  const rejected = gr.applySnapshot(next.lines, next.acks, [{ kind: "nope" }], "MSPWE", NOW);
  assert.equal(rejected.rejected, true);
  assert.equal(rejected.lines.filter((line) => line.active).length, next.lines.filter((line) => line.active).length);
  const cleared = gr.applySnapshot(next.lines, next.acks, [], "MSPWE", NOW);
  assert.equal(cleared.seen, true);
  assert.equal(cleared.lines.filter((line) => line.hotel === "MSPWE" && line.active).length, 0);
  assert.equal(cleared.lines.length, next.lines.length);
});

test("the home card is bilingual, labeled EXAMPLE, and offers one-tap acknowledge", () => {
  const model = gr.demoModel("MSPWE", TODAY);
  const en = gr.cardHtml(model, { example: true, lang: "en", actor: desk });
  const es = gr.cardHtml(model, { example: true, lang: "es", actor: desk });
  assert.match(en, /id="greqHome"/);
  assert.doesNotMatch(en, /id="grHome"/);
  assert.match(en, /Guest requests/);
  assert.match(en, /Arrivals today/);
  assert.match(en, /In-house/);
  assert.match(en, /EXAMPLE/);
  assert.match(en, /No real guests/);
  assert.match(en, /Late checkout/);
  assert.match(en, /Acknowledge/);
  assert.match(en, /Acknowledged · Jordan Lee/);
  assert.match(en, /Rm 118/);
  assert.match(en, /EX-MSPWE-01/);
  assert.doesNotMatch(en, /Quiet room/);
  assert.doesNotMatch(en, /checked out sample/);
  assert.match(es, /Solicitudes del huésped/);
  assert.match(es, /Llegadas de hoy/);
  assert.match(es, /En casa/);
  assert.match(es, /EJEMPLO/);
  assert.match(es, /Confirmar/);
  assert.match(es, /Confirmado · Jordan Lee/);
  assert.match(es, /No hay huéspedes reales/);
  const hidden = gr.cardHtml(model, { example: true, lang: "en", actor: hk });
  assert.equal(gr.canSeeHome(hk.role), false);
  assert.doesNotMatch(hidden, /onclick="grAck/);
  assert.equal(gr.cardHtml(gr.demoModel("MSPAM", TODAY), { example: true, lang: "en", actor: other }).includes("EX-MSPWE-"), false);
});

test("migration is additive, hotel-scoped, and keeps the device-token ingest", () => {
  assert.match(sql, /create table if not exists public\.hotelkey_reservation_requests/);
  assert.match(sql, /create table if not exists public\.hotelkey_reservation_request_acks/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /private\.is_above\(\)/);
  assert.match(sql, /private\.my_hotels\(\)/);
  assert.match(sql, /'front_desk', 'gm', 'agm'/);
  assert.match(sql, /grant select on table public\.hotelkey_reservation_requests to authenticated/);
  assert.match(sql, /grant execute on function public\.acknowledge_hotelkey_request\(bigint, text\) to authenticated/);
  assert.match(sql, /grant execute on function public\.hotelkey_live_ingest\(text, jsonb\) to anon, authenticated/);
  assert.match(sql, /revoke all on function public\.acknowledge_hotelkey_request\(bigint, text\) from public, anon/);
  assert.match(sql, /revoke all on function private\.hotelkey_live_save_requests\(text, jsonb, timestamptz\) from public, anon/);
  assert.match(sql, /p -> 'requests'/);
  assert.match(sql, /extensions\.digest/);
  assert.match(sql, /E'\\x1f'/);
  assert.match(sql, /on conflict \(hotel, reservation_id, kind, preference_id\)/);
  assert.match(sql, /set active = false/);
  assert.match(sql, /requests_rejected/);
  assert.doesNotMatch(sql, /delete from public\.hotelkey_reservation_requests/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /grant insert on table public\.hotelkey_reservation_requests to anon/);
  assert.doesNotMatch(sql, /grant insert on table public\.hotelkey_reservation_requests to authenticated/);
  ["preference", "remarks", "stay_remarks", "billing_remarks", "housekeeping_remarks", "booking_remarks"].forEach((kind) => {
    assert.match(sql, new RegExp("'" + kind + "'"));
  });
  const example = JSON.parse(fs.readFileSync(path.join(root, "supabase/examples/hotelkey_live_requests.example.json"), "utf8"));
  assert.equal(example.body.p_token, "<device token>");
  assert.equal(example.body.p.requests.length, 6);
  assert.match(JSON.stringify(example), /EXAMPLE/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const home = fs.readFileSync(path.join(root, "home-focus.js"), "utf8");
  assert.match(html, /src="guest-requests\.js"/);
  assert.match(sw, /var CACHE_VERSION = "hotelhq-static-v1"/);
  assert.match(sw, /\.\/guest-requests\.js/);
  assert.match(home, /GuestRequests\.homeHtml/);
  assert.match(home, /#hhqToday/);
  const src = fs.readFileSync(path.join(root, "guest-requests.js"), "utf8");
  assert.match(src, /demoUi\(\)/);
  assert.match(src, /hotelkey_reservation_requests/);
  assert.match(src, /acknowledge_hotelkey_request/);
  assert.doesNotMatch(src, /service_role/);
});
