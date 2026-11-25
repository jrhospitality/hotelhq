-- Card disputes. Additive only. Status history is insert-only.
-- Evidence files live in the private chargeback-evidence bucket.
-- Access follows the caller's hotels, so a new property does not need a new policy.
-- This file does not insert guest, card, or case rows.

create table if not exists public.chargebacks (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel ~ '^[A-Z0-9]{2,12}$'),
  guest_name text not null check (char_length(guest_name) between 1 and 80),
  confirmation text not null check (char_length(confirmation) between 1 and 40),
  arrival date not null,
  departure date not null,
  room text not null check (char_length(room) between 1 and 12),
  card_last4 text not null check (card_last4 ~ '^[0-9]{4}$'),
  card_brand text not null check (card_brand in ('Visa', 'Mastercard', 'Amex', 'Discover', 'Other')),
  amount numeric(12, 2) not null check (amount > 0 and amount < 1000000),
  reason_code text not null check (char_length(reason_code) between 1 and 20),
  reason_text text not null check (char_length(reason_text) between 1 and 400),
  processor_case text not null check (char_length(processor_case) between 1 and 40),
  received_on date not null,
  deadline date not null,
  status text not null default 'new' check (status in ('new', 'gathering', 'submitted', 'won', 'lost', 'accepted')),
  actor_name text not null default '',
  example boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default pg_catalog.now(),
  check (departure >= arrival)
);

create index if not exists chargebacks_hotel_status_idx
  on public.chargebacks (hotel, status, deadline);

create table if not exists public.chargeback_events (
  id bigint generated always as identity primary key,
  chargeback_id uuid not null references public.chargebacks (id),
  hotel text not null,
  status text not null,
  actor_name text not null default '',
  actor_user uuid default auth.uid(),
  created_at timestamptz not null default pg_catalog.now()
);

create index if not exists chargeback_events_case_idx
  on public.chargeback_events (chargeback_id, created_at);

create table if not exists public.chargeback_evidence (
  id bigint generated always as identity primary key,
  chargeback_id uuid not null references public.chargebacks (id),
  hotel text not null,
  kind text not null check (kind in ('folio', 'registration', 'id', 'authorization', 'email', 'other')),
  storage_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 120),
  example boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default pg_catalog.now()
);

create index if not exists chargeback_evidence_case_idx
  on public.chargeback_evidence (chargeback_id, kind);

alter table public.chargebacks enable row level security;
alter table public.chargeback_events enable row level security;
alter table public.chargeback_evidence enable row level security;

create or replace function private.chargeback_allowed(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_above() or private.is_mgr_of(p_hotel);
$$;

revoke all on function private.chargeback_allowed(text) from public, anon;
grant execute on function private.chargeback_allowed(text) to authenticated;

drop policy if exists chargebacks_select on public.chargebacks;
create policy chargebacks_select on public.chargebacks
  for select to authenticated
  using (private.chargeback_allowed(hotel));

drop policy if exists chargebacks_insert on public.chargebacks;
create policy chargebacks_insert on public.chargebacks
  for insert to authenticated
  with check (private.chargeback_allowed(hotel));

drop policy if exists chargebacks_update on public.chargebacks;
create policy chargebacks_update on public.chargebacks
  for update to authenticated
  using (private.chargeback_allowed(hotel))
  with check (private.chargeback_allowed(hotel));

drop policy if exists chargeback_events_select on public.chargeback_events;
create policy chargeback_events_select on public.chargeback_events
  for select to authenticated
  using (private.chargeback_allowed(hotel));

drop policy if exists chargeback_evidence_select on public.chargeback_evidence;
create policy chargeback_evidence_select on public.chargeback_evidence
  for select to authenticated
  using (private.chargeback_allowed(hotel));

drop policy if exists chargeback_evidence_insert on public.chargeback_evidence;
create policy chargeback_evidence_insert on public.chargeback_evidence
  for insert to authenticated
  with check (
    private.chargeback_allowed(hotel)
    and exists (
      select 1 from public.chargebacks c
      where c.id = chargeback_id and c.hotel = hotel
    )
  );

revoke all on table public.chargebacks from public, anon;
revoke all on table public.chargeback_events from public, anon;
revoke all on table public.chargeback_evidence from public, anon;
grant select, insert, update on table public.chargebacks to authenticated;
grant select on table public.chargeback_events to authenticated;
grant select, insert on table public.chargeback_evidence to authenticated;

create or replace function private.trg_chargeback_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.hotel is distinct from old.hotel then
    raise exception 'chargeback hotel cannot change';
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.chargeback_events (chargeback_id, hotel, status, actor_name, actor_user)
    values (new.id, new.hotel, new.status, coalesce(new.actor_name, ''), auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists chargeback_event_ai on public.chargebacks;
create trigger chargeback_event_ai
  after insert on public.chargebacks
  for each row execute function private.trg_chargeback_event();

drop trigger if exists chargeback_event_au on public.chargebacks;
create trigger chargeback_event_au
  after update on public.chargebacks
  for each row execute function private.trg_chargeback_event();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chargeback-evidence',
  'chargeback-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.chargeback_object_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[];
begin
  if (select auth.uid()) is null then
    return false;
  end if;
  parts := storage.foldername(p_name);
  if parts is null or coalesce(pg_catalog.array_length(parts, 1), 0) < 2 then
    return false;
  end if;
  return private.chargeback_allowed(parts[1]);
end;
$$;

revoke all on function private.chargeback_object_allowed(text) from public, anon;
grant execute on function private.chargeback_object_allowed(text) to authenticated;

drop policy if exists chargeback_evidence_select on storage.objects;
create policy chargeback_evidence_select on storage.objects
  for select to authenticated
  using (bucket_id = 'chargeback-evidence' and private.chargeback_object_allowed(name));

drop policy if exists chargeback_evidence_insert on storage.objects;
create policy chargeback_evidence_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chargeback-evidence' and private.chargeback_object_allowed(name));

comment on table public.chargeback_events is
  'Insert-only status history. There is no update or delete grant.';
