# Polish + Architecture Documentation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilise the alpha (iOS audio routing, sidebar UX jumps, small-screen polish) and ship a visual technical-architecture doc the developer can reason about.

**Architecture:** Four sequential phases on branch `polish-and-architecture` (already created off `main`). Commit at the end of each meaningful unit; never push to `main`. The audio-engine work in flight is finished + verified first because it's smallest and lowest risk; UX work then design-critique work follow on; architecture documentation closes the session.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, CSS Modules, Vitest, Playwright, native Web Audio, Mermaid (for diagrams, GitHub-renderable, version-controlled). The `figma:figma-generate-diagram` Skill is available as an alternative — picked during the Phase-4 research step.

---

## Phase 1 — Finish iOS audio session fix (≈10 min)

Work already drafted in `src/lib/audio/audio-engine.ts` + a new `audio-engine.test.ts`.
The added function `primeAudioForMobile(ctx, navigator)` sets
`navigator.audioSession.type = 'playback'` on iOS 16.4+ (so the silent switch no longer
mutes us — root cause of the "playing through the ringer" symptom), plus a one-sample
silent-buffer unlock and a visibility-change resume.

### Task 1.1: Verify the audio test suite

**Files:**
- Test: `src/lib/audio/audio-engine.test.ts`

- [ ] **Step 1: Run the audio test in isolation**

Run: `npx vitest run src/lib/audio/audio-engine.test.ts`
Expected: 3 passed, 0 failed.

- [ ] **Step 2: Run the full test suite, lint, build**

Run: `npm run test:run && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/lib/audio/audio-engine.ts src/lib/audio/audio-engine.test.ts
git commit -m "$(cat <<'EOF'
audio: route iOS Web Audio through media channel, not ringer

Set navigator.audioSession.type = 'playback' (iOS 16.4+) so the silent
switch no longer mutes us, plus the one-sample silent-buffer unlock and
a visibilitychange resume for backgrounded tabs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Sidebar UX hygiene: fix layout-shift jumps (≈40 min)

Symptom (from the user): "sometimes the UI will jump around when a selection is made" in
the sidebar (audio sound-shaping in particular). Likely causes to investigate, in priority
order:

1. **CollapsibleSection** expand/collapse causing main-canvas reflow (no fixed height).
2. **Sub-section state changes** (e.g. selecting a tonic, toggling a strategy) causing the
   selected button's text to bold-weight, which changes width and rewraps the row.
3. **`<p class="note">` under genre** changing length when a different genre is chosen,
   resizing the section.
4. **`strong` in `.sectionHead`** showing the current value (key, octave ±N, waveform, bpm)
   reflowing the head height when the value changes width.
5. **Scrollbar appearing** on the sidebar when a section opens (no `scrollbar-gutter: stable`).
6. **Mobile overlay drawer** focus-trap pulling the page if focus jumps to a control offscreen.

### Task 2.1: Start the dev server and reproduce

- [ ] **Step 1: Start dev server in the background**

Run: `npm run dev` (background)
Expected: ready at `http://localhost:3000`.

- [ ] **Step 2: Drive the page with Playwright MCP**

For each interaction listed below, take a screenshot before and after; diff them visually to log every jump:

- Add chord I (so the dock + display populate).
- Open sidebar → expand each CollapsibleSection (Chords/Sound/Display) one at a time.
- In Chords: toggle each genre, then each tonic, then maj↔min, then each extension, then each strategy.
- In Sound: drag each ADSR slider end-to-end, toggle each waveform, drag octave & bpm, toggle Mute.
- In Display: toggle Show guitar / Show piano.
- Resize the viewport across the 900px breakpoint (drawer-overlay ↔ docked).

- [ ] **Step 3: Write a JUMP LOG entry per issue**

Document each as: `{where, action, observed shift, hypothesized cause}` — append to a scratch
note (`docs/_scratch/jump-log.md`, gitignored or deleted after Phase 2).

### Task 2.2: Apply fixes

Fix bottom-up — cheaper CSS first, behaviour-touching last. Common patches:

- [ ] **Fix font-weight selection shifts** — make selected and unselected the same weight, or use a transparent border the same width as the selected one.
- [ ] **Stabilise `.sectionHead strong`** — reserve `min-width: <ch>` so different label widths don't shrug the row.
- [ ] **Reserve space for the `.note` paragraph** — give it `min-height: 2lh` (or a fixed line-clamp) so changing genres doesn't reflow.
- [ ] **`scrollbar-gutter: stable`** on `.drawer` so opening a long section doesn't add a scrollbar.
- [ ] **CollapsibleSection animation** — confirm it's height-transitioned (not `display: none` flicker). Add `overflow: hidden` and `transition: grid-template-rows` (or `max-height` fallback) so content reveal is smooth, not a jump.
- [ ] **Slider value display** — if any slider shows a numeric value next to it that changes width as you drag, tabular-nums + `min-width` it.

After each fix, re-run the same Playwright sweep and verify the affected jump is gone without introducing a new one.

- [ ] **Step N: Run full tests + lint + build**

Run: `npm run test:run && npm run lint && npm run build`
Expected: all green.

- [ ] **Step N+1: Commit**

```bash
git add -p   # stage the CSS + any minor JSX tweaks
git commit -m "$(cat <<'EOF'
sidebar: eliminate layout-shift jumps on selection

Reserve space for value labels in section heads, tabular-nums on slider
readouts, scrollbar-gutter on the drawer, height-transitioned
CollapsibleSection. Selected/unselected states share the same font-weight
and border-width so toggling doesn't rewrap the row.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Design critique at small screens (≈30 min)

### Task 3.1: Gather screenshots

- [ ] **Step 1: Capture screenshots at three small widths**

Drive with Playwright MCP: capture `/` (editor) and `/songs` (list) at viewport widths 360, 480, 768 — both with the drawer closed and (where applicable) open.

Save into `.playwright-mcp/critique-2026-05-30/` (gitignored).

### Task 3.2: Run the `critique` skill on each screenshot

- [ ] **Step 1: Invoke `critique` skill**

Per the skill description, score visual hierarchy, info architecture, emotional resonance, cognitive load, anti-patterns. Produce a P0/P1/P2 list.

- [ ] **Step 2: Triage**

Move each item into one of:
- **Now** — clear quick win (≤5 min), do it.
- **Roadmap** — append to `docs/roadmap/` as a new item.
- **Drop** — taste call the user might not share, log and skip.

### Task 3.3: Apply the "Now" fixes

- [ ] **Step 1: Implement each "Now" fix**
- [ ] **Step 2: Re-screenshot to confirm**
- [ ] **Step 3: `npm run test:run && npm run lint && npm run build`**
- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
small-screen polish: fixes from design critique

<one line per fix>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Architecture documentation (≈60 min)

Goal: give the user, as a software engineer, a clear visual + textual picture of how the
app fits together, the services it uses, and the technical-design decisions made. Build on
`docs/ARCHITECTURE.md` (which is text-only and module-focused), don't replace it.

### Task 4.1: Research tooling

- [ ] **Step 1: Web-search the current best Claude-friendly approaches**

Search queries to run:
- "Mermaid C4 model 2026 best practices"
- "D2 vs Mermaid 2026 architecture diagrams"
- "Claude Code generate architecture diagram skill"
- Check the `figma:figma-generate-diagram` skill — what types it supports.

- [ ] **Step 2: Pick the stack (≤ 5 lines of rationale)**

Default recommendation (validate against research): **Mermaid** for diagrams (renders inline
on GitHub, plain text in git, no toolchain), **C4 model** (Context → Container → Component)
for the structural hierarchy, **ADR** (Architecture Decision Records) format for decisions.
The `figma:figma-generate-diagram` skill is the alternative if the user prefers a polished
FigJam canvas — pick based on the research result.

### Task 4.2: Author `docs/SYSTEM.md`

**File:** `docs/SYSTEM.md` (new)

Sections, in order:

1. **One-paragraph elevator pitch** — what this app does and who runs it.
2. **C4 Level 1 — System Context** (Mermaid `graph LR`): user, app, Firebase, browser Web
   Audio device, user's DAW (MIDI consumer), social-share targets (roadmap).
3. **C4 Level 2 — Containers** (Mermaid `graph TD`): Next 16 server (RSC + route handlers
   if any), client React tree, three browser-native subsystems (Web Audio, MediaRecorder,
   localStorage), Firebase Firestore.
4. **C4 Level 3 — Components** (Mermaid `graph LR`): the `src/lib/` modules with their
   one-line responsibility, the `src/state/` reducer, `src/components/` screens; show that
   `chordToMidi` is the single voicing source for synth + piano + MIDI export.
5. **Data-flow / sequence** (Mermaid `sequenceDiagram`): "user taps a Roman numeral →
   reducer adds slot → render derives display chord → tap chord → audio-engine schedules
   arpeggio". Plus: "tap Suggest → strategies vote → reducer rolls 1–2 slots".
6. **Services & boundaries table** — Web Audio, MediaRecorder, Firestore, localStorage,
   tonal, midi-writer-js, GSAP: each row = {service, used for, where invoked, fallback when
   absent, env required}.
7. **ADR-001 — No Tone.js (raw Web Audio)** — rationale already in ARCHITECTURE.md, lift
   into ADR format.
8. **ADR-002 — `chordToMidi` as single voicing source.**
9. **ADR-003 — No MIDI tempo event in export** (lift from ARCHITECTURE.md).
10. **ADR-004 — Slot model (`base+sub+locked`) instead of input-vs-results.**
11. **ADR-005 — Local-first storage with optional Firestore (env-gated).**
12. **ADR-006 — iOS playback audio-session routing** (this session's fix).
13. **Known boundaries & limitations** — what isn't here yet (auth, server endpoints, CI/CD).

Each Mermaid block must be valid (`mermaid` codefence). Cross-link to ARCHITECTURE.md and
the roadmap. Keep prose terse — diagrams + tables carry most of the weight.

- [ ] **Step 1: Draft `docs/SYSTEM.md` end-to-end**
- [ ] **Step 2: Verify each Mermaid block renders** — paste into the Mermaid live editor (`https://mermaid.live`) or use `npx -y @mermaid-js/mermaid-cli -i <tmp>.md -o /tmp/out.svg` if installed; otherwise visually review for valid syntax.
- [ ] **Step 3: Cross-link** — add a `## Architecture` paragraph at the top of README.md pointing to `docs/SYSTEM.md` (visual) and `docs/ARCHITECTURE.md` (as-built).
- [ ] **Step 4: Commit**

```bash
git add docs/SYSTEM.md README.md
git commit -m "$(cat <<'EOF'
docs: SYSTEM.md — C4 visual architecture + ADRs

Mermaid C4 (context/container/component) + sequence diagrams, services
table, and ADRs for the six load-bearing technical decisions
(no Tone.js, single voicing source, no MIDI tempo event, slot model,
local-first storage, iOS audio session routing).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Handoff

- [ ] **Step 1: Final sanity** — `git status` should be clean; `git log main..HEAD --oneline` should list ~4 commits (audio fix, sidebar polish, small-screen polish, system docs).
- [ ] **Step 2: Do NOT push** — leave the branch local. The user explicitly said no push to main without their say-so. Tell them the branch name (`polish-and-architecture`), the commit count, and ask whether to push to a remote PR branch or keep local.

---

## Self-review pass

- **Spec coverage:** audio fix ✓ (Phase 1); sidebar jumping ✓ (Phase 2); small-screen design critique ✓ (Phase 3); architecture docs with visual diagrams + services overview ✓ (Phase 4); research first ✓ (Task 4.1); branch ✓ (already on `polish-and-architecture`); commit cadence ✓ (per-phase); no push to main ✓ (handoff step); memory caught up ✓ (done before plan).
- **Placeholder scan:** no TBDs; jump-causes listed as hypotheses but Phase 2 verifies them empirically before fixing.
- **Type/name consistency:** `primeAudioForMobile` matches the function added in audio-engine.ts; `docs/SYSTEM.md` is the consistent filename throughout.
