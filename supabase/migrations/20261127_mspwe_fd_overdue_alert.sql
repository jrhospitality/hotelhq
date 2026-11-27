-- Record each unfinished Golden Valley checklist once, after its due time.
-- The GM, AGM, or JR Corporate sees those rows in the Daily Briefing and
-- acknowledges them there. No push, no email, and no notifications row.
-- Additive only. Safe to run again after the table already exists.

create table if not exists public.checklist_overdue_notices (
  assignment_id bigint primary key references public.daily_assignments (id),
  hotel_id text not null,
  created_at timestamptz not null default pg_catalog.now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles (user_id)
);

alter table public.checklist_overdue_notices
  add column if not exists acknowledged_at timestamptz;

alter table public.checklist_overdue_notices
  add column if not exists acknowledged_by uuid references public.profiles (user_id);

comment on table public.checklist_overdue_notices is
  'One row per Golden Valley checklist that passed its due time unfinished. It stays until a GM, AGM, or JR Corporate acknowledges it.';

comment on column public.checklist_overdue_notices.acknowledged_at is
  'When the missed checklist was acknowledged. Null while it is still on the Daily Briefing.';

comment on column public.checklist_overdue_notices.acknowledged_by is
  'The GM, AGM, or JR Corporate user who acknowledged the missed checklist.';

create index if not exists checklist_overdue_open_idx
  on public.checklist_overdue_notices (hotel_id)
  where acknowledged_at is null;

alter table public.checklist_overdue_notices enable row level security;

revoke all on table public.checklist_overdue_notices from public, anon, authenticated;

create or replace function private.notify_mspwe_overdue_checklists()
returns integer
language plpgsql
security definer
set search_path = ''
as $overdue$
declare
  v_count integer := 0;
begin
  insert into public.checklist_overdue_notices (assignment_id, hotel_id)
  select d.id, d.hotel_id
  from public.daily_assignments d
  where d.hotel_id = 'MSPWE'
    and d.kind = 'checklist'
    and d.completed_at is null
    and d.due_at is not null
    and d.due_at <= pg_catalog.now()
  on conflict (assignment_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$overdue$;

comment on function private.notify_mspwe_overdue_checklists() is
  'Inserts one checklist_overdue_notices row per unfinished Golden Valley checklist after due_at. Does not notify or push.';

revoke all on function private.notify_mspwe_overdue_checklists() from public, anon, authenticated;

create or replace function public.list_mspwe_missed_checklists()
returns table (
  assignment_id bigint,
  person_name text,
  checklist_en text,
  checklist_es text,
  due_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $list$
begin
  if (select auth.uid()) is null or not (select private.is_mgr_of('MSPWE')) then
    raise exception 'not allowed';
  end if;
  return query
  select
    n.assignment_id,
    pr.name,
    coalesce(t.name, 'Checklist'),
    coalesce(t.name_es, t.name, 'Lista'),
    d.due_at
  from public.checklist_overdue_notices n
  join public.daily_assignments d on d.id = n.assignment_id
  left join public.profiles pr on pr.user_id = d.employee
  left join public.checklist_templates t on t.id = d.template_id
  where n.hotel_id = 'MSPWE'
    and n.acknowledged_at is null
  order by d.due_at, n.assignment_id;
end
$list$;

comment on function public.list_mspwe_missed_checklists() is
  'Unacknowledged missed Golden Valley checklists for the MSPWE GM, AGM, or JR Corporate.';

revoke all on function public.list_mspwe_missed_checklists() from public, anon;
grant execute on function public.list_mspwe_missed_checklists() to authenticated;

create or replace function public.acknowledge_mspwe_missed_checklist(p_assignment_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $ack$
begin
  if (select auth.uid()) is null or not (select private.is_mgr_of('MSPWE')) then
    raise exception 'not allowed';
  end if;
  update public.checklist_overdue_notices
    set acknowledged_at = pg_catalog.now(),
        acknowledged_by = (select auth.uid())
    where assignment_id = p_assignment_id
      and hotel_id = 'MSPWE'
      and acknowledged_at is null;
  if not found then
    raise exception 'not allowed';
  end if;
end
$ack$;

comment on function public.acknowledge_mspwe_missed_checklist(bigint) is
  'MSPWE GM, AGM, or JR Corporate acknowledges one missed checklist. Records who and when.';

revoke all on function public.acknowledge_mspwe_missed_checklist(bigint) from public, anon;
grant execute on function public.acknowledge_mspwe_missed_checklist(bigint) to authenticated;

do $cron$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    if exists (select 1 from cron.job where jobname = 'mspwe-checklist-overdue') then
      perform cron.unschedule('mspwe-checklist-overdue');
    end if;
    perform cron.schedule('mspwe-checklist-overdue', '*/15 * * * *', 'select private.notify_mspwe_overdue_checklists()');
  end if;
end
$cron$;
