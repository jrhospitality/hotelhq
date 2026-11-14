-- Parking capture and market sales per occupied room. Additive only.
-- Does not change the hotel feature allow-list or any existing function.
-- No drops, deletes, or updates of existing rows.
--
-- revenue_daily_facts is one business day for one hotel. The key is
-- (hotel, business_date). The browser can read. It cannot insert, update,
-- or delete. The night-audit ingest uses the service role and inserts.
-- On a repeat load, leave the existing row as it is.
--
-- rooms_sold already excludes comp and house use. Do not insert those rooms.
-- A missing day is no row. Do not insert rooms_sold 0 to mean "unknown".
--
-- Parking components stay in separate columns. Null means that line was not
-- on the report. Zero means the line was present and netted to zero.
-- Hampton (MSPAM) capture uses PARKING + ADD-ON SELF-PARKING
--   + PARKING-THIRD PARTY OPERATED.
-- Golden Valley (MSPWE) capture uses PARKING + PARKING - MANUAL.
-- SpringHill (MSPMS) capture uses Daily Parking (PK) net.
-- Capture = (that parking total / per-car rate) / rooms_sold.
-- Implied cars may be fractional. The per-car rate lives in parking_car_rates.
-- Hampton and SpringHill start at $15. Golden Valley starts at $10.
-- Corporate can change a rate. GM and AGM can read their own hotel's rate.
-- Golden Valley's parking module can stay off. The rate row stays anyway.
--
-- Market is split. market_front_desk is the HotelKey sundry total.
-- market_kiosk is the kiosk total. Null means the kiosk file was not loaded.
-- Zero means the kiosk reported no sales. Golden Valley's kiosk started
-- 2026-11-02. From that date, a null kiosk makes the combined market figure
-- incomplete. Earlier dates are front desk only.
-- Market per occupied room = (front desk + kiosk) / rooms_sold.
-- The $2 goal is the retail playbook goal. It is not stored here.
--
-- line_items is the audit detail for the totals: codes and amounts only.
-- No guest names, confirmation numbers, email addresses, or room numbers.
-- Each element is an object:
--   {"kind":"rooms","code":"ROOMS_SOLD","label":"Rooms sold excluding comp and house use","count":80}
--   {"kind":"parking","code":"PARKING","label":"PARKING","amount":40.00}
--   {"kind":"parking","code":"ADD_ON_SELF_PARKING","label":"ADD-ON SELF-PARKING","amount":12.00}
--   {"kind":"parking","code":"PARKING_THIRD_PARTY","label":"PARKING-THIRD PARTY OPERATED","amount":7.00}
--   {"kind":"parking","code":"PARKING_MANUAL","label":"PARKING - MANUAL","amount":6.00}
--   {"kind":"parking","code":"DAILY_PARKING_PK","label":"Daily Parking (PK)","amount":45.00}
--   {"kind":"market","code":"MARKET","label":"Market","channel":"front_desk","amount":52.00}
--   {"kind":"market","code":"KIOSK","label":"Market kiosk","channel":"kiosk","amount":18.00}
-- Omit a line that was not on the report. Do not send a kiosk line when the
-- kiosk file is missing; leave market_kiosk null.
--
-- Demo mode does not call this database. An example loader lives in
-- supabase/examples/load_revenue_daily_facts.example.sql.

create schema if not exists private;

grant usage on schema private to authenticated;

create table if not exists public.parking_car_rates (
  hotel text primary key check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  per_car_rate numeric(8, 2) not null check (per_car_rate > 0 and per_car_rate < 1000),
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.parking_car_rates is
  'Per-hotel parking price per car. Corporate can change it. Capture divides parking revenue by this rate. Golden Valley stays stored while its parking module is off.';
comment on column public.parking_car_rates.per_car_rate is
  'Dollars per car. Hampton and SpringHill start at 15. Golden Valley starts at 10.';

insert into public.parking_car_rates (hotel, per_car_rate)
values
  ('MSPAM', 15.00),
  ('MSPMS', 15.00),
  ('MSPWE', 10.00)
on conflict (hotel) do nothing;

create table if not exists public.revenue_daily_facts (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  business_date date not null,
  rooms_sold integer not null check (rooms_sold >= 0 and rooms_sold <= 5000),
  parking_parking numeric(12, 2) check (parking_parking is null or (parking_parking > -1000000 and parking_parking < 1000000)),
  parking_addon_self numeric(12, 2) check (parking_addon_self is null or (parking_addon_self > -1000000 and parking_addon_self < 1000000)),
  parking_third_party numeric(12, 2) check (parking_third_party is null or (parking_third_party > -1000000 and parking_third_party < 1000000)),
  parking_manual numeric(12, 2) check (parking_manual is null or (parking_manual > -1000000 and parking_manual < 1000000)),
  parking_daily_pk numeric(12, 2) check (parking_daily_pk is null or (parking_daily_pk > -1000000 and parking_daily_pk < 1000000)),
  market_front_desk numeric(12, 2) check (market_front_desk is null or (market_front_desk > -1000000 and market_front_desk < 1000000)),
  market_kiosk numeric(12, 2) check (market_kiosk is null or (market_kiosk > -1000000 and market_kiosk < 1000000)),
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  line_items jsonb not null default '[]'::jsonb check (jsonb_typeof(line_items) = 'array' and pg_column_size(line_items) <= 12000),
  loaded_at timestamptz not null default pg_catalog.now(),
  primary key (hotel, business_date)
);

comment on table public.revenue_daily_facts is
  'One business day. Rooms sold exclude comp and house use. Parking columns are the PMS lines. Market is split between front desk and kiosk. Null is missing, not zero.';
comment on column public.revenue_daily_facts.rooms_sold is
  'Rooms sold excluding comp and house use. This is the denominator for both metrics.';
comment on column public.revenue_daily_facts.parking_parking is
  'PARKING line. Used for Hampton and Golden Valley. Null if the line was absent.';
comment on column public.revenue_daily_facts.parking_addon_self is
  'ADD-ON SELF-PARKING. Hampton only. Null if the line was absent.';
comment on column public.revenue_daily_facts.parking_third_party is
  'PARKING-THIRD PARTY OPERATED. Hampton only. Null if the line was absent.';
comment on column public.revenue_daily_facts.parking_manual is
  'PARKING - MANUAL. Golden Valley only. Null if the line was absent.';
comment on column public.revenue_daily_facts.parking_daily_pk is
  'Daily Parking (PK) net. SpringHill only. Null if the line was absent.';
comment on column public.revenue_daily_facts.market_front_desk is
  'HotelKey sundry market sales at the front desk. Null if that total was absent.';
comment on column public.revenue_daily_facts.market_kiosk is
  'Kiosk market sales. Null means not loaded. Golden Valley from 2026-11-02 treats null as an incomplete combined total.';
comment on column public.revenue_daily_facts.line_items is
  'Codes and amounts that support the totals. No guest names, confirmations, or room numbers.';
comment on column public.revenue_daily_facts.source is
  'Which feed wrote the row, such as hotelkey or example. The example source is not for the live project.';

create index if not exists revenue_daily_facts_date_idx
  on public.revenue_daily_facts (business_date, hotel);

create or replace function private.touch_parking_car_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hotel is distinct from old.hotel then
    raise exception 'hotel is fixed';
  end if;
  new.updated_at := pg_catalog.now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke all on function private.touch_parking_car_rate() from public, anon, authenticated;

drop trigger if exists parking_car_rates_touch on public.parking_car_rates;
create trigger parking_car_rates_touch
  before update on public.parking_car_rates
  for each row execute function private.touch_parking_car_rate();

alter table public.parking_car_rates enable row level security;
alter table public.revenue_daily_facts enable row level security;

-- Corporate reads every hotel. GM and AGM read their own hotel. No other role.
drop policy if exists parking_car_rates_select on public.parking_car_rates;
create policy parking_car_rates_select on public.parking_car_rates
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists parking_car_rates_update on public.parking_car_rates;
create policy parking_car_rates_update on public.parking_car_rates
  for update to authenticated
  using ((select private.is_above()))
  with check ((select private.is_above()));

drop policy if exists revenue_daily_facts_select on public.revenue_daily_facts;
create policy revenue_daily_facts_select on public.revenue_daily_facts
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

revoke all on table public.parking_car_rates from public, anon, authenticated;
revoke all on table public.revenue_daily_facts from public, anon, authenticated;

grant select on table public.parking_car_rates to authenticated;
grant update (per_car_rate) on table public.parking_car_rates to authenticated;
grant select on table public.revenue_daily_facts to authenticated;
