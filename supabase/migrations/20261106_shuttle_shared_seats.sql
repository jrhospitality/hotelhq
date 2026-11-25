-- Shared airport van. Hampton (MSPAM) and SpringHill (MSPMS) draw from one queue.
-- One departure has one seat count. Party sizes from both hotels add up to that count.
-- Defaults: a slot every 30 minutes, 11 seats, open all day (00:00 through the end of the day).
-- A GM can still change the interval, the seats, and the hours. Those fields stay copied
-- onto both hotel rows because they describe the same van.
-- This only changes defaults and the book function. Existing tables, columns, and rows stay.
-- Rows that still have the old seed (14 seats, 05:00-23:00) move to the new defaults.
-- A hotel that already changed those numbers is left alone.

alter table public.shuttle_settings alter column seat_capacity set default 11;
alter table public.shuttle_settings alter column open_minute set default 0;
alter table public.shuttle_settings alter column close_minute set default 1440;

update public.shuttle_settings
set seat_capacity = 11,
    open_minute = 0,
    close_minute = 1440
where slot_minutes = 30
  and seat_capacity = 14
  and open_minute = 300
  and close_minute = 1380;

comment on column public.shuttle_settings.seat_capacity is
  'Seats on the shared van for one departure. Sign-ups at MSPAM and MSPMS count against the same number.';

create or replace function private.shuttle_book(
  p_hotel text,
  p_destination text,
  p_destination_note text,
  p_depart timestamptz,
  p_guest_label text,
  p_label_kind text,
  p_party integer,
  p_bags integer,
  p_notes text,
  p_flight text,
  p_parking_visit bigint
) returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg public.shuttle_settings;
  v_local timestamp;
  v_min integer;
  v_used integer;
  v_note text;
  v_label text;
  v_flight text;
  v_notes text;
  v_id bigint;
begin
  if not private.shuttle_can_book() then
    raise exception 'role';
  end if;
  if not private.shuttle_hotel_ok(p_hotel) then
    raise exception 'hotel';
  end if;
  if p_destination not in ('t1', 't2', 'moa', 'other') then
    raise exception 'destination';
  end if;
  v_note := nullif(btrim(coalesce(p_destination_note, '')), '');
  if p_destination = 'other' then
    if v_note is null or char_length(v_note) > 80 then
      raise exception 'destination';
    end if;
  else
    v_note := null;
  end if;
  -- Room number only. Guest names are not stored.
  if coalesce(p_label_kind, 'room') <> 'room' then
    raise exception 'room';
  end if;
  v_label := btrim(coalesce(p_guest_label, ''));
  if v_label ~ '[0-9]{7,}' then
    raise exception 'phone';
  end if;
  if v_label !~ '^[0-9]{2,4}$' then
    raise exception 'room';
  end if;
  if p_party is null or p_party < 1 or p_party > 30 then
    raise exception 'party';
  end if;
  if p_bags is null or p_bags < 0 or p_bags > 20 then
    raise exception 'bags';
  end if;
  v_flight := nullif(btrim(coalesce(p_flight, '')), '');
  if v_flight is not null and v_flight !~ '^[0-2][0-9]:[0-5][0-9]$' then
    raise exception 'flight';
  end if;
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 200 then
    raise exception 'notes';
  end if;
  if p_depart is null then
    raise exception 'slot';
  end if;
  v_cfg := private.shuttle_settings_row();
  if v_cfg is null or v_cfg.hotel is null then
    raise exception 'slot';
  end if;
  v_local := p_depart at time zone 'America/Chicago';
  if date_trunc('minute', v_local) <> v_local then
    raise exception 'slot';
  end if;
  v_min := (extract(hour from v_local))::integer * 60 + (extract(minute from v_local))::integer;
  if v_min < v_cfg.open_minute or v_min > v_cfg.close_minute or ((v_min - v_cfg.open_minute) % v_cfg.slot_minutes) <> 0 then
    raise exception 'slot';
  end if;
  if p_parking_visit is not null then
    if not exists (
      select 1 from public.parking_visits v
      where v.id = p_parking_visit
        and v.hotel = p_hotel
        and v.vehicle_type = 'park_fly'
        and v.checked_out_at is null
    ) then
      raise exception 'parking';
    end if;
    if exists (
      select 1 from public.shuttle_signups s
      where s.parking_visit_id = p_parking_visit
        and s.status in ('booked', 'boarded')
    ) then
      raise exception 'already';
    end if;
  end if;
  -- One lock per departure so two desks cannot both pass the seat check.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('shuttle-depart'),
    pg_catalog.hashtext(p_depart::text)
  );
  select coalesce(sum(s.party_size), 0) into v_used
  from public.shuttle_signups s
  where s.depart_at = p_depart
    and s.status <> 'no_show'
    and s.hotel = any (private.shuttle_pool());
  if v_used + p_party > v_cfg.seat_capacity then
    raise exception 'full';
  end if;
  insert into public.shuttle_signups (
    hotel, hotel_id, destination, destination_note, depart_at, run_at,
    guest_label, guest_name, room_number, label_kind, direction,
    party_size, bags, notes, flight_time, status, parking_visit_id, created_by
  ) values (
    p_hotel, p_hotel, p_destination, v_note, p_depart, p_depart,
    v_label,
    null,
    v_label,
    'room',
    'outbound',
    p_party, p_bags, v_notes, v_flight, 'booked', p_parking_visit, auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.shuttle_book(text, text, text, timestamptz, text, text, integer, integer, text, text, bigint) from public, anon;
grant execute on function private.shuttle_book(text, text, text, timestamptz, text, text, integer, integer, text, text, bigint) to authenticated;
