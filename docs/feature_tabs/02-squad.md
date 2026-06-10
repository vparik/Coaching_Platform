# Squad Management

**Route:** `/squad`

The Squad tab serves two audiences depending on the user's role.

---

## Coach view

The coach's single source of truth for the playing group. Every player on the roster lives here with their profile, current availability, private coaching notes, and account link status.

### Join Code banner
Displayed at the top of the Squad tab. The coach shares this 8-character code with players so they can register and self-link. A **Copy** button puts it in the clipboard.

### Player card badges
Each player card shows one of two badges next to their name:
- **Green "linked"** — the player has a registered account linked to this record
- **Grey "no account"** — the player has no registered account yet

### Player profile fields

| Field | Values |
|---|---|
| Name | Free text |
| Position | GK, CB, LB, RB, CDM, CM, CAM, LW, RW, ST, CF |
| Age | Number |
| Preferred Foot | Left / Right / Both |
| Nationality | Free text |
| Private Notes | Free text (coach only — never visible to players) |
| Availability Status | Available / Injured / Absent / Unknown |

### Actions

**Add a player** — tap "+ Add Player" to expand the inline form.

**Edit a player** — tap Edit in the expanded panel to pre-fill the form.

**Remove a player** — soft-delete: sets `left_at` on the player row and clears any linked profile's `player_id`. Player history is preserved. Uses the `remove_player_from_team` RPC.

**Unlink account** — visible only for linked players (green badge). Clears the account link without removing the player from the squad. The player can re-claim their record. Uses the `unlink_player_account` RPC.

**Update availability** — inline status dropdown on every card, no form required.

---

## Player view

Players see only their own profile card under "My Profile".

### What players can do
- Update their own **availability status** (the inline dropdown)
- **Edit Profile** — opens a form to update name, position, age, preferred foot, nationality (private notes field is hidden)

### What players cannot do
- See other players' profiles
- See private notes
- Add or remove players

---

## Key behaviour
- Active squad only: players with `left_at` set are excluded from the coach list.
- Private notes are stored in the database but never exposed in the player view.
- Availability counts on the Dashboard are driven by this data.
- `linkedPlayerIds` is fetched from `profiles` on the server — requires the `profiles_select_team` RLS policy.
