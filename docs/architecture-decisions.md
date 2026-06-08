# Architecture Decisions — Dictionary

A reference document explaining every technology and concept behind the stack choices for this project. Written to be readable without prior knowledge of web development.

---

## What is this project?

A **multi-user SaaS MVP** for football coaches. Coaches log in, manage their squad, plan training, and prepare for matches. The goal was to build something real and testable with real coaches as fast as possible.

---

## Glossary of Terms

### API (Application Programming Interface)
A defined contract for how two pieces of software talk to each other. When your browser asks a server "give me this user's squad", it does so through an API. APIs define what you can ask, what format to ask it in, and what format the answer comes back in.

### API Route
In Next.js, a file you can create that acts as a small server endpoint — your own custom API. For example, `/api/players` could return a list of players as JSON. **We deliberately chose not to use these** to keep the codebase simpler: instead, the browser talks directly to Supabase.

### App Router
The newer way of organizing pages in Next.js (introduced in version 13). Instead of a flat `pages/` folder, you nest folders inside `app/` and use special filenames (`page.tsx`, `layout.tsx`). It also introduces the Server Component / Client Component distinction. Contrast with the older **Pages Router**.

### Authentication (Auth)
The process of verifying *who* a user is. Typically: the user provides an email and password, the system checks it, and issues a session token. Supabase provides this out of the box — we did not have to write login/logout logic ourselves.

### Backend
The part of an application that runs on a server, not in the user's browser. Handles business logic, database access, and auth. In traditional apps this is a separate service (e.g. a Node.js or Python server). In this project, Supabase *is* the backend — we have almost no custom server code.

### Browser Client
The version of the Supabase SDK that runs in the user's browser (as opposed to on the server). Used in Client Components to perform mutations (create, update, delete). Lives in `src/lib/supabase/client.ts`.

### Build Time
How long it takes to compile the entire application into files ready to be served to users. Longer build times slow down deployments and local development feedback loops.

### Cache / Cache Invalidation
A cache stores a copy of data so it doesn't have to be re-fetched every time. Cache invalidation is the process of marking that cached data as stale so it gets refreshed. In this project, `router.refresh()` is the mechanism — it tells Next.js to re-run the server page and get fresh data from Supabase.

### Client Component
A React component that runs in the user's browser. Marked with `'use client'` at the top of the file. Can respond to user interactions (clicks, typing), hold local state (what's open, what's being edited), and call the browser Supabase client to perform mutations. In this project: every `*Client.tsx` file.

### CRUD
**Create, Read, Update, Delete** — the four basic operations you perform on data. Almost every feature in the app is some combination of these four actions.

### Credentials
Sensitive values (passwords, API keys, tokens) used to authenticate with a service. In this project, Supabase credentials live in `.env.local` and are never committed to git.

### Data Model
The structure of the data stored in the database — what tables exist, what columns each table has, and how tables relate to each other. Defined in `supabase-schema.sql` and documented in `AGENTS.md`.

### Database
An organized store of persistent data. This project uses **PostgreSQL** (a relational database) hosted by Supabase. Data is organized into tables with rows and columns, and you query it with SQL.

### Denormalization
Storing the same data in multiple places to make queries faster or simpler. Common in NoSQL databases (like Firebase) because they can't efficiently join data across collections. In a relational database like PostgreSQL, you instead normalize data (store it once, reference it with foreign keys) and use JOINs.

### Edge Functions
Small pieces of server-side code that run very close to the user geographically (at the "edge" of the network, not in a central data center). Supabase and Vercel both offer these. Useful for heavy computation that shouldn't run in the browser but doesn't need a full server.

### ESLint
A tool that automatically checks your code for common mistakes and style issues. Run with `npm run lint`. Catches things like unused variables, incorrect React patterns, and TypeScript type errors.

### Foreign Key
A column in one database table that references the primary key of another table. For example, a `players` row has a `team_id` column that references a row in the `teams` table. This is how relational databases express relationships.

### Framework
A pre-built structure for organizing and running code. Instead of starting from scratch, a framework gives you conventions (where to put files, how routing works, how data flows) and built-in tools. **Next.js** is the framework used here.

### Frontend
The part of an application that runs in the user's browser — what they see and interact with. Built with React in this project.

### Full-Stack
A setup where both the frontend (browser) and backend (server/database) live in the same codebase or are managed by the same developer/team. Next.js enables full-stack development in one repository.

### JSON (JavaScript Object Notation)
A text format for representing structured data. Looks like: `{"name": "Alex", "age": 25}`. Used everywhere data is exchanged between services — APIs return JSON, databases store JSONB (binary JSON).

### JSONB
PostgreSQL's binary JSON column type. Stores JSON data in a compressed, indexed format. Used in this project for the `positions` column in the `tactics` table — storing 22 x/y coordinates for player positions on a tactical board.

### JWT (JSON Web Token)
A compact, signed token used to represent a user's session. When you log in, Supabase gives your browser a JWT. Your browser sends it with every request to prove who you are. The server verifies the signature without needing to hit the database every time.

### Lucide React
The icon library used in this project. Provides clean, consistent SVG icons as React components (e.g. `<ChevronDown />`, `<User />`). Chosen for its simplicity and wide selection.

### Migration
A versioned script that modifies a database schema (adds a table, renames a column, etc.). In this project, schema changes are made by editing `supabase-schema.sql` and re-running it in the Supabase SQL editor. At scale, you'd use a proper migration tool that tracks which scripts have already run.

### Multi-Tenant SaaS
An application where many separate organizations (tenants) share the same infrastructure but have completely isolated data. A coach's players should never be visible to another coach — this isolation is enforced in this project via `team_id` filtering and Postgres RLS policies.

### MVP (Minimum Viable Product)
The simplest version of a product that delivers enough value to test with real users. The goal is to learn quickly, not to build everything. This project is explicitly an MVP — choices were made to maximize speed of iteration, not long-term scale.

### Next.js
The React framework used to build this application. Handles routing (which URL shows which page), server-side rendering (generating HTML on the server before sending to the browser), and provides the App Router structure. Made by Vercel.

### NoSQL
A category of databases that don't use tables and rows. Instead they use documents (JSON-like objects), key-value pairs, or graphs. **Firebase** is a NoSQL database. More flexible for unstructured data, but harder to query relationally (e.g. "give me all matches for players who are injured").

### ORM (Object-Relational Mapper)
A library that lets you query a database using your programming language instead of raw SQL. **Prisma** is a popular ORM for Node.js. We chose not to use one — Supabase provides its own query builder that's close enough to SQL.

### Pages Router
The original routing system in Next.js (before App Router). Files in a `pages/` folder map directly to URLs. Simpler mental model but fewer features than App Router. Many tutorials still use this — be careful not to confuse patterns from Pages Router examples with App Router code.

### PostgreSQL (Postgres)
A powerful, open-source relational database. Known for reliability, rich feature set (JSONB, full-text search, array types), and strict standards compliance. Supabase uses PostgreSQL under the hood — this is important because if you ever leave Supabase, your data is in a standard format.

### PostgREST
A tool Supabase uses internally. It automatically generates a REST API from your Postgres schema — every table becomes an endpoint automatically. The Supabase JavaScript client talks to PostgREST behind the scenes, so you don't have to write API endpoints for basic CRUD.

### Props (Properties)
In React, the data passed from a parent component to a child component. In this project, the Server Component (`page.tsx`) fetches data and passes it as props to the Client Component (`*Client.tsx`).

### React
A JavaScript library for building user interfaces. Everything is broken into reusable **components** (buttons, cards, forms). React updates the browser efficiently when data changes, without reloading the whole page. Next.js is built on top of React.

### Relational Database
A database that organizes data into tables with rows and columns, where tables can reference each other via foreign keys. Supports powerful SQL queries that can join data across multiple tables. Contrast with NoSQL. PostgreSQL is a relational database.

### Remix
An alternative to Next.js — a React-based full-stack framework. Has a strong "loaders and actions" model for data fetching and mutations. A legitimate alternative to Next.js but has a smaller ecosystem and fewer Supabase-specific resources at the time this project was built.

### REST API
A style of API where each resource (users, players, matches) has its own URL, and you interact with it using standard HTTP methods (GET to read, POST to create, PUT/PATCH to update, DELETE to remove). Supabase exposes your database as a REST API automatically via PostgREST.

### Row Level Security (RLS)
A PostgreSQL feature that lets you write policies directly in the database that control which rows a user can read or write. For example: "a user can only SELECT players where `team_id` matches their own team." Enforced at the database layer — even if app code has a bug, the database won't leak another team's data.

### Router / Routing
The mechanism that decides which page (component) to show based on the URL. In Next.js App Router, the folder structure in `app/` defines the routes: `app/(app)/squad/page.tsx` maps to the `/squad` URL.

### `router.refresh()`
A Next.js function called in Client Components after a mutation. It tells the framework to re-run the server-side data fetching for the current page and re-render with fresh data — without doing a full page reload. This is the update mechanism used throughout this project instead of local state management.

### SaaS (Software as a Service)
A software distribution model where the application runs on a provider's servers and users access it via a browser (subscription-based). Google Docs, Notion, and Slack are SaaS products. This app is a SaaS for football coaches.

### SDK (Software Development Kit)
A set of pre-built tools and libraries that make it easier to interact with a service. Supabase provides a JavaScript SDK (`@supabase/supabase-js`) that wraps its API in convenient functions like `supabase.from('players').select('*')`.

### Server Action
A Next.js feature (introduced in v13+) that lets you define server-side functions and call them directly from Client Components — like an RPC. **We deliberately chose not to use these** to keep the architecture simpler: mutations go directly from the browser to Supabase.

### Server Component
A React component that runs only on the server, never in the browser. Can safely use server-only secrets (like the Supabase service key). Cannot use browser APIs (localStorage, window, event listeners) or hold state. In this project: every `page.tsx` file is a Server Component.

### Server-Side Rendering (SSR)
Generating the HTML for a page on the server before sending it to the browser, rather than having the browser build it from scratch using JavaScript. Results in faster initial page loads and better SEO. Next.js enables SSR by default for Server Components.

### Session Token
A temporary credential issued after login that proves a user is authenticated. Stored in a cookie in this project. Middleware refreshes it automatically so users don't get logged out unexpectedly.

### SQL (Structured Query Language)
The language used to interact with relational databases. Examples: `SELECT * FROM players WHERE team_id = '...'`, `INSERT INTO matches (...)`, `UPDATE players SET availability_status = 'injured' WHERE id = '...'`.

### Supabase
A Firebase alternative built on PostgreSQL. Provides: hosted database, authentication, auto-generated REST API (via PostgREST), real-time subscriptions, file storage, and edge functions. Used as the entire backend for this project — no custom server code needed.

### SvelteKit
A full-stack framework built on Svelte (an alternative to React). Known for being leaner and faster than Next.js, with less boilerplate. A legitimate alternative considered for this project — ruled out mainly due to a smaller ecosystem and less mature TypeScript/component library support compared to React at this scale.

### TanStack Start
A relatively new full-stack React framework from the creators of TanStack Query (React Query). Promising but was not production-stable when this project was initiated.

### Tailwind CSS
A utility-first CSS framework. Instead of writing custom CSS classes, you apply small utility classes directly in your HTML/JSX: `className="bg-gray-900 text-green-400 p-4 rounded-lg"`. Version 4 (used here) has a significantly reworked configuration system.

### TypeScript
A superset of JavaScript that adds static types. Instead of `let x = "hello"`, you write `let x: string = "hello"`. The compiler catches type mismatches before the code runs. All shared types in this project live in `src/types/index.ts`.

### Vendor Lock-In
The degree to which switching away from a technology is difficult. Supabase has moderate lock-in: the query syntax is Supabase-specific, but the underlying data is standard PostgreSQL — so a migration is painful but possible. Firebase has higher lock-in because the data model itself is proprietary.

### Vercel
The hosting platform used to deploy this application. Made by the same team as Next.js — zero-configuration deployment, automatic branch preview URLs, edge-optimized CDN. `git push` → deployed.

### Vite
A fast build tool and development server for JavaScript/TypeScript projects. Commonly used with plain React (via Create React App successor). Not used here — Next.js has its own build toolchain.

---

## Stack Summary

| Decision | Chosen | Why | Main Risk |
|---|---|---|---|
| **Database + Auth + API** | Supabase | Full backend out of the box; RLS enforces data isolation at DB layer | Vendor lock-in on the client SDK |
| **Framework** | Next.js (App Router) | Server + Client split maps cleanly to the data-fetch/mutation pattern; single repo | App Router mental model overhead; rapid API churn |
| **Styling** | Tailwind CSS v4 | No context-switching between CSS and JSX; dark theme is trivial to maintain | Verbose class strings; v4 config differences from v3 tutorials |
| **Language** | TypeScript | Type errors caught at compile time; shared types enforce consistency across the codebase | Slower initial setup; harder for JS-only contributors |
| **Icons** | Lucide React | Consistent, well-maintained, tree-shakeable | None meaningful at this scale |

---

## Core Tradeoff

This stack was chosen to optimize for **speed of iteration by a small team building an MVP**, at the cost of **flexibility and long-term scale**. Both Supabase and Next.js App Router would need to be revisited if the app grows to require complex multi-role permissions, heavy analytics, or a dedicated backend engineering team.
