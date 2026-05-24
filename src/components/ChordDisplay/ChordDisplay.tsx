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
  /** Show the deeper "results" treatment (suggestions vs. the user's input). */
  resultsMode?: boolean
  onChordClick?: (chord: Chord, index: number) => void
  onCycleVoicing?: (index: number) => void
  removable?: boolean
  onRemove?: (index: number) => void
}

export function ChordDisplay({
  chords,
  level = 'seventh',
  resultsMode = false,
  onChordClick,
  onCycleVoicing,
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
        const voicingName =
          VOICING_NAMES[(chord.voicing ?? 0) % VOICING_NAMES.length]
        return (
          <li key={`${chord.symbol}-${i}`} className={styles.item}>
            <button
              type="button"
              className={styles.chord}
              aria-label={`${symbol}, ${chord.source}. Play`}
              onClick={() => onChordClick?.(chord, i)}
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

            {onCycleVoicing && (
              <button
                type="button"
                className={styles.voicing}
                aria-label={`Change voicing of ${symbol} (now ${voicingName})`}
                title={`Voicing: ${voicingName}`}
                onClick={() => onCycleVoicing(i)}
              >
                <span aria-hidden>≋</span>
                {(chord.voicing ?? 0) > 0 && (
                  <span className={styles.voicingName}>{voicingName}</span>
                )}
              </button>
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
