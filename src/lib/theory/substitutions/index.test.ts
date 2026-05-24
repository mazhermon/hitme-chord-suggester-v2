import { STRATEGIES, suggestForProgression } from './index'
import { realizeChord } from '../chords'
import type { KeyContext } from '../types'

const cMajor: KeyContext = { tonic: 'C', mode: 'major' }
// I – ii – V  →  Cmaj7, Dmin7, G7
const progression = [0, 1, 4].map((d) => realizeChord(d, cMajor))

describe('substitution registry', () => {
  it('registers the four strategies', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual([
      'modal-interchange',
      'secondary-dominant',
      'tritone',
      'diatonic-third',
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
    // I has no secondary dominant; ii→A7; V→D7
    expect(result.map((c) => c.symbol)).toEqual(['Cmaj7', 'A7', 'D7'])
  })

  it('leaves a chord untouched when the enabled strategy yields no candidates', () => {
    const result = suggestForProgression(progression, cMajor, {
      enabled: ['tritone'],
      homeBias: 0,
      rng: () => 0,
    })
    // only the dominant G7 has a tritone sub (Db7)
    expect(result.map((c) => c.symbol)).toEqual(['Cmaj7', 'Dmin7', 'Db7'])
  })

  it('returns one chord per input position', () => {
    const result = suggestForProgression(progression, cMajor)
    expect(result).toHaveLength(progression.length)
  })
})
