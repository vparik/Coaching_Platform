# Squad Management

**Route:** `/squad`

The Squad tab is the coach's single source of truth for the playing group. Every player on the roster lives here with their profile, current availability, and private coaching notes.

---

## Player profile fields

| Field | Values |
|---|---|
| Name | Free text |
| Position | GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST, CF |
| Age | Number |
| Preferred Foot | Left / Right / Both |
| Nationality | Free text |
| Private Notes | Free text (only the coach sees this) |
| Availability Status | Available / Injured / Absent / Unknown |

---

## Actions

### Add a player
Tap "+ Add Player" to expand the inline form. Fill in the fields and submit — the player appears immediately in the alphabetically sorted list.

### Edit a player
Tap the edit icon on any player card to pre-fill the form with existing data. Save to update.

### Delete a player
Tap the delete icon. The player is permanently removed from the squad.

### Update availability
Each player card has quick-tap buttons to cycle the availability status without opening the edit form. Status colours:
- Green → Available
- Red → Injured
- Amber → Absent
- Grey → Unknown

### Expand a player card
Tap anywhere on a player row to expand it and see all details including private notes.

---

## Key behaviour
- Players are sorted alphabetically by name.
- Private notes are stored in the database but are never exposed to players — they are only visible on the coach-facing UI.
- Availability counts on the Dashboard are driven by this data.
