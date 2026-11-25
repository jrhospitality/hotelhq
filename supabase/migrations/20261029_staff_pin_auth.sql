-- Staff PIN sign-in. Additive only.
-- Reuses private.handle_new_user() and staff_invites: a new auth user is created
-- only when a pending invite exists for that email. This file does not insert
-- any person, email, or PIN.
--
-- The publishable key stays out of git. Demo mode in the page never calls this
-- database. Privileged work lives in private, with an empty search_path.
-- Public wrappers are security invoker. anon cannot execute them.
-- A hotel check uses hotel_id = any ((select private.my_hotels())::text[]).

create schema if not exists private;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

alter table public.profiles
  add column if not exists pin_reset_required boolean not null default false;

comment on column public.profiles.pin_reset_required is
  'When true, the next sign-in must set a new 4 to 6 digit PIN before the app opens.';

alter table public.staff_invites alter column hotel_id drop not null;
alter table public.staff_invites alter column invited_by drop not null;

comment on column public.staff_invites.hotel_id is
  'Home hotel. Null only for a JR Corporate (above_property) invite.';
comment on column public.staff_invites.invited_by is
  'Manager who sent the invite. Null only for the SQL-editor bootstrap.';

create table if not exists private.staff_login (
  user_id uuid primary key references auth.users (id) on delete cascade,
  login_id text not null unique check (login_id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  created_at timestamptz not null default pg_catalog.now()
);

comment on table private.staff_login is
  'Random sign-in id. Not a name. The auth email is this id @ staff.jrhospitality.local, or a real inbox when one was supplied. The browser never reads this table.';

create table if not exists private.pin_attempts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  failures integer not null default 0 check (failures >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default pg_catalog.now()
);

comment on table private.pin_attempts is
  'Wrong-PIN counter. Five failures lock the auth user for 15 minutes. The PIN itself is never stored.';

alter table private.staff_login enable row level security;
alter table private.pin_attempts enable row level security;
revoke all on private.staff_login from public, anon, authenticated;
revoke all on private.pin_attempts from public, anon, authenticated;

create or replace function private.pin_acceptable(p_pin text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_pin ~ '^[0-9]{4,6}$'
    and p_pin !~ '^([0-9])\1+$'
    and p_pin not in (
      '1234', '4321', '12345', '123456', '654321',
      '1001', '1002', '1003'
    );
$$;

comment on function private.pin_acceptable(text) is
  'Rejects the wrong length, repeated digits, simple sequences, and PINs that shipped on the public site. Those old PINs are in git history and must not be reused.';

create or replace function private.protect_pin_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('hotelhq.pin_write', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.pin_reset_required := false;
    elsif new.pin_reset_required is distinct from old.pin_reset_required then
      new.pin_reset_required := old.pin_reset_required;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_pin_flag on public.profiles;
create trigger profiles_protect_pin_flag
  before insert or update on public.profiles
  for each row execute function private.protect_pin_flag();

create or replace function private.random_pin()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  digits text := '';
  i int;
  candidate text;
begin
  for i in 1..8 loop
    digits := '';
    while pg_catalog.char_length(digits) < 6 loop
      digits := digits || ((pg_catalog.get_byte(extensions.gen_random_bytes(1), 0) % 10)::text);
    end loop;
    candidate := digits;
    if private.pin_acceptable(candidate) then
      return candidate;
    end if;
  end loop;
  raise exception 'could not make a PIN';
end;
$$;

create or replace function private.can_reset_pin(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when (select auth.uid()) is null then false
      when (select auth.uid()) = p_user then false
      when private.is_above() then true
      when private.my_role() in ('gm'::public.app_role, 'agm'::public.app_role)
        and exists (
          select 1
          from public.profiles t
          where t.user_id = p_user
            and t.hotel_id = any ((select private.my_hotels())::text[])
            and t.role not in (
              'above_property'::public.app_role,
              'gm'::public.app_role,
              'agm'::public.app_role
            )
        )
      then true
      else false
    end
  ), false);
$$;

create or replace function private.set_pin_hash(p_user uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.pin_acceptable(p_pin) then
    raise exception 'PIN must be 4 to 6 digits and not a retired or trivial code';
  end if;
  update auth.users
  set encrypted_password = extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
      updated_at = pg_catalog.now()
  where id = p_user;
  if not found then
    raise exception 'not allowed';
  end if;
end;
$$;

create or replace function private.clear_pin_lock(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  until_at timestamptz;
begin
  select locked_until into until_at from private.pin_attempts where user_id = p_user;
  update auth.users
  set banned_until = null
  where id = p_user
    and banned_until is not null
    and (until_at is null or banned_until = until_at);
  insert into private.pin_attempts (user_id, failures, locked_until, updated_at)
  values (p_user, 0, null, pg_catalog.now())
  on conflict (user_id) do update
  set failures = 0, locked_until = null, updated_at = pg_catalog.now();
end;
$$;

create or replace function private.staff_sign_in_directory()
returns table (
  user_id uuid,
  name text,
  hotel_id text,
  role text,
  language text,
  active boolean,
  extra_hotels text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.name, p.hotel_id, p.role::text, p.language, p.active,
    coalesce(
      (select pg_catalog.array_agg(ph.hotel_id)
       from public.profile_hotels ph
       where ph.user_id = p.user_id),
      '{}'::text[]
    )
  from public.profiles p
  where p.active
  order by p.hotel_id nulls first, p.name;
$$;

create or replace function private.staff_auth_email(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where u.id = p_user
    and p.active
    and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= pg_catalog.now());
$$;

create or replace function private.pin_gate(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  until_at timestamptz;
  email text;
begin
  email := private.staff_auth_email(p_user);
  if email is null then
    if exists (
      select 1 from private.pin_attempts a
      where a.user_id = p_user and a.locked_until is not null and a.locked_until > pg_catalog.now()
    ) then
      select a.locked_until into until_at from private.pin_attempts a where a.user_id = p_user;
      return pg_catalog.jsonb_build_object('ok', false, 'locked', true, 'until', until_at);
    end if;
    return pg_catalog.jsonb_build_object('ok', false, 'missing', true);
  end if;
  select a.locked_until into until_at from private.pin_attempts a where a.user_id = p_user;
  if until_at is not null and until_at > pg_catalog.now() then
    return pg_catalog.jsonb_build_object('ok', false, 'locked', true, 'until', until_at);
  end if;
  if until_at is not null and until_at <= pg_catalog.now() then
    perform private.clear_pin_lock(p_user);
  end if;
  return pg_catalog.jsonb_build_object('ok', true);
end;
$$;

create or replace function private.note_pin_failure(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
  until_at timestamptz;
begin
  select a.locked_until into until_at
  from private.pin_attempts a
  where a.user_id = p_user;
  if until_at is not null and until_at > pg_catalog.now() then
    return pg_catalog.jsonb_build_object('locked', true, 'until', until_at);
  end if;
  if not exists (select 1 from public.profiles p where p.user_id = p_user and p.active) then
    return pg_catalog.jsonb_build_object('locked', false);
  end if;
  insert into private.pin_attempts (user_id, failures, updated_at)
  values (p_user, 1, pg_catalog.now())
  on conflict (user_id) do update
  set failures = case
        when private.pin_attempts.locked_until is not null
         and private.pin_attempts.locked_until > pg_catalog.now()
        then private.pin_attempts.failures
        else private.pin_attempts.failures + 1
      end,
      updated_at = pg_catalog.now()
  returning failures into n;
  if n >= 5 then
    until_at := pg_catalog.now() + interval '15 minutes';
    update private.pin_attempts
    set failures = 0, locked_until = until_at, updated_at = pg_catalog.now()
    where user_id = p_user;
    update auth.users set banned_until = until_at where id = p_user;
    return pg_catalog.jsonb_build_object('locked', true, 'until', until_at);
  end if;
  return pg_catalog.jsonb_build_object('locked', false, 'left', 5 - n);
end;
$$;

create or replace function private.note_pin_success(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.clear_pin_lock(p_user);
end;
$$;

create or replace function private.reset_staff_pin(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin text;
begin
  if not private.can_reset_pin(p_user) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_user) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  pin := private.random_pin();
  perform private.set_pin_hash(p_user, pin);
  perform pg_catalog.set_config('hotelhq.pin_write', 'on', true);
  update public.profiles set pin_reset_required = true where user_id = p_user;
  perform private.clear_pin_lock(p_user);
  return pin;
end;
$$;

create or replace function private.set_my_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not private.pin_acceptable(p_pin) then
    raise exception 'PIN must be 4 to 6 digits and not a retired or trivial code';
  end if;
  perform private.set_pin_hash(uid, p_pin);
  perform pg_catalog.set_config('hotelhq.pin_write', 'on', true);
  update public.profiles set pin_reset_required = false where user_id = uid;
  perform private.clear_pin_lock(uid);
end;
$$;

create or replace function private.staff_reset_email(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.email is null then null
    when pg_catalog.right(pg_catalog.lower(u.email), pg_catalog.length('@staff.jrhospitality.local'))
         = '@staff.jrhospitality.local' then null
    else u.email
  end
  from auth.users u
  where u.id = p_user;
$$;

create or replace function private.provision_staff(
  p_name text,
  p_login_id text,
  p_pin text,
  p_email text,
  p_hotel text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := pg_catalog.gen_random_uuid();
  login text;
  mail text;
  real_email text;
  role_name public.app_role;
  instance uuid;
begin
  if (select auth.uid()) is not null then
    raise exception 'Run provision from the SQL editor, not from a signed-in session';
  end if;
  if p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 80 then
    raise exception 'Name is required';
  end if;
  if not private.pin_acceptable(p_pin) then
    raise exception 'PIN must be 4 to 6 digits and not a retired or trivial code';
  end if;
  if p_role is null or p_role !~ '^[a-z_]+$' then
    raise exception 'Unknown role';
  end if;
  role_name := p_role::public.app_role;
  if role_name = 'above_property' then
    if p_hotel is not null then
      raise exception 'JR Corporate has no home hotel';
    end if;
  else
    if p_hotel is null or not exists (select 1 from public.hotels h where h.id = p_hotel) then
      raise exception 'Unknown hotel';
    end if;
  end if;
  if p_login_id is null or pg_catalog.btrim(p_login_id) = '' then
    login := 's' || pg_catalog.encode(extensions.gen_random_bytes(8), 'hex');
  else
    login := pg_catalog.lower(pg_catalog.btrim(p_login_id));
  end if;
  if login !~ '^[a-z0-9][a-z0-9-]{1,40}$' then
    raise exception 'Sign-in id must be lowercase letters, digits, or hyphens';
  end if;
  if exists (select 1 from private.staff_login where login_id = login) then
    raise exception 'That sign-in id is already used';
  end if;
  if p_email is null or pg_catalog.btrim(p_email) = '' then
    real_email := null;
    mail := login || '@staff.jrhospitality.local';
  else
    real_email := pg_catalog.lower(pg_catalog.btrim(p_email));
    if real_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       or pg_catalog.right(real_email, pg_catalog.length('@staff.jrhospitality.local'))
          = '@staff.jrhospitality.local' then
      raise exception 'Use a real email, or null';
    end if;
    mail := real_email;
  end if;
  if exists (select 1 from auth.users where lower(email) = mail) then
    raise exception 'That email is already used';
  end if;
  perform pg_catalog.set_config('hotelhq.pin_write', 'on', true);
  insert into public.staff_invites (
    email, display_name, hotel_id, role, language, status, invited_by
  ) values (
    mail, pg_catalog.btrim(p_name), p_hotel, role_name, 'en', 'pending', null
  );
  select id into instance from auth.instances limit 1;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) values (
    coalesce(instance, '00000000-0000-0000-0000-000000000000'::uuid),
    uid, 'authenticated', 'authenticated', mail,
    extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
    pg_catalog.now(),
    '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    pg_catalog.now(), pg_catalog.now(), false, false
  );
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    pg_catalog.gen_random_uuid(),
    uid,
    uid::text,
    pg_catalog.jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true),
    'email',
    pg_catalog.now(), pg_catalog.now(), pg_catalog.now()
  );
  insert into private.staff_login (user_id, login_id) values (uid, login);
  update public.profiles
  set pin_reset_required = true
  where user_id = uid;
  if not found then
    raise exception 'Profile was not created from the invite';
  end if;
  if real_email is not null then
    insert into public.staff_contacts (user_id, email)
    values (uid, real_email)
    on conflict (user_id) do update set email = excluded.email, updated_at = pg_catalog.now();
  end if;
  return uid;
end;
$$;

create or replace function private.provision_corporate(
  p_name text,
  p_login_id text,
  p_pin text,
  p_email text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.provision_staff(p_name, p_login_id, p_pin, p_email, null, 'above_property');
$$;

-- Public wrappers. security invoker. anon has no execute.
create or replace function public.staff_sign_in_directory()
returns table (
  user_id uuid,
  name text,
  hotel_id text,
  role text,
  language text,
  active boolean,
  extra_hotels text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.staff_sign_in_directory();
$$;

create or replace function public.staff_auth_email(p_user uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.staff_auth_email(p_user);
$$;

create or replace function public.pin_gate(p_user uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.pin_gate(p_user);
$$;

create or replace function public.note_pin_failure(p_user uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.note_pin_failure(p_user);
$$;

create or replace function public.note_pin_success(p_user uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.note_pin_success(p_user);
$$;

create or replace function public.reset_staff_pin(p_user uuid)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.reset_staff_pin(p_user);
$$;

create or replace function public.set_my_pin(p_pin text)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.set_my_pin(p_pin);
$$;

create or replace function public.staff_reset_email(p_user uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select private.staff_reset_email(p_user);
$$;

revoke all on function private.pin_acceptable(text) from public, anon, authenticated;
revoke all on function private.protect_pin_flag() from public, anon, authenticated;
revoke all on function private.random_pin() from public, anon, authenticated;
revoke all on function private.can_reset_pin(uuid) from public, anon, authenticated;
revoke all on function private.set_pin_hash(uuid, text) from public, anon, authenticated;
revoke all on function private.clear_pin_lock(uuid) from public, anon, authenticated;
revoke all on function private.staff_sign_in_directory() from public, anon, authenticated;
revoke all on function private.staff_auth_email(uuid) from public, anon, authenticated;
revoke all on function private.pin_gate(uuid) from public, anon, authenticated;
revoke all on function private.note_pin_failure(uuid) from public, anon, authenticated;
revoke all on function private.note_pin_success(uuid) from public, anon, authenticated;
revoke all on function private.reset_staff_pin(uuid) from public, anon, authenticated;
revoke all on function private.set_my_pin(text) from public, anon, authenticated;
revoke all on function private.staff_reset_email(uuid) from public, anon, authenticated;
revoke all on function private.provision_staff(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function private.provision_corporate(text, text, text, text) from public, anon, authenticated;

revoke all on function public.staff_sign_in_directory() from public, anon, authenticated;
revoke all on function public.staff_auth_email(uuid) from public, anon, authenticated;
revoke all on function public.pin_gate(uuid) from public, anon, authenticated;
revoke all on function public.note_pin_failure(uuid) from public, anon, authenticated;
revoke all on function public.note_pin_success(uuid) from public, anon, authenticated;
revoke all on function public.reset_staff_pin(uuid) from public, anon, authenticated;
revoke all on function public.set_my_pin(text) from public, anon, authenticated;
revoke all on function public.staff_reset_email(uuid) from public, anon, authenticated;

-- The sign-in edge function uses the service role. Managers call reset and
-- set-my-PIN with their own session. Nobody else can execute these.
grant execute on function private.staff_sign_in_directory() to service_role;
grant execute on function private.staff_auth_email(uuid) to service_role;
grant execute on function private.pin_gate(uuid) to service_role;
grant execute on function private.note_pin_failure(uuid) to service_role;
grant execute on function private.note_pin_success(uuid) to service_role;
grant execute on function private.staff_reset_email(uuid) to service_role;
grant execute on function private.can_reset_pin(uuid) to service_role;
grant execute on function private.clear_pin_lock(uuid) to service_role;
grant execute on function public.staff_sign_in_directory() to service_role;
grant execute on function public.staff_auth_email(uuid) to service_role;
grant execute on function public.pin_gate(uuid) to service_role;
grant execute on function public.note_pin_failure(uuid) to service_role;
grant execute on function public.note_pin_success(uuid) to service_role;
grant execute on function public.staff_reset_email(uuid) to service_role;

grant execute on function private.reset_staff_pin(uuid) to authenticated;
grant execute on function private.set_my_pin(text) to authenticated;
grant execute on function private.can_reset_pin(uuid) to authenticated;
grant execute on function public.reset_staff_pin(uuid) to authenticated;
grant execute on function public.set_my_pin(text) to authenticated;

-- provision_* stays with the table owner (SQL editor). No API role can run it.
