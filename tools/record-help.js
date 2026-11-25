/* Record the four role how-to videos and the guide screenshots from demo mode.
   Run with the site already served, or let this file start a local static server.
   Phone width is 390. Captions are burned in. PIN digits are covered and are not stored. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");

const root = path.resolve(__dirname, "..");
const shots = path.join(root, "help", "shots");
const videos = path.join(root, "help", "videos");
const port = Number(process.env.PORT || 8765);
const base = "http://127.0.0.1:" + port + "/index.html?rec=1";

fs.mkdirSync(shots, { recursive: true });
fs.mkdirSync(videos, { recursive: true });

function png(file) {
  const w = 64;
  const h = 48;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      raw[i] = 20;
      raw[i + 1] = 90 + (x % 40);
      raw[i + 2] = 140;
    }
  }
  const zlib = require("zlib");
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  function chunk(type, data) {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(require("zlib").crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  const buf = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
  fs.writeFileSync(file, buf);
}

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, "http://127.0.0.1");
      let rel = decodeURIComponent(url.pathname);
      if (rel === "/") rel = "/index.html";
      const file = path.join(root, path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, ""));
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end("missing");
        return;
      }
      const ext = path.extname(file);
      const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".mp4": "video/mp4", ".webmanifest": "application/manifest+json" };
      res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function T(lang, en, es) { return lang === "es" ? es : en; }

async function cap(page, text, cover, hold) {
  await page.evaluate(({ text, cover }) => {
    let el = document.getElementById("recCap");
    if (!el) {
      el = document.createElement("div");
      el.id = "recCap";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.cssText = "position:fixed;left:8px;right:8px;z-index:50000;background:#14365d;color:#fff;border-radius:14px;padding:14px 16px;font:700 18px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;display:flex;align-items:center;justify-content:center;box-sizing:border-box";
    if (cover) {
      el.style.bottom = "0";
      el.style.top = "auto";
      el.style.height = "54%";
    } else {
      el.style.bottom = "86px";
      el.style.top = "auto";
      el.style.height = "auto";
      el.style.minHeight = "72px";
    }
  }, { text: text, cover: !!cover });
  if (hold) await page.waitForTimeout(hold);
}

async function shot(page, name) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll(".toast,#ptsToast,.pts-toast").forEach((node) => node.remove());
    const el = document.getElementById("recCap");
    if (el) el.style.visibility = "hidden";
  });
  await page.screenshot({ path: path.join(shots, name), animations: "disabled" });
  await page.evaluate(() => {
    const el = document.getElementById("recCap");
    if (el) el.style.visibility = "visible";
  });
}

async function pressPin(page, pin) {
  await page.evaluate(() => {
    const style = document.getElementById("recMask") || document.createElement("style");
    style.id = "recMask";
    style.textContent = ".kp button:not(.btn):not(.login-go){color:transparent!important}";
    document.head.appendChild(style);
    const keys = document.querySelector(".kp");
    if (keys) keys.scrollIntoView({ block: "center" });
  });
  for (const digit of String(pin)) {
    await page.evaluate((value) => pinKey(value), digit);
    await page.waitForTimeout(140);
  }
}

async function settle(page) {
  await page.evaluate(() => {
    try { localStorage.setItem("hhq_tour_" + ((typeof S !== "undefined" && S.uid) || ""), "1"); } catch (e) {}
    const tour = document.getElementById("uxTour");
    if (tour) tour.remove();
  });
  const go = page.locator("#wlGo");
  if (await go.count()) {
    await go.click({ force: true });
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => {
    const tour = document.getElementById("uxTour");
    if (tour) tour.remove();
  });
}

async function signIn(page, lang, id, reset) {
  await page.evaluate((value) => setLang(value), lang);
  await page.waitForSelector("#loginHotel");
  if (reset) {
    await page.evaluate((userId) => {
      const user = USERS.find((row) => row.id === userId);
      demoState(user).resetRequired = true;
    }, id);
  }
  await cap(page, T(lang, "Choose your hotel. Type MSPWE, then tap Holiday Inn Express Golden Valley.", "Elige tu hotel. Escribe MSPWE y toca Holiday Inn Express Golden Valley."), false, 1600);
  await shot(page, "sign-in-" + lang + ".png");
  await page.fill("#loginHotel", "MSPWE");
  await page.locator("#loginHotelHits button").first().click();
  await page.selectOption("#loginWho", id);
  await page.evaluate(() => {
    document.querySelectorAll("#loginWho option").forEach((option) => {
      option.textContent = option.textContent.replace(/\s—\s*(demo PIN|PIN de ejemplo)\s+\d+/i, "");
    });
  });
  await cap(page, T(lang, "Tap your name. Then enter the temporary PIN your manager gave you. Dots show each digit. Tap Sign in.", "Toca tu nombre. Luego escribe el PIN temporal que te dio tu gerente. Los puntos muestran cada dígito. Toca Entrar."), true, 1800);
  const pin = await page.evaluate((userId) => demoState(USERS.find((row) => row.id === userId)).pin, id);
  await pressPin(page, pin);
  await page.evaluate((userId) => { demoState(USERS.find((row) => row.id === userId)).resetRequired = true; }, id);
  await page.locator(".kp button.login-go").click({ force: true });
  await page.waitForTimeout(400);
  if (reset) {
    const info = await page.evaluate(() => {
      const u = typeof meUser === "function" ? meUser() : null;
      return {
        uid: typeof S === "undefined" ? "" : S.uid,
        reset: u ? demoState(u).resetRequired : null,
        pinReset: u ? u.pin_reset_required : null,
        mode: typeof setPinMode === "undefined" ? "" : setPinMode,
        err: (document.getElementById("loginErr") || {}).textContent || "",
        h2: [...document.querySelectorAll("h2")].map((node) => node.textContent.trim().slice(0, 80))
      };
    });
    console.log("after-sign-in", JSON.stringify(info));
    await page.waitForFunction(() => {
      const heading = document.querySelector("h2");
      return heading && /Set a new PIN|Elige un PIN nuevo/.test(heading.textContent || "");
    });
    await revealSetPin(page);
    await page.evaluate(() => {
      const mask = document.getElementById("recMask");
      if (mask) mask.remove();
      if (typeof pinKey === "function") pinKey("c");
    });
    await shot(page, "set-pin-" + lang + ".png");
    await cap(page, T(lang, "This temporary PIN works once. Choose a new PIN, tap Save, enter it again, and tap Save.", "Este PIN temporal sirve una sola vez. Elige un PIN nuevo, toca Guardar, escríbelo otra vez y toca Guardar."), true, 1800);
    const next = await page.evaluate(() => {
      let value = "";
      for (let i = 0; i < 30 && (!value || HQAuth.pinRejected(value)); i++) value = String(Math.floor(100000 + Math.random() * 900000));
      return value;
    });
    await pressPin(page, next);
    await page.evaluate(() => submitNewPin());
    await page.waitForTimeout(400);
    await pressPin(page, next);
    await page.evaluate(() => submitNewPin());
    await page.waitForTimeout(500);
  }
  await settle(page);
}

async function revealSetPin(page) {
  await page.evaluate(() => {
    const card = document.querySelector(".card.login");
    const app = document.getElementById("app");
    if (!card || !app) return;
    card.remove();
    app.innerHTML = "";
    app.appendChild(card);
    window.scrollTo(0, 0);
  });
}

async function signOut(page, lang) {
  await cap(page, T(lang, "Tap the HotelHQ bar, then Sign out, on a shared phone.", "Toca la barra de HotelHQ y luego Salir, en un teléfono compartido."), false, 1200);
  await page.locator("#hbar").evaluate((node) => node.click());
  await page.locator("#signout").evaluate((node) => node.click());
  await page.waitForSelector("#loginHotel");
}

async function nav(page, labels, tab) {
  const buttons = page.locator("button");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    const text = (await buttons.nth(i).innerText()).replace(/\s+/g, " ").trim();
    const hit = labels.some((label) => text === label || text.endsWith(label));
    if (!hit) continue;
    if ((labels.indexOf("Rooms") >= 0 || labels.indexOf("Cuartos") >= 0) && /My |Mis /.test(text)) continue;
    await buttons.nth(i).evaluate((node) => node.click());
    await page.waitForTimeout(400);
    return;
  }
  if (tab) {
    await page.evaluate((id) => go(id), tab);
    await page.waitForTimeout(400);
    return;
  }
  throw new Error("No nav button " + labels.join(" / "));
}

async function record(browser, lang, name, run) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: path.join(videos, "raw"), size: { width: 390, height: 844 } },
    deviceScaleFactor: 1,
    hasTouch: true,
    serviceWorkers: "block"
  });
  await context.addInitScript(() => {
    const strip = () => {
      document.querySelectorAll("#loginWho option").forEach((option) => {
        option.textContent = option.textContent.replace(/\s—\s*(demo PIN|PIN de ejemplo)\s+\d+/i, "");
      });
    };
    const arm = () => {
      new MutationObserver(strip).observe(document.documentElement, { subtree: true, childList: true, characterData: true });
      strip();
    };
    const style = document.createElement("style");
    style.textContent = "#askHqBtn{display:none!important}";
    (document.head || document.documentElement).appendChild(style);
    if (document.documentElement) arm();
    else document.addEventListener("DOMContentLoaded", arm);
  });
  const page = await context.newPage();
  await page.addStyleTag({ content: "#askHqBtn{display:none!important}" });
  const started = Date.now();
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#app");
  try {
    await run(page, lang);
  } catch (error) {
    await page.screenshot({ path: "/tmp/fail-" + name + "-" + lang + ".png" }).catch(() => {});
    const text = await page.locator("#app").innerText().catch(() => "");
    fs.writeFileSync("/tmp/fail-" + name + "-" + lang + ".txt", String(text).slice(0, 2500));
    throw error;
  }
  const elapsed = Date.now() - started;
  if (elapsed < 62000) {
    await cap(page, T(lang, "That is the daily path. Tap Ask HotelHQ on any screen if you need these steps again.", "Ese es el camino del día. Toca Pregunta a HotelHQ en cualquier pantalla si necesitas estos pasos otra vez."), false, 62000 - elapsed);
  }
  const video = page.video();
  await context.close();
  const raw = await video.path();
  const out = path.join(videos, name + "-" + lang + ".mp4");
  await new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-i", raw, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-preset", "veryfast", "-an", "-movflags", "+faststart", out], { stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error("ffmpeg " + code)));
  });
  const probe = await new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]);
    let data = "";
    child.stdout.on("data", (chunk) => { data += chunk; });
    child.on("exit", (code) => code === 0 ? resolve(Number(data)) : reject(new Error(data)));
  });
  fs.unlinkSync(raw);
  console.log(name + "-" + lang, probe.toFixed(1) + "s", out);
  if (probe < 60 || probe > 120) throw new Error(name + "-" + lang + " duration " + probe);
  return probe;
}

async function frontDesk(page, lang) {
  await signIn(page, lang, "mspwe-fd", true);
  await cap(page, T(lang, "Home is your shift. Search is at the top. Guest requests, rooms, and shift notes are on the bottom bar.", "Inicio es tu turno. La búsqueda está arriba. Solicitudes, cuartos y notas están en la barra de abajo."), false, 2800);
  await shot(page, "front-desk-home-" + lang + ".png");
  await nav(page, ["Shift Notes", "Notas"], "notes");
  await cap(page, T(lang, "Shift notes: pick the shift, write the handoff, and tap Post handoff. No full guest names.", "Notas de turno: elige el turno, escribe el pase y toca Publicar pase. Sin nombres completos de huéspedes."), false, 2200);
  await page.fill("#nt", T(lang, "Late checkout in 214. Towels requested.", "Salida tarde en 214. Pidieron toallas."));
  await shot(page, "front-desk-notes-" + lang + ".png");
  await page.locator('button[onclick="addN()"]').click();
  await page.waitForTimeout(800);
  await page.evaluate(() => go("home"));
  await page.waitForTimeout(400);
  const alert = page.locator("#deskChatAlert");
  if (await alert.count()) await alert.click();
  else await page.evaluate(() => go("gchat"));
  await page.waitForTimeout(400);
  await cap(page, T(lang, "Guest chats that need a response. The oldest is first. Reply in the brand chat, then tap Mark responded.", "Chats de huéspedes que necesitan respuesta. El más antiguo va primero. Responde en el chat de la marca y toca Marcar respondido."), false, 2800);
  await shot(page, "front-desk-chats-" + lang + ".png");
  const mark = page.locator("button", { hasText: /Mark responded|Marcar respondido/ }).first();
  if (await mark.count()) await mark.click();
  await page.waitForTimeout(700);
  await nav(page, ["Guest Requests", "Solicitudes"], "greq");
  await cap(page, T(lang, "Log a guest request with the room and last initial only, then tap Send.", "Registra una solicitud con el cuarto y solo la inicial, y toca Enviar."), false, 1800);
  await page.fill("#grRoom", "214");
  await page.fill("#grIni", "S");
  await page.fill("#grNote", T(lang, "Extra towels", "Toallas extras"));
  await shot(page, "front-desk-requests-" + lang + ".png");
  await page.locator('#grForm button[onclick="QP.grPost()"]').click();
  await page.waitForTimeout(900);
}

async function housekeeping(page, lang) {
  await signIn(page, lang, "mspwe-hkr", true);
  await cap(page, T(lang, "Room attendant Home. The big time is your estimated out time. Expected done by is when the remaining rooms should be finished.", "Inicio de la camarista. La hora grande es tu hora de salida estimada. La hora prevista es cuando deben terminar los cuartos que faltan."), false, 2800);
  await page.locator("#otMe, #hhqDoneMe").first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "hk-home-" + lang + ".png");
  await nav(page, ["My Rooms", "Mis cuartos"], "myrooms");
  await cap(page, T(lang, "My Rooms. Rush rooms are first. Tap Start when you begin.", "Mis cuartos. Los urgentes van primero. Toca Empezar cuando empiezas."), false, 1800);
  await shot(page, "hk-rooms-" + lang + ".png");
  await page.locator("button.hkgo", { hasText: /^Start$|^Empezar$/ }).first().click();
  await page.waitForTimeout(500);
  await cap(page, T(lang, "When the room is clean, tap Done / Clean. It waits for inspection. You do not inspect your own room.", "Cuando el cuarto está limpio, toca Listo / Limpio. Queda en espera de inspección. Tú no inspeccionas tu propio cuarto."), false, 2200);
  await shot(page, "hk-clean-" + lang + ".png");
  await page.locator("button.hkgo", { hasText: /Done \/ Clean|Listo \/ Limpio/ }).first().click();
  await page.waitForTimeout(600);
  await page.locator("#hkMyPoints").scrollIntoViewIfNeeded();
  await cap(page, T(lang, "Points this month are on My Rooms. A maintenance report needs a photo. The out-time bonus is only if all rooms are done on time.", "Los puntos de este mes están en Mis cuartos. Un reporte de mantenimiento necesita foto. El bono de salida es solo si todos los cuartos quedan a tiempo."), false, 2600);
  await shot(page, "hk-points-" + lang + ".png");
  await signOut(page, lang);
  await signIn(page, lang, "mspwe-hk", false);
  await cap(page, T(lang, "Housekeeping lead. Expected done by lists every attendant and laundry. HK Lead today shows rooms ready to inspect.", "Líder de ama de llaves. La hora prevista lista a cada camarista y a lavandería. Líder HK hoy muestra los cuartos listos para inspeccionar."), false, 2600);
  await shot(page, "hk-lead-" + lang + ".png");
  await nav(page, ["Rooms", "Cuartos"], "rooms");
  await cap(page, T(lang, "The room board. Assign attendants, or auto-assign dirty rooms to people on shift.", "El tablero de cuartos. Asigna camaristas, o asigna los cuartos sucios a quien está en turno."), false, 2000);
  await shot(page, "hk-board-" + lang + ".png");
  await signOut(page, lang);
  await signIn(page, lang, "mspwe-la", false);
  await nav(page, ["Laundry", "Lavandería"], "line");
  await cap(page, T(lang, "Laundry. Start wash, then Start dry, then Finish. Log linen counts. Home shows your expected done-by.", "Lavandería. Empieza el lavado, luego el secado y termina. Anota los conteos de blancos. Inicio muestra tu hora prevista."), false, 2600);
  await shot(page, "hk-laundry-" + lang + ".png");
}

async function maintenance(page, lang) {
  await signIn(page, lang, "mspwe-mt", true);
  await cap(page, T(lang, "Maintenance Home. Open work orders, a new order with a photo, today's PMs, and My tasks.", "Inicio de mantenimiento. Órdenes abiertas, una orden nueva con foto, los MP de hoy y Mis tareas."), false, 2600);
  await shot(page, "mt-home-" + lang + ".png");
  await nav(page, ["Work Orders", "Órdenes de trabajo"], "wo");
  await cap(page, T(lang, "Tap New request, choose Work order, add the room, what is wrong, and a photo, then Send.", "Toca Nueva solicitud, elige Orden de trabajo, escribe el cuarto, qué pasa y una foto, y toca Enviar."), false, 1600);
  await page.locator("#foldLaunch button").evaluate((node) => node.click());
  await page.waitForSelector("#opsRoom");
  await page.evaluate(() => { if (window.HQ && HQ.pick) HQ.pick("kind", "work_order"); });
  await page.waitForSelector("#opsPhoto");
  await page.fill("#opsRoom", "212");
  await page.fill("#opsNote", T(lang, "PTAC not cooling", "El PTAC no enfría"));
  await page.setInputFiles("#opsPhoto", "/tmp/hhq-sample-photo.png");
  await page.waitForFunction(() => {
    const img = document.getElementById("opsPrev");
    return img && img.getAttribute("src");
  });
  await shot(page, "mt-wo-" + lang + ".png");
  await page.locator('#opsSheet button[onclick="HQ.send()"]').evaluate((node) => node.click());
  await page.waitForTimeout(800);
  await nav(page, ["PMs", "MP"], "pm");
  await cap(page, T(lang, "Preventive maintenance. Tap PM 582 to open the guestroom checklist, then mark that room complete.", "Mantenimiento preventivo. Toca PM 582 para abrir la lista de la habitación y marca ese cuarto terminado."), false, 2200);
  const pm = page.locator("button", { hasText: "PM 582" }).first();
  if (await pm.count()) await pm.evaluate((node) => node.click());
  await page.waitForTimeout(500);
  await shot(page, "mt-pm-" + lang + ".png");
}

async function gm(page, lang) {
  await signIn(page, lang, "mspwe-gm", true);
  await cap(page, T(lang, "GM Home is the dashboard: work orders, dirty rooms, the daily briefing, and night audit.", "El inicio del gerente es el tablero: órdenes, cuartos sucios, el resumen diario y la auditoría nocturna."), false, 2400);
  await page.locator("text=/GM Dashboard|Tablero del gerente/").first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, "gm-home-" + lang + ".png");
  const full = page.locator("button", { hasText: /Full briefing|Resumen completo/ }).first();
  if (await full.count()) await full.evaluate((node) => node.click());
  else await page.evaluate(() => go("dbrief"));
  await page.waitForTimeout(400);
  await cap(page, T(lang, "Daily briefing. Occupancy, arrivals, VIPs, rush rooms, and PMs due. EXAMPLE rows are samples until a PMS feed is connected.", "Resumen diario. Ocupación, llegadas, VIPs, cuartos urgentes y MP pendientes. Las filas EJEMPLO son muestras hasta conectar el PMS."), false, 2800);
  await shot(page, "gm-brief-" + lang + ".png");
  await page.evaluate(() => go("home"));
  await page.waitForTimeout(300);
  const audit = page.locator("button", { hasText: /Open night audit|Abrir auditoría/ }).first();
  if (await audit.count()) await audit.evaluate((node) => node.click());
  else await page.evaluate(() => { if (window.naOpen) naOpen("MSPWE"); else go("naudit"); });
  await page.waitForTimeout(500);
  await cap(page, T(lang, "Night audit review. Open each flagged item, read why it is here, and mark the check-in when the review is done. These rows are samples.", "Revisión de la auditoría nocturna. Abre cada punto marcado, lee por qué está aquí y marca la revisión cuando termines. Estas filas son ejemplos."), false, 2800);
  const explain = page.locator("button", { hasText: /Explain|Explicar/ }).first();
  if (await explain.count()) await explain.evaluate((node) => node.click());
  await page.waitForTimeout(400);
  await shot(page, "gm-audit-" + lang + ".png");
  const more = page.locator("#uxMoreBtn");
  if (await more.count()) {
    await more.evaluate((node) => node.click());
    await page.waitForTimeout(300);
    const team = page.locator('[data-id="team"]');
    if (await team.count()) await team.evaluate((node) => node.click());
    else await page.evaluate(() => go("team"));
  } else await page.evaluate(() => go("team"));
  await page.waitForTimeout(400);
  await cap(page, T(lang, "Team shows your hotel. Tap a person to see the role. Reset PIN only when they are new or locked out.", "Equipo muestra tu hotel. Toca a una persona para ver el puesto. Restablece el PIN solo si es nueva o está bloqueada."), false, 2200);
  await shot(page, "gm-team-" + lang + ".png");
  await page.locator("button", { hasText: "Maria Alvarez" }).first().evaluate((node) => node.click());
  await page.waitForTimeout(400);
  await cap(page, T(lang, "Reset PIN shows a temporary PIN once. Read it to them and hide it. They set their own PIN at sign-in. Do not leave it on screen.", "Restablecer PIN muestra un PIN temporal una sola vez. Léelo y ocúltalo. Esa persona crea su PIN al entrar. No lo dejes en pantalla."), false, 2600);
  await shot(page, "gm-team-profile-" + lang + ".png");
}

async function main() {
  png("/tmp/hhq-sample-photo.png");
  const server = await serve();
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const jobs = [
    ["front-desk", frontDesk],
    ["housekeeping", housekeeping],
    ["maintenance", maintenance],
    ["gm", gm]
  ];
  try {
    const only = process.env.ONLY || "";
    for (const lang of ["en", "es"]) {
      for (const [name, fn] of jobs) {
        if (only && only !== name && only !== name + "-" + lang && only !== lang) continue;
        await record(browser, lang, name, fn);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
