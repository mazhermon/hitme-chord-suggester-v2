import { chordToFrequencies } from './voicing'

describe('chordToFrequencies', () => {
  it('voices a maj7 as four ascending frequencies near the root octave', () => {
    const freqs = chordToFrequencies({ root: 'C', quality: 'maj7' })
    expect(freqs).toHaveLength(4)
    expect(freqs[0]).toBeCloseTo(261.626, 1) // C4
    // strictly ascending (a clean low-to-high voicing)
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1])
    }
  })

  it('keeps voicings ascending even when the chord wraps the octave', () => {
    const freqs = chordToFrequencies({ root: 'B', quality: 'min7b5' })
    expect(freqs).toHaveLength(4)
    for (let i = 1; i < freqs.length; i++) {
      expect(freqs[i]).toBeGreaterThan(freqs[i - 1])
    }
    expect(freqs.every((f) => f > 0)).toBe(true)
  })

  it('voices a triad as three notes', () => {
    expect(chordToFrequencies({ root: 'C', quality: 'maj' })).toHaveLength(3)
  })
})
