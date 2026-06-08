# Idea: Match Lineup Builder

**Status:** Under review  
**Type:** Tab expansion (Match Prep)  
**Related:** [`docs/feature_tabs/04-match-prep.md`](../feature_tabs/04-match-prep.md), [`idea-player-access.md`](idea-player-access.md)

---

## The idea

Inside Match Prep, alongside the existing scouting form, the coach gets a second view: **Lineup**. They pick their formation, assign squad players to the 11 positions, and add substitutes from the bench. The lineup is saved per match. It replaces the mental note or whiteboard the coach currently has to use.

---

## What already exists that makes this easier

- `match_preps` is already a one-to-one record per match — the natural place to store lineup data (two extra JSONB columns)
- `players` table has the full squad with `availability_status` — injured/absent players can be flagged immediately in the position pickers
- The formation list (`FORMATIONS` constant in `MatchPrepClient.tsx`) already exists and is ready to reuse
- The match card already expands inline with different content states — adding a **Scouting / Lineup** tab toggle within the expansion is a clean, low-disruption change

Nothing new needs to be built from scratch. This is almost entirely additive.

---

## How it works

### UI structure
Each match card in Match Prep gains a two-tab toggle when expanded: **Scouting** (existing content, unchanged) and **Lineup** (new).

### Lineup tab — coach flow
1. Coach expands a match card and clicks **Lineup**
2. Picks their formation from a dropdown (same list as the scouting form's opponent formation)
3. A list of **11 position slots** appears, labelled by role: GK · RB · CB · CB · LB · CM · CM · CAM · RW · LW · ST (labels adapt per formation — see note below)
4. Each slot has a player dropdown populated from the squad. Players with `availability_status = 'injured'` or `'absent'` appear greyed out with a small warning icon — selectable but flagged
5. Below the 11: a **Substitutes** section — coach adds bench players from the remaining squad (no position assigned, just names)
6. Coach hits **Save Lineup** — data is upserted to `match_preps`

### Read view
Once saved, the Lineup tab shows a clean read-only summary: formation name, numbered position list with player names, and the bench. Coach can click Edit to reopen the form.

---

## My recommendations & enhancements

### 1. Keep the position labels simple — don't over-engineer formation mapping
Mapping every formation to exact position labels (LB, RCB, RWB, etc.) is a rabbit hole. For MVP, use a generic numbered list: GK + positions 2–11 labelled as the coach's formation string suggests. Let the coach mentally map "position 6 = left midfielder." Coaches are used to this — they don't need the app to do positional labelling for 15 formations.

### 2. Show availability warnings, don't block
If a coach picks an injured player, show an amber warning ("Injured") next to their name in the saved lineup — don't prevent the selection. Coaches sometimes include injured players as optimistic selections that change on match day.

### 3. Don't connect this to the tactics board yet
The tactics board already exists for visual positioning. The lineup builder is intentionally simpler — a list, not a pitch canvas. Merging them would add complexity for no clear gain at this stage.

### 4. Phase 2: share lineup with players
Once player accounts exist (see `idea-player-access.md`), the saved lineup could be shared — players log in and see whether they're starting, on the bench, or not selected. A `lineup_published` boolean on `match_preps` would let the coach control when it becomes visible. Don't build this now, but design the data model to support it.

### 5. The bench count should be flexible
Real squads vary — sometimes 5 subs, sometimes 9. Don't cap the bench. Let the coach add and remove substitutes freely.

---

## My honest opinion

This is a natural and obviously correct extension of Match Prep. Scouting the opponent and planning your own lineup are two sides of the same pre-match workflow — they belong in the same place. The implementation is genuinely lightweight: two JSONB columns on an existing table, a tab toggle in an existing component, and a list of dropdowns. The biggest payoff comes later when lineups can be shared with players — but even without that, it saves the coach from juggling a WhatsApp message and a mental note on the same afternoon.

---

## Data model

### Changes to `match_preps`

```sql
alter table match_preps add column lineup_formation text;
alter table match_preps add column lineup_starters jsonb;
-- [{ slot: 1, label: "GK", player_id: "uuid" }, ...]
alter table match_preps add column lineup_subs jsonb;
-- ["player_id_1", "player_id_2", ...]
alter table match_preps add column lineup_published boolean default false;
-- Phase 2: controls visibility to players
```

No new tables required.

### TypeScript — additions to `MatchPrep` interface in `src/types/index.ts`

```ts
lineup_formation: string | null
lineup_starters: { slot: number; label: string; player_id: string | null }[] | null
lineup_subs: string[] | null
lineup_published: boolean
```

---

## Complexity rating

**Low.** The data model change is minimal. The UI is a tab toggle + a list of dropdowns — no canvas, no drag-and-drop. The main coding work is wiring the player list into the slot pickers and handling the upsert alongside the existing prep save logic.

**Recommended build order:**
1. SQL migration — add four columns to `match_preps`
2. Update `MatchPrep` type in `src/types/index.ts`
3. Pass `players` array as a prop into `MatchPrepClient` from the server page
4. Add Scouting / Lineup tab toggle to the match card expansion
5. Build the Lineup form: formation picker + 11 slot dropdowns + subs list
6. Build the read-only lineup summary view
7. Phase 2: `lineup_published` toggle + player-facing lineup view
