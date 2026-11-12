-- Medallia department scores. Additive only.
-- Does not change guest_surveys, guest_survey_metrics, guest_survey_scores,
-- or guest_score_access. It does not rewrite the hotel feature check.
-- No guest names. No drops, deletes, or updates of existing rows.
--
-- guest_score_period_facts is one score for one hotel, metric, period, and
-- calc method. topbox_8_10 is Medallia's percent of 8-10 answers.
-- topbox_9_10 is HotelHQ's percent of 9-10 answers. Do not combine them.
-- prior_year is same period year ago. region and brand stay null until a
-- My Region or Brand comparator is in the extract.
-- The 80 floor is guest_score_internal_goals.floor_pct. It is not the
-- internal goal and it is not an IHG official target. A null goal is unset
-- (Member Recognition).
-- verified_stay is a hook only. Cleaner or inspector attribution has to use
-- a verified room, stay, and check-in time. Leave the column null.
-- Demo mode does not call this database. An example loader lives in
-- supabase/examples/load_guest_score_period_facts.example.sql.

create schema if not exists private;

grant usage on schema private to authenticated;

create table if not exists public.guest_score_metric_map (
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  source_label text not null check (char_length(btrim(source_label)) between 1 and 80),
  metric text not null check (metric ~ '^[a-z][a-z0-9_]{0,40}$'),
  department text not null check (department in (
    'front_desk', 'breakfast', 'maintenance', 'housekeeping', 'laundry', 'houseman', 'hotel'
  )),
  calc_method text not null check (calc_method in ('topbox_8_10', 'topbox_9_10')),
  primary key (source, source_label, calc_method)
);

comment on table public.guest_score_metric_map is
  'Medallia question label to one HotelHQ metric. topbox_8_10 and topbox_9_10 stay on separate rows. Room cleanliness and towels have no Medallia label and are not in this map. Overall Guest Room maps to guest_room_condition, not to room_cleanliness.';

insert into public.guest_score_metric_map (source, source_label, metric, department, calc_method)
select 'medallia', v.source_label, v.metric, v.department, m.calc_method
from (values
  ('Overall Experience', 'overall_experience', 'front_desk'),
  ('Likely to Recommend', 'itr', 'hotel'),
  ('Hotel Condition', 'hotel_condition', 'maintenance'),
  ('Overall Check-In', 'check_in', 'front_desk'),
  ('Overall Service', 'overall_service', 'front_desk'),
  ('Overall Guest Room', 'guest_room_condition', 'maintenance'),
  ('Overall Guest Bathroom', 'bathroom_cleanliness', 'housekeeping'),
  ('Overall F&B', 'fb_overall', 'breakfast'),
  ('Overall Breakfast', 'breakfast', 'breakfast'),
  ('Problem Handling', 'problem_handling', 'hotel'),
  ('Loyalty Recognition', 'member_recognition', 'front_desk'),
  ('Overall Wi-Fi', 'wifi', 'hotel')
) as v(source_label, metric, department)
cross join (values ('topbox_8_10'), ('topbox_9_10')) as m(calc_method)
on conflict (source, source_label, calc_method) do nothing;

create table if not exists public.guest_score_internal_goals (
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  department text not null check (department in (
    'front_desk', 'breakfast', 'maintenance', 'housekeeping', 'laundry', 'houseman', 'hotel'
  )),
  metric text not null check (metric ~ '^[a-z][a-z0-9_]{0,40}$'),
  goal numeric(5, 2) check (goal is null or (goal >= 0 and goal <= 100)),
  floor_pct numeric(5, 2) not null default 80 check (floor_pct >= 0 and floor_pct <= 100),
  primary key (hotel, department, metric)
);

comment on table public.guest_score_internal_goals is
  'Internal department goal. Null means unset. floor_pct is the minimum floor, separate from the goal and from any IHG official target.';
comment on column public.guest_score_internal_goals.floor_pct is
  'Minimum floor. 80 is not the internal goal and not an IHG official target.';

insert into public.guest_score_internal_goals (hotel, department, metric, goal, floor_pct)
select h.hotel, g.department, g.metric, g.goal, 80
from (values ('MSPWE'), ('MSPAM'), ('MSPMS')) as h(hotel)
cross join (values
  ('front_desk', 'overall_experience', 83::numeric),
  ('front_desk', 'overall_service', 88::numeric),
  ('front_desk', 'check_in', null::numeric),
  ('front_desk', 'member_recognition', null::numeric),
  ('breakfast', 'breakfast', 80::numeric),
  ('breakfast', 'fb_overall', null::numeric),
  ('maintenance', 'hotel_condition', 82::numeric),
  ('maintenance', 'guest_room_condition', 83::numeric),
  ('housekeeping', 'room_cleanliness', 87::numeric),
  ('housekeeping', 'bathroom_cleanliness', 88::numeric),
  ('laundry', 'towels', 87::numeric),
  ('laundry', 'room_cleanliness', 87::numeric),
  ('laundry', 'bathroom_cleanliness', 88::numeric),
  ('hotel', 'itr', null::numeric),
  ('hotel', 'problem_handling', null::numeric),
  ('hotel', 'wifi', null::numeric)
) as g(department, metric, goal)
on conflict (hotel, department, metric) do nothing;

create table if not exists public.guest_score_period_facts (
  id bigint generated always as identity primary key,
  hotel text not null check (hotel in ('MSPWE', 'MSPAM', 'MSPMS')),
  source text not null check (source ~ '^[a-z][a-z0-9_]{0,20}$'),
  metric text not null check (metric ~ '^[a-z][a-z0-9_]{0,40}$'),
  period_kind text not null check (period_kind in ('mtd', 't3', 't12')),
  period_start date not null,
  period_end date not null,
  as_of date not null,
  value numeric(5, 2) check (value is null or (value >= 0 and value <= 100)),
  n integer check (n is null or (n >= 0 and n <= 1000000)),
  calc_method text not null check (calc_method in ('topbox_8_10', 'topbox_9_10')),
  goal numeric(5, 2) check (goal is null or (goal >= 0 and goal <= 100)),
  prior_year numeric(5, 2) check (prior_year is null or (prior_year >= 0 and prior_year <= 100)),
  region numeric(5, 2) check (region is null or (region >= 0 and region <= 100)),
  brand numeric(5, 2) check (brand is null or (brand >= 0 and brand <= 100)),
  verified_stay text check (verified_stay is null or char_length(verified_stay) <= 120),
  check (period_start <= period_end),
  check (period_end <= as_of),
  unique (hotel, source, metric, period_kind, period_start, calc_method)
);

comment on table public.guest_score_period_facts is
  'One period score. Keep topbox_8_10 and topbox_9_10 on separate rows. region and brand are null until the extract includes My Region and Brand.';
comment on column public.guest_score_period_facts.calc_method is
  'topbox_8_10 is Medallia percent 8-10. topbox_9_10 is HotelHQ percent 9-10. Do not average them.';
comment on column public.guest_score_period_facts.prior_year is
  'Same period year ago, when the extract has it.';
comment on column public.guest_score_period_facts.region is
  'My Region comparator. Null until the extract includes it.';
comment on column public.guest_score_period_facts.brand is
  'Brand comparator. Null until the extract includes it.';
comment on column public.guest_score_period_facts.verified_stay is
  'Attribution hook. Leave null. A future cleaner or inspector name requires a verified room, stay, and check-in time. This column does not store a person.';
comment on column public.guest_score_period_facts.n is
  'Sample count for this metric and period.';

create index if not exists guest_score_period_facts_hotel_idx
  on public.guest_score_period_facts (hotel, metric, as_of desc);

create table if not exists public.guest_score_period_access (
  role text not null check (role ~ '^[a-z_]+$'),
  metric text not null check (metric ~ '^[a-z][a-z0-9_]{0,40}$'),
  primary key (role, metric)
);

comment on table public.guest_score_period_access is
  'Department role to period metric. GM, AGM, and corporate are omitted and can read every metric. Houseman has no Medallia metric.';

insert into public.guest_score_period_access (role, metric)
values
  ('front_desk', 'overall_experience'),
  ('front_desk', 'overall_service'),
  ('front_desk', 'check_in'),
  ('front_desk', 'member_recognition'),
  ('breakfast', 'breakfast'),
  ('breakfast', 'fb_overall'),
  ('maintenance', 'hotel_condition'),
  ('maintenance', 'guest_room_condition'),
  ('hk_lead', 'room_cleanliness'),
  ('hk_lead', 'bathroom_cleanliness'),
  ('housekeeper', 'room_cleanliness'),
  ('housekeeper', 'bathroom_cleanliness'),
  ('laundry', 'towels'),
  ('laundry', 'room_cleanliness'),
  ('laundry', 'bathroom_cleanliness')
on conflict (role, metric) do nothing;

alter table public.guest_score_metric_map enable row level security;
alter table public.guest_score_internal_goals enable row level security;
alter table public.guest_score_period_facts enable row level security;
alter table public.guest_score_period_access enable row level security;

create or replace function private.guest_score_period_allowed(p_metric text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    private.is_above()
    or private.my_role() in ('gm', 'agm')
    or exists (
      select 1
      from public.guest_score_period_access a
      where a.role = private.my_role()::text
        and a.metric = p_metric
    ),
    false
  );
$$;

revoke all on function private.guest_score_period_allowed(text) from public, anon;
grant execute on function private.guest_score_period_allowed(text) to authenticated;

-- Labels only. No scores.
create policy guest_score_metric_map_select on public.guest_score_metric_map
  for select to authenticated
  using ((select auth.uid()) is not null);

create policy guest_score_period_access_select on public.guest_score_period_access
  for select to authenticated
  using ((select auth.uid()) is not null);

-- GM and AGM read their own hotel. Corporate reads every hotel.
-- A department role reads only the metrics in guest_score_period_access.
create policy guest_score_internal_goals_select on public.guest_score_internal_goals
  for select to authenticated
  using (
    (select private.is_above())
    or (
      hotel = any ((select private.my_hotels())::text[])
      and (
        (select private.my_role()) in ('gm', 'agm')
        or (select private.guest_score_period_allowed(metric))
      )
    )
  );

create policy guest_score_period_facts_select on public.guest_score_period_facts
  for select to authenticated
  using (
    (select private.is_above())
    or (
      hotel = any ((select private.my_hotels())::text[])
      and (
        (select private.my_role()) in ('gm', 'agm')
        or (select private.guest_score_period_allowed(metric))
      )
    )
  );

revoke all on table public.guest_score_metric_map from public, anon, authenticated;
revoke all on table public.guest_score_internal_goals from public, anon, authenticated;
revoke all on table public.guest_score_period_facts from public, anon, authenticated;
revoke all on table public.guest_score_period_access from public, anon, authenticated;

grant select on table public.guest_score_metric_map to authenticated;
grant select on table public.guest_score_internal_goals to authenticated;
grant select on table public.guest_score_period_facts to authenticated;
grant select on table public.guest_score_period_access to authenticated;

revoke all on sequence public.guest_score_period_facts_id_seq from public, anon, authenticated;
