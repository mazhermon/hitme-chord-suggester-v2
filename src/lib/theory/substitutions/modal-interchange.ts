import { Scale } from 'tonal'
import type { Chord } from '../types'
import { chordSymbol, homeModeIndex } from '../chords'
import { MODE_NAMES, modeQuality } from '../modes'
import type { SubstitutionStrategy } from './types'

/**
 * Modal interchange / borrowed chords: take the chord at the same scale degree
 * from each *parallel* mode built on the key's tonic (e.g. C dorian, C aeolian…),
 * excluding the home mode. Roots shift to reflect the borrowed accidental
 * (so degree VI in C major yields bVI = Abmaj7), and the source names the mode.
 */
export const modalInterchange: SubstitutionStrategy = {
  id: 'modal-interchange',
  label: 'Modal interchange',
  suggest({ chord, key }) {
    const home = homeModeIndex(key)
    const seen = new Set<string>([chord.symbol])
    const results: Chord[] = []

    MODE_NAMES.forEach((modeName, modeIndex) => {
      if (modeIndex === home) return
      const scale = Scale.get(`${key.tonic} ${modeName}`).notes
      const root = scale[chord.degree]
      if (!root) return
      const quality = modeQuality(modeIndex, chord.degree)
      const symbol = chordSymbol(root, quality)
      if (seen.has(symbol)) return
      seen.add(symbol)
      results.push({
        degree: chord.degree,
        root,
        quality,
        symbol,
        source: `from ${key.tonic} ${modeName}`,
      })
    })

    return results
  },
}
