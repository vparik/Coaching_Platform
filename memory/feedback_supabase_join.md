---
name: feedback_supabase_join
description: Never use select('*, teams(*)') on the profiles table — circular FK causes silent null return
metadata:
  type: feedback
---

Never use `select('*, teams(*)')` when querying the `profiles` table.

**Why:** `profiles` and `teams` have a circular FK relationship (`profiles.team_id → teams.id` and `teams.coach_id → profiles.id`). PostgREST/Supabase silently fails the entire query when the join is ambiguous, returning `null` for the profile. This caused `teamId` to be `undefined` on the dashboard, making every widget show empty even though data existed in the DB.

**How to apply:** Always use `select('team_id')` (or only the specific columns needed) when fetching the profile. Never join `teams(*)` from `profiles`. All other pages in the codebase already do this correctly — the dashboard was the only outlier.
