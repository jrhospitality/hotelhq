const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const script = path.join(__dirname, "pages-config.js");
const secret = "SUPABASE_PUBLISHABLE_KEY";
const liveKey = "sb_publishable_" + "a".repeat(24);

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hhq-pages-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<title>HotelHQ</title>\n");
  fs.writeFileSync(path.join(dir, "config.js"), 'window.HOTELHQ_CONFIG={"supabaseKey":"","mode":"demo"};\n');
  fs.writeFileSync(path.join(dir, "manifest.webmanifest"), JSON.stringify({
    id: "/hotelhq/",
    name: "HotelHQ",
    short_name: "HotelHQ",
    start_url: "/hotelhq/",
    scope: "/hotelhq/"
  }));
  fs.writeFileSync(path.join(dir, "sw.js"), "var CACHE_VERSION = \"hotelhq-shell-v18\";\n");
  return dir;
}

function run(dir, key) {
  return spawnSync(process.execPath, [script], {
    env: Object.assign({}, process.env, { PAGES_ROOT: dir, [secret]: key == null ? "" : key }),
    encoding: "utf8"
  });
}

test("a missing publishable key fails and does not publish demo at the root", () => {
  const dir = fixture();
  const before = fs.readFileSync(path.join(dir, "config.js"), "utf8");
  const result = run(dir, "");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(secret));
  assert.match(result.stderr, /will not be published in demo mode/);
  assert.equal(fs.readFileSync(path.join(dir, "config.js"), "utf8"), before);
  assert.equal(fs.existsSync(path.join(dir, "demo")), false);
});

test("a placeholder key fails loudly", () => {
  const dir = fixture();
  const result = run(dir, "PASTE_PUBLISHABLE_KEY_HERE");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(secret));
  assert.equal(fs.existsSync(path.join(dir, "demo")), false);
});

test("the workflow writes live at the root and demo with an empty key", () => {
  const dir = fixture();
  const result = run(dir, liveKey);
  assert.equal(result.status, 0, result.stderr);
  const live = fs.readFileSync(path.join(dir, "config.js"), "utf8");
  const demo = fs.readFileSync(path.join(dir, "demo", "config.js"), "utf8");
  assert.match(live, /"mode":"live"/);
  assert.ok(live.includes(liveKey));
  assert.match(demo, /"mode":"demo"/);
  assert.match(demo, /"supabaseKey":""/);
  assert.equal(demo.includes(liveKey), false);
  assert.equal(fs.readFileSync(path.join(dir, "demo", "index.html"), "utf8").includes("HotelHQ"), true);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "demo", "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.start_url, "/hotelhq/demo/");
  assert.equal(manifest.scope, "/hotelhq/demo/");
  assert.equal(manifest.id, "/hotelhq/demo/");
});

test("the Pages workflow calls the writer and does not fall back to demo", () => {
  const yml = fs.readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8");
  assert.match(yml, new RegExp(secret));
  assert.match(yml, /node tools\/pages-config\.js/);
  assert.doesNotMatch(yml, /live\?"live":"demo"/);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /DEMO — example names and PINs/);
  assert.match(html, /Este modo no contacta a Supabase/);
  assert.match(html, /Your PIN is checked by Supabase/);
  assert.match(html, /Supabase revisa tu PIN/);
  assert.match(html, /Open the example demo/);
  assert.match(html, /Abrir el demo de ejemplo/);
  assert.match(html, /This list is this hotel plus JR Corporate/);
  assert.match(html, /Esta lista es este hotel más JR Corporativo/);
  assert.match(html, /pin_reset_required===true/);
  assert.match(html, /\/demo\//);
  assert.doesNotMatch(html, /chooseMode\('demo'\)/);
  assert.doesNotMatch(html, /loginModeChoice="need-key"/);
});
