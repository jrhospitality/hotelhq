-- HotelHQ · Quore parity (original design).
-- This file already ran on project clxvmtbmveusrbxacnxe as hotelhq_quore_parity.
-- Do not edit the statements below. 20261030_quore_parity_shared.sql replaces the
-- policies: hotel = any((select private.my_hotels())::text[]), anon revoked.
-- Depends on hq_is_corporate(), hq_my_hotel(), hq_is_gm_agm() from 20261027_labor_plan_edits.sql.
-- Privacy: guests are stored as room + last initial only. No guest names, phones or emails.

create or replace function public.hq_can_see(h text) returns boolean language sql stable as $$
  select public.hq_is_corporate() or h = public.hq_my_hotel() $$;
create or replace function public.hq_is_leader(h text) returns boolean language sql stable as $$
  select public.hq_is_corporate() or (public.hq_is_gm_agm() and h = public.hq_my_hotel()) $$;

-- Guest requests & complaints
create table if not exists public.guest_requests (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  kind text not null check (kind in ('request','complaint')),
  room text not null,
  guest_initial char(1) check (guest_initial ~ '^[A-Z]$'),
  category text not null,
  priority text not null check (priority in ('low','med','high','urgent')),
  sla_minutes int not null,
  note text,
  dept text,
  assigned_to uuid references auth.users(id),
  status text not null default 'open' check (status in ('open','ack','done')),
  callback_at timestamptz,
  callback_done_at timestamptz,
  guest_issue_id bigint,              -- links a complaint to the guest issue log
  recovery text,
  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  ack_at timestamptz,
  done_at timestamptz,
  escalated_at timestamptz
);
create index if not exists guest_requests_hotel_status on public.guest_requests(hotel_id,status,created_at desc);

-- Log sheets
create table if not exists public.log_templates (
  hotel_id text not null,
  sheet text not null,                 -- keys, pkg, wake, cash, pool, meter, vendor
  fields jsonb not null,               -- [{id,label_en,label_es,type,min,max,sensitive}]
  hidden boolean default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz default now(),
  primary key (hotel_id,sheet)
);
create table if not exists public.log_entries (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  sheet text not null,
  data jsonb not null,                 -- non-sensitive values
  out_of_range boolean default false,
  balanced boolean,                    -- what non-managers see for cash
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
-- Cash amounts live in a separate table so RLS can hide them by role.
create table if not exists public.log_entry_sensitive (
  entry_id bigint primary key references public.log_entries(id) on delete cascade,
  hotel_id text not null,
  data jsonb not null
);

-- Room notices
create table if not exists public.room_notices (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  room text not null,
  kind text not null check (kind in ('eci','lco','vip','dnd','ada','oth')),
  note text,
  starts_at timestamptz default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
create index if not exists room_notices_active on public.room_notices(hotel_id,expires_at) where ended_at is null;

-- Deep cleans
create table if not exists public.deep_clean_rooms (
  hotel_id text not null,
  room text not null,
  cycle_days int not null default 90 check (cycle_days between 14 and 365),
  last_done date,
  assigned_to uuid references auth.users(id),
  primary key (hotel_id,room)
);
create table if not exists public.deep_clean_events (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  room text not null,
  event text not null check (event in ('assign','start','done')),
  by_user uuid default auth.uid(),
  at timestamptz default now()
);

-- Audit trail (insert-only)
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  actor uuid default auth.uid(),
  entity text not null,
  entity_id text,
  action text not null,
  before jsonb,
  after jsonb,
  at timestamptz default now()
);
create index if not exists audit_log_hotel_at on public.audit_log(hotel_id,at desc);

-- Quore imports
create table if not exists public.quore_imports (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  kind text not null check (kind in ('wo','pm','assets')),
  file_name text,
  mapping jsonb not null,
  rows_ok int default 0,
  rows_skipped int default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);
create table if not exists public.quore_import_rows (
  import_id bigint references public.quore_imports(id) on delete cascade,
  hotel_id text not null,
  quore_id text not null,
  data jsonb not null,
  primary key (hotel_id,import_id,quore_id)
);

-- Report schedules (stays OFF; nothing is sent until a mailbox is configured)
create table if not exists public.report_schedules (
  id bigint generated always as identity primary key,
  name text not null,
  cron text not null default '0 7 * * 1',
  tz text not null default 'America/Chicago',
  recipients text[] not null default '{}',
  enabled boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- RLS
alter table public.guest_requests enable row level security;
alter table public.log_templates enable row level security;
alter table public.log_entries enable row level security;
alter table public.log_entry_sensitive enable row level security;
alter table public.room_notices enable row level security;
alter table public.deep_clean_rooms enable row level security;
alter table public.deep_clean_events enable row level security;
alter table public.audit_log enable row level security;
alter table public.quore_imports enable row level security;
alter table public.quore_import_rows enable row level security;
alter table public.report_schedules enable row level security;

create policy gr_read on public.guest_requests for select using (public.hq_can_see(hotel_id));
create policy gr_ins on public.guest_requests for insert with check (hotel_id = public.hq_my_hotel());
create policy gr_upd on public.guest_requests for update using (hotel_id = public.hq_my_hotel() or public.hq_is_corporate());

create policy lt_read on public.log_templates for select using (public.hq_can_see(hotel_id));
create policy lt_write on public.log_templates for all using (public.hq_is_leader(hotel_id)) with check (public.hq_is_leader(hotel_id));

create policy le_read on public.log_entries for select using (public.hq_can_see(hotel_id));
create policy le_ins on public.log_entries for insert with check (hotel_id = public.hq_my_hotel());
create policy les_read on public.log_entry_sensitive for select using (public.hq_is_leader(hotel_id));
create policy les_ins on public.log_entry_sensitive for insert with check (hotel_id = public.hq_my_hotel());

create policy rn_read on public.room_notices for select using (public.hq_can_see(hotel_id));
create policy rn_write on public.room_notices for insert with check (hotel_id = public.hq_my_hotel());
create policy rn_end on public.room_notices for update using (hotel_id = public.hq_my_hotel());

create policy dcr_read on public.deep_clean_rooms for select using (public.hq_can_see(hotel_id));
create policy dcr_write on public.deep_clean_rooms for update using (hotel_id = public.hq_my_hotel());
create policy dce_read on public.deep_clean_events for select using (public.hq_can_see(hotel_id));
create policy dce_ins on public.deep_clean_events for insert with check (hotel_id = public.hq_my_hotel());

create policy au_read on public.audit_log for select using (public.hq_is_leader(hotel_id));
create policy au_ins on public.audit_log for insert with check (hotel_id = public.hq_my_hotel() or public.hq_is_corporate());
-- no update/delete policies: audit rows are append-only.

create policy qi_read on public.quore_imports for select using (public.hq_can_see(hotel_id));
create policy qi_ins on public.quore_imports for insert with check (hotel_id = public.hq_my_hotel() or public.hq_is_corporate());
create policy qir_read on public.quore_import_rows for select using (public.hq_can_see(hotel_id));
create policy qir_ins on public.quore_import_rows for insert with check (hotel_id = public.hq_my_hotel() or public.hq_is_corporate());

create policy rs_all on public.report_schedules for all using (public.hq_is_corporate()) with check (public.hq_is_corporate());
