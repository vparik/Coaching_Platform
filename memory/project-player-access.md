---
name: project-player-access
description: Player access feature — current state, what works, what's pending
metadata:
  type: project
---

Player access feature is largely built and functional. The canonical SQL reference is `player-access-migration.sql` — run this file in Supabase SQL editor to get all functions in sync.

**Why:** Coach wanted players to have their own app access — view training, match prep, tactics (read-only), team hub (read), match log (own rating only), and manage their own profile.

**How to apply:** Before touching any player-related code, check this memory and re-read `player-access-migration.sql` for the current SQL state.

## What's working
- Player signup flow: join code → `handle_new_user` trigger sets `team_id` in profile
- Middleware fix: `/auth/claim` is excluded from the "redirect authenticated users away from /auth" rule
- Claim page: two-step confirmation (select → confirm), "Add myself" fallback
- App layout guard: unclaimed players (`player_id = null`) always redirected to `/auth/claim`
- Per-tab player views: Training (read-only), Team Hub (view + marks messages seen), Match Log (own rating only), Match Prep (read-only brief + lineup), Tactics (view/study, no save/delete), Squad (own profile + availability self-reporting)
- Coach Squad: join code banner with copy, linked/unlinked badges, "Unlink account" action, soft-delete "Remove"
- Dashboard: player-specific CTAs (no "Add match", no "Manage squad", etc.)

## SQL functions in Supabase (all must have set search_path = public)
- `is_team_coach` — checks coach ownership
- `is_team_member` — checks team membership
- `lookup_team_by_join_code` — anon-accessible for signup validation
- `get_claimable_players` — uses `profiles.id` (not bare `id`) to avoid ambiguity with RETURNS TABLE
- `claim_player_record` — links player to profile or creates new player row
- `handle_new_user` — trigger: player branch uses join_code lookup; NO debug insert
- `remove_player_from_team` — soft-delete (left_at) + clears profile link
- `unlink_player_account` — clears profile link only, player stays on squad

## Known gotchas
- `get_claimable_players` must use `profiles.id` not bare `id` — RETURNS TABLE declares `id` as output var causing ambiguity
- All security definer functions need `set search_path = public` — without it, trigger context can't find `public.teams` / `public.profiles`
- The `teams(name)` embedded join in profile queries fails silently for new players under RLS — always fetch team name as a separate query
- Middleware at `src/lib/supabase/middleware.ts` must exclude `/auth/claim` from the "logged-in users → redirect to /" rule

## Pending
- Training attendance (discussed, deferred — build after core player flow is stable with real users)
- Dashboard not yet role-aware for training calendar link text (minor)
