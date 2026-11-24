/* Ask HotelHQ. Answers only by quoting help-guides.js.
   The button is on every screen, including sign-in. No network call. */
(function (root) {
  "use strict";

  function L(en, es) {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? es : en; } catch (e) { return en; }
  }
  function roleNow() {
    try { return (typeof authRole === "function" && authRole()) || (typeof S !== "undefined" && S.role) || ""; }
    catch (e) { return ""; }
  }
  function uiLang() {
    try { return (typeof LANG !== "undefined" && LANG === "es") ? "es" : "en"; } catch (e) { return "en"; }
  }
  function guides() { return root.HelpGuides; }

  function ensureBtn() {
    var btn = document.getElementById("askHqBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "askHqBtn";
      btn.type = "button";
      btn.addEventListener("click", openAsk);
      document.body.appendChild(btn);
    }
    btn.textContent = L("Ask HotelHQ", "Pregunta a HotelHQ");
    btn.setAttribute("aria-label", btn.textContent);
  }
  function closeAsk() {
    var panel = document.getElementById("askHqPanel");
    if (panel) panel.remove();
  }
  function openGuide(guideId, sectionId) {
    if (typeof meUser === "function" && !meUser()) {
      var model = guides();
      var guide = model && model.guideById(guideId);
      var section = guide && guide.sections.filter(function (row) { return row.id === sectionId; })[0];
      var box = document.getElementById("askHqA");
      if (guide && section && box) {
        var lang = uiLang();
        paintAnswer(box, {
          known: true,
          lang: lang,
          title: section.title[lang],
          text: section.body[lang],
          guideTitle: guide.title[lang],
          guideId: guide.id,
          sectionId: section.id,
          video: guide.video[lang],
          captions: model.captionsFor(guide, lang)
        });
      }
      return;
    }
    closeAsk();
    if (typeof go === "function") go("guides");
    setTimeout(function () {
      var el = document.getElementById("help-" + guideId + "-" + sectionId) || document.getElementById("help-" + guideId);
      if (!el) return;
      var details = el.closest ? el.closest("details") : null;
      if (details) details.open = true;
      el.scrollIntoView({ block: "start" });
    }, 60);
  }
  function paintAnswer(box, result) {
    box.innerHTML = "";
    var title = document.createElement("h3");
    title.textContent = result.known ? result.title : (result.lang === "es" ? "Sin respuesta" : "No answer");
    var text = document.createElement("p");
    text.textContent = result.text;
    box.appendChild(title);
    box.appendChild(text);
    if (!result.known) {
      var hint = document.createElement("p");
      hint.className = "ask-hint";
      hint.textContent = result.lang === "es"
        ? "Abre Ayuda para la guía de tu puesto."
        : "Open Help for your role's guide.";
      box.appendChild(hint);
      return;
    }
    var where = document.createElement("p");
    where.className = "ask-hint";
    where.textContent = result.guideTitle || "";
    box.appendChild(where);
    if (result.video && guides().mediaOk(result.video)) {
      var video = document.createElement("video");
      video.className = "help-video";
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = result.video;
      ["en", "es"].forEach(function (code) {
        var src = result.captions && result.captions[code];
        if (!src || !guides().mediaOk(src)) return;
        var track = document.createElement("track");
        track.kind = "captions";
        track.src = src;
        track.srclang = code;
        track.label = code === "es" ? "Español" : "English";
        if (code === result.lang) track.default = true;
        video.appendChild(track);
      });
      box.appendChild(video);
    }
    var open = document.createElement("button");
    open.type = "button";
    open.className = "btn";
    open.textContent = result.lang === "es" ? "Abrir esta guía" : "Open this guide";
    open.addEventListener("click", function () { openGuide(result.guideId, result.sectionId); });
    box.appendChild(open);
  }
  function ask() {
    var input = document.getElementById("askHqQ");
    var box = document.getElementById("askHqA");
    if (!input || !box || !guides()) return;
    var result = guides().answer(input.value, { uiLang: uiLang(), role: roleNow() });
    paintAnswer(box, result);
  }
  function openAsk() {
    if (document.getElementById("askHqPanel")) { closeAsk(); return; }
    var panel = document.createElement("div");
    panel.id = "askHqPanel";
    panel.className = "ask-overlay";
    panel.addEventListener("click", function (event) { if (event.target === panel) closeAsk(); });
    var sheet = document.createElement("div");
    sheet.className = "ask-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    var head = document.createElement("div");
    head.className = "ask-head";
    var h = document.createElement("h2");
    h.textContent = L("Ask HotelHQ", "Pregunta a HotelHQ");
    var x = document.createElement("button");
    x.type = "button";
    x.className = "ask-x";
    x.textContent = "✕";
    x.setAttribute("aria-label", L("Close", "Cerrar"));
    x.addEventListener("click", closeAsk);
    head.appendChild(h);
    head.appendChild(x);
    var note = document.createElement("p");
    note.className = "ask-note";
    note.textContent = L(
      "Answers come only from the day-one guides. If it is not in a guide, HotelHQ says it does not know.",
      "Las respuestas salen solo de las guías del primer día. Si no está en una guía, HotelHQ dice que no lo sabe."
    );
    var input = document.createElement("textarea");
    input.id = "askHqQ";
    input.rows = 3;
    input.placeholder = L("Ask about sign-in, your rooms, a work order…", "Pregunta sobre la entrada, tus cuartos, una orden…");
    var row = document.createElement("div");
    row.className = "ask-row";
    var goBtn = document.createElement("button");
    goBtn.type = "button";
    goBtn.className = "btn";
    goBtn.textContent = L("Ask", "Preguntar");
    goBtn.addEventListener("click", ask);
    var helpBtn = document.createElement("button");
    helpBtn.type = "button";
    helpBtn.className = "btn2";
    helpBtn.textContent = L("Help", "Ayuda");
    helpBtn.addEventListener("click", function () { openGuide(guides().guideForRole(roleNow()) ? guides().guideForRole(roleNow()).id : "front_desk", "pin"); });
    row.appendChild(goBtn);
    row.appendChild(helpBtn);
    var box = document.createElement("div");
    box.id = "askHqA";
    box.className = "ask-answer";
    sheet.appendChild(head);
    sheet.appendChild(note);
    sheet.appendChild(input);
    sheet.appendChild(row);
    sheet.appendChild(box);
    panel.appendChild(sheet);
    document.body.appendChild(panel);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) ask();
    });
    setTimeout(function () { input.focus(); }, 40);
  }

  function boot() {
    if (typeof M !== "undefined") {
      M.guides = ["📘", "How-to guides"];
      if (typeof I18N !== "undefined" && I18N.es) I18N.es["How-to guides"] = "Guías prácticas";
    }
    if (typeof V !== "undefined" && guides()) {
      V.guides = function () {
        var open = "";
        try { open = S.helpOpen || ""; } catch (e) { open = ""; }
        return guides().pageHtml(uiLang(), { role: roleNow(), openId: open });
      };
    }
    if (typeof go === "function") {
      var prevGo = go;
      go = function (tab) {
        if (tab === "guides") {
          if (typeof meUser === "function" && !meUser()) return;
          S.tab = "guides";
          try { save(); } catch (e) {}
          render();
          try { scrollTo(0, 0); } catch (e2) {}
          return;
        }
        return prevGo.apply(this, arguments);
      };
    }
    if (typeof render === "function") {
      var prevRender = render;
      render = function () {
        var out = prevRender.apply(this, arguments);
        ensureBtn();
        return out;
      };
    }
    if (typeof renderLogin === "function") {
      var prevLogin = renderLogin;
      renderLogin = function () {
        var out = prevLogin.apply(this, arguments);
        ensureBtn();
        return out;
      };
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeAsk();
    });
    ensureBtn();
    var css = document.createElement("style");
    css.textContent = [
      "#askHqBtn{position:fixed;left:12px;bottom:96px;z-index:7;min-height:48px;padding:0 14px;border:0;border-radius:999px;background:#14365d;color:#fff;font-weight:800;font-size:15px;box-shadow:0 8px 20px rgba(16,24,40,.18)}",
      "body.is-login #askHqBtn,body:has(#app .login) #askHqBtn{top:12px;bottom:auto;right:12px;left:auto}",
      ".ask-overlay{position:fixed;inset:0;background:#0008;z-index:140;display:flex;align-items:flex-end}",
      ".ask-sheet{background:#fff;width:100%;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px;box-sizing:border-box}",
      ".ask-head{display:flex;align-items:center;gap:8px}.ask-head h2{flex:1;margin:0;font-size:20px}",
      ".ask-x{width:44px;height:44px;border:0;background:#eef1f5;border-radius:50%;font-size:18px}",
      ".ask-note,.ask-hint{color:#5c6570;font-size:14px}",
      "#askHqQ{width:100%;box-sizing:border-box;min-height:72px;font-size:16px;margin:8px 0}",
      ".ask-row{display:flex;gap:8px}.ask-row .btn,.ask-row .btn2{flex:1}",
      ".ask-answer h3{margin:12px 0 6px}.ask-answer p{margin:0 0 8px;white-space:pre-wrap}",
      ".help-video{width:100%;max-height:320px;background:#111;border-radius:12px;margin:8px 0}",
      ".help-lead{margin:0 0 8px}",
      ".help-guide{background:#fff;border:1px solid #e6e8ee;border-radius:12px;padding:8px 12px;margin:8px 0}",
      ".help-guide summary{font-weight:800;min-height:44px;display:flex;align-items:center;cursor:pointer}",
      ".help-sec h3{margin:10px 0 4px;font-size:16px}.help-sec p{margin:0 0 8px}",
      ".help-replay{margin-bottom:8px}",
      "@media(min-width:1024px){#askHqBtn{bottom:24px;left:24px}.ask-overlay{align-items:center;justify-content:center;padding:24px}.ask-sheet{width:min(640px,100%);max-height:min(80vh,760px);border-radius:16px}}"
    ].join("");
    document.head.appendChild(css);
  }

  root.AskHotelHQ = { open: openAsk, close: closeAsk, ask: ask, openGuide: openGuide };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
