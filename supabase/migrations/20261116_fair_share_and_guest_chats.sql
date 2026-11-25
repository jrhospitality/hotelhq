-- Fair share windows and unanswered brand guest chats. Additive only.
-- Not applied by this change. Review and run it when you are ready.
-- Demo mode does not call this database. The app reads sample data on this device.
--
-- No live STR, DaySTAR, MINT, or Hilton feed is connected.
-- IHG DaySTAR/STAR access for HotelHQ was still pending as of November 5, 2026.
-- fair_share_snapshots is the slot a later import writes. The file body is not stored.
-- fair_share_imports records that a feed was received. GM reads their hotel.
-- Corporate reads every hotel. AGM, front desk, and other roles read no fair-share rows.
-- expedia_fair_share_snapshots is the slot for a later Expedia Partner Central import.
-- Operations has Partner Central access for MSPWE, MSPAM, and MSPMS.
-- This migration does not call Expedia. Rows are property totals, not bookings.
-- Do not store a guest name, email, phone, or booking id in these tables.
--
-- guest_chat_messages is unanswered inbound brand guest chat.
-- It is not a guest issue, a pre-checkout reminder, or a guest-request callback.
-- There is no guest name, email, or phone column. Do not put those in preview or note.
-- Front desk and AGM read their own hotel and mark a chat responded.
-- A GM can read their own hotel. Corporate and other roles read no chat rows.
-- No brand-chat integration ships with this migration.

create schema if not exists private;

grant usage on schema private to authenticated;

alter table public.hotel_features drop constraint if exists hotel_features_feature_check;

alter table public.hotel_features add constraint hotel_features_feature_check
  check (feature in (
    'parking', 'sales_leads', 'greetings', 'guest_scores',
    'shuttle', 'meetings', 'winter', 'night_audit', 'guest_comments',
    'training', 'inspections', 'licenses',
    'fair_share', 'guest_messages'
  ));

insert into public.hotel_features (hotel, feature, enabled)
values
  ('MSPWE', 'fair_share', true),
  ('MSPAM', 'fair_share', true),
  ('MSPMS', 'fair_share', true),
  ('MSPWE', 'guest_messages', true),
  ('MSPAM', 'guest_messages', true),
  ('MSPMS', 'guest_messages', true)
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
    'shuttle', 'meetings', 'winter', 'night_audit', 'guest_comments',
    'training', 'inspections', 'licenses',
    'fair_share', 'guest_messages'
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

create table if not exists public.fair_share_snapshots (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  period text not null check (period in ('t7', 't28')),
  period_end date not null,
  source text not null check (source in ('sample', 'str', 'daystar', 'mint', 'hilton', 'manual')),
  currency text not null default 'USD' check (currency = 'USD'),
  occ numeric(5, 1) check (occ is null or (occ >= 0 and occ <= 100)),
  occ_comp numeric(5, 1) check (occ_comp is null or (occ_comp >= 0 and occ_comp <= 100)),
  occ_ly numeric(5, 1) check (occ_ly is null or (occ_ly >= 0 and occ_ly <= 100)),
  occ_comp_ly numeric(5, 1) check (occ_comp_ly is null or (occ_comp_ly >= 0 and occ_comp_ly <= 100)),
  adr numeric(8, 2) check (adr is null or (adr >= 0 and adr < 100000)),
  adr_comp numeric(8, 2) check (adr_comp is null or (adr_comp >= 0 and adr_comp < 100000)),
  adr_ly numeric(8, 2) check (adr_ly is null or (adr_ly >= 0 and adr_ly < 100000)),
  adr_comp_ly numeric(8, 2) check (adr_comp_ly is null or (adr_comp_ly >= 0 and adr_comp_ly < 100000)),
  revpar numeric(8, 2) check (revpar is null or (revpar >= 0 and revpar < 100000)),
  revpar_comp numeric(8, 2) check (revpar_comp is null or (revpar_comp >= 0 and revpar_comp < 100000)),
  revpar_ly numeric(8, 2) check (revpar_ly is null or (revpar_ly >= 0 and revpar_ly < 100000)),
  revpar_comp_ly numeric(8, 2) check (revpar_comp_ly is null or (revpar_comp_ly >= 0 and revpar_comp_ly < 100000)),
  comp_set_label text not null default '' check (char_length(comp_set_label) <= 80),
  imported_at timestamptz not null default pg_catalog.now(),
  unique (hotel, period, period_end, source)
);

comment on table public.fair_share_snapshots is
  'One T7 or T28 window. Fair share indexes are computed from hotel and comp-set values. A later STR, DaySTAR, MINT, or Hilton import writes rows here. No feed is connected.';

create index if not exists fair_share_snapshots_hotel_idx
  on public.fair_share_snapshots (hotel, period, period_end desc);

create table if not exists public.fair_share_imports (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  source text not null check (source in ('str', 'daystar', 'mint', 'hilton', 'manual')),
  status text not null check (status in ('pending', 'received', 'applied', 'rejected')),
  period_end date,
  note text not null default '' check (char_length(note) <= 240),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.fair_share_imports is
  'Status of a later fair-share import. The file body is not stored. IHG DaySTAR/STAR access was still pending as of November 5, 2026.';

create table if not exists public.expedia_fair_share_snapshots (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  period text not null check (period in ('t7', 't28')),
  period_end date not null,
  source text not null check (source in ('sample', 'partner_central', 'manual')),
  currency text not null default 'USD' check (currency = 'USD'),
  search numeric(5, 1) check (search is null or (search >= 0 and search <= 100)),
  search_comp numeric(5, 1) check (search_comp is null or (search_comp >= 0 and search_comp <= 100)),
  search_ly numeric(5, 1) check (search_ly is null or (search_ly >= 0 and search_ly <= 100)),
  search_comp_ly numeric(5, 1) check (search_comp_ly is null or (search_comp_ly >= 0 and search_comp_ly <= 100)),
  nights numeric(8, 1) check (nights is null or (nights >= 0 and nights < 1000000)),
  nights_comp numeric(8, 1) check (nights_comp is null or (nights_comp >= 0 and nights_comp < 1000000)),
  nights_ly numeric(8, 1) check (nights_ly is null or (nights_ly >= 0 and nights_ly < 1000000)),
  nights_comp_ly numeric(8, 1) check (nights_comp_ly is null or (nights_comp_ly >= 0 and nights_comp_ly < 1000000)),
  revenue numeric(12, 2) check (revenue is null or (revenue >= 0 and revenue < 100000000)),
  revenue_comp numeric(12, 2) check (revenue_comp is null or (revenue_comp >= 0 and revenue_comp < 100000000)),
  revenue_ly numeric(12, 2) check (revenue_ly is null or (revenue_ly >= 0 and revenue_ly < 100000000)),
  revenue_comp_ly numeric(12, 2) check (revenue_comp_ly is null or (revenue_comp_ly >= 0 and revenue_comp_ly < 100000000)),
  comp_set_label text not null default '' check (char_length(comp_set_label) <= 80),
  imported_at timestamptz not null default pg_catalog.now(),
  unique (hotel, period, period_end, source)
);

comment on table public.expedia_fair_share_snapshots is
  'T7 or T28 Expedia fair share for one hotel. A later Partner Central import writes rows here. No guest or booking is stored. No feed is connected.';

create index if not exists expedia_fair_share_snapshots_hotel_idx
  on public.expedia_fair_share_snapshots (hotel, period, period_end desc);

create table if not exists public.expedia_fair_share_imports (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  source text not null check (source in ('partner_central', 'manual')),
  status text not null check (status in ('pending', 'received', 'applied', 'rejected')),
  period_end date,
  note text not null default '' check (char_length(note) <= 240),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.expedia_fair_share_imports is
  'Status of a later Expedia Partner Central import. The file body is not stored. This migration does not call Expedia.';

create table if not exists public.guest_chat_messages (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  source text not null default '' check (source in ('', 'ihg_chat', 'hilton_chat', 'marriott_chat', 'brand_chat')),
  room text not null default '' check (char_length(room) <= 8),
  preview_en text not null check (char_length(preview_en) between 1 and 180),
  preview_es text not null check (char_length(preview_es) between 1 and 180),
  received_at timestamptz not null,
  responded_at timestamptz,
  responded_by uuid,
  responded_name text not null default '' check (char_length(responded_name) <= 80),
  external_id text not null default '' check (char_length(external_id) <= 80),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.guest_chat_messages is
  'Inbound brand guest chat waiting for a front-desk response. No guest name, email, or phone is stored. Not a guest issue or a callback.';

create unique index if not exists guest_chat_messages_external_idx
  on public.guest_chat_messages (hotel, source, external_id)
  where external_id <> '';

create index if not exists guest_chat_messages_waiting_idx
  on public.guest_chat_messages (hotel, received_at)
  where responded_at is null;

create table if not exists public.guest_chat_imports (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  source text not null check (source in ('ihg_chat', 'hilton_chat', 'marriott_chat', 'brand_chat')),
  status text not null check (status in ('pending', 'received', 'applied', 'rejected')),
  note text not null default '' check (char_length(note) <= 240),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.guest_chat_imports is
  'Status of a later brand-chat import. The thread body is not stored. No live brand chat is connected.';

alter table public.fair_share_snapshots enable row level security;
alter table public.fair_share_imports enable row level security;
alter table public.expedia_fair_share_snapshots enable row level security;
alter table public.expedia_fair_share_imports enable row level security;
alter table public.guest_chat_messages enable row level security;
alter table public.guest_chat_imports enable row level security;

create or replace function private.fair_share_allowed(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or (
      (private.my_role())::text = 'gm'
      and p_hotel = any ((select private.my_hotels())::text[])
    ),
    false
  );
$$;

create or replace function private.guest_chat_can_read(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (private.my_role())::text in ('front_desk', 'agm', 'gm')
    and p_hotel = any ((select private.my_hotels())::text[]),
    false
  );
$$;

create or replace function private.guest_chat_can_respond(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (private.my_role())::text in ('front_desk', 'agm')
    and p_hotel = any ((select private.my_hotels())::text[]),
    false
  );
$$;

drop policy if exists fair_share_snapshots_select on public.fair_share_snapshots;
create policy fair_share_snapshots_select on public.fair_share_snapshots
  for select to authenticated
  using (private.fair_share_allowed(hotel));

drop policy if exists fair_share_imports_select on public.fair_share_imports;
create policy fair_share_imports_select on public.fair_share_imports
  for select to authenticated
  using (private.fair_share_allowed(hotel));

drop policy if exists expedia_fair_share_snapshots_select on public.expedia_fair_share_snapshots;
create policy expedia_fair_share_snapshots_select on public.expedia_fair_share_snapshots
  for select to authenticated
  using (private.fair_share_allowed(hotel));

drop policy if exists expedia_fair_share_imports_select on public.expedia_fair_share_imports;
create policy expedia_fair_share_imports_select on public.expedia_fair_share_imports
  for select to authenticated
  using (private.fair_share_allowed(hotel));

drop policy if exists guest_chat_messages_select on public.guest_chat_messages;
create policy guest_chat_messages_select on public.guest_chat_messages
  for select to authenticated
  using (private.guest_chat_can_read(hotel));

drop policy if exists guest_chat_imports_select on public.guest_chat_imports;
create policy guest_chat_imports_select on public.guest_chat_imports
  for select to authenticated
  using (private.guest_chat_can_read(hotel));

create or replace function private.mark_guest_chat_responded(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  select m.hotel into v_hotel
  from public.guest_chat_messages m
  where m.id = p_id;
  if v_hotel is null or not private.guest_chat_can_respond(v_hotel) then
    raise exception 'not allowed';
  end if;
  select coalesce(pr.name, '') into v_name
  from public.profiles pr
  where pr.user_id = (select auth.uid())
  limit 1;
  update public.guest_chat_messages
    set responded_at = pg_catalog.now(),
        responded_by = (select auth.uid()),
        responded_name = coalesce(v_name, '')
    where id = p_id
      and responded_at is null;
end;
$$;

create or replace function public.mark_guest_chat_responded(p_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.mark_guest_chat_responded(p_id);
$$;

revoke all on function private.fair_share_allowed(text) from public, anon;
revoke all on function private.guest_chat_can_read(text) from public, anon;
revoke all on function private.guest_chat_can_respond(text) from public, anon;
revoke all on function private.mark_guest_chat_responded(uuid) from public, anon;
revoke all on function public.mark_guest_chat_responded(uuid) from public, anon;

grant execute on function private.fair_share_allowed(text) to authenticated;
grant execute on function private.guest_chat_can_read(text) to authenticated;
grant execute on function private.guest_chat_can_respond(text) to authenticated;
grant execute on function private.mark_guest_chat_responded(uuid) to authenticated;
grant execute on function public.mark_guest_chat_responded(uuid) to authenticated;

revoke all on table public.fair_share_snapshots from public, anon;
revoke all on table public.fair_share_imports from public, anon;
revoke all on table public.expedia_fair_share_snapshots from public, anon;
revoke all on table public.expedia_fair_share_imports from public, anon;
revoke all on table public.guest_chat_messages from public, anon;
revoke all on table public.guest_chat_imports from public, anon;

grant select on table public.fair_share_snapshots to authenticated;
grant select on table public.fair_share_imports to authenticated;
grant select on table public.expedia_fair_share_snapshots to authenticated;
grant select on table public.expedia_fair_share_imports to authenticated;
grant select on table public.guest_chat_messages to authenticated;
grant select on table public.guest_chat_imports to authenticated;
