/* Market tasks from the Hotel Retail Playbook, folded into the checklists
   that already exist. Not a separate retail list and not a separate point rule.
   Front desk daily shift lists, the weekly list the AGM uses, and the GM
   monthly and quarterly lists. */
(function (root) {
  "use strict";

  var FRONT_DESK_DAILY = [
    { en: "Restock and face the market and cooler (bottles forward, labels out)", es: "Reabastece y acomoda la tienda y el refrigerador (botellas al frente, etiquetas hacia afuera)" },
    { en: "Wipe down the cooler glass, shelves, and counter", es: "Limpia el vidrio del refrigerador, los estantes y el mostrador" },
    { en: "Check for expired or damaged items", es: "Revisa productos vencidos o dañados" },
    { en: "Check that price tags are showing", es: "Revisa que los precios se vean" },
    { en: "Check that self-checkout or POS is working", es: "Revisa que el autopago o el punto de venta funcione" }
  ];
  var AGM_WEEKLY = [
    { en: "Count market inventory against the order guide pars and place the order", es: "Cuenta el inventario de la tienda contra los pares de la guía de pedido y haz el pedido" },
    { en: "Rotate stock first in, first out", es: "Rota el producto: lo primero que entra es lo primero que sale" },
    { en: "Deep clean the cooler and fixtures", es: "Limpia a fondo el refrigerador y los muebles" },
    { en: "Note low sellers and out-of-stocks", es: "Anota lo que se vende poco y lo que está agotado" }
  ];
  var GM_MONTHLY = [
    { en: "Review market sales and margin (sales per room sold vs the $2 goal)", es: "Revisa las ventas y el margen de la tienda (ventas por cuarto vendido contra la meta de $2)" },
    { en: "Complete the market shrink check", es: "Revisa la merma de la tienda" }
  ];
  var GM_QUARTERLY = [
    { en: "Reset the planogram (shelf layout) and product mix: remove slow sellers and add seasonal items", es: "Restablece el planograma (acomodo de estantes) y la mezcla de productos: quita lo que se vende lento y agrega artículos de temporada" }
  ];

  function labelEn(item) {
    if (item && typeof item === "object" && item.en != null) return String(item.en);
    if (Array.isArray(item)) return labelEn(item[0]);
    return item == null ? "" : String(item);
  }
  function has(list, en) {
    return (list || []).some(function (item) { return labelEn(item) === en; });
  }
  function addItems(list, items, asCheck) {
    items.forEach(function (item) {
      if (has(list, item.en)) return;
      list.push(asCheck ? [item, 0] : item);
    });
  }
  function foldLists(lists) {
    Object.keys(lists || {}).forEach(function (hotel) {
      (lists[hotel] || []).forEach(function (list) {
        if (!list || list.role !== "Front Desk" || list.per !== "Daily") return;
        list.items = list.items || [];
        addItems(list.items, FRONT_DESK_DAILY, false);
      });
    });
  }
  function foldCheck(check) {
    if (!check) return;
    check["Front Desk"] = check["Front Desk"] || [];
    addItems(check["Front Desk"], FRONT_DESK_DAILY, true);
  }
  function foldGm(items) {
    if (!items) return;
    items.Weekly = items.Weekly || [];
    items.Monthly = items.Monthly || [];
    items.Quarterly = items.Quarterly || [];
    addItems(items.Weekly, AGM_WEEKLY, false);
    addItems(items.Monthly, GM_MONTHLY, false);
    addItems(items.Quarterly, GM_QUARTERLY, false);
  }
  function install() {
    if (typeof QUORE !== "undefined" && QUORE.lists) foldLists(QUORE.lists);
    if (typeof GMDEF !== "undefined") foldGm(GMDEF);
    if (typeof S !== "undefined" && S.h) {
      Object.keys(S.h).forEach(function (hotel) {
        var data = S.h[hotel];
        if (!data) return;
        if (data.check) foldCheck(data.check);
        if (data.gmc && data.gmc.items) foldGm(data.gmc.items);
      });
    }
    if (typeof I18N !== "undefined" && I18N.es) {
      I18N.es["Checks reset each new quarter"] = "Las marcas se reinician cada trimestre";
      I18N.es.Quarterly = I18N.es.Quarterly || "Trimestral";
    }
  }

  var api = {
    FRONT_DESK_DAILY: FRONT_DESK_DAILY,
    AGM_WEEKLY: AGM_WEEKLY,
    GM_MONTHLY: GM_MONTHLY,
    GM_QUARTERLY: GM_QUARTERLY,
    foldLists: foldLists,
    foldCheck: foldCheck,
    foldGm: foldGm,
    install: install
  };
  root.HHQRetail = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  install();
  if (typeof render === "function") {
    var prev = render;
    root.render = function () {
      try { install(); } catch (e) {}
      return prev.apply(this, arguments);
    };
    if (typeof S !== "undefined" && S.uid) {
      try { root.render(); } catch (e2) {}
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
