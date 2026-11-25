-- Front desk sales leads. Additive only: new tables and functions.
-- Does not drop or delete existing rows.
-- Demo mode does not call this database and does not insert sample contacts.
-- Do not store a real sales-manager address in this file. The repo is public.
-- GM and JR Corporate save those addresses in the app (sales_lead_routes).
--
-- Who can file a lead: front desk, GM, AGM, and corporate.
-- Who can read the list and set New / Contacted / Won / Lost: GM, AGM,
-- corporate, and a profile whose private.my_role() is sales_manager.
-- Who can edit the sales-manager addresses: GM and corporate. Not AGM.
-- A person can always read a lead they just filed (created_by = auth.uid()).
--
-- Hotel scope, read once per statement:
--   hotel = any ((select private.my_hotels())::text[])
-- Corporate (private.is_above()) can see every hotel.
-- Mail is sent by the sales-lead-email Edge Function, not by Postgres.
-- If that send fails, the row stays and email_status is failed.
-- The app shows that as "Email not sent".

create schema if not exists private;

grant usage on schema private to authenticated;

create table if not exists public.sales_leads (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  created_by uuid not null,
  created_by_name text not null check (char_length(btrim(created_by_name)) between 1 and 120),
  contact_first text not null check (char_length(btrim(contact_first)) between 1 and 80),
  contact_last text not null check (char_length(btrim(contact_last)) between 1 and 80),
  contact_phone text check (
    contact_phone is null
    or char_length(pg_catalog.regexp_replace(contact_phone, '\D', '', 'g')) between 7 and 15
  ),
  contact_email text check (
    contact_email is null
    or contact_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ),
  needs text[] not null check (
    cardinality(needs) between 1 and 4
    and needs <@ array['Local Negotiated Rate', 'Group Block', 'Meeting Space', 'Other']::text[]
  ),
  needs_other text check (needs_other is null or char_length(btrim(needs_other)) between 1 and 200),
  group_start date,
  group_end date,
  notes text check (notes is null or char_length(notes) <= 2000),
  status text not null default 'New' check (status in ('New', 'Contacted', 'Won', 'Lost')),
  email_status text not null default 'pending' check (email_status in ('pending', 'sending', 'sent', 'failed')),
  email_error text check (email_error is null or email_error ~ '^[a-z_]{2,40}$'),
  emailed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  check (contact_phone is not null or contact_email is not null),
  check (
    needs_other is not null
    or not ('Other' = any (needs))
  ),
  check (group_end is null or group_start is null or group_end >= group_start)
);

comment on table public.sales_leads is
  'One sales lead: hotel, created_by, contact fields, status (New, Contacted, Won, Lost), and timestamps. No sample rows.';

comment on column public.sales_leads.email_status is
  'pending or sending or failed means the sales email was not sent. sent means the mail server accepted it.';

comment on column public.sales_leads.email_error is
  'Short code only, such as no_route or provider. Never a mailbox password or a response body.';

create table if not exists public.sales_lead_routes (
  hotel text primary key check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  emails text[] not null default '{}'::text[] check (cardinality(emails) <= 5),
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table public.sales_lead_routes is
  'Sales-manager addresses for one hotel. Empty until a GM or JR Corporate saves them. Do not seed real addresses.';

create index if not exists sales_leads_hotel_created_idx
  on public.sales_leads (hotel, created_at desc);

create index if not exists sales_leads_owner_idx
  on public.sales_leads (created_by);

alter table public.sales_leads enable row level security;
alter table public.sales_lead_routes enable row level security;

insert into public.sales_lead_routes (hotel, emails)
values
  ('MSPWE', '{}'),
  ('MSPAM', '{}'),
  ('MSPMS', '{}')
on conflict (hotel) do nothing;

create or replace function private.sales_lead_can_capture()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('front_desk', 'gm', 'agm', 'above_property'),
    false
  );
$$;

create or replace function private.sales_lead_can_manage()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('gm', 'agm', 'above_property', 'sales_manager'),
    false
  );
$$;

create or replace function private.sales_lead_can_configure()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('gm', 'above_property'),
    false
  );
$$;

create or replace function private.sales_lead_hotel_ok(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_hotel in ('MSPWE', 'MSPAM', 'MSPMS')
    and (
      private.is_above()
      or p_hotel = any ((select private.my_hotels())::text[])
    ),
    false
  );
$$;

create or replace function private.sales_lead_force_new()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := 'New';
  new.email_status := 'pending';
  new.email_error := null;
  new.emailed_at := null;
  new.created_by := auth.uid();
  new.created_at := pg_catalog.now();
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.sales_lead_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function private.save_sales_lead(
  p_hotel text,
  p_name text,
  p_first text,
  p_last text,
  p_phone text,
  p_email text,
  p_needs text[],
  p_other text,
  p_group_start date,
  p_group_end date,
  p_notes text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_first text;
  v_last text;
  v_phone text;
  v_email text;
  v_digits text;
  v_needs text[] := array[]::text[];
  v_item text;
  v_other text;
  v_notes text;
  v_id bigint;
begin
  if auth.uid() is null or not private.sales_lead_can_capture() then
    raise exception 'sl_role';
  end if;
  if not private.sales_lead_hotel_ok(p_hotel) then
    raise exception 'sl_hotel';
  end if;

  v_name := pg_catalog.btrim(coalesce(p_name, ''));
  v_first := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_first, '')), '\s+', ' ', 'g');
  v_last := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_last, '')), '\s+', ' ', 'g');
  if pg_catalog.char_length(v_name) < 1 or pg_catalog.char_length(v_name) > 120
     or pg_catalog.char_length(v_first) < 1 or pg_catalog.char_length(v_first) > 80
     or pg_catalog.char_length(v_last) < 1 or pg_catalog.char_length(v_last) > 80 then
    raise exception 'sl_name';
  end if;

  v_phone := nullif(pg_catalog.btrim(coalesce(p_phone, '')), '');
  v_email := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''))), '');
  v_digits := pg_catalog.regexp_replace(coalesce(v_phone, ''), '\D', '', 'g');
  if v_phone is not null and pg_catalog.char_length(v_digits) not between 7 and 15 then
    raise exception 'sl_phone';
  end if;
  if v_email is not null and v_email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
    raise exception 'sl_email';
  end if;
  if v_phone is null and v_email is null then
    raise exception 'sl_contact';
  end if;

  if p_needs is null then
    raise exception 'sl_needs';
  end if;
  foreach v_item in array p_needs loop
    v_item := pg_catalog.btrim(coalesce(v_item, ''));
    if v_item not in ('Local Negotiated Rate', 'Group Block', 'Meeting Space', 'Other') then
      raise exception 'sl_needs';
    end if;
    if cardinality(v_needs) = 0 or not v_item = any (v_needs) then
      v_needs := v_needs || v_item;
    end if;
  end loop;
  if cardinality(v_needs) < 1 then
    raise exception 'sl_needs';
  end if;

  v_other := nullif(pg_catalog.btrim(coalesce(p_other, '')), '');
  if 'Other' = any (v_needs) then
    if v_other is null or pg_catalog.char_length(v_other) > 200 then
      raise exception 'sl_other';
    end if;
  else
    v_other := null;
  end if;

  if p_group_end is not null and p_group_start is not null and p_group_end < p_group_start then
    raise exception 'sl_dates';
  end if;

  v_notes := nullif(pg_catalog.btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and pg_catalog.char_length(v_notes) > 2000 then
    raise exception 'sl_notes';
  end if;

  insert into public.sales_leads (
    hotel, created_by, created_by_name, contact_first, contact_last, contact_phone, contact_email,
    needs, needs_other, group_start, group_end, notes, status, email_status
  ) values (
    p_hotel, auth.uid(), v_name, v_first, v_last, v_phone, v_email,
    v_needs, v_other, p_group_start, p_group_end, v_notes, 'New', 'pending'
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.set_sales_lead_status(p_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
begin
  if auth.uid() is null or not private.sales_lead_can_manage() then
    raise exception 'sl_role';
  end if;
  if p_status not in ('New', 'Contacted', 'Won', 'Lost') then
    raise exception 'sl_status';
  end if;
  select s.hotel into v_hotel from public.sales_leads s where s.id = p_id;
  if v_hotel is null or not private.sales_lead_hotel_ok(v_hotel) then
    raise exception 'sl_role';
  end if;
  update public.sales_leads
    set status = p_status
    where id = p_id;
end;
$$;

create or replace function private.set_sales_lead_emails(p_hotel text, p_emails text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emails text[] := array[]::text[];
  v_item text;
  v_clean text;
begin
  if auth.uid() is null or not private.sales_lead_can_configure() then
    raise exception 'sl_role';
  end if;
  if not private.sales_lead_hotel_ok(p_hotel) then
    raise exception 'sl_hotel';
  end if;
  if p_emails is not null then
    foreach v_item in array p_emails loop
      v_clean := pg_catalog.lower(pg_catalog.btrim(coalesce(v_item, '')));
      if v_clean = '' then
        continue;
      end if;
      if pg_catalog.char_length(v_clean) > 120 or v_clean !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then
        raise exception 'sl_emails';
      end if;
      if cardinality(v_emails) = 0 or not v_clean = any (v_emails) then
        v_emails := v_emails || v_clean;
      end if;
    end loop;
  end if;
  if cardinality(v_emails) > 5 then
    raise exception 'sl_emails';
  end if;
  insert into public.sales_lead_routes (hotel, emails, updated_by, updated_at)
  values (p_hotel, v_emails, auth.uid(), pg_catalog.now())
  on conflict (hotel) do update
    set emails = excluded.emails,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at;
end;
$$;

drop trigger if exists sales_lead_force_new on public.sales_leads;
create trigger sales_lead_force_new
  before insert on public.sales_leads
  for each row execute function private.sales_lead_force_new();

drop trigger if exists sales_lead_touch on public.sales_leads;
create trigger sales_lead_touch
  before update on public.sales_leads
  for each row execute function private.sales_lead_touch();

create or replace function public.save_sales_lead(
  p_hotel text,
  p_name text,
  p_first text,
  p_last text,
  p_phone text,
  p_email text,
  p_needs text[],
  p_other text,
  p_group_start date,
  p_group_end date,
  p_notes text
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select private.save_sales_lead(
    p_hotel, p_name, p_first, p_last, p_phone, p_email, p_needs, p_other, p_group_start, p_group_end, p_notes
  );
$$;

create or replace function public.set_sales_lead_status(p_id bigint, p_status text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_sales_lead_status(p_id, p_status); $$;

create or replace function public.set_sales_lead_emails(p_hotel text, p_emails text[])
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_sales_lead_emails(p_hotel, p_emails); $$;

drop policy if exists sales_leads_select on public.sales_leads;
create policy sales_leads_select on public.sales_leads
  for select to authenticated
  using (
    (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
    and (
      (select private.sales_lead_can_manage())
      or created_by = (select auth.uid())
    )
  );

drop policy if exists sales_lead_routes_select on public.sales_lead_routes;
create policy sales_lead_routes_select on public.sales_lead_routes
  for select to authenticated
  using (
    (select private.sales_lead_can_manage())
    and (
      (select private.is_above())
      or hotel = any ((select private.my_hotels())::text[])
    )
  );

revoke all on function private.sales_lead_can_capture() from public, anon;
revoke all on function private.sales_lead_can_manage() from public, anon;
revoke all on function private.sales_lead_can_configure() from public, anon;
revoke all on function private.sales_lead_hotel_ok(text) from public, anon;
revoke all on function private.sales_lead_force_new() from public, anon;
revoke all on function private.sales_lead_touch() from public, anon;
revoke all on function private.save_sales_lead(text, text, text, text, text, text, text[], text, date, date, text) from public, anon;
revoke all on function private.set_sales_lead_status(bigint, text) from public, anon;
revoke all on function private.set_sales_lead_emails(text, text[]) from public, anon;
revoke all on function public.save_sales_lead(text, text, text, text, text, text, text[], text, date, date, text) from public, anon;
revoke all on function public.set_sales_lead_status(bigint, text) from public, anon;
revoke all on function public.set_sales_lead_emails(text, text[]) from public, anon;

grant execute on function private.sales_lead_can_capture() to authenticated;
grant execute on function private.sales_lead_can_manage() to authenticated;
grant execute on function private.sales_lead_can_configure() to authenticated;
grant execute on function private.sales_lead_hotel_ok(text) to authenticated;
grant execute on function private.sales_lead_force_new() to authenticated;
grant execute on function private.sales_lead_touch() to authenticated;
grant execute on function private.save_sales_lead(text, text, text, text, text, text, text[], text, date, date, text) to authenticated;
grant execute on function private.set_sales_lead_status(bigint, text) to authenticated;
grant execute on function private.set_sales_lead_emails(text, text[]) to authenticated;
grant execute on function public.save_sales_lead(text, text, text, text, text, text, text[], text, date, date, text) to authenticated;
grant execute on function public.set_sales_lead_status(bigint, text) to authenticated;
grant execute on function public.set_sales_lead_emails(text, text[]) to authenticated;

revoke all on table public.sales_leads from public, anon, authenticated;
revoke all on table public.sales_lead_routes from public, anon, authenticated;

grant select on table public.sales_leads to authenticated;
grant select on table public.sales_lead_routes to authenticated;

revoke all on sequence public.sales_leads_id_seq from public, anon, authenticated;
