const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const crypto = require("crypto");

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
  assert.equal(manifest.name, "HotelHQ");
  assert.equal(manifest.short_name, "HotelHQ");
  assert.equal(manifest.start_url, "/hotelhq/demo/");
  assert.equal(manifest.scope, "/hotelhq/demo/");
  assert.equal(manifest.id, "/hotelhq/demo/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#14365d");
  assert.equal(manifest.theme_color, "#14365d");
  assert.equal(fs.existsSync(path.join(dir, "offline.html")), false);
  assert.equal(fs.existsSync(path.join(dir, "demo", "offline.html")), true);
  const demoSw = fs.readFileSync(path.join(dir, "demo", "sw.js"), "utf8");
  assert.match(demoSw, /hotelhq-demo-static-v1-[0-9a-f]{12}/);
  assert.doesNotMatch(demoSw, /hotelhq-shell-/);
  assert.equal(demoSw.includes(liveKey), false);
  assert.equal(fs.readFileSync(path.join(dir, "sw.js"), "utf8").includes("hotelhq-demo-static-"), false);
  const rootManifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.webmanifest"), "utf8"));
  assert.equal(rootManifest.start_url, "/hotelhq/");
  assert.equal(rootManifest.scope, "/hotelhq/");
});

test("the Pages workflow calls the writer and does not fall back to demo", () => {
  const yml = fs.readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8");
  assert.match(yml, new RegExp(secret));
  assert.match(yml, /node tools\/pages-config\.js/);
  assert.match(yml, /needs: build/);
  assert.match(yml, /upload-pages-artifact@v5/);
  assert.match(yml, /deploy-pages@v5/);
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

test("the demo build is installable and the live shell stays put", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hhq-pages-"));
  const keep = ["index.html", "manifest.webmanifest", "sw.js", "install.html", "pwa-install.js", "install-qr.svg", "config.js"];
  keep.forEach((name) => fs.copyFileSync(path.join(root, name), path.join(dir, name)));
  const frozen = ["index.html", "manifest.webmanifest", "sw.js", "install.html", "pwa-install.js", "install-qr.svg"];
  const before = {};
  frozen.forEach((name) => { before[name] = fs.readFileSync(path.join(dir, name)); });
  const result = run(dir, liveKey);
  assert.equal(result.status, 0, result.stderr);
  frozen.forEach((name) => {
    assert.deepEqual(fs.readFileSync(path.join(dir, name)), before[name], name);
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "demo", "manifest.webmanifest"), "utf8"));
  const liveManifest = JSON.parse(before["manifest.webmanifest"].toString("utf8"));
  assert.equal(manifest.name, "HotelHQ");
  assert.equal(manifest.short_name, "HotelHQ");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/hotelhq/demo/");
  assert.equal(manifest.scope, "/hotelhq/demo/");
  assert.equal(manifest.id, "/hotelhq/demo/");
  assert.equal(manifest.background_color, "#14365d");
  assert.equal(manifest.theme_color, "#14365d");
  assert.ok(manifest.start_url.startsWith(manifest.scope));
  assert.deepEqual(manifest.icons, liveManifest.icons);
  assert.match(manifest.description, /demo/i);
  assert.doesNotMatch(manifest.description, /sb_publishable_|eyJ/);
  const demoIndex = fs.readFileSync(path.join(dir, "demo", "index.html"), "utf8");
  assert.match(demoIndex, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(demoIndex, /name="apple-mobile-web-app-title" content="HotelHQ"/);
  assert.match(demoIndex, /name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(demoIndex, /rel="apple-touch-icon"/);
  assert.match(demoIndex, /rel="manifest" href="manifest.webmanifest"/);
  assert.match(demoIndex, /updateViaCache:"none"/);
  assert.match(demoIndex, /\/demo\$/);
  assert.match(before["index.html"].toString("utf8"), /updateViaCache:"none"/);
  assert.doesNotMatch(before["index.html"].toString("utf8"), /\/demo\$/);
  const prompt = fs.readFileSync(path.join(dir, "demo", "pwa-install.js"), "utf8");
  assert.match(prompt, /hhq_demo_pwa_install_hide_until/);
  assert.match(prompt, /beforeinstallprompt/);
  assert.match(prompt, /Add to Home Screen/);
  assert.match(prompt, /Agregar a inicio/);
  assert.match(prompt, /body\.is-login #pwaInstall\{display:block!important\}/);
  assert.doesNotMatch(before["pwa-install.js"].toString("utf8"), /hhq_demo_pwa_install_hide_until/);
  assert.match(before["pwa-install.js"].toString("utf8"), /body\.is-login #pwaInstall\{display:block!important\}/);
  assert.equal(liveManifest.id, "/hotelhq/");
  assert.notEqual(manifest.id, liveManifest.id);
  const guide = fs.readFileSync(path.join(dir, "demo", "install.html"), "utf8");
  assert.match(guide, /https:\/\/jrhospitality\.github\.io\/hotelhq\/demo\//);
  assert.doesNotMatch(guide, /https:\/\/jrhospitality\.github\.io\/hotelhq\/(?!demo\/)/);
  assert.match(guide, /\/hotelhq\/demo\/<\/p>/);
  const qr = fs.readFileSync(path.join(dir, "demo", "install-qr.svg"), "utf8");
  assert.match(qr, /https:\/\/jrhospitality\.github\.io\/hotelhq\/demo\//);
  assert.deepEqual(fs.readFileSync(path.join(__dirname, "demo-install-qr.svg")), fs.readFileSync(path.join(dir, "demo", "install-qr.svg")));
  const offline = fs.readFileSync(path.join(dir, "demo", "offline.html"));
  assert.deepEqual(offline, fs.readFileSync(path.join(__dirname, "demo-offline.html")));
  const stamp = crypto.createHash("sha256").update(offline).digest("hex").slice(0, 12);
  const demoSw = fs.readFileSync(path.join(dir, "demo", "sw.js"), "utf8");
  assert.equal(demoSw, fs.readFileSync(path.join(__dirname, "demo-sw.js"), "utf8").replace("__OFFLINE_STAMP__", stamp));
  assert.equal(fs.existsSync(path.join(dir, "offline.html")), false);
  const demoConfig = fs.readFileSync(path.join(dir, "demo", "config.js"), "utf8");
  assert.match(demoConfig, /"mode":"demo"/);
  assert.equal(demoConfig.includes(liveKey), false);
});
