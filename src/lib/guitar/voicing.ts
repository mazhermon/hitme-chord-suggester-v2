import { Chord, Note } from 'tonal'
import type { Quality } from '../theory/types'
import { QUALITY_TONAL } from '../theory/types'

/** Open-string MIDI numbers, low E → high e (standard tuning). */
export const STANDARD_TUNING = [
  Note.midi('E2')!, // 40
  Note.midi('A2')!, // 45
  Note.midi('D3')!, // 50
  Note.midi('G3')!, // 55
  Note.midi('B3')!, // 59
  Note.midi('E4')!, // 64
]

export interface GuitarShape {
  /** Fret per string low→high; 0 = open, null = muted/not played. */
  frets: (number | null)[]
  /** First fret the diagram should display (1 = nut / open position). */
  baseFret: number
  playable: boolean
}

const MUTED: GuitarShape = {
  frets: [null, null, null, null, null, null],
  baseFret: 1,
  playable: false,
}

function soundingCount(frets: (number | null)[]): number {
  return frets.filter((f) => f !== null).length
}

function lowestChroma(frets: (number | null)[]): number | null {
  for (let i = 0; i < frets.length; i++) {
    const f = frets[i]
    if (f !== null) return (STANDARD_TUNING[i] + f) % 12
  }
  return null
}

function muteLowest(frets: (number | null)[], k: number): (number | null)[] {
  const out = [...frets]
  let muted = 0
  for (let i = 0; i < out.length && muted < k; i++) {
    if (out[i] !== null) {
      out[i] = null
      muted++
    }
  }
  return out
}

// Greedy per-string fret choice within a 4-fret window at `pos`.
function shapeAt(pos: number, chordChromas: Set<number>): (number | null)[] {
  const window = [pos, pos + 1, pos + 2, pos + 3]
  return STANDARD_TUNING.map((open) => {
    const candidates = window.filter((f) => chordChromas.has((open + f) % 12))
    return candidates.length ? Math.min(...candidates) : null
  })
}

/**
 * Find a playable standard-tuning fingering for a chord: only chord tones sound,
 * the root is included and (preferably) in the bass, within a 4-fret span. The
 * chord's own quality is voiced (7ths show 7th shapes; display 9ths/11ths reduce
 * to the underlying 7th for playability).
 */
export function findGuitarShape(chord: {
  root: string
  quality: Quality
}): GuitarShape {
  const tonalType = QUALITY_TONAL[chord.quality]
  const notes = Chord.getChord(tonalType, chord.root).notes
  const chordChromas = new Set(
    notes
      .map((n) => Note.chroma(n))
      .filter((c): c is number => c !== undefined),
  )
  const rootChroma = Note.chroma(chord.root)
  if (chordChromas.size === 0 || rootChroma === undefined) return MUTED

  let best: (number | null)[] | null = null
  let bestScore = -Infinity

  for (let pos = 0; pos <= 9; pos++) {
    const base = shapeAt(pos, chordChromas)
    if (soundingCount(base) < 3) continue
    for (let k = 0; k <= 2; k++) {
      const frets = muteLowest(base, k)
      const count = soundingCount(frets)
      if (count < 3) break
      const hasRoot = frets.some(
        (f, i) => f !== null && (STANDARD_TUNING[i] + f) % 12 === rootChroma,
      )
      if (!hasRoot) continue
      let score = count * 2 - pos * 0.3
      if (lowestChroma(frets) === rootChroma) score += 5
      if (score > bestScore) {
        bestScore = score
        best = frets
      }
    }
  }

  if (!best) return MUTED

  const fretted = best.filter((f): f is number => f !== null && f > 0)
  const maxF = fretted.length ? Math.max(...fretted) : 0
  const minF = fretted.length ? Math.min(...fretted) : 0
  const baseFret = maxF <= 4 ? 1 : minF

  return { frets: best, baseFret, playable: true }
}
