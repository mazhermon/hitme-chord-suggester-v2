/** The seven Nashville roman numerals, indexed by scale degree (0 = I). */
export const ROMAN_NUMERALS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
] as const

/** Degree (0..6) → roman numeral. */
export function romanForDegree(degree: number): string {
  return ROMAN_NUMERALS[degree]
}

/** Roman numeral → degree (0..6), or -1 if not a valid numeral. */
export function degreeForRoman(roman: string): number {
  return ROMAN_NUMERALS.indexOf(roman.toUpperCase() as never)
}
