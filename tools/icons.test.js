const test = require("node:test");
const assert = require("node:assert/strict");
const icons = require("../icons.js");

test("ui emoji become inline svg and stay out of the markup", () => {
  const html = icons.replaceIcons("🏠 Home 🛏️ 🔧");
  assert.match(html, /<svg class="i"/);
  assert.equal(html.includes("🏠"), false);
  assert.equal(html.includes("🛏️"), false);
  assert.equal(html.includes("🔧"), false);
  assert.match(icons.iconHtml("🏠"), /viewBox="0 0 24 24"/);
  assert.match(icons.iconHtml("🏠"), /stroke="currentColor"/);
  assert.equal(icons.iconHtml("not-an-icon"), "");
});
