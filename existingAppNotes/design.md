# Design — Look & Feel

The existing app has a deliberate, calm, editorial aesthetic. It does not look like a
typical "music app" full of piano keys and bright colours — it reads more like a quiet
songwriting notebook. This is a core part of its value and worth preserving (or
intentionally evolving) in the rebuild.

## Overall impression

- **Mood:** soft, muted, focused, a little luxe. Sage green + cream, big serif display
  type, lots of breathing room.
- **Single-screen tool.** The primary view is one screen: a large empty canvas where
  chords appear, with a fixed input dock pinned to the bottom.
- **The whole app sits inside a thick cream "mat".** `body` has a `3vw` solid white/cream
  border (no bottom border), so the green app looks like a print mounted in a frame /
  passe-partout. Distinctive and intentional.

See `screenshots/01-initial-empty.png` for the landing state.

## Color palette

Defined as CSS custom properties on `:root` (legacy `app.component.scss`):

| Token                | Value     | Role                                        |
| -------------------- | --------- | ------------------------------------------- |
| `--white`            | `#f9f9f9` | Cream background / frame, all text on green |
| `--black`            | `#313331` | Near-black (rarely used; menu icon fill)    |
| `--green`            | `#83a085` | **Primary** — main sage green               |
| `--greenDark`        | `#5b885e` | **Highlight** — deeper green                |
| `--gray`             | `#7e887c` | Secondary / muted green-gray                |
| `--gray-light`       | `#c9cac9` | —                                           |
| `--gray-extra-light` | `#e4e1e1` | —                                           |
| `--dark`             | `#5d665b` | Darker green-gray                           |
| `--blueDark`         | `#151d5a` | Defined but effectively unused              |

Derived:

- `--primary` = `--green`, `--secondary` = `--gray`, `--highlight` = `--greenDark`
- `--gradient1` = `linear-gradient(-45deg, primary, secondary)` — the **input/landing** background
- `--gradient2` = `linear-gradient(-45deg, secondary, highlight)` — deeper variant

**Background changes with mode (an important, subtle UX cue):**

- **Input mode** (entering chords) → lighter sage gradient.
- **Suggest / display / song mode** → a much **darker green overlay** washes over the
  canvas, signalling "these are results, not your raw input." Compare
  `screenshots/02-chords-entered-Cmaj.png` (light) with `03-suggested-borrowed.png` and
  `07-song-detail.png` (dark).

Angular Material is themed with a custom green palette (`app.material-theme.scss`) so the
dropdown, dialog and toggle controls match.

## Typography

Loaded from **Adobe Fonts / Typekit** (`use.typekit.net/okb1uwb.css`):

| Token               | Font                       | Used for                                                  |
| ------------------- | -------------------------- | --------------------------------------------------------- |
| `--font-serif`      | **miller-banner**, serif   | Display headings ("Hit me"), and the chord **root notes** |
| `--font-sans-serif` | **montserrat**, sans-serif | Body text, labels, buttons, sub-text                      |

- Base weight 400; bold 700.
- The chord display mixes the two beautifully: a **large serif capital** for the root
  note (e.g. a big `C`), with the chord **quality** set smaller as a subscript-like
  sans/serif suffix (`maj7`, `min7`, `7`), the Nashville numeral above in small caps
  serif, and "from {mode}" in small italic serif below. See
  `screenshots/02-chords-entered-Cmaj.png`.

## Layout & structure

- **App shell** (`app.component.html`) is a `mat-sidenav-container`:
  - A 300px **side drawer** (`mat-sidenav`, `mode="over"`) that slides in from the left
    with a rounded top-right corner (`border-top-right-radius: 30px`). Narrows to 270px
    under 350px width.
  - The **content area** has a hamburger button top-left and a `<router-outlet>`.
- **Home screen** (`hitme.component.html`):
  - A large `chords-display-grid` canvas that fills the space; chords are centred near
    the top.
  - When empty, a big serif **"Hit me"** headline + "songwriting tool" subhead sits in
    the middle (animated in).
  - A **sticky bottom dock** (`hm-hitme__sticky-bottom`) holds the chord-number input row
    and the Suggest / Reset / Save buttons. This is always within thumb reach — the
    layout is mobile-first.
- Responsive padding: `1.5rem` mobile → `3rem` at ≥500px; chord input row wraps and
  right-aligns at wider breakpoints.

## Components & controls (visual)

- **Chord number buttons (I–VII):** round-ish pill buttons in a horizontal row in the
  bottom dock. Custom `hmButton` component, cream fill, pill radius (34px), with a
  layered `::before/::after` focus ring that scales in (a nice a11y focus affordance).
- **Action buttons (Suggest / Reset / Save):** same pill button component; disabled
  (50% opacity) until there are chords. "Save" uses the `primary` variant.
- **Chord cards (display):** not boxed cards — each chord is a typographic cluster
  (numeral / big root / quality / "from mode"). They **animate in** when added.
- **Side drawer contents:** "Menu" title bar with an SVG close (X) button; nav links
  (Home, Song List); a **Key** panel showing current key (e.g. "Cmaj") with a
  native-styled **"Change Key"** dropdown (C, Db, D, Eb, E, F, G, Bb) and a **Maj / min**
  Material button-toggle. See `screenshots/04-sidebar-menu.png`.
- **Save dialog:** a Material dialog "Choose a song name" with a single text input and
  Cancel / Save buttons. See `screenshots/06-save-dialog.png`.
- **Menu / close icons:** hand-drawn SVGs (3-bar hamburger; rotated-rect X).

## Motion / animation

Angular animations give the app its lively-but-gentle feel — worth replicating:

- **Intro text** (`introText`): "Hit me / songwriting tool" fades + scales + slides up on
  enter, and reverses on leave (200ms).
- **Onboarding tip** (`popout`): the "Enter some chord numbers to get started" bubble
  pops in/out (200ms, with a slight overshoot easing on leave).
- **Chord entry** (`chordAnimate`, `chord-display.animation.ts`): each chord scales down
  from above and fades in; the numeral animates separately with a 20ms stagger — so the
  chord and its number settle into place independently. ~200ms ease-out.
- **Focus rings** on buttons and the hamburger scale in on `:focus` via CSS transitions
  with springy cubic-beziers.

## Accessibility notes (current state)

- Real `<button>`/`<a>` semantics, `role`-friendly markup, SVG `<title>`s ("menu",
  "close sidebar").
- Custom focus rings replace the removed default outline.
- README admits a11y is "a start… plenty of work to be done." Things like the key
  `<select>` and toggle states are functional but could be improved. Worth raising the
  bar in the rebuild.

## Misc

- Title bar / tab title is just "Hitme".
- Google Analytics (Universal Analytics `UA-29538820-4`) is wired in `index.html` —
  legacy/deprecated; replace if analytics is still wanted.
