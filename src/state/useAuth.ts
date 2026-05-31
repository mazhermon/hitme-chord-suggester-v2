/**
 * useAuth — React hook over the AuthProvider Port. Components import this,
 * never the adapter directly. The selector decides which adapter is live.
 *
 * Returns the current auth status (loading / signedOut / anonymous /
 * authenticated) plus bound methods to drive transitions.
 */

'use client'

import { useEffect, useState } from 'react'
import { getAuth } from '@/lib/auth'
import type { AuthProvider, AuthStatus } from '@/lib/auth'

export interface UseAuthValue {
  status: AuthStatus
  signInAnonymously: AuthProvider['signInAnonymously']
  sendMagicLink: AuthProvider['sendMagicLink']
  completeMagicLink: AuthProvider['completeMagicLink']
  signUpWithPassword: AuthProvider['signUpWithPassword']
  signInWithPassword: AuthProvider['signInWithPassword']
  sendPasswordReset: AuthProvider['sendPasswordReset']
  signOut: AuthProvider['signOut']
  deleteAccount: AuthProvider['deleteAccount']
}

export function useAuth(): UseAuthValue {
  const auth = getAuth()
  const [status, setStatus] = useState<AuthStatus>(() => auth.status())

  useEffect(() => {
    return auth.onChange(setStatus)
  }, [auth])

  return {
    status,
    signInAnonymously: auth.signInAnonymously.bind(auth),
    sendMagicLink: auth.sendMagicLink.bind(auth),
    completeMagicLink: auth.completeMagicLink.bind(auth),
    signUpWithPassword: auth.signUpWithPassword.bind(auth),
    signInWithPassword: auth.signInWithPassword.bind(auth),
    sendPasswordReset: auth.sendPasswordReset.bind(auth),
    signOut: auth.signOut.bind(auth),
    deleteAccount: auth.deleteAccount.bind(auth),
  }
}
