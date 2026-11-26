/* HotelHQ live service worker. Registered from /hotelhq/ with that scope.
   It does not answer /hotelhq/demo/; the demo worker owns that scope.
   HTML, JSON, and config.js are fetched with cache "no-store" and never stored.
   Supabase and other API calls are not intercepted. Icons, CSS, and JS are
   network-first in a versioned cache so a new deploy shows up while online.
   A failed navigation opens offline.html. Push still opens /hotelhq/, and it
   will not navigate a demo window. Bump CACHE_VERSION when these rules change. */
var CACHE_VERSION = "hotelhq-static-v1";
var PRECACHE = [
  "./offline.html",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];
var STATIC = [
  "./manifest.webmanifest",
  "./install.html",
  "./install-qr.svg",
  "./pwa-install.js",
  "./hotelhq-icon.svg",
  "./hotelhq-wordmark.svg",
  "./fd-coverage.js",
  "./hotel-features.js",
  "./quore-parity.js",
  "./winter.js",
  "./guest-scores.js",
  "./night-audit.js",
  "./ar.js",
  "./guest-comments.js",
  "./mention-points.js",
  "./guest-loop.js",
  "./training.js",
  "./inspections.js",
  "./licenses.js",
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
  "./guest-requests.js",
  "./daily-assign.js",
  "./home-focus.js",
  "./glance-home.js",
  "./fair-share.js",
  "./guest-messages.js",
  "./decision-charts.js",
  "./hk-report.js",
  "./chargebacks.js",
  "./help-guides.js",
  "./ask-hotelhq.js",
  "./name-match.js",
  "./readability.css",
  "./vendor/chart.umd.min.js",
  "./revenue-capture.js",
  "./greetings.js",
  "./room-pm.js",
  "./tools/he-labor.js",
  "./daily-labor.js",
  "./room-live.js",
  "./data/welcome-messages.js",
  "./data/local-recs.js",
  "./data/restaurants.js",
  "./data/places.js",
  "./vendor/dicebear/core.min.js"
];
var OFFLINE_FALLBACK = "<!DOCTYPE html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>HotelHQ</title><body style=\"margin:0;font-family:sans-serif;background:#f2f4f7;color:#1d2433\"><header style=\"background:#14365d;color:#fff;padding:16px 20px\"><h1 style=\"margin:0;font-size:20px\">HotelHQ</h1></header><main style=\"padding:20px\"><p>You're offline. HotelHQ needs a connection. This screen has no staff or guest data.</p><p>Estás sin conexión. HotelHQ necesita una conexión. Esta pantalla no tiene datos del personal ni de huéspedes.</p><button type=\"button\" onclick=\"location.reload()\" style=\"min-height:44px;padding:8px 14px;border:0;border-radius:8px;background:#14365d;color:#fff;font-weight:700\">Try again · Reintentar</button></main></body></html>";

function isDemoPath(pathname) {
  return /\/demo(\/|$)/.test(pathname || "");
}

function isForeignDemo(url) {
  var path = (url && url.pathname) || "";
  var scope = "";
  try { scope = new URL(self.registration.scope).pathname; } catch (e) { scope = ""; }
  if (scope.indexOf("/demo/") !== -1) return false;
  return isDemoPath(path);
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

function inScope(url, scopeHref) {
  var scope;
  try { scope = new URL(scopeHref); }
  catch (e) { return false; }
  if (url.origin !== scope.origin) return false;
  var base = scope.pathname;
  if (base.slice(-1) !== "/") base += "/";
  return url.pathname === base.slice(0, -1) || url.pathname.indexOf(base) === 0;
}

function isStaticAsset(pathname) {
  if (/\/(?:config|sw)\.js$/i.test(pathname)) return false;
  var name = "./" + String(pathname || "").split("/").pop();
  if (STATIC.indexOf(name) !== -1) return true;
  if (pathname.indexOf("/vendor/") !== -1 && /\.(?:js|css)$/i.test(pathname)) return true;
  return /\.(?:js|css|png|svg|ico|webp|woff2?|webmanifest)$/i.test(pathname);
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
  var scopeHref = opts.scope;
  if (!scopeHref) {
    try { scopeHref = self.registration.scope; }
    catch (e) { scopeHref = ""; }
  }
  if (!inScope(parsed, scopeHref)) return "bypass";
  if (/\/sw\.js$/i.test(parsed.pathname)) return "bypass";
  if (/\/offline\.html$/i.test(parsed.pathname)) return "static";
  if (opts.navigate) return "navigate";
  if (/\/config\.js$/i.test(parsed.pathname)) return "network-only";
  if (/\.html?$/i.test(parsed.pathname) || /\/$/.test(parsed.pathname)) return "network-only";
  if (/\.json$/i.test(parsed.pathname)) return "network-only";
  if (isStaticAsset(parsed.pathname)) return "static";
  return "bypass";
}

function fromNetwork(req) {
  var headers = new Headers();
  var accept = "";
  try { accept = req.headers.get("Accept") || ""; } catch (e) { accept = ""; }
  if (accept) headers.set("Accept", accept);
  return fetch(req.url, {
    method: "GET",
    headers: headers,
    cache: "no-store",
    credentials: "same-origin",
    redirect: "follow"
  });
}

function precache() {
  if (!self.caches) return Promise.resolve();
  return caches.open(CACHE_VERSION).then(function (cache) {
    return Promise.all(PRECACHE.map(function (url) {
      return fetch(new Request(url, { cache: "no-store" })).then(function (res) {
        if (res && res.ok) return cache.put(url, res);
        return null;
      }).catch(function () { return null; });
    }));
  });
}

function clearOldCaches() {
  if (!self.caches) return Promise.resolve();
  return caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (key) {
      if (key.indexOf("hotelhq-demo-static-") === 0) return null;
      if (key.indexOf("hotelhq-shell-") === 0) return caches.delete(key);
      if (key.indexOf("hotelhq-static-") === 0 && key !== CACHE_VERSION) return caches.delete(key);
      return null;
    }));
  });
}

function networkFirstStatic(req) {
  return fromNetwork(req).then(function (res) {
    if (res && res.ok && res.type === "basic" && res.status === 200) {
      var copy = res.clone();
      caches.open(CACHE_VERSION).then(function (cache) {
        cache.put(req.url, copy).catch(function () {});
      }).catch(function () {});
    }
    return res;
  }).catch(function () {
    return caches.match(req.url).then(function (hit) {
      return hit || new Response("", { status: 504, statusText: "Offline" });
    });
  });
}

function networkNavigate(req) {
  return fromNetwork(req).catch(function () {
    return caches.match("./offline.html").then(function (page) {
      if (page) return page;
      return new Response(OFFLINE_FALLBACK, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
      });
    });
  });
}

function networkOnly(req) {
  return fromNetwork(req);
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
        get.onerror = function () { resolve(null); }
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
  var targetUrl;
  try { targetUrl = new URL(target); } catch (e) { targetUrl = null; }
  var all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (targetUrl && !isDemoPath(targetUrl.pathname)) {
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (!c.url) continue;
      var clientUrl;
      try { clientUrl = new URL(c.url); } catch (e) { continue; }
      if (clientUrl.origin !== targetUrl.origin) continue;
      if (isDemoPath(clientUrl.pathname)) continue;
      if (typeof c.navigate === "function") {
        try {
          await c.navigate(target);
          if (typeof c.focus === "function") return c.focus();
          return;
        } catch (e) {}
      }
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
    navigate: req.mode === "navigate",
    scope: self.registration && self.registration.scope
  });
  if (mode === "static") event.respondWith(networkFirstStatic(req));
  else if (mode === "navigate") event.respondWith(networkNavigate(req));
  else if (mode === "network-only") event.respondWith(networkOnly(req));
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
