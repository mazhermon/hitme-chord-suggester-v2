# Social Video Export — Research and Plan

> Status: **research / proposal only**. No code written yet.

## The question

> "Let users export a chord progression as a social video — perhaps Remotion and
> Playwright, but research the best tools."

The goal is a shareable clip (vertical 9:16 for Reels/TikTok/Shorts, or square 1:1):
the chords animating in time, the progression playing as audio, and a little "made with
Hit me" brand mark. This doubles as our best marketing channel (see the business plan).

## The tools, and why one of them is a trap

| Approach | How it makes a video | Verdict |
|---|---|---|
| **Playwright screen-recording** | Drive a headless browser playing the app, capture the screen | ❌ **Not for production video.** Recording is real-time (a 15s clip takes ≥15s of compute — *O(1)* in the clip length), the frame rate drifts with the machine, and a crash loses the whole render. Fine for a *screenshot*; wrong for smooth video. [Remotion's own write-up of why](https://github.com/orgs/remotion-dev/discussions/4351) |
| **Client-side `MediaRecorder`** ✅ (MVP) | In the user's browser, animate a `<canvas>` and capture `canvas.captureStream()` + the Web Audio output into a `.webm` | **Cheapest possible path.** Zero server cost, reuses the audio engine we already have. Good enough to validate that people *want* to share. Limits: quality/timing vary by browser; output is `.webm` (fine for upload, not ideal for every platform). |
| **Remotion** ✅ (scale) | Define the video as a React component; render *frame-by-frame* to a real MP4 with an audio track | **The right long-term tool.** Purpose-built React→video, deterministic timing, real audio support, renders on Node or — for scale — **AWS Lambda**, massively parallel at ~pennies per video. [Remotion render docs](https://www.remotion.dev/docs/render) · [Remotion Lambda](https://github.com/remotion-dev/remotion) |

## Recommendation: a two-phase path

**Phase A — Client-side `MediaRecorder` (MVP).**
We already have everything the visual needs: chord symbols, the piano/guitar diagrams, the
Web Audio playback with its `ARPEGGIO_STEP` timing, and the highlight-in-time animation
that `ChordDisplay` already runs. We draw that same timeline onto a canvas, capture it with
audio, and offer a download. **No new infrastructure, no new vendor, no recurring cost.**
This proves demand before we spend anything.

**Phase B — Remotion (only if Phase A gets used).**
Move the composition into a Remotion project that *reuses the same chord-rendering and the
same note timings*, producing a clean MP4 at any resolution/aspect ratio. Render via
**Remotion Lambda** so a burst of exports doesn't block a Vercel function or blow its
timeout. This buys us polish, reliability, and platform-perfect output.

```
Phase A (browser)                         Phase B (Remotion + Lambda)
─────────────────                         ───────────────────────────
canvas + captureStream + WebAudio   ──►   <Composition> reuses chord visuals
MediaRecorder → .webm                     deterministic frames → .mp4
$0, runs on the user's device             ~pennies/video on AWS Lambda, any aspect ratio
"does anyone share these?"                "make it look great + scale"
```

## Critique of my own plan, and refinements

- **Remotion has a licensing cost that is easy to miss.** Remotion is free for individuals
  and small teams, but **companies above a small headcount need a paid Company License.**
  For a solo project this is fine today, but it must be a *conscious* decision before
  Phase B, and it's another reason the **client-side MVP comes first** — `MediaRecorder`
  has no such string attached. [Remotion](https://github.com/remotion-dev/remotion)
- **Don't render video on a Vercel function.** Frame rendering is CPU- and memory-heavy and
  will hit Vercel's execution limits and bandwidth costs. Phase B explicitly offloads to
  Lambda; Vercel only kicks off the job and serves the result link.
- **Audio is the hard part, and we shouldn't gold-plate it.** Capturing the synthesised
  Web Audio cleanly in `MediaRecorder` is browser-dependent. **Refinement:** the MVP can
  ship as *video-with-audio where supported, silent animation as a fallback* — a silent,
  good-looking chord animation is still shareable, and we don't block the feature on the
  trickiest 10%.
- **Make sharing the growth loop, not just a feature.** Every exported clip should carry a
  subtle "made with Hit me — hitme.mazhermon.com" mark. That turns each share into
  acquisition. This ties directly into the marketing plan (`03-feedback-and-business-model.md`).
- **Sequencing:** this is **Phase 4** in the roadmap — *after* feedback, accounts, and the
  first paid tier. It's the highest-effort item and should ride on a real, paying audience.
