const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const help = require("../data/help-guides.js");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

function guide(id) {
  return help.GUIDES.find((item) => item.id === id);
}

function allSteps(language) {
  const lines = [];
  help.GUIDES.forEach((item) => {
    item.sections.forEach((section) => {
      section.steps.forEach((step) => lines.push(step[language]));
    });
  });
  return lines;
}

test("four role guides exist in English and Spanish with videos", () => {
  assert.deepEqual(help.GUIDES.map((item) => item.id), ["front-desk", "housekeeping", "maintenance", "gm"]);
  help.GUIDES.forEach((item) => {
    assert.ok(item.title.en && item.title.es);
    assert.ok(item.blurb.en && item.blurb.es);
    assert.match(item.video.en, /^help\/videos\/.+\.mp4$/);
    assert.match(item.video.es, /^help\/videos\/.+\.mp4$/);
    assert.notEqual(item.video.en, item.video.es);
    item.sections.forEach((section) => {
      assert.ok(section.steps.length >= 3);
      section.steps.forEach((step) => {
        assert.ok(step.en && step.es);
        assert.notEqual(step.en, step.es);
        assert.ok(step.shot.en && step.shot.es);
      });
    });
  });
  assert.ok(guide("housekeeping").roles.includes("Housekeeper"));
  assert.ok(guide("housekeeping").roles.includes("Laundry Attendant"));
  assert.ok(guide("gm").roles.includes("AGM"));
});

test("each role guide covers the daily essentials", () => {
  const fd = guide("front-desk").sections.map((section) => section.id);
  assert.deepEqual(fd, ["sign-in", "home", "shift-notes", "guest-chats", "guest-requests"]);
  const hk = guide("housekeeping").sections.map((section) => section.id);
  assert.deepEqual(hk, ["sign-in", "attendant-home", "my-rooms", "points", "exec", "laundry"]);
  const mt = guide("maintenance").sections.map((section) => section.id);
  assert.deepEqual(mt, ["sign-in", "home", "work-orders", "pm"]);
  const gm = guide("gm").sections.map((section) => section.id);
  assert.deepEqual(gm, ["sign-in", "dashboard", "briefing", "night-audit", "team"]);
  const hkText = guide("housekeeping").sections.map((section) => section.steps.map((step) => step.en).join(" ")).join(" ");
  assert.match(hkText, /Done \/ Clean/);
  assert.match(hkText, /Expected done by/);
  assert.match(hkText, /points/i);
  assert.match(guide("maintenance").sections.find((section) => section.id === "work-orders").steps.map((step) => step.en).join(" "), /Add photo/);
  assert.match(guide("front-desk").sections.find((section) => section.id === "guest-chats").steps.map((step) => step.en).join(" "), /Mark responded/);
  assert.match(guide("gm").sections.find((section) => section.id === "night-audit").steps.map((step) => step.en).join(" "), /Open night audit/);
});

test("answers quote the guides and refuse anything else", () => {
  const clean = help.answer("How do I mark a room clean?", "en", "Housekeeper");
  assert.equal(clean.known, true);
  assert.equal(clean.guideId, "housekeeping");
  assert.equal(clean.sectionId, "my-rooms");
  assert.deepEqual(clean.steps, guide("housekeeping").sections.find((section) => section.id === "my-rooms").steps.map((step) => step.en));
  assert.equal(clean.text, clean.steps.join("\n"));
  allSteps("en").forEach(() => {});
  clean.steps.forEach((line) => assert.ok(allSteps("en").includes(line)));

  const es = help.answer("¿Cómo marco un cuarto limpio?", "es", "Housekeeper");
  assert.equal(es.known, true);
  assert.equal(es.sectionId, "my-rooms");
  assert.deepEqual(es.steps, guide("housekeeping").sections.find((section) => section.id === "my-rooms").steps.map((step) => step.es));

  const pin = help.answer("How do I sign in with a temporary PIN?", "en", "Front Desk");
  assert.equal(pin.known, true);
  assert.equal(pin.sectionId, "sign-in");
  assert.match(pin.text, /temporary PIN/);

  const notes = help.answer("Where are shift notes?", "en", "Front Desk");
  assert.equal(notes.sectionId, "shift-notes");
  const pm = help.answer("How do I do preventive maintenance?", "en", "Maintenance");
  assert.equal(pm.guideId, "maintenance");
  assert.equal(pm.sectionId, "pm");
  const audit = help.answer("How do I review the night audit?", "en", "GM");
  assert.equal(audit.sectionId, "night-audit");
  const team = help.answer("How do I reset a PIN for my team?", "es", "GM");
  assert.equal(team.known, true);
  assert.equal(team.sectionId, "team");
  assert.match(team.text, /Restablecer PIN/);

  ["What is the wifi password?", "Who owns the hotel?", "¿Cuál es la contraseña del wifi?", ""].forEach((question) => {
    const lang = question.includes("¿") ? "es" : "en";
    const missed = help.answer(question, lang, "Front Desk");
    assert.equal(missed.known, false);
    assert.equal(missed.text, help.UNKNOWN[lang]);
    assert.deepEqual(missed.steps, []);
  });
  assert.equal(help.UNKNOWN.en, "I don't know, ask your GM");
  assert.equal(help.UNKNOWN.es, "No lo sé, pregunta a tu GM");
});

test("the help button is wired and the shell cache includes the guides", () => {
  const html = read("index.html");
  const sw = read("sw.js");
  const ask = read("ask-hotelhq.js");
  assert.match(html, /src="data\/help-guides\.js"/);
  assert.match(html, /src="ask-hotelhq\.js"/);
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v29"/);
  assert.match(sw, /"\.\/data\/help-guides\.js"/);
  assert.match(sw, /"\.\/ask-hotelhq\.js"/);
  assert.match(ask, /Ask HotelHQ/);
  assert.match(ask, /Pregunta a HotelHQ/);
  assert.match(ask, /I don't know, ask your GM/);
  assert.doesNotMatch(ask, /openai|anthropic|generativelanguage|api[_-]?key|supabaseKey/i);
  assert.doesNotMatch(ask, /fetch\(/);
  assert.doesNotMatch(read("data/help-guides.js"), /\b\d{4,6}\b/);
});
