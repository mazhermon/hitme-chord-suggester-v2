import { modalInterchange } from './modal-interchange'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }

function suggestSymbols(degree: number) {
  const chord = realizeChord(degree, cMajor)
  return modalInterchange
    .suggest({ chord, key: cMajor, progression: [chord], index: 0 })
    .map((c) => c.symbol)
}

describe('modal interchange', () => {
  it('borrows the tonic chord from parallel modes (C7 from mixolydian, Cmin7 from minor modes)', () => {
    const symbols = suggestSymbols(0)
    expect(symbols).toContain('C7') // C mixolydian
    expect(symbols).toContain('Cmin7') // C dorian / aeolian / phrygian
  })

  it('borrows bVI (Abmaj7) for scale degree VI in a major key', () => {
    expect(suggestSymbols(5)).toContain('Abmaj7')
  })

  it('never reproduces the diatonic chord itself and labels its source', () => {
    const chord = realizeChord(4, cMajor) // G7 diatonic
    const subs = modalInterchange.suggest({
      chord,
      key: cMajor,
      progression: [chord],
      index: 0,
    })
    expect(subs.every((c) => c.symbol !== 'G7')).toBe(true)
    expect(subs.every((c) => c.source.startsWith('from '))).toBe(true)
  })
})
