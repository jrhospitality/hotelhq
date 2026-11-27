-- Golden Valley front desk shift pick and drawer counts on live. Additive only.
-- Does not drop a table, column, or row, and does not update existing rows.
-- Widening daily_assignments_source_check drops and recreates that check
-- only, so 'asked' is allowed beside schedule, punch, and weekday_fallback.
-- private.shift_bucket is unchanged. Other hotels and departments keep it.
-- Apply this file once. Demo mode does not call it.
--
-- Order for MSPWE front desk only: a published schedule_shifts start, then
-- the first time_punches clock-in, then public.shift_selections from
-- "Which shift are you working?". Windows (America/Chicago): 5:00 AM-12:59 PM
-- AM, 1:00 PM-8:59 PM PM, 9:00 PM-4:59 AM Night Audit. A picked shift starts
-- at 7:00 AM, 3:00 PM, or 11:00 PM and is due at 3:00 PM, 11:00 PM, or
-- 7:00 AM the next day. One front-desk checklist per person per shift-day.
-- A drawer variance is stored by the existing log_cash_count. This file
-- does not email or push.

alter table public.daily_assignments drop constraint if exists daily_assignments_source_check;
alter table public.daily_assignments add constraint daily_assignments_source_check
  check (source in ('schedule', 'punch', 'weekday_fallback', 'asked'));

comment on column public.daily_assignments.source is
  'schedule, punch, weekday_fallback, or asked. asked is a Golden Valley front desk login answer.';

create unique index if not exists daily_assignments_mspwe_fd_one_uq
  on public.daily_assignments (employee, hotel_id, work_date)
  where kind = 'checklist'
    and hotel_id = 'MSPWE'
    and department = 'front_desk'
    and employee is not null;

create table if not exists public.shift_selections (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (user_id),
  hotel_id text not null references public.hotels (id),
  work_date date not null,
  shift text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint shift_selections_shift_check check (shift in ('AM', 'PM', 'Night Audit')),
  constraint shift_selections_hotel_check check (hotel_id = 'MSPWE')
);

comment on table public.shift_selections is
  'Staff, hotel, date, and shift chosen at login when Golden Valley front desk has no published shift and no clock-in. One row per person per day. The first answer stays.';

create unique index if not exists shift_selections_person_day_uq
  on public.shift_selections (user_id, hotel_id, work_date);

create index if not exists shift_selections_hotel_date_idx
  on public.shift_selections (hotel_id, work_date);

alter table public.shift_selections enable row level security;

drop policy if exists shift_selections_read on public.shift_selections;
create policy shift_selections_read on public.shift_selections
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_mgr_of(hotel_id))
  );

revoke all on table public.shift_selections from public, anon, authenticated;
grant select on table public.shift_selections to authenticated;

create or replace function private.mspwe_fd_bucket(p_time time)
returns text
language sql
immutable
set search_path = ''
as $mspwe_fd_bucket$
  select case
    when p_time is null then ''
    when p_time >= time '05:00' and p_time < time '13:00' then 'AM'
    when p_time >= time '13:00' and p_time < time '21:00' then 'PM'
    else 'Night Audit'
  end
$mspwe_fd_bucket$;

create or replace function private.assign_bucket(p_hotel text, p_dept text, p_time time)
returns text
language sql
immutable
set search_path = ''
as $assign_bucket$
  select case
    when p_hotel = 'MSPWE' and private.norm_dept(p_dept) = 'front_desk'
      then private.mspwe_fd_bucket(p_time)
    else private.shift_bucket(p_time)
  end
$assign_bucket$;

create or replace function private.bucket_due(p_date date, p_start time, p_bucket text)
returns timestamptz
language sql
immutable
set search_path = ''
as $bucket_due$
  select (
    (p_date + case p_bucket
      when 'AM' then time '15:00'
      when 'PM' then time '23:00'
      else time '07:00'
    end)
    + case
        when p_bucket is distinct from 'AM'
         and p_bucket is distinct from 'PM'
         and time '07:00' <= p_start
        then interval '1 day'
        else interval '0'
      end
  ) at time zone 'America/Chicago'
$bucket_due$;

revoke all on function private.mspwe_fd_bucket(time) from public, anon, authenticated;
revoke all on function private.assign_bucket(text, text, time) from public, anon, authenticated;
revoke all on function private.bucket_due(date, time, text) from public, anon, authenticated;

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
        private.assign_bucket(w.hotel_id, w.department, w.start_time) as shift,
        case
          when w.hotel_id = 'MSPWE' and w.department = 'front_desk'
            then private.bucket_due(v_today, w.start_time, private.mspwe_fd_bucket(w.start_time))
          else (
            (v_today + w.end_time)
            + case when w.end_time <= w.start_time then interval '1 day' else interval '0' end
          ) at time zone 'America/Chicago'
        end as due_at,
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
        union all
        select
          sel.hotel_id,
          sel.user_id,
          'front_desk'::text,
          case sel.shift
            when 'AM' then time '07:00'
            when 'PM' then time '15:00'
            else time '23:00'
          end,
          case sel.shift
            when 'AM' then time '15:00'
            when 'PM' then time '23:00'
            else time '07:00'
          end,
          'asked'::text
        from public.shift_selections sel
        join public.profiles pr on pr.user_id = sel.user_id and pr.active
        where sel.work_date = v_today
          and sel.hotel_id = 'MSPWE'
          and pr.hotel_id = 'MSPWE'
          and pr.role = 'front_desk'::public.app_role
          and (p_employee is null or sel.user_id = p_employee)
          and (p_hotel is null or sel.hotel_id = p_hotel)
          and not exists (
            select 1 from public.schedule_shifts s
            where s.employee = sel.user_id
              and s.hotel_id = sel.hotel_id
              and s.shift_date = v_today
              and s.published
          )
          and not exists (
            select 1 from public.time_punches p
            where p.employee = sel.user_id
              and p.hotel_id = sel.hotel_id
              and p.work_date = v_today
              and p.punch_in is not null
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
         or private.norm_shift(t.shift) = private.norm_shift(private.assign_bucket(w.hotel_id, w.department, w.start_time))
       )
       and not (
         w.hotel_id = 'MSPWE'
         and w.department = 'front_desk'
         and private.norm_shift(t.shift) = ''
       )
       and (t.auto_assign_role is null or t.auto_assign_role = pr.role)
      where w.department <> ''
    ) m
    order by m.employee, m.template_id, m.due_at desc
    on conflict do nothing
    returning id, hotel_id, completed_at, source
  loop
    v_created := v_created + 1;
    if r.completed_at is null
      and r.source is distinct from 'asked'
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
  'Assigns daily checklist_templates by department and shift, and the property walk to the GM or AGM who is working. Schedule first, then punch. Golden Valley front desk with neither uses shift_selections (asked) and Jay''s windows. Other hotels and departments keep private.shift_bucket.';

revoke all on function private.run_daily_assignments(date, uuid, text) from public, anon, authenticated;

create or replace function public.select_my_shift(p_shift text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $pick$
declare
  uid uuid := (select auth.uid());
  v_hotel text;
  v_role public.app_role;
  v_shift text;
  v_date date := (pg_catalog.now() at time zone 'America/Chicago')::date;
begin
  if uid is null then
    raise exception 'not allowed';
  end if;
  select pr.hotel_id, pr.role into v_hotel, v_role
  from public.profiles pr
  where pr.user_id = uid and pr.active;
  if v_hotel is distinct from 'MSPWE' or v_role is distinct from 'front_desk'::public.app_role then
    raise exception 'not allowed';
  end if;
  v_shift := private.norm_shift(p_shift);
  if v_shift not in ('AM', 'PM', 'Night Audit') then
    raise exception 'shift';
  end if;
  insert into public.shift_selections (user_id, hotel_id, work_date, shift)
  values (uid, v_hotel, v_date, v_shift)
  on conflict (user_id, hotel_id, work_date) do nothing;
  perform private.run_daily_assignments(v_date, uid, v_hotel);
  return pg_catalog.jsonb_build_object('ok', true, 'shift', v_shift, 'work_date', v_date);
end
$pick$;

comment on function public.select_my_shift(text) is
  'Golden Valley front desk saves today''s shift when no schedule or clock-in is published, then assigns that shift''s checklist. The first answer for the day is kept.';

revoke all on function public.select_my_shift(text) from public, anon;
grant execute on function public.select_my_shift(text) to authenticated;
