import { createLocalProvider } from './local'
import { createFirestoreProvider } from './firestore'
import type { StorageProvider } from './types'

export type { Song, StorageProvider } from './types'

/**
 * True when the public Firebase env vars are present. Until then the app uses
 * localStorage transparently — drop the NEXT_PUBLIC_FIREBASE_* vars in to enable
 * cloud sync (see README).
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  )
}

let cached: StorageProvider | null = null

/** The active storage provider: Firestore when configured, else localStorage. */
export function getStorage(): StorageProvider {
  if (!cached) {
    cached = isFirebaseConfigured()
      ? createFirestoreProvider()
      : createLocalProvider()
  }
  return cached
}
