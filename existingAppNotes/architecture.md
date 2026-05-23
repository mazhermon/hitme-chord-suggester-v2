# Architecture — Legacy Angular App

Documenting how the existing app is built. We're **not** porting this structure verbatim
(we're moving to React/Next), but it's a precise behavior spec and shows the intended data
flow. See `rebuild-notes.md` for the mapping to React/Next.

## Stack

- **Angular 9** (CLI 9.1), TypeScript 3.8, SCSS, RxJS 6.5
- **NgRx 7** (`@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`) — Redux-style state
- **Angular Material 9** (`mat-sidenav`, `mat-dialog`, `mat-form-field`, `mat-button-toggle`)
- **Angular animations**
- Node `v12.6.0` (`.nvmrc`); built with `ng build`, tested with Karma/Jasmine + Protractor
- Deployed as a static SPA (`src/_redirects` is Netlify rewrite syntax)
- Universal Analytics in `index.html` (legacy GA)

## Module / folder layout (`src/app/`)

```
app.component.*          # shell: mat-sidenav-container + hamburger + router-outlet
app-routing.module.ts    # routes: '' → Hitme, 'songs' → lazy SongList, '**' → ''
app.module.ts            # root NgRx store + effects, Material sidenav, lazy features

hitme/                   # the main editor screen ("Hit me")
  hitme.component.*       # orchestrates display + input + suggest + save dialog
  state/                 # NgRx feature: actions, reducer, effects for chords & songs
  save-song-dialog/      # Material dialog to name a song

chord-input/             # bottom dock row of I–VII buttons (dispatches CreateUserChord)
chord-display/           # renders chords (numeral/root/quality/from-mode) + entry animation

settings/                # the side drawer
  sidebar/               # drawer chrome + nav links
  key-change-form/       # key note <select> + Maj/min toggle
  state/                 # NgRx feature: keys data + global key center

song-list/               # /songs route (lazy module): list of saved song names
song/                    # /songs/:name route: one saved song's chords

services/                # pure logic + persistence
  chord.service.ts        # setChord(), hitMe() — the theory engine
  keys.service.ts         # getKeys(), getKey()
  modes.service.ts        # getModes(), getMode()
  song.service.ts         # save/load songs to localStorage + state

data/                    # static music data
  keys.data.ts            # 16 KeyCentre records
  modes.data.ts           # 7 Mode records

models/                  # Chord, ChordSetter, Mode, Key interfaces
pipes/                   # roman.pipe.ts (0→I … 6→VII)
state/                   # root app state (shell: sidebar open/closed)
_shared/                 # reusable UI: button (hmButton), title-bar
```

## State shape (NgRx)

Three feature slices:

- **shell** (`state/app.reducer.ts`): `{ sideBarIsOpen: boolean }`
- **hitme** (`hitme/state/hitme.reducer.ts`):
  ```ts
  {
    displayChords: Chord[],   // declared but largely unused
    userChords:    Chord[],   // what you typed (input mode)
    hitMeChords:   Chord[],   // results after Suggest
    inputMode:     boolean,   // true = show userChords (light bg), false = show hitMeChords (dark bg)
    songs:         Song[]     // saved songs (mirrors localStorage)
  }
  ```
- **userSettings** (`settings/state/settings.reducer.ts`):
  ```ts
  { keysData: Key[], globalKeyCentre: KeyCentre /* default C maj */ }
  ```

Models:

```ts
interface Chord {
  rootNote: string
  quality: string
  numeral: string
  key?: KeyCentre
  modeName?: string
}
interface ChordSetter {
  numeral: string
  key: KeyCentre
}
interface KeyCentre {
  name: string
  quality: string
  scale: string[]
}
interface Mode {
  name: string
  scale: string[]
}
```

## Data flow (action → effect → service → success action → reducer)

The app is textbook NgRx; the original `planningNotes.rtf` literally describes the loop:
_"Component dispatches action → Effect calls service → dispatch success action → reducer
updates state → component reads state."_

**Add a chord**

```
[click I–VII] ChordInput.onChordSelect
  → dispatch CreateUserChord({ numeral, key })
  → createChord$ effect → ChordService.setChord(numeral, key)   // home mode
  → dispatch CreateUserChordSuccess(chord)
  → reducer appends to userChords
  → Hitme also dispatches ToggleInputMode(true) when userChords change
```

**Suggest**

```
[click Suggest] Hitme.onHitMe
  → dispatch ToggleInputMode(false)            // switches to dark "results" bg
  → dispatch BorrowChords(userChords)
  → borrowChords$ effect → ChordService.hitMe(chords)  // random mode per chord
  → dispatch BorrowChordsSuccess(newChords)
  → reducer sets hitMeChords
  → display shows hitMeChords (inputMode=false)
```

**Change key**

```
[select note / toggle Maj-min] KeyChangeForm
  → dispatch UpdateGobalKeyNote(name) | UpdateGobalKeyQuality(quality)
  → settings effect reads current globalKey, calls KeysService.getKey({name, quality})
  → dispatch UpdateGlobalKeySuccess(newKey)
  → reducer sets globalKeyCentre
  (affects future setChord calls; does not re-spell existing chords)
```

**Save a song**

```
[click Save] Hitme.openSaveSongDialog → Material dialog → name
  → dispatch SaveSong({ name, chords: chordsToDisplay })
  → saveSong$ effect → SongService.saveSong() writes localStorage 'hmlocalsongs'
  → router.navigate(['/songs', name])
  → dispatch SaveSongSuccess(song) → reducer appends to songs
```

**Load songs on boot**

```
AppComponent.ngOnInit → dispatch LoadSongs
  → loadSongs$ effect → SongService.loadSongs() reads localStorage
  → LoadSongsSuccess → reducer hydrates songs[]
```

## Persistence

- **localStorage only**, key `hmlocalsongs`, storing an array of `{ name, chords }`.
- No backend. The song list/detail read from the in-memory NgRx `songs` slice, which is
  hydrated from localStorage at startup. (README lists Firebase as a future addition.)

## Routing

- `''` → `HitmeComponent` (editor)
- `songs` → lazy-loaded `SongListModule` (`/songs` list, `/songs/:name` detail)
- `**` → redirect to `''`
- The shell auto-closes the drawer on any route change.

## Reusable UI primitives (`_shared/`)

- **`hmButton`** — attribute-selector button component with `primary`/`secondary`/`tertiary`
  variants, pill shape, cream fill, layered animated focus ring.
- **`hm-title-bar`** — small layout wrapper used by the drawer and key form headers.

## Health / quirks to be aware of

- Lots of `// TODO`, commented-out code, and "working on…" notes — it's an early personal
  project, explicitly described as "very early days." Several success actions are wired
  but partially unused (`displayChords` slice, `SaveSongSuccess` "TODO add to state as
  currentSong").
- Some misspellings carried into data and identifiers (`aolian`, `destoryed$`, `conciderations`).
- The theory logic (`services/` + `data/`) is clean and self-contained and is the main
  thing worth carrying forward.
