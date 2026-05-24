import { Note } from 'tonal'
import { chordSymbol } from '../chords'
import type { SubstitutionStrategy } from './types'

/**
 * Tritone substitution: swap a dominant-7th chord for the dom7 a tritone away
 * (shared guide tones), e.g. G7 → Db7. Applies only to dominant chords.
 */
export const tritoneSub: SubstitutionStrategy = {
  id: 'tritone',
  label: 'Tritone sub',
  suggest({ chord }) {
    if (chord.quality !== '7') return []
    const root = Note.transpose(chord.root, '5d') // diminished fifth = tritone
    if (!root) return []
    return [
      {
        degree: chord.degree,
        root,
        quality: '7',
        symbol: chordSymbol(root, '7'),
        source: 'tritone sub',
      },
    ]
  },
}
