# Idea: Player Access — Multi-Role Platform

**Status:** Under review  
**Proposed by:** Coach  
**Type:** Core feature expansion

---

## The idea

Coaches are admins. Players can also log in and access the platform, but with a restricted view — they see what's relevant to them without being able to edit anything or see sensitive coaching information.

---

## What already exists in the codebase

This is further along than it looks. The schema already anticipates this:

- `profiles.role` is already `'coach' | 'player'` — the field is there, just never used for players yet
- `is_team_coach()` and `is_team_member()` RLS helper functions already exist in Supabase — all select policies already distinguish between coach and member
- `message_views` table is already designed for player read-receipts
- The `players` table exists but is currently a **roster record only** (no auth account attached)

The main gap: `players` records are not linked to a `profiles` (auth) account. A player signing in has no way to know which squad record they belong to.

---

## Key architectural decision

Right now:

```
profiles (auth user)  ←— no link —→  players (roster record)
```

To make player login work, you need a bridge:

```
profiles (auth user, role='player')  ——  player_id  ——→  players (roster record)
```

**Recommendation:** Add a `player_id uuid references players(id)` column to `profiles`. When a player signs up via invite, this column is populated and links their account to their squad entry.

---

## Recommended invite flow

The coach does not share a signup link publicly. Instead:

1. Coach opens a player's profile in the Squad tab
2. Taps **"Invite to platform"** — generates a unique one-time invite link (stored in a new `player_invites` table with a token + expiry)
3. Player receives the link (via WhatsApp, email, etc. — coach shares it manually)
4. Player clicks it, lands on a signup page pre-filled with their name, sets a password
5. On signup: their `profiles.role = 'player'` and `profiles.player_id` is set to the matching `players.id`
6. From that point they can log in normally

---

## What players should see (recommended)

| Tab | Player view |
|---|---|
| Dashboard | Simplified — next match, next training session, team messages |
| Training | Read-only list of upcoming sessions |
| Team Hub | Can read all messages; opening a message writes a `message_views` record (this already powers the coach's "Seen by X/Y") |
| Match Log | Can see results and **their own rating only** — not other players' ratings |
| Squad | Can see **their own profile only** — no private coach notes, no other players |
| Match Prep | **Hidden** — opponent scouting is coach-only information |
| Tactics | **Hidden** — or read-only preview, to be decided |

---

## What players should never see

- `private_notes` on any player (including their own — these are coaching notes)
- Other players' ratings
- Match prep / scouting data
- Any add / edit / delete controls

---

## My recommendations & enhancements

### 1. Don't build a separate player app — use role-based routing
The cleanest approach is to keep one codebase. In the `(app)/layout.tsx`, read `profile.role` and pass it down. Each page/component checks the role and renders the correct view. No duplicate routes needed.

### 2. The invite system is the hardest part — keep it simple first
Don't build email sending infrastructure. The first version is just: coach generates a link, copies it, sends via WhatsApp. Add email later when you have real users.

### 3. Player notifications (future)
Once players are on the platform, push notifications for new team messages or training sessions become very valuable. This is a natural Phase 2.

### 4. Player availability self-reporting
Currently the coach sets availability manually. With player accounts, players could update their own status (Available / Injured / Absent) directly. The coach can override. This removes a significant admin burden.

### 5. Player match ratings — show with delay
Consider not showing ratings immediately after a match. Give the coach control over when ratings are "published" to players. A `ratings_published` boolean on the `matches` table would do it.

---

## Complexity rating

**Medium-High.** The data model change is small (one column), but the UI work touches almost every tab. The invite system needs careful token handling to avoid security issues. Recommend building in this order:

1. Schema change (`player_id` on profiles, `player_invites` table)
2. Invite generation + signup flow
3. Role-aware layout (hide coach-only tabs)
4. Player-specific views per tab (read-only, filtered)
5. Self-reported availability
6. Rating publish control

---

## New tables needed

### `player_invites`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `player_id` | uuid | FK → players |
| `token` | text | Unique random token in the URL |
| `expires_at` | timestamptz | e.g. 7 days |
| `used` | boolean | Marked true when claimed |
| `created_at` | timestamptz | |

### Change to `profiles`

```sql
alter table profiles add column player_id uuid references players(id);
```
