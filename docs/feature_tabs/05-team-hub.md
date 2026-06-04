# Team Hub

**Route:** `/team-hub`

The Team Hub is the coach-to-squad communication channel. The coach posts messages that the whole squad can read, and the platform tracks which players have seen each message.

---

## Posting a message

Tap the compose area at the top of the screen, type the message, and hit "Post". The message appears at the top of the feed immediately.

Messages support:
- **Text** — plain text announcements, reminders, motivational notes
- **Media URL** — optional link to an external image or video (e.g. a clip for tactical review)

---

## Message feed

Messages are shown in reverse-chronological order (newest first). Each message card displays:
- Message content
- Date posted
- **"Seen by X / Y players"** — how many players out of the total squad have viewed the message

---

## Read receipt tracking

Every time a player opens the Team Hub or a specific message, a view record is written to the database (`message_views` table). The coach sees the running count on each message card so they know how many players have actually seen important information.

---

## Actions

### Post a message
Fill in the compose form and submit.

### Delete a message
Tap the delete icon on any message card to remove it (coach only).

---

## Key behaviour
- The Dashboard "Team Hub" widget shows the 3 most recent messages as a preview.
- View counts update in real time as players read messages.
- The `total_players` count used for the "X / Y" fraction is pulled from the live squad size at render time.
