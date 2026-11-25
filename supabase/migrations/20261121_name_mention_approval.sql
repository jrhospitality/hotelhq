-- Name-mention points wait for the property GM or AGM.
-- Additive only. Not applied by this change. Review and run it on
-- project clxvmtbmveusrbxacnxe when you are ready.
-- Demo mode does not call this database.
--
-- What already exists in that project, and what this file changes:
--   guest_mentions defaults to status pending.
--   confirm_mention is the only function that posts guest_mention points.
--   No trigger and no edge function awards a name mention on insert.
--   trg_match_review only links a room turn. It does not post points.
-- This file does not drop a table, column, or row.
-- It adds columns, a notice table, a wider source check, and replaces
-- the confirm function so a denial needs a reason and posts nothing.
--
-- Apply the whole file once. After it runs:
--   only a GM or AGM of that hotel can approve, reassign, or deny
--   JR Corporate cannot approve
--   points hit points_ledger only on approve
--   the associate gets one notice, in English and Spanish
--   a denial stores the reason and writes no notice and no points
--   an associate can read a confirmed mention, not a pending one

alter table public.guest_mentions add column if not exists deny_reason text not null default '';
alter table public.guest_mentions add column if not exists proposed_points integer not null default 500;
alter table public.guest_mentions add column if not exists awarded_points integer;
alter table public.guest_mentions add column if not exists approver_role text not null default '';
alter table public.guest_mentions add column if not exists previous_employee uuid;

alter table public.guest_mentions drop constraint if exists guest_mentions_source_check;
alter table public.guest_mentions add constraint guest_mentions_source_check
  check (source in (
    'medallia', 'guestVoice', 'guest_comments',
    'google', 'tripadvisor', 'expedia', 'booking',
    'survey', 'email', 'in_person', 'other'
  ));

comment on column public.guest_mentions.deny_reason is
  'Required when a GM or AGM denies the mention. Empty while it is pending or confirmed.';
comment on column public.guest_mentions.proposed_points is
  'Points suggested for this mention. Nothing is posted until approve.';
comment on column public.guest_mentions.awarded_points is
  'Points actually posted. Null until a GM or AGM approves.';
comment on column public.guest_mentions.approver_role is
  'gm or agm. Set with confirmed_by and confirmed_at when the decision is saved.';

insert into public.points_rules (hotel_id, reason, label_en, label_es, points)
select v.hotel_id,
  'guest_mention',
  'Positive guest name mention (GM-confirmed)',
  'Mención positiva del huésped (confirmada por el GM)',
  500
from (values ('MSPWE'), ('MSPAM'), ('MSPMS')) as v(hotel_id)
where not exists (
  select 1 from public.points_rules r
  where r.hotel_id = v.hotel_id and r.reason = 'guest_mention'
);

create table if not exists public.name_mention_notices (
  id uuid primary key default gen_random_uuid(),
  mention_id bigint not null references public.guest_mentions (id),
  hotel_id text not null,
  employee uuid not null,
  title_en text not null,
  title_es text not null,
  body_en text not null,
  body_es text not null,
  points integer not null check (points > 0),
  created_at timestamptz not null default pg_catalog.now(),
  dismissed_at timestamptz,
  unique (mention_id)
);

comment on table public.name_mention_notices is
  'One congratulations after a GM or AGM approves a positive name mention. A denial does not insert a row. The associate dismisses it once.';

create index if not exists name_mention_notices_open_idx
  on public.name_mention_notices (employee)
  where dismissed_at is null;

alter table public.name_mention_notices enable row level security;

-- Associates read a confirmed mention only. Pending rows stay with the GM and AGM
-- of that hotel, so a pending mention cannot show up as points already earned.
drop policy if exists gm_read on public.guest_mentions;
drop policy if exists guest_mentions_read on public.guest_mentions;
create policy guest_mentions_read on public.guest_mentions
  for select to authenticated
  using (
    (
      (select private.my_role()) in ('gm', 'agm')
      and not (select private.is_above())
      and hotel_id = any ((select private.my_hotels())::text[])
    )
    or (
      employee = (select auth.uid())
      and status = 'confirmed'
    )
    or (select private.is_above())
  );

drop policy if exists name_mention_notices_read on public.name_mention_notices;
create policy name_mention_notices_read on public.name_mention_notices
  for select to authenticated
  using (
    employee = (select auth.uid())
    or (
      (select private.my_role()) in ('gm', 'agm')
      and not (select private.is_above())
      and hotel_id = any ((select private.my_hotels())::text[])
    )
    or (select private.is_above())
  );

create or replace function private.name_mention_leader(p_hotel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.my_role()) in ('gm', 'agm')
    and not (select private.is_above())
    and p_hotel = any ((select private.my_hotels())::text[]);
$$;

revoke all on function private.name_mention_leader(text) from public, anon;
grant execute on function private.name_mention_leader(text) to authenticated;

create or replace function private.mention_notice(
  p_excerpt text,
  p_points integer
)
returns table (title_en text, title_es text, body_en text, body_es text)
language sql
immutable
set search_path = ''
as $$
  select
    'Congrats!'::text,
    '¡Felicidades!'::text,
    'Congrats! A guest mentioned you by name: "' || pg_catalog.left(pg_catalog.btrim(coalesce(p_excerpt, '')), 80) || '". +' || p_points::text || ' points.',
    '¡Felicidades! Un huésped te mencionó por tu nombre: "' || pg_catalog.left(pg_catalog.btrim(coalesce(p_excerpt, '')), 80) || '". +' || p_points::text || ' puntos.';
$$;

revoke all on function private.mention_notice(text, integer) from public, anon;

create or replace function private.confirm_mention(p_id bigint, p_ok boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.guest_mentions;
  pts integer;
  note record;
begin
  if not p_ok then
    raise exception 'deny reason required';
  end if;
  select * into m from public.guest_mentions where id = p_id;
  if m.id is null or not private.name_mention_leader(m.hotel_id) then
    raise exception 'not allowed';
  end if;
  if m.employee = (select auth.uid()) then
    raise exception 'cannot confirm your own mention';
  end if;
  if m.status <> 'pending' or m.positive is not true then
    raise exception 'not pending';
  end if;
  pts := private.award(m.employee, m.hotel_id, 'guest_mention', 'guest_mention', m.id::text);
  if pts is null or pts <= 0 then
    raise exception 'points were not posted';
  end if;
  update public.guest_mentions
    set status = 'confirmed',
        confirmed_by = (select auth.uid()),
        confirmed_at = pg_catalog.now(),
        approver_role = (select private.my_role())::text,
        awarded_points = pts,
        deny_reason = ''
    where id = p_id;
  update public.user_stats set mentions = mentions + 1 where user_id = m.employee;
  perform private.refresh_stats(m.employee, m.hotel_id);
  select * into note from private.mention_notice(m.excerpt, pts);
  insert into public.name_mention_notices (
    mention_id, hotel_id, employee, title_en, title_es, body_en, body_es, points
  ) values (
    m.id, m.hotel_id, m.employee, note.title_en, note.title_es, note.body_en, note.body_es, pts
  );
  begin
    insert into public.notifications (event, hotel_id, record_id, payload, status, requires_ack)
    values (
      'name_mention',
      m.hotel_id,
      m.id,
      pg_catalog.jsonb_build_object(
        'user_id', m.employee,
        'title_en', note.title_en,
        'title_es', note.title_es,
        'body_en', note.body_en,
        'body_es', note.body_es,
        'points', pts
      ),
      'pending',
      false
    );
  exception when others then
    null;
  end;
end;
$$;

create or replace function public.confirm_mention(p_id bigint, p_ok boolean)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.confirm_mention(p_id, p_ok);
$$;

create or replace function private.deny_mention(p_id bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.guest_mentions;
  reason text := pg_catalog.btrim(coalesce(p_reason, ''));
begin
  if reason = '' or pg_catalog.char_length(reason) > 200 then
    raise exception 'deny reason required';
  end if;
  select * into m from public.guest_mentions where id = p_id;
  if m.id is null or not private.name_mention_leader(m.hotel_id) then
    raise exception 'not allowed';
  end if;
  if m.status <> 'pending' then
    raise exception 'not pending';
  end if;
  update public.guest_mentions
    set status = 'rejected',
        deny_reason = reason,
        confirmed_by = (select auth.uid()),
        confirmed_at = pg_catalog.now(),
        approver_role = (select private.my_role())::text,
        awarded_points = null
    where id = p_id;
end;
$$;

create or replace function public.deny_name_mention(p_id bigint, p_reason text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.deny_mention(p_id, p_reason);
$$;

create or replace function private.reassign_mention(p_id bigint, p_employee uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.guest_mentions;
  v_hotel text;
begin
  if p_employee is null then
    raise exception 'choose a staff member';
  end if;
  select * into m from public.guest_mentions where id = p_id;
  if m.id is null or not private.name_mention_leader(m.hotel_id) then
    raise exception 'not allowed';
  end if;
  if m.status <> 'pending' then
    raise exception 'not pending';
  end if;
  select p.hotel_id into v_hotel
  from public.profiles p
  where p.user_id = p_employee and p.active and p.role::text not in ('above_property');
  if v_hotel is null or v_hotel <> m.hotel_id then
    raise exception 'staff member is not at this hotel';
  end if;
  if p_employee = m.employee then
    return;
  end if;
  update public.guest_mentions
    set previous_employee = m.employee,
        employee = p_employee
    where id = p_id;
end;
$$;

create or replace function public.reassign_name_mention(p_id bigint, p_employee uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.reassign_mention(p_id, p_employee);
$$;

create or replace function public.dismiss_name_mention_notice(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  update public.name_mention_notices
    set dismissed_at = pg_catalog.now()
    where id = p_id
      and employee = (select auth.uid())
      and dismissed_at is null;
end;
$$;

revoke all on function private.confirm_mention(bigint, boolean) from public, anon;
revoke all on function private.deny_mention(bigint, text) from public, anon;
revoke all on function private.reassign_mention(bigint, uuid) from public, anon;
revoke all on function public.confirm_mention(bigint, boolean) from public, anon;
revoke all on function public.deny_name_mention(bigint, text) from public, anon;
revoke all on function public.reassign_name_mention(bigint, uuid) from public, anon;
revoke all on function public.dismiss_name_mention_notice(uuid) from public, anon;

grant execute on function private.confirm_mention(bigint, boolean) to authenticated;
grant execute on function private.deny_mention(bigint, text) to authenticated;
grant execute on function private.reassign_mention(bigint, uuid) to authenticated;
grant execute on function public.confirm_mention(bigint, boolean) to authenticated;
grant execute on function public.deny_name_mention(bigint, text) to authenticated;
grant execute on function public.reassign_name_mention(bigint, uuid) to authenticated;
grant execute on function public.dismiss_name_mention_notice(uuid) to authenticated;

revoke all on table public.name_mention_notices from public, anon;
grant select on table public.name_mention_notices to authenticated;
