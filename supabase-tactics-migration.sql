-- Run this in the Supabase SQL editor to add the Tactics tab

create table tactics (
  id uuid default gen_random_uuid() primary key,
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  formation_our text,
  formation_opp text,
  positions jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table tactics enable row level security;

create policy "tactics_select" on tactics for select using (is_team_coach(team_id));
create policy "tactics_insert" on tactics for insert with check (is_team_coach(team_id));
create policy "tactics_update" on tactics for update using (is_team_coach(team_id));
create policy "tactics_delete" on tactics for delete using (is_team_coach(team_id));
