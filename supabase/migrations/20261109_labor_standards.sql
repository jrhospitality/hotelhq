-- Labor standards set by JR Corporate. Managers read their own hotel.
-- History is a row per effective date. No pay rates. Does not drop data.

create table if not exists public.labor_standards (
  id text primary key,
  hotel_id text not null,
  position_id text not null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  effective_start date not null,
  effective_end date,
  updated_at timestamptz not null default now()
);

alter table public.labor_standards add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.labor_standards add column if not exists effective_start date;
alter table public.labor_standards add column if not exists effective_end date;
alter table public.labor_standards add column if not exists kind text;
alter table public.labor_standards add column if not exists position_id text;
alter table public.labor_standards add column if not exists updated_at timestamptz not null default now();

alter table public.labor_standards enable row level security;

drop policy if exists labor_standards_select on public.labor_standards;
create policy labor_standards_select on public.labor_standards
  for select to authenticated
  using (
    (select private.is_above())
    or (
      private.my_role() in ('gm', 'agm', 'hk_lead')
      and hotel_id = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists labor_standards_write on public.labor_standards;
create policy labor_standards_write on public.labor_standards
  for all to authenticated
  using ((select private.is_above()))
  with check ((select private.is_above()));

revoke all on public.labor_standards from public, anon;
grant select, insert, update, delete on public.labor_standards to authenticated;

create or replace function public.save_labor_standards(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hotel text;
  item jsonb;
begin
  if not coalesce(private.is_above(), false) then
    raise exception 'not allowed';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'object' then
    return;
  end if;
  for hotel, item in select key, value from jsonb_each(p_rows)
  loop
    if jsonb_typeof(item) <> 'array' then
      continue;
    end if;
    insert into public.labor_standards (id, hotel_id, position_id, kind, payload, effective_start, effective_end)
    select
      coalesce(row.rec->>'id', hotel || '-' || (row.rec->>'position') || '-' || (row.rec->>'start')),
      hotel,
      row.rec->>'position',
      coalesce(row.rec->>'kind', 'fixed'),
      row.rec - 'pay' - 'wage' - 'rate' - 'hourly',
      (row.rec->>'start')::date,
      nullif(row.rec->>'end', '')::date
    from jsonb_array_elements(item) as row(rec)
    where coalesce(row.rec->>'position', '') <> ''
      and coalesce(row.rec->>'start', '') <> ''
    on conflict (id) do update set
      kind = excluded.kind,
      payload = excluded.payload,
      effective_start = excluded.effective_start,
      effective_end = excluded.effective_end,
      updated_at = now();
  end loop;
end;
$$;

revoke all on function public.save_labor_standards(jsonb) from public, anon;
grant execute on function public.save_labor_standards(jsonb) to authenticated;
