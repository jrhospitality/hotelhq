-- Preferred names for sign-in. Additive only.
-- Adds two nullable columns, a search that returns at most 8 active people,
-- and a GM save. Does not insert, update, or delete any person.
-- Demo mode never calls this database.
-- Not applied until the migration is run on the project. The publishable key
-- stays out of git.

alter table public.profiles
  add column if not exists preferred_name text;

alter table public.profiles
  add column if not exists aliases text[];

comment on column public.profiles.preferred_name is
  'Name this person goes by. Null means the legal name is used at sign-in.';

comment on column public.profiles.aliases is
  'Extra spellings or nicknames used only to find this person at sign-in.';

create or replace function private.aliases_ok(p_aliases text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_aliases is null
    or (
      pg_catalog.cardinality(p_aliases) <= 6
      and not exists (
        select 1
        from pg_catalog.unnest(p_aliases) as item(alias)
        where item.alias is null
          or pg_catalog.char_length(pg_catalog.btrim(item.alias)) < 1
          or pg_catalog.char_length(pg_catalog.btrim(item.alias)) > 40
      )
    );
$$;

do $body$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_preferred_name_len'
      and conrelid = 'public.profiles'::pg_catalog.regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_name_len
      check (
        preferred_name is null
        or char_length(btrim(preferred_name)) between 1 and 40
      );
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_aliases_ok'
      and conrelid = 'public.profiles'::pg_catalog.regclass
  ) then
    alter table public.profiles
      add constraint profiles_aliases_ok
      check (private.aliases_ok(aliases));
  end if;
end
$body$;

create index if not exists profiles_sign_in_hotel_idx
  on public.profiles (hotel_id)
  where active;

create or replace function private.protect_preferred_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_catalog.current_setting('hotelhq.preferred_write', true) is distinct from 'on' then
    if tg_op = 'INSERT' then
      new.preferred_name := null;
      new.aliases := null;
    else
      new.preferred_name := old.preferred_name;
      new.aliases := old.aliases;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_preferred_name on public.profiles;
create trigger profiles_protect_preferred_name
  before insert or update on public.profiles
  for each row execute function private.protect_preferred_name();

create or replace function private.fold_name(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.btrim(
    pg_catalog.regexp_replace(
      pg_catalog.translate(
        pg_catalog.lower(pg_catalog.btrim(coalesce(p_text, ''))),
        'áàäâãåéèëêíìïîóòöôõúùüûñçýÿÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝŸ',
        'aaaaaaeeeeiiiiooooouuuuncyyaaaaaaeeeeiiiiooooouuuuncyy'
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

-- Small capped Damerau-Levenshtein. Names are short, so a flat matrix is enough.
create or replace function private.bounded_damerau(p_a text, p_b text, p_cap integer)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  a text := coalesce(p_a, '');
  b text := coalesce(p_b, '');
  al integer := pg_catalog.length(a);
  bl integer := pg_catalog.length(b);
  w integer := bl + 1;
  m integer[];
  i integer;
  j integer;
  cost integer;
  value integer;
  row_best integer;
begin
  if a = b then
    return 0;
  end if;
  if al = 0 or bl = 0 then
    return pg_catalog.greatest(al, bl);
  end if;
  if pg_catalog.abs(al - bl) > p_cap then
    return p_cap + 1;
  end if;
  m := pg_catalog.array_fill(0, array[(al + 1) * (bl + 1)]);
  for j in 0..bl loop
    m[j + 1] := j;
  end loop;
  for i in 1..al loop
    m[i * w + 1] := i;
  end loop;
  for i in 1..al loop
    row_best := m[i * w + 1];
    for j in 1..bl loop
      cost := case when pg_catalog.substr(a, i, 1) = pg_catalog.substr(b, j, 1) then 0 else 1 end;
      value := m[(i - 1) * w + j + 1] + 1;
      if m[i * w + j] + 1 < value then
        value := m[i * w + j] + 1;
      end if;
      if m[(i - 1) * w + j] + cost < value then
        value := m[(i - 1) * w + j] + cost;
      end if;
      if i > 1 and j > 1
        and pg_catalog.substr(a, i, 1) = pg_catalog.substr(b, j - 1, 1)
        and pg_catalog.substr(a, i - 1, 1) = pg_catalog.substr(b, j, 1)
        and m[(i - 2) * w + (j - 1)] + 1 < value then
        value := m[(i - 2) * w + (j - 1)] + 1;
      end if;
      m[i * w + j + 1] := value;
      if value < row_best then
        row_best := value;
      end if;
    end loop;
    if row_best > p_cap then
      return p_cap + 1;
    end if;
  end loop;
  return m[al * w + bl + 1];
end;
$$;

create or replace function private.sign_in_token_score(p_word text, p_token text, p_kind text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  preferred boolean := p_kind in ('preferred', 'alias');
  cap integer;
  dist integer;
begin
  if p_word is null or p_word = '' or p_token is null or p_token = '' then
    return 0;
  end if;
  if p_token = p_word then
    return case when preferred then 420 else 400 end;
  end if;
  if pg_catalog.left(p_token, pg_catalog.length(p_word)) = p_word then
    return case when preferred then 320 else 300 end;
  end if;
  if pg_catalog.length(p_word) >= 2 and pg_catalog.strpos(p_token, p_word) > 0 then
    return 180;
  end if;
  cap := case
    when pg_catalog.length(p_word) >= 6 then 2
    when pg_catalog.length(p_word) >= 4 then 1
    else 0
  end;
  if cap = 0 then
    return 0;
  end if;
  dist := private.bounded_damerau(p_word, p_token, cap);
  if dist <= cap then
    return 140 - dist * 20 + case when preferred then 10 else 0 end;
  end if;
  return 0;
end;
$$;

create or replace function private.sign_in_name_score(
  p_name text,
  p_preferred text,
  p_aliases text[],
  p_query text
)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  q text := private.fold_name(p_query);
  words text[];
  word text;
  sources text[] := array[]::text[];
  source text;
  kind text;
  tokens text[] := array[]::text[];
  kinds text[] := array[]::text[];
  bits text[];
  bit text;
  i integer;
  j integer;
  total integer := 0;
  best integer;
  score integer;
  saw_prefix boolean := false;
  word_prefix boolean;
begin
  if q is null or q = '' or pg_catalog.length(q) > 40 then
    return 0;
  end if;
  words := pg_catalog.regexp_split_to_array(q, ' ');
  sources := sources || private.fold_name(p_name);
  sources := sources || private.fold_name(p_preferred);
  if p_aliases is not null then
    for i in 1..pg_catalog.least(pg_catalog.cardinality(p_aliases), 6) loop
      sources := sources || private.fold_name(p_aliases[i]);
    end loop;
  end if;
  for i in 1..pg_catalog.cardinality(sources) loop
    source := sources[i];
    if source is null or source = '' then
      continue;
    end if;
    kind := case when i = 1 then 'legal' when i = 2 then 'preferred' else 'alias' end;
    tokens := tokens || source;
    kinds := kinds || kind;
    bits := pg_catalog.regexp_split_to_array(source, ' ');
    foreach bit in array bits loop
      if bit is not null and bit <> '' and bit is distinct from source then
        tokens := tokens || bit;
        kinds := kinds || kind;
      end if;
    end loop;
  end loop;
  if pg_catalog.cardinality(tokens) is null or pg_catalog.cardinality(tokens) = 0 then
    return 0;
  end if;
  foreach word in array words loop
    if word is null or word = '' then
      continue;
    end if;
    best := 0;
    word_prefix := false;
    for j in 1..pg_catalog.cardinality(tokens) loop
      score := private.sign_in_token_score(word, tokens[j], kinds[j]);
      if score > best then
        best := score;
      end if;
      if score >= 300 then
        word_prefix := true;
      end if;
    end loop;
    if best = 0 then
      return 0;
    end if;
    total := total + best;
    if word_prefix then
      saw_prefix := true;
    end if;
  end loop;
  if saw_prefix then
    total := total + 15;
  end if;
  return total;
end;
$$;

create or replace function private.staff_sign_in_search(p_query text, p_hotel text)
returns table (
  user_id uuid,
  name text,
  preferred_name text,
  hotel_id text,
  role text,
  language text,
  extra_hotels text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q text := private.fold_name(p_query);
begin
  if q is null or pg_catalog.length(q) < 2 or pg_catalog.length(q) > 40 then
    return;
  end if;
  if p_hotel is null or p_hotel not in ('MSPWE', 'MSPAM', 'MSPMS', 'CORP') then
    return;
  end if;
  return query
  select s.user_id, s.name, s.preferred_name, s.hotel_id, s.role, s.language, s.extra_hotels
  from (
    select
      p.user_id,
      p.name,
      p.preferred_name,
      p.hotel_id,
      p.role::text as role,
      p.language,
      coalesce(
        (select pg_catalog.array_agg(ph.hotel_id)
         from public.profile_hotels ph
         where ph.user_id = p.user_id),
        '{}'::text[]
      ) as extra_hotels,
      private.sign_in_name_score(p.name, p.preferred_name, p.aliases, q) as score
    from public.profiles p
    where p.active
      and (
        (p_hotel = 'CORP' and p.hotel_id is null)
        or (
          p_hotel <> 'CORP'
          and (
            p.hotel_id = p_hotel
            or p.hotel_id is null
            or exists (
              select 1
              from public.profile_hotels ph
              where ph.user_id = p.user_id
                and ph.hotel_id = p_hotel
            )
          )
        )
      )
  ) s
  where s.score > 0
  order by s.score desc, s.name
  limit 8;
end;
$$;

create or replace function private.can_edit_preferred(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when (select auth.uid()) is null then false
      when private.is_above() then true
      when private.my_role() in ('gm'::public.app_role, 'agm'::public.app_role)
        and exists (
          select 1
          from public.profiles t
          where t.user_id = p_user
            and t.hotel_id = any ((select private.my_hotels())::text[])
        )
      then true
      else false
    end
  ), false);
$$;

create or replace function private.set_staff_preferred_name(
  p_user uuid,
  p_preferred text,
  p_aliases text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw text;
  cleaned text[] := '{}'::text[];
  v_pref text;
begin
  if not private.can_edit_preferred(p_user) then
    raise exception 'not allowed';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_user) then
    raise exception 'not allowed';
  end if;
  v_pref := pg_catalog.nullif(pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_preferred, '')), '\s+', ' ', 'g'), '');
  if v_pref is not null and pg_catalog.char_length(v_pref) > 40 then
    raise exception 'invalid name';
  end if;
  if p_aliases is not null then
    foreach raw in array p_aliases loop
      raw := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(raw, '')), '\s+', ' ', 'g');
      if raw = '' then
        continue;
      end if;
      if pg_catalog.char_length(raw) > 40 or pg_catalog.cardinality(cleaned) >= 6 then
        raise exception 'invalid name';
      end if;
      if pg_catalog.array_position(cleaned, raw) is null then
        cleaned := cleaned || raw;
      end if;
    end loop;
  end if;
  if pg_catalog.cardinality(cleaned) = 0 then
    cleaned := null;
  end if;
  perform pg_catalog.set_config('hotelhq.preferred_write', 'on', true);
  update public.profiles
  set preferred_name = v_pref,
      aliases = cleaned
  where user_id = p_user;
end;
$$;

create or replace function public.staff_sign_in_search(p_query text, p_hotel text)
returns table (
  user_id uuid,
  name text,
  preferred_name text,
  hotel_id text,
  role text,
  language text,
  extra_hotels text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.staff_sign_in_search(p_query, p_hotel);
$$;

create or replace function public.set_staff_preferred_name(
  p_user uuid,
  p_preferred text,
  p_aliases text[]
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_staff_preferred_name(p_user, p_preferred, p_aliases);
$$;

revoke all on function private.aliases_ok(text[]) from public, anon, authenticated;
revoke all on function private.protect_preferred_name() from public, anon, authenticated;
revoke all on function private.fold_name(text) from public, anon, authenticated;
revoke all on function private.bounded_damerau(text, text, integer) from public, anon, authenticated;
revoke all on function private.sign_in_token_score(text, text, text) from public, anon, authenticated;
revoke all on function private.sign_in_name_score(text, text, text[], text) from public, anon, authenticated;
revoke all on function private.staff_sign_in_search(text, text) from public, anon, authenticated;
revoke all on function private.can_edit_preferred(uuid) from public, anon, authenticated;
revoke all on function private.set_staff_preferred_name(uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.staff_sign_in_search(text, text) from public, anon, authenticated;
revoke all on function public.set_staff_preferred_name(uuid, text, text[]) from public, anon, authenticated;

grant execute on function private.staff_sign_in_search(text, text) to service_role;
grant execute on function public.staff_sign_in_search(text, text) to service_role;
grant execute on function private.can_edit_preferred(uuid) to authenticated;
grant execute on function private.set_staff_preferred_name(uuid, text, text[]) to authenticated;
grant execute on function public.set_staff_preferred_name(uuid, text, text[]) to authenticated;
