/**
 * Auth selector. The ONLY place env vars are checked. App code imports
 * `getAuth()` and works with the AuthProvider Port — never with adapter
 * internals.
 */

import { createLocalAuthAdapter } from './local'
import type { AuthProvider } from './types'

export { AuthError } from './types'
export type {
  AuthErrorCode,
  AuthProvider,
  AuthStatus,
  User,
} from './types'

/**
 * True when the public Supabase env vars are present. Until then the app
 * runs with the local-only adapter (anonymous, device-bound).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}

/**
 * Wrap the Supabase auth adapter in a lazy proxy so the SDK is only fetched
 * when a method is actually called. Mirrors the storage lazy-load pattern.
 */
function createLazySupabaseAuthAdapter(): AuthProvider {
  let implPromise: Promise<AuthProvider> | null = null
  const impl = () =>
    (implPromise ??= import('./supabase').then((m) =>
      m.createSupabaseAuthAdapter(),
    ))

  // For the synchronous `status()` we have to return *something* before the
  // SDK loads. We start with `loading` and then re-emit when the adapter
  // resolves and reports its real status.
  let current: import('./types').AuthStatus = { state: 'loading' }
  const listeners = new Set<(s: import('./types').AuthStatus) => void>()

  // Kick off the load on the first onChange or method call so we settle fast.
  let booted = false
  function boot(): void {
    if (booted) return
    booted = true
    impl().then((adapter) => {
      adapter.onChange((s) => {
        current = s
        for (const l of listeners) l(s)
      })
    })
  }

  return {
    status: () => current,

    onChange(listener) {
      listeners.add(listener)
      listener(current)
      boot()
      return () => listeners.delete(listener)
    },

    async signInAnonymously() {
      return (await impl()).signInAnonymously()
    },
    async sendMagicLink(email, redirectTo) {
      return (await impl()).sendMagicLink(email, redirectTo)
    },
    async completeMagicLink(currentUrl) {
      return (await impl()).completeMagicLink(currentUrl)
    },
    async signUpWithPassword(email, password) {
      return (await impl()).signUpWithPassword(email, password)
    },
    async signInWithPassword(email, password) {
      return (await impl()).signInWithPassword(email, password)
    },
    async sendPasswordReset(email, redirectTo) {
      return (await impl()).sendPasswordReset(email, redirectTo)
    },
    async signOut() {
      return (await impl()).signOut()
    },
    async deleteAccount() {
      return (await impl()).deleteAccount()
    },
  }
}

let cached: AuthProvider | null = null

/** The active auth provider: Supabase when configured, else local-only. */
export function getAuth(): AuthProvider {
  if (!cached) {
    cached = isSupabaseConfigured()
      ? createLazySupabaseAuthAdapter()
      : createLocalAuthAdapter()
  }
  return cached
}

/** For tests / hot-reload — clears the memoised adapter so the next call
 *  re-reads env vars and picks again. */
export function _resetAuth(): void {
  cached = null
}
