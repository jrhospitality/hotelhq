const test = require("node:test");
const assert = require("node:assert/strict");
const forms = require("../forms.js");

test("labels follow the active language", () => {
  global.LANG = "es";
  const html = forms.html({
    id: "note",
    fields: [
      { id: "ckn", en: "Checklist note", es: "Nota de la lista" },
      { id: "kind", type: "select", en: "Type", es: "Tipo", options: [{ value: "a", en: "Lamp", es: "Lámpara" }] }
    ],
    submitEn: "Save",
    submitEs: "Guardar"
  });
  assert.match(html, /Nota de la lista/);
  assert.match(html, /Guardar/);
  assert.match(html, /Lámpara/);
  assert.equal(html.includes("Checklist note"), false);
  global.LANG = "en";
  assert.match(forms.html({ fields: [{ id: "ckn", en: "Checklist note", es: "Nota de la lista" }], submitEn: "Save" }), /Checklist note/);
  assert.equal(forms.show("Saved", "Guardado"), "Saved");
});
