# Ideas Agent — Instructions

This file tells the agent how to handle ideas in future sessions. When the user shares a new feature idea, follow this process exactly.

---

## Location & naming

All idea files live in `docs/Ideas/`.  
File naming: `idea-[short-kebab-name].md`  
Examples: `idea-player-access.md`, `idea-tactical-animations.md`

---

## Process — what to do when an idea is shared

### 1. Read before writing
Before creating the file, always:
- Check `AGENTS.md` for the current data model and architecture
- Check `docs/feature_tabs/` for any related existing feature
- Check `docs/Ideas/` for any related idea already written
- If the idea references an external tool or URL, fetch and read it

### 2. Ask clarifying questions if needed
If the idea is vague or has meaningful open decisions, ask before writing. One round of clarification is better than a doc that misses the point. Don't over-ask — 1–3 focused questions max.

### 3. Write the idea doc
Use the template below. Every section is mandatory unless explicitly marked optional.

### 4. Confirm and refine
After writing, give the user a short summary (5–6 lines max) of your key takes. If they push back or refine the idea, update the doc — don't create a second file.

---

## Document template

```markdown
# Idea: [Title]

**Status:** Under review  
**Type:** [New feature / Tab expansion / Platform expansion / etc.]  
**Related:** [links to related idea or feature_tab docs if any]

---

## The idea
[2–4 sentence plain-English summary of what the coach/player experiences. No jargon.]

---

## What already exists that makes this easier
[Scan the codebase. What tables, components, or patterns are already in place that this builds on?
If nothing exists yet, say so clearly. This section prevents redundant work.]

---

## How it works
[The user flow. Step by step. Concrete — not abstract. Include UI sketches in text form if helpful.]

---

## My recommendations & enhancements
[This is the most important section. Be direct and honest. Include:]
- Things the user hasn't thought of that would make the idea better
- Risks or edge cases worth flagging
- Simpler alternatives if the idea is over-engineered
- What to build first vs defer
[Number each recommendation. Lead with the most impactful one.]

---

## My honest opinion
[One paragraph. Is this a good idea? Why? What is the risk or challenge?
Be direct — don't just validate every idea. If something is premature or over-complex, say so and explain why.]

---

## Data model
[Every idea that touches the database needs this section.]
[New tables: list with columns and types.]
[Changes to existing tables: show the ALTER TABLE SQL.]
[If no DB changes needed, write "No schema changes required."]

---

## Complexity rating
**Low / Medium / High / Very High**
[One paragraph explaining why. Always include a recommended build order as a numbered list.]
```

---

## Tone guidelines

- **Be direct.** If an idea is premature, say it. If it's excellent, say that too.
- **Connect everything to the existing codebase.** The user does not need abstract advice — they need to know how this fits into what's already built.
- **Recommend a build order.** Every idea doc ends with a clear sequence of what to build first.
- **No padding.** Each sentence should carry information. Cut filler.
- **One honest opinion paragraph per doc.** This is the part where you give real strategic advice, not just describe the feature.

---

## What makes a good idea doc

A good idea doc answers these questions for a future developer (or future AI session) who has never heard the idea before:

1. What is this and why does it exist?
2. How does it connect to what's already built?
3. What does the coach/player actually do — step by step?
4. What should we build first and what should we defer?
5. What are the risks?
6. What tables/columns does this need?

If all six are answered, the doc is complete.

---

## Existing ideas (index)

| File | Summary |
|---|---|
| `idea-player-access.md` | Players get accounts with read-only access, invite flow, role-based UI |
| `idea-tactical-animations.md` | Frame-by-frame animated tactical plays, pre-built library, load from saved tactic |
| `idea-training-exercise-animator.md` | Animated training drill board with scenarios, variable players, zone lines |
| `idea-training-session-builder.md` | Exercise library + structured session builder replacing free-text objective field |
| `idea-coach-community.md` | Coach profiles, follow system, exercise ratings, team discovery — future vision |
| `idea-training-week-calendar.md` | Week grid calendar view for the training tab — day columns, week navigation, mobile day-strip |

Update this index every time a new idea doc is created.
