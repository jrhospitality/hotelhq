-- Category and extra answers for a dispute. Additive only.
-- Existing rows keep an empty category and an empty details object.
-- Evidence kinds grow by widening the check. Old kinds still fit.
-- Row level security on chargebacks and chargeback_evidence is unchanged.

alter table public.chargebacks add column if not exists category text not null default '';
alter table public.chargebacks add column if not exists details jsonb not null default '{}'::jsonb;

alter table public.chargebacks drop constraint if exists chargebacks_category_check;
alter table public.chargebacks add constraint chargebacks_category_check
  check (category = '' or category ~ '^[a-z][a-z0-9_]{0,40}$');

alter table public.chargeback_evidence drop constraint if exists chargeback_evidence_kind_check;
alter table public.chargeback_evidence add constraint chargeback_evidence_kind_check
  check (kind ~ '^[a-z][a-z0-9_]{0,40}$');

comment on column public.chargebacks.details is
  'Category answers such as auth code, AVS result, and cancellation time. Not a card number.';
