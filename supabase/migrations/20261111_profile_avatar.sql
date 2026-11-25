-- The signed-in person's line-icon avatar. Null means initials.
-- Adds a column and a self-only save. Does not rewrite or delete rows.

alter table public.profiles
  add column if not exists avatar jsonb;

comment on column public.profiles.avatar is
  'Line-icon avatar {v,icon,accent}. Null means initials. An older cartoon value can sit under the legacy key.';

create or replace function public.set_my_avatar(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_icon text;
  v_accent text;
  v_legacy jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'not allowed';
  end if;
  v_icon := coalesce(p->>'icon', 'initials');
  if v_icon not in (
    'initials', 'key', 'bell', 'bed', 'coffee', 'star', 'sun', 'leaf',
    'wrench', 'spark', 'pin', 'heart', 'briefcase', 'clock', 'clipboard', 'users'
  ) then
    v_icon := 'initials';
  end if;
  v_accent := coalesce(p->>'accent', '');
  if v_accent not in ('blue', 'teal', 'amber', 'violet', 'green', 'slate', '') then
    v_accent := '';
  end if;
  if v_icon = 'initials' then
    v_accent := '';
  end if;
  v_legacy := case when jsonb_typeof(p->'legacy') = 'object' then p->'legacy' else null end;
  update public.profiles
    set avatar = jsonb_strip_nulls(jsonb_build_object(
      'v', 2,
      'icon', v_icon,
      'accent', nullif(v_accent, ''),
      'legacy', v_legacy
    ))
    where user_id = (select auth.uid());
end;
$$;

revoke all on function public.set_my_avatar(jsonb) from public, anon;
grant execute on function public.set_my_avatar(jsonb) to authenticated;
