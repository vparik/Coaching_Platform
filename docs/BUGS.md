# Known Bugs & Pending Fixes

Issues captured for the next session. Each entry has enough context to fix without re-investigating.

---

## 1. Horizontal pitch view — wing/back positions are mirrored

**Where:** Tactics board and Lineup panel — horizontal orientation (landscape mode)  
**Symptom:** When the pitch is rotated to horizontal, left-side positions (LW, LB, LM, etc.) appear on the right and vice versa. LW should still be on the left wing, but it renders on the right.  
**Likely cause:** The horizontal transform rotates the SVG 90° but doesn't account for the fact that the x/y axes swap. Position labels and coordinates need to be mirrored on the x-axis when switching to horizontal.  
**Files to check:** `src/components/tactics/TacticsClient.tsx`, `src/components/match-prep/LineupPanel.tsx` — the `isHorizontal` transform logic.

---

## 2. No sign-out button on the claim page

**Where:** `src/app/auth/claim/page.tsx`  
**Symptom:** A player who entered the wrong join code (or is stuck on the claim page for any reason) has no way to sign out — they're trapped.  
**Fix:** Add a subtle "Sign out" link at the bottom of the claim page that calls `supabase.auth.signOut()` and redirects to `/auth/login`.

---

## 3. Login page does not support player join code

**Where:** `src/app/auth/login/page.tsx`  
**Symptom:** When a player logs in (returning visit), they don't need a join code. But if someone wants to register as a player directly from the login page, there's no path. More importantly — if a player's `player_id` is null (unclaimed), the app layout redirects them to `/auth/claim`, which handles it. So this may be a UX issue rather than a functional bug — the login page should mention that players need to use the **signup** page with the team code, not the login page.  
**Fix options:**  
- Add a note on the login page: "New player? Sign up with your team code →"  
- Or add a role toggle + join code field to login (only shown for new accounts — complex, probably not worth it)  
**Recommended:** Simple note/link on login pointing players to signup.

---

## 4. Players see only their own profile — should see full squad (read-only)

**Where:** `src/app/(app)/squad/page.tsx`, `src/components/squad/SquadClient.tsx`  
**Symptom:** Players currently see only their own player card ("My Profile"). They should be able to see the full squad list (all teammates), but only edit their own linked record.  
**Fix:**  
- In `squad/page.tsx` player branch: fetch all active players for the team (same query as coach, minus `join_code` and `linkedPlayerIds`)  
- In `SquadClient` player view: render the full squad list read-only, with the player's own card highlighted/expandable with edit controls, and all other cards non-editable  
- Private notes must remain hidden for all cards in player view
