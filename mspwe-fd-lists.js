/* Golden Valley front desk checklists are Larry's lists (templates 8, 9, 10).
   The built-in Quore front desk lists stay hidden at MSPWE. Each person sees
   only the list assigned to them that day. Other hotels and departments are
   unchanged: their shared Quore lists are not daily assignments. */
(function (root) {
  "use strict";

  var IDS = { AM: 8, PM: 9, "Night Audit": 10 };
  var OLD_NAMES = [
    "1st Shift - AM Check list",
    "2nd Shift - PM checklist",
    "3rd Shift - Night Audit Checklist"
  ];

  function lists() {
    return root.MSPWE_FD_LISTS || [];
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function normDept(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  }
  function isFrontDeskList(list) {
    if (!list) return false;
    if (OLD_NAMES.indexOf(list.name) >= 0) return true;
    var role = normDept(list.role || list.def);
    return role === "front_desk";
  }
  function byShift(shift) {
    return lists().filter(function (list) { return list.shift === shift; })[0] || null;
  }
  function byId(id) {
    var n = Number(id);
    return lists().filter(function (list) { return list.id === n; })[0] || null;
  }
  function today() {
    try { if (typeof ld === "function") return ld(); } catch (e) {}
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function viewerNow() {
    var user = null;
    try { user = typeof meUser === "function" ? meUser() : null; } catch (e) { user = null; }
    if (!user) return { id: "", name: "", role: "", hotel: "" };
    var hotel = "";
    try { hotel = (typeof S !== "undefined" && S.hotel) || user.hotel || ""; } catch (e2) { hotel = user.hotel || ""; }
    return { id: user.user_id || user.id || "", name: user.name || "", role: user.role || "", hotel: hotel };
  }
  function assignedShift(viewer) {
    viewer = viewer || {};
    var DA = root.DailyAssign;
    if (DA && DA.mineShift) {
      var cached = DA.mineShift(viewer);
      if (cached) return cached;
    }
    var SP = root.ShiftPick;
    var day = today();
    if (SP && SP.liveAnswer) {
      var live = SP.liveAnswer(viewer, day);
      if (live) return live;
    }
    if (SP && SP.answerOf && (!SP.isDemo || SP.isDemo())) {
      var picked = SP.answerOf(viewer, day);
      if (picked) return picked;
    }
    if (DA && DA.plan && DA.exampleInput && (!SP || !SP.isDemo || SP.isDemo())) {
      var input = DA.exampleInput(day);
      if (SP && SP.demoInput) input = SP.demoInput(input, viewer, day);
      var row = DA.plan(input).filter(function (item) {
        return item.employee === viewer.id && item.department === "front_desk" && item.kind === "checklist";
      })[0];
      if (row) return row.shift;
    }
    return "";
  }
  function assignedId(viewer) {
    return IDS[assignedShift(viewer)] || 0;
  }
  function forViewer(viewer) {
    var list = byId(assignedId(viewer));
    return list ? [list] : [];
  }
  function showLiveList(list, viewer) {
    if (!list) return false;
    var dept = normDept(list.department);
    if (dept !== "front_desk") return true;
    var id = Number(list.id);
    if (id !== 8 && id !== 9 && id !== 10) return false;
    return id === assignedId(viewer || {});
  }
  function keepItem(item, hotel) {
    if (hotel !== "MSPWE" || !item) return true;
    if (normDept(item.def) === "front_desk") return false;
    if (OLD_NAMES.indexOf(item.grp) >= 0) return false;
    return true;
  }
  function cardHtml(list, lang) {
    if (!list) return "";
    var es = lang === "es";
    var title = es ? list.name_es : list.name_en;
    var rows = (list.items || []).map(function (item, i) {
      if (item && item.type === "amount" && root.DrawerCount && root.DrawerCount.checklistRow) {
        return root.DrawerCount.checklistRow({ id: list.id, shift: list.shift }, item, i);
      }
      return "<label class=\"li\"><span>" + esc(es ? item.es : item.en) + "</span></label>";
    }).join("");
    return "<div class=\"card\" id=\"mspweFdList\"><h3>" + esc(title) + "</h3>" + rows + "</div>";
  }

  var api = {
    IDS: IDS,
    OLD_NAMES: OLD_NAMES,
    lists: lists,
    byShift: byShift,
    byId: byId,
    isFrontDeskList: isFrontDeskList,
    assignedShift: assignedShift,
    assignedId: assignedId,
    forViewer: forViewer,
    showLiveList: showLiveList,
    keepItem: keepItem,
    cardHtml: cardHtml
  };
  root.MspweFdLists = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  function stripBuiltIn() {
    var quore = root.QUORE;
    if (!quore || !quore.lists || !quore.lists.MSPWE) return;
    quore.lists.MSPWE = quore.lists.MSPWE.filter(function (list) { return !isFrontDeskList(list); });
  }
  stripBuiltIn();
  if (typeof ITEMS === "function") {
    var prevItems = ITEMS;
    ITEMS = function () {
      var hotel = typeof S !== "undefined" ? S.hotel : "";
      return prevItems().filter(function (item) { return keepItem(item, hotel); });
    };
  }
  if (typeof sbCheckCard === "function") {
    var prevCard = sbCheckCard;
    sbCheckCard = function () {
      if (typeof S === "undefined" || S.hotel !== "MSPWE" || typeof D !== "function") return prevCard();
      var viewer = viewerNow();
      var saved = D().sbLists;
      D().sbLists = (saved || []).filter(function (list) { return showLiveList(list, viewer); });
      try { return prevCard(); } finally { D().sbLists = saved; }
    };
  }
  if (typeof V !== "undefined" && typeof V.check === "function") {
    var prevCheck = V.check;
    V.check = function () {
      var html = prevCheck();
      if (typeof S === "undefined" || S.hotel !== "MSPWE") return html;
      try { if (typeof useRemote === "function" && useRemote()) return html; } catch (e) {}
      var list = forViewer(viewerNow())[0];
      var lang = typeof LANG !== "undefined" && LANG === "es" ? "es" : "en";
      return html + cardHtml(list, lang);
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
