/**
 * One-time migration of anonymous localStorage songs into a user's cloud
 * account. Runs when the user transitions anonymous → authenticated for
 * the first time on a device.
 *
 * Strategy:
 *  - Read the local provider's songs.
 *  - Read the cloud's existing songs (avoid clobbering deliberate cloud-side
 *    renames or edits made on another device).
 *  - importMany() only those with ids not already in cloud.
 *  - Set a flag in localStorage so we don't re-migrate on every sign-in.
 */

import type { Song, StorageProvider } from './types'

const MIGRATION_FLAG_PREFIX = 'chordhelper.migrated-to-cloud'

function flagKey(userId: string): string {
  return `${MIGRATION_FLAG_PREFIX}.${userId}`
}

/**
 * @returns the number of songs imported (0 if nothing to do or already done).
 */
export async function migrateLocalToCloud(opts: {
  local: StorageProvider
  cloud: StorageProvider
  userId: string
}): Promise<number> {
  const { local, cloud, userId } = opts

  // Cheap fast-path: have we done this for this user before?
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem(flagKey(userId))) return 0
    } catch {
      /* storage disabled — proceed but no flag */
    }
  }

  const localSongs = await local.list()
  if (localSongs.length === 0) {
    markMigrated(userId)
    return 0
  }

  // Don't overwrite cloud-side edits — only import ids the cloud doesn't have.
  const cloudSongs = await cloud.list()
  const cloudIds = new Set(cloudSongs.map((s) => s.id))
  const toImport: Song[] = localSongs.filter((s) => !cloudIds.has(s.id))

  if (toImport.length > 0) {
    if (cloud.importMany) {
      await cloud.importMany(toImport)
    } else {
      for (const song of toImport) await cloud.save(song)
    }
  }

  markMigrated(userId)
  return toImport.length
}

function markMigrated(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(flagKey(userId), String(Date.now()))
  } catch {
    /* ignore */
  }
}

/** For tests: clear the flag so the next migrate call runs again. */
export function _resetMigrationFlag(userId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(flagKey(userId))
  } catch {
    /* ignore */
  }
}
