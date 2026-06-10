-- Player Access Migration
-- Run in Supabase SQL editor on an existing database.
-- For a fresh database, use supabase-schema.sql directly.

-- 0. Clean up any debug artifacts
drop table if exists _trigger_debug;

-- 1. Widen the role check constraint to allow 'player'
--    (drops any existing check on the role column regardless of its auto-generated name)
do $do$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table profiles drop constraint %I', r.conname);
  end loop;
end;
$do$;
alter table profiles add constraint profiles_role_check check (role in ('coach', 'player'));

-- 2. Add join_code to teams
alter table teams add column if not exists join_code text unique;

update teams
set join_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where join_code is null;

alter table teams alter column join_code set not null;

-- 3. Add player_id to profiles (links auth account to a players row)
alter table profiles
  add column if not exists player_id uuid references players(id) on delete set null;

-- 4. Add left_at to players (soft-delete — preserves history when coach removes player)
alter table players
  add column if not exists left_at timestamptz;

-- 5. Fix search_path on helper functions used by RLS policies
create or replace function is_team_coach(t_id uuid)
returns boolean language sql security definer
set search_path = public as $$
  select exists (select 1 from teams where id = t_id and coach_id = auth.uid())
$$;

create or replace function is_team_member(t_id uuid)
returns boolean language sql security definer
set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and team_id = t_id)
     or is_team_coach(t_id)
$$;

-- 6. Look up team by join code — callable by anon key for signup validation
create or replace function lookup_team_by_join_code(code text)
returns table(id uuid, name text)
language sql security definer
set search_path = public as $$
  select id, name from teams where join_code = upper(trim(code));
$$;

grant execute on function lookup_team_by_join_code(text) to anon, authenticated;

-- 7. Get claimable players for the current user's team
create or replace function get_claimable_players()
returns table(id uuid, name text, "position" text, was_member boolean)
language plpgsql security definer
set search_path = public as $$
declare
  v_team_id uuid;
begin
  select profiles.team_id into v_team_id from profiles where profiles.id = auth.uid();
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

-- 8. Claim a player record (or create a new one with "Add myself")
create or replace function claim_player_record(p_player_id uuid, p_name text)
returns void
language plpgsql security definer
set search_path = public as $$
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

    -- Clear left_at in case this is a re-join
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

-- 9. Update handle_new_user trigger to support player signups
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
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

-- 10. Allow coaches/team members to see all profiles in their team
--    (needed for coach to identify unlinked player records)
drop policy if exists "profiles_select_team" on profiles;
create policy "profiles_select_team" on profiles for select
  using (team_id is not null and is_team_member(team_id));

-- 11. Soft-delete: remove player from team and clear any linked profile
create or replace function remove_player_from_team(p_player_id uuid)
returns void
language plpgsql security definer
set search_path = public as $$
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

-- 12. Unlink a player's account without removing them from the team
create or replace function unlink_player_account(p_player_id uuid)
returns void
language plpgsql security definer
set search_path = public as $$
begin
  if not exists (
    select 1 from players p
    join profiles pr on pr.id = auth.uid()
    where p.id = p_player_id
      and p.team_id = pr.team_id
      and pr.role = 'coach'
  ) then
    raise exception 'Not authorized';
  end if;

  update profiles set player_id = null where player_id = p_player_id;
end;
$$;

grant execute on function unlink_player_account(uuid) to authenticated;

-- 13. Allow players to update their own linked player record
drop policy if exists "players_update" on players;
create policy "players_update" on players for update
  using (
    is_team_coach(team_id)
    or exists (
      select 1 from profiles
      where id = auth.uid() and player_id = players.id
    )
  );
