# Deploying to Vercel — readiness & checklist

> Status: **app is build-ready.** This is the step-by-step for when you set up Vercel.
> Nothing here requires code changes; it's the deploy runbook.

## Pre-flight (already green)

- `npm run build` (next build) — ✅ compiles, TypeScript passes, static pages generate.
- `npx vitest run` — ✅ full suite green.
- `npx eslint .` — ✅ clean (incl. React Compiler rules).
- **No required env vars** — with none set, the app uses `localStorage` (current MVP mode).
- No secrets in the repo (`.env.local` is gitignored; `.env.example` documents the optional
  Firebase vars).

## 1. Get the code into a Git repo

This folder isn't a git repo yet. Before Vercel can build it:

```bash
git init && git add -A && git commit -m "Initial commit"
# create a repo on GitHub, then:
git remote add origin git@github.com:<you>/chordhelperv2.git
git push -u origin main
```

(Tell me when you want this done and I'll set up the commit/branch — I won't push without
your go-ahead.)

## 2. Import the project on Vercel

1. Vercel dashboard → **Add New… → Project** → import the GitHub repo.
2. Framework preset auto-detects **Next.js** — leave Build & Output settings on defaults
   (`next build`; no `vercel.json` needed).
3. **Environment variables:** none needed. (Optional: add the `NEXT_PUBLIC_FIREBASE_*` vars
   from `.env.example` only if/when you enable cloud storage.)
4. Deploy. You'll get a `*.vercel.app` URL.

## 3. Turn on Web Analytics (so the share-interest tracking works)

We already emit a `share_intent` event when someone taps TikTok/Instagram/Facebook (via
`src/lib/analytics.ts`, which forwards to `window.va`). To capture it:

1. In the Vercel project: **Analytics → enable Web Analytics** (free on Hobby).
2. Add the package + component so custom events flow:
   ```bash
   npm i @vercel/analytics
   ```
   ```tsx
   // src/app/layout.tsx — inside <body>
   import { Analytics } from '@vercel/analytics/next'
   // …
   <Analytics />
   ```
   `<Analytics />` defines `window.va`, so our existing `track()` calls light up
   automatically — **no other code change**. You'll then see page metrics + the
   `share_intent` events (by platform) in the Analytics tab — that's the demand signal for
   building real posting integrations later.

> When you're ready, I can wire `<Analytics />` in for you — say the word.

## 4. Custom domain

- Project → **Domains** → add `hitme.mazhermon.com` and follow the DNS instructions
  (CNAME/A record). HTTPS is automatic.

## 5. Plan / billing

- **Hobby (free) is fine while the app is free and non-commercial** — which is the current
  plan (no donations/ads yet).
- The day you add monetisation (tip jar, paid tier), Vercel requires **Pro ($20/mo)** for
  commercial use. Bundle that with the tip-jar decision — see
  [`03-feedback-and-business-model.md`](./03-feedback-and-business-model.md).

## Deploy-day checklist

- [ ] Code pushed to GitHub
- [ ] Project imported on Vercel (Next.js preset, defaults)
- [ ] Deploy succeeds; `*.vercel.app` loads
- [ ] Web Analytics enabled + `<Analytics />` added (captures `share_intent`)
- [ ] Custom domain `hitme.mazhermon.com` connected
- [ ] (Optional) feedback form URL pasted into `src/lib/config.ts`
- [ ] Smoke test: build a progression → Play, MIDI, Video export + share modal
