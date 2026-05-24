import { tritoneSub } from './tritone'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }

describe('tritone substitution', () => {
  it('replaces a dominant 7th with the dom7 a tritone away (G7 → Db7)', () => {
    const g7 = realizeChord(4, cMajor) // G7
    const subs = tritoneSub.suggest({
      chord: g7,
      key: cMajor,
      progression: [g7],
      index: 0,
    })
    expect(subs).toHaveLength(1)
    expect(subs[0].symbol).toBe('Db7')
    expect(subs[0].quality).toBe('7')
    expect(subs[0].source).toBe('tritone sub')
  })

  it('only applies to dominant 7th chords', () => {
    const cmaj7 = realizeChord(0, cMajor) // Cmaj7
    expect(
      tritoneSub.suggest({
        chord: cmaj7,
        key: cMajor,
        progression: [cmaj7],
        index: 0,
      }),
    ).toEqual([])
  })
})
