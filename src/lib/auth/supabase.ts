/**
 * Supabase auth adapter.
 *
 * Lazy-loaded by the selector (see ./index.ts) — only resolved when the
 * NEXT_PUBLIC_SUPABASE_* env vars are present, so the SDK chunk stays out
 * of the initial bundle for users on local-only mode.
 *
 * Maps the AuthProvider Port to @supabase/supabase-js. Errors are
 * normalised into AuthError codes so the UI doesn't need provider knowledge.
 */

import {
  createClient,
  type AuthError as SbAuthError,
  type Session,
  type SupabaseClient,
  type User as SbUser,
} from '@supabase/supabase-js'
import {
  AuthError,
  type AuthProvider,
  type AuthStatus,
  type User,
} from './types'

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new AuthError(
      'unknown',
      `Missing ${name} — Supabase auth cannot start. See docs/SUPABASE-SETUP.md.`,
    )
  }
  return value
}

function toUser(sbUser: SbUser): User {
  return {
    id: sbUser.id,
    isAnonymous: Boolean(sbUser.is_anonymous),
    email: sbUser.email ?? undefined,
    createdAt: Date.parse(sbUser.created_at) || Date.now(),
  }
}

function toStatus(session: Session | null): AuthStatus {
  if (!session?.user) return { state: 'signedOut' }
  const user = toUser(session.user)
  return user.isAnonymous
    ? { state: 'anonymous', user }
    : { state: 'authenticated', user }
}

/**
 * Translate a Supabase error to our normalised AuthError. We pattern-match
 * on the message because Supabase doesn't expose stable codes for all
 * scenarios. Be conservative — anything we can't map confidently goes to
 * 'unknown' so callers can still surface the raw message.
 */
function normaliseError(err: SbAuthError | Error | unknown): AuthError {
  if (err instanceof AuthError) return err
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Unknown auth error'
  const lower = message.toLowerCase()
  if (lower.includes('rate') || lower.includes('too many')) {
    return new AuthError('rate-limited', message)
  }
  if (lower.includes('already') && lower.includes('registered')) {
    return new AuthError('email-in-use', message)
  }
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return new AuthError('invalid-credentials', message)
  }
  if (lower.includes('expired') || lower.includes('invalid otp')) {
    return new AuthError('expired-link', message)
  }
  if (lower.includes('password') && lower.includes('short')) {
    return new AuthError('weak-password', message)
  }
  return new AuthError('unknown', message)
}

export function createSupabaseAuthAdapter(): AuthProvider {
  const url = requireEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
  const anonKey = requireEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const supabase: SupabaseClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  // Mirror Supabase's auth state into our discriminated union.
  let current: AuthStatus = { state: 'loading' }
  const listeners = new Set<(s: AuthStatus) => void>()

  // Bootstrap: read the existing session (if any) once.
  supabase.auth
    .getSession()
    .then(({ data }) => {
      current = toStatus(data.session)
      for (const l of listeners) l(current)
    })
    .catch(() => {
      current = { state: 'signedOut' }
      for (const l of listeners) l(current)
    })

  // Subscribe to all subsequent events.
  supabase.auth.onAuthStateChange((_event, session) => {
    current = toStatus(session)
    for (const l of listeners) l(current)
  })

  async function userOrThrow(): Promise<User> {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw normaliseError(error)
    if (!data.user) throw new AuthError('unknown', 'No active session')
    return toUser(data.user)
  }

  return {
    status: () => current,

    onChange(listener) {
      listeners.add(listener)
      listener(current)
      return () => {
        listeners.delete(listener)
      }
    },

    async signInAnonymously() {
      // Idempotent: if we're already anonymous, just return that user.
      if (current.state === 'anonymous') return current.user
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) throw normaliseError(error)
      if (!data.user) throw new AuthError('unknown', 'No user returned')
      return toUser(data.user)
    },

    async sendMagicLink(email, redirectTo) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) throw normaliseError(error)
    },

    async completeMagicLink(currentUrl) {
      // Supabase v2 puts the code/access_token in either query or hash.
      // exchangeCodeForSession handles the PKCE flow; for legacy hash-based
      // links we fall back to detectSessionInUrl (enabled above) — calling
      // getSession() after page load picks it up.
      const url = new URL(currentUrl)
      const code = url.searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) throw normaliseError(error)
      }
      return userOrThrow()
    },

    async signUpWithPassword(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw normaliseError(error)
      if (!data.user) throw new AuthError('unknown', 'No user returned')
      return toUser(data.user)
    },

    async signInWithPassword(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw normaliseError(error)
      if (!data.user) throw new AuthError('unknown', 'No user returned')
      return toUser(data.user)
    },

    async sendPasswordReset(email, redirectTo) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (error) throw normaliseError(error)
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw normaliseError(error)
    },

    async deleteAccount() {
      // Calls a Postgres function defined in the migration (see Phase D
      // SQL) that deletes the row from auth.users — cascades to public.songs
      // through the foreign key. The client SDK can't self-delete.
      const { error } = await supabase.rpc('delete_account')
      if (error) throw normaliseError(error)
      await supabase.auth.signOut()
    },
  }
}
