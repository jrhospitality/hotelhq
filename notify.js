/* One reminder helper for in-app, push, and scheduled reminders.
   Demo mode keeps the rows on this device. Live mode writes public.reminders.
   The migration is in the repo and is not applied from here. */
(function (root) {
  "use strict";

  var CHANNELS = ["in_app", "push", "scheduled"];

  function L(en, es) {
    return (typeof LANG !== "undefined" && LANG === "es") ? (es || en) : en;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function text(v, lang) {
    if (v && typeof v === "object") return lang === "es" ? (v.es || v.en || "") : (v.en || v.es || "");
    return v == null ? "" : String(v);
  }
  function remind(input) {
    input = input || {};
    var channel = CHANNELS.indexOf(input.channel) >= 0 ? input.channel : "in_app";
    return {
      hotel: input.hotel || "",
      channel: channel,
      role: input.role || "",
      kind: input.kind || "",
      title_en: text(input.title, "en"),
      title_es: text(input.title, "es") || text(input.title, "en"),
      body_en: text(input.body, "en"),
      body_es: text(input.body, "es") || text(input.body, "en"),
      due_at: input.due || input.due_at || new Date().toISOString(),
      read_at: input.read_at || null,
      sent_at: null
    };
  }
  function due(rows, now) {
    var t = now ? new Date(now).getTime() : Date.now();
    return (rows || []).filter(function (r) {
      if (!r || r.read_at) return false;
      var at = new Date(r.due_at).getTime();
      return !isNaN(at) && at <= t;
    }).sort(function (a, b) { return String(a.due_at).localeCompare(String(b.due_at)); });
  }

  var api = { CHANNELS: CHANNELS, remind: remind, due: due, text: text };
  root.HHQNotify = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function bag() {
    S.reminders = S.reminders || [];
    if (!S.reminders.length && !(typeof useRemote === "function" && useRemote())) {
      S.reminders.push(remind({
        hotel: S.hotel,
        channel: "scheduled",
        kind: "example",
        title: { en: "Example reminder", es: "Recordatorio de ejemplo" },
        body: { en: "This stays on this device until sign-in.", es: "Esto se queda en este dispositivo hasta el inicio de sesión." },
        due: new Date(Date.now() - 60000).toISOString()
      }));
    }
    return S.reminders;
  }
  function remoteOn() {
    return typeof useRemote === "function" && !!useRemote() && root.sb;
  }
  api.post = function (input) {
    var row = remind(Object.assign({ hotel: typeof S !== "undefined" ? S.hotel : "" }, input));
    bag().unshift(row);
    if (typeof save === "function") save();
    if (remoteOn()) {
      root.sb.from("reminders").insert({
        hotel: row.hotel, channel: row.channel, role: row.role || null, kind: row.kind,
        title_en: row.title_en, title_es: row.title_es, body_en: row.body_en, body_es: row.body_es,
        due_at: row.due_at
      }).then(function () {}, function () {});
    }
    return row;
  };
  api.markRead = function (i) {
    var row = bag()[i];
    if (!row) return;
    row.read_at = new Date().toISOString();
    if (typeof save === "function") save();
    if (typeof render === "function") render();
  };
  function deliverPush(row) {
    try {
      if (typeof Notification === "function" && Notification.permission === "granted") {
        new Notification(L(row.title_en, row.title_es), { body: L(row.body_en, row.body_es) });
        row.sent_at = new Date().toISOString();
      }
    } catch (e) {}
  }
  api.tick = function () {
    due(bag()).forEach(function (row) {
      if (row.channel === "push" || row.channel === "scheduled") deliverPush(row);
    });
  };
  function card() {
    var rows = due(bag());
    if (!rows.length) return "";
    var body = rows.slice(0, 3).map(function (r, i) {
      return '<div class="li"><span style="flex:1"><b>' + esc(L(r.title_en, r.title_es)) + "</b><br><small>" + esc(L(r.body_en, r.body_es)) + "</small></span><button type=\"button\" class=\"btn2\" onclick=\"HHQNotify.markRead(" + i + ")\">" + esc(L("Done", "Listo")) + "</button></div>";
    }).join("");
    return '<div class="card" id="reminders"><h3>' + esc(L("Reminders", "Recordatorios")) + "</h3>" + body + "</div>";
  }
  if (typeof V !== "undefined" && V.home) {
    var prev = V.home;
    V.home = function () { return card() + prev.apply(this, arguments); };
  }
  if (typeof root.notifyRoles === "function") {
    var prevNotify = root.notifyRoles;
    root.notifyRoles = function (title, body, roles, extra) {
      var out = prevNotify.apply(this, arguments);
      (roles || []).forEach(function (r) {
        api.post({ channel: "in_app", role: r, title: { en: title, es: title }, body: { en: body, es: body }, kind: (extra && extra.kind) || "" });
      });
      return out;
    };
  }
  setInterval(function () { try { api.tick(); } catch (e) {} }, 60000);
  try { api.tick(); if (typeof meUser === "function" && meUser() && S.tab === "home") render(); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
