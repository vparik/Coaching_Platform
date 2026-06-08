# Idea: Per-Player Match Notes + LLM Match Report

**Status:** Under review  
**Type:** Tab expansion (Match Prep + Match Log)  
**Related:** [`idea-match-lineup.md`](idea-match-lineup.md), [`docs/feature_tabs/04-match-prep.md`](../feature_tabs/04-match-prep.md), [`docs/feature_tabs/06-match-log.md`](../feature_tabs/06-match-log.md)

---

## The idea

Inside the lineup, each player slot gets a small notes field where the coach can jot observations — before the match (tactical instructions), during (substitution reasoning, performance flags), or after (how they actually played). Optionally, the coach also logs basic stats per player (goals, assists, yellow/red cards). After the match, a "Generate Report" button passes all notes + stats + the match context to an LLM and produces a structured match report that the coach can review, edit, and save.

---

## What already exists that makes this easier

- `PlayerRating` in `src/types/index.ts` already has a `notes: string | null` field — post-match notes per player are partially modelled already, though currently used for ratings
- `LineupStarter` interface (`{id, label, player_id, x, y}`) can be extended with a `note` field — no new table needed for the notes themselves
- `match_preps` stores `lineup_starters` as JSONB, so extending each starter object with `note` is a non-breaking schema change
- `matches` already has `result` and `notes` — the LLM has rich context to draw from without extra fetching
- `MatchPrep.match_brief` gives the pre-match tactical plan — perfect as a "what was planned vs what happened" input to the LLM

---

## How it works

### Phase 1 — Per-player notes in the lineup

1. Coach opens the Lineup tab on a match card (requires lineup builder to be built first — see `idea-match-lineup.md`)
2. Each of the 11 player slots has a small **Note** text input below the player name — a single-line field, expandable on focus
3. Subs also get a note field (e.g. "came on 65' for tactical reasons")
4. Notes save alongside the lineup on the same "Save Lineup" action — no separate save button
5. In the read view, notes appear as small grey text under each player name

### Phase 2 — Stats per player (optional, pre-LLM)

After the match result is logged, the coach can open the lineup and tick quick stats per player:

- Goals scored (number)
- Assists (number)
- Yellow card (boolean)
- Red card (boolean)
- Rating (1–10, already supported via `player_ratings` table)

These are already partially supported — `player_ratings` has `notes` and `rating`. Stats like goals/assists/cards would be new.

### Phase 3 — LLM match report generation

1. Coach clicks **"Generate Report"** on a completed match card
2. The app gathers: match result, opponent, match brief, lineup notes per player, per-player stats
3. Sends to Claude API (claude-sonnet-4-6 or haiku for cost)
4. LLM returns a structured match report: overall summary, key moments, player-by-player observations, areas to work on in training
5. Coach reviews and edits the draft in a rich text area, then saves it to `match_preps.match_report`

---

## My recommendations & enhancements

### 1. Build Phase 1 only, now — everything else follows from it
Notes in the lineup are the data foundation the LLM needs. Without real notes, the generated report is generic and useless. Get coaches writing notes first, see if they actually do it, then build the report.

### 2. Keep notes short and frictionless
Don't use a textarea — a single `<input>` per player is enough. Long notes won't happen mid-match. The value is in short observations: "lost positional battles", "created chances but poor finish", "subbed 70' — tired".

### 3. Don't build stats tracking from scratch — use what's there
`player_ratings` already exists. Before adding goals/assists/cards columns, check whether coaches actually want that granularity. A notes field covers 80% of the value at 10% of the complexity. Stats can come in Phase 2 if coaches ask for it.

### 4. The LLM needs a well-crafted prompt — don't underestimate this
The quality of the match report depends entirely on the prompt. The prompt should instruct the model to: identify patterns across player notes, compare against the match_brief plan, suggest 2–3 training focus areas, keep it to ~300 words. This is an implementation detail but it determines whether coaches actually find the feature valuable.

### 5. Store the report as editable text, not sacred LLM output
Coaches will want to correct or rewrite parts. Save `match_report` as plain text after generation. The LLM draft is a starting point, not the final word.

### 6. Gate the LLM feature behind a Pro plan
This is the natural paywall. Free: notes in lineup. Pro: generate match report. Clear value, easy to explain.

---

## My honest opinion

Phase 1 (notes per player in the lineup) is a no-brainer — small lift, high utility, and it makes the lineup builder meaningfully more useful than a whiteboard. Build it as part of the lineup feature, not as a separate project. The LLM report generation is genuinely exciting and differentiating — no amateur coaching tool does this — but it is only valuable if coaches actually write notes. Right now there is no evidence they will. The risk is building a polished report generator on top of empty notes fields. The right call is: ship notes first, watch how coaches use them over a few match cycles, then build the report. If notes are rich and real, the LLM output will be impressive. If they are blank or one-word, the report will be garbage and coaches will ignore it.

---

## Data model

### Changes to `LineupStarter` interface (`src/types/index.ts`)

```ts
export interface LineupStarter {
  id: string
  label: string
  player_id: string | null
  x: number
  y: number
  note: string | null   // new
}
```

Because `lineup_starters` is stored as JSONB in `match_preps`, this requires no SQL migration — existing rows just won't have the `note` key (treat as null).

### Changes to `match_preps` table (Phase 3)

```sql
alter table match_preps add column match_report text;
-- The LLM-generated (and coach-edited) post-match report
```

### Changes to `MatchPrep` interface (`src/types/index.ts`)

```ts
match_report: string | null   // Phase 3
```

### Phase 2 — per-player stats (if needed)

Rather than a new table, add stats to `player_ratings`:

```sql
alter table player_ratings add column goals integer default 0;
alter table player_ratings add column assists integer default 0;
alter table player_ratings add column yellow_card boolean default false;
alter table player_ratings add column red_card boolean default false;
```

---

## Complexity rating

**Medium** (Phase 1 alone: **Low**; Phase 3 adds **High** complexity).

Phase 1 is a field addition to an existing JSONB structure — a few hours of work once the lineup builder exists. Phase 3 requires a Claude API integration, prompt engineering, a generation UI, and a backend call (which currently doesn't exist — the app is entirely client-side Supabase). The LLM call will need a Next.js API route or a Supabase Edge Function since the Anthropic API key cannot be exposed to the browser.

**Recommended build order:**
1. Build the lineup builder first (`idea-match-lineup.md`) — this is a prerequisite
2. Add `note: string | null` to each `LineupStarter` in the form — one extra input per slot
3. Add `match_report: text` column to `match_preps`
4. Update `MatchPrep` and `LineupStarter` types
5. Phase 2 (optional): add goals/assists/cards to `player_ratings` if coaches ask
6. Phase 3: create a Next.js API route (`/api/generate-match-report`) that accepts match context and calls the Claude API
7. Wire up the "Generate Report" button on completed match cards
8. Add a report review/edit view and save flow
