-- Golden Valley guest rooms for the live room board.
-- Room numbers and floors come from data/mspwe-floors.json (117 rooms).
-- That map has no room types, and no Quore or Hotel Effectiveness import in
-- this repo lists them, so room_type stays null.
-- Inserts are skipped when the hotel and room number already exist.
-- Does not update or delete existing rows.

alter table public.rooms
  add column if not exists status text;

comment on column public.rooms.status is
  'Housekeeping flow: dirty, progress, cleaned, ready, reclean, or ooo. Null on older rows.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'rooms_status_check'
      and conrelid = 'public.rooms'::regclass
  ) then
    alter table public.rooms
      add constraint rooms_status_check
      check (status is null or status in ('dirty', 'progress', 'cleaned', 'ready', 'reclean', 'ooo'));
  end if;
end $$;

-- Staff at a hotel can see that hotel's rooms and assignments.
-- Corporate (above_property) can see every hotel.
-- Inserts and updates stay on the existing department and manager policies.
drop policy if exists rooms_hotel_read on public.rooms;
create policy rooms_hotel_read on public.rooms
  for select
  to authenticated
  using (
    (select private.is_above())
    or hotel_id = (select private.my_hotel())
  );

drop policy if exists hk_assignments_hotel_read on public.hk_assignments;
create policy hk_assignments_hotel_read on public.hk_assignments
  for select
  to authenticated
  using (
    (select private.is_above())
    or hotel_id = (select private.my_hotel())
  );

insert into public.rooms (
  hotel_id, department, room_number, floor, room_type, hk_status, fo_status, status
) values
  ('MSPWE', 'housekeeping', '101', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '102', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '103', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '104', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '105', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '106', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '124', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '126', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '127', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '128', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '129', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '130', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '131', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '132', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '133', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '134', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '135', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '136', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '137', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '138', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '139', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '140', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '141', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '142', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '145', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '146', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '147', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '148', 1, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '201', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '202', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '203', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '204', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '205', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '206', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '207', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '209', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '210', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '211', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '212', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '214', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '216', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '218', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '219', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '220', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '221', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '222', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '223', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '224', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '225', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '226', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '227', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '228', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '229', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '230', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '231', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '232', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '233', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '234', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '235', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '236', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '237', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '238', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '239', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '240', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '241', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '242', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '244', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '245', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '246', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '247', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '248', 2, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '301', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '302', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '303', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '304', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '305', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '306', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '307', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '309', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '310', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '311', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '312', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '313', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '314', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '315', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '316', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '317', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '318', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '319', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '320', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '321', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '322', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '323', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '324', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '325', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '326', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '327', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '328', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '329', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '330', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '331', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '332', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '333', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '334', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '335', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '336', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '337', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '338', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '339', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '340', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '341', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '342', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '344', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '345', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '346', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '347', 3, null, 'VC', 'VC', 'ready'),
  ('MSPWE', 'housekeeping', '348', 3, null, 'VC', 'VC', 'ready')
on conflict (hotel_id, room_number) do nothing;
