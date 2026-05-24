import { romanForDegree, degreeForRoman, ROMAN_NUMERALS } from './nashville'

describe('nashville numerals', () => {
  it('maps a degree (0..6) to a roman numeral', () => {
    expect(romanForDegree(0)).toBe('I')
    expect(romanForDegree(3)).toBe('IV')
    expect(romanForDegree(6)).toBe('VII')
  })

  it('maps a roman numeral back to a degree', () => {
    expect(degreeForRoman('I')).toBe(0)
    expect(degreeForRoman('IV')).toBe(3)
    expect(degreeForRoman('VII')).toBe(6)
  })

  it('exposes the seven numerals in order', () => {
    expect(ROMAN_NUMERALS).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'])
  })
})
