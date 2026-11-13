-- Example accounts-receivable feed. Insert only. Not a migration.
-- EXAMPLE DATA. Made-up amounts, folio numbers, and company names.
-- Do not run this against the live project. Do not put real guest names,
-- confirmation numbers, or company names in this file.
-- On conflict, the existing row is left as it is.
--
-- Row shapes the daily loader is expected to insert
-- (there is no column for a guest name; do not add one):
--
-- Closed folio: hotel, audit_date, folio_ref, room, check_in, check_out,
--   stay_status (CHECKED_OUT | NO_SHOW | CANCELLED), ending_balance, source
-- House account: hotel, audit_date, account_code, account_type, account_status,
--   opening_balance, net_change, ending_balance, last_posted, source
-- In-house folio: hotel, audit_date, folio_ref, room, charges, payments,
--   ending_balance, source
--   PEP sends charges and payments only. Leave ending_balance null.
--   A flag is inserted only when ending_balance is greater than
--   ar_settings.inhouse_threshold (default 500).
-- Direct-bill aging: hotel, as_of, section (aging | settlements), account_code,
--   company_label, bucket_set (pep | standard), bucket, amount, source
--   pep buckets: current, over_7, over_14, over_30, over_60, over_90, over_120, over_150, total
--   standard buckets: current, d30, d60, d90_plus, total
-- Ledger total: hotel, audit_date, ledger (guest | city | ar | house | deposit),
--   yesterday_balance, today_balance, source
-- Check state: hotel, audit_date, check_kind (checkout_balance | house_account | inhouse_over),
--   status (ready | source_missing), detail_level (folio | ledger | none), source, reason
-- Flag: hotel, audit_date, check_kind, folio_ref, room, amount, opened_on, stay_status, source
--
-- This sample is a frozen November 2026 morning.
-- MSPAM (Hampton, PEP) has folio detail.
-- MSPWE (Golden Valley, HotelKey) and MSPMS (SpringHill, Astay) have ledger totals only,
-- so each balance check is source_missing.

insert into public.ar_accounts (hotel, account_code, label, source)
values
  ('MSPAM', 'EX-AR-100', 'Example City Ledger North', 'example'),
  ('MSPAM', 'EX-AR-101', 'Example Airline Crew', 'example')
on conflict (hotel, account_code) do nothing;

insert into public.ar_invoice_months (hotel, period_month)
values
  ('MSPWE', '2026-11-01'),
  ('MSPAM', '2026-11-01')
on conflict (hotel, period_month) do nothing;

insert into public.ar_invoice_months (
  hotel, period_month, proof_kind, proof_note, submitted_at, submitted_name
)
values (
  'MSPMS', '2026-11-01', 'no_open_ar',
  'Example: no company accounts on this feed.',
  '2026-11-03 15:00:00+00', 'Example GM'
)
on conflict (hotel, period_month) do nothing;

insert into public.ar_invoice_lines (hotel, period_month, account_id, sent, amount, sent_on)
select 'MSPAM', '2026-11-01', a.id, true, 1840.00, '2026-11-03'
from public.ar_accounts a
where a.hotel = 'MSPAM' and a.account_code = 'EX-AR-100'
on conflict (hotel, period_month, account_id) do nothing;

insert into public.ar_invoice_lines (hotel, period_month, account_id, sent, amount, sent_on)
select 'MSPAM', '2026-11-01', a.id, false, null, null
from public.ar_accounts a
where a.hotel = 'MSPAM' and a.account_code = 'EX-AR-101'
on conflict (hotel, period_month, account_id) do nothing;

insert into public.ar_aging_accounts (
  hotel, as_of, section, account_code, company_label, bucket_set, bucket, amount, source
)
values
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'current', 400.00, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_7', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_14', 100.00, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_30', 200.00, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_60', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_90', 50.00, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_120', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-100', 'Example City Ledger North', 'pep', 'over_150', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'current', 800.00, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_7', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_14', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_30', 150.00, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_60', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_90', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_120', 0, 'example'),
  ('MSPAM', '2026-11-12', 'aging', 'EX-AR-101', 'Example Airline Crew', 'pep', 'over_150', 0, 'example'),
  ('MSPAM', '2026-11-12', 'settlements', 'EX-AR-100', 'Example City Ledger North', 'pep', 'total', -200.00, 'example')
on conflict (hotel, as_of, section, account_code, bucket_set, bucket) do nothing;

insert into public.ar_aging_summaries (hotel, as_of, bucket_set, bucket, amount, source, entered_name)
values
  ('MSPWE', '2026-11-12', 'standard', 'current', 2400.00, 'example', ''),
  ('MSPWE', '2026-11-12', 'standard', 'd30', 1800.00, 'example', ''),
  ('MSPWE', '2026-11-12', 'standard', 'd60', 640.00, 'example', ''),
  ('MSPWE', '2026-11-12', 'standard', 'd90_plus', 820.00, 'example', ''),
  ('MSPMS', '2026-11-12', 'standard', 'current', 900.00, 'example', ''),
  ('MSPMS', '2026-11-12', 'standard', 'd30', 200.00, 'example', ''),
  ('MSPMS', '2026-11-12', 'standard', 'd60', 0, 'example', ''),
  ('MSPMS', '2026-11-12', 'standard', 'd90_plus', 1260.00, 'example', '')
on conflict (hotel, as_of, bucket_set, bucket, source) do nothing;

insert into public.ar_closed_folios (
  hotel, audit_date, folio_ref, room, check_in, check_out, stay_status, ending_balance, source
)
values
  ('MSPAM', '2026-11-12', 'EX-44021', '214', '2026-11-10', '2026-11-12', 'CHECKED_OUT', 186.40, 'example'),
  ('MSPAM', '2026-11-12', 'EX-44022', '118', '2026-11-11', '2026-11-12', 'CHECKED_OUT', 0, 'example'),
  ('MSPAM', '2026-11-12', 'EX-44023', '105', '2026-11-12', '2026-11-12', 'NO_SHOW', 40.00, 'example'),
  ('MSPAM', '2026-11-12', 'EX-44024', '220', '2026-11-12', '2026-11-12', 'CANCELLED', 0, 'example')
on conflict (hotel, audit_date, folio_ref, stay_status) do nothing;

insert into public.ar_house_folios (
  hotel, audit_date, account_code, account_type, account_status,
  opening_balance, net_change, ending_balance, last_posted, source
)
values
  ('MSPAM', '2026-11-12', 'HA-12', 'HOUSE', 'OPEN', 10.00, 30.00, 40.00, '2026-11-12', 'example'),
  ('MSPAM', '2026-11-12', 'HA-02', 'HOUSE', 'OPEN', 0, 0, 0, '2026-11-12', 'example')
on conflict (hotel, audit_date, account_code) do nothing;

insert into public.ar_inhouse_folios (
  hotel, audit_date, folio_ref, room, charges, payments, ending_balance, source
)
values
  ('MSPAM', '2026-11-12', 'EX-44110', '210', 180.00, 0, null, 'example')
on conflict (hotel, audit_date, folio_ref) do nothing;

insert into public.ar_balance_checks (
  hotel, audit_date, check_kind, status, detail_level, source, reason
)
values
  ('MSPAM', '2026-11-12', 'checkout_balance', 'ready', 'folio', 'example', ''),
  ('MSPAM', '2026-11-12', 'house_account', 'ready', 'folio', 'example', ''),
  ('MSPAM', '2026-11-12', 'inhouse_over', 'source_missing', 'folio', 'example',
    'The PEP in-house file has today''s charges and payments only, so there is no ending balance to compare.'),
  ('MSPWE', '2026-11-12', 'checkout_balance', 'source_missing', 'ledger', 'example',
    'HotelKey sends ledger totals. Closed-folio detail is not on this feed.'),
  ('MSPWE', '2026-11-12', 'house_account', 'source_missing', 'ledger', 'example',
    'HotelKey sends ledger totals. House-account detail is not on this feed.'),
  ('MSPWE', '2026-11-12', 'inhouse_over', 'source_missing', 'ledger', 'example',
    'HotelKey sends ledger totals. In-house folio balances are not on this feed.'),
  ('MSPMS', '2026-11-12', 'checkout_balance', 'source_missing', 'ledger', 'example',
    'Astay sends ledger totals. Closed-folio detail is not on this feed.'),
  ('MSPMS', '2026-11-12', 'house_account', 'source_missing', 'ledger', 'example',
    'Astay sends ledger totals. House-account detail is not on this feed.'),
  ('MSPMS', '2026-11-12', 'inhouse_over', 'source_missing', 'ledger', 'example',
    'Astay sends ledger totals. In-house folio balances are not on this feed.')
on conflict (hotel, audit_date, check_kind) do nothing;

insert into public.ar_balance_flags (
  hotel, audit_date, check_kind, folio_ref, room, amount, opened_on, stay_status, source
)
values
  ('MSPAM', '2026-11-12', 'checkout_balance', 'EX-44021', '214', 186.40, '2026-11-08', 'CHECKED_OUT', 'example'),
  ('MSPAM', '2026-11-12', 'checkout_balance', 'EX-44023', '105', 40.00, '2026-11-12', 'NO_SHOW', 'example'),
  ('MSPAM', '2026-11-12', 'house_account', 'HA-12', '', 40.00, '2026-11-12', '', 'example')
on conflict (hotel, audit_date, check_kind, folio_ref) do nothing;

insert into public.ar_ledger_totals (
  hotel, audit_date, ledger, yesterday_balance, today_balance, source
)
values
  ('MSPWE', '2026-11-12', 'guest', 4200.00, 3950.00, 'example'),
  ('MSPWE', '2026-11-12', 'city', 8100.00, 8400.00, 'example'),
  ('MSPWE', '2026-11-12', 'ar', 2600.00, 2400.00, 'example'),
  ('MSPWE', '2026-11-12', 'house', 150.00, 40.00, 'example'),
  ('MSPWE', '2026-11-12', 'deposit', 900.00, 1100.00, 'example'),
  ('MSPMS', '2026-11-12', 'guest', 3100.00, 2880.00, 'example'),
  ('MSPMS', '2026-11-12', 'city', 4500.00, 4700.00, 'example'),
  ('MSPMS', '2026-11-12', 'ar', 1260.00, 1400.00, 'example'),
  ('MSPMS', '2026-11-12', 'house', 80.00, 80.00, 'example'),
  ('MSPMS', '2026-11-12', 'deposit', 600.00, 550.00, 'example')
on conflict (hotel, audit_date, ledger) do nothing;
