# Idea: Coach Community — Profiles, Following & Exercise Sharing

**Status:** Future vision — not near-term  
**Type:** Platform expansion — social layer  
**Related:** idea-training-session-builder.md (exercises become shareable content)

---

## The idea

Coaches have a public profile with a bio, stats, and their shared exercise library. Coaches can follow each other, discover and rate each other's exercises, and over time the platform becomes a place where teams can find and evaluate coaches. Essentially: a professional network built specifically for football coaches, powered by the tactical and training content they are already creating.

---

## My honest opinion

This is the right long-term vision and it is **genuinely differentiated**. There is no LinkedIn for football coaches that is also a working tool. Most coaching platforms are either pure tools (no community) or pure directories (no actual content). Building both together creates a compound effect — coaches come for the tool, stay for the community, and the content they create inside the tool becomes their public portfolio. That is a strong product loop.

**But sequence matters enormously.** This is a platform pivot — you are moving from a private team management tool to a semi-public professional network. The decisions you make on privacy, content ownership, and data structure now will either enable or block this vision. The right move is to plant the architectural seeds early without building the full social layer yet.

---

## What this actually requires — in plain terms

Right now the platform is entirely private. Every piece of data is scoped to one team and one coach. To make this work you need to introduce a concept the codebase does not currently have: **public content**.

Specifically:
- A coach's profile becomes publicly visible (opt-in)
- Individual exercises can be marked as public and browsed by other coaches
- A coach can rate and save another coach's exercise to their own library
- A follow relationship connects two coach profiles

This is architecturally non-trivial but not structurally incompatible with what is already built.

---

## The coach profile

The foundation everything else sits on. Each coach gets a profile page at something like `/coaches/[username]`.

| Field | Notes |
|---|---|
| Display name | Already exists in `profiles.name` |
| Username / handle | New — unique, URL-safe slug |
| Bio | Short text — coaching philosophy, experience, licences |
| Location | City or country |
| Profile photo | Avatar URL |
| Visibility | Public / Private (private = tool-only, no community) |

**Stats shown on the profile:**
- Number of exercises shared
- Total ratings received + average score
- Followers / Following count
- Member since date

Coaches who keep their profile private still use all the tool features — the community layer is opt-in.

---

## Exercise sharing

An exercise in a coach's library can be toggled **Public**. Public exercises appear in a browsable community feed and on the coach's profile.

When Coach B finds Coach A's exercise:
- They can view it (name, description, category, animation if attached)
- They can **rate it** (1–5 stars + optional comment)
- They can **copy it to their own library** — it becomes their own editable copy, attributed to the original author

Attribution is important. "Originally by @coach_name" is shown even after the exercise is copied and modified. This creates reputation incentives.

---

## Rating system

Coaches rate each other's exercises (1–5 stars, optional short comment). The average rating and number of ratings appear on each exercise card.

**Concerns about rating systems:**
- They can be gamed (friends rating up, rivals rating down)
- A coach with 3 ratings and 5 stars looks better than one with 200 ratings and 4.8 stars — display matters
- New coaches have no ratings and look empty

**My recommendations for rating:**
- Show ratings only above a threshold (e.g. minimum 5 ratings before stars appear — show "New" below that)
- Weight recency — a 5-star from last week counts more than one from 18 months ago
- Allow coaches to respond to comments (keeps it professional)
- A coach cannot rate their own exercises (obvious, but worth stating)

---

## Following

Coach A follows Coach B. Coach A's feed shows new exercises published by the coaches they follow. Simple chronological feed — no algorithmic ranking for now.

The follow relationship is public (follower/following counts visible on profiles).

---

## Team discovery — finding coaches

This is the most commercially valuable piece and the one furthest away. A team administrator (club, academy, school) searches the platform for coaches based on:
- Location
- Coaching licence / level
- Content quality (rating, number of exercises)
- Philosophy / style (from bio)

The coach's public profile and exercise library becomes their portfolio. This is what makes the bio important early — it is not vanity, it is a future hiring signal.

**Why this matters for the product:**
If teams find coaches through the platform, and coaches land jobs through it, you have a monetisation model (recruitment feature, premium listings) and a strong reason for coaches to invest time in building their profile.

---

## What to build now vs later

### Plant now (low effort, unlocks the future)
- Add `username`, `bio`, `location` fields to `profiles` — even if not displayed yet
- Add a `visibility` toggle to exercises (public / private) — default private
- Add `author_id` to exercises so attribution is trackable from day one

These are small schema additions that cost almost nothing now and save a migration headache later.

### Build when you have ~50+ active coaches
- Public profile pages
- Exercise discovery browse/search
- Rating system
- Copy-to-library

### Build when you have a functioning community
- Following / feed
- Comments on exercises
- Team discovery / coach search

---

## Risks to be aware of

**1. Privacy and trust**
Many coaches are protective of their tactical work. If exercises are public by default, coaches will not use the tool honestly. Public must always be opt-in, default private. Make this explicit and clear in the UI.

**2. Content quality**
A community of low-quality exercises is worse than no community. The rating system is the quality signal — but it only works at scale. Before critical mass, curate a set of high-quality exercises yourself and feature them.

**3. The cold start problem**
A social network with no users is worthless. The tool must be valuable enough in isolation (private, single coach) that coaches adopt it before the community exists. This is actually already the case with what you are building — the tool works without any community features at all.

**4. This changes the business model**
A private team tool is a B2B SaaS (charge per team). A coach community with hiring is a marketplace. These require different legal structures, data policies, and revenue models. Keep this in mind when the community layer becomes real.

---

## Data model additions

### Changes to `profiles`

```sql
alter table profiles
  add column username text unique,
  add column bio text,
  add column location text,
  add column avatar_url text,
  add column is_public boolean default false;
```

### New table: `coach_follows`

| Column | Type | Notes |
|---|---|---|
| `follower_id` | uuid | FK → profiles |
| `following_id` | uuid | FK → profiles |
| `created_at` | timestamptz | |
| PK | (follower_id, following_id) | Composite |

### New table: `exercise_ratings`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `exercise_id` | uuid | FK → exercises |
| `coach_id` | uuid | FK → profiles (the rater) |
| `rating` | int | 1–5 |
| `comment` | text | Optional |
| `created_at` | timestamptz | |
| Unique | (exercise_id, coach_id) | One rating per coach per exercise |

### Changes to `exercises`

```sql
alter table exercises
  add column is_public boolean default false,
  add column original_author_id uuid references profiles(id),
  add column copied_from_id uuid references exercises(id);
```

`original_author_id` and `copied_from_id` track attribution when exercises are copied between coaches.

---

## Complexity rating

**High** — not because any single piece is complex, but because the social layer touches every other feature and introduces public data, which changes the security model significantly. RLS policies will need a public read path for exercises and profiles with `is_public = true`.

This is a 6–12 month horizon feature. Plant the schema seeds now, build when the user base warrants it.
