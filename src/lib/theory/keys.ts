import { Scale } from 'tonal'
import type { KeyContext, Mode } from './types'

/** Tonic spellings per pitch class, chosen for readability per mode. */
export const MAJOR_TONICS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

export const MINOR_TONICS = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'Bb',
  'B',
] as const

/** The 7 spelled notes of a key's scale (major, or natural minor / aeolian). */
export function scaleForKey(key: KeyContext): string[] {
  const scaleName = key.mode === 'major' ? 'major' : 'aeolian'
  return Scale.get(`${key.tonic} ${scaleName}`).notes
}

function keysForMode(tonics: readonly string[], mode: Mode): KeyContext[] {
  return tonics.map((tonic) => ({ tonic, mode }))
}

/** All 12 tonics × {major, minor} = 24 selectable keys. */
export const ALL_KEYS: KeyContext[] = [
  ...keysForMode(MAJOR_TONICS, 'major'),
  ...keysForMode(MINOR_TONICS, 'minor'),
]
