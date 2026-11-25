-- Quore parity shared store.
-- The 20261027 design already created these tables. This file does not drop
-- tables, columns, or rows. It adds a stored hotel column (same value as
-- hotel_id) so policies can use:
--   hotel = any ((select private.my_hotels())::text[])
-- Corporate (above_property) is included with private.is_above().
-- New functions live in private, with an empty search_path, and anon cannot execute them.

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.hotel_in_scope(p_hotel text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select p_hotel is not null
     and (
       p_hotel = any ((select private.my_hotels())::text[])
       or (select private.is_above())
     );
$$;

revoke all on function private.hotel_in_scope(text) from public, anon;
grant execute on function private.hotel_in_scope(text) to authenticated;

-- The original helpers were executable by anon. Staff policies only need authenticated.
revoke all on function public.hq_can_see(text) from public, anon;
revoke all on function public.hq_is_leader(text) from public, anon;
revoke all on function public.hq_is_corporate() from public, anon;
revoke all on function public.hq_my_hotel() from public, anon;
revoke all on function public.hq_is_gm_agm() from public, anon;
grant execute on function public.hq_can_see(text) to authenticated;
grant execute on function public.hq_is_leader(text) to authenticated;
grant execute on function public.hq_is_corporate() to authenticated;
grant execute on function public.hq_my_hotel() to authenticated;
grant execute on function public.hq_is_gm_agm() to authenticated;

alter table public.guest_requests add column if not exists assignee_label text;
alter table public.guest_requests add column if not exists resolution text;
alter table public.guest_requests add column if not exists author_label text;
alter table public.guest_requests add column if not exists example boolean not null default false;
alter table public.guest_requests drop constraint if exists guest_requests_guest_initial_check;
alter table public.guest_requests add constraint guest_requests_guest_initial_check
  check (guest_initial is null or btrim(guest_initial::text) ~ '^[A-Za-z]$');

alter table public.log_entries add column if not exists author_label text;
alter table public.log_entries add column if not exists example boolean not null default false;
alter table public.room_notices add column if not exists author_label text;
alter table public.room_notices add column if not exists example boolean not null default false;
alter table public.deep_clean_rooms add column if not exists assignee_label text;

alter table public.guest_requests add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.log_templates add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.log_entries add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.log_entry_sensitive add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.room_notices add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.deep_clean_rooms add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.deep_clean_events add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.audit_log add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.quore_imports add column if not exists hotel text generated always as (hotel_id) stored;
alter table public.quore_import_rows add column if not exists hotel text generated always as (hotel_id) stored;

create index if not exists guest_requests_hotel_idx on public.guest_requests (hotel);
create index if not exists log_entries_hotel_sheet_idx on public.log_entries (hotel, sheet, created_at desc);
create index if not exists room_notices_hotel_idx on public.room_notices (hotel, expires_at desc);

-- Replace the old public-role policies. Dropping a policy does not delete rows.
drop policy if exists gr_read on public.guest_requests;
drop policy if exists gr_ins on public.guest_requests;
drop policy if exists gr_upd on public.guest_requests;
drop policy if exists lt_read on public.log_templates;
drop policy if exists lt_write on public.log_templates;
drop policy if exists le_read on public.log_entries;
drop policy if exists le_ins on public.log_entries;
drop policy if exists le_upd on public.log_entries;
drop policy if exists les_read on public.log_entry_sensitive;
drop policy if exists les_ins on public.log_entry_sensitive;
drop policy if exists rn_read on public.room_notices;
drop policy if exists rn_write on public.room_notices;
drop policy if exists rn_end on public.room_notices;
drop policy if exists dcr_read on public.deep_clean_rooms;
drop policy if exists dcr_write on public.deep_clean_rooms;
drop policy if exists dcr_ins on public.deep_clean_rooms;
drop policy if exists dce_read on public.deep_clean_events;
drop policy if exists dce_ins on public.deep_clean_events;
drop policy if exists au_read on public.audit_log;
drop policy if exists au_ins on public.audit_log;
drop policy if exists qi_read on public.quore_imports;
drop policy if exists qi_ins on public.quore_imports;
drop policy if exists qir_read on public.quore_import_rows;
drop policy if exists qir_ins on public.quore_import_rows;
drop policy if exists rs_all on public.report_schedules;

create policy gr_read on public.guest_requests
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy gr_ins on public.guest_requests
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy gr_upd on public.guest_requests
  for update to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy lt_read on public.log_templates
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy lt_write on public.log_templates
  for all to authenticated
  using ((select private.is_mgr_of(hotel)))
  with check ((select private.is_mgr_of(hotel)));

create policy le_read on public.log_entries
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy le_ins on public.log_entries
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy le_upd on public.log_entries
  for update to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy les_read on public.log_entry_sensitive
  for select to authenticated
  using ((select private.is_mgr_of(hotel)));
create policy les_ins on public.log_entry_sensitive
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy rn_read on public.room_notices
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy rn_write on public.room_notices
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy rn_end on public.room_notices
  for update to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy dcr_read on public.deep_clean_rooms
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy dcr_ins on public.deep_clean_rooms
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy dcr_write on public.deep_clean_rooms
  for update to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy dce_read on public.deep_clean_events
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy dce_ins on public.deep_clean_events
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy au_read on public.audit_log
  for select to authenticated
  using ((select private.is_mgr_of(hotel)));
create policy au_ins on public.audit_log
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

create policy qi_read on public.quore_imports
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy qi_ins on public.quore_imports
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy qir_read on public.quore_import_rows
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy qir_ins on public.quore_import_rows
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

-- No hotel column on report_schedules. Corporate only, same as before.
create policy rs_all on public.report_schedules
  for all to authenticated
  using ((select private.is_above()))
  with check ((select private.is_above()));

do $$
declare t text;
begin
  foreach t in array array[
    'guest_requests','log_templates','log_entries','log_entry_sensitive','room_notices',
    'deep_clean_rooms','deep_clean_events','audit_log','quore_imports','quore_import_rows','report_schedules'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update on table public.%I to authenticated', t);
  end loop;
end $$;

grant usage, select on sequence public.guest_requests_id_seq to authenticated;
grant usage, select on sequence public.log_entries_id_seq to authenticated;
grant usage, select on sequence public.room_notices_id_seq to authenticated;
grant usage, select on sequence public.deep_clean_events_id_seq to authenticated;
grant usage, select on sequence public.audit_log_id_seq to authenticated;
grant usage, select on sequence public.quore_imports_id_seq to authenticated;

comment on column public.guest_requests.hotel is
  'Generated from hotel_id. RLS: hotel = any ((select private.my_hotels())::text[]).';
