'use client'

import { useEffect, useRef, useState } from 'react'
import { AuthError, type AuthErrorCode } from '@/lib/auth'
import { useAuth } from '@/state/useAuth'
import { Button } from '@/components/Button/Button'
import styles from './SignInDialog.module.css'

interface SignInDialogProps {
  open: boolean
  onClose: () => void
}

type Tab = 'link' | 'password'
type Mode = 'sign-in' | 'sign-up' | 'forgot'
type Status =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent'; email: string; kind: 'link' | 'reset' }
  | { state: 'error'; message: string; code: AuthErrorCode }

function describeError(code: AuthErrorCode, fallback: string): string {
  switch (code) {
    case 'rate-limited':
      return "We're sending too many emails. Try again in a minute."
    case 'email-in-use':
      return "That email's already got an account here. Try signing in."
    case 'invalid-credentials':
      return "That email and password don't match. Try again."
    case 'expired-link':
      return "That link's expired. Send yourself a fresh one."
    case 'weak-password':
      return 'Pick a password that is at least 8 characters.'
    case 'not-supported':
      return 'Cloud sign-in is not configured. The app still works locally.'
    default:
      return fallback
  }
}

export function SignInDialog({ open, onClose }: SignInDialogProps) {
  const auth = useAuth()
  const [tab, setTab] = useState<Tab>('link')
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Reset transient state when reopened.
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      setTab('link')
      setMode('sign-in')
      setStatus({ state: 'idle' })
      firstInputRef.current?.focus()
    }, 0)
    return () => clearTimeout(id)
  }, [open])

  // Escape to close + Tab focus trap (same pattern as SaveDialog).
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'input, button, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : '/auth/callback'

  function asError(err: unknown): { code: AuthErrorCode; message: string } {
    if (err instanceof AuthError) {
      return { code: err.code, message: err.message }
    }
    return {
      code: 'unknown',
      message: err instanceof Error ? err.message : 'Something went wrong.',
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus({ state: 'sending' })
    try {
      await auth.sendMagicLink(email.trim(), callbackUrl)
      setStatus({ state: 'sent', email: email.trim(), kind: 'link' })
    } catch (err) {
      const { code, message } = asError(err)
      setStatus({ state: 'error', code, message: describeError(code, message) })
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setStatus({ state: 'sending' })
    try {
      if (mode === 'sign-up') {
        await auth.signUpWithPassword(email.trim(), password)
        setStatus({ state: 'sent', email: email.trim(), kind: 'link' })
      } else {
        await auth.signInWithPassword(email.trim(), password)
        onClose()
      }
    } catch (err) {
      const { code, message } = asError(err)
      setStatus({ state: 'error', code, message: describeError(code, message) })
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus({ state: 'sending' })
    try {
      await auth.sendPasswordReset(email.trim(), callbackUrl)
      setStatus({ state: 'sent', email: email.trim(), kind: 'reset' })
    } catch (err) {
      const { code, message } = asError(err)
      setStatus({ state: 'error', code, message: describeError(code, message) })
    }
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="signin-dialog-title" className={styles.title}>
          Keep your songs across devices
        </h2>
        <p className={styles.subtitle}>
          Sign in and we&apos;ll sync your saved songs so you can pick them up
          on any device.
        </p>

        {status.state === 'sent' ? (
          <div className={styles.success}>
            <p className={styles.successHead}>Check your email</p>
            <p>
              We sent {status.kind === 'reset' ? 'a password reset' : 'a sign-in'}{' '}
              link to <strong>{status.email}</strong>.
            </p>
            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={styles.tabs}
              role="tablist"
              aria-label="Sign-in method"
            >
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'link'}
                className={tab === 'link' ? styles.tabOn : styles.tab}
                onClick={() => {
                  setTab('link')
                  setMode('sign-in')
                  setStatus({ state: 'idle' })
                }}
              >
                Magic link
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'password'}
                className={tab === 'password' ? styles.tabOn : styles.tab}
                onClick={() => {
                  setTab('password')
                  setMode('sign-in')
                  setStatus({ state: 'idle' })
                }}
              >
                Password
              </button>
            </div>

            {tab === 'link' && (
              <form onSubmit={handleMagicLink} className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Email</span>
                  <input
                    ref={firstInputRef}
                    type="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                {status.state === 'error' && (
                  <p className={styles.error}>{status.message}</p>
                )}
                <div className={styles.actions}>
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={status.state === 'sending' || !email.trim()}
                  >
                    {status.state === 'sending' ? 'Sending…' : 'Send link'}
                  </Button>
                </div>
                <p className={styles.fineprint}>
                  No password to remember. We&apos;ll email you a one-tap
                  sign-in link.
                </p>
              </form>
            )}

            {tab === 'password' && mode !== 'forgot' && (
              <form onSubmit={handlePasswordSubmit} className={styles.form}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Email</span>
                  <input
                    ref={firstInputRef}
                    type="email"
                    className={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Password</span>
                  <input
                    type="password"
                    className={styles.input}
                    placeholder={
                      mode === 'sign-up' ? 'At least 8 characters' : 'Password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === 'sign-up' ? 8 : undefined}
                    autoComplete={
                      mode === 'sign-up' ? 'new-password' : 'current-password'
                    }
                  />
                </label>
                {status.state === 'error' && (
                  <p className={styles.error}>{status.message}</p>
                )}
                <div className={styles.actions}>
                  <Button type="button" variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      status.state === 'sending' ||
                      !email.trim() ||
                      !password
                    }
                  >
                    {status.state === 'sending'
                      ? mode === 'sign-up'
                        ? 'Creating…'
                        : 'Signing in…'
                      : mode === 'sign-up'
                        ? 'Create account'
                        : 'Sign in'}
                  </Button>
                </div>
                <div className={styles.switchRow}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => {
                      setMode(mode === 'sign-up' ? 'sign-in' : 'sign-up')
                      setStatus({ state: 'idle' })
                    }}
                  >
                    {mode === 'sign-up'
                      ? 'Have an account? Sign in'
                      : "Don't have an account? Sign up"}
                  </button>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => {
                      setMode('forgot')
                      setStatus({ state: 'idle' })
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {tab === 'password' && mode === 'forgot' && (
              <form onSubmit={handleForgot} className={styles.form}>
                <p className={styles.subtitle}>
                  We&apos;ll email a reset link to your inbox.
                </p>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Email</span>
                  <input
                    ref={firstInputRef}
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
                {status.state === 'error' && (
                  <p className={styles.error}>{status.message}</p>
                )}
                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setMode('sign-in')
                      setStatus({ state: 'idle' })
                    }}
                  >
                    ← Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={status.state === 'sending' || !email.trim()}
                  >
                    {status.state === 'sending' ? 'Sending…' : 'Send reset link'}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
