// Core domain types for the music-theory engine. Pure declarations (no runtime behavior).

/** Normalized chord qualities the app works with. */
export type Quality =
  | 'maj7'
  | 'min7'
  | '7' // dominant 7th
  | 'min7b5' // half-diminished
  | 'dim7'
  | 'maj' // major triad
  | 'min' // minor triad
  | 'dim'
  | 'aug'

export type Mode = 'major' | 'minor'

/** The current key center: a tonic note name + major/minor. */
export interface KeyContext {
  tonic: string
  mode: Mode
}

/**
 * A chord in a progression.
 * - `degree` is the 0-based Nashville scale degree (0 = I … 6 = VII).
 * - `root` is the spelled root note (e.g. "Eb").
 * - `symbol` is the display symbol (e.g. "Ebmaj7").
 * - `source` is the provenance label ("diatonic", "from dorian", "V/ii", "tritone sub", …).
 */
export interface Chord {
  degree: number
  root: string
  quality: Quality
  symbol: string
  source: string
}

/** Human-readable display suffix appended to a root note to form a chord symbol. */
export const QUALITY_SUFFIX: Record<Quality, string> = {
  maj7: 'maj7',
  min7: 'min7',
  '7': '7',
  min7b5: 'min7(b5)',
  dim7: 'dim7',
  maj: '',
  min: 'min',
  dim: 'dim',
  aug: 'aug',
}

/** Maps our Quality to the tonal chord-type name used for voicing/note lookup. */
export const QUALITY_TONAL: Record<Quality, string> = {
  maj7: 'maj7',
  min7: 'm7',
  '7': '7',
  min7b5: 'm7b5',
  dim7: 'dim7',
  maj: 'M',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
}
