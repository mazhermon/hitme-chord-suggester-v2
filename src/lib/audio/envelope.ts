/** Oscillator waveform options. */
export type Waveform = 'sine' | 'triangle' | 'sawtooth' | 'square'

/** ADSR envelope + waveforms that shape each played note. */
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
   * Waveforms to layer for each note. One = the classic single oscillator;
   * multiple = each note sums one oscillator per waveform into the same voice
   * gain, with per-voice gain divided by `waveforms.length` to compensate for
   * the additive amplitude (so 4 waveforms aren't 4× the loudness + clipping).
   * Always has at least one entry.
   */
  waveforms: Waveform[]
}

export const DEFAULT_ENVELOPE: EnvelopeSettings = {
  attack: 0.012,
  decay: 0.12,
  sustain: 0.7,
  release: 0.3,
  waveforms: ['triangle'],
}
