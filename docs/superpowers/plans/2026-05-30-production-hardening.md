# Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the alpha to a state where it can be safely deployed and iterated on — security audited, performance acceptable, test pyramid right-shaped, visual regression coverage in place, code optimised for both human and agent collaborators — and add the user-requested multi-waveform synth feature on top.

**Architecture:** Sequential phases on branch `production-hardening` (off `polish-and-architecture`). Each phase produces commits independently so we can roll back or split if any phase grows. The waveform feature comes **last** so all hardening is in place before adding new code paths to it.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Vitest, Playwright (will be extended for VR), `npm audit` for dependencies.

**Branch policy:** No push to `main` ever; push `production-hardening` to origin when the user asks.

---

## Phase A — Security review (≈30 min)

### Task A.1: Dependency vulnerability scan

- [ ] **Step 1:** `npm audit --omit=dev --json > /tmp/audit-prod.json && npm audit --json > /tmp/audit-all.json`
- [ ] **Step 2:** Triage findings: which are exploitable in our context (browser-only, no SSR-handled untrusted input)?
- [ ] **Step 3:** Apply `npm audit fix` for non-breaking fixes; flag breaking ones in the discussion list.
- [ ] **Step 4:** Re-run `npm run test:run && npm run build` to confirm no regressions.

### Task A.2: Code-level security scan

- [ ] **Step 1:** grep for `dangerouslySetInnerHTML` (XSS) — should be zero matches.
- [ ] **Step 2:** grep for `eval`, `new Function`, `innerHTML =` — should be zero matches.
- [ ] **Step 3:** Audit all `target="_blank"` links for `rel="noopener noreferrer"` (tabnabbing).
- [ ] **Step 4:** Audit user-input persistence paths: song name → localStorage / Firestore. Cap length (e.g. 100 chars), reject control characters; firmware sanity, not a security boundary since the user owns their own data.
- [ ] **Step 5:** Check that all secrets are in `NEXT_PUBLIC_*` (intentionally client-visible) or not committed. grep `.env*` files; confirm `.env.local` is gitignored.

### Task A.3: Firestore rules (deferred to discussion)

The codebase has Firestore client code but no `firestore.rules` file checked in. **Do not write rules without the user's input** — they need to decide if this app is multi-tenant (need auth + per-user docs) or single-tenant (open `songs` collection fine, app is private). Document the decision in the next-steps list.

### Task A.4: HTTP security headers

- [ ] **Step 1:** Check Next.js config for headers — we have none.
- [ ] **Step 2:** Add a baseline set in `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`. **Do not add a CSP yet** — they're easy to break the synth + Firestore SDK with; defer to discussion.
- [ ] **Step 3:** Run `npm run build` to confirm headers apply.

### Task A.5: Commit

```bash
git commit -m "security: dep audit fixes + baseline response headers"
```

---

## Phase B — Performance review (≈40 min)

### Task B.1: Bundle size

- [ ] **Step 1:** Run `npm run build` and read the route table (Next emits per-route JS sizes). Note anything > 200 kB.
- [ ] **Step 2:** Check dynamic-import opportunities: VideoModal + video/record.ts only run on the Video button click — `await import()` them lazily so MediaRecorder + canvas code doesn't ship in the initial bundle.
- [ ] **Step 3:** Confirm GSAP is small and only loaded once (it is — single intro fade). If it ever grows, consider replacing with `@keyframes` CSS.
- [ ] **Step 4:** Re-build and confirm the size delta.

### Task B.2: Web Audio voice cleanup

- [ ] **Step 1:** Read `audio-engine.ts` `playFrequencies` — confirm oscillators stop (they do, via `.stop(stopAt)`), but do gain nodes get disconnected? Long sessions leak `GainNode`s if not disconnected after release.
- [ ] **Step 2:** Add `osc.onended = () => voice.disconnect()` (or schedule a `setTimeout` cleanup) so the voice gain node is garbage-collected.
- [ ] **Step 3:** Add a unit test asserting the cleanup hook is attached.

### Task B.3: React Compiler / render perf

- [ ] **Step 1:** ESLint with react-compiler is already on (per ARCHITECTURE.md gotchas). Confirm with `npm run lint`.
- [ ] **Step 2:** `grep -rn "useMemo\|useCallback" src/` — Compiler should make most of these redundant; check none are now stale obstructions.
- [ ] **Step 3:** No proactive changes — Compiler does the work. Document in discussion list if a perf trace is wanted later.

### Task B.4: Font + image loading

- [ ] **Step 1:** Verify `next/font` is used for both fonts (already is). `display: 'swap'` and preload metadata should be on; check.
- [ ] **Step 2:** No `<img>` usage outside icons — confirm; if any, swap for `next/image`.

### Task B.5: Commit

```bash
git commit -m "perf: lazy-load video export, disconnect Web Audio voices on end"
```

---

## Phase C — Test pyramid audit (≈40 min)

### Task C.1: Inventory current tests

- [ ] **Step 1:** Count unit / component / e2e: `find src tests -name "*.test.*" | xargs -I {} sh -c 'echo $(basename {})'` and classify by directory.
- [ ] **Step 2:** Count Playwright tests (likely zero — the e2e config exists but no `.spec.ts` files checked).
- [ ] **Step 3:** Tabulate: `lib/` unit, `components/` component, e2e count.

### Task C.2: Identify untested modules

- [ ] **Step 1:** For each `src/lib/**/*.ts` and `src/components/**/*.tsx` without a matching `*.test.*`, list it.
- [ ] **Step 2:** Triage: which are obviously testable (pure functions, deterministic) vs which are integration glue (skip).
- [ ] **Step 3:** Pick the 3-5 highest-value untested modules and add tests.

### Task C.3: Add the missing unit tests

For each chosen module, write a focused test (1-5 cases). Examples likely to surface:
- `src/lib/config.ts`
- `src/lib/analytics.ts`
- `src/lib/storage/` providers (mock localStorage + Firestore)
- One reducer action gap (`cycleVoicing`, `toggleChordExtension`)

- [ ] **Step 1:** Run new tests in isolation.
- [ ] **Step 2:** Run full suite.

### Task C.4: Commit

```bash
git commit -m "test: fill unit-test gaps in lib + state"
```

---

## Phase D — Visual regression test setup (≈30 min)

### Task D.1: Wire up Playwright VR

- [ ] **Step 1:** Add `tests/visual/` directory with a first spec file (`editor.visual.spec.ts`).
- [ ] **Step 2:** Use `expect(page).toHaveScreenshot()` against named baselines. Set viewports for 360 / 768 / 1280.
- [ ] **Step 3:** Cover these states: empty editor; editor with 4 chords; drawer open; songs list (with one mock song).
- [ ] **Step 4:** Run `npx playwright test tests/visual --update-snapshots` to create baselines.
- [ ] **Step 5:** Run again without `--update-snapshots` to confirm baselines match.

### Task D.2: CI-friendly settings

- [ ] **Step 1:** Configure Playwright to skip VR on `CI=1` unless explicit (browser font rendering varies across OS). Add `playwright.config.ts` notes.
- [ ] **Step 2:** Add `npm run test:visual` and `npm run test:visual:update` scripts.

### Task D.3: Commit

```bash
git commit -m "test: visual-regression baselines for the key editor states"
```

---

## Phase E — Code readability + agent-friendliness (≈30 min)

### Task E.1: Author `AGENTS.md` expansion

The current `AGENTS.md` is one paragraph about Next 16. Expand it to:

- File layout conventions and where things go.
- Test conventions (Vitest globals, where unit/component/visual live).
- Pre-flight commands (`npm run test:run && npm run lint && npm run build`).
- Pre-commit hook expectations.
- Pointer to `docs/SYSTEM.md` + `docs/ARCHITECTURE.md`.
- Branch + commit conventions (single-purpose commits, no push to main).
- React Compiler lint gotchas (lifted from ARCHITECTURE.md).

### Task E.2: Module header pass

- [ ] **Step 1:** Sweep `src/lib/**/*.ts` for files without a top-of-file purpose comment.
- [ ] **Step 2:** Add a 1–3 line header where missing — what the module is for + the single public-facing thing it exports.

### Task E.3: Commit

```bash
git commit -m "docs: expand AGENTS.md with workflow + lift module headers"
```

---

## Phase F — Multi-waveform toggle (≈45 min)

### Task F.1: Decide the cap

**Decision:** Allow 1–4 simultaneous waveforms (no cap below 4 — the synth happily layers
oscillators; 4 waveforms × ~4 notes per chord × ~4 chords = ~64 oscillators max which is
well below any browser limit, and gain compensation prevents clipping). Default to a
single waveform (current behaviour) so existing songs / genre presets are unaffected.

### Task F.2: State shape change

**File:** `src/lib/audio/envelope.ts`

- [ ] **Step 1:** Change `EnvelopeSettings.waveform: Waveform` → `waveforms: Waveform[]`. Keep a `DEFAULT_ENVELOPE` with a single-element array.
- [ ] **Step 2:** Add a migration helper for old saved songs / genre presets that referenced `waveform` (singular).

### Task F.3: Audio engine — sum oscillators per voice

**File:** `src/lib/audio/audio-engine.ts`

- [ ] **Step 1:** In `playFrequencies`, for each frequency, create one `OscillatorNode` per enabled waveform, all connected to the same voice gain.
- [ ] **Step 2:** Divide the per-voice `peak` gain by `waveforms.length` to compensate for the additive amplitude (so 4 waveforms don't 4× the loudness and clip).
- [ ] **Step 3:** Cleanup (`onended` from Phase B) needs to fire only after all oscillators end — use the last `stopAt`.
- [ ] **Step 4:** Update the test for `playFrequencies` if there is one; add a new test for the multi-waveform path.

### Task F.4: KeyDrawer UI — multi-select waveform

**File:** `src/components/KeyDrawer/KeyDrawer.tsx`

- [ ] **Step 1:** Convert the waveform pill row from single-press (`aria-pressed` of one) to multi-press (each pill independently toggles). When the user attempts to deselect the last one, no-op (we need at least one).
- [ ] **Step 2:** Update the section-head `<strong>` to show e.g. "sine + triangle" (or "sine, triangle"); if 3+, show "3 waves" with a tooltip listing them.
- [ ] **Step 3:** Run the dev server + verify in the browser: pick {sine, triangle}, play a chord, hear both.

### Task F.5: Genre presets

**File:** `src/lib/theory/styles.ts`

- [ ] **Step 1:** Update style presets to use the `waveforms: [...]` shape. Default each existing preset to its current single waveform wrapped in an array.
- [ ] **Step 2:** No behaviour change for users who haven't touched it.

### Task F.6: Tests, lint, build

- [ ] **Step 1:** `npm run test:run`
- [ ] **Step 2:** `npm run lint`
- [ ] **Step 3:** `npm run build`

### Task F.7: Commit

```bash
git commit -m "audio: layer multiple waveforms; KeyDrawer multi-select with gain compensation"
```

---

## Phase G — Next-steps + discussion list (≈15 min)

### Task G.1: Author `docs/NEXT-STEPS.md`

Sections:

1. **Firebase auth + per-user songs** — most important, blocks public hosting. Options:
   - Google sign-in only (least friction)
   - Email magic link
   - Anonymous + upgrade later
2. **Vercel deploy** — the roadmap item; needs auth decision first.
3. **CSP header** — deferred from Phase A; needs DOMain list for Firestore + a connect-src for any analytics.
4. **Firestore security rules** — needed once auth is in.
5. **Visual regression in CI** — currently local-only; if we deploy to Vercel, add the action.
6. **Discussion items raised during this hardening sprint** — anything I deferred.

### Task G.2: Commit

```bash
git commit -m "docs: NEXT-STEPS.md — prioritised options for what's after the alpha"
```

---

## Final handoff

- [ ] **Final sanity:** `git status` clean; `git log polish-and-architecture..HEAD --oneline` shows ~6–7 commits.
- [ ] **Do not push** unless asked. Branch is `production-hardening`.
- [ ] **Report to user:** what shipped, what's deferred to discussion, the open questions.

---

## Self-review pass

- **Spec coverage:** security ✓ (A), performance ✓ (B), test pyramid ✓ (C), VR tests ✓ (D), readability + agent-friendliness ✓ (E), waveform feature ✓ (F), next-steps list ✓ (G). Branch + commit cadence ✓.
- **Placeholder scan:** none — every task has concrete steps + commands.
- **Type consistency:** `waveforms: Waveform[]` used consistently across F.2/F.3/F.4/F.5.
