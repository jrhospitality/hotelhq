/* Lucide-style inline icons. UI emoji are swapped for SVG after render.
   Favorite-emoji pickers and <option> labels stay as characters. */
(function (root) {
  "use strict";

  var PATHS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    bed: '<path d="M2 20V8"/><path d="M2 12h18a2 2 0 0 1 2 2v6"/><path d="M2 18h20"/><path d="M6 12V8a2 2 0 0 1 2-2h3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    calendar: '<rect width="18" height="16" x="3" y="5" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trendUp: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    trendDown: '<path d="M22 17 13.5 8.5 8.5 13.5 2 7"/><path d="M16 17h6v-6"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    bag: '<path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M4 12h16"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    bus: '<rect width="16" height="12" x="4" y="4" rx="2"/><path d="M4 12h16M6 16v2M18 16v2M8 8h.01M16 8h.01"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.2 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.8A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.2z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.5c.5.6 1 1.4 1 2.5h6c0-1.1.5-1.9 1-2.5A7 7 0 0 0 12 2z"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    star: '<path d="m12 3 2.6 5.6L21 9.2l-4.5 4.3 1.1 6.3L12 16.8 6.4 19.8l1.1-6.3L3 9.2l6.4-.6z"/>',
    grad: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
    camera: '<path d="M14 4h-4L8 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z"/><circle cx="12" cy="13" r="3"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    bars: '<path d="M4 19V5M4 19h16"/><path d="M8 19v-6M12 19V8M16 19v-9M20 19v-4"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    chevU: '<path d="m18 15-6-6-6 6"/>',
    arrowL: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    alert: '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/>',
    cloud: '<path d="M7 18h10a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 18z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M22 16.9v2.2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h2.2a2 2 0 0 1 2 1.7c.1.9.4 1.8.6 2.7a2 2 0 0 1-.5 2.1L7.1 9.9a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2.1z"/>',
    thumb: '<path d="M7 11v10M7 11h3V5a2 2 0 0 1 2-2 1 1 0 0 1 1 1.2L12 11h6.2a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7"/>',
    cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    spark: '<path d="M12 3 9.8 9.8 3 12l6.8 2.2L12 21l2.2-6.8L21 12l-6.8-2.2z"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    shirt: '<path d="M20 6 16 3l-4 3-4-3-4 3v15h16z"/><path d="M12 6v14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    map: '<path d="m9 4 6 2 6-2v16l-6 2-6-2-6 2V6z"/><path d="M9 4v16M15 6v16"/>',
    key: '<circle cx="7.5" cy="15.5" r="3.5"/><path d="M10.5 12.5 21 2l-2 2M15 6l2 2"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    truck: '<path d="M3 7h11v10H3z"/><path d="M14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    walk: '<circle cx="12" cy="5" r="2"/><path d="m9 22 2-7 3 2 2 5M8 11l2 2 4-3 3 2"/>',
    broom: '<path d="M14 4 5 13"/><path d="m5 13 2 7 7-2M14 4l2 2M9 17l6-6"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A2 2 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    clipboardCheck: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    calendarCheck: '<rect width="18" height="16" x="3" y="5" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/><path d="m9 16 2 2 4-4"/>',
    notebook: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    newspaper: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
    activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    hammer: '<path d="m15 12-8.5 8.5a2.1 2.1 0 0 1-3-3L12 9"/><path d="M17.6 6.6 15 12l-3-3 5.4-2.6a2 2 0 0 1 2.2.4 2 2 0 0 1-.4 2.2z"/>',
    handshake: '<path d="m11 17 2 2a2 2 0 0 0 3 0l3.5-3.5a2 2 0 0 0 0-3L16 9"/><path d="m8 14-3.5 3.5a2 2 0 0 0 0 3L8 21"/><path d="M7 14.5 3.5 11a2 2 0 0 1 0-3L7 4.5"/><path d="m14 8 3.5-3.5a2 2 0 0 1 3 0L22 6"/><path d="M8 13l3-3 5 5"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
    briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'
  };

  var MAP = {
    "🏠": "home", "👥": "users", "🛏️": "bed", "🛏": "bed", "🔍": "search", "🔎": "search",
    "✅": "check", "☑️": "check", "✓": "check", "✔": "check", "📋": "clipboard",
    "🗓️": "calendar", "🗓": "calendar", "📅": "calendar", "📆": "calendar",
    "🔧": "wrench", "🔩": "wrench", "🧰": "wrench", "📦": "package", "🛒": "cart",
    "⏱️": "clock", "⏱": "clock", "🕒": "clock", "⏰": "clock", "📈": "trendUp", "📉": "trendDown",
    "👤": "user", "🧳": "bag", "🚩": "flag", "⚙️": "gear", "⚙": "gear", "🚐": "bus",
    "📝": "file", "📨": "inbox", "☀️": "sun", "☀": "sun", "✏️": "pencil", "✏": "pencil",
    "👁️": "eye", "👁": "eye", "💡": "bulb", "✉️": "mail", "✉": "mail", "⭐": "star",
    "🎓": "grad", "📷": "camera", "📸": "camera", "⚡": "zap", "📊": "bars", "🔔": "bell",
    "🛎️": "bell", "🛎": "bell", "🔒": "lock", "✕": "x", "✖": "x",
    "‹": "chevL", "›": "chevR", "▾": "chevD", "▴": "chevU", "▼": "chevD", "▲": "chevU",
    "←": "arrowL", "☰": "menu", "❓": "help", "⚠️": "alert", "⚠": "alert", "🚫": "ban",
    "🌤️": "cloud", "🌤": "cloud", "＋": "plus", "➕": "plus", "📞": "phone", "👍": "thumb",
    "💵": "cash", "🎯": "target", "✨": "spark", "🎉": "spark", "☕": "coffee", "🍳": "coffee",
    "👕": "shirt", "🧺": "shirt", "ℹ️": "info", "ℹ": "info", "🗺️": "map", "🗺": "map",
    "🔑": "key", "🚶": "walk", "🧹": "broom", "📍": "pin", "🧠": "spark", "🙂": "user",
    "🎂": "spark", "💌": "mail", "🙋": "user"
  };

  function svg(name) {
    var body = PATHS[name];
    if (!body) return "";
    return '<svg class="i" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }
  function iconHtml(emoji) {
    return svg(MAP[emoji] || "");
  }
  var keys = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });
  var re = new RegExp(keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|"), "g");
  function replaceIcons(text) {
    return String(text == null ? "" : text).replace(re, function (ch) {
      return iconHtml(ch) || ch;
    });
  }
  function skip(node) {
    var p = node.parentNode;
    if (!p || p.nodeType !== 1) return true;
    var tag = p.nodeName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA" || tag === "OPTION" || tag === "SVG") return true;
    if (p.closest && p.closest("svg, textarea, select, [data-keep-emoji]")) return true;
    if (p.closest && p.closest("[onclick*='funSet']")) return true;
    return false;
  }
  function paintText(node) {
    if (skip(node)) return;
    var text = node.nodeValue;
    if (!text || text.indexOf("<") >= 0) return;
    re.lastIndex = 0;
    if (!re.test(text)) return;
    re.lastIndex = 0;
    var parent = node.parentNode;
    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var hold = document.createElement("span");
      hold.className = "i";
      hold.setAttribute("aria-hidden", "true");
      hold.innerHTML = iconHtml(m[0]);
      frag.appendChild(hold);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, node);
  }
  function paint(rootEl) {
    if (!rootEl || typeof document === "undefined") return;
    if (rootEl.nodeType === 3) { paintText(rootEl); return; }
    if (rootEl.nodeType !== 1 && rootEl !== document) return;
    var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (skip(n)) return NodeFilter.FILTER_REJECT;
        re.lastIndex = 0;
        var hit = re.test(n.nodeValue || "");
        re.lastIndex = 0;
        return hit ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var batch = [];
    while (walker.nextNode()) batch.push(walker.currentNode);
    batch.forEach(paintText);
  }

  var api = { MAP: MAP, PATHS: PATHS, svg: svg, iconHtml: iconHtml, replaceIcons: replaceIcons, paint: paint };
  root.HHQIcons = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var queued = false;
  function flush() {
    queued = false;
    try { paint(document.body); } catch (e) {}
  }
  function schedule() {
    if (queued) return;
    queued = true;
    setTimeout(flush, 30);
  }
  if (document.body) schedule();
  else document.addEventListener("DOMContentLoaded", schedule);
  var obs = new MutationObserver(schedule);
  var start = function () {
    if (!document.body) return;
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    schedule();
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})(typeof window !== "undefined" ? window : globalThis);
