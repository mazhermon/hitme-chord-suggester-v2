import { isBlackKey, keyboardRange, whiteKeysIn } from './keyboard'

describe('piano keyboard helpers', () => {
  it('identifies black keys by pitch class', () => {
    expect(isBlackKey(61)).toBe(true) // C#4
    expect(isBlackKey(60)).toBe(false) // C4
    expect(isBlackKey(66)).toBe(true) // F#4
    expect(isBlackKey(67)).toBe(false) // G4
  })

  it('expands a chord to whole octaves (C..B)', () => {
    expect(keyboardRange([60, 64, 67, 71])).toEqual({ start: 60, end: 71 })
    // 62 (D4) up to 77 (F5) → C4 (60) .. B5 (83)
    expect(keyboardRange([62, 77])).toEqual({ start: 60, end: 83 })
  })

  it('falls back to one octave when there are no notes', () => {
    expect(keyboardRange([])).toEqual({ start: 60, end: 71 })
  })

  it('lists the white keys in a range in order', () => {
    expect(whiteKeysIn(60, 71)).toEqual([60, 62, 64, 65, 67, 69, 71])
  })
})
