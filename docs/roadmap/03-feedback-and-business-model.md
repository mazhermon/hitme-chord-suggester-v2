# Feedback, Business Model & Marketing — Research and Plan

> Status: **research / proposal only**. No code written yet.

Three related goals: hear from users, make the app pay for itself, and grow it — while
keeping the cost to each user *very low*.

---

## 1. Feedback mechanism

| Option | Cost | Verdict |
|---|---|---|
| **In-app widget → our own DB table** ✅ | $0 | Recommended. A small "Feedback" button opens a one-field form that writes to a `feedback` table (the same Supabase we'd add for accounts; RLS = anyone can *insert*, only the admin can *read*). Optionally email a copy via Resend (free tier ~3k/mo). |
| Third-party (Canny, Featurebase) | $0–$50+/mo | Nice public roadmaps and voting, but another vendor and another bill. Over-engineered for launch. |
| GitHub Discussions / Issues | $0 | Great for the technical crowd, free, public. A good *secondary* channel and a public roadmap, but too high-friction as the *only* path for musicians. |

**Recommendation:** start with the in-app widget (one table, no new vendor). If feedback
volume justifies it, add GitHub Discussions as a public roadmap later. Crucially, the
feedback widget is **cheap enough to ship before anything else** — it's how we learn what
to build next, so it leads the roadmap rather than trailing it.

---

## 2. What it costs to run (the honest baseline)

| Item | When | Cost |
|---|---|---|
| Domain (already owned: hitme.mazhermon.com) | now | ~$12/yr |
| Vercel **Hobby** | while non-commercial | **$0** |
| Vercel **Pro** — *required once we accept money/donations* | at monetisation | **$20/mo** |
| Supabase | free → Pro when traffic justifies | $0 → **$25/mo** |
| Resend (transactional email) | optional | $0 (free tier) |
| Remotion Lambda (Phase 4 video) | per render | ~pennies/video |

So the **realistic monthly break-even once monetised is ≈ $20–45/mo.** That's the number
the income needs to clear. [Vercel pricing](https://vercel.com/pricing) ·
[Supabase pricing](https://supabase.com/pricing)

> ⚠️ The one gotcha worth repeating: **Vercel Hobby is non-commercial only.** The moment a
> "Buy me a coffee" link appears, hosting must be on Pro ($20/mo). Budget for it.

---

## 3. Business model — start with a tip jar, grow into a gentle freemium

You asked to start "buy me a coffee" style and keep the user cost very low. Here's a
staged model that does exactly that and never puts the core tool behind a paywall.

**Stage 1 — Tip jar (launch).**
A "Buy me a coffee / support this tool" link. Use **Ko-fi (0% fee on donations)** rather
than Buy Me a Coffee (5%), or **GitHub Sponsors** for the dev-leaning audience. No
accounts, no commitment, near-zero ops. This *validates that people value the tool* before
we build billing.

**Stage 2 — "Supporter" tier (very low cost).**
Once accounts exist, a single low tier — **~$2–3/mo or a $20 "lifetime supporter"** —
unlocks quality-of-life extras while the **core stays free forever**:

| Free (always) | Supporter (~$2–3/mo) |
|---|---|
| Full chord engine, suggest, all 12 keys | Unlimited saved songs (free tier caps at, say, 10) |
| Playback, piano & guitar diagrams | **MIDI + social-video export** |
| Save locally / a handful of cloud songs | Extra genres, voicings, ADSR presets |
| | Cloud sync across devices |

The line to hold: **never paywall songwriting itself.** Charge for *convenience, storage,
and export*, which cost us money or are clearly "pro" conveniences.

**Payments:** prefer a **merchant-of-record (Lemon Squeezy / Paddle, ~5%+) over raw
Stripe (2.9%+30¢)** for a solo maintainer — they handle global sales tax/VAT for you,
which is real, tedious liability you don't want to own. Slightly higher fee, far less
operational burden = aligned with "don't over-engineer."

**Break-even is tiny:** at $20–45/mo cost, **~10–15 supporters at $3/mo** covers
everything. That is an achievable bar for a useful free tool.

---

## 4. Marketing — let the product do the work

The cheapest growth for a free tool is the tool itself producing shareable things and
ranking for what musicians already search.

1. **Social-video export *is* the flywheel.** Every clip carries a "made with Hit me" mark
   → each share is an ad. This is why the video feature (Phase 4) and growth are the same
   project.
2. **SEO from content we already have.** The app already contains *lesson* content
   (`lib/theory/lessons`) — modal interchange, secondary dominants, tritone subs. Turn
   each into a small landing/blog page targeting real queries ("ii–V–I", "chord
   substitutions for jazz", "house music chord progressions"). The tool is the call to
   action at the bottom of every lesson.
3. **Go where the audience is:** r/musictheory, r/edmproduction, r/WeAreTheMusicMakers,
   lo-fi/producer Discords, a Product Hunt launch. Lead with a *result* (a shared clip),
   not a pitch.
4. **Product-led loop:** free, genuinely useful, frictionless to try (no signup to start)
   → makes something cool → shares it → friend clicks the watermark. Donations and
   supporter upgrades are the gentle monetisation layered on top, never the gate.

---

## Critique of my own plan, and refinements

- **Don't stand up billing infrastructure before there's an audience.** A Stripe/Lemon
  Squeezy integration is wasted effort at zero users. **Refinement:** Stage 1 is *just a
  Ko-fi link* — no code, no schema. Real billing (Stage 2) waits for evidence.
- **The free→paid line must feel generous, or it backfires.** Capping free saves too
  aggressively makes the tool feel crippled and kills word-of-mouth. **Refinement:** set
  the free cap high enough that a casual user never hits it (≈10 songs), so only power
  users — exactly the people happy to pay — meet the upgrade prompt.
- **VAT/tax is a silent liability.** This is the concrete reason to pick a
  merchant-of-record over Stripe, stated plainly so it's a decision, not an accident.
- **Measure before optimising.** Add privacy-friendly analytics (Vercel Web Analytics, or
  Plausible) so the roadmap is driven by what people actually do, not guesses — but keep it
  lightweight to honour the low-cost, no-over-engineering brief.
