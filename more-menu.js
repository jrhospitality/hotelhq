/* More is a grid of icon tiles grouped by area.
   The caller passes the screens this person can already open. This file does not
   add screens, change roles, or read another hotel's data. A tile is hidden when
   its id is not in that list. The home grid stays collapsed unless this person
   turned on "Show More expanded on home screen". */
(function (root) {
  "use strict";

  var GROUPS = [
    { id: "front_desk", en: "Front Desk", es: "Recepción", accent: "#1d4ed8", ids: ["gchat", "greq", "gi", "notes", "comp", "lf", "recs", "notice", "parking", "shut", "brief", "find"] },
    { id: "housekeeping", en: "Housekeeping", es: "Ama de llaves", accent: "#0f766e", ids: ["rooms", "myrooms", "insp", "ihg", "esc", "rushq", "check", "ckhub", "lreq", "dc", "floors"] },
    { id: "maintenance", en: "Maintenance", es: "Mantenimiento", accent: "#92400e", ids: ["wo", "pm", "equip", "pmsch", "walk", "inv", "order", "logs", "qimp", "winter"] },
    { id: "sales", en: "Sales & Events", es: "Ventas y eventos", accent: "#6d28d9", ids: ["slead", "sleads", "meetings"] },
    { id: "team", en: "Team", es: "Equipo", accent: "#166534", ids: ["team", "my", "sched", "line", "pts", "goals", "qotd", "fun", "celebr", "about", "avatar", "avcredits", "photos", "onb"] },
    { id: "admin", en: "Admin & Reports", es: "Administración y reportes", accent: "#334155", ids: ["labor", "lstd", "lplan", "lcmd", "onclock", "trreq", "fc", "health", "score", "gscores", "rev", "naudit", "gcomm", "train", "inspx", "ifix", "permits", "gmc", "rules", "crep", "audit", "alog", "settings"] }
  ];

  var ICONS = {
    home: "home", team: "users", rooms: "bed", insp: "clipboardCheck", ihg: "clipboardCheck", wo: "wrench", pm: "calendarCheck",
    equip: "hammer", pmsch: "calendar", notes: "notebook", check: "clipboardCheck", walk: "walk", inv: "package",
    order: "cart", labor: "clock", fc: "bars", gmc: "clipboardCheck", my: "check", myrooms: "bed",
    lf: "bag", esc: "flag", rules: "gear", line: "list", lreq: "inbox", shut: "bus",
    sched: "calendar", health: "activity", score: "broom", pts: "star", photos: "camera",
    qotd: "bulb", goals: "target", about: "user", fun: "spark", celebr: "spark", avatar: "user",
    avcredits: "file", comp: "mail", gi: "alert", recs: "map", rushq: "zap", brief: "newspaper",
    lplan: "calendar", lstd: "clipboard", trreq: "grad", lcmd: "bars", onclock: "clock", onb: "grad", winter: "snow",
    meetings: "calendar", alog: "list", parking: "car", slead: "handshake", sleads: "handshake",
    floors: "map", gscores: "bars", rev: "bars", gchat: "inbox", naudit: "clipboardCheck", gcomm: "mail", train: "grad", inspx: "clipboardCheck", ifix: "check", permits: "file", settings: "gear", ckhub: "clipboardCheck", greq: "bell",
    find: "search", logs: "clipboard", notice: "pin", dc: "broom", crep: "bars", audit: "eye",
    qimp: "inbox", help: "help", dbrief: "newspaper", hcmp: "building", issue: "alert"
  };

  var EXTRA = {
    snow: '<path d="M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1M2 12h20"/><path d="m8 4 4 3 4-3M8 20l4-3 4 3M4 8l3 4-3 4M20 8l-3 4 3 4"/>',
    handshake: '<path d="m11 17 2 2a2 2 0 0 0 3 0l3.5-3.5a2 2 0 0 0 0-3L16 9"/><path d="m8 14-3.5 3.5a2 2 0 0 0 0 3L8 21"/><path d="M7 14.5 3.5 11a2 2 0 0 1 0-3L7 4.5"/><path d="m14 8 3.5-3.5a2 2 0 0 1 3 0L22 6"/><path d="M8 13l3-3 5 5"/>'
  };

  function ensureIcons() {
    if (!root.HHQIcons && typeof require === "function") {
      try { require("./icons.js"); } catch (e) {}
    }
    if (root.HHQIcons && root.HHQIcons.PATHS) {
      Object.keys(EXTRA).forEach(function (name) {
        if (!root.HHQIcons.PATHS[name]) root.HHQIcons.PATHS[name] = EXTRA[name];
      });
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function langNow(lang) {
    if (lang === "es" || lang === "en") return lang;
    return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en";
  }
  function safeId(id) {
    return /^[a-z][a-z0-9_]{0,40}$/.test(String(id || "")) ? String(id) : "";
  }
  function enName(id) {
    if (typeof M !== "undefined" && M[id] && M[id][1]) return String(M[id][1]);
    return String(id || "");
  }
  function label(id, lang) {
    var en = enName(id);
    if (langNow(lang) === "es" && typeof I18N !== "undefined" && I18N.es && I18N.es[en] != null) return I18N.es[en];
    if (lang == null && typeof t === "function") return t(en);
    return en;
  }
  function iconSvg(id) {
    ensureIcons();
    var name = ICONS[id] || "list";
    if (root.HHQIcons && typeof root.HHQIcons.svg === "function") {
      return root.HHQIcons.svg(name) || root.HHQIcons.svg("list") || "";
    }
    return "";
  }
  function groupsFor(ids) {
    var allow = {};
    (ids || []).forEach(function (id) {
      if (safeId(id) && id !== "home") allow[id] = true;
    });
    var used = {};
    var out = GROUPS.map(function (group) {
      var items = group.ids.filter(function (id) {
        if (!allow[id] || used[id]) return false;
        used[id] = true;
        return true;
      });
      return { id: group.id, en: group.en, es: group.es, accent: group.accent, items: items };
    }).filter(function (group) { return group.items.length; });
    var rest = Object.keys(allow).filter(function (id) { return !used[id]; });
    if (rest.length) out.push({ id: "more", en: "More", es: "Más", accent: "#334155", items: rest });
    return out;
  }
  function bothKeys(id) {
    var en = enName(id);
    var es = (typeof I18N !== "undefined" && I18N.es && I18N.es[en]) || en;
    return (en + " " + es + " " + label(id, "en") + " " + label(id, "es")).toLowerCase();
  }
  function tileHtml(id, lang) {
    id = safeId(id);
    if (!id) return "";
    var text = label(id, lang);
    return '<button type="button" class="more-tile" data-id="' + id + '" data-k="' + esc(bothKeys(id)) + '" onclick="if(window.uxClose)uxClose();go(\'' + id + '\')"><span class="more-ic" aria-hidden="true">' + iconSvg(id) + '</span><span class="more-lb">' + esc(text) + "</span></button>";
  }
  function helpTile(lang) {
    var es = langNow(lang) === "es";
    var text = es ? "Ayuda y recorrido" : "Help & tour";
    return '<button type="button" class="more-tile" data-id="help" data-k="help tour ayuda recorrido" onclick="if(window.uxClose)uxClose();if(window.uxTour)uxTour(1)"><span class="more-ic" aria-hidden="true">' + iconSvg("help") + '</span><span class="more-lb">' + esc(text) + "</span></button>";
  }
  function groupOpen(group, es) {
    var accent = /^#[0-9a-f]{6}$/i.test(group.accent || "") ? group.accent : "#334155";
    var name = es ? group.es : group.en;
    return '<section class="more-group" data-group="' + group.id + '" style="--more-accent:' + accent + '"><h3 class="more-sec"><span class="more-dot" aria-hidden="true"></span>' + esc(name) + '</h3><div class="more-tiles">';
  }
  function gridHtml(ids, lang, opts) {
    opts = opts || {};
    var es = langNow(lang) === "es";
    var groups = groupsFor(ids);
    var admin = false;
    var html = groups.map(function (group) {
      var help = opts.help && group.id === "admin";
      if (group.id === "admin") admin = true;
      return groupOpen(group, es) +
        group.items.map(function (id) { return tileHtml(id, lang); }).join("") +
        (help ? helpTile(lang) : "") +
        "</div></section>";
    }).join("");
    if (opts.help && !admin) {
      html += groupOpen({ id: "admin", en: "Admin & Reports", es: "Administración y reportes", accent: "#334155" }, es) + helpTile(lang) + "</div></section>";
    }
    return html;
  }
  function visibleIds() {
    var ids = [];
    try {
      if (typeof root.uxAllowed === "function") ids = root.uxAllowed();
      else if (typeof rIds === "function") ids = rIds();
    } catch (e) { ids = []; }
    var seen = {};
    return (ids || []).filter(function (id) {
      if (!safeId(id) || id === "home" || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }
  function expanded() {
    try {
      if (typeof moreExpandedOf === "function") return !!moreExpandedOf(typeof meUser === "function" ? meUser() : null);
    } catch (e) {}
    return false;
  }
  function setExpanded(on) {
    if (typeof setMoreExpanded === "function") setMoreExpanded(!!on);
  }
  function settingText(lang) {
    return langNow(lang) === "es"
      ? "Mostrar Más expandido en la pantalla de inicio"
      : "Show More expanded on home screen";
  }
  function settingHtml(lang) {
    return '<label class="more-pref"><input type="checkbox" class="more-pref-input"' + (expanded() ? " checked" : "") + ' onchange="HHQMore.setExpanded(this.checked)"><span>' + esc(settingText(lang)) + "</span></label>";
  }
  function homeHtml() {
    return '<div id="moreTiles" class="more-home">' + settingHtml() + gridHtml(visibleIds(), null, { help: true }) + "</div>";
  }
  function sheetHtml() {
    var es = langNow() === "es";
    return "<h3>" + esc(es ? "Más" : "More") + "</h3>" +
      '<input id="uxMq" placeholder="' + esc(es ? "Filtrar…" : "Filter…") + '" oninput="uxFilt(this.value)">' +
      settingHtml() +
      '<div class="more-sheet-grid">' + gridHtml(visibleIds(), null, { help: true }) + "</div>";
  }
  function filter(q) {
    if (typeof document === "undefined") return;
    q = String(q || "").toLowerCase();
    var host = document.querySelector(".ux-more") || document;
    host.querySelectorAll(".more-group").forEach(function (group) {
      var shown = 0;
      group.querySelectorAll(".more-tile").forEach(function (btn) {
        var hit = !q || String(btn.getAttribute("data-k") || "").indexOf(q) >= 0;
        btn.hidden = !hit;
        if (hit) shown += 1;
      });
      group.hidden = shown === 0;
    });
  }

  var api = {
    GROUPS: GROUPS,
    groupsFor: groupsFor,
    label: label,
    iconSvg: iconSvg,
    tileHtml: tileHtml,
    htmlFor: gridHtml,
    settingText: settingText,
    settingHtml: settingHtml,
    homeHtml: homeHtml,
    sheetHtml: sheetHtml,
    expanded: expanded,
    setExpanded: setExpanded,
    filter: filter,
    visibleIds: visibleIds
  };
  root.HHQMore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  if (typeof I18N !== "undefined" && I18N.es) {
    if (!I18N.es["Sales & Events"]) I18N.es["Sales & Events"] = "Ventas y eventos";
    if (!I18N.es["Admin & Reports"]) I18N.es["Admin & Reports"] = "Administración y reportes";
    if (!I18N.es["Show More expanded on home screen"]) I18N.es["Show More expanded on home screen"] = "Mostrar Más expandido en la pantalla de inicio";
    if (!I18N.es["Help & tour"]) I18N.es["Help & tour"] = "Ayuda y recorrido";
  }

  function mountDesk() {
    var foot = document.getElementById("sbFoot");
    if (!foot) return;
    var btn = document.getElementById("uxDeskMore");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "uxDeskMore";
      btn.type = "button";
      btn.className = "btn2";
      btn.onclick = function () { if (root.uxSheet) root.uxSheet("more"); };
      foot.insertBefore(btn, foot.firstChild);
    }
    var es = langNow() === "es";
    btn.hidden = !(typeof rMode === "function" && rMode() === "desk");
    btn.innerHTML = iconSvg("menu") + "<span></span>";
    btn.querySelector("span").textContent = es ? "Más" : "More";
    btn.setAttribute("aria-label", es ? "Más" : "More");
  }

  var css = document.createElement("style");
  css.textContent = [
    ".more-pref{display:flex;align-items:flex-start;gap:10px;min-height:48px;margin:4px 0 12px;font-weight:700;line-height:1.35}",
    ".more-pref input{width:22px;height:22px;min-height:22px;margin-top:2px;flex:none}",
    ".more-sec{display:flex;align-items:center;gap:8px;margin:16px 0 8px;font-size:12px;font-weight:750;letter-spacing:.06em;text-transform:uppercase;color:#5c6570}",
    ".more-dot{width:8px;height:8px;border-radius:50%;background:var(--more-accent,#334155);flex:none}",
    ".more-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}",
    ".more-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:100%;aspect-ratio:1/1.08;min-height:124px;padding:12px 8px;border:1px solid #e6e8ee;background:#fff;color:#1c1f26;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 18px rgba(16,24,40,.04);font-size:13px;font-weight:650;line-height:1.3;text-align:center;transition:transform .16s ease,box-shadow .16s ease}",
    ".more-tile[hidden]{display:none}",
    ".more-ic{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;flex:none;background:#f4f5f7;background:color-mix(in srgb,var(--more-accent,#334155) 12%,#fff);color:var(--more-accent,#334155)}",
    ".more-ic svg,.more-ic .i{width:22px;height:22px}",
    ".more-lb{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;max-width:100%;min-height:2.5em;line-height:1.25;font-size:13px;font-weight:650;text-align:center;white-space:normal;overflow-wrap:anywhere}",
    "#uxDeskMore{width:100%;margin:0 0 8px;display:flex;align-items:center;justify-content:center;gap:8px}",
    "#uxDeskMore[hidden]{display:none}",
    "@media(min-width:1024px){",
    ".more-tiles{grid-template-columns:repeat(5,minmax(0,1fr))}",
    ".ux-more .ux-sheet{width:min(980px,100%)}",
    "}",
    "@media(min-width:1024px) and (hover:hover){.more-tile:hover{transform:translateY(-3px);box-shadow:0 10px 24px rgba(16,24,40,.1)}}",
    "@media(max-width:1023px){.more-tile:active{transform:scale(.97)}}",
    "@media(prefers-reduced-motion:reduce){.more-tile{transition:none}.more-tile:hover,.more-tile:active{transform:none}}",
    "@media(min-width:1400px){.more-tiles{grid-template-columns:repeat(6,minmax(0,1fr))}}"
  ].join("");
  document.head.appendChild(css);

  if (typeof render === "function") {
    var prev = render;
    root.render = function () {
      var result = prev.apply(this, arguments);
      try { mountDesk(); } catch (e) {}
      return result;
    };
  }
  try { mountDesk(); } catch (e2) {}
})(typeof window !== "undefined" ? window : globalThis);
