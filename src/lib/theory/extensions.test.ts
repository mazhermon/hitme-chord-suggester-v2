import {
  renderQuality,
  renderSymbol,
  levelFromFlags,
  flagsFromLevel,
  type ExtensionLevel,
} from './extensions'

describe('renderQuality', () => {
  it('builds the major family up the extension ladder (maj caps at 9th)', () => {
    expect(renderQuality('maj7', 'triad')).toEqual({
      suffix: '',
      tonalType: 'M',
    })
    expect(renderQuality('maj7', 'seventh')).toEqual({
      suffix: 'maj7',
      tonalType: 'maj7',
    })
    expect(renderQuality('maj7', 'ninth')).toEqual({
      suffix: 'maj9',
      tonalType: 'maj9',
    })
    // maj11 is dissonant / not a tonal type → cap at maj9
    expect(renderQuality('maj7', 'eleventh').tonalType).toBe('maj9')
  })

  it('builds the minor family through the 11th (deep-house min11)', () => {
    expect(renderQuality('min7', 'triad')).toEqual({
      suffix: 'min',
      tonalType: 'm',
    })
    expect(renderQuality('min7', 'seventh')).toEqual({
      suffix: 'min7',
      tonalType: 'm7',
    })
    expect(renderQuality('min7', 'ninth')).toEqual({
      suffix: 'min9',
      tonalType: 'm9',
    })
    expect(renderQuality('min7', 'eleventh')).toEqual({
      suffix: 'min11',
      tonalType: 'm11',
    })
  })

  it('builds the dominant family (triad = plain major)', () => {
    expect(renderQuality('7', 'triad')).toEqual({ suffix: '', tonalType: 'M' })
    expect(renderQuality('7', 'seventh')).toEqual({
      suffix: '7',
      tonalType: '7',
    })
    expect(renderQuality('7', 'ninth')).toEqual({ suffix: '9', tonalType: '9' })
    expect(renderQuality('7', 'eleventh')).toEqual({
      suffix: '11',
      tonalType: '11',
    })
  })

  it('handles half-diminished and diminished', () => {
    expect(renderQuality('min7b5', 'triad')).toEqual({
      suffix: 'dim',
      tonalType: 'dim',
    })
    expect(renderQuality('min7b5', 'seventh')).toEqual({
      suffix: 'min7(b5)',
      tonalType: 'm7b5',
    })
    expect(renderQuality('min7b5', 'ninth').tonalType).toBe('m9b5')
    expect(renderQuality('dim7', 'eleventh').tonalType).toBe('dim7') // caps
  })

  it('passes suspended chords through unchanged at any level', () => {
    expect(renderQuality('sus2', 'ninth')).toEqual({
      suffix: 'sus2',
      tonalType: 'sus2',
    })
    expect(renderQuality('sus4', 'triad')).toEqual({
      suffix: 'sus4',
      tonalType: 'sus4',
    })
  })
})

describe('renderSymbol', () => {
  it('combines a root with the rendered suffix', () => {
    expect(renderSymbol('C', '7', 'ninth')).toBe('C9')
    expect(renderSymbol('Eb', 'min7', 'eleventh')).toBe('Ebmin11')
    expect(renderSymbol('G', 'maj7', 'triad')).toBe('G')
  })
})

describe('flagsFromLevel', () => {
  it('expands a level into cumulative flags (round-trips levelFromFlags)', () => {
    expect(flagsFromLevel('triad')).toEqual({
      seventh: false,
      ninth: false,
      eleventh: false,
    })
    expect(flagsFromLevel('ninth')).toEqual({
      seventh: true,
      ninth: true,
      eleventh: false,
    })
    expect(levelFromFlags(flagsFromLevel('eleventh'))).toBe('eleventh')
  })
})

describe('levelFromFlags', () => {
  it('derives the highest enabled level (extensions are cumulative)', () => {
    expect(
      levelFromFlags({ seventh: false, ninth: false, eleventh: false }),
    ).toBe('triad' satisfies ExtensionLevel)
    expect(
      levelFromFlags({ seventh: true, ninth: false, eleventh: false }),
    ).toBe('seventh')
    expect(
      levelFromFlags({ seventh: true, ninth: true, eleventh: false }),
    ).toBe('ninth')
    expect(levelFromFlags({ seventh: true, ninth: true, eleventh: true })).toBe(
      'eleventh',
    )
  })
})
