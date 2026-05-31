import {
  DEFAULT_ENVELOPE,
  migrateEnvelope,
  resolveMix,
  type EnvelopeSettings,
  type WaveformMix,
} from './envelope'

function env(mix: WaveformMix | undefined, waveforms?: EnvelopeSettings['waveforms']): EnvelopeSettings {
  return { ...DEFAULT_ENVELOPE, mix, waveforms }
}

describe('resolveMix', () => {
  it('normalises a single-waveform mix to fraction 1', () => {
    expect(resolveMix(env({ triangle: 100 }))).toEqual([['triangle', 1]])
  })

  it('normalises two waveforms by their relative weights', () => {
    expect(resolveMix(env({ sine: 70, triangle: 30 }))).toEqual([
      ['sine', 0.7],
      ['triangle', 0.3],
    ])
  })

  it('treats raw numbers as proportions (60/40 == 6/4)', () => {
    expect(resolveMix(env({ sine: 6, triangle: 4 }))).toEqual([
      ['sine', 0.6],
      ['triangle', 0.4],
    ])
  })

  it('drops waveforms whose value is 0 or missing', () => {
    expect(resolveMix(env({ sine: 50, triangle: 0, sawtooth: 50 }))).toEqual([
      ['sine', 0.5],
      ['sawtooth', 0.5],
    ])
  })

  it('falls back to legacy `waveforms` when mix is absent', () => {
    expect(resolveMix(env(undefined, ['sine', 'square']))).toEqual([
      ['sine', 0.5],
      ['square', 0.5],
    ])
  })

  it('falls back to triangle when both mix and waveforms are empty', () => {
    expect(resolveMix(env({}))).toEqual([['triangle', 1]])
  })
})

describe('migrateEnvelope', () => {
  it('returns the same envelope when a mix is already present', () => {
    const e: EnvelopeSettings = { ...DEFAULT_ENVELOPE, mix: { sine: 50 } }
    expect(migrateEnvelope(e)).toBe(e)
  })

  it('populates a mix from legacy waveforms with equal weights', () => {
    const e: EnvelopeSettings = {
      ...DEFAULT_ENVELOPE,
      mix: undefined,
      waveforms: ['sine', 'triangle'],
    }
    const migrated = migrateEnvelope(e)
    expect(migrated.mix).toEqual({ sine: 100, triangle: 100 })
    // Doesn't mutate.
    expect(e.mix).toBeUndefined()
  })

  it('returns the input untouched when there is nothing to migrate', () => {
    const e: EnvelopeSettings = { ...DEFAULT_ENVELOPE, mix: undefined, waveforms: undefined }
    expect(migrateEnvelope(e)).toBe(e)
  })
})
