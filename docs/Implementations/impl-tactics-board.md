# Implementation: Tactics Board

**Route:** `/tactics`  
**Built:** Session — Tactics tab Phase 1  
**Files created:**
- `src/app/(app)/tactics/page.tsx`
- `src/components/tactics/TacticsClient.tsx`
- `supabase-tactics-migration.sql`
- `docs/feature_tabs/07-tactics.md`

**Files modified:**
- `src/types/index.ts` — added `PlayerPos`, `Tactic`
- `src/components/layout/Sidebar.tsx` — added Tactics nav item
- `src/components/layout/MobileNav.tsx` — added Tactics nav item
- `AGENTS.md` — updated data model and file structure
- `supabase-schema.sql` — appended tactics table

---

## Overview

An interactive SVG football pitch with 22 draggable player circles (11 blue / 11 red), formation presets, and a save/load system backed by Supabase. The pitch also renders inside a fullscreen modal with identical drag behaviour. The main technical challenges were SVG drag-and-drop with pointer capture, correct D arc geometry, and making the pitch component work correctly in two different render contexts (inline + modal).

---

## Non-obvious decisions

### PitchSVG extracted as a module-level component

**What:** `PitchSVG` is defined outside `TacticsClient`, at module scope, as a proper React component with typed props.

**Why:** If defined as a nested function or inline JSX helper inside `TacticsClient`, React treats it as a new component type on every render — causing the SVG to fully unmount and remount, destroying pointer capture mid-drag. Module-level definition gives it a stable identity across renders.

**Risk if changed:** Moving `PitchSVG` inside `TacticsClient` (even as a `const`) will cause the drag to break — the element unmounts mid-drag, releasing pointer capture.

---

### `e.currentTarget.getBoundingClientRect()` instead of a ref

**What:** `handlePointerMove` calculates the player's new position by reading the bounding rect of `e.currentTarget` (the SVG element), not a stored `useRef`.

**Why:** The pitch renders twice — once inline, once in the fullscreen modal. A single `svgRef` can only point to one DOM element. Using `e.currentTarget` means the handler automatically uses whichever SVG element fired the event, making drag work correctly in both contexts without any additional logic.

**Risk if changed:** Switching back to a `useRef` would cause drag to read the wrong element's coordinates when the modal is open — players would jump to wrong positions.

---

### `setPointerCapture` on the `<g>` element, `onPointerMove` on the `<svg>`

**What:** `pointerdown` fires on the `<g>` (player circle), which calls `setPointerCapture`. But `onPointerMove` is on the `<svg>`, not the `<g>`.

**Why:** `setPointerCapture` on the `<g>` ensures all `pointermove` events are delivered to that element even when the pointer moves off it (which happens immediately when dragging fast). Critically, native pointer events bubble — so captured events on `<g>` still bubble up to `<svg>`, where React's `onPointerMove` fires with `e.currentTarget = svgElement`. This gives us both capture (stable delivery) and the SVG element reference we need for coordinate calculation.

**Risk if changed:** Removing `setPointerCapture` makes fast drags break — the pointer exits the circle and the drag stops. Moving `onPointerMove` to the `<g>` would break coordinate calculation because `e.currentTarget` would be the `<g>`, not the SVG, making `getBoundingClientRect()` return the wrong rect.

---

### SVG D arc geometry — sweep flags

**What:**
- Top D arc: `M 120 81 A 37 37 0 0 0 180 81` (`sweep=0`)
- Bottom D arc: `M 120 369 A 37 37 0 0 1 180 369` (`sweep=1`)

**Why:** SVG arcs have two directions. The D arc must bow **away from the goal, into the pitch**. The penalty spot (arc centre) is at (150, 59) for the top end and (150, 391) for the bottom end.

In SVG coordinates (y increases downward), `sweep=1` = clockwise visually on screen.

- **Top D**: going from left endpoint (120, 81) to right endpoint (180, 81), the arc that bows **downward** (away from top goal, into pitch) is the **counterclockwise** direction → `sweep=0`.
- **Bottom D**: going from left (120, 369) to right (180, 369), the arc that bows **upward** (away from bottom goal, into pitch) is the **clockwise** direction → `sweep=1`.

The initial build had both flags wrong (top was `sweep=1`, bottom was `sweep=0`) — both D arcs bowed toward their respective goals. Fixed by swapping both flags.

The arc endpoints (120 and 180) were computed from the circle intersection:
`(x − 150)² + (81 − 59)² = 37²` → `x ≈ 120, 180`

The viewBox is `300×450`. Inner pitch area: `x=15, y=15, w=270, h=420`.
Scale: `270/68 ≈ 3.97 px/m` horizontal, `420/105 = 4.0 px/m` vertical.

**Risk if changed:** Swapping sweep flags makes D arcs bow toward the goals — they look like part of the penalty area box rather than the standard D mark outside it.

---

### Modal scroll — `overflow-hidden` outer + `overflow-y-auto` inner

**What:** The fullscreen modal uses two nested divs:
```
<div className="fixed inset-0 overflow-hidden">       ← outer: no flex
  <div className="h-full overflow-y-auto">            ← inner: scrolls
    <div className="flex flex-col gap-4 p-4 ...">    ← content
```

**Why:** `overflow-y-auto` on a `flex` container does not scroll correctly. A flex container expands its children to fit available space, which means the container never overflows and scroll never triggers. The fix is: outer div constrains the height (`fixed inset-0`, `overflow-hidden`), inner div is a plain block with `h-full overflow-y-auto` — block elements respect overflow correctly.

**Risk if changed:** Collapsing these into a single `flex overflow-y-auto` div breaks scrolling on mobile — content below the pitch (save/load section) becomes unreachable.

---

### Relative coordinates (0–1) for all player positions

**What:** Every player position is stored as `x: 0.0–1.0, y: 0.0–1.0` relative to the SVG viewport. To render: `transform={translate(x * 300, y * 450)}`.

**Why:** Resolution-independent — the pitch renders at any size without recalculating positions. Also directly enables the animation feature (Phase 2): linear interpolation between frames works on (0–1) values without any coordinate conversion.

**Risk if changed:** Switching to absolute pixel coordinates would break the modal (different rendered size), break saved tactics loaded on different screen sizes, and require a coordinate conversion layer before the animation engine can be built.

---

### Formation presets as module-level constants, opponent via `mirror()`

**What:** `OUR_FORMATIONS` is a `Record<string, PlayerPos[]>` defined once at module level. Opponent positions are computed by `mirror()` which returns `y = 1 − y` for each player.

**Why:** Formation data never changes — no reason to recreate it inside the component on every render. The mirror function means formation coordinates only need to be defined once (for our team) and the opponent is always the correct vertical reflection.

**Risk if changed:** If someone defines opponent formations separately with hardcoded values instead of using `mirror()`, the formations will fall out of sync when preset coordinates are adjusted.

---

## Bugs fixed during build

### D arcs bowing toward goals (wrong sweep direction)
**Symptom:** The D arcs on both penalty areas appeared to bow inward toward the goals, making them look like extensions of the penalty area box.  
**Root cause:** Both arcs had incorrect sweep flags — `sweep=1` for top (should be `0`) and `sweep=0` for bottom (should be `1`).  
**Fix:** Swapped both flags and recalculated exact intersection x-coordinates (120, 180) from the circle equation. See full geometry in the D arc decision above.

### Modal scroll not working
**Symptom:** In the fullscreen modal, the pitch took up most of the screen and the save/load section below it was not reachable — no scroll appeared.  
**Root cause:** The modal container was `flex flex-col overflow-y-auto`. Flex containers expand children to fill space, preventing overflow and disabling scroll.  
**Fix:** Separated into outer `overflow-hidden` + inner `h-full overflow-y-auto` non-flex wrapper. See modal scroll decision above.

### Save/load section missing from modal
**Symptom:** The fullscreen modal showed the pitch and formation selectors but had no save input or tactics dropdown.  
**Root cause:** The save/load JSX was only written in the normal (non-modal) render path — the modal was created with only the pitch and formation selectors.  
**Fix:** Duplicated the save input and tactics dropdown into the modal content, sharing the same state and handlers.

---

## Do not change without reading this

- **`PitchSVG` must stay at module level** — moving it inside `TacticsClient` breaks drag mid-motion
- **`e.currentTarget` in `handlePointerMove`** — do not replace with a `useRef`; it must work for both inline and modal SVG elements
- **D arc sweep flags** — `sweep=0` for top, `sweep=1` for bottom; swapping them inverts the arcs
- **Modal outer div must not be flex** — `overflow-y-auto` on flex does not scroll; keep the two-div pattern
- **Positions must stay as 0–1 relative coords** — the animation engine (Phase 2) depends on this
