# Persistence & Accounts — Research and Plan

> Status: **research / proposal only**. No code written yet. Reviewed and critiqued below.

## The question

> "How do we persist data using a DB supported by Next.js on Vercel, ready to scale for
> multiple users, with excellent security and data integrity, scalable, reliable,
> performant — but without over-engineering?"

## What we have today

Storage is already abstracted behind a `StorageProvider` interface
(`src/lib/storage/`), with two interchangeable adapters:

- `local.ts` — `localStorage` (the default, no setup, single-device).
- `firestore.ts` — Firebase Firestore, enabled only when `NEXT_PUBLIC_FIREBASE_*`
  env vars are present (`isFirebaseConfigured()`).

**This is the single most important fact for this decision:** because every screen
talks to `getStorage()` and never to a concrete database, **adding a third adapter is a
drop-in change.** We are not rewriting the app to add accounts — we are writing one new
file that satisfies the same interface, plus a thin auth layer. That keeps "don't
over-engineer" honest: the blast radius is small and reversible.

## The options I evaluated

| Option | What it is | Fit for us |
|---|---|---|
| **Keep Firebase** | Firestore (NoSQL) + Firebase Auth, already scaffolded | Works, zero migration. But NoSQL gives weaker *data integrity* guarantees (no foreign keys, no constraints, no transactions across documents by default), and it is a second vendor outside the Vercel/Postgres mainstream. |
| **Neon (Postgres)** | Serverless Postgres; *powers Vercel Postgres natively*; HTTP driver works on the Edge; auto-suspends when idle | Best **pure database**. But it is *only* a database — you bolt on auth (Auth.js) and write your own authorization. More assembly. |
| **Supabase** ✅ | Postgres **+ Auth + Row-Level Security + Storage + Realtime** in one platform; official `@supabase/ssr` Next.js integration | Best **platform** for a solo-maintained app. Postgres = real integrity; RLS = security enforced *in the database*; one vendor = less to operate. |
| **PlanetScale / Clerk / Auth0** | MySQL-flavoured / premium auth | Either weaker Postgres fit or expensive auth at scale. Ruled out. |

Sources:
[Neon vs Supabase (2026)](https://getautonoma.com/blog/supabase-vs-neon) ·
[Managed Postgres for Next.js in 2026](https://dev.to/whoffagents/neon-vs-supabase-vs-planetscale-managed-postgres-for-nextjs-in-2026-2el4) ·
[Vercel community: choosing a DB](https://community.vercel.com/t/how-to-choose-between-supabase-planetscale-and-neon-for-vercel-projects/36413) ·
[Auth comparison 2026](https://makerkit.dev/blog/tutorials/better-auth-vs-clerk) ·
[Clerk vs Supabase Auth vs NextAuth](https://medium.com/better-dev-nextjs-react/clerk-vs-supabase-auth-vs-nextauth-js-the-production-reality-nobody-tells-you-a4b8f0993e1b)

## Recommendation: **Supabase** (Postgres + Auth + RLS)

It maps one-to-one onto the four things you asked for:

- **Excellent security** — Row-Level Security means a policy like *"a user can only read
  and write rows where `user_id = auth.uid()`"* is enforced by Postgres itself. Even if
  the app code has a bug, the database refuses to leak another user's songs. This is a
  genuine architectural advantage, not a checkbox.
- **Data integrity** — real Postgres: foreign keys, `NOT NULL`, `CHECK` constraints,
  unique indexes, and transactions. A song *cannot* exist without an owner; a chord row
  *cannot* point at a song that was deleted.
- **Scalable & performant** — Postgres with connection pooling (Supavisor) and indexes;
  the free tier comfortably handles a launch, and the $25/mo Pro tier handles tens of
  thousands of users.
- **Reliable** — managed, backed up, with a clear upgrade path. No infra for us to run.
- **Not over-engineered** — auth + DB + storage from *one* SDK and *one* dashboard,
  dropped in behind the storage interface we already have.

[Supabase pricing](https://supabase.com/pricing) ·
[Supabase real costs at 10K–100K users](https://designrevision.com/blog/supabase-pricing)

### Cost at our scale

| Users | Supabase | Auth |
|---|---|---|
| Launch (0–hundreds) | Free tier (500 MB DB, 1 GB storage) | Free (50k MAU included) |
| Real traction | Pro **$25/mo** | Still free until 50k MAU |
| 100k MAU | ~$25 + usage | ~**$187/mo** auth (vs Clerk's ~$1,825) |

Auth.js at 100k MAU is *$0* in license but you maintain it yourself. Supabase Auth's cost
is trivial until we are genuinely large, and the RLS integration removes a whole class of
authorization code. [Auth pricing at scale](https://www.devtoolreviews.com/reviews/clerk-vs-auth0-vs-supabase-auth-2026)

## Proposed data model (deliberately tiny)

```
profiles            songs                     song_chords (optional, see note)
--------            -----                     -----------
id (=auth uid) PK   id           uuid PK       id          uuid PK
display_name        user_id      → profiles    song_id     → songs (on delete cascade)
created_at          name         text          position    int
                    key          jsonb          root, quality, degree, source ...
                    created_at   timestamptz    extensions  jsonb
                    updated_at   timestamptz    locked      bool
```

**Note / decision:** a song is small, self-contained JSON. We do **not** need a normalized
`song_chords` table on day one — storing the whole progression (chords + per-chord
extensions + locked flags) as a `jsonb` column on `songs` matches the current `Song` shape
exactly and is the *non-over-engineered* choice. We can normalize later **only if** we add
features that query *inside* progressions (e.g. "find every song that uses a tritone sub").
Ship `jsonb` first.

RLS policies (the whole security model, in four lines of intent):

```sql
-- songs: owner-only read/write
create policy "own songs read"   on songs for select using  (auth.uid() = user_id);
create policy "own songs write"  on songs for insert with check (auth.uid() = user_id);
create policy "own songs update" on songs for update using  (auth.uid() = user_id);
create policy "own songs delete" on songs for delete using  (auth.uid() = user_id);
```

## How it slots into the existing app

1. New adapter `src/lib/storage/supabase.ts` implementing `StorageProvider`
   (`save / get / list / delete`), keyed by the signed-in user.
2. `getStorage()` gains a third branch: Supabase when configured, else Firebase, else
   local. **Anonymous users keep working on `localStorage`** exactly as today — accounts
   are additive, not a wall in front of the tool.
3. A small auth surface: a "Sign in" affordance (magic-link / OAuth via Supabase Auth),
   and a one-time "import your local songs into your account" on first sign-in so nobody
   loses the songs they made while logged out.

## Critique of my own plan, and refinements

- **Risk: the Supabase free tier pauses a project after ~1 week of inactivity.** For a
  brand-new app with sporadic early traffic this is a real reliability hole — the first
  visitor after a quiet week hits a cold/paused DB. **Refinement:** add a Vercel Cron job
  that pings a health endpoint daily to keep it warm, and upgrade to Pro ($25) the moment
  there is steady usage. (Neon avoids project-level pausing but trades it for separate
  auth — net, Supabase + keep-alive is still simpler.)
  [free-tier comparison](https://www.hrekov.com/blog/vercel-vs-supabase-database-comparison)
- **Risk: building accounts before anyone asks for them is over-engineering.** The tool is
  fully usable on `localStorage` today. **Refinement (the big one):** *do not build this
  first.* Gate it on demand — ship feedback + a donate link first (near-zero cost), and
  only build accounts/cloud-sync once people are actually saving songs and asking to sync
  across devices. See `00-roadmap.md` for the sequencing.
- **Migration honesty:** the Firebase adapter stays in the tree. If Supabase ever
  disappoints, the interface lets us fall back. We are not betting the app on one vendor.
- **Commercial-use caveat:** Vercel's free *Hobby* plan is non-commercial only. The day we
  add a donate button, hosting must move to **Vercel Pro ($20/mo)**. That belongs in the
  business model, not hidden here. [Vercel pricing](https://vercel.com/pricing)
