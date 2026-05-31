/** Oscillator waveform options. */
export type Waveform = 'sine' | 'triangle' | 'sawtooth' | 'square'

/** Canonical order for UI rendering — sine first (warmest), square last (brightest). */
export const WAVEFORMS: readonly Waveform[] = [
  'sine',
  'triangle',
  'sawtooth',
  'square',
]

/**
 * Per-waveform mix weights. Values are non-negative numbers; the engine
 * normalises by the total so {sine: 60, triangle: 40} sounds identical to
 * {sine: 6, triangle: 4}. Missing keys or zero values = waveform off.
 * The UI shows these as 0–100 percentages.
 */
export type WaveformMix = Partial<Record<Waveform, number>>

/** ADSR envelope + waveform mix that shape each played note. */
export interface EnvelopeSettings {
  /** Seconds from silence to peak. */
  attack: number
  /** Seconds from peak down to the sustain level. */
  decay: number
  /** Held level while the note rings (0–1). */
  sustain: number
  /** Seconds to fade to silence after the note ends. */
  release: number
  /**
   * Per-waveform mix weights. At least one entry should be > 0; the engine
   * falls back to triangle if everything is zero so the synth never goes
   * silent on a mistake.
   */
  mix?: WaveformMix
  /**
   * @deprecated Use `mix`. Kept readable for songs saved before mix landed —
   * load paths translate it into a mix with equal weights.
   */
  waveforms?: Waveform[]
}

export const DEFAULT_ENVELOPE: EnvelopeSettings = {
  attack: 0.012,
  decay: 0.12,
  sustain: 0.7,
  release: 0.3,
  mix: { triangle: 100 },
}

/**
 * Reduce an envelope's mix (or its legacy `waveforms`) to a list of
 * (waveform, fraction) pairs that sum to 1. Used by the audio engine for
 * per-waveform gain. Always returns at least one entry — never silent.
 */
export function resolveMix(env: EnvelopeSettings): Array<[Waveform, number]> {
  const fromMix: Array<[Waveform, number]> = env.mix
    ? (Object.entries(env.mix) as Array<[Waveform, number | undefined]>)
        .filter((e): e is [Waveform, number] => (e[1] ?? 0) > 0)
    : []
  const fromLegacy: Array<[Waveform, number]> = env.waveforms?.length
    ? env.waveforms.map((w): [Waveform, number] => [w, 1])
    : []
  const raw = fromMix.length > 0 ? fromMix : fromLegacy
  const safe = raw.length > 0 ? raw : ([['triangle', 1]] as [Waveform, number][])
  const total = safe.reduce((sum, [, w]) => sum + w, 0)
  return safe.map(([w, weight]) => [w, weight / total])
}

/**
 * If a loaded envelope has only the legacy `waveforms` array, populate a
 * `mix` from it (equal weight) so the UI's sliders show sensible values
 * straight away. Returns a new object — never mutates the input.
 */
export function migrateEnvelope(env: EnvelopeSettings): EnvelopeSettings {
  if (env.mix && Object.keys(env.mix).length > 0) return env
  if (env.waveforms?.length) {
    const mix: WaveformMix = {}
    for (const w of env.waveforms) mix[w] = 100
    return { ...env, mix }
  }
  return env
}
