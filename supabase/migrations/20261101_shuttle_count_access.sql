-- Seat and ridership totals are security definer, so row level security does not
-- apply. Replace the public functions in place. No tables, columns, or rows change.
--
-- A caller gets rows only when they are JR Corporate (private.is_above()) or
-- private.my_hotels() includes Hampton (MSPAM) or SpringHill (MSPMS).
-- Counts include only those two hotels. The seat total stays combined across
-- both, because it is one shared van. Anyone else, including Golden Valley, gets
-- no rows.

create or replace function public.shuttle_day_counts(p_day date)
returns table (depart_at timestamptz, seats integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(
    private.is_above()
    or exists (
      select 1
      from unnest((select private.my_hotels())::text[]) as h
      where h in ('MSPAM', 'MSPMS')
    ),
    false
  ) then
    return;
  end if;

  return query
  select s.depart_at, coalesce(sum(s.party_size), 0)::integer
  from public.shuttle_signups s
  where (s.depart_at at time zone 'America/Chicago')::date = p_day
    and s.status <> 'no_show'
    and s.hotel in ('MSPAM', 'MSPMS')
  group by s.depart_at;
end;
$$;

create or replace function public.shuttle_ridership(p_day date)
returns table (hotel text, destination text, signed_up integer, rode integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(
    private.is_above()
    or exists (
      select 1
      from unnest((select private.my_hotels())::text[]) as h
      where h in ('MSPAM', 'MSPMS')
    ),
    false
  ) then
    return;
  end if;

  return query
  select s.hotel,
    s.destination,
    coalesce(sum(s.party_size) filter (where s.status <> 'no_show'), 0)::integer,
    coalesce(sum(s.party_size) filter (where s.status in ('boarded', 'done')), 0)::integer
  from public.shuttle_signups s
  where (s.depart_at at time zone 'America/Chicago')::date = p_day
    and s.hotel in ('MSPAM', 'MSPMS')
  group by s.hotel, s.destination
  order by s.hotel, s.destination;
end;
$$;

revoke all on function public.shuttle_day_counts(date) from public, anon;
revoke all on function public.shuttle_ridership(date) from public, anon;
grant execute on function public.shuttle_day_counts(date) to authenticated;
grant execute on function public.shuttle_ridership(date) to authenticated;
