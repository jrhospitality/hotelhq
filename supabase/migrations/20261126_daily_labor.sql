-- Daily labor snapshot for the GM and AGM. Additive only.
-- Does not drop, delete, or rewrite labor_plans, time_punches, labor_issues,
-- schedule_shifts, labor_standards, or daily_occupancy.
-- Fact rows are insert-only. A second morning load for the same hotel and
-- date leaves the first snapshot in place.
-- Checkoff and end-of-day overdue are the only updates, and they stay in
-- HotelHQ. Nothing here is written back to Hotel Effectiveness.
-- Employee codes, clock IDs, badges, and PINs are refused and not stored.
--
-- MSPWE (Holiday Inn Express Golden Valley, HE property 118172) is enabled.
-- MSPMS (SpringHill) and MSPAM (Hampton) are present and disabled until their
-- property ids are saved on labor_daily_hotels.
-- Rooms sold come from daily_occupancy where source = 'actual' (night audit).
-- The daily view omits Maintenance and Prop Ops.
-- Do not load example names into the live project. Demo mode stays in the app.
-- This file is not applied by the pull request.

create table if not exists public.labor_daily_hotels (
  hotel_id text primary key references public.hotels (id),
  he_property_id text,
  enabled boolean not null default false,
  added_at timestamptz not null default pg_catalog.now(),
  constraint labor_daily_hotels_property_chk check (
    he_property_id is null or he_property_id ~ '^[0-9]{3,12}$'
  )
);

comment on table public.labor_daily_hotels is
  'Which hotels are on the daily labor page. he_property_id is the Hotel Effectiveness property id, never an employee code or PIN.';
comment on column public.labor_daily_hotels.he_property_id is
  'MSPWE is 118172. SpringHill and Hampton stay null until those properties are added.';

insert into public.labor_daily_hotels (hotel_id, he_property_id, enabled)
values
  ('MSPWE', '118172', true),
  ('MSPAM', null, false),
  ('MSPMS', null, false)
on conflict (hotel_id) do nothing;

create unique index if not exists labor_daily_hotels_property_uq
  on public.labor_daily_hotels (he_property_id)
  where he_property_id is not null;

create table if not exists public.labor_daily_days (
  id bigint generated always as identity unique,
  hotel_id text not null references public.hotels (id),
  work_date date not null,
  due_on date not null,
  rooms_sold integer,
  rooms_sold_source text,
  actual_hours numeric(8, 2),
  plan_hours numeric(8, 2),
  scheduled_hours numeric(8, 2),
  source text not null default 'he',
  housekeeping_loaded boolean not null default false,
  loaded_at timestamptz not null default pg_catalog.now(),
  primary key (hotel_id, work_date),
  constraint labor_daily_days_source_chk check (source = 'he'),
  constraint labor_daily_days_rooms_chk check (rooms_sold is null or (rooms_sold >= 0 and rooms_sold <= 5000)),
  constraint labor_daily_days_hours_chk check (
    (actual_hours is null or (actual_hours >= 0 and actual_hours < 1000))
    and (plan_hours is null or (plan_hours >= 0 and plan_hours < 1000))
    and (scheduled_hours is null or (scheduled_hours >= 0 and scheduled_hours < 1000))
  ),
  constraint labor_daily_days_rooms_source_chk check (
    rooms_sold_source is null or rooms_sold_source in ('daily_occupancy', 'payload')
  )
);

comment on table public.labor_daily_days is
  'One Hotel Effectiveness morning snapshot. Hours exclude Maintenance and Prop Ops. Insert only; a repeat load does not replace the row.';
comment on column public.labor_daily_days.rooms_sold is
  'Night-audit occupied rooms from daily_occupancy source actual, copied at load time.';
comment on column public.labor_daily_days.due_on is
  'Chicago date the GM or AGM should finish the checklist. The morning file is for the previous work date, so this is work_date + 1.';

create table if not exists public.labor_daily_positions (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  work_date date not null,
  line_no integer not null check (line_no > 0 and line_no <= 40),
  position_label text not null check (char_length(position_label) between 1 and 80),
  actual_hours numeric(8, 2),
  plan_hours numeric(8, 2),
  scheduled_hours numeric(8, 2),
  include_in_daily boolean not null default true,
  unique (hotel_id, work_date, line_no),
  foreign key (hotel_id, work_date) references public.labor_daily_days (hotel_id, work_date),
  constraint labor_daily_positions_hours_chk check (
    (actual_hours is null or (actual_hours >= 0 and actual_hours < 1000))
    and (plan_hours is null or (plan_hours >= 0 and plan_hours < 1000))
    and (scheduled_hours is null or (scheduled_hours >= 0 and scheduled_hours < 1000))
  )
);

comment on table public.labor_daily_positions is
  'Actual, plan, and scheduled hours by position. include_in_daily is false for Maintenance and Prop Ops.';

create table if not exists public.labor_daily_housekeeping (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  work_date date not null,
  line_no integer not null check (line_no > 0 and line_no <= 80),
  display_name text not null check (char_length(display_name) <= 80),
  position_label text not null check (char_length(position_label) <= 80),
  hours numeric(6, 2),
  cleans integer,
  mpr_actual numeric(6, 1),
  mpr_target numeric(6, 1),
  is_supervisor boolean not null default false,
  unique (hotel_id, work_date, line_no),
  foreign key (hotel_id, work_date) references public.labor_daily_days (hotel_id, work_date),
  constraint labor_daily_housekeeping_hours_chk check (hours is null or (hours >= 0 and hours <= 36)),
  constraint labor_daily_housekeeping_cleans_chk check (cleans is null or (cleans >= 0 and cleans <= 200)),
  constraint labor_daily_housekeeping_mpr_chk check (
    (mpr_actual is null or (mpr_actual >= 0 and mpr_actual <= 300))
    and (mpr_target is null or (mpr_target >= 0 and mpr_target <= 300))
  )
);

comment on table public.labor_daily_housekeeping is
  'Housekeeping associate lines: hours, cleans, and minutes per room. Display name only. No employee code or PIN.';

create table if not exists public.labor_daily_overplan (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  work_date date not null,
  line_no integer not null check (line_no > 0 and line_no <= 120),
  display_name text not null check (char_length(display_name) <= 80),
  position_label text not null check (char_length(position_label) <= 80),
  actual_hours numeric(6, 2),
  plan_hours numeric(8, 2),
  scheduled_hours numeric(8, 2),
  variance_hours numeric(8, 2),
  plan_scope text not null,
  scheduled_scope text not null,
  unique (hotel_id, work_date, line_no),
  foreign key (hotel_id, work_date) references public.labor_daily_days (hotel_id, work_date),
  constraint labor_daily_overplan_scope_chk check (
    plan_scope in ('associate', 'position') and scheduled_scope in ('associate', 'position')
  ),
  constraint labor_daily_overplan_hours_chk check (
    (actual_hours is null or (actual_hours >= 0 and actual_hours <= 36))
    and (plan_hours is null or (plan_hours >= 0 and plan_hours < 1000))
    and (scheduled_hours is null or (scheduled_hours >= 0 and scheduled_hours < 1000))
  )
);

comment on table public.labor_daily_overplan is
  'Associates to review because they are over a personal plan, or because their position is over plan. plan_scope position means the plan figure is the position total.';

create table if not exists public.labor_daily_actions (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  work_date date not null,
  item_no integer not null check (item_no > 0 and item_no <= 200),
  kind text not null,
  who_name text not null check (char_length(who_name) between 1 and 80),
  what_en text not null check (char_length(what_en) between 1 and 400),
  what_es text not null check (char_length(what_es) between 1 and 400),
  due_on date not null,
  status text not null default 'open',
  checked_by uuid,
  checked_at timestamptz,
  check_note text,
  escalated_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  unique (hotel_id, work_date, item_no),
  foreign key (hotel_id, work_date) references public.labor_daily_days (hotel_id, work_date),
  constraint labor_daily_actions_kind_chk check (kind in (
    'missing_punch', 'unknown_position', 'hours_zero_cleans', 'cleans_zero_hours',
    'zero_cleans_vs_sold', 'five_minute_checkin', 'trim_overplan'
  )),
  constraint labor_daily_actions_status_chk check (status in ('open', 'done', 'overdue')),
  constraint labor_daily_actions_note_chk check (check_note is null or char_length(check_note) <= 240)
);

comment on table public.labor_daily_actions is
  'Numbered who / what / by-when items. Checkoff records who and when plus an optional note. Overdue at the end of the Chicago due date. Never sent back to Hotel Effectiveness.';

create index if not exists labor_daily_actions_open_idx
  on public.labor_daily_actions (hotel_id, due_on)
  where status in ('open', 'overdue');

create or replace function private.labor_reject_secrets(p jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $secrets$
declare
  k text;
  child jsonb;
begin
  if p is null then
    return;
  end if;
  if pg_catalog.jsonb_typeof(p) = 'array' then
    for child in select value from pg_catalog.jsonb_array_elements(p) loop
      perform private.labor_reject_secrets(child);
    end loop;
    return;
  end if;
  if pg_catalog.jsonb_typeof(p) <> 'object' then
    return;
  end if;
  for k in select pg_catalog.jsonb_object_keys(p) loop
    if pg_catalog.lower(k) ~ '^(pin|password|passwd|ssn|employee_code|employee_id|emp_code|emp_id|he_code|he_employee_id|he_id|badge|clock_id|punch_code|job_code|associate_code|staff_code)$' then
      raise exception 'refusing employee code or PIN';
    end if;
    perform private.labor_reject_secrets(p -> k);
  end loop;
end;
$secrets$;

create or replace function private.labor_name(p text)
returns text
language plpgsql
immutable
set search_path = ''
as $name$
declare
  s text;
begin
  s := pg_catalog.regexp_replace(coalesce(p, ''), '[[:cntrl:]<>]', ' ', 'g');
  s := pg_catalog.btrim(pg_catalog.regexp_replace(s, '\s+', ' ', 'g'));
  if s ~ '^[0-9]{3,}$' then
    return '';
  end if;
  return pg_catalog.left(s, 80);
end;
$name$;

create or replace function private.labor_excluded(p text)
returns boolean
language sql
immutable
set search_path = ''
as $excluded$
  select coalesce(p, '') ~* 'maintenance|prop[[:space:]]*ops|property[[:space:]]*ops|property operations|(^|[^[:alpha:]])maint([^[:alpha:]]|$)|(^|[^[:alpha:]])engineer([^[:alpha:]]|$)';
$excluded$;

create or replace function private.labor_supervisor(p text)
returns boolean
language sql
immutable
set search_path = ''
as $supervisor$
  select coalesce(p, '') ~* 'supervisor|executive housekeeper|(^|[^[:alpha:]])supv([^[:alpha:]]|$)';
$supervisor$;

create or replace function private.labor_unknown_position(p text)
returns boolean
language sql
immutable
set search_path = ''
as $unknown$
  select pg_catalog.btrim(coalesce(p, '')) = ''
    or pg_catalog.btrim(p) ~* '^(unknown|unassigned|n/a|na|none|-+|\?+)$';
$unknown$;

revoke all on function private.labor_reject_secrets(jsonb) from public, anon, authenticated;
revoke all on function private.labor_name(text) from public, anon, authenticated;
revoke all on function private.labor_excluded(text) from public, anon, authenticated;
revoke all on function private.labor_supervisor(text) from public, anon, authenticated;
revoke all on function private.labor_unknown_position(text) from public, anon, authenticated;

create or replace function private.ingest_daily_labor(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $ingest$
declare
  v_hotel text;
  v_date date;
  v_due date;
  v_id bigint;
  v_enabled boolean;
  v_property text;
  v_rooms integer;
  v_rooms_source text;
  v_co numeric;
  v_so numeric;
  v_per numeric;
  v_rows jsonb;
  v_row jsonb;
  v_i integer;
  v_label text;
  v_name text;
  v_actual numeric;
  v_plan numeric;
  v_sched numeric;
  v_sum_actual numeric := 0;
  v_sum_plan numeric := 0;
  v_sum_sched numeric := 0;
  v_any boolean := false;
  v_positions jsonb := '[]'::jsonb;
  v_house jsonb := '[]'::jsonb;
  v_over jsonb := '[]'::jsonb;
  v_items jsonb := '[]'::jsonb;
  v_seen jsonb := '{}'::jsonb;
  v_parent jsonb;
  v_hours numeric;
  v_cleans integer;
  v_checkouts integer;
  v_stays integer;
  v_mpr_actual numeric;
  v_mpr_target numeric;
  v_clean_total integer := 0;
  v_hk_loaded boolean;
  v_scope text;
  v_sched_scope text;
  v_missing text;
  v_who text;
  v_en text;
  v_es text;
  v_line integer;
begin
  if not coalesce((select auth.jwt() ->> 'role') = 'service_role', false) then
    raise exception 'not allowed';
  end if;
  if p is null or pg_catalog.jsonb_typeof(p) <> 'object' or pg_catalog.pg_column_size(p) > 200000 then
    raise exception 'body';
  end if;
  perform private.labor_reject_secrets(p);
  v_hotel := p->>'hotel';
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if coalesce(p->>'work_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'work_date';
  end if;
  v_date := (p->>'work_date')::date;
  v_due := v_date + 1;
  select h.enabled, h.he_property_id into v_enabled, v_property
  from public.labor_daily_hotels h
  where h.hotel_id = v_hotel;
  if not coalesce(v_enabled, false) then
    raise exception 'hotel not enabled';
  end if;
  if v_property is not null and coalesce(p->>'he_property_id', '') <> '' and (p->>'he_property_id') is distinct from v_property then
    raise exception 'property id';
  end if;
  if exists (select 1 from public.labor_daily_days d where d.hotel_id = v_hotel and d.work_date = v_date) then
    return pg_catalog.jsonb_build_object('status', 'exists', 'hotel', v_hotel, 'work_date', v_date);
  end if;

  select o.occupied_rooms into v_rooms
  from public.daily_occupancy o
  where o.hotel_id = v_hotel and o.occ_date = v_date and o.source = 'actual'
  order by o.updated_at desc
  limit 1;
  if v_rooms is not null then
    v_rooms_source := 'daily_occupancy';
  elsif coalesce(p->>'rooms_sold', '') ~ '^[0-9]+$' then
    v_rooms := (p->>'rooms_sold')::integer;
    v_rooms_source := 'payload';
  end if;

  select s.minutes_per_checkout, s.minutes_per_stayover, s.hours_per_occupied_room
  into v_co, v_so, v_per
  from public.labor_standards s
  where s.hotel_id = v_hotel
    and s.position = 'Room Attendant'
    and s.effective_from <= v_date
    and (s.effective_to is null or s.effective_to >= v_date)
  order by s.effective_from desc
  limit 1;

  v_rows := case when pg_catalog.jsonb_typeof(p->'positions') = 'array' then p->'positions' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_rows) > 40 then
    raise exception 'too many rows';
  end if;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    v_label := private.labor_name(v_row->>'position');
    if v_label = '' or v_label ~* '^(total|overall|grand total|hotel total|dept total|department total)$' then
      continue;
    end if;
    v_actual := round(nullif(v_row->>'actual_hours', '')::numeric, 2);
    v_plan := round(nullif(v_row->>'plan_hours', '')::numeric, 2);
    v_sched := round(nullif(v_row->>'scheduled_hours', '')::numeric, 2);
    v_positions := v_positions || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'position', v_label,
      'actual', v_actual,
      'plan', v_plan,
      'scheduled', v_sched,
      'include', not private.labor_excluded(v_label)
    ));
    if not private.labor_excluded(v_label) then
      v_any := true;
      v_sum_actual := coalesce(v_sum_actual, 0) + coalesce(v_actual, 0);
      v_sum_plan := coalesce(v_sum_plan, 0) + coalesce(v_plan, 0);
      v_sum_sched := coalesce(v_sum_sched, 0) + coalesce(v_sched, 0);
    end if;
  end loop;

  v_hk_loaded := (p->>'housekeeping_loaded') = 'true';
  v_rows := case when pg_catalog.jsonb_typeof(p->'housekeeping') = 'array' then p->'housekeeping' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_rows) > 80 then
    raise exception 'too many rows';
  end if;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    v_label := private.labor_name(coalesce(v_row->>'position', ''));
    v_name := private.labor_name(v_row->>'name');
    v_hours := round(nullif(v_row->>'hours', '')::numeric, 2);
    v_cleans := nullif(v_row->>'cleans', '')::integer;
    v_checkouts := nullif(v_row->>'checkouts', '')::integer;
    v_stays := nullif(v_row->>'stayovers', '')::integer;
    v_mpr_actual := round(nullif(v_row->>'mpr_actual', '')::numeric, 1);
    if v_mpr_actual is null and v_hours is not null and coalesce(v_cleans, 0) > 0 then
      v_mpr_actual := round((v_hours * 60) / v_cleans, 1);
    end if;
    v_mpr_target := null;
    if not private.labor_supervisor(v_label) then
      if coalesce(v_checkouts, 0) + coalesce(v_stays, 0) > 0 and v_co is not null and v_so is not null then
        v_mpr_target := round(((coalesce(v_checkouts, 0) * v_co) + (coalesce(v_stays, 0) * v_so)) / (coalesce(v_checkouts, 0) + coalesce(v_stays, 0)), 2);
      elsif v_per is not null then
        v_mpr_target := round(v_per * 60, 2);
      end if;
      v_clean_total := v_clean_total + coalesce(v_cleans, 0);
    end if;
    v_house := v_house || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'name', v_name,
      'position', v_label,
      'hours', v_hours,
      'cleans', v_cleans,
      'mpr_actual', v_mpr_actual,
      'mpr_target', v_mpr_target,
      'supervisor', private.labor_supervisor(v_label)
    ));
  end loop;

  v_rows := case when pg_catalog.jsonb_typeof(p->'associates') = 'array' then p->'associates' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_rows) > 120 then
    raise exception 'too many rows';
  end if;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    v_label := private.labor_name(coalesce(v_row->>'position', ''));
    v_name := private.labor_name(v_row->>'name');
    v_actual := round(nullif(v_row->>'actual_hours', '')::numeric, 2);
    v_plan := round(nullif(v_row->>'plan_hours', '')::numeric, 2);
    v_sched := round(nullif(v_row->>'scheduled_hours', '')::numeric, 2);
    v_scope := case when v_row->>'plan_scope' = 'position' then 'position' else 'associate' end;
    v_sched_scope := case when v_row->>'scheduled_scope' = 'position' then 'position' else 'associate' end;
    v_parent := null;
    for v_line in 0 .. pg_catalog.jsonb_array_length(v_positions) - 1 loop
      if pg_catalog.lower(v_positions -> v_line ->> 'position') = pg_catalog.lower(v_label) then
        v_parent := v_positions -> v_line;
      end if;
    end loop;
    if v_scope = 'associate' and v_actual is not null and v_plan is not null and v_actual - v_plan > 0.25 then
      v_over := v_over || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', v_name, 'position', v_label, 'actual', v_actual, 'plan', v_plan, 'scheduled', v_sched,
        'variance', round(v_actual - v_plan, 2), 'plan_scope', 'associate', 'scheduled_scope', v_sched_scope
      ));
    elsif v_scope = 'position' and v_parent is not null and coalesce((v_parent->>'include')::boolean, false)
      and nullif(v_parent->>'actual', '') is not null and nullif(v_parent->>'plan', '') is not null
      and (v_parent->>'actual')::numeric - (v_parent->>'plan')::numeric > 0.25
      and coalesce(v_actual, 0) > 0 then
      v_over := v_over || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'name', v_name, 'position', v_label, 'actual', v_actual, 'plan', v_plan, 'scheduled', v_sched,
        'variance', null, 'plan_scope', 'position', 'scheduled_scope', v_sched_scope
      ));
    end if;
  end loop;

  v_rows := case when pg_catalog.jsonb_typeof(p->'punches') = 'array' then p->'punches' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_rows) > 80 then
    raise exception 'too many rows';
  end if;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    v_who := coalesce(nullif(private.labor_name(v_row->>'name'), ''), 'Unknown associate');
    v_missing := case when v_row->>'missing' in ('in', 'out', 'both') then v_row->>'missing' else 'both' end;
    v_en := case v_missing
      when 'in' then 'Fix the missing In punch for ' || v_who || '.'
      when 'out' then 'Fix the missing Out punch for ' || v_who || '.'
      else 'Fix the missing In and Out punches for ' || v_who || '.' end;
    v_es := case v_missing
      when 'in' then 'Corrige la marcación de entrada que falta de ' || v_who || '.'
      when 'out' then 'Corrige la marcación de salida que falta de ' || v_who || '.'
      else 'Corrige las marcaciones de entrada y salida que faltan de ' || v_who || '.' end;
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kind', 'missing_punch', 'who', v_who, 'en', v_en, 'es', v_es
    ));
  end loop;

  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    if not private.labor_unknown_position(v_row->>'position') then
      continue;
    end if;
    v_who := coalesce(nullif(private.labor_name(v_row->>'name'), ''), 'Unknown associate');
    if v_seen ? pg_catalog.lower(v_who) then
      continue;
    end if;
    v_seen := v_seen || pg_catalog.jsonb_build_object(pg_catalog.lower(v_who), true);
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kind', 'unknown_position', 'who', v_who,
      'en', 'Give ' || v_who || ' a position. The punch position is blank or unknown.',
      'es', 'Asigna un puesto a ' || v_who || '. El puesto de la marcación está vacío o es desconocido.'
    ));
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_house) - 1 loop
    v_row := v_house -> v_i;
    if not private.labor_unknown_position(v_row->>'position') then
      continue;
    end if;
    v_who := coalesce(nullif(v_row->>'name', ''), 'Unknown associate');
    if v_seen ? pg_catalog.lower(v_who) then
      continue;
    end if;
    v_seen := v_seen || pg_catalog.jsonb_build_object(pg_catalog.lower(v_who), true);
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kind', 'unknown_position', 'who', v_who,
      'en', 'Give ' || v_who || ' a position. The punch position is blank or unknown.',
      'es', 'Asigna un puesto a ' || v_who || '. El puesto de la marcación está vacío o es desconocido.'
    ));
  end loop;
  v_rows := case when pg_catalog.jsonb_typeof(p->'associates') = 'array' then p->'associates' else '[]'::jsonb end;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    if not private.labor_unknown_position(v_row->>'position') then
      continue;
    end if;
    v_who := coalesce(nullif(private.labor_name(v_row->>'name'), ''), 'Unknown associate');
    if v_seen ? pg_catalog.lower(v_who) then
      continue;
    end if;
    v_seen := v_seen || pg_catalog.jsonb_build_object(pg_catalog.lower(v_who), true);
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kind', 'unknown_position', 'who', v_who,
      'en', 'Give ' || v_who || ' a position. The punch position is blank or unknown.',
      'es', 'Asigna un puesto a ' || v_who || '. El puesto de la marcación está vacío o es desconocido.'
    ));
  end loop;

  for v_i in 0 .. pg_catalog.jsonb_array_length(v_house) - 1 loop
    v_row := v_house -> v_i;
    if coalesce((v_row->>'supervisor')::boolean, false) then
      continue;
    end if;
    if nullif(v_row->>'hours', '') is not null and (v_row->>'hours')::numeric > 0 and coalesce(v_row->>'cleans', '') = '0' then
      v_who := coalesce(nullif(v_row->>'name', ''), 'Unknown associate');
      v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'kind', 'hours_zero_cleans', 'who', v_who,
        'en', v_who || ' has ' || to_char((v_row->>'hours')::numeric, 'FM999990.0') || ' hours and 0 cleans.',
        'es', v_who || ' tiene ' || to_char((v_row->>'hours')::numeric, 'FM999990.0') || ' horas y 0 limpiezas.'
      ));
    end if;
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_house) - 1 loop
    v_row := v_house -> v_i;
    if coalesce((v_row->>'supervisor')::boolean, false) then
      continue;
    end if;
    if nullif(v_row->>'cleans', '') is not null and (v_row->>'cleans')::integer > 0
      and coalesce(nullif(v_row->>'hours', '')::numeric, 0) = 0 then
      v_who := coalesce(nullif(v_row->>'name', ''), 'Unknown associate');
      v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'kind', 'cleans_zero_hours', 'who', v_who,
        'en', v_who || ' has ' || (v_row->>'cleans') || ' cleans and 0 hours.',
        'es', v_who || ' tiene ' || (v_row->>'cleans') || ' limpiezas y 0 horas.'
      ));
    end if;
  end loop;
  if v_hk_loaded and v_clean_total = 0 and coalesce(v_rooms, 0) > 0 then
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kind', 'zero_cleans_vs_sold', 'who', 'Housekeeping',
      'en', 'Housekeeping recorded 0 cleans and the night audit shows ' || v_rooms || ' rooms sold.',
      'es', 'Ama de llaves registró 0 limpiezas y la auditoría nocturna muestra ' || v_rooms || ' cuartos vendidos.'
    ));
  end if;
  v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'kind', 'five_minute_checkin', 'who', 'GM / AGM',
    'en', 'Complete the 5-minute check-in: compare yesterday actual vs plan, adjust today''s shifts, talk with anyone near overtime, and note the variance.',
    'es', 'Completa el check-in de 5 minutos: compara el real de ayer contra el plan, ajusta los turnos de hoy, habla con quien esté cerca de tiempo extra y anota la variación.'
  ));
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_over) - 1 loop
    v_row := v_over -> v_i;
    v_who := coalesce(nullif(v_row->>'name', ''), 'Unknown associate');
    if v_row->>'plan_scope' = 'position' then
      v_en := 'Review ' || v_who || ' (' || coalesce(nullif(v_row->>'position', ''), 'unknown position') || '). Actual ' ||
        to_char(coalesce((v_row->>'actual')::numeric, 0), 'FM999990.0') || 'h. Plan ' ||
        to_char(coalesce((v_row->>'plan')::numeric, 0), 'FM999990.0') || 'h is the position total, not a personal plan.';
      v_es := 'Revisa a ' || v_who || ' (' || coalesce(nullif(v_row->>'position', ''), 'puesto desconocido') || '). Real ' ||
        to_char(coalesce((v_row->>'actual')::numeric, 0), 'FM999990.0') || 'h. El plan de ' ||
        to_char(coalesce((v_row->>'plan')::numeric, 0), 'FM999990.0') || 'h es el total del puesto, no un plan personal.';
    else
      v_en := 'Trim ' || v_who || ' (' || coalesce(nullif(v_row->>'position', ''), 'unknown position') || '): actual ' ||
        to_char(coalesce((v_row->>'actual')::numeric, 0), 'FM999990.0') || 'h, plan ' ||
        to_char(coalesce((v_row->>'plan')::numeric, 0), 'FM999990.0') || 'h, scheduled ' ||
        to_char(coalesce((v_row->>'scheduled')::numeric, 0), 'FM999990.0') || 'h, over by ' ||
        to_char(coalesce((v_row->>'variance')::numeric, 0), 'FM999990.0') || 'h.';
      v_es := 'Recorta a ' || v_who || ' (' || coalesce(nullif(v_row->>'position', ''), 'puesto desconocido') || '): real ' ||
        to_char(coalesce((v_row->>'actual')::numeric, 0), 'FM999990.0') || 'h, plan ' ||
        to_char(coalesce((v_row->>'plan')::numeric, 0), 'FM999990.0') || 'h, programado ' ||
        to_char(coalesce((v_row->>'scheduled')::numeric, 0), 'FM999990.0') || 'h, ' ||
        to_char(coalesce((v_row->>'variance')::numeric, 0), 'FM999990.0') || 'h de más.';
    end if;
    v_items := v_items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kind', 'trim_overplan', 'who', v_who, 'en', v_en, 'es', v_es
    ));
  end loop;

  insert into public.labor_daily_days (
    hotel_id, work_date, due_on, rooms_sold, rooms_sold_source,
    actual_hours, plan_hours, scheduled_hours, source, housekeeping_loaded
  ) values (
    v_hotel, v_date, v_due, v_rooms, v_rooms_source,
    case when v_any then round(v_sum_actual, 2) else null end,
    case when v_any then round(v_sum_plan, 2) else null end,
    case when v_any then round(v_sum_sched, 2) else null end,
    'he', v_hk_loaded
  )
  on conflict (hotel_id, work_date) do nothing
  returning id into v_id;
  if v_id is null then
    return pg_catalog.jsonb_build_object('status', 'exists', 'hotel', v_hotel, 'work_date', v_date);
  end if;

  for v_i in 0 .. pg_catalog.jsonb_array_length(v_positions) - 1 loop
    v_row := v_positions -> v_i;
    insert into public.labor_daily_positions (
      hotel_id, work_date, line_no, position_label, actual_hours, plan_hours, scheduled_hours, include_in_daily
    ) values (
      v_hotel, v_date, v_i + 1, v_row->>'position',
      nullif(v_row->>'actual', '')::numeric,
      nullif(v_row->>'plan', '')::numeric,
      nullif(v_row->>'scheduled', '')::numeric,
      coalesce((v_row->>'include')::boolean, true)
    );
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_house) - 1 loop
    v_row := v_house -> v_i;
    insert into public.labor_daily_housekeeping (
      hotel_id, work_date, line_no, display_name, position_label, hours, cleans, mpr_actual, mpr_target, is_supervisor
    ) values (
      v_hotel, v_date, v_i + 1, coalesce(v_row->>'name', ''), coalesce(v_row->>'position', ''),
      nullif(v_row->>'hours', '')::numeric,
      nullif(v_row->>'cleans', '')::integer,
      nullif(v_row->>'mpr_actual', '')::numeric,
      nullif(v_row->>'mpr_target', '')::numeric,
      coalesce((v_row->>'supervisor')::boolean, false)
    );
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_over) - 1 loop
    v_row := v_over -> v_i;
    insert into public.labor_daily_overplan (
      hotel_id, work_date, line_no, display_name, position_label,
      actual_hours, plan_hours, scheduled_hours, variance_hours, plan_scope, scheduled_scope
    ) values (
      v_hotel, v_date, v_i + 1, coalesce(v_row->>'name', ''), coalesce(v_row->>'position', ''),
      nullif(v_row->>'actual', '')::numeric,
      nullif(v_row->>'plan', '')::numeric,
      nullif(v_row->>'scheduled', '')::numeric,
      nullif(v_row->>'variance', '')::numeric,
      v_row->>'plan_scope', v_row->>'scheduled_scope'
    );
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_items) - 1 loop
    v_row := v_items -> v_i;
    insert into public.labor_daily_actions (
      hotel_id, work_date, item_no, kind, who_name, what_en, what_es, due_on
    ) values (
      v_hotel, v_date, v_i + 1, v_row->>'kind', v_row->>'who', v_row->>'en', v_row->>'es', v_due
    );
  end loop;

  perform private.queue_notification('labor_daily_created', v_hotel, v_id);
  return pg_catalog.jsonb_build_object(
    'status', 'inserted', 'hotel', v_hotel, 'work_date', v_date, 'id', v_id,
    'items', pg_catalog.jsonb_array_length(v_items)
  );
end;
$ingest$;

create or replace function public.ingest_daily_labor(p jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $wrap$
  select private.ingest_daily_labor(p);
$wrap$;

create or replace function private.labor_action_lock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $lock$
begin
  if new.hotel_id is distinct from old.hotel_id
    or new.work_date is distinct from old.work_date
    or new.item_no is distinct from old.item_no
    or new.kind is distinct from old.kind
    or new.who_name is distinct from old.who_name
    or new.what_en is distinct from old.what_en
    or new.what_es is distinct from old.what_es
    or new.due_on is distinct from old.due_on
    or new.created_at is distinct from old.created_at
  then
    raise exception 'action text is fixed';
  end if;
  if new.status = 'overdue' and old.status = 'open' and (select auth.uid()) is null then
    new.escalated_at := coalesce(new.escalated_at, pg_catalog.now());
    new.checked_by := old.checked_by;
    new.checked_at := old.checked_at;
    new.check_note := old.check_note;
    return new;
  end if;
  if new.status = 'done' and old.status in ('open', 'overdue') and (select auth.uid()) is not null then
    if not (
      coalesce((select private.is_above()), false)
      or (
        (select private.my_role()) in ('gm', 'agm')
        and old.hotel_id = any ((select private.my_hotels())::text[])
      )
    ) then
      raise exception 'not allowed';
    end if;
    new.checked_by := (select auth.uid());
    new.checked_at := pg_catalog.now();
    new.check_note := pg_catalog.left(coalesce(new.check_note, ''), 240);
    new.escalated_at := old.escalated_at;
    return new;
  end if;
  raise exception 'not allowed';
end;
$lock$;

drop trigger if exists labor_daily_actions_lock on public.labor_daily_actions;
create trigger labor_daily_actions_lock
  before update on public.labor_daily_actions
  for each row execute function private.labor_action_lock();

create or replace function public.check_labor_action_item(p_id bigint, p_note text)
returns void
language plpgsql
security invoker
set search_path = ''
as $check$
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  update public.labor_daily_actions
    set status = 'done',
        check_note = pg_catalog.left(coalesce(p_note, ''), 240)
    where id = p_id
      and status in ('open', 'overdue');
  if not found then
    raise exception 'not allowed';
  end if;
end;
$check$;

create or replace function private.escalate_daily_labor(p_now timestamptz default pg_catalog.now())
returns integer
language plpgsql
security definer
set search_path = ''
as $escalate$
declare
  v_today date := (p_now at time zone 'America/Chicago')::date;
  v_count integer := 0;
  r record;
begin
  for r in
    select d.id, d.hotel_id, d.work_date
    from public.labor_daily_days d
    where exists (
      select 1 from public.labor_daily_actions a
      where a.hotel_id = d.hotel_id
        and a.work_date = d.work_date
        and a.status = 'open'
        and a.due_on < v_today
    )
  loop
    update public.labor_daily_actions
      set status = 'overdue'
      where hotel_id = r.hotel_id
        and work_date = r.work_date
        and status = 'open'
        and due_on < v_today;
    perform private.queue_notification('labor_daily_overdue', r.hotel_id, r.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$escalate$;

create or replace function public.escalate_daily_labor(p_now timestamptz default pg_catalog.now())
returns integer
language plpgsql
security definer
set search_path = ''
as $escalate_public$
begin
  if not coalesce((select auth.jwt() ->> 'role') = 'service_role', false) then
    raise exception 'not allowed';
  end if;
  return private.escalate_daily_labor(p_now);
end;
$escalate_public$;

revoke all on function private.ingest_daily_labor(jsonb) from public, anon, authenticated;
revoke all on function public.ingest_daily_labor(jsonb) from public, anon, authenticated;
revoke all on function private.labor_action_lock() from public, anon, authenticated;
revoke all on function public.check_labor_action_item(bigint, text) from public, anon;
revoke all on function private.escalate_daily_labor(timestamptz) from public, anon, authenticated;
revoke all on function public.escalate_daily_labor(timestamptz) from public, anon, authenticated;

grant execute on function public.check_labor_action_item(bigint, text) to authenticated;

do $grants$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant execute on function public.ingest_daily_labor(jsonb) to service_role;
    grant execute on function private.ingest_daily_labor(jsonb) to service_role;
    grant execute on function public.escalate_daily_labor(timestamptz) to service_role;
    grant execute on function private.escalate_daily_labor(timestamptz) to service_role;
  end if;
end
$grants$;

alter table public.labor_daily_hotels enable row level security;
alter table public.labor_daily_days enable row level security;
alter table public.labor_daily_positions enable row level security;
alter table public.labor_daily_housekeeping enable row level security;
alter table public.labor_daily_overplan enable row level security;
alter table public.labor_daily_actions enable row level security;

drop policy if exists labor_daily_hotels_select on public.labor_daily_hotels;
create policy labor_daily_hotels_select on public.labor_daily_hotels
  for select to authenticated
  using (
    (select private.is_above())
    or (select private.my_role()) in ('gm', 'agm')
  );

drop policy if exists labor_daily_days_select on public.labor_daily_days;
create policy labor_daily_days_select on public.labor_daily_days
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists labor_daily_positions_select on public.labor_daily_positions;
create policy labor_daily_positions_select on public.labor_daily_positions
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists labor_daily_housekeeping_select on public.labor_daily_housekeeping;
create policy labor_daily_housekeeping_select on public.labor_daily_housekeeping
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists labor_daily_overplan_select on public.labor_daily_overplan;
create policy labor_daily_overplan_select on public.labor_daily_overplan
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists labor_daily_actions_select on public.labor_daily_actions;
create policy labor_daily_actions_select on public.labor_daily_actions
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists labor_daily_actions_update on public.labor_daily_actions;
create policy labor_daily_actions_update on public.labor_daily_actions
  for update to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  )
  with check (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

revoke all on table public.labor_daily_hotels from public, anon, authenticated;
revoke all on table public.labor_daily_days from public, anon, authenticated;
revoke all on table public.labor_daily_positions from public, anon, authenticated;
revoke all on table public.labor_daily_housekeeping from public, anon, authenticated;
revoke all on table public.labor_daily_overplan from public, anon, authenticated;
revoke all on table public.labor_daily_actions from public, anon, authenticated;

grant select on table public.labor_daily_hotels to authenticated;
grant select on table public.labor_daily_days to authenticated;
grant select on table public.labor_daily_positions to authenticated;
grant select on table public.labor_daily_housekeeping to authenticated;
grant select on table public.labor_daily_overplan to authenticated;
grant select on table public.labor_daily_actions to authenticated;
grant update (status, check_note) on table public.labor_daily_actions to authenticated;

insert into public.alert_settings (hotel_id, event, enabled, requires_ack, realert_minutes, escalate_minutes, max_attempts)
select h.hotel_id, e.event, true, false, 60, 240, 3
from (values ('MSPWE'), ('MSPAM'), ('MSPMS')) as h(hotel_id)
cross join (values ('labor_daily_created'), ('labor_daily_overdue')) as e(event)
where not exists (
  select 1 from public.alert_settings s
  where s.hotel_id = h.hotel_id and s.event = e.event
);

do $cron$
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'labor-daily-overdue') then
      perform cron.unschedule('labor-daily-overdue');
    end if;
    -- 06:05 UTC is 12:05 AM CST or 1:05 AM CDT, after the Chicago day has ended.
    perform cron.schedule('labor-daily-overdue', '5 6 * * *', 'select private.escalate_daily_labor()');
  end if;
end
$cron$;
