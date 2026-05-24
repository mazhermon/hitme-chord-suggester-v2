import type { Chord, KeyContext } from '../theory/types'
import type { ExtensionFlags } from '../theory/extensions'

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
}

/** Minimal key/value backend (a subset of the Web Storage API). */
export interface KeyValueBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Persistence interface shared by the localStorage and Firestore providers. */
export interface StorageProvider {
  list(): Promise<Song[]>
  get(id: string): Promise<Song | null>
  save(song: Song): Promise<Song>
  remove(id: string): Promise<void>
}
