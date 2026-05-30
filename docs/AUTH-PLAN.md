# Auth + Persistence Plan

Discussion document. **No code written yet.** Goal: agree the auth UX, pick the
provider (Firebase Firestore — what we have today — vs. Supabase Postgres), and
sketch the implementation phases. Deploy target is **Vercel** (decided).

---

## 1. The UX you asked for

> *"the user can play without logging in, and only needs to login if they want to
> ensure their songs will persist beyond local storage and use on other computers"*

This is the **anonymous-first → optional upgrade** pattern. Concrete flow:

```
First visit
  ├─ No login. localStorage gets songs. Same as today.
  │
  └─ User taps "Save" on a song
        ├─ Anonymous: still saves to localStorage. No friction.
        └─ Beta banner / SaveDialog gains a calm prompt:
              "Sign in to keep your songs across devices and survive
              cache clears.  →  Get a sign-in link"

User chooses to sign in
  ├─ One field (email), one button ("Send link")
  ├─ Email lands, user clicks the magic link
  ├─ App opens at /, they're signed in, their localStorage songs are
  │  silently migrated to their account
  └─ All future saves go to both: their cloud account (canonical) AND
     localStorage (offline mirror)

Subsequent visits
  ├─ Cookie/session persists → app auto-loads their songs from the cloud
  └─ If they sign out: localStorage stays as a sentimental copy; cloud
     copy stays in their account untouched
```

**Key UX rules:**

- **Never force a sign-in.** The app must always work end-to-end without one.
- **The pitch is "don't lose your work,"** not "create an account." The wording
  should sound like a feature, not a friction.
- **Migration is one-way and one-time.** First sign-in: copy local → cloud.
  After that, cloud is canonical; local is a write-through cache for offline.
- **No password ever.** Magic link only.
- **Sign-out should never delete songs.** It signs you out of the cloud account;
  your local copy stays.

---

## 2. Provider choice — Firebase vs Supabase

You explicitly asked: pros/cons of staying with Firebase vs switching to
Supabase, given Vercel deploy and "future flexibility in case pricing changes."

### Current state

We have ~50 lines of Firestore code (`src/lib/storage/firestore.ts`) and a
`StorageProvider` interface that already abstracts the persistence layer. The
SDK is lazy-loaded; users without env vars never see it. **Switching providers
means rewriting `firestore.ts` as `supabase.ts` (similar size), updating the
selector, and changing the env vars. The rest of the app doesn't care.**

That makes this a *real* choice rather than a one-way door — both are cheap to
adopt and both are cheap to switch *from* once `StorageProvider` is the only
contract anything depends on.

### Side-by-side for this app

| | **Firebase (Firestore + Auth)** | **Supabase (Postgres + Auth)** |
|---|---|---|
| **Data model** | Document store (NoSQL). Our `Song` is JSON → trivial fit. | Relational Postgres. Our `Song` becomes one table; chord array is a `jsonb` column. Also trivial. |
| **Anonymous sign-in** | Yes (Anonymous provider) | Yes (Anonymous Sign-Ins, since 2024) |
| **Magic link** | Yes (Email Link Authentication) | Yes (default email auth flow) |
| **Vercel integration** | Works fine; client SDK is browser-side. | **First-class** — there's a Vercel integration that wires env vars automatically, and `@supabase/ssr` handles Next.js App Router cookies properly. |
| **Bundle cost** | ~270 KB lazy chunk today (firebase/app + firebase/firestore). Adding firebase/auth pushes it ~70 KB more. | `@supabase/supabase-js` is ~120 KB. Roughly **half** the JS. |
| **Pricing — free tier** | Spark: 50 K reads/day, 20 K writes/day, 1 GiB stored. Hits your wallet via Blaze (pay-as-you-go) **with no spending cap by default** — bills can spike under abuse. | Free: 500 MB Postgres, 1 GB file storage, 50 K MAU. Hard-capped — your app stops serving rather than billing you. |
| **Pricing — typical small app** | Spark forever if you stay under the limits. Blaze ~$5–25/mo for low traffic. Can spike. | Free forever under limits. Pro flat $25/mo once you cross them. **Predictable.** |
| **Lock-in / portability** | Firestore is proprietary. Migrating off means schema redesign + ETL. | **Postgres.** You can dump → import to any Postgres host (Neon, RDS, Railway, your own server) without touching the data model. |
| **Open source** | Closed-source backend; SDK is open. | Backend **and** SDK open source; can self-host. |
| **Real-time** | Yes (Firestore listeners). | Yes (Postgres logical replication via Supabase Realtime). |
| **What you'd miss giving up Firebase** | Google login one-tap (not needed for magic link). Existing Firestore code (~50 LOC, low cost to delete). | None — we never used anything else in Firebase. |
| **What you'd miss giving up Supabase** | Postgres power (joins, views, functions) — we don't need any of it for this app today. | |
| **Auth UX maturity** | Solid, well-documented. Anonymous + magic-link upgrade is a known pattern. | Solid, well-documented. Anonymous + magic-link upgrade is *explicitly* a documented Supabase pattern, with the cleaner `is_anonymous` JWT claim for distinguishing in row-level security. |
| **Row-level security** | Custom Firestore rules language (their own DSL). | Standard PostgreSQL RLS policies in SQL. |

### Honest recommendation: **Supabase**

Three reasons, in order:

1. **Portability matches your explicit ask.** You said "in case pricing changes
   and we want to move and change over time." Postgres is the most portable
   storage tier on the planet — `pg_dump` and you're hosted anywhere tomorrow.
   Firestore exports are JSON and require schema design every time you move.
   This isn't theoretical: it's exactly the scenario you raised.

2. **Predictable pricing.** Free until 50 K MAU, then $25/mo flat. Firebase
   Spark → Blaze is harder to forecast and uncapped by default; you'd have to
   set spending limits manually, and even then a misconfiguration can sting.
   For a personal-tool-that-might-become-public, predictability matters more
   than the absolute number.

3. **Smaller bundle, cleaner Next.js story.** `@supabase/supabase-js` is roughly
   half the size of the equivalent Firebase modules, and `@supabase/ssr` is
   purpose-built for Next.js App Router (RSC + cookies). The Firebase JS SDK
   was designed for SPAs first and you wire SSR yourself.

### Why you might still pick Firebase

- **Sunk-cost the right way:** we already wrote it. It works. Migrating is
  half a day of work that doesn't ship a user-visible feature.
- **You might want Google's other services later** (Cloud Functions, FCM push
  notifications, Crashlytics, Remote Config). We don't today, but the surface
  is wider than Supabase's.
- **No "anonymous data on Vercel static rendering" caching issue** — Supabase
  has a known footgun where Next.js static pages can cache anonymous user
  data across requests; the fix is to mark protected routes dynamic, which
  is a known pattern but a wart.

### My call

**Switch to Supabase.** Cost is ~half a day; long-term flexibility is what you
explicitly asked for; bundle and pricing both nudge the same way. If you'd
rather not pay even half a day and prefer to ship the feature on what's
already wired up, **Firebase is fine** — both work for this app. Pick before
we start.

---

## 3. Implementation plan (provider-agnostic where possible)

### Phase 1 — Provider setup (1–2 hours)

- **Supabase path:**
  - Create project in Supabase dashboard.
  - Enable Email auth + Anonymous Sign-Ins.
  - Configure SMTP (Resend free tier — 3 K emails/mo — covers anything we'd do).
  - Create `songs` table: `id uuid pk, user_id uuid fk auth.users, name text, key jsonb, chords jsonb, extensions jsonb, locked jsonb, created_at timestamptz default now()`.
  - Add RLS: `user_id = auth.uid()` for select/insert/update/delete.
  - Wire Vercel integration: env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` auto-injected on deploy.
- **Firebase path:**
  - Enable Email Link + Anonymous in Firebase Auth.
  - Write `firestore.rules` for `users/{uid}/songs/{songId}` (only the owner can RW).
  - Configure email link sender domain + action URL.
  - Set Blaze plan + a $5/mo budget alert (cap protection).

### Phase 2 — Refactor `StorageProvider` for ownership (1 hour)

Right now `StorageProvider` is global. We need a per-user variant:

```ts
interface StorageProvider {
  list(): Promise<Song[]>
  get(id: string): Promise<Song | null>
  save(song: Song): Promise<Song>
  remove(id: string): Promise<void>
}

interface AuthProvider {
  currentUser(): Promise<{ id: string; isAnonymous: boolean; email?: string } | null>
  signInAnonymously(): Promise<void>           // called silently on first save
  sendMagicLink(email: string): Promise<void>  // user-initiated upgrade
  signOut(): Promise<void>
  onChange(cb: (user: User | null) => void): () => void
}
```

The lazy proxy pattern from `storage/index.ts` extends naturally — the
provider knows how to bind itself to the current user; the app doesn't.

### Phase 3 — New providers (3–4 hours)

Write `auth/supabase.ts` (or `auth/firebase.ts`) implementing both interfaces.
Local provider stays as the always-available fallback for the anonymous-no-
account case (offline mirror).

Tests: mock the provider; assert ownership rules (anonymous user A can't
see songs of anonymous user B; signed-in user X can't see user Y).

### Phase 4 — UI for the upgrade flow (2–3 hours)

- BetaBanner becomes a conditional "Sign in" prompt when the user has saved
  songs but is anonymous (or returns "Beta · saves on this device only").
- New `SignInDialog` component (similar shape to `SaveDialog`): one email
  field, one button, success state "Check your email."
- Magic-link callback page (`/auth/callback`) that completes sign-in and
  redirects.
- Header gets a tiny "signed in as X · sign out" affordance once authed.

### Phase 5 — Migration: local songs → cloud on first sign-in (1 hour)

When `auth.currentUser` transitions from null/anonymous → signed-in:
- Read all songs from localStorage.
- For each one, upsert to the cloud provider.
- Mark localStorage as "migrated" (a flag) to avoid re-migrating on every login.
- Future writes: write to cloud first, then localStorage (offline cache).

### Phase 6 — Tests + VR baselines + deploy

- Unit tests: provider mocks, migration logic, anonymous-vs-authed dispatch.
- Visual baselines: BetaBanner (anonymous), BetaBanner (authed, signed-in
  state), SignInDialog (empty, validating, success), `/auth/callback`.
- Manual test: full flow on a Vercel preview branch.

Total estimate: **~1.5 days** end-to-end on the recommended Supabase path,
or **~1 day** if we stay on Firebase (less new code, but Firebase Auth has
slightly more configuration steps).

---

## 4. Portability — what we're locking in (or not)

If we go **Supabase**:
- Storage is plain Postgres. Move to Neon, RDS, Supabase self-hosted, or
  anywhere else by `pg_dump | psql`. Zero schema change.
- Auth is Supabase-specific (their JWT, their hosted endpoints). Switching
  auth providers means re-flowing users through "sign in again" once.
- The `AuthProvider` interface above keeps the app code provider-agnostic;
  swapping in a new implementation is a localized change.

If we go **Firebase**:
- Storage is Firestore — proprietary. Migrating to any other store is
  schema + ETL + indexing work. The `StorageProvider` interface insulates
  the app code; the data is the harder part.
- Auth is Firebase Auth — also proprietary; same as Supabase, switching
  costs users a re-sign-in.

In both cases, the **app code** stays portable thanks to the interfaces.
The difference is the **data**: Postgres travels freely, Firestore doesn't.

---

## 5. What I need from you to start

Two answers:

1. **Provider: Supabase or stay on Firebase?** (I recommend Supabase; either
   ships the same UX.)
2. **Email sender:** for Supabase we'd use Resend's free tier (3K/mo); for
   Firebase we'd use their built-in (rate-limited, fine for low volume) or
   wire a SendGrid/Postmark account. Any preference, or default to free
   tier on whichever provider?

Once those are answered I'll write the phase-by-phase implementation plan
(in the `docs/superpowers/plans/` format) and we execute it on a fresh
`auth-and-cloud-sync` branch.

---

Sources for the comparison numbers above:
- [Supabase vs Firebase: 8 Tests, 1 Winner [2026] — Tech Insider](https://tech-insider.org/supabase-vs-firebase-2026/)
- [The Backend Battle of 2026: Firebase vs Supabase — Deep Dive (Tekingame)](https://www.tekingame.ir/en/blog/firebase-vs-supabase-2026-comparison-nextjs-architecture-pricing-vector-db)
- [Supabase Pricing: Real Costs at 10K–100K Users — DesignRevision](https://designrevision.com/blog/supabase-pricing)
- [Supabase Auth — Anonymous Sign-Ins (official docs)](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Auth — Magic Link / Passwordless (official docs)](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Use Supabase Auth with Next.js — Quickstart (official docs)](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
