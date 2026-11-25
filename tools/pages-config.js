/* GitHub Pages configs for HotelHQ.
   Root https://jrhospitality.github.io/hotelhq/ is live.
   https://jrhospitality.github.io/hotelhq/demo/ is the same build in demo mode.
   The SUPABASE_PUBLISHABLE_KEY repository secret is required. A missing or
   unusable secret fails this step so demo mode is never published at the root. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const auth = require("../auth-pin.js");

const SUPABASE_URL = "https://clxvmtbmveusrbxacnxe.supabase.co";
const SECRET = "SUPABASE_PUBLISHABLE_KEY";

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
  manifest.id = "/hotelhq/demo/";
  manifest.start_url = "/hotelhq/demo/";
  manifest.scope = "/hotelhq/demo/";
  manifest.name = "HotelHQ Demo";
  manifest.short_name = "HQ Demo";
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
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
  const writtenDemo = fs.readFileSync(path.join(demoDir, "config.js"), "utf8");
  if (writtenDemo.includes(key) || !writtenDemo.includes('"mode":"demo"') || !writtenDemo.includes('"supabaseKey":""')) {
    fail("Demo config was not written as mode demo with an empty key.");
  }
  fs.writeFileSync(path.join(site, "config.js"), configSource("live", key));
  const writtenLive = fs.readFileSync(path.join(site, "config.js"), "utf8");
  if (!writtenLive.includes('"mode":"live"') || !writtenLive.includes(key)) {
    fail("Live config was not written for the root site.");
  }
  console.log("Wrote live config.js for /hotelhq/ and demo config for /hotelhq/demo/.");
}

main();
