# Hit me — Growth Roadmap (research & plan)

> ### Update — 2026-05-25: decisions taken & first build shipped
> - **Stay free, stay on Vercel Hobby.** No tip jar yet — a donation link would push the
>   app into Hobby's "commercial" gray area for ~$0 return at this stage. Revisit the tip
>   jar (Ko-fi, 0% fee) **together with** the move to Vercel Pro, once traffic justifies it.
> - **Check demand before spending.** No DB/accounts yet; the app stays on `localStorage`.
> - **Database choice when we do build it: Supabase** (Postgres + RLS) — pending real demand.
> - **Shipped this session (all free, no infra):**
>   - A dismissible **beta banner** — "songs save on this device only; want cloud save? tell
>     us" — wired to a single `FEEDBACK_FORM_URL` constant in `src/lib/config.ts` (paste a
>     free Tally/Google Form URL to activate the link).
>   - **Phase 3 social-video export (browser MVP):** a "Video" button records a 9:16 clip
>     of the progression (animated chords + captured synth audio, silent fallback) via
>     canvas `captureStream` + `MediaRecorder`, then opens a **share modal** that previews
>     the clip in-app with a real **Download** link (+ "open in new tab" fallback for
>     locked-down browsers). Share buttons (**TikTok/IG primary, FB secondary**) stay
>     enabled but show a **"coming soon"** note and fire a tracked `share_intent` event
>     (per platform) to gauge demand — via a `track()` seam (`src/lib/analytics.ts`) that
>     forwards to Vercel Web Analytics once enabled. Output **prefers MP4 (H.264/AAC)** so
>     it plays natively on macOS/iOS; bitrate-capped + hard-stopped so a clip is ~1 MB.
>     Filenames: `hitme-progression-untitled.mp4` (unsaved) / `-<song-slug>.mp4` (saved).
>     Code: `src/lib/video/`, `components/VideoModal/`. Official auto-posting APIs deferred
>     — see `04-social-share-integrations.md`.
> - **Still to do for demand-checking (on deploy):** enable free **Vercel Web Analytics**
>   and add `<Analytics/>` — this captures page metrics *and* the `share_intent` events fired
>   by the TikTok/IG/FB buttons, so we can see which platforms to integrate first. Paste the
>   feedback form URL into `src/lib/config.ts`. See [`05-deploy-to-vercel.md`](./05-deploy-to-vercel.md).

> **Status: planning only (below). Sequenced by cost and risk.** This consolidates three
> research docs. Read the detail in:
> - [`01-database-and-auth.md`](./01-database-and-auth.md)
> - [`02-social-video-export.md`](./02-social-video-export.md)
> - [`03-feedback-and-business-model.md`](./03-feedback-and-business-model.md)
> - [`04-social-share-integrations.md`](./04-social-share-integrations.md) — interest
>   capture (shipped) vs official posting APIs (deferred; needs backend/hosting/review)
> - [`05-deploy-to-vercel.md`](./05-deploy-to-vercel.md) — deploy runbook + readiness
>   checklist; **enable Vercel Web Analytics on deploy** so `share_intent` events are captured
>
> A human-readable version is served at **`/roadmap.html`** while the dev server runs.

## The headline recommendations

| Area | Recommendation | One-line why |
|---|---|---|
| **Database** | **Supabase** (Postgres + Auth + Row-Level Security) | Real integrity (Postgres) + security enforced *in the DB* (RLS) + one vendor = not over-engineered. Drops in behind our existing `StorageProvider`. |
| **Auth** | **Supabase Auth** | Free to 50k users, RLS does half the authorization for us, one SDK. |
| **Video** | **Client `MediaRecorder` first, Remotion later** | Prove demand at $0 in the browser; move to Remotion+Lambda for polish/scale. |
| **Feedback** | **In-app widget → one `feedback` table** | Cheapest possible; ship it first so it steers everything else. |
| **Money** | **Ko-fi tip jar → gentle ~$2–3/mo "Supporter" tier** | Core tool stays free forever; charge for storage/export/sync. |
| **Growth** | **Shareable videos + SEO from our lesson content** | The product markets itself. |

## The core principle: sequence by cost and risk

The biggest improvement from critiquing the plan was realising the obvious build order
(DB → auth → video) is **backwards**. The app already works on `localStorage`. So we
should ship the cheapest, demand-revealing things first and only spend money/effort once
users show they want more.

```
Phase 0  ── Feedback widget + Ko-fi tip jar          cost: ~$0      risk: none
            (learn what to build; validate people care)
                              │
                              ▼
Phase 1  ── Accounts + cloud sync (Supabase + RLS)    cost: $0→$25  risk: low
            (only once people ask to sync devices)     + Vercel Pro $20 at monetisation
                              │
                              ▼
Phase 2  ── "Supporter" tier (Lemon Squeezy/Paddle)   cost: ~5% fee risk: low
            (~$2–3/mo: unlimited saves, export, sync)
                              │
                              ▼
Phase 3  ── Social video export — MediaRecorder MVP   cost: ~$0     risk: medium
            (in-browser, watermarked = growth loop)
                              │
                              ▼
Phase 4  ── Remotion + Lambda render (quality/scale)  cost: pennies/video, + license check
            (only if Phase 3 gets used)
```

**Break-even:** running cost once monetised is ≈ **$20–45/mo** (Vercel Pro + Supabase).
That's **~10–15 supporters at $3/mo** — an achievable bar for a genuinely useful free tool.

## What stays true throughout

- **The core songwriting tool is never paywalled.** We charge for convenience (cloud sync,
  unlimited saves, export), not for making music.
- **No signup to start.** Anonymous `localStorage` keeps working; accounts are additive,
  with a one-time "import my local songs" on first sign-in.
- **Small blast radius.** New persistence is one adapter behind the existing
  `StorageProvider` interface — reversible, not a rewrite.
- **Don't build ahead of demand.** Each phase is gated on evidence from the one before.

## Open decisions for you

1. **Go with Supabase**, or keep the already-scaffolded **Firebase**? (I recommend
   Supabase for integrity + RLS; Firebase is the zero-migration alternative.)
2. **Monetisation appetite:** tip jar only, or tip jar → Supporter tier?
3. **When** do we want accounts — now, or wait until people ask to sync across devices?

Once you've picked, the next step is to run **brainstorming → spec → implementation plan**
on *Phase 0/1 only* (not the whole roadmap at once), and build from there.
