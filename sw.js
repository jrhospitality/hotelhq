/* HotelHQ service worker. The root worker is registered with scope /hotelhq/.
   The demo copy is registered with scope /hotelhq/demo/. The root worker does
   not satisfy /hotelhq/demo/ from the live shell.
   The ack action opens /hotelhq/?ack=<alert_id> and does not call the API.
   Shell caching is network-first and versioned. Supabase and other personal API
   responses are never written to the cache. Bump CACHE_VERSION when cache rules change. */
var CACHE_VERSION = "hotelhq-shell-v21";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./install.html",
  "./install-qr.svg",
  "./pwa-install.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./hotelhq-icon.svg",
  "./hotelhq-wordmark.svg",
  "./fd-coverage.js",
  "./hotel-features.js",
  "./quore-parity.js",
  "./winter.js",
  "./guest-scores.js",
  "./night-audit.js",
  "./guest-comments.js",
  "./parking.js",
  "./ux.js",
  "./icons.js",
  "./more-menu.js",
  "./quick-tiles.js",
  "./daily-briefing.js",
  "./shift-home.js",
  "./labor-standards.js",
  "./ihg-inspect.js",
  "./retail-market.js",
  "./mspwe-checklists.js",
  "./expected-done.js",
  "./avatars.js",
  "./home-focus.js",
  "./glance-home.js",
  "./room-live.js",
  "./data/welcome-messages.js",
  "./data/local-recs.js",
  "./data/restaurants.js",
  "./data/places.js",
  "./data/qotd.json",
  "./data/labor.json",
  "./vendor/dicebear/core.min.js"
];

function isForeignDemo(url) {
  var path = (url && url.pathname) || "";
  var scope = "";
  try { scope = new URL(self.registration.scope).pathname; } catch (e) { scope = ""; }
  if (scope.indexOf("/demo/") !== -1) return false;
  return /\/demo(\/|$)/.test(path);
}

function isPersonalApi(url) {
  var host = String(url.hostname || "").toLowerCase();
  if (host === "supabase.co" || host.slice(-12) === ".supabase.co") return true;
  if (host === "supabase.in" || host.slice(-12) === ".supabase.in") return true;
  var path = url.pathname || "";
  if (/\/(auth|rest|realtime|storage|functions|graphql)\/v1(\/|$)/.test(path)) return true;
  if (/[?&](apikey|access_token)=/i.test(url.search || "")) return true;
  return false;
}

function cacheMode(url, opts) {
  opts = opts || {};
  var method = String(opts.method || "GET").toUpperCase();
  if (method !== "GET") return "bypass";
  if (opts.authorization) return "bypass";
  if (opts.range) return "bypass";
  var parsed = url;
  if (!parsed || !parsed.hostname) {
    try { parsed = new URL(String(url), opts.origin || "https://jrhospitality.github.io"); }
    catch (e) { return "bypass"; }
  }
  if (isForeignDemo(parsed)) return "bypass";
  if (isPersonalApi(parsed)) return "bypass";
  var origin = opts.origin || (self.location && self.location.origin) || "";
  if (!origin || parsed.origin !== origin) return "bypass";
  if (/\/sw\.js$/i.test(parsed.pathname)) return "bypass";
  if (opts.navigate) return "network-first";
  if (/\.(?:html?|js|css|json|webmanifest|png|svg|ico|webp|woff2?)$/i.test(parsed.pathname)) return "network-first";
  if (/\/$/.test(parsed.pathname)) return "network-first";
  return "bypass";
}

function precache() {
  if (!self.caches) return Promise.resolve();
  return caches.open(CACHE_VERSION).then(function (cache) {
    return Promise.all(SHELL.map(function (url) {
      return cache.add(url).catch(function () { return null; });
    }));
  });
}

function clearOldCaches() {
  if (!self.caches) return Promise.resolve();
  return caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      if (key.indexOf("hotelhq-shell-") === 0 && key !== CACHE_VERSION) return caches.delete(key);
      return null;
    }));
  });
}

function cachedShell(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    if (req.mode !== "navigate") return null;
    return caches.match("./index.html").then(function (home) {
      return home || caches.match("./");
    });
  });
}

function networkFirst(req) {
  return fetch(req).then(function (res) {
    if (res && res.ok && res.type === "basic") {
      var copy = res.clone();
      caches.open(CACHE_VERSION).then(function (cache) {
        var key = req;
        if (req.mode === "navigate") {
          var clean = new URL(req.url);
          clean.search = "";
          clean.hash = "";
          key = clean.toString();
        }
        cache.put(key, copy).catch(function () {});
      }).catch(function () {});
    }
    return res;
  }).catch(function () {
    return cachedShell(req).then(function (hit) {
      return hit || new Response("", { status: 504, statusText: "Offline" });
    });
  });
}
function idbGet(key) {
  return new Promise(function (resolve) {
    var req = indexedDB.open("jr-staff-push", 1);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
    };
    req.onerror = function () { resolve(null); };
    req.onsuccess = function () {
      var db = req.result;
      try {
        var tx = db.transaction("kv", "readonly");
        var get = tx.objectStore("kv").get(key);
        get.onsuccess = function () { resolve(get.result == null ? null : get.result); };
        get.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    };
  });
}

function readPayload(event) {
  var raw = {};
  if (event.data) {
    try { raw = event.data.json() || {}; }
    catch (e) { raw = { body: event.data.text ? event.data.text() : "" }; }
  }
  var nested = raw.data && typeof raw.data === "object" ? raw.data : {};
  var note = raw.notification && typeof raw.notification === "object" ? raw.notification : {};
  var alertId = raw.alert_id != null ? raw.alert_id : nested.alert_id;
  return {
    title: raw.title || note.title || "",
    body: raw.body || note.body || nested.body || "",
    url: raw.url || nested.url || note.url || "",
    tag: raw.tag || nested.tag || "",
    alert_id: alertId == null ? null : alertId,
    lang: raw.lang || nested.lang || ""
  };
}

function absUrl(url) {
  try { return new URL(url, self.registration.scope).href; }
  catch (e) { return self.registration.scope; }
}

function appUrl(alertId) {
  var origin = new URL(self.registration.scope).origin;
  var u = new URL("/hotelhq/", origin);
  if (alertId != null && alertId !== "") u.searchParams.set("ack", String(alertId));
  return u.href;
}

async function storedLang(fallback) {
  var lang = await idbGet("lang");
  if (lang === "es" || lang === "en") return lang;
  return fallback === "es" ? "es" : "en";
}

async function showPush(event) {
  var payload = readPayload(event);
  var lang = await storedLang(payload.lang);
  var title = payload.title || "HotelHQ";
  var hasAlert = payload.alert_id != null && payload.alert_id !== "";
  var actions = [];
  if (hasAlert) actions.push({ action: "ack", title: lang === "es" ? "Confirmar" : "Acknowledge" });
  await self.registration.showNotification(title, {
    body: payload.body || "",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: payload.tag || (hasAlert ? "alert-" + payload.alert_id : "jr-staff"),
    data: { url: payload.url || "", alert_id: payload.alert_id, lang: lang },
    actions: actions
  });
}

async function openClient(url) {
  var target = absUrl(url);
  var all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  var origin = new URL(target).origin;
  for (var i = 0; i < all.length; i++) {
    var c = all[i];
    if (!c.url || new URL(c.url).origin !== origin) continue;
    if (typeof c.navigate === "function") {
      try {
        await c.navigate(target);
        if (typeof c.focus === "function") return c.focus();
        return;
      } catch (e) {}
    }
  }
  if (self.clients.openWindow) return self.clients.openWindow(target);
}

self.addEventListener("install", function (event) {
  event.waitUntil(precache().catch(function () {}).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (event) {
  event.waitUntil(clearOldCaches().catch(function () {}).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (!req || req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  var mode = cacheMode(url, {
    method: req.method,
    authorization: req.headers.get("Authorization") || "",
    range: req.headers.get("Range") || "",
    origin: self.location.origin,
    navigate: req.mode === "navigate"
  });
  if (mode !== "network-first") return;
  event.respondWith(networkFirst(req));
});
self.addEventListener("push", function (event) { event.waitUntil(showPush(event)); });
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  if (event.action === "ack") {
    event.waitUntil(openClient(appUrl(data.alert_id)));
    return;
  }
  event.waitUntil(openClient(data.url || appUrl(null)));
});
