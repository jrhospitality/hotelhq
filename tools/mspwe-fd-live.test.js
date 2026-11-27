"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261127_mspwe_fd_shift_live.sql"), "utf8");

test("the live shift migration is additive and keeps other departments on the general bucket", () => {
  assert.match(sql, /create table if not exists public\.shift_selections/);
  assert.match(sql, /user_id uuid not null references public\.profiles/);
  assert.match(sql, /work_date date not null/);
  assert.match(sql, /created_at timestamptz not null/);
  assert.match(sql, /constraint shift_selections_hotel_check check \(hotel_id = 'MSPWE'\)/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /private\.is_mgr_of\(hotel_id\)/);
  assert.match(sql, /grant select on table public\.shift_selections to authenticated/);
  assert.match(sql, /source in \('schedule', 'punch', 'weekday_fallback', 'asked'\)/);
  assert.match(sql, /daily_assignments_mspwe_fd_one_uq/);
  assert.match(sql, /department = 'front_desk'/);
  assert.match(sql, /private\.mspwe_fd_bucket/);
  assert.match(sql, /time '05:00' and p_time < time '13:00'/);
  assert.match(sql, /time '13:00' and p_time < time '21:00'/);
  assert.match(sql, /when 'AM' then time '07:00'/);
  assert.match(sql, /when 'PM' then time '15:00'/);
  assert.match(sql, /else time '23:00'/);
  assert.match(sql, /when 'AM' then time '15:00'/);
  assert.match(sql, /when 'PM' then time '23:00'/);
  assert.match(sql, /else time '07:00'/);
  assert.match(sql, /public\.select_my_shift/);
  assert.match(sql, /on conflict \(user_id, hotel_id, work_date\) do nothing/);
  assert.match(sql, /private\.run_daily_assignments\(v_date, uid, v_hotel\)/);
  assert.match(sql, /'asked'::text/);
  assert.match(sql, /r\.source is distinct from 'asked'/);
  assert.match(sql, /private\.shift_bucket\(c\.start_time\)/);
  assert.match(sql, /when p_hotel = 'MSPWE' and private\.norm_dept\(p_dept\) = 'front_desk'/);
  assert.match(sql, /else private\.shift_bucket\(p_time\)/);
  assert.doesNotMatch(sql, /create or replace function private\.shift_bucket/);
  assert.doesNotMatch(sql, /delete from/i);
  assert.doesNotMatch(sql, /drop table/i);
  assert.doesNotMatch(sql, /update\s+public\./i);
  assert.doesNotMatch(sql, /call_send_push/);
  assert.match(sql, /set search_path = ''/);
  assert.equal(/eyJ[A-Za-z0-9_-]{20,}/.test(sql), false);
});

test("live checklists keep amount fields and only Golden Valley renders a typed amount", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /if\(item\.type\)row\.type=item\.type/);
  assert.match(html, /if\(item\.expected!=null\)row\.expected=item\.expected/);
  assert.match(html, /if\(item\.count\)row\.count=item\.count/);
  assert.match(html, /shift:t\.shift\|\|""/);
  assert.match(html, /item\.type==="amount"&&S\.hotel==="MSPWE"/);
  assert.match(html, /DrawerCount\.checklistRow/);
});
