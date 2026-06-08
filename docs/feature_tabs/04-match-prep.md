# Match Preparation

**Route:** `/match-prep`

Match Prep is the platform's core differentiator. The coach fills in a structured scouting form for an upcoming opponent and the data is stored as a formal match brief that can be referenced before kickoff.

---

## How it works

Only **upcoming matches** (today and future) appear here. Each match card shows the opponent and date. If a prep brief already exists for a match, the card shows a green "Prep done" badge; otherwise it prompts the coach to complete the scouting form.

---

## Scouting form fields

| Field | What to fill in |
|---|---|
| Opponent Formation | e.g. 4-3-3, 4-4-2 |
| Playing Style | e.g. "High press, quick transitions" |
| Key Strengths | What they do well |
| Key Weaknesses | Where they can be exploited |
| Key Players | Names and roles to be aware of |
| Set-Piece Tendencies | Corners, free-kick routines, throw-in patterns |
| Match Brief | Free-text summary — tactical plan, messages for the team |

---

## Actions

### Create a prep
Expand an upcoming match card and fill in the scouting form. Hit "Save Prep" to store it.

### Edit a prep
Reopen a match that already has prep done — the form is pre-filled with the existing data. Save to update.

---

---

## Lineup builder

Each match card has two tabs when expanded: **Scouting** (existing) and **Lineup** (new).

### Lineup tab

- Pick your **formation** from a dropdown (same list as the scouting form)
- Assign a squad player to each of the **11 position slots** — labels adapt to the chosen formation (GK, RB, CB, etc.)
- Players with `availability_status = 'injured'` or `'absent'` are flagged with an amber warning icon but can still be selected
- Add **substitutes** from a picker showing unselected squad members
- A player selected in one slot is disabled in all other slots and the subs picker

### Data stored

Four new columns on `match_preps`:

| Column | Type | Notes |
|---|---|---|
| `lineup_formation` | text | Formation string, e.g. "4-3-3" |
| `lineup_starters` | jsonb | Array of `{slot, label, player_id}` — 11 entries |
| `lineup_subs` | jsonb | Array of player UUIDs |
| `lineup_published` | boolean | Phase 2 — controls player-facing visibility |

Saving a lineup creates a `match_preps` record if one doesn't exist yet (without setting `prep_done`). Scouting and lineup saves are independent.

---

## Key behaviour
- Each match can have exactly one prep record. Saving again updates the existing one rather than creating a duplicate.
- The Dashboard "Next Match" card checks whether prep exists and shows an amber warning link if it has not been completed yet.
- Only upcoming matches are shown here. Past matches move to the Match Log tab.
