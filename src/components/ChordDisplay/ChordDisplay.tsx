'use client'

import { useEffect, useRef, useState } from 'react'
import type { Chord } from '@/lib/theory/types'
import { romanForDegree } from '@/lib/theory/nashville'
import {
  chordSuffix,
  renderSymbol,
  isExtendable,
  flagsFromLevel,
  type ExtensionFlags,
  type Extension,
} from '@/lib/theory/extensions'
import { VOICING_NAMES, chordToMidi } from '@/lib/audio/voicing'
import { ARPEGGIO_STEP } from '@/lib/audio/audio-engine'
import { findGuitarShape } from '@/lib/guitar/voicing'
import { ChordDiagram } from '@/components/ChordDiagram/ChordDiagram'
import { PianoChord } from '@/components/PianoChord/PianoChord'
import styles from './ChordDisplay.module.css'

const DEFAULT_EXT = flagsFromLevel('seventh')
const EXTENSION_CHIPS: { ext: Extension; label: string }[] = [
  { ext: 'seventh', label: '7' },
  { ext: 'ninth', label: '9' },
  { ext: 'eleventh', label: '11' },
]

interface ChordDisplayProps {
  chords: Chord[]
  /** Extension flags per chord (aligned to `chords`); defaults to a 7th if absent. */
  extensions?: ExtensionFlags[]
  resultsMode?: boolean
  /** Show a guitar chord diagram under each chord. */
  showGuitar?: boolean
  /** Show a piano keyboard diagram under each chord. */
  showPiano?: boolean
  /** Per-index flags for editor controls. */
  locked?: boolean[]
  substituted?: boolean[]
  onSwap?: (index: number) => void
  onPlay?: (chord: Chord, index: number) => void
  onCycleVoicing?: (index: number) => void
  onToggleLock?: (index: number) => void
  onRevert?: (index: number) => void
  /** Toggle a 7/9/11 extension on a single chord. */
  onToggleExtension?: (index: number, ext: Extension) => void
  /** Open a lesson explaining a chord's `source` provenance. */
  onShowLesson?: (source: string) => void
  removable?: boolean
  onRemove?: (index: number) => void
}

export function ChordDisplay({
  chords,
  extensions,
  resultsMode = false,
  showGuitar = false,
  showPiano = false,
  locked,
  substituted,
  onSwap,
  onPlay,
  onCycleVoicing,
  onToggleLock,
  onRevert,
  onToggleExtension,
  onShowLesson,
  removable = false,
  onRemove,
}: ChordDisplayProps) {
  const extAt = (i: number): ExtensionFlags => extensions?.[i] ?? DEFAULT_EXT
  // Which chord is playing + the notes sounding so far, to light the piano in time.
  const [sounding, setSounding] = useState<{
    index: number
    notes: number[]
  } | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const current = timers.current
    return () => current.forEach(clearTimeout)
  }, [])

  function play(chord: Chord, index: number) {
    onPlay?.(chord, index)
    timers.current.forEach(clearTimeout)
    timers.current = []
    const midi = [
      ...chordToMidi(chord, {
        extensions: extAt(index),
        voicing: chord.voicing,
      }),
    ].sort((a, b) => a - b)
    setSounding({ index, notes: [] })
    midi.forEach((n, i) => {
      timers.current.push(
        setTimeout(
          () =>
            setSounding((prev) =>
              prev && prev.index === index
                ? { index, notes: [...prev.notes, n] }
                : prev,
            ),
          i * ARPEGGIO_STEP * 1000,
        ),
      )
    })
    timers.current.push(
      setTimeout(
        () => setSounding(null),
        midi.length * ARPEGGIO_STEP * 1000 + 450,
      ),
    )
  }

  const compact = chords.length > 4
  const cls = [
    styles.list,
    compact && styles.compact,
    resultsMode && styles.results,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ul className={cls}>
      {chords.map((chord, i) => {
        const ext = extAt(i)
        const symbol = renderSymbol(chord.root, chord.quality, ext)
        const suffix = chordSuffix(chord.quality, ext)
        const isLocked = locked?.[i] ?? false
        const isSub = substituted?.[i] ?? false
        const voicingName =
          VOICING_NAMES[(chord.voicing ?? 0) % VOICING_NAMES.length]
        const itemCls = [styles.item, isLocked && styles.locked]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={`${chord.symbol}-${i}`} className={itemCls}>
            <div className={styles.chord}>
              <span className={styles.numeral}>
                {romanForDegree(chord.degree)}
              </span>
              <span className={styles.symbol}>
                <span className={styles.root}>{chord.root}</span>
                <span className={styles.quality}>{suffix}</span>
              </span>
              {onShowLesson ? (
                <button
                  type="button"
                  className={styles.source}
                  aria-label={`About ${chord.source}`}
                  title="What is this?"
                  onClick={() => onShowLesson(chord.source)}
                >
                  {chord.source}
                </button>
              ) : (
                <span className={styles.sourceText}>{chord.source}</span>
              )}
            </div>

            <div className={styles.controls}>
              {onPlay && (
                <button
                  type="button"
                  className={styles.ctrl}
                  aria-label={`Play ${symbol}`}
                  title="Play"
                  onClick={() => play(chord, i)}
                >
                  ▶
                </button>
              )}
              {onSwap && (
                <button
                  type="button"
                  className={styles.ctrl}
                  aria-label={`Swap ${symbol}`}
                  title="Swap this chord"
                  onClick={() => onSwap(i)}
                >
                  ⇄
                </button>
              )}
              {onCycleVoicing && (
                <button
                  type="button"
                  className={styles.ctrl}
                  aria-label={`Change voicing of ${symbol} (now ${voicingName})`}
                  title={`Voicing: ${voicingName}`}
                  onClick={() => onCycleVoicing(i)}
                >
                  ≋
                  {(chord.voicing ?? 0) > 0 && (
                    <span className={styles.voicingName}>{voicingName}</span>
                  )}
                </button>
              )}
              {onToggleLock && (
                <button
                  type="button"
                  className={styles.ctrl}
                  aria-pressed={isLocked}
                  aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${symbol}`}
                  title={isLocked ? 'Locked' : 'Lock'}
                  onClick={() => onToggleLock(i)}
                >
                  {isLocked ? '🔒' : '🔓'}
                </button>
              )}
              {isSub && onRevert && (
                <button
                  type="button"
                  className={styles.ctrl}
                  aria-label={`Revert ${symbol}`}
                  title="Revert to diatonic"
                  onClick={() => onRevert(i)}
                >
                  ↺
                </button>
              )}
            </div>

            {onToggleExtension && isExtendable(chord.quality) && (
              <div
                className={styles.exts}
                role="group"
                aria-label={`Extensions for ${symbol}`}
              >
                {EXTENSION_CHIPS.map(({ ext: e, label }) => (
                  <button
                    key={e}
                    type="button"
                    className={`${styles.extChip} ${ext[e] ? styles.extOn : ''}`}
                    aria-pressed={ext[e]}
                    aria-label={`${ext[e] ? 'Remove' : 'Add'} ${label}th on ${symbol}`}
                    onClick={() => onToggleExtension(i, e)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {showGuitar && (
              <ChordDiagram {...findGuitarShape(chord)} name={symbol} />
            )}

            {showPiano && (
              <PianoChord
                notes={chordToMidi(chord, {
                  extensions: ext,
                  voicing: chord.voicing,
                })}
                active={sounding?.index === i ? sounding.notes : undefined}
                name={symbol}
              />
            )}

            {removable && (
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${symbol}`}
                onClick={() => onRemove?.(i)}
              >
                ×
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
