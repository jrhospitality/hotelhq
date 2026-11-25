-- Hotel privacy for the shared airport van.
-- A desk or driver can still count the shared seats, but cannot read the other
-- hotel's room numbers, guest counts on a row, or tracking code.
-- Corporate (above property) still reads both hotels.
-- Additive. Does not remove tables or rows.

drop policy if exists shuttle_settings_select on public.shuttle_settings;
create policy shuttle_settings_select on public.shuttle_settings
  for select to authenticated
  using (
    (select private.is_above())
    or hotel = any ((select private.my_hotels())::text[])
  );

drop policy if exists shuttle_signups_select on public.shuttle_signups;
create policy shuttle_signups_select on public.shuttle_signups
  for select to authenticated
  using (
    (select private.is_above())
    or hotel = any ((select private.my_hotels())::text[])
  );

-- Seat totals for the other airport hotel. No room, name, or note.
create or replace function public.shuttle_other_seats(p_day date)
returns table (depart_at timestamptz, hotel text, seats integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_day is null then
    return;
  end if;
  if not coalesce(
    private.is_above()
    or private.my_role() in ('front_desk', 'gm', 'agm', 'shuttle_driver'),
    false
  ) then
    return;
  end if;
  if not (
    (select private.is_above())
    or exists (
      select 1
      from unnest((select private.my_hotels())::text[]) h
      where h = any (private.shuttle_pool())
    )
  ) then
    return;
  end if;
  return query
  select s.depart_at, s.hotel, coalesce(sum(s.party_size), 0)::integer
  from public.shuttle_signups s
  where (s.depart_at at time zone 'America/Chicago')::date = p_day
    and s.status <> 'no_show'
    and s.hotel = any (private.shuttle_pool())
    and (
      (select private.is_above())
      or not (s.hotel = any ((select private.my_hotels())::text[]))
    )
  group by s.depart_at, s.hotel;
end;
$$;

revoke all on function public.shuttle_other_seats(date) from public, anon;
grant execute on function public.shuttle_other_seats(date) to authenticated;

comment on function public.shuttle_other_seats(date) is
  'Shared-van seat totals for the other airport hotel. No room numbers.';
