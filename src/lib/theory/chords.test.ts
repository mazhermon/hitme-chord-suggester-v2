import { chordSymbol, realizeChord } from './chords'
import type { KeyContext } from './types'

describe('chordSymbol', () => {
  it('appends the display suffix for each quality', () => {
    expect(chordSymbol('Eb', 'maj7')).toBe('Ebmaj7')
    expect(chordSymbol('G', '7')).toBe('G7')
    expect(chordSymbol('C', 'min7')).toBe('Cmin7')
    expect(chordSymbol('B', 'min7b5')).toBe('Bmin7(b5)')
  })
})

describe('realizeChord (diatonic)', () => {
  const cMajor: KeyContext = { tonic: 'C', mode: 'major' }
  const cMinor: KeyContext = { tonic: 'C', mode: 'minor' }

  it('realizes I–IV–V in C major (verified vs legacy app)', () => {
    expect([0, 3, 4].map((d) => realizeChord(d, cMajor).symbol)).toEqual([
      'Cmaj7',
      'Fmaj7',
      'G7',
    ])
  })

  it('realizes i–VI–iv in C minor (verified vs legacy app)', () => {
    expect([0, 5, 3].map((d) => realizeChord(d, cMinor).symbol)).toEqual([
      'Cmin7',
      'Abmaj7',
      'Fmin7',
    ])
  })

  it('populates degree, root, quality and a diatonic source', () => {
    const chord = realizeChord(4, cMajor) // V
    expect(chord).toMatchObject({
      degree: 4,
      root: 'G',
      quality: '7',
      symbol: 'G7',
      source: 'diatonic',
    })
  })
})
