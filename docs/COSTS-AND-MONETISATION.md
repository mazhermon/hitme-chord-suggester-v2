# Costs & Monetisation Plan

A living plan for keeping spending low while we grow, and a roadmap for
the path to revenue if the app finds an audience. Numbers are 2026
pricing; revisit when providers' tiers change.

---

## 1. Current cost trajectory (as built today)

The full stack runs on three free tiers. The breakpoints below are where
costs would start.

| Service | Free tier | First paid tier | Where we are today |
|---|---|---|---|
| **Vercel Hobby** | 100 GB bandwidth/mo, unlimited static, edge functions included, cron jobs (Hobby limited to daily) | Pro $20/mo per member — 1 TB bandwidth | 0 users → ~free forever for personal use |
| **Supabase Free** | 500 MB Postgres, 50K MAU, 5 GB bandwidth, 1 GB file storage, 7-day idle pause (defeated by our cron) | Pro $25/mo flat — 8 GB DB, 100K MAU, 250 GB bandwidth | 0 users → 50K MAU on free |
| **Resend Free** | 3K emails/month, 100/day | Pro $20/mo flat — 50K emails | 0 users → 3K magic-link sends/mo on free |
| **Domain** | n/a | ~$12/year (Namecheap, Cloudflare etc.) | already owned: hitme.mazhermon.com |
| **DNS** | Cloudflare free | n/a | free |
| **Analytics** | Vercel Web Analytics free (Hobby), Plausible free for personal | $9/mo Plausible at scale | not wired yet |
| **Storage backup** | n/a | Supabase Pro includes daily backups | not needed at our size |

**Bottom line for the first ~6 months:** £0/month if nothing else changes.

---

## 2. When costs kick in

Modelled growth scenarios. We're conservative — actual costs depend on how
heavily users save / load / play.

### 100 users (a friend-circle alpha)

| Item | Cost | Why |
|---|---|---|
| Vercel | £0 | Well within Hobby |
| Supabase | £0 | < 1% of free MAU |
| Resend | £0 | ~30 sign-in emails/mo |
| **Total** | **£0/mo** | |

### 1,000 active users

| Item | Cost | Why |
|---|---|---|
| Vercel | £0 | Still within Hobby's 100 GB/mo |
| Supabase | £0 | 1K MAU is well under 50K |
| Resend | £0 | ~300 emails/mo if 30% sign in monthly |
| Domain | ~£1/mo amortised | |
| **Total** | **~£1/mo** | |

### 10,000 active users

| Item | Cost | Why |
|---|---|---|
| Vercel Hobby | £0 if we stay light; otherwise Pro at £15/mo per seat | Heavy use of `next/image` or RSC could push bandwidth |
| Supabase Pro | £20/mo | Almost certainly cross 50K MAU threshold and want backups + reliability |
| Resend | £0 → maybe £15/mo | 10K sign-ins/mo > free tier |
| **Total** | **~£20-50/mo** | |

### 100,000 active users — the "we should be earning by now" line

| Item | Cost |
|---|---|
| Vercel Pro | £15-50/mo (one seat) |
| Supabase Pro | £20/mo flat (still under the team plan) |
| Resend | £15/mo |
| Domain | £1/mo |
| **Total** | **~£50-100/mo** |

If we cross 100K we should have monetisation in place — see §4.

---

## 3. Things that would surprise-bill us (and how we've prevented them)

| Risk | Mitigation in place |
|---|---|
| Supabase free tier auto-pause after 7 days idle | Vercel Cron pings `/api/keepalive` every 3 days (ADR-008) |
| Vercel function timeouts on free tier | We don't use server functions except for the cron route |
| Vercel image-optimisation overage | We don't use `next/image` for user content; only the editor's SVGs |
| Firebase Blaze billing spike | Migrated off Firestore primary path; the legacy adapter is dormant |
| Spam sign-ups exhausting Resend free tier | Supabase Auth has built-in rate limiting; we can add a captcha if needed |
| MAU spike from a viral post → Supabase paywall | Hard cap, never silent bill — users would see "service paused" not us see "£500 bill" |
| Domain expiry | Set autorenew (manual action: confirm in your Namecheap/Cloudflare account) |

---

## 4. Monetisation paths — ranked by fit

The app is a focused music-theory tool. Heavy ads would feel out of place.
Options listed best-fit first.

### 4a. Donations + supporter tier (low friction, low ceiling)

**Mechanics:** "Buy me a coffee" or Stripe one-time donation. Optional
recurring tier (£3-5/mo) that unlocks a small bundle of nice-to-have
features.

**Pros:** Aligns with the "calm, considered tool" brand. Zero friction
for non-payers. No platform lock-in.

**Cons:** Conversion is typically < 1%. Unlikely to cover infrastructure
above 10K users by itself.

**Time to build:** ~half day (Stripe Checkout link in settings, server
webhook to unlock flag, env-gated feature check). No new accounts table —
we can store `is_supporter` directly on `auth.users` metadata.

### 4b. Freemium with a soft cap

**Mechanics:** Free users get unlimited play but a cap on saved songs
(say, 5 or 10). Paid tier (£3-5/mo or £30/yr) lifts the cap.

**Pros:** Lines up with the cost driver — paid users are the heavy users
who actually fill the DB. Low-friction onboarding (cap kicks in at song
6, not at sign-up).

**Cons:** "Saved songs" is a low-anxiety metric. Many users won't hit 5.

**Time to build:** ~1 day. Cap check at save site, upgrade dialog,
Stripe-via-Supabase pattern.

### 4c. Pro features (highest revenue ceiling)

**Mechanics:** Free tier keeps the current full feature set. Pro
(£5-10/mo) unlocks:
- Unlimited saved songs (vs. soft cap)
- Higher-quality video export (1080p instead of 540p)
- More substitution strategies (advanced jazz: altered dominants,
  upper-structure triads, modal mixture from melodic minor)
- More chord-extension shapes (13ths, add-9s, sus-with-9)
- MIDI export with tempo + chord-symbol metadata
- "Generate a melody over this progression" (an LLM-assisted feature
  with its own cost — pass-through-priced)
- Custom synth waveforms (FM, noise, sample-based — bigger audio
  engine work)

**Pros:** Real differentiation. Power users self-select.

**Cons:** Most work to build out. Risk: feels like the free version is
deliberately crippled.

**Time to build:** Per-feature — the simplest (unlimited saves, 1080p
video) is ~half day; the LLM melody feature is a multi-day project.

### 4d. Affiliate links to gear (zero work, low ceiling)

**Mechanics:** "Buy a MIDI controller" / "Get a DAW" widget in a sidebar,
linked to Sweetwater/Thomann affiliate accounts.

**Pros:** Passive revenue once wired. £0 cost to maintain.

**Cons:** Feels promotional. Almost never makes meaningful money for a
non-content site.

**Verdict:** Skip unless we add an editorial content layer (tutorials).

### 4e. Course / book sales (content arm)

**Mechanics:** The app's lessons are short. A long-form "Reharmonisation
Guide" book or video course built around it could sell for £25-50 one-
time.

**Pros:** Aligns with the music-theory audience. High margins on
digital products. Brand-positive.

**Cons:** Months of writing/recording work before the first sale.

**Verdict:** Plant the seed in lessons content; revisit as a Q1-2027
project if the app gets traction.

### 4f. Sponsorship / partnership (medium ceiling)

**Mechanics:** A music-software brand (a softsynth maker, an online
music school) sponsors a chord-suggestion strategy preset or a "powered
by" footer.

**Pros:** Bigger cheques than donations. One sale covers months of
infrastructure.

**Cons:** Brand contamination risk. Hard to find at low traffic.

**Verdict:** Realistic only at > 5K active monthly users.

---

## 5. Recommended path

Stage 1 — **launch & validate** (now → 500 users):
- Free everything. No paywall. Vercel/Supabase/Resend free tiers.
- Add a small "Support the project" link in settings → "Buy me a coffee"
  page. Treat as a tip jar, not a business model.

Stage 2 — **early monetisation** (500 → 5K users):
- Build **4a** (supporter tier) properly. Stripe Checkout, ~£3/mo, two
  small unlocks (custom waveforms + 1080p video).
- Track conversion. If > 3%, the project pays for itself indefinitely
  on free infra; if < 1%, move to stage 3 plans.

Stage 3 — **revenue play** (5K+ users):
- Layer **4c** (Pro features). The melody-generation feature is the
  biggest draw and the most differentiated.
- At this point upgrade to Supabase Pro for backups + reliability and
  Vercel Pro for the team seat.

Stage 4 — **expand** (15K+ users, monthly profitable):
- Consider **4e** (course / book) as a parallel content brand.
- Sponsorship conversations.

---

## 6. Decisions to lock in soon

- **Payment processor:** Stripe by default. Lemon Squeezy worth checking
  if we want EU VAT handled for us (Stripe Atlas adds compliance work).
- **Pricing currency:** GBP, USD, EUR? Stripe handles auto-conversion;
  pick the display currency based on where most users are (likely
  US-heavy for a music app — start with USD).
- **Free-tier cap (if we go 4b):** 5 songs vs 10 vs 20? Lower drives
  conversion harder; higher feels generous. Recommend **10**.
- **Refund policy:** 30-day no-questions for subscriptions; "you can
  cancel anytime, we don't pro-rate" for simplicity.

---

## 7. Cost discipline checklist (review quarterly)

- [ ] `npm audit --omit=dev` — no high/critical for unfixable reasons
- [ ] Vercel usage dashboard — under 80% of any Hobby quota
- [ ] Supabase usage dashboard — under 80% of free MAU + storage
- [ ] Resend usage — under 80% of free email cap
- [ ] `/api/keepalive` last 30 days success rate ≥ 95% (otherwise the DB
      is auto-pausing)
- [ ] Bundle size in CI — < 1.6 MB total (alert at +10% on a PR)
- [ ] Domain auto-renewal — confirmed in registrar
- [ ] Any new vendor signed up — add to this doc
