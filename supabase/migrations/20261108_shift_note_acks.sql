-- Per-person acknowledgement of shift notes. Additive.
-- A person can read and write only their own rows. Null is not used:
-- a missing row means the note is still unread for that person.

create table if not exists public.shift_note_acks (
  user_id uuid not null,
  hotel_id text not null,
  note_key text not null,
  read_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, note_key)
);

comment on table public.shift_note_acks is
  'Which shift-note keys this person has marked read. Own hotel only.';

alter table public.shift_note_acks enable row level security;

drop policy if exists shift_note_acks_select on public.shift_note_acks;
create policy shift_note_acks_select on public.shift_note_acks
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists shift_note_acks_insert on public.shift_note_acks;
create policy shift_note_acks_insert on public.shift_note_acks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and hotel_id = any ((select private.my_hotels())::text[])
  );

create or replace function public.ack_my_shift_notes(p_keys text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hotel text;
  v_key text;
begin
  if (select auth.uid()) is null then
    raise exception 'not allowed';
  end if;
  select h into v_hotel
  from unnest((select private.my_hotels())::text[]) h
  limit 1;
  if v_hotel is null then
    raise exception 'not allowed';
  end if;
  if p_keys is null then
    return;
  end if;
  foreach v_key in array p_keys loop
    if v_key is null or v_key !~ '^[A-Za-z0-9_-]{1,80}$' then
      continue;
    end if;
    insert into public.shift_note_acks (user_id, hotel_id, note_key)
    values ((select auth.uid()), v_hotel, v_key)
    on conflict (user_id, note_key) do nothing;
  end loop;
end;
$$;

revoke all on function public.ack_my_shift_notes(text[]) from public, anon;
grant execute on function public.ack_my_shift_notes(text[]) to authenticated;

revoke all on table public.shift_note_acks from public, anon;
grant select, insert on table public.shift_note_acks to authenticated;
