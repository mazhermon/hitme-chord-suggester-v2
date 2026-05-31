'use client'

/**
 * Magic-link / password-reset callback. Supabase's redirect lands the user
 * here; we exchange the code for a session, then bounce to the editor.
 *
 * If anything goes wrong we surface a calm "please try again" message
 * rather than an exception page — the user can re-request from the
 * sign-in dialog.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuth } from '@/lib/auth'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        await getAuth().completeMagicLink(window.location.href)
        if (!cancelled) router.replace('/')
      } catch (err) {
        if (cancelled) return
        const message =
          err instanceof Error ? err.message : 'Something went wrong.'
        setError(message)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        padding: '1rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        {error ? (
          <>
            <h1 style={{ fontSize: '1.4rem', margin: '0 0 0.6rem' }}>
              That link didn&apos;t work
            </h1>
            <p style={{ opacity: 0.8 }}>{error}</p>
            <p style={{ marginTop: '1rem' }}>
              <Link href="/">Head home and try again</Link>
            </p>
          </>
        ) : (
          <p style={{ opacity: 0.8 }}>Signing you in…</p>
        )}
      </div>
    </main>
  )
}
