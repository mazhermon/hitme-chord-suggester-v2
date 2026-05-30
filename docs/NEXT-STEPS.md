# Next steps & decisions to discuss

Captured at the end of the production-hardening sprint (2026-05-30) so we
don't lose context. Two sections: **prioritised options** (work we could
pick up next) and **open decisions** (things only the maintainer can choose
and that block downstream work).

---

## Prioritised options

### 1. Firebase auth + per-user songs (BLOCKS public deployment)

**Status today:** Firestore SDK is wired and lazy-loaded; the `songs`
collection is **open** to anyone who knows the project ID. Fine for a
single-user app you don't host publicly; **not** safe to ship.

**Pick one path:**

| Option | UX cost | Eng cost | Notes |
|---|---|---|---|
| **Google sign-in only** | One tap, no form | ~half a day | Lowest friction; lock-in to a Google account |
| **Email magic link** | Enter email, click link | ~1 day | Provider-agnostic; needs Firebase Auth's email templates configured |
| **Anonymous-first, upgrade later** | Zero friction; upgrade modal when they want sync | ~1.5 days | Best UX; most state-handling work (anon → linked-account migration) |

In all three, Firestore docs go under `users/{uid}/songs/{songId}` instead
of the top-level `songs`. Existing local songs stay in localStorage and
migrate on first sign-in (one-off copy from local → user's Firestore doc).

**Why it matters:** the user explicitly raised "users won't lose songs if
they clear local storage." This is the answer — cloud-sync per user.

### 2. Firestore security rules (BLOCKS option 1)

Once auth is in, write `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/songs/{songId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Test with the Firebase emulator suite (`firebase emulators:start`) and
add a `firestore.rules.test.js` that fails if you accidentally open the
collection.

### 3. Deploy to Vercel

Roadmap item `docs/roadmap/05-deploy-to-vercel.md`. Mostly a `vercel` CLI
walk-through; add a GitHub Action for preview deploys on PRs. **Don't do
this before auth lands** — the alpha would leak everyone's "songs" the
moment two people open the same URL.

### 4. CSP header

Deferred from Phase A of this sprint. CSP needs to allow:
- `'self'` for our own scripts/styles
- The Firebase SDK domains (`*.googleapis.com`, `*.gstatic.com`,
  `securetoken.googleapis.com`, `identitytoolkit.googleapis.com`)
- `data:` URIs for the canvas → video export (MediaRecorder)
- `blob:` URIs for the audio/video object URLs

Easy to break Web Audio + MediaRecorder + Firestore with a too-strict
CSP, so we defer this until the deploy target (and therefore the exact
allowed-origins list) is fixed.

### 5. Visual regression in CI (Linux baselines)

Today: `npm run e2e:visual` runs locally on macOS. Baselines committed
as `*-chromium-darwin.png`. CI on Linux would mismatch every time due
to font rendering. Two ways forward when we deploy:

- **Container-based VR** — run Playwright in `mcr.microsoft.com/playwright`
  image both locally and in CI; one set of baselines, predictable.
- **Per-OS baselines** — keep `-darwin.png`, generate `-linux.png` in CI
  on first run, commit both. Smaller upfront work, more files in git.

### 6. Whole-progression piano highlight

In ARCHITECTURE.md as a known limitation: today the piano keys only
light up in time when you tap a single chord's ▶. Whole-progression
Play doesn't drive the highlight. Fix is in `EditorScreen.handlePlayAll`
— schedule the same `setTimeout` chain that `ChordDisplay.handlePlay`
uses, but for the full sequence. ~1 hour.

### 7. Auto-play a chord on swap

When the user clicks ⇄ on a chord, ChordDisplay re-renders with the new
chord but doesn't play it. Playing it immediately (cheap arpeggio) makes
"Swap" feel musical instead of text-only. ~15 min.

### 8. Real Typekit "miller-banner" font

Playfair Display via `next/font/google` is a free stand-in for the
proprietary Adobe font from the legacy app. Swap it in once the project
lives behind a paid domain. Code change is one line in `app/layout.tsx`
plus an Adobe Fonts project ID. ~15 min once we have the kit.

### 9. MIDI export configurability

ADR-003 fixed at 2 beats per chord. Could expose ½ / 1 / 2 bars in the
drawer (Sound section). Adds one slider + one option in `progressionToMidi`.
~30 min.

### 10. Cross-OS visual-regression CI integration

See #5 — pairs with that decision.

---

## Open decisions (need maintainer input)

These block downstream work and only you can pick.

### D-1. Auth provider choice — RESOLVED (partial)
**Decided (2026-05-30):** anonymous-first → magic-link upgrade UX. Deploy
target is **Vercel**. App is intended for **public use**. See
`docs/AUTH-PLAN.md` for the full UX flow and provider analysis.

**Still pending — bring up before starting auth work:**

- **D-1a — Provider:** Supabase (Claude's recommendation, ~half-day
  migration cost; ~half the bundle; portable Postgres; predictable
  pricing) vs stay on Firebase (zero migration; we already have ~50 LOC
  of Firestore wiring). Either ships the same UX.
- **D-1b — Email sender:** Resend's free tier (3K emails/mo, simplest
  setup) or wire SendGrid/Postmark/SES.

Once both are answered I'll write the phase-by-phase implementation
plan and execute on a fresh `auth-and-cloud-sync` branch.

### D-2. Deploy target — RESOLVED
**Decided (2026-05-30): Vercel.**

### D-3. Public vs personal app — RESOLVED
**Decided (2026-05-30): public.** Influences how seriously we treat
auth, RLS rules, support flows, and analytics — all stay in scope.

### D-4. Should genre presets get a "lush" example with layered waveforms?
With Phase F shipped, we now have the capability. Could add a 5th preset
("Pad" or "Lush" with sine + triangle layered, slow attack, long release)
that demonstrates the feature. Or leave it as a power-user discovery.

### D-5. VR baselines — commit them or .gitignore them?
We just committed 10 PNGs (~1.6 MB). They diff well in pull requests and
make "design changed" reviewable. Alternative: gitignore them and treat
each developer's local cache as authoritative — smaller repo, no
review-time signal. I'd keep them committed but happy to revisit.

### D-6. Pre-commit hook strictness
Currently runs `lint && test:run` on every commit. About 11s. If this
ever feels too slow we can: only lint+test changed files; or move to
pre-push; or do nothing here and rely on CI. I'd keep it as-is —
catching regressions before they hit the branch is worth 11s.

---

## Items I deferred during this sprint

Logged so you can challenge them:

- **`npm audit` postcss XSS** — flagged as moderate; the "fix" downgrades
  Next to 9.x. We're not exposed (no user-supplied CSS stringification at
  runtime). Will revisit if a real fix lands without the Next downgrade.
- **CSP header** — see #4 above.
- **Firestore rules** — see #2 above (gated on auth).
- **Cross-OS VR baselines** — see #5 above (gated on deploy).
- **Bigger envelope.ts tests** — only added the contract test for the new
  multi-waveform shape. The full audio-engine oscillator-graph behaviour
  isn't unit-testable in jsdom; depends on a real AudioContext (would need
  Playwright + browser audio capture, which is heavy for the payoff).
- **AGENTS.md "Adding a new route" section** — Next 16 has enough nuance
  here that I'd want to walk through one concrete example with you before
  documenting the pattern, vs. guessing at the right shape.

---

## How to use this doc

When we sit down to do more work: pick one numbered item from "Prioritised
options" and we'll plan + ship. For "Open decisions," answer the question
(it can be one line) and the corresponding option unblocks.
