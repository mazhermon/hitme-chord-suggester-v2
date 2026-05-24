'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import type { Chord } from '@/lib/theory/types'
import { useEditor } from '@/state/EditorProvider'
import { displayChords, isResultsMode, extensionLevel } from '@/state/editor'
import { playChord, playProgression, setMuted } from '@/lib/audio/audio-engine'
import { getStorage } from '@/lib/storage'
import { ChordDisplay } from '@/components/ChordDisplay/ChordDisplay'
import { ChordDock } from '@/components/ChordDock/ChordDock'
import { KeyDrawer } from '@/components/KeyDrawer/KeyDrawer'
import { SaveDialog } from '@/components/SaveDialog/SaveDialog'
import styles from './EditorScreen.module.css'

export function EditorScreen() {
  const { state, dispatch } = useEditor()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
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

  const level = extensionLevel(state)

  function handlePlayChord(chord: Chord) {
    playChord(chord, { level, envelope: state.envelope })
  }

  function handlePlayAll(toPlay: Chord[]) {
    playProgression(toPlay, {
      bpm: state.bpm,
      level,
      envelope: state.envelope,
    })
  }

  function handleCycleVoicing(index: number) {
    const chord = chords[index]
    const nextVoicing = (chord.voicing ?? 0) + 1
    dispatch({ type: 'cycleVoicing', index })
    playChord(
      { ...chord, voicing: nextVoicing },
      { level, envelope: state.envelope },
    )
  }

  async function handleSave(name: string) {
    const song = {
      id: name,
      name,
      key: state.key,
      chords,
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
        <header className={styles.header}>
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
              <h1 className={styles.introTitle}>Hit me</h1>
              <p className={styles.introSub}>songwriting tool</p>
              <p className={styles.hint}>
                Enter some chord numbers to get started
              </p>
            </div>
          ) : (
            <ChordDisplay
              chords={chords}
              level={level}
              resultsMode={results}
              showGuitar={state.showGuitar}
              locked={state.slots.map((s) => s.locked)}
              substituted={state.slots.map((s) => s.sub !== null)}
              onSwap={(i) => dispatch({ type: 'swapChord', index: i })}
              onPlay={handlePlayChord}
              onCycleVoicing={handleCycleVoicing}
              onToggleLock={(i) => dispatch({ type: 'toggleLock', index: i })}
              onRevert={(i) => dispatch({ type: 'revertChord', index: i })}
              removable
              onRemove={(i) => dispatch({ type: 'removeChordAt', index: i })}
            />
          )}
        </main>

        <ChordDock onPlay={handlePlayAll} onSave={() => setSaveOpen(true)} />
      </div>

      <SaveDialog
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
