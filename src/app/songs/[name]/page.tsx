'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getStorage, type Song } from '@/lib/storage'
import { ChordDisplay } from '@/components/ChordDisplay/ChordDisplay'
import {
  playChord,
  playProgression,
  type PlaybackHandle,
} from '@/lib/audio/audio-engine'
import { progressionToMidi, downloadMidi } from '@/lib/midi/export'
// progressionBasename is split out of record.ts so the page can import it
// without pulling in MediaRecorder + canvas code. The real exporter is
// lazy-loaded inside handleExportVideo.
import { progressionBasename } from '@/lib/video/naming'
import { flagsFromLevel, type ExtensionFlags } from '@/lib/theory/extensions'
import { Button } from '@/components/Button/Button'
import styles from '../songs.module.css'

// VideoModal only renders after a successful export — lazy-load it.
const VideoModal = dynamic(
  () => import('@/components/VideoModal/VideoModal').then((m) => m.VideoModal),
  { ssr: false },
)

/** Per-chord extension flags for a saved song (with sensible fallbacks). */
function songExtensions(song: Song): ExtensionFlags[] {
  if (song.chordExtensions) return song.chordExtensions
  const fallback = song.extensions ?? flagsFromLevel('seventh')
  return song.chords.map(() => fallback)
}

export default function SongPage() {
  const params = useParams<{ name: string }>()
  const router = useRouter()
  const name = decodeURIComponent(params.name)
  const [song, setSong] = useState<Song | null | undefined>(undefined)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoBusy, setVideoBusy] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const playbackHandle = useRef<PlaybackHandle | null>(null)
  const playbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function stopPlayback() {
    playbackHandle.current?.stop()
    playbackHandle.current = null
    if (playbackTimeout.current) {
      clearTimeout(playbackTimeout.current)
      playbackTimeout.current = null
    }
    setIsPlaying(false)
  }
  function playAll() {
    if (!song) return
    stopPlayback()
    const handle = playProgression(song.chords, {
      extensions: songExtensions(song),
    })
    playbackHandle.current = handle
    setIsPlaying(true)
    playbackTimeout.current = setTimeout(
      () => {
        playbackHandle.current = null
        playbackTimeout.current = null
        setIsPlaying(false)
      },
      handle.duration * 1000 + 200,
    )
  }
  useEffect(() => {
    return () => {
      playbackHandle.current?.stop()
      if (playbackTimeout.current) clearTimeout(playbackTimeout.current)
    }
  }, [])

  useEffect(() => {
    getStorage().get(name).then(setSong)
  }, [name])

  function openInEditor() {
    if (!song) return
    sessionStorage.setItem('chordhelper.load', song.id)
    router.push('/')
  }

  function handleExportMidi() {
    if (!song) return
    const bytes = progressionToMidi(song.chords, {
      extensions: songExtensions(song),
    })
    downloadMidi(bytes, progressionBasename(song.name))
  }

  async function handleExportVideo() {
    if (!song || videoBusy) return
    setVideoBusy(true)
    try {
      const { exportProgressionVideo } = await import('@/lib/video/record')
      const blob = await exportProgressionVideo(song.chords, {
        extensions: songExtensions(song),
      })
      setVideoBlob(blob)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Video export failed.')
    } finally {
      setVideoBusy(false)
    }
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
              extensions={songExtensions(song)}
              resultsMode
              showGuitar
              showPiano
              onPlay={(chord, index) =>
                playChord(chord, {
                  extensions: songExtensions(song)[index],
                  arpeggio: true,
                })
              }
            />
          </div>
          <div className={styles.songActions}>
            <Button
              onClick={() => (isPlaying ? stopPlayback() : playAll())}
              aria-label={isPlaying ? 'Stop playback' : 'Play progression'}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </Button>
            <Button variant="ghost" onClick={handleExportMidi}>
              MIDI
            </Button>
            <Button variant="ghost" onClick={handleExportVideo} disabled={videoBusy}>
              {videoBusy ? 'Recording…' : 'Video'}
            </Button>
            <Button variant="primary" onClick={openInEditor}>
              Open in editor
            </Button>
          </div>
        </>
      )}

      <VideoModal
        blob={videoBlob}
        basename={progressionBasename(song?.name)}
        onClose={() => setVideoBlob(null)}
      />
    </main>
  )
}
