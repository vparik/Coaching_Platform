# Idea: Player Access — Multi-Role Platform

**Status:** Under review  
**Type:** Core feature expansion  
**Related:** [`idea-training-attendance.md`](idea-training-attendance.md)

---

## The idea

Coaches are admins. Players can also log in with their own accounts, see what's relevant to them, and manage their own profile details. Players join via a team code the coach shares — no per-player invite needed. Once in, players fill their own sporting details (position, foot, age) rather than the coach entering everything manually.

---

## What already exists that makes this easier

- `profiles.role` is already `'coach' | 'player'` — the field is there, just never used for players yet
- `is_team_coach()` and `is_team_member()` RLS helper functions already exist in Supabase — all select policies already distinguish between coach and member
- `message_views` table is already designed for player read-receipts
- The `players` table exists but is currently a **roster record only** (no auth account attached)
- `players` already has the fields players would fill themselves: `position`, `age`, `preferred_foot`, `nationality`

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

**Decision:** Add a `player_id uuid references players(id)` column to `profiles`. Set during the join flow.

---

## Join flow — Team Code

The coach does not send individual invites. Instead:

1. Every `teams` row gets a unique, permanent **team code** (e.g. `ALFA-7749`) — generated on team creation, stored on the `teams` table
2. Coach copies the code and shares it however they like (WhatsApp group, dressing room, noticeboard)
3. Player opens the signup page, selects **Player**, and sees an extra **Team Code** field
4. On submit: the system looks up the team by code, sets `profiles.role = 'player'` and `profiles.team_id` to the matched team — account is created

**Security note:** Anyone with the code can join. For an MVP with real-life coaches who know their players, this is acceptable. The coach sees all accounts linked to their team and can remove any they don't recognise.

---

## "Who are you in the squad?" — profile claim step

Immediately after signup, before reaching the dashboard, the player is shown a claim screen:

1. A list of existing `players` records for that team that have **no linked account yet** — shown as selectable cards (name + position)
2. Player picks themselves → their `profiles.player_id` is set to that record's id
3. If the player is **not listed** (e.g. they are a new addition not yet in the coach's roster): they tap **"Add myself"** → a minimal new `players` record is created for the team and immediately linked

This claim step runs once. After it, the player goes straight to the dashboard on future logins.

**Guard:** Once a `players` record has a linked profile, it is removed from the claimable list — two players cannot claim the same record.

---

## Player self-service profile

After claiming their record, the player is taken to a **complete your profile** screen (and can return to it later from their settings):

| Field | Who fills it | Notes |
|---|---|---|
| Name | Pre-filled from `players.name` — player can correct it | |
| Position | Player | Dropdown: GK / CB / LB / RB / CDM / CM / CAM / LW / RW / ST |
| Age | Player | Number input |
| Preferred foot | Player | Left / Right / Both |
| Nationality | Player | Text field |
| Private notes | **Coach only** | Never shown to player — coaching notes remain confidential |
| Availability status | Shared | Player sets their own; coach can override |

The coach retains full edit access to any player profile from the Squad tab. Player changes are reflected immediately.

---

## What players see (role-based views)

| Tab | Player view |
|---|---|
| Dashboard | Simplified — next match, next training session, team messages |
| Training | Read-only list of upcoming sessions + RSVP buttons (see attendance idea) |
| Team Hub | Can read all messages; opening a message writes a `message_views` record |
| Match Log | Can see results and **their own rating only** — not other players' |
| Squad | Can see and edit **their own profile only** — no private notes, no other players |
| Match Prep | **Hidden** — opponent scouting is coach-only |
| Tactics | **Hidden** |

---

## What players never see

- `private_notes` on any player record (including their own)
- Other players' ratings
- Match prep / scouting data
- Any add / edit / delete controls outside their own profile

---

## Player lifecycle — leaving and re-joining

### Leaving mid-season (coach-initiated)

The coach clicks **"Remove from team"** on a player card in the Squad tab. This does exactly two things:

1. Sets `players.left_at = now()` — the player is hidden from the active roster but their record and all historical data (ratings, attendance) is **preserved**
2. Clears `profiles.player_id` and `profiles.team_id` — the player's account is detached. Next time they log in they see a "you're not linked to a team" screen with the option to join a new one via code

The `players` record is never deleted. Deleting it would orphan match ratings, attendance records, and any other data referencing `player_id`.

### Re-joining the same team

The player uses the same team code → reaches the claim screen → their old `players` record (now unlinked, `left_at` set) appears in the list with a **"Previously on this team"** label. They re-claim it → `left_at` is cleared, `profiles.player_id` is restored. Full history is intact.

### Joining a different team

Player uses the new team's code → claim screen shows that team's unlinked players. They either claim an existing record or add themselves. A new `players` record is created in the new team. Their old team's data is completely untouched — the old `players` record stays in the old team's roster, permanently unlinked, for the coach's historical records.

### Team code exposure after a player leaves

An ex-player still knows the code and could theoretically re-join. For MVP this is acceptable — the coach sees all accounts in the Squad tab and can remove any they don't recognise. For cases where a coach wants to lock out a specific person, add a **"Regenerate code"** button on the coach's settings or Squad tab header. It generates a new code — existing linked player accounts are unaffected.

---

## My recommendations & enhancements

### 1. The team code should be short and human-readable
A 4-word or 6-character alphanumeric code (e.g. `ALFA-7749`) is easy to read out loud, type on mobile, and share in a message. Avoid UUIDs or long tokens. Generate it on team creation.

### 2. Don't let players set their own name freely after claiming
If a player selects "John Smith" from the list and then changes their name to something different, it creates confusion for the coach. Either lock the name field after claim, or flag to the coach that a name change was made.

### 3. Coach sees unlinked accounts in Squad tab
Add a small "pending" badge on player cards that have no linked account yet, and a separate section for accounts that joined via code but haven't claimed a player record yet. This lets the coach monitor and clean up.

### 4. Availability status — shared control
Currently the coach sets this manually. With player accounts, the player should be able to set their own status (Available / Injured / Absent). The coach can always override. This removes a significant daily admin burden.

### 5. Defer: notifications
Push notifications for new messages or training sessions are a natural Phase 2 — once you have real players on the platform and can validate they want them.

---

## My honest opinion

This is the most important feature on the roadmap after the core coach tools are stable. Everything else — attendance RSVP, player ratings visibility, message read receipts actually meaning something — only becomes real when players are actually in the app. The team code approach is the right call for an MVP: low friction, no infrastructure needed (no email sending, no token expiry logic), and perfectly suited for a coach who already communicates with players over WhatsApp. The self-service profile is a smart UX shift that also improves data quality — players are more likely to enter their own foot preference correctly than a coach doing it for 20 people. The main risk is adoption: getting players to actually download and register. That's a product/distribution problem, not a technical one.

---

## Data model

### Change to `teams`

```sql
alter table teams add column join_code text unique;
-- populate existing teams:
update teams set join_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
```

### Change to `profiles`

```sql
alter table profiles add column player_id uuid references players(id);
```

### Change to `players`

```sql
alter table players add column left_at timestamptz;
-- null = currently on team, not null = left on that date
```

No new tables required for the core join flow.

---

## Complexity rating

**Medium-High.** The data model changes are small. The bulk of the work is UI: the signup form extension, the claim screen, the profile self-edit screen, and the role-aware layout that hides/shows the right things per tab. The claim + "add myself" flow needs careful handling to avoid duplicate player records.

**Recommended build order:**
1. Schema changes (`join_code` on teams, `player_id` on profiles)
2. Signup form: Player role option + Team Code field
3. Claim screen: "Who are you?" list + "Add myself" option
4. Profile completion screen (player fills their details)
5. Role-aware layout: hide coach-only tabs for players
6. Player-specific views per tab (read-only, filtered)
7. Coach Squad tab: unlinked accounts panel + pending badges
8. "Remove from team" action — sets `left_at`, clears profile link
9. Re-join flow — previously linked records appear in claim screen with "Formerly on this team" label
10. "Regenerate code" button on Squad tab header
11. Player availability self-reporting
12. Phase 2: Training attendance RSVP (see linked idea)
13. Phase 2: Rating publish control, notifications
