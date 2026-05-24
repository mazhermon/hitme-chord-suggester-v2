# Hit me — chord suggester (v2)

A songwriting tool: enter a chord progression with Nashville numbers (I–VII), see the real
chords for your key, then **Suggest** theory-correct substitutions to find more interesting
options — and **play** them back. A Next.js rebuild of the original Angular app
(see `existingAppNotes/`).

## Features

- **All 12 keys**, major and (natural) minor, with correct enharmonic spelling (via `tonal`).
- **Multiple substitution types** (toggleable in the drawer):
  - Modal interchange (borrowed chords from parallel modes)
  - Secondary dominants (V7/x)
  - Tritone substitution
  - Diatonic third-relation
- **Web Audio playback** — tap a chord to hear it, or Play the whole progression at a set tempo.
- **Save progressions** — to `localStorage` by default, or **Firebase/Firestore** when configured.
- Delete songs, and reopen a saved song back into the editor.

## Tech stack

Next.js 16 · React 19 · TypeScript (strict) · CSS Modules · `tonal` · GSAP · Web Audio API ·
Firebase (Firestore, optional) · Vitest · Playwright.

The music-theory and audio logic live in pure, unit-tested modules under `src/lib/`; React is
a thin layer on top. See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the
design spec and implementation plan.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm run test:run   # unit tests (Vitest)
npm run lint
npm run build
npm run e2e        # Playwright (optional)
```

## Firebase (optional)

Without config the app uses `localStorage`. To enable cloud sync, copy `.env.example` to
`.env.local` and fill in your Firebase web-app credentials:

```
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```

Songs are stored in a Firestore collection named `songs`. (No auth yet — a natural next step.)

## Notes

- The display serif is **Playfair Display** (via `next/font`), a free stand-in for the
  original's proprietary Typekit "miller-banner". Swap in the real kit any time.
- `src/lib/theory` fixes several legacy data bugs (the `aolian` typo, a stray accidental in
  the lydian table, the hard-coded "home mode") and covers them with regression tests.
