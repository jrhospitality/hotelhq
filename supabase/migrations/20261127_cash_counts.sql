-- Front desk drawer counts (replaces the Quore Cash Count Log). Additive only:
-- one new table, its RLS policies, and two RPCs. Nothing existing is changed.
--
-- Staff enter a start-of-shift count, an end-of-shift count, or a cash drop
-- through public.log_cash_count. Counts carry the expected amount ($300.00
-- for the Golden Valley front desk). variance = counted - expected. Any
-- non-zero variance is flagged in-app for the hotel's GM and AGM (and
-- Corporate) until one of them marks it reviewed. No email or push is sent.
--
-- Reading: the person who entered the row, GM/AGM of that hotel, and
-- above-property (Corporate). Nobody writes the table directly.

create table if not exists public.cash_counts (
  id bigint generated always as identity primary key,
  hotel_id text not null references public.hotels (id),
  work_date date not null default ((pg_catalog.now() at time zone 'America/Chicago')::date),
  shift text not null,
  kind text not null,
  user_id uuid not null references public.profiles (user_id),
  counted_amount numeric(10, 2),
  expected_amount numeric(10, 2),
  variance numeric(10, 2) generated always as (counted_amount - expected_amount) stored,
  drop_amount numeric(10, 2),
  template_id bigint references public.checklist_templates (id),
  item_n integer,
  note text,
  counted_at timestamptz not null default pg_catalog.now(),
  reviewed_by uuid references public.profiles (user_id),
  reviewed_at timestamptz,
  constraint cash_counts_kind_check check (kind in ('start', 'end', 'drop')),
  constraint cash_counts_shift_check check (shift in ('AM', 'PM', 'Night Audit')),
  constraint cash_counts_amount_check check (
    (kind = 'drop' and drop_amount is not null and drop_amount >= 0 and counted_amount is null)
    or (kind <> 'drop' and counted_amount is not null and counted_amount >= 0 and expected_amount is not null)
  )
);

comment on table public.cash_counts is
  'Front desk drawer counts and cash drops entered from checklist amount items. variance is counted minus expected; non-zero variance shows in-app to the GM and AGM until reviewed.';

create index if not exists cash_counts_hotel_date_idx on public.cash_counts (hotel_id, work_date desc);
create index if not exists cash_counts_user_idx on public.cash_counts (user_id);
create index if not exists cash_counts_open_variance_idx on public.cash_counts (hotel_id)
  where variance <> 0 and reviewed_at is null;
create index if not exists cash_counts_template_idx on public.cash_counts (template_id);
create index if not exists cash_counts_reviewed_by_idx on public.cash_counts (reviewed_by);

alter table public.cash_counts enable row level security;

drop policy if exists cash_counts_read on public.cash_counts;
create policy cash_counts_read on public.cash_counts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_mgr_of(hotel_id))
  );

revoke all on table public.cash_counts from public, anon, authenticated;
grant select on table public.cash_counts to authenticated;

create or replace function public.log_cash_count(
  p_hotel text,
  p_shift text,
  p_kind text,
  p_amount numeric,
  p_expected numeric default null,
  p_template_id bigint default null,
  p_item_n integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $log$
declare
  uid uuid := (select auth.uid());
  r public.cash_counts;
begin
  if uid is null then
    raise exception 'not allowed';
  end if;
  if not exists (
    select 1 from public.profiles pr
    where pr.user_id = uid and pr.active
      and (pr.hotel_id = p_hotel or p_hotel = any(private.my_hotels()) or private.is_above())
  ) then
    raise exception 'not allowed';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 100000 then
    raise exception 'amount';
  end if;
  insert into public.cash_counts (
    hotel_id, shift, kind, user_id, counted_amount, expected_amount, drop_amount,
    template_id, item_n, note
  ) values (
    p_hotel,
    private.norm_shift(p_shift),
    p_kind,
    uid,
    case when p_kind = 'drop' then null else round(p_amount, 2) end,
    case when p_kind = 'drop' then null else round(coalesce(p_expected, 300), 2) end,
    case when p_kind = 'drop' then round(p_amount, 2) else null end,
    p_template_id,
    p_item_n,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning * into r;
  return pg_catalog.jsonb_build_object(
    'id', r.id, 'variance', r.variance,
    'flagged', coalesce(r.variance, 0) <> 0
  );
end
$log$;

comment on function public.log_cash_count(text, text, text, numeric, numeric, bigint, integer, text) is
  'Front desk enters a drawer count (start or end, with expected amount) or a cash drop for its own hotel.';

revoke all on function public.log_cash_count(text, text, text, numeric, numeric, bigint, integer, text) from public, anon;
grant execute on function public.log_cash_count(text, text, text, numeric, numeric, bigint, integer, text) to authenticated;

create or replace function public.review_cash_count(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $review$
declare
  h text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  select hotel_id into h from public.cash_counts where id = p_id;
  if h is null or not (select private.is_mgr_of(h)) then
    raise exception 'not allowed';
  end if;
  update public.cash_counts
    set reviewed_by = (select auth.uid()), reviewed_at = pg_catalog.now()
    where id = p_id and reviewed_at is null;
end
$review$;

comment on function public.review_cash_count(bigint) is
  'GM, AGM, or Corporate marks a drawer variance reviewed.';

revoke all on function public.review_cash_count(bigint) from public, anon;
grant execute on function public.review_cash_count(bigint) to authenticated;
