/* One form builder with English and Spanish labels, and one toast.
   Low-risk screens (checklist note) use the builder. Other screens can call
   HHQForm.html and HHQToast.show. */
(function (root) {
  "use strict";

  function lang() {
    if (typeof LANG !== "undefined" && LANG === "es") return "es";
    if (root.LANG === "es") return "es";
    return "en";
  }
  function label(field) {
    if (!field) return "";
    if (lang() === "es") return field.es || field.en || "";
    return field.en || field.es || "";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function fieldHtml(field) {
    var id = field.id;
    var lab = label(field);
    var common = ' id="' + esc(id) + '" aria-label="' + esc(lab) + '"';
    var control = "";
    if (field.type === "textarea") control = "<textarea" + common + " placeholder=\"" + esc(lab) + "\"></textarea>";
    else if (field.type === "select") {
      control = "<select" + common + ">" + (field.options || []).map(function (o) {
        var value = typeof o === "string" ? o : o.value;
        var text = typeof o === "string" ? o : label(o);
        return '<option value="' + esc(value) + '">' + esc(text) + "</option>";
      }).join("") + "</select>";
    } else control = '<input' + common + ' type="' + esc(field.type || "text") + '" placeholder="' + esc(lab) + '">';
    return "<label>" + esc(lab) + control + "</label>";
  }
  function html(form) {
    form = form || {};
    var fields = (form.fields || []).map(fieldHtml).join("");
    var submit = lang() === "es" ? (form.submitEs || form.submitEn || "Guardar") : (form.submitEn || "Save");
    var action = form.onsubmit ? ' onclick="' + form.onsubmit + '"' : "";
    return '<div class="hhq-form" id="' + esc(form.id || "hhqForm") + '">' + fields + '<button type="button" class="btn"' + action + ">" + esc(submit) + "</button></div>";
  }
  function show(en, es) {
    var msg = lang() === "es" ? (es || en || "") : (en || es || "");
    var el = typeof document !== "undefined" ? document.getElementById("toast") : null;
    if (!el) return msg;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(root.__hhqToast);
    root.__hhqToast = setTimeout(function () { el.hidden = true; }, 4500);
    return msg;
  }

  var api = { label: label, html: html, show: show, fieldHtml: fieldHtml };
  root.HHQForm = api;
  root.HHQToast = { show: show };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;

  if (typeof root.showToast === "function") {
    root.showToast = function (msg) { return show(msg, msg); };
  }
  if (typeof root.chkNoteCard === "function") {
    var prev = root.chkNoteCard;
    root.chkNoteCard = function () {
      var old = prev.apply(this, arguments) || "";
      var form = html({
        id: "chkForm",
        fields: [{ id: "ckn", en: "Checklist note", es: "Nota de la lista" }],
        submitEn: "Save",
        submitEs: "Guardar",
        onsubmit: "addChkNote()"
      });
      return old.replace(/<div class="row"><input id="ckn"[\s\S]*?<\/div>/, form);
    };
  }
  var css = document.createElement("style");
  css.textContent = ".hhq-form label{display:block;margin:6px 0;font-weight:650}.hhq-form input,.hhq-form textarea,.hhq-form select{display:block;width:100%;box-sizing:border-box;margin-top:4px}@media(min-width:1024px){.hhq-form{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;align-items:start}.hhq-form>button,.hhq-form>label:has(textarea){grid-column:1/-1}}";
  document.head.appendChild(css);
})(typeof window !== "undefined" ? window : globalThis);
