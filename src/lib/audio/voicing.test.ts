import { chordToFrequencies, chordToMidi, VOICING_NAMES } from './voicing'
import { flagsFromLevel } from '../theory/extensions'

describe('chordToFrequencies', () => {
  it('voices a maj7 as four ascending frequencies near the root octave', () => {
    const freqs = chordToFrequencies({ root: 'C', quality: 'maj7' })
    expect(freqs).toHaveLength(4)
    expect(freqs[0]).toBeCloseTo(261.626, 1) // C4
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

describe('chordToMidi', () => {
  it('voices a maj7 as ascending MIDI notes from C4', () => {
    expect(chordToMidi({ root: 'C', quality: 'maj7' })).toEqual([
      60, 64, 67, 71,
    ])
  })

  it('honours the extension level (min11 = six notes)', () => {
    expect(
      chordToMidi(
        { root: 'C', quality: 'min7' },
        { extensions: flagsFromLevel('eleventh') },
      ),
    ).toHaveLength(6)
  })

  it('shifts every note by 12 semitones per octave of baseOctave', () => {
    const mid = chordToMidi({ root: 'C', quality: 'maj7' }, { baseOctave: 4 })
    const up = chordToMidi({ root: 'C', quality: 'maj7' }, { baseOctave: 5 })
    expect(up).toEqual(mid.map((n) => n + 12))
  })
})

describe('chordToFrequencies with extension level', () => {
  it('voices a minor 11th as six notes (deep-house texture)', () => {
    const freqs = chordToFrequencies(
      { root: 'C', quality: 'min7' },
      { extensions: flagsFromLevel('eleventh') },
    )
    expect(freqs).toHaveLength(6) // C Eb G Bb D F
  })

  it('reduces a seventh quality to three notes at triad level', () => {
    expect(
      chordToFrequencies(
        { root: 'C', quality: 'maj7' },
        { extensions: flagsFromLevel('triad') },
      ),
    ).toHaveLength(3)
  })
})

describe('voicing variants', () => {
  it('exposes a list of named voicings', () => {
    expect(VOICING_NAMES.length).toBeGreaterThan(1)
  })

  it('keeps the note count across voicings', () => {
    const close = chordToFrequencies(
      { root: 'C', quality: 'maj7' },
      { voicing: 0 },
    )
    const inv = chordToFrequencies(
      { root: 'C', quality: 'maj7' },
      { voicing: 1 },
    )
    expect(inv).toHaveLength(close.length)
  })

  it('first inversion lifts the lowest note above the close voicing', () => {
    const close = chordToFrequencies(
      { root: 'C', quality: 'maj7' },
      { voicing: 0 },
    )
    const inv = chordToFrequencies(
      { root: 'C', quality: 'maj7' },
      { voicing: 1 },
    )
    expect(Math.min(...inv)).toBeGreaterThan(Math.min(...close))
  })

  it('wraps the voicing index around the available voicings', () => {
    const close = chordToFrequencies(
      { root: 'C', quality: 'maj7' },
      { voicing: 0 },
    )
    const wrapped = chordToFrequencies(
      { root: 'C', quality: 'maj7' },
      { voicing: VOICING_NAMES.length },
    )
    expect(wrapped).toEqual(close)
  })
})
