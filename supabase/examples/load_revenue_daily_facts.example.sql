-- Example daily parking and market rows. Insert only. Not a migration.
-- These values are made up. Do not load them into the live project.
-- Do not update or delete. On conflict, the existing row is left as it is.
--
-- Expected row shape for the night-audit ingest (one row per hotel and date):
--
--   hotel                  MSPWE, MSPAM, or MSPMS
--   business_date          date, the PMS business date
--   rooms_sold             integer, rooms sold excluding comp and house use
--   parking_parking        PARKING. Hampton and Golden Valley. Null if absent.
--   parking_addon_self     ADD-ON SELF-PARKING. Hampton. Null if absent.
--   parking_third_party    PARKING-THIRD PARTY OPERATED. Hampton. Null if absent.
--   parking_manual         PARKING - MANUAL. Golden Valley. Null if absent.
--   parking_daily_pk       Daily Parking (PK) net. SpringHill. Null if absent.
--   market_front_desk      front desk sundry market. Null if absent.
--   market_kiosk           kiosk market. Null if the kiosk file was not loaded.
--                          Use 0 only when the kiosk reported zero sales.
--   source                 short token such as hotelkey. This file uses example.
--   line_items             jsonb array of codes and amounts. No guest names,
--                          confirmation numbers, email addresses, or room numbers.
--
-- Hampton sums parking_parking + parking_addon_self + parking_third_party.
-- Golden Valley sums parking_parking + parking_manual.
-- SpringHill uses parking_daily_pk only.
-- Leave the other parking columns null.
-- Golden Valley's kiosk started 2026-11-02. Omit the kiosk line and leave
-- market_kiosk null until that file exists. Do not copy front desk into kiosk.
--
-- The service role inserts. Authenticated hotel users cannot.
-- Repeat loads must use on conflict do nothing so a later file cannot
-- overwrite a day that is already stored.

insert into public.revenue_daily_facts (
  hotel, business_date, rooms_sold,
  parking_parking, parking_addon_self, parking_third_party, parking_manual, parking_daily_pk,
  market_front_desk, market_kiosk, source, line_items
)
values
  (
    'MSPAM', '2026-11-03', 86,
    52.00, 12.00, 7.00, null, null,
    48.00, null, 'example',
    '[
      {"kind":"rooms","code":"ROOMS_SOLD","label":"Rooms sold excluding comp and house use","count":86},
      {"kind":"parking","code":"PARKING","label":"PARKING","amount":52.00},
      {"kind":"parking","code":"ADD_ON_SELF_PARKING","label":"ADD-ON SELF-PARKING","amount":12.00},
      {"kind":"parking","code":"PARKING_THIRD_PARTY","label":"PARKING-THIRD PARTY OPERATED","amount":7.00},
      {"kind":"market","code":"MARKET","label":"Market","channel":"front_desk","amount":48.00}
    ]'::jsonb
  ),
  (
    'MSPMS', '2026-11-03', 74,
    null, null, null, null, 45.00,
    36.00, null, 'example',
    '[
      {"kind":"rooms","code":"ROOMS_SOLD","label":"Rooms sold excluding comp and house use","count":74},
      {"kind":"parking","code":"DAILY_PARKING_PK","label":"Daily Parking (PK)","amount":45.00},
      {"kind":"market","code":"MARKET","label":"Market","channel":"front_desk","amount":36.00}
    ]'::jsonb
  ),
  (
    'MSPWE', '2026-10-20', 44,
    22.00, null, null, 6.00, null,
    20.00, null, 'example',
    '[
      {"kind":"rooms","code":"ROOMS_SOLD","label":"Rooms sold excluding comp and house use","count":44},
      {"kind":"parking","code":"PARKING","label":"PARKING","amount":22.00},
      {"kind":"parking","code":"PARKING_MANUAL","label":"PARKING - MANUAL","amount":6.00},
      {"kind":"market","code":"MARKET","label":"Market","channel":"front_desk","amount":20.00}
    ]'::jsonb
  ),
  (
    'MSPWE', '2026-11-03', 46,
    24.00, null, null, 6.00, null,
    22.00, null, 'example',
    '[
      {"kind":"rooms","code":"ROOMS_SOLD","label":"Rooms sold excluding comp and house use","count":46},
      {"kind":"parking","code":"PARKING","label":"PARKING","amount":24.00},
      {"kind":"parking","code":"PARKING_MANUAL","label":"PARKING - MANUAL","amount":6.00},
      {"kind":"market","code":"MARKET","label":"Market","channel":"front_desk","amount":22.00}
    ]'::jsonb
  ),
  (
    'MSPWE', '2026-11-04', 47,
    25.00, null, null, 6.00, null,
    23.00, 18.00, 'example',
    '[
      {"kind":"rooms","code":"ROOMS_SOLD","label":"Rooms sold excluding comp and house use","count":47},
      {"kind":"parking","code":"PARKING","label":"PARKING","amount":25.00},
      {"kind":"parking","code":"PARKING_MANUAL","label":"PARKING - MANUAL","amount":6.00},
      {"kind":"market","code":"MARKET","label":"Market","channel":"front_desk","amount":23.00},
      {"kind":"market","code":"KIOSK","label":"Market kiosk","channel":"kiosk","amount":18.00}
    ]'::jsonb
  )
on conflict (hotel, business_date) do nothing;
