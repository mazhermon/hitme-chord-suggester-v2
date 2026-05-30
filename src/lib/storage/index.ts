import { createLocalProvider } from './local'
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

/**
 * Wrap the Firestore provider in a lazy proxy so the (chunky) Firebase SDK
 * is only fetched + parsed when a method is actually called. With no Firebase
 * config, this proxy is never constructed; with config, the SDK loads on the
 * first list/get/save/remove. Saves ~270 kB from the initial bundle for the
 * common (localStorage-only) case.
 */
function createLazyFirestoreProvider(): StorageProvider {
  let implPromise: Promise<StorageProvider> | null = null
  const impl = () =>
    (implPromise ??= import('./firestore').then((m) =>
      m.createFirestoreProvider(),
    ))
  return {
    async list() {
      return (await impl()).list()
    },
    async get(id) {
      return (await impl()).get(id)
    },
    async save(song) {
      return (await impl()).save(song)
    },
    async remove(id) {
      return (await impl()).remove(id)
    },
  }
}

let cached: StorageProvider | null = null

/** The active storage provider: Firestore when configured, else localStorage. */
export function getStorage(): StorageProvider {
  if (!cached) {
    cached = isFirebaseConfigured()
      ? createLazyFirestoreProvider()
      : createLocalProvider()
  }
  return cached
}
