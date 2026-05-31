'use client'

import { useEffect, useState } from 'react'
import { FEEDBACK_FORM_URL } from '@/lib/config'
import { isSupabaseConfigured } from '@/lib/auth'
import { useAuth } from '@/state/useAuth'
import styles from './BetaBanner.module.css'

const DISMISS_KEY = 'chordhelper.beta-dismissed'

interface BetaBannerProps {
  /** Feedback form URL; defaults to the configured one. */
  feedbackUrl?: string
  /** Called when the user taps the sign-in CTA (auth-configured deployments). */
  onSignInClick?: () => void
}

export function BetaBanner({
  feedbackUrl = FEEDBACK_FORM_URL,
  onSignInClick,
}: BetaBannerProps) {
  const { status } = useAuth()
  const authConfigured = isSupabaseConfigured()
  const showSignInCta =
    authConfigured &&
    onSignInClick &&
    (status.state === 'anonymous' || status.state === 'signedOut')

  // Hide entirely when authenticated — synced state needs no warning.
  const hidden = authConfigured && status.state === 'authenticated'
  const [dismissed, setDismissed] = useState(false)

  // Restore a prior dismissal. Deferred to a timeout so we never set state
  // synchronously during render/effect (keeps the React Compiler lint happy) and
  // avoid a hydration mismatch — the banner renders, then hides if remembered.
  useEffect(() => {
    const id = setTimeout(() => {
      if (localStorage.getItem(DISMISS_KEY)) setDismissed(true)
    }, 0)
    return () => clearTimeout(id)
  }, [])

  if (dismissed || hidden) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // private mode / storage disabled — fine, it just won't persist.
    }
  }

  return (
    <div className={styles.banner} role="note">
      <p className={styles.text}>
        <span className={styles.badge}>Beta</span>
        {showSignInCta ? (
          <>
            Songs save on this device.{' '}
            <button
              type="button"
              className={styles.link}
              onClick={onSignInClick}
            >
              Keep your songs across devices →
            </button>
          </>
        ) : (
          <>
            Your songs save on this device only for now.{' '}
            {feedbackUrl ? (
              <a
                className={styles.link}
                href={feedbackUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Want cloud save across devices? Tell us →
              </a>
            ) : (
              <span className={styles.muted}>
                Want cloud save across devices? Let us know.
              </span>
            )}
          </>
        )}
      </p>
      <button
        type="button"
        className={styles.close}
        aria-label="Dismiss beta notice"
        onClick={dismiss}
      >
        ×
      </button>
    </div>
  )
}
