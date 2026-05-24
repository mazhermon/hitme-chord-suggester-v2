import { isBlackKey, keyboardRange, whiteKeysIn } from '@/lib/piano/keyboard'
import styles from './PianoChord.module.css'

interface PianoChordProps {
  /** MIDI notes of the chord tones to highlight ("play these"). */
  notes: number[]
  /** MIDI notes currently sounding, highlighted distinctly to show timing. */
  active?: number[]
  name?: string
}

const WHITE_W = 14
const WHITE_H = 54
const BLACK_W = 9
const BLACK_H = 33

export function PianoChord({ notes, active = [], name }: PianoChordProps) {
  const { start, end } = keyboardRange(notes)
  const whites = whiteKeysIn(start, end)
  const noteSet = new Set(notes)
  const activeSet = new Set(active)
  const width = whites.length * WHITE_W
  const whiteIndex = new Map(whites.map((m, i) => [m, i]))

  const blacks: { midi: number; x: number }[] = []
  for (let m = start; m <= end; m++) {
    if (!isBlackKey(m)) continue
    const left = whiteIndex.get(m - 1)
    if (left === undefined) continue
    blacks.push({ midi: m, x: (left + 1) * WHITE_W - BLACK_W / 2 })
  }

  function status(midi: number): 'active' | 'chord' | '' {
    if (activeSet.has(midi)) return 'active'
    if (noteSet.has(midi)) return 'chord'
    return ''
  }

  function fillClass(midi: number, white: boolean): string {
    const s = status(midi)
    if (s === 'active') return styles.sounding
    if (s === 'chord') return styles.chordTone
    return white ? styles.white : styles.black
  }

  return (
    <svg
      className={styles.piano}
      viewBox={`0 0 ${width} ${WHITE_H}`}
      width={width}
      height={WHITE_H}
      role="img"
      aria-label={`${name ?? ''} piano voicing`}
    >
      {whites.map((m, i) => (
        <rect
          key={`w${m}`}
          data-on={status(m)}
          x={i * WHITE_W}
          y={0}
          width={WHITE_W - 1}
          height={WHITE_H}
          rx={2}
          className={fillClass(m, true)}
        />
      ))}
      {blacks.map(({ midi, x }) => (
        <rect
          key={`b${midi}`}
          data-on={status(midi)}
          x={x}
          y={0}
          width={BLACK_W}
          height={BLACK_H}
          rx={1.5}
          className={fillClass(midi, false)}
        />
      ))}
    </svg>
  )
}
