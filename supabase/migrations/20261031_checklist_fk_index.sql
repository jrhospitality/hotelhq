-- Cover the checklist item foreign key, and stop log-template writes from
-- also acting as a second select policy. No rows are removed.

create index if not exists checklist_item_state_template_idx
  on public.checklist_item_state (template_id);

drop policy if exists lt_write on public.log_templates;
drop policy if exists lt_ins on public.log_templates;
drop policy if exists lt_upd on public.log_templates;

create policy lt_ins on public.log_templates
  for insert to authenticated
  with check ((select private.is_mgr_of(hotel)));

create policy lt_upd on public.log_templates
  for update to authenticated
  using ((select private.is_mgr_of(hotel)))
  with check ((select private.is_mgr_of(hotel)));
