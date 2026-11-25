/* Line-icon avatars. Same stroke as the tiles, centered on a tinted badge.
   Initials are the default. Older cartoon picks map to the nearest icon. */
(function (root) {
  "use strict";

  var ACCENTS = {
    blue: "#1d4ed8",
    teal: "#0f766e",
    amber: "#b45309",
    violet: "#6d28d9",
    green: "#166534",
    slate: "#334155"
  };
  var OPTIONS = [
    { id: "initials", icon: "", accent: "slate", en: "Initials", es: "Iniciales" },
    { id: "key", icon: "key", accent: "amber", en: "Key", es: "Llave" },
    { id: "bell", icon: "bell", accent: "blue", en: "Bell", es: "Campana" },
    { id: "bed", icon: "bed", accent: "teal", en: "Bed", es: "Cama" },
    { id: "coffee", icon: "coffee", accent: "amber", en: "Coffee", es: "Café" },
    { id: "star", icon: "star", accent: "violet", en: "Star", es: "Estrella" },
    { id: "sun", icon: "sun", accent: "amber", en: "Sun", es: "Sol" },
    { id: "leaf", icon: "leaf", accent: "green", en: "Leaf", es: "Hoja" },
    { id: "wrench", icon: "wrench", accent: "slate", en: "Wrench", es: "Llave inglesa" },
    { id: "spark", icon: "spark", accent: "violet", en: "Sparkles", es: "Destellos" },
    { id: "pin", icon: "pin", accent: "blue", en: "Map pin", es: "Pin de mapa" },
    { id: "heart", icon: "heart", accent: "violet", en: "Heart", es: "Corazón" },
    { id: "briefcase", icon: "briefcase", accent: "slate", en: "Briefcase", es: "Maletín" },
    { id: "clock", icon: "clock", accent: "blue", en: "Clock", es: "Reloj" },
    { id: "clipboard", icon: "clipboard", accent: "teal", en: "Clipboard", es: "Portapapeles" },
    { id: "users", icon: "users", accent: "green", en: "Team", es: "Equipo" }
  ];
  var BY_ID = {};
  OPTIONS.forEach(function (opt) { BY_ID[opt.id] = opt; });
  var ROLE_ICON = {
    hk: "bed", hp: "pin", ld: "spark", sup: "briefcase", mt: "wrench", mtt: "wrench",
    fd: "bell", na: "star", bk: "coffee", bar: "coffee", drv: "pin", gm: "briefcase",
    agm: "key", sales: "briefcase"
  };
  var PIN_ICON = {
    star: "star", heart: "heart", sparkle: "spark", wrench: "wrench", trophy: "star",
    flame: "sun", clock: "clock", shine: "spark", crown: "star"
  };
  var STYLE_ICON = { bottts: "wrench", "bottts-neutral": "wrench", shapes: "spark", glass: "spark", "fun-emoji": "star" };

  function choiceOf(id) {
    return BY_ID[id] || BY_ID.initials;
  }
  function mapChoice(saved) {
    if (saved == null || saved === "") return { icon: "initials", accent: "" };
    if (typeof saved === "number" || typeof saved === "boolean") return { icon: "initials", accent: "" };
    if (typeof saved === "string") {
      var text = saved.trim();
      if (!text || /^https?:/i.test(text) || text.indexOf("data:") === 0 || text.indexOf("<") >= 0) return { icon: "initials", accent: "" };
      if (BY_ID[text]) return { icon: text, accent: BY_ID[text].accent };
      var mapped = PIN_ICON[text] || STYLE_ICON[text] || ROLE_ICON[text];
      if (mapped) return { icon: mapped, accent: choiceOf(mapped).accent };
      return { icon: "initials", accent: "" };
    }
    if (typeof saved !== "object") return { icon: "initials", accent: "" };
    if (saved.v === 2 && (saved.icon === "initials" || BY_ID[saved.icon])) {
      var keep = choiceOf(saved.icon);
      return { icon: keep.id, accent: saved.icon === "initials" ? "" : (ACCENTS[saved.accent] ? saved.accent : keep.accent) };
    }
    if (saved.v === 2) return { icon: "initials", accent: "" };
    var icon = PIN_ICON[saved.pin] || ROLE_ICON[saved.role] || STYLE_ICON[saved.style] || "initials";
    return { icon: icon, accent: icon === "initials" ? "" : choiceOf(icon).accent };
  }
  function accentFor(name) {
    var keys = Object.keys(ACCENTS);
    var hash = 0;
    var text = String(name || "");
    for (var i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return keys[hash % keys.length];
  }
  function initialsOf(name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    var a = (parts[0] || "?").charAt(0);
    var b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (a + b).toUpperCase();
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function iconSvg(name, size) {
    if (!name || !root.HHQIcons || !HHQIcons.svg) return "";
    return HHQIcons.svg(name).replace('width="1em"', 'width="' + size + '"').replace('height="1em"', 'height="' + size + '"');
  }
  function badgeHtml(choice, name, size) {
    var picked = mapChoice(choice && choice.icon ? choice : { icon: "initials" });
    if (choice && choice.icon) picked = mapChoice(choice.icon === "initials" || BY_ID[choice.icon] ? { v: 2, icon: choice.icon, accent: choice.accent } : choice.icon);
    size = Math.max(24, Math.min(96, Number(size) || 36));
    var icon = picked.icon === "initials" ? "" : iconSvg(picked.icon, Math.round(size * 0.52));
    if (!icon) picked = { icon: "initials", accent: "" };
    var accent = picked.icon === "initials" || !ACCENTS[picked.accent] ? accentFor(name) : picked.accent;
    var color = ACCENTS[accent] || ACCENTS.slate;
    var radius = size >= 48 ? 14 : 10;
    var inner = icon || ('<b style="font-size:' + Math.round(size * 0.36) + 'px;letter-spacing:-.03em">' + esc(initialsOf(name)) + "</b>");
    return '<span class="hhq-av" role="img" aria-label="' + esc(initialsOf(name)) + '" style="width:' + size + "px;height:" + size + "px;border-radius:" + radius + "px;background:color-mix(in srgb," + color + " 14%,#fff);color:" + color + '">' + inner + "</span>";
  }
  function pack(choice, previous) {
    var icon = choiceOf(choice && choice.icon).id;
    var accent = icon === "initials" ? "" : choiceOf(icon).accent;
    var next = { v: 2, icon: icon, accent: accent };
    if (previous && previous.v !== 2) next.legacy = previous;
    else if (previous && previous.legacy) next.legacy = previous.legacy;
    return next;
  }
  function commitSave(opts) {
    opts = opts || {};
    var prev;
    try { prev = opts.read ? opts.read() : null; } catch (e) { prev = null; }
    try {
      if (opts.write) opts.write(opts.next);
    } catch (writeErr) {
      return Promise.resolve({ ok: false, error: "local", rolledBack: false });
    }
    if (!opts.remote) return Promise.resolve({ ok: true, stored: opts.next });
    var tries = opts.attempts || 3;
    var attempt = 0;
    function run() {
      return Promise.resolve().then(function () { return opts.remote(opts.next); }).then(function () {
        return { ok: true, stored: opts.next };
      }, function () {
        attempt += 1;
        if (attempt >= tries) {
          try { if (opts.write) opts.write(prev); } catch (e2) {}
          return { ok: false, error: "save", rolledBack: true };
        }
        var pause = opts.wait ? opts.wait(attempt) : null;
        return Promise.resolve(pause).then(run);
      });
    }
    return run();
  }

  var api = {
    ACCENTS: ACCENTS,
    OPTIONS: OPTIONS,
    mapChoice: mapChoice,
    accentFor: accentFor,
    initialsOf: initialsOf,
    badgeHtml: badgeHtml,
    pack: pack,
    commitSave: commitSave
  };
  root.HHQAv = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function keyFor(id) { return "jravatar_" + (id || "x"); }
  function readRaw(id) {
    try { return JSON.parse(localStorage.getItem(keyFor(id)) || "null"); } catch (e) { return null; }
  }
  function userByName(name) {
    if (!name || typeof USERS === "undefined") return null;
    var exact = null;
    var loose = null;
    USERS.forEach(function (user) {
      if (!user || !user.name) return;
      if (user.name === name) exact = user;
      else if (!loose && user.name.indexOf(name) === 0) loose = user;
    });
    return exact || loose;
  }
  function storedChoice(id, profile) {
    var raw = readRaw(id);
    if (raw) return mapChoice(raw);
    if (profile) return mapChoice(profile);
    return { icon: "initials", accent: "" };
  }
  function mineChoice() {
    var me = typeof meUser === "function" ? meUser() : null;
    return storedChoice(me && me.id, me && me.avatar);
  }
  function html(name, size, cfg) {
    var choice;
    var label = name;
    if (cfg) choice = mapChoice(cfg);
    else if (name) {
      var user = userByName(name);
      choice = user ? storedChoice(user.id, user.avatar) : { icon: "initials", accent: "" };
      label = user ? user.name : name;
    } else {
      var me = typeof meUser === "function" ? meUser() : null;
      choice = mineChoice();
      label = me && me.name;
    }
    return badgeHtml(choice, label, size);
  }
  api.html = html;
  root.avHTML = html;
  root.initialsHTML = function (name, size) { return badgeHtml({ icon: "initials", accent: "slate" }, name, size); };
  root.avConfig = function (name) {
    if (name) {
      var user = userByName(name);
      return user ? Object.assign({ v: 2 }, storedChoice(user.id)) : { v: 2, icon: "initials", accent: "slate" };
    }
    return Object.assign({ v: 2 }, mineChoice());
  };

  var draft = null;
  var dirty = false;
  var saveError = "";
  function pickerHtml() {
    var me = typeof meUser === "function" ? meUser() : null;
    if (!dirty) draft = Object.assign({ v: 2 }, mineChoice());
    var name = me && me.name;
    var buttons = OPTIONS.map(function (opt) {
      var on = draft.icon === opt.id;
      return '<button type="button" role="radio" class="av-opt' + (on ? " on" : "") + '" onclick="HHQAvPick(\'' + opt.id + '\')" aria-checked="' + on + '" aria-label="' + esc(L(opt.en, opt.es)) + '">' +
        badgeHtml(opt, name, 56) + "<small>" + esc(L(opt.en, opt.es)) + "</small></button>";
    }).join("");
    var err = saveError ? '<p class="av-err" role="alert">' + esc(L("Could not save your avatar. It was not changed. Try again.", "No se pudo guardar tu avatar. No cambió. Inténtalo de nuevo.")) + "</p>" : "";
    return '<div class="hhq-av-pick" id="hhqAvPick"><h2>' + esc(L("Avatar", "Avatar")) + "</h2>" +
      '<div class="card av-now">' + badgeHtml(draft, name, 72) + "<div><b>" + esc(name || "") + "</b><br><small>" + esc(L("Choose a badge. Initials are the default.", "Elige una insignia. Las iniciales son el predeterminado.")) + "</small></div></div>" +
      '<div class="av-grid" role="radiogroup" aria-label="' + esc(L("Avatar", "Avatar")) + '">' + buttons + "</div>" +
      err +
      '<button type="button" class="btn" style="width:100%;margin-top:12px" onclick="HHQAvSave()">' + esc(L("Save", "Guardar")) + "</button></div>";
  }
  root.HHQAvPick = function (id) {
    if (!BY_ID[id]) return;
    dirty = true;
    draft = { v: 2, icon: id, accent: BY_ID[id].accent };
    if (typeof render === "function") render();
  };
  function writeRaw(id, value) {
    var key = keyFor(id);
    if (value == null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  }
  root.HHQAvSave = function () {
    var me = typeof meUser === "function" ? meUser() : null;
    if (!me || !draft) return;
    var next = pack(draft, readRaw(me.id));
    var remote = null;
    if (typeof useRemote === "function" && useRemote() && root.sb && sb.rpc) {
      remote = function (payload) {
        return sb.rpc("set_my_avatar", { p: payload }).then(function (res) {
          if (res && res.error) throw res.error;
        });
      };
    }
    commitSave({
      next: next,
      read: function () { return readRaw(me.id); },
      write: function (value) {
        writeRaw(me.id, value);
        me.avatar = value;
      },
      remote: remote,
      attempts: 3,
      wait: function (n) { return new Promise(function (resolve) { setTimeout(resolve, 200 * n); }); }
    }).then(function (result) {
      if (!result.ok) {
        saveError = result.error || "save";
        dirty = false;
        draft = Object.assign({ v: 2 }, mineChoice());
        if (typeof render === "function") render();
        return;
      }
      saveError = "";
      dirty = false;
      draft = null;
      if (typeof go === "function") go("home");
      else if (typeof render === "function") render();
    });
  };
  api.remember = function (id, raw) {
    if (!id || raw == null) return;
    try { writeRaw(id, raw); } catch (e) {}
  };
  if (typeof V !== "undefined") {
    V.avatar = pickerHtml;
    if (typeof M !== "undefined" && M.avatar) M.avatar[1] = "Avatar";
  }
  if (typeof I18N !== "undefined" && I18N.es) I18N.es.Avatar = "Avatar";

  function pointsTotal() {
    try {
      if (typeof ptsTotal === "function") {
        var n = ptsTotal();
        return n == null || !isFinite(Number(n)) ? null : Number(n);
      }
    } catch (e) {}
    return null;
  }
  function chromeHtml() {
    var me = typeof meUser === "function" ? meUser() : null;
    if (!me) return "";
    var pts = pointsTotal();
    var ptsBtn = pts == null ? "" : '<button type="button" class="hhq-pts-badge" onclick="go(\'pts\')" aria-label="' + esc(L("Points & Rewards", "Puntos y premios")) + '">' +
      iconSvg("star", 16) + "<b>" + esc(String(pts)) + "</b></button>";
    return '<span class="hhq-you">' +
      '<button type="button" class="hhq-av-btn" onclick="go(\'avatar\')" aria-label="' + esc(L("Avatar", "Avatar")) + '">' + html(null, 36) + "</button>" +
      ptsBtn + "</span>";
  }
  function paintChrome() {
    var me = typeof meUser === "function" ? meUser() : null;
    ["hav", "sav"].forEach(function (id) {
      var node = document.getElementById(id);
      if (!me && node) node.remove();
    });
    if (!me) return;
    var htmlYou = chromeHtml();
    var bar = document.getElementById("hbar");
    var hbt = document.getElementById("hbt");
    if (bar && hbt) {
      var slot = document.getElementById("hav");
      if (!slot) {
        slot = document.createElement("span");
        slot.id = "hav";
        bar.insertBefore(slot, hbt);
      }
      slot.innerHTML = htmlYou;
    }
    var side = document.querySelector("#side .sb-top");
    if (side) {
      var sideSlot = document.getElementById("sav");
      if (!sideSlot) {
        sideSlot = document.createElement("div");
        sideSlot.id = "sav";
        var name = document.getElementById("hname2") || side;
        side.insertBefore(sideSlot, name);
      }
      sideSlot.innerHTML = htmlYou;
    }
  }
  if (typeof render === "function") {
    var prev = render;
    root.render = function () {
      try { if (typeof S !== "undefined" && S.tab !== "avatar") dirty = false; } catch (e0) {}
    var out = prev.apply(this, arguments);
      try { paintChrome(); } catch (e) {}
      return out;
    };
  }

  var css = document.createElement("style");
  css.textContent = [
    ".hhq-av{display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box;line-height:0}",
    ".hhq-av svg{width:52%;height:52%;display:block}",
    ".hhq-you{display:inline-flex;align-items:center;gap:6px;flex:none}",
    ".hhq-av-btn{padding:0;border:0;background:transparent;min-width:44px;min-height:44px;width:44px;border-radius:12px}",
    ".hhq-pts-badge{display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:0 10px;border-radius:999px;border:1px solid #e6e8ee;background:#fff;color:#1c1f26;font-weight:750}",
    ".hhq-pts-badge svg{width:16px;height:16px;color:#b45309}",
    "#hbar .hhq-you{margin-right:4px}",
    "#sav{padding:0 12px 8px}",
    "#sav .hhq-you{width:100%}",
    ".av-now{display:flex;align-items:center;gap:12px}",
    ".av-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}",
    ".av-opt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px 4px;border:1px solid #e6e8ee;border-radius:14px;background:#fff;min-height:96px;min-width:44px}",
    ".av-opt.on{border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.18)}",
    ".av-opt:focus-visible,.hhq-av-btn:focus-visible,.hhq-pts-badge:focus-visible{outline:3px solid #1d4ed8;outline-offset:2px}",
    ".av-err{color:#9a3412;font-weight:750;margin:8px 0 0}",
    ".hhq-asg{display:inline-flex;align-items:center;gap:6px}",
    ".av-opt small{font-size:11px;font-weight:700;line-height:1.2;text-align:center}",
    "#qotd.card{background:#fff;border:1px solid #e6e8ee}",
    "#hhqPts .card{background:#fff}",
    "#hhqPts .card[onclick]{background:#fff!important;border:1px solid #e6e8ee;box-shadow:0 1px 2px rgba(16,24,40,.04)}",
    "#hhqPts table{width:100%}",
    "#hhqPts button{border-radius:10px}",
    "#hhqPts .card>b{display:block;margin-bottom:6px}",
    "@media(max-width:767px){.av-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}",
    "@media(prefers-reduced-motion:reduce){#qotd *,#ptsToast,.hhq-pts-badge{animation:none!important;transition:none!important}}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
