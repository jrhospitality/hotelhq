-- Accounts receivable. Additive only. Does not change hotel_features or existing functions.
-- No email parsing lives here. A separate process inserts these rows.
-- Guest names are not stored. Closed folios and in-house rows keep a folio or
-- confirmation reference and a room. House and direct-bill rows keep an account code.
-- Example labels in git start with "Example". Do not load real guest or company names into git.
--
-- Expected loader rows
--
-- Closed folio (Hampton PEP "Closed Folio Balances"):
--   hotel, audit_date, folio_ref, room, check_in, check_out,
--   stay_status (CHECKED_OUT | NO_SHOW | CANCELLED), ending_balance, source
--   source is pep, hotelkey, astay, or example.
--
-- House account (Hampton PEP "House Account Folio Balances"):
--   hotel, audit_date, account_code, account_type, account_status,
--   opening_balance, net_change, ending_balance, last_posted, source
--
-- In-house folio (Hampton PEP "In House Guest Folio Balances"):
--   hotel, audit_date, folio_ref, room, charges, payments, ending_balance, source
--   The PEP file has today's charges and payments only. ending_balance stays null
--   until a file actually carries one. A null ending balance is not a flag.
--
-- Direct-bill aging, per company, tall buckets (Hampton PEP "Direct Bill Aging"):
--   hotel, as_of, section (aging | settlements), account_code, company_label,
--   bucket_set, bucket, amount, source
--   pep buckets: current, over_7, over_14, over_30, over_60, over_90, over_120, over_150, total
--   standard buckets: current, d30, d60, d90_plus, total
--   Settlements use section = settlements. A single settlement amount uses bucket total.
--
-- Hotel-level aging summary (entered by corporate, or loaded when the PMS has no company rows):
--   hotel, as_of, bucket_set, bucket, amount, source (entered | loaded | example)
--
-- Ledger totals, one row per ledger per hotel per day (Golden Valley HotelKey and
-- SpringHill Astay today; also the fallback wherever folio detail is missing):
--   hotel, audit_date, ledger (guest | city | ar | house | deposit),
--   yesterday_balance, today_balance, source
--
-- Check state, one row per check per hotel per audit date:
--   hotel, audit_date, check_kind (checkout_balance | house_account | inhouse_over),
--   status (ready | source_missing), detail_level (folio | ledger | none), source, reason
--   ready means the check can be scored. source_missing means this check's report
--   is not available, or it arrived without the balance column.
--   No row at all, and no ledger row, means the feed has not been loaded yet.
--
-- Flag, only when a ready check finds a balance the GM or AGM must clear:
--   hotel, audit_date, check_kind, folio_ref, room, amount, opened_on, stay_status, source
--   checkout_balance and house_account: any non-zero ending balance.
--   inhouse_over: ending_balance greater than ar_settings.inhouse_threshold (default 500).
--   opened_on is the first audit date that folio and check were open. More than 3 days escalates.

create schema if not exists private;

grant usage on schema private to authenticated;

create table if not exists public.ar_settings (
  hotel text primary key check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  inhouse_threshold numeric(12, 2) not null default 500 check (inhouse_threshold > 0 and inhouse_threshold < 1000000),
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.ar_settings is
  'Per-hotel in-house balance threshold. Corporate sets it. Default 500. The loader flags in-house rows only when ending_balance is greater than this.';

insert into public.ar_settings (hotel, inhouse_threshold)
values ('MSPWE', 500), ('MSPAM', 500), ('MSPMS', 500)
on conflict (hotel) do nothing;

create table if not exists public.ar_accounts (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  account_code text not null check (account_code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,23}$'),
  label text not null default '' check (char_length(label) <= 80),
  active boolean not null default true,
  source text not null default 'loaded' check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  created_at timestamptz not null default pg_catalog.now(),
  unique (hotel, account_code),
  unique (id, hotel)
);

comment on table public.ar_accounts is
  'Direct-bill company accounts. account_code is the PMS company code. label is a company name, never a guest name.';

create table if not exists public.ar_invoice_months (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  period_month date not null check (period_month = date_trunc('month', period_month)::date),
  proof_kind text check (proof_kind in ('link', 'file', 'no_open_ar')),
  proof_url text not null default '' check (char_length(proof_url) <= 400),
  proof_name text not null default '' check (char_length(proof_name) <= 120),
  proof_note text not null default '' check (char_length(proof_note) <= 400),
  submitted_at timestamptz,
  submitted_by uuid,
  submitted_name text not null default '' check (char_length(submitted_name) <= 80),
  primary key (hotel, period_month),
  check (
    submitted_at is null
    or (proof_kind = 'no_open_ar' and char_length(btrim(proof_note)) >= 3)
    or (proof_kind = 'link' and proof_url ~ '^https://')
    or (
      proof_kind = 'file'
      and char_length(btrim(proof_name)) >= 1
      and (proof_url ~ '^https://' or proof_url ~ '^(MSPWE|MSPAM|MSPMS)/')
    )
  )
);

comment on table public.ar_invoice_months is
  'One direct-bill invoice task per hotel per month. The task is due on the 5th, America/Chicago. Proof is an aging-report link or file, or no open AR with a note.';

create table if not exists public.ar_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  period_month date not null,
  account_id uuid not null,
  sent boolean not null,
  amount numeric(12, 2),
  sent_on date,
  updated_at timestamptz not null default pg_catalog.now(),
  unique (hotel, period_month, account_id),
  foreign key (hotel, period_month) references public.ar_invoice_months (hotel, period_month),
  foreign key (account_id, hotel) references public.ar_accounts (id, hotel),
  check (
    (sent = false and amount is null and sent_on is null)
    or (sent = true and amount is not null and amount >= 0 and amount < 1000000 and sent_on is not null)
  )
);

comment on table public.ar_invoice_lines is
  'GM or AGM record for one direct-bill account: sent or not, the amount, and the date sent.';

create table if not exists public.ar_aging_summaries (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  as_of date not null,
  bucket_set text not null check (bucket_set in ('pep', 'standard')),
  bucket text not null,
  amount numeric(14, 2) not null check (amount > -100000000 and amount < 100000000),
  source text not null check (source in ('entered', 'loaded', 'example')),
  entered_by uuid,
  entered_name text not null default '' check (char_length(entered_name) <= 80),
  entered_at timestamptz not null default pg_catalog.now(),
  primary key (hotel, as_of, bucket_set, bucket, source),
  check (
    (bucket_set = 'pep' and bucket in ('current', 'over_7', 'over_14', 'over_30', 'over_60', 'over_90', 'over_120', 'over_150', 'total'))
    or (bucket_set = 'standard' and bucket in ('current', 'd30', 'd60', 'd90_plus', 'total'))
  )
);

comment on table public.ar_aging_summaries is
  'Hotel-level aging. bucket_set pep is Current and Over 7/14/30/60/90/120/150. bucket_set standard is Current, 30, 60, and 90+. Corporate can enter the standard set. The loader writes either set.';

create table if not exists public.ar_aging_accounts (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  as_of date not null,
  section text not null check (section in ('aging', 'settlements')),
  account_code text not null check (account_code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,23}$'),
  company_label text not null default '' check (char_length(company_label) <= 80),
  bucket_set text not null check (bucket_set in ('pep', 'standard')),
  bucket text not null,
  amount numeric(14, 2) not null check (amount > -100000000 and amount < 100000000),
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  unique (hotel, as_of, section, account_code, bucket_set, bucket),
  check (
    (bucket_set = 'pep' and bucket in ('current', 'over_7', 'over_14', 'over_30', 'over_60', 'over_90', 'over_120', 'over_150', 'total'))
    or (bucket_set = 'standard' and bucket in ('current', 'd30', 'd60', 'd90_plus', 'total'))
  )
);

comment on table public.ar_aging_accounts is
  'Per-company direct-bill aging, plus a settlements section. company_label is the PMS company, never a guest. PEP uses the over-7 through over-150 buckets.';

create table if not exists public.ar_balance_checks (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  check_kind text not null check (check_kind in ('checkout_balance', 'house_account', 'inhouse_over')),
  status text not null check (status in ('ready', 'source_missing')),
  detail_level text not null default 'none' check (detail_level in ('folio', 'ledger', 'none')),
  source text not null default '' check (source = '' or source ~ '^[a-z][a-z0-9_]{0,20}$'),
  reason text not null default '' check (char_length(reason) <= 200),
  loaded_at timestamptz not null default pg_catalog.now(),
  primary key (hotel, audit_date, check_kind)
);

comment on table public.ar_balance_checks is
  'One state per balance check, per hotel, per audit date. source_missing means that check cannot be scored. ready means folio rows can be scored. Absence of every check and ledger row means the feed is not loaded yet.';

create table if not exists public.ar_ledger_totals (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  ledger text not null check (ledger in ('guest', 'city', 'ar', 'house', 'deposit')),
  yesterday_balance numeric(14, 2) not null check (yesterday_balance > -100000000 and yesterday_balance < 100000000),
  today_balance numeric(14, 2) not null check (today_balance > -100000000 and today_balance < 100000000),
  source text not null default 'loaded' check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  primary key (hotel, audit_date, ledger)
);

comment on table public.ar_ledger_totals is
  'Guest, city, AR, house, and deposit ledger totals for one hotel and one audit date. Fallback when closed-folio, house-account, or in-house detail is missing.';

create table if not exists public.ar_closed_folios (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  folio_ref text not null check (folio_ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,23}$'),
  room text not null default '' check (room = '' or room ~ '^[A-Za-z0-9]{1,8}$'),
  check_in date,
  check_out date,
  stay_status text not null check (stay_status in ('CHECKED_OUT', 'NO_SHOW', 'CANCELLED')),
  ending_balance numeric(14, 2) not null check (ending_balance > -100000000 and ending_balance < 100000000),
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  unique (hotel, audit_date, folio_ref, stay_status)
);

comment on table public.ar_closed_folios is
  'Closed folio balances. folio_ref is the confirmation number. No guest name column. A non-zero ending balance becomes a checkout_balance flag.';

create table if not exists public.ar_house_folios (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  account_code text not null check (account_code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,23}$'),
  account_type text not null default '' check (char_length(account_type) <= 24),
  account_status text not null default '' check (char_length(account_status) <= 24),
  opening_balance numeric(14, 2) check (opening_balance is null or (opening_balance > -100000000 and opening_balance < 100000000)),
  net_change numeric(14, 2) check (net_change is null or (net_change > -100000000 and net_change < 100000000)),
  ending_balance numeric(14, 2) not null check (ending_balance > -100000000 and ending_balance < 100000000),
  last_posted date,
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  unique (hotel, audit_date, account_code)
);

comment on table public.ar_house_folios is
  'House account folio balances. Any non-zero ending balance becomes a house_account flag. account_code is not a guest name.';

create table if not exists public.ar_inhouse_folios (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  folio_ref text not null check (folio_ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,23}$'),
  room text not null default '' check (room = '' or room ~ '^[A-Za-z0-9]{1,8}$'),
  charges numeric(14, 2) check (charges is null or (charges > -100000000 and charges < 100000000)),
  payments numeric(14, 2) check (payments is null or (payments > -100000000 and payments < 100000000)),
  ending_balance numeric(14, 2) check (ending_balance is null or (ending_balance > -100000000 and ending_balance < 100000000)),
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  unique (hotel, audit_date, folio_ref)
);

comment on table public.ar_inhouse_folios is
  'In-house folio activity. PEP sends charges and payments only, so ending_balance is null and the in-house check stays source_missing. A flag is allowed only when ending_balance is greater than the hotel threshold.';

create table if not exists public.ar_balance_flags (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  check_kind text not null check (check_kind in ('checkout_balance', 'house_account', 'inhouse_over')),
  folio_ref text not null check (folio_ref ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,23}$'),
  room text not null default '' check (room = '' or room ~ '^[A-Za-z0-9]{1,8}$'),
  amount numeric(14, 2) not null check (amount <> 0 and amount > -100000000 and amount < 100000000),
  opened_on date not null check (opened_on <= audit_date),
  stay_status text not null default '' check (stay_status = '' or stay_status in ('CHECKED_OUT', 'NO_SHOW', 'CANCELLED')),
  source text not null default 'loaded' check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  created_at timestamptz not null default pg_catalog.now(),
  unique (hotel, audit_date, check_kind, folio_ref),
  unique (id, hotel)
);

comment on table public.ar_balance_flags is
  'A balance the GM or AGM must resolve: collected, moved to direct bill, or explained. opened_on drives the 3-day escalation to corporate. folio_ref is not a guest name.';

create index if not exists ar_balance_flags_hotel_date_idx
  on public.ar_balance_flags (hotel, audit_date desc);

create index if not exists ar_balance_flags_inhouse_idx
  on public.ar_balance_flags (hotel, audit_date desc)
  where check_kind = 'inhouse_over';

create index if not exists ar_balance_checks_hotel_date_idx
  on public.ar_balance_checks (hotel, audit_date desc);

create index if not exists ar_ledger_totals_hotel_date_idx
  on public.ar_ledger_totals (hotel, audit_date desc);

create index if not exists ar_aging_summaries_hotel_idx
  on public.ar_aging_summaries (hotel, as_of desc);

create index if not exists ar_aging_accounts_hotel_idx
  on public.ar_aging_accounts (hotel, as_of desc);

create index if not exists ar_invoice_lines_month_idx
  on public.ar_invoice_lines (hotel, period_month);

create index if not exists ar_closed_folios_hotel_idx
  on public.ar_closed_folios (hotel, audit_date desc);

create index if not exists ar_house_folios_hotel_idx
  on public.ar_house_folios (hotel, audit_date desc);

create index if not exists ar_inhouse_folios_hotel_idx
  on public.ar_inhouse_folios (hotel, audit_date desc);

create table if not exists public.ar_balance_resolutions (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  action text not null check (action in ('collected', 'direct_bill', 'explain')),
  note text not null default '' check (char_length(note) <= 240),
  resolved_by uuid default auth.uid(),
  resolved_name text not null default '' check (char_length(resolved_name) <= 80),
  resolved_at timestamptz not null default pg_catalog.now(),
  unique (flag_id),
  foreign key (flag_id, hotel) references public.ar_balance_flags (id, hotel),
  check (
    (action = 'explain' and char_length(btrim(note)) >= 3)
    or action in ('collected', 'direct_bill')
  )
);

comment on table public.ar_balance_resolutions is
  'One clearing action per flag: collected, moved to direct bill, or explained. Explained requires a note.';

alter table public.ar_settings enable row level security;
alter table public.ar_accounts enable row level security;
alter table public.ar_invoice_months enable row level security;
alter table public.ar_invoice_lines enable row level security;
alter table public.ar_aging_summaries enable row level security;
alter table public.ar_aging_accounts enable row level security;
alter table public.ar_balance_checks enable row level security;
alter table public.ar_ledger_totals enable row level security;
alter table public.ar_closed_folios enable row level security;
alter table public.ar_house_folios enable row level security;
alter table public.ar_inhouse_folios enable row level security;
alter table public.ar_balance_flags enable row level security;
alter table public.ar_balance_resolutions enable row level security;

create or replace function private.ar_leader(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or (
      private.my_role() in ('gm', 'agm')
      and p_hotel = any ((select private.my_hotels())::text[])
    ),
    false
  );
$$;

create or replace function private.ar_desk(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.my_role() = 'front_desk'
    and p_hotel = any ((select private.my_hotels())::text[]),
    false
  );
$$;

create or replace function private.ar_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (pg_catalog.timezone('America/Chicago', pg_catalog.now()))::date;
$$;

-- GM and AGM read their hotel. Corporate reads every hotel.
-- Front desk reads the in-house check, its flags, and the threshold, so they can collect.
drop policy if exists ar_settings_select on public.ar_settings;
create policy ar_settings_select on public.ar_settings
  for select to authenticated
  using ((select private.ar_leader(hotel)) or (select private.ar_desk(hotel)));

drop policy if exists ar_accounts_select on public.ar_accounts;
create policy ar_accounts_select on public.ar_accounts
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_invoice_months_select on public.ar_invoice_months;
create policy ar_invoice_months_select on public.ar_invoice_months
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_invoice_lines_select on public.ar_invoice_lines;
create policy ar_invoice_lines_select on public.ar_invoice_lines
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_aging_summaries_select on public.ar_aging_summaries;
create policy ar_aging_summaries_select on public.ar_aging_summaries
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_aging_accounts_select on public.ar_aging_accounts;
create policy ar_aging_accounts_select on public.ar_aging_accounts
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_balance_checks_select on public.ar_balance_checks;
create policy ar_balance_checks_select on public.ar_balance_checks
  for select to authenticated
  using (
    (select private.ar_leader(hotel))
    or (check_kind = 'inhouse_over' and (select private.ar_desk(hotel)))
  );

drop policy if exists ar_ledger_totals_select on public.ar_ledger_totals;
create policy ar_ledger_totals_select on public.ar_ledger_totals
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_closed_folios_select on public.ar_closed_folios;
create policy ar_closed_folios_select on public.ar_closed_folios
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_house_folios_select on public.ar_house_folios;
create policy ar_house_folios_select on public.ar_house_folios
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_inhouse_folios_select on public.ar_inhouse_folios;
create policy ar_inhouse_folios_select on public.ar_inhouse_folios
  for select to authenticated
  using ((select private.ar_leader(hotel)));

drop policy if exists ar_balance_flags_select on public.ar_balance_flags;
create policy ar_balance_flags_select on public.ar_balance_flags
  for select to authenticated
  using (
    (select private.ar_leader(hotel))
    or (check_kind = 'inhouse_over' and (select private.ar_desk(hotel)))
  );

drop policy if exists ar_balance_resolutions_select on public.ar_balance_resolutions;
create policy ar_balance_resolutions_select on public.ar_balance_resolutions
  for select to authenticated
  using (
    (select private.ar_leader(hotel))
    or (
      (select private.ar_desk(hotel))
      and exists (
        select 1 from public.ar_balance_flags f
        where f.id = flag_id
          and f.hotel = ar_balance_resolutions.hotel
          and f.check_kind = 'inhouse_over'
      )
    )
  );

create or replace function private.set_ar_inhouse_threshold(p_hotel text, p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.is_above() then
    raise exception 'not allowed';
  end if;
  if p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1000000 then
    raise exception 'bad threshold';
  end if;
  insert into public.ar_settings (hotel, inhouse_threshold, updated_by, updated_at)
  values (p_hotel, pg_catalog.round(p_amount, 2), (select auth.uid()), pg_catalog.now())
  on conflict (hotel) do update
    set inhouse_threshold = excluded.inhouse_threshold,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function private.save_ar_invoice_line(
  p_hotel text,
  p_month date,
  p_account uuid,
  p_sent boolean,
  p_amount numeric,
  p_sent_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
begin
  if (select auth.uid()) is null or not private.ar_leader(p_hotel) or private.is_above() then
    raise exception 'not allowed';
  end if;
  if p_month is null or p_month <> pg_catalog.date_trunc('month', p_month)::date then
    raise exception 'bad month';
  end if;
  v_today := private.ar_today();
  if p_month > v_today then
    raise exception 'future month';
  end if;
  if not exists (
    select 1 from public.ar_accounts a
    where a.id = p_account and a.hotel = p_hotel and a.active
  ) then
    raise exception 'unknown account';
  end if;
  insert into public.ar_invoice_months (hotel, period_month)
  values (p_hotel, p_month)
  on conflict (hotel, period_month) do nothing;
  if exists (
    select 1 from public.ar_invoice_months m
    where m.hotel = p_hotel and m.period_month = p_month and m.submitted_at is not null
  ) then
    raise exception 'submitted';
  end if;
  if coalesce(p_sent, false) then
    if p_amount is null or p_amount < 0 or p_amount >= 1000000 or p_sent_on is null then
      raise exception 'amount and date';
    end if;
    if p_sent_on < p_month or p_sent_on > v_today then
      raise exception 'bad sent date';
    end if;
    insert into public.ar_invoice_lines (hotel, period_month, account_id, sent, amount, sent_on, updated_at)
    values (p_hotel, p_month, p_account, true, pg_catalog.round(p_amount, 2), p_sent_on, pg_catalog.now())
    on conflict (hotel, period_month, account_id) do update
      set sent = true,
          amount = excluded.amount,
          sent_on = excluded.sent_on,
          updated_at = excluded.updated_at;
  else
    insert into public.ar_invoice_lines (hotel, period_month, account_id, sent, amount, sent_on, updated_at)
    values (p_hotel, p_month, p_account, false, null, null, pg_catalog.now())
    on conflict (hotel, period_month, account_id) do update
      set sent = false, amount = null, sent_on = null, updated_at = excluded.updated_at;
  end if;
end;
$$;

create or replace function private.submit_ar_invoice_month(
  p_hotel text,
  p_month date,
  p_proof_kind text,
  p_proof_url text,
  p_proof_name text,
  p_proof_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_name text;
  v_missing integer;
begin
  if (select auth.uid()) is null or not private.ar_leader(p_hotel) or private.is_above() then
    raise exception 'not allowed';
  end if;
  if p_month is null or p_month <> pg_catalog.date_trunc('month', p_month)::date then
    raise exception 'bad month';
  end if;
  v_today := private.ar_today();
  if p_month > v_today then
    raise exception 'future month';
  end if;
  if exists (
    select 1 from public.ar_invoice_months m
    where m.hotel = p_hotel and m.period_month = p_month and m.submitted_at is not null
  ) then
    raise exception 'submitted';
  end if;
  p_proof_url := pg_catalog.btrim(coalesce(p_proof_url, ''));
  p_proof_name := pg_catalog.btrim(coalesce(p_proof_name, ''));
  p_proof_note := pg_catalog.btrim(coalesce(p_proof_note, ''));
  if pg_catalog.char_length(p_proof_url) > 400 or pg_catalog.char_length(p_proof_name) > 120 or pg_catalog.char_length(p_proof_note) > 400 then
    raise exception 'too long';
  end if;
  if p_proof_kind = 'no_open_ar' then
    if pg_catalog.char_length(p_proof_note) < 3 then
      raise exception 'note required';
    end if;
    if exists (
      select 1 from public.ar_invoice_lines l
      where l.hotel = p_hotel and l.period_month = p_month and l.sent
    ) then
      raise exception 'invoices were sent';
    end if;
  elsif p_proof_kind = 'link' then
    if p_proof_url !~ '^https://' then
      raise exception 'proof required';
    end if;
  elsif p_proof_kind = 'file' then
    if pg_catalog.char_length(p_proof_name) < 1 or (p_proof_url !~ '^https://' and p_proof_url !~ '^(MSPWE|MSPAM|MSPMS)/') then
      raise exception 'proof required';
    end if;
  else
    raise exception 'proof required';
  end if;
  select count(*) into v_missing
  from public.ar_accounts a
  where a.hotel = p_hotel and a.active
    and not exists (
      select 1 from public.ar_invoice_lines l
      where l.account_id = a.id and l.hotel = p_hotel and l.period_month = p_month
    );
  if v_missing > 0 then
    raise exception 'lines required';
  end if;
  select coalesce(p.name, '') into v_name
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
  insert into public.ar_invoice_months (
    hotel, period_month, proof_kind, proof_url, proof_name, proof_note, submitted_at, submitted_by, submitted_name
  ) values (
    p_hotel, p_month, p_proof_kind, p_proof_url, p_proof_name, p_proof_note,
    pg_catalog.now(), (select auth.uid()), coalesce(v_name, '')
  )
  on conflict (hotel, period_month) do update
    set proof_kind = excluded.proof_kind,
        proof_url = excluded.proof_url,
        proof_name = excluded.proof_name,
        proof_note = excluded.proof_note,
        submitted_at = coalesce(public.ar_invoice_months.submitted_at, excluded.submitted_at),
        submitted_by = coalesce(public.ar_invoice_months.submitted_by, excluded.submitted_by),
        submitted_name = case
          when public.ar_invoice_months.submitted_name = '' then excluded.submitted_name
          else public.ar_invoice_months.submitted_name
        end
    where public.ar_invoice_months.submitted_at is null;
end;
$$;

create or replace function private.save_ar_aging_summary(
  p_hotel text,
  p_as_of date,
  p_current numeric,
  p_d30 numeric,
  p_d60 numeric,
  p_d90 numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_name text;
begin
  if (select auth.uid()) is null or not private.is_above() then
    raise exception 'not allowed';
  end if;
  if p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  v_today := private.ar_today();
  if p_as_of is null or p_as_of > v_today then
    raise exception 'bad date';
  end if;
  select coalesce(p.name, '') into v_name
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
  if p_current is null or p_d30 is null or p_d60 is null or p_d90 is null
     or p_current < 0 or p_d30 < 0 or p_d60 < 0 or p_d90 < 0
     or p_current >= 100000000 or p_d30 >= 100000000 or p_d60 >= 100000000 or p_d90 >= 100000000 then
    raise exception 'bad amount';
  end if;
  insert into public.ar_aging_summaries (hotel, as_of, bucket_set, bucket, amount, source, entered_by, entered_name, entered_at)
  values
    (p_hotel, p_as_of, 'standard', 'current', pg_catalog.round(p_current, 2), 'entered', (select auth.uid()), coalesce(v_name, ''), pg_catalog.now()),
    (p_hotel, p_as_of, 'standard', 'd30', pg_catalog.round(p_d30, 2), 'entered', (select auth.uid()), coalesce(v_name, ''), pg_catalog.now()),
    (p_hotel, p_as_of, 'standard', 'd60', pg_catalog.round(p_d60, 2), 'entered', (select auth.uid()), coalesce(v_name, ''), pg_catalog.now()),
    (p_hotel, p_as_of, 'standard', 'd90_plus', pg_catalog.round(p_d90, 2), 'entered', (select auth.uid()), coalesce(v_name, ''), pg_catalog.now())
  on conflict (hotel, as_of, bucket_set, bucket, source) do update
    set amount = excluded.amount,
        entered_by = excluded.entered_by,
        entered_name = excluded.entered_name,
        entered_at = excluded.entered_at;
end;
$$;

create or replace function private.resolve_ar_balance_flag(p_flag uuid, p_action text, p_note text)
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
  if p_action not in ('collected', 'direct_bill', 'explain') then
    raise exception 'unknown action';
  end if;
  p_note := pg_catalog.btrim(coalesce(p_note, ''));
  if p_action = 'explain' and pg_catalog.char_length(p_note) < 3 then
    raise exception 'note required';
  end if;
  if pg_catalog.char_length(p_note) > 240 then
    raise exception 'note too long';
  end if;
  select hotel into v_hotel from public.ar_balance_flags where id = p_flag;
  if v_hotel is null or not private.ar_leader(v_hotel) then
    raise exception 'not allowed';
  end if;
  if exists (select 1 from public.ar_balance_resolutions r where r.flag_id = p_flag) then
    raise exception 'already resolved';
  end if;
  select coalesce(p.name, '') into v_name
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
  insert into public.ar_balance_resolutions (flag_id, hotel, action, note, resolved_by, resolved_name)
  values (p_flag, v_hotel, p_action, p_note, (select auth.uid()), coalesce(v_name, ''));
end;
$$;

create or replace function private.ar_proof_object_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[];
  v_hotel text;
begin
  if (select auth.uid()) is null then
    return false;
  end if;
  parts := storage.foldername(p_name);
  if parts is null or coalesce(pg_catalog.array_length(parts, 1), 0) < 1 then
    return false;
  end if;
  v_hotel := parts[1];
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    return false;
  end if;
  return private.ar_leader(v_hotel) and not private.is_above();
end;
$$;

create or replace function public.set_ar_inhouse_threshold(p_hotel text, p_amount numeric)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_ar_inhouse_threshold(p_hotel, p_amount);
$$;

create or replace function public.save_ar_invoice_line(
  p_hotel text, p_month date, p_account uuid, p_sent boolean, p_amount numeric, p_sent_on date
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.save_ar_invoice_line(p_hotel, p_month, p_account, p_sent, p_amount, p_sent_on);
$$;

create or replace function public.submit_ar_invoice_month(
  p_hotel text, p_month date, p_proof_kind text, p_proof_url text, p_proof_name text, p_proof_note text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.submit_ar_invoice_month(p_hotel, p_month, p_proof_kind, p_proof_url, p_proof_name, p_proof_note);
$$;

create or replace function public.save_ar_aging_summary(
  p_hotel text, p_as_of date, p_current numeric, p_d30 numeric, p_d60 numeric, p_d90 numeric
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.save_ar_aging_summary(p_hotel, p_as_of, p_current, p_d30, p_d60, p_d90);
$$;

create or replace function public.resolve_ar_balance_flag(p_flag uuid, p_action text, p_note text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.resolve_ar_balance_flag(p_flag, p_action, p_note);
$$;

revoke all on function private.ar_leader(text) from public, anon;
revoke all on function private.ar_desk(text) from public, anon;
revoke all on function private.ar_today() from public, anon;
revoke all on function private.set_ar_inhouse_threshold(text, numeric) from public, anon;
revoke all on function private.save_ar_invoice_line(text, date, uuid, boolean, numeric, date) from public, anon;
revoke all on function private.submit_ar_invoice_month(text, date, text, text, text, text) from public, anon;
revoke all on function private.save_ar_aging_summary(text, date, numeric, numeric, numeric, numeric) from public, anon;
revoke all on function private.resolve_ar_balance_flag(uuid, text, text) from public, anon;
revoke all on function private.ar_proof_object_allowed(text) from public, anon;
revoke all on function public.set_ar_inhouse_threshold(text, numeric) from public, anon;
revoke all on function public.save_ar_invoice_line(text, date, uuid, boolean, numeric, date) from public, anon;
revoke all on function public.submit_ar_invoice_month(text, date, text, text, text, text) from public, anon;
revoke all on function public.save_ar_aging_summary(text, date, numeric, numeric, numeric, numeric) from public, anon;
revoke all on function public.resolve_ar_balance_flag(uuid, text, text) from public, anon;

grant execute on function private.ar_leader(text) to authenticated;
grant execute on function private.ar_desk(text) to authenticated;
grant execute on function private.ar_today() to authenticated;
grant execute on function private.set_ar_inhouse_threshold(text, numeric) to authenticated;
grant execute on function private.save_ar_invoice_line(text, date, uuid, boolean, numeric, date) to authenticated;
grant execute on function private.submit_ar_invoice_month(text, date, text, text, text, text) to authenticated;
grant execute on function private.save_ar_aging_summary(text, date, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function private.resolve_ar_balance_flag(uuid, text, text) to authenticated;
grant execute on function private.ar_proof_object_allowed(text) to authenticated;
grant execute on function public.set_ar_inhouse_threshold(text, numeric) to authenticated;
grant execute on function public.save_ar_invoice_line(text, date, uuid, boolean, numeric, date) to authenticated;
grant execute on function public.submit_ar_invoice_month(text, date, text, text, text, text) to authenticated;
grant execute on function public.save_ar_aging_summary(text, date, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.resolve_ar_balance_flag(uuid, text, text) to authenticated;

revoke all on table public.ar_settings from public, anon, authenticated;
revoke all on table public.ar_accounts from public, anon, authenticated;
revoke all on table public.ar_invoice_months from public, anon, authenticated;
revoke all on table public.ar_invoice_lines from public, anon, authenticated;
revoke all on table public.ar_aging_summaries from public, anon, authenticated;
revoke all on table public.ar_aging_accounts from public, anon, authenticated;
revoke all on table public.ar_balance_checks from public, anon, authenticated;
revoke all on table public.ar_ledger_totals from public, anon, authenticated;
revoke all on table public.ar_closed_folios from public, anon, authenticated;
revoke all on table public.ar_house_folios from public, anon, authenticated;
revoke all on table public.ar_inhouse_folios from public, anon, authenticated;
revoke all on table public.ar_balance_flags from public, anon, authenticated;
revoke all on table public.ar_balance_resolutions from public, anon, authenticated;

grant select on table public.ar_settings to authenticated;
grant select on table public.ar_accounts to authenticated;
grant select on table public.ar_invoice_months to authenticated;
grant select on table public.ar_invoice_lines to authenticated;
grant select on table public.ar_aging_summaries to authenticated;
grant select on table public.ar_aging_accounts to authenticated;
grant select on table public.ar_balance_checks to authenticated;
grant select on table public.ar_ledger_totals to authenticated;
grant select on table public.ar_closed_folios to authenticated;
grant select on table public.ar_house_folios to authenticated;
grant select on table public.ar_inhouse_folios to authenticated;
grant select on table public.ar_balance_flags to authenticated;
grant select on table public.ar_balance_resolutions to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant select, insert on table public.ar_accounts to service_role;
    grant select, insert on table public.ar_aging_summaries to service_role;
    grant select, insert on table public.ar_aging_accounts to service_role;
    grant select, insert on table public.ar_balance_checks to service_role;
    grant select, insert on table public.ar_ledger_totals to service_role;
    grant select, insert on table public.ar_closed_folios to service_role;
    grant select, insert on table public.ar_house_folios to service_role;
    grant select, insert on table public.ar_inhouse_folios to service_role;
    grant select, insert on table public.ar_balance_flags to service_role;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ar-proofs',
  'ar-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ar_proofs_select on storage.objects;
create policy ar_proofs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'ar-proofs' and private.ar_proof_object_allowed(name));

drop policy if exists ar_proofs_insert on storage.objects;
create policy ar_proofs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ar-proofs' and private.ar_proof_object_allowed(name));
