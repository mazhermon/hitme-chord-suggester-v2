import type { Quality } from './types'

/** The seven diatonic modes of the major scale, in rotation order. */
export const MODE_NAMES = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
] as const

export type ModeName = (typeof MODE_NAMES)[number]

/**
 * Diatonic 7th-chord qualities of the ionian (major) scale, by degree I..VII.
 * Every other mode is a rotation of this, so we derive them rather than
 * hand-coding (which is where the legacy data drifted: "aolian" spelling and a
 * stray "#" on lydian's IV).
 */
const IONIAN_QUALITIES: Quality[] = [
  'maj7', // I
  'min7', // ii
  'min7', // iii
  'maj7', // IV
  '7', // V
  'min7', // vi
  'min7b5', // vii
]

function rotate<T>(arr: T[], by: number): T[] {
  const n = arr.length
  return arr.map((_, i) => arr[(i + by) % n])
}

/** Quality table for each mode, derived by rotating the ionian qualities. */
export const MODE_QUALITIES: Record<ModeName, Quality[]> = MODE_NAMES.reduce(
  (acc, name, index) => {
    acc[name] = rotate(IONIAN_QUALITIES, index)
    return acc
  },
  {} as Record<ModeName, Quality[]>,
)

/** The chord quality at a scale degree (0..6) within a mode (0..6). */
export function modeQuality(modeIndex: number, degree: number): Quality {
  const name = MODE_NAMES[modeIndex]
  return MODE_QUALITIES[name][degree]
}
