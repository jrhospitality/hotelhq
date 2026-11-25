-- Housekeeper room reports earn 5 points in the existing insert-only
-- points_ledger. A duplicate open report, or a maintenance rejection,
-- adds a reversal row. Nothing here updates or deletes ledger rows,
-- work orders, or photos.
-- Photos stay in the private work-order-photos bucket. The app uploads
-- first, then inserts the work order with photo_paths already set,
-- because housekeepers can insert a work order but cannot update one.

insert into public.points_rules (hotel_id, reason, label_en, label_es, points)
select v.hotel_id, 'hk_report', 'Room problem reported', 'Problema de cuarto reportado', 5
from (values ('MSPWE'), ('MSPAM'), ('MSPMS')) as v(hotel_id)
where not exists (
  select 1 from public.points_rules r
  where r.hotel_id = v.hotel_id and r.reason = 'hk_report'
);

create or replace function private.trg_hk_report_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  eligible boolean;
begin
  eligible := new.category in (
      'plumbing', 'toilet', 'shower', 'hvac', 'tv', 'electrical',
      'door', 'furniture', 'window', 'pest', 'appliance', 'other'
    )
    and coalesce(pg_catalog.array_length(new.photo_paths, 1), 0) > 0
    and new.created_by is not null;

  if TG_OP = 'INSERT' and TG_WHEN = 'BEFORE' then
    if eligible
      and btrim(coalesce(new.room_number, new.location, '')) <> ''
      and exists (
        select 1 from public.work_orders w
        where w.hotel_id = new.hotel_id
          and w.category = new.category
          and lower(btrim(coalesce(w.room_number, w.location, '')))
              = lower(btrim(coalesce(new.room_number, new.location, '')))
          and lower(btrim(coalesce(w.status, ''))) in ('open', 'in progress', 'in_progress')
      ) then
      new.status := 'Duplicate';
    end if;
    return new;
  end if;

  if TG_OP = 'INSERT' and TG_WHEN = 'AFTER' then
    if not eligible then
      return null;
    end if;
    if (select private.my_role())::text is distinct from 'housekeeper' then
      return null;
    end if;
    perform private.award(new.created_by, new.hotel_id, 'hk_report', 'work_order', new.id::text, 1, 5);
    if lower(btrim(coalesce(new.status, ''))) = 'duplicate' then
      perform private.reverse('hk_report', 'work_order', new.id::text);
    end if;
    return null;
  end if;

  if TG_OP = 'UPDATE' and TG_WHEN = 'AFTER' then
    if lower(btrim(coalesce(new.status, ''))) = 'rejected'
       and lower(btrim(coalesce(old.status, ''))) is distinct from 'rejected' then
      perform private.reverse('hk_report', 'work_order', new.id::text);
    end if;
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists hk_report_points_bi on public.work_orders;
create trigger hk_report_points_bi
  before insert on public.work_orders
  for each row execute function private.trg_hk_report_points();

drop trigger if exists hk_report_points_ai on public.work_orders;
create trigger hk_report_points_ai
  after insert on public.work_orders
  for each row execute function private.trg_hk_report_points();

drop trigger if exists hk_report_points_au on public.work_orders;
create trigger hk_report_points_au
  after update of status on public.work_orders
  for each row execute function private.trg_hk_report_points();

-- Monthly totals by name for this hotel. Housekeepers can see the board.
-- The raw ledger stays limited to the person and their managers.
create or replace function private.hk_report_board(p_hotel text)
returns table (staff_name text, points integer)
language sql
stable
security definer
set search_path = ''
as $$
  select pr.name, coalesce(sum(l.points), 0)::integer
  from public.points_ledger l
  join public.profiles pr on pr.user_id = l.user_id
  where l.reason = 'hk_report'
    and l.hotel_id = p_hotel
    and l.created_at >= date_trunc('month', pg_catalog.now())
    and l.created_at < date_trunc('month', pg_catalog.now()) + interval '1 month'
    and (
      (select private.is_above())
      or (select private.is_mgr_of(p_hotel))
      or (
        (select private.my_hotel()) = p_hotel
        and (select private.my_role())::text in ('housekeeper', 'hk_lead', 'maintenance')
      )
    )
  group by pr.name
  order by coalesce(sum(l.points), 0) desc, pr.name;
$$;

create or replace function public.hk_report_board(p_hotel text)
returns table (staff_name text, points integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.hk_report_board(p_hotel);
$$;

revoke all on function public.hk_report_board(text) from public, anon;
grant execute on function public.hk_report_board(text) to authenticated;
grant execute on function private.hk_report_board(text) to authenticated;

comment on function public.hk_report_board(text) is
  'This month''s housekeeper report points by name. Points only, no dollar value.';
