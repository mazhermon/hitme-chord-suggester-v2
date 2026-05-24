'use client'

import type { Chord } from '@/lib/theory/types'
import { QUALITY_SUFFIX } from '@/lib/theory/types'
import { romanForDegree } from '@/lib/theory/nashville'
import styles from './ChordDisplay.module.css'

interface ChordDisplayProps {
  chords: Chord[]
  /** Show the deeper "results" treatment (suggestions vs. the user's input). */
  resultsMode?: boolean
  onChordClick?: (chord: Chord, index: number) => void
  removable?: boolean
  onRemove?: (index: number) => void
}

export function ChordDisplay({
  chords,
  resultsMode = false,
  onChordClick,
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
      {chords.map((chord, i) => (
        <li key={`${chord.symbol}-${i}`} className={styles.item}>
          <button
            type="button"
            className={styles.chord}
            aria-label={`${chord.symbol}, ${chord.source}. Play`}
            onClick={() => onChordClick?.(chord, i)}
          >
            <span className={styles.numeral}>
              {romanForDegree(chord.degree)}
            </span>
            <span className={styles.symbol}>
              <span className={styles.root}>{chord.root}</span>
              <span className={styles.quality}>
                {QUALITY_SUFFIX[chord.quality]}
              </span>
            </span>
            <span className={styles.source}>{chord.source}</span>
          </button>
          {removable && (
            <button
              type="button"
              className={styles.remove}
              aria-label={`Remove ${chord.symbol}`}
              onClick={() => onRemove?.(i)}
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
