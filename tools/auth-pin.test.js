const assert = require("assert");
const fs = require("fs");
const path = require("path");
const auth = require("../auth-pin.js");

assert.strictEqual(auth.isPin("9001"), true);
assert.strictEqual(auth.isPin("123"), false);
assert.strictEqual(auth.isPin("1234567"), false);
assert.strictEqual(auth.isPin("12a4"), false);
assert.strictEqual(auth.pinRejected("1001"), "retired");
assert.strictEqual(auth.pinRejected("1002"), "retired");
assert.strictEqual(auth.pinRejected("1003"), "retired");
assert.strictEqual(auth.pinRejected("1111"), "trivial");
assert.strictEqual(auth.pinRejected("123456"), "trivial");
assert.strictEqual(auth.pinRejected("908172"), "");
assert.strictEqual(auth.isLiveKey(""), false);
assert.strictEqual(auth.isLiveKey("PASTE_PUBLISHABLE_KEY_HERE"), false);
assert.strictEqual(auth.isLiveKey("sb_publishable_" + "a".repeat(20)), true);
assert.strictEqual(auth.allowsNetwork("demo"), false);
assert.strictEqual(auth.allowsNetwork("live"), true);

const hotelStaff = { id: "fd", name: "Jordan", hotel: "MSPWE", active: true };
const corporate = { id: "corp", name: "Alex", hotel: null, active: true };
const otherHotel = { id: "fd2", name: "Kim", hotel: "MSPAM", active: true };
const shared = { id: "float", name: "Rae", hotel: "MSPAM", extra_hotels: ["MSPWE"], active: true };
const inactive = { id: "old", name: "Pat", hotel: "MSPWE", active: false };
assert.deepStrictEqual(
  [hotelStaff, corporate, otherHotel, shared, inactive].filter((u) => auth.listedForSite(u, "MSPWE", "live")).map((u) => u.id),
  ["fd", "corp", "float"]
);
assert.deepStrictEqual(
  [hotelStaff, corporate, otherHotel, shared].filter((u) => auth.listedForSite(u, "MSPWE", "demo")).map((u) => u.id),
  ["fd", "float"]
);
assert.deepStrictEqual(
  [hotelStaff, corporate].filter((u) => auth.listedForSite(u, "CORP", "live")).map((u) => u.id),
  ["corp"]
);
assert.strictEqual(auth.listedForSite(inactive, "MSPWE", "live"), false);

const corp = { id: "corp", role: "Above Property", hotel: null };
const gm = { id: "gm", role: "GM", hotel: "MSPWE" };
const agm = { id: "agm", role: "AGM", hotel: "MSPWE" };
const desk = { id: "fd", role: "Front Desk", hotel: "MSPWE" };
const other = { id: "fd2", role: "Front Desk", hotel: "MSPAM" };
const lead = { id: "gm2", role: "GM", hotel: "MSPWE" };
assert.strictEqual(auth.canResetPin(corp, desk), true);
assert.strictEqual(auth.canResetPin(corp, gm), true);
assert.strictEqual(auth.canResetPin(corp, corp), false);
assert.strictEqual(auth.canResetPin(gm, desk), true);
assert.strictEqual(auth.canResetPin(gm, other), false);
assert.strictEqual(auth.canResetPin(gm, lead), false);
assert.strictEqual(auth.canResetPin(agm, gm), false);
assert.strictEqual(auth.canResetPin(desk, other), false);

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const config = fs.readFileSync(path.join(root, "config.js"), "utf8");
for (const banned of ["Jay Bhakta", "Chris Uselman", "Roshan Bhakta", "sb_publishable_"]) {
  assert.ok(!html.includes(banned), banned + " is still in index.html");
  assert.ok(!config.includes(banned), banned + " is still in config.js");
}
assert.ok(html.includes("DEMO — example names and PINs"));
assert.ok(html.includes('authMode!=="live"'));
assert.ok(!html.includes("signInWithPassword"), "the page must not call sign-in directly");

const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261029_staff_pin_auth.sql"), "utf8");
assert.ok(sql.includes("hotel_id = any ((select private.my_hotels())::text[])"));
assert.ok(sql.includes("security invoker"));
assert.ok(sql.includes("set search_path = ''"));
assert.ok(sql.includes("revoke all on function public.staff_sign_in_directory() from public, anon, authenticated"));
assert.ok(!sql.includes("Jay"));
assert.ok(!sql.includes("@gmail"));
const seed = fs.readFileSync(path.join(root, "supabase/seed/corporate_account.sql"), "utf8");
assert.ok(seed.includes("FULL NAME"));
assert.ok(seed.includes("TEMPORARY_PIN"));
assert.ok(!seed.includes("Bhakta"));
assert.ok(!seed.includes("Uselman"));

console.log("auth-pin tests passed");
