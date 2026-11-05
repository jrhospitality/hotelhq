-- Training, inspections, and licenses. Additive only. Not applied by this change.
-- Review and run it when you are ready. Demo mode does not call this database.
--
-- New tables only. No existing table, column, or row is dropped or deleted.
-- Training: GM and AGM read and write their own hotel. Corporate reads and writes every hotel.
-- Inspections and licenses: GM and corporate only. AGM has no section.
-- An associate can read an inspection action assigned to them, and can mark that
-- action fixed through complete_inspection_action. They cannot edit the report.
-- Brand and report imports store a status only. The file body is not stored.
-- Certificate, report, and permit files go in the private compliance-docs bucket.

create schema if not exists private;

grant usage on schema private to authenticated;

alter table public.hotel_features drop constraint if exists hotel_features_feature_check;

alter table public.hotel_features add constraint hotel_features_feature_check
  check (feature in (
    'parking', 'sales_leads', 'greetings', 'guest_scores',
    'shuttle', 'meetings', 'winter', 'night_audit', 'guest_comments',
    'training', 'inspections', 'licenses'
  ));

insert into public.hotel_features (hotel, feature, enabled)
values
  ('MSPWE', 'training', true),
  ('MSPAM', 'training', true),
  ('MSPMS', 'training', true),
  ('MSPWE', 'inspections', true),
  ('MSPAM', 'inspections', true),
  ('MSPMS', 'inspections', true),
  ('MSPWE', 'licenses', true),
  ('MSPAM', 'licenses', true),
  ('MSPMS', 'licenses', true)
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
    'training', 'inspections', 'licenses'
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

create table if not exists public.training_types (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  name_en text not null check (char_length(name_en) between 1 and 80),
  name_es text not null default '' check (char_length(name_es) <= 80),
  kind text not null check (kind in ('online', 'in_person')),
  brand text not null default '' check (brand in ('', 'ihg', 'marriott', 'hilton')),
  validity_days integer check (validity_days is null or (validity_days between 1 and 3650)),
  active boolean not null default true,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.training_types is
  'A course a hotel requires. kind is online or in_person. brand is blank, ihg, marriott, or hilton.';

create table if not exists public.training_requirements (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  training_type_id uuid not null references public.training_types (id) on delete cascade,
  position text not null check (char_length(position) between 1 and 40),
  unique (training_type_id, position)
);

comment on table public.training_requirements is
  'Positions that must take one training type. Each hotel keeps its own rows.';

create table if not exists public.training_records (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  training_type_id uuid not null references public.training_types (id) on delete cascade,
  associate_id text not null default '' check (char_length(associate_id) <= 80),
  associate_name text not null check (char_length(associate_name) between 1 and 80),
  position text not null check (char_length(position) between 1 and 40),
  completed_on date,
  expires_on date,
  certificate_path text not null default '' check (char_length(certificate_path) <= 200),
  signed_off_name text not null default '' check (char_length(signed_off_name) <= 80),
  signed_off_by uuid,
  signed_off_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'brand_import')),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.training_records is
  'One associate completion. source is manual or brand_import. The certificate file lives in storage, not in this row.';

comment on column public.training_records.source is
  'manual when a manager marks it. brand_import when a later IHG, Marriott, or Hilton feed writes it.';

create index if not exists training_records_hotel_idx
  on public.training_records (hotel, associate_name);

create table if not exists public.training_imports (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  source text not null check (source in ('ihg', 'marriott', 'hilton')),
  status text not null check (status in ('received', 'awaiting_import', 'parsed', 'failed')),
  received_at timestamptz not null default pg_catalog.now()
);

comment on table public.training_imports is
  'Brand completion import stub. awaiting_import stores no file body.';

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  kind text not null check (kind in ('fire', 'health')),
  inspection_date date not null,
  agency text not null check (char_length(agency) between 1 and 120),
  result text not null check (result in ('pass', 'fail', 'conditional')),
  score text not null default '' check (char_length(score) <= 40),
  next_due date,
  document_path text not null default '' check (char_length(document_path) <= 200),
  notes text not null default '' check (char_length(notes) <= 400),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.inspections is
  'A fire or health inspection report. The PDF or photo lives in storage. GM and corporate only.';

create table if not exists public.inspection_actions (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  description text not null check (char_length(description) between 1 and 300),
  owner_name text not null default '' check (char_length(owner_name) <= 80),
  owner_role text not null default '' check (owner_role in (
    '', 'gm', 'agm', 'front_desk', 'hk_lead', 'housekeeper', 'maintenance',
    'shuttle_driver', 'house_person', 'laundry', 'breakfast', 'bartender'
  )),
  owner_user_id uuid,
  due_on date,
  status text not null default 'open' check (status in ('open', 'done')),
  proof_path text not null default '' check (char_length(proof_path) <= 200),
  completed_on date,
  completed_name text not null default '' check (char_length(completed_name) <= 80),
  source text not null default 'manual' check (source in ('manual', 'import')),
  created_at timestamptz not null default pg_catalog.now(),
  check (char_length(owner_name) > 0 or char_length(owner_role) > 0)
);

comment on table public.inspection_actions is
  'A violation from an inspection. source is manual or import. A named owner is the only associate who sees it. A blank name shows it to that role at the hotel.';

create index if not exists inspection_actions_hotel_idx
  on public.inspection_actions (hotel, status, due_on);

create table if not exists public.inspection_imports (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  kind text not null default '' check (kind in ('', 'fire', 'health')),
  status text not null check (status in ('received', 'awaiting_parse', 'parsed', 'failed')),
  document_path text not null default '' check (char_length(document_path) <= 200),
  received_at timestamptz not null default pg_catalog.now()
);

comment on table public.inspection_imports is
  'Assistant import stub. awaiting_parse means the report body was not stored and no action items were created yet.';

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  kind text not null check (kind in (
    'liquor', 'food_health', 'lodging', 'elevator', 'boiler',
    'fire_alarm', 'sprinkler', 'pool', 'business'
  )),
  agency text not null check (char_length(agency) between 1 and 120),
  license_number text not null check (char_length(license_number) between 1 and 40),
  issued_on date not null,
  expires_on date not null,
  renewal_fee numeric(12, 2) not null default 0 check (renewal_fee >= 0),
  responsible_name text not null check (char_length(responsible_name) between 1 and 80),
  document_path text not null default '' check (char_length(document_path) <= 200),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.licenses is
  'A hotel license or permit. GM and corporate only. Status is computed from expires_on.';

create index if not exists licenses_hotel_expires_idx
  on public.licenses (hotel, expires_on);

alter table public.training_types enable row level security;
alter table public.training_requirements enable row level security;
alter table public.training_records enable row level security;
alter table public.training_imports enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_actions enable row level security;
alter table public.inspection_imports enable row level security;
alter table public.licenses enable row level security;

create or replace function private.training_allowed(p_hotel text)
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

create or replace function private.docs_allowed(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or (
      private.my_role() = 'gm'
      and p_hotel = any ((select private.my_hotels())::text[])
    ),
    false
  );
$$;

create or replace function private.inspection_action_visible(
  p_hotel text,
  p_owner_user uuid,
  p_owner_role text,
  p_owner_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.docs_allowed(p_hotel)
    or (
      p_hotel = any ((select private.my_hotels())::text[])
      and (
        (p_owner_user is not null and p_owner_user = (select auth.uid()))
        or (
          coalesce(p_owner_name, '') <> ''
          and lower(p_owner_name) = lower(coalesce((
            select pr.name from public.profiles pr
            where pr.user_id = (select auth.uid())
            limit 1
          ), ''))
        )
        or (
          coalesce(p_owner_name, '') = ''
          and coalesce(p_owner_role, '') <> ''
          and p_owner_role = private.my_role()
        )
      )
    ),
    false
  );
$$;

drop policy if exists training_types_all on public.training_types;
create policy training_types_all on public.training_types
  for all to authenticated
  using (private.training_allowed(hotel))
  with check (private.training_allowed(hotel));

drop policy if exists training_requirements_all on public.training_requirements;
create policy training_requirements_all on public.training_requirements
  for all to authenticated
  using (private.training_allowed(hotel))
  with check (private.training_allowed(hotel));

drop policy if exists training_records_all on public.training_records;
create policy training_records_all on public.training_records
  for all to authenticated
  using (private.training_allowed(hotel))
  with check (private.training_allowed(hotel));

drop policy if exists training_imports_all on public.training_imports;
create policy training_imports_all on public.training_imports
  for all to authenticated
  using (private.training_allowed(hotel))
  with check (private.training_allowed(hotel));

drop policy if exists inspections_all on public.inspections;
create policy inspections_all on public.inspections
  for all to authenticated
  using (private.docs_allowed(hotel))
  with check (private.docs_allowed(hotel));

drop policy if exists inspection_imports_all on public.inspection_imports;
create policy inspection_imports_all on public.inspection_imports
  for all to authenticated
  using (private.docs_allowed(hotel))
  with check (private.docs_allowed(hotel));

drop policy if exists licenses_all on public.licenses;
create policy licenses_all on public.licenses
  for all to authenticated
  using (private.docs_allowed(hotel))
  with check (private.docs_allowed(hotel));

drop policy if exists inspection_actions_select on public.inspection_actions;
create policy inspection_actions_select on public.inspection_actions
  for select to authenticated
  using (private.inspection_action_visible(hotel, owner_user_id, owner_role, owner_name));

drop policy if exists inspection_actions_write on public.inspection_actions;
create policy inspection_actions_write on public.inspection_actions
  for all to authenticated
  using (private.docs_allowed(hotel))
  with check (private.docs_allowed(hotel));

create or replace function private.ingest_training_brand(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_source text;
  v_id uuid;
begin
  v_hotel := p->>'hotel';
  v_source := p->>'source';
  if not (
    coalesce((select auth.jwt() ->> 'role') = 'service_role', false)
    or ((select auth.uid()) is not null and private.training_allowed(v_hotel))
  ) then
    raise exception 'not allowed';
  end if;
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if v_source not in ('ihg', 'marriott', 'hilton') then
    raise exception 'unknown source';
  end if;
  insert into public.training_imports (hotel, source, status)
  values (v_hotel, v_source, 'awaiting_import')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.ingest_inspection_report(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_kind text;
  v_id uuid;
  v_actions jsonb;
  v_item jsonb;
  v_inspection uuid;
begin
  v_hotel := p->>'hotel';
  v_kind := coalesce(p->>'kind', '');
  if not (
    coalesce((select auth.jwt() ->> 'role') = 'service_role', false)
    or ((select auth.uid()) is not null and private.docs_allowed(v_hotel))
  ) then
    raise exception 'not allowed';
  end if;
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if v_kind not in ('', 'fire', 'health') then
    raise exception 'unknown kind';
  end if;
  v_actions := case when jsonb_typeof(p->'actions') = 'array' then p->'actions' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_actions) > 50 then
    raise exception 'too many actions';
  end if;
  insert into public.inspection_imports (hotel, kind, status, document_path)
  values (
    v_hotel,
    v_kind,
    case when pg_catalog.jsonb_array_length(v_actions) > 0 then 'parsed' else 'awaiting_parse' end,
    pg_catalog.left(coalesce(p->>'document_path', ''), 200)
  )
  returning id into v_id;
  if pg_catalog.jsonb_array_length(v_actions) = 0 then
    return v_id;
  end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(v_actions) loop
    v_inspection := nullif(v_item->>'inspection_id', '')::uuid;
    if v_inspection is null or not exists (
      select 1 from public.inspections i where i.id = v_inspection and i.hotel = v_hotel
    ) then
      raise exception 'unknown inspection';
    end if;
    insert into public.inspection_actions (
      inspection_id, hotel, description, owner_name, owner_role, due_on, source
    ) values (
      v_inspection,
      v_hotel,
      v_item->>'description',
      coalesce(v_item->>'owner_name', ''),
      coalesce(v_item->>'owner_role', ''),
      nullif(v_item->>'due_on', '')::date,
      'import'
    );
  end loop;
  return v_id;
end;
$$;

create or replace function private.complete_inspection_action(
  p_id uuid,
  p_proof text,
  p_completed date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.inspection_actions%rowtype;
  v_name text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  select * into v_row from public.inspection_actions where id = p_id;
  if v_row.id is null or not private.inspection_action_visible(v_row.hotel, v_row.owner_user_id, v_row.owner_role, v_row.owner_name) then
    raise exception 'not allowed';
  end if;
  if p_completed is null or p_completed > (pg_catalog.timezone('America/Chicago', pg_catalog.now()))::date then
    raise exception 'date';
  end if;
  if coalesce(p_proof, '') <> '' then
    if p_proof !~ '^[A-Za-z0-9][A-Za-z0-9_./-]{0,180}$' or p_proof like '%..%' then
      raise exception 'proof path';
    end if;
    if pg_catalog.split_part(p_proof, '/', 1) <> v_row.hotel or pg_catalog.split_part(p_proof, '/', 2) <> 'actions' then
      raise exception 'proof path';
    end if;
  end if;
  select coalesce(pr.name, '') into v_name
  from public.profiles pr
  where pr.user_id = (select auth.uid())
  limit 1;
  update public.inspection_actions
    set status = 'done',
        completed_on = p_completed,
        completed_name = coalesce(v_name, ''),
        proof_path = case when coalesce(p_proof, '') = '' then proof_path else p_proof end
    where id = p_id;
end;
$$;

create or replace function public.ingest_training_brand(p jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_training_brand(p);
$$;

create or replace function public.ingest_inspection_report(p jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_inspection_report(p);
$$;

create or replace function public.complete_inspection_action(p_id uuid, p_proof text, p_completed date)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.complete_inspection_action(p_id, p_proof, p_completed);
$$;

revoke all on function private.training_allowed(text) from public, anon;
revoke all on function private.docs_allowed(text) from public, anon;
revoke all on function private.inspection_action_visible(text, uuid, text, text) from public, anon;
revoke all on function private.ingest_training_brand(jsonb) from public, anon;
revoke all on function private.ingest_inspection_report(jsonb) from public, anon;
revoke all on function private.complete_inspection_action(uuid, text, date) from public, anon;
revoke all on function public.ingest_training_brand(jsonb) from public, anon;
revoke all on function public.ingest_inspection_report(jsonb) from public, anon;
revoke all on function public.complete_inspection_action(uuid, text, date) from public, anon;

grant execute on function private.training_allowed(text) to authenticated;
grant execute on function private.docs_allowed(text) to authenticated;
grant execute on function private.inspection_action_visible(text, uuid, text, text) to authenticated;
grant execute on function private.ingest_training_brand(jsonb) to authenticated;
grant execute on function private.ingest_inspection_report(jsonb) to authenticated;
grant execute on function private.complete_inspection_action(uuid, text, date) to authenticated;
grant execute on function public.ingest_training_brand(jsonb) to authenticated;
grant execute on function public.ingest_inspection_report(jsonb) to authenticated;
grant execute on function public.complete_inspection_action(uuid, text, date) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant execute on function public.ingest_training_brand(jsonb) to service_role;
    grant execute on function public.ingest_inspection_report(jsonb) to service_role;
    grant execute on function private.ingest_training_brand(jsonb) to service_role;
    grant execute on function private.ingest_inspection_report(jsonb) to service_role;
  end if;
end $$;

revoke all on table public.training_types from public, anon;
revoke all on table public.training_requirements from public, anon;
revoke all on table public.training_records from public, anon;
revoke all on table public.training_imports from public, anon;
revoke all on table public.inspections from public, anon;
revoke all on table public.inspection_actions from public, anon;
revoke all on table public.inspection_imports from public, anon;
revoke all on table public.licenses from public, anon;

grant select, insert, update, delete on table public.training_types to authenticated;
grant select, insert, update, delete on table public.training_requirements to authenticated;
grant select, insert, update, delete on table public.training_records to authenticated;
grant select, insert, update, delete on table public.training_imports to authenticated;
grant select, insert, update, delete on table public.inspections to authenticated;
grant select, insert, update, delete on table public.inspection_actions to authenticated;
grant select, insert, update, delete on table public.inspection_imports to authenticated;
grant select, insert, update, delete on table public.licenses to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compliance-docs',
  'compliance-docs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.compliance_object_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[];
  v_hotel text;
  v_folder text;
  v_id text;
  v_ok boolean;
begin
  if (select auth.uid()) is null then
    return false;
  end if;
  parts := storage.foldername(p_name);
  if parts is null or coalesce(pg_catalog.array_length(parts, 1), 0) < 2 then
    return false;
  end if;
  v_hotel := parts[1];
  v_folder := parts[2];
  v_id := case when coalesce(pg_catalog.array_length(parts, 1), 0) >= 3 then parts[3] else '' end;
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    return false;
  end if;
  if v_folder = 'training' then
    return private.training_allowed(v_hotel);
  end if;
  if v_folder in ('inspections', 'licenses') then
    return private.docs_allowed(v_hotel);
  end if;
  if v_folder = 'actions' and v_id <> '' then
    select private.inspection_action_visible(a.hotel, a.owner_user_id, a.owner_role, a.owner_name)
      into v_ok
    from public.inspection_actions a
    where a.id::text = v_id
      and a.hotel = v_hotel;
    return coalesce(v_ok, false);
  end if;
  return false;
end;
$$;

revoke all on function private.compliance_object_allowed(text) from public, anon;
grant execute on function private.compliance_object_allowed(text) to authenticated;

drop policy if exists compliance_docs_select on storage.objects;
create policy compliance_docs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'compliance-docs' and private.compliance_object_allowed(name));

drop policy if exists compliance_docs_insert on storage.objects;
create policy compliance_docs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'compliance-docs' and private.compliance_object_allowed(name));

drop policy if exists compliance_docs_update on storage.objects;
create policy compliance_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'compliance-docs' and private.compliance_object_allowed(name))
  with check (bucket_id = 'compliance-docs' and private.compliance_object_allowed(name));

drop policy if exists compliance_docs_delete on storage.objects;
create policy compliance_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'compliance-docs' and private.compliance_object_allowed(name));
