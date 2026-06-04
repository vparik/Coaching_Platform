# Match Log

**Route:** `/matches`

The Match Log is the complete record of all fixtures — past results and upcoming games. The coach can log results and rate every player's individual performance after each match.

---

## Match fields

| Field | Values |
|---|---|
| Opponent | Free text |
| Date | Date picker |
| Venue | Home / Away / Neutral |
| Result | Score string, e.g. "2-1" (filled in after the match) |
| Notes | Free text (optional — post-match thoughts, context) |

---

## Screen layout

Matches are split into two sections:

- **Upcoming** — matches today or in the future (no result yet)
- **Past** — matches before today (result shown with W / D / L colour coding)

Each match card shows opponent, date, venue, and result. Tap to expand for full details and player ratings.

---

## Player ratings

After a match the coach can rate every player in the squad on a **1–10 scale**.

1. Tap "Rate Players" on a match card.
2. A rating input appears for each squad member.
3. Enter a score (0 = not rated / did not play).
4. Tap "Save Ratings".

Ratings are displayed inside the expanded match card alongside each player's name and position.

---

## Result colour coding

The result chip on past match cards is colour-coded automatically based on the scoreline:
- **Green** — Win (our score > opponent score)
- **Amber** — Draw
- **Red** — Loss

---

## Actions

| Action | How |
|---|---|
| Add a match | Tap "+ Add Match", fill in the form |
| Delete a match | Tap the delete icon on the card |
| Log a result | Edit the match and enter the result score string |
| Rate players | Tap "Rate Players" on a past match |

---

## Key behaviour
- A match added here also becomes available in Match Prep (upcoming) and will appear in the Dashboard "Next Match" widget.
- Player ratings are stored per-match and per-player. Re-saving ratings for a match replaces all previous ratings for that match (delete + re-insert).
- The result field accepts any string, but the W/D/L colour logic parses it as "ourScore-theirScore".
