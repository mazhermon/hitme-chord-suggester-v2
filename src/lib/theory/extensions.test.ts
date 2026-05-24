import {
  chordSuffix,
  renderSymbol,
  chordNotes,
  flagsFromLevel,
  NO_EXTENSIONS,
  type ExtensionFlags,
} from './extensions'

const f = (
  seventh: boolean,
  ninth: boolean,
  eleventh: boolean,
): ExtensionFlags => ({ seventh, ninth, eleventh })

describe('chordSuffix — independent 7/9/11', () => {
  it('renders the major family for each combination', () => {
    expect(chordSuffix('maj7', NO_EXTENSIONS)).toBe('') // triad
    expect(chordSuffix('maj7', f(true, false, false))).toBe('maj7')
    expect(chordSuffix('maj7', f(false, true, false))).toBe('add9') // 9 without 7
    expect(chordSuffix('maj7', f(true, true, false))).toBe('maj9')
    expect(chordSuffix('maj7', f(true, true, true))).toBe('maj11')
    expect(chordSuffix('maj7', f(true, false, true))).toBe('maj7(add11)')
  })

  it('renders the minor family', () => {
    expect(chordSuffix('min7', NO_EXTENSIONS)).toBe('min')
    expect(chordSuffix('min7', f(true, false, false))).toBe('min7')
    expect(chordSuffix('min7', f(false, true, false))).toBe('min(add9)')
    expect(chordSuffix('min7', f(true, true, false))).toBe('min9')
    expect(chordSuffix('min7', f(true, true, true))).toBe('min11')
  })

  it('renders the dominant family (triad = plain major; 9 without 7 = add9)', () => {
    expect(chordSuffix('7', NO_EXTENSIONS)).toBe('')
    expect(chordSuffix('7', f(true, false, false))).toBe('7')
    expect(chordSuffix('7', f(false, true, false))).toBe('add9')
    expect(chordSuffix('7', f(true, true, false))).toBe('9')
    expect(chordSuffix('7', f(true, true, true))).toBe('11')
  })

  it('leaves fixed qualities (half-dim, sus) unchanged by extensions', () => {
    expect(chordSuffix('min7b5', f(true, true, true))).toBe('min7(b5)')
    expect(chordSuffix('sus2', f(true, true, true))).toBe('sus2')
  })
})

describe('renderSymbol', () => {
  it('combines root + suffix', () => {
    expect(renderSymbol('C', '7', f(false, true, false))).toBe('Cadd9')
    expect(renderSymbol('Eb', 'min7', f(true, true, false))).toBe('Ebmin9')
  })
})

describe('chordNotes — independent extension tones', () => {
  it('add9 omits the 7th', () => {
    expect(chordNotes('C', 'maj7', f(false, true, false))).toEqual([
      'C',
      'E',
      'G',
      'D',
    ])
  })

  it('maj9 includes both the 7th and the 9th', () => {
    expect(chordNotes('C', 'maj7', f(true, true, false))).toEqual([
      'C',
      'E',
      'G',
      'B',
      'D',
    ])
  })

  it('a bare triad drops the 7th', () => {
    expect(chordNotes('C', 'min7', NO_EXTENSIONS)).toEqual(['C', 'Eb', 'G'])
  })
})

describe('flagsFromLevel (used to seed a genre default)', () => {
  it('expands a level into cumulative flags', () => {
    expect(flagsFromLevel('ninth')).toEqual(f(true, true, false))
    expect(flagsFromLevel('triad')).toEqual(NO_EXTENSIONS)
  })
})
