-- Per-person home quick tiles. Additive. Null means "use the role defaults".
-- Demo mode never calls this. A person can change only their own row.

alter table public.profiles
  add column if not exists home_tiles text[];

comment on column public.profiles.home_tiles is
  'Screen ids this person pinned on the home quick-tile row. Null uses the role and hotel defaults.';

create or replace function private.set_my_home_tiles(p_tiles text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  if p_tiles is not null then
    if cardinality(p_tiles) > 8 then
      raise exception 'too many';
    end if;
    foreach v_id in array p_tiles loop
      if v_id is null or v_id !~ '^[a-z][a-z0-9_]{0,40}$' then
        raise exception 'bad tile';
      end if;
    end loop;
  end if;
  update public.profiles
    set home_tiles = p_tiles
    where user_id = (select auth.uid());
end;
$$;

create or replace function public.set_my_home_tiles(p_tiles text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_my_home_tiles(p_tiles);
$$;

revoke all on function private.set_my_home_tiles(text[]) from public, anon;
revoke all on function public.set_my_home_tiles(text[]) from public, anon;

grant execute on function private.set_my_home_tiles(text[]) to authenticated;
grant execute on function public.set_my_home_tiles(text[]) to authenticated;
