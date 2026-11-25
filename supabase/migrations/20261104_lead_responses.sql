-- Sales-lead response tracking. Additive only.
-- Adds two nullable columns and a read-only rollup view.
-- Existing rows stay as they are.
-- Not applied by this change. Review and run it when you are ready.
-- No sample contacts and no addresses. This repo is public.
--
-- Corporate (private.is_above()) sees every hotel, including a hotel with no leads.
-- A GM, AGM, or sales manager sees only private.my_hotels().
-- The view is security invoker, so sales_leads row security still applies
-- and a count cannot include a lead the caller cannot read.

alter table public.sales_leads
  add column if not exists responded_at timestamptz;

alter table public.sales_leads
  add column if not exists responded_by text;

comment on column public.sales_leads.responded_at is
  'When someone replied to this lead. Null means it is still waiting.';

comment on column public.sales_leads.responded_by is
  'Display name of the person who replied. Not an email address.';

do $sl_responded$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'sales_leads_responded_pair'
      and conrelid = 'public.sales_leads'::pg_catalog.regclass
  ) then
    alter table public.sales_leads
      add constraint sales_leads_responded_pair
      check (
        (responded_at is null and responded_by is null)
        or (
          responded_at is not null
          and responded_by is not null
          and pg_catalog.char_length(pg_catalog.btrim(responded_by)) between 1 and 120
        )
      );
  end if;
end
$sl_responded$;

create index if not exists sales_leads_hotel_responded_idx
  on public.sales_leads (hotel, responded_at);

create or replace view public.sales_lead_rollup
with (security_invoker = true) as
select
  h.hotel,
  pg_catalog.count(s.id)::bigint as total_leads,
  pg_catalog.count(s.id) filter (where s.responded_at is not null)::bigint as responded,
  pg_catalog.count(s.id) filter (where s.responded_at is null)::bigint as awaiting,
  pg_catalog.round(
    (
      pg_catalog.avg(
        pg_catalog.date_part('epoch', s.responded_at - s.created_at)
      ) filter (
        where s.responded_at is not null
          and s.responded_at >= s.created_at
      ) / 3600.0
    )::numeric,
    1
  ) as avg_hours
from (
  select v.hotel, v.ord
  from (values ('MSPWE', 1), ('MSPAM', 2), ('MSPMS', 3)) as v(hotel, ord)
  where (select private.is_above())
     or (
       v.hotel = any ((select private.my_hotels())::text[])
       and (select private.sales_lead_can_manage())
     )
) h
left join public.sales_leads s on s.hotel = h.hotel
group by h.hotel, h.ord
order by h.ord;

comment on view public.sales_lead_rollup is
  'Per hotel: total leads, responded, awaiting response, and average hours to respond. Corporate sees every hotel. A GM or AGM sees only their own hotel.';

revoke all on table public.sales_lead_rollup from public, anon, authenticated;
grant select on table public.sales_lead_rollup to authenticated;

create or replace function private.mark_sales_lead_responded(p_id bigint, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_name text;
begin
  if (select auth.uid()) is null or not private.sales_lead_can_manage() then
    raise exception 'sl_role';
  end if;
  v_name := pg_catalog.btrim(coalesce(p_name, ''));
  if pg_catalog.char_length(v_name) < 1 or pg_catalog.char_length(v_name) > 120 then
    raise exception 'sl_name';
  end if;
  select s.hotel into v_hotel
  from public.sales_leads s
  where s.id = p_id;
  if v_hotel is null or not private.sales_lead_hotel_ok(v_hotel) then
    raise exception 'sl_role';
  end if;
  update public.sales_leads
    set responded_at = pg_catalog.now(),
        responded_by = v_name
    where id = p_id
      and responded_at is null;
end;
$$;

create or replace function public.mark_sales_lead_responded(p_id bigint, p_name text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.mark_sales_lead_responded(p_id, p_name); $$;

revoke all on function private.mark_sales_lead_responded(bigint, text) from public, anon;
revoke all on function public.mark_sales_lead_responded(bigint, text) from public, anon;
grant execute on function private.mark_sales_lead_responded(bigint, text) to authenticated;
grant execute on function public.mark_sales_lead_responded(bigint, text) to authenticated;
