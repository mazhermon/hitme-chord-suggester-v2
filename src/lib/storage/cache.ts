/**
 * IndexedDB read-through / write-through cache wrapping any SongRepository.
 *
 * Why this exists: we want users to read their cloud songs offline. Plain
 * Supabase queries fail with no network. localStorage works but is small
 * and synchronous; IndexedDB is the modern answer.
 *
 * Behaviour:
 *  - list/get: try IndexedDB first; on miss, fall back to the wrapped repo
 *    and populate. On error from the wrapped repo, return cached data
 *    (offline-tolerant).
 *  - save/remove: optimistic update to IndexedDB *then* push to network.
 *    Pending writes queue + retry on the next list() call so eventual
 *    consistency is preserved through network blips.
 *
 * Namespace per user-id so signing out doesn't leak A's songs to B.
 */

import { get, set, del, keys, createStore, type UseStore } from 'idb-keyval'
import type { Song, StorageProvider } from './types'

const PENDING_KEY = '__pending__'
type PendingWrite =
  | { kind: 'save'; song: Song }
  | { kind: 'remove'; id: string }

function isPlainSong(value: unknown): value is Song {
  return typeof value === 'object' && value !== null && 'id' in value && 'chords' in value
}

export interface CachedSongRepositoryOptions {
  /** A stable user identifier — songs are partitioned per-user. */
  userId: string
}

/**
 * Wrap a remote SongRepository with an IndexedDB cache. The cache lives in
 * its own per-user database so cross-user contamination is impossible.
 */
export function createCachedSongRepository(
  remote: StorageProvider,
  { userId }: CachedSongRepositoryOptions,
): StorageProvider {
  // One IndexedDB store per user: db name "chordhelper-<uid>", store "songs".
  // idb-keyval handles creation lazily on first use.
  const dbName = `chordhelper-${userId}`
  const storeName = 'songs'
  let store: UseStore | null = null
  function getStore(): UseStore {
    if (!store) store = createStore(dbName, storeName)
    return store
  }

  async function readAllCached(): Promise<Song[]> {
    const allKeys = (await keys(getStore())).filter(
      (k): k is string => typeof k === 'string' && k !== PENDING_KEY,
    )
    const songs = await Promise.all(allKeys.map((k) => get<Song>(k, getStore())))
    return songs.filter(isPlainSong)
  }

  async function getPending(): Promise<PendingWrite[]> {
    const raw = await get<PendingWrite[]>(PENDING_KEY, getStore())
    return Array.isArray(raw) ? raw : []
  }

  async function setPending(p: PendingWrite[]): Promise<void> {
    await set(PENDING_KEY, p, getStore())
  }

  async function enqueuePending(write: PendingWrite): Promise<void> {
    const queue = await getPending()
    queue.push(write)
    await setPending(queue)
  }

  /** Try to flush the pending queue. Silent on errors — we'll retry later. */
  async function flushPending(): Promise<void> {
    const queue = await getPending()
    if (queue.length === 0) return
    const remaining: PendingWrite[] = []
    for (const write of queue) {
      try {
        if (write.kind === 'save') await remote.save(write.song)
        else await remote.remove(write.id)
      } catch {
        remaining.push(write)
      }
    }
    await setPending(remaining)
  }

  return {
    async list() {
      // Opportunistic: try to flush any pending writes before reading the
      // network, so a re-list after a save returns the canonical answer.
      await flushPending().catch(() => {})
      try {
        const fresh = await remote.list()
        // Replace the cache with what the server says (drop deletions).
        // Keep the pending queue intact.
        const pending = await getPending()
        const allKeys = (await keys(getStore())).filter(
          (k): k is string => typeof k === 'string' && k !== PENDING_KEY,
        )
        await Promise.all(allKeys.map((k) => del(k, getStore())))
        await Promise.all(fresh.map((s) => set(s.id, s, getStore())))
        await setPending(pending)
        return fresh
      } catch {
        // Offline / network error — serve the cache.
        return readAllCached()
      }
    },

    async get(id) {
      const cached = await get<Song>(id, getStore())
      if (cached && isPlainSong(cached)) return cached
      try {
        const fresh = await remote.get(id)
        if (fresh) await set(id, fresh, getStore())
        return fresh
      } catch {
        return null
      }
    },

    async save(song) {
      // Optimistic local write.
      await set(song.id, song, getStore())
      try {
        await remote.save(song)
      } catch {
        await enqueuePending({ kind: 'save', song })
      }
      return song
    },

    async remove(id) {
      await del(id, getStore())
      try {
        await remote.remove(id)
      } catch {
        await enqueuePending({ kind: 'remove', id })
      }
    },

    async importMany(songs) {
      // Local first so the UI sees them straight away.
      await Promise.all(songs.map((s) => set(s.id, s, getStore())))
      if (remote.importMany) {
        try {
          await remote.importMany(songs)
        } catch {
          for (const s of songs) await enqueuePending({ kind: 'save', song: s })
        }
      } else {
        // Fallback: one save() per song.
        for (const song of songs) {
          try {
            await remote.save(song)
          } catch {
            await enqueuePending({ kind: 'save', song })
          }
        }
      }
    },
  }
}
