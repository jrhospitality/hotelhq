-- Guest comments. Additive only. Not applied by this change.
-- Review and run it when you are ready. Demo mode does not call this database.
--
-- New tables only. No existing table, column, or row is dropped or deleted.
-- GM and AGM read and clear their own hotel. Corporate reads and clears every hotel.
-- Housekeeping reads cleanliness comments for their own hotel. A housekeeper's
-- screen shows only the mentions attributed to them. The executive housekeeper
-- sees the team. Other roles see no rows.
-- The daily Medallia pull is a stub. ingest_guest_comment_feed stores
-- awaiting_feed and does not keep the feed body.

create schema if not exists private;

grant usage on schema private to authenticated;

alter table public.hotel_features drop constraint if exists hotel_features_feature_check;

alter table public.hotel_features add constraint hotel_features_feature_check
  check (feature in (
    'parking', 'sales_leads', 'greetings', 'guest_scores',
    'shuttle', 'meetings', 'winter', 'night_audit', 'guest_comments'
  ));

insert into public.hotel_features (hotel, feature, enabled)
values
  ('MSPWE', 'guest_comments', true),
  ('MSPAM', 'guest_comments', true),
  ('MSPMS', 'guest_comments', true)
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
    'shuttle', 'meetings', 'winter', 'night_audit', 'guest_comments'
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

create table if not exists public.guest_comment_feeds (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  feed_date date not null,
  source text not null check (source = 'medallia'),
  status text not null check (status in ('received', 'parsed', 'awaiting_feed', 'failed')),
  received_at timestamptz not null default pg_catalog.now()
);

comment on table public.guest_comment_feeds is
  'One daily Medallia pull. The stub stores awaiting_feed. The feed body is not stored.';

create table if not exists public.guest_comment_rows (
  id bigint generated always as identity primary key,
  feed_id uuid not null references public.guest_comment_feeds (id),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  feed_date date not null,
  row_no integer not null check (row_no > 0),
  cells jsonb not null default '{}'::jsonb,
  unique (feed_id, row_no)
);

comment on table public.guest_comment_rows is
  'Parsed cells for a future Medallia file. The stub does not write rows.';

create table if not exists public.guest_comments (
  id uuid primary key default gen_random_uuid(),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  comment_date date not null,
  source text not null check (source in ('medallia', 'ihg', 'booking', 'ctrip', 'google', 'expedia')),
  theme text not null check (theme in ('parking', 'breakfast', 'cleanliness', 'maintenance', 'wifi', 'noise', 'front_desk', 'praise')),
  tone text not null check (tone in ('praise', 'complaint')),
  score numeric(4, 1) check (score is null or score >= 0),
  score_max integer not null default 10 check (score_max in (5, 10)),
  room text not null default '' check (char_length(room) <= 8),
  body_en text not null check (char_length(body_en) between 1 and 400),
  body_es text not null default '' check (char_length(body_es) <= 400),
  action_kind text not null check (action_kind in ('work_order', 'task')),
  action_en text not null check (char_length(action_en) between 1 and 200),
  action_es text not null check (char_length(action_es) between 1 and 200),
  metrics jsonb not null default '{}'::jsonb,
  arrival date,
  departure date,
  check_in time,
  attributed_housekeeper text not null default '' check (char_length(attributed_housekeeper) <= 80),
  attributed_inspector text not null default '' check (char_length(attributed_inspector) <= 80),
  attributed_front_desk text not null default '' check (char_length(attributed_front_desk) <= 80),
  attributed_breakfast text not null default '' check (char_length(attributed_breakfast) <= 160),
  feed_id uuid references public.guest_comment_feeds (id),
  created_at timestamptz not null default pg_catalog.now(),
  check (score is null or score <= score_max)
);

comment on table public.guest_comments is
  'One guest survey or review comment. Scores are the hotel sample scale. No guest name is stored.';

create index if not exists guest_comments_hotel_date_idx
  on public.guest_comments (hotel, comment_date desc);

create index if not exists guest_comments_clean_idx
  on public.guest_comments (hotel, attributed_housekeeper)
  where theme = 'cleanliness';

create table if not exists public.guest_comment_actions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null unique references public.guest_comments (id),
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  action text not null check (action in ('actioned', 'not_issue', 'assign')),
  kind text not null default '' check (kind in ('', 'work_order', 'task')),
  ref text not null default '' check (char_length(ref) <= 40),
  acted_by uuid default auth.uid(),
  acted_name text not null default '' check (char_length(acted_name) <= 80),
  acted_at timestamptz not null default pg_catalog.now(),
  check (
    (action = 'assign' and kind in ('work_order', 'task'))
    or (action in ('actioned', 'not_issue') and kind = '')
  )
);

comment on table public.guest_comment_actions is
  'One clearing action: actioned, not an issue, or assign. Assign records a work order or a task.';

create index if not exists guest_comment_actions_hotel_idx
  on public.guest_comment_actions (hotel, acted_at desc);

alter table public.guest_comment_feeds enable row level security;
alter table public.guest_comment_rows enable row level security;
alter table public.guest_comments enable row level security;
alter table public.guest_comment_actions enable row level security;

drop policy if exists guest_comment_feeds_select on public.guest_comment_feeds;
create policy guest_comment_feeds_select on public.guest_comment_feeds
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists guest_comment_rows_select on public.guest_comment_rows;
create policy guest_comment_rows_select on public.guest_comment_rows
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

-- Leaders read every theme at their hotels. Housekeeping reads cleanliness rows
-- at their own hotel. The screen, not this policy, hides a teammate's counts
-- from a housekeeper. Everyone else sees nothing.
drop policy if exists guest_comments_select on public.guest_comments;
create policy guest_comments_select on public.guest_comments
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
    or (
      (select private.my_role()) in ('hk_lead', 'housekeeper')
      and theme = 'cleanliness'
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

drop policy if exists guest_comment_actions_select on public.guest_comment_actions;
create policy guest_comment_actions_select on public.guest_comment_actions
  for select to authenticated
  using (
    (select private.is_above())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and hotel = any ((select private.my_hotels())::text[])
    )
  );

create or replace function private.guest_comments_allowed(p_hotel text)
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

create or replace function private.act_guest_comment(
  p_comment uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_kind text;
  v_name text;
  v_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  if p_action not in ('actioned', 'not_issue', 'assign') then
    raise exception 'unknown action';
  end if;
  select hotel, action_kind into v_hotel, v_kind
  from public.guest_comments
  where id = p_comment;
  if v_hotel is null or not private.guest_comments_allowed(v_hotel) then
    raise exception 'not allowed';
  end if;
  select action into v_status from public.guest_comment_actions where comment_id = p_comment;
  if v_status in ('actioned', 'not_issue') then
    raise exception 'already cleared';
  end if;
  if v_status = 'assign' and p_action = 'assign' then
    raise exception 'already assigned';
  end if;
  if v_status = 'assign' and p_action in ('actioned', 'not_issue') then
    update public.guest_comment_actions
      set action = p_action, kind = '', acted_by = (select auth.uid()), acted_at = pg_catalog.now()
      where comment_id = p_comment;
    return;
  end if;
  select coalesce(p.name, '') into v_name
  from public.profiles p
  where p.user_id = (select auth.uid())
  limit 1;
  insert into public.guest_comment_actions (comment_id, hotel, action, kind, acted_by, acted_name)
  values (
    p_comment, v_hotel, p_action,
    case when p_action = 'assign' then v_kind else '' end,
    (select auth.uid()), coalesce(v_name, '')
  );
end;
$$;

-- Daily Medallia stub. An empty pull is stored as awaiting_feed.
-- Parsed rows are accepted only when the caller already extracted them.
-- The feed body is not written.
create or replace function private.ingest_guest_comment_feed(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_date date;
  v_id uuid;
  v_items jsonb;
  v_rows jsonb;
  v_status text;
begin
  if not (
    coalesce((select auth.jwt() ->> 'role') = 'service_role', false)
    or ((select auth.uid()) is not null and private.guest_comments_allowed(p->>'hotel'))
  ) then
    raise exception 'not allowed';
  end if;
  v_hotel := p->>'hotel';
  if v_hotel not in ('MSPWE', 'MSPAM', 'MSPMS') then
    raise exception 'unknown hotel';
  end if;
  if coalesce(p->>'feed_date', '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'feed_date';
  end if;
  v_date := (p->>'feed_date')::date;
  if coalesce(p->>'source', 'medallia') <> 'medallia' then
    raise exception 'unknown source';
  end if;
  v_items := case when jsonb_typeof(p->'items') = 'array' then p->'items' else '[]'::jsonb end;
  v_rows := case when jsonb_typeof(p->'rows') = 'array' then p->'rows' else '[]'::jsonb end;
  if pg_catalog.jsonb_array_length(v_items) > 200 or pg_catalog.jsonb_array_length(v_rows) > 200 then
    raise exception 'too many rows';
  end if;
  v_status := case when pg_catalog.jsonb_array_length(v_items) > 0 then 'parsed' else 'awaiting_feed' end;
  insert into public.guest_comment_feeds (hotel, feed_date, source, status)
  values (v_hotel, v_date, 'medallia', v_status)
  returning id into v_id;
  if v_status = 'parsed' then
    insert into public.guest_comment_rows (feed_id, hotel, feed_date, row_no, cells)
    select v_id, v_hotel, v_date, ordinality::integer, coalesce(item, '{}'::jsonb)
    from pg_catalog.jsonb_array_elements(v_rows) with ordinality as src(item, ordinality);
  end if;
  return v_id;
end;
$$;

create or replace function public.act_guest_comment(p_comment uuid, p_action text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.act_guest_comment(p_comment, p_action);
$$;

create or replace function public.ingest_guest_comment_feed(p jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.ingest_guest_comment_feed(p);
$$;

revoke all on function private.guest_comments_allowed(text) from public, anon;
revoke all on function private.act_guest_comment(uuid, text) from public, anon;
revoke all on function private.ingest_guest_comment_feed(jsonb) from public, anon;
revoke all on function public.act_guest_comment(uuid, text) from public, anon;
revoke all on function public.ingest_guest_comment_feed(jsonb) from public, anon;

grant execute on function private.guest_comments_allowed(text) to authenticated;
grant execute on function private.act_guest_comment(uuid, text) to authenticated;
grant execute on function private.ingest_guest_comment_feed(jsonb) to authenticated;
grant execute on function public.act_guest_comment(uuid, text) to authenticated;
grant execute on function public.ingest_guest_comment_feed(jsonb) to authenticated;

do $$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    grant execute on function public.ingest_guest_comment_feed(jsonb) to service_role;
    grant execute on function private.ingest_guest_comment_feed(jsonb) to service_role;
  end if;
end $$;

revoke all on table public.guest_comment_feeds from public, anon, authenticated;
revoke all on table public.guest_comment_rows from public, anon, authenticated;
revoke all on table public.guest_comments from public, anon, authenticated;
revoke all on table public.guest_comment_actions from public, anon, authenticated;

grant select on table public.guest_comment_feeds to authenticated;
grant select on table public.guest_comment_rows to authenticated;
grant select on table public.guest_comments to authenticated;
grant select on table public.guest_comment_actions to authenticated;
