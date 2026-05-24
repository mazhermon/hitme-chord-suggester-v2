import type { Chord } from '../types'
import { realizeChord } from '../chords'
import { romanForDegree } from '../nashville'
import type { SubstitutionStrategy } from './types'

/**
 * Diatonic third-relation: swap a chord for the diatonic chords a third above
 * and below it (they share two common tones), e.g. I (Cmaj7) ↔ iii (Emin7) and
 * vi (Amin7). Both substitutes stay inside the key.
 */
export const diatonicThird: SubstitutionStrategy = {
  id: 'diatonic-third',
  label: 'Diatonic 3rd',
  suggest({ chord, key }) {
    const above = (chord.degree + 2) % 7
    const below = (chord.degree + 5) % 7 // -2 mod 7
    return [above, below].map((degree): Chord => {
      const realized = realizeChord(degree, key)
      return {
        ...realized,
        source: `diatonic 3rd (${romanForDegree(degree)})`,
      }
    })
  },
}
