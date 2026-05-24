import type { Chord, KeyContext, Quality } from './types'
import { QUALITY_SUFFIX } from './types'
import { scaleForKey } from './keys'
import { modeQuality } from './modes'

/** Build a chord display symbol from a spelled root and a quality. */
export function chordSymbol(root: string, quality: Quality): string {
  return `${root}${QUALITY_SUFFIX[quality]}`
}

/** The home mode index for a key: ionian (0) for major, aeolian (5) for minor. */
export function homeModeIndex(key: KeyContext): number {
  return key.mode === 'major' ? 0 : 5
}

/**
 * Realize the diatonic chord at a Nashville degree (0..6) in a key.
 * Root comes from the key's scale; quality from the key's home mode.
 */
export function realizeChord(degree: number, key: KeyContext): Chord {
  const root = scaleForKey(key)[degree]
  const quality = modeQuality(homeModeIndex(key), degree)
  return {
    degree,
    root,
    quality,
    symbol: chordSymbol(root, quality),
    source: 'diatonic',
  }
}
