# Tactics Board — Feature Spec

**Route (planned):** `/tactics`  
**Status:** Phase 1 built. Run `supabase-tactics-migration.sql` in Supabase SQL editor to activate.

---

## Purpose

A visual tactical board where the coach can position two starting elevens on a football pitch, build formations by dragging players into place, and save named tactics for future use. The foundation is designed to support animated pressing and build-up sequences in a future phase.

---

## Phase 1 — What we are building now

### The pitch
- Full football pitch rendered as an SVG or canvas element
- **Portrait orientation** (vertical) — top half = opponent (red), bottom half = your team (blue)
- Standard pitch markings: halfway line, centre circle, penalty areas, goal areas, goals

### Players
- **11 blue circles** — your team (home side, bottom half)
- **11 red circles** — opponent (top half)
- Each circle shows a short **position label** (GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST, CF)
- Circles are draggable to anywhere on the pitch

### Formation presets
A dropdown (or quick-select chips) to snap players into a standard formation instantly, rather than placing all 11 by hand:
- 4-4-2
- 4-3-3
- 4-2-3-1
- 3-5-2
- 5-3-2
- 4-1-4-1

Applying a preset repositions the circles; the coach can then fine-tune by dragging.  
Each team (blue / red) has its own independent formation selector.

### Saving tactics
- Coach gives the tactic a name (e.g. "High Press vs 4-4-2", "Counter vs strong sides")
- Saves the x/y position of every circle for both teams
- Saved tactics are listed below the pitch (or in a side panel)
- Tap a saved tactic to load it back onto the pitch
- Delete a saved tactic

### Player labels
- Default: position abbreviation (GK, CB, ST …)
- **Nice to have later:** toggle to show jersey number or player name from the squad

---

## Data model (planned)

### New table: `tactics`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `team_id` | uuid | FK → teams |
| `name` | text | Coach-given name |
| `formation_our` | text | e.g. "4-3-3" |
| `formation_opp` | text | e.g. "4-4-2" |
| `positions` | jsonb | Full position data for all 22 circles (see below) |
| `created_at` | timestamptz | |

### `positions` JSON shape

```json
{
  "our": [
    { "id": "GK",  "x": 0.50, "y": 0.92 },
    { "id": "LB",  "x": 0.20, "y": 0.75 },
    ...
  ],
  "opp": [
    { "id": "GK",  "x": 0.50, "y": 0.08 },
    ...
  ]
}
```

`x` and `y` are **relative coordinates** (0.0–1.0) so the board is resolution-independent and works on any screen size.

---

## Phase 2 — Animations (future, not building now)

The foundation laid in Phase 1 should not block these:

### Pressing triggers
- Coach draws **movement arrows** on top of players — tap a player, tap a target point, an arrow is created
- Arrows can be numbered to show sequence (press trigger 1 → 2 → 3)
- Play button animates players moving along their arrows simultaneously or sequentially

### Build-up sequences
- Same arrow mechanism but for ball circulation patterns
- A "ball" indicator moves along the path
- Sequences can be stepped through frame-by-frame or played at a set speed

### What Phase 1 must not break
- Positions stored as relative x/y (already planned above) — animations will add a `keyframes` array to the same JSON structure
- SVG/canvas choice must support layering arrows on top of player circles

---

## Confirmed decisions

1. **Pitch orientation** — portrait (vertical). Your team blue at the bottom, opponent red at the top. Landscape may be revisited later.
2. **Both teams draggable** — yes, the coach can drag both blue and red circles freely.
3. **Player labels** — position abbreviations only for now (GK, CB, ST…). Player names from the squad is a future enhancement.
4. **Saved tactics list** — shown below the pitch as a **dropdown**. Selecting a tactic from the dropdown loads it onto the pitch.
5. **Tactic scope** — saved per team (scoped to `team_id`), consistent with the rest of the app.

---

## Implementation approach (planned)

- Pitch and circles: **SVG** — clean, resolution-independent, easy to layer arrows on top later
- Drag and drop: native browser pointer events (no extra library needed for circles on SVG)
- State management: local React state while editing; save to Supabase on explicit "Save" action
- Follows the standard **server page + client component** pattern of the rest of the app

---

## Player view

Players can access Tactics to study formations. They can:
- Drag players on the pitch (interactive study — changes are not saved)
- Change formations via the selectors
- Load saved tactics from the dropdown

Players cannot save new tactics or delete existing ones. The save input/button and delete button are hidden via the `role` prop.
