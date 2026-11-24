const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const howto = require("../howto.js");

const root = path.join(__dirname, "..");

test("every guide has both languages, a video, and steps", () => {
  assert.equal(howto.GUIDES.length, 4);
  const ids = howto.GUIDES.map((guide) => guide.id);
  assert.deepEqual(ids, ["fd", "hk", "mt", "gm"]);
  howto.GUIDES.forEach((guide) => {
    assert.equal(guide.video.en, "assets/howto/" + guide.id + "-en.mp4");
    assert.equal(guide.video.es, "assets/howto/" + guide.id + "-es.mp4");
    assert.ok(guide.title.en && guide.title.es && guide.title.en !== guide.title.es);
    assert.ok(guide.sections.length >= 2);
    guide.sections.forEach((section) => {
      assert.match(section.id, /^[a-z]{2}-[a-z]+$/);
      assert.ok(section.title.en && section.title.es);
      assert.ok(section.steps.length >= 3 && section.steps.length <= 6);
      section.steps.forEach((step) => {
        assert.ok(step.en && step.es);
        assert.notEqual(step.en, step.es);
      });
      assert.equal(section.shot, "assets/howto/" + section.id + "-");
    });
  });
});

test("the signed-in job opens its own guide", () => {
  assert.equal(howto.guideForRole("Front Desk"), "fd");
  assert.equal(howto.guideForRole("Housekeeper"), "hk");
  assert.equal(howto.guideForRole("Laundry Attendant"), "hk");
  assert.equal(howto.guideForRole("Housekeeping"), "hk");
  assert.equal(howto.guideForRole("Maintenance"), "mt");
  assert.equal(howto.guideForRole("GM"), "gm");
  assert.equal(howto.guideForRole("AGM"), "gm");
});

test("questions land on the matching section in the user's language", () => {
  const clean = howto.answer("How do I mark a room clean?", "en", "Housekeeper");
  assert.equal(clean.known, true);
  assert.equal(clean.sectionId, "hk-clean");
  assert.match(clean.text, /Done \/ Clean/);
  assert.doesNotMatch(clean.text, /Start wash/);

  const es = howto.answer("¿Cómo marco un cuarto limpio?", "es", "Housekeeper");
  assert.equal(es.known, true);
  assert.equal(es.lang, "es");
  assert.equal(es.sectionId, "hk-clean");
  assert.match(es.text, /Limpio/);
  assert.equal(es.guideTitle, "Ama de llaves");

  assert.equal(howto.answer("Where are guest messages that need a response?", "en", "Front Desk").sectionId, "fd-chats");
  assert.equal(howto.answer("temporary PIN", "en", "Housekeeper").sectionId, "hk-pin");
  assert.equal(howto.answer("preventive maintenance room PM", "en", "Maintenance").sectionId, "mt-pm");
  assert.equal(howto.answer("approve a supply order", "en", "GM").sectionId, "gm-approve");
  assert.equal(howto.answer("expected done by the team", "en", "GM").sectionId, "gm-done");
  assert.equal(howto.answer("shift handoff notes", "en", "Front Desk").sectionId, "fd-notes");
  assert.equal(howto.answer("start a laundry wash", "en", "Laundry Attendant").sectionId, "hk-laundry");
  assert.equal(howto.answer("work order photo", "en", "Maintenance").sectionId, "mt-orders");
  assert.equal(howto.answer("report a plumbing leak with a photo", "en", "Housekeeper").sectionId, "hk-photo");
  assert.equal(howto.answer("room status board", "en", "Front Desk").sectionId, "fd-rooms");
});

test("unknown questions stay unknown in both languages", () => {
  ["what is the wifi password", "how much is my paycheck", "who owns the hotel", "", "hello there"].forEach((q) => {
    const hit = howto.answer(q, "en", "Front Desk");
    assert.equal(hit.known, false, q);
    assert.equal(hit.steps.length, 0);
    assert.equal(hit.text, "I don't see that in the HotelHQ how-to guides.");
    assert.equal(hit.sectionId, "");
  });
  const es = howto.answer("¿cuál es la clave del wifi?", "es", "Housekeeper");
  assert.equal(es.known, false);
  assert.equal(es.text, "No encuentro eso en las guías de HotelHQ.");
});

test("demo videos and screenshots are in the repo", () => {
  howto.GUIDES.forEach((guide) => {
    ["en", "es"].forEach((lang) => {
      const video = path.join(root, "assets/howto/" + guide.id + "-" + lang + ".mp4");
      const stat = fs.statSync(video);
      assert.ok(stat.size > 50 * 1024 && stat.size < 2 * 1024 * 1024, video);
    });
    guide.sections.forEach((section) => {
      ["en", "es"].forEach((lang) => {
        const shot = path.join(root, section.shot + lang + ".png");
        assert.ok(fs.statSync(shot).size > 8 * 1024, shot);
      });
    });
  });
  assert.ok(fs.statSync(path.join(root, "assets/howto/example-photo.png")).size > 1000);
});

test("the page is wired into the app and the shell cache", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(html, /<script src="howto.js"><\/script>/);
  assert.match(html, /<script src="ask-hotelhq.js"><\/script>/);
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v29"/);
  assert.match(sw, /\.\/howto\.js/);
  assert.match(sw, /\.\/ask-hotelhq\.js/);
  const page = howto.page({ lang: "es", role: "Laundry Attendant", guideId: "hk", sectionId: "hk-laundry" });
  assert.match(page, /hk-es\.mp4/);
  assert.match(page, /howto-hk-laundry/);
  assert.match(page, /Empezar lavado/);
  assert.doesNotMatch(page, /Shift notes/);
});
