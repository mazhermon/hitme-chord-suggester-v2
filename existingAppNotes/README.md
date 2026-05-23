# Existing App Notes — "Hit me" Chord Suggester

These notes capture the **current/legacy version** of the chord suggester app so we
have a clear reference for what we're rebuilding. The new project will be a fresh
build in **React + Next.js** (details to come), but the music-theory engine and the
core UX of the existing app are what give it its value — those are documented here.

- **Live site:** https://hitme.mazhermon.com/
- **Source (legacy):** https://github.com/mazhermon/hitme-chord-suggester
- **Original stack:** Angular 9, NgRx, Angular Material, SCSS, TypeScript, RxJS
- **Last updated (legacy repo):** June 2020
- **Hosting:** SPA on Netlify-style host (`src/_redirects` → `/* /index.html 200`)

## What the app does, in one sentence

You enter a chord progression using Nashville numbers (I, IV, V…), the app shows you
the real chords for your chosen key, and then **"Suggest"** swaps each chord's quality
for one _borrowed from another mode_ (modal interchange) — giving you more interesting,
theory-correct chord options to try on your instrument.

## The documents

| File                                     | What's inside                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`design.md`](./design.md)               | Visual identity, look & feel, color palette, typography, layout, components, animations, screen-by-screen walkthrough with screenshots.          |
| [`features.md`](./features.md)           | Complete feature inventory — every button/option, what it does, and the user flows. Includes what's finished vs. stubbed.                        |
| [`music-theory.md`](./music-theory.md)   | The heart of the app: Nashville numbering, modal interchange, the keys/modes data, and the exact suggestion algorithm (with worked examples).    |
| [`architecture.md`](./architecture.md)   | How the legacy Angular app is built — components, services, NgRx state, data flow, routing, persistence. Useful as a behavior spec to port from. |
| [`rebuild-notes.md`](./rebuild-notes.md) | Mapping legacy concepts → React/Next, what's worth keeping, known bugs/gaps, and the originally-planned-but-unbuilt features.                    |

## Screenshots

Captured from the live site (`./screenshots/`):

1. `01-initial-empty.png` — landing / empty state
2. `02-chords-entered-Cmaj.png` — I–IV–V entered in C major
3. `03-suggested-borrowed.png` — after "Suggest" (borrowed-chord results)
4. `04-sidebar-menu.png` — the menu / key-change drawer
5. `05-chords-Cmin.png` — chords in C minor (aeolian)
6. `06-save-dialog.png` — "Choose a song name" dialog
7. `07-song-detail.png` — a saved song's detail page
8. `08-song-list.png` — the song list
