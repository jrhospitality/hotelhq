-- Example Medallia period rows. Insert only. Not a migration.
-- These values are made up. Do not load them into the live project.
-- On conflict, the existing row is left as it is.
-- verified_stay stays null: do not attribute a cleaner or inspector here.
-- topbox_8_10 and topbox_9_10 are separate rows for the same question.
-- region and brand are null because this sample has no My Region or Brand column.
-- prior_year stands in for same period year ago.

insert into public.guest_score_period_facts (
  hotel, source, metric, period_kind, period_start, period_end, as_of,
  value, n, calc_method, goal, prior_year, region, brand
)
values
  ('MSPWE', 'example', 'overall_experience', 'mtd', '2026-11-01', '2026-11-10', '2026-11-10', 81.0, 24, 'topbox_8_10', 83, 76.0, null, null),
  ('MSPWE', 'example', 'overall_experience', 't3', '2026-08-11', '2026-11-10', '2026-11-10', 79.5, 70, 'topbox_8_10', 83, 75.0, null, null),
  ('MSPWE', 'example', 'overall_experience', 't12', '2025-11-11', '2026-11-10', '2026-11-10', 82.0, 240, 'topbox_8_10', 83, 78.0, null, null),
  ('MSPWE', 'example', 'overall_experience', 'mtd', '2026-11-01', '2026-11-10', '2026-11-10', 64.0, 24, 'topbox_9_10', 83, 60.0, null, null),
  ('MSPWE', 'example', 'member_recognition', 'mtd', '2026-11-01', '2026-11-10', '2026-11-10', 70.0, 18, 'topbox_8_10', null, 68.0, null, null),
  ('MSPWE', 'example', 'bathroom_cleanliness', 'mtd', '2026-11-01', '2026-11-10', '2026-11-10', 89.0, 22, 'topbox_8_10', 88, 84.0, null, null)
on conflict (hotel, source, metric, period_kind, period_start, calc_method) do nothing;
