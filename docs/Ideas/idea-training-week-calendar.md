# Idea: Training Weekly Calendar View

**Status:** Built  
**Type:** Tab expansion  
**Related:** `docs/feature_tabs/03-training.md`, `idea-training-session-builder.md`

---

## The idea

Replace (or sit alongside) the current grouped-list view with a visual week grid — Mon through Sun as columns — where each day cell shows its scheduled sessions. The coach navigates week-by-week with arrows, sees training load distributed across the week at a glance, and clicks any day cell to add a session for that day with the date pre-filled.

---

## What already exists that makes this easier

- `training_sessions` table already stores `date`, `intensity`, `phase`, `objective`, `time`, `notes` — no schema changes needed.
- `TrainingClient.tsx` already has full CRUD logic (insert, update, delete) and a working form — only the display layer changes.
- `getWeekLabel()` already computes week start/end boundaries — that logic can be reused for week navigation.
- Intensity colour coding (`INTENSITY_STYLES`) is already defined and consistent — the calendar cells can use it directly.

---

## How it works

1. **Week header** — "Mon 2 Jun → Sun 8 Jun" with `<` / `>` arrows to navigate prev/next week. A "Today" button snaps back.
2. **7-column grid** — one column per day. Each column shows:
   - Day name + date number at the top, highlighted if today.
   - Session cards stacked vertically for any sessions on that day — showing objective (truncated), intensity badge, and time if set.
   - A small `+` icon at the bottom of each column.
3. **Adding a session** — clicking `+` on a day (or clicking an empty cell) opens the existing form with the date pre-populated. No other field changes.
4. **Editing / deleting** — clicking a session card in the grid opens the edit form (same as today).
5. **Empty day** — shows a subtle dashed border or muted "Rest day" label so the grid doesn't look broken.
6. **No sessions this week** — show an empty grid with a "No sessions planned" message in the centre, not just a blank page.

---

## My recommendations & enhancements

1. **Keep the list view as a toggle.** A "List / Week" toggle button lets coaches who have many past sessions still navigate them easily — the calendar is week-scoped so scrolling back 6 months is painful. List view stays useful for history.
2. **Intensity load bar under each day.** A small coloured bar (or dot row) showing the aggregate intensity of the day lets the coach read the week's physical load at a glance without opening any card. One dot per session, coloured by intensity.
3. **Mobile layout: stack to a day-scroll, not a 7-column grid.** Seven columns on a 375px screen is unreadable. On mobile, show a horizontal scrollable day strip (similar to a calendar app's week strip) where one day is "active" and its sessions are listed below. This is the correct pattern — don't try to cram 7 columns onto a phone.
4. **Pre-select the current week on load.** Always open on the week containing today, not week 0 of the dataset.
5. **Matches shown as reference markers.** If `matches` data is available (it already exists), show match days with a small amber badge in the column header. Coaches plan training around fixtures — seeing "MATCH" on Saturday makes the whole week's load planning obvious. This is low effort since match data is already fetched on the dashboard.

---

## My honest opinion

This is one of the best UI improvements you could make to the training tab. The grouped-list view is functionally correct but mentally wrong — a football coach doesn't think in "this week / next week" lists, they think in weekdays and weekly cycles. The calendar grid immediately communicates the shape of the week: how many sessions, where the rest days are, whether load is front-loaded or back-loaded before a Saturday match. The data model is already perfect for this, the form logic is already built, and the complexity is low. The only real risk is mobile — don't ship a 7-column grid on small screens, it will look terrible. Solve the mobile layout before calling this done.

---

## Data model

No schema changes required. All fields needed (`date`, `intensity`, `phase`, `objective`, `time`) already exist on `training_sessions`.

---

## Complexity rating

**Medium**

The logic is straightforward but the layout work is meaningful — especially getting the mobile responsive behaviour right. The form can be reused as-is.

Recommended build order:
1. Build the week grid component (desktop only first) — columns, navigation, session cards using existing data.
2. Wire the `+` day click to open the existing form with date pre-filled.
3. Add the List / Week toggle so neither view is lost.
4. Solve the mobile layout (day-strip + single-day detail panel).
5. Add the intensity load indicator per day.
6. Add match day markers (optional enhancement, low effort once the rest is done).
