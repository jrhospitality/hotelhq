#!/usr/bin/env python3
"""Build the simplified MSPWE floor map from evacuation-plan label positions.

Room centers are the pdftotext -bbox positions on the three emergency-plan pages.
911 and 152 are not guest rooms (see NOTES). Public-area rectangles are placed
in the gaps those pages leave, using A101 / A102 for what each gap is.
This script does not read the PDFs. Do not commit the drawings.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (room, x, y) from pdftotext -bbox. y splits north from south.
FLOOR1 = [
    (101, 89.8, 163.4), (103, 106.6, 163.4), (105, 123.5, 163.4),
    (127, 312.7, 163.6), (129, 328.7, 163.6), (131, 344.7, 163.6),
    (133, 360.9, 163.6), (135, 377.3, 163.6), (137, 393.4, 163.6),
    (139, 411.7, 164.9), (141, 431.4, 164.9), (145, 470.0, 164.9), (147, 489.3, 168.0),
    (124, 280.6, 207.6), (126, 296.6, 207.6), (128, 312.7, 207.6), (130, 328.7, 207.6),
    (132, 344.7, 207.6), (134, 360.9, 207.6), (136, 377.3, 207.6), (138, 393.4, 207.6),
    (102, 89.6, 209.7), (104, 106.6, 209.7), (106, 123.5, 209.7),
    (148, 489.3, 215.8), (140, 411.7, 217.9), (142, 431.3, 217.9), (146, 470.0, 217.9),
]
FLOOR2 = [
    (201, 56.2, 137.6), (203, 75.6, 137.6), (205, 95.0, 137.6), (207, 127.8, 137.8),
    (209, 146.2, 137.8), (211, 165.0, 137.8), (219, 238.8, 137.8), (221, 257.0, 137.8),
    (223, 275.6, 137.8), (225, 294.3, 137.8), (227, 312.7, 137.8), (229, 331.2, 137.8),
    (231, 349.6, 137.8), (233, 368.2, 137.8), (235, 387.1, 137.8), (237, 405.7, 137.8),
    (239, 426.7, 139.3), (241, 449.3, 139.3), (245, 493.8, 139.3), (247, 516.0, 142.9),
    (210, 146.3, 188.4), (212, 164.7, 188.4), (214, 183.2, 188.4), (216, 201.6, 188.4),
    (218, 220.2, 188.4), (220, 238.7, 188.4), (222, 257.0, 188.4), (224, 275.6, 188.4),
    (226, 294.2, 188.4), (228, 312.7, 188.4), (230, 331.2, 188.4), (232, 349.6, 188.4),
    (234, 368.2, 188.4), (236, 387.1, 188.4), (238, 405.7, 188.4),
    (202, 56.0, 190.8), (204, 75.6, 190.8), (206, 95.0, 190.8),
    (248, 516.0, 197.9), (240, 426.7, 200.2), (242, 449.2, 200.2), (244, 471.5, 200.2),
    (246, 493.8, 200.2),
]
FLOOR3 = [
    (301, 56.2, 137.6), (303, 75.6, 137.6), (305, 95.0, 137.6), (307, 127.8, 137.8),
    (309, 146.2, 137.8), (311, 165.0, 137.8), (313, 183.2, 137.8), (315, 201.6, 137.8),
    (317, 220.2, 137.8), (319, 238.8, 137.8), (321, 257.0, 137.8), (323, 275.6, 137.8),
    (325, 294.3, 137.8), (327, 312.7, 137.8), (329, 331.2, 137.8), (331, 349.6, 137.8),
    (333, 368.2, 137.8), (335, 387.1, 137.8), (337, 405.7, 137.8), (339, 426.7, 139.3),
    (341, 449.3, 139.3), (345, 493.8, 139.3), (347, 516.0, 142.9),
    (310, 146.3, 188.4), (312, 164.7, 188.4), (314, 183.2, 188.4), (316, 201.6, 188.4),
    (318, 220.2, 188.4), (320, 238.7, 188.4), (322, 257.0, 188.4), (324, 275.6, 188.4),
    (326, 294.2, 188.4), (328, 312.7, 188.4), (330, 331.2, 188.4), (332, 349.6, 188.4),
    (334, 368.2, 188.4), (336, 387.1, 188.4), (338, 405.7, 188.4),
    (302, 56.0, 190.8), (304, 75.6, 190.8), (306, 95.0, 190.8),
    (348, 516.0, 197.9), (340, 426.7, 200.2), (342, 449.2, 200.2), (344, 471.5, 200.2),
    (346, 493.8, 200.2),
]

NOTES = [
    "911 is the fire-department number in the instructions on every sheet, not a guest room.",
    "152 sits in the Minnesota Innkeepers Act fine print at the same spot on every sheet, not on the floor drawing.",
    "Floor 1 skips 107-123. On A101 those numbers are lobby, laundry, lounge, breakfast, fitness, meeting, restrooms, and corridors.",
    "Floor 1 skips 125 (west stair and elevator core) and 143-144 (east stair and vending).",
    "Floor 2 skips 208 (Stair A, elevator, linen), 213/215/217 (open to the floor below), and 243 (east stair and vending).",
    "Floor 3 skips 308 (same west stair, elevator, and linen) and 343 (east stair and vending). Rooms 313, 315, and 317 fill the second-floor opening.",
    "A101 also prints bare space numbers that repeat guest-room numbers. Guest rooms are the evacuation-plan numbers (G-tags on the architectural sheets).",
    "The elevator is a symbol on A101 and A102. It is not a text label on the evacuation poster.",
]


def round1(n):
    return round(float(n), 1)


def row_rects(pairs):
    row = sorted(pairs, key=lambda item: item[1])
    gaps = [row[i + 1][1] - row[i][1] for i in range(len(row) - 1)]
    normal = sorted(g for g in gaps if 10 < g < 30)
    pitch = normal[len(normal) // 2] if normal else 18
    out = []
    for i, (num, cx) in enumerate(row):
        left_gap = cx - row[i - 1][1] if i else pitch
        right_gap = row[i + 1][1] - cx if i + 1 < len(row) else pitch

        def half(gap):
            if gap > pitch * 1.65:
                return pitch * 0.46
            return gap * 0.46

        hl, hr = half(left_gap), half(right_gap)
        out.append({"n": str(num), "dx": cx - hl, "dw": hl + hr, "cx": cx})
    return out, pitch


def scale_row(rects, x0, x1, left=40, width=1200):
    span = x1 - x0
    scale = width / span

    def sx(data_x):
        return left + (data_x - x0) * scale

    for rect in rects:
        rect["x"] = round1(sx(rect["dx"]))
        rect["w"] = round1(rect["dw"] * scale)
        rect.pop("dx")
        rect.pop("dw")
        rect.pop("cx")
    return sx


def area(area_id, kind, x, y, w, h, en, es):
    return {
        "id": area_id, "kind": kind,
        "x": round1(x), "y": round1(y), "w": round1(w), "h": round1(h),
        "label_en": en, "label_es": es,
    }


def finish_rooms(rects, y, h, side):
    rooms = []
    for rect in rects:
        rooms.append({
            "n": rect["n"], "x": rect["x"], "y": y, "w": rect["w"], "h": h, "side": side,
        })
    return rooms


def build_upper(pairs, floor_id, label_en, label_es, open_below):
    north_pairs = [(n, x) for n, x, y in pairs if y < 170]
    south_pairs = [(n, x) for n, x, y in pairs if y >= 170]
    north, _pitch = row_rects(north_pairs)
    south, _pitch = row_rects(south_pairs)
    all_dx = [r["dx"] for r in north + south] + [r["dx"] + r["dw"] for r in north + south]
    x0, x1 = min(all_dx) - 14, max(all_dx) + 18
    sx = scale_row(north + south, x0, x1)
    north_y, room_h, corr_y, corr_h, south_y = 36, 96, 132, 40, 172
    rooms = finish_rooms(north, north_y, room_h, "N") + finish_rooms(south, south_y, room_h, "S")
    by = {r["n"]: r for r in rooms}

    def gap(a, b, y, h):
        left = by[a]["x"] + by[a]["w"] + 2
        right = by[b]["x"] - 2
        return left, y, max(8, right - left), h

    stair_a = gap("205" if floor_id == "2" else "305", "207" if floor_id == "2" else "307", north_y, room_h + corr_h)
    linen_box = gap("206" if floor_id == "2" else "306", "210" if floor_id == "2" else "310", south_y, room_h)
    east_n = "241" if floor_id == "2" else "341"
    east_far = "245" if floor_id == "2" else "345"
    east = gap(east_n, east_far, north_y, room_h)
    areas = []
    # Corridor runs the full guest wing, under the service rooms.
    areas.append(area(
        "corridor", "corridor",
        rooms[0]["x"] if False else min(r["x"] for r in rooms),
        corr_y, max(r["x"] + r["w"] for r in rooms) - min(r["x"] for r in rooms), corr_h,
        "Corridor", "Pasillo",
    ))
    areas.append(area("stair-a", "stair", *stair_a, "Stair A", "Escalera A"))
    elev_w = linen_box[2] * 0.48
    areas.append(area("elevator", "elevator", linen_box[0], south_y, elev_w, room_h, "Elevator", "Elevador"))
    areas.append(area("linen", "linen", linen_box[0] + elev_w + 2, south_y, linen_box[2] - elev_w - 2, room_h, "Linen", "Blancos"))
    if open_below:
        well = gap("211", "219", north_y, room_h)
        areas.append(area("open-below", "open", *well, "Open to below", "Abierto abajo"))
    areas.append(area("stair-b", "stair", east[0], north_y, east[2], room_h * 0.62, "Stair B", "Escalera B"))
    areas.append(area("vending", "vending", east[0], north_y + room_h * 0.66, east[2], room_h * 0.34, "Vending", "Máquinas"))
    west = min(r["x"] for r in rooms) - 28
    areas.append(area("exit-w", "exit", west, corr_y, 24, corr_h, "Exit", "Salida"))
    east_edge = max(r["x"] + r["w"] for r in rooms) + 4
    areas.append(area("exit-e", "exit", east_edge, corr_y, 24, corr_h, "Exit", "Salida"))
    view_w = round1(east_edge + 36)
    return {
        "id": floor_id,
        "label_en": label_en,
        "label_es": label_es,
        "view": {"w": view_w, "h": 308},
        "rooms": rooms,
        "areas": areas,
    }


def build_floor1():
    north_pairs = [(n, x) for n, x, y in FLOOR1 if y < 190]
    south_pairs = [(n, x) for n, x, y in FLOOR1 if y >= 190]
    north, _pitch = row_rects(north_pairs)
    south, _pitch = row_rects(south_pairs)
    all_dx = [r["dx"] for r in north + south] + [r["dx"] + r["dw"] for r in north + south]
    x0, x1 = min(all_dx) - 16, max(all_dx) + 20
    sx = scale_row(north + south, x0, x1)
    north_y, room_h, corr_y, corr_h, south_y = 168, 90, 258, 42, 300
    rooms = finish_rooms(north, north_y, room_h, "N") + finish_rooms(south, south_y, room_h, "S")
    by = {r["n"]: r for r in rooms}

    def between(a, b):
        return by[a]["x"] + by[a]["w"] + 3, by[b]["x"] - 3

    core_l, _core_r = between("105", "124")
    core_w = 58
    # Public rooms start after Stair A / the elevator so they do not cover them.
    # Fitness sits on the north, over the west end of the guest wing (rooms 124 and 126).
    north_span_l = core_l + core_w + 4
    north_span_r = by["127"]["x"] - 3
    third = (north_span_r - north_span_l) / 3
    lounge_x, breakfast_x, fitness_x = north_span_l, north_span_l + third, north_span_l + 2 * third
    south_l = core_l + core_w + 4
    south_r = by["124"]["x"] - 3
    south_w = (south_r - south_l) / 3
    stair_l, stair_r = between("142", "145")
    areas = [
        area("pool", "pool", by["101"]["x"], 18, by["105"]["x"] + by["105"]["w"] - by["101"]["x"], 136, "Pool", "Piscina"),
        area("corridor", "corridor", by["102"]["x"], corr_y, by["148"]["x"] + by["148"]["w"] - by["102"]["x"], corr_h, "Corridor", "Pasillo"),
        area("stair-a", "stair", core_l, north_y, core_w, room_h + corr_h, "Stair A", "Escalera A"),
        area("elevator", "elevator", core_l, south_y, core_w, room_h, "Elevator", "Elevador"),
        area("lounge", "lounge", lounge_x, north_y, third - 4, room_h, "Lounge", "Salón"),
        area("breakfast", "breakfast", breakfast_x, north_y, third - 4, room_h, "Breakfast", "Desayuno"),
        area("fitness", "fitness", fitness_x, north_y, max(20, north_span_r - fitness_x), room_h, "Fitness", "Gimnasio"),
        area("meeting", "meeting", south_l, south_y, south_w - 4, room_h, "Meeting", "Reunión"),
        area("lobby", "lobby", south_l + south_w, south_y, south_w - 4, room_h, "Lobby", "Vestíbulo"),
        area("laundry", "laundry", south_l + 2 * south_w, south_y, max(20, south_r - (south_l + 2 * south_w)), room_h, "Laundry", "Lavandería"),
        area("stair-b", "stair", stair_l, north_y, stair_r - stair_l, room_h, "Stair B", "Escalera B"),
        area("vending", "vending", stair_l, south_y, stair_r - stair_l, room_h, "Vending", "Máquinas"),
        area("exit-w", "exit", by["101"]["x"] - 30, corr_y, 24, corr_h, "Exit", "Salida"),
        area("exit-e", "exit", by["147"]["x"] + by["147"]["w"] + 6, corr_y, 24, corr_h, "Exit", "Salida"),
    ]
    view_w = round1(by["147"]["x"] + by["147"]["w"] + 40)
    return {
        "id": "1",
        "label_en": "1st floor",
        "label_es": "Piso 1",
        "view": {"w": view_w, "h": 430},
        "rooms": rooms,
        "areas": areas,
    }


def write_sql(floors):
    values = []
    for fl in floors:
        payload = {
            "label_en": fl["label_en"],
            "label_es": fl["label_es"],
            "view": fl["view"],
            "rooms": fl["rooms"],
            "areas": fl["areas"],
        }
        blob = json.dumps(payload, separators=(",", ":")).replace("'", "''")
        values.append("  ('MSPWE', " + fl["id"] + ", '" + blob + "'::jsonb)")
    sql = """-- Simplified floor maps. Additive only. Does not drop or delete existing rows.
-- One row per hotel and floor so Hampton (MSPAM) and SpringHill (MSPMS) can be added later.
-- The insert keeps a corporate edit: on conflict do nothing.
-- Room rectangles are traced from the Golden Valley evacuation plans. This is not a construction drawing.
--
-- private.my_hotels() returns text[]. Compare with
--   hotel = any ((select private.my_hotels())::text[])
-- so the list is read once. Corporate (private.is_above()) can read and adjust every hotel.

create table if not exists public.floor_maps (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  floor smallint not null check (floor between 1 and 9),
  map jsonb not null,
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (hotel, floor),
  constraint floor_maps_rooms_array check (jsonb_typeof(map -> 'rooms') = 'array'),
  constraint floor_maps_areas_array check (jsonb_typeof(map -> 'areas') = 'array')
);

comment on table public.floor_maps is
  'Simplified floor map for one hotel floor. Rooms are rectangles with numbers. Not a construction drawing.';

alter table public.floor_maps enable row level security;

drop policy if exists floor_maps_select on public.floor_maps;
create policy floor_maps_select on public.floor_maps
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

drop policy if exists floor_maps_insert on public.floor_maps;
create policy floor_maps_insert on public.floor_maps
  for insert to authenticated
  with check ((select private.is_above()));

drop policy if exists floor_maps_update on public.floor_maps;
create policy floor_maps_update on public.floor_maps
  for update to authenticated
  using ((select private.is_above()))
  with check ((select private.is_above()));

revoke all on table public.floor_maps from public, anon, authenticated;
grant select, insert, update on table public.floor_maps to authenticated;

insert into public.floor_maps (hotel, floor, map)
values
""" + ",\n".join(values) + """
on conflict (hotel, floor) do nothing;
"""
    path = ROOT / "supabase" / "migrations" / "20261101_floor_maps.sql"
    path.write_text(sql, encoding="utf-8")


def main():
    floors = [
        build_floor1(),
        build_upper(FLOOR2, "2", "2nd floor", "Piso 2", True),
        build_upper(FLOOR3, "3", "3rd floor", "Piso 3", False),
    ]
    # Floors 2 and 3 were scaled separately. Re-scale is already similar; leave them.
    data = {
        "hotel": "MSPWE",
        "name_en": "Holiday Inn Express & Suites Golden Valley",
        "name_es": "Holiday Inn Express & Suites Golden Valley",
        "pilot": "2026-11-15",
        "floors": floors,
        "notes_en": NOTES,
        "notes_es": [
            "911 es el número de bomberos en las instrucciones de cada hoja, no una habitación.",
            "152 está en la letra chica de la ley de hoteleros de Minnesota, en el mismo lugar de cada hoja, no en el plano.",
            "El piso 1 no usa 107-123. En A101 esos números son vestíbulo, lavandería, salón, desayuno, gimnasio, reunión, baños y pasillos.",
            "El piso 1 no usa 125 (escalera oeste y elevador) ni 143-144 (escalera este y máquinas).",
            "El piso 2 no usa 208 (escalera A, elevador, blancos), 213/215/217 (abierto al piso de abajo) ni 243 (escalera este y máquinas).",
            "El piso 3 no usa 308 (la misma escalera oeste, elevador y blancos) ni 343 (escalera este y máquinas). Las habitaciones 313, 315 y 317 cubren el hueco del piso 2.",
            "A101 también imprime números de espacios que repiten números de habitación. Las habitaciones son las del plano de evacuación.",
            "El elevador es un símbolo en A101 y A102. El cartel de evacuación no lo escribe.",
        ],
    }
    out = ROOT / "data" / "mspwe-floors.json"
    out.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    js = (
        "/* Simplified MSPWE floor map. Generated by tools/build-floor-map.py.\n"
        "   Room rectangles are traced from evacuation-plan label positions.\n"
        "   Not a construction drawing. */\n"
        "(function (root) {\n"
        "  var data = " + json.dumps(data, separators=(",", ":")) + ";\n"
        "  if (typeof module !== \"undefined\" && module.exports) module.exports = data;\n"
        "  root.MSPWE_FLOOR_MAP = data;\n"
        "})(typeof globalThis !== \"undefined\" ? globalThis : this);\n"
    )
    (ROOT / "data" / "mspwe-floors.js").write_text(js, encoding="utf-8")
    write_sql(floors)
    counts = {fl["id"]: len(fl["rooms"]) for fl in floors}
    print(counts, "total", sum(counts.values()))
    for fl in floors:
        nums = [r["n"] for r in fl["rooms"]]
        print(fl["id"], " ".join(nums))


if __name__ == "__main__":
    main()
