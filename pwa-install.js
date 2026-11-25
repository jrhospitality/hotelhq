/* Install HotelHQ prompt. Chrome/Edge use beforeinstallprompt.
   iOS Safari gets a short Add to Home Screen guide. Hidden in standalone.
   The push service worker registration stays in index.html. */
(function () {
  if (window.__hhqPwaInstall) return;
  window.__hhqPwaInstall = true;

  var HIDE_KEY = "hhq_pwa_install_hide_until";
  var HIDE_MS = 14 * 24 * 60 * 60 * 1000;
  var deferred = null;

  var COPY = {
    en: {
      title: "Install HotelHQ",
      body: "Add HotelHQ to your home screen so it opens full screen, like an app.",
      install: "Install",
      later: "Not now",
      guide: "Install guide",
      menu: "Install guide",
      step1: "Tap Share",
      step2: "Add to Home Screen",
      step3: "Tap Add",
      other: "Open this page in Safari, then use Share → Add to Home Screen."
    },
    es: {
      title: "Instalar HotelHQ",
      body: "Agrega HotelHQ a la pantalla de inicio para abrirlo en pantalla completa, como una app.",
      install: "Instalar",
      later: "Ahora no",
      guide: "Guía de instalación",
      menu: "Guía de instalación",
      step1: "Toca Compartir",
      step2: "Agregar a inicio",
      step3: "Toca Agregar",
      other: "Abre esta página en Safari y luego usa Compartir → Agregar a pantalla de inicio."
    }
  };

  function lang() {
    var doc = (document.documentElement.lang || "").toLowerCase();
    if (doc.indexOf("es") === 0) return "es";
    try {
      if (localStorage.getItem("jrportal_lang") === "es") return "es";
    } catch (e) {}
    return "en";
  }

  function t() {
    return COPY[lang()] || COPY.en;
  }

  function standalone() {
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    } catch (e) {}
    return navigator.standalone === true;
  }

  function dismissed() {
    try {
      return (+localStorage.getItem(HIDE_KEY) || 0) > Date.now();
    } catch (e) {
      return false;
    }
  }

  function isIos() {
    var ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isIosSafari() {
    if (!isIos()) return false;
    return !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA|FBAN|FBAV/.test(navigator.userAgent || "");
  }

  function shouldShow() {
    if (standalone() || dismissed()) return false;
    if (deferred) return true;
    return isIos();
  }

  function dismiss() {
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_MS)); } catch (e) {}
    deferred = null;
    var el = document.getElementById("pwaInstall");
    if (el) el.remove();
  }

  function shareIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M8 7l4-4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function plusIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }
  function checkIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 12.5l2.2 2.2 4.8-5.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function build() {
    var el = document.createElement("div");
    el.id = "pwaInstall";
    el.className = "card span-all noprint";
    el.setAttribute("role", "region");
    el.innerHTML =
      '<div class="pwa-top"><img src="icon-192.png" alt="" width="48" height="48"><div><h3 id="pwaInstallTitle"></h3><p id="pwaInstallBody"></p></div>' +
      '<button type="button" id="pwaLater"></button></div>' +
      '<div id="pwaChrome" hidden><button type="button" class="btn" id="pwaInstallGo"></button></div>' +
      '<ol id="pwaIos" class="pwa-steps" hidden>' +
      '<li><span class="pwa-ic">' + shareIcon() + '</span><span id="pwaStep1"></span></li>' +
      '<li><span class="pwa-ic">' + plusIcon() + '</span><span id="pwaStep2"></span></li>' +
      '<li><span class="pwa-ic">' + checkIcon() + '</span><span id="pwaStep3"></span></li>' +
      '</ol>' +
      '<p id="pwaIosNote" class="warn" hidden></p>' +
      '<a id="pwaGuide" href="install.html"></a>';
    el.querySelector("#pwaLater").addEventListener("click", dismiss);
    el.querySelector("#pwaInstallGo").addEventListener("click", function () {
      if (!deferred) return;
      var prompt = deferred;
      deferred = null;
      prompt.prompt();
      Promise.resolve(prompt.userChoice).then(function (choice) {
        if (choice && choice.outcome === "accepted") {
          var node = document.getElementById("pwaInstall");
          if (node) node.remove();
        } else dismiss();
      }).catch(function () { dismiss(); });
    });
    return el;
  }

  function fill(el) {
    var c = t();
    var ios = isIos();
    el.setAttribute("aria-label", c.title);
    el.querySelector("#pwaInstallTitle").textContent = c.title;
    el.querySelector("#pwaInstallBody").textContent = c.body;
    el.querySelector("#pwaLater").textContent = "✕";
    el.querySelector("#pwaLater").setAttribute("aria-label", c.later);
    el.querySelector("#pwaInstallGo").textContent = c.install;
    el.querySelector("#pwaChrome").hidden = ios || !deferred;
    el.querySelector("#pwaIos").hidden = !ios;
    el.querySelector("#pwaStep1").textContent = c.step1;
    el.querySelector("#pwaStep2").textContent = c.step2;
    el.querySelector("#pwaStep3").textContent = c.step3;
    var note = el.querySelector("#pwaIosNote");
    note.hidden = !(ios && !isIosSafari());
    note.textContent = c.other;
    var guide = el.querySelector("#pwaGuide");
    guide.href = "install.html?lang=" + lang();
    guide.textContent = c.guide;
  }

  function loginGuide() {
    var app = document.getElementById("app");
    var hdr = document.getElementById("hdr");
    var onLogin = hdr && hdr.hidden && !document.getElementById("pwaInstall");
    var slot = document.getElementById("pwaGuideLogin");
    if (!app || !onLogin) {
      if (slot) slot.remove();
      return;
    }
    if (!slot) {
      slot = document.createElement("p");
      slot.id = "pwaGuideLogin";
      slot.className = "noprint";
      slot.style.cssText = "text-align:center;margin:12px 0";
      var link = document.createElement("a");
      link.style.cssText = "color:#14365d;font-weight:700;min-height:44px;display:inline-flex;align-items:center";
      slot.appendChild(link);
    }
    var c = t();
    var link = slot.querySelector("a");
    link.href = "install.html?lang=" + lang();
    link.textContent = c.guide;
    if (app.lastChild !== slot) app.appendChild(slot);
  }

  function mountCard() {
    menuLink();
    var app = document.getElementById("app");
    var existing = document.getElementById("pwaInstall");
    if (!app || !shouldShow()) {
      if (existing) existing.remove();
      loginGuide();
      return;
    }
    var el = existing || build();
    fill(el);
    var more = document.getElementById("hhqMoreBody");
    if (more) {
      if (!more.contains(el)) more.appendChild(el);
      loginGuide();
      return;
    }
    if (el.parentNode !== app || app.firstChild !== el) app.insertBefore(el, app.firstChild);
    loginGuide();
  }

  function menuLink() {
    var panel = document.getElementById("hpanel");
    if (!panel) return;
    var a = document.getElementById("pwaInstallLink");
    if (!a) {
      a = document.createElement("a");
      a.id = "pwaInstallLink";
      a.className = "pwa-menu";
      var sign = document.getElementById("signout");
      if (sign && sign.parentNode === panel) panel.insertBefore(a, sign);
      else panel.appendChild(a);
    }
    var c = t();
    a.href = "install.html?lang=" + lang();
    a.textContent = c.menu;
  }

  var css = document.createElement("style");
  css.textContent =
    "#pwaInstall .pwa-top{display:flex;gap:10px;align-items:flex-start}" +
    "#pwaInstall img{width:48px;height:48px;border-radius:12px;flex:none}" +
    "#pwaInstall h3{margin:0 0 4px}" +
    "#pwaInstall .pwa-top p{margin:0;font-size:14px;line-height:1.35}" +
    "#pwaLater{margin-left:auto;flex:none;min-width:44px;min-height:44px;border:0;background:#e6ebf2;font-weight:700;padding:0 12px}" +
    "#pwaInstallGo{width:100%;margin-top:10px}" +
    ".pwa-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;list-style:none;margin:10px 0 0;padding:0}" +
    ".pwa-steps li{background:#eef3fa;color:#14365d;border-radius:10px;padding:8px 6px;font-size:13px;font-weight:700;text-align:center;line-height:1.25}" +
    ".pwa-ic{display:flex;justify-content:center;color:#14365d;margin-bottom:4px}" +
    ".pwa-ic svg{width:28px;height:28px}" +
    "#pwaIosNote{margin-top:8px}" +
    "#pwaChrome[hidden],#pwaIos[hidden],#pwaIosNote[hidden]{display:none!important}" +
    "#pwaGuide{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;font-weight:700;color:#14365d}" +
    "a.pwa-menu{display:flex;align-items:center;justify-content:center;margin-top:8px;min-height:44px;border-radius:8px;background:#ffffff1f;color:#fff;font-weight:700;text-decoration:none;border:1px solid #ffffff66}" +
    "@media(max-width:520px){.pwa-steps li{font-size:12px;padding:8px 4px}}" +
    "@media (display-mode: standalone) and (max-width: 1023px){#pwaInstall{display:none!important}header#hdr{padding-top:calc(8px + env(safe-area-inset-top,0px))!important}nav#nav{padding-bottom:env(safe-area-inset-bottom,0px)}body{padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))!important}}" +
    "@media print{#pwaInstall,a.pwa-menu{display:none!important}}";
  document.head.appendChild(css);

  window.addEventListener("beforeinstallprompt", function (e) {
    if (standalone() || dismissed()) return;
    e.preventDefault();
    deferred = e;
    mountCard();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    var el = document.getElementById("pwaInstall");
    if (el) el.remove();
  });
  try {
    window.matchMedia("(display-mode: standalone)").addEventListener("change", mountCard);
  } catch (e) {}

  var obs = new MutationObserver(function () { menuLink(); });
  var panel = document.getElementById("hpanel");
  if (panel) obs.observe(panel, { childList: true });
  var langObs = new MutationObserver(mountCard);
  langObs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  function afterPaint(previous) {
    return function () {
      var result = previous.apply(this, arguments);
      try { mountCard(); } catch (err) {}
      return result;
    };
  }
  if (typeof window.render === "function") window.render = afterPaint(window.render);
  if (typeof window.renderLogin === "function") window.renderLogin = afterPaint(window.renderLogin);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountCard);
  else mountCard();
})();
