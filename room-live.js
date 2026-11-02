/* Live room board. Demo mode keeps the on-device sample rooms.
   Live mode reads and writes public.rooms and public.hk_assignments with the
   signed-in session. Hotel scoping stays in the database policies.
   Realtime applies another phone's change without a refresh. */
(function (root) {
  "use strict";

  var FLOWS = ["dirty", "progress", "cleaned", "ready", "reclean", "ooo"];
  var PRI = ["normal", "priority", "rush"];
  var channel = null;

  function flowOf(status) {
    return FLOWS.indexOf(status) >= 0 ? status : "";
  }
  function legacyFlow(hk, fo) {
    var s = hk || fo || "";
    if (s === "OOO") return "ooo";
    if (s === "RFI") return "cleaned";
    if (s === "VC" || s === "OC") return "ready";
    return "dirty";
  }
  function roomPatch(local) {
    var flow = flowOf(local && local.flow) || "dirty";
    return {
      hk_status: local && local.s ? local.s : null,
      fo_status: local && local.s ? local.s : null,
      status: flow
    };
  }
  function assignmentStatus(local) {
    var flow = flowOf(local && local.flow) || "dirty";
    if (flow === "progress") return "started";
    if (flow === "cleaned" || flow === "ready") return "finished";
    return "assigned";
  }
  function assignmentPatch(local, hotel, workDate, assigneeId) {
    return {
      hotel_id: hotel,
      department: "housekeeping",
      work_date: workDate,
      room_number: String(local.n),
      status: assignmentStatus(local),
      clean_type: local.s || null,
      priority: PRI.indexOf(local.pri) >= 0 ? local.pri : "normal",
      assignee: assigneeId || null
    };
  }
  function blankRoom(n) {
    return {
      n: n, s: "VC", flow: "ready", occ: false, hk: "", pri: "normal",
      sb_id: null, asg_id: null, t0: "", t1: "", x: "", mins: 0, ts: 0, cleanedAt: 0
    };
  }
  function applyRoom(local, remote) {
    var next = Object.assign(blankRoom(local ? local.n : ""), local || {});
    next.n = Number(remote.room_number) || remote.room_number;
    next.sb_id = remote.id;
    if (remote.hk_status || remote.fo_status) next.s = remote.hk_status || remote.fo_status;
    next.flow = flowOf(remote.status) || legacyFlow(remote.hk_status, remote.fo_status);
    next.occ = next.s === "OC" || next.s === "OD";
    return next;
  }
  function applyAssignment(local, remote, name) {
    var next = Object.assign(blankRoom(local ? local.n : remote.room_number), local || {});
    next.n = Number(remote.room_number) || remote.room_number;
    next.asg_id = remote.id;
    next.pri = PRI.indexOf(remote.priority) >= 0 ? remote.priority : "normal";
    if (remote.assignee) next.hk = name || next.hk || "";
    else next.hk = "";
    if (remote.status === "started") next.flow = "progress";
    else if (remote.status === "finished" && next.flow !== "ready") next.flow = "cleaned";
    return next;
  }
  function liveOn() {
    return typeof useRemote === "function" && !!useRemote();
  }
  function hotels() {
    if (!liveOn() || typeof S === "undefined") return [];
    if (typeof HotelScope !== "undefined" && HotelScope.hotelsToLoad && typeof authRole === "function") {
      return HotelScope.hotelsToLoad(authRole(), S.hotel).filter(Boolean);
    }
    return S.hotel ? [S.hotel] : [];
  }
  function paint(hotel) {
    if (typeof S !== "undefined" && S.hotel === hotel && typeof render === "function") render();
  }
  function onRoom(hotel, payload) {
    if (!liveOn() || typeof S === "undefined" || !S.h || !S.h[hotel]) return;
    var remote = payload && payload.new && payload.new.room_number ? payload.new : (payload && payload.old);
    if (!remote || !remote.room_number) return;
    var list = S.h[hotel].rooms || (S.h[hotel].rooms = []);
    var i = list.findIndex(function (row) { return String(row.n) === String(remote.room_number); });
    if (payload.eventType === "DELETE") {
      if (i >= 0) list.splice(i, 1);
    } else {
      var merged = applyRoom(i >= 0 ? list[i] : null, payload.new);
      if (i >= 0) list[i] = merged;
      else list.push(merged);
    }
    paint(hotel);
  }
  function nameFor(id) {
    var people = typeof USERS !== "undefined" ? USERS : [];
    var person = people.find(function (row) { return row.user_id === id || row.id === id; });
    return person ? person.name : "";
  }
  function today() {
    return typeof ld === "function" ? ld() : "";
  }
  function onAssignment(hotel, payload) {
    if (!liveOn() || typeof S === "undefined" || !S.h || !S.h[hotel]) return;
    var remote = payload && payload.new && payload.new.room_number ? payload.new : (payload && payload.old);
    if (!remote || !remote.room_number) return;
    if (payload.eventType !== "DELETE" && String(remote.work_date || "").slice(0, 10) !== today()) return;
    var list = S.h[hotel].rooms || (S.h[hotel].rooms = []);
    var i = list.findIndex(function (row) { return String(row.n) === String(remote.room_number); });
    if (i < 0) return;
    if (payload.eventType === "DELETE") {
      if (list[i].asg_id === remote.id) {
        list[i].asg_id = null;
        list[i].hk = "";
      }
    } else {
      list[i] = applyAssignment(list[i], payload.new, nameFor(payload.new.assignee));
    }
    paint(hotel);
  }
  function stop() {
    if (channel && root.sb && typeof root.sb.removeChannel === "function") {
      try { root.sb.removeChannel(channel); } catch (e) {}
    }
    channel = null;
  }
  function start() {
    stop();
    if (!liveOn() || !root.sb || typeof root.sb.channel !== "function") return null;
    var list = hotels();
    if (!list.length) return null;
    var ch = root.sb.channel("hhq-rooms-" + list.join("-"));
    list.forEach(function (hotel) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: "hotel_id=eq." + hotel }, function (payload) {
        onRoom(hotel, payload);
      });
      ch.on("postgres_changes", { event: "*", schema: "public", table: "hk_assignments", filter: "hotel_id=eq." + hotel }, function (payload) {
        onAssignment(hotel, payload);
      });
    });
    ch.subscribe();
    channel = ch;
    return ch;
  }
  function assigneeId(local) {
    var name = String((local && local.hk) || "").replace(/ \(EX\)$/, "");
    if (!name || typeof userByName !== "function" || typeof isUuid !== "function") return null;
    var who = userByName(name);
    return who && isUuid(who.user_id) ? who.user_id : null;
  }
  function writeRoom(hotel, local) {
    var patch = roomPatch(local);
    if (local.sb_id && typeof dbUpdate === "function") return dbUpdate("rooms", local.sb_id, patch);
    if (typeof dbInsert !== "function") return Promise.resolve(null);
    var body = Object.assign({
      hotel_id: hotel,
      department: "housekeeping",
      room_number: String(local.n),
      floor: Math.floor(Number(local.n) / 100) || null
    }, patch);
    return dbInsert("rooms", body).then(function (res) {
      if (res && res.data && res.data.id) local.sb_id = res.data.id;
      return res;
    });
  }
  function writeAssignment(hotel, local, withTimes) {
    if (typeof dbUpdate !== "function" || typeof dbInsert !== "function" || typeof ld !== "function") return Promise.resolve(null);
    if (!local.hk && !local.asg_id && (local.flow === "ready" || local.flow === "ooo")) return Promise.resolve(null);
    var body = assignmentPatch(local, hotel, ld(), assigneeId(local));
    if (withTimes && local.flow === "progress") body.started_at = new Date().toISOString();
    if (withTimes && (local.flow === "cleaned" || local.flow === "ready")) body.finished_at = new Date().toISOString();
    if (local.asg_id) return dbUpdate("hk_assignments", local.asg_id, body);
    return dbInsert("hk_assignments", body).then(function (res) {
      if (res && res.data && res.data.id) local.asg_id = res.data.id;
      return res;
    });
  }
  function install() {
    if (typeof persistRoomStatus === "function" && !persistRoomStatus._hhqLive) {
      var prevStatus = persistRoomStatus;
      persistRoomStatus = function (hotel, row) {
        if (!liveOn()) return prevStatus.apply(this, arguments);
        return Promise.all([writeRoom(hotel, row), writeAssignment(hotel, row, true)]);
      };
      persistRoomStatus._hhqLive = true;
    }
    if (typeof asg === "function" && !asg._hhqLive) {
      var prevAsg = asg;
      asg = function (n) {
        var out = prevAsg.apply(this, arguments);
        if (liveOn() && typeof D === "function") {
          var row = (D().rooms || []).find(function (r) { return String(r.n) === String(n); });
          if (row) writeAssignment(S.hotel, row, false);
        }
        return out;
      };
      asg._hhqLive = true;
    }
    if (typeof setHkPri === "function" && !setHkPri._hhqLive) {
      var prevPri = setHkPri;
      setHkPri = function (n) {
        var out = prevPri.apply(this, arguments);
        if (liveOn() && typeof D === "function") {
          var row = (D().rooms || []).find(function (r) { return String(r.n) === String(n); });
          if (row) writeAssignment(S.hotel, row, false);
        }
        return out;
      };
      setHkPri._hhqLive = true;
    }
    if (typeof hydrate === "function" && !hydrate._hhqLive) {
      var prevHydrate = hydrate;
      hydrate = async function () {
        var out = await prevHydrate.apply(this, arguments);
        try { start(); } catch (e) {}
        return out;
      };
      hydrate._hhqLive = true;
    }
    if (typeof signOut === "function" && !signOut._hhqLive) {
      var prevOut = signOut;
      signOut = async function () {
        stop();
        return prevOut.apply(this, arguments);
      };
      signOut._hhqLive = true;
    }
  }

  var api = {
    FLOWS: FLOWS,
    roomPatch: roomPatch,
    assignmentStatus: assignmentStatus,
    assignmentPatch: assignmentPatch,
    applyRoom: applyRoom,
    applyAssignment: applyAssignment,
    start: start,
    stop: stop,
    install: install
  };
  root.HHQRooms = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;
  install();
  if (liveOn()) {
    try { start(); } catch (e) {}
  }
})(typeof window !== "undefined" ? window : globalThis);
