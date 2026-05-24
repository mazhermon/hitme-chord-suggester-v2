import { diatonicThird } from './diatonic-third'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }

describe('diatonic third-relation', () => {
  it('swaps I (Cmaj7) for its diatonic third relatives iii (Emin7) and vi (Amin7)', () => {
    const tonic = realizeChord(0, cMajor)
    const subs = diatonicThird.suggest({
      chord: tonic,
      key: cMajor,
      progression: [tonic],
      index: 0,
    })
    const symbols = subs.map((c) => c.symbol)
    expect(symbols).toContain('Emin7') // iii (a third above)
    expect(symbols).toContain('Amin7') // vi (a third below)
    expect(subs).toHaveLength(2)
  })

  it('labels each suggestion as a diatonic third', () => {
    const tonic = realizeChord(0, cMajor)
    const subs = diatonicThird.suggest({
      chord: tonic,
      key: cMajor,
      progression: [tonic],
      index: 0,
    })
    expect(subs.every((c) => c.source.startsWith('diatonic 3rd'))).toBe(true)
  })
})
