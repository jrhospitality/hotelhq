-- Holiday greetings and optional staff celebrations. Additive only.
-- Does not drop or delete existing rows.
-- Birth year is never stored. Birth month and day are optional.
-- Custom greetings are written by JR Corporate. No sample messages are seeded.
--
-- Hotel scope, read once per statement:
--   hotel = any ((select private.my_hotels())::text[])
-- A null hotel on a custom greeting means every property.
-- Corporate (private.is_above()) can see every hotel.
-- Coworkers do not read someone else's birthday. The person can read their
-- own row. GM, AGM, and corporate can read celebrations for their hotels
-- so the GM home line can list today's names.

create schema if not exists private;

grant usage on schema private to authenticated;

create table if not exists public.custom_greetings (
  id bigint generated always as identity primary key,
  hotel text check (hotel is null or hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  emoji text not null default '✨' check (char_length(emoji) between 1 and 16),
  color text not null default '#14365d' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  message_en text not null check (char_length(btrim(message_en)) between 1 and 200),
  message_es text not null check (char_length(btrim(message_es)) between 1 and 200),
  start_on date not null,
  end_on date not null,
  annual boolean not null default true,
  active boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default pg_catalog.now(),
  check (annual or end_on >= start_on)
);

comment on table public.custom_greetings is
  'Extra greetings from JR Corporate. annual uses the month and day every year. No sample rows.';

create table if not exists public.staff_celebrations (
  user_id uuid primary key,
  hotel text check (hotel is null or hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 120),
  birth_month smallint,
  birth_day smallint,
  hire_date date,
  updated_at timestamptz not null default pg_catalog.now(),
  check (
    (birth_month is null and birth_day is null)
    or (
      birth_month between 1 and 12
      and birth_day between 1 and 31
      and (
        (birth_month = 2 and birth_day <= 29)
        or (birth_month in (4, 6, 9, 11) and birth_day <= 30)
        or (birth_month in (1, 3, 5, 7, 8, 10, 12) and birth_day <= 31)
      )
    )
  )
);

comment on table public.staff_celebrations is
  'Optional birth month and day (no year) and hire date. Shown to that person and on the GM home line.';

create index if not exists staff_celebrations_hotel_idx
  on public.staff_celebrations (hotel);

alter table public.custom_greetings enable row level security;
alter table public.staff_celebrations enable row level security;

create or replace function private.greet_is_corporate()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('above_property'),
    false
  );
$$;

create or replace function private.greet_can_see_celebrations()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('gm', 'agm', 'above_property'),
    false
  );
$$;

create or replace function private.greet_hotel_ok(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_hotel is null
    or (
      p_hotel in ('MSPWE', 'MSPAM', 'MSPMS')
      and (
        private.is_above()
        or p_hotel = any ((select private.my_hotels())::text[])
      )
    ),
    false
  );
$$;

create or replace function private.save_custom_greeting(
  p_id bigint,
  p_hotel text,
  p_emoji text,
  p_color text,
  p_en text,
  p_es text,
  p_start date,
  p_end date,
  p_annual boolean,
  p_active boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_emoji text;
  v_color text;
  v_en text;
  v_es text;
begin
  if auth.uid() is null or not private.greet_is_corporate() then
    raise exception 'gr_role';
  end if;
  if not private.greet_hotel_ok(p_hotel) then
    raise exception 'gr_hotel';
  end if;
  v_emoji := pg_catalog.btrim(coalesce(p_emoji, ''));
  v_color := pg_catalog.upper(pg_catalog.btrim(coalesce(p_color, '')));
  v_en := pg_catalog.btrim(coalesce(p_en, ''));
  v_es := pg_catalog.btrim(coalesce(p_es, ''));
  if v_emoji = '' then
    v_emoji := '✨';
  end if;
  if pg_catalog.char_length(v_emoji) > 16
     or v_color !~ '^#[0-9A-F]{6}$'
     or pg_catalog.char_length(v_en) < 1
     or pg_catalog.char_length(v_en) > 200
     or pg_catalog.char_length(v_es) < 1
     or pg_catalog.char_length(v_es) > 200
     or p_start is null
     or p_end is null then
    raise exception 'gr_greeting';
  end if;
  if not coalesce(p_annual, false) and p_end < p_start then
    raise exception 'gr_dates';
  end if;
  if p_id is null then
    insert into public.custom_greetings (
      hotel, emoji, color, message_en, message_es, start_on, end_on, annual, active, updated_by, updated_at
    ) values (
      p_hotel, v_emoji, v_color, v_en, v_es, p_start, p_end, coalesce(p_annual, true), coalesce(p_active, true), auth.uid(), pg_catalog.now()
    )
    returning id into v_id;
    return v_id;
  end if;
  update public.custom_greetings
    set hotel = p_hotel,
        emoji = v_emoji,
        color = v_color,
        message_en = v_en,
        message_es = v_es,
        start_on = p_start,
        end_on = p_end,
        annual = coalesce(p_annual, true),
        active = coalesce(p_active, true),
        updated_by = auth.uid(),
        updated_at = pg_catalog.now()
    where id = p_id
    returning id into v_id;
  if v_id is null then
    raise exception 'gr_missing';
  end if;
  return v_id;
end;
$$;

create or replace function private.save_my_celebration(
  p_hotel text,
  p_name text,
  p_month smallint,
  p_day smallint,
  p_hire date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'gr_role';
  end if;
  if p_hotel is not null and p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'gr_hotel';
  end if;
  if p_hotel is not null and not private.greet_hotel_ok(p_hotel) and not private.greet_is_corporate() then
    raise exception 'gr_hotel';
  end if;
  if (p_month is null) <> (p_day is null) then
    raise exception 'gr_birthday';
  end if;
  if p_month is not null and (
    p_month < 1 or p_month > 12 or p_day < 1 or p_day > 31
    or (p_month = 2 and p_day > 29)
    or (p_month in (4, 6, 9, 11) and p_day > 30)
  ) then
    raise exception 'gr_birthday';
  end if;
  v_name := nullif(pg_catalog.btrim(coalesce(p_name, '')), '');
  if v_name is not null and pg_catalog.char_length(v_name) > 120 then
    raise exception 'gr_name';
  end if;
  insert into public.staff_celebrations (user_id, hotel, display_name, birth_month, birth_day, hire_date, updated_at)
  values (auth.uid(), p_hotel, v_name, p_month, p_day, p_hire, pg_catalog.now())
  on conflict (user_id) do update
    set hotel = excluded.hotel,
        display_name = excluded.display_name,
        birth_month = excluded.birth_month,
        birth_day = excluded.birth_day,
        hire_date = excluded.hire_date,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.save_custom_greeting(
  p_id bigint,
  p_hotel text,
  p_emoji text,
  p_color text,
  p_en text,
  p_es text,
  p_start date,
  p_end date,
  p_annual boolean,
  p_active boolean
)
returns bigint
language sql
security invoker
set search_path = ''
as $$
  select private.save_custom_greeting(p_id, p_hotel, p_emoji, p_color, p_en, p_es, p_start, p_end, p_annual, p_active);
$$;

create or replace function public.save_my_celebration(
  p_hotel text,
  p_name text,
  p_month smallint,
  p_day smallint,
  p_hire date
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.save_my_celebration(p_hotel, p_name, p_month, p_day, p_hire);
$$;

drop policy if exists custom_greetings_select on public.custom_greetings;
create policy custom_greetings_select on public.custom_greetings
  for select to authenticated
  using (
    (select private.greet_is_corporate())
    or (
      active
      and (
        hotel is null
        or hotel = any ((select private.my_hotels())::text[])
      )
    )
  );

drop policy if exists staff_celebrations_select on public.staff_celebrations;
create policy staff_celebrations_select on public.staff_celebrations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      (select private.greet_can_see_celebrations())
      and (
        (select private.is_above())
        or hotel = any ((select private.my_hotels())::text[])
      )
    )
  );

revoke all on function private.greet_is_corporate() from public, anon;
revoke all on function private.greet_can_see_celebrations() from public, anon;
revoke all on function private.greet_hotel_ok(text) from public, anon;
revoke all on function private.save_custom_greeting(bigint, text, text, text, text, text, date, date, boolean, boolean) from public, anon;
revoke all on function private.save_my_celebration(text, text, smallint, smallint, date) from public, anon;
revoke all on function public.save_custom_greeting(bigint, text, text, text, text, text, date, date, boolean, boolean) from public, anon;
revoke all on function public.save_my_celebration(text, text, smallint, smallint, date) from public, anon;

grant execute on function private.greet_is_corporate() to authenticated;
grant execute on function private.greet_can_see_celebrations() to authenticated;
grant execute on function private.greet_hotel_ok(text) to authenticated;
grant execute on function private.save_custom_greeting(bigint, text, text, text, text, text, date, date, boolean, boolean) to authenticated;
grant execute on function private.save_my_celebration(text, text, smallint, smallint, date) to authenticated;
grant execute on function public.save_custom_greeting(bigint, text, text, text, text, text, date, date, boolean, boolean) to authenticated;
grant execute on function public.save_my_celebration(text, text, smallint, smallint, date) to authenticated;

revoke all on table public.custom_greetings from public, anon, authenticated;
revoke all on table public.staff_celebrations from public, anon, authenticated;
grant select on table public.custom_greetings to authenticated;
grant select on table public.staff_celebrations to authenticated;
revoke all on sequence public.custom_greetings_id_seq from public, anon, authenticated;
