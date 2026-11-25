-- Night Audit review for the HotelKey daily CSVs. Additive only.
-- Not applied by this change. Review it, then run it when you are ready.
-- No existing table, column, or row is dropped or deleted.
-- A second ingest of the same hotel and business date inserts nothing
-- that is already stored (items and coverage use on conflict do nothing).
--
-- GM, AGM, and above-property read coverage for their hotels.
-- The service role posts the payload from tools/hotelkey-night-audit.js.
-- Guest names are not part of this payload. Folio, room, and count only.
--
-- Checks the daily files can score:
--   checkout_balance, noshow_fee, cash_variance, ooo_returned
--   tax_certificate only when the tax file has a certificate column.
-- Checks these files cannot score:
--   cancel_fee, rate_override, adjustment_reason, tax_certificate
--   (without that column), inhouse_balance, house_account, ar_aging,
--   housekeeping.

create table if not exists public.night_audit_check_coverage (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  audit_date date not null,
  check_id text not null check (check_id ~ '^[a-z][a-z0-9_]{0,40}$'),
  support text not null check (support in ('supported', 'unsupported')),
  reason_en text not null check (char_length(btrim(reason_en)) between 1 and 240),
  reason_es text not null check (char_length(btrim(reason_es)) between 1 and 240),
  report_id uuid references public.night_audit_reports (id),
  created_at timestamptz not null default pg_catalog.now(),
  unique (hotel, audit_date, check_id)
);

comment on table public.night_audit_check_coverage is
  'Which HotelKey night-audit checks a business date could score. Insert only. Unsupported means the file has no column for that check.';

create index if not exists night_audit_check_coverage_hotel_idx
  on public.night_audit_check_coverage (hotel, audit_date desc);

alter table public.night_audit_check_coverage enable row level security;

drop policy if exists night_audit_check_coverage_select on public.night_audit_check_coverage;
create policy night_audit_check_coverage_select on public.night_audit_check_coverage
  for select to authenticated
  using ((select private.night_audit_allowed(hotel)));

revoke all on table public.night_audit_check_coverage from public, anon, authenticated;
grant select on table public.night_audit_check_coverage to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant select, insert on table public.night_audit_check_coverage to service_role;
  end if;
end $$;

-- A clean morning has rows and no items. Callers that pass status parsed
-- store parsed instead of awaiting_sample. Older callers are unchanged.
create or replace function private.ingest_night_audit_report(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_date date;
  v_source text;
  v_subject text;
  v_id uuid;
  v_status text;
  v_items jsonb;
  v_rows jsonb;
  v_item jsonb;
  v_row jsonb;
  v_i integer;
begin
  if not (
    coalesce((select auth.jwt() ->> 'role') = 'service_role', false)
    or ((select auth.uid()) is not null and private.night_audit_allowed(p->>'hotel'))
  ) then
    raise exception 'not allowed';
  end if;
  v_hotel := p->>'hotel';
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if coalesce(p->>'audit_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'audit_date';
  end if;
  v_date := (p->>'audit_date')::date;
  v_source := coalesce(p->>'source', 'unknown');
  if v_source !~ '^[a-z][a-z0-9_]{0,20}$' then
    raise exception 'unknown source';
  end if;
  v_subject := pg_catalog.left(coalesce(p->>'subject', ''), 200);
  v_items := case when jsonb_typeof(p->'items') = 'array' then p->'items' else '[]'::jsonb end;
  v_rows := case when jsonb_typeof(p->'rows') = 'array' then p->'rows' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_items) > 200 or pg_catalog.jsonb_array_length(v_rows) > 500 then
    raise exception 'too many rows';
  end if;
  v_status := case
    when pg_catalog.jsonb_array_length(v_items) > 0 then 'parsed'
    when coalesce(p->>'status', '') = 'parsed' and pg_catalog.jsonb_array_length(v_rows) > 0 then 'parsed'
    else 'awaiting_sample'
  end;
  insert into public.night_audit_reports (hotel, audit_date, source, subject, status)
  values (v_hotel, v_date, v_source, v_subject, v_status)
  returning id into v_id;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_rows) - 1 loop
    v_row := v_rows -> v_i;
    insert into public.night_audit_report_rows (report_id, hotel, audit_date, row_no, section, cells, raw_line)
    values (
      v_id, v_hotel, v_date, v_i + 1,
      pg_catalog.left(coalesce(v_row->>'section', ''), 40),
      coalesce(v_row->'cells', '{}'::jsonb),
      pg_catalog.left(coalesce(v_row->>'raw_line', ''), 400)
    );
  end loop;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_items) - 1 loop
    v_item := v_items -> v_i;
    if exists (
      select 1 from public.night_audit_suppressions s
      where s.active and s.hotel = v_hotel and s.code = v_item->>'code' and s.confirmation = v_item->>'confirmation'
    ) then
      continue;
    end if;
    insert into public.night_audit_items (
      hotel, audit_date, category, code, guest_name, confirmation,
      why_en, why_es, fix_en, fix_es, amount, room, fingerprint, report_id
    ) values (
      v_hotel, v_date,
      v_item->>'category', v_item->>'code', v_item->>'guest_name', v_item->>'confirmation',
      v_item->>'why_en', v_item->>'why_es', v_item->>'fix_en', v_item->>'fix_es',
      (v_item->>'amount')::numeric, coalesce(v_item->>'room', ''),
      coalesce(v_item->>'fingerprint', v_hotel || '|' || (v_item->>'code') || '|' || (v_item->>'confirmation')),
      v_id
    )
    on conflict (hotel, audit_date, code, confirmation) do nothing;
  end loop;
  return v_id;
end;
$$;

create or replace function private.ingest_hotelkey_night_audit(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_cov jsonb;
  v_row jsonb;
  v_i integer;
  v_en text;
  v_es text;
  v_check text;
  v_support text;
begin
  if (select auth.uid()) is null and coalesce((select auth.jwt() ->> 'role') = 'service_role', false) = false then
    raise exception 'not allowed';
  end if;
  v_id := private.ingest_night_audit_report(p);
  v_cov := case when jsonb_typeof(p->'coverage') = 'array' then p->'coverage' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_cov) > 40 then
    raise exception 'too many checks';
  end if;
  for v_i in 0 .. pg_catalog.jsonb_array_length(v_cov) - 1 loop
    v_row := v_cov -> v_i;
    v_check := coalesce(v_row->>'check_id', '');
    v_support := coalesce(v_row->>'support', '');
    v_en := pg_catalog.btrim(coalesce(v_row->>'reason_en', ''));
    v_es := pg_catalog.btrim(coalesce(v_row->>'reason_es', ''));
    if v_es = '' then
      v_es := v_en;
    end if;
    if v_check !~ '^[a-z][a-z0-9_]{0,40}$' then
      continue;
    end if;
    if v_support not in ('supported', 'unsupported') then
      continue;
    end if;
    if pg_catalog.char_length(v_en) < 1 or pg_catalog.char_length(v_es) < 1 then
      continue;
    end if;
    insert into public.night_audit_check_coverage (
      hotel, audit_date, check_id, support, reason_en, reason_es, report_id
    ) values (
      p->>'hotel', (p->>'audit_date')::date, v_check, v_support,
      pg_catalog.left(v_en, 240), pg_catalog.left(v_es, 240), v_id
    )
    on conflict (hotel, audit_date, check_id) do nothing;
  end loop;
  return v_id;
end;
$$;

create or replace function public.ingest_hotelkey_night_audit(p jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_hotelkey_night_audit(p);
$$;

revoke all on function private.ingest_hotelkey_night_audit(jsonb) from public, anon;
revoke all on function public.ingest_hotelkey_night_audit(jsonb) from public, anon;
grant execute on function private.ingest_hotelkey_night_audit(jsonb) to authenticated;
grant execute on function public.ingest_hotelkey_night_audit(jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant execute on function private.ingest_hotelkey_night_audit(jsonb) to service_role;
    grant execute on function public.ingest_hotelkey_night_audit(jsonb) to service_role;
  end if;
end $$;
