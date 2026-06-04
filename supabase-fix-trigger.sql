-- Drop and recreate the trigger function with RLS bypass and qualified table names
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  new_team_id uuid;
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'coach'
  );

  insert into public.teams (name, coach_id)
  values (
    coalesce(new.raw_user_meta_data->>'team_name', 'My Team'),
    new.id
  )
  returning id into new_team_id;

  update public.profiles set team_id = new_team_id where id = new.id;

  return new;
end;
$$;

-- Re-grant execution to the auth schema if needed
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Drop and recreate trigger to make sure it's attached correctly
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
