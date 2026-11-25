-- In-app, push, and scheduled reminders. Additive only. Not applied by the app.
-- Demo mode does not call this table.
-- private.my_hotels() returns text[]. Compare with
--   hotel = any ((select private.my_hotels())::text[])

create table if not exists public.reminders (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  user_id uuid default auth.uid(),
  role text,
  channel text not null check (channel in ('in_app', 'push', 'scheduled')),
  kind text not null default '',
  title_en text not null,
  title_es text not null default '',
  body_en text not null default '',
  body_es text not null default '',
  due_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  ref text,
  created_at timestamptz not null default pg_catalog.now()
);

comment on table public.reminders is
  'One row per reminder. channel is in_app, push, or scheduled. Titles and bodies are stored in English and Spanish.';

create index if not exists reminders_due_idx
  on public.reminders (hotel, due_at)
  where read_at is null;

alter table public.reminders enable row level security;

drop policy if exists reminders_all on public.reminders;
create policy reminders_all on public.reminders
  for all to authenticated
  using (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  )
  with check (
    hotel = any ((select private.my_hotels())::text[])
    or (select private.is_above())
  );

revoke all on table public.reminders from public, anon;
grant select, insert, update on table public.reminders to authenticated;
grant usage, select on sequence public.reminders_id_seq to authenticated;
