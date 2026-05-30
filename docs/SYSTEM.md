# SYSTEM.md — Visual Architecture & Design Decisions

A picture of how the app is wired together: what runs where, which external services we
talk to, how the music data flows from a tap to a sound, and the load-bearing technical
decisions behind the current shape.

Companion to **[ARCHITECTURE.md](./ARCHITECTURE.md)** (text-only as-built module map) and
**[docs/roadmap/](./roadmap/)** (where the system is headed).

Diagrams use **Mermaid** — GitHub renders them inline, they diff cleanly in PRs, and they
sit next to the code they describe. (Mermaid's native C4 syntax is experimental and
auto-layout flaky, so we use the well-supported `flowchart` and `sequenceDiagram` forms
arranged in the C4 *shape* — Context → Container → Component → Flows.)

---

## Elevator pitch

A songwriting tool: type a chord progression in Nashville numbers (I–VII) for any of the
12 keys, see the real chords, ask **Suggest** for theory-correct substitutions (modal
interchange, secondary dominants, tritone, planing, …), and **Play** them through a
browser-native synth. Save progressions locally (or to Firestore when configured), export
to a `.mid` file for Logic/Ableton, or record a shareable 9:16 video. The app is a thin
React layer on top of pure, unit-tested theory + audio modules.

---

## C4 Level 1 — System Context

Who and what the system talks to.

```mermaid
flowchart LR
  user(("Musician<br/>(at the instrument)"))
  app["chordHelperv2<br/>(Next.js web app)"]
  speakers[("Browser audio<br/>output (Web Audio<br/>→ speakers / headphones)")]
  daw[("User's DAW<br/>Logic / Ableton / etc.")]
  firestore[("Firebase Firestore<br/>(optional, env-gated)")]
  share[("Social platforms<br/>(roadmap)")]

  user -- "taps numerals,<br/>Suggest, Play, Save" --> app
  app -- "schedules notes" --> speakers
  app -- ".mid download<br/>(no tempo event)" --> daw
  app -- "songs (when configured)" --> firestore
  app -. "9:16 mp4 export" .-> share
```

**Notes**
- The musician runs the app in a browser on their phone or laptop — the app has **no
  bespoke backend**; Next.js serves static pages and the only "service" call is the
  optional Firestore SDK from the browser.
- The DAW relationship is one-way (we export, they consume) — there's no MIDI input.
- Social platforms are dashed: the video file exists today but the share integrations
  are on the [roadmap](./roadmap/04-social-share-integrations.md).

---

## C4 Level 2 — Containers

What's running inside the app, and where the boundaries are.

```mermaid
flowchart TB
  subgraph nextjs["Next.js 16 build/host"]
    direction TB
    static["Static pages<br/>/ and /songs<br/>(prerendered)"]
    ssr["/songs/[name]<br/>(server-rendered<br/>per request)"]
  end

  subgraph browser["Browser runtime (the actual app)"]
    direction TB
    react["React 19 client tree<br/>(EditorProvider context +<br/>reducer-driven state)"]
    webaudio[/"Web Audio API<br/>(AudioContext + gain<br/>+ oscillators)"/]
    recorder[/"MediaRecorder API<br/>(canvas → webm/mp4)"/]
    localstore[(localStorage<br/>chordhelper.songs)]
  end

  firestore[(Firestore<br/>collection: songs)]

  nextjs -- "HTML + hydrating JS" --> react
  react -- "play / arpeggio" --> webaudio
  react -- "record video export" --> recorder
  recorder -- "tap of master gain" --> webaudio
  react -- "save / list / get / remove" --> localstore
  react -. "save / list / get / remove<br/>(when NEXT_PUBLIC_FIREBASE_* set)" .-> firestore
```

**Notes**
- There is **no API layer of our own**. The browser talks directly to Firestore via the
  Firebase JS SDK when configured. Otherwise everything is local.
- `MediaRecorder` taps the synth's master gain node via `createMediaStreamDestination`,
  so the exported video has the same sound the user heard.
- The Web Audio container is also where the **iOS audio-session routing** lives — it
  flips `navigator.audioSession.type = 'playback'` so the ring/silent switch doesn't
  mute the synth. See ADR-006.

---

## C4 Level 3 — Components

The shape of `src/`. Pure modules (no React imports) on the left, React layer on the
right, routes at the top.

```mermaid
flowchart LR
  subgraph routes["src/app/ — Next App Router"]
    home["/ (editor)"]
    songs["/songs"]
    song["/songs/[name]"]
  end

  subgraph state["src/state/"]
    reducer["editor.ts<br/>slot model: base+sub+locked,<br/>suggest re-rolls 1–2 slots"]
    provider["EditorProvider.tsx<br/>(React context)"]
  end

  subgraph ui["src/components/"]
    screen["EditorScreen"]
    display["ChordDisplay"]
    dock["ChordDock"]
    drawer["KeyDrawer (sidebar)"]
    lesson["LessonPanel"]
    save["SaveDialog"]
    video["VideoModal"]
    guitardiag["ChordDiagram (guitar)"]
    pianodiag["PianoChord"]
  end

  subgraph theory["src/lib/theory/ (pure)"]
    keys["keys, modes,<br/>extensions, nashville,<br/>styles, lessons"]
    strategies["substitutions/*<br/>(modal-interchange,<br/>secondary-dominant,<br/>tritone, diatonic-third,<br/>suspension, planing)"]
  end

  subgraph audio["src/lib/audio/"]
    voicing["voicing.ts<br/>chordToMidi —<br/>SINGLE SOURCE OF TRUTH"]
    engine["audio-engine.ts<br/>Web Audio + iOS routing"]
    env["envelope.ts (ADSR)"]
  end

  subgraph io["src/lib/* (I/O)"]
    midi["midi/export.ts<br/>(midi-writer-js)"]
    videolib["video/record.ts<br/>(MediaRecorder + canvas timeline)"]
    storage["storage/<br/>StorageProvider:<br/>local | Firestore"]
    guitar["guitar/voicing.ts<br/>(fretboard finder)"]
    piano["piano/keyboard.ts"]
  end

  home --> screen
  songs --> save
  song --> save

  screen --> provider
  provider --> reducer
  screen --> dock & drawer & display & lesson & save & video

  display --> guitardiag & pianodiag
  guitardiag --> guitar
  pianodiag --> piano

  reducer --> strategies
  strategies --> keys

  display --> engine
  dock --> engine
  engine --> voicing
  voicing --> keys

  screen --> midi & videolib & storage
  midi --> voicing
  videolib --> engine
  pianodiag --> voicing
```

**The one rule that holds the audio layer together:** `chordToMidi` (in `voicing.ts`) is
the single source of voicing truth. The synth, the piano diagram, and the MIDI export
all consume it — change a voicing in one place and the user hears it, sees it on the
piano, and gets it in the exported `.mid`. See ADR-002.

---

## Sequence — taps to sound

The hottest path: a user adds chords, plays one, then asks for a substitution.

```mermaid
sequenceDiagram
  actor U as Musician
  participant Dock as ChordDock
  participant R as editor reducer
  participant Disp as ChordDisplay
  participant Eng as audio-engine
  participant WA as Web Audio API

  U->>Dock: tap "I"
  Dock->>R: { type: 'addChord', degree: 0 }
  R-->>Dock: state: slots += { base: Cmaj7, sub: null, locked: false }
  Note over R,Disp: displayChords(state) derives chord per slot (sub ?? base)
  Disp-->>U: renders "C maj7 (diatonic)"

  U->>Disp: tap ▶ on the C chord
  Disp->>Eng: playChord(chord, { arpeggio: true, envelope, baseOctave })
  Eng->>WA: schedule 4 oscillators @ start, start+0.16s, +0.32s, +0.48s<br/>(ARPEGGIO_STEP shared with piano-key highlight)
  WA-->>U: 🎵

  U->>Dock: tap "Suggest"
  Dock->>R: { type: 'suggest' }
  R->>R: reset unlocked slots to diatonic,<br/>pick 1–2 unlocked slots at random,<br/>run candidatesFor() + weighted pickCandidate()
  R-->>Disp: state: those slots' sub = (e.g.) { quality: 7, source: "V/ii" }
  Note over Disp: isResultsMode(state) flips canvas bg light → dark
  Disp-->>U: shows new chord + provenance label
```

The same `playChord` shape is used by every play path: single-chord ▶ (arpeggio), whole-
progression Play (block chords at bpm via `playProgression`), and the silent timing pulse
used by the piano-key highlight.

---

## Services & boundaries

Every external surface, with what we use it for and what happens when it's not there.

| Service | Used for | Where invoked | Fallback when absent | Required env |
|---|---|---|---|---|
| **Web Audio API** | Synth playback (lazy `AudioContext`, ADSR voices), MediaRecorder tap | `src/lib/audio/audio-engine.ts` | No sound (visual UI still works) | Browser support |
| **iOS `navigator.audioSession`** | Route Web Audio through the **media** channel so the silent switch doesn't mute it | `audio-engine.ts` → `primeAudioForMobile()` | Old iOS: silent switch still mutes; we live with it | iOS 16.4+ |
| **MediaRecorder API** | 9:16 video export of a played progression | `src/lib/video/record.ts` | Show alert; export disabled | Browser support |
| **`localStorage`** | Default song persistence (key `chordhelper.songs`); section open/closed (`chordhelper.section.*`); beta-banner dismissal | `src/lib/storage/`, `CollapsibleSection`, `BetaBanner` | Memory-only (lost on reload); UI degrades silently | Browser support |
| **Firebase Firestore** | Optional cloud song sync (collection `songs`) | `src/lib/storage/` (env-gated) | localStorage takes over | `NEXT_PUBLIC_FIREBASE_*` (6 vars) |
| **`tonal`** | Music-theory primitives (scales, intervals, note spelling) | `src/lib/theory/*` | n/a — bundled | npm dep |
| **`midi-writer-js`** | Standard MIDI File (SMF) generation for `.mid` export | `src/lib/midi/export.ts` | n/a — bundled | npm dep |
| **GSAP** | One animation: the empty-state title intro fade | `src/components/Editor/EditorScreen.tsx` | n/a — bundled (could be replaced with CSS) | npm dep |
| **Next.js 16 / React 19** | Routing, RSC + client islands, hydration | `src/app/*` | n/a | npm dep |

---

## ADR-001 — Native Web Audio (no Tone.js)

**Decision.** Implement the synth directly against `AudioContext`, `OscillatorNode`, and
`GainNode` rather than pulling in Tone.js.

**Why.** Our needs are narrow — schedule a few oscillators with an ADSR envelope, no
filters/effects, no transport. Tone.js would add a noticeable bundle and a layer we'd
have to relearn for any change. The 60-line voice scheduler in
`src/lib/audio/audio-engine.ts` is small enough to read in one sitting.

**Consequence.** We own the iOS unlock dance (`primeAudioForMobile`, visibility-change
resume) and the autoplay-policy gating (lazy context creation on user gesture). All
documented and tested.

---

## ADR-002 — `chordToMidi` is the single voicing source

**Decision.** Make `chordToMidi(chord, { level, voicing })` in `src/lib/audio/voicing.ts`
the **only** place where "a chord becomes specific MIDI notes." The synth, the piano
diagram, and the MIDI export all call it.

**Why.** Voicing decisions (which inversion? drop-2? open? at what octave?) ripple into
three different presentations of the same chord. If they diverged we'd hear one voicing,
see another on the piano, and export a third to the DAW — confusing and wrong.

**Consequence.** Voicing variants (close / 1st & 2nd inversion / drop-2 / open / octave-
up) are one ordered list, cycled per chord. Any future change to voicing math is a
single-file edit that updates all three surfaces atomically.

---

## ADR-003 — MIDI export writes no tempo event

**Decision.** `progressionToMidi` emits a single track with note-on/off events at the
correct ticks, but **no `FF 51` tempo meta event**.

**Why.** Note order and spacing are stored in ticks relative to the file's PPQ
(`division`), independent of tempo. The tempo meta only maps ticks → seconds. We omit
it so nothing overrides the user's project tempo when they drag the `.mid` into
Logic/Ableton/etc. — they still hear chords land on the correct beats at *their* BPM.

**Why not "advisory only".** There is no advisory-only flag in the SMF spec; whether a
file's tempo overrides project tempo is the DAW's call (Logic's Project-Tempo mode,
Ableton's clip import, Pro Tools' prompt). Best to write no opinion at all.

**Consequence.** Empty MIDI export is fixed at 2-beats-per-chord; could be made
configurable (½ / 1 / 2 bars) later. Verified with a hex dump that exports omit `FF 51`.

---

## ADR-004 — Slot model (`base + sub + locked`) over input-vs-results

**Decision.** Each progression position is a `ChordSlot { base, sub, locked }`. The
displayed chord is `sub ?? base`. "Suggest" mutates `sub` on 1–2 unlocked slots; per-
chord controls (swap, lock, revert) operate on individual slots.

**Why.** The legacy app had a global "input vs results" toggle that re-rolled
everything. We wanted *gentle* re-rolls — change 1–2 chords, leave the rest, let the
user lock the ones they like and Suggest again. That requires per-position state, not
a global mode.

**Consequence.** The light → dark canvas shift (the legacy "results" cue) becomes a
derived signal: `isResultsMode(state)` returns true if **any** slot has a `sub`. No mode
flag to forget to set/clear.

---

## ADR-005 — Local-first storage, optional Firestore via env

**Decision.** `getStorage()` returns the Firestore provider when
`NEXT_PUBLIC_FIREBASE_*` env vars are present, else the localStorage provider. Both
implement the same `StorageProvider` interface (`list`, `get`, `save`, `remove`).

**Why.** The app is useful from minute one without configuration — paste the URL,
write a progression, save it, come back to it. Cloud sync is a "later, when you want
multi-device" upgrade, not a sign-up wall.

**Consequence.** No auth yet (a known limitation — see
[roadmap/01-database-and-auth.md](./roadmap/01-database-and-auth.md)). Today, a
Firestore-configured deployment shares the `songs` collection across every visitor;
fine for a single user, not for public hosting. Auth is the next storage step.

---

## ADR-006 — iOS audio session routed to playback, not ambient

**Decision.** When we lazily create the `AudioContext`, call `primeAudioForMobile()` to
set `navigator.audioSession.type = 'playback'` (iOS 16.4+), kick a one-sample silent
buffer, and bind a `visibilitychange` listener that resumes the context when the tab
returns to the foreground.

**Why.** iOS defaults Web Audio to the **ambient** session, which routes through the
ringer and is muted by the silent switch. Musicians use this app at the instrument and
will sometimes have the phone on silent — they should still hear the synth (which is
the whole point of the tool). `audioSession = 'playback'` puts us on the **media**
channel, same as a music player.

**Consequence.** Pre-iOS 16.4 devices still go through the ringer (we no-op silently);
all later versions get the right behaviour. The silent-buffer trick belt-and-braces the
context unlock on the first gesture. See `src/lib/audio/audio-engine.test.ts`.

---

## Known boundaries & limitations

- **No auth** — Firestore mode is open to any visitor of the deployed app. See the
  [DB & auth roadmap entry](./roadmap/01-database-and-auth.md).
- **No CI/CD configured** — local-only quality gates (`npm run test:run`, `lint`,
  `build`, husky pre-commit). A Vercel deploy + GitHub Action is roadmap item
  [05-deploy-to-vercel.md](./roadmap/05-deploy-to-vercel.md).
- **No server endpoints of our own** — everything is browser-side, including the
  Firestore SDK calls. This is by design; if we add e.g. licensed-content lookups,
  that introduces our first route handler.
- **Whole-progression piano highlight** doesn't fire (only single-chord ▶ does).
  Tracked in ARCHITECTURE.md "Known limitations".
- **Typekit "miller-banner"** font is stubbed with the free Playfair Display via
  `next/font`. Swap in the licensed kit when we deploy under a paid domain.

---

## Maintenance

When the architecture changes meaningfully, update **both** this file (visual + ADRs)
and `ARCHITECTURE.md` (text module map). New load-bearing decisions get a new ADR
section here (`ADR-007 — …`), not just a code comment.
