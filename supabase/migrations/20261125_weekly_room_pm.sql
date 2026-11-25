-- Weekly room PM pacing. Additive only.
-- Does not delete or rewrite existing pm_tasks history.
-- Room batches use pace_schedule_id and leave schedule_id null, so the
-- one-open-task-per-schedule index and the last_completed trigger stay as
-- they are. Quarter progress is a completed task in the current quarter,
-- not pm_schedules.last_completed / next_due.
-- pg_cron is UTC. 15 11 * * 1 is 5:15 AM CST / 6:15 AM CDT on Monday.
-- Does not read or write hotelkey_live_room_status or rooms. Those stay
-- read-only for the app: HotelKey codes flag the batch and order swaps.

alter table public.pm_tasks
  add column if not exists pace_schedule_id bigint references public.pm_schedules(id),
  add column if not exists pace_week date;

comment on column public.pm_tasks.pace_schedule_id is
  'Quarterly room program this task belongs to. Null schedule_id keeps the open-task unique index and the last_completed trigger off a single room.';
comment on column public.pm_tasks.pace_week is
  'Monday of the week this room was assigned. The batch size does not change when the room is swapped.';

create index if not exists pm_tasks_pace_week_idx
  on public.pm_tasks (pace_schedule_id, pace_week)
  where pace_schedule_id is not null;

create unique index if not exists pm_tasks_open_pace_room_uq
  on public.pm_tasks (pace_schedule_id, asset)
  where (not done) and pace_schedule_id is not null;

create or replace function private.run_weekly_room_pms(p_as_of date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $weekly$
declare
  v_today date := coalesce(p_as_of, (pg_catalog.now() at time zone 'America/Chicago')::date);
  v_monday date := v_today - (pg_catalog.extract(isodow from v_today)::int - 1);
  v_q0 date := pg_catalog.date_trunc('quarter', v_today)::date;
  v_q1 date := (v_q0 + interval '3 months' - interval '1 day')::date;
  v_weeks int;
  v_created int := 0;
  v_total int;
  v_done int;
  v_open int;
  v_left int;
  v_batch int;
  v_room text;
  v_user uuid;
  v_task bigint;
  v_due date;
  s record;
  n record;
begin
  if v_monday > v_q1 then
    return 0;
  end if;
  v_weeks := ((v_q1 - v_monday) / 7) + 1;
  if v_weeks < 1 then
    v_weeks := 1;
  end if;
  v_due := v_monday + 6;
  if v_due > v_q1 then
    v_due := v_q1;
  end if;

  for s in
    select sch.id, sch.hotel_id, sch.title_es, sch.checklist, sch.kind
    from public.pm_schedules sch
    where sch.active
      and sch.frequency = 'quarterly'
      and exists (
        select 1 from public.pm_tasks t
        where t.schedule_id = sch.id
          and t.asset ~ '^[0-9]+$'
      )
  loop
    if exists (
      select 1 from public.pm_tasks t
      where t.pace_schedule_id = s.id
        and t.pace_week = v_monday
    ) then
      continue;
    end if;

    select count(*) into v_total from (
      select r.room_number as room
      from public.rooms r
      where r.hotel_id = s.hotel_id
        and r.room_number ~ '^[0-9]+$'
      union
      select t.asset
      from public.pm_tasks t
      where t.hotel_id = s.hotel_id
        and t.asset ~ '^[0-9]+$'
        and (t.schedule_id = s.id or t.pace_schedule_id = s.id)
    ) u;

    if v_total = 0 then
      continue;
    end if;

    select count(*) into v_done from (
      select distinct t.asset
      from public.pm_tasks t
      where t.hotel_id = s.hotel_id
        and t.done
        and t.asset ~ '^[0-9]+$'
        and (t.schedule_id = s.id or t.pace_schedule_id = s.id)
        and (t.completed_at at time zone 'America/Chicago')::date between v_q0 and v_q1
    ) d;

    v_left := v_total - v_done;
    if v_left < 0 then
      v_left := 0;
    end if;
    select count(*) into v_open from (
      select distinct t.asset
      from public.pm_tasks t
      where t.pace_schedule_id = s.id
        and not t.done
        and t.asset ~ '^[0-9]+$'
    ) o;
    -- Open rooms from earlier weeks already count toward this week's pace.
    v_batch := pg_catalog.ceil(v_left::numeric / v_weeks)::int - coalesce(v_open, 0);
    if v_batch < 1 then
      continue;
    end if;

    for v_room in
      select u.room
      from (
        select r.room_number as room
        from public.rooms r
        where r.hotel_id = s.hotel_id
          and r.room_number ~ '^[0-9]+$'
        union
        select t.asset
        from public.pm_tasks t
        where t.hotel_id = s.hotel_id
          and t.asset ~ '^[0-9]+$'
          and (t.schedule_id = s.id or t.pace_schedule_id = s.id)
      ) u
      where not exists (
        select 1 from public.pm_tasks t
        where t.hotel_id = s.hotel_id
          and t.asset = u.room
          and t.done
          and (t.schedule_id = s.id or t.pace_schedule_id = s.id)
          and (t.completed_at at time zone 'America/Chicago')::date between v_q0 and v_q1
      )
      and not exists (
        select 1 from public.pm_tasks t
        where t.pace_schedule_id = s.id
          and not t.done
          and t.asset = u.room
      )
      order by u.room::int, u.room
      limit v_batch
    loop
      select p.user_id into v_user
      from public.profiles p
      left join public.pm_tasks t
        on t.assigned_to = p.user_id
       and t.hotel_id = s.hotel_id
       and not t.done
      where p.hotel_id = s.hotel_id
        and p.role = 'maintenance'::public.app_role
        and p.active
      group by p.user_id
      order by count(t.id), p.user_id
      limit 1;

      v_task := null;
      insert into public.pm_tasks (
        hotel_id, department, asset, frequency, due_date, assigned_to,
        checklist, done, kind, title_es, pace_schedule_id, pace_week
      ) values (
        s.hotel_id, 'maintenance', v_room, 'quarterly', v_due, v_user,
        coalesce(s.checklist, '[]'::jsonb), false, coalesce(s.kind, 'general'), s.title_es,
        s.id, v_monday
      )
      on conflict (pace_schedule_id, asset) where (not done) and pace_schedule_id is not null
      do nothing
      returning id into v_task;
      if v_task is not null then
        v_created := v_created + 1;
      end if;
    end loop;

    if pg_catalog.to_regprocedure('private.queue_notification(text,text,bigint)') is not null then
      for n in
        select assigned_to, min(id) as id
        from public.pm_tasks
        where pace_schedule_id = s.id
          and pace_week = v_monday
          and assigned_to is not null
        group by assigned_to
      loop
        perform private.queue_notification('pm_assigned', s.hotel_id, n.id);
      end loop;
    end if;
  end loop;

  return v_created;
end;
$weekly$;

revoke all on function private.run_weekly_room_pms(date) from public, anon, authenticated;

create or replace function public.swap_room_pm(p_task_id bigint, p_room text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $swap$
declare
  t public.pm_tasks;
  v_room text := btrim(coalesce(p_room, ''));
  v_from text;
  q_start date;
  q_end date;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  if v_room !~ '^[0-9]+$' then
    raise exception 'room required';
  end if;
  select * into t from public.pm_tasks where id = p_task_id;
  if not found or t.done or t.pace_schedule_id is null then
    raise exception 'not allowed';
  end if;
  if t.asset = v_room then
    raise exception 'same room';
  end if;
  q_start := pg_catalog.date_trunc('quarter', coalesce(t.pace_week, (pg_catalog.now() at time zone 'America/Chicago')::date))::date;
  q_end := (q_start + interval '3 months' - interval '1 day')::date;
  if exists (
    select 1 from public.pm_tasks p
    where p.hotel_id = t.hotel_id
      and p.asset = v_room
      and p.done
      and coalesce(p.pace_schedule_id, p.schedule_id) = t.pace_schedule_id
      and (p.completed_at at time zone 'America/Chicago')::date between q_start and q_end
  ) then
    raise exception 'already done';
  end if;
  if exists (
    select 1 from public.pm_tasks p
    where p.pace_schedule_id = t.pace_schedule_id
      and p.asset = v_room
      and not p.done
      and p.id <> t.id
  ) then
    raise exception 'already assigned';
  end if;
  v_from := t.asset;
  update public.pm_tasks
    set asset = v_room
    where id = t.id
      and not done;
  if not found then
    raise exception 'not allowed';
  end if;
  insert into public.audit_log (hotel_id, hotel, entity, entity_id, action, before, after)
  values (
    t.hotel_id,
    t.hotel_id,
    'pm_task',
    t.id::text,
    'swap_room',
    pg_catalog.jsonb_build_object('room', v_from),
    pg_catalog.jsonb_build_object('room', v_room, 'reason', 'occupied')
  );
  return pg_catalog.jsonb_build_object('ok', true, 'from', v_from, 'to', v_room, 'reason', 'occupied');
end;
$swap$;

revoke all on function public.swap_room_pm(bigint, text) from public, anon;
grant execute on function public.swap_room_pm(bigint, text) to authenticated;

do $cron$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'pm-weekly-rooms') then
      perform cron.unschedule('pm-weekly-rooms');
    end if;
    perform cron.schedule('pm-weekly-rooms', '15 11 * * 1', 'select private.run_weekly_room_pms()');
  end if;
end $cron$;
