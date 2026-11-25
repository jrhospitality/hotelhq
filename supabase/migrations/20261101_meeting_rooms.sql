-- Meeting rooms, banquet event orders, setup/cleanup tasks, and reminders.
-- Additive only. Does not remove existing tables or existing rows.
-- Demo mode does not call this database and does not load sample groups.
-- Do not store a personal guest name. group_name is a company or group.
--
-- Who can see the calendar and BEO: front desk, AGM, GM, and corporate.
-- Front desk can edit. Billing notes are returned only to AGM, GM, and corporate.
-- House persons, housekeeping leads, and maintenance see meeting_tasks only,
-- and only the task assigned to them (or to their role when nobody is named).
--
-- A definite booking reminds the GM and AGM when the start is inside 24 hours.
-- A booking created inside that window is reminded by the row trigger, not only
-- by the clock. Front desk gets one morning list at meeting_settings.day_alert_hour
-- (default 6, hotel time) and one nudge in the hour before each start.
-- reminder_sent, hour_alert_sent, and meeting_day_alerts stop duplicates.
-- Cleanup tasks are created at the end time. Optional setup tasks are created
-- setup_lead_min before the start. Keep this in step with sweep() in meetings.js.
--
-- private.my_hotels() returns text[]. Compare with
--   hotel = any ((select private.my_hotels())::text[])

create schema if not exists private;

grant usage on schema private to authenticated;

create table if not exists public.meeting_settings (
  hotel text primary key check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  day_alert_hour integer not null default 6 check (day_alert_hour between 0 and 11),
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.meeting_settings is
  'When the front desk morning meeting list is sent, in America/Chicago hours 0-11.';

create table if not exists public.meeting_rooms (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  name text not null check (char_length(btrim(name)) between 2 and 40),
  capacity integer not null check (capacity between 1 and 500),
  styles text[] not null check (styles <@ array['theater', 'classroom', 'u_shape', 'boardroom', 'banquet', 'reception']::text[] and cardinality(styles) >= 1),
  active boolean not null default true,
  sort_order integer not null default 0
);

comment on table public.meeting_rooms is
  'A meeting room at one hotel. styles lists the sets the room can take.';

create table if not exists public.meeting_bookings (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  room_id bigint not null references public.meeting_rooms (id),
  status text not null check (status in ('tentative', 'definite', 'cancelled')),
  group_name text not null check (char_length(btrim(group_name)) between 2 and 80),
  onsite_phone text check (onsite_phone is null or onsite_phone ~ '^[0-9]{10}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  setup_min integer not null default 0 check (setup_min between 0 and 240),
  teardown_min integer not null default 0 check (teardown_min between 0 and 240),
  guaranteed_count integer not null default 0 check (guaranteed_count between 0 and 500),
  expected_count integer not null default 0 check (expected_count between 0 and 500),
  setup_style text not null check (setup_style in ('theater', 'classroom', 'u_shape', 'boardroom', 'banquet', 'reception')),
  av_projector boolean not null default false,
  av_screen boolean not null default false,
  av_mic boolean not null default false,
  av_speaker boolean not null default false,
  av_flipchart boolean not null default false,
  wifi_code text check (wifi_code is null or char_length(wifi_code) <= 40),
  fb_coffee boolean not null default false,
  fb_breakfast boolean not null default false,
  fb_lunch boolean not null default false,
  fb_snacks boolean not null default false,
  dietary_notes text check (dietary_notes is null or char_length(dietary_notes) <= 200),
  billing_notes text check (billing_notes is null or char_length(billing_notes) <= 500),
  special_notes text check (special_notes is null or char_length(special_notes) <= 500),
  cleanup_assignee text check (cleanup_assignee is null or char_length(cleanup_assignee) <= 80),
  setup_enabled boolean not null default false,
  setup_lead_min integer not null default 0 check (setup_lead_min between 0 and 240),
  setup_assignee text check (setup_assignee is null or char_length(setup_assignee) <= 80),
  headcount_ok boolean not null default false,
  av_ok boolean not null default false,
  fb_ok boolean not null default false,
  setup_ok boolean not null default false,
  reminder_sent timestamptz,
  hour_alert_sent timestamptz,
  cleanup_task_id bigint,
  setup_task_id bigint,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (ends_at > starts_at)
);

comment on table public.meeting_bookings is
  'One banquet event order. group_name is a company or group, not a guest name. billing_notes is for managers only.';
comment on column public.meeting_bookings.reminder_sent is
  'Set when the 24-hour GM/AGM reminder was sent. Null means it still needs to go.';
comment on column public.meeting_bookings.hour_alert_sent is
  'Set when the one-hour front desk nudge was sent.';

create table if not exists public.meeting_tasks (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  booking_id bigint not null references public.meeting_bookings (id),
  kind text not null check (kind in ('setup', 'cleanup')),
  assignee_role text not null check (assignee_role in ('house_person', 'hk_lead', 'maintenance', 'gm', 'agm')),
  assignee_user uuid,
  room_name text not null,
  setup_style text not null,
  notes text,
  due_at timestamptz not null,
  status text not null default 'Open' check (status in ('Open', 'Started', 'Done')),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.meeting_tasks is
  'Setup or cleanup work. No billing notes and no link to the calendar for the assignee.';

alter table public.meeting_bookings
  drop constraint if exists meeting_bookings_cleanup_task_id_fkey;
alter table public.meeting_bookings
  add constraint meeting_bookings_cleanup_task_id_fkey
  foreign key (cleanup_task_id) references public.meeting_tasks (id);
alter table public.meeting_bookings
  drop constraint if exists meeting_bookings_setup_task_id_fkey;
alter table public.meeting_bookings
  add constraint meeting_bookings_setup_task_id_fkey
  foreign key (setup_task_id) references public.meeting_tasks (id);

create unique index if not exists meeting_tasks_one_cleanup_idx
  on public.meeting_tasks (booking_id) where kind = 'cleanup';
create unique index if not exists meeting_tasks_one_setup_idx
  on public.meeting_tasks (booking_id) where kind = 'setup';
create index if not exists meeting_bookings_hotel_start_idx
  on public.meeting_bookings (hotel, starts_at);
create index if not exists meeting_rooms_hotel_idx
  on public.meeting_rooms (hotel);

create table if not exists public.meeting_day_alerts (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  alert_date date not null,
  sent_at timestamptz not null default pg_catalog.now(),
  primary key (hotel, alert_date)
);

comment on table public.meeting_day_alerts is
  'One front-desk morning list per hotel per Chicago date.';

create table if not exists public.meeting_alerts (
  id bigint generated always as identity primary key,
  dedupe_key text not null unique,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  kind text not null check (kind in ('meeting_reminder', 'meeting_day', 'meeting_hour')),
  roles text[] not null,
  booking_id bigint,
  title_en text not null,
  title_es text not null,
  body_en text not null,
  body_es text not null,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.meeting_alerts is
  'In-app reminder copy in English and Spanish. dedupe_key stops a second push.';

insert into public.meeting_settings (hotel, day_alert_hour)
values ('MSPWE', 6), ('MSPAM', 6), ('MSPMS', 6)
on conflict (hotel) do nothing;

alter table public.meeting_settings enable row level security;
alter table public.meeting_rooms enable row level security;
alter table public.meeting_bookings enable row level security;
alter table public.meeting_tasks enable row level security;
alter table public.meeting_day_alerts enable row level security;
alter table public.meeting_alerts enable row level security;

create or replace function private.meeting_can_calendar()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('front_desk', 'agm', 'gm', 'above_property'),
    false
  );
$$;

create or replace function private.meeting_can_edit()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.meeting_can_calendar();
$$;

create or replace function private.meeting_can_bill()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('agm', 'gm', 'above_property'),
    false
  );
$$;

create or replace function private.meeting_can_configure()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.is_above() or private.my_role() in ('gm', 'above_property'), false);
$$;

create or replace function private.meeting_hotel_ok(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_hotel in ('MSPWE', 'MSPAM', 'MSPMS')
    and (
      private.is_above()
      or p_hotel = any ((select private.my_hotels())::text[])
    ),
    false
  );
$$;

create or replace function private.meeting_billing(p_id bigint)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.meeting_can_bill() then b.billing_notes
    else null
  end
  from public.meeting_bookings b
  where b.id = p_id
    and (
      (select private.is_above())
      or b.hotel = any ((select private.my_hotels())::text[])
    );
$$;

create or replace view public.meeting_beo
with (security_invoker = true) as
select
  b.id, b.hotel, b.room_id, b.status, b.group_name, b.onsite_phone,
  b.starts_at, b.ends_at, b.setup_min, b.teardown_min,
  b.guaranteed_count, b.expected_count, b.setup_style,
  b.av_projector, b.av_screen, b.av_mic, b.av_speaker, b.av_flipchart, b.wifi_code,
  b.fb_coffee, b.fb_breakfast, b.fb_lunch, b.fb_snacks, b.dietary_notes,
  private.meeting_billing(b.id) as billing_notes,
  b.special_notes, b.cleanup_assignee, b.setup_enabled, b.setup_lead_min, b.setup_assignee,
  b.headcount_ok, b.av_ok, b.fb_ok, b.setup_ok,
  b.reminder_sent, b.hour_alert_sent, b.cleanup_task_id, b.setup_task_id,
  b.created_at, b.updated_at
from public.meeting_bookings b;

comment on view public.meeting_beo is
  'BEO for the calendar roles. billing_notes is null unless the caller is AGM, GM, or corporate.';

create or replace function private.meeting_send_alert(
  p_dedupe text,
  p_kind text,
  p_hotel text,
  p_roles text[],
  p_booking bigint,
  p_title_en text,
  p_title_es text,
  p_body_en text,
  p_body_es text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_role text;
  v_app text;
begin
  insert into public.meeting_alerts (
    dedupe_key, hotel, kind, roles, booking_id, title_en, title_es, body_en, body_es
  ) values (
    p_dedupe, p_hotel, p_kind, p_roles, p_booking, p_title_en, p_title_es, p_body_en, p_body_es
  )
  on conflict (dedupe_key) do nothing
  returning id into v_id;
  if v_id is null then
    return;
  end if;
  foreach v_role in array p_roles loop
    v_app := case v_role
      when 'front_desk' then 'Front Desk'
      when 'gm' then 'GM'
      when 'agm' then 'AGM'
      else v_role
    end;
    begin
      insert into public.notifications (title, body, role, hotel, kind)
      values (p_title_en, p_body_en || E'\n' || p_body_es, v_app, p_hotel, p_kind);
    exception when others then
      null;
    end;
  end loop;
  if pg_catalog.to_regprocedure('private.queue_notification(text,text,bigint)') is not null then
    begin
      perform private.queue_notification(p_kind, p_hotel, v_id);
    exception when others then
      null;
    end;
  end if;
end;
$$;

create or replace function private.meeting_pick_assignee(p_hotel text, p_requested text)
returns table (user_id uuid, role_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_role text;
  v_try text;
begin
  if p_requested ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select p.user_id, p.role::text into v_user, v_role
    from public.profiles p
    where p.user_id = p_requested::uuid and p.hotel_id = p_hotel
    limit 1;
    if v_user is not null then
      user_id := v_user;
      role_name := v_role;
      return next;
      return;
    end if;
  end if;
  foreach v_try in array array[
    case when p_requested in ('house_person', 'hk_lead', 'maintenance', 'gm', 'agm') then p_requested else null end,
    'house_person', 'hk_lead', 'gm', 'agm'
  ]
  loop
    if v_try is null then
      continue;
    end if;
    select p.user_id into v_user
    from public.profiles p
    where p.hotel_id = p_hotel and p.role::text = v_try
    limit 1;
    if v_user is not null then
      user_id := v_user;
      role_name := v_try;
      return next;
      return;
    end if;
  end loop;
  user_id := null;
  role_name := 'house_person';
  return next;
end;
$$;

create or replace function private.meetings_sweep()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_local timestamp;
  v_day date;
  v_hour integer;
  b record;
  h record;
  v_id bigint;
  v_task bigint;
  v_who uuid;
  v_role text;
    v_body_en text;
    v_body_es text;
    v_mark text;
    v_due timestamptz;
begin
  perform pg_catalog.set_config('meeting.sweeping', '1', true);
  v_local := v_now at time zone 'America/Chicago';
  v_day := v_local::date;
  v_hour := extract(hour from v_local)::integer;

  for b in
    select *
    from public.meeting_bookings
    where status = 'definite'
      and reminder_sent is null
      and starts_at > v_now
      and starts_at <= v_now + interval '24 hours'
  loop
    perform private.meeting_send_alert(
      'rem|' || b.id::text || '|' || extract(epoch from b.starts_at)::text,
      'meeting_reminder',
      b.hotel,
      array['gm', 'agm'],
      b.id,
      'Coming up',
      'Próximas',
      'Confirm ' || b.group_name || '. Check headcount, AV, food and beverage, and the setup assignee.',
      'Confirma ' || b.group_name || '. Revisa asistentes, equipo audiovisual, alimentos y bebidas, y quién monta.'
    );
    update public.meeting_bookings
      set reminder_sent = v_now
      where id = b.id and reminder_sent is null;
  end loop;

  for b in
    select *
    from public.meeting_bookings
    where status <> 'cancelled'
      and hour_alert_sent is null
      and starts_at > v_now
      and starts_at <= v_now + interval '1 hour'
  loop
    perform private.meeting_send_alert(
      'hour|' || b.id::text || '|' || extract(epoch from b.starts_at)::text,
      'meeting_hour',
      b.hotel,
      array['front_desk'],
      b.id,
      'Meetings',
      'Reuniones',
      b.group_name || ' starts soon. Headcount ' || b.guaranteed_count::text || '.',
      b.group_name || ' empieza pronto. Asistentes ' || b.guaranteed_count::text || '.'
    );
    update public.meeting_bookings
      set hour_alert_sent = v_now
      where id = b.id and hour_alert_sent is null;
  end loop;

  for h in select s.hotel, s.day_alert_hour from public.meeting_settings s loop
    if v_hour < h.day_alert_hour then
      continue;
    end if;
    insert into public.meeting_day_alerts (hotel, alert_date, sent_at)
    values (h.hotel, v_day, v_now)
    on conflict (hotel, alert_date) do nothing
    returning hotel into v_mark;
    if v_mark is null then
      continue;
    end if;
    v_body_en := 'No meetings today.';
    v_body_es := 'No hay reuniones hoy.';
    select
      coalesce(pg_catalog.string_agg(
        r.name || ', ' || to_char(x.starts_at at time zone 'America/Chicago', 'HH12:MI AM')
          || '-' || to_char(x.ends_at at time zone 'America/Chicago', 'HH12:MI AM')
          || ', ' || x.group_name
          || ', Headcount ' || x.guaranteed_count::text || '/' || x.expected_count::text
          || ', ' || coalesce(x.onsite_phone, 'No on-site phone'),
        ' | ' order by x.starts_at
      ), 'No meetings today.'),
      coalesce(pg_catalog.string_agg(
        r.name || ', ' || to_char(x.starts_at at time zone 'America/Chicago', 'HH12:MI AM')
          || '-' || to_char(x.ends_at at time zone 'America/Chicago', 'HH12:MI AM')
          || ', ' || x.group_name
          || ', Asistentes ' || x.guaranteed_count::text || '/' || x.expected_count::text
          || ', ' || coalesce(x.onsite_phone, 'Sin teléfono en el sitio'),
        ' | ' order by x.starts_at
      ), 'No hay reuniones hoy.')
    into v_body_en, v_body_es
    from public.meeting_bookings x
    join public.meeting_rooms r on r.id = x.room_id
    where x.hotel = h.hotel
      and x.status <> 'cancelled'
      and (x.starts_at at time zone 'America/Chicago')::date = v_day;
    if not found then
      v_body_en := 'No meetings today.';
      v_body_es := 'No hay reuniones hoy.';
    end if;
    perform private.meeting_send_alert(
      'day|' || h.hotel || '|' || v_day::text,
      'meeting_day',
      h.hotel,
      array['front_desk'],
      null,
      'Today''s events',
      'Eventos de hoy',
      'Today''s meeting list for ' || v_day::text || '. ' || coalesce(v_body_en, 'No meetings today.'),
      'Lista de reuniones de hoy, ' || v_day::text || '. ' || coalesce(v_body_es, 'No hay reuniones hoy.')
    );
    v_mark := null;
  end loop;

  for b in
    select x.*, r.name as room_label
    from public.meeting_bookings x
    join public.meeting_rooms r on r.id = x.room_id
    where x.status = 'definite'
      and x.cleanup_task_id is null
      and x.ends_at <= v_now
  loop
    select a.user_id, a.role_name into v_who, v_role
    from private.meeting_pick_assignee(b.hotel, b.cleanup_assignee) a;
    if v_role is null or v_role not in ('house_person', 'hk_lead', 'maintenance', 'gm', 'agm') then
      v_role := 'house_person';
    end if;
    insert into public.meeting_tasks (
      hotel, booking_id, kind, assignee_role, assignee_user, room_name, setup_style, notes, due_at
    ) values (
      b.hotel, b.id, 'cleanup', coalesce(v_role, 'house_person'), v_who, b.room_label, b.setup_style,
      coalesce(b.special_notes, ''), b.ends_at
    )
    on conflict (booking_id) where kind = 'cleanup' do nothing
    returning id into v_task;
    if v_task is null then
      select t.id into v_task from public.meeting_tasks t where t.booking_id = b.id and t.kind = 'cleanup';
    end if;
    update public.meeting_bookings
      set cleanup_task_id = v_task
      where id = b.id and cleanup_task_id is null;
    if to_regclass('public.ops_requests') is not null and v_task is not null
       and not exists (
         select 1 from public.ops_requests o
         where o.source_table = 'meeting_tasks' and o.source_id = v_task::text
       ) then
      insert into public.ops_requests (
        hotel_id, kind, dept, room, title, note, status, source_table, source_id, example
      ) values (
        b.hotel,
        case when v_role = 'maintenance' then 'work_order' else 'houseperson_help' end,
        case when v_role = 'maintenance' then 'maintenance' else 'housekeeping' end,
        b.room_label,
        'Reset ' || b.room_label || '. Was ' || b.setup_style || '. ' || coalesce(b.special_notes, ''),
        nullif(coalesce(b.special_notes, ''), ''),
        'open',
        'meeting_tasks',
        v_task::text,
        false
      );
    end if;
    v_task := null;
  end loop;

  for b in
    select x.*, r.name as room_label
    from public.meeting_bookings x
    join public.meeting_rooms r on r.id = x.room_id
    where x.status = 'definite'
      and x.setup_enabled
      and x.setup_lead_min > 0
      and x.setup_task_id is null
      and x.starts_at - make_interval(mins => x.setup_lead_min) <= v_now
      and x.ends_at > v_now
  loop
    select a.user_id, a.role_name into v_who, v_role
    from private.meeting_pick_assignee(b.hotel, b.setup_assignee) a;
    if v_role is null or v_role not in ('house_person', 'hk_lead', 'maintenance', 'gm', 'agm') then
      v_role := 'house_person';
    end if;
    insert into public.meeting_tasks (
      hotel, booking_id, kind, assignee_role, assignee_user, room_name, setup_style, notes, due_at
    ) values (
      b.hotel, b.id, 'setup', coalesce(v_role, 'house_person'), v_who, b.room_label, b.setup_style,
      coalesce(b.special_notes, ''), b.starts_at - make_interval(mins => b.setup_lead_min)
    )
    on conflict (booking_id) where kind = 'setup' do nothing
    returning id into v_task;
    if v_task is null then
      select t.id into v_task from public.meeting_tasks t where t.booking_id = b.id and t.kind = 'setup';
    end if;
    update public.meeting_bookings
      set setup_task_id = v_task
      where id = b.id and setup_task_id is null;
    if to_regclass('public.ops_requests') is not null and v_task is not null
       and not exists (
         select 1 from public.ops_requests o
         where o.source_table = 'meeting_tasks' and o.source_id = v_task::text
       ) then
      insert into public.ops_requests (
        hotel_id, kind, dept, room, title, note, status, source_table, source_id, example
      ) values (
        b.hotel,
        case when v_role = 'maintenance' then 'work_order' else 'houseperson_help' end,
        case when v_role = 'maintenance' then 'maintenance' else 'housekeeping' end,
        b.room_label,
        'Set ' || b.room_label || '. For ' || b.setup_style || '. ' || coalesce(b.special_notes, ''),
        nullif(coalesce(b.special_notes, ''), ''),
        'open',
        'meeting_tasks',
        v_task::text,
        false
      );
    end if;
    v_task := null;
  end loop;
end;
$$;

create or replace function private.meeting_after_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(pg_catalog.current_setting('meeting.sweeping', true), '') = '1' then
    return new;
  end if;
  perform pg_catalog.set_config('meeting.sweeping', '1', true);
  perform private.meetings_sweep();
  return new;
end;
$$;

drop trigger if exists meeting_bookings_sweep on public.meeting_bookings;
create trigger meeting_bookings_sweep
  after insert or update of status, starts_at, ends_at, setup_enabled, setup_lead_min
  on public.meeting_bookings
  for each row execute function private.meeting_after_booking();

create or replace function private.meeting_save_room(
  p_id bigint,
  p_hotel text,
  p_name text,
  p_capacity integer,
  p_styles text[],
  p_active boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_name text;
begin
  if (select auth.uid()) is null or not private.meeting_can_configure() then
    raise exception 'not allowed';
  end if;
  if not private.meeting_hotel_ok(p_hotel) then
    raise exception 'unknown hotel';
  end if;
  v_name := btrim(coalesce(p_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'name required';
  end if;
  if p_capacity is null or p_capacity < 1 or p_capacity > 500 then
    raise exception 'capacity out of range';
  end if;
  if p_styles is null or cardinality(p_styles) < 1
     or not (p_styles <@ array['theater', 'classroom', 'u_shape', 'boardroom', 'banquet', 'reception']::text[]) then
    raise exception 'style required';
  end if;
  if p_id is null then
    insert into public.meeting_rooms (hotel, name, capacity, styles, active)
    values (p_hotel, v_name, p_capacity, p_styles, coalesce(p_active, true))
    returning id into v_id;
    return v_id;
  end if;
  update public.meeting_rooms
    set name = v_name, capacity = p_capacity, styles = p_styles, active = coalesce(p_active, true)
    where id = p_id and hotel = p_hotel
    returning id into v_id;
  if v_id is null then
    raise exception 'unknown room';
  end if;
  return v_id;
end;
$$;

create or replace function private.meeting_save_settings(p_hotel text, p_hour integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.meeting_can_configure() then
    raise exception 'not allowed';
  end if;
  if not private.meeting_hotel_ok(p_hotel) then
    raise exception 'unknown hotel';
  end if;
  if p_hour is null or p_hour < 0 or p_hour > 11 then
    raise exception 'hour out of range';
  end if;
  insert into public.meeting_settings (hotel, day_alert_hour, updated_by, updated_at)
  values (p_hotel, p_hour, (select auth.uid()), pg_catalog.now())
  on conflict (hotel) do update
    set day_alert_hour = excluded.day_alert_hour,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function private.meeting_save_booking(
  p_id bigint,
  p_hotel text,
  p_room_id bigint,
  p_status text,
  p_group_name text,
  p_phone text,
  p_starts timestamptz,
  p_ends timestamptz,
  p_setup_min integer,
  p_teardown_min integer,
  p_guaranteed integer,
  p_expected integer,
  p_style text,
  p_av_projector boolean,
  p_av_screen boolean,
  p_av_mic boolean,
  p_av_speaker boolean,
  p_av_flipchart boolean,
  p_wifi text,
  p_fb_coffee boolean,
  p_fb_breakfast boolean,
  p_fb_lunch boolean,
  p_fb_snacks boolean,
  p_dietary text,
  p_billing text,
  p_notes text,
  p_cleanup_assignee text,
  p_setup_enabled boolean,
  p_setup_lead_min integer,
  p_setup_assignee text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_cap integer;
  v_styles text[];
  v_phone text;
  v_group text;
  v_billing text;
  v_old_start timestamptz;
  v_old_billing text;
begin
  if (select auth.uid()) is null or not private.meeting_can_edit() then
    raise exception 'not allowed';
  end if;
  if not private.meeting_hotel_ok(p_hotel) then
    raise exception 'unknown hotel';
  end if;
  if p_status not in ('tentative', 'definite', 'cancelled') then
    raise exception 'unknown status';
  end if;
  select r.capacity, r.styles into v_cap, v_styles
  from public.meeting_rooms r
  where r.id = p_room_id and r.hotel = p_hotel and r.active;
  if v_cap is null then
    raise exception 'unknown room';
  end if;
  if p_style is null or not (p_style = any (v_styles)) then
    raise exception 'style not allowed';
  end if;
  v_group := btrim(coalesce(p_group_name, ''));
  if char_length(v_group) < 2 or char_length(v_group) > 80 then
    raise exception 'name required';
  end if;
  if p_starts is null or p_ends is null or p_ends <= p_starts then
    raise exception 'time';
  end if;
  if coalesce(p_expected, 0) > v_cap or coalesce(p_guaranteed, 0) > v_cap then
    raise exception 'capacity';
  end if;
  v_phone := nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
  if v_phone is not null and char_length(v_phone) = 11 and left(v_phone, 1) = '1' then
    v_phone := substr(v_phone, 2);
  end if;
  if v_phone is not null and v_phone !~ '^[0-9]{10}$' then
    raise exception 'phone';
  end if;
  if p_status <> 'cancelled' and exists (
    select 1
    from public.meeting_bookings o
    where o.room_id = p_room_id
      and o.status <> 'cancelled'
      and o.id is distinct from p_id
      and (o.starts_at - make_interval(mins => o.setup_min))
          < (p_ends + make_interval(mins => coalesce(p_teardown_min, 0)))
      and (p_starts - make_interval(mins => coalesce(p_setup_min, 0)))
          < (o.ends_at + make_interval(mins => o.teardown_min))
  ) then
    raise exception 'conflict';
  end if;
  v_billing := nullif(btrim(coalesce(p_billing, '')), '');
  if p_id is not null then
    select b.starts_at, b.billing_notes into v_old_start, v_old_billing
    from public.meeting_bookings b
    where b.id = p_id and b.hotel = p_hotel;
    if v_old_start is null and not exists (
      select 1 from public.meeting_bookings b where b.id = p_id and b.hotel = p_hotel
    ) then
      raise exception 'unknown booking';
    end if;
  end if;
  if not private.meeting_can_bill() then
    v_billing := v_old_billing;
  end if;
  if p_id is null then
    insert into public.meeting_bookings (
      hotel, room_id, status, group_name, onsite_phone, starts_at, ends_at,
      setup_min, teardown_min, guaranteed_count, expected_count, setup_style,
      av_projector, av_screen, av_mic, av_speaker, av_flipchart, wifi_code,
      fb_coffee, fb_breakfast, fb_lunch, fb_snacks, dietary_notes, billing_notes, special_notes,
      cleanup_assignee, setup_enabled, setup_lead_min, setup_assignee, created_by
    ) values (
      p_hotel, p_room_id, p_status, v_group, v_phone, p_starts, p_ends,
      coalesce(p_setup_min, 0), coalesce(p_teardown_min, 0), coalesce(p_guaranteed, 0), coalesce(p_expected, 0), p_style,
      coalesce(p_av_projector, false), coalesce(p_av_screen, false), coalesce(p_av_mic, false),
      coalesce(p_av_speaker, false), coalesce(p_av_flipchart, false), nullif(btrim(coalesce(p_wifi, '')), ''),
      coalesce(p_fb_coffee, false), coalesce(p_fb_breakfast, false), coalesce(p_fb_lunch, false), coalesce(p_fb_snacks, false),
      nullif(btrim(coalesce(p_dietary, '')), ''), v_billing, nullif(btrim(coalesce(p_notes, '')), ''),
      nullif(btrim(coalesce(p_cleanup_assignee, '')), ''), coalesce(p_setup_enabled, false), coalesce(p_setup_lead_min, 0),
      nullif(btrim(coalesce(p_setup_assignee, '')), ''), (select auth.uid())
    ) returning id into v_id;
    return v_id;
  end if;
  update public.meeting_bookings set
    room_id = p_room_id,
    status = p_status,
    group_name = v_group,
    onsite_phone = v_phone,
    starts_at = p_starts,
    ends_at = p_ends,
    setup_min = coalesce(p_setup_min, 0),
    teardown_min = coalesce(p_teardown_min, 0),
    guaranteed_count = coalesce(p_guaranteed, 0),
    expected_count = coalesce(p_expected, 0),
    setup_style = p_style,
    av_projector = coalesce(p_av_projector, false),
    av_screen = coalesce(p_av_screen, false),
    av_mic = coalesce(p_av_mic, false),
    av_speaker = coalesce(p_av_speaker, false),
    av_flipchart = coalesce(p_av_flipchart, false),
    wifi_code = nullif(btrim(coalesce(p_wifi, '')), ''),
    fb_coffee = coalesce(p_fb_coffee, false),
    fb_breakfast = coalesce(p_fb_breakfast, false),
    fb_lunch = coalesce(p_fb_lunch, false),
    fb_snacks = coalesce(p_fb_snacks, false),
    dietary_notes = nullif(btrim(coalesce(p_dietary, '')), ''),
    billing_notes = v_billing,
    special_notes = nullif(btrim(coalesce(p_notes, '')), ''),
    cleanup_assignee = nullif(btrim(coalesce(p_cleanup_assignee, '')), ''),
    setup_enabled = coalesce(p_setup_enabled, false),
    setup_lead_min = coalesce(p_setup_lead_min, 0),
    setup_assignee = nullif(btrim(coalesce(p_setup_assignee, '')), ''),
    reminder_sent = case when p_starts is distinct from v_old_start then null else reminder_sent end,
    hour_alert_sent = case when p_starts is distinct from v_old_start then null else hour_alert_sent end,
    updated_at = pg_catalog.now()
  where id = p_id and hotel = p_hotel
  returning id into v_id;
  if v_id is null then
    raise exception 'unknown booking';
  end if;
  return v_id;
end;
$$;

create or replace function private.meeting_set_check(
  p_id bigint,
  p_key text,
  p_on boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
begin
  if (select auth.uid()) is null or not private.meeting_can_bill() then
    raise exception 'not allowed';
  end if;
  if p_key not in ('headcount', 'av', 'fb', 'setup') then
    raise exception 'unknown check';
  end if;
  select b.hotel into v_hotel from public.meeting_bookings b where b.id = p_id;
  if v_hotel is null or not private.meeting_hotel_ok(v_hotel) then
    raise exception 'unknown booking';
  end if;
  if p_key = 'headcount' then
    update public.meeting_bookings set headcount_ok = coalesce(p_on, false), updated_at = pg_catalog.now() where id = p_id;
  elsif p_key = 'av' then
    update public.meeting_bookings set av_ok = coalesce(p_on, false), updated_at = pg_catalog.now() where id = p_id;
  elsif p_key = 'fb' then
    update public.meeting_bookings set fb_ok = coalesce(p_on, false), updated_at = pg_catalog.now() where id = p_id;
  else
    update public.meeting_bookings set setup_ok = coalesce(p_on, false), updated_at = pg_catalog.now() where id = p_id;
  end if;
end;
$$;

create or replace function public.meeting_save_room(
  p_id bigint, p_hotel text, p_name text, p_capacity integer, p_styles text[], p_active boolean
) returns bigint
language sql security invoker set search_path = ''
as $$ select private.meeting_save_room(p_id, p_hotel, p_name, p_capacity, p_styles, p_active); $$;

create or replace function public.meeting_save_settings(p_hotel text, p_hour integer)
returns void language sql security invoker set search_path = ''
as $$ select private.meeting_save_settings(p_hotel, p_hour); $$;

create or replace function public.meeting_save_booking(
  p_id bigint, p_hotel text, p_room_id bigint, p_status text, p_group_name text, p_phone text,
  p_starts timestamptz, p_ends timestamptz, p_setup_min integer, p_teardown_min integer,
  p_guaranteed integer, p_expected integer, p_style text,
  p_av_projector boolean, p_av_screen boolean, p_av_mic boolean, p_av_speaker boolean, p_av_flipchart boolean, p_wifi text,
  p_fb_coffee boolean, p_fb_breakfast boolean, p_fb_lunch boolean, p_fb_snacks boolean, p_dietary text,
  p_billing text, p_notes text, p_cleanup_assignee text, p_setup_enabled boolean, p_setup_lead_min integer, p_setup_assignee text
) returns bigint
language sql security invoker set search_path = ''
as $$
  select private.meeting_save_booking(
    p_id, p_hotel, p_room_id, p_status, p_group_name, p_phone, p_starts, p_ends, p_setup_min, p_teardown_min,
    p_guaranteed, p_expected, p_style, p_av_projector, p_av_screen, p_av_mic, p_av_speaker, p_av_flipchart, p_wifi,
    p_fb_coffee, p_fb_breakfast, p_fb_lunch, p_fb_snacks, p_dietary, p_billing, p_notes, p_cleanup_assignee,
    p_setup_enabled, p_setup_lead_min, p_setup_assignee
  );
$$;

create or replace function public.meeting_set_check(p_id bigint, p_key text, p_on boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.meeting_set_check(p_id, p_key, p_on); $$;

drop policy if exists meeting_settings_select on public.meeting_settings;
create policy meeting_settings_select on public.meeting_settings
  for select to authenticated
  using (
    (select private.meeting_can_calendar())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists meeting_rooms_select on public.meeting_rooms;
create policy meeting_rooms_select on public.meeting_rooms
  for select to authenticated
  using (
    (select private.meeting_can_calendar())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists meeting_bookings_select on public.meeting_bookings;
create policy meeting_bookings_select on public.meeting_bookings
  for select to authenticated
  using (
    (select private.meeting_can_calendar())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists meeting_tasks_select on public.meeting_tasks;
create policy meeting_tasks_select on public.meeting_tasks
  for select to authenticated
  using (
    (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
    and (
      (select private.meeting_can_calendar())
      or assignee_user = (select auth.uid())
      or (assignee_user is null and assignee_role = (select private.my_role())::text)
    )
  );

drop policy if exists meeting_day_alerts_select on public.meeting_day_alerts;
create policy meeting_day_alerts_select on public.meeting_day_alerts
  for select to authenticated
  using (
    (select private.meeting_can_calendar())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists meeting_alerts_select on public.meeting_alerts;
create policy meeting_alerts_select on public.meeting_alerts
  for select to authenticated
  using (
    (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
    and (
      (select private.is_above())
      or (select private.my_role())::text = any (roles)
    )
  );

revoke all on table public.meeting_settings from public, anon, authenticated;
revoke all on table public.meeting_rooms from public, anon, authenticated;
revoke all on table public.meeting_bookings from public, anon, authenticated;
revoke all on table public.meeting_tasks from public, anon, authenticated;
revoke all on table public.meeting_day_alerts from public, anon, authenticated;
revoke all on table public.meeting_alerts from public, anon, authenticated;

grant select on table public.meeting_settings to authenticated;
grant select on table public.meeting_rooms to authenticated;
grant select on table public.meeting_tasks to authenticated;
grant select on table public.meeting_day_alerts to authenticated;
grant select on table public.meeting_alerts to authenticated;
grant select (
  id, hotel, room_id, status, group_name, onsite_phone, starts_at, ends_at,
  setup_min, teardown_min, guaranteed_count, expected_count, setup_style,
  av_projector, av_screen, av_mic, av_speaker, av_flipchart, wifi_code,
  fb_coffee, fb_breakfast, fb_lunch, fb_snacks, dietary_notes, special_notes,
  cleanup_assignee, setup_enabled, setup_lead_min, setup_assignee,
  headcount_ok, av_ok, fb_ok, setup_ok,
  reminder_sent, hour_alert_sent, cleanup_task_id, setup_task_id,
  created_at, updated_at
) on public.meeting_bookings to authenticated;
grant select on table public.meeting_beo to authenticated;

revoke all on function private.meeting_can_calendar() from public, anon;
revoke all on function private.meeting_can_edit() from public, anon;
revoke all on function private.meeting_can_bill() from public, anon;
revoke all on function private.meeting_can_configure() from public, anon;
revoke all on function private.meeting_hotel_ok(text) from public, anon;
revoke all on function private.meeting_billing(bigint) from public, anon;
revoke all on function private.meeting_send_alert(text, text, text, text[], bigint, text, text, text, text) from public, anon;
revoke all on function private.meeting_pick_assignee(text, text) from public, anon;
revoke all on function private.meetings_sweep() from public, anon;
revoke all on function private.meeting_after_booking() from public, anon;
revoke all on function private.meeting_save_room(bigint, text, text, integer, text[], boolean) from public, anon;
revoke all on function private.meeting_save_settings(text, integer) from public, anon;
revoke all on function private.meeting_save_booking(bigint, text, bigint, text, text, text, timestamptz, timestamptz, integer, integer, integer, integer, text, boolean, boolean, boolean, boolean, boolean, text, boolean, boolean, boolean, boolean, text, text, text, text, boolean, integer, text) from public, anon;
revoke all on function private.meeting_set_check(bigint, text, boolean) from public, anon;
revoke all on function public.meeting_save_room(bigint, text, text, integer, text[], boolean) from public, anon;
revoke all on function public.meeting_save_settings(text, integer) from public, anon;
revoke all on function public.meeting_save_booking(bigint, text, bigint, text, text, text, timestamptz, timestamptz, integer, integer, integer, integer, text, boolean, boolean, boolean, boolean, boolean, text, boolean, boolean, boolean, boolean, text, text, text, text, boolean, integer, text) from public, anon;
revoke all on function public.meeting_set_check(bigint, text, boolean) from public, anon;

grant execute on function private.meeting_can_calendar() to authenticated;
grant execute on function private.meeting_can_edit() to authenticated;
grant execute on function private.meeting_can_bill() to authenticated;
grant execute on function private.meeting_can_configure() to authenticated;
grant execute on function private.meeting_hotel_ok(text) to authenticated;
grant execute on function private.meeting_billing(bigint) to authenticated;
grant execute on function private.meeting_send_alert(text, text, text, text[], bigint, text, text, text, text) to authenticated;
grant execute on function private.meeting_pick_assignee(text, text) to authenticated;
grant execute on function private.meetings_sweep() to authenticated;
grant execute on function private.meeting_after_booking() to authenticated;
grant execute on function private.meeting_save_room(bigint, text, text, integer, text[], boolean) to authenticated;
grant execute on function private.meeting_save_settings(text, integer) to authenticated;
grant execute on function private.meeting_save_booking(bigint, text, bigint, text, text, text, timestamptz, timestamptz, integer, integer, integer, integer, text, boolean, boolean, boolean, boolean, boolean, text, boolean, boolean, boolean, boolean, text, text, text, text, boolean, integer, text) to authenticated;
grant execute on function private.meeting_set_check(bigint, text, boolean) to authenticated;
grant execute on function public.meeting_save_room(bigint, text, text, integer, text[], boolean) to authenticated;
grant execute on function public.meeting_save_settings(text, integer) to authenticated;
grant execute on function public.meeting_save_booking(bigint, text, bigint, text, text, text, timestamptz, timestamptz, integer, integer, integer, integer, text, boolean, boolean, boolean, boolean, boolean, text, boolean, boolean, boolean, boolean, text, text, text, text, boolean, integer, text) to authenticated;
grant execute on function public.meeting_set_check(bigint, text, boolean) to authenticated;

-- Let the shared hotel switch persist "meetings". A missing row still means on.
do $$
declare
  r record;
begin
  if to_regclass('public.hotel_features') is null then
    return;
  end if;
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'hotel_features'
      and c.contype = 'c'
      and pg_catalog.pg_get_constraintdef(c.oid) ilike '%feature%'
  loop
    execute format('alter table public.hotel_features drop constraint %I', r.conname);
  end loop;
  alter table public.hotel_features
    add constraint hotel_features_feature_check
    check (feature in ('parking', 'sales_leads', 'greetings', 'guest_scores', 'shuttle', 'meetings'));
  insert into public.hotel_features (hotel, feature, enabled)
  select h.hotel, 'meetings', true
  from (values ('MSPWE'), ('MSPAM'), ('MSPMS')) as h(hotel)
  on conflict (hotel, feature) do nothing;
end $$;

create or replace function private.set_hotel_feature(
  p_hotel text,
  p_feature text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.hotel_feature_is_corporate() then
    raise exception 'not allowed';
  end if;
  if p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if p_feature not in ('parking', 'sales_leads', 'greetings', 'guest_scores', 'shuttle', 'meetings') then
    raise exception 'unknown feature';
  end if;
  insert into public.hotel_features (hotel, feature, enabled, updated_by, updated_at)
  values (p_hotel, p_feature, coalesce(p_enabled, true), (select auth.uid()), pg_catalog.now())
  on conflict (hotel, feature) do update
    set enabled = excluded.enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'meetings-sweep') then
      perform cron.unschedule('meetings-sweep');
    end if;
    perform cron.schedule('meetings-sweep', '*/15 * * * *', 'select private.meetings_sweep()');
  end if;
end $$;

