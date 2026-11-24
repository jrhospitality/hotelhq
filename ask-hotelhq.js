/* Ask HotelHQ. Answers from the how-to guides only.
   Demo mode stays on this phone and never calls the network.
   Live mode may call the ask-hotelhq edge function. That function
   rephrases a guide section only when HOTELHQ_ASK_API_KEY is set.
   If the key is missing, or the call fails, the guide steps are the answer.
   A question the guides do not cover stays "I don't see that." */
(function (root) {
  "use strict";

  var lastQuestion = "";
  var openNow = false;

  function langNow() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function roleNow() {
    try {
      if (typeof authRole === "function" && authRole()) return authRole();
    } catch (e) {}
    try {
      var me = typeof meUser === "function" ? meUser() : null;
      return (me && me.role) || "";
    } catch (e2) { return ""; }
  }
  function tx(en, es) { return langNow() === "es" ? es : en; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function liveReady() {
    try {
      if (typeof authMode === "undefined" || authMode !== "live") return false;
      if (typeof USE_SUPABASE === "undefined" || !USE_SUPABASE) return false;
      if (typeof SB_URL === "undefined" || !SB_URL || typeof SB_KEY === "undefined" || !SB_KEY) return false;
      return true;
    } catch (e) { return false; }
  }
  function paint(hit) {
    var box = document.getElementById("askAnswer");
    if (!box || !hit) return;
    if (!hit.known) {
      var guide = root.HHQHowTo ? HHQHowTo.guideForRole(roleNow()) : "fd";
      box.innerHTML = '<p class="ask-miss" id="askMiss">' + esc(hit.text) + "</p>" +
        '<button type="button" class="btn" onclick="HHQHowTo.open(\'' + guide + '\')">' + esc(tx("Open your guide", "Abrir tu guía")) + "</button>";
      return;
    }
    var steps = hit.steps.map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("");
    box.innerHTML = '<p class="ask-from">' + esc(tx("From the guide", "De la guía")) + " · " +
      '<button type="button" class="ask-cite" id="askCite" onclick="HHQHowTo.open(\'' + hit.guideId + '\',\'' + hit.sectionId + '\')">' +
      esc(hit.guideTitle + " · " + hit.sectionTitle) + "</button></p><ol id=\"askSteps\">" + steps + "</ol>";
  }
  function showSteps(hit) { paint(hit); }
  async function tryModel(question, hit) {
    if (!hit.known || !liveReady() || !root.HHQHowTo) return;
    try {
      var token = SB_KEY;
      try { if (typeof sbSession !== "undefined" && sbSession && sbSession.access_token) token = sbSession.access_token; } catch (e) {}
      var res = await fetch(SB_URL + "/functions/v1/ask-hotelhq", {
        method: "POST",
        headers: { "content-type": "application/json", apikey: SB_KEY, authorization: "Bearer " + token },
        body: JSON.stringify({
          question: question,
          lang: hit.lang,
          sectionId: hit.sectionId,
          title: hit.sectionTitle,
          steps: hit.steps
        })
      });
      var data = await res.json().catch(function () { return {}; });
      if (!data || data.configured === false || !data.answer || data.answer === "UNKNOWN") return;
      if (data.sectionId !== hit.sectionId) return;
      if (String(data.answer).length > 1200) return;
      var next = {
        known: true,
        lang: hit.lang,
        text: String(data.answer),
        guideId: hit.guideId,
        sectionId: hit.sectionId,
        guideTitle: hit.guideTitle,
        sectionTitle: hit.sectionTitle,
        steps: String(data.answer).split(/\n+/).filter(Boolean)
      };
      if (openNow && lastQuestion === question) showSteps(next);
    } catch (e) { /* the guide steps stay */ }
  }
  function ask(question) {
    question = String(question || "").trim();
    lastQuestion = question;
    if (!root.HHQHowTo) return;
    var hit = HHQHowTo.answer(question, langNow(), roleNow());
    showSteps(hit);
    if (hit.known) tryModel(question, hit);
  }
  function shell() {
    return '<div class="ux-sheet ask-sheet" role="dialog" aria-modal="true" aria-labelledby="askTitle">' +
      '<button type="button" class="ux-x" aria-label="' + esc(tx("Close", "Cerrar")) + '" onclick="HHQAsk.close()">✕</button>' +
      '<h3 id="askTitle">' + esc(tx("Ask HotelHQ", "Pregunta a HotelHQ")) + "</h3>" +
      '<p class="ask-note">' + esc(tx(
        "Answers come only from the how-to guides. If it is not in a guide, HotelHQ says so.",
        "Las respuestas salen solo de las guías. Si no está en una guía, HotelHQ lo dice."
      )) + "</p>" +
      '<form id="askForm" action="javascript:void(0)" onsubmit="HHQAsk.submit(event)">' +
      '<label class="ask-lab" for="askQ">' + esc(tx("Your question", "Tu pregunta")) + "</label>" +
      '<textarea id="askQ" rows="3" maxlength="400" placeholder="' + esc(tx("Example: How do I mark a room clean?", "Ejemplo: ¿Cómo marco un cuarto limpio?")) + '"></textarea>' +
      '<button type="submit" class="btn ask-go">' + esc(tx("Ask", "Preguntar")) + "</button></form>" +
      '<div id="askAnswer"></div>' +
      '<button type="button" class="btn2 ask-guides" onclick="HHQHowTo.open(\'' + (root.HHQHowTo ? HHQHowTo.guideForRole(roleNow()) : "fd") + '\')">' +
      esc(tx("Browse how-to guides", "Ver las guías")) + "</button></div>";
  }
  function open() {
    close();
    openNow = true;
    var w = document.createElement("div");
    w.id = "askSheet";
    w.className = "ux-overlay";
    w.onclick = function (e) { if (e.target === w) close(); };
    w.innerHTML = shell();
    document.body.appendChild(w);
    var field = document.getElementById("askQ");
    if (lastQuestion && field) field.value = lastQuestion;
    if (lastQuestion) ask(lastQuestion);
    if (field) setTimeout(function () { field.focus(); }, 40);
  }
  function close() {
    openNow = false;
    var w = document.getElementById("askSheet");
    if (w) w.remove();
  }
  function submit(event) {
    if (event && event.preventDefault) event.preventDefault();
    var field = document.getElementById("askQ");
    ask(field ? field.value : "");
  }
  function sync() {
    if (!openNow) return;
    var q = lastQuestion;
    open();
    lastQuestion = q;
    var field = document.getElementById("askQ");
    if (field) field.value = q;
    if (q) ask(q);
  }

  root.HHQAsk = { open: open, close: close, submit: submit, ask: ask, sync: sync, liveReady: liveReady };

  if (typeof document === "undefined" || typeof render !== "function") return;
  var prev = render;
  root.render = function () {
    var result = prev.apply(this, arguments);
    try {
      var btn = document.getElementById("uxHelpBtn");
      if (btn) {
        btn.textContent = langNow() === "es" ? "Pregunta" : "Ask";
        btn.setAttribute("aria-label", langNow() === "es" ? "Pregunta a HotelHQ" : "Ask HotelHQ");
        btn.onclick = function () { open(); };
      }
      if (openNow) sync();
    } catch (e) {}
    return result;
  };

  var css = document.createElement("style");
  css.textContent = [
    ".ask-sheet textarea{width:100%;box-sizing:border-box;min-height:88px;font-size:16px}",
    ".ask-note,.ask-from{color:#3c4658}",
    ".ask-cite{background:none;border:0;padding:0;color:#14365d;font-weight:800;text-align:left;min-height:44px}",
    ".ask-miss{font-weight:700}",
    ".ask-go,.ask-guides{width:100%;margin-top:8px}",
    "#askSteps{margin:8px 0;padding-left:20px}",
    "#askSteps li{margin:0 0 8px}"
  ].join("");
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
