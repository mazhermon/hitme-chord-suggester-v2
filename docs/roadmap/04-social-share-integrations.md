# Sharing to TikTok / Instagram / Facebook — what's possible

> Status: **shipped (share sheet) + research for the rest**. Honest about what a web app
> can and can't do here, so we don't build something that can't work.

There are **two completely different things** people mean by "share to TikTok/Instagram",
and only one of them fits a free, backend-less app today.

## 1. What we ship now — interest capture ✅

The share modal keeps **TikTok / Instagram** (primary) and **Facebook** (small secondary)
buttons enabled, but tapping one **shows a "coming soon" note** and **records the click**
as a `share_intent` event (per platform), nudging the user to **download and post manually**
for now.

- This lets us **measure which platforms people actually want** before building anything
  heavy — exactly the "check demand first" principle.
- Tracking goes through a tiny `track()` seam (`src/lib/analytics.ts`) that forwards to
  **Vercel Web Analytics** (`window.va`, free on Hobby) once its script is added on deploy;
  until then it's a safe no-op. So we instrument now, measure once deployed.
- The reliable **Download** (a real anchor) is the in-the-meantime path; "Open in a new tab"
  and right-click/long-press are fallbacks for locked-down browsers.

**Near-term enhancement (no backend):** the **Web Share API**
(`navigator.share({ files })`) opens the phone's native share sheet so a user can hand the
file to TikTok/IG/FB in one tap on mobile. It still doesn't *auto-post* (the user taps
"Post"), but it's a nicer "meantime" than download-then-upload. Worth adding once the
interest data justifies polishing this flow.

## 2. Programmatic posting via official APIs — a later, bigger project ⛔ (for now)

True "press a button on our site and it posts to your TikTok/Instagram" requires each
platform's official **Content Posting API**, and these carry real prerequisites:

### TikTok — [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- Register an app on TikTok for Developers; OAuth so the user logs in with TikTok.
- Scopes `video.upload` / `video.publish`; **app audit/review** required before you can post
  to anything other than the creator's own private drafts (`SELF_ONLY`) until approved.
- Server-side: we either send TikTok a **public URL** to the video or upload the bytes via
  their API. Needs a backend to hold tokens + do the upload.

### Instagram — [Content Publishing API](https://developers.facebook.com/docs/instagram-platform/content-publishing) (Meta Graph)
- Requires a **Facebook Developer app** + Facebook Login, and the user's account must be an
  **Instagram Business or Creator account** linked to a Facebook Page (personal accounts
  can't use it).
- App review for the `instagram_content_publish` permission.
- You publish by giving Instagram a **publicly hosted URL** of the video (it fetches it),
  then call publish. So it **requires cloud video hosting** (storage + CDN), which we don't
  have — we're deliberately local-only right now.

### Facebook
- Graph API video upload targets **Pages** (not personal profiles, which are largely
  closed off), again behind an app + review.

### Why this is deferred
Every one of these needs things the current MVP intentionally doesn't have:

| Requirement | Status today |
|---|---|
| Backend with OAuth + token storage | ❌ no backend yet (free/local MVP) |
| Publicly-hosted video URL (esp. Instagram) | ❌ no storage/CDN yet |
| Registered developer apps + secrets | ❌ need your accounts + business verification |
| Platform app **review/approval** | ❌ weeks-long human process |
| For Instagram: a Business/Creator account | ❌ requirement on the *user*, not us |

This directly conflicts with the agreed plan (free, on Vercel Hobby, check demand first). It
also can't be "set up" unilaterally — it needs your developer accounts and business
verification, plus per-platform review.

## Recommendation / sequencing

1. **Now:** ship the share sheet (done). It's the right consumer pattern and covers the
   real use case (posting from your phone).
2. **Later (only if demand is real):** once we add the **database + hosting phase** (which
   brings a backend + storage/CDN), revisit the **TikTok Content Posting API** first — it's
   the most self-contained. Instagram's Business-account + public-URL requirements make it
   the heaviest, so it comes last.
3. Treat auto-posting as a **power-user / paid-tier** feature, since it carries real
   maintenance (token refresh, review re-certification) — it should ride on actual usage.

See [`00-roadmap.md`](./00-roadmap.md) for where this sits in the phased plan.
