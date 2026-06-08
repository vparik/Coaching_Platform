# Idea: Free Drawing Tool on the Tactics Board

**Status:** Under review  
**Type:** Tactics tab — interaction layer expansion  
**Related:** [`docs/feature_tabs/07-tactics.md`](../feature_tabs/07-tactics.md), [`idea-tactical-animations.md`](idea-tactical-animations.md)

---

## The idea

The coach can switch to a drawing mode on the tactics board and sketch freehand lines directly on the pitch — a quick "run here, press here, cover this zone" gesture during a team briefing. Drawings are a temporary whiteboard: they sit on top of the existing formation and clear when the coach loads a different tactic or navigates away. Three stroke colors let the coach distinguish attack runs, pressing triggers, and general movements. A single tap on the eraser clears everything.

---

## What already exists that makes this easier

A lot:

- The pitch is already an **SVG** — drawing paths are native SVG elements (`<path>`, `<polyline>`). No canvas rewrite needed.
- Player positions already use **pointer events** on the SVG — the same event system handles drawing; we just need a mode toggle to switch between drag and draw.
- The **maximize modal** is already built — the coach can open the fullscreen view for a group briefing and draw on a large surface without changing a single line of pitch rendering code.
- No schema changes needed — drawings are temporary React state, so no Supabase involvement at all.

---

## How it works

### Mode toggle

Two mutually exclusive modes — the coach can't drag and draw at the same time:

```
[ ✋ Move ]   [ ✏️ Draw ]
```

Shown as a pill/toggle above the pitch. Default is Move (existing drag behaviour). Switching to Draw disables player dragging and turns the pointer into a crosshair.

### Color palette

Three stroke colors, shown as small colored dots next to the toggle when in Draw mode:

| Dot | Color | Intended use |
|---|---|---|
| ● Yellow | `#facc15` | Attack runs, ball circulation |
| ● Red | `#ef4444` | Pressing triggers, defensive shape |
| ● White | `#ffffff` | General / neutral annotations |

The active color has a ring around it. One tap switches active color — no label needed, coaches will learn the meaning quickly.

### Drawing

While in Draw mode:
1. Coach presses the finger/mouse down on the pitch
2. Moves across the pitch — the stroke trails in the active color in real time
3. Lifts finger/mouse — the stroke is committed as a completed path
4. Multiple strokes can be layered freely

Strokes render as SVG `<polyline>` elements (no smoothing needed — raw pointer coordinates look natural for quick gestures).

### Clear

A **"Clear drawings"** button (trash icon) appears next to the mode toggle when at least one stroke exists. Tapping it removes all strokes instantly. There is no per-stroke undo — clearing all is enough for a quick briefing tool.

### Persistence

None. Drawings live in React state only. Loading a saved tactic, changing formation, or navigating away clears them automatically. This is intentional — these are live briefing gestures, not saved content. If the coach wants to save a movement plan, they use the animations feature (see `idea-tactical-animations.md`).

---

## My recommendations & enhancements

**1. The mode toggle is the most important UX decision — get it right.**
If the coach accidentally draws when they meant to drag a player (or vice versa), the tool feels broken. The active mode must be visually obvious at a glance. Use a filled/unfilled background on the active button, not just an underline or color change.

**2. Draw on top of players, not behind them.**
The SVG render order matters: strokes should sit above the pitch markings but below the player circles. This way players remain draggable in Move mode and the lines don't cover the labels when the coach switches back.

**3. Stroke smoothing is not needed for v1.**
Raw polyline from pointer events looks like a natural hand-drawn line at normal gesture speed. CSS `stroke-linejoin: round; stroke-linecap: round` on the polyline is enough to make it look clean — no Bezier curve fitting needed.

**4. Don't save drawings — confirm this decision with coaches.**
The temporary whiteboard decision is the right call for a quick briefing tool, but if coaches repeatedly ask "why can't I save my arrows?", the answer is to build the animations feature properly. Resist the temptation to bolt save logic onto this feature — the animations idea already solves that correctly.

**5. Stroke width.**
A width of 2.5–3px (in SVG viewBox units) looks right on the 300×450 viewBox. Too thin and it disappears; too thick and it covers players.

**6. Works in the maximize modal too — for free.**
The `PitchSVG` component is shared between inline and modal views. Passing drawing state as props means the full-screen modal gets drawing capability without any extra code — the coach can expand to fullscreen and draw for the whole team.

---

## My honest opinion

This is a genuinely useful, low-complexity feature that fills a real gap: quick gestural communication during a briefing. The key risk is the mode toggle UX — if it's confusing, coaches will accidentally draw when they want to drag players, and the feature will feel like a regression. Get that toggle visually clear and it's a solid addition. The technical lift is small: a few SVG elements, a mode flag in state, and some pointer event handlers. It does not conflict with the animations idea — they serve different use cases (ephemeral gesture vs structured saved play). Build this before animations; it's faster and gives immediate value.

---

## Data model

No schema changes required. Drawings are stored as ephemeral React state:

```typescript
type Stroke = {
  color: string
  points: { x: number; y: number }[]  // relative 0–1 coords matching the existing PlayerPos system
}

// Added to TacticsClient local state:
const [strokes, setStrokes] = useState<Stroke[]>([])
const [activeColor, setActiveColor] = useState('#facc15')
const [drawMode, setDrawMode] = useState(false)
```

---

## Complexity rating

**Low**

The SVG infrastructure is already in place. This is purely additive:

1. Add `drawMode`, `strokes`, `activeColor`, `currentStroke` to TacticsClient state
2. Add mode toggle + color palette UI above the pitch (both views: inline + modal)
3. Pass drawing state and handlers into `PitchSVG` as new props
4. In `PitchSVG`: add pointer event handlers that build `currentStroke` on move, commit to `strokes` on pointer up (when in draw mode)
5. Render committed `<polyline>` elements and the live `currentStroke` as a `<polyline>` in the SVG (between pitch markings and player circles)
6. Add a clear button that resets `strokes` to `[]`

All six steps are in a single component file (`TacticsClient.tsx`). No new files, no Supabase, no schema migration.
