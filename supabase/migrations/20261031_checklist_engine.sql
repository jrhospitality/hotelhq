-- One checklist engine. Additive only: new columns, a new item-state table,
-- and a security-invoker view over the lists that already exist
-- (winter items, property walks, inspections, deep cleans, checklist runs).
-- Nothing is dropped or deleted. Winter still assigns each October 15 and is
-- due about three weeks later, on November 5, unless a hotel already has its own date.

alter table public.checklist_templates add column if not exists kind text not null default 'daily';
alter table public.checklist_templates add column if not exists assign_month int;
alter table public.checklist_templates add column if not exists assign_day int;
alter table public.checklist_templates add column if not exists due_month int;
alter table public.checklist_templates add column if not exists due_day int;
alter table public.checklist_templates add column if not exists created_by uuid default auth.uid();
alter table public.checklist_templates add column if not exists hotel text generated always as (hotel_id) stored;

alter table public.checklist_templates drop constraint if exists checklist_templates_kind_check;
alter table public.checklist_templates add constraint checklist_templates_kind_check
  check (kind in ('daily', 'seasonal', 'walk', 'room_inspection', 'deep_clean'));

alter table public.checklist_templates drop constraint if exists checklist_templates_season_check;
alter table public.checklist_templates add constraint checklist_templates_season_check
  check (
    kind <> 'seasonal'
    or (
      assign_month between 1 and 12
      and assign_day between 1 and 28
      and due_month between 1 and 12
      and due_day between 1 and 28
    )
  );

alter table public.checklist_runs add column if not exists kind text;
alter table public.checklist_runs add column if not exists period_key text;
alter table public.checklist_runs add column if not exists room text;
alter table public.checklist_runs add column if not exists hotel text generated always as (hotel_id) stored;

create table if not exists public.checklist_item_state (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  hotel text generated always as (hotel_id) stored,
  template_id bigint references public.checklist_templates (id),
  template_key text not null default '',
  period_key text not null,
  item_key text not null,
  room text not null default '',
  status text not null default 'open' check (status in ('open', 'done', 'na')),
  na_reason text,
  note text,
  photo text,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, template_key, period_key, item_key, room),
  check (status <> 'na' or nullif(btrim(na_reason), '') is not null)
);

create index if not exists checklist_item_state_hotel_idx
  on public.checklist_item_state (hotel, period_key);

alter table public.checklist_item_state enable row level security;

drop policy if exists checklist_item_state_read on public.checklist_item_state;
drop policy if exists checklist_item_state_ins on public.checklist_item_state;
drop policy if exists checklist_item_state_upd on public.checklist_item_state;

create policy checklist_item_state_read on public.checklist_item_state
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy checklist_item_state_ins on public.checklist_item_state
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy checklist_item_state_upd on public.checklist_item_state
  for update to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

revoke all on table public.checklist_item_state from public, anon;
grant select, insert, update on table public.checklist_item_state to authenticated;
grant usage, select on sequence public.checklist_item_state_id_seq to authenticated;

-- Seasonal shell. Item text and yearly copies stay in winter_items / winter_seasons.
insert into public.checklist_templates (
  hotel_id, department, name, name_es, cadence, items, source, active,
  kind, assign_month, assign_day, due_month, due_day
)
select h, 'maintenance', 'Winter preparedness', 'Preparación de invierno', 'yearly',
       '[]'::jsonb, 'winter', true, 'seasonal', 10, 15, 11, 5
from (values ('MSPAM'), ('MSPMS'), ('MSPWE')) v(h)
where exists (select 1 from public.hotels x where x.id = v.h)
  and not exists (
    select 1 from public.checklist_templates t
    where t.hotel_id = v.h and t.source = 'winter'
  );

-- assignee_label is added with the quore shared migration. Repeat it so this
-- view still builds if that column was not there yet. No row is rewritten.
alter table public.deep_clean_rooms add column if not exists assignee_label text;

-- Old rows stay where they are. This view only reads them.
create or replace view public.checklist_legacy
with (security_invoker = true) as
select 'seasonal'::text as kind,
       s.hotel_id as hotel,
       s.year::text as period_key,
       i.item_no::text as item_key,
       ''::text as room,
       i.status,
       coalesce(i.note, '') as note,
       coalesce(i.na_reason, '') as na_reason,
       case when i.photo is null or i.photo = '' then '' else 'yes' end as photo,
       s.assign_on,
       s.due_on,
       'winter_items'::text as source
from public.winter_items i
join public.winter_seasons s on s.id = i.season_id
union all
select 'walk',
       w.hotel_id,
       w.walk_date::text,
       w.id::text,
       '',
       'open',
       coalesce(w.notes, ''),
       '',
       '',
       w.walk_date,
       w.walk_date,
       'property_walks'
from public.property_walks w
union all
select 'room_inspection',
       x.hotel_id,
       coalesce(x.inspected_at::date::text, ''),
       x.id::text,
       coalesce(x.room_number, ''),
       'done',
       coalesce(x.notes, ''),
       '',
       '',
       x.inspected_at::date,
       x.inspected_at::date,
       'inspections'
from public.inspections x
union all
select 'deep_clean',
       d.hotel_id,
       coalesce(d.last_done::text, ''),
       d.room,
       d.room,
       case when d.last_done is null then 'open' else 'done' end,
       coalesce(d.assignee_label, ''),
       '',
       '',
       d.last_done,
       d.last_done,
       'deep_clean_rooms'
from public.deep_clean_rooms d
union all
select coalesce(t.kind, 'daily'),
       r.hotel_id,
       coalesce(r.period_key, r.run_date::text),
       r.id::text,
       coalesce(r.room, ''),
       case when r.completed then 'done' else 'open' end,
       coalesce(r.notes, ''),
       '',
       '',
       r.run_date,
       r.run_date,
       'checklist_runs'
from public.checklist_runs r
left join public.checklist_templates t on t.id = r.template_id;

comment on view public.checklist_legacy is
  'Read-only copy of checklist history. Does not replace winter, walks, inspections, or runs.';

revoke all on table public.checklist_legacy from public, anon, authenticated;
grant select on table public.checklist_legacy to authenticated;
