const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("desktop layout starts at 1024px and the phone bottom nav stays in the base CSS", () => {
  const html = read("index.html");
  assert.match(html, /function rMode\(\)\{const w=innerWidth;return w>=1024\?"desk":w>=768\?"tab":"phone"\}/);
  assert.match(html, /@media \(min-width:1024px\)\{[\s\S]*#side\{display:flex/);
  assert.match(html, /main,main\.wide\{max-width:1200px/);
  assert.match(html, /nav\{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #ddd;display:flex;z-index:5\}/);
  assert.equal(html.includes("min-width:1200px"), false);
  const ux = read("ux.js");
  assert.match(ux, /rMode\(\)==="desk"/);
  assert.match(ux, /@media\(min-width:1024px\)\{[\s\S]*\.ux-overlay\{align-items:center/);
  assert.match(ux, /More","Más"/);
});

test("home stays a today, urgent, and actions grid with English and Spanish labels", () => {
  const home = read("home-focus.js");
  assert.match(home, /@media\(min-width:1024px\)\{/);
  assert.match(home, /#uxHero\.hhq-home\{display:flex/);
  assert.match(home, /\.hhq-today/);
  assert.match(home, /\.hhq-urgent/);
  assert.match(home, /\.hhq-actions/);
  assert.match(home, /L\("Today", "Hoy"\)/);
  assert.match(home, /L\("More", "Más"\)/);
  assert.match(home, /details/);
  assert.doesNotMatch(home, /<details[^>]*\sopen/);
});

test("service worker cache version moved so clients pick up the desktop build", () => {
  const sw = read("sw.js");
  assert.match(sw, /var CACHE_VERSION = "hotelhq-shell-v15"/);
  assert.doesNotMatch(sw, /hotelhq-shell-v14"/);
  assert.match(sw, /\.\/more-menu\.js/);
  assert.match(sw, /\.\/home-focus\.js/);
  assert.doesNotMatch(sw, /hotelhq-shell-v1"/);
});
