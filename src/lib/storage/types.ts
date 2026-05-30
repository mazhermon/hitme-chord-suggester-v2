import type { Chord, KeyContext } from '../theory/types'
import type { ExtensionFlags } from '../theory/extensions'
import type { EnvelopeSettings } from '../audio/envelope'
import type { StyleId } from '../theory/styles'

/** A saved progression. */
export interface Song {
  id: string
  name: string
  key: KeyContext
  chords: Chord[]
  createdAt: number
  /** Global default extension flags at save time. */
  extensions?: ExtensionFlags
  /** Per-chord effective extension flags (aligned to `chords`). */
  chordExtensions?: ExtensionFlags[]
  /** Which chords were locked, by index. */
  locked?: boolean[]
  /** Saved audio shaping — restored when the song is reopened or played. */
  envelope?: EnvelopeSettings
  /** Saved playback tempo (BPM). */
  bpm?: number
  /** Saved playback octave shift (-2 … +2). */
  octave?: number
  /** Saved genre/style preset, so suggest behaviour is preserved on reload. */
  style?: StyleId
}

/** Minimal key/value backend (a subset of the Web Storage API). */
export interface KeyValueBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Persistence Port for songs. Implementations (adapters) live in
 * `local.ts`, `firestore.ts`, and — when we wire it — `supabase.ts`.
 *
 * The Port is user-scoped at the adapter level: cloud adapters know how
 * to query "this user's songs only" (e.g. Firestore `users/{uid}/songs`
 * or Postgres `WHERE user_id = auth.uid()`). The app builds no queries
 * directly. See docs/AUTH-RESEARCH.md §4 for the Port+Adapter design.
 */
export interface SongRepository {
  list(): Promise<Song[]>
  get(id: string): Promise<Song | null>
  save(song: Song): Promise<Song>
  remove(id: string): Promise<void>

  /**
   * OPTIONAL — bulk import. Used once on first sign-in to copy a user's
   * anonymous localStorage songs into their cloud account. Idempotent:
   * re-importing the same id overwrites. Local adapter doesn't need it
   * (would be a self-copy); cloud adapters should implement.
   *
   * Marked optional so existing adapters compile without modification;
   * callers check at runtime.
   */
  importMany?(songs: Song[]): Promise<void>
}

/**
 * Backwards-compatible alias — `StorageProvider` is the original name
 * and is still used throughout the codebase. We keep both names so the
 * abstraction-renaming work doesn't ripple into every consumer.
 */
export type StorageProvider = SongRepository
