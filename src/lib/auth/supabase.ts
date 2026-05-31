/**
 * Supabase auth adapter.
 *
 * Lazy-loaded by the selector (see ./index.ts) — only resolved when the
 * NEXT_PUBLIC_SUPABASE_* env vars are present, so the SDK chunk stays out
 * of the initial bundle for users on local-only mode.
 *
 * Until Phase B is wired (Supabase SDK install + real implementation), this
 * file is a placeholder that throws at construction so the build resolves
 * the dynamic import. The selector never calls it without env vars set,
 * and configuring env vars without finishing Phase B would be a deploy
 * error to fix anyway.
 */

import { AuthError, type AuthProvider } from './types'

export function createSupabaseAuthAdapter(): AuthProvider {
  throw new AuthError(
    'not-supported',
    'Supabase auth adapter is not yet implemented. Track docs/superpowers/plans/2026-05-31-auth-and-email.md Phase B.',
  )
}
