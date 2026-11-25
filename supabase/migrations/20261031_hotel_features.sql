-- Per-hotel module switches. Additive only.
-- parking_settings.parking_enabled starts true, then Golden Valley (MSPWE) is turned off.
-- hotel_features is the shared list other modules can read: parking, sales_leads,
-- greetings, and guest_scores. A missing row means the module stays on.
-- JR Corporate turns a module on or off. Hotel staff can read their own hotel.

alter table public.parking_settings
  add column if not exists parking_enabled boolean not null default true;

comment on column public.parking_settings.parking_enabled is
  'When false, the parking module is hidden at this hotel. Golden Valley starts off.';

update public.parking_settings
  set parking_enabled = false
  where hotel = 'MSPWE';

create table if not exists public.hotel_features (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  feature text not null check (feature in ('parking', 'sales_leads', 'greetings', 'guest_scores')),
  enabled boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (hotel, feature)
);

comment on table public.hotel_features is
  'One row per hotel and module. parking follows parking_settings.parking_enabled.';

insert into public.hotel_features (hotel, feature, enabled)
select s.hotel, 'parking', s.parking_enabled
from public.parking_settings s
on conflict (hotel, feature) do nothing;

insert into public.hotel_features (hotel, feature, enabled)
select h.hotel, f.feature, true
from (values ('MSPWE'), ('MSPAM'), ('MSPMS')) as h(hotel)
cross join (values ('sales_leads'), ('greetings'), ('guest_scores')) as f(feature)
on conflict (hotel, feature) do nothing;

alter table public.hotel_features enable row level security;

create or replace function private.hotel_feature_is_corporate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('above_property'),
    false
  );
$$;

create or replace function private.hotel_feature_sync_from_parking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.hotel_features (hotel, feature, enabled, updated_by, updated_at)
  values (new.hotel, 'parking', coalesce(new.parking_enabled, true), new.updated_by, pg_catalog.now())
  on conflict (hotel, feature) do update
    set enabled = excluded.enabled,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    where public.hotel_features.enabled is distinct from excluded.enabled;
  return new;
end;
$$;

create or replace function private.hotel_feature_sync_to_parking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.feature <> 'parking' then
    return new;
  end if;
  update public.parking_settings
    set parking_enabled = new.enabled,
        updated_by = new.updated_by,
        updated_at = pg_catalog.now()
    where hotel = new.hotel
      and parking_enabled is distinct from new.enabled;
  return new;
end;
$$;

drop trigger if exists parking_settings_feature_sync on public.parking_settings;
create trigger parking_settings_feature_sync
  after insert or update of parking_enabled on public.parking_settings
  for each row execute function private.hotel_feature_sync_from_parking();

drop trigger if exists hotel_features_parking_sync on public.hotel_features;
create trigger hotel_features_parking_sync
  after insert or update of enabled on public.hotel_features
  for each row execute function private.hotel_feature_sync_to_parking();

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
  if p_feature not in ('parking', 'sales_leads', 'greetings', 'guest_scores') then
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

create or replace function public.set_hotel_feature(
  p_hotel text,
  p_feature text,
  p_enabled boolean
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_hotel_feature(p_hotel, p_feature, p_enabled);
$$;

drop policy if exists hotel_features_select on public.hotel_features;
create policy hotel_features_select on public.hotel_features
  for select to authenticated
  using (
    (select private.is_above())
    or hotel = any ((select private.my_hotels())::text[])
  );

revoke all on function private.hotel_feature_is_corporate() from public, anon;
revoke all on function private.hotel_feature_sync_from_parking() from public, anon;
revoke all on function private.hotel_feature_sync_to_parking() from public, anon;
revoke all on function private.set_hotel_feature(text, text, boolean) from public, anon;
revoke all on function public.set_hotel_feature(text, text, boolean) from public, anon;

grant execute on function private.hotel_feature_is_corporate() to authenticated;
grant execute on function private.hotel_feature_sync_from_parking() to authenticated;
grant execute on function private.hotel_feature_sync_to_parking() to authenticated;
grant execute on function private.set_hotel_feature(text, text, boolean) to authenticated;
grant execute on function public.set_hotel_feature(text, text, boolean) to authenticated;

revoke all on table public.hotel_features from public, anon, authenticated;
grant select on table public.hotel_features to authenticated;
