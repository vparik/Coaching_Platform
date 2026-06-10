# Coach Management Platform — Agent Instructions

## What this project is

A football coach management web app. Coaches log in, manage their squad, plan training, prepare for matches, communicate with players, and review results. Built as an MVP to test with real coaches.

---

## Running the project

```bash
cd coach-platform
npm run dev        # dev server at http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

Requires a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The database schema lives in `supabase-schema.sql`. Run it in the Supabase SQL editor to set up tables and RLS policies.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Backend / DB | Supabase (Postgres + Auth) |
| Icons | lucide-react |

---

## Project structure

```
src/
  app/
    layout.tsx                  # Root layout (font, globals)
    (app)/                      # Auth-protected app shell
      layout.tsx                # Redirects to /auth/login if no session; renders Sidebar + MobileNav
      page.tsx                  # Dashboard — "This Week"
      squad/page.tsx
      training/page.tsx
      match-prep/page.tsx
      team-hub/page.tsx
      matches/page.tsx
      tactics/page.tsx
    auth/
      login/page.tsx
      signup/page.tsx
      claim/page.tsx              # Player profile claim step (runs once after player signup)
  components/
    layout/
      Sidebar.tsx               # Desktop left nav
      MobileNav.tsx             # Bottom tab bar on mobile
    squad/SquadClient.tsx
    training/TrainingClient.tsx
    match-prep/MatchPrepClient.tsx
    team-hub/TeamHubClient.tsx
    matches/MatchLogClient.tsx
    tactics/TacticsClient.tsx
  lib/supabase/
    server.ts                   # Server-side Supabase client (cookies)
    client.ts                   # Browser-side Supabase client
    middleware.ts               # Auth session refresh middleware
  types/index.ts                # All shared TypeScript interfaces
docs/
  feature_tabs/                 # Per-tab feature documentation (kept up to date)
    01-dashboard.md
    02-squad.md
    03-training.md
    04-match-prep.md
    05-team-hub.md
    06-match-log.md
    07-tactics.md
```

---

## Architectural pattern — every feature follows the same shape

Every tab uses a **server page + client component** split:

1. **`page.tsx`** (Server Component) — fetches all data from Supabase using the server client, passes it as props to the client component. Never contains UI.
2. **`*Client.tsx`** (Client Component, `'use client'`) — owns all UI state (forms, expanded rows, etc.) and performs mutations directly via the browser Supabase client. After a mutation it calls `router.refresh()` to re-run the server page and get fresh data.

Do not break this pattern. Do not add API routes or server actions.

---

## Data model (key tables)

| Table | Purpose |
|---|---|
| `profiles` | One row per user; links to `teams` via `team_id`; `role`: coach / player; `player_id` links a player account to their squad record |
| `teams` | One team per coach; `join_code` (8-char uppercase) shared with players to register |
| `players` | Squad members; `availability_status`: available / injured / absent / unknown; `left_at` timestamptz for soft-delete |
| `training_sessions` | Sessions with date, time, objective, intensity (low/medium/high), phase (recovery/prep/development) |
| `matches` | All fixtures; `venue`: home / away / neutral; `result` is a score string e.g. "2-1" |
| `match_preps` | One-to-one with `matches`; stores opponent scouting data and match brief |
| `team_messages` | Coach broadcast messages to the squad |
| `message_views` | Records when a player views a message (for "Seen by X/Y" tracking) |
| `player_ratings` | Per-player, per-match ratings on a 1–10 scale |
| `tactics` | Saved tactical boards — formation names + full `positions` JSONB (22 x/y coords) |

All types are defined in `src/types/index.ts`. Always use these types — do not redefine inline.

---

## Key conventions

- **Auth guard** is in `src/app/(app)/layout.tsx` — any page inside `(app)/` is automatically protected.
- **`team_id`** is the primary scoping key for all queries. Always filter by `team_id` to avoid cross-team data leaks.
- **Supabase clients**: use `src/lib/supabase/server.ts` in Server Components and `src/lib/supabase/client.ts` in Client Components.
- **Styling**: dark theme throughout (`bg-gray-950` base, `bg-gray-900` cards, `border-gray-800` borders). Accent colour is `green-400` / `green-600`. Follow existing patterns.
- **Icons**: use `lucide-react` only.
- **No API routes, no server actions** — mutations happen client-side via the browser Supabase client.

---

## Keeping docs up to date

After every session where something is built or changed:
- Update the relevant `docs/feature_tabs/*.md` file to reflect what was added/modified.
- If a new tab or major feature is added, create a new numbered `.md` file in `docs/feature_tabs/` and add it to the list in this file.
- If a new table is added to the schema, add it to the data model table above.

This keeps context load fast for future sessions — read the relevant tab doc before touching that feature.

---

## Implementation docs

When touching an existing feature, read the matching file in `docs/implementations/` before making changes — it documents the non-obvious decisions and gotchas from the original build.

After building something non-trivial, write an implementation doc following `docs/implementations/IMPLEMENTATIONS_AGENT.md`.

---

## Handling ideas

When the user shares a new feature idea, follow the process in `docs/Ideas/IDEAS_AGENT.md` exactly.

Key rules:
- Read the existing codebase before writing — connect the idea to what's already built
- Use the standard template (every section mandatory)
- Give a direct, honest opinion — don't just validate
- Always end with a recommended build order
- Save to `docs/Ideas/idea-[name].md` and update the index table in `IDEAS_AGENT.md`
