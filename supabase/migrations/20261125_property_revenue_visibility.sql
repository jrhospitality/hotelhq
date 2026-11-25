-- Property revenue visibility. Additive only. Not applied by this change.
-- Pending until Jay approves. Do not run this on the live project
-- clxvmtbmveusrbxacnxe from the pull request. Merging to main deploys the
-- site, and this file has to be applied by hand before that deploy.
--
-- GM, AGM, and above-property may read property revenue: room revenue,
-- total revenue, ADR times rooms, and MTD/YTD budget versus actual.
-- Front desk, housekeeping, maintenance, night audit, and every other
-- staff role may not.
-- Occupancy, ADR, and RevPAR stay on the rows that already show them.
-- STR fair-share rows have no revenue total. Expedia revenue stays on
-- expedia_fair_share_snapshots, which front desk already cannot read
-- (private.fair_share_allowed is GM of that hotel, or above-property).
-- AGM does not gain fair-share rows.
-- Night-audit report rows that are property revenue are hidden from any
-- session that fails private.can_see_property_revenue(). GM, AGM, and
-- above-property still pass that check, and the existing hotel policy
-- still limits a GM or AGM to their own hotel.

create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.can_see_property_revenue()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or (private.my_role())::text in ('gm', 'agm'),
    false
  );
$$;

comment on function private.can_see_property_revenue() is
  'True for GM, AGM, and above-property. False for front desk, housekeeping, maintenance, night audit, and every other staff role.';

revoke all on function private.can_see_property_revenue() from public, anon;
grant execute on function private.can_see_property_revenue() to authenticated;

-- MTD / YTD / day budget versus actual. Empty until a later import.
-- No guest name, email, phone, or booking id.
create table if not exists public.property_revenue_periods (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  period_kind text not null check (period_kind in ('day', 'mtd', 'ytd')),
  period_end date not null,
  metric text not null check (metric in (
    'room_revenue', 'total_revenue', 'adr_x_rooms',
    'room_revenue_budget', 'total_revenue_budget'
  )),
  actual numeric(14, 2) check (actual is null or (actual >= 0 and actual < 100000000000)),
  budget numeric(14, 2) check (budget is null or (budget >= 0 and budget < 100000000000)),
  source text not null default 'manual' check (source in ('manual', 'hotelkey', 'str', 'sample')),
  created_at timestamptz not null default pg_catalog.now(),
  unique (hotel, period_kind, period_end, metric)
);

comment on table public.property_revenue_periods is
  'Property revenue and budget for one hotel and period. GM, AGM, and above-property only. No guest data.';

create index if not exists property_revenue_periods_hotel_idx
  on public.property_revenue_periods (hotel, period_kind, period_end desc);

alter table public.property_revenue_periods enable row level security;

drop policy if exists property_revenue_periods_select on public.property_revenue_periods;
create policy property_revenue_periods_select
  on public.property_revenue_periods
  for select
  to authenticated
  using (
    (select private.can_see_property_revenue())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

revoke all on table public.property_revenue_periods from public, anon, authenticated;
grant select on table public.property_revenue_periods to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant select, insert, update, delete on table public.property_revenue_periods to service_role;
  end if;
end $$;

-- A session that can read the night-audit report still cannot read a
-- property-revenue metric unless private.can_see_property_revenue() is true.
-- GM, AGM, and above-property pass, so their existing rows stay visible.
-- ADR and RevPAR are not revenue totals and stay on the report.
drop policy if exists night_audit_report_rows_revenue on public.night_audit_report_rows;
create policy night_audit_report_rows_revenue
  on public.night_audit_report_rows
  as restrictive
  for select
  to authenticated
  using (
    (select private.can_see_property_revenue())
    or not (
      section = 'gm_revenue'
      and (
        lower(coalesce(cells->>'metric', '')) in (
          'room_revenue', 'total_revenue', 'adr_x_rooms',
          'room_revenue_budget', 'total_revenue_budget',
          'room_revenue_actual', 'total_revenue_actual'
        )
        or lower(coalesce(cells->>'metric', '')) like '%revenue%'
        or lower(coalesce(cells->>'metric', '')) like '%budget%'
      )
    )
  );

-- Parking revenue and market sales per occupied room live on
-- revenue_daily_facts (PR 65). That table is already limited to GM, AGM,
-- and above-property. This restrictive policy keeps that lock on the same
-- helper, so a later permissive policy cannot widen it to front desk.
-- The parking per-car rate stays on the same helper. Corporate can still
-- update the rate through the existing update policy.
do $$
begin
  if to_regclass('public.revenue_daily_facts') is not null then
    execute 'drop policy if exists revenue_daily_facts_revenue on public.revenue_daily_facts';
    execute 'create policy revenue_daily_facts_revenue on public.revenue_daily_facts as restrictive for select to authenticated using ((select private.can_see_property_revenue()))';
  end if;
  if to_regclass('public.parking_car_rates') is not null then
    execute 'drop policy if exists parking_car_rates_revenue on public.parking_car_rates';
    execute 'create policy parking_car_rates_revenue on public.parking_car_rates as restrictive for select to authenticated using ((select private.can_see_property_revenue()))';
  end if;
end $$;

-- Checked read for Expedia property revenue. Created only when that table
-- exists. Returns no rows unless the caller may see revenue and may already
-- read that hotel's fair share. Front desk gets no rows. AGM does not gain
-- fair-share access.
do $$
begin
  if to_regclass('public.expedia_fair_share_snapshots') is null then
    return;
  end if;
  execute $fn$
    create or replace function public.expedia_fair_share_revenue_read(p_hotel text default null)
    returns table (
      id uuid,
      hotel text,
      period text,
      period_end date,
      revenue numeric,
      revenue_comp numeric,
      revenue_ly numeric,
      revenue_comp_ly numeric
    )
    language sql
    stable
    security definer
    set search_path = ''
    as $body$
      select
        s.id,
        s.hotel,
        s.period,
        s.period_end,
        s.revenue,
        s.revenue_comp,
        s.revenue_ly,
        s.revenue_comp_ly
      from public.expedia_fair_share_snapshots s
      where (select auth.uid()) is not null
        and private.can_see_property_revenue()
        and private.fair_share_allowed(s.hotel)
        and (p_hotel is null or s.hotel = p_hotel);
    $body$
  $fn$;
  execute 'revoke all on function public.expedia_fair_share_revenue_read(text) from public, anon';
  execute 'grant execute on function public.expedia_fair_share_revenue_read(text) to authenticated';
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.expedia_fair_share_revenue_read(text) to service_role';
  end if;
  execute $cmt$
    comment on function public.expedia_fair_share_revenue_read(text) is
      'Expedia property revenue for GM and above-property. Front desk and other roles get no rows. AGM fair-share access is unchanged.'
  $cmt$;
end $$;
