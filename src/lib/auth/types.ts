/**
 * The auth Port — interface that app code talks to, regardless of which
 * adapter is wired underneath (Supabase / Firebase / Local-only).
 *
 * See docs/AUTH-RESEARCH.md for the architectural reasoning. The TL;DR:
 * this file is the *contract*; adapter files (one per provider) are the
 * concrete implementations; the selector (index.ts) picks which one is
 * active based on env vars at runtime.
 *
 * Type-only file. No runtime code, no SDK imports — those land in the
 * adapter files when we actually implement.
 */

/** Whoever is signed in (or anonymous, or neither). */
export interface User {
  /** Stable across sessions for this account; opaque to the app. */
  id: string
  /** True for users who haven't upgraded with a magic link yet. */
  isAnonymous: boolean
  /** Present only when upgraded. */
  email?: string
  /** Account creation time as a unix ms timestamp. */
  createdAt: number
}

/**
 * Discriminated union of auth states the app can be in. `loading` covers
 * the brief window during SSR/hydration when the SDK hasn't reported yet —
 * components should render a quiet placeholder rather than flashing
 * "signed out" then "signed in".
 */
export type AuthStatus =
  | { state: 'loading' }
  | { state: 'signedOut' }
  | { state: 'anonymous'; user: User }
  | { state: 'authenticated'; user: User }

/**
 * The auth Port. App code only ever depends on this interface.
 *
 * Each adapter (LocalAuthAdapter, SupabaseAuthAdapter, FirebaseAuthAdapter)
 * implements all methods. Components import `useAuth()` (a hook over this
 * Port), never the adapter directly.
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
   * `/auth/callback` route which calls `completeMagicLink()`.
   *
   * If currently anonymous, the link upgrade-links the account rather
   * than creating a new one (preserves all the anonymous user's songs).
   *
   * @param redirectTo Absolute URL to come back to after the click —
   *   typically the app's /auth/callback route.
   */
  sendMagicLink(email: string, redirectTo: string): Promise<void>

  /**
   * Complete the magic-link callback. Reads provider-specific URL
   * fragments / query params and exchanges them for a session.
   *
   * @param currentUrl The full URL of the callback page (window.location.href).
   * @returns The signed-in user (always permanent — never anonymous).
   */
  completeMagicLink(currentUrl: string): Promise<User>

  /**
   * Sign out. Clears the session cookie and reverts to `signedOut`.
   * Does NOT delete the account or local songs.
   */
  signOut(): Promise<void>

  /**
   * Permanently delete the authenticated account (GDPR-style erasure).
   * Throws if not authenticated. The provider is responsible for
   * cascading-deleting the user's songs from the cloud (RLS + FK
   * for Supabase; an admin-side cleanup for Firebase).
   *
   * Local songs on the device are NOT touched — they're the user's.
   */
  deleteAccount(): Promise<void>
}

/**
 * A no-op auth provider used when nothing is configured. Always returns
 * anonymous; never sends emails; ignores upgrade attempts gracefully.
 * Lets the editor work end-to-end before any provider is picked.
 */
export interface LocalAuthOptions {
  /** Persistence key for the anonymous user record. */
  storageKey?: string
}
