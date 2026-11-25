const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const fm = require("../floor-maps.js");

const map = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/mspwe-floors.json"), "utf8"));
const sql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/20261101_floor_maps.sql"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../data/mspwe-floors.js"), "utf8");

// Every 3-digit token pdftotext -bbox pulled off the evacuation sheets.
// 911 is the fire-department number. 152 is in the Innkeepers Act fine print.
const EVAC = {
  "1": ["101", "102", "103", "104", "105", "106", "124", "126", "127", "128", "129", "130", "131", "132", "133", "134", "135", "136", "137", "138", "139", "140", "141", "142", "145", "146", "147", "148", "152", "911"],
  "2": ["201", "202", "203", "204", "205", "206", "207", "209", "210", "211", "212", "214", "216", "218", "219", "220", "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "244", "245", "246", "247", "248", "152", "911"],
  "3": ["301", "302", "303", "304", "305", "306", "307", "309", "310", "311", "312", "313", "314", "315", "316", "317", "318", "319", "320", "321", "322", "323", "324", "325", "326", "327", "328", "329", "330", "331", "332", "333", "334", "335", "336", "337", "338", "339", "340", "341", "342", "344", "345", "346", "347", "348", "152", "911"]
};
const SKIPPED = ["107", "108", "109", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119", "120", "121", "122", "123", "125", "143", "144", "208", "213", "215", "217", "243", "308", "343"];

function floorById(id) {
  return map.floors.find((fl) => fl.id === id);
}

test("every evacuation-plan guest room appears once, on its own floor", () => {
  const report = fm.audit(map);
  assert.deepEqual(report.duplicates, []);
  assert.equal(report.total, 117);
  assert.equal(report.floors["1"].length, 28);
  assert.equal(report.floors["2"].length, 43);
  assert.equal(report.floors["3"].length, 46);
  Object.keys(EVAC).forEach((id) => {
    const guest = fm.guestFromEvac(EVAC[id]);
    assert.equal(guest.length, report.floors[id].length);
    assert.deepEqual(guest.slice().sort(), report.floors[id].slice().sort());
  });
  const all = Object.keys(report.floors).flatMap((id) => report.floors[id]);
  assert.equal(new Set(all).size, all.length);
  SKIPPED.forEach((n) => assert.equal(all.includes(n), false, n));
  assert.equal(all.includes("911"), false);
  assert.equal(all.includes("152"), false);
  assert.equal(map.notes_en.length, map.notes_es.length);
  assert.ok(map.notes_en.some((n) => n.includes("911")));
  assert.ok(map.notes_en.some((n) => n.includes("152")));
});

test("bundled script matches the json room list", () => {
  const bundled = fm.bundled();
  assert.equal(bundled.hotel, "MSPWE");
  assert.equal(fm.countRooms(bundled), fm.countRooms(map));
  assert.ok(js.includes("MSPWE_FLOOR_MAP"));
  assert.equal(fm.sameNumbers(floorById("1"), bundled.floors[0]), true);
});

test("public areas sit in the gaps and do not cover a guest room", () => {
  const need = {
    "1": ["pool", "breakfast", "laundry", "lobby", "stair", "elevator", "corridor"],
    "2": ["stair", "elevator", "corridor", "open"],
    "3": ["stair", "elevator", "corridor", "linen"]
  };
  map.floors.forEach((fl) => {
    const kinds = new Set(fl.areas.map((a) => a.kind));
    need[fl.id].forEach((kind) => assert.equal(kinds.has(kind), true, fl.id + " " + kind));
    if (fl.id === "3") assert.equal(kinds.has("open"), false);
    fl.areas.forEach((area) => {
      if (area.kind === "corridor") return;
      const hits = fl.rooms.filter((room) => fm.overlaps(area, room)).map((room) => room.n);
      assert.deepEqual(hits, [], fl.id + " " + area.id);
    });
    for (let i = 0; i < fl.rooms.length; i++) {
      for (let j = i + 1; j < fl.rooms.length; j++) {
        assert.equal(fm.overlaps(fl.rooms[i], fl.rooms[j]), false, fl.rooms[i].n + " " + fl.rooms[j].n);
      }
    }
  });
});

test("room color follows dirty, clean, inspected, occupied, and out of order", () => {
  assert.deepEqual(fm.paint(null), { key: "none", occupied: false, progress: false });
  assert.deepEqual(fm.paint({ s: "VD", flow: "dirty" }), { key: "dirty", occupied: false, progress: false });
  assert.deepEqual(fm.paint({ s: "OD", occ: true, flow: "dirty" }), { key: "dirty", occupied: true, progress: false });
  assert.deepEqual(fm.paint({ s: "RFI", flow: "cleaned" }), { key: "clean", occupied: false, progress: false });
  assert.deepEqual(fm.paint({ s: "VC", flow: "ready" }), { key: "inspected", occupied: false, progress: false });
  assert.deepEqual(fm.paint({ s: "OC", occ: true, flow: "ready" }), { key: "inspected", occupied: true, progress: false });
  assert.deepEqual(fm.paint({ s: "OOO", flow: "ooo" }), { key: "ooo", occupied: false, progress: false });
  assert.equal(fm.paint({ s: "VD", flow: "progress" }).progress, true);
  assert.equal(fm.paint({ s: "VD", flow: "reclean" }).key, "dirty");
});

test("only corporate can move rooms, and an edit cannot drop a room number", () => {
  assert.equal(fm.canEdit("Above Property"), true);
  assert.equal(fm.canEdit("JR Corporate"), true);
  assert.equal(fm.canEdit("GM"), false);
  assert.equal(fm.canEdit("Housekeeper"), false);
  const floor = floorById("2");
  const next = fm.applyEdits(floor, { "212": { x: 10, y: 20, w: 40, h: 80 } });
  assert.equal(fm.sameNumbers(floor, next), true);
  assert.equal(next.rooms.find((r) => r.n === "212").x, 10);
  assert.equal(floor.rooms.find((r) => r.n === "212").x === 10, false);
});

test("migration is additive and hotels read their own map", () => {
  assert.equal(sql.includes("drop table"), false);
  assert.equal(sql.includes("delete from"), false);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /hotel = any \(\(select private\.my_hotels\(\)\)::text\[\]\)/);
  assert.match(sql, /on conflict \(hotel, floor\) do nothing/i);
  assert.match(sql, /grant select, insert, update on table public\.floor_maps to authenticated/i);
  assert.equal(sql.includes("grant delete"), false);
  assert.match(sql, /check \(hotel in \('MSPWE', 'MSPAM', 'MSPMS'\)\)/);
  const saved = [...sql.matchAll(/"n":"(\d{3})"/g)].map((m) => m[1]);
  const expected = map.floors.flatMap((fl) => fl.rooms.map((r) => r.n)).sort();
  assert.deepEqual(saved.slice().sort(), expected);
});
