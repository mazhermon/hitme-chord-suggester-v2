# Music Theory Engine

This is the part of the app that actually carries the value. The UI is a shell around
this logic. Everything here was read from the legacy source **and verified against the
live site** (worked examples below match real screenshots).

## Concept 1 — Nashville Number System

Instead of naming chords by letter (C, F, G), you describe a progression by its **scale
degree** relative to the key: I, IV, V, etc. The same "I IV V" works in any key — the app
just plugs in the right notes for whichever key you've selected.

- The seven buttons are **I–VII**, but internally they're **0-indexed (0–6)**. A `roman`
  pipe maps `0→I, 1→II, … 6→VII`.
- A chord is stored with its `numeral` (the 0-based index, as a string/number), which is
  used to look up **both** its root note (from the key's scale) and its quality (from a
  mode's scale).

## Concept 2 — Modal interchange / borrowed chords ("Suggest")

[Modal interchange](https://en.wikipedia.org/wiki/Borrowed_chord) means borrowing a chord
from a **parallel mode** (same root, different mode) to add colour. In each of the 7 modes
of the major scale, the chord built on a given scale degree has a **different quality**.
"Suggest" exploits this: it keeps the **root note** of each chord fixed but swaps its
**quality** to what that scale degree would be in some other (randomly chosen) mode — and
tells you which mode it borrowed from.

## The data

### Keys (`data/keys.data.ts`)

16 entries = **8 root notes × {maj, min}**. Each has `name`, `quality`, and a 7-note
`scale`. Minor = **natural minor (aeolian)**.

| Key    | Scale (degrees I–VII) |
| ------ | --------------------- |
| C maj  | C D E F G A B         |
| C min  | C D Eb F G Ab Bb      |
| Db maj | Db Eb F Gb Ab Bb C    |
| Db min | Db Eb E Gb Ab A B     |
| D maj  | D E F# G A B C#       |
| D min  | D E F G A Bb C        |
| Eb maj | Eb F G Ab Bb C D      |
| Eb min | Eb F Gb Ab Bb B Db    |
| E maj  | E F# G# A B C# D#     |
| E min  | E F# G A B C D        |
| F maj  | F G A Bb C D E        |
| F min  | F G Ab Bb C Db Eb     |
| G maj  | G A B C D E F#        |
| G min  | G A Bb C D Eb F       |
| Bb maj | Bb C D Eb F G A       |
| Bb min | Bb C Db Eb F Gb Ab    |

> ⚠️ **Only 8 of 12 roots** are present (missing F#/Gb, Ab, A, B). Some minor spellings
> are enharmonic shortcuts rather than strict theory spellings (e.g. Db min lists `E`/`A`/`B`
> instead of `Fb`/`Bbb`/`Cb`). The original code comments note an intent to generate keys
> programmatically or via a library "some day."

### Modes (`data/modes.data.ts`)

7 modes, each a list of the **diatonic 7th-chord qualities** for degrees I–VII. Each mode's
quality list is simply a **rotation** of the ionian list.

| Mode (index)   | I        | II       | III      | IV        | V        | VI       | VII      |
| -------------- | -------- | -------- | -------- | --------- | -------- | -------- | -------- |
| ionian (0)     | maj7     | min7     | min7     | maj7      | 7        | min7     | min7(b5) |
| dorian (1)     | min7     | min7     | maj7     | 7         | min7     | min7(b5) | maj7     |
| phrygian (2)   | min7     | maj7     | 7        | min7      | min7(b5) | maj7     | min7     |
| lydian (3)     | maj7     | 7        | min7     | #min7(b5) | maj7     | min7     | min7     |
| mixolydian (4) | 7        | min7     | min7(b5) | maj7      | min7     | min7     | maj7     |
| aolian\* (5)   | min7     | min7(b5) | maj7     | min7      | min7     | maj7     | 7        |
| locrian (6)    | min7(b5) | maj7     | min7     | min7      | maj7     | 7        | min7     |

> Quirks to clean up in the rebuild: `aolian` is a misspelling of **aeolian**; lydian's IV
> shows a stray `#` (`#min7(b5)` — should be `min7(b5)`). There's a commented-out
> alternate MODES table in the source that hard-coded flats; the live version relies on
> the key scale to supply accidentals.

## The algorithm

### `setChord(numeral, key, mode?)` — build one chord

1. Decide which mode to use:
   - if `mode` is passed → use it;
   - else default to the **home mode** of the key: `maj → ionian (0)`, `min → aeolian (5)`.
2. `quality = MODES[mode].scale[numeral]`
3. `rootNote = key.scale[numeral]`
4. Return `{ numeral, rootNote, quality, key, modeName }`.

So before "Suggest", every chord uses the home mode → in a major key all chords read
"from ionian"; in a minor key, "from aolian".

### `hitMe(chords)` — the Suggest button

For **each** chord in the current progression, independently:

1. `mode = _getRandomMode()`
2. rebuild it with `setChord(chord.numeral, globalKey, mode)`

Root notes never change (they come from the unchanged key scale); only qualities and the
"from {mode}" label change.

### `_getRandomMode()` — the randomisation (with a home-mode bias)

```
randomMode = randInt(1..6)     // never 0 (ionian); never repeats ionian as the "borrowed" pick
currentMode = 0                // hardcoded "home" = ionian (see bug note)
diceRoll  = randInt(1..6)
return diceRoll > 2 ? randomMode : currentMode
```

- ~**2/3** of the time you get a genuinely borrowed mode (dorian…locrian).
- ~**1/3** of the time the chord stays in ionian (diatonic) — this "shifts the balance
  toward staying put" so you don't get a wall of changes at once (per the source comment).

> 🐞 **Known logic quirks** for the rebuild:
>
> - `_getCurrentMode()` is hardcoded to `0` (ionian) regardless of key. In a **minor** key
>   the "stay home" fallback therefore lands on ionian, not aeolian — slightly off.
> - `randInt(1..6)` can never select ionian (0) as the _borrowed_ mode and can select
>   locrian (6); the home-mode path is the only way to get ionian. Intentional-ish, but
>   worth re-examining when you redesign the engine.
> - There's no de-duplication, so Suggest can occasionally "borrow" the same quality the
>   chord already had.

## Worked examples (verified live)

**C major, enter I–IV–V (no Suggest)** → `screenshots/02-chords-entered-Cmaj.png`

- I (0): root `C`, ionian[0]=`maj7` → **Cmaj7** (from ionian)
- IV (3): root `F`, ionian[3]=`maj7` → **Fmaj7** (from ionian)
- V (4): root `G`, ionian[4]=`7` → **G7** (from ionian)

**Same progression, then Suggest** → `screenshots/03-suggested-borrowed.png`

- I → **C7** _from mixolydian_ (mixolydian[0]=`7`)
- IV → **F7** _from dorian_ (dorian[3]=`7`)
- V → **Gmaj7** _from locrian_ (locrian[4]=`maj7`)

**C minor, enter I–VI–IV (no Suggest)** → `screenshots/05-chords-Cmin.png`

- I (0): root `C`, aeolian[0]=`min7` → **Cmin7** (from aolian)
- VI (5): root `Ab`, aeolian[5]=`maj7` → **Abmaj7** (from aolian)
- IV (3): root `F`, aeolian[3]=`min7` → **Fmin7** (from aolian)

## Re-implementation notes

- This entire engine is **pure, deterministic data + a tiny bit of randomness** — no
  network, no framework. It ports cleanly to plain TypeScript functions in the Next.js
  app (and is trivially unit-testable).
- Consider a proper music-theory library (e.g. **tonal.js**) to generate all 12 keys,
  correct enharmonic spelling, optional triad/7th/extensions, and to fix the data quirks
  above — while keeping the same Nashville-in / borrowed-chords-out UX.
