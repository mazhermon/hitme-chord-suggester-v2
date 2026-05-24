'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getStorage, type Song } from '@/lib/storage'
import styles from './songs.module.css'

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[] | null>(null)

  useEffect(() => {
    getStorage().list().then(setSongs)
  }, [])

  async function remove(id: string) {
    await getStorage().remove(id)
    setSongs((prev) => prev?.filter((s) => s.id !== id) ?? null)
  }

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Back
      </Link>
      <h1 className={styles.title}>Song list</h1>

      {songs === null && <p className={styles.muted}>Loading…</p>}

      {songs !== null && songs.length === 0 && (
        <p className={styles.muted}>
          No songs yet. <Link href="/">Head home to make one.</Link>
        </p>
      )}

      {songs !== null && songs.length > 0 && (
        <ul className={styles.list}>
          {songs.map((song) => (
            <li key={song.id} className={styles.row}>
              <Link href={`/songs/${encodeURIComponent(song.id)}`}>
                <span className={styles.name}>{song.name}</span>
                <span className={styles.meta}>
                  {song.key.tonic}
                  {song.key.mode === 'major' ? 'maj' : 'min'} ·{' '}
                  {song.chords.length} chords
                </span>
              </Link>
              <button
                className={styles.delete}
                onClick={() => remove(song.id)}
                aria-label={`Delete ${song.name}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
