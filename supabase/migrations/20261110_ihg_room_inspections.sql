-- Documented IHG Way of Clean room inspections.
-- Adds a new table. Does not change or delete public.inspections.

create table if not exists public.ihg_room_inspections (
  id text primary key,
  hotel_id text not null,
  inspected_on date not null,
  room_number text not null,
  attendant_name text not null,
  attendant_user_id uuid,
  inspector_name text not null,
  marks jsonb not null default '{}'::jsonb,
  earned integer,
  possible integer,
  score integer,
  created_at timestamptz not null default now()
);

alter table public.ihg_room_inspections add column if not exists marks jsonb not null default '{}'::jsonb;
alter table public.ihg_room_inspections add column if not exists attendant_user_id uuid;
alter table public.ihg_room_inspections add column if not exists earned integer;
alter table public.ihg_room_inspections add column if not exists possible integer;
alter table public.ihg_room_inspections add column if not exists score integer;

alter table public.ihg_room_inspections enable row level security;

drop policy if exists ihg_room_inspections_select on public.ihg_room_inspections;
create policy ihg_room_inspections_select on public.ihg_room_inspections
  for select to authenticated
  using (
    (select private.is_above())
    or (
      private.my_role() in ('gm', 'agm', 'hk_lead')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
    or (
      private.my_role() = 'housekeeper'
      and hotel_id = any ((select private.my_hotels())::text[])
      and (
        attendant_user_id = (select auth.uid())
        or attendant_name = coalesce((
          select p.name from public.profiles p where p.user_id = (select auth.uid())
        ), '')
      )
    )
  );

drop policy if exists ihg_room_inspections_write on public.ihg_room_inspections;
create policy ihg_room_inspections_write on public.ihg_room_inspections
  for all to authenticated
  using (
    (select private.is_above())
    or (
      private.my_role() in ('gm', 'agm', 'hk_lead')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  )
  with check (
    (select private.is_above())
    or (
      private.my_role() in ('gm', 'agm', 'hk_lead')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

revoke all on public.ihg_room_inspections from public, anon;
grant select, insert, update, delete on public.ihg_room_inspections to authenticated;

create or replace function public.save_ihg_room_inspection(p_row jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hotel text;
begin
  if p_row is null or jsonb_typeof(p_row) <> 'object' then
    return;
  end if;
  hotel := p_row->>'hotel';
  if coalesce(hotel, '') = '' or coalesce(p_row->>'date', '') = '' then
    return;
  end if;
  if not (
    coalesce(private.is_above(), false)
    or (
      private.my_role() in ('gm', 'agm', 'hk_lead')
      and hotel = any ((select private.my_hotels())::text[])
    )
  ) then
    raise exception 'not allowed';
  end if;
  insert into public.ihg_room_inspections (
    id, hotel_id, inspected_on, room_number, attendant_name, inspector_name, marks, earned, possible, score
  ) values (
    coalesce(p_row->>'id', hotel || '-' || (p_row->>'date') || '-' || (p_row->>'attendant')),
    hotel,
    (p_row->>'date')::date,
    p_row->>'room',
    p_row->>'attendant',
    p_row->>'inspector',
    coalesce(p_row->'marks', '{}'::jsonb),
    nullif(p_row->>'earned', '')::integer,
    nullif(p_row->>'possible', '')::integer,
    nullif(p_row->>'score', '')::integer
  )
  on conflict (id) do update set
    room_number = excluded.room_number,
    attendant_name = excluded.attendant_name,
    inspector_name = excluded.inspector_name,
    marks = excluded.marks,
    earned = excluded.earned,
    possible = excluded.possible,
    score = excluded.score;
end;
$$;

revoke all on function public.save_ihg_room_inspection(jsonb) from public, anon;
grant execute on function public.save_ihg_room_inspection(jsonb) to authenticated;
