import type { Chord, Quality } from '../types'
import { chordSymbol } from '../chords'
import type { SubstitutionStrategy } from './types'

// Only chords with a real third can be "suspended" (the sus note replaces it).
const HAS_THIRD: Quality[] = ['maj7', 'min7', '7', 'maj', 'min']

/**
 * Suspension: replace the third with a 2nd or 4th (sus2 / sus4). Open, modal,
 * unresolved — the folk/pop staple.
 */
export const suspension: SubstitutionStrategy = {
  id: 'suspension',
  label: 'Suspensions',
  suggest({ chord }) {
    if (!HAS_THIRD.includes(chord.quality)) return []
    return (['sus2', 'sus4'] as const).map(
      (quality): Chord => ({
        degree: chord.degree,
        root: chord.root,
        quality,
        symbol: chordSymbol(chord.root, quality),
        source: quality,
      }),
    )
  },
}
