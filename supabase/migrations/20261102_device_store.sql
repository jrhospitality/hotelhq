-- One-time home for records that used to live only on the device.
-- Additive. Does not delete local rows or existing tables. Not applied by the app.
-- Demo mode does not call this table.
-- hotel = any ((select private.my_hotels())::text[])

create table if not exists public.app_device_store (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  store text not null check (store ~ '^[a-z0-9_]{1,40}$'),
  payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  unique (hotel, store)
);

comment on table public.app_device_store is
  'Device copy of key log, schedule edits, labor plan, winter, and the other local stores. The device copy is kept.';

alter table public.app_device_store enable row level security;

drop policy if exists app_device_store_all on public.app_device_store;
create policy app_device_store_all on public.app_device_store
  for all to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

revoke all on table public.app_device_store from public, anon;
grant select, insert, update on table public.app_device_store to authenticated;
grant usage, select on sequence public.app_device_store_id_seq to authenticated;
