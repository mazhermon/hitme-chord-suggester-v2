# Auth + Persistence: Research, Decision & Abstraction Design

Research-only doc. **No implementation** — this is what you read before we
commit to a provider, write the actual integration, or touch any component
code. Sketch interfaces in `src/lib/auth/types.ts` and `src/lib/storage/types.ts`
(the updated one) show the proposed shape without wiring anything live.

---

## 1. The three goals you set (and how I'll weight them)

| Goal | What it means concretely | Weight |
|---|---|---|
| **Ease for us** | Time to first working flow; how often we hit "ah, the SDK does that weirdly"; how readable the integration is six months from now | High |
| **Ease for customers** | Time from "I want to keep my songs" to "I'm signed in and they're synced"; mobile flow doesn't break; emails actually arrive; no spinning Google modal that's confusing | High |
| **Ease of changing later** | If we want to leave the vendor, what survives the move? Can our app code stay untouched, or do we rewrite UI + types + tests too? | **Highest** — you said this explicitly |

The "ease of changing later" goal is what drives the abstraction layer
decision (Section 4). The provider choice (Section 3) ranks lower in
terms of risk because the abstraction makes the choice reversible.

---

## 2. Provider deep-dive

Both providers ship today's UX: anonymous-first → magic-link upgrade,
silent localStorage→cloud migration on sign-in. The real differences are
in the corners.

### 2a. Ease for us (development + maintenance)

| | Firebase | Supabase | Notes |
|---|---|---|---|
| **Setup time** | 1–2h (dashboard project, enable Email Link, set action URL, configure Vercel env) | 1–2h (dashboard project, enable Email + Anonymous, run SQL migration for `songs` table + RLS) | Tied; both have Vercel integrations that auto-inject env vars |
| **Lines of code at the integration boundary** | ~80–120 (Auth + Firestore SDK + 4 CRUD methods) | ~70–100 (Auth + supabase-js + 4 CRUD methods) | Slight Supabase edge — fewer concepts (one SDK does both) |
| **Type safety** | Generated types via Firestore data-converters (boilerplate) | Generated types via `supabase gen types typescript` (one command) | Supabase wins decisively here |
| **Local dev** | Firebase Emulator Suite (mature, slow start, ~30s) | Supabase CLI (docker, slower first start but more reliable; or a free hosted project) | Roughly equal; Supabase's hosted dev project is easier |
| **Debugging RLS rules** | Custom DSL (their syntax); emulator's rules tester is decent | Standard PostgreSQL RLS policies; SQL is testable in psql or the dashboard | Supabase wins — Postgres RLS is something most devs already know |
| **SDK weirdness** | Firestore's `onSnapshot` listener lifecycle is famously fiddly; auth state listener fires before SDK is "ready" | `supabase-js` is a thinner layer; auth events are simpler; some footguns around session refresh on the server | Slight edge to Supabase |
| **Documentation quality** | Massive but uneven; the official docs are dense and not always current | Smaller but newer + opinionated; @supabase/ssr docs are first-class for Next.js App Router | Supabase wins for our stack |

**Ease for us — winner: Supabase**, by a margin of "we'll spend less time
fighting the SDK." Not a knockout.

### 2b. Ease for customers (end-user UX)

| | Firebase | Supabase |
|---|---|---|
| **Anonymous sign-in** | ✅ Mature; produces a persistent uid; deletes when the device is cleared (same as us) | ✅ Mature (since 2024); `is_anonymous` JWT claim makes RLS clean |
| **Magic-link email delivery** | Their built-in is rate-limited and goes via "noreply@<project>.firebaseapp.com" — recognisable as Firebase, lands in Gmail's Updates tab fairly often | Built-in is the same story (rate-limited dev sender). Production should use Resend / SendGrid / Postmark either way |
| **Magic-link redirect on mobile** | Works on iOS/Android browsers; deep-linking back to a PWA is fiddly (Firebase Dynamic Links was deprecated mid-2024) | Same browser story; no equivalent to Dynamic Links so no false promise |
| **Time-to-first-byte on cold auth call** | Slow first init in Chromium (~400–600 ms) due to SDK bootstrap | Faster — ~150–250 ms (smaller bundle parsed less code) |
| **Database query latency** | Firestore: ~30–50 ms for simple gets ([Tech Insider 2026 benchmarks](https://tech-insider.org/supabase-vs-firebase-2026/)) | Postgres: ~15–25 ms — roughly half |
| **Account deletion flow (GDPR)** | Admin SDK call needed; client-only delete leaves auth record | Built-in `auth.users.delete()`; PostgreSQL cascades handle song rows via FK |
| **Sign-in friction** | One field, one button (magic link) — same UX both | Same |
| **Offline behaviour** | Firestore has built-in offline persistence (real strength) | None native — would need IndexedDB cache layer ourselves |

**Customer UX — close call, slight edge to Supabase** on latency and a
cleaner deletion flow. Firebase wins on offline persistence, but our
existing localStorage-first model already covers the offline case for
the songs list — the cloud is a sync target, not the primary store.

### 2c. Ease of changing later (portability)

This is the dimension you weighted highest and where the gap is widest.

| Dimension | Firebase | Supabase |
|---|---|---|
| **What's portable** | Almost nothing without rework. Firestore documents are JSON but the data model (collections, subcollections, security rules in custom DSL) doesn't map cleanly to relational stores. Auth users export as a JSON dump that another auth provider has to ingest with custom code. | Almost everything. Postgres is the lingua franca — `pg_dump` to anywhere (Neon, RDS, Railway, Supabase self-hosted, your own VPS). Auth users are a single Postgres table you can read directly. |
| **What's locked in** | Firestore-specific query semantics (where + orderBy index pairs), security-rules DSL, the specific shape of auth-callback flows | Supabase-specific auth JWTs, Edge Functions if used, Realtime channel naming |
| **Cost of a future switch** | Days to weeks: rewrite data model, write ETL, re-issue user sessions, rebuild rules | Hours to a day: dump/restore data, point env var at new Postgres URL; auth needs to be re-bridged but the *data* is intact |
| **Self-hosting if pricing changes** | Not an option | Yes — Supabase is fully open source; `docker-compose up` for a self-hosted instance is officially supported |

**Portability — clear winner: Supabase**, by a wide margin. This is the
goal you weighted highest.

### 2d. Pricing reality at our scale

| | Firebase (Spark → Blaze) | Supabase (Free → Pro) |
|---|---|---|
| **Free tier — alpha / personal** | 50K reads/day, 20K writes/day, 1 GiB storage | 500 MB Postgres, 50K MAUs, 5 GB bandwidth |
| **Free-tier overrun behaviour** | Stops serving + sends a warning… IF you stay on Spark. If you've upgraded to Blaze for any feature (you usually have to for prod), it silently bills | Stops serving with a hard cap; never silently bills |
| **First paid tier** | Blaze is pay-as-you-go (no flat price); typical small SaaS lands $5–50/mo, can spike under abuse | Pro is $25/mo flat for 8 GB DB, 100K MAUs |
| **Hard spending cap** | You set it manually in Cloud Console; default is none | Built-in — you literally can't get a $1,000 surprise bill |

**Pricing — Supabase**, mostly for predictability. Both are cheap at our scale.

### 2e. Honest case for Firebase

I want to make sure the recommendation isn't a default-to-the-new-thing.
Firebase still wins on:

- **Existing wiring.** We have a working `firestore.ts` with the SDK
  lazy-loaded. Switching = throw it out and write `supabase.ts`. The
  cost is about half a day, but it's real.
- **Firestore offline persistence.** If we ever move from "localStorage
  first" to "offline-first cloud," Firestore has a built-in answer that
  Supabase doesn't.
- **Push notifications + analytics + crashlytics ecosystem.** We don't
  use any of these, but if "Hit me" ever ships as a real native app
  alongside the web, Firebase has the bigger sandbox.
- **Google sign-in dialog.** Web Auth API + Google's one-tap looks
  smoother on Chrome than any equivalent Supabase flow. Magic-link
  parity, but if you ever want "Continue with Google" too, Firebase's
  is more polished.

If you said "I might want to ship a mobile app later" or "Google
sign-in is the primary path," I'd flip the recommendation.

### 2f. Verdict (with caveats)

**Recommend: Supabase.** Three-line summary:

1. **Portability is the dominant factor** (you said so) and Postgres beats Firestore by a wide margin there.
2. **Pricing is predictable** — Free → flat $25 — vs Firebase Blaze's open meter.
3. **Cleaner Next.js App Router story** — `@supabase/ssr` is purpose-built; Firebase JS SDK was designed for SPAs first.

If you're swayed by "we already have Firestore wired and it works,"
that's a valid call. The abstraction in Section 4 makes either choice
cheap to reverse.

---

## 3. The customer journey, end-to-end (provider-agnostic)

Worth pinning this down before we discuss the abstraction, because the
abstraction has to support exactly this flow.

```
First visit
  ├─ App loads, no sign-in
  ├─ User can immediately build a progression, hit Suggest, hit Play
  ├─ Editor state is in memory; nothing persists yet
  │
  └─ User taps Save
        ├─ Song lands in localStorage (anonymous mode)
        ├─ Beta banner becomes: "Save signed-in to keep your songs
        │   across devices →  Get a sign-in link" (calm, never modal)
        └─ Editor returns to the new song's URL

User taps the sign-in CTA
  ├─ Tiny SignInDialog: one email field + "Send link" button
  ├─ POST to provider (Supabase or Firebase) -> "Check your email"
  ├─ User clicks email link in their inbox
  ├─ Lands at /auth/callback, app exchanges code for session
  └─ Silent migration: read localStorage songs -> upsert to user's cloud

Authed visits (same device or others)
  ├─ Session cookie auto-restores on page load
  ├─ Songs list reads from cloud (not localStorage)
  ├─ Saves write to cloud AND localStorage (offline mirror)
  └─ Editor unchanged

Sign-out
  ├─ Session cookie cleared
  ├─ Songs list reverts to localStorage view
  ├─ Cloud songs are NOT deleted; reappear on next sign-in
  └─ Local songs are NOT deleted either

Account deletion (GDPR ask)
  ├─ Settings → "Delete account"
  ├─ Confirm modal, then call provider's delete
  └─ App reverts to anonymous; localStorage stays (it's the user's device)
```

---

## 4. The abstraction layer

You called it a "facade." That's close. The accurate pattern names are:

- **Port + Adapter** (Alistair Cockburn's "hexagonal architecture") — an
  architectural pattern where the app defines **Ports** (interfaces it
  needs the outside world to fulfil) and **Adapters** implement those
  Ports against specific external systems. This is exactly what we want.
- **Repository pattern** (Eric Evans / DDD) — specifically for data
  access; our `SongRepository` is a Repository.
- **Provider pattern** — what we already have for `StorageProvider`; same
  idea, less academic naming.
- **Facade** — a simplified interface to a complex subsystem. The Ports
  ARE facades over the SDKs.

I'll use **Port + Adapter** as the dominant vocabulary because it's the
clearest about *which side faces in vs out*:

- **Ports** (interfaces): `AuthProvider`, `SongRepository`.
  Owned by us, live in `src/lib/auth/types.ts` and
  `src/lib/storage/types.ts`. **App code only ever talks to Ports.**
- **Adapters** (implementations): `LocalAuthAdapter`,
  `SupabaseAuthAdapter`, `FirebaseAuthAdapter`,
  `LocalSongRepository`, `SupabaseSongRepository`,
  `FirestoreSongRepository`. Each lives in its own file. The active
  one is picked by env detection at startup.

What this buys us:

- The components (`SignInDialog`, song list, editor) import only the
  Port. Swapping the adapter changes one line in the selector.
- Tests mock the Port. No need to mock Firebase or Supabase SDKs.
- A future "self-hosted Postgres" adapter is a new file, not a refactor.

### 4a. The Ports (interfaces — these are the contract)

These are what would land in `src/lib/auth/types.ts` and
(an updated) `src/lib/storage/types.ts`. Type sketches, not committed
runtime code yet.

```ts
// src/lib/auth/types.ts — the auth Port

/** Whoever is signed in (or anonymous, or neither). */
export interface User {
  id: string                      // stable across sessions for this account
  isAnonymous: boolean
  email?: string                  // present only when upgraded
  createdAt: number
}

export type AuthStatus =
  | { state: 'loading' }          // SDK still initialising
  | { state: 'signedOut' }        // no anon, no account
  | { state: 'anonymous'; user: User }
  | { state: 'authenticated'; user: User }

/**
 * The auth Port. App code only knows about THIS interface; the adapter
 * (Supabase / Firebase / local) is picked once by the selector.
 */
export interface AuthProvider {
  /** Current status, including a `loading` state for SSR/hydration. */
  status(): AuthStatus

  /** Subscribe to status changes. Returns an unsubscribe fn. */
  onChange(listener: (status: AuthStatus) => void): () => void

  /**
   * Become an anonymous user (silently, no UI). Idempotent — calling
   * twice in the anonymous state is a no-op.
   */
  signInAnonymously(): Promise<User>

  /**
   * Send a magic link to this email. The user's NEXT click on the
   * link will complete sign-in (via completeMagicLink below).
   * If currently anonymous, the link upgrade-links rather than
   * creating a new account.
   */
  sendMagicLink(email: string, redirectTo: string): Promise<void>

  /**
   * Complete the magic-link callback. Reads the URL params our redirect
   * was given; provider-specific details stay inside the adapter.
   */
  completeMagicLink(currentUrl: string): Promise<User>

  /** Sign out (does NOT delete the account). */
  signOut(): Promise<void>

  /** Permanently delete the account. Throws unless authenticated. */
  deleteAccount(): Promise<void>
}
```

```ts
// src/lib/storage/types.ts — the song repository Port (evolution
// of today's StorageProvider, with ownership added)

export interface Song { /* existing shape — unchanged */ }

/**
 * A user-scoped CRUD interface for songs. Adapters know how to scope
 * to the current user (Firestore: users/{uid}/songs; Supabase: songs
 * WHERE user_id = auth.uid()). The app never builds queries directly.
 */
export interface SongRepository {
  list(): Promise<Song[]>
  get(id: string): Promise<Song | null>
  save(song: Song): Promise<Song>
  remove(id: string): Promise<void>

  /**
   * Bulk import — used once on first sign-in to copy local songs into
   * the cloud. Idempotent: re-importing the same id overwrites.
   */
  importMany(songs: Song[]): Promise<void>
}

// The legacy `StorageProvider` name keeps working — alias for transition.
export type StorageProvider = SongRepository
```

### 4b. The adapters — sketch only

One file per adapter, naming convention `<provider>.ts` next to the types.
None of these would be written today; this just shows where they'd live
and what they'd look like.

```
src/lib/auth/
  types.ts                       Port interfaces (User, AuthProvider, …)
  index.ts                       Selector: picks adapter from env, exports getAuth()
  local.ts                       LocalAuthAdapter — anon-only, localStorage-backed
  supabase.ts                    SupabaseAuthAdapter — wraps @supabase/supabase-js
  firebase.ts                    FirebaseAuthAdapter — wraps firebase/auth

src/lib/storage/
  types.ts                       Song + SongRepository
  index.ts                       Selector (already exists, evolves slightly)
  local.ts                       (already exists)
  firestore.ts                   (already exists — would gain user-id scoping)
  supabase.ts                    SupabaseSongRepository (new)
```

### 4c. The selector

There's already one for storage; we add one for auth. The selector is the
ONLY place provider-specific env vars appear.

```ts
// src/lib/auth/index.ts (sketch)
export function getAuth(): AuthProvider {
  if (isSupabaseConfigured()) return createSupabaseAuth()
  if (isFirebaseConfigured()) return createFirebaseAuth()
  return createLocalAuth()            // pure anonymous, no remote
}
```

App code: `import { getAuth } from '@/lib/auth'`. Never imports a
provider directly. The same shape we have today for `getStorage()`.

### 4d. The consumption layer (React hooks)

So components don't repeat selector boilerplate. These would land in
`src/state/`.

```ts
// src/state/useAuth.ts
export function useAuth(): {
  status: AuthStatus
  signInAnonymously: AuthProvider['signInAnonymously']
  sendMagicLink: AuthProvider['sendMagicLink']
  signOut: AuthProvider['signOut']
} {
  // subscribes to getAuth().onChange()
}
```

`SignInDialog` calls `useAuth().sendMagicLink(email, callbackUrl)`. It has
zero knowledge of Supabase or Firebase. Same goes for the future
`/auth/callback` route.

### 4e. What the abstraction CANNOT hide (be honest)

This matters because "we can swap providers freely" is a lie if we paper
over the leaks. Real leaks:

1. **Redirect URL shape.** Supabase's magic-link uses a hash fragment
   (`#access_token=…`); Firebase uses a query string. The
   `completeMagicLink(currentUrl)` Port parses whichever, but the actual
   URL the user lands at can differ slightly.
2. **Session persistence across server boundaries.** With Next.js App
   Router, the cookie naming + httpOnly handling is provider-specific.
   `@supabase/ssr` makes this nice; Firebase needs hand-rolled cookie
   middleware. We'd hide the difference inside the adapter, but the
   middleware file would change if we switch.
3. **Realtime listeners** (if we ever want them — not on the roadmap
   today). Firestore's `onSnapshot` and Supabase Realtime channels have
   different reconnect / backpressure / out-of-order guarantees. A
   future `subscribe()` method on the Port would need a lowest-common-
   denominator semantics.
4. **Specific error codes** (e.g. "rate limited," "email already
   exists"). Our Port should normalise these into a small enum, but
   that requires care when adding new adapters.
5. **Pricing model** is not abstractable. Migrating to a cheaper host
   requires data movement regardless of code design.

The abstraction handles items 1–4 well enough that a swap is
*hours, not days*. Item 5 is a separate (Section 2c) story about
data portability — where Postgres + Supabase already wins.

---

## 5. Proof-of-concept: type-only interfaces (in this branch)

I've added (on `auth-research` branch, separate commit):

- `src/lib/auth/types.ts` — the AuthProvider Port
- Updated `src/lib/storage/types.ts` — SongRepository (alias of
  StorageProvider, plus `importMany`)

These compile, type-check, and add **zero runtime code**. They prove the
interfaces work with our existing module structure. No SDKs are
imported anywhere.

When you green-light the actual integration, the work is:

1. Pick provider (D-1a in NEXT-STEPS.md).
2. Write the adapter file (Supabase: ~120 LOC; Firebase: ~120 LOC).
3. Write the selector additions.
4. Write the `useAuth` hook + `SignInDialog` + `/auth/callback` route.
5. Wire the migration on first sign-in.
6. Tests + visual baselines.

Estimate: **~1.5 days for Supabase, ~1 day for Firebase**, same as
before — the abstraction doesn't add work, it just makes the result
swappable.

---

## 6. Recommendation

**Adopt Supabase, behind the Port+Adapter abstraction.** The combination:

- Best portability story (you weighted this highest).
- Predictable pricing (no Blaze-style surprises).
- Smaller bundle, better Next.js App Router story.
- Clean RLS in standard Postgres (testable in psql).
- If we ever regret it, the adapter swap is ~120 LOC + a one-time data
  migration. The components and tests don't change.

If you'd rather stay on Firebase: the abstraction still applies; just
write the FirebaseAuthAdapter instead of the SupabaseAuthAdapter.
The cost is "we've already paid the wiring" but pay it again later if
we ever want to leave.

---

## 7. Open decisions (still need your input)

Pinning these so they don't get lost:

- **D-1a (Provider):** Supabase or Firebase? Recommendation: Supabase.
- **D-1b (Email sender):** Resend (3K/mo free), SendGrid, Postmark, or
  SES?
- **D-1c (NEW from this research):** Are we OK with **no offline
  persistence** for cloud songs? Today: localStorage is the offline
  cache for the editor's working draft. Once songs sync to the cloud,
  reading them when offline would need an IndexedDB cache layer (~half
  a day extra). Worth it now, or "later if we hear complaints"?
- **D-1d (NEW from this research):** **Sign-in vocabulary** — do we say
  "Sign in" or "Save my songs"? UX research suggests framing it as a
  benefit ("keep your songs across devices") not an action ("create an
  account"). Want to settle on the copy now or when we implement?

---

Sources:
- [Supabase vs Firebase: 8 Tests, 1 Winner (2026) — Tech Insider](https://tech-insider.org/supabase-vs-firebase-2026/)
- [Supabase vs Firebase 2026 — AnotherWrapper](https://anotherwrapper.com/blog/supabase-vs-firebase)
- [Firebase vs Supabase Complete Comparison (2026) — DesignRevision](https://designrevision.com/blog/supabase-vs-firebase)
- [The Top 5 Firebase Authentication Alternatives — Descope](https://www.descope.com/blog/post/firebase-authentication-alternatives)
- [Hexagonal Architecture in Next.js — Cristian Fonseca](https://cristianfonseca.dev/blog/next-hexagonal-architecture/)
- [Future-Proof Your Code: Ports & Adapters — Alex Rusin](https://blog.alexrusin.com/future-proof-your-code-a-guide-to-ports-adapters-hexagonal-architecture/)
- [Understanding Ports and Adapters in Hexagonal Architecture (TypeScript) — Software Patterns Lexicon](https://softwarepatternslexicon.com/patterns-ts/7/7/2/)
- [Supabase Auth — Anonymous Sign-Ins (official docs)](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Use Supabase Auth with Next.js — Quickstart (official docs)](https://supabase.com/docs/guides/auth/quickstarts/nextjs)
