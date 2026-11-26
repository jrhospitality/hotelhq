const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(__dirname, "demo-sw.js"), "utf8");
const offline = fs.readFileSync(path.join(__dirname, "demo-offline.html"), "utf8");

function load() {
  const events = {};
  const self = {
    addEventListener(type, fn) { (events[type] = events[type] || []).push(fn); },
    location: { origin: "https://jrhospitality.github.io" },
    registration: { scope: "https://jrhospitality.github.io/hotelhq/demo/" },
    skipWaiting() {},
    clients: { claim() { return Promise.resolve(); } }
  };
  const context = vm.createContext({
    self,
    caches: {},
    URL,
    Response,
    Request,
    Headers,
    fetch() {},
    console,
    Promise
  });
  vm.runInContext(src, context, { filename: "demo-sw.js" });
  context.events = events;
  return context;
}

test("demo worker never caches personal data, HTML, or the live site", () => {
  const context = load();
  const origin = "https://jrhospitality.github.io";
  const mode = (url, extra) => context.cacheMode(url, Object.assign({
    origin,
    scope: "https://jrhospitality.github.io/hotelhq/demo/"
  }, extra));
  assert.equal(mode("https://example.supabase.co/rest/v1/profiles?select=*"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/rest/v1/profiles"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/?apikey=secret"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/index.html", { authorization: "Bearer x" }), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/index.html", { method: "POST" }), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/app.js", { range: "bytes=0-1" }), "bypass");
  assert.equal(mode("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/sw.js"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/index.html"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/app.js"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo-extra/app.js"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/index.html"), "network-only");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/install.html"), "network-only");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/", { navigate: true }), "navigate");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/index.html", { navigate: true }), "navigate");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/config.js"), "network-only");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/data/labor.json"), "network-only");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/data/qotd.json"), "network-only");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/app.js"), "static");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/readability.css"), "static");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/icon-192.png"), "static");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/manifest.webmanifest"), "static");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/demo/offline.html"), "static");
  assert.equal(context.CACHE_VERSION.startsWith("hotelhq-demo-static-v1-"), true);
  assert.ok(context.PRECACHE.includes("./offline.html"));
  assert.equal(context.PRECACHE.includes("./index.html"), false);
  assert.equal(context.PRECACHE.includes("./data/labor.json"), false);
  assert.ok(context.events.fetch && context.events.fetch.length === 1);
  assert.ok(context.events.install && context.events.install.length === 1);
  assert.ok(context.events.activate && context.events.activate.length === 1);
  assert.equal(context.events.push, undefined);
});

test("demo worker source does not store pages or call the live app", () => {
  assert.match(src, /cache:\s*"no-store"/);
  assert.match(src, /offline\.html/);
  assert.match(src, /hotelhq-demo-static-/);
  assert.doesNotMatch(src, /hotelhq-shell-/);
  assert.doesNotMatch(src, /showNotification/);
  assert.doesNotMatch(src, /"[^"]*\/hotelhq\/"/);
  assert.doesNotMatch(src, /https:\/\/[a-z0-9]+\.supabase\.co/);
  const nav = src.slice(src.indexOf("function networkNavigate"), src.indexOf("function networkOnly"));
  assert.doesNotMatch(nav, /cache\.put/);
  const only = src.slice(src.indexOf("function networkOnly"), src.indexOf("self.addEventListener"));
  assert.doesNotMatch(only, /caches/);
});

test("offline fallback is bilingual and has no personal data", () => {
  assert.match(offline, /You're offline/);
  assert.match(offline, /Estás sin conexión/);
  assert.match(offline, /Try again/);
  assert.match(offline, /Reintentar/);
  assert.match(offline, /#14365d/);
  assert.match(offline, /Hotel<span>HQ<\/span>/);
  assert.doesNotMatch(offline, /supabase/i);
  assert.doesNotMatch(offline, /sb_publishable_/);
  assert.doesNotMatch(offline, /guest name|PIN/i);
});
