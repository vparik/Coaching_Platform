# Idea: Player Training Attendance RSVP

**Status:** Under review  
**Type:** Tab expansion (Training + Player Access)  
**Related:** [`idea-player-access.md`](idea-player-access.md), [`docs/feature_tabs/03-training.md`](../feature_tabs/03-training.md)

---

## The idea

Once players have accounts on the platform, they should be able to confirm whether they are attending each upcoming training session. The coach sees a live count and a per-player breakdown on each session card — no more chasing people on WhatsApp to find out who is showing up.

---

## What already exists that makes this easier

- `training_sessions` table holds all sessions — the target entity for RSVPs
- `players` table already holds every squad member per team
- `profiles.player_id` (from the Player Access idea) links an auth user to their `players` record — this is the bridge needed to write an attendance response on behalf of a specific player
- `availability_status` on `players` is a general status (available/injured/absent) — separate from per-session RSVP, but the injured/absent status can be used to auto-flag players who almost certainly won't attend
- The player-facing dashboard (from Player Access) will list upcoming training sessions — the natural place to surface RSVP buttons

Nothing exists yet for per-session attendance tracking. A new table is required.

---

## How it works

### Player flow
1. Player logs in and opens their dashboard (or a training tab in their view)
2. Each upcoming session shows: date, time, intensity — and two buttons: **"Attending"** and **"Not attending"**
3. Tapping a button records the response immediately; the button highlights to show the current state
4. Player can change their response at any time before the session

### Coach flow
1. Coach opens the Training tab (week view or list view)
2. Each session card now shows an attendance summary badge: e.g. **"9 ✓ · 2 ✗ · 4 —"** (attending / not attending / no response)
3. Coach clicks a session to open the edit form — a new **Attendance** section lists every squad member with their response status
4. Coach can see at a glance exactly who hasn't responded yet and how many bodies to expect

---

## My recommendations & enhancements

### 1. Keep the three states: Attending / Not attending / No response (pending)
Don't collapse to Yes/No. "No response" is meaningful information — it tells the coach who they still need to chase. Distinguishing it from "Not attending" avoids ambiguity.

### 2. Don't auto-decline injured/absent players — flag them instead
Players with `availability_status = 'injured'` or `'absent'` should appear in the coach's attendance list with a visual indicator (e.g. an injury icon), but still count as "No response" unless they actively RSVP. Coaches sometimes bring injured players to observe; don't make assumptions.

### 3. Surface no-response count prominently for the coach
The most useful signal for the coach is often "4 players haven't responded yet." Consider making that the first number shown on the session card, so the coach knows who needs a nudge.

### 4. Only show future sessions for RSVP
Players should only see RSVP buttons on sessions that haven't started yet. Past sessions show as read-only history.

### 5. Defer: cut-off time and notifications
A "RSVP closes 2 hours before session" feature and push notifications for unresponded players are valuable but not MVP. Build them in Phase 2 once real coaches validate the basic flow.

---

## My honest opinion

This is one of the most practically useful features on the roadmap. Session attendance uncertainty is a daily pain for every coach — knowing you have 9 vs 14 players changes your entire session plan. It also gives players a low-friction reason to open the app regularly, which improves engagement across all other features. The only real risk is sequencing: this feature has zero value until the Player Access invite flow is built and players are actually logging in. Don't build attendance RSVP in isolation — it must be the second feature after players can log in, not a standalone. If Player Access stalls, this stalls too.

---

## Data model

### New table: `training_attendance`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `session_id` | uuid | FK → training_sessions(id) ON DELETE CASCADE |
| `player_id` | uuid | FK → players(id) ON DELETE CASCADE |
| `status` | text | `'attending'` \| `'not_attending'` |
| `updated_at` | timestamptz | Updated on every change |

**Unique constraint:** `(session_id, player_id)` — one response per player per session.

**SQL:**
```sql
create table training_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references training_sessions(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  status text check (status in ('attending', 'not_attending')) not null,
  updated_at timestamptz default now() not null,
  unique(session_id, player_id)
);

-- RLS: players can only write their own record; coaches can read all for their team
alter table training_attendance enable row level security;
```

No changes needed to existing tables.

---

## Complexity rating

**Medium.** The data model is simple (one table, one upsert). The UI work is bounded: RSVP buttons on the player dashboard, attendance summary on the coach's session cards, and a detail list inside the session edit form. The sequencing dependency on Player Access is the main constraint — not technical complexity.

**Recommended build order:**
1. Complete the Player Access feature (prerequisite — players must be able to log in)
2. Create `training_attendance` table with RLS policies
3. Add RSVP buttons to the player-facing training/dashboard view
4. Add attendance summary badge to session cards in the coach's Training tab
5. Add the full per-player attendance list inside the session edit form
6. Phase 2: RSVP cut-off time, notifications for non-responders
