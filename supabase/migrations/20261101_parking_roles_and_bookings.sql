-- Parking visibility and Park & Fly bookings. Additive only.
-- Replaces the log check and the select policies. Does not remove tables or rows.
-- Who can see and log: front desk, AGM, GM, and above-property.
-- Drivers, housekeeping, laundry, housepersons, maintenance, and breakfast cannot.
-- Who can lay out stalls stays GM, AGM, and above-property.
-- Bookings exist only at the airport hotels (MSPAM, MSPMS). A last name and
-- confirmation are stored on the booking. The visit row still has no guest name.
-- A booking with a plate converts to a parked visit on the drop-off date.

create or replace function private.parking_can_log()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.my_role() in ('front_desk', 'gm', 'agm', 'above_property'),
    false
  );
$$;

drop policy if exists parking_settings_select on public.parking_settings;
create policy parking_settings_select on public.parking_settings
  for select to authenticated
  using (
    (select private.parking_can_log())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists parking_zones_select on public.parking_zones;
create policy parking_zones_select on public.parking_zones
  for select to authenticated
  using (
    (select private.parking_can_log())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists parking_stalls_select on public.parking_stalls;
create policy parking_stalls_select on public.parking_stalls
  for select to authenticated
  using (
    (select private.parking_can_log())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists parking_stall_ranges_select on public.parking_stall_ranges;
create policy parking_stall_ranges_select on public.parking_stall_ranges
  for select to authenticated
  using (
    (select private.parking_can_log())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists parking_visits_select on public.parking_visits;
create policy parking_visits_select on public.parking_visits
  for select to authenticated
  using (
    (select private.parking_can_log())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

create table if not exists public.parking_bookings (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPAM', 'MSPMS')),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 40),
  confirm text not null check (confirm ~ '^[A-Z0-9-]{2,24}$'),
  dropoff date not null,
  pickup date not null check (pickup >= dropoff),
  plate text,
  plate_state text,
  make text check (make is null or char_length(make) <= 30),
  model text check (model is null or char_length(model) <= 30),
  color text check (color is null or char_length(color) <= 30),
  visit_id bigint references public.parking_visits (id),
  cancelled_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (plate is null or (plate ~ '^[A-Z0-9]{2,8}$' and plate_state ~ '^[A-Z]{2}$'))
);

comment on table public.parking_bookings is
  'Future Park & Fly stay. Last name and confirmation only. Vehicle is optional until drop-off.';

create index if not exists parking_bookings_hotel_dropoff_idx
  on public.parking_bookings (hotel, dropoff);

create unique index if not exists parking_bookings_open_confirm_idx
  on public.parking_bookings (hotel, confirm)
  where cancelled_at is null and visit_id is null;

alter table public.parking_bookings enable row level security;

drop policy if exists parking_bookings_select on public.parking_bookings;
create policy parking_bookings_select on public.parking_bookings
  for select to authenticated
  using (
    (select private.parking_can_log())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

create or replace function private.parking_convert_booking(p_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.parking_bookings%rowtype;
  v_today date;
  v_enabled boolean;
  v_on boolean;
  v_days integer;
  v_in timestamptz;
  v_pickup timestamptz;
  v_stall bigint;
  v_id bigint;
begin
  if (select auth.uid()) is null or not private.parking_can_log() then
    return false;
  end if;
  select * into b from public.parking_bookings where id = p_id;
  if b.id is null or b.cancelled_at is not null or b.visit_id is not null then
    return false;
  end if;
  if b.plate is null then
    return false;
  end if;
  v_today := (pg_catalog.timezone('America/Chicago', pg_catalog.now()))::date;
  if b.dropoff > v_today then
    return false;
  end if;
  if not private.parking_hotel_ok(b.hotel) then
    return false;
  end if;
  select s.park_fly_enabled, s.parking_enabled into v_enabled, v_on
  from public.parking_settings s where s.hotel = b.hotel;
  if not coalesce(v_enabled, false) or not coalesce(v_on, true) then
    return false;
  end if;
  if exists (
    select 1 from public.parking_visits v
    where v.hotel = b.hotel and v.plate = b.plate and v.checked_out_at is null
  ) then
    return false;
  end if;
  v_days := b.pickup - b.dropoff;
  if v_days < 1 then
    v_days := 1;
  end if;
  if v_days > 60 then
    return false;
  end if;
  v_in := (b.dropoff::text || ' 12:00')::timestamp at time zone 'America/Chicago';
  if b.dropoff = v_today or v_in > pg_catalog.now() then
    v_in := pg_catalog.now();
  end if;
  v_pickup := (b.pickup::text || ' 15:00')::timestamp at time zone 'America/Chicago';
  v_stall := private.parking_suggest_stall(b.hotel, null, v_in, null, false, 'park_fly');
  insert into public.parking_visits (
    hotel, plate, plate_state, make, model, color, stall_id,
    checked_in_at, vehicle_type, pf_confirm, pf_days, pf_dropoff, pf_pickup_at,
    created_by
  ) values (
    b.hotel, b.plate, b.plate_state, b.make, b.model, b.color, v_stall,
    v_in, 'park_fly', b.confirm, v_days, b.dropoff, v_pickup,
    (select auth.uid())
  ) returning id into v_id;
  update public.parking_bookings
    set visit_id = v_id, updated_at = pg_catalog.now()
  where id = b.id and visit_id is null;
  return true;
end;
$$;

create or replace function private.parking_save_booking(
  p_hotel text,
  p_last_name text,
  p_confirm text,
  p_dropoff date,
  p_pickup date,
  p_plate text,
  p_state text,
  p_make text,
  p_model text,
  p_color text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_confirm text;
  v_plate text;
  v_state text;
  v_enabled boolean;
  v_on boolean;
  v_id bigint;
begin
  if (select auth.uid()) is null or not private.parking_can_log() then
    raise exception 'not allowed';
  end if;
  if p_hotel not in ('MSPAM', 'MSPMS') or not private.parking_hotel_ok(p_hotel) then
    raise exception 'park and fly is off';
  end if;
  select s.park_fly_enabled, s.parking_enabled into v_enabled, v_on
  from public.parking_settings s where s.hotel = p_hotel;
  if not coalesce(v_enabled, false) or not coalesce(v_on, true) then
    raise exception 'park and fly is off';
  end if;
  v_name := btrim(coalesce(p_last_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'name required';
  end if;
  v_confirm := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_confirm, ''), '[^A-Za-z0-9-]', '', 'g'));
  if v_confirm !~ '^[A-Z0-9-]{2,24}$' then
    raise exception 'confirmation required';
  end if;
  if p_dropoff is null or p_pickup is null or p_pickup < p_dropoff or (p_pickup - p_dropoff) > 60 then
    raise exception 'dates required';
  end if;
  v_plate := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_state := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_state, ''), '[^A-Za-z]', '', 'g'));
  if v_plate = '' then
    v_plate := null;
    v_state := null;
  elsif v_plate !~ '^[A-Z0-9]{2,8}$' or v_state !~ '^[A-Z]{2}$' then
    raise exception 'plate required';
  end if;
  insert into public.parking_bookings (
    hotel, last_name, confirm, dropoff, pickup, plate, plate_state, make, model, color, created_by
  ) values (
    p_hotel, v_name, v_confirm, p_dropoff, p_pickup, v_plate, v_state,
    nullif(btrim(p_make), ''), nullif(btrim(p_model), ''), nullif(btrim(p_color), ''),
    (select auth.uid())
  ) returning id into v_id;
  perform private.parking_convert_booking(v_id);
  return v_id;
end;
$$;

create or replace function private.parking_arrive_booking(
  p_id bigint,
  p_plate text,
  p_state text,
  p_make text,
  p_model text,
  p_color text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_plate text;
  v_state text;
begin
  if (select auth.uid()) is null or not private.parking_can_log() then
    raise exception 'not allowed';
  end if;
  select hotel into v_hotel from public.parking_bookings where id = p_id and cancelled_at is null and visit_id is null;
  if v_hotel is null or not private.parking_hotel_ok(v_hotel) then
    raise exception 'not allowed';
  end if;
  v_plate := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_plate, ''), '[^A-Za-z0-9]', '', 'g'));
  v_state := pg_catalog.upper(pg_catalog.regexp_replace(coalesce(p_state, ''), '[^A-Za-z]', '', 'g'));
  if v_plate !~ '^[A-Z0-9]{2,8}$' or v_state !~ '^[A-Z]{2}$' then
    raise exception 'plate required';
  end if;
  update public.parking_bookings
    set plate = v_plate,
        plate_state = v_state,
        make = coalesce(nullif(btrim(p_make), ''), make),
        model = coalesce(nullif(btrim(p_model), ''), model),
        color = coalesce(nullif(btrim(p_color), ''), color),
        updated_at = pg_catalog.now()
  where id = p_id;
  perform private.parking_convert_booking(p_id);
  return p_id;
end;
$$;

create or replace function private.parking_settle_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  if (select auth.uid()) is null or not private.parking_can_log() then
    raise exception 'not allowed';
  end if;
  for r in
    select id, hotel from public.parking_bookings
    where cancelled_at is null and visit_id is null and plate is not null
      and dropoff <= (pg_catalog.timezone('America/Chicago', pg_catalog.now()))::date
  loop
    if private.parking_hotel_ok(r.hotel) and private.parking_convert_booking(r.id) then
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

create or replace function public.parking_save_booking(
  p_hotel text, p_last_name text, p_confirm text, p_dropoff date, p_pickup date,
  p_plate text, p_state text, p_make text, p_model text, p_color text
) returns bigint
language sql security invoker set search_path = ''
as $$
  select private.parking_save_booking(
    p_hotel, p_last_name, p_confirm, p_dropoff, p_pickup, p_plate, p_state, p_make, p_model, p_color
  );
$$;

create or replace function public.parking_arrive_booking(
  p_id bigint, p_plate text, p_state text, p_make text, p_model text, p_color text
) returns bigint
language sql security invoker set search_path = ''
as $$ select private.parking_arrive_booking(p_id, p_plate, p_state, p_make, p_model, p_color); $$;

create or replace function public.parking_settle_bookings()
returns integer
language sql security invoker set search_path = ''
as $$ select private.parking_settle_bookings(); $$;

revoke all on function private.parking_can_log() from public, anon;
revoke all on function private.parking_convert_booking(bigint) from public, anon;
revoke all on function private.parking_save_booking(text, text, text, date, date, text, text, text, text, text) from public, anon;
revoke all on function private.parking_arrive_booking(bigint, text, text, text, text, text) from public, anon;
revoke all on function private.parking_settle_bookings() from public, anon;
revoke all on function public.parking_save_booking(text, text, text, date, date, text, text, text, text, text) from public, anon;
revoke all on function public.parking_arrive_booking(bigint, text, text, text, text, text) from public, anon;
revoke all on function public.parking_settle_bookings() from public, anon;

grant execute on function private.parking_can_log() to authenticated;
grant execute on function private.parking_convert_booking(bigint) to authenticated;
grant execute on function private.parking_save_booking(text, text, text, date, date, text, text, text, text, text) to authenticated;
grant execute on function private.parking_arrive_booking(bigint, text, text, text, text, text) to authenticated;
grant execute on function private.parking_settle_bookings() to authenticated;
grant execute on function public.parking_save_booking(text, text, text, date, date, text, text, text, text, text) to authenticated;
grant execute on function public.parking_arrive_booking(bigint, text, text, text, text, text) to authenticated;
grant execute on function public.parking_settle_bookings() to authenticated;

revoke all on table public.parking_bookings from public, anon, authenticated;
grant select on table public.parking_bookings to authenticated;

revoke all on sequence public.parking_bookings_id_seq from public, anon, authenticated;
