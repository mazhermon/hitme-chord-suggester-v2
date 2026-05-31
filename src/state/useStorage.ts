/**
 * useStorage — React hook returning the active SongRepository, switched
 * automatically based on auth state.
 *
 *  - Anonymous / signedOut / loading → local provider (localStorage).
 *  - Authenticated → IndexedDB-cached Supabase provider, scoped to user.id.
 *
 * Also runs the one-time localStorage → cloud migration on the first
 * anonymous → authenticated transition for each user-id (see
 * src/lib/storage/migration.ts for the contract).
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getCloudStorage,
  isSupabaseConfigured,
  migrateLocalToCloud,
  type StorageProvider,
} from '@/lib/storage'
import { createLocalProvider } from '@/lib/storage/local'
import { useAuth } from './useAuth'

export function useStorage(): StorageProvider {
  const { status } = useAuth()

  // Stable local provider for the anonymous / signed-out path. Built once
  // via lazy useState initialiser (avoids touching refs during render, per
  // the React Compiler lint rules).
  const [local] = useState(() => createLocalProvider())

  // The active provider — memoised by status so consumers don't see a new
  // reference on every render (would break their useEffect dep arrays).
  const active: StorageProvider = useMemo(() => {
    if (status.state === 'authenticated' && isSupabaseConfigured()) {
      return getCloudStorage(status.user.id)
    }
    return local
  }, [local, status])

  // Kick off migration whenever the user becomes authenticated. The dedupe
  // lives inside `migrateLocalToCloud` itself (it sets a per-user flag in
  // localStorage), so re-firing on remounts is harmless and we don't need
  // any React state to track "already migrated".
  useEffect(() => {
    if (status.state !== 'authenticated' || !isSupabaseConfigured()) return
    const uid = status.user.id
    const cloud = getCloudStorage(uid)
    void migrateLocalToCloud({ local, cloud, userId: uid }).catch((err) => {
      console.warn(
        'Song migration to cloud failed (will retry next sign-in):',
        err,
      )
    })
  }, [status, local])

  return active
}
