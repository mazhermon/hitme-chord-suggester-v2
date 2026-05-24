# Chord Suggester Rebuild — Implementation Plan

> **For agentic workers:** This plan is executed **inline** in the current session
> (single developer with full context; tightly shared types/design tokens make per-task
> subagents counterproductive). Steps use `- [ ]` checkboxes. TDD for the pure engine;
> verify build/test/lint green at each phase boundary; commit per logical unit.

**Goal:** Rebuild the legacy "Hit me" chord suggester in Next.js 16 / React 19 with feature
parity, plus Web Audio playback, Firebase persistence, more substitution types, and all 12 keys.

**Architecture:** Pure, unit-tested `lib/theory` + `lib/audio` + `lib/storage` layers under a
thin React presentation layer (CSS Modules, GSAP). State via React context + useReducer.
`tonal` underpins note/scale/chord spelling for all 12 keys and richer substitutions.

**Tech Stack:** Next 16, React 19, TypeScript (strict), CSS Modules, Vitest, Playwright,
tonal, GSAP, Web Audio API, Firebase (Firestore, env-gated).

Spec: `docs/superpowers/specs/2026-05-24-chord-suggester-rebuild-design.md`

---

## File structure

```
src/
  lib/theory/
    types.ts            # Quality, Chord, KeyContext, Substitution, NoteName
    notes.ts            # note/midi/freq helpers over tonal
    keys.ts             # buildKey(tonic, mode) -> spelled scale; ALL_KEYS list (12×2)
    nashville.ts        # degree<->roman; romanForChord (case + symbol)
    chords.ts           # realizeChord(degree, key) -> diatonic Chord; symbol formatting
    modes.ts            # MODES quality tables (fixed aeolian/lydian); modeQuality(mode,deg)
    substitutions/
      types.ts          # SubstitutionStrategy interface
      modal-interchange.ts
      secondary-dominant.ts
      tritone.ts
      diatonic-third.ts
      index.ts          # STRATEGIES registry; suggestForProgression(...)
  lib/audio/
    voicing.ts          # chordToFrequencies(chord, key) -> number[]
    audio-engine.ts     # getCtx, playChord, playProgression (Web Audio API)
  lib/storage/
    types.ts            # Song, StorageProvider
    local.ts            # localStorageProvider
    firestore.ts        # firestoreProvider (env-gated)
    index.ts            # getStorage() chooses provider
  state/
    editor.ts           # EditorState, reducer, actions
    EditorProvider.tsx  # context + hook (useEditor)
  components/
    ChordDisplay/  ChordDock/  KeyDrawer/  PlayControls/  SaveDialog/  ...
  app/
    layout.tsx (done)  page.tsx  songs/page.tsx  songs/[name]/page.tsx
```

---

## Phase 3 — Theory engine (TDD)

Install: `npm i tonal`.

### Task 3.1: Types + note helpers

**Files:** Create `src/lib/theory/types.ts`, `src/lib/theory/notes.ts`, `src/lib/theory/notes.test.ts`

- [ ] Define types: `Quality` (string union of normalized qualities), `KeyContext { tonic; mode: 'major'|'minor' }`, `Chord { degree; root; quality; symbol; source }`.
- [ ] Test `notes.ts`: `noteToMidi('C4') === 60`, `midiToFreq(69) === 440`, `noteToFreq('A4')≈440`.
- [ ] Implement with tonal `Note.midi` / frequency; run tests green.

### Task 3.2: Keys (all 12 × maj/min) — closes the missing-keys gap

**Files:** Create `src/lib/theory/keys.ts`, `keys.test.ts`

- [ ] Test: `buildKey('C','major').scale` deep-equals `['C','D','E','F','G','A','B']`.
- [ ] Test: `buildKey('C','minor').scale` equals `['C','D','Eb','F','G','Ab','Bb']` (natural minor).
- [ ] Test previously-missing keys: `buildKey('F#','major').scale[0]==='F#'`; `buildKey('Ab','major')`, `buildKey('A','major')`, `buildKey('B','major')` all produce 7 spelled notes.
- [ ] Test `ALL_KEYS` has length 24 (12 tonics × {major,minor}).
- [ ] Implement `buildKey` via tonal `Scale.get(`${tonic} ${mode}`).notes` (major / natural minor → 'aeolian'). Build `ALL_KEYS` from the 12 standard tonic spellings.

### Task 3.3: Modes + diatonic chord realization (port + fix legacy)

**Files:** Create `src/lib/theory/modes.ts`, `src/lib/theory/chords.ts`, `chords.test.ts`

- [ ] Define MODES quality table (ionian..locrian) as rotations of ionian; fix `aeolian` spelling and lydian IV (`min7b5`, no stray `#`).
- [ ] Test (regression vs verified legacy): C major degrees [0,3,4] → symbols `['Cmaj7','Fmaj7','G7']`, source `diatonic`.
- [ ] Test: C minor degrees [0,5,3] → `['Cmin7','Abmaj7','Fmin7']`.
- [ ] Implement `realizeChord(degree, key)`: root = key.scale[degree]; quality = diatonic 7th of the key's home mode (ionian for major, aeolian for minor); `symbol = root + qualitySuffix(quality)`.

### Task 3.4: Nashville numerals

**Files:** Create `src/lib/theory/nashville.ts`, `nashville.test.ts`

- [ ] Test: `romanForDegree(0)==='I'` … `romanForDegree(6)==='VII'`; `degreeForRoman('IV')===3`.
- [ ] (Optional display) lowercase roman for minor-quality chords. Implement + green.

### Task 3.5: Substitution strategies (the "more substitutions" goal)

**Files:** Create `src/lib/theory/substitutions/{types,modal-interchange,secondary-dominant,tritone,diatonic-third,index}.ts` + `substitutions.test.ts`

- [ ] `SubstitutionStrategy { id; label; appliesTo(chord,key,prog,i): boolean; suggest(chord,key,prog,i): Chord[] }` (each returned Chord has a `source` explaining it).
- [ ] **modal-interchange**: re-quality a degree from a parallel mode; `source = 'from <mode>'`. Test: a degree-4 chord in C major can yield `Gmaj7` (from a mode where V is maj7) with correct source.
- [ ] **secondary-dominant**: for a diatonic target degree, produce the dominant-7 of that degree's root; `source = 'V/<roman>'`. Test: in C major, secondary dominant of ii (D) is `A7`, source `V/ii`.
- [ ] **tritone**: replace a dom7 with dom7 a tritone away; `source = 'tritone sub'`. Test: `G7` → `Db7`.
- [ ] **diatonic-third**: swap chord for diatonic chord a third away; Test: C major I (`Cmaj7`) → vi (`Amin7`), source `diatonic 3rd (vi)`.
- [ ] `index.ts`: `STRATEGIES` array; `suggestForProgression(prog, key, {enabled, rng})` returns a new chord per position (gentle home-bias re-roll like legacy), choosing among enabled strategies' candidates. Test determinism with injected `rng`.

### Task 3.6: Phase 3 gate

- [ ] `npm run test:run`, `npm run lint`, `npm run build` green. Commit "Phase 3: theory engine".

---

## Phase 5 (build before UI so the UI can wire it) — Audio engine

### Task 5.1: Voicing

**Files:** Create `src/lib/audio/voicing.ts`, `voicing.test.ts`

- [ ] Test: `chordToFrequencies({root:'C',quality:'maj7'...})` returns 4 ascending positive numbers near C4 chord tones.
- [ ] Implement: map chord → tonal `Chord.notes` → octave-assign (root ~C4) → midi → freq.

### Task 5.2: Audio engine

**Files:** Create `src/lib/audio/audio-engine.ts` (no unit test for AudioContext; smoke-guard with feature check)

- [ ] `getAudioContext()` lazy singleton (guard `typeof window`). `playChord(freqs,{duration,when})` schedules osc+gain ADSR. `playProgression(chords,key,{bpm})` sequences chords. `setMuted`.

---

## Phase 6 (build before UI wiring) — Storage

### Task 6.1: Local provider

**Files:** Create `src/lib/storage/{types,local,index}.ts`, `local.test.ts`

- [ ] `Song { id; name; key: KeyContext; chords: Chord[]; createdAt }`. `StorageProvider { list; get; save; remove }`.
- [ ] Test local provider with a mocked `localStorage`: save → list → get → remove. Migrates legacy `hmlocalsongs` `{name,chords}` shape.

### Task 6.2: Firestore provider (env-gated) + selector

**Files:** Create `src/lib/storage/firestore.ts`; finish `index.ts`

- [ ] `npm i firebase`. Initialize only if `NEXT_PUBLIC_FIREBASE_*` env present; export same `StorageProvider` interface over Firestore collection `songs`.
- [ ] `getStorage()` returns firestore provider when configured, else local. Document env vars in README.

---

## Phase 4 — UI (port identity, then extend)

State first, then components, then routes.

### Task 4.1: Editor state

**Files:** Create `src/state/editor.ts` (+ test), `src/state/EditorProvider.tsx`

- [ ] `EditorState { key; userChords; suggestedChords; mode: 'input'|'results'; enabledStrategies; bpm; muted }`. Reducer actions: `addChord(degree)`, `removeChordAt(i)`, `reset`, `suggest`, `setKey`, `toggleStrategy`, `setBpm`, `toggleMute`, `loadSong`. Test reducer transitions (add → input mode; suggest → results mode; reset → empty/input).
- [ ] Provider exposes `useEditor()`; persists nothing itself (save is explicit).

### Task 4.2–4.6: Components (CSS Modules; GSAP entry animations; reduced-motion safe)

- [ ] `ChordDisplay` — editorial chord cluster (numeral / serif root / quality / source). Compact >4. Tap a chord → play it; long-press/✕ to delete. Component test: renders symbols + source.
- [ ] `ChordDock` — I–VII buttons (pill, cream), + Suggest / Play / Reset / Save. Disabled when empty. Test: clicking I dispatches addChord(0).
- [ ] `KeyDrawer` — all 12 keys + Maj/min, strategy toggles, tempo, mute, nav links. Slide-over.
- [ ] `PlayControls` / wire audio engine to Play (progression) and chord taps.
- [ ] `SaveDialog` — name input → storage.save → route to `/songs/[name]`.

### Task 4.7: Routes

- [ ] `app/page.tsx` — the editor screen (light input bg → dark results bg).
- [ ] `app/songs/page.tsx` — list saved songs (client; reads storage). Delete + open-in-editor.
- [ ] `app/songs/[name]/page.tsx` — song detail (reuse ChordDisplay).

### Task 4.8: Phase 4 gate

- [ ] build/test/lint green; manual browser check; commit.

---

## Phase 7 — Final verification

- [ ] `npm run build`, `test:run`, `lint` green. Light Playwright e2e of the core flow.
- [ ] Drive the app in a browser (Playwright MCP), screenshot parity + new features (all-12 keys, substitution variety, play, save/delete).
- [ ] Update `existingAppNotes/rebuild-notes.md` status + write a top-level README. Commit.

---

## Self-review notes

- **Spec coverage:** all 4 enhancements mapped (audio P5, firebase P6, substitutions 3.5, 12 keys 3.2); parity features in P4. ✓
- **Type consistency:** `Chord`/`KeyContext` defined once in `lib/theory/types.ts` and reused by audio/storage/state. `source` is the provenance label across diatonic + all strategies. ✓
- **Build order:** engine → audio → storage → UI (UI depends on all three) → verify. ✓
- **Risks:** Firebase needs real config (falls back to local; documented). "miller-banner"→Playfair Display stand-in (documented).
