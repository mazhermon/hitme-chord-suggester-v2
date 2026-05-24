'use client'

import type { Chord } from '@/lib/theory/types'
import { romanForDegree } from '@/lib/theory/nashville'
import {
  renderQuality,
  renderSymbol,
  type ExtensionLevel,
} from '@/lib/theory/extensions'
import { VOICING_NAMES } from '@/lib/audio/voicing'
import styles from './ChordDisplay.module.css'

interface ChordDisplayProps {
  chords: Chord[]
  /** Extension level used to render symbols + audio (default: 7ths). */
  level?: ExtensionLevel
  resultsMode?: boolean
  /** Per-index flags for editor controls. */
  locked?: boolean[]
  substituted?: boolean[]
  /** Primary cluster action — swap just this chord. */
  onSwap?: (index: number) => void
  onPlay?: (chord: Chord, index: number) => void
  onCycleVoicing?: (index: number) => void
  onToggleLock?: (index: number) => void
  onRevert?: (index: number) => void
  removable?: boolean
  onRemove?: (index: number) => void
}

export function ChordDisplay({
  chords,
  level = 'seventh',
  resultsMode = false,
  locked,
  substituted,
  onSwap,
  onPlay,
  onCycleVoicing,
  onToggleLock,
  onRevert,
  removable = false,
  onRemove,
}: ChordDisplayProps) {
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
        const symbol = renderSymbol(chord.root, chord.quality, level)
        const suffix = renderQuality(chord.quality, level).suffix
        const isLocked = locked?.[i] ?? false
        const isSub = substituted?.[i] ?? false
        const voicingName =
          VOICING_NAMES[(chord.voicing ?? 0) % VOICING_NAMES.length]
        const itemCls = [styles.item, isLocked && styles.locked]
          .filter(Boolean)
          .join(' ')

        return (
          <li key={`${chord.symbol}-${i}`} className={itemCls}>
            <button
              type="button"
              className={styles.chord}
              aria-label={
                onSwap
                  ? `Swap ${symbol} (${chord.source})`
                  : `${symbol}, ${chord.source}`
              }
              onClick={() => onSwap?.(i)}
            >
              <span className={styles.numeral}>
                {romanForDegree(chord.degree)}
              </span>
              <span className={styles.symbol}>
                <span className={styles.root}>{chord.root}</span>
                <span className={styles.quality}>{suffix}</span>
              </span>
              <span className={styles.source}>{chord.source}</span>
            </button>

            <div className={styles.controls}>
              {onPlay && (
                <button
                  type="button"
                  className={styles.ctrl}
                  aria-label={`Play ${symbol}`}
                  title="Play"
                  onClick={() => onPlay(chord, i)}
                >
                  ▶
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
