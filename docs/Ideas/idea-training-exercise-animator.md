# Idea: Training Exercise Animator

**Status:** Built  
**Type:** New feature — Training tab expansion or standalone board  
**Related:** idea-tactical-animations.md (same animation engine, different canvas and purpose)

---

## The idea

Coaches can design and animate training exercises on a flexible grass board — rondos, 5v3s, set piece drills, pressing games, anything. The board is not a fixed 11v11 pitch. Instead the coach picks a **scenario** (canvas size and markings), adds however many players they need in whatever colours, draws dividing lines to create corridors or zones, then animates the drill frame by frame. Exercises are saved to a personal library and can be shared with the squad.

---

## How this differs from tactical animations

| | Tactical Animations | Training Exercises |
|---|---|---|
| Canvas | Full 11v11 pitch | Flexible — scenario-based |
| Players | Fixed 22 (11 blue + 11 red) | Variable — coach adds/removes |
| Player labels | Position (GK, CB…) | Number or letter (1, 2, A, B…) |
| Drawing tools | None (auto-arrows only) | Lines to create zones and corridors |
| Purpose | Tactical shape & strategy | Drill mechanics and movement |
| Scope | Match preparation | Training session |

Same animation engine underneath (keyframes + lerp), different surface.

---

## Scenarios — canvas options

The coach picks one when creating a new exercise. Each scenario is an SVG background with appropriate markings.

| Scenario | What it shows | Good for |
|---|---|---|
| **Blank grass** | Just green, no markings | Rondos, free-form drills |
| **Full pitch** | Complete 11v11 pitch | Team shape exercises |
| **Half pitch** | One half with penalty area | Defensive shape, build-out |
| **Final third** | Penalty area + 18-yard box | Finishing, set pieces |
| **Wide corridor** | Two vertical lines creating a channel | Wide play, overlaps |
| **Small grid** | A marked square (e.g. 20×20) | Possession rondos, pressing traps |

More scenarios can be added later. These six cover the vast majority of training drill contexts.

---

## Players — flexible count and colour

Unlike the tactical board, the coach is not locked into 22 players. They start with an empty canvas and add players manually.

- **Add player** button → places a new circle in the centre of the board
- Each player has:
  - **Colour**: Team A (blue), Team B (red), Neutral/GK (yellow/orange)
  - **Label**: number (1–11) or letter (A, B, C…) — coach chooses
- Players can be deleted individually
- Typical drill sizes: 3v3, 5v3, 7v7, 4v4+2 neutrals, etc.

A **cone** marker (small triangle) could also be placeable for setting up reference points in the drill — useful for passing patterns and gates.

---

## Drawing tools — lines and zones

The coach can draw straight lines on the canvas to divide the space into corridors, halves, thirds, or squares. These are static markings that appear in every frame of the animation.

**Line tool:**
- Tap start point → tap end point → line is drawn
- Lines are dashed or solid (coach picks style)
- Lines can be deleted

**Use cases:**
- Divide the pitch into thirds (two horizontal lines)
- Create pressing corridors (two vertical lines)
- Mark a playing area boundary for a small-sided game
- Draw a zone that a player must stay within

Lines are drawn once and persist across all frames — they are part of the exercise setup, not the animation. Only players and ball move between frames.

---

## Animation — same engine as tactical

Frame-by-frame: coach sets positions, taps "Add Frame", moves players and ball, adds next frame. Playback interpolates between frames.

Same controls: ▶ Play, ⏸ Pause, ◀▶ Step, Speed, Loop.

Auto-arrows generated from position deltas between frames (same as tactical animations).

---

## Exercise library

Each exercise is saved with:
- **Title**: e.g. "5v3 rondo — press trigger"
- **Description**: e.g. "When ball goes back to the 3, front 5 press as a unit"
- **Scenario tag**: shows which canvas was used
- **Published**: whether squad can view it

---

## Pre-built exercise library

A set of common training exercises ships as hardcoded templates, same approach as the tactical animation pre-builts.

Suggested starters:

| Name | Scenario | Description |
|---|---|---|
| 4v2 Rondo | Small grid | Possession, trigger press on 6 passes |
| 5v3 Pressing Trap | Half pitch | Force play into corridor, trigger press |
| 3v2 Counter Attack | Half pitch | GK distributes, fast transition |
| Overload Wide | Wide corridor | 2v1 overlap, cutback or cross |
| Corner — Zonal | Final third | Zonal marking positions + first ball target |
| Build Out of Back | Full pitch | GK + 4 defenders vs 2 forwards |
| Finishing — 1v1 | Final third | Striker receives, turn and shoot |

---

## My recommendations

### 1. Blank grass as the default scenario
Coaches should not be forced to pick a scenario. If they tap "New exercise" and do nothing, they get a blank green canvas. The scenario picker is optional, not a mandatory first step.

### 2. Lines are the highest-value drawing tool
Zones and corridors are how coaches communicate space in training. Lines are simple to implement (two SVG points) and dramatically increase the usefulness of the board. Do these before anything else.

### 3. Cones are a nice addition but not MVP
A triangle marker adds colour and realism but is not blocking anything. Add in a later pass.

### 4. Player colour is more important than player labels
In a 5v3 drill the coach cares that there are 5 blue and 3 red — the exact label matters less. Default to auto-numbering (1, 2, 3…) per colour group.

### 5. Share the animation engine with tactical animations
Do not build two separate animation systems. The keyframe / lerp / playback engine should be a single shared component used by both the tactical board and the training board. This keeps the codebase lean.

### 6. This could be a sub-tab, not a new full tab
Rather than adding a 8th tab to the navigation, consider nesting this under the Training tab: **Training → Sessions | Exercises**. This keeps navigation clean and groups training-related content together.

---

## Data model

### New table: `training_exercises`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `team_id` | uuid | FK → teams |
| `name` | text | Title |
| `description` | text | Optional |
| `scenario` | text | blank / full / half / final-third / corridor / grid |
| `lines` | jsonb | Static zone lines drawn on the canvas |
| `published` | boolean | Visible to squad |
| `frames` | jsonb | Same frame format as animations, with variable player count |
| `created_at` | timestamptz | |

### `lines` JSON shape

```json
[
  { "id": "l1", "x1": 0.33, "y1": 0.0, "x2": 0.33, "y2": 1.0, "style": "dashed" },
  { "id": "l2", "x1": 0.66, "y1": 0.0, "x2": 0.66, "y2": 1.0, "style": "dashed" }
]
```

### `frames` JSON shape (variable players)

```json
[
  {
    "players": [
      { "id": "p1", "label": "1", "color": "blue",   "x": 0.30, "y": 0.50 },
      { "id": "p2", "label": "2", "color": "blue",   "x": 0.50, "y": 0.40 },
      { "id": "p3", "label": "A", "color": "red",    "x": 0.55, "y": 0.55 },
      { "id": "p4", "label": "GK","color": "yellow", "x": 0.50, "y": 0.90 }
    ],
    "ball": { "x": 0.30, "y": 0.50 }
  }
]
```

Note: `players` is a flat list (no "our" / "opp" split) — in training drills the distinction between teams is handled by colour, not position on the pitch.

---

## Complexity rating

**Medium** — lower than tactical animations because:
- The animation engine is shared (build once, use twice)
- No fixed 22-player constraint simplifies state management
- Line drawing is simple SVG (two points)

The only genuinely new work is: scenario backgrounds, dynamic player add/remove, line drawing tool, and the flat player colour model. Everything else is already built or planned.

Build order:
1. Scenario backgrounds (SVG variants)
2. Dynamic player add/remove with colour picker
3. Line drawing tool
4. Hook into shared animation engine
5. Pre-built exercise library
6. Sub-tab navigation under Training
