const assert = require("assert");
const fs = require("fs");
const path = require("path");
const names = require("../name-match.js");

const root = path.join(__dirname, "..");

assert.strictEqual(names.foldName("José"), "jose");
assert.strictEqual(names.foldName("Peña"), "pena");
assert.strictEqual(names.foldName("  Núñez  "), "nunez");
assert.strictEqual(names.minQueryLength("demo"), 1);
assert.strictEqual(names.minQueryLength("live"), 2);
assert.strictEqual(names.editDistance("gina", "ginna", 1), 1);
assert.strictEqual(names.editDistance("jsoe", "jose", 1), 1);

const lucia = {
  id: "lucia",
  name: "Lucía Peña Navarro",
  preferred_name: "Lucha",
  aliases: ["Luz"],
  hotel: "MSPWE",
  active: true
};
const jose = { id: "jose", name: "José Marín López", hotel: "MSPWE", active: true };
const ana = { id: "ana", name: "Ana Lopez", hotel: "MSPWE", active: true };
const joanna = { id: "joanna", name: "Joanna Smith", hotel: "MSPWE", active: true };
const grace = { id: "grace", name: "Grace Patel", hotel: "MSPWE", active: true };
const other = { id: "other", name: "Lucía Peña Navarro", hotel: "MSPAM", active: true };
const inactive = { id: "old", name: "Lucía Peña Navarro", preferred_name: "Lucha", hotel: "MSPWE", active: false };
const corp = { id: "corp", name: "Alex Rivera", hotel: null, active: true };
const floater = { id: "float", name: "Rae Quinn", hotel: "MSPAM", extra_hotels: ["MSPWE"], active: true };
const people = [lucia, jose, ana, joanna, grace, other, inactive, corp, floater];

function ids(query, hotel, mode) {
  return names.matchNames(people, query, hotel, mode).map((row) => row.id);
}

assert.deepStrictEqual(ids("lu", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("lucha", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("luz", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("pena", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("navarro", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("lucia", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("pena navarro", "MSPWE", "demo"), ["lucia"]);
assert.deepStrictEqual(ids("jose", "MSPWE", "demo"), ["jose"]);
assert.deepStrictEqual(ids("marin", "MSPWE", "demo"), ["jose"]);
assert.ok(ids("lu", "MSPWE", "demo").indexOf("old") === -1);
assert.ok(ids("lu", "MSPWE", "demo").indexOf("other") === -1);
assert.deepStrictEqual(ids("l", "MSPWE", "live"), []);
assert.deepStrictEqual(ids("lu", "MSPAM", "demo"), ["other"]);
assert.deepStrictEqual(ids("quinn", "MSPWE", "demo"), ["float"]);
assert.deepStrictEqual(ids("al", "MSPWE", "demo"), []);
assert.deepStrictEqual(ids("al", "MSPWE", "live"), ["corp"]);
assert.deepStrictEqual(ids("al", "CORP", "demo"), ["corp"]);
assert.deepStrictEqual(ids("", "MSPWE", "demo"), []);
assert.deepStrictEqual(ids("zz", "NOPE", "demo"), []);

const ranked = ids("an", "MSPWE", "demo");
assert.strictEqual(ranked[0], "ana");
assert.ok(ranked.indexOf("ana") < ranked.indexOf("joanna"));
assert.ok(names.scorePerson(grace, "grace") > names.scorePerson({ name: "Grase Patel", hotel: "MSPWE" }, "grace"));
assert.strictEqual(names.scorePerson({ name: "Hi There", hotel: "MSPWE" }, "gi"), 0);

const many = [];
for (let i = 0; i < 12; i++) many.push({ id: "p" + i, name: "Ana " + i, hotel: "MSPWE", active: true });
assert.strictEqual(names.matchNames(many, "an", "MSPWE", "demo").length, 8);
assert.strictEqual(names.displayName(lucia), "Lucha");
assert.strictEqual(names.displayName(jose), "José Marín López");
assert.deepStrictEqual(names.cleanList([" Vale ", "vale", "", "x".repeat(41), "Sol"]), ["Vale", "Sol"]);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const fn = fs.readFileSync(path.join(root, "supabase/functions/pin-auth/index.ts"), "utf8");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261125_staff_name_search.sql"), "utf8");
assert.ok(html.includes('src="name-match.js"'));
assert.ok(!html.includes('id="loginWho"'));
assert.ok(html.includes("staff_sign_in_search"));
assert.ok(html.includes('action:"search"'));
assert.ok(html.includes("Continue as {name}"));
assert.ok(html.includes("Type one more letter."));
assert.ok(!html.includes("Georgina"));
assert.ok(!html.includes("Vergara"));
assert.ok(fn.includes('action === "search"'));
assert.ok(fn.includes(".slice(0, 8)"));
assert.ok(fn.includes("q.length < 2"));
assert.ok(sql.includes("where p.active"));
assert.ok(sql.includes("limit 8"));
assert.ok(sql.includes("length(q) < 2"));
assert.ok(sql.includes("revoke all on function public.staff_sign_in_search(text, text) from public, anon, authenticated"));
assert.ok(sql.includes("security definer"));
assert.ok(sql.includes("set search_path = ''"));
assert.ok(sql.includes("preferred_name"));
assert.ok(sql.includes("add column if not exists aliases"));
assert.ok(!sql.toLowerCase().includes("delete from"));
assert.ok(!sql.toLowerCase().includes("drop table"));
assert.ok(!/insert into public\.profiles/i.test(sql));
assert.ok(!sql.includes("Jay"));
assert.ok(!sql.includes("@gmail"));
assert.ok(!sql.includes("clxvmtbmveusrbxacnxe"));

console.log("name-match tests passed");
