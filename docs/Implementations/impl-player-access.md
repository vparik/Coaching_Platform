# Implementation: Player Access

**Route:** `/auth/signup` (player flow), `/auth/claim`, all `(app)/` tabs  
**Built:** Session June 2026  
**Files created:**
- `src/app/auth/claim/page.tsx`
- `player-access-migration.sql`

**Files modified:**
- `src/app/auth/signup/page.tsx`
- `src/app/(app)/layout.tsx`
- `src/lib/supabase/middleware.ts`
- `src/components/squad/SquadClient.tsx`
- `src/components/training/TrainingClient.tsx`
- `src/components/team-hub/TeamHubClient.tsx`
- `src/components/matches/MatchLogClient.tsx`
- `src/components/match-prep/MatchPrepClient.tsx`
- `src/components/match-prep/LineupPanel.tsx`
- `src/components/tactics/TacticsClient.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/app/(app)/page.tsx` (dashboard)
- All `(app)/*/page.tsx` server pages — pass `role` to client components

---

## Overview

Players can register, join a team via join code, claim their squad record, and access a read-only version of all tabs. The main technical challenge was getting a reliable signup → claim → dashboard flow working across Supabase auth triggers, RLS policies, Next.js middleware, and server/client component boundaries.

---

## Non-obvious decisions

### Role-based views via prop, not separate routes
**What:** All tabs accept a `role` prop from the server page and conditionally hide mutation controls.  
**Why:** Avoids duplicating pages and keeps the role check at the server boundary. No separate `/player/training` routes.  
**Risk if changed:** If role is not passed from the server page, the client component defaults to `'coach'` — players would see mutation controls that fail silently at the RLS level.

### Claim page is outside `(app)/` layout
**What:** `/auth/claim` lives at `src/app/auth/claim/page.tsx`, not inside `src/app/(app)/`.  
**Why:** The app layout redirects unclaimed players to `/auth/claim`, so the claim page cannot itself be inside the layout (infinite redirect loop).  
**Risk if changed:** Moving it inside `(app)/` would cause a redirect loop for unclaimed players.

### Middleware must exclude `/auth/claim`
**What:** `src/lib/supabase/middleware.ts` redirects authenticated users away from `/auth/*` routes — `/auth/claim` is explicitly excluded.  
**Why:** Players are authenticated immediately after signup. Without this exception, every navigation to `/auth/claim` gets redirected to `/` by the middleware before the page loads.  
**Risk if changed:** Removing the exclusion silently skips the claim step for every player.

### App layout guard has no `team_id` check
**What:** `if (profile?.role === 'player' && !profile?.player_id) { redirect('/auth/claim') }` — no `team_id` condition.  
**Why:** A player with `team_id = null` (bad join code at signup) would bypass the guard if `team_id` were required. We surface the error on the claim page instead.  
**Risk if changed:** Adding `&& profile?.team_id` back to the condition would silently let unclaimed players into the app.

### `get_claimable_players` uses `profiles.id` not bare `id`
**What:** `select profiles.team_id from profiles where profiles.id = auth.uid()`  
**Why:** `RETURNS TABLE(id uuid, ...)` creates an implicit output variable named `id`. Without table qualification, PostgreSQL sees `id` as ambiguous between the output var and the column.  
**Risk if changed:** Removing the table prefix causes "column reference id is ambiguous" at runtime.

### Team name fetched separately from profile
**What:** The claim page uses two queries — one for the profile, one for the team name.  
**Why:** Embedding `teams(name)` in the profile select (`profiles.select('...teams(name)')`) fails silently under RLS for newly created players — PostgREST returns null for the entire result when the joined row isn't accessible. Separate queries avoid this.  
**Risk if changed:** Switching back to an embedded join will silently return null for `profile`, making the claim page show the "join code not linked" error even when team_id is correctly set.

### All security definer functions need `set search_path = public`
**What:** Every function in `player-access-migration.sql` has `set search_path = public`.  
**Why:** Supabase's auth trigger fires in a context where the `public` schema is NOT in the default search path. Without explicit `set search_path`, `select ... from teams` inside a security definer function returns "relation does not exist".  
**Risk if changed:** Removing `set search_path = public` from any function used in a trigger or RPC will cause silent failures or "relation does not exist" errors at runtime.

### Signup page: no `router.refresh()` for player navigation
**What:** `router.push('/auth/claim')` is called without `router.refresh()` for players.  
**Why:** `router.refresh()` and `router.push()` called together cause the refresh to interfere with the push navigation in Next.js App Router, effectively cancelling the claim redirect.  
**Risk if changed:** Adding `router.refresh()` back after `router.push('/auth/claim')` will silently skip the claim page.

---

## Bugs fixed during build

### Trigger: "relation teams does not exist"
**Symptom:** Player signup returned "Database error saving new user".  
**Root cause:** `handle_new_user` is a security definer trigger that runs in a context where `public` is not in the search path.  
**Fix:** Added `set search_path = public` to the function definition.

### Claim page: "join code was not linked to a team" despite correct code
**Symptom:** `profile.team_id` appeared null on the claim page even though the DB had it set correctly.  
**Root cause:** The claim page fetched profile with `teams(name)` embedded join. Under RLS, this silently returned null for the entire query result for new players.  
**Fix:** Split into two separate queries — profile first, then team name by ID.

### Claim page: skipped entirely after signup
**Symptom:** Players landed on the dashboard without seeing the claim screen.  
**Root cause 1:** Middleware was redirecting authenticated users away from `/auth/claim` (treated it like `/auth/login`).  
**Fix 1:** Added `&& pathname !== '/auth/claim'` exception to the middleware rule.  
**Root cause 2:** App layout guard required `team_id` to be truthy to redirect to claim.  
**Fix 2:** Removed `team_id` from the guard condition.  
**Root cause 3:** `router.push('/auth/claim')` was immediately cancelled by `router.refresh()`.  
**Fix 3:** Removed `router.refresh()` from the player signup path.

### `get_claimable_players`: "column reference id is ambiguous"
**Symptom:** Claim page showed "Could not load squad list: column reference id is ambiguous".  
**Root cause:** `RETURNS TABLE(id uuid, ...)` creates an implicit `id` output variable that clashes with `profiles.id` in the WHERE clause.  
**Fix:** Changed `where id = auth.uid()` to `where profiles.id = auth.uid()`.

---

## Do not change without reading this

- `/auth/claim` must stay outside `(app)/` — moving it inside creates an infinite redirect loop.
- Middleware exclusion for `/auth/claim` must be kept — removing it skips the claim step silently.
- App layout guard must NOT include `&& profile?.team_id` — it would silently bypass claim for players with null team_id.
- `get_claimable_players` must use `profiles.id` not bare `id` in the WHERE clause.
- Claim page must NOT use embedded joins (`teams(name)`) on the profile query — use separate queries.
- All security definer functions must have `set search_path = public`.
- Signup page player redirect must NOT call `router.refresh()` — use `router.push('/auth/claim')` alone.
