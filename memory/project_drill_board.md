---
name: project-drill-board
description: Training Exercise Drill Board feature — what was built, current state, SQL migration needed
metadata:
  type: project
---

Drill board is built and live at `/training/board?id=<exercise-id>`. Linked from the Library tab via a "Board" button on each exercise card.

**Phase 1 (static board):** scenarios, draggable players (blue/red/yellow), draggable ball, zone line drawing (solid/dashed).

**Phase 2 (animation):** frame-by-frame keyframe system, smooth lerp playback via rAF, movement arrows, speed/loop controls.

**SQL migration still required before board saves work:**
```sql
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS board jsonb;
```
File: `supabase-board-migration.sql` in project root.

**Data stored in:** `exercises.board` JSONB column with shape `{ scenario, lines, frames: [{players, balls}] }`.

**Coordinates:** absolute within 100×140 viewBox (NOT 0–1 relative like the tactics board).

**Why:** coordinates distinguish the two boards — tactics uses relative, drill board uses absolute. Don't mix them up when editing either component.

**How to apply:** when touching BoardClient.tsx or anything reading exercises.board, remember the migration may not have been run in prod yet — check with user.
