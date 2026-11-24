/* Ask HotelHQ. A help button on every screen.
   Answers are retrieved from data/help-guides.js only.
   There is no model call and no API key here. If a question is not in the
   guides, the answer is "I don't know, ask your GM". */
(function () {
  "use strict";
  var help = window.HHQHelp;
  if (!help) return;
  try { if (/[?&]rec=1(?:&|$)/.test(location.search)) return; } catch (e) {}

  var open = false;
  var lastQuestion = "";
  var lastAnswer = null;

  function lang() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; }
    catch (e) { return "en"; }
  }
  function L(en, es) { return lang() === "es" ? es : en; }
  function roleNow() {
    try {
      if (typeof authRole === "function" && authRole()) return authRole();
      if (typeof S !== "undefined" && S.role) return S.role;
    } catch (e) {}
    return "";
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch];
    });
  }

  function shotOf(step) {
    if (!step || !step.shot) return "";
    return lang() === "es" ? (step.shot.es || step.shot.en) : (step.shot.en || step.shot.es);
  }

  function guideHtml(guide) {
    var mine = guide.roles.indexOf(roleNow()) >= 0;
    var sections = guide.sections.map(function (section) {
      var steps = section.steps.map(function (step) {
        var src = shotOf(step);
        var img = src ? '<img class="ask-shot" src="' + esc(src) + '" alt="">' : "";
        return "<li>" + esc(step[lang()]) + img + "</li>";
      }).join("");
      return '<section class="ask-sec" id="ask-sec-' + esc(guide.id) + "-" + esc(section.id) + '"><h4>' + esc(section.title[lang()]) + "</h4><ol>" + steps + "</ol></section>";
    }).join("");
    var video = guide.video[lang()];
    return '<details class="ask-guide" id="ask-guide-' + esc(guide.id) + '"' + (mine ? " open" : "") + ">" +
      "<summary><b>" + esc(guide.title[lang()]) + "</b><small>" + esc(guide.blurb[lang()]) + "</small></summary>" +
      '<video class="ask-video" controls playsinline preload="metadata" src="' + esc(video) + '"></video>' +
      sections + "</details>";
  }

  function answerHtml(result) {
    if (!result) return "";
    if (!result.known) return '<p class="ask-unknown" id="askUnknown">' + esc(result.text) + "</p>";
    var steps = result.steps.map(function (line) { return "<li>" + esc(line) + "</li>"; }).join("");
    return '<div class="ask-hit" id="askHit"><p class="ask-from">' + esc(L("From the " + result.title + " guide", "De la guía de " + result.title)) + " · " + esc(result.section) + "</p><ol>" + steps + "</ol>" +
      '<button type="button" class="btn" onclick="HHQAsk.openGuide(\'' + esc(result.guideId) + "','" + esc(result.sectionId) + "')\">" + esc(L("Open this guide", "Abrir esta guía")) + "</button></div>";
  }

  function paint() {
    var button = document.getElementById("askHqBtn");
    if (!button) {
      button = document.createElement("button");
      button.id = "askHqBtn";
      button.type = "button";
      button.onclick = function () { window.HHQAsk.toggle(); };
      document.body.appendChild(button);
    }
    button.textContent = L("Ask HotelHQ", "Pregunta a HotelHQ");
    button.setAttribute("aria-label", L("Ask HotelHQ", "Pregunta a HotelHQ"));
    button.setAttribute("aria-expanded", open ? "true" : "false");

    var panel = document.getElementById("askHqPanel");
    if (!open) {
      if (panel) panel.remove();
      return;
    }
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "askHqPanel";
      panel.className = "ask-overlay";
      panel.onclick = function (event) { if (event.target === panel) window.HHQAsk.close(); };
      document.body.appendChild(panel);
    }
    var guides = help.GUIDES.map(guideHtml).join("");
    panel.innerHTML = '<div class="ask-sheet" role="dialog" aria-modal="true" aria-labelledby="askHqTitle">' +
      '<button type="button" class="ask-x" aria-label="' + esc(L("Close", "Cerrar")) + '" onclick="HHQAsk.close()">✕</button>' +
      '<h2 id="askHqTitle">' + esc(L("Ask HotelHQ", "Pregunta a HotelHQ")) + "</h2>" +
      '<p class="ask-lead">' + esc(L("Answers come only from these role guides.", "Las respuestas salen solo de estas guías.")) + "</p>" +
      '<form class="ask-form" onsubmit="HHQAsk.submit(event)">' +
      '<label class="ask-lab" for="askHqQ">' + esc(L("Your question", "Tu pregunta")) + "</label>" +
      '<input id="askHqQ" autocomplete="off" value="' + esc(lastQuestion) + '" placeholder="' + esc(L("How do I mark a room clean?", "¿Cómo marco un cuarto limpio?")) + '">' +
      '<button type="submit" class="btn ask-go">' + esc(L("Ask", "Preguntar")) + "</button></form>" +
      '<div id="askHqA" aria-live="polite">' + answerHtml(lastAnswer) + "</div>" +
      '<h3 class="ask-h">' + esc(L("Role guides", "Guías por puesto")) + "</h3>" + guides + "</div>";
    var input = document.getElementById("askHqQ");
    if (input && !lastQuestion) input.focus();
  }

  window.HHQAsk = {
    toggle: function () { open = !open; paint(); },
    close: function () { open = false; paint(); },
    submit: function (event) {
      if (event && event.preventDefault) event.preventDefault();
      var input = document.getElementById("askHqQ");
      lastQuestion = input ? input.value : lastQuestion;
      lastAnswer = help.answer(lastQuestion, lang(), roleNow());
      paint();
      var box = document.getElementById("askHqA");
      if (box) box.scrollIntoView({ block: "nearest" });
    },
    openGuide: function (guideId, sectionId) {
      open = true;
      paint();
      var guide = document.getElementById("ask-guide-" + guideId);
      if (guide) guide.open = true;
      var section = document.getElementById("ask-sec-" + guideId + "-" + sectionId);
      if (section) section.scrollIntoView({ block: "start" });
    },
    answer: function (question, language, role) {
      return help.answer(question, language || lang(), role || roleNow());
    }
  };

  var prev = window.render;
  if (typeof prev === "function") {
    window.render = function () {
      var result = prev.apply(this, arguments);
      paint();
      return result;
    };
  }
  if (typeof window.renderLogin === "function") {
    var prevLogin = window.renderLogin;
    window.renderLogin = function () {
      var result = prevLogin.apply(this, arguments);
      paint();
      return result;
    };
  }
  paint();

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && open) window.HHQAsk.close();
  });

  var css = document.createElement("style");
  css.textContent = [
    "#askHqBtn{position:fixed;left:12px;bottom:96px;z-index:10050;min-height:48px;max-width:calc(100vw - 84px);padding:0 14px;border:0;border-radius:999px;background:#14365d;color:#fff;font:800 14px/1.2 system-ui,sans-serif;box-shadow:0 8px 20px rgba(16,24,40,.22)}",
    "body.is-login #askHqBtn{bottom:16px}",
    "#askHqPanel.ask-overlay{position:fixed;inset:0;z-index:10060;background:#0008;display:flex;align-items:flex-end}",
    ".ask-sheet{background:#fff;color:#1c1f26;width:100%;max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px 28px;box-sizing:border-box;position:relative}",
    ".ask-sheet h2{margin:0 36px 6px 0;font-size:22px}",
    ".ask-lead,.ask-from{color:#3f4854;font-size:14px;margin:0 0 8px}",
    ".ask-x{position:absolute;right:10px;top:10px;width:44px;height:44px;border:0;background:#eef1f5;border-radius:50%;font-size:18px}",
    ".ask-form{display:grid;gap:8px;margin:8px 0}",
    ".ask-lab{font-weight:700;font-size:14px}",
    ".ask-sheet input{width:100%;box-sizing:border-box;min-height:48px;font-size:16px;border:1px solid #d5dbe3;border-radius:12px;padding:0 12px}",
    ".ask-go{width:100%;min-height:48px;border-radius:12px}",
    ".ask-unknown{background:#fff7ed;border:1px solid #fdba74;border-radius:12px;padding:12px;font-weight:750;margin:8px 0}",
    ".ask-hit{background:#f4f7fb;border-radius:12px;padding:12px;margin:8px 0}",
    ".ask-hit ol,.ask-sec ol{margin:8px 0 0;padding-left:18px}",
    ".ask-hit li,.ask-sec li{margin:0 0 8px}",
    ".ask-h{margin:16px 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:.04em;color:#5c6570}",
    ".ask-guide{border:1px solid #e6e8ee;border-radius:12px;padding:8px 10px;margin:0 0 8px;background:#fff}",
    ".ask-guide summary{cursor:pointer;min-height:44px;display:flex;flex-direction:column;justify-content:center}",
    ".ask-guide summary small{display:block;font-weight:500;color:#5c6570}",
    ".ask-video{width:100%;border-radius:12px;background:#0f1728;margin:8px 0;max-height:220px}",
    ".ask-shot{display:block;width:100%;max-width:390px;height:auto;border-radius:12px;border:1px solid #e6e8ee;margin-top:6px}",
    ".ask-sec h4{margin:12px 0 4px}",
    "@media(min-width:1024px){#askHqBtn{bottom:24px}#askHqPanel.ask-overlay{align-items:center;justify-content:center;padding:24px}.ask-sheet{width:min(560px,100%);max-height:min(86vh,840px);border-radius:16px}}"
  ].join("");
  document.head.appendChild(css);
})();
