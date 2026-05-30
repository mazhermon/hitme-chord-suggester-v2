<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version (Next.js 16) has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/`
before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Working on this codebase (humans + agents)

This file is the onboarding for anyone (or anything) touching the code. Optimised for both
humans skimming on day one and agents that need clear, unambiguous conventions.

## Where to start

1. **`README.md`** — what the app does and how to run it.
2. **`docs/SYSTEM.md`** — visual architecture (C4-shaped Mermaid diagrams + 6 ADRs).
3. **`docs/ARCHITECTURE.md`** — as-built text reference (module map, gotchas).
4. **`docs/roadmap/`** — where the system is headed.
5. **`docs/superpowers/plans/`** — point-in-time implementation plans (each session writes
   one before touching code; see `2026-05-30-production-hardening.md` for the latest).
6. **`docs/NEXT-STEPS.md`** — prioritised options and open decisions to discuss.

## Commands you'll actually run

```bash
npm install              # one-time
npm run dev              # http://localhost:3000
npm run test:run         # all Vitest unit + component tests (fast, run before every commit)
npm run lint             # ESLint + react-compiler
npm run build            # TypeScript check + Next production build
npm run e2e:visual       # Playwright visual-regression comparison (chromium only)
npm run e2e:visual:update # regenerate VR baselines after an intentional design change
npm run e2e              # full Playwright e2e (currently chromium/firefox/webkit, VR excluded)
```

Pre-commit hook (`.husky/pre-commit`) runs `lint && test:run` — don't bypass it
(`--no-verify` is forbidden unless the user explicitly authorises).

## Project shape (one screen)

```
src/
  app/                  Next App Router routes (RSC + client islands)
    page.tsx              "/"    editor
    songs/                "/songs" list, "/songs/[name]" detail
    layout.tsx, globals.css
  components/           React components, one folder per component
                        (Component.tsx + Component.module.css + Component.test.tsx)
  state/                editor reducer (slot model) + EditorProvider context
  lib/                  PURE modules — no React imports — testable in isolation:
    theory/               keys, modes, chords, nashville, extensions, styles, lessons,
                          substitutions/* (modal-interchange, secondary-dominant, etc.)
    audio/                voicing (chordToMidi — single source of truth!), envelope,
                          audio-engine (Web Audio + iOS audio session)
    guitar/, piano/       diagram helpers
    midi/                 .mid export (no tempo event — see ADR-003)
    video/                MediaRecorder + canvas timeline (record.ts is lazy-loaded;
                          naming.ts is the cheap-import sibling for filenames)
    storage/              StorageProvider (local | Firestore proxy via lazy import)
    analytics.ts, config.ts
e2e/                    Playwright specs (visual.spec.ts is VR; others are general e2e)
docs/                   SYSTEM.md, ARCHITECTURE.md, NEXT-STEPS.md, roadmap/, superpowers/
```

## Conventions

### Adding a new module

- Pure (no React) → `src/lib/<area>/<name>.ts` + `<name>.test.ts` next to it.
- Component → `src/components/<Name>/<Name>.tsx` + `<Name>.module.css` + `<Name>.test.tsx`.
- Top-of-file docstring is required for `lib/` modules — one short paragraph saying *what*
  and *why* (not how — code shows how). See `lib/audio/audio-engine.ts` or
  `lib/video/naming.ts` for the shape.

### Adding a substitution strategy

1. Create `src/lib/theory/substitutions/<id>.ts` implementing `Substitution` from `types.ts`.
2. Register in `substitutions/index.ts` (`STRATEGIES` array + `id` map).
3. Optionally wire into a style preset in `styles.ts`.
4. Test in `<id>.test.ts`.

### Tests

- **Pyramid (current shape):** ~167 unit/component (Vitest, fast), ~10 visual regression
  (Playwright, opt-in), 0 general e2e. Add unit tests aggressively; add e2e tests only when
  you can't test the behaviour at a lower level.
- **Vitest globals are on** (`vitest.config.ts`) — don't import `describe`/`it`/`expect`.
- **VR baselines** live in `e2e/visual.spec.ts-snapshots/` and are platform-tagged
  (`-chromium-darwin.png`). If you change UI on purpose, regenerate with
  `npm run e2e:visual:update` and commit the new PNGs in the same commit as the design change.
- For components, prefer `@testing-library/react` over snapshot tests — assert behaviour
  ("clicking X dispatches Y", "checkbox is checked"), not markup shape.

### React Compiler (lint is ON)

- **No `setState` during render.** No `setState` synchronously in an effect body — wrap in
  a `setTimeout(0)` or do it in a handler.
- **No ref writes during render.** Refs are set in effects or handlers.
- This is enforced as a lint error — `npm run lint` will tell you.
- **No `useMemo`/`useCallback`** — Compiler does this for you; current src has zero usages.

### Branching + commits

- **Never push to `main` without the user's explicit instruction.** Even if a phase
  finishes, `git push` happens only when asked.
- Each commit is one logical change. Audit-fixes, dep bumps, and feature work go in
  separate commits — easier to review, easier to revert.
- Pre-commit hook runs `lint && test:run`. If it fails, fix and re-stage; **never** add
  `--no-verify`.
- Commit message format: imperative subject line ≤72 chars, blank line, brief body. The
  body answers *why*; the diff shows *what*.

### Risky actions

Before doing any of: `git reset --hard`, `git push --force`, `npm uninstall`, deleting an
unfamiliar file, removing test files, modifying CI/hooks — pause and ask the user. The
default in this project is: errors are surfaced and fixed at root, not papered over.

## When you're done with a task

1. Run `npm run test:run && npm run lint && npm run build` — all green or don't commit.
2. If you touched UI, run `npm run e2e:visual` — investigate any diff (regenerate baselines
   only if the change was intentional).
3. If you added a load-bearing technical decision, add an ADR section in `docs/SYSTEM.md`
   and update `docs/ARCHITECTURE.md` if the module map changed.
4. Commit with a clear message; do not push unless asked.
