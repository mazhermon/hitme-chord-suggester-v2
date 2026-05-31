# Make Repo Private — Migration Steps

A walk-through for flipping `hitme-chord-suggester-v2` from public to
private without breaking the Vercel deploy pipeline. Run through this in
order. Estimated time: 15–30 minutes including Vercel reconnection.

---

## Why bother

- **Source visibility.** Public repos are crawlable; AI-training and
  scraping pick up everything. For an indie product about to monetise,
  the design + theory implementation is the moat.
- **Issue safety.** Anonymous people could open issues. Not catastrophic,
  but adds noise.
- **Fork visibility.** Drive-by clones become invisible — fewer copy-cat
  builds.
- **Free-tier eligibility.** GitHub allows unlimited private repos on
  Free plan since 2020 — making private costs us nothing.

---

## Pre-flight checks

Before flipping the visibility:

- [ ] Confirm Vercel has its own access token for the repo (Vercel-side
      "GitHub Integration" — when the repo flips private, the integration
      keeps working **provided** it's installed at the user/org level).
      Visit https://github.com/settings/installations and verify the Vercel
      app is installed on this account. If you authorized Vercel
      per-repo originally, you'll need to re-authorize after going
      private (covered in Step 4).
- [ ] Audit git history for anything sensitive that shouldn't be in
      private either. `git log --all --full-history -- '*.env*'`
      and `git log -p | grep -i "supabase\|resend\|firebase" | head -20`
      → expect zero hits (already audited in `AUDIT-2026-05-31.md`).
- [ ] Decide if you want to delete any branches before the flip. Private
      repos hide everything; public-to-private doesn't delete branches.
- [ ] Note the current Vercel project URL — you'll verify it still
      deploys after the flip.

---

## Step 1 — Flip visibility on GitHub

1. Go to **https://github.com/mazhermon/hitme-chord-suggester-v2/settings**.
2. Scroll to the **Danger Zone** at the bottom.
3. Click **Change visibility** → **Make private**.
4. Type the repo name to confirm.

What changes immediately:

- The repo + all its branches become invisible to non-collaborators.
- All existing forks remain public, but they no longer receive
  upstream commits if originally forked from this repo. (Check
  https://github.com/mazhermon/hitme-chord-suggester-v2/network/members
  before flipping — if any unexpected forks exist, decide whether to
  take action.)
- Stars, watches, and issues all stay but are hidden from non-members.
- The repo's GitHub Pages site (if any) goes private too. We don't use
  Pages — n/a.

---

## Step 2 — Reauthorize the Vercel GitHub App (if needed)

Vercel uses one of two ways to access GitHub:

**Option A (recommended) — the "Vercel" GitHub App.** Installed at your
GitHub account level. It can access private repos automatically once
installed; no per-repo dance after the flip.

**Option B — Personal access token / OAuth.** Older integration; needs
re-granting for private repo access.

Check which we're on:

1. Go to **https://vercel.com/your-team/settings/git**.
2. If the GitHub section says "Connected via GitHub App", we're on Option
   A → **nothing further needed**. Vercel keeps deploying.
3. If it says "Connected via OAuth" or there's a button labelled
   "Configure GitHub App", click it and:
   - Choose **Only select repositories** or **All repositories**.
   - Confirm `hitme-chord-suggester-v2` is in the list.
   - Install/Update.

After this, push any small commit (e.g. a no-op tweak to README) to verify
Vercel still picks it up.

---

## Step 3 — Re-verify the deploy pipeline

A small test push:

```bash
git commit --allow-empty -m "chore: verify Vercel pipeline after going private"
git push origin <your-current-branch>
```

Then in the Vercel dashboard, watch for the deployment to appear within
~30 seconds. If it doesn't:

- Check **Vercel → Project → Settings → Git** that the repo connection
  is still active.
- Check **GitHub → Settings → Applications → Installed GitHub Apps →
  Vercel** that `hitme-chord-suggester-v2` is in the granted list.
- Worst case: disconnect + reconnect the Git provider in Vercel.
  Settings stay; only the link breaks.

---

## Step 4 — Update GitHub Actions (if any are wired)

We don't have any CI workflows checked into `.github/workflows/` today,
so this is a no-op. **If we add CI later**, those workflows automatically
get private secrets handling — `GITHUB_TOKEN` still works, but anything
that referenced public artefact URLs needs a token.

---

## Step 5 — Update collaborators / sharing

While the repo is private:

- Anyone who needs read access: invite them as a collaborator
  (**Settings → Collaborators**). Free plan allows unlimited collaborators
  on private repos.
- For showing the repo to potential interview partners / contractors:
  use temporary collaborator invites; revoke after.
- For sharing snippets publicly: copy snippets to gists or paste them
  into a docs PR on a separate public showcase repo. Don't link to private
  files in marketing/blog posts.

---

## Step 6 — Consider what now lives only here

Now that the repo is private, things that previously had public-by-default
linkage need a plan:

- **GitHub README badges / shields:** anything pointing at the public
  repo (build status, license, etc.) will return 404 to logged-out
  viewers. We don't have any embedded externally — n/a.
- **Issue templates / Code of Conduct:** still useful internally; no
  change needed.
- **Sponsor button / FUNDING.yml:** if we later add a "Sponsor this
  project" link in GitHub, that link is visible only to people with repo
  access. For monetisation that needs public sponsorship discovery,
  use a separate public landing page instead (e.g. on the deployed
  Vercel domain).

---

## Step 7 — Document the new state

- Update `docs/NEXT-STEPS.md` to remove "make repo private" if it's
  there.
- Add a short note to `README.md` about the public-vs-private status if
  we want internal contributors to know.

---

## Things that could go wrong (and how to recover)

| Symptom | Likely cause | Fix |
|---|---|---|
| Vercel stops auto-deploying after the flip | GitHub App not granted for this repo | Step 2 — re-grant |
| Pushes succeed but deploys are queued forever | Vercel webhook lost the listen permission | Disconnect + reconnect Git provider in Vercel settings |
| A friend who had read access can't see the repo | They were a "watcher" but not a collaborator | Settings → Collaborators → invite |
| External CI service we forgot about now 404s | A token-based integration is using OAuth, not the App | Reconfigure that service with a personal access token (PAT) scoped to `repo` |
| Vercel preview URLs (the random `*-yourname.vercel.app`) still work | Expected — those are tied to the build artifact, not the repo's visibility |  |

---

## Rollback (if needed)

Repo visibility is reversible. **GitHub → Settings → Danger Zone →
Change visibility → Make public** flips back. Stars and history return.
The Vercel integration keeps working either way.

---

## When to do this

Recommended: **before** the marketing push. Once we share screenshots /
press / Hacker News posts, anyone curious will try to find the repo. If
it's already private, they can't fork/clone — they have to use the
hosted app. That's the audience we want.
