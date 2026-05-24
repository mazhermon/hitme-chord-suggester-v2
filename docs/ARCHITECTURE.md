# Architecture & Engineering Notes

The as-built reference for the chord suggester. The dated files in
`docs/superpowers/specs` and `docs/superpowers/plans` are point-in-time design snapshots;
**this doc reflects what actually shipped** and the non-obvious things learned building it.

## Shape of the app

A thin React/Next layer over pure, unit-tested domain logic. Anything musical or
file-format-related lives in `src/lib/` with no React imports, so it's testable in isolation
and reusable (the synth, the diagrams, and the MIDI export all share one voicing).

```
src/lib/
  theory/        notes, keys, modes, chords, nashville, extensions, styles, lessons,
                 substitutions/*   ← the music-theory engine (pure)
  audio/         voicing (chordToMidi/chordToFrequencies), audio-engine (Web Audio), envelope
  guitar/        voicing (fretboard fingering finder)
  piano/         keyboard (layout helpers)
  midi/          export (Standard MIDI File via midi-writer-js)
  storage/       StorageProvider: local + env-gated Firestore
src/state/       editor reducer (slot model) + EditorProvider (context)
src/components/  ChordDisplay, ChordDock, KeyDrawer, LessonPanel, SaveDialog,
                 ChordDiagram (guitar), PianoChord, Button, Editor (screen)
src/app/         / (editor), /songs, /songs/[name], layout, globals.css
```

Routes: `/` is the editor (client, behind `EditorProvider`), `/songs` lists saved songs,
`/songs/[name]` views one. Tests: 27 files / 126 tests (Vitest); the pure `lib/` is TDD'd.

## Core data model (`src/lib/theory/types.ts` + state)

- **`Chord`** `{ degree, root, quality, symbol, source, voicing? }` — `degree` is the 0-based
  Nashville scale degree; `quality` is the base **seventh-form** (`maj7`/`min7`/`7`/`min7b5`/
  `dim7`/`sus2`/`sus4`/…); `symbol` is the seventh-form display; `source` is the provenance
  label (`"diatonic"`, `"from C dorian"`, `"V/ii"`, `"tritone sub"`, `"diatonic 3rd (vi)"`,
  `"planed ↑M2"`). The displayed symbol/voicing is derived at render time from `quality` +
  the current **extension level** — `quality` itself is never extension-aware.
- **`ChordSlot`** `{ base, sub, locked }` (state) — one progression position. Displayed chord =
  `sub ?? base`. This is what enables per-chord swap/lock without a global "input vs results".
- **`Song`** (storage) `{ id, name, key, chords, createdAt, extensions?, locked? }` — **must**
  persist `extensions` (the level) and `locked`, or a reload renders at the wrong level.

## Theory engine

- **Keys** (`keys.ts`): all 12 tonics × {major, minor}, spelled via `tonal` `Scale.get`
  (minor = aeolian). Replaces the legacy hand-coded 8-key table.
- **Modes** (`modes.ts`): diatonic 7th qualities derived as **rotations of ionian** (fixes the
  legacy `aolian` typo and a stray `#` in lydian).
- **Extensions** (`extensions.ts`): `ExtensionLevel = triad|seventh|ninth|eleventh`.
  `renderQuality(quality, level)` → `{ suffix, tonalType }`. **maj caps at the 9th** (maj11
  is dissonant / not a tonal type); half-dim supports `m9b5`; min reaches `m11`. Flags are
  cumulative (`levelFromFlags`/`flagsFromLevel`).
- **Substitutions** (`substitutions/`): each strategy implements
  `suggest(ctx) => Chord[]` with a `source` label. **To add one:** create the module, add it
  to `STRATEGIES` in `substitutions/index.ts`, and (optionally) reference it from a style.
  Current set: `modal-interchange` (borrows from parallel modes on the tonic — **locrian
  excluded** as too rare), `secondary-dominant` (V7/x), `tritone`, `diatonic-third`,
  `suspension` (sus2/sus4), `planing` (transpose the shape ±M2/P4/P5/m3 — the house "pitched
  stab"). `candidatesFor()` gathers candidates; `pickCandidate()` does a weighted pick.
- **Genres** (`styles.ts`): jazz/folk/pop/house presets. Picking one (`setStyle`) reconfigures
  `enabledStrategies` + per-strategy `weights` + default `extensionLevel` + `envelope`, so
  "Suggest" feels idiomatic (jazz → tritone/secondary dominants + 9ths; house → modal min9 +
  planing + sine pad; folk → suspensions + triads; pop → borrowed chords + triads).
- **Lessons** (`lessons.ts`): `lessonForSource(source)` maps a provenance label → a short
  theory lesson; powers the LessonPanel opened by clicking a chord's source.

## Suggest behaviour (`src/state/editor.ts`)

`suggest` re-rolls: it resets unlocked slots to diatonic, then substitutes a **random 1–2**
unlocked positions (never locked ones). Per-chord: `swapChord` re-rolls just one, `revertChord`
returns it to diatonic, `toggleLock` freezes it. The light→dark canvas keys off "any
substitution present" (`isResultsMode`).

## Audio (`src/lib/audio/`)

- `chordToMidi(chord, {level, voicing})` is the single source of voicing truth — used by the
  synth, the piano diagram, and the MIDI export. `chordToFrequencies` = `chordToMidi().map(midiToFreq)`.
- Voicing variants: close / 1st & 2nd inversion / drop-2 / open / octave-up (cycled per chord).
- `audio-engine.ts`: native **Web Audio API**, no Tone.js. Lazy `AudioContext` created/resumed
  on a user gesture (autoplay policy). `playChord` (optionally **arpeggiated** — single-chord ▶
  spells the chord out), `playProgression` (block chords at a bpm), ADSR `envelope` + waveform.
- **`ARPEGGIO_STEP` (0.16s)** is exported and shared so the piano's timing highlight stays in
  sync with the arpeggio.

## Diagrams

- **Guitar** (`lib/guitar/voicing.ts` + `ChordDiagram`): `findGuitarShape` searches standard
  tuning for a fingering where only chord tones sound, the root is in the bass, within a 4-fret
  span; display 9ths/11ths reduce to the underlying 7th shape.
- **Piano** (`lib/piano/keyboard.ts` + `PianoChord`): SVG keyboard; chord tones highlighted
  teal, the currently-sounding note amber. `PianoChord` is **purely presentational** — the
  play-timing animation lives in `ChordDisplay`'s play handler (see React Compiler note below).

## MIDI export (`src/lib/midi/export.ts`)

`progressionToMidi` builds a one-track Standard MIDI File with `midi-writer-js`: each chord is a
block of its voiced notes lasting `beatsPerChord` (default 2 = a half note), in sequence;
`downloadMidi` saves it. DAWs import via drag-in / "Import MIDI" (clipboard paste of MIDI isn't
portable).

> **Decision — no tempo event.** Note order and spacing are stored in **ticks** relative to the
> file's PPQ (`division`), which is independent of tempo; the tempo meta (`FF 51`) only maps
> ticks→seconds. We omit it so nothing can override the user's project tempo — the chords still
> import sequentially on the correct beats (verified: a 3-chord export places chords at ticks
> 0/256/512 with no `FF 51`). Whether a file's tempo would otherwise override is the DAW's call
> (Logic's Project-Tempo mode, Ableton leaving clip imports alone, Pro Tools' prompt) — there's
> no "advisory only" flag in the SMF spec.

## Persistence (`src/lib/storage/`)

`StorageProvider { list, get, save, remove }`. `getStorage()` returns the **Firestore** provider
when `NEXT_PUBLIC_FIREBASE_*` env vars are present (collection `songs`), else the **localStorage**
provider (key `chordhelper.songs`). No auth yet. Legacy songs saved before `extensions` existed
render at the base 7th level; they **heal on re-save** (open in editor → Save) — the lost level
can't be recovered for old entries.

## Accessibility (WCAG AA)

- **Contrast:** cream text on the original light sage was ~2.7:1 (fail). Text-bearing surfaces
  are deepened: `--green-deep #46624a` (~6.4:1), `--panel #3f5a43` (~7.2:1), `--green-deeper
#2f4636` (~9.7:1), results bg darker still. `--green #83a085` is a **brand accent only**
  (borders/decoration), never a text background. Diagram highlights: `--highlight-chord`
  (teal), `--highlight-active` (amber).
- Global `:where(...):focus-visible` ring; labelled controls ("Add chord I", "Swap …", "About
  …"); SaveDialog is a real modal (role/aria-modal/labelledby/Escape/focus-trap/return-focus);
  drawer + lesson panel close on Escape; one sr-only `<h1>`; `prefers-reduced-motion` honoured
  globally.

## Gotchas / dev notes (the things that bit us)

- **React Compiler lint is ON** (eslint-config-next, surfaces as build/lint errors): no ref
  writes during render, no `setState` during render, **no synchronous `setState` in an effect
  body**. Keep effects cleanup-only; do state updates in event handlers / async callbacks.
  (This is why PianoChord is presentational and the piano animation lives in a click handler.)
- **Vitest:** `globals: true` is set in `vitest.config.ts` to match `tsconfig`'s
  `"types": ["vitest/globals"]`.
- **tonal quirks:** `maj11` doesn't exist (cap maj at the 9th); descending intervals are
  written like `-2M`; natural minor is `aeolian`.
- **midi-writer-js:** its published `package.json` `exports` points the types entry at a path
  it doesn't ship, so TS can't resolve them → local ambient declaration in
  `src/types/midi-writer-js.d.ts`.
- **Fonts:** Montserrat (sans) + **Playfair Display** (serif) via `next/font`. Playfair is a
  free stand-in for the original's proprietary Typekit "miller-banner" — swap the kit in later.
- **Next.js 16:** per `AGENTS.md`, read `node_modules/next/dist/docs/` before writing Next code
  (newer than training data).
- Unused **Three.js/R3F** from the bootstrap template were removed — this app doesn't do 3D.
  **GSAP** is currently used for one thing (the intro fade); could be dropped for CSS.

## Known limitations / future steps

- Firebase **auth** (Firestore is wired but unauthenticated).
- Real Typekit "miller-banner" font.
- Piano timing highlight currently fires for single-chord ▶ only, not whole-progression Play.
- MIDI export uses a fixed 2-beats-per-chord; could be made configurable (½ / 1 / 2 bars).
