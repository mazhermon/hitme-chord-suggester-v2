/**
 * Supabase SongRepository. Queries are scoped to the current user via RLS
 * (see supabase/migrations/0001_init.sql) — we never build a `where user_id`
 * clause client-side. The server enforces it.
 *
 * Lazy-loaded by storage/index.ts so the SDK only loads when env is set.
 */

import { createClient } from '@supabase/supabase-js'
import type { Song, StorageProvider } from './types'

interface DbRow {
  id: string
  user_id: string
  name: string
  key: Song['key']
  chords: Song['chords']
  extensions: Song['extensions'] | null
  chord_extensions: Song['chordExtensions'] | null
  locked: Song['locked'] | null
  envelope: Song['envelope'] | null
  bpm: number | null
  octave: number | null
  style: Song['style'] | null
  created_at: string
}

function rowToSong(row: DbRow): Song {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    chords: row.chords,
    createdAt: Date.parse(row.created_at) || Date.now(),
    extensions: row.extensions ?? undefined,
    chordExtensions: row.chord_extensions ?? undefined,
    locked: row.locked ?? undefined,
    envelope: row.envelope ?? undefined,
    bpm: row.bpm ?? undefined,
    octave: row.octave ?? undefined,
    style: row.style ?? undefined,
  }
}

function songToRow(song: Song, userId: string): Omit<DbRow, 'created_at'> {
  return {
    id: song.id,
    user_id: userId,
    name: song.name,
    key: song.key,
    chords: song.chords,
    extensions: song.extensions ?? null,
    chord_extensions: song.chordExtensions ?? null,
    locked: song.locked ?? null,
    envelope: song.envelope ?? null,
    bpm: song.bpm ?? null,
    octave: song.octave ?? null,
    style: song.style ?? null,
  }
}

export function createSupabaseSongRepository(): StorageProvider {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. createSupabaseSongRepository requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    )
  }
  // Reuses the singleton from the auth adapter when both are active; here
  // we just create one — supabase-js is fine with multiple instances against
  // the same URL.
  const supabase = createClient(url, anonKey)

  async function getUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      throw new Error('Not signed in — cannot access cloud songs')
    }
    return data.user.id
  }

  return {
    async list() {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as DbRow[]).map(rowToSong)
    },

    async get(id) {
      const { data, error } = await supabase
        .from('songs')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      return data ? rowToSong(data as DbRow) : null
    },

    async save(song) {
      const userId = await getUserId()
      const row = songToRow(song, userId)
      const { error } = await supabase.from('songs').upsert(row)
      if (error) throw error
      return song
    },

    async remove(id) {
      const { error } = await supabase.from('songs').delete().eq('id', id)
      if (error) throw error
    },

    async importMany(songs) {
      if (songs.length === 0) return
      const userId = await getUserId()
      const rows = songs.map((s) => songToRow(s, userId))
      const { error } = await supabase
        .from('songs')
        .upsert(rows, { onConflict: 'user_id,id' })
      if (error) throw error
    },
  }
}
