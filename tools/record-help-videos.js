/* Records the day-one demo videos. Example data only. Pins are typed as dots
   and are not written into the caption files. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const origin = process.env.HELP_ORIGIN || "http://127.0.0.1:8765";
const outDir = path.join(__dirname, "..", "media", "help");
const photo = path.join(__dirname, "..", "icon-192.png");
const rawDir = path.join(__dirname, "..", ".video-raw");

function pad(n, w) { return String(n).padStart(w || 2, "0"); }
function stamp(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  return pad(Math.floor(ms / 3600000)) + ":" + pad(Math.floor(ms % 3600000 / 60000)) + ":" + pad(Math.floor(ms % 60000 / 1000)) + "." + pad(ms % 1000, 3);
}
function vtt(cues, lang) {
  let out = "WEBVTT\n\n";
  cues.forEach(function (cue, i) {
    const start = cue.t;
    const next = cues[i + 1] ? cues[i + 1].t : start + 3.2;
    const end = Math.max(next - 0.05, start + 0.8);
    out += stamp(start) + " --> " + stamp(end) + "\n" + cue[lang] + "\n\n";
  });
  return out;
}
function freshPin() {
  let pin = "";
  do {
    pin = String(1000 + Math.floor(Math.random() * 9000));
  } while (/^(\d)\1+$/.test(pin) || pin === "1234" || pin === "4321");
  return pin;
}

async function dismiss(page) {
  const later = page.locator("#pwaLater");
  if (await later.count() && await later.isVisible().catch(() => false)) await later.click().catch(() => {});
  const skip = page.locator("#uxTour button").filter({ hasText: /Skip|Saltar/ });
  if (await skip.count() && await skip.isVisible().catch(() => false)) await skip.click().catch(() => {});
}

async function boot(page, lang) {
  await page.goto(origin + "/index.html", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.evaluate((code) => setLang(code), lang);
  await page.waitForSelector("#loginHotel");
  await dismiss(page);
}

async function showHotel(page) {
  await page.fill("#loginHotel", "Golden");
  await page.locator("#loginHotelHits button").first().click();
  await page.waitForSelector("#loginFind");
}

async function enterTempPin(page, userId) {
  await page.evaluate(async (id) => {
    const u = USERS.find((row) => row.id === id);
    const st = demoState(u);
    st.resetRequired = true;
    st.fails = 0;
    st.lockedUntil = 0;
    loginSite = "MSPWE";
    loginUid = id;
    loginPin = st.pin;
    await signIn();
  }, userId);
  await page.waitForSelector("#app .login h2");
  await page.locator("#app .kp").scrollIntoViewIfNeeded();
}

async function chooseOwnPin(page) {
  const pin = freshPin();
  const keys = page.locator("#app .kp button");
  for (const digit of pin) {
    await keys.filter({ hasText: new RegExp("^" + digit + "$") }).click();
    await page.waitForTimeout(180);
  }
  await page.locator("#app .kp button.btn").click();
  await page.waitForTimeout(500);
  for (const digit of pin) {
    await page.locator("#app .kp button").filter({ hasText: new RegExp("^" + digit + "$") }).click();
    await page.waitForTimeout(180);
  }
  await page.locator("#app .kp button.btn").click();
  await page.waitForSelector("#wlGo, #uxHero, #app h2");
}

async function passWelcome(page) {
  await page.evaluate(() => {
    try { localStorage.setItem("hhq_tour_" + (S.uid || ""), "1"); } catch (e) {}
  });
  const goBtn = page.locator("#wlGo");
  if (await goBtn.count()) await goBtn.click();
  await dismiss(page);
  await page.waitForSelector("#uxHero, #app h2");
}

async function openTab(page, id) {
  await page.evaluate((tab) => { go(tab); scrollTo(0, 0); }, id);
  await page.waitForTimeout(350);
  await dismiss(page);
}

async function recordOne(browser, spec) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    hasTouch: true,
    locale: spec.lang === "es" ? "es-MX" : "en-US",
    recordVideo: { dir: rawDir, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  const cues = [];
  const started = Date.now();
  const cue = (en, es) => cues.push({ t: (Date.now() - started) / 1000, en: en, es: es });
  const hold = (ms) => page.waitForTimeout(Math.round(ms * 2.2));
  try {
    await boot(page, spec.lang);
    cue(
      "Day one at Holiday Inn Express Golden Valley. This is the HotelHQ demo. Names and messages here are examples.",
      "Primer día en Holiday Inn Express Golden Valley. Esta es la demo de HotelHQ. Los nombres y mensajes son de ejemplo."
    );
    await showHotel(page);
    cue(
      "Choose your hotel, then your name. Enter the temporary PIN your manager showed you. The dots hide the numbers. Then tap Sign in.",
      "Elige tu hotel y luego tu nombre. Escribe el PIN temporal que te mostró tu gerente. Los puntos ocultan los números. Luego toca Entrar."
    );
    await hold(4200);
    await enterTempPin(page, spec.user);
    cue(
      "A reset PIN works once. HotelHQ asks you to choose your own 4 to 6 digit PIN. Tap Save, enter it again, and tap Save.",
      "Un PIN restablecido sirve una vez. HotelHQ pide que elijas tu propio PIN de 4 a 6 dígitos. Toca Guardar, escríbelo otra vez y toca Guardar."
    );
    await hold(1800);
    await chooseOwnPin(page);
    cue(
      "You are in. If a welcome message is showing, tap Let's go. Home has your greeting, Search, and your top tasks.",
      "Ya entraste. Si aparece la bienvenida, toca ¡Vamos!. Inicio tiene el saludo, Buscar y tus tareas principales."
    );
    await hold(1600);
    await passWelcome(page);
    await hold(3200);
    await spec.flow(page, cue, hold, spec.lang);
    cue(
      "Open Help from More, or tap Ask HotelHQ on any screen. Ask answers only from these guides.",
      "Abre Ayuda desde Más, o toca Pregunta a HotelHQ en cualquier pantalla. Pregunta responde solo con estas guías."
    );
    await hold(2800);
  } catch (error) {
    await page.screenshot({ path: path.join(rawDir, spec.id + "-" + spec.lang + "-fail.png") }).catch(() => {});
    throw error;
  }
  const video = page.video();
  await context.close();
  const webm = await video.path();
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, spec.id + "-" + spec.lang);
  fs.writeFileSync(base + ".en.vtt", vtt(cues, "en"));
  fs.writeFileSync(base + ".es.vtt", vtt(cues, "es"));
  fs.writeFileSync(base + ".webm-path", webm);
  const seconds = cues.length ? cues[cues.length - 1].t + 3 : 0;
  console.log(spec.id + "-" + spec.lang, Math.round(seconds) + "s", webm);
  if (seconds < 50 || seconds > 130) console.warn("DURATION " + spec.id + " " + spec.lang + " " + Math.round(seconds));
}

const specs = [
  {
    id: "front-desk",
    user: "mspwe-fd",
    async flow(page, cue, hold) {
      cue(
        "On a phone the bar is Home, Guest requests, Rooms, Shift notes, and More. Unread shift notes show on Home.",
        "En el teléfono la barra es Inicio, Solicitudes, Cuartos, Notas y Más. Las notas sin leer aparecen en Inicio."
      );
      await hold(3500);
      await openTab(page, "notes");
      cue(
        "Shift notes: pick AM, PM, or Night Audit, write the handoff, and tap Post handoff.",
        "Notas de turno: elige AM, PM o Auditoría nocturna, escribe el pase y toca Publicar pase."
      );
      await page.fill("#nt", "Sample handoff for the next shift.");
      await hold(1200);
      await page.locator("button[onclick='addN()']").click();
      await hold(2800);
      await openTab(page, "gchat");
      cue(
        "Guest chats lists messages waiting on a reply. Answer in the brand chat, then tap Mark responded. This list is the demo. It is not on the live site until a feed is connected.",
        "Chats de huéspedes lista los mensajes que esperan respuesta. Responde en el chat de la marca y toca Marcar respondido. Esta lista es la demo. No está en el sitio en vivo hasta que se conecte el feed."
      );
      await hold(4500);
      await openTab(page, "greq");
      cue(
        "Guest requests: room number and last initial only, what the guest needs, then Send. Tap On it when you start, and Resolve when it is done.",
        "Solicitudes: solo número de habitación e inicial del apellido, qué necesita el huésped, y Enviar. Toca En camino al empezar y Resolver al terminar."
      );
      await page.fill("#grRoom", "214");
      await page.fill("#grIni", "S");
      await page.fill("#grNote", "Sample towels");
      await hold(1500);
      await page.locator("#grForm button.btn").click();
      await hold(2800);
    }
  },
  {
    id: "housekeeping",
    user: "mspwe-hkr",
    async flow(page, cue, hold, lang) {
      cue(
        "Room attendant Home shows today's rooms and, when standards are loaded, Expected done by.",
        "El inicio de la camarista muestra los cuartos de hoy y, si hay estándares, la hora prevista."
      );
      await hold(3500);
      await openTab(page, "myrooms");
      cue(
        "My Rooms lists only your rooms. Tap Start, then Done / Clean when you finish. Rush rooms are first. DND and Refused are on the card.",
        "Mis cuartos lista solo tus cuartos. Toca Empezar y luego Listo / Limpio al terminar. Los urgentes van primero. No molestar y Rechazó servicio están en la tarjeta."
      );
      const start = page.locator("button.hkgo").filter({ hasText: /Start|Empezar/ }).first();
      if (await start.count()) await start.click();
      await hold(1800);
      const done = page.locator("button.hkgo").filter({ hasText: /Done \/ Clean|Listo \/ Limpio/ }).first();
      if (await done.count()) await done.click();
      await hold(2500);
      await openTab(page, "pts");
      cue(
        "Points & Rewards, in More, shows your points, level, and how points are earned.",
        "Puntos y premios, en Más, muestra tus puntos, tu nivel y cómo se ganan."
      );
      await hold(3200);
      await page.evaluate(() => signOut());
      await page.waitForSelector("#loginHotel");
      cue(
        "Laundry signs in the same way, then opens Station.",
        "Lavandería entra igual y luego abre Estación."
      );
      await hold(1800);
      await page.evaluate(async () => {
        const u = USERS.find((row) => row.id === "mspwe-la");
        const st = demoState(u);
        st.resetRequired = false;
        loginSite = "MSPWE";
        loginUid = u.id;
        loginPin = st.pin;
        await signIn();
      });
      await page.waitForSelector("#wlGo, #uxHero");
      await passWelcome(page);
      await openTab(page, "line");
      cue(
        "Loads log: Start wash, Start dry, then Finish. Update linen counts. LOW means under 70 percent of par. Request a chemical refill from the same screen.",
        "Registro de cargas: Empezar lavado, Empezar secado y Terminar. Actualiza los conteos. BAJO significa menos del 70 por ciento del par. Pide relleno de químico en la misma pantalla."
      );
      await hold(4500);
      if (lang === "es") await page.locator("text=Lavandería").first().waitFor().catch(() => {});
    }
  },
  {
    id: "maintenance",
    user: "mspwe-mt",
    async flow(page, cue, hold) {
      cue(
        "Maintenance Home opens work orders, a new order with a photo, today's PMs, and My Tasks.",
        "El inicio de mantenimiento abre órdenes, una orden nueva con foto, los MP de hoy y Mis tareas."
      );
      await hold(3200);
      await openTab(page, "wo");
      cue(
        "Tap New request. Work order is selected. Enter the room and what is wrong, add a photo, then Send. Change the status on the order and add a comment if you need to.",
        "Toca Nueva solicitud. Orden de trabajo ya está elegida. Escribe el cuarto y qué pasa, agrega una foto y toca Enviar. Cambia el estatus en la orden y agrega un comentario si hace falta."
      );
      await page.locator("#foldLaunch button").click();
      await page.waitForSelector("#opsRoom");
      await page.fill("#opsRoom", "212");
      await page.fill("#opsNote", "Sample: PTAC is noisy");
      await page.setInputFiles("#wf", photo);
      await page.waitForSelector("#wpv:not([hidden])");
      await hold(800);
      await page.locator("#opsSheet button.btn").click();
      await hold(3000);
      await openTab(page, "pm");
      cue(
        "Preventive maintenance shows the quarter pace and today's room PMs. Tap PM 582 for the guestroom checklist, then mark that room complete. Equipment PMs are listed by due date.",
        "Mantenimiento preventivo muestra el ritmo del trimestre y los MP de hoy. Toca PM 582 para la lista de la habitación y marca ese cuarto terminado. Los MP de equipo están por fecha."
      );
      await hold(2500);
      const pm = page.locator("button").filter({ hasText: "PM 582" }).first();
      if (await pm.count()) await pm.click();
      await hold(3500);
    }
  },
  {
    id: "gm",
    user: "mspwe-gm",
    async flow(page, cue, hold) {
      cue(
        "GM and AGM Home shows the Daily Briefing when those numbers exist: occupancy, arrivals, labor, and open work orders. Full briefing opens the same blocks.",
        "El inicio del gerente y del subgerente muestra el Resumen diario cuando hay números: ocupación, llegadas, labor y órdenes abiertas. Resumen completo abre los mismos bloques."
      );
      await hold(4000);
      await openTab(page, "dbrief");
      await hold(2800);
      await openTab(page, "naudit");
      cue(
        "Night Audit is the morning review. Mark each item Done, Not an issue, or Explain. Demo rows are samples. Live rows come from the HotelKey feed.",
        "Auditoría nocturna es la revisión de la mañana. Marca cada caso Listo, No es problema o Explicar. En demo las filas son de ejemplo. En vivo vienen del feed de HotelKey."
      );
      await hold(4000);
      await openTab(page, "team");
      cue(
        "Team lists your hotel. Open a person to see their position. Reset PIN is there when you are allowed to reset it. You cannot reset your own.",
        "Equipo lista tu hotel. Abre a una persona para ver su puesto. Reset PIN está ahí cuando puedes restablecerlo. No puedes restablecer el tuyo."
      );
      await hold(3500);
      await openTab(page, "gcomm");
      cue(
        "Guest comments are the reviews. Open one, then Actioned, Not an issue, or Assign. This screen is on the demo. Live mode adds it when the feed is connected.",
        "Comentarios de huéspedes son las reseñas. Abre uno y elige Atendido, No es problema o Asignar. Esta pantalla está en la demo. El modo en vivo la agrega cuando se conecte el feed."
      );
      await hold(4000);
    }
  }
];

async function main() {
  fs.mkdirSync(rawDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.HELP_CHROME || "chrome" });
  const only = process.env.HELP_ONLY || "";
  const langs = (process.env.HELP_LANG || "en,es").split(",");
  try {
    for (const spec of specs) {
      if (only && only.split(",").indexOf(spec.id) < 0) continue;
      for (const lang of langs) {
        await recordOne(browser, Object.assign({}, spec, { lang: lang }));
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
