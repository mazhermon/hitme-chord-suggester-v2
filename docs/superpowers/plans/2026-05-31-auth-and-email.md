# Auth + Email + Per-User Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the anonymous-first → magic-link-or-password upgrade UX on Supabase, with an offline IndexedDB cache, per-user cloud sync of songs, a Vercel-Cron keep-alive that defeats Supabase's 7-day free-tier pause, and a light email facade (Supabase + Resend SMTP).

**Architecture:** Port + Adapter throughout (see `docs/AUTH-RESEARCH.md` §4). `AuthProvider` Port + `SupabaseAuthAdapter` + `LocalAuthAdapter` (zero-config fallback). `SongRepository` Port + `SupabaseSongRepository` + `LocalSongRepository` + an IndexedDB-cached wrapper that sits in front of the cloud adapter. Components only know the Ports.

**Tech stack additions:** `@supabase/supabase-js`, `@supabase/ssr`, `idb-keyval` (small wrapper around IndexedDB).

**Branch:** `auth-and-email` (off main).

**Key constraint:** All code lands behind an `isSupabaseConfigured()` env check. The app continues to work end-to-end with localStorage when env vars are missing, so the maintainer (you) can review code without standing up a Supabase project first.

---

## Phase A — Auth scaffolding (Ports + adapters) (~1h)

Files in this phase use the type sketch we already drafted on the `auth-research` branch as the starting shape.

### A.1: Auth Port + Local adapter

- [ ] **Step 1:** Bring in `src/lib/auth/types.ts` from `auth-research` (cherry-pick or rewrite). Compiles, no runtime code.
- [ ] **Step 2:** Write `src/lib/auth/local.ts`:
  - `createLocalAuthAdapter()` returns an `AuthProvider`.
  - Stores a generated UUID per device in `localStorage` (`chordhelper.user`).
  - Status is always `{ state: 'anonymous', user }`.
  - `signInAnonymously()` is idempotent.
  - `sendMagicLink()` / `completeMagicLink()` / `signUpWithPassword()` / `signInWithPassword()` / `sendPasswordReset()` all throw `Error('Local auth: configure Supabase to enable account sign-in')` — these only work with the cloud adapter.
  - `signOut()` clears the local UUID (next call creates a new anonymous user).
  - `deleteAccount()` throws (no cloud account to delete).
- [ ] **Step 3:** Unit tests.

### A.2: Auth Port extensions

The original Port in `auth-research` had magic link only. Extend it for both flows:

- [ ] **Step 1:** Add to `AuthProvider`:
  ```ts
  signUpWithPassword(email: string, password: string): Promise<User>
  signInWithPassword(email: string, password: string): Promise<User>
  sendPasswordReset(email: string, redirectTo: string): Promise<void>
  ```
- [ ] **Step 2:** Add a `signUpAt?: number` field to `User` for password accounts (Supabase exposes it).

### A.3: Selector

- [ ] **Step 1:** Write `src/lib/auth/index.ts`:
  ```ts
  export function getAuth(): AuthProvider {
    if (isSupabaseConfigured()) return createSupabaseAuthAdapter()
    return createLocalAuthAdapter()
  }
  export function isSupabaseConfigured(): boolean {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  }
  ```

### A.4: `useAuth` hook

- [ ] **Step 1:** Write `src/state/useAuth.ts`. Subscribes to `getAuth().onChange()`, returns `{ status, signInAnonymously, sendMagicLink, signInWithPassword, signUpWithPassword, sendPasswordReset, signOut, deleteAccount }`.
- [ ] **Step 2:** SSR-safe: returns `{ state: 'loading' }` during hydration.

### A.5: Commit

```bash
git commit -m "auth: Port + Local adapter + useAuth hook (no Supabase yet)"
```

---

## Phase B — Supabase adapter (~2h)

### B.1: Install + types

- [ ] **Step 1:** `npm install @supabase/supabase-js @supabase/ssr`.
- [ ] **Step 2:** Create `src/lib/auth/supabase.ts`. Lazy-import the SDK (same pattern as the existing Firestore proxy) so users without Supabase env vars don't pay the bundle.

### B.2: Adapter implementation

- [ ] **Step 1:** `createSupabaseAuthAdapter()` reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, returns an `AuthProvider`.
- [ ] **Step 2:** Map Supabase auth state events to our `AuthStatus`:
  - `INITIAL_SESSION` → `loading` then resolved
  - `SIGNED_IN` / `SIGNED_OUT` / `TOKEN_REFRESHED` / `USER_UPDATED` → recompute status
  - Anonymous detection: check `user.is_anonymous` claim.
- [ ] **Step 3:** Implement each Port method against `supabase.auth.*`:
  - `signInAnonymously()` → `supabase.auth.signInAnonymously()`
  - `sendMagicLink()` → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
  - `completeMagicLink()` → `supabase.auth.exchangeCodeForSession(currentUrl)`
  - `signUpWithPassword()` → `supabase.auth.signUp({ email, password })` (requires email confirmation by default; document this)
  - `signInWithPassword()` → `supabase.auth.signInWithPassword({ email, password })`
  - `sendPasswordReset()` → `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
  - `signOut()` → `supabase.auth.signOut()`
  - `deleteAccount()` → calls a Postgres `delete_account()` SQL function (defined in migration) because the client SDK can't self-delete.
- [ ] **Step 4:** Error normalisation. Wrap provider errors into a small enum: `'rate-limited' | 'email-in-use' | 'invalid-password' | 'expired-link' | 'unknown'`.

### B.3: SSR cookie middleware

- [ ] **Step 1:** Create `src/middleware.ts` using `@supabase/ssr` to refresh the session cookie on requests. Skip for static assets.
- [ ] **Step 2:** Wire it: matcher in middleware.config.

### B.4: Commit

```bash
git commit -m "auth: Supabase adapter + SSR middleware"
```

---

## Phase C — Sign-in UI (~2-3h)

### C.1: SignInDialog component

- [ ] **Step 1:** New component `src/components/SignInDialog/` (mirrors SaveDialog shape).
- [ ] **Step 2:** Tabs: "Magic link" (default) / "Password". Segmented control at top.
- [ ] **Step 3:** Magic-link tab: one email field + "Send link" button. Success state: "Check your email — we sent a link to <email>."
- [ ] **Step 4:** Password tab: email + password fields + "Sign in" + "Sign up" + "Forgot password" link.
  - Sign up flow shows "Check your email to confirm" message.
  - Forgot password swaps to a sub-form: email field + "Send reset link".
- [ ] **Step 5:** Copy: framed as benefit per D-1d. Heading: "Keep your songs across devices". Subhead: "We'll send a magic link to your inbox — no password to remember."
- [ ] **Step 6:** Accessibility: modal pattern (focus trap, Esc, role=dialog) same as SaveDialog.

### C.2: BetaBanner becomes a sign-in CTA when applicable

- [ ] **Step 1:** When `useAuth().status` is `'anonymous'`:
  - If songs exist in storage → "Keep your songs across devices. Sign in →"
  - If no songs → keep existing "Beta · Local saves only" copy.
- [ ] **Step 2:** When `'authenticated'` → hide banner entirely (or show a quiet "Synced with [email]").

### C.3: /auth/callback route

- [ ] **Step 1:** New route `src/app/auth/callback/page.tsx`. Calls `auth.completeMagicLink(location.href)`. Redirects to `/` on success, `/sign-in-error?reason=...` on failure.

### C.4: Header signed-in affordance

- [ ] **Step 1:** New tiny component `src/components/AuthChip/` in the editor header. When authed: shows email + a small "Sign out" / "Delete account" menu.

### C.5: Commit

```bash
git commit -m "ui: SignInDialog (magic link + password tabs), callback, header chip"
```

---

## Phase D — Per-user song storage (~2h)

### D.1: SongRepository auth scoping

- [ ] **Step 1:** Update `SongRepository` Port: each method takes the current user implicitly (the adapter knows how to fetch).
- [ ] **Step 2:** Local adapter: unchanged (anonymous users still use their device's localStorage).
- [ ] **Step 3:** Supabase adapter (`src/lib/storage/supabase.ts`): queries `from('songs').select().eq('user_id', auth.uid())`. INSERT/UPDATE include `user_id` automatically via DB default or trigger.

### D.2: IndexedDB offline cache layer

- [ ] **Step 1:** `npm install idb-keyval`.
- [ ] **Step 2:** New file `src/lib/storage/cache.ts`. Wraps any `SongRepository` with a read-through + write-through IndexedDB cache.
  - On read: try IndexedDB first; fallback to network; populate IndexedDB on success.
  - On write: optimistic update to IndexedDB, then push to network. Pending writes queue + retry on next online tick.
  - Cache namespaced by `user.id` so signing out doesn't expose A's songs to B.
- [ ] **Step 3:** Selector wires it: `cloudRepo = createSupabaseSongRepository(); cachedRepo = createCachedRepository(cloudRepo, user.id)`.

### D.3: Migration on first sign-in

- [ ] **Step 1:** New util `src/lib/storage/migration.ts`. When `useAuth` transitions `anonymous` → `authenticated`:
  - Read all songs from `LocalSongRepository`.
  - Read existing cloud songs (avoid clobbering deliberate cloud-side renames).
  - `importMany()` only those not already in cloud.
  - Set a flag in localStorage so we don't re-migrate on every sign-in.
- [ ] **Step 2:** Document this in a comment so future-you doesn't get confused.

### D.4: SQL migration

- [ ] **Step 1:** New file `supabase/migrations/0001_init.sql`:
  ```sql
  create table public.songs (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    key jsonb not null,
    chords jsonb not null,
    extensions jsonb,
    chord_extensions jsonb,
    locked jsonb,
    envelope jsonb,
    bpm int,
    octave int,
    style text,
    created_at timestamptz not null default now(),
    primary key (user_id, id)
  );
  alter table public.songs enable row level security;
  create policy "owner_rw" on public.songs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

  -- Self-delete RPC for client-side deleteAccount()
  create or replace function delete_account() returns void
    language sql security definer as $$
      delete from auth.users where id = auth.uid();
    $$;
  grant execute on function delete_account() to authenticated;
  ```
- [ ] **Step 2:** Document in `docs/SUPABASE-SETUP.md`: run this migration manually in the Supabase SQL editor.

### D.5: Commit

```bash
git commit -m "storage: per-user Supabase repository + IndexedDB cache + migration"
```

---

## Phase E — Keep-alive cron (~30 min)

### E.1: Vercel Cron route

- [ ] **Step 1:** New file `src/app/api/keepalive/route.ts`. GETs run a tiny `select 1` against Supabase (or `select count(*) from public.songs limit 0`). Returns 200.
- [ ] **Step 2:** Auth-guard with a `CRON_SECRET` header check (Vercel sets `vercel-cron-signature`).

### E.2: vercel.json

- [ ] **Step 1:** New file `vercel.json`:
  ```json
  {
    "crons": [
      { "path": "/api/keepalive", "schedule": "0 6 */3 * *" }
    ]
  }
  ```
  Every 3 days at 06:00 UTC — comfortably under Supabase's 7-day pause threshold while staying within Vercel Hobby's daily cron quota.

### E.3: Commit

```bash
git commit -m "infra: Vercel Cron keep-alive to defeat Supabase 7-day pause"
```

---

## Phase F — Tests + VR + Docs (~1h)

### F.1: Unit tests

- [ ] Local adapter (status, signInAnonymously idempotency)
- [ ] Cache wrapper (read-through, write-through, cross-user isolation)
- [ ] Migration logic (no double-import)

### F.2: VR baselines

- [ ] SignInDialog — magic-link mode, password mode, forgot-password mode, success state
- [ ] BetaBanner — "sign in" CTA variant

### F.3: Docs

- [ ] `docs/SUPABASE-SETUP.md` — step-by-step for the maintainer:
  - Create Supabase project
  - Run the SQL migration
  - Add Resend SMTP creds (link to Resend signup)
  - Add env vars in Vercel
  - Set Auth redirect URLs to the Vercel preview + prod domains
  - Verify by signing up
- [ ] Update `docs/AUTH-RESEARCH.md` → `docs/AUTH.md` (now the as-built, not just research)
- [ ] Update `README.md` — env vars table

### F.4: Commit

```bash
git commit -m "docs+tests: SUPABASE-SETUP, auth tests, VR baselines"
```

---

## Phase G — Hand-off

- [ ] **Step 1:** Push branch.
- [ ] **Step 2:** Note in summary what the user must do before this code actually does anything:
  1. Sign up at supabase.com, create project
  2. Run `supabase/migrations/0001_init.sql` in SQL editor
  3. Sign up at resend.com, verify a domain
  4. Drop Resend SMTP creds into Supabase dashboard → Auth → Email
  5. Set redirect URLs in Supabase dashboard → Auth → URL Configuration
  6. Add env vars in Vercel:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `CRON_SECRET` (any random string)
  7. Deploy.

---

## Self-review

- **Spec coverage:** anonymous-first ✓ (A.1, B.3); magic link ✓ (B.2, C.1); password ✓ (B.2, C.1); offline cache ✓ (D.2); migration on sign-in ✓ (D.3); keep-alive cron ✓ (E); facade ✓ (Ports + selectors); both UI options visible day-1 ✓ (C.1); recommendation: stickiness of saved envelope already done (waveform-mix-pots → main).
- **Placeholder scan:** none.
- **Type consistency:** AuthProvider methods consistent between Port (A.2) and adapter (B.2).
