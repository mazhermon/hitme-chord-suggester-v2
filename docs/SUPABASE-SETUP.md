# Supabase + Resend + Vercel — production setup

What the maintainer does to actually wire cloud auth + storage live. The
**code is all on the branch** — this doc lists the manual one-time setup
in dashboards / DNS that no automation can do for us.

Approximate total time: 30–45 minutes (a chunk of which is DNS propagation).
Cost: free at our scale (Supabase free tier + Resend free tier + Vercel
Hobby).

---

## 0. Pre-flight

You'll need a domain to send email from (we recommend `hitme.mazhermon.com`
or whatever you deploy at). DNS edit access is required for the Resend step.

---

## 1. Create a Supabase project

1. Go to **https://supabase.com/dashboard** and create a new project.
2. Pick a region close to your users (London, Frankfurt, or Virginia
   typically).
3. Save the **database password** somewhere safe — we won't use it directly
   but Supabase makes you set one.
4. Once provisioned (~2 min), you'll be at the project home.

## 2. Run the SQL migration

1. Open **SQL Editor** in the left nav.
2. Click **+ New query**.
3. Paste the contents of [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql)
   and run it. Should report `Success. No rows returned.`
4. Verify in **Table Editor** → you should see a `songs` table and an empty
   `keepalive` view.

What the migration creates:
- `public.songs` — per-user song rows, composite PK (`user_id`, `id`).
- Row-level security policy `owner_rw`: a user can only read/write their
  own rows. Anonymous users get a uid too, so anonymous sign-in + save works.
- `public.delete_account()` — security-definer function the client SDK
  calls when the user taps Delete account. Cascades to songs via FK.
- `public.keepalive` view — what the Vercel Cron pings.

## 3. Configure Auth providers in Supabase

In the dashboard:

1. **Authentication → Providers → Email**: should already be enabled.
   - Enable **Confirm email** (recommended for password sign-ups).
   - Optionally raise the **OTP expiry** from 1h to 24h for a more forgiving
     magic-link window.
2. **Authentication → Providers → Anonymous Sign-Ins**: enable it. Required
   for our anonymous-first flow.
3. **Authentication → URL Configuration**:
   - **Site URL**: your prod URL (e.g. `https://hitme.mazhermon.com`).
   - **Redirect URLs**: add the auth-callback path for every environment:
     - `https://hitme.mazhermon.com/auth/callback`
     - `https://*-yourusername.vercel.app/auth/callback` (for previews)
     - `http://localhost:3000/auth/callback` (for local dev)

## 4. Sign up at Resend + verify the domain

1. Create an account at **https://resend.com**. Free tier = 3K emails/month,
   100/day — more than enough for us.
2. **Domains** → **Add Domain** → enter `hitme.mazhermon.com` (or whatever
   your sending domain is).
3. Resend shows 3 DNS records you need to add at your DNS host
   (Cloudflare/Namecheap/wherever).
   - `MX` for inbound bounces
   - `TXT` SPF
   - `TXT/CNAME` DKIM
4. Once added, click **Verify**. Propagation can take a few minutes; usually
   it goes through within 10.
5. **API Keys** → **Create API Key** → name it `chordhelper-supabase-smtp`,
   permission `Full access`. Copy the value (`re_...`) — you won't see it
   again.

## 5. Wire Resend as Supabase's SMTP provider

Back in Supabase:

1. **Project Settings → Auth → SMTP Settings** → **Enable Custom SMTP**.
2. Fill in:
   - **Host**: `smtp.resend.com`
   - **Port**: `465`
   - **User**: `resend`
   - **Pass**: the Resend API key from step 4
   - **Sender email**: `hello@hitme.mazhermon.com` (or any address on your
     verified domain)
   - **Sender name**: `Hit me`
3. Save. Send a test email from the dialog at the top of the page to
   confirm.

(If we ever want to swap Resend for SendGrid/Postmark/etc, we change THIS
panel only — no code changes anywhere in the app. That's the "light
facade" we agreed on.)

## 6. Wire Supabase + Vercel together

1. In Supabase: **Project Settings → API**. Copy:
   - **Project URL** (looks like `https://abcdefghijk.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)
2. In **Vercel → your project → Settings → Environment Variables**, add to
   **All** environments (Production, Preview, Development):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from above |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key from above |
   | `CRON_SECRET` | A random string (`openssl rand -hex 32`) — only used for manual cron tests |

3. Redeploy (Vercel will auto-redeploy on the next push).

## 7. Verify everything's wired

1. Open the prod URL in an incognito window.
2. Banner should now say **"Songs save on this device. Keep your songs
   across devices →"** (instead of the local-only Beta copy).
3. Click the link → SignInDialog opens.
4. Enter your real email → "Send link". You should get the magic-link
   email in your inbox within ~30s (check spam/Promotions if not).
5. Click the link → returns to the app, you should now see your email
   in the top-right header chip.
6. Make a chord progression, hit Save → it should land in Supabase
   (verify in **Table Editor → songs**, you should see your row with
   the right `user_id`).
7. Sign out → progressions list reverts to localStorage view.
8. Sign back in → cloud progressions reappear.

## 8. Verify the keep-alive

1. In **Vercel → Project → Cron Jobs**, you should see one entry: `GET
   /api/keepalive` on schedule `0 6 */3 * *`.
2. Click **Run** to test it. Expected response: `{"ok":true,"pingedAt":...}`.

Without this, Supabase pauses the free-tier project after 7 days of
inactivity, which would break sign-in until the maintainer wakes it up
manually.

## 9. Future: swapping email provider

When the time comes:

- Sign up at the new provider, verify the same domain.
- Get the new SMTP creds.
- Update them in Supabase **Project Settings → Auth → SMTP Settings**.

No code change. No redeploy.

## 10. Future: leaving Supabase

The data is portable Postgres. To move:

1. `pg_dump --no-owner --schema=public <supabase-url>` to a `.sql` file.
2. Spin up Postgres anywhere (Neon, RDS, your own VPS, self-hosted Supabase).
3. `psql <new-url> < dump.sql`.
4. Update `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Re-issue user sessions (everyone signs in once more).

The Port + Adapter architecture means the app code doesn't change.
