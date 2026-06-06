-- =====================================================
-- Training Session Builder — Migration
-- Run this in the Supabase SQL editor
-- =====================================================

-- Exercise library (reusable training exercises per team)
create table exercises (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  category text not null default 'general'
    check (category in ('warm-up', 'technical', 'tactical', 'physical', 'set-piece', 'cool-down', 'general')),
  default_duration int not null default 15,
  description text,
  created_at timestamptz default now()
);

alter table exercises enable row level security;
create policy "exercises_select" on exercises for select using (is_team_coach(team_id));
create policy "exercises_insert" on exercises for insert with check (is_team_coach(team_id));
create policy "exercises_update" on exercises for update using (is_team_coach(team_id));
create policy "exercises_delete" on exercises for delete using (is_team_coach(team_id));

-- Session blocks (structured plan — ordered list of exercises per session)
create table session_blocks (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references training_sessions(id) on delete cascade not null,
  exercise_id uuid references exercises(id) on delete set null,
  free_text text,
  duration int not null default 15,
  position int not null default 0
);

alter table session_blocks enable row level security;
create policy "blocks_select" on session_blocks for select
  using (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));
create policy "blocks_insert" on session_blocks for insert
  with check (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));
create policy "blocks_update" on session_blocks for update
  using (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));
create policy "blocks_delete" on session_blocks for delete
  using (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));
