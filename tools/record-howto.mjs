/* Record phone-sized demo how-to videos and the guide screenshots.
   Demo mode only. Example staff. No network. Run from the repo root:
     node tools/record-howto.mjs
   HOLD=2600 is the pause after each caption. FILTER=fd,en records one. */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/tmp/pw/package.json");
const { chromium } = require("playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets/howto");
const photo = path.join(root, "icon-192.png");
const port = 8765;
const base = "http://127.0.0.1:" + port + "/";
const PACE = { fd: 12000, hk: 6500, mt: 14000, gm: 11000 };
const filter = String(process.env.FILTER || "");

const COPY = {
  en: {
    fdIn: "1 · Sign in on the demo. Example names only.",
    fdNotes: "2 · Shift notes. Pick the shift and post the handoff.",
    fdRooms: "3 · Room status. Filter the board. You are looking, not cleaning.",
    fdReq: "4 · Log a guest request or complaint. Room and last initial only.",
    fdChat: "5 · Messages that need a reply. Answer in the brand tool, then mark it here.",
    hkIn: "1 · A temporary PIN works once. Then you choose your own.",
    hkNew: "2 · Type a new 4 to 6 digit PIN. Easy PINs are rejected.",
    hkAgain: "3 · Type the same PIN again and save.",
    hkRooms: "4 · My Rooms shows only the rooms on your name.",
    hkClean: "5 · Start when you walk in. Done / Clean when you finish.",
    hkPhoto: "6 · Report the problem, add a photo, then send.",
    hkPoints: "7 · Your points are on My Rooms and on the Points screen.",
    hkWhen: "8 · Home shows when you should be done.",
    hkOut: "9 · Laundry signs in the same way.",
    hkWash: "10 · Start a wash, then a dry, then finish the load.",
    mtIn: "1 · Maintenance signs in on the demo.",
    mtWo: "2 · Work orders. Read the photo, then send a new request.",
    mtPm: "3 · Today's PMs. Open PM 582 and check the room.",
    gmIn: "1 · The GM home is the dashboard. AGM uses the same screens.",
    gmDone: "2 · Expected done by lists room attendants and laundry.",
    gmBrief: "3 · Daily briefing is today's huddle.",
    gmOk: "4 · Ordering shows requests waiting for GM approval."
  },
  es: {
    fdIn: "1 · Entra en la demo. Solo nombres de ejemplo.",
    fdNotes: "2 · Notas de turno. Elige el turno y publica el relevo.",
    fdRooms: "3 · Estado de cuartos. Filtra el tablero. Aquí solo miras.",
    fdReq: "4 · Registra una solicitud o queja. Solo cuarto e inicial.",
    fdChat: "5 · Mensajes por responder. Contesta en la herramienta de la marca y márcalo aquí.",
    hkIn: "1 · El PIN temporal sirve una vez. Luego eliges el tuyo.",
    hkNew: "2 · Escribe un PIN nuevo de 4 a 6 dígitos. Los fáciles se rechazan.",
    hkAgain: "3 · Escribe el mismo PIN otra vez y guarda.",
    hkRooms: "4 · Mis cuartos muestra solo los que tienen tu nombre.",
    hkClean: "5 · Empezar al entrar. Listo / Limpio al terminar.",
    hkPhoto: "6 · Elige el problema, agrega una foto y envía.",
    hkPoints: "7 · Tus puntos están en Mis cuartos y en Puntos.",
    hkWhen: "8 · Inicio muestra a qué hora terminas.",
    hkOut: "9 · Lavandería entra de la misma forma.",
    hkWash: "10 · Empieza el lavado, luego el secado y termina la carga.",
    mtIn: "1 · Mantenimiento entra en la demo.",
    mtWo: "2 · Órdenes. Mira la foto y envía una solicitud nueva.",
    mtPm: "3 · Los PM de hoy. Abre PM 582 y marca el cuarto.",
    gmIn: "1 · El inicio del GM es el tablero. El AGM usa las mismas pantallas.",
    gmDone: "2 · Hora prevista lista a camaristas y lavandería.",
    gmBrief: "3 · El resumen del día es la junta de hoy.",
    gmOk: "4 · Pedidos muestra lo que espera la aprobación del GM."
  }
};

function say(text) { console.log(text); }

function serve() {
  const child = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
    cwd: root,
    stdio: "ignore"
  });
  return child;
}

async function caption(page, text) {
  await page.evaluate((text) => {
    let el = document.getElementById("hhqCap");
    if (!el) {
      el = document.createElement("div");
      el.id = "hhqCap";
      el.style.cssText = "position:fixed;left:8px;right:8px;top:68px;z-index:140;background:#14365d;color:#fff;border-radius:12px;padding:10px 12px;font:700 16px/1.35 system-ui,sans-serif;box-shadow:0 8px 20px #0006;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.visibility = "visible";
  }, text);
}

async function hideCap(page) {
  await page.evaluate(() => {
    const el = document.getElementById("hhqCap");
    if (el) el.style.visibility = "hidden";
  });
}

async function shot(page, name, selector) {
  await page.evaluate(() => {
    document.querySelectorAll(".tip").forEach((el) => el.remove());
    ["ptsToast", "lpToast", "toast"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.hidden = true;
      el.textContent = "";
    });
    const lp = document.getElementById("lpToast");
    if (lp) lp.innerHTML = "";
    try { if (window.LP) LP.toast = null; } catch (e) {}
  });
  if (selector) {
    const el = page.locator(selector).first();
    if (await el.count()) await el.scrollIntoViewIfNeeded().catch(() => {});
  }
  await hideCap(page);
  await page.waitForTimeout(220);
  await page.screenshot({ path: path.join(outDir, name) });
  await page.evaluate(() => {
    const el = document.getElementById("hhqCap");
    if (el) el.style.visibility = "visible";
  });
}

async function hold(page) {
  const ms = await page.evaluate(() => window.__pace || 9000);
  await page.waitForTimeout(ms);
}
async function pace(page, id) {
  const ms = PACE[id] || 9000;
  await page.evaluate((value) => { window.__pace = value; }, ms);
}

async function setLang(page, lang) {
  const btn = page.locator("button[onclick=\"setLang('" + lang + "')\"]:visible").first();
  if (!(await btn.count())) return;
  if ((await btn.getAttribute("aria-pressed")) === "true") return;
  await btn.click();
  await page.waitForTimeout(200);
}

async function pressPin(page, pin) {
  for (const digit of pin) {
    await page.locator(".kp button", { hasText: new RegExp("^" + digit + "$") }).click();
    await page.waitForTimeout(280);
  }
}

async function dismissPopups(page) {
  const go = page.locator("#wlGo");
  if (await go.count()) await go.click();
  await page.evaluate(() => {
    try { if (typeof S !== "undefined" && S.uid) localStorage.setItem("hhq_tour_" + S.uid, "1"); } catch (e) {}
  });
  const skip = page.locator("#uxTour button");
  if (await skip.count()) await skip.first().click();
}

async function signIn(page, id, pin) {
  await page.fill("#loginHotel", "MSPWE");
  await page.waitForSelector("#loginHotelHits button");
  await page.click("#loginHotelHits button");
  await page.waitForFunction((who) => {
    const sel = document.querySelector("#loginWho");
    return sel && [...sel.options].some((opt) => opt.value === who);
  }, id);
  await page.selectOption("#loginWho", id);
  await pressPin(page, pin);
  await page.click(".login-go");
  await page.waitForTimeout(500);
  await dismissPopups(page);
  await page.waitForTimeout(300);
}

async function signOut(page) {
  await page.click("#hbar");
  await page.waitForSelector("#signout", { state: "visible" });
  await page.click("#signout");
  await page.waitForSelector("#loginHotel");
}

async function visible(locator) {
  return (await locator.count()) > 0 && await locator.first().isVisible().catch(() => false);
}
async function openTab(page, id) {
  const nav = page.locator("#nav button[onclick*=\"go('" + id + "')\"]");
  if (await visible(nav)) { await nav.first().click(); await page.waitForTimeout(300); return; }
  let tile = page.locator(".more-tile[data-id='" + id + "']");
  if (await visible(tile)) { await tile.first().click(); await page.waitForTimeout(300); return; }
  const more = page.locator("#uxMoreBtn");
  if (await visible(more)) await more.click();
  else {
    const summary = page.locator("#hhqMore > summary");
    if (await visible(summary)) await summary.click();
  }
  await page.waitForTimeout(300);
  tile = page.locator(".more-tile[data-id='" + id + "']");
  if (await tile.count()) {
    await tile.first().scrollIntoViewIfNeeded().catch(() => {});
    if (await visible(tile)) { await tile.first().click(); await page.waitForTimeout(300); return; }
  }
  await page.evaluate((tab) => { if (window.uxClose) uxClose(); go(tab); }, id);
  await page.waitForTimeout(300);
}

async function fresh(page, lang) {
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#loginHotel");
  await setLang(page, lang);
}

async function frontDesk(page, lang) {
  const t = COPY[lang];
  await fresh(page, lang);
  await pace(page, "fd");
  await caption(page, t.fdIn);
  await hold(page);
  await signIn(page, "mspwe-fd", "2110");
  await caption(page, t.fdNotes);
  await openTab(page, "notes");
  await page.fill("#nt", lang === "es" ? "Relevo de ejemplo: 2 llegadas tarde." : "Example handoff: 2 late arrivals.");
  await shot(page, "fd-notes-" + lang + ".png", "#nt");
  await hold(page);
  await page.click("[onclick='addN()']");
  await caption(page, t.fdRooms);
  await openTab(page, "rooms");
  await page.click("[onclick=\"setBoard('dirty')\"]");
  await shot(page, "fd-rooms-" + lang + ".png", "h2");
  await hold(page);
  await caption(page, t.fdReq);
  await openTab(page, "greq");
  await page.click("[onclick=\"QP.grPick('type','complaint')\"]");
  await page.fill("#grRoom", "214");
  await page.fill("#grIni", "M");
  await page.fill("#grNote", lang === "es" ? "Toallas extra. Huésped de ejemplo." : "Extra towels. Example guest.");
  await shot(page, "fd-requests-" + lang + ".png", "#grForm");
  await hold(page);
  await page.click("[onclick='QP.grPost()']");
  await caption(page, t.fdChat);
  await openTab(page, "gchat");
  await shot(page, "fd-chats-" + lang + ".png", "#gcRoot");
  await hold(page);
  const respond = page.locator("[onclick^='gcRespond']");
  if (await respond.count()) await respond.first().click();
  await hold(page);
}

async function housekeeping(page, lang) {
  const t = COPY[lang];
  await fresh(page, lang);
  await pace(page, "hk");
  await page.evaluate(() => {
    const person = USERS.find((user) => user.id === "mspwe-hkr");
    const state = demoState(person);
    state.pin = "4826";
    state.resetRequired = true;
    state.fails = 0;
    state.lockedUntil = 0;
  });
  await caption(page, t.hkIn);
  await hold(page);
  await signIn(page, "mspwe-hkr", "4826");
  await page.waitForSelector("[onclick='submitNewPin()']");
  const tip = page.locator("button[onclick^='respTipX']");
  if (await tip.count()) await tip.click();
  await caption(page, t.hkNew);
  await shot(page, "hk-pin-" + lang + ".png", "[onclick='submitNewPin()']");
  await hold(page);
  await pressPin(page, "7391");
  await page.click("[onclick='submitNewPin()']");
  await page.waitForTimeout(300);
  await caption(page, t.hkAgain);
  await hold(page);
  await pressPin(page, "7391");
  await page.click("[onclick='submitNewPin()']");
  await page.waitForTimeout(600);
  await dismissPopups(page);
  await caption(page, t.hkWhen);
  const done = page.locator("#hhqDoneMe");
  if (await done.count()) await done.scrollIntoViewIfNeeded();
  await shot(page, "hk-when-" + lang + ".png", "#hhqDoneMe");
  await hold(page);
  await caption(page, t.hkRooms);
  await openTab(page, "myrooms");
  await shot(page, "hk-rooms-" + lang + ".png", ".hkroom");
  await hold(page);
  await caption(page, t.hkClean);
  await page.locator(".hkgo").first().click();
  await page.waitForTimeout(300);
  await page.locator("[onclick*=\"'done'\"]").first().click();
  await shot(page, "hk-clean-" + lang + ".png", ".hkroom");
  await hold(page);
  await caption(page, t.hkPhoto);
  await page.locator(".hkroom .hk-report-go").first().click();
  await page.waitForSelector(".hk-tile");
  await page.locator(".hk-tile").first().click();
  await page.setInputFiles("#hkPhoto", photo);
  await page.waitForSelector("#hkSend:not([disabled])", { timeout: 8000 });
  await shot(page, "hk-photo-" + lang + ".png", "#hkReportTitle");
  await hold(page);
  await page.click("#hkSend");
  await page.waitForTimeout(400);
  await caption(page, t.hkPoints);
  await openTab(page, "pts");
  await shot(page, "hk-points-" + lang + ".png", "h2");
  await hold(page);
  await caption(page, t.hkOut);
  await signOut(page);
  await setLang(page, lang);
  await hold(page);
  await signIn(page, "mspwe-la", "2160");
  await caption(page, t.hkWash);
  await openTab(page, "line");
  await shot(page, "hk-laundry-" + lang + ".png", "h2");
  await hold(page);
  await page.locator("[onclick*='Start wash'], [onclick*='loads.unshift']").first().click();
  await hold(page);
}

async function maintenance(page, lang) {
  const t = COPY[lang];
  await fresh(page, lang);
  await pace(page, "mt");
  await caption(page, t.mtIn);
  await hold(page);
  await signIn(page, "mspwe-mt", "2140");
  await caption(page, t.mtWo);
  await openTab(page, "wo");
  await shot(page, "mt-orders-" + lang + ".png", "img.prev, h2");
  await hold(page);
  await page.locator("#foldLaunch button, [onclick*='HQFold.open']").first().click();
  await page.waitForSelector("#opsNote");
  await page.fill("#opsRoom", "214");
  await page.fill("#opsNote", lang === "es" ? "El aire no enfría. Ejemplo." : "AC is not cooling. Example.");
  await hold(page);
  await page.click("[onclick='HQ.send()']");
  await page.waitForTimeout(400);
  const status = page.locator("select").first();
  if (await status.count()) await status.selectOption({ index: 1 });
  await hold(page);
  await caption(page, t.mtPm);
  await openTab(page, "pm");
  await shot(page, "mt-pm-" + lang + ".png", "h2");
  await hold(page);
  const pm = page.locator("[onclick*='pmRoom']");
  if (await pm.count()) {
    await pm.first().click();
    await page.waitForTimeout(400);
    await hold(page);
  }
}

async function manager(page, lang) {
  const t = COPY[lang];
  await fresh(page, lang);
  await pace(page, "gm");
  await caption(page, t.gmIn);
  await hold(page);
  await signIn(page, "mspwe-gm", "2101");
  await shot(page, "gm-dash-" + lang + ".png", "#hhqToday");
  await hold(page);
  await caption(page, t.gmDone);
  const team = page.locator("#hhqDoneTeam");
  if (await team.count()) await team.scrollIntoViewIfNeeded();
  await shot(page, "gm-done-" + lang + ".png", "#hhqDoneTeam");
  await hold(page);
  await caption(page, t.gmBrief);
  await openTab(page, "dbrief");
  await shot(page, "gm-brief-" + lang + ".png", "h2");
  await hold(page);
  await caption(page, t.gmOk);
  await openTab(page, "order");
  const submit = page.locator("[onclick='mkO()']");
  if (await submit.count()) await submit.click();
  await page.waitForTimeout(300);
  await shot(page, "gm-approve-" + lang + ".png", "h2");
  await hold(page);
  const approve = page.locator("[onclick*='Approved']");
  if (await approve.count()) await approve.first().click();
  await hold(page);
}

const FLOWS = [
  ["fd", frontDesk],
  ["hk", housekeeping],
  ["mt", maintenance],
  ["gm", manager]
];

function wanted(id, lang) {
  if (!filter) return true;
  return filter.split(",").includes(id) && (!filter.includes("en") && !filter.includes("es") || filter.includes(lang));
}

function ffmpeg(webm, mp4) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "veryfast", "-movflags", "+faststart", mp4], { stdio: "inherit" });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error("ffmpeg " + code)));
  });
}

function probe(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { stdio: ["ignore", "pipe", "inherit"] });
    let data = "";
    child.stdout.on("data", (buf) => { data += buf; });
    child.on("exit", (code) => code === 0 ? resolve(Number(data.trim())) : reject(new Error("ffprobe " + code)));
  });
}

async function recordOne(browser, id, lang, flow) {
  say("record " + id + " " + lang);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    locale: lang === "es" ? "es-MX" : "en-US",
    recordVideo: { dir: "/tmp/howto-webm", size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  let failed = null;
  try {
    await flow(page, lang);
  } catch (err) {
    failed = err;
    await page.screenshot({ path: "/tmp/howto-fail-" + id + "-" + lang + ".png" }).catch(() => {});
  }
  const video = page.video();
  await context.close();
  const webm = video ? await video.path() : "";
  if (failed) {
    say("FAIL " + id + " " + lang + " " + failed.message);
    throw failed;
  }
  const mp4 = path.join(outDir, id + "-" + lang + ".mp4");
  await ffmpeg(webm, mp4);
  const duration = await probe(mp4);
  say("saved " + mp4 + " " + duration.toFixed(1) + "s");
  return { id: id, lang: lang, seconds: Math.round(duration * 10) / 10, file: "assets/howto/" + id + "-" + lang + ".mp4" };
}

async function helpShots(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  for (const lang of ["en", "es"]) {
    await fresh(page, lang);
    await signIn(page, "mspwe-fd", "2110");
    await page.evaluate(() => { S.howto = "fd"; S.howtoSec = "fd-notes"; go("howto"); });
    await page.waitForSelector("#howtoRoot");
    await page.evaluate(() => {
      ["ptsToast", "toast", "lpToast"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
    });
    await page.screenshot({ path: path.join(outDir, "help-" + lang + ".png") });
    await page.evaluate(() => HHQAsk.open());
    await page.waitForSelector("#askQ");
    await page.fill("#askQ", lang === "es" ? "¿Cómo marco un cuarto limpio?" : "How do I mark a room clean?");
    await page.click("#askForm button[type=submit]");
    await page.waitForSelector("#askCite");
    await page.evaluate(() => {
      ["ptsToast", "toast", "lpToast"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
    });
    await page.screenshot({ path: path.join(outDir, "ask-" + lang + ".png") });
    await page.fill("#askQ", lang === "es" ? "¿Cuál es la clave del wifi?" : "What is the wifi password?");
    await page.click("#askForm button[type=submit]");
    await page.waitForSelector("#askMiss");
    await page.screenshot({ path: path.join(outDir, "ask-unknown-" + lang + ".png") });
    await page.evaluate(() => HHQAsk.close());
    await page.evaluate(() => go("rooms"));
    await page.waitForSelector("#roomBoard");
    await page.evaluate(() => {
      ["ptsToast", "toast", "lpToast"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
    });
    await page.screenshot({ path: path.join(outDir, "fd-rooms-" + lang + ".png") });
    await signOut(page);
  }
  await context.close();
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync("/tmp/howto-webm", { recursive: true });
  const server = serve();
  await new Promise((resolve) => setTimeout(resolve, 400));
  const browser = await chromium.launch({ headless: true });
  const durations = [];
  try {
    for (const [id, flow] of FLOWS) {
      for (const lang of ["en", "es"]) {
        if (!wanted(id, lang)) continue;
        durations.push(await recordOne(browser, id, lang, flow));
      }
    }
    if (!filter || process.env.SHOTS === "1") await helpShots(browser);
  } finally {
    await browser.close();
    server.kill();
  }
  if (durations.length) {
    fs.writeFileSync(path.join(outDir, "durations.json"), JSON.stringify(durations, null, 2) + "\n");
    say(JSON.stringify(durations, null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
