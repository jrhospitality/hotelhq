-- Hotel isolation. Additive only: no tables, columns, or rows are dropped.
-- Not applied by this change. Review and run it when you are ready.
--
-- JR Corporate (above_property) still sees every hotel.
-- Every other signed-in user sees only the hotel on their profile.
-- profile_hotels no longer widens that list.
--
-- Shuttle sign-ups stay shared for front desk and shuttle drivers whose
-- hotel is MSPAM or MSPMS. They can read and update both airport hotels'
-- shuttle rows so the one van can be boarded. MSPWE cannot see that queue.
-- GM and AGM see shuttle sign-ups for their own hotel only.

create schema if not exists private;

create or replace function private.my_hotels()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct p.hotel_id), '{}'::text[])
  from public.profiles p
  where p.user_id = (select auth.uid())
    and p.active
    and p.hotel_id is not null
$$;

revoke all on function private.my_hotels() from public, anon;
grant execute on function private.my_hotels() to authenticated;

create or replace function private.can_access(h text, d text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.is_mgr_of(h)
    or (private.my_hotel() = h and private.my_dept() = d)
    or (
      d = 'shuttle'
      and h in ('MSPAM', 'MSPMS')
      and private.my_hotel() in ('MSPAM', 'MSPMS')
      and private.my_role() in ('shuttle_driver', 'front_desk')
    )
$$;

revoke all on function private.can_access(text, text) from public, anon;
grant execute on function private.can_access(text, text) to authenticated;

drop policy if exists qotd_q_mgr_read on public.qotd_questions;
create policy qotd_q_mgr_read on public.qotd_questions
  for select
  to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and (hotel_id is null or hotel_id = (select private.my_hotel()))
    )
  );

create or replace function private.qotd_upsert(p_id bigint, p jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare id_ bigint; hid text;
begin
  if not (private.is_above() or private.my_role() in ('gm','agm')) then raise exception 'not allowed'; end if;
  if p_id is not null then
    select hotel_id into hid from qotd_questions where id = p_id;
    if hid is not null and not (private.is_above() or private.is_mgr_of(hid)) then
      raise exception 'not allowed';
    end if;
  end if;
  if coalesce(p->>'hotel_id', '') <> '' and not (private.is_above() or private.is_mgr_of(p->>'hotel_id')) then
    raise exception 'not allowed';
  end if;
  if p_id is null and coalesce(jsonb_array_length(p->'roles'),0)=0 then raise exception 'pick at least one role'; end if;
  if p_id is null and coalesce(p->>'source_url','')='' then raise exception 'source_url required (use "general hospitality best practice" if none)'; end if;
  if p_id is null then
    insert into qotd_questions(brand,role_group,topic,question_en,question_es,options_en,options_es,correct_idx,explain_en,explain_es,source_url,es_reviewed,created_by,updated_by,roles,kind)
    values (coalesce(p->>'brand','all'),coalesce(p->>'role_group','all'),p->>'topic',p->>'question_en',p->>'question_es',p->'options_en',p->'options_es',
      (p->>'correct_idx')::int,p->>'explain_en',p->>'explain_es',p->>'source_url',coalesce((p->>'es_reviewed')::boolean,true),auth.uid(),auth.uid(),array(select jsonb_array_elements_text(p->'roles')),coalesce(p->>'kind','role')) returning id into id_;
  else
    update qotd_questions set brand=coalesce(p->>'brand',brand), role_group=coalesce(p->>'role_group',role_group), topic=coalesce(p->>'topic',topic),
      question_en=coalesce(p->>'question_en',question_en), question_es=coalesce(p->>'question_es',question_es),
      options_en=coalesce(p->'options_en',options_en), options_es=coalesce(p->'options_es',options_es),
      correct_idx=coalesce((p->>'correct_idx')::int,correct_idx), explain_en=coalesce(p->>'explain_en',explain_en), explain_es=coalesce(p->>'explain_es',explain_es),
      source_url=coalesce(p->>'source_url',source_url), es_reviewed=coalesce((p->>'es_reviewed')::boolean,es_reviewed), roles=coalesce(case when p ? 'roles' then array(select jsonb_array_elements_text(p->'roles')) end,roles), kind=coalesce(p->>'kind',kind),
      updated_by=auth.uid(), updated_at=now() where id=p_id returning id into id_;
  end if;
  return id_;
end $function$;

create or replace function private.qotd_retire(p_id bigint, p_retire boolean default true)
returns void
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare hid text;
begin
  if not (private.is_above() or private.my_role() in ('gm','agm')) then raise exception 'not allowed'; end if;
  select hotel_id into hid from qotd_questions where id = p_id;
  if hid is not null and not (private.is_above() or private.is_mgr_of(hid)) then
    raise exception 'not allowed';
  end if;
  update qotd_questions set active = not p_retire, retired_at = case when p_retire then now() end, updated_by = auth.uid(), updated_at = now() where id = p_id;
end $function$;
