const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name));

function pngInfo(buf) {
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return {
    w: buf.readUInt32BE(16),
    h: buf.readUInt32BE(20),
    color: buf[25]
  };
}

test("manifest is installable for the GitHub Pages subpath", () => {
  const manifest = JSON.parse(read("manifest.webmanifest").toString("utf8"));
  assert.equal(manifest.name, "HotelHQ");
  assert.equal(manifest.short_name, "HotelHQ");
  assert.equal(manifest.id, "/hotelhq/");
  assert.equal(manifest.start_url, "/hotelhq/");
  assert.equal(manifest.scope, "/hotelhq/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#14365d");
  assert.equal(manifest.theme_color, "#14365d");
  assert.ok(manifest.start_url.startsWith(manifest.scope));
  const any = manifest.icons.filter((icon) => icon.purpose === "any");
  const mask = manifest.icons.filter((icon) => icon.purpose === "maskable");
  assert.deepEqual(any.map((icon) => icon.sizes).sort(), ["192x192", "512x512"]);
  assert.deepEqual(mask.map((icon) => icon.sizes).sort(), ["192x192", "512x512"]);
  manifest.icons.forEach((icon) => {
    assert.equal(pngInfo(read(icon.src)).w + "x" + pngInfo(read(icon.src)).h, icon.sizes);
  });
});

test("apple touch icon is 180 and the page advertises iOS install metadata", () => {
  const apple = pngInfo(read("apple-touch-icon.png"));
  assert.equal(apple.w, 180);
  assert.equal(apple.h, 180);
  assert.equal(apple.color, 2);
  const html = read("index.html").toString("utf8");
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="HotelHQ"/);
  assert.match(html, /name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
  assert.match(html, /name="mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="color-scheme" content="light"/);
  assert.match(html, /name="theme-color" content="#f4f5f7"/);
  assert.match(html, /color-scheme:light/);
  assert.doesNotMatch(html, /prefers-color-scheme:\s*dark/);
  assert.doesNotMatch(html, /color-scheme:\s*dark/);
  assert.doesNotMatch(html, /#101114/);
  assert.match(html, /rel="apple-touch-icon" href="apple-touch-icon.png"/);
  assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /src="pwa-install.js"/);
  const guide = read("install.html").toString("utf8");
  assert.match(guide, /Install guide/);
  assert.match(guide, /Guía de instalación/);
  assert.match(guide, /install-qr\.svg/);
  assert.match(guide, /https:\/\/jrhospitality\.github\.io\/hotelhq\//);
  const prompt = read("pwa-install.js").toString("utf8");
  assert.match(prompt, /beforeinstallprompt/);
  assert.match(prompt, /display-mode: standalone/);
  assert.match(prompt, /Add to Home Screen/);
  assert.match(prompt, /Agregar a inicio/);
});

test("service worker keeps push and never caches personal API data", () => {
  const events = {};
  const self = {
    addEventListener(type, fn) { (events[type] = events[type] || []).push(fn); },
    location: { origin: "https://jrhospitality.github.io" },
    registration: { scope: "https://jrhospitality.github.io/hotelhq/" },
    skipWaiting() {},
    clients: { claim() { return Promise.resolve(); } }
  };
  const context = vm.createContext({
    self,
    indexedDB: {},
    caches: {},
    URL,
    Response,
    Request,
    fetch() {},
    console,
    Promise
  });
  vm.runInContext(read("sw.js").toString("utf8"), context, { filename: "sw.js" });
  const origin = "https://jrhospitality.github.io";
  const mode = (url, extra) => context.cacheMode(url, Object.assign({ origin }, extra));
  assert.equal(mode("https://clxvmtbmveusrbxacnxe.supabase.co/rest/v1/profiles?select=*"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/rest/v1/profiles"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/?apikey=secret"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/index.html", { authorization: "Bearer x" }), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/index.html", { method: "POST" }), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/index.html", { range: "bytes=0-1" }), "bypass");
  assert.equal(mode("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/sw.js"), "bypass");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/index.html"), "network-first");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/", { navigate: true }), "network-first");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/data/labor.json"), "network-first");
  assert.equal(mode("https://jrhospitality.github.io/hotelhq/data/qotd.json"), "network-first");
  assert.equal(context.CACHE_VERSION.startsWith("hotelhq-shell-"), true);
  assert.ok(context.SHELL.includes("./index.html"));
  assert.ok(context.SHELL.includes("./manifest.webmanifest"));
  assert.equal(context.SHELL.includes("./sw.js"), false);
  assert.ok(events.push && events.push.length === 1);
  assert.ok(events.notificationclick && events.notificationclick.length === 1);
  assert.ok(events.fetch && events.fetch.length === 1);
  assert.ok(events.install && events.install.length === 1);
  assert.ok(events.activate && events.activate.length === 1);
  const src = read("sw.js").toString("utf8");
  assert.match(src, /showNotification/);
  assert.match(src, /action: "ack"/);
  assert.match(src, /jr-staff-push/);
  assert.match(src, /supabase\.co/);
  assert.doesNotMatch(src, /https:\/\/[a-z0-9]+\.supabase\.co/);
});
