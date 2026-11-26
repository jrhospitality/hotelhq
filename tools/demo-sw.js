/* HotelHQ demo service worker.
   pages-config.js installs this file as demo/sw.js only. The demo page registers
   it with the demo directory as its scope, so it does not control the live site.
   HTML, JSON, and config.js are fetched with cache "no-store" and never written
   to Cache Storage. Supabase and other API calls are not intercepted.
   Icons, CSS, and JS use a versioned network-first cache: a new deploy shows up
   while online, and those files can still paint if the connection drops.
   A navigation that fails opens offline.html, which has no staff or guest data.
   Bump the v1 prefix when these rules change. The stamp tracks offline.html. */
var CACHE_VERSION = "hotelhq-demo-static-v1-__OFFLINE_STAMP__";
var PRECACHE = [
  "./offline.html",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];
var OFFLINE_FALLBACK = "<!DOCTYPE html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>HotelHQ</title><body style=\"margin:0;font-family:sans-serif;background:#f2f4f7;color:#1d2433\"><header style=\"background:#14365d;color:#fff;padding:16px 20px\"><h1 style=\"margin:0;font-size:20px\">HotelHQ</h1></header><main style=\"padding:20px\"><p>You're offline. HotelHQ needs a connection. This screen has no staff or guest data.</p><p>Estás sin conexión. HotelHQ necesita una conexión. Esta pantalla no tiene datos del personal ni de huéspedes.</p><button type=\"button\" onclick=\"location.reload()\" style=\"min-height:44px;padding:8px 14px;border:0;border-radius:8px;background:#14365d;color:#fff;font-weight:700\">Try again · Reintentar</button></main></body></html>";

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
    try { parsed = new URL(String(url), "https://jrhospitality.github.io"); }
    catch (e) { return "bypass"; }
  }
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
      if (key.indexOf("hotelhq-demo-static-") === 0 && key !== CACHE_VERSION) return caches.delete(key);
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
    navigate: req.mode === "navigate",
    scope: self.registration && self.registration.scope
  });
  if (mode === "static") event.respondWith(networkFirstStatic(req));
  else if (mode === "navigate") event.respondWith(networkNavigate(req));
  else if (mode === "network-only") event.respondWith(networkOnly(req));
});
