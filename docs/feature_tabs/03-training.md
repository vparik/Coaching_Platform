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
