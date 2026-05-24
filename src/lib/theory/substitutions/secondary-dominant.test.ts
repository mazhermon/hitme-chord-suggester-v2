import { secondaryDominant } from './secondary-dominant'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }

function suggestFor(degree: number) {
  const chord = realizeChord(degree, cMajor)
  return secondaryDominant.suggest({
    chord,
    key: cMajor,
    progression: [chord],
    index: 0,
  })
}

describe('secondary dominant', () => {
  it('proposes V7/ii (A7) for the ii chord in C major', () => {
    const subs = suggestFor(1) // Dmin7
    expect(subs).toHaveLength(1)
    expect(subs[0].symbol).toBe('A7')
    expect(subs[0].quality).toBe('7')
    expect(subs[0].source).toBe('V/ii')
  })

  it('proposes V7/V (D7) for the V chord, labelled with an uppercase target', () => {
    const subs = suggestFor(4) // G7
    expect(subs[0].symbol).toBe('D7')
    expect(subs[0].source).toBe('V/V')
  })

  it('offers nothing for the tonic (its secondary dominant is just the diatonic V)', () => {
    expect(suggestFor(0)).toEqual([])
  })
})
