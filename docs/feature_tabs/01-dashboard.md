# Dashboard — "This Week"

**Route:** `/`

The Dashboard is the coach's daily command centre. It gives an at-a-glance summary of everything happening in the next 7 days without the coach needing to navigate to any other tab.

---

## What's on screen

### Next Match
Shows the closest upcoming match: opponent name, date, venue (Home / Away / Neutral), and a countdown chip ("Today", "Tomorrow", "Xd away" — turns red when ≤ 2 days out).

A status indicator tells the coach whether Match Prep has been completed for that fixture:
- Green checkmark → "Match prep done"
- Amber warning → "Match prep needed" (links directly to the Match Prep tab)

### Training This Week
Lists every training session scheduled between today and 7 days from now. Each session card shows:
- Objective
- Date & time
- Intensity badge (Low / Medium / High, colour-coded blue / amber / red)

"View all" links to the full Training Planner.

### Squad Status
Three counters showing how many players are **Available**, **Injured**, and **Absent** right now. Tapping "Manage" goes to the Squad tab.

### Team Hub (latest messages)
The three most recent messages posted to the squad. Each card shows the message text (truncated at 2 lines) and the date it was posted. "View all" goes to the full Team Hub.

---

## Key behaviour
- All data is fetched server-side on every page load — no stale cache.
- Empty states show friendly prompts with direct links to create the missing content (e.g. "Add a match", "Plan training", "Post to squad").
