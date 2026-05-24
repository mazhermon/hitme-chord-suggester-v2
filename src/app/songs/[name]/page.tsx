'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getStorage, type Song } from '@/lib/storage'
import { ChordDisplay } from '@/components/ChordDisplay/ChordDisplay'
import { playChord, playProgression } from '@/lib/audio/audio-engine'
import { levelFromFlags } from '@/lib/theory/extensions'
import { Button } from '@/components/Button/Button'
import styles from '../songs.module.css'

export default function SongPage() {
  const params = useParams<{ name: string }>()
  const router = useRouter()
  const name = decodeURIComponent(params.name)
  const [song, setSong] = useState<Song | null | undefined>(undefined)

  useEffect(() => {
    getStorage().get(name).then(setSong)
  }, [name])

  function openInEditor() {
    if (!song) return
    sessionStorage.setItem('chordhelper.load', song.id)
    router.push('/')
  }

  return (
    <main className={styles.page}>
      <Link href="/songs" className={styles.back}>
        ← Song list
      </Link>

      {song === undefined && <p className={styles.muted}>Loading…</p>}
      {song === null && (
        <p className={styles.muted}>That song could not be found.</p>
      )}

      {song && (
        <>
          <h1 className={styles.title}>{song.name}</h1>
          <div className={styles.songCanvas}>
            <ChordDisplay
              chords={song.chords}
              level={
                song.extensions ? levelFromFlags(song.extensions) : 'seventh'
              }
              resultsMode
              showGuitar
              showPiano
              onPlay={(chord) =>
                playChord(chord, {
                  level: song.extensions
                    ? levelFromFlags(song.extensions)
                    : 'seventh',
                  arpeggio: true,
                })
              }
            />
          </div>
          <div className={styles.songActions}>
            <Button
              onClick={() =>
                playProgression(song.chords, {
                  level: song.extensions
                    ? levelFromFlags(song.extensions)
                    : 'seventh',
                })
              }
            >
              Play
            </Button>
            <Button variant="primary" onClick={openInEditor}>
              Open in editor
            </Button>
          </div>
        </>
      )}
    </main>
  )
}
