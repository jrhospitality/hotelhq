const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const ask = fs.readFileSync(path.join(root, "ask-hotelhq.js"), "utf8");
const fn = fs.readFileSync(path.join(root, "supabase/functions/ask-hotelhq/index.ts"), "utf8");

test("Ask HotelHQ stays on the guides and skips the network in demo", () => {
  assert.match(ask, /HHQHowTo\.answer/);
  assert.match(ask, /authMode !== "live"/);
  assert.match(ask, /data\.configured === false/);
  assert.match(ask, /data\.answer === "UNKNOWN"/);
  assert.match(ask, /data\.sectionId !== hit\.sectionId/);
  assert.match(ask, /functions\/v1\/ask-hotelhq/);
  assert.match(ask, /id="askCite"/);
  assert.match(ask, /id="askMiss"/);
  assert.doesNotMatch(ask, /sk-[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(ask, /HOTELHQ_ASK_API_KEY\s*=\s*["']/);
});

test("the edge function needs HOTELHQ_ASK_API_KEY and does not invent without the section", () => {
  assert.match(fn, /Deno\.env\.get\("HOTELHQ_ASK_API_KEY"\)/);
  assert.match(fn, /configured: false/);
  assert.match(fn, /UNKNOWN/);
  assert.match(fn, /Use only the steps given to you/);
  assert.match(fn, /HOTELHQ_ASK_API_URL/);
  assert.match(fn, /HOTELHQ_ASK_MODEL/);
  assert.match(fn, /gpt-4o-mini/);
  assert.doesNotMatch(fn, /sk-[A-Za-z0-9]{8,}/);
  assert.doesNotMatch(fn, /HOTELHQ_ASK_API_KEY\s*=\s*["'][^"']+/);
  assert.doesNotMatch(fn, /drop table/i);
});
