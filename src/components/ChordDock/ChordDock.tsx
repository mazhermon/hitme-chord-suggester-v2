'use client'

import type { Chord } from '@/lib/theory/types'
import { ROMAN_NUMERALS } from '@/lib/theory/nashville'
import { useEditor } from '@/state/EditorProvider'
import { displayChords } from '@/state/editor'
import { Button } from '@/components/Button/Button'
import styles from './ChordDock.module.css'

interface ChordDockProps {
  onPlay: (chords: Chord[]) => void
  onSave: () => void
}

export function ChordDock({ onPlay, onSave }: ChordDockProps) {
  const { state, dispatch } = useEditor()
  const chords = displayChords(state)
  const hasChords = chords.length > 0

  return (
    <div className={styles.dock}>
      <ul className={styles.numerals}>
        {ROMAN_NUMERALS.map((roman, degree) => (
          <li key={roman}>
            <Button
              variant="ghost"
              aria-label={`Add chord ${roman}`}
              onClick={() => dispatch({ type: 'addChord', degree })}
            >
              {roman}
            </Button>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        <Button
          onClick={() => dispatch({ type: 'suggest' })}
          disabled={!hasChords}
        >
          Suggest
        </Button>
        <Button onClick={() => onPlay(chords)} disabled={!hasChords}>
          Play
        </Button>
        <Button
          onClick={() => dispatch({ type: 'reset' })}
          disabled={!hasChords}
        >
          Reset
        </Button>
        <Button variant="primary" onClick={onSave} disabled={!hasChords}>
          Save
        </Button>
      </div>
    </div>
  )
}
