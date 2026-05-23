# Features — What the App Does

A feature inventory of the live app, based on using it and reading the source. Marked
**[done]**, **[partial]**, or **[stub]** so the rebuild knows what actually works.

## Core loop (the whole point)

1. **Pick a key** (default C major). [done]
2. **Tap chord numbers** I–VII to build a progression. Each tap appends a chord; the app
   shows its real root note + diatonic 7th quality for the current key. [done]
3. **Hit "Suggest"** — every chord's quality is re-derived from a _randomly chosen mode_
   (modal interchange / borrowed chords), and each chord is labelled with the mode it
   was borrowed from. [done]
4. **Re-roll** by hitting Suggest again for a fresh set of substitutions. [done]
5. **Reset** to clear and start over, or **Save** the progression as a named song. [done/partial]

The result: a list of theory-correct alternative chords you can try on your instrument
to make a more interesting progression.

## Feature list

### Chord input (bottom dock)

- **Seven chord buttons** labelled I–VII (Roman numerals via a `roman` pipe; internally
  zero-indexed 0–6). [done]
- Tapping a button **appends** the chord to the current progression (you can add the same
  numeral multiple times; order is preserved). [done]
- There is **no delete-single-chord** or **reorder** — only full Reset. [gap]
- Onboarding hint "Enter some chord numbers to get started" shows while empty. [done]

### Chord display (canvas)

- Shows each chord as: **Nashville numeral / big serif root note / quality suffix /
  "from {mode}"**. [done]
- Goes **compact** when there are more than 4 chords (`compact` class). [done]
- Chords **animate in** as you add them. [done]
- "from {mode}" only reads meaningfully after Suggest; before Suggest everything is
  "from ionian" (major) or "from aolian" (minor) — i.e. the home mode. [done]

### Suggest (the borrowed-chord engine)

- Re-derives each chord's **quality** from a per-chord randomly selected mode while
  keeping the **root note** fixed (root comes from the key's scale, which doesn't change). [done]
- Slightly **biased toward the home mode** so you don't get total chaos every time (see
  `music-theory.md` for the exact algorithm). [done]
- Idempotent-ish: pressing Suggest again gives a new random set. [done]
- Switches the background to the **dark "results" gradient**. [done]

### Key selection (side drawer)

- **Note dropdown:** C, Db, D, Eb, E, F, G, Bb (8 of 12 — see note below). [done]
- **Maj / min toggle.** [done]
- Current key displayed as e.g. "Cmaj" / "Cmin". [done]
- Changing the key affects **newly entered** chords (the global key center in state); it
  does **not** retroactively re-spell chords already on the canvas. [behavior]
- Only **major** and the relative **natural minor (aeolian)** are offered as qualities. [done]
- ⚠️ Only **8 root notes** are present in the data (missing Gb/F#, Ab, A/Bbb area —
  specifically no `F#/Gb`, `Ab`, `A`, `B` major/minor entries). A gap to close in the rebuild. [gap]

### Navigation

- **Hamburger** opens the side drawer; backdrop tap or route change closes it. [done]
- Drawer nav: **Home** (`/`) and **Song List** (`/songs`). [done]

### Save / Songs (CRUD — mostly read + create)

- **Save** opens a "Choose a song name" dialog; on save it stores the song
  `{ name, chords }` and **navigates to that song's page** (`/songs/:name`). [done]
- **Persistence:** `localStorage` key `hmlocalsongs` (JSON). Songs reload on app start. [done]
- **Song List** (`/songs`): lists saved song names as links; empty state links back home. [done]
- **Song detail** (`/songs/:name`): shows the song title and its saved chords (reuses the
  chord display, on the dark gradient). [done]
- **No edit, no delete, no rename, no re-open-into-editor.** Create + view only. [gap]
- Saving from a song page back into the editor is sketched in code comments but **not
  implemented**. [stub]

### Hosting / platform

- Single-page app; deep links work via SPA redirect rule. [done]
- Mobile-first responsive layout. [done]

## Notable gaps / unfinished (from README "Upcoming changes" + code TODOs)

These were intended but never shipped — good candidates for the rebuild scope:

- Full **CRUD** for songs (edit, delete, reorder).
- **Firebase** (or other backend) integration for real, cross-device saving — currently
  localStorage only.
- **Auth / accounts.**
- **Chord reordering** within a progression.
- Letting the user **set the current mode** (suggestions assume ionian/aeolian as "home";
  `_getCurrentMode()` is hardcoded to 0).
- Further **accessibility** work.
- Likely-wanted but never present: delete a single chord, choose 7th vs. triad, audio
  playback, all 12 keys.

## User flows (quick reference)

**Make a progression and get suggestions**

> Open app → (optionally open drawer, pick key) → tap I, IV, V → read the diatonic chords
> → tap **Suggest** → read borrowed chords (each labelled with its source mode) → tap
> Suggest again to re-roll → try them on your instrument.

**Save & revisit**

> With chords on screen → **Save** → type a name → Save → lands on `/songs/:name` →
> later, drawer → **Song List** → tap the song → view it.
