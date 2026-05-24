import { scaleForKey, ALL_KEYS } from './keys'

describe('keys', () => {
  it('spells the C major scale', () => {
    expect(scaleForKey({ tonic: 'C', mode: 'major' })).toEqual([
      'C',
      'D',
      'E',
      'F',
      'G',
      'A',
      'B',
    ])
  })

  it('spells the C natural-minor scale (aeolian)', () => {
    expect(scaleForKey({ tonic: 'C', mode: 'minor' })).toEqual([
      'C',
      'D',
      'Eb',
      'F',
      'G',
      'Ab',
      'Bb',
    ])
  })

  it('supports keys the legacy app was missing (F#, Ab, A, B)', () => {
    expect(scaleForKey({ tonic: 'F#', mode: 'major' })[0]).toBe('F#')
    expect(scaleForKey({ tonic: 'Ab', mode: 'major' })).toHaveLength(7)
    expect(scaleForKey({ tonic: 'A', mode: 'major' })[0]).toBe('A')
    expect(scaleForKey({ tonic: 'B', mode: 'major' })[0]).toBe('B')
  })

  it('exposes all 12 tonics × {major, minor} = 24 keys', () => {
    expect(ALL_KEYS).toHaveLength(24)
    expect(ALL_KEYS.some((k) => k.tonic === 'F#' && k.mode === 'major')).toBe(
      true,
    )
    // every key resolves to a 7-note scale
    for (const key of ALL_KEYS) {
      expect(scaleForKey(key)).toHaveLength(7)
    }
  })
})
