import type { KeyValueBackend, Song, StorageProvider } from './types'

const DEFAULT_KEY = 'chordhelper.songs'

/** Resolve a backend, defaulting to window.localStorage when available. */
function resolveBackend(backend?: KeyValueBackend): KeyValueBackend | null {
  if (backend) return backend
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  return null
}

/**
 * A StorageProvider backed by a key/value store (localStorage by default).
 * Songs are kept as a JSON array under a single key.
 */
export function createLocalProvider(
  backend?: KeyValueBackend,
  storageKey = DEFAULT_KEY,
): StorageProvider {
  const store = resolveBackend(backend)

  function readAll(): Song[] {
    if (!store) return []
    const raw = store.getItem(storageKey)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Song[]) : []
    } catch {
      return []
    }
  }

  function writeAll(songs: Song[]): void {
    store?.setItem(storageKey, JSON.stringify(songs))
  }

  return {
    async list() {
      return readAll()
    },
    async get(id) {
      return readAll().find((song) => song.id === id) ?? null
    },
    async save(song) {
      const songs = readAll().filter((s) => s.id !== song.id)
      songs.push(song)
      writeAll(songs)
      return song
    },
    async remove(id) {
      writeAll(readAll().filter((song) => song.id !== id))
    },
  }
}
