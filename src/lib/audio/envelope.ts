/** Oscillator waveform options. */
export type Waveform = 'sine' | 'triangle' | 'sawtooth' | 'square'

/** ADSR envelope + waveform that shapes each played note. */
export interface EnvelopeSettings {
  /** Seconds from silence to peak. */
  attack: number
  /** Seconds from peak down to the sustain level. */
  decay: number
  /** Held level while the note rings (0–1). */
  sustain: number
  /** Seconds to fade to silence after the note ends. */
  release: number
  waveform: Waveform
}

export const DEFAULT_ENVELOPE: EnvelopeSettings = {
  attack: 0.012,
  decay: 0.12,
  sustain: 0.7,
  release: 0.3,
  waveform: 'triangle',
}
