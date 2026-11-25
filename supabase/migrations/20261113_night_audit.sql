-- Night Audit daily check-in. Additive only. Not applied by this change.
-- Review and run it when you are ready. Demo mode does not call this database.
--
-- New tables only. No existing table, column, or row is dropped or deleted.
-- GM and AGM read and resolve their own hotel. Corporate reads and resolves every hotel.
-- Other roles see no rows. The mailbox body is not stored.
-- Parsed report rows live in night_audit_report_rows until Opera, OnQ, and Marriott
-- samples arrive. ingest_night_audit_report stores an awaiting_sample report when
-- the payload has no parsed items.
-- A "not an issue" resolution also records a suppression so a later ingest can
-- skip the same hotel, code, and confirmation.
-- Unresolved items stay open and show on the next morning's check-in.
-- The due time defaults to 10:00 America/Chicago and is stored per hotel.

create schema if not exists private;

grant usage on schema private to authenticated;

-- Applied 2026-11-12 without rewriting hotel_features_feature_check.
-- That rewrite would drop newer features (guest_comments, training,
-- inspections, and licenses) already allowed on this database.
-- night_audit is already in the check. private.set_hotel_feature is left
-- unchanged. Later migrations own the allowed-feature list.

do $$
begin
  insert into public.hotel_features (hotel, feature, enabled)
  values
    ('MSPWE', 'night_audit', true),
    ('MSPAM', 'night_audit', true),
    ('MSPMS', 'night_audit', true)
  on conflict (hotel, feature) do nothing;
exception
  when check_violation then
    -- The check does not list night_audit yet. Do not rewrite it.
    null;
end $$;

create table if not exists public.night_audit_settings (
  hotel text primary key check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  due_local time not null default time '10:00' check (due_local in (time '07:00', time '08:00', time '09:00', time '10:00', time '11:00')),
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.night_audit_settings is
  'Local due time for the morning check-in. The zone is America/Chicago. Default 10:00.';

create table if not exists public.night_audit_reports (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  subject text not null default '' check (char_length(subject) <= 200),
  status text not null check (status in ('received', 'parsed', 'awaiting_sample', 'failed')),
  received_at timestamptz not null default pg_catalog.now()
);

comment on table public.night_audit_reports is
  'One PMS night-audit email accepted by the ingest stub. The mailbox body is not stored.';

create table if not exists public.night_audit_report_rows (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.night_audit_reports (id),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  row_no integer not null check (row_no > 0),
  section text not null default '' check (char_length(section) <= 40),
  cells jsonb not null default '{}'::jsonb,
  raw_line text not null default '' check (char_length(raw_line) <= 400),
  unique (report_id, row_no)
);

comment on table public.night_audit_report_rows is
  'Parsed cells from a night-audit report. One short value per cell. Real PMS parsers come later.';

create table if not exists public.night_audit_items (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  category text not null check (category in ('missed', 'balances', 'rates', 'adjustments', 'cash', 'rooms', 'taxes', 'ar')),
  code text not null check (code ~ '^[a-z][a-z0-9_]{0,40}$'),
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 80),
  confirmation text not null check (char_length(btrim(confirmation)) between 1 and 20),
  why_en text not null check (char_length(why_en) between 1 and 160),
  why_es text not null check (char_length(why_es) between 1 and 160),
  fix_en text not null check (char_length(fix_en) between 1 and 200),
  fix_es text not null check (char_length(fix_es) between 1 and 200),
  amount numeric(12, 2) not null check (amount >= 0 and amount < 1000000),
  room text not null default '' check (char_length(room) <= 8),
  fingerprint text not null check (char_length(fingerprint) between 1 and 120),
  report_id uuid references public.night_audit_reports (id),
  created_at timestamptz not null default pg_catalog.now(),
  unique (hotel, audit_date, code, confirmation)
);

comment on table public.night_audit_items is
  'One night-audit exception. It stays open until a resolution row clears it, then it does not carry forward.';

create index if not exists night_audit_items_hotel_date_idx
  on public.night_audit_items (hotel, audit_date desc);

create index if not exists night_audit_items_match_idx
  on public.night_audit_items (hotel, code, confirmation);

create table if not exists public.night_audit_resolutions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null unique references public.night_audit_items (id),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  checkin_date date not null,
  action text not null check (action in ('done', 'not_issue', 'explain')),
  note text not null default '' check (char_length(note) <= 240),
  resolved_by uuid default auth.uid(),
  resolved_name text not null default '' check (char_length(resolved_name) <= 80),
  resolved_at timestamptz not null default pg_catalog.now(),
  check (
    (action = 'explain' and char_length(btrim(note)) >= 3)
    or (action in ('done', 'not_issue'))
  )
);

comment on table public.night_audit_resolutions is
  'One clearing action per item: done, not an issue, or explain. Explain requires a note.';

create index if not exists night_audit_resolutions_hotel_date_idx
  on public.night_audit_resolutions (hotel, checkin_date desc);

create table if not exists public.night_audit_suppressions (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  code text not null check (code ~ '^[a-z][a-z0-9_]{0,40}$'),
  confirmation text not null default '' check (char_length(confirmation) <= 20),
  fingerprint text not null check (char_length(fingerprint) between 1 and 120),
  note text not null default '' check (char_length(note) <= 240),
  source_item_id uuid references public.night_audit_items (id),
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.night_audit_suppressions is
  'Recorded when a leader marks Not an issue, so a later ingest can skip the same confirmation and code.';

create index if not exists night_audit_suppress_idx
  on public.night_audit_suppressions (hotel, code, confirmation)
  where active;

create table if not exists public.night_audit_checkins (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  checkin_date date not null,
  due_local time not null default time '10:00',
  completed_at timestamptz,
  completed_by uuid,
  completed_name text not null default '' check (char_length(completed_name) <= 80),
  open_count integer not null default 0 check (open_count >= 0),
  resolved_count integer not null default 0 check (resolved_count >= 0),
  amount_open numeric(12, 2) not null default 0 check (amount_open >= 0),
  primary key (hotel, checkin_date)
);

comment on table public.night_audit_checkins is
  'One morning check-in per hotel. completed_at is set when every open item for that morning is resolved.';

alter table public.night_audit_settings enable row level security;
alter table public.night_audit_reports enable row level security;
alter table public.night_audit_report_rows enable row level security;
alter table public.night_audit_items enable row level security;
alter table public.night_audit_resolutions enable row level security;
alter table public.night_audit_suppressions enable row level security;
alter table public.night_audit_checkins enable row level security;

-- GM and AGM read their hotel. Corporate reads every hotel. Everyone else sees nothing.
drop policy if exists night_audit_settings_select on public.night_audit_settings;
create policy night_audit_settings_select on public.night_audit_settings
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists night_audit_reports_select on public.night_audit_reports;
create policy night_audit_reports_select on public.night_audit_reports
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists night_audit_report_rows_select on public.night_audit_report_rows;
create policy night_audit_report_rows_select on public.night_audit_report_rows
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists night_audit_items_select on public.night_audit_items;
create policy night_audit_items_select on public.night_audit_items
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists night_audit_resolutions_select on public.night_audit_resolutions;
create policy night_audit_resolutions_select on public.night_audit_resolutions
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists night_audit_suppressions_select on public.night_audit_suppressions;
create policy night_audit_suppressions_select on public.night_audit_suppressions
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists night_audit_checkins_select on public.night_audit_checkins;
create policy night_audit_checkins_select on public.night_audit_checkins
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

create or replace function private.night_audit_allowed(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or (
      private.my_role() in ('gm', 'agm')
      and p_hotel = any ((select private.my_hotels())::text[])
    ),
    false
  );
$$;

create or replace function private.night_audit_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (pg_catalog.timezone('America/Chicago', pg_catalog.now()))::date;
$$;

create or replace function private.resolve_night_audit_item(
  p_item uuid,
  p_action text,
  p_note text,
  p_checkin date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_audit date;
  v_code text;
  v_confirmation text;
  v_fp text;
  v_today date;
  v_open integer;
  v_resolved integer;
  v_amount numeric;
  v_name text;
  v_due time;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  if p_action not in ('done', 'not_issue', 'explain') then
    raise exception 'unknown action';
  end if;
  p_note := pg_catalog.btrim(coalesce(p_note, ''));
  if p_action = 'explain' and pg_catalog.char_length(p_note) < 3 then
    raise exception 'note required';
  end if;
  if pg_catalog.char_length(p_note) > 240 then
    raise exception 'note too long';
  end if;
  select hotel, audit_date, code, confirmation, fingerprint
    into v_hotel, v_audit, v_code, v_confirmation, v_fp
  from public.night_audit_items
  where id = p_item;
  if v_hotel is null or not private.night_audit_allowed(v_hotel) then
    raise exception 'not allowed';
  end if;
  v_today := private.night_audit_today();
  if p_checkin is null then
    p_checkin := v_today;
  end if;
  if p_checkin <> v_today or v_audit >= p_checkin then
    raise exception 'not today';
  end if;
  if exists (select 1 from public.night_audit_resolutions r where r.item_id = p_item) then
    raise exception 'already resolved';
  end if;
  select coalesce(p.name, '') into v_name
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
  insert into public.night_audit_resolutions (
    item_id, hotel, checkin_date, action, note, resolved_by, resolved_name
  ) values (
    p_item, v_hotel, p_checkin, p_action, p_note, (select auth.uid()), coalesce(v_name, '')
  );
  if p_action = 'not_issue' then
    insert into public.night_audit_suppressions (
      hotel, code, confirmation, fingerprint, note, source_item_id, created_by
    )
    select v_hotel, v_code, v_confirmation, v_fp, p_note, p_item, (select auth.uid())
    where not exists (
      select 1 from public.night_audit_suppressions s
      where s.hotel = v_hotel and s.code = v_code and s.confirmation = v_confirmation and s.active
    );
  end if;
  select
    count(*) filter (where r.id is null),
    count(*) filter (where r.checkin_date = p_checkin),
    coalesce(sum(i.amount) filter (where r.id is null), 0)
  into v_open, v_resolved, v_amount
  from public.night_audit_items i
  left join public.night_audit_resolutions r on r.item_id = i.id
  where i.hotel = v_hotel and i.audit_date < p_checkin;
  if v_open = 0 then
    select due_local into v_due from public.night_audit_settings where hotel = v_hotel;
    insert into public.night_audit_checkins (
      hotel, checkin_date, due_local, completed_at, completed_by, completed_name,
      open_count, resolved_count, amount_open
    ) values (
      v_hotel, p_checkin, coalesce(v_due, time '10:00'), pg_catalog.now(), (select auth.uid()), coalesce(v_name, ''),
      0, v_resolved, 0
    )
    on conflict (hotel, checkin_date) do update
      set completed_at = excluded.completed_at,
          completed_by = excluded.completed_by,
          completed_name = excluded.completed_name,
          open_count = 0,
          resolved_count = excluded.resolved_count,
          amount_open = 0
      where public.night_audit_checkins.completed_at is null;
  end if;
end;
$$;

create or replace function private.complete_night_audit_checkin(
  p_hotel text,
  p_checkin date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_open integer;
  v_name text;
  v_due time;
begin
  if (select auth.uid()) is null or not private.night_audit_allowed(p_hotel) then
    raise exception 'not allowed';
  end if;
  v_today := private.night_audit_today();
  if p_checkin is null then
    p_checkin := v_today;
  end if;
  if p_checkin <> v_today then
    raise exception 'not today';
  end if;
  select count(*) into v_open
  from public.night_audit_items i
  where i.hotel = p_hotel
    and i.audit_date < p_checkin
    and not exists (select 1 from public.night_audit_resolutions r where r.item_id = i.id);
  if v_open > 0 then
    raise exception 'items still open';
  end if;
  select coalesce(p.name, '') into v_name
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
  select due_local into v_due from public.night_audit_settings where hotel = p_hotel;
  insert into public.night_audit_checkins (
    hotel, checkin_date, due_local, completed_at, completed_by, completed_name, open_count, resolved_count, amount_open
  ) values (
    p_hotel, p_checkin, coalesce(v_due, time '10:00'), pg_catalog.now(), (select auth.uid()), coalesce(v_name, ''), 0, 0, 0
  )
  on conflict (hotel, checkin_date) do update
    set completed_at = coalesce(public.night_audit_checkins.completed_at, excluded.completed_at),
        completed_by = coalesce(public.night_audit_checkins.completed_by, excluded.completed_by),
        completed_name = case
          when public.night_audit_checkins.completed_name = '' then excluded.completed_name
          else public.night_audit_checkins.completed_name
        end;
end;
$$;

create or replace function private.set_night_audit_due(
  p_hotel text,
  p_due time
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.night_audit_allowed(p_hotel) then
    raise exception 'not allowed';
  end if;
  if p_due not in (time '07:00', time '08:00', time '09:00', time '10:00', time '11:00') then
    raise exception 'unknown due time';
  end if;
  insert into public.night_audit_settings (hotel, due_local, updated_by, updated_at)
  values (p_hotel, p_due, (select auth.uid()), pg_catalog.now())
  on conflict (hotel) do update
    set due_local = excluded.due_local,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

-- Stores a report envelope and any parsed rows or items the caller already extracted.
-- Opera, OnQ, and Marriott bodies with no items are stored as awaiting_sample.
create or replace function private.ingest_night_audit_report(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_date date;
  v_source text;
  v_subject text;
  v_id uuid;
  v_status text;
  v_items jsonb;
  v_rows jsonb;
  v_item jsonb;
  v_row jsonb;
  v_i integer;
begin
  if not (
    coalesce((select auth.jwt() ->> 'role') = 'service_role', false)
    or ((select auth.uid()) is not null and private.night_audit_allowed(p->>'hotel'))
  ) then
    raise exception 'not allowed';
  end if;
  v_hotel := p->>'hotel';
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if coalesce(p->>'audit_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'audit_date';
  end if;
  v_date := (p->>'audit_date')::date;
  v_source := coalesce(p->>'source', 'unknown');
  if v_source !~ '^[a-z][a-z0-9_]{0,20}$' then
    raise exception 'unknown source';
  end if;
  v_subject := pg_catalog.left(coalesce(p->>'subject', ''), 200);
  v_items := case when jsonb_typeof(p->'items') = 'array' then p->'items' else '[]'::jsonb end;
  v_rows := case when jsonb_typeof(p->'rows') = 'array' then p->'rows' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_items) > 200 or pg_catalog.jsonb_array_length(v_rows) > 500 then
    raise exception 'too many rows';
  end if;
  v_status := case when pg_catalog.jsonb_array_length(v_items) > 0 then 'parsed' else 'awaiting_sample' end;
  insert into public.night_audit_reports (hotel, audit_date, source, subject, status)
  values (v_hotel, v_date, v_source, v_subject, v_status)
  returning id into v_id;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    insert into public.night_audit_report_rows (report_id, hotel, audit_date, row_no, section, cells, raw_line)
    values (
      v_id, v_hotel, v_date, v_i + 1,
      pg_catalog.left(coalesce(v_row->>'section', ''), 40),
      coalesce(v_row->'cells', '{}'::jsonb),
      pg_catalog.left(coalesce(v_row->>'raw_line', ''), 400)
    );
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> v_i;
    if exists (
      select 1 from public.night_audit_suppressions s
      where s.active and s.hotel = v_hotel and s.code = v_item->>'code' and s.confirmation = v_item->>'confirmation'
    ) then
      continue;
    end if;
    insert into public.night_audit_items (
      hotel, audit_date, category, code, guest_name, confirmation,
      why_en, why_es, fix_en, fix_es, amount, room, fingerprint, report_id
    ) values (
      v_hotel, v_date,
      v_item->>'category', v_item->>'code', v_item->>'guest_name', v_item->>'confirmation',
      v_item->>'why_en', v_item->>'why_es', v_item->>'fix_en', v_item->>'fix_es',
      (v_item->>'amount')::numeric, coalesce(v_item->>'room', ''),
      coalesce(v_item->>'fingerprint', v_hotel || '|' || (v_item->>'code') || '|' || (v_item->>'confirmation')),
      v_id
    )
    on conflict (hotel, audit_date, code, confirmation) do nothing;
  end loop;
  return v_id;
end;
$$;

create or replace function public.resolve_night_audit_item(p_item uuid, p_action text, p_note text, p_checkin date)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.resolve_night_audit_item(p_item, p_action, p_note, p_checkin);
$$;

create or replace function public.complete_night_audit_checkin(p_hotel text, p_checkin date)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_night_audit_checkin(p_hotel, p_checkin);
$$;

create or replace function public.set_night_audit_due(p_hotel text, p_due time)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_night_audit_due(p_hotel, p_due);
$$;

create or replace function public.ingest_night_audit_report(p jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_night_audit_report(p);
$$;

revoke all on function private.night_audit_allowed(text) from public, anon;
revoke all on function private.night_audit_today() from public, anon;
revoke all on function private.resolve_night_audit_item(uuid, text, text, date) from public, anon;
revoke all on function private.complete_night_audit_checkin(text, date) from public, anon;
revoke all on function private.set_night_audit_due(text, time) from public, anon;
revoke all on function private.ingest_night_audit_report(jsonb) from public, anon;
revoke all on function public.resolve_night_audit_item(uuid, text, text, date) from public, anon;
revoke all on function public.complete_night_audit_checkin(text, date) from public, anon;
revoke all on function public.set_night_audit_due(text, time) from public, anon;
revoke all on function public.ingest_night_audit_report(jsonb) from public, anon;

grant execute on function private.night_audit_allowed(text) to authenticated;
grant execute on function private.night_audit_today() to authenticated;
grant execute on function private.resolve_night_audit_item(uuid, text, text, date) to authenticated;
grant execute on function private.complete_night_audit_checkin(text, date) to authenticated;
grant execute on function private.set_night_audit_due(text, time) to authenticated;
grant execute on function private.ingest_night_audit_report(jsonb) to authenticated;
grant execute on function public.resolve_night_audit_item(uuid, text, text, date) to authenticated;
grant execute on function public.complete_night_audit_checkin(text, date) to authenticated;
grant execute on function public.set_night_audit_due(text, time) to authenticated;
grant execute on function public.ingest_night_audit_report(jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant execute on function public.ingest_night_audit_report(jsonb) to service_role;
    grant execute on function private.ingest_night_audit_report(jsonb) to service_role;
  end if;
end $$;

revoke all on table public.night_audit_settings from public, anon, authenticated;
revoke all on table public.night_audit_reports from public, anon, authenticated;
revoke all on table public.night_audit_report_rows from public, anon, authenticated;
revoke all on table public.night_audit_items from public, anon, authenticated;
revoke all on table public.night_audit_resolutions from public, anon, authenticated;
revoke all on table public.night_audit_suppressions from public, anon, authenticated;
revoke all on table public.night_audit_checkins from public, anon, authenticated;

grant select on table public.night_audit_settings to authenticated;
grant select on table public.night_audit_reports to authenticated;
grant select on table public.night_audit_report_rows to authenticated;
grant select on table public.night_audit_items to authenticated;
grant select on table public.night_audit_resolutions to authenticated;
grant select on table public.night_audit_suppressions to authenticated;
grant select on table public.night_audit_checkins to authenticated;
