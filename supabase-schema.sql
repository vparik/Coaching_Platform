-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null default 'coach' check (role in ('coach', 'player')),
  team_id uuid,
  created_at timestamptz default now()
);

-- Teams
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  coach_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Add FK from profiles to teams
alter table profiles add constraint profiles_team_id_fkey
  foreign key (team_id) references teams(id) on delete set null;

-- Players
create table players (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  position text not null default '',
  age int,
  preferred_foot text check (preferred_foot in ('left', 'right', 'both')),
  nationality text,
  private_notes text,
  availability_status text not null default 'available'
    check (availability_status in ('available', 'injured', 'absent', 'unknown')),
  created_at timestamptz default now()
);

-- Training Sessions
create table training_sessions (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  date date not null,
  time time,
  objective text not null,
  intensity text not null default 'medium' check (intensity in ('low', 'medium', 'high')),
  phase text not null default 'prep' check (phase in ('recovery', 'prep', 'development')),
  notes text,
  created_at timestamptz default now()
);

-- Matches
create table matches (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  opponent text not null,
  date date not null,
  venue text not null default 'home' check (venue in ('home', 'away', 'neutral')),
  result text,
  notes text,
  prep_done boolean not null default false,
  created_at timestamptz default now()
);

-- Match Preparations
create table match_preps (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade not null unique,
  opponent_formation text,
  opponent_style text,
  opponent_strengths text,
  opponent_weaknesses text,
  key_players text,
  set_piece_tendencies text,
  match_brief text,
  created_at timestamptz default now()
);

-- Player Ratings per match
create table player_ratings (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  rating int not null check (rating between 1 and 10),
  notes text,
  unique(match_id, player_id)
);

-- Team Messages
create table team_messages (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  coach_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  media_url text,
  created_at timestamptz default now()
);

-- Message Views (seen by players)
create table message_views (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references team_messages(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  viewed_at timestamptz default now(),
  unique(message_id, player_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table training_sessions enable row level security;
alter table matches enable row level security;
alter table match_preps enable row level security;
alter table player_ratings enable row level security;
alter table team_messages enable row level security;
alter table message_views enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);

-- Teams: coach can CRUD their own team; members can read
create policy "teams_select" on teams for select
  using (coach_id = auth.uid() or id in (select team_id from profiles where id = auth.uid()));
create policy "teams_insert" on teams for insert with check (coach_id = auth.uid());
create policy "teams_update" on teams for update using (coach_id = auth.uid());
create policy "teams_delete" on teams for delete using (coach_id = auth.uid());

-- Helper: is the current user coach of a team?
create or replace function is_team_coach(t_id uuid) returns boolean
  language sql security definer as $$
    select exists (select 1 from teams where id = t_id and coach_id = auth.uid())
  $$;

-- Helper: is the current user a member of a team?
create or replace function is_team_member(t_id uuid) returns boolean
  language sql security definer as $$
    select exists (select 1 from profiles where id = auth.uid() and team_id = t_id)
       or is_team_coach(t_id)
  $$;

-- Players
create policy "players_select" on players for select using (is_team_member(team_id));
create policy "players_insert" on players for insert with check (is_team_coach(team_id));
create policy "players_update" on players for update using (is_team_coach(team_id));
create policy "players_delete" on players for delete using (is_team_coach(team_id));

-- Training Sessions
create policy "training_select" on training_sessions for select using (is_team_member(team_id));
create policy "training_insert" on training_sessions for insert with check (is_team_coach(team_id));
create policy "training_update" on training_sessions for update using (is_team_coach(team_id));
create policy "training_delete" on training_sessions for delete using (is_team_coach(team_id));

-- Matches
create policy "matches_select" on matches for select using (is_team_member(team_id));
create policy "matches_insert" on matches for insert with check (is_team_coach(team_id));
create policy "matches_update" on matches for update using (is_team_coach(team_id));
create policy "matches_delete" on matches for delete using (is_team_coach(team_id));

-- Match Preps
create policy "match_preps_select" on match_preps for select
  using (exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id)));
create policy "match_preps_insert" on match_preps for insert
  with check (exists (select 1 from matches m where m.id = match_id and is_team_coach(m.team_id)));
create policy "match_preps_update" on match_preps for update
  using (exists (select 1 from matches m where m.id = match_id and is_team_coach(m.team_id)));

-- Player Ratings
create policy "ratings_select" on player_ratings for select
  using (exists (select 1 from matches m where m.id = match_id and is_team_member(m.team_id)));
create policy "ratings_insert" on player_ratings for insert
  with check (exists (select 1 from matches m where m.id = match_id and is_team_coach(m.team_id)));
create policy "ratings_update" on player_ratings for update
  using (exists (select 1 from matches m where m.id = match_id and is_team_coach(m.team_id)));
create policy "ratings_delete" on player_ratings for delete
  using (exists (select 1 from matches m where m.id = match_id and is_team_coach(m.team_id)));

-- Team Messages
create policy "messages_select" on team_messages for select using (is_team_member(team_id));
create policy "messages_insert" on team_messages for insert with check (is_team_coach(team_id));
create policy "messages_delete" on team_messages for delete using (coach_id = auth.uid());

-- Message Views
create policy "views_select" on message_views for select
  using (exists (select 1 from team_messages tm where tm.id = message_id and is_team_member(tm.team_id)));
create policy "views_insert" on message_views for insert with check (true);

-- ============================================================
-- Trigger: auto-create profile + team on user signup
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_team_id uuid;
begin
  -- Create profile first (no team yet)
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'coach'
  );

  -- Create team
  insert into teams (name, coach_id)
  values (
    coalesce(new.raw_user_meta_data->>'team_name', 'My Team'),
    new.id
  )
  returning id into new_team_id;

  -- Link profile to team
  update profiles set team_id = new_team_id where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Tactics
-- ============================================================

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
