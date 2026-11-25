-- Let shuttle, meeting rooms, and winter use the same hotel_features switches.
-- This file is named so it runs after every other migration in the stack.
-- It is the last hotel_features check: parking, sales_leads, greetings,
-- guest_scores, shuttle, meetings, and winter.
-- Additive. Existing rows are left in place. Not applied by the app.
-- Menus read HotelFeatures.on. A missing row stays on, except the shared
-- shuttle, which the app shows only at MSPAM and MSPMS.

alter table public.hotel_features drop constraint if exists hotel_features_feature_check;

alter table public.hotel_features add constraint hotel_features_feature_check
  check (feature in (
    'parking', 'sales_leads', 'greetings', 'guest_scores',
    'shuttle', 'meetings', 'winter'
  ));

insert into public.hotel_features (hotel, feature, enabled)
values
  ('MSPWE', 'shuttle', false),
  ('MSPAM', 'shuttle', true),
  ('MSPMS', 'shuttle', true),
  ('MSPWE', 'meetings', true),
  ('MSPAM', 'meetings', true),
  ('MSPMS', 'meetings', true),
  ('MSPWE', 'winter', true),
  ('MSPAM', 'winter', true),
  ('MSPMS', 'winter', true)
on conflict (hotel, feature) do nothing;

create or replace function private.set_hotel_feature(
  p_hotel text,
  p_feature text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.hotel_feature_is_corporate() then
    raise exception 'not allowed';
  end if;
  if p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if p_feature not in (
    'parking', 'sales_leads', 'greetings', 'guest_scores',
    'shuttle', 'meetings', 'winter'
  ) then
    raise exception 'unknown feature';
  end if;
  insert into public.hotel_features (hotel, feature, enabled, updated_by, updated_at)
  values (p_hotel, p_feature, coalesce(p_enabled, true), (select auth.uid()), pg_catalog.now())
  on conflict (hotel, feature) do update
    set enabled = excluded.enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

comment on table public.hotel_features is
  'One row per hotel and module. Menus hide a module when enabled is false. Shuttle is the shared MSPAM and MSPMS van.';

drop policy if exists hotel_features_select on public.hotel_features;
create policy hotel_features_select on public.hotel_features
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
