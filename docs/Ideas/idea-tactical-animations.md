# Idea: Tactical Animations — Build-up, Press & Movement Sequences

**Status:** Under review  
**Type:** Tactics tab — Phase 2 expansion  
**Reference:** https://tactical-board.com/uk/big-football/animation

---

## The idea

Coaches can build animated tactical sequences directly on the pitch — build-up plays, pressing triggers, set piece runs. Each animation has a title and description, lives in a personal library, and can be shared with the squad so players visualise the strategy before a match. A pre-built library of common patterns gives coaches a starting point rather than building from scratch every time.

---

## What already exists that makes this easier

This is Phase 2 we already planned — the foundation is solid:

- The pitch SVG is built and resolution-independent
- All player positions are already stored as relative x/y coordinates (0–1) — interpolation between frames works directly on these values
- The `tactics` table already stores position JSON — animations extend the same pattern
- SVG supports smooth transitions natively — no canvas rewrite needed

---

## Starting point — loading a saved tactic

The coach should **never have to place 22 players from scratch**. When creating a new animation, they are first asked: "Start from a saved tactic or use default?"

```
┌─────────────────────────────────────────┐
│  Start animation from...                │
│                                         │
│  ○  My saved tactic  [ dropdown ▾ ]     │
│  ○  Default (4-4-2 vs 4-4-2)  ← preset │
│                                         │
│  [ Start ]                              │
└─────────────────────────────────────────┘
```

- **Load from saved tactic**: populates Frame 1 with the exact positions from an existing tactic (both teams). The coach's real formation is the baseline — they just animate movement on top of it.
- **Default**: falls back to a standard 4-4-2 vs 4-4-2 so there is always something to work with even if no tactics have been saved yet.

This means the `tactics` library and the `animations` feature share data — a saved tactic becomes the canvas for an animation. No duplication of work.

---

## How it works — the keyframe model

An animation is a sequence of **frames**. Each frame is a full snapshot of every player's position plus the ball.

```
Frame 1 → Frame 2 → Frame 3 → Frame 4
(kick-off)  (GK plays   (CB switches)  (winger receives)
             to CB)
```

The coach builds it step by step:
1. Choose starting tactic (or default) → becomes Frame 1
2. Drag players and ball to next position
3. Tap **"Add Frame"** — saves current state as Frame 2
4. Repeat for as many movements as needed
5. Give it a title ("High press trigger") and description
6. Save to library

Playback smoothly interpolates between frames (linear lerp on x/y). The coach can also step through frame by frame for a coaching session.

---

## The ball

A yellow circle, draggable like a player circle. It is the central element for build-up animations and should be present in every frame. Without the ball, pressing animations have no reference point either.

---

## Playback controls

| Control | What it does |
|---|---|
| ▶ Play | Animates through all frames automatically |
| ⏸ Pause | Freezes at current interpolated position |
| ◀ / ▶ Step | Move one frame back or forward |
| Speed | Slow / Normal / Fast |
| Loop | Replays continuously (useful for squad viewing) |

---

## Movement arrows (auto-generated)

No need for the coach to manually draw arrows — they are auto-generated from the position delta between consecutive frames. If a player moves more than a threshold distance between Frame N and Frame N+1, a directional arrow is drawn on the pitch showing the intended run.

This is simpler to build than a manual arrow tool and looks just as good for 90% of use cases.

---

## Pre-built animation library

A curated set of common tactical patterns ships with the app as hardcoded JSON — no database needed. The coach picks one, it loads onto the pitch, and they can edit it or save it as their own.

Suggested starter library:

| Name | Description |
|---|---|
| High Press — 4-4-2 | Coordinated press trigger from striker |
| Build Out of Back | GK → CB → CDM triangle |
| Counter Press | Immediate press after losing possession |
| Overlapping Full Back | Wide overload, winger cuts inside |
| Half-space Run | CAM and striker interchange |
| Corner — Near Post Flick | Set piece attacking sequence |
| Offside Trap | Defensive line stepping up in unison |

These are enough to make the feature feel rich on day one without any content-creation work.

---

## Animation library (saved)

Each team has their own saved animations shown as a list (not just a dropdown) because animations have titles and descriptions worth displaying:

```
┌─────────────────────────────────────┐
│  High press vs 4-3-3    2 frames    │
│  "Trigger when ball hits CB"        │
├─────────────────────────────────────┤
│  Build-up from keeper   4 frames    │
│  "Wide then switch"                 │
└─────────────────────────────────────┘
```

Tap to load and play. Tap to edit.

---

## Sharing with the squad

Once players have access (see player-access idea), the coach can mark an animation as **"Published to squad"**. It appears in the player's view as a read-only, playable sequence — they watch it before training or a match. This is the direct equivalent of a video clip but interactive and no video production needed.

---

## My recommendations

### 1. Saved tactic as starting point is the right UX
Forcing the coach to place 22 players every time they create an animation is a deal-breaker. The tactic library → animation pipeline makes both features more valuable and removes friction completely.

### 2. Keep animations separate from static tactics
The `tactics` table stores formations (static snapshots). Animations need their own `animations` table with a `frames` JSONB array. They reference a tactic as a starting point but are stored independently.

### 3. The ball is non-negotiable
Without a draggable ball, build-up animations are meaningless. It must be part of the MVP for this feature, not a later addition.

### 4. Auto-arrows are good enough for Phase 1
Manual arrow drawing adds significant UI complexity. Auto-generating arrows from position deltas looks just as good and requires zero additional interaction.

### 5. Skip video export for now
Generating a video file requires server-side rendering. Share by showing the screen or via link for MVP.

### 6. Frame limit of 8–10
More than 10 frames gets hard to follow. Soft-limit at 10 with a clear frame counter ("3 / 10").

### 7. Landscape mode for animations
The maximize modal (already built) makes animations more usable on mobile — the coach can show the full pitch to the squad without a full landscape redesign.

---

## Data model

### New table: `animations`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `team_id` | uuid | FK → teams |
| `name` | text | Coach-given title |
| `description` | text | Optional context ("use when...") |
| `source_tactic_id` | uuid | FK → tactics (optional — which tactic was Frame 1) |
| `published` | boolean | Whether squad can see it |
| `frames` | jsonb | Array of frame snapshots (see below) |
| `created_at` | timestamptz | |

### `frames` JSON shape

```json
[
  {
    "our": [{ "id": "GK", "label": "GK", "x": 0.50, "y": 0.93 }],
    "opp": [{ "id": "GK", "label": "GK", "x": 0.50, "y": 0.07 }],
    "ball": { "x": 0.50, "y": 0.93 }
  },
  {
    "our": [{ "id": "GK", "label": "GK", "x": 0.50, "y": 0.85 }],
    "opp": [{ "id": "GK", "label": "GK", "x": 0.50, "y": 0.07 }],
    "ball": { "x": 0.38, "y": 0.79 }
  }
]
```

The frame array extends the same `PlayerPos` type already used in `tactics`.

---

## Complexity rating

**High** — but well-scoped. The pitch and drag system are done. The new work is:

1. "Start from tactic" picker (default + saved tactic dropdown)
2. Frame management UI (add, delete, reorder frames)
3. Ball as a draggable element
4. Interpolation / playback engine
5. Auto-arrow generation from position deltas
6. Pre-built library JSON (content work, not engineering)
7. Animations list UI + publish toggle
8. Player-facing read-only view (depends on player access idea)

Recommended build order matches the list above.
