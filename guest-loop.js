/* Close the loop after a guest issue is fixed.
   Marking an issue resolved records the fix. It is not fully closed until
   staff record who contacted the guest and whether the guest was satisfied.
   An unsatisfied guest must be reopened or escalated. That step is separate
   from the pre-checkout reminder, which only applies while the issue is open. */
(function (root) {
  "use strict";

  var HOWS = [
    ["call", "Called", "Llamó"],
    ["text", "Texted", "Mensaje"],
    ["person", "In person", "En persona"],
    ["email", "Emailed", "Correo"]
  ];

  function howRow(how) {
    for (var i = 0; i < HOWS.length; i++) if (HOWS[i][0] === how) return HOWS[i];
    return null;
  }

  function howLabel(how, lang) {
    var row = howRow(how);
    if (!row) return "";
    return lang === "es" ? row[2] : row[1];
  }

  function cleanWho(who) {
    return String(who == null ? "" : who).replace(/\s+/g, " ").trim();
  }

  function closed(issue) {
    var loop = issue && issue.loop;
    return !!(issue && issue.st === "done" && loop && loop.sat === true && cleanWho(loop.who));
  }

  function due(issue) {
    return !!(issue && issue.st === "done" && !closed(issue));
  }

  function checkoutSoon(issue, days) {
    if (!issue || issue.st === "done") return false;
    return days >= 0 && days <= 1;
  }

  function fail(code, en, es) {
    return { ok: false, code: code, en: en, es: es };
  }

  function plan(issue, input) {
    input = input || {};
    if (!due(issue)) {
      return fail("state", "This issue is not waiting for a guest follow-up.", "Esta queja no está esperando el seguimiento del huésped.");
    }
    var who = cleanWho(input.who);
    if (!who) return fail("who", "Enter who contacted the guest.", "Escribe quién contactó al huésped.");
    if (who.length > 80) return fail("who", "Use a shorter name.", "Usa un nombre más corto.");
    if (!howRow(input.how)) return fail("how", "Choose how the guest was contacted.", "Elige cómo se contactó al huésped.");
    if (input.sat !== true && input.sat !== false) {
      return fail("sat", "Record whether the guest was satisfied.", "Registra si el huésped quedó satisfecho.");
    }
    var action = input.action;
    if (input.sat === true && action !== "close") {
      return fail("action", "Close the loop once the guest is satisfied.", "Cierra el ciclo cuando el huésped quede satisfecho.");
    }
    if (input.sat === false && action !== "reopen" && action !== "escalate") {
      return fail("action", "The guest is not satisfied. Reopen the issue or escalate it.", "El huésped no quedó satisfecho. Reabre la queja o escálala.");
    }
    var entry = {
      who: who,
      how: input.how,
      sat: input.sat === true,
      action: action,
      at: input.at ? String(input.at) : ""
    };
    if (input.sat === true) {
      return {
        ok: true,
        entry: entry,
        next: "done",
        alert: null,
        toastEn: "Loop closed. The guest was satisfied.",
        toastEs: "Ciclo cerrado. El huésped quedó satisfecho."
      };
    }
    var room = issue.room == null ? "" : String(issue.room);
    if (action === "escalate") {
      return {
        ok: true,
        entry: entry,
        next: "open",
        toastEn: "Escalated to GM / AGM. The issue is open again.",
        toastEs: "Escalada a GM / AGM. La queja está abierta de nuevo.",
        alert: {
          titleEn: "Guest not satisfied · Rm " + room,
          titleEs: "Huésped no satisfecho · Hab. " + room,
          bodyEn: who + " contacted the guest. They are not satisfied. The issue is open again.",
          bodyEs: who + " contactó al huésped. No quedó satisfecho. La queja está abierta de nuevo."
        }
      };
    }
    return {
      ok: true,
      entry: entry,
      next: "open",
      alert: null,
      toastEn: "Reopened. It is back with the department.",
      toastEs: "Reabierta. Volvió al departamento."
    };
  }

  function apply(issue, input) {
    var result = plan(issue, input);
    if (!result.ok) return result;
    if (!Array.isArray(issue.loops)) issue.loops = [];
    issue.loops.push(result.entry);
    if (result.next === "done") {
      issue.st = "done";
      issue.loop = result.entry;
      issue.esc = 0;
    } else {
      issue.st = "open";
      issue.loop = null;
      if (result.entry.action === "escalate") {
        issue.esc = 1;
        issue.escAt = result.entry.at || "";
      }
    }
    return result;
  }

  function markStatus(issue, st, at) {
    if (!issue || (st !== "open" && st !== "prog" && st !== "done")) return issue;
    var prev = issue.st;
    if (st === "done") {
      if (prev !== "done") {
        issue.doneAt = at || new Date().toISOString();
        issue.loop = null;
      }
      issue.st = "done";
      return issue;
    }
    issue.st = st;
    if (prev === "done") issue.loop = null;
    return issue;
  }

  var api = {
    HOWS: HOWS,
    howLabel: howLabel,
    closed: closed,
    due: due,
    checkoutSoon: checkoutSoon,
    plan: plan,
    apply: apply,
    markStatus: markStatus
  };
  root.HHQLoop = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
