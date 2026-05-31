# Marketing Plan — Hit me

A pragmatic plan for getting "Hit me" in front of musicians who actually
need it. Aimed at solo / small-team execution; nothing requires a paid
ad budget at the start. Numbers in this doc are realistic estimates, not
promises.

---

## 1. Who this is for

The two clearest audiences:

**A. Songwriters at the instrument (primary).** Guitarist or pianist
working on a song, knows the basics ("I-IV-V"), wants more interesting
options without consulting a theory book. Bouncing between chords on
their lap, wants to try alternatives in seconds.

**B. Hobbyist producers (secondary).** Bedroom Logic / Ableton user
sketching a track. Wants ideas they can drag-MIDI straight into their
DAW.

We're not for: working session jazz players (they don't need it), pure
academic theorists (the simplification offends), strict classical
arrangers (different vocabulary).

---

## 2. Positioning

**The line:** *"Songwriting suggestions that actually make sense."*

**The longer pitch:** A chord-progression sketchpad that gives you
theory-correct substitutions — modal interchange, secondary dominants,
tritone subs, plus genre presets that bias the suggestions toward jazz,
folk, pop, or house. Play it through a built-in synth. Drag the result
into your DAW.

**The category:** *songwriting tool*, not *music-theory tutor*, not
*DAW*. We're a sketchpad — a place to find the next chord, then take it
elsewhere.

**Sound bites for taglines / search results:**

- "Theory-correct chord ideas. Tap the next idea, hear it, export it."
- "A chord-progression sketchpad. Built for songwriters in the room."
- "Tritone subs, secondary dominants, planing — without the textbook."

---

## 3. Competitive context

| Tool | What it is | Where we differ |
|---|---|---|
| **Hookpad / Hooktheory** | Subscription chord-progression sketcher with melody | Hookpad is much heavier (subscription, large UI). Hit me is a focused single-screen tool. |
| **Captain Plugins (Mixed In Key)** | DAW plugin, $129 lifetime | We're free + browser-based. They're plugin-only. |
| **Scaler 2 / Scaler 3** | DAW plugin, ~$50 | Plugin-bound. We're a sketchpad you use BEFORE the DAW. |
| **iReal Pro** | Chord-chart app, paid | Pro-musician focused; doesn't suggest substitutions, doesn't have genre presets. |
| **ChatGPT / Suno-style AI** | Generative, opaque | We're transparent — every suggestion is labelled ("V/ii", "planed ↓m3") and theory-grounded. |

**Our edge:** *transparency*. Other tools surface a suggestion; we
surface a suggestion **plus the theory reason**, with a lesson you can
read on tap.

---

## 4. Channels — ranked by expected fit

### 4a. Reddit (highest fit)

The bullseye audience hangs out in:

- **r/Songwriting** — 1M+ members, posts about chord progressions get
  thousands of upvotes
- **r/musictheory** — 500K+ members, slightly more academic but still
  interested in tools
- **r/edmproduction** / **r/WeAreTheMusicMakers** — producers
- **r/Guitar** / **r/piano** — instrumentalists working on songs

**Strategy:** Share a video clip in r/Songwriting first. Frame as
"I made a thing that suggests theory-correct chord substitutions —
demo + free link." Reddit hates self-promotion that feels like ads;
demo-video posts that lead with the value are fine.

**Risk:** Mod removal for self-promotion. Soften by being a real user
of the sub for a few weeks first, or asking mods if a launch post is
welcome.

### 4b. YouTube Shorts / TikTok / Instagram Reels

The 30-60 second walkthrough format is perfect for a chord-progression
app — you can show a tap → hear a chord → tap Suggest → hear a better
chord, all in 20 seconds.

**Strategy:** One short video per "moment of value":
1. The "I-V-vi-IV becomes I-V-IV-IV with tritone sub" reveal
2. Genre presets demo (Jazz vs House on the same progression)
3. Multi-waveform sound design walkthrough
4. Export-to-Logic moment with the MIDI drag

Scripts for these in `docs/VIDEO-SCRIPTS.md`.

**Risk:** Algorithm fickleness. Treat each video as a lottery ticket;
post 8-12 over the first two weeks to give multiple chances of one
catching.

### 4c. Indie Hackers / Hacker News

The build-in-public crowd. Hit me has a nice technical story (pure-TS
theory engine, Web Audio synth, anonymous-first auth UX). The HN
audience won't make musicians, but they'll signal-boost into musician
networks.

**Strategy:** A "Show HN" post titled "Hit me — a chord-suggester I
built in a few weekends". Link to the deployed app + a short blog post
on the architecture decisions (the SYSTEM.md ADRs are gift content
here).

**Timing:** After the app is on prod with cloud sync working. A broken
demo on HN is the worst version.

### 4d. Music YouTube creators (warm outreach)

Theory-oriented YouTubers (Adam Neely, Rick Beato, Aimee Nolte,
Charles Cornell, 8-bit Music Theory) often demo tools. They won't all
respond, but a 1% reply rate from 50 emails could mean one big shout-out.

**Strategy:** Short personal email, NOT a generic press release. Two
sentences on what makes our tool different + a 60-second video clip
attached. Don't ask for a feature — just "thought you might find this
fun."

**Timing:** After we have a polished product and 2-3 weeks of organic
signal so the channel isn't betting on something nobody's seen.

### 4e. Twitter / X (lower fit, marginal)

The audience exists but it's noisy. Worth posting milestones (launch,
big features) but not worth a focused campaign.

### 4f. Mastodon / Bluesky musician communities

Smaller audiences but more receptive to "indie tool built by one
person" stories. Worth a single launch post and ongoing presence.

### 4g. SEO content (long-term)

A blog on the deployed domain answering theory questions like:

- "What is a tritone substitution and when do you use one?"
- "How do you write a chord progression in Lorde-style modal pop?"
- "Free chord progression generator with explanations"

Each post deep-links to the relevant Hit me lesson + a CTA to try it
live.

**Timing:** Stage 2 (post-launch). Compounds slowly; nothing big in
month 1 but real traffic after 6 months.

---

## 5. Launch sequence

### Week -2: Polish + prep

- [ ] Lock in a deploy URL (or push hitme.mazhermon.com behind a custom
      domain).
- [ ] Take 8-12 screenshots: empty editor, with chords, drawer open
      (mobile + desktop), genre presets, mix sliders, lock state, save
      flow, signed-in state.
- [ ] Record the 4 short videos from `VIDEO-SCRIPTS.md`.
- [ ] Write the "About" / "How it works" page (lift from SYSTEM.md
      ADR-001 + 002 — those are great storytelling: "no Tone.js, raw
      Web Audio", "every chord knows its provenance").
- [ ] Pick 3-4 reddit handles that feel right and start participating
      in them as a regular user. NOT yet posting about the tool.

### Week -1: Soft launch

- [ ] Share with 5-10 musician friends. Treat their feedback as the
      "are screenshots and copy clear?" check.
- [ ] Fix anything that comes back as confusing. Don't ship new
      features — just polish.
- [ ] Update the deploy: cloud sync working, sign-in working, all docs
      live.

### Week 0: Public soft launch

- [ ] Post to your personal social channels (Twitter / Mastodon /
      LinkedIn). Frame as "this is finally live."
- [ ] Indie Hackers post — "I built a chord-suggestion tool."
- [ ] First TikTok / Reel.
- [ ] Watch for any breakage. Don't push to bigger channels until 48
      hours of "no support tickets" pass.

### Week 1: Reddit

- [ ] r/Songwriting post with the 60-second demo video.
- [ ] r/musictheory post (different framing — lean on the "every
      suggestion is theory-labelled" angle).
- [ ] Reply to every comment. Engagement multiplies reach.

### Week 2: HN + creator outreach

- [ ] Show HN post (Tuesday-Wednesday, ~9am EST is optimal).
- [ ] Send the first batch of personalised emails to music YouTubers.
- [ ] Continue Reel / TikTok cadence (1 every 2-3 days).

### Week 3+: Sustain + iterate

- [ ] Weekly Reel / TikTok.
- [ ] Monthly blog post (SEO).
- [ ] Reply to every email / DM / Reddit comment.
- [ ] Watch analytics for "where are these visitors coming from" and
      double-down on what works.

---

## 6. Metrics worth watching

Don't drown in dashboards. The three numbers that matter:

| Metric | Source | Target by month 3 |
|---|---|---|
| **Weekly active users** | Vercel Analytics / Supabase | 200-500 |
| **% of visitors who save a song** | Custom event | 20% |
| **Sign-in conversion (anonymous → authed)** | Supabase MAU vs anon | 5-10% |

Vanity metrics worth glancing at but not optimising:

- Reddit upvotes (signal but not outcome)
- YouTube short views (algorithm noise)
- Twitter likes (vanity)

---

## 7. Brand voice

Already largely defined by the app's design context (see
`.impeccable.md`):

- Calm, focused, editorial. Like a well-made physical tool.
- Anti: salesy, hype-driven, "REVOLUTIONARY AI-POWERED" language.
- Pro: specific, useful, gently confident. Show the thing working.

For social copy: lead with the *result* the musician gets, not the
*feature*. "Find a more interesting V chord in 4 taps" beats "Now with
secondary dominant suggestions!"

---

## 8. Decisions to lock before launch

- **Domain.** hitme.mazhermon.com (current) or a dedicated domain like
  hitme.app? The former is fine; the latter costs ~£15/year and is more
  memorable.
- **Logo / icon.** Currently a placeholder. A simple sage-green
  monogram (an "H" inside a circle) would unlock the social media side
  — needed for avatar/profile images on every channel.
- **Twitter / Mastodon / TikTok handle.** Reserve all three soon to
  avoid name-squatting. @hitmeapp / @hitme.app / hit-me-app — pick one
  pattern and apply across.
- **One-line description for app stores / link previews.** Locked in
  Section 2 — use "Theory-correct chord ideas. Tap, hear, export."
