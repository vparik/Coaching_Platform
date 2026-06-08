# Idea: GPS Wearables Live Board

**Status:** Under review  
**Type:** Platform expansion  
**Related:** `docs/feature_tabs/03-training.md`, `docs/feature_tabs/07-tactics.md`, `idea-training-exercise-animator.md`

---

## The idea

During a training session, coaches open a live board on their device that shows each player's real-time position on a pitch, pulled from GPS wearables (vests or tracker units). After the session ends the coach can replay the session, inspect individual player heatmaps, and compare distance covered, sprint counts, and top speeds across the squad.

---

## What already exists that makes this easier

- **Drill board** (`/training/board`) — an animated SVG canvas with player circles dragged around a pitch. The coordinate system (`100×140` viewBox), rendering logic, and player labelling already exist. A live board would reuse this canvas layer.
- **Tactics board** (`/tactics`) — player positioning logic with named player nodes. The squad-linked label approach carries over.
- **`players` table** — player IDs, names, and positions already stored. GPS data maps to these rows.
- **Training sessions table** — a session record already exists to attach GPS data to.
- **Real-time infra (Supabase)** — Supabase has a Realtime channel feature (Postgres changes + broadcast). It can push position updates to the board without a separate WebSocket server.

Nothing in the current UI handles streaming data or wearable hardware — those are net-new layers.

---

## How it works

### During a session (live mode)
1. Coach opens Training → selects the active session → taps "Live Board".
2. Each player's vest pushes a GPS position (lat/lon or normalised pitch coords) to a backend endpoint every ~1–2 seconds.
3. The board renders a full-pitch canvas. Player circles move in real time to their current GPS position.
4. Sidebar shows per-player live stats: distance covered, current speed, sprint count.
5. Coach can tap a player circle to isolate their track.

### After a session (review mode)
1. Session card gains a "GPS Review" button once data exists.
2. Coach sees a heatmap overlay on the pitch (density coloring where a player spent the most time).
3. Playback scrubber to replay the entire session at 1×, 2×, 4× speed.
4. Summary table: distance, max speed, sprint count, avg heart rate (if HR wearable).
5. Export as PDF or share link (optional, v2).

---

## My recommendations & enhancements

1. **Normalise GPS to pitch coords immediately at ingestion** — raw lat/lon is useless for the canvas. The first thing the backend must do is map GPS coordinates to the `100×140` viewBox using the pitch's corner anchors. Store normalised coords, not lat/lon.
2. **Decouple hardware from the platform via a generic API** — don't build for one GPS vendor. Define a simple `/api/gps-ingest` endpoint that accepts `{ session_id, player_id, x, y, timestamp, speed }`. Then any wearable vendor (Catapult, STATSports, a custom Arduino vest) can push to it. This avoids a vendor lock-in rebuild later.
3. **Supabase Realtime broadcast channel for the live board** — no need for a separate WebSocket server. The GPS ingestion writes to a `gps_events` table, Supabase broadcasts the change, and the browser client subscribes. This fits the existing architecture cleanly.
4. **Heatmap as a canvas layer** — render heatmaps client-side using a density grid computed from stored positions. A library like `simpleheat` (1KB) can do this on a canvas overlay. No server-side image generation needed.
5. **Privacy / player consent** — if players ever get accounts (see `idea-player-access.md`), they should be able to see their own GPS data but not other players'. Store this explicitly in the data model now.
6. **Offline tolerance** — GPS vests lose signal. Design the ingestion to accept late/batched pushes with timestamps, not just live streaming. Post-session reconstruction must be possible.

---

## My honest opinion

This is a genuinely powerful idea and the kind of feature that separates a serious coaching platform from a basic scheduling tool. GPS analytics is the direction the whole industry is heading, and coaches who already use Catapult or STATSports know the value. The problem is **this is a platform expansion, not a feature** — it requires GPS hardware, a real-time ingestion pipeline, a storage layer for high-frequency time-series data (potentially millions of rows per session), and vendor integrations. None of that is in the current stack. For an MVP being tested with real coaches, it would be premature to build this now — the ROI of getting the core planning and communication features right first is much higher. The right move is to note the architecture decisions that make this possible later (normalised coords, Supabase Realtime) and keep them in mind when touching the training and tactics boards. Come back to this when you have coaches who are already using GPS hardware and are explicitly asking for it in the platform.

---

## Data model

### New tables

```sql
-- Stores all GPS position snapshots for a session
CREATE TABLE gps_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id   uuid REFERENCES players(id) ON DELETE CASCADE,
  team_id     uuid REFERENCES teams(id) ON DELETE CASCADE,
  x           float4 NOT NULL,          -- normalised 0–100 pitch width
  y           float4 NOT NULL,          -- normalised 0–140 pitch length
  speed       float4,                   -- m/s at this snapshot
  recorded_at timestamptz NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX ON gps_events (session_id, player_id, recorded_at);

-- Aggregated per-player, per-session summary (computed after session ends)
CREATE TABLE gps_session_summaries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id         uuid REFERENCES players(id) ON DELETE CASCADE,
  team_id           uuid REFERENCES teams(id) ON DELETE CASCADE,
  distance_m        float4,
  max_speed_ms      float4,
  sprint_count      int,
  high_intensity_m  float4,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (session_id, player_id)
);
```

### Changes to existing tables

None required. GPS data is linked to `training_sessions` and `players` via foreign keys.

---

## Complexity rating

**Very High**

This requires: hardware/vendor integration, a real-time ingestion API (new infrastructure), high-frequency time-series storage with good indexing, a live-updating canvas UI, heatmap rendering, and a replay system. Each of those is independently a medium-complexity build. Together they are a multi-week project that also depends on having compatible hardware to test with.

**Recommended build order (when the time is right):**
1. Define and document the ingest API contract (`/api/gps-ingest` payload shape) — no code, just spec.
2. Create the `gps_events` and `gps_session_summaries` tables.
3. Build the static post-session review board — heatmap + summary table from stored data. No live streaming yet.
4. Add the Supabase Realtime broadcast channel and build the live board (positions only, no stats sidebar).
5. Add the live stats sidebar (distance, speed, sprints) using the streaming data.
6. Test with a real GPS vendor pushing to the ingest endpoint.
7. Add playback scrubber and speed controls (reusing drill board animation logic).
