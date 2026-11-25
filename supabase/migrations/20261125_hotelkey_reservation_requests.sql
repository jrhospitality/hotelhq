-- HotelKey reservation guest requests. Additive only. Insert-friendly.
-- Do not apply this file until Jay has reviewed the demo.
-- This change does not delete a table, column, or row.
-- It does not seed guest text. Remarks are guest data.
--
-- The live project clxvmtbmveusrbxacnxe already has private.hotelkey_live_ingest
-- from the hotelkey_live_pull migration (applied there, not stored in git).
-- This file replaces that function. Room status, occupancy, reservation
-- activity, and the heartbeat stay the same. A new "requests" array on the
-- same device-token call is stored here.
-- Omit "requests" and the existing rows are left alone.
-- Send "requests" (an empty array is allowed) only as the full set of
-- HOLD and CHECKED_IN lines for that hotel. Lines that are not in the
-- array are marked inactive. They are not deleted.
-- A non-empty array that fails every line is rejected and does not
-- inactivate the current rows.
--
-- The mini PC posts the same RPC it already uses:
--   POST /rest/v1/rpc/hotelkey_live_ingest
--   { "p_token": "<device token>", "p": { ... } }
-- The server hashes the stored text. A client "content_hash" is ignored.
-- Hash input, UTF-8, fields joined with ASCII unit separator 0x1f:
--   kind, preference_id, preference_name, category, text
-- Text and preference_name are trimmed. Text is kept to 4000 characters.
-- preference_name is kept to 200 characters. A new hash needs a new
-- acknowledgment. Room, dates, status, and confirmation are not in the hash.
--
-- One requests[] object:
--   reservation_id   HotelKey reservation id. [A-Za-z0-9_-], 1 to 80 chars.
--   confirmation     confirmation_no. Optional. Max 40 chars.
--   room             room.number. Optional. [A-Za-z0-9-], 1 to 10 chars.
--   arrival          check_in_date. YYYY-MM-DD or omit.
--   departure        check_out_date. YYYY-MM-DD or omit.
--   status           HOLD (arriving) or CHECKED_IN (in-house). Other
--                    statuses are stored inactive.
--   kind             preference | remarks | stay_remarks | billing_remarks
--                    | housekeeping_remarks | booking_remarks
--   preference_id    Catalog id. Required for kind preference. Empty otherwise.
--   preference_name  Catalog name. Required for kind preference.
--   category         STAY, HOUSEKEEPING, ROOM, DIETARY, or empty.
--   text             Remark text. Required for every kind except preference.
--
-- Map HotelKey /reservations/search like this:
--   reservation id            -> reservation_id
--   confirmation_no           -> confirmation
--   room.number               -> room
--   check_in_date             -> arrival
--   check_out_date            -> departure
--   status                    -> status
--   reservation_preferences[] -> one kind "preference" line each
--     preference_id, and the property catalog name + category
--   remarks                   -> kind remarks
--   stay_remarks              -> kind stay_remarks
--   billing_remarks           -> kind billing_remarks
--   housekeeping_remarks      -> kind housekeeping_remarks
--   booking_remarks           -> kind booking_remarks
-- Skip a blank remark. Skip a preference the catalog marks inactive.

create table if not exists public.hotelkey_reservation_requests (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  reservation_id text not null check (reservation_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  confirmation text not null default '' check (char_length(confirmation) <= 40),
  room text not null default '' check (room = '' or room ~ '^[A-Za-z0-9-]{1,10}$'),
  arrival date,
  departure date,
  status text not null check (status ~ '^[A-Z0-9_]{1,40}$'),
  kind text not null check (kind in (
    'preference', 'remarks', 'stay_remarks', 'billing_remarks',
    'housekeeping_remarks', 'booking_remarks'
  )),
  preference_id text not null default '' check (preference_id = '' or preference_id ~ '^[A-Za-z0-9_-]{1,80}$'),
  preference_name text not null default '' check (char_length(preference_name) <= 200),
  category text not null default '' check (category in ('', 'STAY', 'HOUSEKEEPING', 'ROOM', 'DIETARY')),
  request_text text not null default '' check (char_length(request_text) <= 4000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  first_seen timestamptz not null default pg_catalog.now(),
  last_seen timestamptz not null default pg_catalog.now(),
  active boolean not null default true,
  check (departure is null or arrival is null or departure >= arrival),
  check (
    (kind = 'preference' and preference_id <> '' and preference_name <> '')
    or (
      kind <> 'preference'
      and preference_id = ''
      and preference_name = ''
      and category = ''
      and request_text <> ''
    )
  ),
  unique (hotel, reservation_id, kind, preference_id)
);

comment on table public.hotelkey_reservation_requests is
  'One HotelKey request line for an arrival or in-house stay. request_text is guest data. Rows are marked inactive. They are not deleted.';

comment on column public.hotelkey_reservation_requests.content_hash is
  'SHA-256 hex of kind, preference id, preference name, category, and text. A new hash needs a new acknowledgment.';

comment on column public.hotelkey_reservation_requests.request_text is
  'Remark text. Empty when the line is a catalog preference. Do not copy this column into git, seeds, or tests.';

create index if not exists hotelkey_reservation_requests_open_idx
  on public.hotelkey_reservation_requests (hotel, arrival)
  where active;

create index if not exists hotelkey_reservation_requests_seen_idx
  on public.hotelkey_reservation_requests (hotel, last_seen)
  where active;

create table if not exists public.hotelkey_reservation_request_acks (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.hotelkey_reservation_requests (id),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  acknowledged_by uuid not null,
  acknowledged_name text not null default '' check (char_length(acknowledged_name) <= 120),
  note text not null default '' check (char_length(note) <= 500),
  acknowledged_at timestamptz not null default pg_catalog.now(),
  unique (request_id, content_hash)
);

comment on table public.hotelkey_reservation_request_acks is
  'One acknowledgment for one content hash. The row stays when the line text changes. A new hash needs a new row.';

create index if not exists hotelkey_reservation_request_acks_hotel_idx
  on public.hotelkey_reservation_request_acks (hotel, acknowledged_at desc);

alter table public.hotelkey_reservation_requests enable row level security;
alter table public.hotelkey_reservation_request_acks enable row level security;

drop policy if exists hotelkey_reservation_requests_select on public.hotelkey_reservation_requests;
create policy hotelkey_reservation_requests_select
  on public.hotelkey_reservation_requests
  for select
  to authenticated
  using (
    (select private.is_above())
    or hotel = any ((select private.my_hotels())::text[])
  );

drop policy if exists hotelkey_reservation_request_acks_select on public.hotelkey_reservation_request_acks;
create policy hotelkey_reservation_request_acks_select
  on public.hotelkey_reservation_request_acks
  for select
  to authenticated
  using (
    (select private.is_above())
    or hotel = any ((select private.my_hotels())::text[])
  );

revoke all on table public.hotelkey_reservation_requests from public, anon, authenticated, service_role;
revoke all on table public.hotelkey_reservation_request_acks from public, anon, authenticated, service_role;
grant select on table public.hotelkey_reservation_requests to authenticated;
grant select on table public.hotelkey_reservation_request_acks to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant select on table public.hotelkey_reservation_requests to service_role;
    grant select on table public.hotelkey_reservation_request_acks to service_role;
  end if;
end $$;

-- Device-token writer. Not granted to anon or authenticated.
-- The public ingest function is security definer and is the only caller.
create or replace function private.hotelkey_live_save_requests(p_hotel text, p jsonb, p_now timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_r jsonb;
  v_kind text;
  v_pref text;
  v_name text;
  v_cat text;
  v_text text;
  v_room text;
  v_conf text;
  v_status text;
  v_res text;
  v_hash text;
  v_arr date;
  v_dep date;
  v_active boolean;
  v_skip boolean;
  v_saved integer := 0;
  v_off integer := 0;
begin
  if p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if pg_catalog.jsonb_typeof(p -> 'requests') is distinct from 'array' then
    return pg_catalog.jsonb_build_object(
      'requests', 0,
      'requests_inactive', 0,
      'requests_seen', false
    );
  end if;
  if pg_catalog.jsonb_array_length(p -> 'requests') > 2000 then
    raise exception 'too many requests';
  end if;

  for v_r in select * from pg_catalog.jsonb_array_elements(p -> 'requests') loop
    v_kind := v_r ->> 'kind';
    if v_kind not in (
      'preference', 'remarks', 'stay_remarks', 'billing_remarks',
      'housekeeping_remarks', 'booking_remarks'
    ) then
      continue;
    end if;
    v_res := coalesce(v_r ->> 'reservation_id', '');
    if v_res !~ '^[A-Za-z0-9_-]{1,80}$' then
      continue;
    end if;
    v_pref := coalesce(v_r ->> 'preference_id', '');
    v_name := pg_catalog.left(pg_catalog.btrim(coalesce(v_r ->> 'preference_name', '')), 200);
    v_cat := pg_catalog.upper(pg_catalog.btrim(coalesce(v_r ->> 'category', '')));
    v_text := pg_catalog.left(pg_catalog.btrim(coalesce(v_r ->> 'text', '')), 4000);
    if v_cat not in ('', 'STAY', 'HOUSEKEEPING', 'ROOM', 'DIETARY') then
      continue;
    end if;
    if v_kind = 'preference' then
      if v_pref !~ '^[A-Za-z0-9_-]{1,80}$' or v_name = '' then
        continue;
      end if;
    else
      if v_pref <> '' or v_text = '' then
        continue;
      end if;
      v_name := '';
      v_cat := '';
    end if;
    v_room := coalesce(v_r ->> 'room', '');
    if v_room <> '' and v_room !~ '^[A-Za-z0-9-]{1,10}$' then
      continue;
    end if;
    v_conf := pg_catalog.left(pg_catalog.btrim(coalesce(v_r ->> 'confirmation', '')), 40);
    v_status := pg_catalog.upper(pg_catalog.btrim(coalesce(v_r ->> 'status', '')));
    if v_status !~ '^[A-Z0-9_]{1,40}$' then
      continue;
    end if;
    v_skip := false;
    begin
      if coalesce(v_r ->> 'arrival', '') = '' then
        v_arr := null;
      elsif (v_r ->> 'arrival') !~ '^\d{4}-\d{2}-\d{2}$' then
        v_skip := true;
      else
        v_arr := (v_r ->> 'arrival')::date;
      end if;
      if not v_skip then
        if coalesce(v_r ->> 'departure', '') = '' then
          v_dep := null;
        elsif (v_r ->> 'departure') !~ '^\d{4}-\d{2}-\d{2}$' then
          v_skip := true;
        else
          v_dep := (v_r ->> 'departure')::date;
        end if;
      end if;
    exception
      when others then
        v_skip := true;
    end;
    if v_skip or (v_arr is not null and v_dep is not null and v_dep < v_arr) then
      continue;
    end if;
    v_active := v_status in ('HOLD', 'CHECKED_IN');
    v_hash := encode(
      extensions.digest(
        convert_to(v_kind || E'\x1f' || v_pref || E'\x1f' || v_name || E'\x1f' || v_cat || E'\x1f' || v_text, 'UTF8'),
        'sha256'
      ),
      'hex'
    );
    insert into public.hotelkey_reservation_requests as q (
      hotel, reservation_id, confirmation, room, arrival, departure, status,
      kind, preference_id, preference_name, category, request_text, content_hash,
      first_seen, last_seen, active
    ) values (
      p_hotel, v_res, v_conf, v_room, v_arr, v_dep, v_status,
      v_kind, v_pref, v_name, v_cat, v_text, v_hash,
      p_now, p_now, v_active
    )
    on conflict (hotel, reservation_id, kind, preference_id) do update
      set confirmation = excluded.confirmation,
          room = excluded.room,
          arrival = excluded.arrival,
          departure = excluded.departure,
          status = excluded.status,
          preference_name = excluded.preference_name,
          category = excluded.category,
          request_text = excluded.request_text,
          content_hash = excluded.content_hash,
          last_seen = excluded.last_seen,
          active = excluded.active;
    v_saved := v_saved + 1;
  end loop;

  if v_saved = 0 and pg_catalog.jsonb_array_length(p -> 'requests') > 0 then
    return pg_catalog.jsonb_build_object(
      'requests', 0,
      'requests_inactive', 0,
      'requests_seen', false,
      'requests_rejected', true
    );
  end if;

  update public.hotelkey_reservation_requests as q
     set active = false
   where q.hotel = p_hotel
     and q.active
     and q.last_seen < p_now;
  get diagnostics v_off = row_count;

  return pg_catalog.jsonb_build_object(
    'requests', v_saved,
    'requests_inactive', v_off,
    'requests_seen', true
  );
end;
$$;

comment on function private.hotelkey_live_save_requests(text, jsonb, timestamptz) is
  'Upserts HotelKey request lines for one device-token pull. Missing lines are marked inactive. Nothing is deleted.';

revoke all on function private.hotelkey_live_save_requests(text, jsonb, timestamptz) from public, anon, authenticated, service_role;

-- Same device-token body as the live function, plus the requests array.
create or replace function private.hotelkey_live_ingest(p_token text, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_now timestamptz := now();
  v_r jsonb;
  v_code text;
  v_prev text;
  v_rooms int := 0;
  v_changed int := 0;
  v_board int := 0;
  v_unmatched text[] := '{}';
  v_res int := 0;
  v_status text;
  v_occ jsonb;
  v_flow text;
  v_req jsonb := '{}'::jsonb;
begin
  select t.hotel_id into v_hotel
    from private.hotelkey_live_tokens t
   where t.token_sha256 = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and t.revoked_at is null;
  if v_hotel is null then
    raise exception 'not allowed';
  end if;
  if coalesce(p ->> 'hotel', v_hotel) <> v_hotel then
    raise exception 'hotel mismatch';
  end if;
  v_status := coalesce(p ->> 'status', 'ok');
  if v_status not in ('ok', 'needs_login', 'error', 'partial') then
    v_status := 'error';
  end if;

  if jsonb_typeof(p -> 'rooms') = 'array' then
    if jsonb_array_length(p -> 'rooms') > 400 then
      raise exception 'too many rooms';
    end if;
    for v_r in select * from jsonb_array_elements(p -> 'rooms') loop
      continue when coalesce(v_r ->> 'room', '') !~ '^[A-Za-z0-9-]{1,10}$';
      v_rooms := v_rooms + 1;
      v_code := case
        when coalesce((v_r ->> 'ooo')::boolean, false) then 'OOO'
        when (v_r ->> 'occupied')::boolean is true then case when v_r ->> 'hk_state' = 'dirty' then 'OD' else 'OC' end
        when (v_r ->> 'occupied')::boolean is false then case when v_r ->> 'hk_state' = 'dirty' then 'VD' else 'VC' end
        else null
      end;
      select s.hhq_code into v_prev
        from public.hotelkey_live_room_status s
       where s.hotel_id = v_hotel
         and s.room_number = v_r ->> 'room';
      insert into public.hotelkey_live_room_status as s (
        hotel_id, room_number, room_type, occupied, hk_state, ooo, oos,
        arrival_today, departure_today, departed, hhq_code, raw_status, observed_at, changed_at
      ) values (
        v_hotel, v_r ->> 'room', left(v_r ->> 'room_type', 40), (v_r ->> 'occupied')::boolean, left(v_r ->> 'hk_state', 20),
        coalesce((v_r ->> 'ooo')::boolean, false), coalesce((v_r ->> 'oos')::boolean, false),
        (v_r ->> 'arrival_today')::boolean, (v_r ->> 'departure_today')::boolean, (v_r ->> 'departed')::boolean,
        v_code, left(v_r ->> 'raw', 200), v_now, v_now
      )
      on conflict (hotel_id, room_number) do update set
        room_type = excluded.room_type,
        occupied = excluded.occupied,
        hk_state = excluded.hk_state,
        ooo = excluded.ooo,
        oos = excluded.oos,
        arrival_today = excluded.arrival_today,
        departure_today = excluded.departure_today,
        departed = excluded.departed,
        hhq_code = excluded.hhq_code,
        raw_status = excluded.raw_status,
        observed_at = excluded.observed_at,
        changed_at = case when s.hhq_code is distinct from excluded.hhq_code then v_now else s.changed_at end;
      if v_code is not null and v_code is distinct from v_prev then
        v_changed := v_changed + 1;
        insert into public.hotelkey_live_room_events (hotel_id, room_number, from_code, to_code, departed, observed_at)
        values (v_hotel, v_r ->> 'room', v_prev, v_code, (v_r ->> 'departed')::boolean, v_now);
        -- Push to the HotelHQ board only when HotelKey's own status changes, so
        -- HotelHQ's in-progress / cleaned / inspected workflow is not overwritten every 5 minutes.
        v_flow := case v_code when 'OOO' then 'ooo' when 'VD' then 'dirty' when 'OD' then 'dirty' else 'ready' end;
        update public.rooms
           set hk_status = v_code, fo_status = v_code, status = v_flow, updated_at = v_now
         where hotel_id = v_hotel
           and department = 'housekeeping'
           and room_number = v_r ->> 'room';
        if found then
          v_board := v_board + 1;
        else
          v_unmatched := v_unmatched || (v_r ->> 'room');
        end if;
      end if;
    end loop;
  end if;

  v_occ := p -> 'occupancy';
  if jsonb_typeof(v_occ) = 'object' and coalesce(v_occ ->> 'business_date', '') ~ '^\d{4}-\d{2}-\d{2}$' then
    insert into public.hotelkey_live_occupancy as o (
      hotel_id, business_date, total_rooms, occupied, vacant, ooo, oos,
      arrivals_expected, arrivals_remaining, departures_expected, departures_remaining,
      in_house, occ_pct, adr, revenue, extra, observed_at
    ) values (
      v_hotel, (v_occ ->> 'business_date')::date, (v_occ ->> 'total_rooms')::int, (v_occ ->> 'occupied')::int,
      (v_occ ->> 'vacant')::int, (v_occ ->> 'ooo')::int, (v_occ ->> 'oos')::int,
      (v_occ ->> 'arrivals_expected')::int, (v_occ ->> 'arrivals_remaining')::int,
      (v_occ ->> 'departures_expected')::int, (v_occ ->> 'departures_remaining')::int,
      (v_occ ->> 'in_house')::int, (v_occ ->> 'occ_pct')::numeric, (v_occ ->> 'adr')::numeric,
      (v_occ ->> 'revenue')::numeric, v_occ -> 'extra', v_now
    )
    on conflict (hotel_id, business_date) do update set
      total_rooms = excluded.total_rooms,
      occupied = excluded.occupied,
      vacant = excluded.vacant,
      ooo = excluded.ooo,
      oos = excluded.oos,
      arrivals_expected = excluded.arrivals_expected,
      arrivals_remaining = excluded.arrivals_remaining,
      departures_expected = excluded.departures_expected,
      departures_remaining = excluded.departures_remaining,
      in_house = excluded.in_house,
      occ_pct = excluded.occ_pct,
      adr = excluded.adr,
      revenue = excluded.revenue,
      extra = excluded.extra,
      observed_at = excluded.observed_at;
  end if;

  if jsonb_typeof(p -> 'reservations') = 'array' then
    if jsonb_array_length(p -> 'reservations') > 1000 then
      raise exception 'too many reservations';
    end if;
    for v_r in select * from jsonb_array_elements(p -> 'reservations') loop
      continue when coalesce(v_r ->> 'confirmation', '') = ''
        or v_r ->> 'kind' not in ('booked', 'cancelled', 'modified', 'no_show')
        or coalesce(v_r ->> 'activity_date', '') !~ '^\d{4}-\d{2}-\d{2}$';
      insert into public.hotelkey_live_reservation_activity as a (
        hotel_id, confirmation, kind, activity_date, activity_at,
        arrival, departure, nights, rooms, room_type, rate_code, channel, status, same_day, observed_at
      ) values (
        v_hotel, left(v_r ->> 'confirmation', 40), v_r ->> 'kind', (v_r ->> 'activity_date')::date,
        (v_r ->> 'activity_at')::timestamptz, (v_r ->> 'arrival')::date, (v_r ->> 'departure')::date,
        (v_r ->> 'nights')::int, (v_r ->> 'rooms')::int, left(v_r ->> 'room_type', 40),
        left(v_r ->> 'rate_code', 40), left(v_r ->> 'channel', 60), left(v_r ->> 'status', 40),
        (v_r ->> 'same_day')::boolean, v_now
      )
      on conflict (hotel_id, confirmation, kind, activity_date) do update set
        activity_at = excluded.activity_at,
        arrival = excluded.arrival,
        departure = excluded.departure,
        nights = excluded.nights,
        rooms = excluded.rooms,
        room_type = excluded.room_type,
        rate_code = excluded.rate_code,
        channel = excluded.channel,
        status = excluded.status,
        same_day = excluded.same_day,
        observed_at = excluded.observed_at;
      v_res := v_res + 1;
    end loop;
  end if;

  v_req := private.hotelkey_live_save_requests(v_hotel, p, v_now);

  insert into public.hotelkey_live_heartbeat as h (
    hotel_id, last_run_at, last_success_at, status, error, counts, duration_ms, host, consecutive_failures
  ) values (
    v_hotel, v_now, case when v_status = 'ok' then v_now end, v_status, left(p ->> 'error', 500),
    jsonb_build_object(
      'rooms', v_rooms,
      'changed', v_changed,
      'board_updates', v_board,
      'unmatched', to_jsonb(v_unmatched),
      'reservations', v_res
    ) || coalesce(p -> 'counts', '{}'::jsonb) || v_req,
    (p ->> 'duration_ms')::int, left(p ->> 'host', 60), case when v_status = 'ok' then 0 else 1 end
  )
  on conflict (hotel_id) do update set
    last_run_at = excluded.last_run_at,
    last_success_at = coalesce(excluded.last_success_at, h.last_success_at),
    status = excluded.status,
    error = excluded.error,
    counts = excluded.counts,
    duration_ms = excluded.duration_ms,
    host = excluded.host,
    consecutive_failures = case when excluded.status = 'ok' then 0 else h.consecutive_failures + 1 end;

  return jsonb_build_object(
    'hotel', v_hotel,
    'rooms', v_rooms,
    'changed', v_changed,
    'board_updates', v_board,
    'unmatched', to_jsonb(v_unmatched),
    'reservations', v_res,
    'status', v_status
  ) || v_req;
end;
$$;

create or replace function public.hotelkey_live_ingest(p_token text, p jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select private.hotelkey_live_ingest(p_token, p);
$$;

revoke all on function private.hotelkey_live_ingest(text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.hotelkey_live_ingest(text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.hotelkey_live_ingest(text, jsonb) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant execute on function public.hotelkey_live_ingest(text, jsonb) to service_role;
  end if;
end $$;

create or replace function public.acknowledge_hotelkey_request(p_id bigint, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_hash text;
  v_active boolean;
  v_name text;
  v_note text;
  v_by uuid;
  v_at timestamptz;
  v_saved text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  select q.hotel, q.content_hash, q.active
    into v_hotel, v_hash, v_active
    from public.hotelkey_reservation_requests q
   where q.id = p_id;
  if v_hotel is null then
    raise exception 'not found';
  end if;
  if not (
    (select private.is_above())
    or (
      (select private.my_role())::text in ('front_desk', 'gm', 'agm')
      and v_hotel = any ((select private.my_hotels())::text[])
    )
  ) then
    raise exception 'not allowed';
  end if;
  if v_active is not true then
    raise exception 'inactive';
  end if;
  v_note := pg_catalog.left(pg_catalog.btrim(coalesce(p_note, '')), 500);
  select pg_catalog.left(coalesce(p.name, ''), 120)
    into v_name
    from public.profiles p
   where p.user_id = (select auth.uid())
   limit 1;
  insert into public.hotelkey_reservation_request_acks (
    request_id, hotel, content_hash, acknowledged_by, acknowledged_name, note
  ) values (
    p_id, v_hotel, v_hash, (select auth.uid()), coalesce(v_name, ''), v_note
  )
  on conflict (request_id, content_hash) do update
    set note = case
      when public.hotelkey_reservation_request_acks.note = '' and excluded.note <> '' then excluded.note
      else public.hotelkey_reservation_request_acks.note
    end
  returning acknowledged_by, acknowledged_name, acknowledged_at, note
    into v_by, v_name, v_at, v_saved;
  return pg_catalog.jsonb_build_object(
    'ok', true,
    'id', p_id,
    'hotel', v_hotel,
    'content_hash', v_hash,
    'acknowledged_by', v_by,
    'acknowledged_name', coalesce(v_name, ''),
    'acknowledged_at', v_at,
    'note', coalesce(v_saved, '')
  );
end;
$$;

comment on function public.acknowledge_hotelkey_request(bigint, text) is
  'Front desk, GM, AGM, and above-property acknowledge the current text of one active request line. A hash change needs a new call.';

revoke all on function public.acknowledge_hotelkey_request(bigint, text) from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_hotelkey_request(bigint, text) to authenticated;
