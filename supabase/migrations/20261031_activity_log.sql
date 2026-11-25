-- One activity log. Adds an optional room on shift notes and a read-only view.
-- Source tables are unchanged aside from that new nullable column.

alter table public.shift_notes add column if not exists room text;

create index if not exists shift_notes_room_idx on public.shift_notes (hotel_id, room);

create or replace view public.activity_log
with (security_invoker = true) as
select n.hotel_id as hotel,
       'shift_note'::text as category,
       coalesce(n.room, '') as room,
       n.body as summary,
       coalesce(n.shift, '') as status,
       n.created_at as logged_at,
       'shift_notes'::text as source,
       n.id::text as source_id
from public.shift_notes n
union all
select e.hotel_id,
       case when e.sheet = 'keys' then 'key_log' else 'log_sheet' end,
       coalesce(e.data->>'room', ''),
       coalesce(e.data->>'note', e.data->>'n', e.data->>'why', e.data->>'co', e.sheet),
       case
         when e.out_of_range then 'out_of_range'
         when e.balanced is true then 'balanced'
         when e.balanced is false then 'variance'
         else coalesce(e.sheet, '')
       end,
       e.created_at,
       'log_entries',
       e.id::text
from public.log_entries e
union all
select f.hotel_id,
       'lost_found',
       coalesce(f.room_number, ''),
       coalesce(f.description, ''),
       f.status,
       f.created_at,
       'lost_found_items',
       f.id::text
from public.lost_found_items f
union all
select r.hotel_id,
       'room_notice',
       r.room,
       coalesce(r.note, ''),
       r.kind,
       r.created_at,
       'room_notices',
       r.id::text
from public.room_notices r
union all
select s.hotel_id,
       case l.kind
         when 'snow' then 'winter_snow'
         when 'storm' then 'winter_storm'
         when 'cold' then 'winter_cold'
         else 'winter_log'
       end,
       coalesce(l.room, ''),
       coalesce(l.note, ''),
       coalesce(l.action, l.kind),
       l.logged_at,
       'winter_logs',
       l.id::text
from public.winter_logs l
join public.winter_seasons s on s.id = l.season_id;

comment on view public.activity_log is
  'Shift notes, key log, lost and found, room notices, log sheets, and winter logs. One value per column.';

revoke all on table public.activity_log from public, anon, authenticated;
grant select on table public.activity_log to authenticated;
