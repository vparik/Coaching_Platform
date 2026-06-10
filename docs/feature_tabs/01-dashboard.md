# Dashboard — "This Week"

**Route:** `/`

The Dashboard gives an at-a-glance summary of the current week. Content adapts based on the user's role.

---

## What's on screen

### Next Match
Shows the closest upcoming match: opponent name, date, venue, and a countdown chip ("Today", "Tomorrow", "Xd away" — turns red when ≤ 2 days out).

- **Coach:** "Match prep needed" links to Match Prep tab. Empty state shows "Add a match" link.
- **Player:** "Prep not ready yet" shown as non-clickable text. No "Add a match" link.

### Training This Week
Mini calendar grid showing every training session for the current Mon–Sun week. Each session block shows objective, intensity colour (blue / amber / red).

- **Coach:** "No sessions planned — tap to add" empty state with link.
- **Player:** "No sessions this week" — no add prompt.

### Squad Status
Three counters: **Available**, **Injured**, **Absent**. Only counts players with `left_at IS NULL`.

- **Coach:** "Manage" link to Squad tab.
- **Player:** No "Manage" link.

### Team Hub (latest messages)
The three most recent messages. "View all" links to Team Hub.

- **Coach:** Empty state shows "Post to squad" link.
- **Player:** No "Post to squad" link.

---

## Key behaviour
- All data is fetched server-side on every page load — no stale cache.
- Role is fetched alongside team_id in the same profiles query.
- `players` query filters `left_at IS NULL` so removed players don't skew the squad counts.
