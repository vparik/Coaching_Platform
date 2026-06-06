# Training Planner

**Route:** `/training`

The Training Planner has two views toggled by a **Week / List** button in the header. The default is the **Week calendar view**.

---

## Session fields

| Field | Values |
|---|---|
| Date | Date picker |
| Time | Time picker (optional) |
| Objective | Free text — what the session is designed to achieve |
| Intensity | Low / Medium / High |
| Phase | Recovery / Prep / Development |
| Notes | Free text (optional — drill details, focus points, etc.) |

---

## Intensity & Phase explained

**Intensity** describes physical load:
- **Low** — light work, recovery-focused
- **Medium** — moderate load, standard training
- **High** — demanding session, match-level intensity

**Phase** describes tactical purpose:
- **Recovery** — post-match regeneration
- **Prep** — match-specific preparation
- **Development** — skill building and team shape work

---

## Week view (default)

- `<` / `>` arrows navigate week-by-week (Mon–Sun). "Today" snaps back to the current week.
- **Desktop:** 7-column grid — one column per day. Sessions appear as cards inside the day column. Hover a card to reveal a delete ×. Click a card to edit. Click "+ Add" at the bottom of any column to add a session with the date pre-filled.
- **Mobile:** horizontal day strip — tap a day to select it and see its sessions below. A dot on the strip indicates sessions exist. A small amber dot marks match days.
- Each column shows intensity load dots (blue / amber / red) beneath the session cards.
- Match days show an amber "vs Opponent" badge in the column header.

## List view

Sessions grouped into "This Week", "Next Week", and "Week of …" buckets. The "+ New Session" button appears in list view only. Edit and delete buttons on each card.

## Actions

### Add a session
**Week view:** Click `+ Add` on any day column (desktop) or "Add session for this day" (mobile) — date is pre-filled. Fill in the remaining fields and submit.
**List view:** Tap "+ New Session" in the header.

### Edit a session
Click a session card to open the edit form (pre-filled). A Delete button is also available inside the edit form.

### Delete a session
Click the × on a session card (desktop hover), the Delete button inside the edit form, or the Delete button on the mobile session card.

---

## Key behaviour
- Week view always opens on the current week.
- Match data is fetched on the training page and passed to the client — match days show as reference markers without requiring navigation to Match Log.
- Intensity is colour-coded consistently (blue / amber / red). Load dots give a per-day physical load summary at a glance.
- The Dashboard "Training This Week" widget still pulls from today through the next 7 days of this data.

---

## Exercise Library (Library tab)

A personal library of reusable training exercises accessible via the **Library** tab in the Training header.

Each exercise has: name, category, default duration (minutes), description.

**Categories:** Warm-up / Technical / Tactical / Physical / Set Piece / Cool-down / General

Exercises are grouped by category in the library view. Actions per exercise: Edit, Delete, Board.

### Session builder

When creating or editing a session, the Training Plan section lets coaches build an ordered list of blocks. Each block is either:
- **From Library** — pick an exercise from a grouped dropdown; duration pre-fills from exercise default
- **Custom** — free-text one-liner for one-off items

Blocks are reorderable (↑ ↓ arrows) and the total duration is summed automatically.

---

## Drill Board (`/training/board?id=<exercise-id>`)

Each library exercise has an animated drill board. Accessed via the **Board** button on the exercise card.

### Layout
Side-by-side on the board page: canvas on the left, controls on the right. Expand button (⤢) opens a fullscreen modal.

### Scenarios (canvas backgrounds)
Blank · Full Pitch · Half Pitch · Final Third · Small Grid · Corridor

### Elements
- **Players**: Blue / Red / Yellow circles, auto-numbered per colour. Add / Remove per colour group. Draggable.
- **Ball**: Football icon (~half player size). Add / Remove. Draggable.
- **Lines**: Zone lines drawn as solid or dashed yellow lines. Click start → click end. Undo last line. Lines are static — they persist across all frames.
- **Movement arrows**: Shown on the canvas when not playing — dashed arrows from current frame positions to next frame positions.

### Animation (Phase 2)
Frame-by-frame keyframe animation with smooth interpolation.

**Frame strip** — row of numbered frame buttons below the canvas. Click to jump to a frame. Hover to reveal delete ×. `+` adds a new frame (copies current positions as starting point).

**Playback controls:**
- ▶ Play / ⏸ Pause
- ◀ ▶ Step through frames
- ↺ Reset to frame 1
- Speed: Slow (0.5×) / Normal (1×) / Fast (2×)
- Loop toggle

Playback uses `requestAnimationFrame` with linear interpolation between keyframes — players and ball lerp smoothly between recorded positions matched by ID.

### Data model
Board data is stored as `board jsonb` on the `exercises` table.

```json
{
  "scenario": "full-pitch",
  "lines": [{ "id": "...", "x1": 30, "y1": 0, "x2": 30, "y2": 140, "style": "dashed" }],
  "frames": [
    { "players": [{ "id": "b1", "color": "blue", "label": "1", "x": 45, "y": 60 }], "balls": [] },
    { "players": [{ "id": "b1", "color": "blue", "label": "1", "x": 70, "y": 40 }], "balls": [] }
  ]
}
```

Coordinates are absolute within the `100×140` viewBox (not 0–1 relative — unlike tactics board).

SQL migration required: `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS board jsonb;`
