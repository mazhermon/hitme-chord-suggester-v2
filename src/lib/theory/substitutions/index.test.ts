import { STRATEGIES, suggestForProgression } from './index'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }
// I – ii – V  →  Cmaj7, Dmin7, G7
const progression = [0, 1, 4].map((d) => realizeChord(d, cMajor))

describe('substitution registry', () => {
  it('registers all strategies', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual([
      'modal-interchange',
      'secondary-dominant',
      'tritone',
      'diatonic-third',
      'suspension',
      'planing',
    ])
  })
})

describe('suggestForProgression', () => {
  it('keeps every chord diatonic when home bias is 1', () => {
    const result = suggestForProgression(progression, cMajor, { homeBias: 1 })
    expect(result.map((c) => c.symbol)).toEqual(['Cmaj7', 'Dmin7', 'G7'])
  })

  it('applies a single enabled strategy deterministically (secondary dominants)', () => {
    const result = suggestForProgression(progression, cMajor, {
      enabled: ['secondary-dominant'],
      homeBias: 0,
      rng: () => 0,
    })
    expect(result.map((c) => c.symbol)).toEqual(['Cmaj7', 'A7', 'D7'])
  })

  it('leaves a chord untouched when the enabled strategy yields no candidates', () => {
    const result = suggestForProgression(progression, cMajor, {
      enabled: ['tritone'],
      homeBias: 0,
      rng: () => 0,
    })
    expect(result.map((c) => c.symbol)).toEqual(['Cmaj7', 'Dmin7', 'Db7'])
  })

  it('respects strategy weights (a zero-weighted strategy is never chosen)', () => {
    const [ii] = [realizeChord(1, cMajor)] // Dmin7
    const result = suggestForProgression([ii], cMajor, {
      enabled: ['secondary-dominant', 'diatonic-third'],
      weights: { 'secondary-dominant': 0, 'diatonic-third': 1 },
      homeBias: 0,
      rng: () => 0,
    })
    // secondary-dominant (A7) is weighted out → first diatonic-third candidate
    expect(result[0].symbol).toBe('Fmaj7')
  })

  it('returns one chord per input position', () => {
    expect(suggestForProgression(progression, cMajor)).toHaveLength(
      progression.length,
    )
  })
})
