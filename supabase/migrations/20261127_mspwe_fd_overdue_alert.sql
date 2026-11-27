-- Tell the Golden Valley GM once when an assigned MSPWE checklist passes
-- its due time unfinished. Additive only. No email. Push uses the existing
-- queue_notification path when that function is installed. In-app alerts
-- read notifications.title and notifications.body.

create table if not exists public.checklist_overdue_notices (
  assignment_id bigint primary key references public.daily_assignments (id),
  hotel_id text not null,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.checklist_overdue_notices is
  'One row per daily assignment after the Golden Valley GM has been told it is overdue. The primary key stops a repeat.';

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
  r record;
  v_name text;
  v_list text;
  v_due text;
  v_title text;
  v_body text;
  nid bigint;
begin
  for r in
    select d.id, d.hotel_id, d.employee, d.template_id, d.due_at
    from public.daily_assignments d
    where d.hotel_id = 'MSPWE'
      and d.kind = 'checklist'
      and d.completed_at is null
      and d.due_at is not null
      and d.due_at <= pg_catalog.now()
      and not exists (
        select 1 from public.checklist_overdue_notices n
        where n.assignment_id = d.id
      )
  loop
    insert into public.checklist_overdue_notices (assignment_id, hotel_id)
    values (r.id, r.hotel_id)
    on conflict (assignment_id) do nothing;
    if not found then
      continue;
    end if;
    select pr.name into v_name
    from public.profiles pr
    where pr.user_id = r.employee;
    select t.name into v_list
    from public.checklist_templates t
    where t.id = r.template_id;
    v_due := pg_catalog.to_char(r.due_at at time zone 'America/Chicago', 'FMHH12:MI AM');
    v_title := 'Checklist not finished';
    v_body := pg_catalog.concat_ws(' · ',
      nullif(btrim(coalesce(v_name, '')), ''),
      coalesce(nullif(btrim(coalesce(v_list, '')), ''), 'Checklist'),
      'Due ' || v_due
    );
    nid := null;
    if pg_catalog.to_regprocedure('private.queue_notification(text,text,bigint)') is not null then
      nid := private.queue_notification('checklist_overdue', r.hotel_id, r.id);
    end if;
    if nid is not null then
      update public.notifications
        set title = v_title,
            body = v_body
        where id = nid;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end
$overdue$;

comment on function private.notify_mspwe_overdue_checklists() is
  'Once per unfinished Golden Valley checklist, after due_at, alerts the MSPWE GM in the app and by push. No email.';

revoke all on function private.notify_mspwe_overdue_checklists() from public, anon, authenticated;

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
