const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const guides = require("../help-guides.js");

const root = path.join(__dirname, "..");

test("four day-one guides stay inside real screens and carry both languages", () => {
  assert.deepEqual(guides.GUIDES.map((guide) => guide.id), ["front_desk", "housekeeping", "maintenance", "gm"]);
  const blob = JSON.stringify(guides.GUIDES);
  assert.equal(blob.includes("@"), false);
  assert.equal(/\b\d{4,6}\b/.test(blob), false);
  assert.equal(/sb_publishable_|eyJ/.test(blob), false);
  guides.GUIDES.forEach((guide) => {
    assert.ok(guide.title.en && guide.title.es);
    assert.ok(guides.mediaOk(guide.video.en));
    assert.ok(guides.mediaOk(guide.video.es));
    ["en", "es"].forEach((lang) => {
      const caps = guides.captionsFor(guide, lang);
      assert.ok(guides.mediaOk(caps.en));
      assert.ok(guides.mediaOk(caps.es));
      assert.equal(fs.existsSync(path.join(root, guide.video[lang])), true, guide.video[lang]);
      assert.equal(fs.existsSync(path.join(root, caps.en)), true);
      assert.equal(fs.existsSync(path.join(root, caps.es)), true);
    });
    const ids = guide.sections.map((section) => section.id);
    assert.equal(ids.includes("pin"), true);
    assert.equal(ids.includes("home"), true);
    guide.sections.forEach((section) => {
      assert.ok(section.body.en.length > 40);
      assert.ok(section.body.es.length > 40);
      assert.equal(section.body.en === section.body.es, false);
    });
  });
  assert.deepEqual(guides.guideForRole("Housekeeper").id, "housekeeping");
  assert.deepEqual(guides.guideForRole("Laundry Attendant").id, "housekeeping");
  assert.deepEqual(guides.guideForRole("AGM").id, "gm");
});

test("answers quote one guide section in the question language and refuse the rest", () => {
  const notes = guides.answer("How do I post a shift handoff?", { uiLang: "es", role: "Front Desk" });
  assert.equal(notes.known, true);
  assert.equal(notes.lang, "en");
  assert.equal(notes.guideId, "front_desk");
  assert.equal(notes.sectionId, "notes");
  assert.equal(notes.text, guides.guideById("front_desk").sections.find((row) => row.id === "notes").body.en);
  assert.match(notes.text, /Post handoff/);
  assert.equal(notes.video, "media/help/front-desk-en.mp4");

  const clean = guides.answer("¿Cómo marco un cuarto limpio?", { uiLang: "en", role: "Housekeeper" });
  assert.equal(clean.known, true);
  assert.equal(clean.lang, "es");
  assert.equal(clean.guideId, "housekeeping");
  assert.equal(clean.sectionId, "rooms");
  assert.match(clean.text, /Listo \/ Limpio/);
  assert.equal(clean.text.includes("Post handoff"), false);

  const forced = guides.answer("work order photo", { lang: "es", role: "Maintenance" });
  assert.equal(forced.lang, "es");
  assert.equal(forced.sectionId, "orders");
  assert.match(forced.text, /Agregar foto/);

  const pin = guides.answer("How do I set my PIN?", { lang: "en", role: "GM" });
  assert.equal(pin.guideId, "gm");
  assert.equal(pin.sectionId, "pin");

  ["What is the guest wifi password?", "How do I change the Opera rate code?", ""].forEach((question) => {
    const miss = guides.answer(question, { lang: "en", role: "Front Desk" });
    assert.equal(miss.known, false);
    assert.equal(miss.video, "");
    assert.match(miss.text, /don't know/);
    assert.equal(miss.text.includes("Opera"), false);
  });
  const missEs = guides.answer("¿Cuál es la contraseña del wifi del huésped?", { lang: "es" });
  assert.equal(missEs.known, false);
  assert.match(missEs.text, /No encuentro eso/);
});

test("the help page and Ask button are wired without a new secret", () => {
  const page = guides.pageHtml("es", { role: "Front Desk", openId: "front_desk" });
  assert.match(page, /id="helpHub"/);
  assert.match(page, /Recepción — primer día/);
  assert.match(page, /media\/help\/front-desk-es\.mp4/);
  assert.match(page, /srclang="es"[^>]*default|default[^>]*srclang="es"/);
  assert.match(page, /Repetir el recorrido/);
  assert.equal(page.includes("<script"), false);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const ask = fs.readFileSync(path.join(root, "ask-hotelhq.js"), "utf8");
  const guideSrc = fs.readFileSync(path.join(root, "help-guides.js"), "utf8");
  const menu = fs.readFileSync(path.join(root, "more-menu.js"), "utf8");
  assert.match(html, /src="help-guides\.js"/);
  assert.match(html, /src="ask-hotelhq\.js"/);
  assert.match(sw, /help-guides\.js/);
  assert.match(sw, /ask-hotelhq\.js/);
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v32"/);
  assert.match(sw, /mp4\|vtt/);
  assert.match(ask, /askHqBtn/);
  assert.match(ask, /Replay tour/);
  assert.match(ask, /Repetir el recorrido/);
  assert.match(ask, /Open guides/);
  assert.match(ask, /Abrir guías/);
  assert.match(ask, /uxTour\(1\)/);
  assert.match(ask, /go\("guides"\)/);
  const ux = fs.readFileSync(path.join(root, "ux.js"), "utf8");
  assert.doesNotMatch(ux, /id="uxHelpBtn"/);
  assert.match(ux, /#askHqBtn/);
  assert.match(ux, /Tap Ask HotelHQ anytime for help or to replay this tour/);
  assert.match(ux, /Toca Pregunta a HotelHQ cuando quieras para pedir ayuda o repetir este recorrido/);
  assert.match(ask, /Ask HotelHQ/);
  assert.match(ask, /Pregunta a HotelHQ/);
  assert.match(guideSrc, /I don't know that from the HotelHQ guides/);
  assert.match(ask, /says it does not know/);
  assert.doesNotMatch(ask, /openai|anthropic|api[_-]?key|sb_secret/i);
  assert.match(menu, /go\(\\'guides\\'\)/);
  assert.match(menu, /Help & tour/);
  assert.match(menu, /Ayuda y recorrido/);
});
