import { suspension } from './suspension'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }

describe('suspension', () => {
  it('offers sus2 and sus4 for a chord that has a third', () => {
    const chord = realizeChord(0, cMajor) // Cmaj7
    const subs = suspension.suggest({
      chord,
      key: cMajor,
      progression: [chord],
      index: 0,
    })
    expect(subs.map((c) => c.quality)).toEqual(['sus2', 'sus4'])
    expect(subs.map((c) => c.symbol)).toEqual(['Csus2', 'Csus4'])
    expect(subs.every((c) => c.source.startsWith('sus'))).toBe(true)
  })

  it('does not suspend diminished or half-diminished chords', () => {
    const dim = realizeChord(6, cMajor) // Bmin7b5
    expect(
      suspension.suggest({
        chord: dim,
        key: cMajor,
        progression: [dim],
        index: 0,
      }),
    ).toEqual([])
  })
})
