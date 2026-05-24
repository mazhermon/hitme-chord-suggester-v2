import { Note } from 'tonal'
import type { Chord, Quality } from '../types'
import { chordSymbol } from '../chords'
import { romanForDegree } from '../nashville'
import type { SubstitutionStrategy } from './types'

const MINORISH: Quality[] = ['min7', 'min', 'min7b5', 'dim7', 'dim']

/** Roman numeral cased by chord quality (lowercase for minor/diminished targets). */
function romanForTarget(chord: Chord): string {
  const roman = romanForDegree(chord.degree)
  return MINORISH.includes(chord.quality) ? roman.toLowerCase() : roman
}

/**
 * Secondary dominant: the dominant-7th a perfect fifth above the target chord's
 * root, which tonicizes it (e.g. ii = Dm7 → V7/ii = A7). Skipped for the tonic,
 * whose secondary dominant is just the diatonic V.
 */
export const secondaryDominant: SubstitutionStrategy = {
  id: 'secondary-dominant',
  label: 'Secondary dominant',
  suggest({ chord }) {
    if (chord.degree === 0) return []
    const root = Note.transpose(chord.root, '5P')
    if (!root) return []
    return [
      {
        degree: chord.degree,
        root,
        quality: '7',
        symbol: chordSymbol(root, '7'),
        source: `V/${romanForTarget(chord)}`,
      },
    ]
  },
}
