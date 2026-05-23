# Rebuild Notes — Legacy → React / Next.js

A bridge between the existing Angular app and the planned React + Next.js rebuild. The
user will provide more detail on the new stack/requirements later — this is a starting
map, not the final plan. **No architectural decisions are locked in here.**

## What absolutely must carry over (the value)

1. **The music-theory engine** — Nashville-number input → diatonic chords → modal-interchange
   "Suggest." This is the product. See `music-theory.md` for the exact data + algorithm. It's
   pure TypeScript and ports 1:1 (no framework coupling).
2. **The core UX loop** — one focused screen, tap numbers in a bottom dock, see chords
   appear, hit Suggest to re-roll borrowed chords labelled with their source mode.
3. **The visual identity** — sage-green palette, miller-banner serif + montserrat, the cream
   "mat" frame, the light-input → dark-results background shift, gentle chord-entry
   animations. See `design.md`.

## Legacy → React/Next concept mapping

| Angular (legacy)                                   | React / Next.js equivalent                                                                                                                   |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Components + templates (`*.component.ts/html`)     | Function components + JSX                                                                                                                    |
| NgRx store/effects/reducers                        | Local state for the editor (the data is small); Zustand/Context if shared state is wanted. Effects → plain async functions / server actions. |
| Services (`ChordService`, etc.)                    | Plain TS modules in `lib/` (pure functions)                                                                                                  |
| Static data files (`*.data.ts`)                    | Same — plain TS data modules (or generate via a theory lib)                                                                                  |
| `roman` pipe                                       | A tiny helper / formatting function                                                                                                          |
| Angular Material (sidenav, dialog, toggle, select) | shadcn/ui (Sheet/Drawer, Dialog, ToggleGroup, Select) or Radix — matches the project's available tooling                                     |
| Angular animations                                 | Framer Motion / CSS transitions                                                                                                              |
| SCSS + CSS custom properties                       | Tailwind theme tokens + CSS variables (palette maps directly)                                                                                |
| Router (`/`, `/songs`, `/songs/:name`)             | Next App Router: `/`, `/songs`, `/songs/[name]`                                                                                              |
| localStorage persistence                           | Keep localStorage for v1; the planned **Firebase/backend + auth** becomes much easier with Next (route handlers / server actions).           |

## Fix-on-rebuild list (bugs & quirks found)

From `music-theory.md` and `architecture.md`:

- **Only 8 of 12 keys** in the data — add the rest (F#/Gb, Ab, A, B) and fix enharmonic
  spellings. A theory lib (e.g. **tonal.js**) can generate all keys correctly.
- **`_getCurrentMode()` hardcoded to ionian (0)** even for minor keys — the "stay home"
  fallback should respect the key's actual home mode.
- **Data typos**: `aolian` → aeolian; stray `#` in lydian IV (`#min7(b5)`); identifiers
  `destoryed$`, etc.
- **Suggest can re-pick the same quality** a chord already had (no de-dup) and never
  borrows ionian as a "borrowed" mode — revisit the randomisation design.
- Changing key does **not** re-spell chords already on the canvas — decide if that's the
  desired behavior or fix it.

## Originally planned but never built (candidate scope)

From the README "Upcoming changes" and code TODOs — confirm with the user which are in
scope for the rebuild:

- Full **CRUD for songs**: edit, delete, rename, reopen a saved song into the editor.
- **Firebase (or other) backend** for real cross-device saving.
- **Auth / user accounts.**
- **Chord reordering** and **delete-single-chord** within a progression.
- Let the user **choose the current mode** (not just key).
- Stronger **accessibility**.

## Likely new ideas worth raising (not in the legacy app)

- All 12 keys; triads vs. 7ths vs. extensions toggle.
- **Audio playback** of a chord / the progression (e.g. Tone.js) — currently you have to
  go to your instrument.
- Copy/share a progression (URL-encoded state — natural fit for Next).
- Show the **actual borrowed-chord names** more prominently, or a "diff" vs. the diatonic
  version.

## Open questions for the user (for the upcoming brainstorm)

- Which planned features (CRUD, auth, backend) are in scope for the first rebuild?
- Keep the exact sage-green/serif aesthetic, or evolve it?
- Should the theory engine stay hand-rolled (port the data as-is) or move to a library
  like tonal.js for full coverage?
- Persistence target: localStorage first, or go straight to a backend (Firebase /
  Supabase / Next route handlers)?
- Add audio playback?

> Note: the actual rebuild is creative/feature work — when we start building, run the
> **brainstorming** skill first to nail down intent and requirements before writing code.
