import { planing } from './planing'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMinor: KeyContext = { tonic: 'C', mode: 'minor' }

describe('planing (house chord stab pitched up/down)', () => {
  it('transposes the same chord shape to new roots (parallel motion)', () => {
    const i = realizeChord(0, cMinor) // Cmin7
    const symbols = planing
      .suggest({ chord: i, key: cMinor, progression: [i], index: 0 })
      .map((c) => c.symbol)
    // same quality (min7), pitched up/down the keyboard
    expect(symbols).toContain('Dmin7') // ↑ a whole tone
    expect(symbols).toContain('Bbmin7') // ↓ a whole tone
    expect(symbols).toContain('Gmin7') // ↑ a fifth
  })

  it('keeps the original chord quality and labels the move', () => {
    const chord = realizeChord(0, { tonic: 'C', mode: 'major' }) // Cmaj7
    const subs = planing.suggest({
      chord,
      key: { tonic: 'C', mode: 'major' },
      progression: [chord],
      index: 0,
    })
    expect(subs.every((c) => c.quality === 'maj7')).toBe(true)
    expect(subs.every((c) => c.source.startsWith('planed'))).toBe(true)
  })
})
