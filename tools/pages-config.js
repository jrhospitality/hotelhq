/* GitHub Pages configs for HotelHQ.
   Root https://jrhospitality.github.io/hotelhq/ is live.
   https://jrhospitality.github.io/hotelhq/demo/ is the same build in demo mode.
   The SUPABASE_PUBLISHABLE_KEY repository secret is required. A missing or
   unusable secret fails this step so demo mode is never published at the root.
   The demo copy gets its own manifest, service worker, and offline page.
   The live shell at the root is not rewritten. */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const auth = require("../auth-pin.js");

const SUPABASE_URL = "https://clxvmtbmveusrbxacnxe.supabase.co";
const SECRET = "SUPABASE_PUBLISHABLE_KEY";
const DEMO_SCOPE = "/hotelhq/demo/";
const BRAND = "#14365d";

function configSource(mode, supabaseKey) {
  return "window.HOTELHQ_CONFIG=" + JSON.stringify({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: supabaseKey,
    mode: mode
  }) + ";\n";
}

function fail(message) {
  console.error("::error title=" + SECRET + "::" + message);
  console.error(message);
  process.exit(1);
}

function copySite(src, dest) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "hhq-demo-"));
  try {
    fs.cpSync(src, staging, {
      recursive: true,
      filter(source) {
        const rel = path.relative(src, source);
        if (!rel) return true;
        const top = rel.split(path.sep)[0];
        return top !== "demo" && top !== ".git" && top !== "node_modules";
      }
    });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(staging, dest, { recursive: true });
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function writeDemoManifest(file) {
  if (!fs.existsSync(file)) return;
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.id = DEMO_SCOPE;
  manifest.name = "HotelHQ";
  manifest.short_name = "HotelHQ";
  manifest.description = "HotelHQ demo. Example names only. No live staff or guest data.";
  manifest.start_url = DEMO_SCOPE;
  manifest.scope = DEMO_SCOPE;
  manifest.display = "standalone";
  manifest.background_color = BRAND;
  manifest.theme_color = BRAND;
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
}

function writeDemoServiceWorker(demoDir) {
  const templatePath = path.join(__dirname, "demo-sw.js");
  const offlinePath = path.join(__dirname, "demo-offline.html");
  if (!fs.existsSync(templatePath)) fail("Demo service worker template is missing.");
  if (!fs.existsSync(offlinePath)) fail("Demo offline page is missing.");
  const offline = fs.readFileSync(offlinePath);
  const stamp = crypto.createHash("sha256").update(offline).digest("hex").slice(0, 12);
  let src = fs.readFileSync(templatePath, "utf8");
  if (!src.includes("__OFFLINE_STAMP__")) fail("Demo service worker is missing its cache stamp.");
  src = src.replace("__OFFLINE_STAMP__", stamp);
  fs.writeFileSync(path.join(demoDir, "sw.js"), src);
  fs.writeFileSync(path.join(demoDir, "offline.html"), offline);
}

function replaceAll(text, from, to) {
  if (!text.includes(from)) return text;
  return text.split(from).join(to);
}

function patchDemoShell(demoDir) {
  const indexPath = path.join(demoDir, "index.html");
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, "utf8");
    html = replaceAll(
      html,
      "if(d>=0) return path.slice(0,d+demo.length);",
      "if(d>=0) return path.slice(0,d+demo.length);\n  if(/\\/demo$/.test(path)) return path+\"/\";"
    );
    html = replaceAll(
      html,
      "navigator.serviceWorker.register(\"sw.js\",{scope:scope})",
      "navigator.serviceWorker.register(\"sw.js\",{scope:scope,updateViaCache:\"none\"})"
    );
    fs.writeFileSync(indexPath, html);
  }
  const promptPath = path.join(demoDir, "pwa-install.js");
  if (fs.existsSync(promptPath)) {
    let prompt = fs.readFileSync(promptPath, "utf8");
    prompt = replaceAll(
      prompt,
      "var HIDE_KEY = \"hhq_pwa_install_hide_until\";",
      "var HIDE_KEY = \"hhq_demo_pwa_install_hide_until\";"
    );
    if (!prompt.includes("body.is-login #pwaInstall{display:block!important}")) {
      prompt = replaceAll(
        prompt,
        "@media print{#pwaInstall,a.pwa-menu{display:none!important}}",
        "@media print{#pwaInstall,a.pwa-menu{display:none!important}}body.is-login #pwaInstall{display:block!important}body.is-login:has(#pwaInstall) #askHqBtn{display:none!important}"
      );
    }
    fs.writeFileSync(promptPath, prompt);
  }
}

function rewriteDemoInstallGuide(demoDir) {
  const file = path.join(demoDir, "install.html");
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, "utf8");
  html = html.split("https://jrhospitality.github.io/hotelhq/").join("https://jrhospitality.github.io/hotelhq/demo/");
  html = html.split("/hotelhq/</p>").join("/hotelhq/demo/</p>");
  fs.writeFileSync(file, html);
  if (/https:\/\/jrhospitality\.github\.io\/hotelhq\/(?!demo\/)/.test(html)) {
    fail("Demo install guide still points at the live site.");
  }
  const qr = path.join(__dirname, "demo-install-qr.svg");
  if (!fs.existsSync(qr)) fail("Demo install QR is missing.");
  fs.copyFileSync(qr, path.join(demoDir, "install-qr.svg"));
}

function assertDemoPwa(site, demoDir, key) {
  const manifestPath = path.join(demoDir, "manifest.webmanifest");
  if (!fs.existsSync(manifestPath)) fail("Demo manifest is missing.");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.name !== "HotelHQ" || manifest.short_name !== "HotelHQ") {
    fail("Demo manifest name is not HotelHQ.");
  }
  if (manifest.start_url !== DEMO_SCOPE || manifest.scope !== DEMO_SCOPE || manifest.id !== DEMO_SCOPE) {
    fail("Demo manifest scope is not /hotelhq/demo/.");
  }
  if (!String(manifest.start_url).startsWith(manifest.scope)) fail("Demo start_url is outside the manifest scope.");
  if (manifest.display !== "standalone") fail("Demo manifest is not standalone.");
  if (manifest.background_color !== BRAND || manifest.theme_color !== BRAND) {
    fail("Demo manifest colors do not match HotelHQ.");
  }
  (manifest.icons || []).forEach(function (icon) {
    const src = String(icon.src || "");
    if (/^https?:/i.test(src) || src.indexOf("/hotelhq/") === 0) {
      fail("Demo manifest icons must stay relative to the demo.");
    }
  });
  const sw = fs.readFileSync(path.join(demoDir, "sw.js"), "utf8");
  if (!/hotelhq-demo-static-v1-[0-9a-f]{12}/.test(sw) || sw.includes("__OFFLINE_STAMP__") || sw.includes("hotelhq-shell-")) {
    fail("Demo service worker was not installed.");
  }
  if (key && sw.includes(key)) fail("Refusing to write the publishable key into the demo service worker.");
  if (!fs.existsSync(path.join(demoDir, "offline.html"))) fail("Demo offline page was not installed.");
  const rootSwPath = path.join(site, "sw.js");
  if (fs.existsSync(rootSwPath)) {
    const rootSw = fs.readFileSync(rootSwPath, "utf8");
    if (/var CACHE_VERSION = "hotelhq-demo-static-/.test(rootSw)) {
      fail("Refusing to replace the live service worker.");
    }
  }
  const rootManifestPath = path.join(site, "manifest.webmanifest");
  if (fs.existsSync(rootManifestPath)) {
    const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, "utf8"));
    if (rootManifest.scope === DEMO_SCOPE || rootManifest.start_url === DEMO_SCOPE) {
      fail("Refusing to point the live manifest at the demo.");
    }
  }
  const demoIndexPath = path.join(demoDir, "index.html");
  const rootIndexPath = path.join(site, "index.html");
  if (fs.existsSync(demoIndexPath) && fs.existsSync(rootIndexPath)) {
    const demoIndex = fs.readFileSync(demoIndexPath, "utf8");
    const rootIndex = fs.readFileSync(rootIndexPath, "utf8");
    if (demoIndex.includes("function appScope") && !demoIndex.includes("updateViaCache:\"none\"")) {
      fail("Demo service worker registration was not set to update promptly.");
    }
    if (demoIndex.includes("function appScope") && !demoIndex.includes("/demo$")) {
      fail("Demo scope does not cover /demo without a trailing slash.");
    }
    if (rootIndex.includes("/demo$")) {
      fail("Refusing to point the live app scope at the demo.");
    }
  }
  const demoPrompt = path.join(demoDir, "pwa-install.js");
  if (fs.existsSync(demoPrompt)) {
    const prompt = fs.readFileSync(demoPrompt, "utf8");
    if (!prompt.includes("hhq_demo_pwa_install_hide_until")) {
      fail("Demo install prompt dismiss key was not separated from the live site.");
    }
    if (!prompt.includes("beforeinstallprompt") || !prompt.includes("Add to Home Screen") || !prompt.includes("Agregar a inicio")) {
      fail("Demo install prompt is missing English or Spanish copy.");
    }
    if (!prompt.includes("body.is-login #pwaInstall{display:block!important}")) {
      fail("Demo install prompt stays hidden on the sign-in screen.");
    }
  }
  const rootPrompt = path.join(site, "pwa-install.js");
  if (fs.existsSync(rootPrompt)) {
    const livePrompt = fs.readFileSync(rootPrompt, "utf8");
    if (livePrompt.includes("hhq_demo_pwa_install_hide_until")) {
      fail("Refusing to use the demo dismiss key on the live install prompt.");
    }
  }
  const guide = path.join(demoDir, "install.html");
  if (fs.existsSync(guide)) {
    const html = fs.readFileSync(guide, "utf8");
    if (/https:\/\/jrhospitality\.github\.io\/hotelhq\/(?!demo\/)/.test(html)) {
      fail("Demo install guide still points at the live site.");
    }
  }
}

function main() {
  const site = path.resolve(process.env.PAGES_ROOT || path.join(__dirname, ".."));
  const key = String(process.env[SECRET] || "").trim();
  if (!auth.isLiveKey(key)) {
    fail("The " + SECRET + " repository secret is missing or is not a publishable key. Refusing to deploy. The root site will not be published in demo mode.");
  }
  const demoDir = path.join(site, "demo");
  copySite(site, demoDir);
  const demoConfig = configSource("demo", "");
  if (demoConfig.includes(key)) fail("Refusing to write the publishable key into the demo config.");
  fs.writeFileSync(path.join(demoDir, "config.js"), demoConfig);
  writeDemoManifest(path.join(demoDir, "manifest.webmanifest"));
  writeDemoServiceWorker(demoDir);
  patchDemoShell(demoDir);
  rewriteDemoInstallGuide(demoDir);
  const writtenDemo = fs.readFileSync(path.join(demoDir, "config.js"), "utf8");
  if (writtenDemo.includes(key) || !writtenDemo.includes('"mode":"demo"') || !writtenDemo.includes('"supabaseKey":""')) {
    fail("Demo config was not written as mode demo with an empty key.");
  }
  fs.writeFileSync(path.join(site, "config.js"), configSource("live", key));
  const writtenLive = fs.readFileSync(path.join(site, "config.js"), "utf8");
  if (!writtenLive.includes('"mode":"live"') || !writtenLive.includes(key)) {
    fail("Live config was not written for the root site.");
  }
  assertDemoPwa(site, demoDir, key);
  console.log("Wrote live config.js for /hotelhq/ and an installable demo at /hotelhq/demo/.");
}

main();
