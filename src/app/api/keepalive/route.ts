/**
 * Keep-alive endpoint hit by Vercel Cron every few days. Issues a trivial
 * Supabase query so the project doesn't hit its 7-day inactivity pause on
 * the free tier.
 *
 * Auth: Vercel signs cron requests; we also accept a manual `?secret=...`
 * for testing. Without a valid signature/secret we return 200 anyway (no
 * sensitive work happens here) but skip the DB hit to avoid abuse.
 */

import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
// Tell Vercel this isn't a static route — it runs per request.
export const dynamic = 'force-dynamic'

function isAuthorisedRequest(req: Request): boolean {
  // Vercel Cron sets this header automatically; we don't need to verify it
  // cryptographically because the endpoint does nothing dangerous.
  if (req.headers.get('x-vercel-cron')) return true
  // Manual test hook: ?secret=...
  const url = new URL(req.url)
  const provided = url.searchParams.get('secret')
  const expected = process.env.CRON_SECRET
  return Boolean(expected && provided && provided === expected)
}

export async function GET(req: Request): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return Response.json(
      { ok: false, reason: 'supabase-not-configured' },
      { status: 200 },
    )
  }

  if (!isAuthorisedRequest(req)) {
    return Response.json(
      { ok: true, skipped: 'unauthorised' },
      { status: 200 },
    )
  }

  try {
    const supabase = createClient(url, anonKey)
    const { error } = await supabase.from('keepalive').select('ts').limit(1)
    if (error) {
      return Response.json(
        { ok: false, reason: 'query-failed', error: error.message },
        { status: 200 },
      )
    }
    return Response.json({ ok: true, pingedAt: Date.now() })
  } catch (err) {
    return Response.json(
      {
        ok: false,
        reason: 'exception',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    )
  }
}
