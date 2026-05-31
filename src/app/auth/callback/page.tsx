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
import styles from './page.module.css'

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
    <main className={styles.page}>
      <div className={styles.card}>
        {error ? (
          <>
            <h1 className={styles.title}>That link didn&apos;t work</h1>
            <p className={styles.muted}>{error}</p>
            <p className={styles.note}>
              <Link href="/">Head home and try again</Link>
            </p>
          </>
        ) : (
          <p className={styles.muted}>Signing you in…</p>
        )}
      </div>
    </main>
  )
}
