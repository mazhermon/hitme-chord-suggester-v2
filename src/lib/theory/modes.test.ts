import { MODE_NAMES, modeQuality } from './modes'

describe('modes', () => {
  it('lists the seven diatonic modes, ionian first, aeolian sixth', () => {
    expect(MODE_NAMES).toHaveLength(7)
    expect(MODE_NAMES[0]).toBe('ionian')
    expect(MODE_NAMES[5]).toBe('aeolian')
  })

  it('gives ionian diatonic 7th qualities', () => {
    expect(modeQuality(0, 0)).toBe('maj7') // I
    expect(modeQuality(0, 4)).toBe('7') // V (dominant)
    expect(modeQuality(0, 6)).toBe('min7b5') // vii (half-diminished)
  })

  it('gives aeolian (natural minor) qualities', () => {
    expect(modeQuality(5, 0)).toBe('min7') // i
    expect(modeQuality(5, 5)).toBe('maj7') // VI
    expect(modeQuality(5, 6)).toBe('7') // VII
  })

  it('treats each mode as a rotation of ionian (mixolydian I is dominant)', () => {
    expect(modeQuality(4, 0)).toBe('7') // mixolydian I
    expect(modeQuality(1, 3)).toBe('7') // dorian IV
    expect(modeQuality(6, 4)).toBe('maj7') // locrian V
  })
})
