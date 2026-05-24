# Hit me — chord suggester (v2)

A songwriting tool: enter a chord progression with Nashville numbers (I–VII), see the real
chords for your key, then **Suggest** theory-correct substitutions to find more interesting
options — and **play** them back. A Next.js rebuild of the original Angular app
(see `existingAppNotes/`).

## Features

- **All 12 keys**, major and (natural) minor, with correct enharmonic spelling (via `tonal`).
- **Genre presets** — Jazz / Folk / Pop / House. Picking one reconfigures the suggestion
  behaviour, default chord extensions, and the synth so "Suggest" feels idiomatic
  (jazz → tritone subs & functional dominants; house → modal min9 pads; folk → suspensions; …).
- **Multiple substitution types** (toggleable in the drawer):
  - Modal interchange (borrowed chords from parallel modes — excludes the rare locrian)
  - Secondary dominants (V7/x)
  - Tritone substitution
  - Diatonic third-relation
  - Suspensions (sus2 / sus4)
  - Planing — the house "pitched stab": transpose a chord up/down keeping its shape
- **Suggest changes only 1–2 chords** at a time (re-roll for variety). Per chord you can:
  click to **swap** just that chord, **lock** it so Suggest leaves it, or **revert** to diatonic.
- **Chord extensions** — include 7ths / 9ths / 11ths (cumulative); changes the symbols and
  what you hear.
- **Per-chord voicing** — cycle each chord through inversions, drop-2, open, and octave voicings.
- **Guitar & piano chord diagrams** — toggle "Show guitar chords" / "Show piano chords" to
  see a six-string fretboard or a keyboard under each chord (chord tones highlighted). On the
  piano, the keys also light up in time as a chord is played (the arpeggio is spelled out).
- **Web Audio playback** with an editable **ADSR envelope** + waveform — tap a chord to hear it
  (spelled out one note at a time), or Play the whole progression at a set tempo.
- **Music-theory lessons** — click a chord's source label ("planed ↓m3", "V/ii", …) for a short
  explanation of why that substitution works.
- **Export to MIDI** — download the progression as a `.mid` file to drag into Logic / Ableton.
- **Responsive menu** — a persistent left sidebar on wide screens, an overlay drawer on small ones.
- **Accessible** — WCAG AA contrast, full keyboard support with visible focus, labelled controls,
  a proper modal dialog, and reduced-motion support.
- **Save progressions** — to `localStorage` by default, or **Firebase/Firestore** when configured.
- Delete songs, and reopen a saved song back into the editor.

## Tech stack

Next.js 16 · React 19 · TypeScript (strict) · CSS Modules · `tonal` · `midi-writer-js` · GSAP ·
Web Audio API · Firebase (Firestore, optional) · Vitest · Playwright.

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
