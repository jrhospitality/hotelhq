-- Daily checklist and property-walk assignment. Additive only.
-- Does not delete, drop, or rewrite checklist_runs, property_walks, or
-- existing checklist_templates rows. A blank shift column means every
-- shift in that department. Seasonal, weekly, monthly, and yearly
-- templates are not assigned here.
--
-- Working that day comes from a published schedule_shifts row. When a
-- person has no published shift that date, the first time_punches
-- clock-in assigns the same lists (on-punch trigger).
--
-- The property walk is one shared job for the GM and AGM who are
-- working. Either assigned manager can complete it, and that completion
-- closes it for every assignee that day.
--
-- Golden Valley's GM is not in Hotel Effectiveness. daily_assign_settings
-- .walk_weekday_fallback assigns the walk to a hotel's GM and AGM on
-- weekdays only when that person has no schedule_shifts rows at all.
-- MSPWE starts with the fallback on. Other hotels stay off until
-- set_walk_weekday_fallback is called. A person who has schedule data
-- but is off today is not covered by the fallback.
--
-- pg_cron is UTC. 20 11 * * * is 5:20 AM CST / 6:20 AM CDT, the same
-- early-morning Chicago hour as pm-daily (0 11 * * *).

alter table public.checklist_templates
  add column if not exists shift text;

comment on column public.checklist_templates.shift is
  'Shift bucket for daily assignment: AM, PM, or Night Audit. Blank assigns every shift in the department.';

create table if not exists public.daily_assign_settings (
  hotel_id text primary key references public.hotels (id),
  walk_weekday_fallback boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.daily_assign_settings is
  'Per-hotel daily assignment switches. walk_weekday_fallback assigns the property walk to a GM or AGM on Monday-Friday when that person has no schedule rows.';

insert into public.daily_assign_settings (hotel_id, walk_weekday_fallback)
select 'MSPWE', true
where exists (select 1 from public.hotels h where h.id = 'MSPWE')
on conflict (hotel_id) do nothing;

create table if not exists public.daily_assignments (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  work_date date not null,
  kind text not null,
  template_id bigint references public.checklist_templates (id),
  employee uuid references public.profiles (user_id),
  department text,
  shift text,
  due_at timestamptz,
  source text not null,
  completed_at timestamptz,
  completed_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_assignments_kind_check'
      and conrelid = 'public.daily_assignments'::regclass
  ) then
    alter table public.daily_assignments
      add constraint daily_assignments_kind_check
      check (kind in ('checklist', 'walk'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_assignments_source_check'
      and conrelid = 'public.daily_assignments'::regclass
  ) then
    alter table public.daily_assignments
      add constraint daily_assignments_source_check
      check (source in ('schedule', 'punch', 'weekday_fallback'));
  end if;
end $$;

comment on table public.daily_assignments is
  'One checklist row per person, template, and date. One property-walk row per GM or AGM who is working that date. Completing any walk row closes every walk row for that hotel and date.';

create unique index if not exists daily_assignments_person_template_date_uq
  on public.daily_assignments (employee, template_id, work_date)
  where kind = 'checklist' and employee is not null and template_id is not null;

create unique index if not exists daily_assignments_walk_person_date_uq
  on public.daily_assignments (hotel_id, employee, work_date)
  where kind = 'walk' and employee is not null;

create index if not exists daily_assignments_hotel_date_idx
  on public.daily_assignments (hotel_id, work_date);

create index if not exists daily_assignments_employee_date_idx
  on public.daily_assignments (employee, work_date);

create index if not exists daily_assignments_template_id_idx
  on public.daily_assignments (template_id);

create index if not exists daily_assignments_completed_by_idx
  on public.daily_assignments (completed_by);

create index if not exists schedule_shifts_employee_date_pub_idx
  on public.schedule_shifts (employee, shift_date)
  where published and employee is not null;

create index if not exists time_punches_employee_date_in_idx
  on public.time_punches (employee, work_date)
  where punch_in is not null and employee is not null;

create or replace function private.norm_shift(p_shift text)
returns text
language sql
immutable
set search_path = ''
as $norm_shift$
  select case lower(btrim(coalesce(p_shift, '')))
    when '' then ''
    when 'any' then ''
    when 'all' then ''
    when 'am' then 'AM'
    when '1st' then 'AM'
    when '1' then 'AM'
    when 'morning' then 'AM'
    when 'pm' then 'PM'
    when '2nd' then 'PM'
    when '2' then 'PM'
    when 'afternoon' then 'PM'
    when 'night' then 'Night Audit'
    when 'night audit' then 'Night Audit'
    when 'audit' then 'Night Audit'
    when '3rd' then 'Night Audit'
    when '3' then 'Night Audit'
    when 'na' then 'Night Audit'
    when 'overnight' then 'Night Audit'
    else btrim(p_shift)
  end
$norm_shift$;

create or replace function private.shift_bucket(p_time time)
returns text
language sql
immutable
set search_path = ''
as $shift_bucket$
  select case
    when p_time is null then ''
    when p_time >= time '05:00' and p_time < time '14:00' then 'AM'
    when p_time >= time '14:00' and p_time < time '22:00' then 'PM'
    else 'Night Audit'
  end
$shift_bucket$;

create or replace function private.norm_dept(p_dept text)
returns text
language sql
immutable
set search_path = ''
as $norm_dept$
  select case lower(btrim(coalesce(p_dept, '')))
    when 'front desk' then 'front_desk'
    when 'housekeeping' then 'housekeeping'
    when 'hk lead' then 'housekeeping'
    when 'housekeeper' then 'housekeeping'
    when 'maintenance' then 'maintenance'
    when 'shuttle' then 'shuttle'
    when 'shuttle driver' then 'shuttle'
    when 'house person' then 'house_person'
    when 'houseperson' then 'house_person'
    when 'laundry' then 'laundry'
    when 'laundry attendant' then 'laundry'
    when 'breakfast' then 'breakfast'
    when 'breakfast attendant' then 'breakfast'
    when 'bar' then 'bar'
    when 'bartender' then 'bar'
    when 'management' then 'management'
    when 'gm' then 'management'
    else lower(replace(btrim(coalesce(p_dept, '')), ' ', '_'))
  end
$norm_dept$;

revoke all on function private.norm_shift(text) from public, anon, authenticated;
revoke all on function private.shift_bucket(time) from public, anon, authenticated;
revoke all on function private.norm_dept(text) from public, anon, authenticated;

create or replace function private.run_daily_assignments(
  p_as_of date default null,
  p_employee uuid default null,
  p_hotel text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $assign$
declare
  v_today date := coalesce(p_as_of, (pg_catalog.now() at time zone 'America/Chicago')::date);
  v_created integer := 0;
  r record;
begin
  for r in
    insert into public.daily_assignments (
      hotel_id, work_date, kind, template_id, employee, department, shift, due_at, source
    )
    select distinct on (m.employee, m.template_id)
      m.hotel_id, v_today, 'checklist', m.template_id, m.employee, m.department, m.shift, m.due_at, m.source
    from (
      select
        w.hotel_id,
        w.employee,
        t.id as template_id,
        w.department,
        private.shift_bucket(w.start_time) as shift,
        (
          (v_today + w.end_time)
          + case when w.end_time <= w.start_time then interval '1 day' else interval '0' end
        ) at time zone 'America/Chicago' as due_at,
        w.source
      from (
        select
          s.hotel_id,
          s.employee,
          private.norm_dept(s.department) as department,
          s.start_time,
          s.end_time,
          'schedule'::text as source
        from public.schedule_shifts s
        where s.published
          and s.employee is not null
          and s.shift_date = v_today
          and (p_employee is null or s.employee = p_employee)
          and (p_hotel is null or s.hotel_id = p_hotel)
        union all
        select
          tp.hotel_id,
          tp.employee,
          private.norm_dept(coalesce(nullif(btrim(tp.department), ''), private.role_dept(pr.role))) as department,
          (tp.punch_in at time zone 'America/Chicago')::time as start_time,
          case private.shift_bucket((tp.punch_in at time zone 'America/Chicago')::time)
            when 'AM' then time '15:00'
            when 'PM' then time '23:00'
            else time '07:00'
          end as end_time,
          'punch'::text as source
        from (
          select distinct on (p.employee, p.hotel_id)
            p.hotel_id, p.employee, p.department, p.punch_in
          from public.time_punches p
          where p.employee is not null
            and p.punch_in is not null
            and p.work_date = v_today
            and (p_employee is null or p.employee = p_employee)
            and (p_hotel is null or p.hotel_id = p_hotel)
          order by p.employee, p.hotel_id, p.punch_in
        ) tp
        join public.profiles pr on pr.user_id = tp.employee and pr.active
        where not exists (
          select 1 from public.schedule_shifts s
          where s.employee = tp.employee
            and s.hotel_id = tp.hotel_id
            and s.shift_date = v_today
            and s.published
        )
      ) w
      join public.profiles pr on pr.user_id = w.employee and pr.active
      join public.checklist_templates t
        on t.hotel_id = w.hotel_id
       and coalesce(t.active, true)
       and coalesce(t.kind, 'daily') = 'daily'
       and coalesce(t.cadence, 'daily') in ('daily', 'per_shift')
       and private.norm_dept(t.department) = w.department
       and (
         private.norm_shift(t.shift) = ''
         or private.norm_shift(t.shift) = private.norm_shift(private.shift_bucket(w.start_time))
       )
       and (t.auto_assign_role is null or t.auto_assign_role = pr.role)
      where w.department <> ''
    ) m
    order by m.employee, m.template_id, m.due_at desc
    on conflict do nothing
    returning id, hotel_id, completed_at
  loop
    v_created := v_created + 1;
    if r.completed_at is null
      and pg_catalog.to_regprocedure('private.queue_notification(text,text,bigint)') is not null then
      perform private.queue_notification('daily_assigned', r.hotel_id, r.id);
    end if;
  end loop;

  for r in
    insert into public.daily_assignments (
      hotel_id, work_date, kind, template_id, employee, department, shift, due_at, source,
      completed_at, completed_by
    )
    select distinct on (c.hotel_id, c.employee)
      c.hotel_id,
      v_today,
      'walk',
      null,
      c.employee,
      'management',
      private.shift_bucket(c.start_time),
      (
        (v_today + c.end_time)
        + case when c.end_time <= c.start_time then interval '1 day' else interval '0' end
      ) at time zone 'America/Chicago',
      c.source,
      done.completed_at,
      done.completed_by
    from (
      select
        l.user_id as employee,
        l.hotel_id,
        s.start_time,
        s.end_time,
        'schedule'::text as source,
        0 as rank
      from public.profiles l
      join public.schedule_shifts s
        on s.employee = l.user_id
       and s.hotel_id = l.hotel_id
       and s.shift_date = v_today
       and s.published
      where l.active
        and l.role in ('gm'::public.app_role, 'agm'::public.app_role)
        and l.hotel_id is not null
        and (p_employee is null or l.user_id = p_employee)
        and (p_hotel is null or l.hotel_id = p_hotel)
      union all
      select
        l.user_id,
        l.hotel_id,
        (tp.punch_in at time zone 'America/Chicago')::time,
        case private.shift_bucket((tp.punch_in at time zone 'America/Chicago')::time)
          when 'AM' then time '15:00'
          when 'PM' then time '23:00'
          else time '07:00'
        end,
        'punch'::text,
        1
      from public.profiles l
      join lateral (
        select p.punch_in
        from public.time_punches p
        where p.employee = l.user_id
          and p.hotel_id = l.hotel_id
          and p.work_date = v_today
          and p.punch_in is not null
        order by p.punch_in
        limit 1
      ) tp on true
      where l.active
        and l.role in ('gm'::public.app_role, 'agm'::public.app_role)
        and l.hotel_id is not null
        and (p_employee is null or l.user_id = p_employee)
        and (p_hotel is null or l.hotel_id = p_hotel)
        and not exists (
          select 1 from public.schedule_shifts s
          where s.employee = l.user_id
            and s.hotel_id = l.hotel_id
            and s.shift_date = v_today
            and s.published
        )
      union all
      select
        l.user_id,
        l.hotel_id,
        time '08:00',
        time '17:00',
        'weekday_fallback'::text,
        2
      from public.profiles l
      join public.daily_assign_settings cfg
        on cfg.hotel_id = l.hotel_id
       and cfg.walk_weekday_fallback
      where l.active
        and l.role in ('gm'::public.app_role, 'agm'::public.app_role)
        and l.hotel_id is not null
        and (v_today - date '2000-01-03') % 7 between 0 and 4
        and (p_employee is null or l.user_id = p_employee)
        and (p_hotel is null or l.hotel_id = p_hotel)
        and not exists (
          select 1 from public.schedule_shifts s
          where s.employee = l.user_id
        )
        and not exists (
          select 1 from public.schedule_shifts s
          where s.employee = l.user_id
            and s.hotel_id = l.hotel_id
            and s.shift_date = v_today
            and s.published
        )
        and not exists (
          select 1 from public.time_punches p
          where p.employee = l.user_id
            and p.hotel_id = l.hotel_id
            and p.work_date = v_today
            and p.punch_in is not null
        )
    ) c
    left join lateral (
      select d.completed_at, d.completed_by
      from public.daily_assignments d
      where d.hotel_id = c.hotel_id
        and d.work_date = v_today
        and d.kind = 'walk'
        and d.completed_at is not null
      order by d.completed_at
      limit 1
    ) done on true
    order by c.hotel_id, c.employee, c.rank, c.end_time desc
    on conflict do nothing
    returning id, hotel_id, completed_at
  loop
    v_created := v_created + 1;
    if r.completed_at is null
      and pg_catalog.to_regprocedure('private.queue_notification(text,text,bigint)') is not null then
      perform private.queue_notification('daily_assigned', r.hotel_id, r.id);
    end if;
  end loop;

  return v_created;
end
$assign$;

comment on function private.run_daily_assignments(date, uuid, text) is
  'Assigns daily checklist_templates by department and shift, and the property walk to the GM or AGM who is working. Schedule first. Punch when that person has no published shift that date. Weekday GM/AGM walk fallback only where daily_assign_settings.walk_weekday_fallback is on and that person has no schedule rows.';

revoke all on function private.run_daily_assignments(date, uuid, text) from public, anon, authenticated;

create or replace function private.trg_daily_assign_punch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $punch$
begin
  if new.employee is null or new.punch_in is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.punch_in is not distinct from new.punch_in then
    return new;
  end if;
  begin
    perform private.run_daily_assignments(
      coalesce(new.work_date, (new.punch_in at time zone 'America/Chicago')::date),
      new.employee,
      new.hotel_id
    );
  exception when others then
    raise warning 'daily assign punch: %', sqlerrm;
  end;
  return new;
end
$punch$;

revoke all on function private.trg_daily_assign_punch() from public, anon, authenticated;

drop trigger if exists daily_assign_punch on public.time_punches;
create trigger daily_assign_punch
  after insert or update of punch_in on public.time_punches
  for each row
  execute function private.trg_daily_assign_punch();

create or replace function public.complete_daily_assignment(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $complete$
declare
  r public.daily_assignments;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not allowed';
  end if;
  select * into r from public.daily_assignments where id = p_id;
  if not found then
    raise exception 'not allowed';
  end if;
  if r.kind = 'walk' then
    if not (select private.is_above()) and not exists (
      select 1 from public.daily_assignments d
      where d.hotel_id = r.hotel_id
        and d.work_date = r.work_date
        and d.kind = 'walk'
        and d.employee = uid
    ) then
      raise exception 'not allowed';
    end if;
    update public.daily_assignments
      set completed_at = pg_catalog.now(), completed_by = uid
      where hotel_id = r.hotel_id
        and work_date = r.work_date
        and kind = 'walk'
        and completed_at is null;
  else
    if r.employee is distinct from uid and not (select private.is_above()) then
      raise exception 'not allowed';
    end if;
    update public.daily_assignments
      set completed_at = pg_catalog.now(), completed_by = uid
      where id = r.id
        and completed_at is null;
  end if;
  return pg_catalog.jsonb_build_object('ok', true, 'kind', r.kind, 'hotel_id', r.hotel_id, 'work_date', r.work_date);
end
$complete$;

comment on function public.complete_daily_assignment(bigint) is
  'The assignee marks a checklist done. Either assigned GM or AGM marks the property walk done for every assignee that day.';

revoke all on function public.complete_daily_assignment(bigint) from public, anon;
grant execute on function public.complete_daily_assignment(bigint) to authenticated;

create or replace function public.set_walk_weekday_fallback(p_hotel text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $fallback$
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  if not (select private.is_above()) and not (select private.is_mgr_of(p_hotel)) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.hotels h where h.id = p_hotel) then
    raise exception 'not allowed';
  end if;
  insert into public.daily_assign_settings (hotel_id, walk_weekday_fallback, updated_at)
  values (p_hotel, coalesce(p_enabled, false), pg_catalog.now())
  on conflict (hotel_id) do update
    set walk_weekday_fallback = excluded.walk_weekday_fallback,
        updated_at = pg_catalog.now();
end
$fallback$;

comment on function public.set_walk_weekday_fallback(text, boolean) is
  'GM, AGM, or above-property switch for weekday property-walk assignment when a manager has no schedule data.';

revoke all on function public.set_walk_weekday_fallback(text, boolean) from public, anon;
grant execute on function public.set_walk_weekday_fallback(text, boolean) to authenticated;

alter table public.daily_assignments enable row level security;
alter table public.daily_assign_settings enable row level security;

drop policy if exists daily_assignments_read on public.daily_assignments;
create policy daily_assignments_read on public.daily_assignments
  for select to authenticated
  using (
    employee = (select auth.uid())
    or (select private.is_mgr_of(hotel_id))
  );

drop policy if exists daily_assign_settings_read on public.daily_assign_settings;
create policy daily_assign_settings_read on public.daily_assign_settings
  for select to authenticated
  using ((select private.is_mgr_of(hotel_id)));

revoke all on table public.daily_assignments from public, anon, authenticated;
grant select on table public.daily_assignments to authenticated;

revoke all on table public.daily_assign_settings from public, anon, authenticated;
grant select on table public.daily_assign_settings to authenticated;

do $cron$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'daily-assign') then
      perform cron.unschedule('daily-assign');
    end if;
    perform cron.schedule('daily-assign', '20 11 * * *', 'select private.run_daily_assignments()');
  end if;
end
$cron$;
