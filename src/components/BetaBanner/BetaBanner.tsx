'use client'

import { useEffect, useState } from 'react'
import { FEEDBACK_FORM_URL } from '@/lib/config'
import styles from './BetaBanner.module.css'

const DISMISS_KEY = 'chordhelper.beta-dismissed'

interface BetaBannerProps {
  /** Feedback form URL; defaults to the configured one. */
  feedbackUrl?: string
}

export function BetaBanner({ feedbackUrl = FEEDBACK_FORM_URL }: BetaBannerProps) {
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

  if (dismissed) return null

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
