/**
 * Local-only auth adapter. Used as a fallback when Supabase env vars are
 * absent — the app still works end-to-end with anonymous storage. All
 * account-related methods throw `AuthError('not-supported')` so the UI
 * can give a sensible message.
 */

import {
  AuthError,
  type AuthProvider,
  type AuthStatus,
  type User,
} from './types'

const STORAGE_KEY = 'chordhelper.localUser'

interface PersistedUser {
  id: string
  createdAt: number
}

function readPersisted(): PersistedUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedUser
    if (typeof parsed.id !== 'string' || typeof parsed.createdAt !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writePersisted(u: PersistedUser): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
  } catch {
    /* private mode / storage disabled — fine */
  }
}

function clearPersisted(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function makeUser(): User {
  // crypto.randomUUID is available everywhere we run.
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const createdAt = Date.now()
  writePersisted({ id, createdAt })
  return { id, createdAt, isAnonymous: true }
}

/**
 * Build a local-only AuthProvider. Anonymous from the first call; idempotent
 * across page reloads (persisted in localStorage).
 */
export function createLocalAuthAdapter(): AuthProvider {
  const listeners = new Set<(status: AuthStatus) => void>()

  function currentStatus(): AuthStatus {
    const stored = readPersisted()
    if (!stored) return { state: 'signedOut' }
    return {
      state: 'anonymous',
      user: { id: stored.id, createdAt: stored.createdAt, isAnonymous: true },
    }
  }

  function emit(): void {
    const status = currentStatus()
    for (const listener of listeners) listener(status)
  }

  return {
    status: currentStatus,

    onChange(listener) {
      listeners.add(listener)
      // Fire immediately with the current state so subscribers don't miss it.
      listener(currentStatus())
      return () => {
        listeners.delete(listener)
      }
    },

    async signInAnonymously() {
      const existing = readPersisted()
      if (existing) {
        return { id: existing.id, createdAt: existing.createdAt, isAnonymous: true }
      }
      const user = makeUser()
      emit()
      return user
    },

    async sendMagicLink() {
      throw new AuthError(
        'not-supported',
        'Configure Supabase to enable magic-link sign-in.',
      )
    },

    async completeMagicLink() {
      throw new AuthError('not-supported')
    },

    async signUpWithPassword() {
      throw new AuthError(
        'not-supported',
        'Configure Supabase to enable account sign-up.',
      )
    },

    async signInWithPassword() {
      throw new AuthError(
        'not-supported',
        'Configure Supabase to enable password sign-in.',
      )
    },

    async sendPasswordReset() {
      throw new AuthError('not-supported')
    },

    async signOut() {
      clearPersisted()
      emit()
    },

    async deleteAccount() {
      throw new AuthError(
        'not-supported',
        'No cloud account to delete on local-only mode.',
      )
    },
  }
}
