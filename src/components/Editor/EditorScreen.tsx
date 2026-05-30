'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Chord } from '@/lib/theory/types'
import { useEditor } from '@/state/EditorProvider'
import {
  displayChords,
  isResultsMode,
  allExtensions,
  effectiveExtensions,
} from '@/state/editor'
import {
  playChord,
  playProgression,
  setMuted,
  type PlaybackHandle,
} from '@/lib/audio/audio-engine'
import { DEFAULT_BASE_OCTAVE } from '@/lib/audio/voicing'
import { getStorage } from '@/lib/storage'
import { progressionToMidi, downloadMidi } from '@/lib/midi/export'
// progressionBasename is split out of record.ts so importing it doesn't drag
// in MediaRecorder + canvas code. The real exporter is lazy-loaded below.
import { progressionBasename } from '@/lib/video/naming'
import { lessonForSource, type Lesson } from '@/lib/theory/lessons'
import { BetaBanner } from '@/components/BetaBanner/BetaBanner'
import { ChordDisplay } from '@/components/ChordDisplay/ChordDisplay'

// VideoModal is only rendered after a successful export. Lazy-load it so the
// initial bundle doesn't ship the modal + its video preview code for users
// who never tap Video.
const VideoModal = dynamic(
  () => import('@/components/VideoModal/VideoModal').then((m) => m.VideoModal),
  { ssr: false },
)
import { ChordDock } from '@/components/ChordDock/ChordDock'
import { KeyDrawer } from '@/components/KeyDrawer/KeyDrawer'
import { LessonPanel } from '@/components/LessonPanel/LessonPanel'
import { SaveDialog } from '@/components/SaveDialog/SaveDialog'
import styles from './EditorScreen.module.css'

export function EditorScreen() {
  const { state, dispatch } = useEditor()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [videoBusy, setVideoBusy] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  // Track the in-flight progression so the Stop button can cut it. Refs (not
  // state) because the handle isn't part of render — we just need to reach
  // for it from event handlers.
  const playbackHandle = useRef<PlaybackHandle | null>(null)
  const playbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const root = useRef<HTMLDivElement>(null)

  const chords = displayChords(state)
  const results = isResultsMode(state)
  const empty = chords.length === 0

  useEffect(() => setMuted(state.muted), [state.muted])

  // "Open in editor" from a saved song stashes its id in sessionStorage.
  useEffect(() => {
    const pending = sessionStorage.getItem('chordhelper.load')
    if (!pending) return
    sessionStorage.removeItem('chordhelper.load')
    getStorage()
      .get(pending)
      .then((song) => {
        if (song) dispatch({ type: 'loadSong', song })
      })
  }, [dispatch])

  useGSAP(
    () => {
      if (empty) {
        gsap.from(`.${styles.intro}`, {
          opacity: 0,
          y: 40,
          scale: 0.85,
          duration: 0.4,
          ease: 'power2.out',
        })
      }
    },
    { scope: root, dependencies: [empty] },
  )

  const extensions = allExtensions(state)
  const baseOctave = DEFAULT_BASE_OCTAVE + state.octave

  function handlePlayChord(chord: Chord, index: number) {
    // Spell the chord out one note at a time, at this chord's extensions.
    playChord(chord, {
      extensions: effectiveExtensions(state, index),
      envelope: state.envelope,
      baseOctave,
      arpeggio: true,
    })
  }

  function handlePlayAll(toPlay: Chord[]) {
    // If something's already playing, treat a second Play as restart.
    stopPlayback()
    const handle = playProgression(toPlay, {
      bpm: state.bpm,
      extensions,
      envelope: state.envelope,
      baseOctave,
    })
    playbackHandle.current = handle
    setIsPlaying(true)
    // Auto-flip the button back to Play after the progression finishes
    // naturally. +200 ms covers the envelope release tail.
    playbackTimeout.current = setTimeout(
      () => {
        playbackHandle.current = null
        playbackTimeout.current = null
        setIsPlaying(false)
      },
      handle.duration * 1000 + 200,
    )
  }

  function stopPlayback() {
    playbackHandle.current?.stop()
    playbackHandle.current = null
    if (playbackTimeout.current) {
      clearTimeout(playbackTimeout.current)
      playbackTimeout.current = null
    }
    setIsPlaying(false)
  }

  // Make sure we don't leave a dangling timeout when the editor unmounts.
  useEffect(() => {
    return () => {
      playbackHandle.current?.stop()
      if (playbackTimeout.current) clearTimeout(playbackTimeout.current)
    }
  }, [])

  function handleExportMidi() {
    // No tempo written — notes are in musical beats, so they land correctly at
    // the user's project tempo without overriding it.
    const bytes = progressionToMidi(chords, { extensions, baseOctave })
    downloadMidi(bytes, 'hitme-progression')
  }

  async function handleExportVideo() {
    if (videoBusy) return
    setVideoBusy(true)
    try {
      // Lazy-load the MediaRecorder + canvas exporter on first click; users
      // who never use Video don't pay its bundle cost.
      const { exportProgressionVideo } = await import('@/lib/video/record')
      const blob = await exportProgressionVideo(chords, {
        extensions,
        bpm: state.bpm,
        envelope: state.envelope,
        baseOctave,
      })
      setVideoBlob(blob)
    } catch (err) {
      // Rare (unsupported browser / no chords) — tell the user plainly.
      window.alert(err instanceof Error ? err.message : 'Video export failed.')
    } finally {
      setVideoBusy(false)
    }
  }

  function handleCycleVoicing(index: number) {
    const chord = chords[index]
    const nextVoicing = (chord.voicing ?? 0) + 1
    dispatch({ type: 'cycleVoicing', index })
    playChord(
      { ...chord, voicing: nextVoicing },
      {
        extensions: effectiveExtensions(state, index),
        envelope: state.envelope,
        baseOctave,
      },
    )
  }

  async function handleSave(name: string) {
    // id === name in our model, so "save to existing" and "save as new"
    // both reduce to a save({id: name, ...}) call here — the overwrite
    // flag from the dialog becomes meaningful only when we move to
    // separate uuid ids (see NEXT-STEPS.md).
    const song = {
      id: name,
      name,
      key: state.key,
      chords,
      extensions: state.extensions,
      chordExtensions: extensions,
      locked: state.slots.map((s) => s.locked),
      // Audio shaping travels with the song so playback sounds the same
      // wherever it's reopened (editor or detail page) — see ADR-007.
      envelope: state.envelope,
      bpm: state.bpm,
      octave: state.octave,
      style: state.style,
      createdAt: Date.now(),
    }
    await getStorage().save(song)
    setSaveOpen(false)
    router.push(`/songs/${encodeURIComponent(name)}`)
  }

  return (
    <div className={styles.layout}>
      <KeyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div
        ref={root}
        className={`${styles.screen} ${results ? styles.results : styles.input}`}
      >
        <BetaBanner />

        <header className={styles.header}>
          <h1 className="sr-only">Hit me — chord progression editor</h1>
          <button
            className={styles.menu}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <span />
            <span />
            <span />
          </button>
        </header>

        <main className={styles.canvas}>
          {empty ? (
            <div className={styles.intro}>
              <p className={styles.introTitle} aria-hidden="true">
                Hit me
              </p>
              <p className={styles.introSub}>songwriting tool</p>
              <p className={styles.hint}>
                Enter some chord numbers to get started
              </p>
            </div>
          ) : (
            <ChordDisplay
              chords={chords}
              extensions={extensions}
              resultsMode={results}
              showGuitar={state.showGuitar}
              showPiano={state.showPiano}
              locked={state.slots.map((s) => s.locked)}
              substituted={state.slots.map((s) => s.sub !== null)}
              onSwap={(i) => dispatch({ type: 'swapChord', index: i })}
              onPlay={handlePlayChord}
              onCycleVoicing={handleCycleVoicing}
              onToggleLock={(i) => dispatch({ type: 'toggleLock', index: i })}
              onRevert={(i) => dispatch({ type: 'revertChord', index: i })}
              onToggleExtension={(i, ext) =>
                dispatch({ type: 'toggleChordExtension', index: i, ext })
              }
              onShowLesson={(source) => setLesson(lessonForSource(source))}
              removable
              onRemove={(i) => dispatch({ type: 'removeChordAt', index: i })}
            />
          )}
        </main>

        <ChordDock
          onPlay={handlePlayAll}
          onStop={stopPlayback}
          isPlaying={isPlaying}
          onSave={() => setSaveOpen(true)}
          onExportMidi={handleExportMidi}
          onExportVideo={handleExportVideo}
          videoBusy={videoBusy}
        />
      </div>

      <LessonPanel lesson={lesson} onClose={() => setLesson(null)} />

      <VideoModal
        blob={videoBlob}
        basename={progressionBasename(state.name)}
        onClose={() => setVideoBlob(null)}
      />

      <SaveDialog
        open={saveOpen}
        existingName={state.name ?? undefined}
        defaultName={state.name ?? ''}
        onCancel={() => setSaveOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
