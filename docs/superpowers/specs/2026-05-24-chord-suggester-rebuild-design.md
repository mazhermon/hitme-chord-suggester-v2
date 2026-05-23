# Design Spec — Chord Suggester Rebuild (Next.js)

> **Status:** Autonomous draft. The user explicitly requested "plan and build… get very
> far without asking me, auto mode." So this spec records decisions made autonomously from
> the documented legacy app (`existingAppNotes/`) and the user's stated feature goals,
> rather than via interactive Q&A. The user can course-correct any decision at any time.

## Goal

Rebuild the legacy "Hit me" Angular chord suggester in **Next.js 16 / React 19** with
feature parity, then add the four enhancements the user asked for:

1. **Web Audio playback** — play a single chord on tap; play the whole progression on Play.
2. **Firebase persistence** — store progressions beyond localStorage (legacy was localStorage-only).
3. **More substitution types** — beyond modal interchange (secondary dominants, tritone sub, diatonic third-relation, …).
4. **All 12 keys** — legacy shipped only 8 of 12; support the full chromatic set with correct spelling.

Reference: `existingAppNotes/` (design, features, music-theory, architecture, rebuild-notes).

## Non-goals (YAGNI for v1)

- User accounts / multi-user auth (Firestore will be anonymous/local; auth is a later add).
- 3D / Three.js visuals (the stack includes R3F, but the product doesn't need it).
- A full DAW / sequencer, MIDI export, audio recording.
- Exhaustive substitution coverage (start with 4 high-value strategies, architected to extend).

## Architecture overview

Layered, framework-light. The theory engine and audio engine are **pure/standalone** and
unit-tested; React is a thin presentation layer; persistence is behind an interface.

```
src/
  lib/
    theory/            # PURE music theory — no React, fully unit-tested
      notes.ts          # note/pitch helpers (thin wrapper over tonal)
      keys.ts           # all 12 keys × {maj, min}, scales, correct spelling
      chords.ts         # Chord model + numeral→chord realization
      modes.ts          # modal data (fixed: aeolian spelling, lydian bug)
      substitutions/    # pluggable SubstitutionStrategy implementations
        index.ts         # registry + applySuggestions()
        modal-interchange.ts
        secondary-dominant.ts
        tritone.ts
        diatonic-third.ts
      nashville.ts      # roman numeral <-> degree formatting
    audio/
      audio-engine.ts   # Web Audio API: schedule chords, ADSR, progression playback
      voicing.ts        # chord -> array of frequencies (voicing)
    storage/
      types.ts          # StorageProvider interface, Song type
      local-storage.ts  # localStorage provider (default, no config)
      firestore.ts      # Firebase provider (gated on NEXT_PUBLIC_FIREBASE_* env)
      index.ts          # picks provider based on env, with fallback
  state/
      editor-store.ts   # React context + useReducer (mirrors legacy NgRx reducer)
  components/           # presentational + container React components (CSS Modules)
  app/                  # Next App Router routes
    layout.tsx
    page.tsx            # editor (the "Hit me" screen)
    songs/page.tsx      # saved song list
    songs/[name]/page.tsx
    globals.css         # design tokens (sage-green palette, etc.)
```

### Key library decisions

- **`tonal`** (`@tonaljs/tonal`) for note/scale/chord spelling and all-12-keys generation.
  Pure, tree-shakeable, well-maintained. Solves "all 12 keys" + correct enharmonics +
  underpins richer substitutions. We keep a thin domain layer on top (Nashville numbering,
  our Chord model, our substitution strategies) so the app isn't coupled to tonal's API.
- **State:** React `useReducer` + context. The data is tiny; no need for Redux/NgRx/Zustand.
  The reducer mirrors the legacy hitme reducer (userChords, suggestedChords, inputMode, key…).
- **Persistence:** `StorageProvider` interface. `LocalStorageProvider` is the default and
  needs zero config (keeps the build green and the app usable immediately). `FirestoreProvider`
  activates only when `NEXT_PUBLIC_FIREBASE_*` env vars are present, else we fall back to local.
- **Audio:** native **Web Audio API** (per the user's explicit request) — no Tone.js. A small
  `AudioEngine` lazily creates the `AudioContext` on first user gesture (autoplay policy),
  schedules oscillator+gain voices per note with a short ADSR envelope, and can play a chord
  or sequence a progression at a set tempo.
- **Fonts:** `next/font/google` — **Montserrat** (sans) + **Playfair Display** (serif, a free
  high-contrast analog to the legacy Typekit "miller-banner"). Self-contained build; the user
  can swap in the real Typekit kit later. Documented as a deliberate substitution.
- **Animation:** **GSAP** (already in stack) for chord entry + input↔results transitions,
  gated on `prefers-reduced-motion`.

## Music theory engine (the core value)

### Data model

```ts
type Quality = 'maj7' | 'min7' | '7' | 'min7b5' | 'dim7' | 'maj' | 'min' | ... // normalized
interface Chord {
  degree: number          // 0..6 Nashville scale degree (the "numeral")
  root: string            // spelled note, e.g. "Eb"
  quality: Quality
  symbol: string          // display symbol, e.g. "Ebmaj7"
  source: string          // provenance label, e.g. "diatonic", "from dorian", "V/ii", "tritone sub"
}
interface KeyCtx { tonic: string; mode: 'major' | 'minor' }
```

### Diatonic realization

Given a `KeyCtx` and a degree (0–6): derive the spelled root from the key's scale (via tonal)
and the diatonic 7th-chord quality. This replaces the legacy hand-coded `keys.data.ts` and
fixes the 8-of-12-keys gap and spelling quirks. All 12 majors + 12 (natural) minors.

### Substitution strategies (extensible — this is the "more substitutions" goal)

A strategy takes `(chord, keyCtx, progression, index)` → `Substitution[]` (each with a new
chord + human-readable explanation). `applySuggestions()` runs selected strategies. v1 set:

1. **Modal interchange** (ported + fixed): re-quality a degree from a parallel mode; label
   the source mode. Keep the legacy "home-mode bias" idea but make it correct for minor keys.
2. **Secondary dominants** (V/x): insert/replace with the dominant 7th of a diatonic target.
3. **Tritone substitution**: replace a dominant 7th with the dom7 a tritone away.
4. **Diatonic third-relation**: swap a chord for its diatonic relative (e.g. I↔vi, IV↔ii).

"Suggest" applies strategies per-chord (with the same gentle randomness/bias the legacy app
had, so you can re-roll). Each suggested chord shows _why_ it was chosen (its `source`).
Which strategies are active is user-toggleable in the drawer (default: all on).

### Worked-example tests (TDD)

Port the verified legacy examples as regression tests (C maj I-IV-V → Cmaj7/Fmaj7/G7; C min
I-VI-IV → Cmin7/Abmaj7/Fmin7), plus new tests per substitution strategy and for the
previously-missing keys (F#, Ab, A, B).

## Audio engine

- `getAudioContext()` lazily on first gesture. `playChord(chord, {duration})` and
  `playProgression(chords, {bpm})` with scheduled start times and an envelope to avoid clicks.
- `voicing.ts`: chord → MIDI notes (root position, sensible spread, maybe add octave),
  → frequencies. Uses tonal for note→midi.
- UI: a **Play** button in the dock plays the progression; tapping a displayed chord plays it.
  Tempo control in the drawer. Respects a mute toggle.

## Persistence

- `Song = { id, name, key, chords, createdAt }`.
- `StorageProvider`: `list()`, `get(id|name)`, `save(song)`, `remove(id)`.
- Default `LocalStorageProvider` (key `hmlocalsongs`, migrates legacy shape if present).
- `FirestoreProvider` behind env detection; same interface; collection `songs`.
- This finally delivers the legacy README's never-built "Firebase for better saving," while
  keeping local as a zero-config fallback. **Adds delete + (re)open-into-editor** (legacy gaps).

## UI / UX (port the identity, then extend)

- **Routes:** `/` editor, `/songs` list, `/songs/[name]` detail.
- **Editor:** generous canvas with the editorial `ChordDisplay`; sticky bottom **ChordDock**
  (I–VII buttons + Suggest / Play / Reset / Save); light input bg → dark results bg shift.
- **Drawer:** all-12 key selector + Maj/min, substitution-strategy toggles, tempo, mute,
  nav (Home, Songs).
- **New affordances** vs legacy: delete a single chord, reopen a saved song to edit,
  per-chord and whole-progression playback.
- **Design tokens** ported to `globals.css` custom properties (`--green #83a085`, etc.); the
  cream "mat" frame; GSAP chord-entry + transition animations (reduced-motion safe).
- Accessibility: real buttons, labels, focus rings, keyboard operable, reduced-motion.

## Testing & verification

- **Unit (Vitest, TDD):** entire `lib/theory` (engine, keys, substitutions) and `lib/audio`
  voicing + `lib/storage` local provider (mock localStorage).
- **Component (Testing Library):** dock interactions, suggest flow, save dialog.
- **e2e (Playwright):** core flow (enter chords → suggest → play → save) — light.
- **Gates:** `npm run build`, `npm run test:run`, `npm run lint` green at every phase;
  manual browser check + screenshots at the end (verification-before-completion discipline).

## Build order (phases — see implementation plan)

1. ✅ Scaffold + green toolchain. 2. Theory engine (TDD, all keys, substitutions).
2. Audio engine. 4. Storage layer. 5. UI (editor, drawer, songs). 6. Wire audio + firebase.
3. Final verification + screenshots.

## Risks / open items (non-blocking)

- Firebase needs real project config to actually sync; until then it transparently uses
  localStorage. Will document the env vars and `firebase init` steps.
- "miller-banner" is proprietary (Typekit); using Playfair Display as a close free stand-in.
- Substitution music-theory correctness: cover with explicit example tests; easy to extend/fix.
