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
  join_code text unique not null,
  created_at timestamptz default now()
);

-- Add FK from profiles to teams
alter table profiles add constraint profiles_team_id_fkey
  foreign key (team_id) references teams(id) on delete set null;

-- player_id links a profile to its roster record (added after players table exists)
-- alter table profiles add column player_id uuid references players(id) on delete set null;
-- ^ run this after players table is created, or use player-access-migration.sql

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
  left_at timestamptz,
  created_at timestamptz default now()
);

-- Training Sessions
create table exercises (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) on delete cascade not null,
  name text not null,
  category text not null default 'general',
  default_duration integer not null default 15,
  description text,
  board jsonb,
  created_at timestamptz default now()
);

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

create table session_blocks (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references training_sessions(id) on delete cascade not null,
  exercise_id uuid references exercises(id) on delete set null,
  free_text text,
  duration integer not null default 15,
  position integer not null default 0
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
  lineup_formation text,
  lineup_starters jsonb,
  lineup_subs jsonb,
  lineup_published boolean default false,
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
alter table exercises enable row level security;
alter table training_sessions enable row level security;
alter table session_blocks enable row level security;
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

-- Exercises
create policy "exercises_select" on exercises for select using (is_team_member(team_id));
create policy "exercises_insert" on exercises for insert with check (is_team_coach(team_id));
create policy "exercises_update" on exercises for update using (is_team_coach(team_id));
create policy "exercises_delete" on exercises for delete using (is_team_coach(team_id));

-- Training Sessions
create policy "training_select" on training_sessions for select using (is_team_member(team_id));
create policy "training_insert" on training_sessions for insert with check (is_team_coach(team_id));
create policy "training_update" on training_sessions for update using (is_team_coach(team_id));
create policy "training_delete" on training_sessions for delete using (is_team_coach(team_id));

-- Session Blocks (scoped through training_sessions)
create policy "blocks_select" on session_blocks for select
  using (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_member(ts.team_id)));
create policy "blocks_insert" on session_blocks for insert
  with check (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));
create policy "blocks_update" on session_blocks for update
  using (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));
create policy "blocks_delete" on session_blocks for delete
  using (exists (select 1 from training_sessions ts where ts.id = session_id and is_team_coach(ts.team_id)));

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
  user_role text;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'coach');

  if user_role = 'player' then
    select id into new_team_id
    from teams
    where join_code = upper(trim(new.raw_user_meta_data->>'join_code'));

    insert into profiles (id, name, email, role, team_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      'player',
      new_team_id
    );
  else
    insert into profiles (id, name, email, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      'coach'
    );

    insert into teams (name, coach_id, join_code)
    values (
      coalesce(new.raw_user_meta_data->>'team_name', 'My Team'),
      new.id,
      upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    )
    returning id into new_team_id;

    update profiles set team_id = new_team_id where id = new.id;
  end if;

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

-- ============================================================
-- Player Access — RPCs and updated policies
-- ============================================================

-- Allow players to update their own linked player record
drop policy if exists "players_update" on players;
create policy "players_update" on players for update
  using (
    is_team_coach(team_id)
    or exists (
      select 1 from profiles
      where id = auth.uid() and player_id = players.id
    )
  );

-- Look up team by join code — callable by anon key for signup validation
create or replace function lookup_team_by_join_code(code text)
returns table(id uuid, name text)
language sql security definer as $$
  select id, name from teams where join_code = upper(trim(code));
$$;

grant execute on function lookup_team_by_join_code(text) to anon, authenticated;

-- Get claimable players for the current user's team
create or replace function get_claimable_players()
returns table(id uuid, name text, "position" text, was_member boolean)
language plpgsql security definer as $$
declare
  v_team_id uuid;
begin
  select team_id into v_team_id from profiles where id = auth.uid();
  if v_team_id is null then return; end if;

  return query
    select
      p.id,
      p.name,
      p.position,
      (p.left_at is not null) as was_member
    from players p
    where p.team_id = v_team_id
      and p.id not in (
        select pr.player_id from profiles pr where pr.player_id is not null
      )
    order by p.left_at nulls first, p.name;
end;
$$;

grant execute on function get_claimable_players() to authenticated;

-- Claim a player record (or create a new one via "Add myself")
create or replace function claim_player_record(p_player_id uuid, p_name text)
returns void
language plpgsql security definer as $$
declare
  v_team_id uuid;
  v_new_player_id uuid;
begin
  select team_id into v_team_id from profiles where id = auth.uid();
  if v_team_id is null then
    raise exception 'No team associated with this account';
  end if;

  if p_player_id is not null then
    if not exists (
      select 1 from players
      where id = p_player_id
        and team_id = v_team_id
        and id not in (select pr.player_id from profiles pr where pr.player_id is not null)
    ) then
      raise exception 'Player record not available for claiming';
    end if;

    update players set left_at = null where id = p_player_id;
    update profiles set player_id = p_player_id where id = auth.uid();
  else
    if p_name is null or trim(p_name) = '' then
      raise exception 'Name is required';
    end if;

    insert into players (team_id, name)
    values (v_team_id, trim(p_name))
    returning id into v_new_player_id;

    update profiles set player_id = v_new_player_id where id = auth.uid();
  end if;
end;
$$;

grant execute on function claim_player_record(uuid, text) to authenticated;

-- Allow coaches/team members to see all profiles in their team
drop policy if exists "profiles_select_team" on profiles;
create policy "profiles_select_team" on profiles for select
  using (team_id is not null and is_team_member(team_id));

-- Soft-delete: remove player from team and clear any linked profile
create or replace function remove_player_from_team(p_player_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_team_id uuid;
begin
  select p.team_id into v_team_id
  from players p
  join profiles pr on pr.id = auth.uid()
  where p.id = p_player_id
    and p.team_id = pr.team_id
    and pr.role = 'coach';

  if v_team_id is null then
    raise exception 'Not authorized';
  end if;

  update players set left_at = now() where id = p_player_id;
  update profiles set player_id = null where player_id = p_player_id;
end;
$$;

grant execute on function remove_player_from_team(uuid) to authenticated;
