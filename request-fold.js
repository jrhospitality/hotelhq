/* Folds housekeeping "report issue" and "request supplies" into New request.
   Work orders already go through that button. Key sign-outs stay visible and
   are an activity-log type. Old work orders, orders, and key rows are not removed. */
(function (root) {
  "use strict";

  function L(en, es) {
    return (typeof LANG !== "undefined" && LANG === "es") ? es : en;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function foldKind(kind) {
    if (kind === "issue" || kind === "report_issue") return "work_order";
    if (kind === "supply" || kind === "supplies") return "supplies";
    return kind || "work_order";
  }
  function applyFold(state, form) {
    state = state || {};
    form = form || {};
    var kind = foldKind(form.kind);
    var wo = (state.wo || []).slice();
    var orders = (state.orders || []).slice();
    var extra = (state.opsExtra || []).slice();
    var kl = state.kl || {};
    if (kind === "work_order") {
      wo.unshift({ id: wo.length + 1, room: form.room || "-", t: form.note || "", p: "Med", s: "Open", photo: "" });
      extra.unshift({ kind: "work_order", dept: "maintenance", room: form.room || "", title: form.note || "", status: "open" });
    } else if (kind === "supplies") {
      orders.unshift({ at: form.at || "", st: "Pending GM approval", items: form.note || "" });
      extra.unshift({ kind: "supplies", dept: "housekeeping", room: form.room || "", title: form.note || "", status: "open" });
    }
    return { wo: wo, orders: orders, opsExtra: extra, kl: kl };
  }

  var api = { foldKind: foldKind, applyFold: applyFold };
  root.HHQFold = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function openAs(kind, area) {
    S.nrf = S.nrf || {};
    S.nrf.kind = foldKind(kind);
    if (area) S.nrf.room = area;
    S.opsOpen = 1;
    if (root.HQ && root.HQ.open) root.HQ.open();
    else if (typeof render === "function") render();
  }
  root.HQFold = { open: openAs };

  function launch(kind, area) {
    var arg = JSON.stringify(area || "");
    return '<div class="card" id="foldLaunch"><button type="button" class="btn" style="width:100%" onclick=\'HQFold.open(' + JSON.stringify(foldKind(kind)) + ',' + arg + ')\'>' + esc(L("New request", "Nueva solicitud")) + "</button></div>";
  }

  if (typeof root.issBox === "function" || typeof issBox !== "undefined") {
    root.issBox = function (area) { return launch("issue", area); };
  }
  if (typeof root.supBox === "function" || typeof supBox !== "undefined") {
    root.supBox = function () { return launch("supplies", ""); };
  }
  if (typeof root.myRoomsPage === "function") {
    var prevRooms = root.myRoomsPage;
    root.myRoomsPage = function () {
      return String(prevRooms.apply(this, arguments) || "").replace(/<div class="card"><h3>Report issue[\s\S]*$/, launch("issue", ""));
    };
  }
  if (typeof V !== "undefined" && typeof V.wo === "function") {
    var prevWo = V.wo;
    V.wo = function () {
      return String(prevWo.apply(this, arguments) || "").replace(/<div class="card"><h3>New work order<\/h3>[\s\S]*?onclick="addW\(\)">[\s\S]*?<\/button><\/div>/, launch("issue", ""));
    };
  }
  if (typeof root.uxSheet === "function") {
    var prevSheet = root.uxSheet;
    root.uxSheet = function (kind) {
      if (kind === "wo") return openAs("issue", "");
      if (kind === "help") return openAs("houseperson_help", "");
      return prevSheet.apply(this, arguments);
    };
  }
  if (root.HQ && typeof root.HQ.send === "function") {
    var prevSend = root.HQ.send;
    root.HQ.send = function () {
      var f = S.nrf || {};
      if (foldKind(f.kind) === "supplies") {
        var note = f.note || "";
        try {
          var el = document.getElementById("opsNote");
          var room = document.getElementById("opsRoom");
          if (el) note = el.value.trim();
          if (room) f.room = room.value.trim();
        } catch (e) {}
        if (!note) {
          var err = document.getElementById("opsErr");
          if (err) err.textContent = L("Add what you need.", "Agrega lo que necesitas.");
          return;
        }
        if (typeof reqSup === "function") reqSup(note);
        var next = applyFold(D(), { kind: "supplies", note: note, room: f.room || "" });
        D().opsExtra = next.opsExtra;
        if (typeof save === "function") save();
        S.opsOpen = 0;
        try { showToast(L("Supply request sent", "Pedido de insumos enviado")); } catch (e2) {}
        if (typeof render === "function") render();
        return;
      }
      if (f.kind === "issue" || f.kind === "report_issue") f.kind = "work_order";
      return prevSend.apply(this, arguments);
    };
  }
  if (typeof root.render === "function") {
    var prevRender = root.render;
    root.render = function () {
      var out = prevRender.apply(this, arguments);
      try {
        var chips = document.querySelector("#opsSheet .chips");
        if (chips && !chips.querySelector("[data-fold='supplies']")) {
          var b = document.createElement("button");
          b.type = "button";
          b.dataset.fold = "supplies";
          b.className = "chip" + (S.nrf && foldKind(S.nrf.kind) === "supplies" ? " on" : "");
          b.textContent = L("Supplies", "Insumos");
          b.onclick = function () { if (root.HQ && root.HQ.pick) root.HQ.pick("kind", "supplies"); else { S.nrf.kind = "supplies"; render(); } };
          chips.appendChild(b);
        }
      } catch (e) {}
      return out;
    };
  }
  if (typeof root.keyLogCard === "function") {
    var prevKey = root.keyLogCard;
    root.keyLogCard = function () {
      var html = prevKey.apply(this, arguments) || "";
      if (!html) return html;
      var link = '<p><button type="button" class="btn2" onclick="go(\'alog\')">' + esc(L("Key sign-outs in the activity log", "Entregas de llaves en la bitácora")) + "</button></p>";
      return html.replace("</h3>", "</h3>" + link);
    };
  }
  try { if (typeof meUser === "function" && meUser()) render(); } catch (e) {}
})(typeof window !== "undefined" ? window : globalThis);
