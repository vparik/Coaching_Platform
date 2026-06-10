# Implementations Agent — Instructions

This file tells the agent how to write implementation docs. An implementation doc is written **after** a feature is built, capturing the non-obvious technical decisions made during that build so they are not re-discovered from scratch in future sessions.

---

## What an implementation doc is NOT

- Not a user-facing spec (that lives in `docs/feature_tabs/`)
- Not an idea or plan (that lives in `docs/Ideas/`)
- Not a line-by-line code walkthrough (the code already does that)
- Not a list of every file changed

## What it IS

A record of the things that would **surprise or slow down** a developer (or AI session) reading the code cold. Specifically:

- Non-obvious architectural decisions and the reason behind them
- Bugs that were hit during build and exactly how they were fixed
- Constraints that shaped the implementation (browser quirks, library limits, SVG behaviour)
- Things that look wrong but are intentional
- What must NOT be changed without understanding the consequences

---

## When to write one

After any build session where at least one of the following is true:
- A non-obvious technical decision was made
- A bug was hit and fixed in a non-obvious way
- A pattern was chosen over a simpler-looking alternative for a specific reason
- Future changes to this feature are likely to hit the same problems

Simple CRUD features (add/edit/delete a record) usually don't need one. Complex UI, custom rendering, or tricky state management always do.

---

## Document template

```markdown
# Implementation: [Feature Name]

**Route:** `/route`  
**Built:** [date or session description]  
**Files created:**
- list of new files

**Files modified:**
- list of changed files

---

## Overview
[2–3 sentences. What was built and what was the main technical challenge.]

---

## Non-obvious decisions

### [Decision title]
**What:** [What was done]  
**Why:** [Why this approach over the obvious alternative]  
**Risk if changed:** [What breaks if someone undoes this without understanding it]

[Repeat for each non-obvious decision]

---

## Bugs fixed during build

### [Bug title]
**Symptom:** [What the user/developer saw]  
**Root cause:** [Why it happened]  
**Fix:** [Exactly what was changed and why it works]

[Repeat for each non-trivial bug]

---

## Do not change without reading this

[Bullet list of the specific things in the code that look like they could be simplified or changed but must not be, with one-line reason each.]
```

---

## Naming

`impl-[feature-name].md`  
Examples: `impl-tactics-board.md`, `impl-squad-drag-drop.md`

---

## Index

| File | Feature | Key decisions documented |
|---|---|---|
| `impl-tactics-board.md` | Tactics Board (Phase 1) | SVG D arc geometry, pointer capture bubbling, modal scroll, PitchSVG extraction |
| `impl-player-access.md` | Player Access | Trigger search_path, middleware exclusion, claim redirect loop, embedded join RLS bug, ambiguous id in RETURNS TABLE |

Update this table every time a new implementation doc is added.
