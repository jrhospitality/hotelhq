/* Shift notes on the home screen for front desk and assistant managers.
   Reads are stored per person. Demo mode keeps them on this device.
   Live mode also records them with ack_my_shift_notes. */
(function (root) {
  "use strict";

  function noteId(note, index) {
    if (note && note.id) return String(note.id);
    return "n" + index + "_" + String((note && note.at) || "").replace(/\W/g, "");
  }
  function firstLine(text) {
    return String(text || "").split(/\n/)[0].replace(/\s+/g, " ").trim().slice(0, 140);
  }
  function model(notes, readMap, limit) {
    readMap = readMap || {};
    var rows = (notes || []).map(function (note, index) {
      var id = noteId(note, index);
      return {
        id: id,
        role: note.role || note.sh || "",
        by: note.by || "",
        time: note.at || "",
        line: firstLine(note.t || note.text || ""),
        unread: !readMap[id]
      };
    }).filter(function (row) { return row.line || row.time; });
    var unread = rows.filter(function (row) { return row.unread; }).length;
    return { rows: rows.slice(0, limit || 3), unread: unread, total: rows.length, empty: rows.length === 0 };
  }

  var api = { noteId: noteId, firstLine: firstLine, model: model, unreadCount: function () { return 0; } };
  root.HHQNotes = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  var KEY = "jrportal_note_reads_v1";
  function L(en, es) { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid() {
    try { return (meUser() && meUser().id) || S.uid || ""; } catch (e) { return ""; }
  }
  function roleNow() {
    try { return authRole() || ""; } catch (e) { return ""; }
  }
  function showFor() {
    var role = roleNow();
    return role === "Front Desk" || role === "AGM";
  }
  function bag() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function readMap() {
    var all = bag();
    return all[uid()] || {};
  }
  function notesNow() {
    var hotel = "";
    try { hotel = (meUser() && meUser().hotel) || S.hotel || ""; } catch (e) { hotel = ""; }
    var rows = [];
    try { rows = (D().notes || []).slice(); } catch (e2) { rows = []; }
    return rows.map(function (note) {
      var copy = {};
      Object.keys(note || {}).forEach(function (k) { copy[k] = note[k]; });
      if (!copy.role) copy.role = roleFor(copy.by) || copy.sh || "";
      copy.hotel = hotel;
      return copy;
    });
  }
  function roleFor(name) {
    var first = String(name || "").split(" ")[0];
    if (!first || typeof USERS === "undefined") return "";
    var hit = USERS.filter(function (user) { return user && String(user.name || "").indexOf(first) === 0; })[0];
    return hit ? (hit.role || "") : "";
  }
  function current() { return model(notesNow(), readMap(), 3); }
  api.unreadCount = function () {
    if (!showFor()) return 0;
    return current().unread;
  };
  function saveReads(map) {
    var all = bag();
    all[uid()] = map;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
    if (typeof useRemote === "function" && useRemote() && typeof sb !== "undefined" && sb) {
      sb.rpc("ack_my_shift_notes", { p_keys: Object.keys(map) }).then(function () {}, function () {});
    }
  }
  root.HHQNotesRead = function () {
    var map = readMap();
    notesNow().forEach(function (note, index) { map[noteId(note, index)] = new Date().toISOString(); });
    saveReads(map);
    if (typeof render === "function") render();
  };
  function homeHtml() {
    if (!showFor()) return "";
    var view = current();
    if (view.empty) return "";
    var banner = view.unread
      ? '<p class="sn-banner" id="snBanner">' + esc(view.unread + " " + L("unread shift notes", "notas de turno sin leer")) + "</p>"
      : "";
    var rows = view.rows.map(function (row) {
      var who = row.by || row.role || L("Staff", "Personal");
      var face = (window.HHQAv && HHQAv.html) ? HHQAv.html(row.by || who, 28) : "";
      return '<li class="' + (row.unread ? "sn-new" : "") + '"><span class="sn-by">' + face + "<b>" + esc(who) + "</b></span> <small>" + esc(row.time) + "</small><span>" + esc(row.line) + "</span></li>";
    }).join("");
    return '<section class="hhq-notes" id="hhqNotes"><div class="sn-hd"><h3>' + esc(L("Shift Notes", "Notas de turno")) + "</h3>" +
      (view.unread ? '<span class="qt-badge">' + view.unread + "</span>" : "") + "</div>" + banner +
      "<ul>" + rows + "</ul><div class=\"sn-actions\"><button type=\"button\" class=\"btn2\" onclick=\"HHQNotesRead()\">" + esc(L("Mark read", "Marcar leídas")) +
      '</button><button type="button" class="btn" onclick="go(\'notes\')">' + esc(L("Add note", "Agregar nota")) + "</button></div></section>";
  }
  api.homeHtml = homeHtml;

  var css = document.createElement("style");
  css.textContent = ".hhq-notes{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:12px;margin:0 0 12px}.sn-hd{display:flex;align-items:center;gap:8px}.sn-hd h3{margin:0}.sn-banner{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:8px 10px;font-weight:750;color:#9a3412;margin:8px 0}.hhq-notes ul{list-style:none;margin:8px 0;padding:0}.hhq-notes li{padding:8px 0;border-bottom:1px solid #e6e8ee}.hhq-notes li span{display:block}.sn-by{display:flex;align-items:center;gap:8px}.hhq-notes small{color:#5c6570;font-weight:650}.sn-new b{color:#9a3412}.sn-actions{display:flex;gap:8px}.sn-actions button{flex:1}.qt-badge{display:inline-flex;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#b42318;color:#fff;font-size:12px;font-weight:800;align-items:center;justify-content:center}.more-ic{position:relative}.more-ic .qt-badge{position:absolute;top:-6px;right:-8px}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
