-- Per-person home preference. Additive. Existing rows stay collapsed.
-- Demo mode never calls this. A person can change only their own row.

alter table public.profiles
  add column if not exists show_more_expanded boolean not null default false;

comment on column public.profiles.show_more_expanded is
  'When true, this person sees the More tile grid open on the home screen. Default is collapsed.';

create or replace function private.set_my_more_expanded(p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  update public.profiles
    set show_more_expanded = coalesce(p_on, false)
    where user_id = (select auth.uid());
end;
$$;

create or replace function public.set_my_more_expanded(p_on boolean)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_my_more_expanded(p_on);
$$;

revoke all on function private.set_my_more_expanded(boolean) from public, anon;
revoke all on function public.set_my_more_expanded(boolean) from public, anon;

grant execute on function private.set_my_more_expanded(boolean) to authenticated;
grant execute on function public.set_my_more_expanded(boolean) to authenticated;
