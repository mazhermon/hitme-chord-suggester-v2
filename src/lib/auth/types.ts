/**
 * The auth Port — interface app code talks to, regardless of which adapter
 * is wired underneath (Supabase, local-only, or anything future). See
 * docs/AUTH-RESEARCH.md and docs/superpowers/plans/2026-05-31-auth-and-email.md
 * for the architectural reasoning.
 *
 * Pure type-and-interface file. Adapter files (local.ts, supabase.ts) provide
 * the concrete implementations; the selector (index.ts) picks one at runtime
 * based on env vars.
 */

/** Whoever is signed in (or anonymous, or neither). */
export interface User {
  /** Stable across sessions for this account; opaque to the app. */
  id: string
  /** True for users who haven't upgraded with a magic link or password yet. */
  isAnonymous: boolean
  /** Present only when upgraded (magic-link or password). */
  email?: string
  /** Account creation time as a unix ms timestamp. */
  createdAt: number
}

/**
 * Discriminated union of auth states the app can be in. `loading` covers the
 * brief window during SSR/hydration when the SDK hasn't reported yet —
 * components render a quiet placeholder rather than flashing signed-out then
 * signed-in.
 */
export type AuthStatus =
  | { state: 'loading' }
  | { state: 'signedOut' }
  | { state: 'anonymous'; user: User }
  | { state: 'authenticated'; user: User }

/**
 * Normalised error codes the UI can branch on. Adapters wrap their native
 * errors into one of these so SignInDialog doesn't need provider knowledge.
 */
export type AuthErrorCode =
  | 'rate-limited'
  | 'email-in-use'
  | 'invalid-credentials'
  | 'expired-link'
  | 'weak-password'
  | 'not-supported'
  | 'unknown'

export class AuthError extends Error {
  readonly code: AuthErrorCode
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code)
    this.code = code
    this.name = 'AuthError'
  }
}

/**
 * The auth Port. App code only ever depends on this interface.
 * Adapters (LocalAuthAdapter, SupabaseAuthAdapter) implement all methods.
 * Components import `useAuth()` (a hook over this Port), never the adapter
 * directly.
 */
export interface AuthProvider {
  /** Current status. Synchronous so React renders never block on it. */
  status(): AuthStatus

  /** Subscribe to status changes; returns an unsubscribe function. */
  onChange(listener: (status: AuthStatus) => void): () => void

  /**
   * Become an anonymous user. Idempotent — calling again while already
   * anonymous returns the existing user without churning the session.
   * Used silently on first Save so cloud sync has somewhere to write.
   */
  signInAnonymously(): Promise<User>

  /**
   * Email a magic link. The user's next click on it triggers the
   * /auth/callback route which calls `completeMagicLink()`.
   *
   * If currently anonymous, the link upgrade-links the account rather
   * than creating a new one (preserves all the anonymous user's songs).
   *
   * @param redirectTo Absolute URL to come back to after the click —
   *   typically the app's /auth/callback route.
   */
  sendMagicLink(email: string, redirectTo: string): Promise<void>

  /**
   * Complete the magic-link callback. Reads provider-specific URL fragments /
   * query params and exchanges them for a session.
   *
   * @param currentUrl The full URL of the callback page (window.location.href).
   * @returns The signed-in user (always permanent — never anonymous).
   */
  completeMagicLink(currentUrl: string): Promise<User>

  /**
   * Sign up with email + password. Most providers (including Supabase) send
   * a confirmation email; the user is in `anonymous` (or whatever they were)
   * until they click it.
   */
  signUpWithPassword(email: string, password: string): Promise<User>

  /** Sign in with an existing email + password. */
  signInWithPassword(email: string, password: string): Promise<User>

  /** Send a password-reset link. The user opens it to choose a new password. */
  sendPasswordReset(email: string, redirectTo: string): Promise<void>

  /**
   * Sign out. Clears the session cookie and reverts to `signedOut`.
   * Does NOT delete the account or local songs.
   */
  signOut(): Promise<void>

  /**
   * Permanently delete the authenticated account (GDPR-style erasure).
   * Throws if not authenticated. Cloud-side song rows cascade via FK / RLS.
   * Local songs on the device are NOT touched — they're the user's.
   */
  deleteAccount(): Promise<void>
}
