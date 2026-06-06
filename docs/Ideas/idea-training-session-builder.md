# Idea: Training Session Builder — Exercise Library + Structured Sessions

**Status:** Built  
**Type:** Training tab — full rethink  
**Related:** idea-training-exercise-animator.md (exercises can have animations attached)

---

## The idea

The coach builds a personal library of training exercises. When planning a session, instead of writing a single free-text "objective", they structure the session as an ordered list of exercises with durations — like a programme. Each block references an exercise from their library. The result is a full training plan the coach can follow on the pitch and optionally share with the squad.

Example session plan:
```
Tuesday 14 Oct — High intensity — Prep phase
─────────────────────────────────────────────
 15 min  Warm-up rondo 5v2
 20 min  Pressing drill — corridor trap
 25 min  Possession 7v7 + 2 neutrals
 20 min  Set piece — corner routine A
 10 min  Cool-down — light running
─────────────────────────────────────────────
 Total: 90 min
```

---

## Why this is the right evolution of the Training tab

The current tab stores sessions with a single "objective" field — a free-text string. This works for simple logging but gives the coach no structure to build upon. Coaches don't think in single objectives — they think in blocks. A warm-up is always a warm-up. A rondo is always a rondo. Making exercises reusable means:

- Less typing — pick from the library instead of describing it every time
- Consistency — the same exercise has the same name and description everywhere
- Building value over time — the library grows and becomes more useful the more the coach uses it
- Foundation for animations — exercises in the library can have animations attached (via the training animator idea)

---

## Two-layer structure

### Layer 1 — Exercise Library
A collection of named, reusable exercises the coach creates once and references many times.

Each exercise has:
| Field | Notes |
|---|---|
| Name | "Rondo 5v2", "Corner routine A", "High press drill" |
| Category | Warm-up / Technical / Tactical / Physical / Set Piece / Cool-down |
| Default duration | Minutes — used as the starting value when adding to a session |
| Description | Instructions, coaching points, rules |
| Animation | Optional — links to a training exercise animation (from the animator feature) |

### Layer 2 — Training Sessions
A session is a date + intensity + phase + an ordered list of **exercise blocks**, each block referencing a library exercise with a duration override.

```
Session
 ├── date, time, intensity, phase
 └── blocks (ordered):
      ├── block 1: exercise_id → "Rondo 5v2",        duration: 15 min
      ├── block 2: exercise_id → "Corridor press",   duration: 20 min
      ├── block 3: exercise_id → "7v7 possession",   duration: 25 min
      ├── block 4: exercise_id → "Corner routine A", duration: 20 min
      └── block 5: exercise_id → "Cool-down run",    duration: 10 min
```

A block can also be **free text** (no library reference) for one-off items the coach doesn't want to save permanently — "Team talk", "Video analysis", etc.

---

## Session builder UI flow

1. Coach taps "+ New Session"
2. Sets date, time, intensity, phase (same as today)
3. Then sees a block list below with an "+ Add block" button
4. Tapping "+ Add block" shows two options:
   - **From library** → dropdown or search of existing exercises
   - **Free text** → quick one-liner
5. Each block shows: exercise name, duration (editable), small category badge
6. Blocks are reorderable (drag to reorder)
7. Session total time is calculated automatically from block durations
8. Save session

---

## Library management UI

A separate section (sub-tab or page) within Training:

**Training → Sessions | Library**

The library view shows all exercises grouped by category. From here:
- Add new exercise (name, category, duration, description)
- Edit or delete existing exercises
- View which sessions an exercise has been used in
- Tap to open the animation builder for this exercise (if the animator is built)

---

## Connection to training exercise animator

The Exercise Library and the Training Exercise Animator are the same feature viewed from two angles:

- The **library** is the catalogue
- The **animator** is the tool to create visual content for each exercise

When a coach creates an animation in the animator, it is attached to an exercise in the library. When that exercise appears in a session plan and is shared with the squad, players can tap the exercise to watch the animation. This is the full loop.

---

## My recommendations

### 1. This should replace, not extend, the current Training tab
The current session form is a subset of this. The new structure is strictly better and backwards-compatible — existing sessions can be migrated by treating the "objective" as a single free-text block. Don't keep both UIs.

### 2. The library is the most valuable part — build it first
Sessions can remain simple (free text blocks) for the first release. The library is what accumulates value over time. Ship the library even before the full structured session builder if needed.

### 3. Free-text blocks are essential
Coaches will always have one-off items ("pre-match talk", "video session", "meeting with physio"). Don't force everything to be a library exercise or the UX breaks down.

### 4. Duration auto-sum is a small detail with outsized impact
Showing "Total: 90 min" at the bottom of the plan — automatically calculated — makes the whole feature feel considered. Coaches plan to the minute.

### 5. Keep intensity and phase at the session level, not the block level
A session has one intensity and one phase. Individual exercises don't need these — it would over-complicate the model for minimal gain.

### 6. This is the foundation for squad-facing content
When players get access, a published session plan lets them know what's coming at training. They can see the exercises, tap for descriptions, watch animations. Much more engaging than just "Training — Tuesday 15 Oct."

---

## Data model

### New table: `exercises` (the library)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `team_id` | uuid | FK → teams |
| `name` | text | |
| `category` | text | warm-up / technical / tactical / physical / set-piece / cool-down |
| `default_duration` | int | Minutes |
| `description` | text | |
| `animation_id` | uuid | FK → training_exercises (optional, from animator feature) |
| `created_at` | timestamptz | |

### Changes to `training_sessions`

The existing table keeps `date`, `time`, `intensity`, `phase`. The `objective` and `notes` fields are replaced by the blocks structure below. For backwards compatibility, `notes` can stay as a session-level notes field.

Remove: `objective` (replaced by blocks)
Keep: `date`, `time`, `intensity`, `phase`, `notes`

### New table: `session_blocks` (the structured plan)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `session_id` | uuid | FK → training_sessions |
| `exercise_id` | uuid | FK → exercises (nullable — null = free-text block) |
| `free_text` | text | Used when exercise_id is null |
| `duration` | int | Minutes (overrides exercise default) |
| `position` | int | Order within the session (0, 1, 2…) |

---

## Complexity rating

**Medium.** The data model is straightforward. The most complex UI element is the drag-to-reorder block list within the session builder — but lightweight libraries exist for this (`@dnd-kit/core` or a simple manual implementation). Everything else is forms and lists.

Build order:
1. `exercises` table + Library UI (add, edit, delete, categorise)
2. `session_blocks` table + updated session form (replace objective field with block list)
3. Duration auto-sum in session builder
4. Reorderable blocks
5. Animation attachment to exercises (depends on animator feature)
6. Squad-facing session view (depends on player access feature)
