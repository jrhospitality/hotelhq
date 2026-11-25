-- Uniform request tracker. Guest requests and work orders stay in their tables.
-- This adds one shared status row and a view that still shows the old rows.

create table if not exists public.ops_requests (
  id bigint generated always as identity primary key,
  hotel_id text not null,
  hotel text generated always as (hotel_id) stored,
  kind text not null check (kind in ('guest_request', 'rush', 'houseperson_help', 'work_order')),
  dept text not null check (dept in ('housekeeping', 'maintenance', 'front_desk')),
  room text not null default '',
  title text not null,
  note text,
  priority text,
  status text not null default 'open' check (status in ('open', 'ack', 'done')),
  source_table text,
  source_id text,
  author_label text,
  example boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  ack_at timestamptz,
  done_at timestamptz
);

create index if not exists ops_requests_hotel_status_idx
  on public.ops_requests (hotel, status, created_at desc);

alter table public.ops_requests enable row level security;

drop policy if exists ops_requests_read on public.ops_requests;
drop policy if exists ops_requests_ins on public.ops_requests;
drop policy if exists ops_requests_upd on public.ops_requests;

create policy ops_requests_read on public.ops_requests
  for select to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy ops_requests_ins on public.ops_requests
  for insert to authenticated
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );
create policy ops_requests_upd on public.ops_requests
  for update to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

revoke all on table public.ops_requests from public, anon;
grant select, insert, update on table public.ops_requests to authenticated;
grant usage, select on sequence public.ops_requests_id_seq to authenticated;

create or replace view public.ops_request_feed
with (security_invoker = true) as
select o.hotel,
       o.kind,
       o.id::text as source_id,
       'ops_requests'::text as source_table,
       o.room,
       o.status,
       o.title as summary,
       o.dept,
       o.created_at as logged_at
from public.ops_requests o
union all
select g.hotel,
       'guest_request',
       g.id::text,
       'guest_requests',
       g.room,
       g.status,
       coalesce(g.note, ''),
       case g.dept
         when 'Maintenance' then 'maintenance'
         when 'Housekeeping' then 'housekeeping'
         else 'front_desk'
       end,
       g.created_at
from public.guest_requests g
where not exists (
  select 1 from public.ops_requests o
  where o.source_table = 'guest_requests' and o.source_id = g.id::text
)
union all
select w.hotel_id,
       'work_order',
       w.id::text,
       'work_orders',
       coalesce(w.room_number, w.location, ''),
       case lower(coalesce(w.status, ''))
         when 'done' then 'done'
         when 'in progress' then 'ack'
         else 'open'
       end,
       w.title,
       'maintenance',
       w.created_at
from public.work_orders w
where not exists (
  select 1 from public.ops_requests o
  where o.source_table = 'work_orders' and o.source_id = w.id::text
);

comment on view public.ops_request_feed is
  'Open requests in one list. Old guest requests and work orders stay visible.';

revoke all on table public.ops_request_feed from public, anon, authenticated;
grant select on table public.ops_request_feed to authenticated;
